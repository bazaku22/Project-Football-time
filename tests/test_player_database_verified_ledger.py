import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseVerifiedLedgerTests(unittest.TestCase):
    def test_player_database_reads_only_the_existing_local_event_ledger(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('const LEDGER_KEY="pft_player_match_event_ledger_2026_27_v1"', source)
        self.assertIn("window.FootballTimePlayerMatchEventEntry", source)
        self.assertIn("function loadLedger()", source)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn("XMLHttpRequest", source)
        self.assertEqual(source.count("fetch("), 1)
        self.assertIn("fetch(REGISTRY_URL", source)

    def test_verified_statistics_require_complete_review_and_rights_gates(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        for marker in [
            'record.review_status!=="verified"',
            'record.lineup_coverage!=="complete"',
            'record.event_coverage!=="complete"',
            'sources.length>=2',
            's.reuse_rights==="confirmed"',
            's.permission_basis.trim()',
            'FT_ID.test(player.ft_player_id)'
        ]:
            self.assertIn(marker, source)

    def test_verified_and_pending_players_are_separated_without_name_matching(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("Verified Players", source)
        self.assertIn("Pending Verification", source)
        self.assertIn("ยังไม่ยืนยัน FT Player ID", source)
        self.assertIn("data-player", source)
        self.assertIn("function teamLedger(teamId)", source)

    def test_profile_discloses_partial_ledger_scope_and_only_verified_match_totals(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("ไม่ใช่ยอดรวมทุกการแข่งขัน", source)
        self.assertIn("ไม่ใช่ยอดรวมฤดูกาลทั้งหมด", source)
        self.assertIn("player.appearances", source)
        self.assertIn("player.goals", source)
        self.assertIn("player.assists", source)

    def test_existing_five_league_registry_navigation_is_preserved(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('tab.dataset.dbTab="playerDatabase"', source)
        self.assertIn('count!==96', source)
        self.assertIn('["PL","Premier League"]', source)
        self.assertIn('["PD","La Liga"]', source)
        self.assertIn('["BL1","Bundesliga"]', source)
        self.assertIn('["SA","Serie A"]', source)
        self.assertIn('["FL1","Ligue 1"]', source)


if __name__ == "__main__":
    unittest.main()
