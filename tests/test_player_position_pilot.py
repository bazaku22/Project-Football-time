import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerPositionPilotTests(unittest.TestCase):
    def test_player_database_exposes_position_group_filter(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        module = (ROOT / "js" / "player-database.js").read_text(encoding="utf-8")
        for group in ("FORWARD", "MIDFIELDER", "DEFENDER", "GOALKEEPER", "MULTI", "UNKNOWN"):
            self.assertIn(group, html)
            self.assertIn(group, module)
        self.assertIn('id="playerPositionFilter"', html)
        self.assertIn('positionGroup(r)===pf.value', module)

    def test_position_pilot_uses_official_group_and_keeps_subposition_unverified(self):
        fixture = json.loads((ROOT / "tests/fixtures/player-position-pilot-2026-27.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["status"], "research_only")
        self.assertEqual(len(fixture["players"]), 5)
        expected = {
            "bruno-fernandes": "MIDFIELDER",
            "matheus-cunha": "FORWARD",
            "bryan-mbeumo": "FORWARD",
            "kobbie-mainoo": "MIDFIELDER",
            "harry-maguire": "DEFENDER",
        }
        for player in fixture["players"]:
            self.assertEqual(player["position_group"], expected[player["research_key"]])
            self.assertIsNone(player["verified_specific_position"])
            self.assertEqual(player["rights_status"], "pending_review")
            self.assertEqual(player["season_statistics"], {})

    def test_multigroup_provider_positions_are_not_forced_into_one_specific_role(self):
        fixture = json.loads((ROOT / "tests/fixtures/player-position-pilot-2026-27.json").read_text(encoding="utf-8"))
        by_key = {row["research_key"]: row for row in fixture["players"]}
        self.assertEqual(by_key["matheus-cunha"]["provider_position_tags"], ["FW", "MF"])
        self.assertEqual(by_key["bryan-mbeumo"]["provider_position_tags"], ["MF", "FW"])
        self.assertIsNone(by_key["matheus-cunha"]["verified_specific_position"])
        self.assertIsNone(by_key["bryan-mbeumo"]["verified_specific_position"])


if __name__ == "__main__":
    unittest.main()
