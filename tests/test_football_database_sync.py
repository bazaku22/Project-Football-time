import json, os, shutil, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CORE=("PL","PD","BL1","SA","FL1")
def payloads(code,base):
    teams=[{"id":base,"name":code+" Home"},{"id":base+1,"name":code+" Away"}]
    td={"competition":{"id":base,"code":code},"season":{"startDate":"2026-07-01","endDate":"2027-06-30"},"teams":teams}
    md={"matches":[{"id":base*10,"utcDate":"2027-01-01T15:00:00Z","status":"SCHEDULED","homeTeam":{"id":base,"name":code+" Home"},"awayTeam":{"id":base+1,"name":code+" Away"},"score":{"fullTime":{"home":None,"away":None}}}]}
    rows=[{"position":i,"team":{"id":t["id"]},"playedGames":0,"won":0,"draw":0,"lost":0,"goalsFor":0,"goalsAgainst":0,"goalDifference":0,"points":0} for i,t in enumerate(teams,1)]
    return td,md,{"standings":[{"type":"TOTAL","table":rows}]}
class FootballDatabaseSyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.root=Path(self.tmp.name)
        (self.root/"scripts").mkdir(); (self.root/"data").mkdir()
        shutil.copy(ROOT/"scripts"/"build_football_database.py",self.root/"scripts")
        shutil.copy(ROOT/"scripts"/"phase6_league_catalog.py",self.root/"scripts")
        self.runner=self.root/"runner"/"football-data"; self.runner.mkdir(parents=True)
        ids=["football-data:900","football-data:901"]
        previous={"generatedAt":"2026-11-10T18:32:58+00:00","source":{"lastSuccessfulSync":"2026-11-10T18:32:58+00:00","leagueSync":{"ELC":{"status":"fresh","lastSuccessfulSync":"2026-11-10T18:32:58+00:00"}}},
          "teams":[{"id":ids[0],"name":"Old Home"},{"id":ids[1],"name":"Old Away"}],
          "teamSeasons":[{"teamId":i,"leagueId":"ELC","season":"2026-2027","providerCompetitionId":900,"seasonStart":"2026-07-01","seasonEnd":"2027-06-30"} for i in ids],
          "standings":[{"leagueId":"ELC","season":"2026-2027","teamId":i,"position":n,"played":0,"won":0,"draw":0,"lost":0,"goalsFor":0,"goalsAgainst":0,"goalDifference":0,"points":0,"updatedAt":"2026-11-10T18:32:58+00:00"} for n,i in enumerate(ids,1)],
          "matches":[{"providerMatchId":9000,"leagueId":"ELC","season":"2026-2027","utcDate":"2027-01-02T15:00:00Z","status":"SCHEDULED","homeTeamId":ids[0],"awayTeamId":ids[1],"homeTeamName":"Old Home","awayTeamName":"Old Away","homeScore":None,"awayScore":None}],
          "probabilitySnapshots":[{"matchId":"preserved-history"}]}
        (self.root/"data"/"football-database.json").write_text(json.dumps(previous))
        for n,code in enumerate(CORE,100):
            for endpoint,data in zip(("teams","matches","standings"),payloads(code,n*10)):
                (self.runner/f"{code}-{endpoint}.json").write_text(json.dumps(data))
    def tearDown(self): self.tmp.cleanup()
    def build(self):
        env=dict(os.environ,RUNNER_TEMP=str(self.root/"runner"))
        subprocess.run(["python3","scripts/build_football_database.py"],cwd=self.root,env=env,check=True,capture_output=True,text=True)
        return json.loads((self.root/"data"/"football-database.json").read_text())
    def test_optional_elc_failure_preserves_previous_rows_and_history(self):
        db=self.build()
        self.assertEqual(db["source"]["leagueSync"]["ELC"]["status"],"stale")
        self.assertEqual(db["source"]["leagueSync"]["ELC"]["lastSuccessfulSync"],"2026-11-10T18:32:58+00:00")
        self.assertEqual(len([m for m in db["matches"] if m["leagueId"]=="ELC"]),1)
        self.assertEqual(db["probabilitySnapshots"],[{"matchId":"preserved-history"}])
        self.assertTrue(all(db["source"]["leagueSync"][c]["status"]=="fresh" for c in CORE))
    def test_partial_elc_response_is_not_mixed_with_old_rows(self):
        (self.runner/"ELC-teams.json").write_text(json.dumps(payloads("ELC",990)[0]))
        db=self.build(); ids={x["teamId"] for x in db["teamSeasons"] if x["leagueId"]=="ELC"}
        self.assertEqual(ids,{"football-data:900","football-data:901"})
        self.assertEqual(db["source"]["leagueSync"]["ELC"]["status"],"stale")
    def test_complete_elc_refresh_replaces_previous_rows(self):
        for endpoint,data in zip(("teams","matches","standings"),payloads("ELC",990)):
            (self.runner/f"ELC-{endpoint}.json").write_text(json.dumps(data))
        db=self.build(); ids={x["teamId"] for x in db["teamSeasons"] if x["leagueId"]=="ELC"}
        self.assertEqual(ids,{"football-data:990","football-data:991"})
        self.assertEqual(db["source"]["leagueSync"]["ELC"]["status"],"fresh")
if __name__=="__main__": unittest.main()
