import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class DataPreservationTests(unittest.TestCase):
    def test_startup_does_not_delete_legacy_handicap_history(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        match_loader = re.search(r"function loadMatches\(\)\s*\{([\s\S]*?)\n\}", html)
        self.assertIsNotNone(match_loader)
        body = match_loader.group(1)
        self.assertNotIn("localStorage.removeItem", body)
        self.assertNotIn("pft_international_handicap_snapshots_r1", body)
        self.assertNotIn("pft_international_handicap_results_r1", body)

    def test_startup_does_not_filter_and_overwrite_existing_match_records(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        match_loader = re.search(r"function loadMatches\(\)\s*\{([\s\S]*?)\n\}", html)
        self.assertIsNotNone(match_loader)
        body = match_loader.group(1)
        self.assertNotIn("data.filter(isMajorLeagueMatch)", body)
        self.assertNotIn("localStorage.setItem(STORAGE_KEY,JSON.stringify(retained))", body)
        self.assertIn("if(Array.isArray(data))return data;", body)

    def test_unexpected_storage_shape_is_preserved(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        match_loader = re.search(r"function loadMatches\(\)\s*\{([\s\S]*?)\n\}", html)
        self.assertIn("preserving the original value", match_loader.group(1))


if __name__ == "__main__":
    unittest.main()
