from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseNavigationTests(unittest.TestCase):
    def test_player_database_is_a_league_and_team_subtab(self):
        script = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('root.id="dbtab-playerDatabase"', script)
        self.assertIn('root.className="db-panel"', script)
        self.assertIn('const fixtures=document.querySelector("#fixtures")', script)
        self.assertIn('tab.dataset.dbTab="playerDatabase"', script)
        self.assertIn('databaseNav.appendChild(tab)', script)

    def test_dynamic_database_tabs_are_handled_by_delegated_click_listener(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('event.target.closest("[data-db-tab]")', index)
        self.assertIn('switchDatabaseTab(button.dataset.dbTab)', index)

    def test_player_database_is_not_listed_in_home_secondary_tools(self):
        navigation = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        self.assertNotIn('["playerDatabase","หมวดข้อมูลผู้เล่น"]', navigation)
        self.assertIn('secondary.map(([id,label])', navigation)

    def test_player_database_registry_and_assets_remain_available(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        script = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("./js/player-database-mvp.js", index)
        self.assertIn("./data/player-team-name-registry-2026-27.json", script)
        self.assertIn("./data/player-team-name-registry-2026-27.json", sw)
        self.assertIn("./data/footballsquads-roster-intake-2026-27.json", sw)
        self.assertIn('const CACHE = "football-time-v99";', sw)


if __name__ == "__main__":
    unittest.main()
