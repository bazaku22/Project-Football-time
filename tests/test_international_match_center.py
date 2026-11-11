import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "international-match-fixtures-r1.json").read_text(encoding="utf-8"))
MODULE = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
CSS = (ROOT / "css" / "match-center.css").read_text(encoding="utf-8")


class InternationalMatchCenterTests(unittest.TestCase):
    def test_fixture_read_model_is_isolated_and_complete(self):
        self.assertEqual(DATA["dataset_status"], "experimental_fixture_reference")
        self.assertEqual(len(DATA["fixtures"]), 15)
        ids = [row["id"] for row in DATA["fixtures"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(bool(row["kickoff_utc"]) for row in DATA["fixtures"]), 14)
        self.assertEqual(sum(not row["kickoff_utc"] for row in DATA["fixtures"]), 1)
        self.assertEqual(DATA["display_policy"]["club_database_unchanged"], True)
        self.assertTrue(all(row["source_urls"] for row in DATA["fixtures"]))

    def test_country_codes_are_present_for_every_team(self):
        for row in DATA["fixtures"]:
            self.assertRegex(row["home_country_code"], r"^(?:[A-Z]{2}|GB-ENG|GB-WLS)$")
            self.assertRegex(row["away_country_code"], r"^(?:[A-Z]{2}|GB-ENG|GB-WLS)$")

    def test_match_center_combines_without_merging_club_database(self):
        self.assertIn('fetch("./data/international-match-fixtures-r1.json")', MODULE)
        self.assertIn('const clubMatches = (database?.matches || []).filter', MODULE)
        self.assertIn('return [...clubMatches,...internationalFixtures]', MODULE)
        self.assertIn('leagueId:"INTL"', MODULE)
        self.assertIn('value="INTL"', MODULE)

    def test_flags_are_local_unicode_and_accessible(self):
        self.assertIn("function countryFlag(code)", MODULE)
        self.assertIn('aria-label="ธงชาติ', MODULE)
        self.assertIn("GB-ENG", MODULE)
        self.assertIn("GB-WLS", MODULE)
        self.assertIn(".mc-flag", CSS)
        self.assertNotIn("flagcdn", MODULE.lower())

    def test_international_fixtures_do_not_show_model_percentages_or_open_club_analysis(self):
        self.assertIn("(isInternational ? '' : renderAnalysisSummary(match,cardAnalysis))", MODULE)
        self.assertIn("!isInternational && kind === \"upcoming\"", MODULE)
        self.assertIn("ยังไม่แสดงผลวิเคราะห์ทีมชาติ", MODULE)

    def test_unknown_kickoff_is_not_guessed(self):
        unknown = [row for row in DATA["fixtures"] if not row["kickoff_utc"]]
        self.assertEqual([row["id"] for row in unknown], ["INT-R1-011"])
        self.assertIn("ไม่ประกาศเวลา", MODULE)
        self.assertIn("ยังไม่ประกาศเวลาแข่งขัน", MODULE)

    def test_service_worker_caches_fixture_file_and_bumps_version(self):
        self.assertIn("football-time-v50", WORKER)
        self.assertIn('"./data/international-match-fixtures-r1.json"', WORKER)

    def test_app_version_and_copy_are_updated(self):
        self.assertIn('<title>Project Football Time V6.3.0-beta.1</title>', HTML)
        self.assertIn('<meta name="application-version" content="6.3.0-beta.1">', HTML)
        self.assertIn('<span class="app-version">V6.3.0-beta.1</span>', HTML)
        self.assertIn("ทีมชาติชุดทดลอง", HTML)


if __name__ == "__main__":
    unittest.main()
