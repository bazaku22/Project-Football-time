import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class PrimaryNavigationTests(unittest.TestCase):
    def test_four_primary_routes_are_defined(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        routes = re.findall(r'^    (home|leagues|analyze|history): \{ page:', source, re.M)
        self.assertEqual(routes, ["home", "leagues", "analyze", "history"])

    def test_navigation_keeps_secondary_destinations_reachable(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        for target in ("summary", "analysis", "archive", "players", "advanced"):
            self.assertIn('["' + target + '"', source)

    def test_international_handicap_stays_in_secondary_tools(self):
        navigation = (ROOT / "js/primary-navigation.js").read_text()
        workspace = (ROOT / "js/international-handicap-workspace.js").read_text()
        self.assertIn('["internationalHandicap","ทีมชาติ AH"]', navigation)
        self.assertIn('activate("internationalHandicap", null, "")', navigation)
        self.assertNotIn('nav.insertAdjacentHTML("beforeend"', workspace)
        self.assertNotIn('data-intl-route', workspace)

    def test_history_routes_to_existing_accuracy_panel(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        self.assertIn('analyze: { page: "matchAnalysis", tab: "probability" }', source)
        self.assertIn('history: { page: "analysisHistory", tab: "accuracy" }', source)

    def test_primary_navigation_is_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('./js/primary-navigation.js', html)
        self.assertIn('./css/primary-navigation.css?v=1', html)
        self.assertIn('./js/primary-navigation.js', sw)
        self.assertIn('./css/primary-navigation.css?v=1', sw)

    def test_team_and_league_insights_use_compact_subtabs(self):
        html = (ROOT / "index.html").read_text()
        self.assertIn('const databaseSubtabOptions={', html)
        self.assertIn('team:[["profile","ภาพรวมทีม"],["form","ฟอร์มย้อนหลัง"],["homeaway","ผลงานเหย้า / เยือน"]]', html)
        self.assertIn('matchStats:[["h2h","การพบกัน (H2H)"],["league","สถิติลีก"]]', html)
        self.assertIn('const visiblePanels=new Set([selected]);', html)
        self.assertIn('data-db-subtab', html)
        self.assertIn('id="dbSubnavSecondary"', html)

    def test_ui_release_and_service_worker_cache_are_bumped_together(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('content="6.14.0-beta.1"', html)
        self.assertIn('Project Football Time V6.14.0-beta.1', html)
        self.assertIn('football-time-v64', sw)

    def test_discovery_team_shortcuts_route_into_grouped_team_subtabs(self):
        source = (ROOT / "js/football-discovery.js").read_text()
        self.assertIn('profile:"team",form:"team",homeaway:"team"', source)
        self.assertIn('h2h:"matchStats",league:"matchStats"', source)
        self.assertIn('data-db-subtab', source)
        self.assertIn('groupedTab !== tab', source)

    def test_four_primary_items_replace_legacy_bottom_nav(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn('data-page="summary"', html[html.index('<nav class="nav"'):html.index('</nav>')])
        self.assertNotIn('data-page="archive"', html[html.index('<nav class="nav"'):html.index('</nav>')])

if __name__ == "__main__":
    unittest.main()
