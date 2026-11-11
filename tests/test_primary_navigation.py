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

    def test_history_routes_to_existing_accuracy_panel(self):
        source = (ROOT / "js/primary-navigation.js").read_text()
        self.assertIn('history: { page: "fixtures", tab: "accuracy" }', source)

    def test_primary_navigation_is_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('./js/primary-navigation.js', html)
        self.assertIn('./css/primary-navigation.css?v=1', html)
        self.assertIn('./js/primary-navigation.js', sw)
        self.assertIn('./css/primary-navigation.css?v=1', sw)

    def test_four_primary_items_replace_legacy_bottom_nav(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn('data-page="summary"', html[html.index('<nav class="nav"'):html.index('</nav>')])
        self.assertNotIn('data-page="archive"', html[html.index('<nav class="nav"'):html.index('</nav>')])

if __name__ == "__main__":
    unittest.main()
