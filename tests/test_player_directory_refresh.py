import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDirectoryRefreshTests(unittest.TestCase):
    def test_legacy_player_views_are_not_rendered_or_loaded(self):
        js = (ROOT / "js/player-database.js").read_text()
        html = (ROOT / "index.html").read_text()
        self.assertIn('CURRENT_SEASON="2026/27"', js)
        self.assertIn('view==="archive"?p.season!==CURRENT_SEASON:p.season===CURRENT_SEASON', js)
        for marker in ('data-player-view="current"', 'data-player-view="archive"', 'data-player-view="research"'):
            self.assertNotIn(marker, html)
        self.assertNotIn("./js/player-database.js", html)

    def test_canonical_membership_rows_are_scoped_to_matching_statistics(self):
        cloud = (ROOT / "js/player-cloud.js").read_text()
        self.assertIn('flatMap(p=>', cloud)
        self.assertIn('playerStats.filter(x=>!m||(x.season===m.season&&x.team_id===m.team_id&&x.squad_level===m.squad_level))', cloud)
        self.assertIn('statistics:seasonStat?.stats||{}', cloud)
        self.assertIn('statisticsRows:scopedStats.map(x=>', cloud)

    def test_research_pilot_remains_separate_and_has_no_fabricated_statistics(self):
        data = json.loads((ROOT / "data/player-position-pilot-2026-27.json").read_text())
        self.assertEqual(data["status"], "research_only")
        self.assertEqual(data["rights_status"], "pending_review")
        self.assertFalse(data["production_import"])
        self.assertEqual(len(data["players"]), 5)
        self.assertTrue(all(p["season_statistics"] == {} for p in data["players"]))
        self.assertTrue(all(p["rights_status"] == "pending_review" for p in data["players"]))

    def test_current_five_league_research_dataset_is_retained_but_not_loaded(self):
        js = (ROOT / "js/player-database.js").read_text()
        sw = (ROOT / "sw.js").read_text()
        html = (ROOT / "index.html").read_text()
        self.assertIn("current-player-squads-2026-27.json", js)
        self.assertNotIn("current-player-squads-2026-27.json", sw)
        self.assertNotIn("./js/player-database.js", html)
        self.assertIn("source.league_name", js)
        self.assertIn("source.url", js)
        data = json.loads((ROOT / "data/current-player-squads-2026-27.json").read_text())
        self.assertEqual(data["records_count"], 25)
        self.assertEqual(len(data["players"]), 25)
        self.assertEqual(len({p["league_id"] for p in data["players"]}), 5)
        self.assertTrue(all(p["statistics"] == {} and p["rights_status"] == "pending_review" for p in data["players"]))

    def test_player_photos_are_opt_in_only_and_have_safe_fallback(self):
        js = (ROOT / "js/player-database.js").read_text()
        self.assertIn('r.photoUrl||r.photo_url||""', js)
        self.assertIn('initials(name)', js)
        self.assertIn('onerror="this.hidden=true;this.nextElementSibling.hidden=false"', js)
        self.assertIn("ดูแหล่งที่มาและเงื่อนไข", js)
        self.assertIn("สิทธิส่วนบุคคล", js)
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("ได้รับอนุญาตและผ่านการตรวจสอบแหล่งที่มาเท่านั้น", html)

    def test_legacy_player_data_files_are_retained_without_active_ui(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("ข้อมูลเก่า / Archive", html)
        self.assertNotIn('id="playerIdentityReviewPanel"', html)
        self.assertNotIn('id="playerStatsImportPanel"', html)
        self.assertNotIn('id="playerCloudAuth"', html)
        self.assertNotIn('id="playerImportButton"', html)
        self.assertTrue((ROOT / "data/current-player-squads-2026-27.json").exists())
        self.assertNotIn("supabase.from(\"player_records\").delete", (ROOT / "js/player-cloud.js").read_text())

    def test_legacy_player_styles_remain_archived_but_are_not_loaded(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        css = (ROOT / "css/player-directory.css").read_text()
        self.assertNotIn('href="./css/player-directory.css?v=1"', html)
        self.assertNotIn('./css/player-directory.css?v=1', sw)
        for marker in (".player-directory-hero", ".player-card", ".player-avatar-wrap", ".player-metrics"):
            self.assertIn(marker, css)


    def test_research_pilot_photos_include_source_author_license_and_review_notice(self):
        data = json.loads((ROOT / "data/player-position-pilot-2026-27.json").read_text())
        self.assertTrue(all(p.get("photo_url", "").startswith("https://commons.wikimedia.org/wiki/Special:FilePath/") for p in data["players"]))
        self.assertTrue(all(p.get("photo_source_url", "").startswith("https://commons.wikimedia.org/wiki/File:") for p in data["players"]))
        self.assertTrue(all(p.get("photo_author") and p.get("photo_license") and p.get("photo_license_url") for p in data["players"]))
        self.assertTrue(all(p.get("photo_review_status") == "copyright_license_verified_personality_rights_not_independently_cleared" for p in data["players"]))


if __name__ == "__main__":
    unittest.main()
