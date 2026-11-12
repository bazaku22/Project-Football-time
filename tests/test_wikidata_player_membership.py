import copy
import unittest

from scripts.validate_wikidata_player_membership import validate

BASE = {
    "schemaVersion": 1,
    "season": "2026/27",
    "as_of": "2026-11-12",
    "status": "research_only",
    "retrieval_mode": "manual_local_export",
    "source": "Wikidata structured data",
    "source_license": "CC0-1.0",
    "source_license_url": "https://www.wikidata.org/wiki/Wikidata:Licensing",
    "property": "P54",
    "network_access": False,
    "production_import": False,
    "provider_api_calls": 0,
    "records_count": 0,
    "candidates": [],
}


def candidate():
    return {
        "wikidata_item_id": "Q12345",
        "label": "Synthetic Test Player",
        "league_id": "PL",
        "canonical_club_id": "synthetic-fc",
        "club_name": "Synthetic FC",
        "club_item_id": "Q54321",
        "season": "2026/27",
        "retrieved_at": "2026-11-12",
        "review_status": "pending_manual_review",
        "membership_assessment": "potentially_current",
        "p54_statements": [{
            "statement_id": "Q12345$abc",
            "property": "P54",
            "team_item_id": "Q54321",
            "rank": "normal",
            "qualifiers": {"start_time": "2025-07-01", "end_time": None},
            "references": [{"url": "https://example.org/verified-source"}],
        }],
    }


class WikidataOfflineMembershipTests(unittest.TestCase):
    def payload(self):
        data = copy.deepcopy(BASE)
        data["candidates"] = [candidate()]
        data["records_count"] = 1
        return data

    def test_empty_template_is_valid_and_not_importable(self):
        self.assertEqual(validate(copy.deepcopy(BASE)), [])

    def test_accepts_referenced_dated_p54_as_review_candidate_only(self):
        self.assertEqual(validate(self.payload()), [])

    def test_rejects_missing_references(self):
        data = self.payload()
        data["candidates"][0]["p54_statements"][0]["references"] = []
        self.assertTrue(any("requires at least one reference" in e for e in validate(data)))

    def test_rejects_deprecated_statement_as_current_evidence(self):
        data = self.payload()
        data["candidates"][0]["p54_statements"][0]["rank"] = "deprecated"
        self.assertTrue(any("without dated, referenced non-deprecated P54 evidence" in e for e in validate(data)))

    def test_rejects_expired_membership_as_current(self):
        data = self.payload()
        data["candidates"][0]["p54_statements"][0]["qualifiers"]["end_time"] = "2026-06-30"
        self.assertTrue(any("without dated, referenced non-deprecated P54 evidence" in e for e in validate(data)))

    def test_rejects_missing_start_date(self):
        data = self.payload()
        data["candidates"][0]["p54_statements"][0]["qualifiers"]["start_time"] = None
        self.assertTrue(any("invalid start_time/end_time" in e for e in validate(data)))

    def test_rejects_unapproved_or_production_status(self):
        data = self.payload()
        data["candidates"][0]["review_status"] = "approved"
        data["production_import"] = True
        errors = validate(data)
        self.assertTrue(any("pending_manual_review" in e for e in errors))
        self.assertTrue(any("production_import must be false" in e for e in errors))

    def test_rejects_network_or_provider_calls(self):
        data = self.payload()
        data["network_access"] = True
        data["provider_api_calls"] = 1
        errors = validate(data)
        self.assertTrue(any("network_access must be false" in e for e in errors))
        self.assertTrue(any("provider_api_calls must equal 0" in e for e in errors))

    def test_rejects_duplicate_membership(self):
        data = self.payload()
        data["candidates"].append(copy.deepcopy(data["candidates"][0]))
        data["records_count"] = 2
        self.assertTrue(any("duplicate Wikidata player item" in e for e in validate(data)))


if __name__ == "__main__":
    unittest.main()
