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
        self.assertIn('return ["INTL","COMP:" + String(match.competitionName || "")]', MODULE)

    def test_manual_research_results_overlay_existing_international_fixture_ids(self):
        self.assertIn('pft_manual_match_research_2026_27_v1', MODULE)
        self.assertIn('fixture_ref?.international_fixture_id', MODULE)
        self.assertIn('applyManualResearchResults()', MODULE)
        self.assertIn('researchRecord', MODULE)
        self.assertIn('record.score?.home', MODULE)
        self.assertIn('record?.events', MODULE)
        self.assertIn('pft-manual-match-research-updated', MODULE)
        self.assertIn('mc-research-status', CSS)
        self.assertIn('ไม่เขียนลงฐานข้อมูลหลักหรือ Supabase', MODULE)

    def test_flags_are_local_unicode_and_accessible(self):
        self.assertIn("function countryFlag(code)", MODULE)
        self.assertIn('aria-label="ธงชาติ', MODULE)
        self.assertIn("GB-ENG", MODULE)
        self.assertIn("GB-WLS", MODULE)
        self.assertIn(".mc-flag", CSS)
        self.assertNotIn("flagcdn", MODULE.lower())

    def test_international_match_cards_show_only_valid_pre_match_model_snapshots(self):
        self.assertIn('fetch("./data/international-handicap-snapshots-r1.json")', MODULE)
        self.assertIn('snapshot.captured_before_kickoff === true', MODULE)
        self.assertIn('captured < kickoff', MODULE)
        self.assertIn('renderInternationalAnalysisSummary(match)', MODULE)
        self.assertIn('probabilities_1x2', MODULE)
        for outcome in ("full_win","half_win","push","half_loss","full_loss"):
            self.assertIn(outcome, MODULE)
        self.assertIn('เส้นจำลอง ไม่ใช่เส้นตลาด', MODULE)
        self.assertIn('!isInternational && kind === "upcoming"', MODULE)

    def test_international_handicap_snapshot_file_is_isolated_and_pre_match(self):
        snapshots = json.loads((ROOT / "data" / "international-handicap-snapshots-r1.json").read_text(encoding="utf-8"))
        self.assertEqual(snapshots["dataset_status"], "experimental_isolated_pre_match_handicap_snapshots")
        self.assertEqual(snapshots["snapshot_count"], len(snapshots["snapshots"]))
        self.assertEqual(snapshots["snapshot_count"], 14)
        self.assertEqual(snapshots["default_home_line"], -1)
        for row in snapshots["snapshots"]:
            self.assertTrue(row["captured_before_kickoff"])
            self.assertLess(row["captured_at"], row["kickoff_utc"])
            self.assertEqual(row["model_version"], "intl-r1-handicap-0.1.0")
            self.assertEqual(len(row["handicap_lines"]), len(snapshots["scenario_lines"]))
            for line in row["handicap_lines"]:
                self.assertAlmostEqual(sum(line["probabilities"].values()), 1.0, places=7)
        self.assertEqual(snapshots["excluded_fixtures"][0]["fixture_id"], "INT-R1-011")

    def test_unknown_kickoff_is_not_guessed(self):
        unknown = [row for row in DATA["fixtures"] if not row["kickoff_utc"]]
        self.assertEqual([row["id"] for row in unknown], ["INT-R1-011"])
        self.assertIn("ไม่ประกาศเวลา", MODULE)
        self.assertIn("ยังไม่ประกาศเวลาแข่งขัน", MODULE)

    def test_service_worker_caches_fixture_file_and_bumps_version(self):
        self.assertIn("football-time-v89", WORKER)
        self.assertIn('"./data/international-match-fixtures-r1.json"', WORKER)
        self.assertIn('"./data/international-handicap-snapshots-r1.json"', WORKER)

    def test_app_version_and_copy_are_updated(self):
        self.assertIn('<title>Project Football Time V6.26.5-beta.2</title>', HTML)
        self.assertIn('<meta name="application-version" content="6.26.5-beta.2">', HTML)
        self.assertIn('<span class="app-version">V6.26.5-beta.2</span>', HTML)
        self.assertIn("ทีมชาติชุดทดลอง", MODULE)


if __name__ == "__main__":
    unittest.main()
