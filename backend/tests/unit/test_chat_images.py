"""Imagens do chat: tipo, tamanho e arquivo servido só dentro da pasta da conversa."""
import base64

import pytest

from app.modules.chat.images import decode_uploads, resolve_image, save_images
from app.modules.chat.service import ChatService

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_plain_reply_drops_process_lead():
    raw = "Vou localizar o texto solicitado e responder apenas com ele.Vejo um quadrado vermelho."
    assert ChatService._plain_reply(raw) == "Vejo um quadrado vermelho."
    assert ChatService._plain_reply("Vejo um quadrado vermelho.") == "Vejo um quadrado vermelho."


def test_decode_png_and_reject_other_type():
    data_url = "data:image/png;base64," + base64.b64encode(PNG).decode()
    name, data, mime = decode_uploads([{"name": "foto.png", "data_url": data_url}])[0]
    assert name.endswith(".png")
    assert data.startswith(b"\x89PNG")
    assert mime == "image/png"
    with pytest.raises(ValueError, match="PNG"):
        decode_uploads([{"data_url": "data:text/plain;base64,YQ=="}])


def test_save_and_resolve(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.chat.images.image_root", lambda: tmp_path)
    monkeypatch.setattr("app.modules.chat.images.DB_PATH", tmp_path / "tavir.db")
    saved = save_images("cv-teste", "m-abc12345", [("anexo.png", PNG, "image/png")])
    assert saved[0]["url"].endswith("/cv-teste/m-abc12345-1.png")
    assert resolve_image("cv-teste", "m-abc12345-1.png") is not None
    assert resolve_image("cv-teste", "../tavir.db") is None
    assert resolve_image("../cv-teste", "m-abc12345-1.png") is None
