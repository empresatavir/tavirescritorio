"""Sessão que executa código e teste.

Documento continua em markdown. Implementação e QA só fecham com comando rodado.
O teste precisa falhar antes da correção e passar depois. O relatório não dá a nota.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from app.modules.factory.artifacts import file_sha256
from app.modules.factory.quality_loop import (
    APK_BUILD,
    BACK_BUILD,
    BACK_QA,
    FRONT_BUILD,
    FRONT_QA,
    JORNADA_QA,
    QA_STAGE_IDS,
    SECURITY_STAGE_IDS,
    report_path,
)

CODE_SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".vue", ".dart"}
_SKIP = {"node_modules", "__pycache__", ".git", ".venv", ".pytest_cache"}
_SECRET = re.compile(
    r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"
    r"|AKIA[0-9A-Z]{16}"
    r"|(?i:password|senha|api_key|secret)\s*=\s*['\"][^'\"]{6,}['\"]"
)
_EVAL = re.compile(r"(?i)\beval\s*\(")


class WorkSessionError(RuntimeError):
    """A etapa não pode avançar sem a prova da execução."""


VISUAL = {"visual_proof"}


def work_kind(stage_def_id: str) -> str | None:
    if stage_def_id in VISUAL:
        return "visual"
    if stage_def_id in JORNADA_QA:
        return "jornada"
    if stage_def_id in APK_BUILD:
        return "apk"
    if stage_def_id in BACK_BUILD | FRONT_BUILD:
        return "build"
    if stage_def_id in QA_STAGE_IDS:
        return "qa"
    if stage_def_id in SECURITY_STAGE_IDS:
        return "security"
    return None


def layout_for(stage_def_id: str) -> dict[str, str]:
    if stage_def_id in BACK_BUILD | BACK_QA:
        return {"code": "backend", "tests": "backend/tests", "side": "backend", "other": "frontend"}
    if stage_def_id in {"build_fe", "m_code_fe", "qa_fe", "m_qa_fe"}:
        return {"code": "frontend", "tests": "frontend/tests", "side": "frontend", "other": "backend"}
    return {"code": "src", "tests": "tests", "side": "pagina", "other": "backend"}


def evidence_file(stage_def_id: str) -> str:
    return f"qa/evidence/{stage_def_id}.log"


def build_is_proven(root: Path, stage_def_id: str) -> bool:
    """O log da fábrica precisa mostrar a falha e, depois, a aprovação."""
    text = _read_evidence(root, stage_def_id)
    failed = _exit_after(text, "fase teste: falhou")
    passed = _exit_after(text, "fase codigo: passou")
    if failed is None or passed is None:
        return False
    if text.find("fase teste: falhou") > text.find("fase codigo: passou"):
        return False
    return failed not in {0, 5} and passed == 0


def evidence_state(root: Path | None, stage_def_id: str) -> str | None:
    if root is None:
        return None
    text = _read_evidence(root, stage_def_id)
    if "execucao: passou" in text:
        return "aprovado"
    if "execucao: falhou" in text:
        return "reprovado"
    return None


def apply_evidence_verdict(text: str, kind: str, proven: str | None) -> str:
    label = "Resultado" if kind == "qa" else "Parecer"
    decision = "APROVADO" if proven == "aprovado" else "REPROVADO"
    cleaned = re.sub(rf"(?im)^\s*{label}\s*:\s*(aprovado|reprovado)\s*$", "", text or "")
    return f"{label}: {decision}\n\n{cleaned.strip()}\n"


def run_visual_sync(
    root: Path,
    stage_def_id: str,
    *,
    agent_name: str,
    title: str,
    model: str,
    effort: str,
    guidance: str | None,
    expected: list[str] | None = None,
    on_status=None,
    agent=None,
) -> dict:
    """A prova visual grava a interface. Um README não fecha a etapa."""
    root = root.resolve()
    _assert_delivery_workspace(root)
    say = on_status or (lambda _message: None)
    run_agent = agent or _default_agent
    say(f"{agent_name} abre a sessão de código para construir a interface.")
    _invoke(
        run_agent,
        root,
        _prompt_visual(root, stage_def_id, agent_name, title, guidance),
        model,
        effort,
        say,
    )
    if not _visual_is_product(root):
        where = (
            "aplicativo/lib/*.dart"
            if _client_is_flutter(root)
            else "frontend/index.html e frontend/app.js"
        )
        raise WorkSessionError(
            "A sessão não gravou a interface. Um markdown não é a prova visual. "
            f"A entrega fica em {where}."
        )
    readme = _visual_index(root)
    files = [_write(root, "visual_proof/README.md", readme)]
    for relative in _visual_paths(root):
        path = root / relative
        if path.is_file():
            files.append({"path": relative, "sha256": file_sha256(path), "size": path.stat().st_size})
    say(f"{title} gravou a interface no projeto.")
    return {"files": files, "note": "sessão de código · interface gravada"}


def run_build_sync(
    root: Path,
    stage_def_id: str,
    *,
    agent_name: str,
    title: str,
    model: str,
    effort: str,
    guidance: str | None,
    expected: list[str],
    on_status=None,
    agent=None,
    shell=None,
) -> dict:
    """Abre a sessão de código e a fábrica executa o teste duas vezes."""
    root = root.resolve()
    _assert_delivery_workspace(root)
    layout = _resolve_layout(root, stage_def_id)
    say = on_status or (lambda _message: None)
    run_agent = agent or _default_agent
    run_cmd = shell or run_shell

    def _execute() -> tuple[list[str], int, str]:
        args = test_args(root, layout)
        code, output = _run_tests(root, layout, run_cmd, args)
        return args, code, output

    say(f"{agent_name} abre a sessão de código. Esta sessão pode editar arquivo e rodar comando.")
    protected = _freeze_many(root, ["context", layout["other"]])
    product = _snapshot_product(root, layout["code"])

    say(f"{agent_name} grava só o teste. A implementação ainda não entra.")
    _invoke(
        run_agent,
        root,
        _prompt_tests(root, stage_def_id, agent_name, title, layout, guidance),
        model,
        effort,
        say,
    )
    _restore_frozen(root, protected, say)

    say("A fábrica executa o teste. Esta execução precisa falhar.")
    args, first_code, first_out = _execute()
    _reject_runner_failure(first_out)
    if first_code == 0:
        say("O teste passou cedo. A fábrica remove a implementação gravada nesta fase e executa de novo.")
        _restore_product(root, layout["code"], product)
        args, first_code, first_out = _execute()
        _reject_runner_failure(first_out)
    if _no_tests(first_code, first_out):
        raise WorkSessionError(
            f"Não há teste executável em {layout['tests']}. A etapa de código não avança."
        )
    if first_code == 0:
        raise WorkSessionError(
            "O teste passou antes da implementação. A prova não vale. Um arquivo markdown não fecha esta etapa."
        )

    tests = _snapshot(root, layout["tests"])
    say(f"O teste falhou com código {first_code}. {agent_name} implementa o código.")
    _invoke(
        run_agent,
        root,
        _prompt_code(root, stage_def_id, agent_name, title, layout, guidance, first_out),
        model,
        effort,
        say,
    )
    _restore_frozen(root, protected, say)
    if _snapshot(root, layout["tests"]) != tests:
        say("A sessão alterou o teste. A fábrica restaurou o teste original.")
        _restore(root, layout["tests"], tests)

    say("A fábrica executa o mesmo teste de novo.")
    args, second_code, second_out = _execute()
    _reject_runner_failure(second_out)
    if _no_tests(second_code, second_out):
        raise WorkSessionError("O teste sumiu depois da implementação. A etapa não fecha.")
    if second_code != 0:
        tail = " ".join(second_out.split())[-400:]
        raise WorkSessionError(
            f"O teste ainda falha depois da implementação. Código de saída {second_code}. {tail}"
        )
    if not _has_product_code(root, layout):
        raise WorkSessionError(
            f"A sessão não gravou código em {layout['code']}. O teste sozinho não é a entrega."
        )

    command = " ".join(args)
    log = (
        f"comando: {command}\n"
        f"fase teste: falhou\ncodigo_saida: {first_code}\n---\n{first_out.strip()[:4000]}\n\n"
        f"fase codigo: passou\ncodigo_saida: {second_code}\n---\n{second_out.strip()[:4000]}\n"
    )
    files = [_write(root, evidence_file(stage_def_id), log)]
    plan = _plan_text(agent_name, title, command, first_code, second_code)
    notes = _notes_text(agent_name, command, first_code, second_code)
    for rel in expected:
        if rel.endswith("plan-back.md") or rel.endswith("plan-front.md") or rel.endswith("plan.md"):
            files.append(_write(root, rel, plan))
        elif rel == "changes/NOTES.md":
            files.append(_write(root, rel, notes))
    say(f"{title} tem log de falha e de aprovação.")
    return {
        "files": files,
        "note": f"sessão de código · teste {first_code} · código {second_code}",
    }


def run_check_sync(
    root: Path,
    stage_def_id: str,
    *,
    kind: str,
    agent_name: str,
    title: str,
    expected: list[str],
    on_status=None,
    shell=None,
) -> dict:
    """QA e segurança rodam comando. A frase do relatório sai do código de saída."""
    root = root.resolve()
    _assert_delivery_workspace(root)
    say = on_status or (lambda _message: None)
    if kind == "security":
        say(f"{agent_name} audita o código em disco. A sessão não altera o produto.")
        findings = scan_security(root)
        passed = not findings
        output = "\n".join(findings) if findings else "Nenhum achado alto."
        command = "scanner local de segredo, chave e eval"
        code = 0 if passed else 1
    else:
        layout = _resolve_layout(root, stage_def_id)
        args = test_args(root, layout)
        command = " ".join(args)
        say(f"{agent_name} executa o teste. O relatório sai do código de saída.")
        if not (root / layout["tests"]).is_dir():
            code, output = 1, f"Não há teste em {layout['tests']}."
        else:
            code, output = _run_tests(root, layout, shell or run_shell, args)
            _reject_runner_failure(output)
        passed = code == 0 and not _no_tests(code, output)
        if _no_tests(code, output):
            passed = False
            output = output or f"Não há teste em {layout['tests']}."

    state = "passou" if passed else "falhou"
    verdict = "APROVADO" if passed else "REPROVADO"
    label = "Parecer" if kind == "security" else "Resultado"
    log = f"comando: {command}\nexecucao: {state}\ncodigo_saida: {code}\n---\n{output.strip()[:4000]}\n"
    report = (
        f"# {title}\n\n"
        f"**Agente:** {agent_name}  \n"
        "**Formato:** ASD-STE100\n\n"
        f"{label}: {verdict}\n\n"
        "## Situação\n\n"
        f"{agent_name} executou a verificação desta etapa.\n\n"
        "## O que li\n\n"
        "A verificação leu o código e a saída do comando.\n\n"
        "## Entrega\n\n"
        f"O comando terminou com código {code}.\n\n"
        "## Evidência\n\n"
        f"O log está em `{evidence_file(stage_def_id)}`.\n\n"
        "## Riscos\n\n"
        "Uma frase sem esta execução não aprova a etapa.\n\n"
        "## Próximo passo\n\n"
        + (
            "Siga para a próxima etapa.\n"
            if passed
            else "Corrija o código. Rode o mesmo comando de novo.\n"
        )
        + "\n"
        + output.strip()[:2000]
        + "\n"
    )
    target = _report_target(stage_def_id, kind, expected)
    files = [_write(root, evidence_file(stage_def_id), log), _write(root, target, report)]
    say(f"{title} registrou {label}: {verdict}.")
    return {"files": files, "note": f"execução {state} · código {code}"}


def flutter_executable() -> str | None:
    """Caminho do Flutter. O processo do escritório nem sempre herda o PATH do usuário."""
    found = shutil.which("flutter") or shutil.which("flutter.bat")
    if found:
        return found
    home = Path(os.environ.get("USERPROFILE") or "")
    local = Path(os.environ.get("LOCALAPPDATA") or "")
    appdata = Path(os.environ.get("APPDATA") or "")
    candidates = [
        appdata / "FlutterFlow" / "flutterflow" / "flutter" / "bin" / "flutter.bat",
        local / "flutter" / "bin" / "flutter.bat",
        home / "flutter" / "bin" / "flutter.bat",
        home / "develop" / "flutter" / "bin" / "flutter.bat",
        Path("C:/flutter/bin/flutter.bat"),
        Path("C:/src/flutter/bin/flutter.bat"),
    ]
    for path in candidates:
        if path.is_file():
            return str(path)
    return None


def test_args(root: Path, layout: dict[str, str]) -> list[str]:
    if layout.get("code") == "aplicativo":
        return [flutter_executable() or "flutter", "test"]
    pkg = _package_json(root, layout)
    if pkg is not None:
        npm = "npm.cmd" if os.name == "nt" else "npm"
        return [npm, "--prefix", str(pkg.parent), "test", "--silent"]
    return [
        sys.executable,
        "-m",
        "pytest",
        layout["tests"],
        "-q",
        "--tb=line",
        "-p",
        "no:cacheprovider",
        "--rootdir",
        str(root),
        "--confcutdir",
        str(root),
    ]


def resolve_command(args: list[str]) -> list[str]:
    """Troca flutter pelo caminho desta máquina. O nome solto falha no processo do escritório."""
    if not args:
        return list(args)
    token = str(args[0]).lower()
    if token in {"flutter", "flutter.bat", "flutter.cmd"}:
        found = flutter_executable()
        if found:
            return [found, *args[1:]]
    return list(args)


def run_shell(root: Path, args: list[str], timeout: float = 180, cwd: Path | None = None) -> tuple[int, str]:
    args = resolve_command(args)
    env = os.environ.copy()
    env.pop("PYTEST_ADDOPTS", None)
    try:
        proc = subprocess.run(
            args,
            cwd=str(cwd or root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired:
        return 124, f"O comando passou de {int(timeout)} s."
    except OSError as exc:
        command = args[0] if args else "o comando"
        return 127, f"Não encontrei o comando {command}. {exc}"
    output = f"{proc.stdout or ''}\n{proc.stderr or ''}".strip()
    return proc.returncode, output[-8000:]


def scan_security(root: Path) -> list[str]:
    """Varre o código do produto. Não edita arquivo."""
    findings: list[str] = []
    saw_code = False
    for folder in ("backend", "frontend", "src", "aplicativo"):
        base = root / folder
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in CODE_SUFFIXES:
                continue
            if any(part in _SKIP or part in {"tests", "qa"} for part in path.parts):
                continue
            if path.name.lower().startswith("test_"):
                continue
            saw_code = True
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            rel = path.relative_to(root).as_posix()
            for number, line in enumerate(text.splitlines(), start=1):
                if _SECRET.search(line):
                    findings.append(f"SEC alta · segredo em {rel}:{number}. O valor foi ocultado.")
                elif _EVAL.search(line):
                    findings.append(f"SEC alta · eval em {rel}:{number}.")
    index = root / "index.html"
    if index.is_file():
        saw_code = True
        try:
            page = index.read_text(encoding="utf-8", errors="replace")
        except OSError:
            page = ""
        for number, line in enumerate(page.splitlines(), start=1):
            if _SECRET.search(line):
                findings.append(f"SEC alta · segredo em index.html:{number}. O valor foi ocultado.")
            elif _EVAL.search(line):
                findings.append(f"SEC alta · eval em index.html:{number}.")
    if not saw_code:
        findings.append("SEC alta · não há código de produto para auditar.")
    return findings


def _default_agent(workspace: Path, prompt: str, model: str, effort: str, on_status) -> str:
    from app.modules.cursor_link.client import cli_path, run_in_workspace

    binary = cli_path()
    if not binary:
        raise WorkSessionError(
            "O Cursor Agent não está instalado. O modo de leitura não grava o programa."
        )
    try:
        return run_in_workspace(
            binary,
            str(workspace),
            model,
            effort,
            prompt,
            on_status=on_status,
        )
    except RuntimeError as exc:
        raise WorkSessionError(str(exc)) from exc


def _invoke(agent, root: Path, prompt: str, model: str, effort: str, say) -> None:
    try:
        agent(root, prompt, model, effort, say)
    except WorkSessionError:
        raise
    except Exception as exc:
        raise WorkSessionError(f"A sessão de código não concluiu. {exc}") from exc


def _prompt_tests(root, stage_def_id, agent_name, title, layout, guidance) -> str:
    target = _target_line(layout, root)
    return (
        f"Você é {agent_name}. Etapa {title} (`{stage_def_id}`).\n"
        "Fase: só testes.\n"
        "A entrega desta esteira é o programa. Esta fase grava só o teste executável.\n"
        "Não entregue a cobertura em markdown.\n"
        f"{_product_brief(root)}"
        f"Crie testes executáveis em `{layout['tests']}`.\n"
        "Não crie a implementação do produto nesta fase.\n"
        f"{target}\n"
        "O teste precisa falhar agora, porque o código ainda não existe.\n"
        "A jornada cobre criar tarefa, mover no kanban, criar job e cancelar.\n"
        "Não altere context/. Não altere o outro lado do produto.\n"
        "Não afrouxe asserção. Não aumente timeout. Não faça deploy. Não faça push.\n"
        f"{_apk_hint(root, layout)}\n"
        f"{_sources(root)}\n"
        f"{_guidance(guidance)}"
    )


def _prompt_code(root, stage_def_id, agent_name, title, layout, guidance, failure) -> str:
    target = _target_line(layout, root)
    tail = " ".join((failure or "").split())[-800:]
    return (
        f"Você é {agent_name}. Etapa {title} (`{stage_def_id}`).\n"
        "Fase: implementação.\n"
        "A entrega é o programa. Grave os arquivos no projeto. Não responda com um relatório.\n"
        f"{_product_brief(root)}"
        f"Implemente o código em `{layout['code']}` para o teste em `{layout['tests']}` passar.\n"
        f"{target}\n"
        "Não edite os arquivos de teste. Não apague asserção. Não aumente timeout.\n"
        "Não altere context/. Não altere o outro lado do produto.\n"
        "Leia qa/issues e corrija o que estiver aberto deste lado.\n"
        "Não faça deploy. Não faça push.\n"
        f"{_apk_hint(root, layout)}\n"
        f"A falha atual do teste foi: {tail}\n"
        f"{_sources(root)}\n"
        f"{_guidance(guidance)}"
    )


def _prompt_visual(root: Path, stage_def_id: str, agent_name: str, title: str, guidance: str | None) -> str:
    if _client_is_flutter(root):
        place = "Grave o app Flutter em `aplicativo/pubspec.yaml` e `aplicativo/lib/main.dart`. As telas ficam em `aplicativo/lib/`."
    else:
        place = "Grave `frontend/index.html` e `frontend/app.js`."
    return (
        f"Você é {agent_name}. Etapa {title} (`{stage_def_id}`).\n"
        "A entrega é a interface do produto, em código.\n"
        f"{place}\n"
        "Construa as telas e os sheets do contrato nessa interface.\n"
        "Use a stack de frontend do contrato.\n"
        "Não escreva um relatório. Não responda só com texto. Um README não conta como entrega.\n"
        "Não altere context/. Não altere o backend.\n"
        "Não faça deploy. Não faça push.\n"
        f"{_product_brief(root)}"
        f"{_sources(root)}\n"
        f"{_guidance(guidance)}"
    )


def _product_brief(root: Path) -> str:
    data = _contract(root)
    if data is None and not (root / "context" / "contrato.json").is_file():
        return (
            "Não há contrato. Implemente o programa descrito nos arquivos de context/.\n"
            "Um arquivo .md não substitui esse programa.\n"
        )
    if not data:
        return (
            "O contrato não pôde ser lido. Implemente o programa descrito nos arquivos de context/.\n"
            "Um arquivo .md não substitui esse programa.\n"
        )
    lines = ["O programa pedido no contrato:"]
    if data.get("produto"):
        lines.append(f"Produto: {data['produto']}.")
    if data.get("stack_frontend"):
        lines.append(f"Stack de frontend: {data['stack_frontend']}.")
    if data.get("stack_backend"):
        lines.append(f"Stack de backend: {data['stack_backend']}.")
    telas = [str(item) for item in (data.get("telas") or []) if str(item).strip()]
    if telas:
        lines.append("Telas: " + ", ".join(telas) + ".")
    sheets = [str(item) for item in (data.get("sheets") or []) if str(item).strip()]
    if sheets:
        lines.append("Sheets: " + ", ".join(sheets) + ".")
    regras = [str(item) for item in (data.get("regras") or []) if str(item).strip()]
    if regras:
        lines.append("Regras:")
        lines.extend(f"- {item}" for item in regras[:12])
    lines.append("Um arquivo .md não substitui esse programa.")
    return "\n".join(lines) + "\n"


def _client_is_flutter(root: Path) -> bool:
    data = _contract(root) or {}
    blob = " ".join(
        [
            str(data.get("stack_frontend") or ""),
            str(data.get("entregavel") or ""),
            " ".join(str(item) for item in (data.get("frontend_files") or [])),
        ]
    ).lower()
    return "flutter" in blob or ".dart" in blob


def _resolve_layout(root: Path, stage_def_id: str) -> dict[str, str]:
    layout = layout_for(stage_def_id)
    if layout["side"] == "frontend" and _client_is_flutter(root):
        return {**layout, "code": "aplicativo", "tests": "aplicativo/test"}
    return layout


def _run_tests(root: Path, layout: dict[str, str], runner, args: list[str]) -> tuple[int, str]:
    if layout.get("code") != "aplicativo":
        return runner(root, args)
    try:
        return runner(root, args, cwd=root / "aplicativo")
    except TypeError:
        return runner(root, args)


def _visual_paths(root: Path) -> list[str]:
    if _client_is_flutter(root):
        base = root / "aplicativo"
        if not base.is_dir():
            return []
        found = [
            path.relative_to(root).as_posix()
            for path in sorted(base.rglob("*.dart"))
            if path.is_file() and "test" not in path.parts
        ]
        pubspec = base / "pubspec.yaml"
        if pubspec.is_file():
            found.insert(0, "aplicativo/pubspec.yaml")
        return found[:12]
    return [
        relative
        for relative in ("frontend/index.html", "frontend/app.js", "frontend/app.ts", "frontend/app.tsx")
        if (root / relative).is_file()
    ]


def _visual_text(root: Path) -> str:
    chunks: list[str] = []
    for relative in _visual_paths(root):
        path = root / relative
        try:
            chunks.append(path.read_text(encoding="utf-8", errors="replace"))
        except OSError:
            continue
    return "\n".join(chunks)


def _visual_is_product(root: Path) -> bool:
    text = _visual_text(root)
    if len(text.strip()) < 800:
        return False
    data = _contract(root) or {}
    telas = [str(item) for item in (data.get("telas") or []) if str(item).strip()]
    if telas and not any(item in text for item in telas):
        return False
    return True


def _visual_index(root: Path) -> str:
    lines = ["# Prova visual", "", "A interface está nos arquivos de código.", ""]
    lines.extend(f"- {relative}" for relative in _visual_paths(root))
    lines.append("")
    return "\n".join(lines)


def _contract(root: Path) -> dict | None:
    path = root / "context" / "contrato.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _apk_hint(root: Path, layout: dict[str, str]) -> str:
    if layout.get("side") != "frontend":
        return ""
    from app.modules.factory.intake import entregavel_de

    if _client_is_flutter(root):
        return (
            "O cliente é o app Flutter/Dart em aplicativo/. O APK sai desse projeto. "
            'O manifesto precisa de android.permission.INTERNET e android:usesCleartextTraffic="true". '
            "Não copie SVG com metadata ou c2pa."
        )
    if entregavel_de(root) == "web" and not (root / "aplicativo" / "pubspec.yaml").is_file():
        return ""
    return (
        "O entregável inclui APK. Grave o cliente Flutter em aplicativo/. "
        'O manifesto precisa de android.permission.INTERNET e android:usesCleartextTraffic="true". '
        "Não copie SVG com metadata ou c2pa."
    )


def _target_line(layout: dict[str, str], root: Path | None = None) -> str:
    if layout["side"] == "backend":
        return "Se o contrato não citar arquivo, grave `backend/office.py`."
    if layout["side"] == "frontend" and root is not None and _client_is_flutter(root):
        return "Grave `aplicativo/pubspec.yaml` e os arquivos `.dart` em `aplicativo/lib/`."
    if layout["side"] == "frontend":
        return "Se o contrato não citar arquivo, grave `frontend/index.html` e `frontend/app.js`."
    return "Grave `index.html` e o código em `src/`."


def _sources(root: Path) -> str:
    folder = root / "context"
    if not folder.is_dir():
        return "Não há pasta context/."
    names = [path.relative_to(root).as_posix() for path in sorted(folder.rglob("*")) if path.is_file()]
    listed = "\n".join(f"- {name}" for name in names[:20]) or "- A pasta context/ está vazia."
    return f"Leia estes arquivos antes de escrever:\n{listed}"


def _guidance(guidance: str | None) -> str:
    text = (guidance or "").strip()
    if not text:
        return ""
    return f"Instrução do CEO para refazer:\n{text[:1000]}\n"


def _package_json(root: Path, layout: dict[str, str]) -> Path | None:
    candidates = [root / layout["code"] / "package.json"]
    if layout["side"] == "pagina":
        candidates.insert(0, root / "package.json")
    for path in candidates:
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and (data.get("scripts") or {}).get("test"):
            return path
    return None


def _report_target(stage_def_id: str, kind: str, expected: list[str]) -> str:
    if kind == "qa":
        return report_path("qa", stage_def_id)
    for item in expected:
        if str(item).endswith(".md"):
            return str(item)
    return report_path("security", stage_def_id)


def _plan_text(agent_name: str, title: str, command: str, first: int, second: int) -> str:
    return (
        f"# Plano de testes · {title}\n\n"
        f"**Agente:** {agent_name}  \n"
        "**Formato:** ASD-STE100\n\n"
        "## Situação\n\n"
        "A fábrica executou o teste desta etapa.\n\n"
        "## O que li\n\n"
        f"O comando foi `{command}`.\n\n"
        "## Entrega\n\n"
        f"O teste falhou com código {first}.\n"
        f"O mesmo teste passou com código {second}.\n\n"
        "## Evidência\n\n"
        "A saída das duas execuções está no log da etapa.\n\n"
        "## Riscos\n\n"
        "Um teste que passou antes da implementação não prova a entrega.\n\n"
        "## Próximo passo\n\n"
        "O QA executa o mesmo comando. O QA não reescreve o resultado.\n"
    )


def _notes_text(agent_name: str, command: str, first: int, second: int) -> str:
    return (
        f"# Notas da implementação\n\n"
        f"**Agente:** {agent_name}  \n"
        "**Formato:** ASD-STE100\n\n"
        "## Situação\n\n"
        f"{agent_name} implementou depois que o teste falhou.\n\n"
        "## Entrega\n\n"
        f"O comando `{command}` saiu com {first} e depois com {second}.\n\n"
        "## Próximo passo\n\n"
        "O QA repete o comando.\n"
    )


def _write(root: Path, relative: str, content: str) -> dict:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return {"path": relative, "sha256": file_sha256(path), "size": path.stat().st_size}


def _read_evidence(root: Path, stage_def_id: str) -> str:
    path = root / evidence_file(stage_def_id)
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _exit_after(text: str, marker: str) -> int | None:
    idx = text.find(marker)
    if idx < 0:
        return None
    match = re.search(r"codigo_saida:\s*(-?\d+)", text[idx : idx + 180])
    if not match:
        return None
    return int(match.group(1))


def _no_tests(code: int, output: str) -> bool:
    if code == 5:
        return True
    low = (output or "").lower()
    return "no tests ran" in low or "collected 0 items" in low


def _reject_runner_failure(output: str) -> None:
    if "no module named pytest" in (output or "").lower():
        raise WorkSessionError("O Python desta máquina não tem pytest. A fábrica não executou o teste.")


def _has_product_code(root: Path, layout: dict[str, str]) -> bool:
    if layout["side"] == "pagina" and (root / "index.html").is_file():
        return True
    base = root / layout["code"]
    if not base.is_dir():
        return False
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if "/tests/" in f"/{rel}/" or path.name.lower().startswith("test_"):
            continue
        if path.suffix.lower() in CODE_SUFFIXES:
            return True
    return False


def _assert_delivery_workspace(root: Path) -> None:
    if (root / "backend" / "app" / "modules" / "factory" / "executor.py").is_file():
        raise WorkSessionError("A sessão de código não abre a pasta do escritório.")


def _snapshot(root: Path, folder: str) -> dict[str, bytes]:
    base = root / folder
    found: dict[str, bytes] = {}
    if not base.exists():
        return found
    files = [base] if base.is_file() else [path for path in base.rglob("*") if path.is_file()]
    for path in files:
        if any(part in _SKIP for part in path.parts):
            continue
        found[path.relative_to(root).as_posix()] = path.read_bytes()
    return found


def _snapshot_product(root: Path, code_dir: str) -> dict[str, bytes]:
    found = {
        rel: data
        for rel, data in _snapshot(root, code_dir).items()
        if "/tests/" not in f"/{rel}/"
    }
    if code_dir == "src" and (root / "index.html").is_file():
        found["index.html"] = (root / "index.html").read_bytes()
    return found


def _restore(root: Path, folder: str, snap: dict[str, bytes]) -> None:
    for rel in list(_snapshot(root, folder)):
        if rel not in snap:
            (root / rel).unlink(missing_ok=True)
    for rel, data in snap.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.is_file() or path.read_bytes() != data:
            path.write_bytes(data)


def _restore_product(root: Path, code_dir: str, snap: dict[str, bytes]) -> None:
    for rel in list(_snapshot_product(root, code_dir)):
        if rel not in snap:
            (root / rel).unlink(missing_ok=True)
    for rel, data in snap.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def _freeze_many(root: Path, folders: list[str]) -> dict[str, dict[str, bytes]]:
    return {folder: _snapshot(root, folder) for folder in folders}


def _restore_frozen(root: Path, frozen: dict[str, dict[str, bytes]], say) -> None:
    for folder, snap in frozen.items():
        if _snapshot(root, folder) != snap:
            say(f"A sessão alterou `{folder}/`. A fábrica restaurou esses arquivos.")
            _restore(root, folder, snap)
