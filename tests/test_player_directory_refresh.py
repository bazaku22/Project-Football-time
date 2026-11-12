import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDirectoryRefreshTests(unittest.TestCase):
    def test_player_directory_has_separate_current_archive_and_research_views(self):
        js = (ROOT / "js/player-database.js").read_text()
        self.assertIn('CURRENT_SEASON="2026/27"', js)
        self.assertIn('data-player-view="current"', (ROOT / "index.html").read_text())
        self.assertIn('data-player-view="archive"', (ROOT / "index.html").read_text())
        self.assertIn('data-player-view="research"', (ROOT / "index.html").read_text())
        self.assertIn('view==="archive"?p.season!==CURRENT_SEASON:p.season===CURRENT_SEASON', js)

    def test_canonical_membership_rows_are_scoped_to_matching_statistics(self):
        cloud = (ROOT / "js/player-cloud.js").read_text()
        self.assertIn('flatMap(p=>', cloud)
        self.assertIn('x.season===m?.season&&x.team_id===m?.team_id&&x.squad_level===m?.squad_level', cloud)
        self.assertIn('statistics:stat?.stats||{}', cloud)

    def test_research_pilot_remains_separate_and_has_no_fabricated_statistics(self):
        data = json.loads((ROOT / "data/player-position-pilot-2026-27.json").read_text())
        self.assertEqual(data["status"], "research_only")
        self.assertEqual(data["rights_status"], "pending_review")
        self.assertFalse(data["production_import"])
        self.assertEqual(len(data["players"]), 5)
        self.assertTrue(all(p["season_statistics"] == {} for p in data["players"]))
        self.assertTrue(all(p["rights_status"] == "pending_review" for p in data["players"]))

    def test_player_photos_are_opt_in_only_and_have_safe_fallback(self):
        js = (ROOT / "js/player-database.js").read_text()
        self.assertIn('r.photoUrl||r.photo_url||""', js)
        self.assertIn('initials(name)', js)
        self.assertIn('onerror="this.hidden=true;this.nextElementSibling.hidden=false"', js)
        html = (ROOT / "index.html").read_text()
        self.assertIn("ได้รับอนุญาตและผ่านการตรวจสอบแหล่งที่มาเท่านั้น", html)

    def test_legacy_archive_is_non_destructive_and_tools_are_preserved(self):
        html = (ROOT / "index.html").read_text()
        self.assertIn("ข้อมูลเก่า / Archive", html)
        self.assertIn('<details class="card">', html)
        self.assertIn('id="playerIdentityReviewPanel"', html)
        self.assertIn('id="playerStatsImportPanel"', html)
        self.assertIn('id="playerCloudAuth"', html)
        self.assertIn('id="playerImportButton"', html)
        self.assertNotIn("supabase.from(\"player_records\").delete", (ROOT / "js/player-cloud.js").read_text())

    def test_visual_styles_are_loaded_and_cached(self):
        html = (ROOT / "index.html").read_text()
        sw = (ROOT / "sw.js").read_text()
        css = (ROOT / "css/player-directory.css").read_text()
        self.assertIn('href="./css/player-directory.css?v=1"', html)
        self.assertIn('./css/player-directory.css?v=1', sw)
        for marker in (".player-directory-hero", ".player-card", ".player-avatar-wrap", ".player-metrics"):
            self.assertIn(marker, css)


if __name__ == "__main__":
    unittest.main()
