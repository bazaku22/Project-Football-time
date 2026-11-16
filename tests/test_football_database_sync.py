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
        shutil.copy(ROOT/"scripts"/"validate_football_database.py",self.root/"scripts")
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
    def run_build(self, check=True):
        env=dict(os.environ,RUNNER_TEMP=str(self.root/"runner"))
        return subprocess.run(["python3","scripts/build_football_database.py"],cwd=self.root,env=env,check=check,capture_output=True,text=True)
    def build(self):
        self.run_build()
        return json.loads((self.root/"data"/"football-database.json").read_text())
    def set_pl_result(self, home, away, status="FINISHED"):
        path=self.runner/"PL-matches.json"
        data=json.loads(path.read_text())
        match=data["matches"][0]
        match["status"]=status
        match["score"]["fullTime"]={"home":home,"away":away}
        path.write_text(json.dumps(data))
    def test_first_finished_result_gets_revision_one_and_audit_entry(self):
        self.set_pl_result(2, 1)
        db=self.build()
        match=next(x for x in db["matches"] if x["leagueId"]=="PL")
        self.assertEqual(match["resultRevision"], 1)
        self.assertEqual(match["resultUpdatedAt"], db["generatedAt"])
        self.assertEqual(match["resultSource"]["provider"], "football-data.org")
        history=[x for x in db["resultRevisionHistory"] if x["matchId"]=="FT-M-FOOTBALLDATA-10000"]
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["resultRevision"], 1)
        self.assertEqual((history[0]["homeScore"], history[0]["awayScore"]), (2, 1))
        self.assertEqual(history[0]["changeType"], "baseline")

    def test_unchanged_finished_result_keeps_revision_and_does_not_duplicate_history(self):
        self.set_pl_result(2, 1)
        first=self.build()
        first_match=next(x for x in first["matches"] if x["leagueId"]=="PL")
        updated_at=first_match["resultUpdatedAt"]
        second=self.build()
        second_match=next(x for x in second["matches"] if x["leagueId"]=="PL")
        history=[x for x in second["resultRevisionHistory"] if x["matchId"]=="FT-M-FOOTBALLDATA-10000"]
        self.assertEqual(second_match["resultRevision"], 1)
        self.assertEqual(second_match["resultUpdatedAt"], updated_at)
        self.assertEqual(len(history), 1)

    def test_provider_score_correction_increments_revision_and_preserves_previous_audit(self):
        self.set_pl_result(2, 1)
        first=self.build()
        first_updated=next(x for x in first["matches"] if x["leagueId"]=="PL")["resultUpdatedAt"]
        self.set_pl_result(3, 1)
        second=self.build()
        match=next(x for x in second["matches"] if x["leagueId"]=="PL")
        history=[x for x in second["resultRevisionHistory"] if x["matchId"]=="FT-M-FOOTBALLDATA-10000"]
        self.assertEqual(match["resultRevision"], 2)
        self.assertEqual((match["homeScore"], match["awayScore"]), (3, 1))
        self.assertNotEqual(match["resultUpdatedAt"], first_updated)
        self.assertEqual([x["resultRevision"] for x in history], [1, 2])
        self.assertEqual((history[0]["homeScore"], history[0]["awayScore"]), (2, 1))
        self.assertEqual((history[1]["homeScore"], history[1]["awayScore"]), (3, 1))
        self.assertEqual(history[1]["changeType"], "correction")

    def test_missing_score_for_previous_finished_match_refuses_publication(self):
        self.set_pl_result(2, 1)
        self.build()
        database_path=self.root/"data"/"football-database.json"
        before=database_path.read_text()
        self.set_pl_result(None, None)
        result=self.run_build(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Previously verified result disappeared", result.stderr)
        self.assertEqual(database_path.read_text(), before)

    def test_finished_result_omitted_from_provider_snapshot_is_preserved(self):
        self.set_pl_result(2, 1)
        self.build()
        path=self.runner/"PL-matches.json"
        data=json.loads(path.read_text())
        data["matches"]=[]
        path.write_text(json.dumps(data))
        second=self.build()
        match=next(x for x in second["matches"] if x.get("providerMatchId")==10000)
        self.assertEqual(match["status"], "FINISHED")
        self.assertEqual(match["resultRevision"], 1)
        self.assertEqual((match["homeScore"], match["awayScore"]), (2, 1))
        history=[x for x in second["resultRevisionHistory"] if x["matchId"]=="FT-M-FOOTBALLDATA-10000"]
        self.assertEqual(len(history), 1)

    def test_points_deduction_is_accepted_by_database_validator(self):
        db=self.build()
        row=next(x for x in db["standings"] if x["leagueId"]=="PL")
        row.update({"played":1,"won":1,"draw":0,"lost":0,"points":0})
        db["probabilitySnapshots"]=[]
        (self.root/"data"/"football-database.json").write_text(json.dumps(db))
        result=subprocess.run(
            ["python3","scripts/validate_football_database.py"],
            cwd=self.root,capture_output=True,text=True
        )
        self.assertEqual(result.returncode,0,result.stdout+"\n"+result.stderr)
        self.assertIn("All reference and consistency checks passed.",result.stdout)
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
