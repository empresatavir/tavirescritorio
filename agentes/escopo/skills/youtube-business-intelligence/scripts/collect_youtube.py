#!/usr/bin/env python3
"""Coleta metadados/legendas de um único vídeo e normaliza a transcrição."""

from __future__ import annotations

import argparse
import html
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}
TIMESTAMP_RE = re.compile(
    r"(?P<h1>\d{2}):(?P<m1>\d{2}):(?P<s1>\d{2})[.,]\d{3}\s+-->\s+"
    r"(?P<h2>\d{2}):(?P<m2>\d{2}):(?P<s2>\d{2})[.,]\d{3}"
)
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Coleta um vídeo público do YouTube para análise interna."
    )
    parser.add_argument("url", help="URL HTTPS de um único vídeo do YouTube")
    parser.add_argument("--output", required=True, help="Diretório local do projeto")
    parser.add_argument(
        "--audio-fallback",
        action="store_true",
        help="Baixa somente áudio e usa faster-whisper se nenhuma legenda existir",
    )
    parser.add_argument(
        "--keep-audio",
        action="store_true",
        help="Preserva o áudio local após transcrição",
    )
    parser.add_argument(
        "--model",
        default="small",
        help="Modelo faster-whisper usado no fallback (padrão: small)",
    )
    return parser.parse_args()


def validate_url(value: str) -> str:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or host not in ALLOWED_HOSTS:
        raise ValueError("Use uma URL HTTPS válida de youtube.com ou youtu.be.")
    if "list" in parsed.query and not (
        parsed.path == "/watch" or host == "youtu.be"
    ):
        raise ValueError("A coleta aceita um vídeo; playlists exigem fluxo explícito.")
    return value


def run(
    command: list[str],
    *,
    capture: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=check,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def ytdlp_command() -> list[str]:
    if importlib.util.find_spec("yt_dlp"):
        return [sys.executable, "-m", "yt_dlp"]
    executable = shutil.which("yt-dlp")
    if executable:
        return [executable]
    raise RuntimeError(
        "yt-dlp não encontrado. Rode setup_environment.py antes da coleta."
    )


def selected_metadata(raw: dict) -> dict:
    fields = (
        "id",
        "title",
        "channel",
        "channel_id",
        "uploader",
        "duration",
        "upload_date",
        "timestamp",
        "webpage_url",
        "original_url",
        "description",
        "language",
        "availability",
        "live_status",
        "view_count",
        "like_count",
        "chapters",
        "tags",
    )
    return {field: raw.get(field) for field in fields}


def preferred_subtitle_language(raw: dict) -> tuple[str | None, str | None]:
    manual = set((raw.get("subtitles") or {}).keys())
    automatic = set((raw.get("automatic_captions") or {}).keys())
    for language in ("pt-orig", "pt-BR", "pt", "en-orig", "en"):
        if language in manual:
            return language, "legenda manual do YouTube"
        if language in automatic:
            return language, "legenda automática do YouTube"
    return None, None


def clean_caption(text: str) -> str:
    text = html.unescape(TAG_RE.sub("", text))
    return SPACE_RE.sub(" ", text).strip()


def timestamp_from_match(match: re.Match[str]) -> str:
    return f"{match.group('h1')}:{match.group('m1')}:{match.group('s1')}"


def parse_vtt(path: Path) -> list[tuple[str, str]]:
    lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    cues: list[tuple[str, str]] = []
    index = 0
    while index < len(lines):
        match = TIMESTAMP_RE.search(lines[index])
        if not match:
            index += 1
            continue
        stamp = timestamp_from_match(match)
        index += 1
        parts: list[str] = []
        while index < len(lines) and lines[index].strip():
            parts.append(lines[index])
            index += 1
        caption = clean_caption(" ".join(parts))
        if not caption:
            continue
        if cues:
            previous = cues[-1][1]
            if caption == previous:
                continue
            if caption.startswith(previous) and len(caption) <= len(previous) + 120:
                cues[-1] = (cues[-1][0], caption)
                continue
        cues.append((stamp, caption))
    return cues


def choose_subtitle(paths: list[Path], preferred_language: str | None = None) -> Path | None:
    if not paths:
        return None
    if preferred_language:
        preferred = [
            path
            for path in paths
            if path.name.lower().endswith(f".{preferred_language.lower()}.vtt")
        ]
        if preferred:
            return sorted(preferred)[0]

    def rank(path: Path) -> tuple[int, int, str]:
        name = path.name.lower()
        language_rank = 4
        if ".pt-br." in name:
            language_rank = 0
        elif ".pt." in name or ".pt-" in name:
            language_rank = 1
        elif ".en." in name or ".en-" in name:
            language_rank = 2
        automatic_penalty = 1 if ".auto." in name else 0
        return (language_rank, automatic_penalty, name)

    return sorted(paths, key=rank)[0]


def write_transcript(
    path: Path,
    metadata: dict,
    cues: list[tuple[str, str]],
    source_kind: str,
    source_file: str,
) -> None:
    header = [
        "# Transcrição normalizada",
        "",
        f"- Título: {metadata.get('title') or 'indisponível'}",
        f"- Canal: {metadata.get('channel') or metadata.get('uploader') or 'indisponível'}",
        f"- URL: {metadata.get('webpage_url') or metadata.get('original_url') or ''}",
        f"- Fonte: {source_kind}",
        f"- Arquivo de origem: `{source_file}`",
        "",
        "> Material de trabalho interno. Timestamps são aproximações da fonte.",
        "",
    ]
    body = [f"[{stamp}] {text}" for stamp, text in cues]
    path.write_text("\n".join(header + body) + "\n", encoding="utf-8")


def transcribe_audio(
    ytdlp: list[str],
    url: str,
    source_dir: Path,
    model_name: str,
) -> tuple[list[tuple[str, str]], Path]:
    if importlib.util.find_spec("faster_whisper") is None:
        raise RuntimeError(
            "Nenhuma legenda disponível e faster-whisper não está instalado. "
            "Rode setup_environment.py --with-transcription."
        )
    audio_template = source_dir / "audio.%(ext)s"
    run(
        ytdlp
        + [
            "--no-playlist",
            "-f",
            "bestaudio/best",
            "-x",
            "--audio-format",
            "m4a",
            "-o",
            str(audio_template),
            url,
        ]
    )
    candidates = sorted(source_dir.glob("audio.*"))
    if not candidates:
        raise RuntimeError("O áudio não foi gerado pelo yt-dlp.")
    audio_path = candidates[0]
    from faster_whisper import WhisperModel  # type: ignore

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _info = model.transcribe(
        str(audio_path), vad_filter=True, beam_size=5
    )
    cues: list[tuple[str, str]] = []
    for segment in segments:
        seconds = max(0, int(segment.start))
        stamp = f"{seconds // 3600:02d}:{(seconds % 3600) // 60:02d}:{seconds % 60:02d}"
        text = clean_caption(segment.text)
        if text:
            cues.append((stamp, text))
    return cues, audio_path


def main() -> int:
    args = parse_args()
    try:
        url = validate_url(args.url)
        output = Path(args.output).expanduser().resolve()
        source_dir = output / "fonte"
        subtitle_dir = source_dir / "subtitles"
        processed_dir = output / "processado"
        control_dir = output / "controle"
        for directory in (subtitle_dir, processed_dir, control_dir, output / "relatorios"):
            directory.mkdir(parents=True, exist_ok=True)

        ytdlp = ytdlp_command() + ["--js-runtimes", "node"]
        metadata_result = run(
            ytdlp + ["--dump-single-json", "--skip-download", "--no-playlist", url],
            capture=True,
        )
        raw_metadata = json.loads(metadata_result.stdout)
        metadata = selected_metadata(raw_metadata)
        (source_dir / "metadata.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        subtitle_language, subtitle_kind = preferred_subtitle_language(raw_metadata)
        subtitle_returncode = 0
        if subtitle_language:
            subtitle_result = run(
                ytdlp
                + [
                    "--skip-download",
                    "--no-playlist",
                    "--write-subs",
                    "--write-auto-subs",
                    "--sub-langs",
                    subtitle_language,
                    "--sub-format",
                    "vtt",
                    "-o",
                    str(subtitle_dir / "%(id)s.%(language)s.%(ext)s"),
                    url,
                ],
                check=False,
            )
            subtitle_returncode = subtitle_result.returncode
        subtitle = choose_subtitle(
            list(subtitle_dir.glob("*.vtt")), subtitle_language
        )
        source_kind = subtitle_kind or "legenda do YouTube"
        source_file = ""
        audio_path: Path | None = None
        if subtitle:
            cues = parse_vtt(subtitle)
            source_file = subtitle.name
        elif args.audio_fallback:
            cues, audio_path = transcribe_audio(ytdlp, url, source_dir, args.model)
            source_kind = f"transcrição local faster-whisper ({args.model})"
            source_file = audio_path.name
        else:
            cues = []

        status = "ok" if cues else "sem_transcricao"
        transcript_path = processed_dir / "transcricao.md"
        if cues:
            write_transcript(
                transcript_path, metadata, cues, source_kind, source_file
            )
        if audio_path and not args.keep_audio:
            audio_path.unlink(missing_ok=True)

        manifest = {
            "schema_version": "1.0",
            "status": status,
            "collected_at": datetime.now(timezone.utc).isoformat(),
            "url": url,
            "video_id": metadata.get("id"),
            "transcript_source": source_kind if cues else None,
            "source_file": source_file or None,
            "cue_count": len(cues),
            "transcript_path": str(transcript_path) if cues else None,
            "limitations": (
                (
                    []
                    if subtitle_returncode == 0
                    else [
                        "O yt-dlp reportou falha parcial ao buscar legendas; "
                        "a fonte selecionada foi validada e preservada."
                    ]
                )
                if cues
                else [
                    "Nenhuma legenda disponível. Configure o fallback local de áudio."
                ]
            ),
        }
        (control_dir / "manifesto.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(manifest, ensure_ascii=False))
        return 0 if cues else 3
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        print(f"ERRO_COLETA: {detail}", file=sys.stderr)
        return 2
    except (ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
