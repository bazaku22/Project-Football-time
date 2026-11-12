import json
import tempfile
import unittest
from pathlib import Path
from scripts.wikidata_p54_jsonl_extractor import extract, extract_entity, time_date


def snak(qid):
    return {"datavalue": {"value": {"entity-type": "item", "id": qid}}}


def time_snak(value):
    return {"datavalue": {"value": {"time": value}}}


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
                    "references": [{"snaks": {"P854": [{"datavalue": {"value": "https://example.org/source"}}]}}],
                }],
            },
        }

    def test_extracts_player_and_preserves_team_qid_and_evidence(self):
        row = extract_entity(self.entity())
        self.assertEqual(row["wikidata_item_id"], "Q123")
        self.assertEqual(row["p54_statements"][0]["team_item_id"], "Q456")
        self.assertEqual(row["p54_statements"][0]["qualifiers"]["start_time"], "2026-07-01")
        self.assertEqual(row["p54_statements"][0]["references"], [{"url": "https://example.org/source"}])

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
                extract(source, "2026-11-13")


if __name__ == "__main__":
    unittest.main()
