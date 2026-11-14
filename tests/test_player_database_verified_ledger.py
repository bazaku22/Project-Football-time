import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseVerifiedLedgerTests(unittest.TestCase):
    def test_player_database_reads_only_the_existing_local_event_ledger(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('const LEDGER_KEY="pft_player_match_event_ledger_2026_27_v1"', source)
        self.assertIn("window.FootballTimePlayerMatchEventEntry", source)
        self.assertIn("function loadLedger()", source)
        self.assertIn('const TEAM_ALIAS_KEY="pft_player_team_alias_decisions_2026_27_v1"', source)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn("XMLHttpRequest", source)
        self.assertEqual(source.count("fetch("), 3)
        self.assertIn("fetch(REGISTRY_URL", source)
        self.assertIn("fetch(ROSTER_URL", source)
        self.assertIn("fetch(TEAM_ALIAS_URL", source)
        self.assertIn("reviewed bundled crosswalk", source)

    def test_verified_statistics_require_complete_review_and_rights_gates(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        for marker in [
            'record.season!=="2026/27"',
            'record.review_status!=="verified"',
            'record.lineup_coverage!=="complete"',
            'record.event_coverage!=="complete"',
            'sources.length>=2',
            's.reuse_rights==="confirmed"',
            's.permission_basis.trim()',
            'FT_ID.test(player.ft_player_id)'
        ]:
            self.assertIn(marker, source)

    def test_roster_profile_uses_unique_exact_normalized_name_match_as_provisional_only(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("function teamLedger(teamId)", source)
        self.assertIn("function provisionalNameStats(rosterPlayer,teamId)", source)
        self.assertIn("function normalizePlayerName(value)", source)
        self.assertIn('matches.length!==1', source)
        self.assertIn('"provisional_name_match"', source)
        self.assertIn("scope:\"recorded_verified_matches_only\"", source)
        self.assertIn("จับคู่ด้วยชื่อเต็มตรงกัน · provisional", source)
        self.assertIn("teamMappingPending:true", source)
        self.assertIn("rosterData.memberships.find(p=>p.id===selectedPlayer.id", source)
        self.assertIn("ไม่ใช่ยอดรวมทุกการแข่งขันหรือทั้งฤดูกาล", source)

    def test_roster_profile_never_fabricates_zero_for_missing_or_ambiguous_data(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("<b>—</b>", source)
        self.assertIn("source.current_roster_boundary", source)
        self.assertIn("appearances:0,goals:0,assists:0", source)
        self.assertIn('provisional.status==="ambiguous_name_match"', source)
        self.assertIn('provisional.status==="team_mapping_pending"', source)

    def test_existing_five_league_registry_navigation_is_preserved(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('tab.dataset.dbTab="playerDatabase"', source)
        self.assertIn('count!==96', source)
        self.assertIn('["PL","Premier League"]', source)
        self.assertIn('["PD","La Liga"]', source)
        self.assertIn('["BL1","Bundesliga"]', source)
        self.assertIn('["SA","Serie A"]', source)
        self.assertIn('["FL1","Ligue 1"]', source)

    def test_reviewed_crosswalk_contains_only_exact_registry_and_canonical_id_decisions(self):
        import json
        crosswalk = json.loads((ROOT / "data/player-team-alias-decisions-2026-27.json").read_text(encoding="utf-8"))
        self.assertEqual(crosswalk["status"], "reviewed_approved")
        self.assertFalse(crosswalk["production_import"])
        self.assertEqual(len(crosswalk["decisions"]), 7)
        for item in crosswalk["decisions"]:
            self.assertEqual(item["status"], "approved")
            self.assertFalse(item["review_required"])
            self.assertRegex(item["canonical_team_id"], r"^football-data:[0-9]+$")
            self.assertIn("candidate_artifact_exact_canonical_id", item["evidence"])
            self.assertIn("football_database_exact_canonical_id_and_name", item["evidence"])

    def test_bundled_crosswalk_is_still_gated_by_exact_provider_name(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("providerName===item.provider_team_name", source)
        self.assertIn('item.review_required===false', source)

if __name__ == "__main__":
    unittest.main()
