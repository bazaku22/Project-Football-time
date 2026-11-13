import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "provisional-player-directory.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")

class ProvisionalPlayerDirectoryTests(unittest.TestCase):
    def test_legacy_player_directory_ui_is_removed_from_app(self):
        for marker in ('id="dbtab-players"', 'id="playerHub"', 'id="playerHubLeagues"',
                       'id="playerHubTeams"', 'id="playerHubRoster"'):
            self.assertNotIn(marker, HTML)
        self.assertNotIn("./js/provisional-player-directory.js", HTML)
        self.assertNotIn("./js/provisional-player-directory.js", WORKER)

    def test_import_is_strict_and_local_only(self):
        for marker in ("provisional_needs_manual_verification", "strikerapi", "2026/27", "localStorage", "PROVISIONAL"):
            self.assertIn(marker, MODULE)
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("provisional_player_key", MODULE)
        self.assertIn("Provider Player ID ซ้ำ", MODULE)

    def test_service_worker_caches_directory_script_and_bumps_version(self):
        self.assertIn("football-time-v87", WORKER)
        self.assertIn("./js/provisional-player-directory.js", WORKER)

if __name__ == "__main__":
    unittest.main()
