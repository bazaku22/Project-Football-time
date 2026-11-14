import unittest
from scripts.audit_p54_name_matches import audit, normalize_name


class P54NameMatchAuditTests(unittest.TestCase):
    def report(self, candidates):
        return {"season_context": "2026/27", "club_qid_filter": "Q9617", "candidates": candidates}

    def test_normalizes_diacritics_case_and_punctuation(self):
        self.assertEqual(normalize_name("Martín Ødegaard"), "martin odegaard")
        self.assertEqual(normalize_name("  ODEGAARD, Martin  "), "odegaard martin")

    def test_exact_normalized_match_is_provisional(self):
        result = audit(["Martín Ødegaard"], self.report([{
            "wikidata_item_id": "Q16902219", "label": "Martin Odegaard",
            "p54_statements": [{"statement_id": "Q16902219$abc"}]
        }]))
        self.assertEqual(result["matched_count"], 1)
        self.assertEqual(result["rows"][0]["status"], "provisional_name_match")
        self.assertEqual(result["rows"][0]["matched_qids"], ["Q16902219"])
        self.assertFalse(result["production_import"])

    def test_duplicate_qids_for_same_label_are_ambiguous(self):
        result = audit(["Alex Smith"], self.report([
            {"wikidata_item_id": "Q1", "label": "Alex Smith", "p54_statements": []},
            {"wikidata_item_id": "Q2", "label": "Alex Smith", "p54_statements": []},
        ]))
        self.assertEqual(result["ambiguous_count"], 1)
        self.assertEqual(result["rows"][0]["status"], "ambiguous_name_match")

    def test_duplicate_reference_names_are_ambiguous(self):
        result = audit(["Alex Smith", "Alex Smith"], self.report([
            {"wikidata_item_id": "Q1", "label": "Alex Smith", "p54_statements": []}
        ]))
        self.assertEqual(result["ambiguous_count"], 2)

    def test_no_fuzzy_or_substring_match(self):
        result = audit(["Bukayo Saka"], self.report([
            {"wikidata_item_id": "Q1", "label": "Bukayo Saka Jr", "p54_statements": []}
        ]))
        self.assertEqual(result["unmatched_count"], 1)
        self.assertEqual(result["rows"][0]["matched_qids"], [])


if __name__ == "__main__":
    unittest.main()
