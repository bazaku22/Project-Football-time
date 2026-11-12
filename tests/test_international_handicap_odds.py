import importlib.util, unittest, json
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import urlparse, parse_qs

spec = importlib.util.spec_from_file_location("intl_odds", "scripts/fetch_international_handicap_odds.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ALIASES = {"canonical_teams":[{"team_id":"TUR","canonical_name":"Türkiye"},{"team_id":"BEL","canonical_name":"Belgium"},{"team_id":"ITA","canonical_name":"Italy"},{"team_id":"FRA","canonical_name":"France"}],
           "aliases":[{"source_name":"Turkey","canonical_name":"Türkiye","canonical_team_id":"TUR"}]}
FIXTURES = [{"id":"INT-R1-001","match_type":"nations_league","home_team":"Türkiye","away_team":"Belgium","kickoff_utc":"2026-11-12T17:00:00Z"},
            {"id":"INT-R1-002","match_type":"nations_league","home_team":"Italy","away_team":"France","kickoff_utc":"2026-11-12T19:45:00Z"},
            {"id":"INT-R1-011","match_type":"friendly","home_team":"Türkiye","away_team":"Belgium","kickoff_utc":"2026-11-12T17:00:00Z"}]
def make_event(home="Turkey", away="Belgium", kickoff="2026-11-12T17:00:00Z"):
    return {"id":"evt-1","sport_key":module.SPORT_KEY,"home_team":home,"away_team":away,"commence_time":kickoff,
            "bookmakers":[{"title":"Sample Source","markets":[{"key":"spreads","last_update":"2026-11-12T08:00:00Z",
            "outcomes":[{"name":home,"point":-0.5},{"name":away,"point":0.5}]}]}]}

class InternationalOddsTests(unittest.TestCase):
    def test_matches_explicit_team_alias_and_excludes_friendly(self):
        row=module.parse_event(make_event(),FIXTURES,ALIASES)
        self.assertEqual(row["fixtureId"],"INT-R1-001")
        self.assertEqual(row["referenceHomeLine"],-0.5)
    def test_unknown_names_wrong_order_and_bad_kickoff_do_not_match(self):
        self.assertIsNone(module.parse_event(make_event("Türkiye","France"),FIXTURES,ALIASES))
        self.assertIsNone(module.parse_event(make_event("Belgium","Turkey"),FIXTURES,ALIASES))
        self.assertIsNone(module.parse_event(make_event(kickoff="not-a-time"),FIXTURES,ALIASES))
    def test_ambiguous_fixture_is_rejected(self):
        self.assertIsNone(module.parse_event(make_event(),FIXTURES+[dict(FIXTURES[0],id="INT-R1-999")],ALIASES))
    def test_only_balanced_spread_market_is_kept(self):
        bad=make_event(); bad["bookmakers"][0]["markets"][0]["outcomes"][1]["point"]=0.25
        self.assertIsNone(module.parse_event(bad,FIXTURES,ALIASES))
    def test_build_dataset_is_isolated_and_tracks_single_request(self):
        now=datetime(2026,11,12,8,0,tzinfo=timezone.utc)
        data=module.build_dataset([make_event()],{"dataset_id":"international-r1-2026","fixtures":FIXTURES},ALIASES,now,{"remaining":10,"used":2,"last":1})
        self.assertEqual(data["datasetStatus"],"experimental_isolated_provider_handicap_reference")
        self.assertEqual(data["apiRequestsThisRun"],1); self.assertEqual(data["matchedFixtureCount"],1)
        self.assertEqual(data["events"][0]["fixtureId"],"INT-R1-001")
        self.assertNotIn('"price"',json.dumps(data))
    def test_request_uses_exactly_one_nations_league_endpoint(self):
        payload=[{"id":"evt"}]
        class Response:
            headers={"x-requests-remaining":"9","x-requests-used":"1","x-requests-last":"1"}
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self): return json.dumps(payload).encode()
        start=datetime(2026,11,12,tzinfo=timezone.utc)
        with patch.object(module,"urlopen",return_value=Response()) as mocked:
            result,quota=module.request_nations_league("secret",start,start)
        self.assertEqual(result,payload); self.assertEqual(quota["last"],1)
        self.assertEqual(mocked.call_count,1)
        request=mocked.call_args.args[0]
        self.assertIn("/soccer_uefa_nations_league/odds/",request.full_url)
        self.assertEqual(parse_qs(urlparse(request.full_url).query)["markets"],["spreads"])

if __name__=="__main__": unittest.main()
