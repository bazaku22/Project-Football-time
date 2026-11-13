import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseWorkspaceTests(unittest.TestCase):
    def test_research_pilot_remains_review_only_and_not_production_data(self):
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
        self.assertIn("(playersRes.data||[]).flatMap(p=>", cloud)
        self.assertIn("statisticsRows:scopedStats.map", cloud)
        self.assertIn("const statsByPlayer=new Map()", cloud)
        self.assertNotIn(".find(x=>x.player_id===p.id", cloud)

    def test_legacy_player_workspace_is_removed_from_runtime(self):
        html = (ROOT / "index.html").read_text()
        worker = (ROOT / "sw.js").read_text()
        self.assertNotIn('id="dbtab-players"', html)
        self.assertNotIn('id="playerList"', html)
        self.assertNotIn('id="playerCloudAuth"', html)
        self.assertNotIn("./js/player-database.js", html)
        self.assertNotIn("./js/player-database.js", worker)
        self.assertNotIn("./css/player-directory.css?v=1", html)


if __name__ == "__main__":
    unittest.main()
