from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from collect_instagram import (
    LOGIN_URL,
    acquire_collection_lock,
    browser_spec,
    open_login_page,
    release_collection_lock,
)


class CollectionLockTests(unittest.TestCase):
    def test_active_profile_collection_blocks_duplicate(self):
        with tempfile.TemporaryDirectory() as temporary:
            control = Path(temporary)
            lock_path, state = acquire_collection_lock(control, "teste", "run-1")
            try:
                with self.assertRaisesRegex(RuntimeError, "COLETA_EM_ANDAMENTO"):
                    acquire_collection_lock(control, "teste", "run-2")
            finally:
                release_collection_lock(lock_path, state)
            self.assertFalse(lock_path.exists())

    def test_stale_lock_is_replaced(self):
        with tempfile.TemporaryDirectory() as temporary:
            control = Path(temporary)
            lock_path = control / ".collection.lock"
            lock_path.write_text(
                json.dumps({"owner_pid": 2147483647, "child_pid": None, "run_id": "stale"}),
                encoding="utf-8",
            )
            new_path, state = acquire_collection_lock(control, "teste", "run-new")
            try:
                current = json.loads(new_path.read_text(encoding="utf-8"))
                self.assertEqual("run-new", current["run_id"])
                self.assertEqual(os.getpid(), current["owner_pid"])
            finally:
                release_collection_lock(new_path, state)

    def test_tavir_profile_is_encoded_for_gallery_dl(self):
        self.assertEqual("chrome/instagram.com:Profile 5", browser_spec("chrome", "Profile 5"))

    @patch("collect_instagram.subprocess.Popen")
    @patch("collect_instagram.browser_executable", return_value="C:/Chrome/chrome.exe")
    def test_login_opens_the_selected_chrome_profile(self, _executable, popen):
        self.assertTrue(open_login_page("chrome", "Profile 5"))
        popen.assert_called_once()
        self.assertEqual(
            ["C:/Chrome/chrome.exe", "--profile-directory=Profile 5", LOGIN_URL],
            popen.call_args.args[0],
        )


if __name__ == "__main__":
    unittest.main()
