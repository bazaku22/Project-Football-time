import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class V7CompactUiTests(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.match_center = (ROOT / "js/match-center.js").read_text(encoding="utf-8")
        self.detail = (ROOT / "js/unified-match-center.js").read_text(encoding="utf-8")
        self.discovery = (ROOT / "js/football-discovery.js").read_text(encoding="utf-8")
        self.css = (ROOT / "css/v7-compact-ui.css").read_text(encoding="utf-8")
        self.sw = (ROOT / "sw.js").read_text(encoding="utf-8")

    def test_v7_release_assets_are_versioned_and_cached(self):
        self.assertIn('content="7.0.0"', self.html)
        self.assertIn('V7.0</span>', self.html)
        self.assertIn('football-time-v123', self.sw)
        self.assertIn('v7-compact-ui.css?v=1', self.html)
        self.assertIn('./css/v7-compact-ui.css?v=1', self.sw)

    def test_redundant_panels_are_removed_but_data_targets_remain_safe(self):
        self.assertNotIn('id="matchCenterSearch"', self.html)
        self.assertNotIn('discoveryFavoritesCard', self.discovery)
        self.assertNotIn('discoveryDateCard', self.discovery)
        self.assertIn('id="leaguePicker"', self.html)
        self.assertIn('id="leagueCards" class="league-grid" hidden', self.html)
        self.assertIn('id="teamList" hidden', self.html)
        self.assertIn('id="teamCount" hidden', self.html)
        self.assertIn('id="leagueCount" hidden', self.html)

    def test_match_details_expand_inside_the_selected_match_card(self):
        self.assertIn('matchCard.append(detail())', self.detail)
        self.assertIn('detailHome.insertBefore(detail(),detailAnchor)', self.detail)
        self.assertIn('aria-expanded="false"', self.match_center)
        self.assertNotIn('openInDatabase(button)', self.match_center)

    def test_header_and_league_picker_are_compact(self):
        self.assertIn('header .logo{width:34px', self.css)
        self.assertIn('flex-wrap:nowrap', self.css)
        self.assertIn('overflow-x:auto', self.css)

if __name__ == "__main__":
    unittest.main()
