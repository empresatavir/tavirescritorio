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
