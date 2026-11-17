import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "international-matches.json").read_text(encoding="utf-8"))
MODULE = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
DETAIL = (ROOT / "js" / "unified-match-center.js").read_text(encoding="utf-8")

class InternationalMatchDataTests(unittest.TestCase):
    def test_dataset_has_shared_uuid_match_id(self):
        self.assertEqual(DATA["schemaVersion"], 1)
        self.assertEqual(len(DATA["matches"]), 1)
        match = DATA["matches"][0]
        self.assertEqual(match["id"], "27dffc4f-406c-401e-9b95-a772304318a4")
        self.assertRegex(match["id"], r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")

    def test_fixture_is_separate_from_five_club_leagues(self):
        match = DATA["matches"][0]
        self.assertEqual(match["leagueId"], "INTL")
        self.assertEqual(match["matchType"], "national_team")
        self.assertEqual({team["id"] for team in DATA["teams"]}, {"TJK-NATIONAL", "THA-NATIONAL"})
        self.assertIn('"INTL"', MODULE)

    def test_final_result_is_verified_and_revisioned(self):
        match = DATA["matches"][0]
        self.assertEqual((match["homeScore"], match["awayScore"]), (3, 0))
        self.assertEqual(match["status"], "FINISHED")
        self.assertEqual(match["resultVerification"]["status"], "verified")
        self.assertEqual(match["resultRevision"], 1)
        self.assertEqual(len(match["resultRevisionHistory"]), 1)
        self.assertEqual(match["resultRevisionHistory"][0]["revision"], 1)

    def test_verified_match_events_and_provenance(self):
        match = DATA["matches"][0]
        self.assertEqual([event["type"] for event in match["events"]], ["red_card", "goal", "goal", "goal"])
        self.assertEqual([event["minute"] for event in match["events"]], [38, 40, 49, 75])
        self.assertEqual([event["player"]["name"] for event in match["events"]][1:],
                         ["Supachok Sarachat", "Theerasak Phaepimay", "Theerasak Phaepimay"])
        for event in match["events"]:
            self.assertGreaterEqual(len(event["sourceUrls"]), 2)
        self.assertNotIn("assist", json.dumps(match["events"]).lower())
        self.assertNotIn("playerId", json.dumps(match))

    def test_thailand_is_home_and_tajikistan_is_away(self):
        match = DATA["matches"][0]
        self.assertEqual(match["homeTeamId"], "THA-NATIONAL")
        self.assertEqual(match["awayTeamId"], "TJK-NATIONAL")
        self.assertEqual(match["homeTeamName"], "Thailand")
        self.assertEqual(match["awayTeamName"], "Tajikistan")

    def test_both_teams_have_named_starting_xi_and_substitutes(self):
        match = DATA["matches"][0]
        self.assertEqual(len(match["lineups"]), 2)
        by_team = {row["team"]["id"]: row for row in match["lineups"]}
        self.assertEqual(set(by_team), {"THA-NATIONAL", "TJK-NATIONAL"})
        for team_id, lineup in by_team.items():
            with self.subTest(team=team_id):
                self.assertEqual(len(lineup["startingXI"]), 11)
                self.assertEqual(len({player["shirtNumber"] for player in lineup["startingXI"]}), 11)
                self.assertEqual(len(lineup["substitutes"]), 12)
                self.assertEqual(len({player["shirtNumber"] for player in lineup["substitutes"]}), 12)
                self.assertEqual(lineup["substitutesStatus"], "named_substitutes")
                self.assertNotIn("playerId", json.dumps(lineup))
                self.assertTrue(lineup["startingXISource"]["url"])
                self.assertTrue(lineup["substitutesSource"]["url"])

    def test_result_revision_history_preserves_initial_verified_result(self):
        match = DATA["matches"][0]
        self.assertEqual(match["resultRevisionHistory"][0]["homeScore"], match["homeScore"])
        self.assertEqual(match["resultRevisionHistory"][0]["awayScore"], match["awayScore"])
        self.assertTrue(match["resultRevisionHistory"][0]["sourceUrls"])

    def test_match_detail_renders_named_lineups_and_source_links(self):
        self.assertIn("mc-lineup-team", DETAIL)
        self.assertIn("mc-lineup-player", DETAIL)
        self.assertIn("startingXISource", DETAIL)
        self.assertIn("substitutesSource", DETAIL)

    def test_dataset_is_precached_and_cache_version_bumped(self):
        self.assertIn('"./data/international-matches.json"', WORKER)
        self.assertIn('football-time-v115', WORKER)

    def test_match_center_merges_static_intl_records_without_changing_core_db(self):
        self.assertIn("mergeInternationalData", MODULE)
        self.assertIn("loadInternationalData", MODULE)
        self.assertIn("baseDatabase", MODULE)
        self.assertIn("getMatchById", MODULE)

if __name__ == "__main__":
    unittest.main()
