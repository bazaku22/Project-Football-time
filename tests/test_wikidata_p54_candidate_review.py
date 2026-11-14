import unittest

from scripts.wikidata_p54_candidate_review import normalize_export


def uri(qid):
    return {"type": "uri", "value": f"https://www.wikidata.org/entity/{qid}"}


def row(statement="Q100$abc", player="Q1", team="Q9617", rank="NormalRank",
        start="2026-08-01T00:00:00Z", end="", reference=True):
    result = {
        "player": uri(player),
        "playerLabel": {"type": "literal", "value": "Test Player"},
        "team": uri(team),
        "teamLabel": {"type": "literal", "value": "Arsenal FC"},
        "statement": {"type": "uri", "value": f"https://www.wikidata.org/entity/statement/{statement}"},
        "rank": {"type": "uri", "value": f"http://wikiba.se/ontology#{rank}"},
        "start": {"type": "literal", "value": start} if start else {},
        "end": {"type": "literal", "value": end} if end else {},
    }
    if reference:
        result.update({
            "reference": {"type": "uri", "value": "https://www.wikidata.org/entity/reference/R1"},
            "referenceUrl": {"type": "uri", "value": "https://example.org/squad-evidence"},
            "referenceSource": uri("Q999"),
            "retrieved": {"type": "literal", "value": "2026-11-10T00:00:00Z"},
        })
    return result


def export(*rows):
    return {"head": {"vars": ["player", "team", "statement", "rank"]},
            "results": {"bindings": list(rows)}}


class WikidataP54CandidateReviewTests(unittest.TestCase):
    def test_preserves_statement_provenance_without_assigning_identity(self):
        result = normalize_export(export(row()), "Q9617")
        self.assertEqual(result["records_count"], 1)
        candidate = result["candidates"][0]
        self.assertEqual(candidate["player_qid"], "Q1")
        self.assertEqual(candidate["team_qid"], "Q9617")
        self.assertEqual(candidate["statement_guid"], "Q100$abc")
        self.assertEqual(candidate["references"][0]["reference_source_qid"], "Q999")
        self.assertEqual(candidate["references"][0]["retrieved_at"], "2026-11-10T00:00:00Z")
        self.assertEqual(candidate["review_status"], "referenced_candidate_needs_human_review")
        self.assertEqual(candidate["canonical_player_id"], "")
        self.assertEqual(candidate["provider_player_id"], "")
        self.assertFalse(result["production_import"])
        self.assertEqual(result["provider_api_calls"], 0)
        self.assertEqual(result["supabase_writes"], 0)

    def test_groups_multiple_reference_rows_for_same_statement(self):
        first = row()
        second = row()
        second["reference"] = {"type": "uri", "value": "https://www.wikidata.org/entity/reference/R2"}
        second["referenceUrl"] = {"type": "uri", "value": "https://example.net/another-source"}
        result = normalize_export(export(first, second), "Q9617")
        self.assertEqual(result["records_count"], 1)
        self.assertEqual(len(result["candidates"][0]["references"]), 2)

    def test_rejects_rows_from_unrequested_club(self):
        with self.assertRaisesRegex(ValueError, "does not match requested"):
            normalize_export(export(row(team="Q8682")), "Q9617")

    def test_deprecated_statement_is_never_eligible(self):
        result = normalize_export(export(row(rank="DeprecatedRank")), "Q9617")
        self.assertEqual(result["candidates"][0]["review_status"], "deprecated_statement")

    def test_missing_reference_is_not_a_verified_candidate(self):
        result = normalize_export(export(row(reference=False)), "Q9617")
        self.assertEqual(result["candidates"][0]["review_status"], "missing_source_reference")

    def test_missing_dates_remain_unknown(self):
        result = normalize_export(export(row(start="")), "Q9617")
        self.assertEqual(result["candidates"][0]["review_status"], "date_scope_unknown")

    def test_end_before_season_is_outside_scope(self):
        result = normalize_export(export(row(start="2018-01-01T00:00:00Z", end="2020-01-01T00:00:00Z")), "Q9617")
        self.assertEqual(result["candidates"][0]["review_status"], "outside_target_season")

    def test_partial_date_is_not_claimed_active(self):
        result = normalize_export(export(row(start="2026-08-01T00:00:00Z", end="")), "Q9617")
        self.assertEqual(result["candidates"][0]["review_status"], "date_scope_partial")

    def test_rejects_malformed_statement_uri(self):
        item = row()
        item["statement"]["value"] = "https://example.org/not-a-statement"
        with self.assertRaisesRegex(ValueError, "invalid player, team, or statement"):
            normalize_export(export(item), "Q9617")

    def test_rejects_conflicting_duplicate_statement_rows(self):
        first = row()
        second = row()
        second["team"] = uri("Q8682")
        with self.assertRaisesRegex(ValueError, "conflicting values"):
            normalize_export(export(first, second))


if __name__ == "__main__":
    unittest.main()
