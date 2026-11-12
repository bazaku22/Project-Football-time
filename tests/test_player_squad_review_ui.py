import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-squad-review.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class PlayerSquadReviewUITests(unittest.TestCase):
    def test_review_workspace_is_loaded_and_has_both_csv_inputs(self):
        for marker in ("playerSquadReviewPanel", "playerSquadTeamCsv",
                       "playerSquadPlayerCsv", "playerSquadReviewLoad",
                       "playerSquadExportTeams", "playerSquadExportPlayers"):
            self.assertIn(marker, HTML)
        self.assertIn('./js/player-squad-review.js', HTML)
        self.assertIn('./css/player-squad-review.css?v=1', HTML)

    def test_all_seven_alias_candidates_are_explicit_and_review_only(self):
        for marker in ("FL1|167", "PD|1068", "PD|83", "PD|87",
                       "PL|360", "PL|393", "SA|2572"):
            self.assertIn(marker, MODULE)
        self.assertIn("ยืนยัน Alias ในเครื่อง", MODULE)
        self.assertIn("team-alias-mapping-reviewed-2026-27.csv", MODULE)

    def test_player_identity_conflict_is_never_auto_merged_or_assigned(self):
        self.assertIn("conflicting_identity_observations", MODULE)
        self.assertIn("ห้ามรวมเป็น Canonical Player", MODULE)
        self.assertNotIn("canonical_player_id", MODULE)
        self.assertNotIn("canonical_player_key", MODULE)

    def test_review_is_local_only_without_network_or_supabase(self):
        self.assertIn("localStorage", MODULE)
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("XMLHttpRequest", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("ไม่มีการส่งข้อมูลออกจากอุปกรณ์", HTML)
        self.assertIn("football-time-v68", WORKER)
        self.assertIn('"./js/player-squad-review.js"', WORKER)
        self.assertIn('"./css/player-squad-review.css?v=1"', WORKER)


if __name__ == "__main__":
    unittest.main()
