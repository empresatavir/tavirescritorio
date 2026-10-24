"""Leitura do escopo na criação do projeto.

A Dora lê os arquivos enviados e grava o contrato que a esteira segue.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.models.project import Project
from app.modules.factory.artifacts import write_artifact
from app.modules.factory.quality_loop import APK_BUILD, JORNADA_QA
from app.modules.factory.run_service import get_active_run
from app.modules.ghostcli import chat_completion
from app.modules.ghostcli.client import GhostCliError
from app.modules.ghostcli.notice import report_ai_link_error

BACK_STAGES = {"build_be", "m_code_be"}
FRONT_STAGES = {"build_fe", "m_code_fe", "build", "m_code"}
GUARDED_STAGES = BACK_STAGES | FRONT_STAGES | JORNADA_QA | APK_BUILD
CODE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".sql"}
FRONT_SUFFIXES = {".html", ".css", ".js", ".jsx", ".ts", ".tsx"}
READ_SUFFIXES = {".md", ".txt", ".json", ".csv", ".html", ".css", ".js", ".svg"}
ENTREGAVEIS = {"web", "apk", "ambos"}


class ContractError(RuntimeError):
    """A especificação não virou contrato. A etapa de código não segue."""


def _relative(value: str) -> str | None:
    rel = (value or "").replace("\\", "/").strip().lstrip("/")
    if not rel or ".." in rel.split("/"):
        return None
    return rel


def _safe_code_path(value: str, root_prefix: str) -> str | None:
    rel = _relative(value)
    if rel is None or not rel.startswith(root_prefix):
        return None
    if Path(rel).suffix.lower() not in CODE_SUFFIXES:
        return None
    return rel


def _safe_front_path(value: str) -> str | None:
    rel = _relative(value)
    if rel is None:
        return None
    if rel == "aplicativo/pubspec.yaml":
        return rel
    suffix = Path(rel).suffix.lower()
    if rel.startswith("frontend/") and suffix in FRONT_SUFFIXES:
        return rel
    if rel.startswith("aplicativo/") and suffix == ".dart":
        return rel
    return None


def _entregavel(data: dict) -> str:
    raw = str(data.get("entregavel") or "").strip().lower()
    if raw in ENTREGAVEIS:
        return raw
    blob = " ".join(
        str(data.get(key) or "")
        for key in ("produto", "resumo", "stack_frontend")
    ).lower()
    if "apk" in blob or "flutter" in blob:
        return "ambos" if "html" in blob or "web" in blob else "apk"
    return "web"


def sanitize_contract(data: dict) -> dict:
    """Mantém só caminhos de código relativos ao workspace."""
    backend: list[str] = []
    frontend: list[str] = []
    for item in data.get("backend_files") or []:
        path = _safe_code_path(str(item), "backend/")
        if path and path not in backend:
            backend.append(path)
    for item in data.get("frontend_files") or []:
        path = _safe_front_path(str(item))
        if path and path not in frontend:
            frontend.append(path)
    telas = [str(item).strip() for item in (data.get("telas") or []) if str(item).strip()]
    sheets = [str(item).strip() for item in (data.get("sheets") or []) if str(item).strip()]
    regras = [str(item).strip() for item in (data.get("regras") or []) if str(item).strip()]
    criterios = [str(item).strip() for item in (data.get("criterios") or []) if str(item).strip()]
    return {
        "produto": str(data.get("produto") or "").strip()[:180],
        "resumo": str(data.get("resumo") or "").strip()[:600],
        "stack_frontend": str(data.get("stack_frontend") or "").strip()[:120],
        "stack_backend": str(data.get("stack_backend") or "").strip()[:120],
        "stack_database": str(data.get("stack_database") or "").strip()[:120],
        "telas": telas[:12],
        "sheets": sheets[:12],
        "regras": regras[:12],
        "criterios": criterios[:12],
        "backend_files": backend[:8],
        "frontend_files": frontend[:24],
        "entregavel": _entregavel(data),
    }


def parse_contract(text: str) -> dict:
    raw = (text or "").strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("A leitura não devolveu o contrato.")
    data = json.loads(raw[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("A leitura não devolveu o contrato.")
    return sanitize_contract(data)


def _read_sources(root: Path) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for folder in ("context", "design"):
        base = root / folder
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file():
                continue
            if path.name in {"escopo.md", "contrato.json"}:
                continue
            if path.suffix.lower() not in READ_SUFFIXES:
                continue
            rel = path.relative_to(root).as_posix()
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            if path.suffix.lower() in {".html", ".css", ".js", ".svg"}:
                piece = f"Arquivo de referência `{rel}` ({path.stat().st_size} bytes). Use o caminho. Não invente o que o arquivo não mostra.\n{text[:1500]}"
            else:
                piece = text[:20000]
            found.append((rel, piece))
            if len(found) >= 12:
                return found
    return found


def _render_escopo(contract: dict, fontes: list[str], note: str) -> str:
    def bullets(items: list[str], empty: str) -> str:
        if not items:
            return f"- {empty}"
        return "\n".join(f"- {item}" for item in items)

    produto = contract.get("produto") or "Escopo dos arquivos enviados"
    resumo = contract.get("resumo") or "A esteira segue os arquivos listados em O que li."
    return (
        f"# Escopo lido na criação\n\n"
        "**Agente:** Dora Descoberta  \n"
        "**Arquivo:** `context/escopo.md`  \n"
        "**Formato:** ASD-STE100\n\n"
        "## Situação\n\n"
        f"Dora leu os arquivos enviados na criação do projeto.\n"
        f"O produto citado nas fontes é {produto}.\n"
        f"{resumo}\n\n"
        "## O que li\n\n"
        + bullets(fontes, "Nenhum arquivo de texto foi encontrado em context/ ou design/.")
        + "\n\n## Entrega\n\n"
        f"O frontend usa {contract.get('stack_frontend') or 'o que as fontes citam'}.\n"
        f"O backend usa {contract.get('stack_backend') or 'o que as fontes citam'}.\n"
        f"O banco usa {contract.get('stack_database') or 'o que as fontes citam'}.\n"
        f"O entregável é {contract.get('entregavel') or 'web'}.\n"
        "As telas citadas nas fontes são:\n"
        + bullets(contract.get("telas") or [], "As fontes não nomeiam telas.")
        + "\nOs sheets citados nas fontes são:\n"
        + bullets(contract.get("sheets") or [], "As fontes não nomeiam sheets.")
        + "\nDiego grava estes arquivos:\n"
        + bullets(contract.get("backend_files") or [], "As fontes não nomeiam arquivo de backend.")
        + "\nO Dev Frontend grava estes arquivos:\n"
        + bullets(contract.get("frontend_files") or [], "As fontes não nomeiam arquivo de frontend.")
        + "\n\n## Evidência\n\n"
        "O contrato está em `context/contrato.json`.\n"
        f"{note}\n\n"
        "## Riscos\n\n"
        "Um agente que ignorar este escopo entrega relatório no lugar do código.\n\n"
        "## Próximo passo\n\n"
        "A esteira usa este escopo em todas as etapas.\n"
        "Diego implementa só os arquivos de backend.\n"
        "O Dev Frontend implementa só os arquivos de frontend.\n"
    )


def contract_targets(local_path: str | None, stage_def_id: str) -> list[str]:
    """Arquivos de código que o contrato manda a etapa gravar."""
    if not local_path:
        return []
    if stage_def_id in BACK_STAGES:
        key = "backend_files"
    elif stage_def_id in FRONT_STAGES:
        key = "frontend_files"
    else:
        return []
    path = Path(local_path) / "context" / "contrato.json"
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(data, dict):
        return []
    clean = sanitize_contract(data)
    return list(clean.get(key) or [])


def merge_expected(local_path: str | None, stage_def_id: str, canon: list[str]) -> list[str]:
    merged = [item for item in canon if item]
    for item in contract_targets(local_path, stage_def_id):
        if item not in merged:
            merged.append(item)
    return merged


def contract_is_useful(local_path: str | None) -> bool:
    """Contrato vazio ou leitura falha não impede uma nova leitura."""
    path = Path(local_path or "") / "context" / "contrato.json"
    if not path.is_file():
        return False
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    if not isinstance(data, dict) or data.get("read_ok") is False:
        return False
    return bool(
        data.get("backend_files")
        or data.get("frontend_files")
        or data.get("telas")
        or data.get("regras")
        or data.get("resumo")
    )


def needs_contract(stage_def_id: str, has_contract: bool, has_source: bool) -> bool:
    return stage_def_id in BACK_STAGES | FRONT_STAGES and not has_contract and has_source


def contract_block_reason(local_path: str | None, stage_def_id: str, has_source: bool) -> str | None:
    """Contrato vazio não deixa a etapa de código, jornada ou APK seguir."""
    if stage_def_id not in GUARDED_STAGES or not has_source:
        return None
    if contract_is_useful(local_path):
        return None
    return (
        "O contrato está vazio. A esteira para até a leitura da especificação concluir. "
        "Um relatório não substitui telas, regras ou arquivos."
    )


def entregavel_de(root: Path) -> str:
    """web, apk ou ambos. A especificação também conta se o JSON ainda não marcou."""
    path = root / "context" / "contrato.json"
    marked = ""
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data = {}
        if isinstance(data, dict):
            marked = str(data.get("entregavel") or "").strip().lower()
    if marked in ENTREGAVEIS:
        return marked
    blob = ""
    context = root / "context"
    if context.is_dir():
        for item in sorted(context.glob("*.md")):
            if item.name == "escopo.md":
                continue
            try:
                blob += item.read_text(encoding="utf-8", errors="replace")[:8000].lower()
            except OSError:
                continue
    if "apk" in blob or "flutter" in blob:
        return "ambos"
    return "web"


async def ensure_contract(session, project: Project, stage_def_id: str) -> None:
    """Na etapa de código, a especificação enviada vira contrato antes da gravação."""
    root = Path(project.local_path or "")
    context = root / "context"
    has_source = False
    if context.is_dir():
        has_source = any(
            path.is_file()
            and path.name not in {"escopo.md", "contrato.json"}
            and path.suffix.lower() in READ_SUFFIXES
            for path in context.iterdir()
        )
    if has_source and stage_def_id in GUARDED_STAGES and not contract_is_useful(project.local_path):
        await read_uploaded_scope(session, project)
    reason = contract_block_reason(project.local_path, stage_def_id, has_source)
    if reason:
        raise ContractError(reason)


async def read_uploaded_scope(session, project: Project) -> dict:
    """Lê context/ e design/ e grava escopo.md + contrato.json."""
    root = Path(project.local_path or "")
    sources = _read_sources(root) if root.is_dir() else []
    fontes = [rel for rel, _ in sources]
    run = await get_active_run(session, project.id)
    meta = (run.meta or {}) if run else {}
    from app.modules.factory.engine_prefs import office_call

    provider, model, effort, _enabled = await office_call(meta.get("model"), meta.get("effort"))

    contract: dict
    read_ok = False
    error = ""
    if not sources:
        contract = sanitize_contract({})
        error = "Nenhum arquivo de texto foi salvo em context/ ou design/."
    else:
        packed = "\n\n".join(f"### Fonte `{rel}`\n{text}" for rel, text in sources)
        system = (
            "Você é a Dora Descoberta.\n"
            "Leia só as fontes. Não invente tela, endpoint, paleta ou arquivo.\n"
            "Responda apenas um JSON com as chaves:\n"
            "produto, resumo, stack_frontend, stack_backend, stack_database,\n"
            "telas, sheets, regras, criterios, backend_files, frontend_files, entregavel.\n"
            "entregavel é web, apk ou ambos. APK ou Flutter na fonte vira apk ou ambos.\n"
            "backend_files começa com backend/ e termina em .py, .sql ou .html.\n"
            "frontend_files começa com frontend/ ou aplicativo/.\n"
            "Página web termina em .html, .css, .js, .ts ou .tsx.\n"
            "Cliente Flutter termina em .dart, além de aplicativo/pubspec.yaml.\n"
            "Se a fonte não nomear o arquivo, a lista fica vazia.\n"
        )
        user = f"Projeto: {project.name}.\n\n{packed[:36000]}"
        contract = sanitize_contract({})
        last_error = ""
        for attempt in range(2):
            try:
                text = await chat_completion(
                    system=system,
                    messages=[{"role": "user", "content": user}],
                    model=model,
                    effort=effort,
                    provider=provider,
                    max_tokens=2500,
                    timeout=240.0,
                )
                contract = parse_contract(text or "")
                read_ok = True
                break
            except (GhostCliError, ValueError, json.JSONDecodeError, OSError) as exc:
                last_error = str(exc)
                locked = "32" in last_error or "sendo usado" in last_error.lower() or "being used" in last_error.lower()
                if attempt == 0 and locked:
                    continue
                contract = sanitize_contract({})
                error = f"A Dora não concluiu a leitura ({exc})."
                report_ai_link_error(error)
                break
        else:
            contract = sanitize_contract({})
            error = f"A Dora não concluiu a leitura ({last_error})."

    note = "A Dora concluiu a leitura." if read_ok else error
    escopo = _render_escopo(contract, fontes, note)
    payload = dict(contract)
    payload["fontes"] = fontes
    payload["read_ok"] = read_ok
    write_artifact(project.local_path, "context/escopo.md", escopo, overwrite=True)
    write_artifact(
        project.local_path,
        "context/contrato.json",
        json.dumps(payload, ensure_ascii=False, indent=2),
        overwrite=True,
    )
    return {
        "read_ok": read_ok,
        "error": error,
        "escopo": "context/escopo.md",
        "contrato": "context/contrato.json",
        "fontes": fontes,
        "backend_files": contract.get("backend_files") or [],
        "frontend_files": contract.get("frontend_files") or [],
        "telas": contract.get("telas") or [],
    }
