"""Controles do projeto. O que a Fábrica pode fazer fica aqui, não no prompt."""
from __future__ import annotations

from pathlib import Path

DOMAINS = (
    "psicologia",
    "copywriting",
    "negocios",
    "engenharia",
    "mercados",
    "frameworks",
    "design",
)
DEMAND_TYPES = ("criacao", "manutencao", "correcao")
AUTOMATION_KEYS = (
    "auto_entender",
    "auto_refinar",
    "auto_corrigir",
    "auto_compilar",
    "auto_entregar",
    "novas_entram_manuais",
)

DEFAULT_CONTROL: dict = {
    "active": True,
    "watch": False,
    "automation": {
        "auto_entender": False,
        "auto_refinar": False,
        "auto_corrigir": False,
        "auto_compilar": False,
        "auto_entregar": False,
        "novas_entram_manuais": True,
    },
    "auto_types": [],
    "refino_destino": "dossie",
    "secoes_excluidas": [],
    "build_command": "",
    "build_artifact": "",
    "slas": [],
    "bases": [],
}


class ControlError(ValueError):
    pass


def normalize_control(raw: dict | None) -> dict:
    """Devolve o controle completo. Campo ausente fica no padrão."""
    src = raw if isinstance(raw, dict) else {}
    auto_src = src.get("automation") if isinstance(src.get("automation"), dict) else {}
    automation = {
        key: bool(auto_src.get(key, DEFAULT_CONTROL["automation"][key]))
        for key in AUTOMATION_KEYS
    }
    types = [t for t in (src.get("auto_types") or []) if t in DEMAND_TYPES]
    bases = [b for b in (src.get("bases") or []) if b in DOMAINS]
    destino = src.get("refino_destino") if src.get("refino_destino") in {"dossie", "docs"} else "dossie"
    secoes: list[int] = []
    for item in src.get("secoes_excluidas") or []:
        try:
            number = int(item)
        except (TypeError, ValueError):
            continue
        if number > 0:
            secoes.append(number)
    slas: list[dict] = []
    for item in src.get("slas") or []:
        if not isinstance(item, dict):
            continue
        tipo = item.get("tipo")
        if tipo not in DEMAND_TYPES:
            continue
        try:
            dias = int(item.get("dias"))
        except (TypeError, ValueError):
            continue
        if dias > 0:
            slas.append({"tipo": tipo, "dias": dias})
    return {
        "active": bool(src.get("active", True)),
        "watch": bool(src.get("watch", False)),
        "automation": automation,
        "auto_types": types,
        "refino_destino": destino,
        "secoes_excluidas": secoes,
        "build_command": str(src.get("build_command") or "").strip(),
        "build_artifact": str(src.get("build_artifact") or "").strip(),
        "slas": slas,
        "bases": bases,
    }


def validate_control(control: dict) -> dict:
    """Recusa compilação automática sem comando. Não chama modelo."""
    clean = normalize_control(control)
    if clean["automation"]["auto_compilar"] and not clean["build_command"]:
        raise ControlError("A compilação automática exige um comando. Sem comando, a etapa fica bloqueada.")
    if clean["automation"]["auto_compilar"] and not clean["build_artifact"]:
        raise ControlError("A compilação automática exige o artefato que prova o sucesso.")
    return clean


def project_root(local_path: str | None) -> Path:
    raw = (local_path or "").strip()
    if not raw:
        raise ControlError("O projeto não tem pasta nesta máquina.")
    return Path(raw)


def ensure_layout(local_path: str | None) -> dict[str, Path]:
    """Cria fonte, demandas, entrega e as gavetas de memória sem mover o que já está na raiz."""
    root = project_root(local_path)
    root.mkdir(parents=True, exist_ok=True)
    paths = {
        "root": root,
        "fonte": root / "fonte",
        "demandas": root / "demandas",
        "entrega": root / "entrega",
        "memory": root / "memory",
        "casa": root / "memory" / "casa",
        "projeto": root / "memory" / "projeto",
        "agente": root / "memory" / "agente",
    }
    for key, path in paths.items():
        if key == "root":
            continue
        path.mkdir(parents=True, exist_ok=True)
    index = paths["memory"] / "MEMORY.md"
    if not index.is_file():
        index.write_text("# Memória do projeto\n\n<!-- tavir:memorias-do-projeto -->\n<!-- /tavir:memorias-do-projeto -->\n", encoding="utf-8")
    return paths


def write_bases_file(local_path: str | None, bases: list[str]) -> None:
    paths = ensure_layout(local_path)
    import json

    (paths["memory"] / "bases.json").write_text(
        json.dumps({"bases": bases}, ensure_ascii=False),
        encoding="utf-8",
    )


def automation_block_reason(control: dict | None, *, demand_type: str, opt_out: bool, action: str) -> str | None:
    """None quando a ação pode seguir. A frase é o que a tela mostra."""
    clean = normalize_control(control)
    if opt_out:
        return "Esta demanda está fora da automação."
    allowed = clean["auto_types"]
    if allowed and demand_type not in allowed:
        return "Este tipo de demanda não entra na automação."
    flag = {
        "entender": "auto_entender",
        "refinar": "auto_refinar",
        "corrigir": "auto_corrigir",
        "compilar": "auto_compilar",
        "entregar": "auto_entregar",
    }.get(action)
    if flag and not clean["automation"][flag]:
        return "A automação desta fase está desligada no projeto."
    if action == "compilar" and not clean["build_command"]:
        return "A compilação está bloqueada: o projeto não tem comando."
    return None
