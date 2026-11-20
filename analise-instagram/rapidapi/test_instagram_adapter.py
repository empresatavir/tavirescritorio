from __future__ import annotations

import unittest

from instagram_adapter import find_user_id, parse_username


class InstagramAdapterOfflineTests(unittest.TestCase):
    def test_parse_profile_accepts_only_profile_url(self):
        username, canonical = parse_username("https://www.instagram.com/AirBridgeOficial/")
        self.assertEqual("airbridgeoficial", username)
        self.assertEqual("https://www.instagram.com/airbridgeoficial/", canonical)

    def test_parse_profile_rejects_post_and_query(self):
        for value in (
            "https://www.instagram.com/p/ABC123/",
            "https://www.instagram.com/perfil/?utm_source=x",
            "https://example.com/perfil/",
        ):
            with self.assertRaises(ValueError):
                parse_username(value)

    def test_find_user_id_does_not_assume_one_response_shape(self):
        self.assertEqual("12345", find_user_id({"user": {"pk": 12345}}))
        self.assertEqual("67890", find_user_id({"data": [{"id": "67890"}]}))
        self.assertEqual("", find_user_id({"username": "perfil"}))


if __name__ == "__main__":
    unittest.main()
