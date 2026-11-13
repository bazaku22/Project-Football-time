import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "provisional-player-directory.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")

class ProvisionalPlayerDirectoryTests(unittest.TestCase):
    def test_directory_is_inside_current_player_database(self):
        panel = HTML[HTML.index('id="dbtab-players"'):HTML.index('id="dbtab-accuracy"')]
        for marker in ('id="playerHub"', 'id="playerHubLeagues"', 'id="playerHubTeams"', 'id="playerHubRoster"'):
            self.assertIn(marker, panel)
        self.assertIn("./js/provisional-player-directory.js", HTML)

    def test_import_is_strict_and_local_only(self):
        for marker in ("provisional_needs_manual_verification", "strikerapi", "2026/27", "localStorage", "PROVISIONAL"):
            self.assertIn(marker, MODULE)
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("provisional_player_key", MODULE)
        self.assertIn("Provider Player ID ซ้ำ", MODULE)

    def test_service_worker_caches_directory_script_and_bumps_version(self):
        self.assertIn("football-time-v74", WORKER)
        self.assertIn("./js/provisional-player-directory.js", WORKER)

if __name__ == "__main__":
    unittest.main()
