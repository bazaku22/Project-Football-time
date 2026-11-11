import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-stats-import.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
DISCOVERY = (ROOT / "js" / "football-discovery.js").read_text(encoding="utf-8")


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
        self.assertIn("football-time-v44", WORKER)
        self.assertIn('"./css/football-discovery.css"', WORKER)
        self.assertIn('"./css/design-system.css?v=1"', WORKER)
        self.assertIn('"./css/match-center.css?v=1"', WORKER)
        self.assertIn('"./css/primary-navigation.css?v=1"', WORKER)
        self.assertIn('"./js/primary-navigation.js"', WORKER)
        self.assertIn('"./js/match-center.js"', WORKER)
        self.assertIn('"./css/ui-refresh-v2.css"', WORKER)
        self.assertIn('"./js/football-discovery.js"', WORKER)
        self.assertIn('"./js/player-stats-import.js"', WORKER)
        self.assertIn('"./js/player-cloud.js"', WORKER)


    def test_phase_a_search_results_render_club_crests(self):
        self.assertIn("function teamLogo(", DISCOVERY)
        self.assertIn("function matchTeamVisual(", DISCOVERY)
        self.assertIn("function resultVisual(", DISCOVERY)
        self.assertIn("has-team-visual", DISCOVERY)
        self.assertIn("homeTeam:", DISCOVERY)
        self.assertIn("awayTeam:", DISCOVERY)

    def test_phase_a_fixture_rows_use_existing_team_crest_data(self):
        self.assertIn("function findFootballTeamByName(", HTML)
        self.assertIn("function renderTeamCrest(", HTML)
        self.assertIn("renderTeamCrest(homeTeam)", HTML)
        self.assertIn("renderTeamCrest(awayTeam)", HTML)
        self.assertIn("fixture-match-teams", HTML)
        self.assertIn("football-time-v44", WORKER)


    def test_phase_a_broken_crest_urls_fall_back_to_initials(self):
        self.assertIn("this.nextElementSibling.hidden=false", DISCOVERY)
        self.assertIn("this.nextElementSibling.hidden=false", HTML)
        self.assertIn("discovery-crest-wrap", DISCOVERY)
        self.assertIn("team-crest-wrap", HTML)

    def test_service_worker_and_html_have_no_literal_newline_escape_corruption(self):
        self.assertNotIn("\\n", WORKER)
        self.assertNotIn("\\n", HTML)

if __name__ == "__main__":
    unittest.main()
