from app.modules.factory.engine_prefs import fit_call, resolve_default


def test_ghost_is_default_when_nothing_is_marked():
    assert resolve_default({}) == "ghostcli"


def test_marked_cursor_wins_only_while_enabled():
    assert resolve_default({"cursor": (True, True), "ghostcli": (True, False)}) == "cursor"
    assert resolve_default({"cursor": (False, True), "ghostcli": (True, False)}) == "ghostcli"


def test_cursor_becomes_default_when_ghost_is_off():
    assert resolve_default({"ghostcli": (False, False), "cursor": (True, False)}) == "cursor"


def test_no_default_when_both_real_engines_are_off():
    assert resolve_default({"ghostcli": (False, False), "cursor": (False, False)}) == ""


def test_fit_keeps_a_model_of_the_default_engine():
    assert fit_call("cursor", "auto-smart", "balanced") == ("cursor", "auto-smart", "balanced")


def test_fit_replaces_a_model_from_the_other_engine():
    assert fit_call("ghostcli", "auto-smart", "balanced") == ("ghostcli", "claude-opus-5-5", "xhigh")
    assert fit_call("cursor", "claude-opus-5-5", "xhigh") == ("cursor", "auto-smart", "balanced")


def test_marked_claude_wins_only_while_enabled():
    assert resolve_default({"claude": (True, True), "ghostcli": (True, False)}) == "claude"
    assert resolve_default({"claude": (False, True), "ghostcli": (True, False)}) == "ghostcli"


def test_fit_uses_the_plugged_engine_model():
    assert fit_call("claude", "auto-smart", "balanced") == ("claude", "claude-sonnet-4-5", "medium")
    assert fit_call("codex", "gpt-5-codex", "low") == ("codex", "gpt-5-codex", "low")
    assert fit_call("antigravity", "composer-2.5", "high") == ("antigravity", "antigravity", "medium")


def test_plug_keeps_the_key_on_disk_only(tmp_path, monkeypatch):
    import app.modules.factory.motor_secrets as secrets

    monkeypatch.setattr(secrets, "_FILE", tmp_path / "engine_secrets.json")
    secrets.save_plug("codex", "sk-codex-123456", None)
    secrets.save_plug("antigravity", "ag-secret-123456", "https://motor.exemplo/v1")
    assert secrets.codex_key() == "sk-codex-123456"
    assert secrets.antigravity_base() == "https://motor.exemplo/v1"
    assert "sk-codex-123456" not in secrets.plug_value("claude", "api_key")
