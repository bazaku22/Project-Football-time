import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class PrimaryNavigationTests(unittest.TestCase):
    def test_four_primary_routes_are_defined(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        routes = re.findall(r'^    (home|leagues|matches|tools): \{ page:', source, re.M)
        self.assertEqual(routes, ["home", "leagues", "matches", "tools"])

    def test_home_is_compact_without_duplicate_shortcuts_or_dashboard(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("homeQuickLinks", source)
        self.assertNotIn("homeTodayDashboard", html)
        self.assertNotIn("home-dashboard.js", html)
        self.assertIn('id = "toolsHubPage"', source)
        self.assertNotIn("home-dashboard.js", (ROOT / "sw.js").read_text())
        self.assertIn('id="matchCenterApp"', html)

    def test_all_secondary_destinations_are_reachable_from_tools_hub(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        for target in ("analyze", "history", "summary", "advanced",
                       "archive", "matchResearch", "footballEcosystemExport"):
            self.assertIn('data-secondary-route="' + target + '"', source)

    def test_international_tools_and_assets_are_removed(self):
        navigation = (ROOT / "js/primary-navigation.js").read_text()
        html = (ROOT / "index.html").read_text()
        worker = (ROOT / "sw.js").read_text()
        self.assertNotIn("internationalHandicap", navigation)
        self.assertNotIn("international-handicap", html)
        self.assertNotIn("international-handicap", worker)
        self.assertNotIn('data-match-category="international"', html)
        self.assertNotIn("Nations League", (ROOT / "js/primary-navigation.js").read_text())
        self.assertNotIn("national-team-research", worker)
        self.assertIn("loadStored();", (ROOT / "js/manual-match-research.js").read_text())

    def test_manual_research_is_limited_to_five_major_leagues(self):
        source = (ROOT / "js/manual-match-research.js").read_text()
        self.assertIn('new Set(["PL","PD","BL1","SA","FL1"])', source)
        self.assertIn('value.records.filter((record) => CLUB.has(record?.competition_code))', source)
        self.assertNotIn('"UNL"', source)

    def test_analysis_and_history_remain_reachable(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        self.assertIn('activate("matchAnalysis", null, "")', source)
        self.assertIn('activate("analysisHistory", null, "")', source)
        self.assertIn('analysisPage.id = "matchAnalysis"', source)
        self.assertIn('historyPage.id = "analysisHistory"', source)

    def test_primary_navigation_is_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('./js/primary-navigation.js', html)
        self.assertIn('./css/primary-navigation.css?v=2', html)
        self.assertIn('./js/primary-navigation.js', sw)
        self.assertIn('./css/primary-navigation.css?v=2', sw)

    def test_football_rich_fixture_export_tool_is_reachable_and_cached(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        worker = (ROOT / "sw.js").read_text()
        self.assertIn('data-secondary-route="footballEcosystemExport"', source)
        self.assertIn('activate("footballEcosystemExportPage", null, "")', source)
        self.assertIn('page.id = "footballEcosystemExportPage"', source)
        self.assertIn('./js/football-ecosystem-export.js', source)
        self.assertIn('"./js/football-ecosystem-export.js"', worker)

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
        self.assertIn('content="6.26.10-beta.1"', html)
        self.assertIn('Project Football Time V6.26.10-beta.1', html)
        self.assertIn('const CACHE = "football-time-v111"', sw)

    def test_visible_app_version_matches_release_metadata_and_title(self):
        html = (ROOT / "index.html").read_text()
        metadata = re.search(r'<meta name="application-version" content="([^"]+)"', html)
        title = re.search(r'<title>Project Football Time V([^<]+)</title>', html)
        visible = re.search(r'<span class="app-version">V([^<]+)</span>', html)
        self.assertIsNotNone(metadata)
        self.assertIsNotNone(title)
        self.assertIsNotNone(visible)
        self.assertEqual(visible.group(1), metadata.group(1))
        self.assertEqual(title.group(1), metadata.group(1))

    def test_discovery_team_shortcuts_route_into_grouped_team_subtabs(self):
        source = (ROOT / "js/football-discovery.js").read_text()
        self.assertIn('profile:"team",form:"team",homeaway:"team"', source)
        self.assertIn('h2h:"matchStats",league:"matchStats"', source)
        self.assertIn('data-db-subtab', source)
        self.assertIn('groupedTab !== tab', source)


if __name__ == "__main__":
    unittest.main()
