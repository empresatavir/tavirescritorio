#!/usr/bin/env python3
"""Testes offline do parser e dos limites do coletor."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("collect_youtube.py")
SPEC = importlib.util.spec_from_file_location("collect_youtube", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CollectorTests(unittest.TestCase):
    def test_url_allowlist(self) -> None:
        self.assertEqual(
            MODULE.validate_url("https://youtu.be/BaW_jenozKc"),
            "https://youtu.be/BaW_jenozKc",
        )
        with self.assertRaises(ValueError):
            MODULE.validate_url("http://youtube.com/watch?v=x")
        with self.assertRaises(ValueError):
            MODULE.validate_url("https://example.com/watch?v=x")

    def test_vtt_normalization_and_deduplication(self) -> None:
        content = """WEBVTT

00:00:01.000 --> 00:00:03.000
Olá <c>mundo</c>

00:00:02.000 --> 00:00:04.000
Olá mundo

00:00:05.000 --> 00:00:07.000
Uma ideia &amp; um teste
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.pt.vtt"
            path.write_text(content, encoding="utf-8")
            self.assertEqual(
                MODULE.parse_vtt(path),
                [
                    ("00:00:01", "Olá mundo"),
                    ("00:00:05", "Uma ideia & um teste"),
                ],
            )

    def test_subtitle_preference(self) -> None:
        paths = [
            Path("video.en.vtt"),
            Path("video.pt.vtt"),
            Path("video.pt-BR.vtt"),
        ]
        self.assertEqual(MODULE.choose_subtitle(paths).name, "video.pt-BR.vtt")
        translated = [
            Path("video.pt-BR.en.vtt"),
            Path("video.pt-BR.pt-orig.vtt"),
        ]
        self.assertEqual(
            MODULE.choose_subtitle(translated, "pt-orig").name,
            "video.pt-BR.pt-orig.vtt",
        )

    def test_language_selection_prefers_original_portuguese(self) -> None:
        raw = {
            "subtitles": {"en": []},
            "automatic_captions": {"pt": [], "pt-orig": [], "en": []},
        }
        self.assertEqual(
            MODULE.preferred_subtitle_language(raw),
            ("pt-orig", "legenda automática do YouTube"),
        )


if __name__ == "__main__":
    unittest.main()
