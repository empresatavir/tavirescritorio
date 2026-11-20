from __future__ import annotations

import unittest

from video_link import find_author, find_video_url, summarize


class VideoLinkOfflineTests(unittest.TestCase):
    def test_find_video_url_in_known_shapes(self):
        self.assertEqual("https://cdn.x/a.mp4?x=1", find_video_url({"data": {"video_url": "https://cdn.x/a.mp4?x=1"}}))
        self.assertEqual("https://cdn.x/v/b", find_video_url({"video_versions": [{"url": "https://cdn.x/v/b"}]}))
        self.assertEqual("https://cdn.x/c", find_video_url({"medias": [{"type": "image", "url": "https://cdn.x/i.jpg"}, {"type": "video", "url": "https://cdn.x/c"}]}))

    def test_photo_post_has_no_video(self):
        self.assertEqual("", find_video_url({"display_url": "https://cdn.x/i.jpg", "medias": [{"type": "image", "url": "https://cdn.x/i.jpg"}]}))
        self.assertEqual("", find_video_url({"video_url": "http://inseguro/a.mp4"}))

    def test_summarize_reads_caption_author_and_counts(self):
        data = {"user": {"username": "perfil"}, "caption": {"text": "Legenda do vídeo"}, "like_count": 12, "edge_media_to_comment": {"count": 3}, "video_duration": 31.5}
        info = summarize(data)
        self.assertEqual("perfil", find_author(data))
        self.assertEqual("Legenda do vídeo", info["legenda"])
        self.assertEqual(12, info["curtidas"])
        self.assertEqual(3, info["comentarios"])
        self.assertEqual(31.5, info["duracao_s"])
        self.assertIsNone(info["visualizacoes"])


if __name__ == "__main__":
    unittest.main()
