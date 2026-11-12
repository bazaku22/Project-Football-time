import unittest
from scripts.build_football_research import build_research

class FootballResearchTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "generatedAt": "2026-11-12T23:00:00Z",
            "source": {"provider": "football-data.org", "leagueSync": {"PL": {"status": "fresh"}}},
            "teams": [{"id": "t1", "name": "Home FC"}, {"id": "t2", "name": "Away FC"}],
            "teamSeasons": [{"teamId": "t1", "leagueId": "PL", "season": "2026-2027"},
                            {"teamId": "t2", "leagueId": "PL", "season": "2026-2027"}],
            "standings": [{"teamId": "t1", "leagueId": "PL", "season": "2026-2027", "position": 1,
                           "played": 2, "points": 6, "goalsFor": 4, "goalsAgainst": 1}],
            "matches": [
                {"providerMatchId": 1, "leagueId": "PL", "season": "2026-2027", "utcDate": "2026-08-01T15:00:00Z", "status": "FINISHED", "homeTeamId": "t1", "awayTeamId": "t2", "homeTeamName": "Home FC", "awayTeamName": "Away FC", "homeScore": 2, "awayScore": 0},
                {"providerMatchId": 2, "leagueId": "PL", "season": "2026-2027", "utcDate": "2026-08-08T15:00:00Z", "status": "FINISHED", "homeTeamId": "t2", "awayTeamId": "t1", "homeTeamName": "Away FC", "awayTeamName": "Home FC", "homeScore": 1, "awayScore": 1},
                {"providerMatchId": 3, "leagueId": "PL", "season": "2026-2027", "utcDate": "2026-11-20T15:00:00Z", "status": "SCHEDULED", "homeTeamId": "t1", "awayTeamId": "t2", "homeTeamName": "Home FC", "awayTeamName": "Away FC", "homeScore": None, "awayScore": None},
                {"providerMatchId": 4, "leagueId": "PL", "season": "2025-2026", "utcDate": "2026-05-01T15:00:00Z", "status": "FINISHED", "homeTeamId": "t1", "awayTeamId": "t2", "homeTeamName": "Home FC", "awayTeamName": "Away FC", "homeScore": 9, "awayScore": 0},
                {"providerMatchId": 5, "leagueId": "PL", "season": "2026-2027", "utcDate": "2026-11-21T15:00:00Z", "status": "FINISHED", "homeTeamId": "t1", "awayTeamId": "t2", "homeTeamName": "Home FC", "awayTeamName": "Away FC", "homeScore": None, "awayScore": 0},
            ]}

    def test_current_season_form_home_away_and_baseline(self):
        report = build_research(self.db, "2026-11-13T00:00:00Z")
        league = report["leagues"][0]
        self.assertEqual(league["completedMatches"], 2)
        home = next(x for x in league["teams"] if x["teamId"] == "t1")
        self.assertEqual(home["last10"]["played"], 2)
        self.assertEqual(home["last10"]["form"], "WD")
        self.assertEqual(home["home"]["played"], 1)
        self.assertEqual(home["away"]["played"], 1)
        self.assertEqual(league["goalBaseline"]["goalsPerMatch"], 2.0)

    def test_h2h_has_sample_size_and_recent_results(self):
        fixture = build_research(self.db, "2026-11-13T00:00:00Z")["leagues"][0]["upcomingHeadToHead"][0]
        self.assertEqual(fixture["matchId"], 3)
        self.assertEqual(fixture["sampleSize"], 2)
        self.assertEqual(fixture["matches"][0]["date"], "2026-08-08T15:00:00Z")

    def test_previous_season_and_incomplete_scores_are_excluded(self):
        home = next(x for x in build_research(self.db)["leagues"][0]["teams"] if x["teamId"] == "t1")
        self.assertEqual(home["last10"]["goalsFor"], 3)

    def test_invalid_database_shape_is_rejected(self):
        with self.assertRaises(ValueError):
            build_research({"matches": []})

    def test_empty_sample_is_explicit(self):
        db = dict(self.db); db["matches"] = [self.db["matches"][2]]
        league = build_research(db)["leagues"][0]
        self.assertEqual(league["completedMatches"], 0)
        self.assertIsNone(league["goalBaseline"]["goalsPerMatch"])

if __name__ == "__main__":
    unittest.main()
