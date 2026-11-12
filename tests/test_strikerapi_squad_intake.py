import json, tempfile, unittest
from pathlib import Path
from scripts.strikerapi_squad_intake import LEAGUES, TARGET_SEASON, normalize, season_label

def fixture():
    return {code: {"season": 2026, "players": [{
        "player_id": f"{code}-player-1", "name": f"Example Player {code}",
        "team_id": f"{code}-team-1", "team_name": f"{code} FC",
        "position": "Midfielder", "jersey": 8, "age": 25
    }]} for code in LEAGUES}

class StrikerApiSquadIntakeTests(unittest.TestCase):
    def test_season_label_maps_provider_start_year(self):
        self.assertEqual(season_label(2026), TARGET_SEASON)
        self.assertEqual(season_label("2026/27"), TARGET_SEASON)
        self.assertEqual(season_label(2025), "2025/26")
    def test_normalizes_five_leagues_without_canonical_ids(self):
        result=normalize(fixture(),collected_at="2026-11-13T00:00:00Z")
        self.assertEqual(result["status"],"staging_only")
        self.assertEqual(result["provider_api_calls"],0)
        self.assertEqual(result["estimated_credits"],0)
        self.assertEqual(result["coverage"]["total_player_memberships"],5)
        self.assertEqual(result["coverage"]["unique_provider_players"],5)
        self.assertEqual(result["coverage"]["repeated_provider_ids"],0)
        self.assertEqual(set(result["coverage"]["leagues"]),set(LEAGUES))
        self.assertTrue(all(r["canonical_player_id"] is None for r in result["players"]))
        self.assertTrue(all(r["team_mapping_status"]=="needs_exact_team_id_review" for r in result["players"]))
        self.assertTrue(all(r["squad_level"]=="unknown" for r in result["players"]))
    def test_repeated_provider_id_is_preserved_as_memberships_and_flagged(self):
        data=fixture()
        data["PD"]["players"][0]["player_id"]="PL-player-1"
        result=normalize(data)
        self.assertEqual(result["coverage"]["total_player_memberships"],5)
        self.assertEqual(result["coverage"]["unique_provider_players"],4)
        self.assertEqual(result["coverage"]["repeated_provider_ids"],1)
        report=result["duplicate_provider_id_review"][0]
        self.assertEqual(report["provider_player_id"],"PL-player-1")
        self.assertEqual(report["observation_count"],2)
        self.assertEqual(report["review_status"],"conflicting_identity_observations")
        repeated=[r for r in result["players"] if r["provider_player_id"]=="PL-player-1"]
        self.assertEqual(len(repeated),2)
        self.assertTrue(all(r["provider_identity_status"]=="needs_manual_review" for r in repeated))
    def test_rejects_missing_league(self):
        data=fixture(); data.pop("PL")
        with self.assertRaisesRegex(ValueError,"missing five-league"): normalize(data)
    def test_rejects_wrong_season(self):
        data=fixture(); data["PD"]["season"]=2025
        with self.assertRaisesRegex(ValueError,"expected 2026/27"): normalize(data)
    def test_rejects_missing_identity(self):
        data=fixture(); data["SA"]["players"][0]["player_id"]=""
        with self.assertRaisesRegex(ValueError,"missing player_id or name"): normalize(data)
    def test_provider_team_id_never_becomes_canonical(self):
        row=normalize(fixture())["players"][0]
        self.assertEqual(row["provider_team_id"],"PL-team-1")
        self.assertIsNone(row["canonical_team_id"])
    def test_output_round_trips(self):
        result=normalize(fixture())
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"stage.json"
            path.write_text(json.dumps(result),encoding="utf-8")
            loaded=json.loads(path.read_text(encoding="utf-8"))
            self.assertFalse(loaded["production_import"])
            self.assertEqual(loaded["supabase_writes"],0)
            self.assertEqual(len(loaded["player_master_candidates"]),5)

if __name__=="__main__": unittest.main()
