import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerRosterDatabaseMvpTests(unittest.TestCase):
    def setUp(self):
        self.source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.data = json.loads((ROOT / "data/footballsquads-roster-intake-2026-27.json").read_text(encoding="utf-8"))

    def test_loads_complete_research_roster_independently_of_match_event_ledger(self):
        self.assertIn('const ROSTER_URL="./data/footballsquads-roster-intake-2026-27.json"', self.source)
        self.assertIn("fetch(ROSTER_URL", self.source)
        self.assertIn("rosterData=roster", self.source)
        self.assertIn('roster.status!=="complete_research_only"', self.source)
        self.assertIn('roster.production_import!==false', self.source)

    def test_all_96_clubs_and_five_league_counts_are_available(self):
        self.assertEqual(self.data["status"], "complete_research_only")
        self.assertEqual(self.data["club_pages_reviewed"], 96)
        self.assertEqual(len(self.data["sources"]), 96)
        self.assertEqual(len(self.data["memberships"]), 3415)
        expected = {"PL": 20, "PD": 20, "BL1": 18, "SA": 20, "FL1": 18}
        for league, count in expected.items():
            self.assertEqual(sum(1 for source in self.data["sources"] if source["league_id"] == league), count)
        self.assertIn('data-roster-player', self.source)
        self.assertIn('id:team.dataset.team,name', self.source)

    def test_player_list_uses_exact_source_membership_and_has_search(self):
        self.assertIn('rosterData.memberships.filter(p=>p.source_id===source.id)', self.source)
        self.assertIn('id="pdb-player-search"', self.source)
        self.assertIn('data-roster-player=', self.source)
        self.assertIn('selectedPlayer={id:player.dataset.rosterPlayer}', self.source)

    def test_profile_does_not_invent_identity_or_statistics(self):
        self.assertIn('rosterData.memberships.find(p=>p.id===selectedPlayer.id&&p.source_id===source?.id)', self.source)
        self.assertIn("Source-listed · รอตรวจสอบ", self.source)
        self.assertIn("<b>—</b>", self.source)
        self.assertIn("ยังไม่มีสถิติฤดูกาล 2026/27 ที่ผ่านการตรวจสอบ", self.source)
        self.assertTrue(all(row["identity_status"] == "name_only_unverified" for row in self.data["memberships"]))
        self.assertTrue(all(row["provider_ids"] == [] and row["statistics"] == {} for row in self.data["memberships"]))

    def test_source_and_required_attribution_are_visible(self):
        self.assertIn("source.url", self.source)
        self.assertIn("Source of Material is", self.source)
        self.assertIn("© FootballSquads.com, 1999 - , All Rights Reserved", self.source)
        self.assertIn("source.current_roster_boundary", self.source)

    def test_existing_local_ledger_and_no_supabase_boundary_remain(self):
        self.assertIn("function loadLedger()", self.source)
        self.assertIn("function teamLedger(teamId)", self.source)
        self.assertNotIn("supabase", self.source.lower())
        self.assertFalse(self.data["production_import"])
        self.assertEqual(self.data["provider_api_calls"], 0)


if __name__ == "__main__":
    unittest.main()
