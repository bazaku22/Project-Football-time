import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ManualMatchResearchImportUITests(unittest.TestCase):
    def test_secondary_navigation_exposes_manual_research_page(self):
        source = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        self.assertIn('["matchResearch","นำเข้าผลและสถิติ"]', source)
        self.assertIn('researchPage.id = "manualMatchResearchPage"', source)
        self.assertIn('activate(target, null, "")', source)

    def test_import_ui_is_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('content="6.22.0-beta.1"', html)
        self.assertIn('./css/manual-match-research.css?v=1', html)
        self.assertIn('./js/manual-match-research.js', html)
        self.assertIn('./js/manual-match-research.js', sw)
        self.assertIn('./css/manual-match-research.css?v=1', sw)
        self.assertIn('const CACHE = "football-time-v76"', sw)

    def test_ui_requires_validation_before_import_and_keeps_data_local(self):
        source = (ROOT / "js/manual-match-research.js").read_text(encoding="utf-8")
        self.assertIn('$("mrImportButton").disabled = !pendingDataset', source)
        self.assertIn('localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))', source)
        self.assertIn('pft_manual_match_research_2026_27_v1', source)
        self.assertIn('window.confirm("ต้องการลบข้อมูล Manual Research', source)
        self.assertIn('file.size > 2 * 1024 * 1024', source)

    def test_validation_checks_rights_sources_scope_events_and_provider_ratings(self):
        source = (ROOT / "js/manual-match-research.js").read_text(encoding="utf-8")
        for marker in [
            'record.verification_status === "verified"',
            'sources.some((source) => source.reuse_rights !== "confirmed")',
            'AUTHORITATIVE.has(source?.source_type)',
            'event.source_urls.some((url) => !sourceUrls.has(url))',
            'rating.reuse_rights === "confirmed"',
            'rating.scale_min >= rating.scale_max',
            'new Set()',
            '"PL","PD","BL1","SA","FL1","UNL"'
        ]:
            self.assertIn(marker, source)

    def test_import_is_not_a_supabase_or_provider_api_write(self):
        source = (ROOT / "js/manual-match-research.js").read_text(encoding="utf-8")
        self.assertNotIn("fetch(", source)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn("XMLHttpRequest", source)


if __name__ == "__main__":
    unittest.main()
