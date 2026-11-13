import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "index.html").read_text(encoding="utf-8")
MATCH_JS = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
UNIFIED_JS = (ROOT / "js" / "unified-match-center.js").read_text(encoding="utf-8")
CSS = (ROOT / "css" / "match-center.css").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class UnifiedMatchCenterTests(unittest.TestCase):
    def test_unified_detail_is_inside_the_existing_match_center(self):
        self.assertIn('id="unifiedMatchDetail"', APP)
        self.assertIn('id="matchCenterMatches"', APP)
        self.assertNotIn('class="mc-mockup-launch"', APP)

    def test_exactly_four_detail_tabs(self):
        for tab in ("overview", "events", "statistics", "analysis"):
            self.assertIn('data-mc-detail-tab="' + tab + '"', APP)
        self.assertEqual(APP.count('data-mc-detail-tab="'), 4)

    def test_club_and_international_matches_open_the_same_detail(self):
        self.assertIn('data-unified-match=', MATCH_JS)
        self.assertIn('getMatchById(id)', MATCH_JS)
        self.assertIn('data-unified-match', UNIFIED_JS)

    def test_player_assists_and_canonical_links_are_supported(self):
        self.assertIn("event.assist", UNIFIED_JS)
        self.assertIn("data-canonical-player-ref", UNIFIED_JS)
        self.assertIn("canonicalPlayerId", UNIFIED_JS)

    def test_missing_data_is_not_fabricated(self):
        for phrase in ("ยังไม่มีข้อมูล", "ยังไม่มี Event Feed", "ยังไม่มี Player Performance"):
            self.assertIn(phrase, UNIFIED_JS)

    def test_version_and_worker_cache_are_bumped(self):
        self.assertIn('content="6.25.0-beta.1"', APP)
        self.assertIn("V6.25.0-beta.1", APP)
        self.assertIn("football-time-v81", WORKER)
        self.assertIn("./js/unified-match-center.js", WORKER)
        self.assertIn("./css/match-center.css?v=5", WORKER)

    def test_responsive_detail_styles_exist(self):
        self.assertIn(".mc-detail-tabs", CSS)
        self.assertIn("@media(max-width:380px)", CSS)


if __name__ == "__main__":
    unittest.main()
