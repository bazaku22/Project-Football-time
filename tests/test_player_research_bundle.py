import json
import unittest
from pathlib import Path
from scripts.validate_player_research_bundle import validate_bundle

ROOT=Path(__file__).resolve().parents[1]
LEAGUES=("PL","PD","BL1","SA","FL1")

def membership_fixture():
    return {"schemaVersion":1,"season":"2026/27","status":"research_only","production_import":False,"provider_api_calls":0,"records_count":1,
      "sources":[{"id":"source-a","publisher":"Publisher","source_scope":"2026/27 roster research","licence_id":"CC0-1.0","source_url":"https://example.test/source","licence_url":"https://example.test/licence","licence_reviewed_at":"2026-11-13","rights_review_status":"approved","commercial_use_allowed":True,"database_rights_reviewed":True,"redistribution_allowed":True,"attribution_required":False}],
      "memberships":[{"id":"m-1","player_name":"Test Player","source_player_id":"source-player-1","league_id":"PL","club_id":"club-1","club_name":"Test FC","season":"2026/27","squad_level":"first_team","membership_type":"registered_squad","membership_status":"current_verified","source_id":"source-a","evidence_url":"https://example.test/player","observed_at":"2026-11-13","rights_status":"approved"}]}

def statistics_fixture():
    return {"schemaVersion":1,"season":"2026/27","status":"research_only","production_import":False,"provider_api_calls":0,"records_count":1,
      "sources":[{"id":"source-a","publisher":"Publisher","source_scope":"2026/27 player statistics","licence_id":"CC0-1.0","source_url":"https://example.test/source","licence_url":"https://example.test/licence","licence_reviewed_at":"2026-11-13","rights_review_status":"approved","commercial_use_allowed":True,"database_rights_reviewed":True,"redistribution_allowed":True,"attribution_required":False,"metric_definitions":{"appearances":"League appearances"}}],
      "statistics":[{"id":"s-1","season":"2026/27","league_id":"PL","canonical_player_key":"player:1","provider_player_id":"p-1","club_id":"club-1","club_name":"Test FC","competition_id":"PL","identity_match_status":"exact","rights_status":"approved","source_id":"source-a","observed_at":"2026-11-13","metrics":{"appearances":2}}]}

class PlayerResearchBundleTests(unittest.TestCase):
    def test_checked_in_empty_templates_are_valid_drafts(self):
        m=json.loads((ROOT/"data/player-intake-manifest-2026-27.json").read_text())
        s=json.loads((ROOT/"data/player-statistics-intake-2026-27.json").read_text())
        self.assertEqual(validate_bundle(m,s),[])
    def test_accepts_each_of_the_five_leagues(self):
        for league in LEAGUES:
            with self.subTest(league=league):
                m=membership_fixture();s=statistics_fixture()
                m["memberships"][0]["league_id"]=league
                s["statistics"][0]["league_id"]=league
                s["statistics"][0]["competition_id"]=league
                self.assertEqual(validate_bundle(m,s),[])
    def test_rejects_unsupported_league(self):
        m=membership_fixture();m["memberships"][0]["league_id"]="XX"
        self.assertTrue(any("unsupported league" in e for e in validate_bundle(m,statistics_fixture())))
    def test_rejects_manifest_rights_disagreement(self):
        s=statistics_fixture();s["sources"][0]["redistribution_allowed"]=False
        self.assertTrue(any("disagree on redistribution_allowed" in e for e in validate_bundle(membership_fixture(),s)))
    def test_rejects_pending_rights(self):
        m=membership_fixture();m["sources"][0]["rights_review_status"]="pending"
        self.assertTrue(any("rights review is not approved" in e for e in validate_bundle(m,statistics_fixture())))

if __name__=="__main__":unittest.main()
