import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseWorkspaceTests(unittest.TestCase):
    def test_research_pilot_is_visible_but_not_production_data(self):
        data = json.loads((ROOT / "data/player-position-pilot-2026-27.json").read_text())
        self.assertEqual(data["status"], "research_only")
        self.assertEqual(data["rights_status"], "pending_review")
        self.assertFalse(data["production_import"])
        self.assertEqual(len(data["players"]), 5)
        self.assertTrue(all(p["rights_status"] == "pending_review" for p in data["players"]))
        self.assertTrue(all(p["season_statistics"] == {} for p in data["players"]))

    def test_primary_directory_is_not_the_legacy_player_records_list(self):
        js = (ROOT / "js/player-database.js").read_text()
        self.assertIn("pft-player-directory-data", js)
        self.assertIn("PILOT_URL", js)
        self.assertNotIn("pft_players_v1", js)
        self.assertNotIn("mapCloudRecord", js)
        self.assertNotIn("player_records", js)

    def test_canonical_directory_does_not_depend_on_stats_rows(self):
        cloud = (ROOT / "js/player-cloud.js").read_text()
        self.assertIn('supabase.from("ft_players")', cloud)
        self.assertIn('new CustomEvent("pft-player-directory-data"', cloud)
        self.assertIn("playersRes.data||[]).map(p=>", cloud)
        self.assertIn("statistics:stat?.stats||{}", cloud)

    def test_advanced_tools_are_collapsed_and_primary_list_is_singular(self):
        html = (ROOT / "index.html").read_text()
        start = html.index('<div class="db-panel" id="dbtab-players">')
        end = html.index('<div class="db-panel" id="dbtab-accuracy">', start)
        panel = html[start:end]
        self.assertEqual(panel.count('id="playerList"'), 1)
        self.assertEqual(panel.count('id="playerDbSummary"'), 1)
        self.assertIn("<details class=\"card\">", panel)
        self.assertIn('id="playerIdentityReviewPanel"', panel)
        self.assertIn('id="playerStatsImportPanel"', panel)
        self.assertIn('id="playerCloudAuth"', panel)


if __name__ == "__main__":
    unittest.main()
