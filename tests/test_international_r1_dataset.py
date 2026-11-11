import json
import math
import unittest
from datetime import date, datetime
from pathlib import Path

ROOT = Path("data/experimental/international-r1")


def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


class InternationalRoundOneDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = load("fixtures.json")
        cls.results = load("results.json")
        cls.form = load("team-form.json")
        cls.aliases = load("team-aliases.json")
        cls.quality = load("quality-issues.json")
        cls.predictions = load("prediction-snapshots.json")

    def test_dataset_is_isolated_and_fixture_manifest_is_complete(self):
        self.assertEqual(self.fixtures["dataset_id"], "international-r1-2026")
        self.assertEqual(self.fixtures["dataset_status"], "experimental_isolated")
        fixtures = self.fixtures["fixtures"]
        self.assertEqual(len(fixtures), 15)
        self.assertEqual(len({row["id"] for row in fixtures}), 15)
        self.assertEqual(sum(row["match_type"] == "nations_league" for row in fixtures), 10)
        self.assertEqual(sum(row["match_type"] == "friendly" for row in fixtures), 5)
        self.assertTrue(all(row["source_urls"] for row in fixtures))
        self.assertTrue(all(row["home_team"] and row["away_team"] for row in fixtures))

    def test_pinned_historical_source_and_result_records_are_consistent(self):
        data = self.results
        self.assertEqual(data["dataset_id"], "international-r1-2026")
        self.assertEqual(data["source"]["repository_commit"], "b0948cb558c927c357db4067eac5b37b96d0e4bb")
        self.assertEqual(data["source"]["csv_blob_sha"], "9999a4b380b16189825884a8dab4dc869c847f72")
        self.assertEqual(data["source"]["license"], "CC0-1.0 (repository-declared)")
        records = data["records"]
        self.assertEqual(data["match_count"], len(records))
        self.assertEqual(len(records), 196)
        self.assertEqual(len({row["id"] for row in records}), len(records))
        cutoff = date.fromisoformat(data["target_feature_cutoff_exclusive"])
        for row in records:
            self.assertLess(date.fromisoformat(row["date"]), cutoff)
            self.assertIn(row["score_semantics"], (
                "includes_extra_time_excludes_penalty_shootout",
            ))
            self.assertEqual(row["provenance"]["repository_commit"], data["source"]["commit"])
            self.assertIsInstance(row["home_score"], int)
            self.assertIsInstance(row["away_score"], int)
            self.assertGreaterEqual(row["home_score"], 0)
            self.assertGreaterEqual(row["away_score"], 0)

    def test_team_form_references_existing_results_and_reports_samples(self):
        forms = self.form["teams"]
        records = {row["id"]: row for row in self.results["records"]}
        self.assertEqual(self.form["team_count"], 25)
        self.assertEqual(len(forms), 25)
        self.assertEqual(len({row["team_id"] for row in forms}), 25)
        for team in forms:
            self.assertGreaterEqual(team["latest_5"]["sample_count"], 5)
            self.assertIn(team["latest_10"]["sample_count"], (9, 10))
            self.assertEqual(len(team["eligible_match_ids"]), team["latest_10"]["sample_count"])
            self.assertEqual(len(set(team["eligible_match_ids"])), len(team["eligible_match_ids"]))
            self.assertTrue(all(match_id in records for match_id in team["eligible_match_ids"]))
            for match_id in team["eligible_match_ids"]:
                match = records[match_id]
                self.assertIn(team["team"], (match["canonical_home_team"], match["canonical_away_team"]))
                self.assertTrue(match["included_in_form"])
            for window in ("latest_5", "latest_10"):
                for metric in ("goals_for_per_match", "goals_against_per_match"):
                    value = team[window][metric]
                    self.assertTrue(math.isfinite(value))
                    self.assertGreaterEqual(value, 0)
        argentina = next(row for row in forms if row["team"] == "Argentina")
        self.assertEqual(argentina["latest_10"]["sample_count"], 9)
        self.assertEqual(argentina["readiness"], "limited_5_to_9")

    def test_alias_registry_is_explicit_and_unique(self):
        teams = self.aliases["canonical_teams"]
        ids = [row["team_id"] for row in teams]
        names = [row["canonical_name"] for row in teams]
        self.assertEqual(len(teams), 25)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(names), len(set(names)))
        by_id = set(ids)
        for alias in self.aliases["aliases"]:
            self.assertIn(alias["canonical_team_id"], by_id)
            self.assertIn(alias["canonical_name"], names)

    def test_quality_issues_preserve_known_limitations_and_duplicate_exclusion(self):
        issues = {row["id"]: row for row in self.quality["issues"]}
        self.assertIn("DQ-ARG-001", issues)
        self.assertIn("DQ-CUTOFF-001", issues)
        self.assertIn("DQ-SOURCE-001", issues)
        self.assertIn("DQ-SCORE-001", issues)
        duplicate = issues["DQ-ARG-001"]
        self.assertEqual(len(duplicate["records"]), 2)
        records = {row["id"]: row for row in self.results["records"]}
        excluded_candidates = [
            records[record_id] for record_id in duplicate["records"]
            if records[record_id]["quality_status"] == "excluded_duplicate_candidate"
        ]
        self.assertEqual(len(excluded_candidates), 1)
        self.assertFalse(excluded_candidates[0]["included_in_form"])

    def test_prediction_snapshots_are_pre_kickoff_and_probabilities_are_valid(self):
        data = self.predictions
        fixtures = {row["id"]: row for row in self.fixtures["fixtures"]}
        snapshots = data["snapshots"]
        self.assertEqual(data["model_version"], "intl-r1-baseline-0.1.0")
        self.assertEqual(data["snapshot_count"], 14)
        self.assertEqual(len(snapshots), 14)
        self.assertEqual(len({row["snapshot_id"] for row in snapshots}), 14)
        self.assertEqual(len({row["fixture_id"] for row in snapshots}), 14)
        self.assertEqual(data["excluded_count"], 1)
        self.assertEqual(data["exclusions"][0]["fixture_id"], "INT-R1-011")
        self.assertEqual(data["exclusions"][0]["status"], "not_prediction_eligible")
        for row in snapshots:
            fixture = fixtures[row["fixture_id"]]
            self.assertIsNotNone(fixture["kickoff_utc"])
            kickoff = datetime.fromisoformat(row["kickoff_utc"].replace("Z", "+00:00"))
            captured = datetime.fromisoformat(row["captured_at"])
            self.assertLess(captured, kickoff)
            self.assertTrue(row["captured_before_kickoff"])
            self.assertEqual(row["prediction_status"], "captured_pre_match")
            self.assertEqual(row["evaluation_status"], "pending")
            self.assertIsNone(row["outcome"])
            probabilities = row["probabilities_1x2"]
            self.assertEqual(set(probabilities), {"home_win", "draw", "away_win"})
            self.assertTrue(all(math.isfinite(value) and 0 <= value <= 1 for value in probabilities.values()))
            self.assertAlmostEqual(sum(probabilities.values()), 1.0, delta=1e-7)
            tail = row["score_matrix"]["omitted_tail_mass"]
            self.assertTrue(math.isfinite(tail))
            self.assertGreaterEqual(tail, 0)
            self.assertLessEqual(tail, row["score_matrix"]["tail_threshold"])


if __name__ == "__main__":
    unittest.main()
