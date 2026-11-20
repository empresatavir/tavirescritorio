import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from router import ApiRequest, KeyRef, NoProviderAvailable, RapidApiRouter


class RouterOfflineTests(unittest.TestCase):
    def _router(self, env_text: str) -> RapidApiRouter:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        env = root / "api_keys.env"
        env.write_text(env_text, encoding="utf-8")
        state = root / "usage.json"
        providers = Path(__file__).with_name("providers.json")
        return RapidApiRouter(env, providers, state, instagram_config_path=None)

    def test_status_never_contains_key_value(self):
        router = self._router(
            "RAPIDAPI_KEY_1=secret-value\n"
            "RAPIDAPI_KEY_2=other-secret\n"
            "RAPIDAPI_INSTAGRAM_KEYS_BEST_EXPERIENCE=KEY_1\n"
        )
        status = json.dumps(router.status())
        self.assertNotIn("secret-value", status)
        self.assertIn("KEY_1", status)

    def test_provider_pool_and_configured_limit(self):
        router = self._router(
            "RAPIDAPI_KEY_1=one\n"
            "RAPIDAPI_KEY_2=two\n"
            "RAPIDAPI_INSTAGRAM_KEYS_BEST_EXPERIENCE=KEY_2\n"
            "RAPIDAPI_LIMIT_BEST_EXPERIENCE_KEY_2=37\n"
        )
        status = router.status()["best_experience"]
        self.assertEqual([item["key"] for item in status["keys"]], ["KEY_2"])
        self.assertEqual(status["keys"][0]["limit"], 37)

    def test_provider_default_limit_applies_to_whole_pool(self):
        router = self._router(
            "RAPIDAPI_KEY_1=a\nRAPIDAPI_KEY_2=b\nRAPIDAPI_KEY_3=c\n"
            "RAPIDAPI_INSTAGRAM_KEYS_SOCIAL_PREMIUM=KEY_1,KEY_2,KEY_3\n"
            "RAPIDAPI_LIMIT_SOCIAL_PREMIUM_DEFAULT=25\n"
            "RAPIDAPI_LIMIT_SOCIAL_PREMIUM_KEY_2=40\n"
        )
        keys = {item["key"]: item["limit"] for item in router.status()["social_premium"]["keys"]}
        self.assertEqual(keys, {"KEY_1": 25, "KEY_2": 40, "KEY_3": 25})

    def test_choose_key_orders_numerically_not_lexicographically(self):
        env = "".join(f"RAPIDAPI_KEY_{n}=k{n}\n" for n in range(1, 13))
        env += "RAPIDAPI_INSTAGRAM_KEYS_BEST_EXPERIENCE=" + ",".join(
            f"KEY_{n}" for n in range(1, 13)
        ) + "\n"
        router = self._router(env)
        provider = router.providers["best_experience"]
        self.assertEqual(router._choose_key(provider).label, "KEY_1")
        # Marca KEY_1 como usada; o próximo deve ser KEY_2, não KEY_10.
        router._entry(provider, KeyRef("KEY_1", "k1"))["used"] = 5
        self.assertEqual(router._choose_key(provider).label, "KEY_2")

    def test_unknown_provider_and_absolute_path_are_rejected(self):
        router = self._router("RAPIDAPI_KEY_1=one\n")
        with self.assertRaises(Exception):
            router.request(ApiRequest("unknown", "GET", "/profile"))
        with self.assertRaises(Exception):
            router.request(ApiRequest("best_experience", "GET", "https://evil.example"))

    def test_missing_pool_is_actionable(self):
        router = self._router("RAPIDAPI_KEY_1=\n")
        with self.assertRaises(NoProviderAvailable):
            router.request(ApiRequest("best_experience", "GET", "/profile"))

    def test_request_usage_counts_attempt_without_exposing_key_or_query(self):
        router = self._router(
            "RAPIDAPI_KEY_1=secret-value\n"
            "RAPIDAPI_INSTAGRAM_KEYS_BEST_EXPERIENCE=KEY_1\n"
        )
        with patch("router.urlopen", side_effect=TimeoutError):
            with self.assertRaises(NoProviderAvailable):
                router.request(ApiRequest("best_experience", "GET", "/profile", query={"username": "perfil"}))
        usage = router.request_usage()
        serialized = json.dumps(usage)
        self.assertEqual(1, usage["total"])
        self.assertEqual({"network_error": 1}, usage["by_outcome"])
        self.assertNotIn("secret-value", serialized)
        self.assertNotIn("perfil", serialized)


if __name__ == "__main__":
    unittest.main()
