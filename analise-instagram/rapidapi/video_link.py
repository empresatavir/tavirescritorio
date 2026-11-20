#!/usr/bin/env python3
"""Vídeo do Instagram por link: extrai pela RapidAPI e baixa o arquivo original.

Uso: python video_link.py "<URL do Reel ou post>" --out <pasta>

Grava na pasta `video.json` (dados do vídeo e da coleta) e `video.mp4`. A extração é sempre
pela RapidAPI (`fetch_media`); não há rota de navegador aqui. Nenhuma Key é impressa nem gravada.

Códigos de saída: 0 ok · 2 link inválido · 3 RapidAPI indisponível · 4 falha ao gravar/baixar ·
5 a API respondeu sem link de vídeo.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from instagram_adapter import fetch_media, parse_media_url
from router import NoProviderAvailable, RouterError

MAX_BYTES = 300 * 1024 * 1024
VIDEO_KEYS = ("video_url", "video_versions", "video", "download_url", "url", "link", "medias", "links")
CAPTION_KEYS = ("caption", "text", "title", "description")
COUNT_KEYS = {
    "curtidas": ("like_count", "likes", "edge_media_preview_like"),
    "comentarios": ("comment_count", "comments", "edge_media_to_comment"),
    "visualizacoes": ("play_count", "video_view_count", "view_count", "video_play_count"),
    "duracao_s": ("video_duration", "duration"),
}


def _walk(value: Any):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from _walk(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk(item)


def _is_video_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.lower().startswith("https://"):
        return False
    path = urlsplit(value).path.lower()
    return path.endswith(".mp4") or ".mp4" in value.lower() or "/v/" in path or "video" in path


def find_video_url(data: Any) -> str:
    """Acha o link do arquivo de vídeo sem presumir um único formato de resposta."""
    for node in _walk(data):
        for key in ("video_url", "download_url"):
            if _is_video_url(node.get(key)):
                return node[key]
        versions = node.get("video_versions")
        if isinstance(versions, list):
            for item in versions:
                if isinstance(item, dict) and _is_video_url(item.get("url")):
                    return item["url"]
    for node in _walk(data):
        kind = str(node.get("type") or node.get("media_type") or "").lower()
        for key in ("url", "link"):
            if kind in {"video", "mp4", "2"} and isinstance(node.get(key), str) and node[key].startswith("https://"):
                return node[key]
            if isinstance(node.get(key), str) and urlsplit(node[key]).path.lower().endswith(".mp4"):
                return node[key]
    return ""


def _first_text(data: Any, keys: tuple[str, ...]) -> str:
    for node in _walk(data):
        for key in keys:
            value = node.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, dict) and isinstance(value.get("text"), str) and value["text"].strip():
                return value["text"].strip()
    return ""


def _first_number(data: Any, keys: tuple[str, ...]) -> float | None:
    for node in _walk(data):
        for key in keys:
            value = node.get(key)
            if isinstance(value, dict):
                value = value.get("count")
            if isinstance(value, bool):
                continue
            if isinstance(value, (int, float)):
                return value
    return None


def find_author(data: Any) -> str:
    for node in _walk(data):
        for key in ("user", "owner"):
            user = node.get(key)
            if isinstance(user, dict) and isinstance(user.get("username"), str) and user["username"]:
                return user["username"]
    return _first_text(data, ("username", "owner_username"))


def summarize(data: Any) -> dict[str, Any]:
    """Resumo do vídeo que o relatório usa (legenda, autor e números, quando a API entrega)."""
    out: dict[str, Any] = {"autor": find_author(data), "legenda": _first_text(data, CAPTION_KEYS)[:4000]}
    for name, keys in COUNT_KEYS.items():
        out[name] = _first_number(data, keys)
    return out


def download(url: str, dest: Path) -> int:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    total = 0
    with urllib.request.urlopen(request, timeout=60) as response, dest.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 256)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_BYTES:
                raise OSError("vídeo maior que o limite de download")
            handle.write(chunk)
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        parse_media_url(args.url)
    except ValueError as exc:
        print(f"LINK_INVALIDO: {exc}", file=sys.stderr)
        return 2
    try:
        media = fetch_media(args.url)
    except (RouterError, NoProviderAvailable) as exc:
        print(f"RAPIDAPI_BLOQUEADA: {exc}", file=sys.stderr)
        return 3
    video_url = find_video_url(media.get("data"))
    info = {
        "schema": "tavir-instagram-video/v1",
        "url": media["url"],
        "shortcode": media["shortcode"],
        "provedor": media["provedor"],
        "requests": media["requests"],
        **summarize(media.get("data")),
        "arquivo": "",
        "bytes": 0,
    }
    try:
        args.out.mkdir(parents=True, exist_ok=True)
        if not video_url:
            (args.out / "video.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
            print("SEM_VIDEO: a API respondeu, mas sem link de vídeo (o link pode ser de foto ou carrossel).", file=sys.stderr)
            return 5
        info["bytes"] = download(video_url, args.out / "video.mp4")
        info["arquivo"] = "video.mp4"
        (args.out / "video.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError as exc:
        print(f"DOWNLOAD_ERRO: {exc}", file=sys.stderr)
        return 4
    print(json.dumps({"status": "ok", "shortcode": info["shortcode"], "provedor": info["provedor"], "bytes": info["bytes"], "requests": info["requests"].get("total")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
