"""O fixture visual congela a saudação na tarde de 29/10/2026."""
import os

from app.api.v1.settings_office import office_greeting, office_moment


def test_fixture_visual_congela_a_tarde(monkeypatch):
    monkeypatch.setenv("TAVIR_VISUAL_FIXTURE", "1")
    assert os.environ["TAVIR_VISUAL_FIXTURE"] == "1"
    moment = office_moment()
    assert moment.isoformat() == "2026-10-29T15:00:00-03:00"
    assert office_greeting(moment, "pt", "Carlos") == "Boa tarde, Carlos."
    assert office_greeting(moment, "en", "Helena") == "Good afternoon, Helena."
