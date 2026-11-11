import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NovemberExperimentContractTests(unittest.TestCase):
    def test_fixture_schedule_remains_15_unique_entries(self):
        data = json.loads((ROOT / "data/test-fixtures-2026-11.json").read_text(encoding="utf-8"))
        fixtures = data["fixtures"]
        self.assertEqual(len(fixtures), 15)
        self.assertEqual(len({row["id"] for row in fixtures}), 15)

    def test_legacy_store_is_preserved_and_read_only(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('const STORAGE_KEY="pft_matches_v1"', html)
        self.assertIn('Number(m.id)<=11', html)
        self.assertIn('LEGACY', html)
        self.assertIn('hidden', html)
        self.assertIn('id="matches"', html)

    def test_experiment_uses_separate_storage(self):
        script = (ROOT / "js/test-experiment.js").read_text(encoding="utf-8")
        self.assertIn('pft_experiment_snapshots_v1', script)
        self.assertIn('pft-poisson-1.0', script)
        self.assertIn('actualOutcome', script)
        self.assertNotIn('pft_probability_predictions_v1', script)
        self.assertNotIn('pft_matches_v1', script)

    def test_fixture_schedule_is_on_home_not_database_tab(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="testFixturesList"', html)
        self.assertNotIn('data-db-tab="testfixtures"', html)
        self.assertNotIn('id="dbtab-testfixtures"', html)


if __name__ == "__main__":
    unittest.main()
