"""O chat do projeto responde pelo retrato e só abre a pasta quando a pergunta pede o código."""
import tempfile
from types import SimpleNamespace

from app.modules.cursor_link.client import answer_inline
from app.modules.factory.chat_reply import fonte_prompt, local_text, needs_source, retrato_prompt


def _project():
    return SimpleNamespace(name="App Tavir", slug="app-tavir")


def _demand():
    return SimpleNamespace(
        code="DEM-001",
        status="rascunho",
        type="criacao",
        summary="Cerca da fábrica.",
        folder="demanda-teste",
        dossier={},
    )


def test_fato_da_demanda_nao_pede_modelo():
    text = local_text(_project(), _demand(), "entendimento", "Qual o código da demanda aberta?")
    assert text == "A demanda aberta é DEM-001."
    assert not needs_source("Qual o código da demanda aberta?")


def test_etapa_sai_do_retrato():
    text = local_text(_project(), None, "requirements", "Qual a etapa atual?")
    assert text == "A etapa atual de App Tavir é requirements."


def test_pergunta_de_codigo_abre_a_pasta():
    question = "Onde fica a função de login no código?"
    assert needs_source(question)
    assert local_text(_project(), _demand(), "entendimento", question) is None
    prompt = fonte_prompt(_project(), _demand(), "entendimento", question)
    assert "DEM-001" in prompt
    assert "C:\\" not in prompt


def test_resposta_do_retrato_passa_o_status(monkeypatch):
    captured = {}

    def _fake_stream(args, *, timeout, cwd, on_status):
        captured["on_status"] = on_status
        captured["timeout"] = timeout
        return type("Proc", (), {"returncode": 0, "stdout": '{"result":"ok"}', "stderr": ""})()

    monkeypatch.setattr("app.modules.cursor_link.client._stream_cli", _fake_stream)
    monkeypatch.setattr("app.modules.cursor_link.client._scratch_dir", lambda: _keep())

    assert answer_inline("agent", "composer-2.5", "low", "Oi", timeout=40) == "ok"
    assert captured["on_status"] is None
    assert captured["timeout"] == 40


class _keep:
    def __enter__(self):
        self._dir = tempfile.TemporaryDirectory()
        return self._dir.name

    def __exit__(self, *_args):
        self._dir.cleanup()
        return False


def test_pergunta_livre_leva_so_o_retrato():
    prompt = retrato_prompt(_project(), _demand(), "entendimento", [], "O prazo cabe nesta semana?")
    assert "DEM-001" in prompt
    assert "Não leia arquivo." in prompt
    assert "C:\\" not in prompt
