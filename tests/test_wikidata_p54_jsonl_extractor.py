import json
import tempfile
import unittest
from pathlib import Path
from scripts.wikidata_p54_jsonl_extractor import (
    extract, extract_entity, normalize_sparql_json, time_date
)


def snak(qid):
    return {"datavalue": {"value": {"entity-type": "item", "id": qid}}}


def time_snak(value):
    return {"datavalue": {"value": {"time": value}}}


def binding(value, kind="uri"):
    return {"type": kind, "value": value}


def sparql_row(reference="https://www.wikidata.org/entity/reference/R1",
               reference_url="https://example.org/roster",
               source="http://www.wikidata.org/entity/Q999",
               retrieved="2026-11-10T00:00:00Z",
               team="Q9617", statement="Q123$abc"):
    row = {
        "player": binding("http://www.wikidata.org/entity/Q123"),
        "occupation": binding("http://www.wikidata.org/entity/Q937857"),
        "playerLabel": binding("Test Player", "literal"),
        "team": binding(f"http://www.wikidata.org/entity/{team}"),
        "statement": binding(f"http://www.wikidata.org/entity/statement/{statement}"),
        "rank": binding("http://wikiba.se/ontology#NormalRank"),
        "start": binding("2026-08-01T00:00:00Z", "literal"),
    }
    if reference:
        row["reference"] = binding(reference)
    if reference_url:
        row["referenceUrl"] = binding(reference_url)
    if source:
        row["referenceSource"] = binding(source)
    if retrieved:
        row["retrieved"] = binding(retrieved, "literal")
    return row


# Regression coverage for both local JSONL and scoped WDQS SPARQL JSON input.
class WikidataP54ExtractorTests(unittest.TestCase):
    def entity(self):
        return {
            "id": "Q123",
            "labels": {"en": {"value": "Synthetic Player"}},
            "claims": {
                "P106": [{"mainsnak": snak("Q937857")}],
                "P54": [{
                    "id": "Q123$abc",
                    "rank": "normal",
                    "mainsnak": snak("Q456"),
                    "qualifiers": {"P580": [time_snak("+2026-07-01T00:00:00Z")]},
                    "references": [{"snaks": {
                        "P854": [{"datavalue": {"value": "https://example.org/source"}}],
                        "P248": [{"datavalue": {"value": {"id": "Q999"}}}],
                        "P813": [time_snak("+2026-11-10T00:00:00Z")],
                    }}],
                }],
            },
        }

    def test_extracts_player_and_preserves_team_qid_and_evidence(self):
        row = extract_entity(self.entity())
        self.assertEqual(row["wikidata_item_id"], "Q123")
        self.assertEqual(row["p54_statements"][0]["team_item_id"], "Q456")
        self.assertEqual(row["p54_statements"][0]["qualifiers"]["start_time"], "2026-07-01")
        self.assertEqual(row["p54_statements"][0]["references"], [{"url": "https://example.org/source"}])
        evidence = row["p54_statements"][0]["reference_evidence"][0]
        self.assertEqual(evidence["source_item_ids"], ["Q999"])
        self.assertEqual(evidence["retrieved_dates"], ["2026-11-10"])

    def test_ignores_non_player_and_missing_p54(self):
        entity = self.entity()
        entity["claims"]["P106"] = [{"mainsnak": snak("Q5")}]
        self.assertIsNone(extract_entity(entity))
        entity = self.entity()
        entity["claims"]["P54"] = []
        self.assertIsNone(extract_entity(entity))

    def test_time_parser_rejects_invalid_dates(self):
        self.assertIsNone(time_date(time_snak("+2026-13-40T00:00:00Z")))

    def test_streams_jsonl_and_keeps_unmapped_research_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "sample.jsonl"
            source.write_text("\n".join(json.dumps(x) for x in [self.entity(), {"id": "Q999", "claims": {}}]) + "\n", encoding="utf-8")
            report = extract(source, "2026-11-12")
        self.assertEqual(report["input_entities_scanned"], 2)
        self.assertEqual(report["records_count"], 1)
        self.assertFalse(report["club_qid_mapping_applied"])
        self.assertFalse(report["production_import"])
        self.assertEqual(report["provider_api_calls"], 0)
        self.assertEqual(report["supabase_writes"], 0)

    def test_rejects_future_dump_date(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "empty.jsonl"
            source.write_text("", encoding="utf-8")
            with self.assertRaises(ValueError):
                extract(source, "2026-11-15")

    def test_normalizes_scoped_sparql_json_and_preserves_statement_provenance(self):
        report = normalize_sparql_json(
            {"results": {"bindings": [sparql_row()]}}, "Q9617"
        )
        self.assertEqual(report["records_count"], 1)
        self.assertEqual(report["club_qid_filter"], "Q9617")
        statement = report["candidates"][0]["p54_statements"][0]
        self.assertEqual(statement["statement_id"], "Q123$abc")
        self.assertEqual(statement["team_item_id"], "Q9617")
        self.assertEqual(statement["qualifiers"]["start_time"], "2026-08-01")
        self.assertEqual(statement["references"], [{"url": "https://example.org/roster"}])
        evidence = statement["reference_evidence"][0]
        self.assertEqual(evidence["source_item_ids"], ["Q999"])
        self.assertEqual(evidence["retrieved_dates"], ["2026-11-10"])
        self.assertFalse(report["production_import"])
        self.assertEqual(report["provider_api_calls"], 0)
        self.assertEqual(report["supabase_writes"], 0)

    def test_groups_multiple_reference_rows_for_same_statement(self):
        report = normalize_sparql_json({
            "results": {"bindings": [
                sparql_row(),
                sparql_row(
                    reference="https://www.wikidata.org/entity/reference/R2",
                    reference_url="https://example.net/second-source",
                    source="",
                    retrieved="2026-11-11T00:00:00Z",
                ),
            ]}
        }, "Q9617")
        statement = report["candidates"][0]["p54_statements"][0]
        self.assertEqual(report["records_count"], 1)
        self.assertEqual(statement["reference_count"], 2)
        self.assertEqual(len(statement["references"]), 2)

    def test_rejects_rows_for_another_club(self):
        with self.assertRaisesRegex(ValueError, "does not match requested"):
            normalize_sparql_json({"results": {"bindings": [sparql_row(team="Q8682")]}}, "Q9617")

    def test_rejects_malformed_statement_uri(self):
        item = sparql_row()
        item["statement"] = binding("https://example.org/not-a-statement")
        with self.assertRaisesRegex(ValueError, "invalid player, team, or statement"):
            normalize_sparql_json({"results": {"bindings": [item]}}, "Q9617")

    def test_rejects_conflicting_duplicate_statement_rows(self):
        first = sparql_row()
        second = sparql_row()
        second["start"] = binding("2025-07-01T00:00:00Z", "literal")
        with self.assertRaisesRegex(ValueError, "conflicting rank/date"):
            normalize_sparql_json({"results": {"bindings": [first, second]}}, "Q9617")

    def test_normalizes_plus_prefixed_wikidata_date_time(self):
        item = sparql_row()
        item["start"] = binding("+2026-08-01T00:00:00Z", "literal")
        report = normalize_sparql_json({"results": {"bindings": [item]}}, "Q9617")
        self.assertEqual(report["candidates"][0]["p54_statements"][0]["qualifiers"]["start_time"], "2026-08-01")

    def test_rejects_non_football_occupation_binding(self):
        item = sparql_row()
        item["occupation"] = binding("http://www.wikidata.org/entity/Q5")
        with self.assertRaisesRegex(ValueError, "occupation"):
            normalize_sparql_json({"results": {"bindings": [item]}}, "Q9617")

    def test_rejects_invalid_team_qid(self):
        with self.assertRaisesRegex(ValueError, "team-qid"):
            normalize_sparql_json({"results": {"bindings": []}}, "Arsenal")


if __name__ == "__main__":
    unittest.main()
