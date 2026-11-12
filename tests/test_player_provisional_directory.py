import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-provisional-directory.js").read_text(encoding="utf-8")
PLAYER_DB = (ROOT / "js" / "player-database.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class ProvisionalPlayerDirectoryTests(unittest.TestCase):
    def test_directory_tab_and_local_import_controls_exist(self):
        panel = HTML[HTML.index('id="dbtab-players"'):HTML.index('id="dbtab-accuracy"')]
        for marker in ('data-player-view="provisional"', 'provisionalPlayerImportPanel',
                       'provisionalPlayerCsv', 'provisionalPlayerImport',
                       'provisionalPlayerExport', 'provisionalPlayerImportStatus'):
            self.assertIn(marker, panel)
        self.assertIn('./js/player-provisional-directory.js', HTML)

    def test_import_validates_provider_season_identity_and_duplicates(self):
        for marker in ('provisional_player_key', 'provider_player_id', 'provider_team_ids',
                       'provisional_needs_manual_verification', '2026/27',
                       'Provider Player ID ซ้ำ', 'provisional:strikerapi:'):
            self.assertIn(marker, MODULE)

    def test_records_are_local_only_and_never_become_canonical(self):
        self.assertIn('localStorage.setItem(KEY', MODULE)
        self.assertIn('pft_provisional_player_directory_2026_27_v1', MODULE)
        self.assertNotRegex(MODULE, r'\bfetch\s*\(')
        self.assertNotIn('supabase', MODULE.lower())
        self.assertNotIn('canonical_player_id', MODULE)
        self.assertIn('kind:"provisional"', PLAYER_DB)
        self.assertIn('PROVISIONAL', PLAYER_DB)
        self.assertIn('ยังไม่ใช่ Canonical', PLAYER_DB)

    def test_service_worker_caches_new_module(self):
        self.assertIn('football-time-v70', WORKER)
        self.assertIn('./js/player-provisional-directory.js', WORKER)


if __name__ == "__main__":
    unittest.main()
