import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-database.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class PlayerProvisionalDirectoryTests(unittest.TestCase):
    def test_provisional_directory_view_and_local_import_controls_exist(self):
        panel = HTML[HTML.index('id="dbtab-players"'):HTML.index('id="dbtab-accuracy"')]
        self.assertIn('data-player-view="provisional"', panel)
        self.assertIn('id="playerProvisionalCsv"', panel)
        self.assertIn('id="playerProvisionalClear"', panel)
        self.assertIn('id="playerProvisionalImportStatus"', panel)

    def test_csv_import_validates_provisional_rows_and_provider_identity(self):
        for marker in (
            "pft_player_provisional_directory_2026_27_v1",
            "function parseCsv",
            "provisional_player_key",
            "provider_player_id",
            "provisional_needs_manual_verification",
            "Provider ID:",
            "Provider Team ID:",
            'view==="provisional"',
        ):
            self.assertIn(marker, MODULE)
        self.assertIn("localStorage.setItem(PROVISIONAL_KEY", MODULE)
        self.assertIn("localStorage.removeItem(PROVISIONAL_KEY)", MODULE)

    def test_import_is_local_only_and_does_not_create_canonical_ids_or_cloud_writes(self):
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("createClient", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("ยังไม่ใช่ Canonical ID", MODULE)
        self.assertIn("ไม่เขียน Cloud", MODULE)

    def test_service_worker_cache_is_bumped(self):
        self.assertIn('const CACHE = "football-time-v70"', WORKER)


if __name__ == "__main__":
    unittest.main()
