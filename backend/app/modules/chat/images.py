"""Imagens anexadas no chat do escritório. Ficam em disco e o motor as recebe junto do texto."""
from __future__ import annotations

import base64
import re
import shutil
from pathlib import Path

from app.shared.database import DB_PATH

MAX_IMAGES = 4
MAX_BYTES = 4 * 1024 * 1024
_TYPES = {
    "image/png": ("png", b"\x89PNG"),
    "image/jpeg": ("jpg", b"\xff\xd8"),
    "image/webp": ("webp", b"RIFF"),
    "image/gif": ("gif", b"GIF8"),
}
_NAME = re.compile(r"^m-[0-9a-f]{8}-\d+\.(png|jpg|webp|gif)$")
_CONV = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def image_root() -> Path:
    return DB_PATH.parent / "data" / "chat-images"


def decode_uploads(items: list[dict] | None) -> list[tuple[str, bytes, str]]:
    """Devolve (nome de arquivo, bytes, mime). Recusa tipo ou tamanho fora do limite."""
    uploads = items or []
    if len(uploads) > MAX_IMAGES:
        raise ValueError(f"Dá para anexar até {MAX_IMAGES} imagens.")
    decoded: list[tuple[str, bytes, str]] = []
    for item in uploads:
        raw = str(item.get("data_url") or "")
        header, sep, payload = raw.partition(",")
        if sep != "," or not header.startswith("data:") or ";base64" not in header:
            raise ValueError("Não consegui ler a imagem.")
        mime = header[5:].split(";", 1)[0].strip().lower()
        spec = _TYPES.get(mime)
        if spec is None:
            raise ValueError("Use PNG, JPEG, WEBP ou GIF.")
        ext, magic = spec
        try:
            data = base64.b64decode(payload, validate=True)
        except Exception as exc:
            raise ValueError("Não consegui ler a imagem.") from exc
        if not data.startswith(magic) or (mime == "image/webp" and data[8:12] != b"WEBP"):
            raise ValueError("O arquivo não é uma imagem válida.")
        if len(data) > MAX_BYTES:
            raise ValueError("Cada imagem pode ter até 4 MB.")
        decoded.append((f"anexo.{ext}", data, mime))
    return decoded


def save_images(conv_id: str, message_id: str, images: list[tuple[str, bytes, str]]) -> list[dict[str, str]]:
    if not images:
        return []
    if not _CONV.fullmatch(conv_id):
        raise ValueError("Conversa inválida.")
    folder = image_root() / conv_id
    folder.mkdir(parents=True, exist_ok=True)
    saved: list[dict[str, str]] = []
    for index, (_name, data, mime) in enumerate(images, start=1):
        ext = _TYPES[mime][0]
        filename = f"{message_id}-{index}.{ext}"
        (folder / filename).write_bytes(data)
        saved.append(
            {
                "name": f"Imagem {index}",
                "url": f"/api/v1/chat/images/{conv_id}/{filename}",
            }
        )
    return saved


def resolve_image(conv_id: str, name: str) -> Path | None:
    if not _CONV.fullmatch(conv_id) or not _NAME.fullmatch(name):
        return None
    path = (image_root() / conv_id / name).resolve()
    root = image_root().resolve()
    if root not in path.parents or not path.is_file():
        return None
    return path


def remove_conversation_images(conv_id: str) -> None:
    if not _CONV.fullmatch(conv_id):
        return
    folder = image_root() / conv_id
    if folder.is_dir():
        shutil.rmtree(folder, ignore_errors=True)
