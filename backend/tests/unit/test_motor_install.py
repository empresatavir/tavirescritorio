from app.modules.factory.motor_install import parse_claude_status, parse_codex_status


def test_claude_status_reads_logged_in():
    assert parse_claude_status('{"loggedIn": false, "authMethod": "none"}') is False
    assert parse_claude_status('{"loggedIn": true}') is True
    assert parse_claude_status("não é json") is False


def test_codex_status_rejects_the_logged_out_phrase():
    assert parse_codex_status("Not logged in", "") is False
    assert parse_codex_status("Logged in using ChatGPT", "") is True
