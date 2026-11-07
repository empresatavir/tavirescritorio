"""Chaves dos motores plugados no escritório. O arquivo fica fora do git."""
from __future__ import annotations

import json
import os
from pathlib import Path

_FILE = Path(__file__).resolve().parents[3] / "data" / "engine_secrets.json"


def secrets_path() -> Path:
    override = os.environ.get("TAVIR_SECRETS_PATH")
    if override:
        return Path(override)
    return _FILE


def _read() -> dict:
    path = secrets_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _write(data: dict) -> None:
    path = secrets_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def save_plug(engine_id: str, api_key: str, base_url: str | None = None) -> None:
    data = _read()
    row = {"api_key": (api_key or "").strip()}
    if base_url is not None:
        row["base_url"] = base_url.strip()
    data[engine_id] = row
    _write(data)


def plug_value(engine_id: str, field: str) -> str:
    row = _read().get(engine_id) or {}
    if not isinstance(row, dict):
        return ""
    return str(row.get(field) or "").strip()


def claude_key() -> str:
    return plug_value("claude", "api_key") or (os.environ.get("ANTHROPIC_API_KEY") or "").strip()


def codex_key() -> str:
    return plug_value("codex", "api_key") or (os.environ.get("OPENAI_API_KEY") or "").strip()


def antigravity_key() -> str:
    return plug_value("antigravity", "api_key") or (os.environ.get("ANTIGRAVITY_API_KEY") or "").strip()


def antigravity_base() -> str:
    saved = plug_value("antigravity", "base_url") or (os.environ.get("ANTIGRAVITY_BASE_URL") or "").strip()
    return saved.rstrip("/")
