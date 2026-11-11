import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NovemberExperimentContractTests(unittest.TestCase):
    def test_fixture_schedule_remains_15_unique_entries(self):
        fixtures = json.loads((ROOT / "data/test-fixtures-2026-11.json").read_text(encoding="utf-8"))["fixtures"]
        self.assertEqual(len(fixtures), 15)
        self.assertEqual(len({row["id"] for row in fixtures}), 15)

    def test_legacy_store_is_preserved_and_read_only(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('const STORAGE_KEY="pft_matches_v1"', html)
        self.assertIn('Number(m.id)<=11', html)
        self.assertIn('LEGACY', html)
        self.assertIn('id="matches"', html)

    def test_experiment_uses_separate_storage(self):
        script = (ROOT / "js/test-experiment.js").read_text(encoding="utf-8")
        self.assertIn('pft_experiment_snapshots_v1', script)
        self.assertIn('pft-poisson-1.0', script)
        self.assertIn('actualOutcome', script)
        self.assertNotIn('pft_probability_predictions_v1', script)
        self.assertNotIn('pft_matches_v1', script)

    def test_fixture_schedule_has_day_selector(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="testFixtureDays"', html)
        self.assertIn('data-fixture-day', html)
        self.assertIn('selectedTestFixtureDate', html)

    def test_all_national_fixtures_have_researched_team_samples(self):
        fixtures = json.loads((ROOT / "data/test-fixtures-2026-11.json").read_text(encoding="utf-8"))["fixtures"]
        research = json.loads((ROOT / "data/national-team-research-2026-11.json").read_text(encoding="utf-8"))
        national = [f for f in fixtures if f["competition"] in ("UEFA Nations League", "International Friendly")]
        self.assertEqual(len(national), 12)
        for fixture in national:
            self.assertIn(fixture["home"], research["teams"])
            self.assertIn(fixture["away"], research["teams"])
            self.assertGreaterEqual(len(research["teams"][fixture["home"]]["matches"]), 3)
            self.assertGreaterEqual(len(research["teams"][fixture["away"]]["matches"]), 3)
            self.assertIn(fixture["id"], research["fixtures"])

    def test_handicap_is_additive_and_separate_from_legacy(self):
        script = (ROOT / "js/test-experiment-enhancements.js").read_text(encoding="utf-8")
        self.assertNotIn('data-ah-line', script)
        self.assertIn('function renderApiHandicap(', script)
        self.assertIn('data-api-ah-panel', script)
        self.assertIn('data/asian-handicap-odds.json', script)
        self.assertIn('pft-national-poisson-0.1', script)
        self.assertIn('pft_experiment_snapshots_v1', script)
        self.assertIn('js/asian-handicap.js', (ROOT / "index.html").read_text(encoding="utf-8"))

    def test_experiment_summary_has_own_navigation_page(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        home = html[html.index('<section id="home"'):html.index('</section>', html.index('<section id="home"'))]
        summary = html[html.index('<section id="summary"'):html.index('</section>', html.index('<section id="summary"'))]
        self.assertNotIn('testExperimentSummary', home)
        self.assertIn('id="testExperimentSummary"', summary)
        self.assertIn('<section id="summary" class="page">', html)


if __name__ == "__main__":
    unittest.main()
