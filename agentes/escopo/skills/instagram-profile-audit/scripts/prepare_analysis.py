#!/usr/bin/env python3
"""Prepara inventário, corpus textual, áudio, frames, OCR e contact sheets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


SOURCE_DIRS = ("Imagens", "Reels", "Stories", "Destaques", "Perfil")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".mkv", ".m4v"}
TEXT_KEYS = {
    "caption",
    "description",
    "title",
    "text",
    "biography",
    "accessibility_caption",
    "alt_text",
    "hashtags",
    "username",
    "full_name",
}


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")


def rel(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def asset_id(path: Path, root: Path) -> str:
    digest = hashlib.sha1(rel(path, root).encode("utf-8")).hexdigest()[:10]
    return f"{path.parent.name.lower()}-{path.stem[:40]}-{digest}"


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def metadata_for(media: Path) -> list[Path]:
    candidates = {
        media.with_suffix(media.suffix + ".json"),
        media.with_suffix(".json"),
        media.parent / f"{media.name}.json",
    }
    return sorted(path for path in candidates if path.exists())


def walk_text(value: Any, key: str = "") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for child_key, child_value in value.items():
            yield from walk_text(child_value, str(child_key).lower())
    elif isinstance(value, list):
        for child in value:
            yield from walk_text(child, key)
    elif isinstance(value, str) and key in TEXT_KEYS:
        clean = " ".join(value.split())
        if clean and len(clean) > 1:
            yield key, clean


def probe_video(path: Path) -> dict[str, Any]:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return {"erro": "ffprobe não encontrado"}
    process = run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=width,height,codec_name",
            "-of",
            "json",
            str(path),
        ]
    )
    if process.returncode != 0:
        return {"erro": process.stderr.strip() or "ffprobe falhou"}
    try:
        data = json.loads(process.stdout)
    except json.JSONDecodeError:
        return {"erro": "ffprobe retornou JSON inválido"}
    duration = float(data.get("format", {}).get("duration") or 0)
    video_stream = next(
        (item for item in data.get("streams", []) if item.get("width") and item.get("height")),
        {},
    )
    return {
        "duracao_segundos": round(duration, 3),
        "largura": video_stream.get("width"),
        "altura": video_stream.get("height"),
        "codec": video_stream.get("codec_name"),
    }


def image_dimensions(path: Path) -> tuple[int | None, int | None]:
    try:
        from PIL import Image

        with Image.open(path) as image:
            return image.size
    except Exception:
        return None, None


def frame_times(duration: float, count: int) -> list[float]:
    if duration <= 0:
        return [0.0]
    if duration < 4:
        return [max(0.0, duration / 2)]
    fractions = [0.05, 0.25, 0.5, 0.75, 0.95]
    selected = fractions[: max(1, min(count, len(fractions)))]
    if count < len(fractions):
        step = (len(fractions) - 1) / max(1, count - 1)
        selected = [fractions[round(index * step)] for index in range(count)]
    return sorted({round(min(duration - 0.05, duration * fraction), 3) for fraction in selected})


def extract_frames(video: Path, output: Path, duration: float, count: int) -> list[Path]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return []
    output.mkdir(parents=True, exist_ok=True)
    frames: list[Path] = []
    for index, moment in enumerate(frame_times(duration, count), start=1):
        target = output / f"frame-{index:02d}-{moment:07.2f}s.jpg"
        if not target.exists():
            process = run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-ss",
                    str(moment),
                    "-i",
                    str(video),
                    "-frames:v",
                    "1",
                    "-q:v",
                    "3",
                    "-y",
                    str(target),
                ]
            )
            if process.returncode != 0:
                continue
        frames.append(target)
    return frames


def extract_audio(video: Path, target: Path) -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return False
    if target.exists() and target.stat().st_size > 0:
        return True
    target.parent.mkdir(parents=True, exist_ok=True)
    process = run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            "-y",
            str(target),
        ]
    )
    if process.returncode != 0:
        target.unlink(missing_ok=True)
        return False
    return True


def build_sheet(images: list[Path], target: Path, labels: list[str] | None = None) -> bool:
    try:
        from PIL import Image, ImageDraw, ImageFont, ImageOps
    except ImportError:
        return False
    if not images:
        return False
    cell_w, cell_h, label_h = 320, 320, 34
    columns = min(4, len(images))
    rows = math.ceil(len(images) / columns)
    canvas = Image.new("RGB", (columns * cell_w, rows * (cell_h + label_h)), "#EDEAE4")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for index, path in enumerate(images):
        try:
            with Image.open(path) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((cell_w - 12, cell_h - 12))
                x = (index % columns) * cell_w + (cell_w - image.width) // 2
                y = (index // columns) * (cell_h + label_h) + (cell_h - image.height) // 2
                canvas.paste(image, (x, y))
        except Exception:
            continue
        label = labels[index] if labels and index < len(labels) else path.name
        label = label[:48]
        x = (index % columns) * cell_w + 8
        y = (index // columns) * (cell_h + label_h) + cell_h + 8
        draw.text((x, y), label, fill="#1C1F26", font=font)
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, quality=88)
    return True


def transcribe_audio(audio: Path, model: Any, target_dir: Path, language: str | None) -> dict[str, Any]:
    target_dir.mkdir(parents=True, exist_ok=True)
    segments, info = model.transcribe(
        str(audio),
        language=language,
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    materialized = []
    for segment in segments:
        text = " ".join(segment.text.split())
        if text:
            materialized.append(
                {"inicio": round(segment.start, 3), "fim": round(segment.end, 3), "texto": text}
            )
    payload = {
        "idioma": getattr(info, "language", language),
        "probabilidade_idioma": getattr(info, "language_probability", None),
        "segmentos": materialized,
        "texto": " ".join(item["texto"] for item in materialized),
    }
    json_path = target_dir / f"{audio.stem}.json"
    txt_path = target_dir / f"{audio.stem}.txt"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    txt_path.write_text(payload["texto"], encoding="utf-8")
    return {"json": json_path, "txt": txt_path, "texto": payload["texto"]}


def run_ocr(images: list[Path], target: Path, language: str) -> str | None:
    tesseract = shutil.which("tesseract")
    if not tesseract or not images:
        return None
    chunks: list[str] = []
    for image in images:
        process = run([tesseract, str(image), "stdout", "-l", language, "--psm", "6"])
        if process.returncode == 0:
            clean = "\n".join(line.strip() for line in process.stdout.splitlines() if line.strip())
            if clean:
                chunks.append(f"[{image.name}]\n{clean}")
    if not chunks:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    text = "\n\n".join(chunks)
    target.write_text(text, encoding="utf-8")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile_dir", type=Path, help="pasta analise-instagram/perfis/<perfil>")
    parser.add_argument("--deep-video-limit", type=int, default=40, help="vídeos recentes processados a fundo")
    parser.add_argument("--deep-image-limit", type=int, default=120, help="imagens recentes em contact sheets/OCR")
    parser.add_argument("--frames-per-video", type=int, default=5)
    parser.add_argument("--skip-audio", action="store_true")
    parser.add_argument("--transcribe", choices=("auto", "none"), default="auto")
    parser.add_argument("--whisper-model", default="small")
    parser.add_argument("--language", default="pt", help="idioma Whisper; use auto para detectar")
    parser.add_argument("--ocr", choices=("auto", "none"), default="auto")
    parser.add_argument("--ocr-language", default="por+eng")
    args = parser.parse_args()

    root = args.profile_dir.resolve()
    if not root.exists():
        parser.error(f"pasta inexistente: {root}")
    process_root = root / "processado"
    frames_root = process_root / "frames"
    audio_root = process_root / "audio"
    transcripts_root = process_root / "transcricoes"
    ocr_root = process_root / "ocr"
    sheets_root = process_root / "contact-sheets"
    for folder in (process_root, frames_root, audio_root, transcripts_root, ocr_root, sheets_root):
        folder.mkdir(parents=True, exist_ok=True)

    media: list[Path] = []
    for source in SOURCE_DIRS:
        folder = root / source
        if folder.exists():
            media.extend(
                path
                for path in folder.rglob("*")
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
            )
    media.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    videos = [path for path in media if path.suffix.lower() in VIDEO_EXTENSIONS]
    images = [path for path in media if path.suffix.lower() in IMAGE_EXTENSIONS]
    deep_videos = videos if args.deep_video_limit == 0 else videos[: args.deep_video_limit]
    deep_images = images if args.deep_image_limit == 0 else images[: args.deep_image_limit]
    deep_image_set = set(deep_images)

    whisper_model = None
    transcription_note = "desativada"
    if args.transcribe == "auto" and deep_videos:
        try:
            from faster_whisper import WhisperModel

            whisper_model = WhisperModel(args.whisper_model, device="cpu", compute_type="int8")
            transcription_note = f"faster-whisper local ({args.whisper_model})"
        except ImportError:
            transcription_note = "não executada: faster-whisper não instalado"
        except Exception as exc:
            transcription_note = f"não executada: falha ao carregar modelo ({exc})"

    entries: list[dict[str, Any]] = []
    corpus_blocks: list[str] = []
    seen_texts: set[str] = set()
    video_deep_set = set(deep_videos)
    associated_metadata: set[Path] = set()

    for index, path in enumerate(media, start=1):
        identifier = asset_id(path, root)
        media_type = "video" if path.suffix.lower() in VIDEO_EXTENSIONS else "imagem"
        entry: dict[str, Any] = {
            "ordem": index,
            "id": identifier,
            "categoria": path.relative_to(root).parts[0],
            "tipo": media_type,
            "arquivo": rel(path, root),
            "bytes": path.stat().st_size,
            "modificado_em": datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat(),
            "metadados": [],
            "processamento_profundo": path in video_deep_set or path in deep_image_set,
        }
        texts: list[tuple[str, str, str]] = []
        for metadata_path in metadata_for(path):
            associated_metadata.add(metadata_path.resolve())
            entry["metadados"].append(rel(metadata_path, root))
            data = load_json(metadata_path)
            if data is not None:
                for key, text in walk_text(data):
                    texts.append((key, text, rel(metadata_path, root)))

        if media_type == "video":
            probe = probe_video(path)
            entry.update(probe)
            if path in video_deep_set:
                duration = float(probe.get("duracao_segundos") or 0)
                frame_dir = frames_root / identifier
                frames = extract_frames(path, frame_dir, duration, args.frames_per_video)
                entry["frames"] = [rel(item, root) for item in frames]
                sheet = sheets_root / f"{identifier}.jpg"
                if build_sheet(frames, sheet):
                    entry["contact_sheet"] = rel(sheet, root)
                if args.ocr == "auto":
                    ocr_text = run_ocr(frames, ocr_root / f"{identifier}.txt", args.ocr_language)
                    if ocr_text:
                        entry["ocr"] = rel(ocr_root / f"{identifier}.txt", root)
                        texts.append(("ocr", ocr_text, entry["ocr"]))
                if not args.skip_audio:
                    audio = audio_root / f"{identifier}.wav"
                    if extract_audio(path, audio):
                        entry["audio"] = rel(audio, root)
                        if whisper_model is not None:
                            language = None if args.language == "auto" else args.language
                            try:
                                transcript = transcribe_audio(audio, whisper_model, transcripts_root, language)
                                entry["transcricao"] = rel(transcript["txt"], root)
                                if transcript["texto"]:
                                    texts.append(("transcricao", transcript["texto"], entry["transcricao"]))
                            except Exception as exc:
                                entry["erro_transcricao"] = str(exc)
        else:
            width, height = image_dimensions(path)
            entry["largura"] = width
            entry["altura"] = height
            if path in deep_images and args.ocr == "auto":
                ocr_text = run_ocr([path], ocr_root / f"{identifier}.txt", args.ocr_language)
                if ocr_text:
                    entry["ocr"] = rel(ocr_root / f"{identifier}.txt", root)
                    texts.append(("ocr", ocr_text, entry["ocr"]))

        unique_for_entry: list[dict[str, str]] = []
        for key, text, source in texts:
            fingerprint = text.casefold()
            if fingerprint in seen_texts:
                continue
            seen_texts.add(fingerprint)
            unique_for_entry.append({"tipo": key, "texto": text, "fonte": source})
            corpus_blocks.append(
                f"## {identifier}\n\n- Categoria: {entry['categoria']}\n"
                f"- Mídia: `{entry['arquivo']}`\n- Fonte textual: `{source}` ({key})\n\n{text}\n"
            )
        entry["textos"] = unique_for_entry
        entries.append(entry)

    standalone_metadata: list[dict[str, Any]] = []
    for source in SOURCE_DIRS:
        folder = root / source
        if not folder.exists():
            continue
        for metadata_path in sorted(folder.rglob("*.json")):
            if metadata_path.resolve() in associated_metadata:
                continue
            data = load_json(metadata_path)
            if data is None:
                continue
            extracted: list[dict[str, str]] = []
            for key, text in walk_text(data):
                fingerprint = text.casefold()
                if fingerprint in seen_texts:
                    continue
                seen_texts.add(fingerprint)
                source_path = rel(metadata_path, root)
                extracted.append({"tipo": key, "texto": text})
                corpus_blocks.append(
                    f"## metadata-{metadata_path.stem}\n\n- Categoria: {source}\n"
                    f"- Fonte textual: `{source_path}` ({key})\n\n{text}\n"
                )
            if extracted:
                standalone_metadata.append(
                    {"arquivo": rel(metadata_path, root), "categoria": source, "textos": extracted}
                )

    for batch_index in range(0, len(deep_images), 24):
        batch = deep_images[batch_index : batch_index + 24]
        target = sheets_root / f"imagens-{batch_index // 24 + 1:03d}.jpg"
        build_sheet(batch, target, [rel(item, root) for item in batch])

    counts_category = Counter(entry["categoria"] for entry in entries)
    counts_type = Counter(entry["tipo"] for entry in entries)
    inventory = {
        "schema": "instagram-analysis-inventory/v1",
        "perfil": root.name,
        "gerado_em": datetime.now().astimezone().isoformat(timespec="seconds"),
        "raiz": str(root),
        "resumo": {
            "midias_total": len(entries),
            "por_categoria": dict(sorted(counts_category.items())),
            "por_tipo": dict(sorted(counts_type.items())),
            "videos_processados_a_fundo": len(deep_videos),
            "imagens_em_amostra_visual": len(deep_images),
            "textos_unicos": len(seen_texts),
            "metadados_avulsos": len(standalone_metadata),
            "transcricao": transcription_note,
            "ocr": "tesseract local" if shutil.which("tesseract") and args.ocr == "auto" else "não executado",
        },
        "limites": {
            "deep_video_limit": args.deep_video_limit,
            "deep_image_limit": args.deep_image_limit,
            "frames_per_video": args.frames_per_video,
        },
        "itens": entries,
        "metadados_avulsos": standalone_metadata,
    }
    inventory_path = process_root / "inventario.json"
    inventory_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    corpus_path = process_root / "corpus-textual.md"
    corpus_path.write_text(
        f"# Corpus textual — @{root.name}\n\n"
        f"> Gerado em {inventory['gerado_em']}. Textos deduplicados de metadados, OCR e transcrições.\n\n"
        + ("\n".join(corpus_blocks) if corpus_blocks else "Nenhum texto extraído.\n"),
        encoding="utf-8",
    )
    print(f"Inventário: {inventory_path}")
    print(f"Corpus: {corpus_path}")
    print(json.dumps(inventory["resumo"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
