import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "international-matches.json").read_text(encoding="utf-8"))
MODULE = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")

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

    def test_result_is_not_guessed_or_auto_filled(self):
        match = DATA["matches"][0]
        self.assertIsNone(match["homeScore"])
        self.assertIsNone(match["awayScore"])
        self.assertEqual(match["resultVerification"]["status"], "pending_manual_confirmation")

    def test_only_thailand_starting_eleven_is_included_for_pilot(self):
        match = DATA["matches"][0]
        self.assertEqual(len(match["lineups"]), 1)
        lineup = match["lineups"][0]
        self.assertEqual(lineup["team"]["id"], "THA-NATIONAL")
        self.assertEqual(len(lineup["startingXI"]), 11)
        self.assertEqual(len({player["shirtNumber"] for player in lineup["startingXI"]}), 11)
        self.assertNotIn("playerId", json.dumps(lineup))

    def test_dataset_is_precached_and_cache_version_bumped(self):
        self.assertIn('"./data/international-matches.json"', WORKER)
        self.assertIn('football-time-v111', WORKER)

    def test_match_center_merges_static_intl_records_without_changing_core_db(self):
        self.assertIn("mergeInternationalData", MODULE)
        self.assertIn("loadInternationalData", MODULE)
        self.assertIn("baseDatabase", MODULE)
        self.assertIn("getMatchById", MODULE)

if __name__ == "__main__":
    unittest.main()
