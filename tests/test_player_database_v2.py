import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseV2Tests(unittest.TestCase):
    def test_data_contract_is_empty_and_separates_club_and_national_stats(self):
        data = json.loads((ROOT / "data/player-database-v2.json").read_text(encoding="utf-8"))
        self.assertEqual(data["schemaVersion"], "2.0.0")
        self.assertEqual(data["season"], "2026/27")
        self.assertEqual(data["players"], [])
        self.assertIn("Player IDs", " ".join(data["notes"]))

    def test_ui_supports_compact_cards_and_two_independent_stat_groups(self):
        source = (ROOT / "js/player-database-v2.js").read_text(encoding="utf-8")
        self.assertIn('statsBlock("สถิติสโมสร", player.statistics?.club', source)
        self.assertIn('statsBlock("สถิติทีมชาติ", player.statistics?.nationalTeam', source)
        self.assertIn("appearances", source)
        self.assertIn("goals", source)
        self.assertIn("assists", source)
        self.assertIn("ยังไม่มีข้อมูลที่ยืนยันได้", source)
        self.assertIn("safeImage", source)

    def test_new_assets_are_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("./js/player-database-v2.js", html)
        self.assertIn("./js/player-database-v2.js", sw)
        self.assertIn("./css/player-database-v2.css?v=1", sw)
        self.assertIn("./data/player-database-v2.json", sw)
        self.assertIn('const CACHE = "football-time-v114"', sw)
