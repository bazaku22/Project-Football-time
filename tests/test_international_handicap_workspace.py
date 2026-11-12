import json
import unittest
from pathlib import Path

ROOT = Path("data/experimental/international-r1")


class InternationalHandicapWorkspaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = json.loads((ROOT / "fixtures.json").read_text(encoding="utf-8"))["fixtures"]
        cls.predictions = json.loads((ROOT / "prediction-snapshots.json").read_text(encoding="utf-8"))["snapshots"]
        cls.reference = json.loads((ROOT / "handicap-reference.json").read_text(encoding="utf-8"))
        cls.workspace = Path("js/international-handicap-workspace.js").read_text(encoding="utf-8")

    def test_only_nations_league_fixtures_are_eligible(self):
        eligible = [row for row in self.fixtures if row["match_type"] == "nations_league"]
        self.assertEqual(len(eligible), 10)
        self.assertTrue(all(row["competition"] == "UEFA Nations League" for row in eligible))
        self.assertEqual(len({row["id"] for row in eligible}), 10)

    def test_every_handicap_reference_matches_one_pre_match_prediction(self):
        eligible_ids = {row["id"] for row in self.fixtures
                        if row["match_type"] == "nations_league"}
        prediction_ids = {row["fixture_id"] for row in self.predictions}
        events = self.reference["events"]
        event_ids = [row["fixtureId"] for row in events]
        self.assertEqual(self.reference["apiRequestsThisRun"], 1)
        self.assertEqual(len(events), 10)
        self.assertEqual(len(event_ids), len(set(event_ids)))
        self.assertEqual(set(event_ids), eligible_ids)
        self.assertTrue(eligible_ids.issubset(prediction_ids))
        for row in events:
            self.assertTrue(row["bookmakers"])
            self.assertEqual(row["referenceAwayLine"], -row["referenceHomeLine"])
            self.assertAlmostEqual(row["referenceHomeLine"] * 4,
                                   round(row["referenceHomeLine"] * 4), delta=1e-8)
            for source in row["bookmakers"]:
                self.assertAlmostEqual(source["homeLine"], -source["awayLine"], delta=0.02)
                self.assertTrue(source["bookmaker"])
                self.assertTrue(source["lastUpdate"])

    def test_low_source_coverage_is_gated_and_data_stays_isolated(self):
        counts = sorted(len(row["bookmakers"]) for row in self.reference["events"])
        self.assertEqual(counts, [1, 3, 7, 7, 7, 7, 7, 7, 7, 7])
        self.assertIn("sourceCount >= 3", self.workspace)
        self.assertIn("ageHours <= 24", self.workspace)
        self.assertIn('row.match_type === "nations_league"', self.workspace)
        self.assertIn("pft_international_handicap_snapshots_r1", self.workspace)
        self.assertIn("pft_international_handicap_results_r1", self.workspace)
        self.assertNotIn("pft_handicap_snapshots_v1", self.workspace)
        self.assertNotIn("pft_experiment_snapshots_v1", self.workspace)
        self.assertNotIn("data/football-database.json", self.workspace)
        self.assertNotIn("International Friendly", self.workspace)


if __name__ == "__main__":
    unittest.main()
