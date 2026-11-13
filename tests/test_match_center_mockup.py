import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "match-center-mockup.html").read_text(encoding="utf-8")
CSS = (ROOT / "css" / "match-center-mockup.css").read_text(encoding="utf-8")
JS = (ROOT / "js" / "match-center-mockup.js").read_text(encoding="utf-8")
APP = (ROOT / "index.html").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")


class MatchCenterMockupTests(unittest.TestCase):
    def test_mockup_remains_standalone_and_is_not_a_second_match_center_entry(self):
        self.assertNotIn('href="./match-center-mockup.html"', APP)
        self.assertIn('class="mm-demo-banner"', HTML)
        self.assertIn("ไม่ได้ดึงจากการแข่งขันจริง", HTML)

    def test_version_and_service_worker_cache_are_bumped(self):
        self.assertIn('content="6.25.0-beta.1"', APP)
        self.assertIn("V6.25.0-beta.1", APP)
        self.assertIn('content="6.24.0-beta.1"', HTML)
        self.assertIn("football-time-v81", WORKER)
        for asset in ("./match-center-mockup.html", "./css/match-center-mockup.css?v=1", "./js/match-center-mockup.js"):
            self.assertIn(asset, WORKER)

    def test_four_primary_tabs_and_panels_exist(self):
        for tab in ("overview", "events", "statistics", "analysis"):
            self.assertIn('data-tab="' + tab + '"', HTML)
            self.assertIn('id="panel-' + tab + '"', HTML)
        self.assertIn('role="tablist"', HTML)
        self.assertIn('role="tabpanel"', HTML)

    def test_score_scorers_and_goal_annotations_are_present(self):
        for marker in ("North City", "South United", "A. Striker", "B. Forward", "D. Winger", "90+2′ (OG)", "72′ (P)"):
            self.assertIn(marker, HTML)
        self.assertIn('aria-label="ผู้ทำประตูแยกตามทีม"', HTML)

    def test_first_three_goals_and_view_all_control_are_interactive(self):
        self.assertIn('ดูประตูทั้งหมด (5)', HTML)
        self.assertIn('mm-extra-goal" hidden', HTML)
        self.assertIn('aria-expanded="false"', HTML)
        self.assertIn('viewAll?.addEventListener("click"', JS)

    def test_statistics_and_analysis_insight_sections_are_present(self):
        self.assertIn("Match Statistics", HTML)
        self.assertIn("Analysis Insight", HTML)
        self.assertIn("mm-insight", HTML)
        self.assertIn("mm-stat-row", HTML)

    def test_mockup_is_responsive_and_uses_no_network_data(self):
        self.assertIn("@media(max-width:390px)", CSS)
        self.assertNotIn("fetch(", JS)
        self.assertNotIn("XMLHttpRequest", JS)


if __name__ == "__main__":
    unittest.main()
