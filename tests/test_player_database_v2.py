import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseV2Tests(unittest.TestCase):
    def test_data_contract_has_unique_ids_and_thailand_roster(self):
        data = json.loads((ROOT / "data/player-database-v2.json").read_text(encoding="utf-8"))
        self.assertEqual(data["schemaVersion"], "2.0.0")
        self.assertEqual(data["season"], "2026/27")
        self.assertEqual(len(data["players"]), 23)
        ids = [player["playerId"] for player in data["players"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(any(team["teamId"] == "THA" for team in player["nationalTeams"]) for player in data["players"]))
        self.assertTrue(all(player["statistics"]["nationalTeam"]["period"] == "since-start-date" for player in data["players"]))
        self.assertTrue(all(player["statistics"]["nationalTeam"]["startDate"] == "2026-11-17" for player in data["players"]))
        self.assertEqual(sum(player["statistics"]["nationalTeam"]["goals"] for player in data["players"]), 3)
        self.assertEqual(sum(player["statistics"]["nationalTeam"]["assists"] for player in data["players"]), 1)
        self.assertTrue(any(player.get("statisticsArchive") for player in data["players"]))
        self.assertEqual(data["nationalTeamMatches"][0]["matchId"], "THA-TJK-KC52-FINAL-2026-11-17")
        self.assertTrue(all(player["statistics"]["club"]["season"] == "2026/27" for player in data["players"]))
        self.assertIn("Player ID", " ".join(data["notes"]))
        numbers = [player["nationalTeams"][0]["shirtNumber"] for player in data["players"]]
        self.assertEqual(sorted(numbers), list(range(1, 24)))
        self.assertTrue(all(player["currentClub"]["logoUrl"] for player in data["players"]))
        self.assertTrue(all(player["currentClub"]["logoSourceUrl"] for player in data["players"]))
        self.assertEqual(sum(bool(player.get("photoUrl")) for player in data["players"]), 20)
        self.assertTrue(all(player["nationalTeams"][0]["shirtNumberSourceUrl"] for player in data["players"]))

    def test_ui_supports_hierarchical_navigation_and_independent_stats(self):
        source = (ROOT / "js/player-database-v2.js").read_text(encoding="utf-8")
        self.assertIn('statsBlock("สถิติสโมสร",player.statistics?.club', source)
        self.assertIn('statsBlock("สถิติทีมชาติชุดใหญ่",player.statistics?.nationalTeam', source)
        self.assertIn("renderRoot", source)
        self.assertIn("renderLeagueList", source)
        self.assertIn("renderNationalList", source)
        self.assertIn('data-nav="clubs"', source)
        self.assertIn('data-nav="national"', source)
        self.assertIn("FIFA International A Matches", source)
        self.assertIn("appearances", source)
        self.assertIn("goals", source)
        self.assertIn("assists", source)
        self.assertIn("ยังไม่มีข้อมูลที่ยืนยันได้", source)
        self.assertIn("safeImage", source)
        self.assertIn("sortByShirtNumber", source)
        self.assertIn("player-v2-number", source)
        self.assertIn("เบอร์ทีมชาติ", source)
        self.assertIn("fetch(DATA_URL, {cache:\"no-store\"})", source)
        self.assertNotIn("DATA_URL + \"?v=", source)

    def test_new_assets_are_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("./js/player-database-v2.js", html)
        self.assertIn("./js/player-database-v2.js", sw)
        self.assertIn("./css/player-database-v2.css?v=3", sw)
        self.assertIn("./data/player-database-v2.json", sw)
        self.assertIn('const CACHE = "football-time-v117"', sw)


if __name__ == "__main__":
    unittest.main()
