import csv
import tempfile
import unittest
from pathlib import Path

from scripts.reconcile_player_identity import reconcile, normalize_name


class PlayerIdentityReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.canonical = [
            {"canonical_player_key": "ft-001", "display_name": "José Example", "date_of_birth": "2000-01-02"},
            {"canonical_player_key": "ft-002", "display_name": "Jose Example", "date_of_birth": "2001-03-04"},
            {"canonical_player_key": "ft-003", "display_name": "Other Player", "date_of_birth": "1999-05-06"},
        ]

    def test_exact_verified_provider_id_mapping_is_the_only_resolved_identity(self):
        rows = reconcile(
            [{"provider": "StrikerAPI", "provider_player_id": "p-1", "player_name": "Unrelated Name"}],
            self.canonical,
            [{"provider": "strikerapi", "provider_player_id": "p-1", "canonical_player_key": "ft-001",
              "review_status": "verified", "reviewer": "reviewer-1", "reviewed_at": "2026-11-12T10:00:00Z"}],
        )
        self.assertEqual(rows[0]["status"], "exact_verified_mapping")
        self.assertEqual(rows[0]["canonical_player_key"], "ft-001")

    def test_name_and_dob_only_create_candidates_not_links(self):
        rows = reconcile(
            [{"provider": "source", "provider_player_id": "p-2", "player_name": "Jose Example",
              "date_of_birth": "2000-01-02"}], self.canonical, [],
        )
        self.assertEqual(rows[0]["status"], "needs_identity_review")
        self.assertEqual(rows[0]["canonical_player_key"], "")
        self.assertEqual(rows[0]["candidate_keys"], "ft-001;ft-002")
        self.assertEqual(rows[0]["review_required"], "true")

    def test_unreviewed_exact_mapping_is_not_verified(self):
        rows = reconcile(
            [{"provider": "source", "provider_player_id": "p-3", "player_name": "Example"}],
            self.canonical,
            [{"provider": "source", "provider_player_id": "p-3", "canonical_player_key": "ft-001"}],
        )
        self.assertEqual(rows[0]["status"], "mapping_needs_review")
        self.assertEqual(rows[0]["canonical_player_key"], "")

    def test_conflicting_mappings_are_quarantined(self):
        mappings = [
            {"provider": "source", "provider_player_id": "p-4", "canonical_player_key": "ft-001"},
            {"provider": "source", "provider_player_id": "p-4", "canonical_player_key": "ft-002"},
        ]
        rows = reconcile(
            [{"provider": "source", "provider_player_id": "p-4", "player_name": "Example"}],
            self.canonical, mappings,
        )
        self.assertEqual(rows[0]["status"], "conflicting_mapping")
        self.assertEqual(rows[0]["canonical_player_key"], "")

    def test_missing_mapping_target_is_quarantined(self):
        rows = reconcile(
            [{"provider": "source", "provider_player_id": "p-5", "player_name": "Example"}],
            self.canonical,
            [{"provider": "source", "provider_player_id": "p-5", "canonical_player_key": "missing"}],
        )
        self.assertEqual(rows[0]["status"], "mapping_target_missing")

    def test_duplicate_provider_identity_in_input_is_quarantined(self):
        provider = [
            {"provider": "source", "provider_player_id": "p-6", "player_name": "One"},
            {"provider": "SOURCE", "provider_player_id": "p-6", "player_name": "Two"},
        ]
        rows = reconcile(provider, self.canonical, [])
        self.assertEqual(rows[1]["status"], "duplicate_provider_identity")

    def test_verified_mapping_without_review_evidence_is_quarantined(self):
        rows = reconcile(
            [{"provider": "source", "provider_player_id": "p-7", "player_name": "Example"}],
            self.canonical,
            [{"provider": "source", "provider_player_id": "p-7", "canonical_player_key": "ft-001",
              "review_status": "verified"}],
        )
        self.assertEqual(rows[0]["status"], "mapping_needs_review")

    def test_name_normalization_is_only_a_candidate_helper(self):
        self.assertEqual(normalize_name("José O’Neil"), "joseoneil")


if __name__ == "__main__":
    unittest.main()
