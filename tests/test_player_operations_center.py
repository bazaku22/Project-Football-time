from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PlayerOperationsCenterTests(unittest.TestCase):
    def test_dashboard_is_loaded_and_has_a_route(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("./js/player-operations-center.js", index)
        self.assertIn("./css/player-operations-center.css", index)
        script = (ROOT / "js/player-operations-center.js").read_text(encoding="utf-8")
        self.assertIn('id = "playerOperationsPage"', script)
        self.assertIn('button.dataset.secondaryRoute = "playerOperations"', script)

    def test_operations_route_is_handled_by_primary_navigation(self):
        navigation = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        self.assertIn('target === "playerOperations"', navigation)
        self.assertIn('activate("playerOperationsPage", null, "")', navigation)

    def test_six_phases_are_visible_and_evidence_based(self):
        script = (ROOT / "js/player-operations-center.js").read_text(encoding="utf-8")
        for marker in [
            "ตรวจสอบฐานข้อมูลและรักษาข้อมูลเดิม",
            "ตัวตนกลางและการจับคู่ Provider ID",
            "นำเข้ารายชื่อนักเตะและสังกัดตามฤดูกาล",
            "นำเข้าสถิติลีก ฤดูกาล และรายแมตช์",
            "ตรวจสิทธิ์ คุณภาพ และรายการรอตรวจ",
            "ซิงก์ตามรอบและติดตามความครอบคลุม",
            "ft_player_stats_current",
            "ไม่ใช้เครดิต",
        ]:
            self.assertIn(marker, script)

    def test_dashboard_does_not_trigger_provider_or_database_writes(self):
        script = (ROOT / "js/player-operations-center.js").read_text(encoding="utf-8")
        forbidden = ["fetch(", "createClient(", ".insert(", ".upsert(", ".delete(", "supabase."]
        for token in forbidden:
            self.assertNotIn(token, script)

    def test_release_assets_are_versioned_and_cached(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("6.26.5-beta.9", index)
        self.assertIn("football-time-v100", sw)
        self.assertIn("./js/player-operations-center.js", sw)
        self.assertIn("./css/player-operations-center.css", sw)

if __name__ == "__main__":
    unittest.main()
