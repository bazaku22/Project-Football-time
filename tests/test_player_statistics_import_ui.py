import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-stats-import.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class PlayerStatisticsImportUITests(unittest.TestCase):
    def test_panel_is_separate_from_legacy_squad_preview(self):
        self.assertIn('id="playerStatsImportPanel"', HTML)
        self.assertIn('id="playerCloudPreviewPanel"', HTML)
        self.assertIn('id="playerStatsImportPanel"', HTML[HTML.index('id="dbtab-players"'):HTML.index('id="dbtab-accuracy"')])
        self.assertIn('./js/player-stats-import.js', HTML)

    def test_local_preview_controls_and_report_exports_exist(self):
        for marker in (
            "playerStatsCsv", "playerStatsMappingCsv", "playerStatsBuildPreview",
            "playerStatsImportSummary", "playerStatsImportRows",
            "playerStatsDownloadJson", "playerStatsDownloadCsv", "playerStatsReset",
            "preview_only:true", "source_sha256", "mapping_sha256",
        ):
            self.assertIn(marker, MODULE)

    def test_exact_provider_id_matching_and_2026_27_scope(self):
        self.assertIn('row.provider_player_id', MODULE)
        self.assertIn('row.season!=="2026/27"', MODULE)
        self.assertIn("canonical_player_key", MODULE)
        self.assertIn("exact provider/player ID mapping", MODULE)

    def test_no_network_or_database_write_path(self):
        self.assertNotRegex(MODULE, r"\bfetch\s*\(")
        self.assertNotIn("createClient", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertNotIn("localStorage", MODULE)
        self.assertIn("No database writes", MODULE)

    def test_service_worker_cache_version_and_asset(self):
        self.assertIn("football-time-v37", WORKER)
        self.assertIn('"./css/football-discovery.css"', WORKER)
        self.assertIn('"./js/football-discovery.js"', WORKER)
        self.assertIn('"./js/player-stats-import.js"', WORKER)
        self.assertIn('"./js/player-cloud.js"', WORKER)


if __name__ == "__main__":
    unittest.main()
