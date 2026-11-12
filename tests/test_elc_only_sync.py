import copy
import unittest

from scripts.sync_elc_database import merge_elc_payloads


def base_database():
    league_ids = ["PL", "PD", "BL1", "SA", "FL1", "ELC", "J1", "J2"]
    data_ids = ["PL", "PD", "BL1", "SA", "FL1", "ELC"]
    teams = [{"id": "football-data:1", "name": "Core FC"},
             {"id": "football-data:9", "name": "Old ELC FC"}]
    team_seasons = [{"teamId": "football-data:1", "leagueId": code, "season": "2026-2027"}
                    for code in data_ids if code != "ELC"]
    team_seasons.append({"teamId": "football-data:9", "leagueId": "ELC", "season": "2025-2026"})
    standings = [{"leagueId": code, "season": "2026-2027", "teamId": "football-data:1",
                  "played": 0, "won": 0, "draw": 0, "lost": 0, "goalsFor": 0,
                  "goalsAgainst": 0, "goalDifference": 0, "points": 0}
                 for code in data_ids if code != "ELC"]
    standings.append({"leagueId": "ELC", "season": "2025-2026", "teamId": "football-data:9",
                      "played": 0, "won": 0, "draw": 0, "lost": 0, "goalsFor": 0,
                      "goalsAgainst": 0, "goalDifference": 0, "points": 0})
    matches = [{"providerMatchId": i, "leagueId": code, "season": "2026-2027"}
               for i, code in enumerate(data_ids) if code != "ELC"]
    matches.append({"providerMatchId": 99, "leagueId": "ELC", "season": "2025-2026"})
    return {
        "schemaVersion": "1.3.0",
        "generatedAt": "2026-11-01T00:00:00+00:00",
        "source": {"provider": "football-data.org", "leagueSync": {"PL": {"status": "fresh"}}},
        "leagues": [{"id": code} for code in league_ids],
        "teams": teams, "teamSeasons": team_seasons, "standings": standings,
        "matches": matches,
        "probabilitySnapshots": [{"matchId": 99, "createdAt": "immutable"}],
    }


def payloads():
    teams = {
        "season": {"startDate": "2026-08-01", "endDate": "2027-05-31"},
        "competition": {"id": ELC_COMP_ID},
        "teams": [{"id": 2, "name": "New ELC FC", "shortName": "New ELC",
                   "tla": "NEF", "crest": "https://example.test/crest.png",
                   "area": {"name": "England"}}],
    }
    matches = {"matches": [{
        "id": 200, "utcDate": "2026-11-15T15:00:00Z", "status": "SCHEDULED",
        "homeTeam": {"id": 2, "name": "New ELC FC"}, "awayTeam": {"id": 1, "name": "Core FC"},
        "score": {"fullTime": {"home": None, "away": None}},
    }]}
    standings = {"standings": [{"type": "TOTAL", "table": [{
        "position": 1, "team": {"id": 2}, "playedGames": 0, "won": 0, "draw": 0,
        "lost": 0, "goalsFor": 0, "goalsAgainst": 0, "goalDifference": 0, "points": 0,
    }]}]}
    return teams, matches, standings


ELC_COMP_ID = 2016


class ElcOnlyMergeTests(unittest.TestCase):
    def test_only_elc_rows_change_and_snapshots_are_immutable(self):
        original = base_database()
        before = copy.deepcopy(original)
        teams, matches, standings = payloads()
        updated = merge_elc_payloads(original, teams, matches, standings,
                                      now="2026-11-12T08:00:00+00:00")
        for key in ("teamSeasons", "standings", "matches"):
            old_non_elc = [row for row in before[key] if row.get("leagueId") != "ELC"]
            new_non_elc = [row for row in updated[key] if row.get("leagueId") != "ELC"]
            self.assertEqual(new_non_elc, old_non_elc)
        self.assertEqual(updated["probabilitySnapshots"], before["probabilitySnapshots"])
        self.assertEqual(updated["source"]["leagueSync"]["PL"], before["source"]["leagueSync"]["PL"])
        self.assertEqual(updated["source"]["leagueSync"]["ELC"]["status"], "fresh")
        self.assertEqual(updated["source"]["leagueSync"]["ELC"]["lastSuccessfulSync"],
                         "2026-11-12T08:00:00+00:00")
        self.assertEqual({row["providerMatchId"] for row in updated["matches"] if row["leagueId"] == "ELC"}, {200})
        self.assertEqual({row["teamId"] for row in updated["teamSeasons"] if row["leagueId"] == "ELC"},
                         {"football-data:2"})
        self.assertIn("football-data:9", {row["id"] for row in updated["teams"]})

    def test_sync_repairs_missing_eight_league_catalogue_without_creating_pending_data(self):
        original = base_database()
        original["leagues"] = [row for row in original["leagues"]
                               if row["id"] in {"PL", "PD", "BL1", "SA", "FL1"}]
        teams, matches, standings = payloads()
        updated = merge_elc_payloads(original, teams, matches, standings,
                                      now="2026-11-12T08:00:00+00:00")
        catalogue = {row["id"]: row for row in updated["leagues"]}
        self.assertEqual(set(catalogue), {"PL", "PD", "BL1", "SA", "FL1", "ELC", "J1", "J2"})
        for league_id in {"PL", "PD", "BL1", "SA", "FL1", "ELC"}:
            self.assertEqual(catalogue[league_id]["dataStatus"], "available")
            self.assertTrue(catalogue[league_id]["providerCompetitionCode"])
        for league_id in {"J1", "J2"}:
            self.assertIsNone(catalogue[league_id]["providerCompetitionCode"])
            self.assertEqual(catalogue[league_id]["dataStatus"],
                             "not_available_on_current_free_tier")
        for key in ("teamSeasons", "standings", "matches"):
            self.assertFalse(any(row.get("leagueId") in {"J1", "J2"} for row in updated[key]))

    def test_missing_total_standings_rejected(self):
        teams, matches, standings = payloads()
        standings["standings"] = []
        with self.assertRaises(ValueError):
            merge_elc_payloads(base_database(), teams, matches, standings)

    def test_missing_team_identity_rejected(self):
        teams, matches, standings = payloads()
        teams["teams"][0]["id"] = None
        with self.assertRaises(ValueError):
            merge_elc_payloads(base_database(), teams, matches, standings)


if __name__ == "__main__":
    unittest.main()
