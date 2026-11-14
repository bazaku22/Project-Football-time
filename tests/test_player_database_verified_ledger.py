import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerDatabaseVerifiedLedgerTests(unittest.TestCase):
    def test_player_database_reads_only_the_existing_local_event_ledger(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('const LEDGER_KEY="pft_player_match_event_ledger_2026_27_v1"', source)
        self.assertIn("window.FootballTimePlayerMatchEventEntry", source)
        self.assertIn("function loadLedger()", source)
        self.assertIn('const TEAM_ALIAS_KEY="pft_player_team_alias_decisions_2026_27_v1"', source)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn("XMLHttpRequest", source)
        self.assertEqual(source.count("fetch("), 3)
        self.assertIn("fetch(REGISTRY_URL", source)
        self.assertIn("fetch(ROSTER_URL", source)
        self.assertIn("fetch(TEAM_ALIAS_URL", source)
        self.assertIn("reviewed bundled crosswalk", source)

    def test_verified_statistics_require_complete_review_and_rights_gates(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        for marker in [
            'record.season!=="2026/27"',
            'record.review_status!=="verified"',
            'record.lineup_coverage!=="complete"',
            'record.event_coverage!=="complete"',
            'sources.length>=2',
            's.reuse_rights==="confirmed"',
            's.permission_basis.trim()',
            'FT_ID.test(player.ft_player_id)'
        ]:
            self.assertIn(marker, source)

    def test_roster_profile_uses_unique_exact_normalized_name_match_as_provisional_only(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("function teamLedger(teamId)", source)
        self.assertIn("function provisionalNameStats(rosterPlayer,teamId)", source)
        self.assertIn("function normalizePlayerName(value)", source)
        self.assertIn('verified.length>1', source)
        self.assertIn('research.length>1', source)
        self.assertIn('"provisional_research_match"', source)
        self.assertIn('scope:"local_needs_review_records_only"', source)
        self.assertIn('"provisional_name_match"', source)
        self.assertIn("scope:\"recorded_verified_matches_only\"", source)
        self.assertIn("local_needs_review_records_only", source)
        self.assertIn("researchPreview=!trusted&&record.review_status===\"needs_review\"&&record.lineup_coverage===\"complete\"", source)
        self.assertIn("provisional research", source)
        self.assertIn("ไม่ใช่สถิติยืนยันหรือข้อมูลสำหรับ Production", source)
        self.assertIn("จับคู่ด้วยชื่อเต็มตรงกัน · provisional", source)
        self.assertIn("teamMappingPending:true", source)
        self.assertIn("rosterData.memberships.find(p=>p.id===selectedPlayer.id", source)
        self.assertIn("ไม่ใช่ยอดรวมทุกการแข่งขันหรือทั้งฤดูกาล", source)

    def test_roster_profile_never_fabricates_zero_for_missing_or_ambiguous_data(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("<b>—</b>", source)
        self.assertIn("source.current_roster_boundary", source)
        self.assertIn("appearances:0,goals:0,assists:0", source)
        self.assertIn('provisional.status==="ambiguous_name_match"', source)
        self.assertIn('provisional.status==="team_mapping_pending"', source)

    def test_existing_five_league_registry_navigation_is_preserved(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn('tab.dataset.dbTab="playerDatabase"', source)
        self.assertIn('count!==96', source)
        self.assertIn('["PL","Premier League"]', source)
        self.assertIn('["PD","La Liga"]', source)
        self.assertIn('["BL1","Bundesliga"]', source)
        self.assertIn('["SA","Serie A"]', source)
        self.assertIn('["FL1","Ligue 1"]', source)

    def test_reviewed_crosswalk_contains_only_exact_registry_and_canonical_id_decisions(self):
        import json
        crosswalk = json.loads((ROOT / "data/player-team-alias-decisions-2026-27.json").read_text(encoding="utf-8"))
        self.assertEqual(crosswalk["status"], "reviewed_approved")
        self.assertFalse(crosswalk["production_import"])
        self.assertEqual(len(crosswalk["decisions"]), 7)
        for item in crosswalk["decisions"]:
            self.assertEqual(item["status"], "approved")
            self.assertFalse(item["review_required"])
            self.assertRegex(item["canonical_team_id"], r"^football-data:[0-9]+$")
            self.assertIn("candidate_artifact_exact_canonical_id", item["evidence"])
            self.assertIn("football_database_exact_canonical_id_and_name", item["evidence"])

    def test_bundled_crosswalk_is_still_gated_by_exact_provider_name(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        self.assertIn("providerName===item.provider_team_name", source)
        self.assertIn('item.review_required===false', source)

    def test_manual_matchweek_10_intake_is_research_only_and_never_claims_verified_identity(self):
        import json
        path = ROOT / "data/research-intake/premier-league-matchweek-10-2026-27.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(len(data["records"]), 10)
        self.assertEqual(len({str(row["match_id"]) for row in data["records"]}), 10)
        self.assertEqual(data["dataset_status"], "research_records_present")
        for record in data["records"]:
            self.assertEqual(record["review_status"], "needs_review")
            self.assertEqual(record["lineup_coverage"], "complete")
            self.assertEqual(record["event_coverage"], "partial")
            self.assertEqual(len(record["sources"]), 2)
            self.assertTrue(all(source["reuse_rights"] == "pending" for source in record["sources"]))
            self.assertTrue(all(player["identity_status"] == "unresolved" and player["ft_player_id"] is None for item in record["lineups"] for player in [item["player"]]))
            self.assertEqual(sum(item["role"] == "starting_xi" for item in record["lineups"] if item["team_id"] == record["home_team"]["team_id"]), 11)
            self.assertEqual(sum(item["role"] == "starting_xi" for item in record["lineups"] if item["team_id"] == record["away_team"]["team_id"]), 11)

    def test_needs_review_preview_does_not_weaken_verified_publication_gate(self):
        source = (ROOT / "js/player-database-mvp.js").read_text(encoding="utf-8")
        verified_gate = source[source.index("function recordVerified"):source.index("function validPlayer")]
        self.assertIn('record.review_status!=="verified"', verified_gate)
        self.assertIn('s.reuse_rights==="confirmed"', verified_gate)
        self.assertIn('s.permission_basis.trim()', verified_gate)
        self.assertIn('researchPreview=!trusted&&record.review_status==="needs_review"', source)
        self.assertIn('source_status:"needs_review_name_only"', source)

    def test_matchweek_10_research_intake_preserves_verified_report_event_times(self):
        import json
        data = json.loads((ROOT / "data/research-intake/premier-league-matchweek-10-2026-27.json").read_text(encoding="utf-8"))
        self.assertEqual(sum(len(record["lineups"]) for record in data["records"]), 313)
        self.assertEqual(sum(len(record["events"]) for record in data["records"]), 123)
        by_id = {str(record["match_id"]): record for record in data["records"]}
        fulham = by_id["560633"]
        self.assertEqual(fulham["sources"][1]["url"], "https://www.fulhamfc.com/news/2026/november/07/fulham-1-1-newcastle-united/")
        self.assertEqual(next(event["minute"] for event in fulham["events"] if event["type"] == "substitution" and event["player_on"]["observed_name"] == "César Palacios"), "71")
        brighton = by_id["560638"]
        self.assertEqual(next(event["minute"] for event in brighton["events"] if event["type"] == "goal" and event["scorer"]["observed_name"] == "Pascal Groß"), "40")
        palace = by_id["560635"]
        self.assertEqual(next(event["minute"] for event in palace["events"] if event["type"] == "substitution" and event["player_on"]["observed_name"] == "Joe Gomez"), "90+1")

    def test_exact_name_research_preview_has_expected_lower_bound_for_mapped_pilot_clubs(self):
        import json, re, unicodedata
        roster = json.loads((ROOT / "data/footballsquads-roster-intake-2026-27.json").read_text(encoding="utf-8"))
        data = json.loads((ROOT / "data/research-intake/premier-league-matchweek-10-2026-27.json").read_text(encoding="utf-8"))
        def norm(value):
            value = unicodedata.normalize("NFKD", str(value or ""))
            value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
            for old, new in (("ø","o"),("ł","l"),("đ","d"),("æ","ae"),("œ","oe"),("ß","ss")):
                value = value.replace(old,new)
            return " ".join(re.sub(r"[^a-z0-9]+"," ",value).split())
        def aggregate(club, canonical_id):
            matches = [r for r in data["records"] if r["home_team"]["team_id"] == canonical_id or r["away_team"]["team_id"] == canonical_id]
            stats = {}
            def row(player):
                name = player["observed_name"]
                key = norm(name)
                stats.setdefault(key, {"name":name,"appearances":set(),"goals":0,"assists":0})
                return stats[key]
            for record in matches:
                for lineup in record["lineups"]:
                    if lineup["team_id"] == canonical_id and lineup["role"] == "starting_xi":
                        row(lineup["player"])["appearances"].add(str(record["match_id"]))
                by_name = {norm(x["player"]["observed_name"]):x["team_id"] for x in record["lineups"]}
                for event in record["events"]:
                    if event["type"] == "substitution":
                        for player in (event["player_on"], event["player_off"]):
                            if by_name.get(norm(player["observed_name"])) == canonical_id:
                                row(player)["appearances"].add(str(record["match_id"]))
                    elif event["type"] == "goal":
                        scorer = event.get("scorer")
                        if scorer and by_name.get(norm(scorer["observed_name"])) == canonical_id:
                            row(scorer)["goals"] += 1
                            row(scorer)["appearances"].add(str(record["match_id"]))
                        assist = event.get("assist_player")
                        if event["assist_status"] == "explicit" and assist and by_name.get(norm(assist["observed_name"])) == canonical_id:
                            row(assist)["assists"] += 1
                            row(assist)["appearances"].add(str(record["match_id"]))
            roster_names = {norm(x["name"]) for x in roster["memberships"] if x["club_name"] == club}
            return {key:value for key,value in stats.items() if key in roster_names}
        man_utd = aggregate("Manchester United","football-data:66")
        forest = aggregate("Nottingham Forest","football-data:351")
        self.assertEqual((len(man_utd),sum(len(x["appearances"]) for x in man_utd.values()),sum(x["goals"] for x in man_utd.values()),sum(x["assists"] for x in man_utd.values())),(16,16,4,3))
        self.assertEqual((len(forest),sum(len(x["appearances"]) for x in forest.values()),sum(x["goals"] for x in forest.values()),sum(x["assists"] for x in forest.values())),(15,15,3,1))

    def test_beta9_release_invalidates_service_worker_cache_for_ledger_restore(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        service_worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('content="6.26.5-beta.9"', index)
        self.assertIn("V6.26.5-beta.9", index)
        self.assertIn('const CACHE = "football-time-v100";', service_worker)

if __name__ == "__main__":
    unittest.main()
