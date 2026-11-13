import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLOUD = (ROOT / "js" / "player-cloud.js").read_text(encoding="utf-8")
HUB = (ROOT / "js" / "player-hub.js").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


class PlayerCompetitionStatisticsTests(unittest.TestCase):
    def test_cloud_preserves_every_scope_row_per_canonical_player(self):
        self.assertIn("const statsByPlayer=new Map()", CLOUD)
        self.assertIn("statisticsRows:scopedStats.map", CLOUD)
        self.assertIn("statisticsScope:x.statistics_scope", CLOUD)
        self.assertNotIn(".find(x=>x.player_id===p.id", CLOUD)

    def test_signed_out_or_failed_reads_clear_private_canonical_directory(self):
        self.assertIn('detail:{players:[],status:"กรุณาเข้าสู่ระบบเพื่อดูข้อมูล Canonical"}', CLOUD)
        self.assertIn('detail:{players:[],status:"โหลดข้อมูล Canonical ไม่สำเร็จ"}', CLOUD)

    def test_competition_classification_is_explicit_and_unknown_is_not_guessed(self):
        self.assertIn('const CLUB_COMPETITIONS=new Set(["PL","PD","BL1","SA","FL1"])', HUB)
        self.assertIn('const NATIONAL_COMPETITIONS=new Set(["UNL","WC","EURO","EC"])', HUB)
        self.assertIn('return "unclassified"', HUB)

    def test_only_approved_rights_are_displayed_and_verification_remains_separate(self):
        self.assertIn('rows.filter(r=>r.source?.rights_status==="approved")', HUB)
        self.assertIn('statusLabel={verified:"ตรวจสอบแล้ว",pending:"รอตรวจสอบ",disputed:"มีข้อโต้แย้ง"}', HUB)

    def test_no_synthetic_overall_sum_and_missing_metrics_stay_empty(self):
        self.assertIn("จำนวนชุดข้อมูล ไม่ใช่ผลรวมสถิติการแข่งขัน", HUB)
        self.assertIn("ไม่มีข้อมูลสถิติในรายการนี้", HUB)
        self.assertIn("No data", HUB)

    def test_canonical_profile_panel_is_removed_from_app(self):
        self.assertNotIn('id="playerCanonicalHub"', HTML)
        self.assertNotIn('id="playerCanonicalProfile"', HTML)
        self.assertNotIn("./js/player-hub.js", HTML)


if __name__ == "__main__":
    unittest.main()
