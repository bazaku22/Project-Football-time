import copy
import unittest
from scripts.player_source_pipeline import analyze

W = {"production_import": False, "network_access": False, "provider_api_calls": 0, "records_count": 2,
     "candidates": [
      {"wikidata_item_id":"Q100","label":"Player One","canonical_club_id":"club-a","league_id":"PL",
       "p54_statements":[{"property":"P54","rank":"normal","team_item_id":"Q900","qualifiers":{"start_time":"2026-07-01","end_time":None}}]},
      {"wikidata_item_id":"Q200","label":"Player Two","canonical_club_id":"club-b","league_id":"PL",
       "p54_statements":[{"property":"P54","rank":"normal","team_item_id":"Q901","qualifiers":{"start_time":"2025-07-01","end_time":"2026-06-30"}}]}]}
R = {"production_import":False,"network_access":False,"provider_api_calls":0,"release_stamp":"2026-10-25.1",
     "entities":[{"reep_id":"R1","entity_type":"player"}],
     "bridges":[{"reep_id":"R1","provider":"wikidata","external_id":"Q100"},{"reep_id":"R1","provider":"opta","external_id":"P1"}],
     "edges":[{"relation":"team_season_participation","source_type":"team"}]}

class PipelineTests(unittest.TestCase):
    def test_identity_link_does_not_imply_roster(self):
        out=analyze(R,W); c=out["counts"]
        self.assertEqual(c["wikidata_qids_matched_to_reep"],1)
        self.assertEqual(c["wikidata_candidates_with_dated_active_p54"],1)
        self.assertEqual(c["reep_player_squad_or_lineup_edges"],0)
        self.assertFalse(out["production_import"]); self.assertEqual(out["supabase_writes"],0)
    def test_duplicate_qid_to_reep_ids(self):
        r=copy.deepcopy(R); r["bridges"].append({"reep_id":"R2","provider":"wikidata","external_id":"Q100"})
        self.assertEqual(analyze(r,W)["counts"]["duplicate_qid_to_reep_links"],1)
    def test_overlapping_active_memberships_flagged(self):
        w=copy.deepcopy(W); w["candidates"][0]["p54_statements"].append(
          {"property":"P54","rank":"preferred","team_item_id":"Q902","qualifiers":{"start_time":"2026-08-01","end_time":None}})
        self.assertEqual(analyze(None,w)["counts"]["overlapping_active_multi_club_candidates"],1)
    def test_deprecated_or_expired_not_current(self):
        w=copy.deepcopy(W); w["candidates"][0]["p54_statements"][0]["rank"]="deprecated"
        self.assertEqual(analyze(None,w)["counts"]["wikidata_candidates_with_dated_active_p54"],0)
    def test_network_and_production_inputs_rejected(self):
        w=copy.deepcopy(W); w["network_access"]=True
        with self.assertRaises(ValueError): analyze(None,w)
        w["network_access"]=False; w["production_import"]=True
        with self.assertRaises(ValueError): analyze(None,w)
    def test_records_count_mismatch_rejected(self):
        w=copy.deepcopy(W); w["records_count"]=0
        with self.assertRaises(ValueError): analyze(None,w)

if __name__ == "__main__": unittest.main()
