import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class HomeDashboardTests(unittest.TestCase):
    def test_home_dashboard_is_part_of_home_route(self):
        html = (ROOT / "index.html").read_text()
        self.assertIn('id="homeTodayDashboard"', html)
        self.assertIn('id="homeTodayMatches"', html)
        self.assertIn('id="homeOpenMatchCenter"', html)

    def test_dashboard_assets_are_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('./css/home-dashboard.css?v=1', html)
        self.assertIn('./js/home-dashboard.js', html)
        self.assertIn('./css/home-dashboard.css?v=1', sw)
        self.assertIn('./js/home-dashboard.js', sw)

    def test_dashboard_uses_existing_database_without_provider_calls(self):
        source = (ROOT / "js/home-dashboard.js").read_text()
        self.assertIn('window.FootballTimeAppContext?.getDatabase?.()', source)
        self.assertIn('pft-football-database-ready', source)
        self.assertNotIn('fetch(', source)

    def test_release_and_service_worker_cache_are_bumped(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        self.assertIn('content="6.26.2-beta.1"', html)
        self.assertIn('Project Football Time V6.26.2-beta.1', html)
        self.assertIn('football-time-v84', sw)

if __name__ == "__main__":
    unittest.main()
