"""O conector Cursor usa o agente local em modo leitura."""

import os

from app.modules.cursor_link.client import (
    _parse_auth,
    cli_command,
    cursor_model_id,
    extract_login_url,
    format_cursor_model,
)
from app.modules.ghostcli.client import ghost_effort_id, ghost_model_id
from app.modules.ghostcli.notice import plain_engine_error


def test_esforco_entra_no_modelo_do_cursor():
    assert format_cursor_model("composer-2.5", "xhigh") == "composer-2.5[effort=xhigh]"
    assert format_cursor_model("composer-2.5[effort=high]", "low") == "composer-2.5[effort=high]"
    assert format_cursor_model("auto-smart", "balanced") == "auto"
    assert format_cursor_model("auto-smart", "intelligence") == "auto"
    assert format_cursor_model("auto", "cost") == "auto"
    assert format_cursor_model("gpt-5", "low") == "gpt-5.2-low"
    assert format_cursor_model("gpt-5", "medium") == "gpt-5.2"
    assert format_cursor_model("gpt-5", "high") == "gpt-5.2-high"
    assert format_cursor_model("gpt-5", "xhigh") == "gpt-5.2-xhigh"
    assert format_cursor_model("sonnet-4-thinking", "medium") == "claude-sonnet-5-thinking-medium"
    assert format_cursor_model("sonnet-4-thinking", "xhigh") == "claude-sonnet-5-thinking-xhigh"


def test_reserva_traduz_o_modelo_do_outro_motor():
    assert ghost_model_id("composer-2.5") == "claude-opus-5-5"
    assert ghost_model_id("claude-sonnet-5") == "claude-sonnet-5"
    assert ghost_effort_id("balanced") == "medium"
    assert ghost_effort_id("xhigh") == "xhigh"
    assert cursor_model_id("claude-opus-5-5") == "composer-2.5"
    assert cursor_model_id("auto-smart") == "auto-smart"


def test_comando_local_nao_edita_arquivos():
    command = cli_command("agent", r"C:\temp\tavir-cursor", "composer-2.5")
    assert "--mode" in command
    assert command[command.index("--mode") + 1] == "ask"
    assert "--force" not in command
    assert "--yolo" not in command
    sandbox = "disabled" if os.name == "nt" else "enabled"
    assert command[command.index("--sandbox") + 1] == sandbox


def test_status_json_autenticado():
    assert _parse_auth('{"authenticated": true}', "") is True


def test_status_json_do_agente_real():
    raw = '{"status":"unauthenticated","isAuthenticated":false,"message":"Not logged in"}'
    assert _parse_auth(raw, "") is False


def test_extrai_o_link_de_login():
    url = (
        "https://cursor.com/loginDeepControl?challenge=abc"
        "&uuid=a3b3fba3-8077-43b3-9154-3f0c350102f6&mode=login"
        "&redirectTarget=cli&supportsSelectedTeamLogin=true"
    )
    wrapped = url[:50] + "\n" + url[50:]
    assert extract_login_url(f"Abra {wrapped} agora") == url
    assert extract_login_url(url[:90]) is None


def test_aviso_esconde_html_do_gateway():
    raw = (
        "Nenhum motor respondeu. HTTP 524: <!DOCTYPE html><html>cloudflare</html> "
        "O Cursor local não está autenticado. Rode agent login uma vez."
    )
    text = plain_engine_error(raw)
    assert "<" not in text
    assert "524" in text
    assert "Entrar no Cursor" in text
    assert len(text) < 320
