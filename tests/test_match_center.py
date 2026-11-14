import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
SYNC_WORKFLOW = (ROOT / ".github" / "workflows" / "update-football-database.yml").read_text(encoding="utf-8")
DATABASE_BUILDER = (ROOT / "scripts" / "build_football_database.py").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
CSS = (ROOT / "css" / "match-center.css").read_text(encoding="utf-8")


class MatchCenterTests(unittest.TestCase):
    def test_match_center_uses_real_database_and_five_core_leagues(self):
        self.assertIn('id="matchCenterApp"', HTML)
        self.assertIn('getDatabase?.()', MODULE)
        self.assertIn('new Set(["PL","PD","BL1","SA","FL1"])', MODULE)
        self.assertIn('pft-football-database-ready', MODULE)

    def test_experiment_fixtures_are_separate_and_collapsed(self):
        self.assertIn('<details class="mc-experiment">', HTML)
        self.assertIn('id="testFixturesList"', HTML)
        self.assertIn('id="testFixtureDays"', HTML)
        self.assertIn('โปรแกรมทดลอง', HTML)

    def test_database_failure_has_a_visible_error_state(self):
        self.assertIn('pft-football-database-error', HTML)
        self.assertIn('pft-football-database-error', MODULE)
        self.assertIn('ไม่สามารถโหลดฐานข้อมูลการแข่งขันได้', MODULE)

    def test_international_fixtures_are_separate_from_club_database(self):
        self.assertIn("internationalFixtures", MODULE)
        self.assertIn("แยกจากฐานข้อมูลสโมสร", MODULE)
        self.assertNotIn("getFixtures?.()", MODULE)

    def test_filters_and_time_are_bangkok_local(self):
        for key in ("upcoming","live","finished","all"):
            self.assertIn('data-match-filter="' + key + '"', HTML)
        self.assertIn('timeZone:"Asia/Bangkok"', MODULE)

    def test_match_card_uses_team_crests_and_database_match_fields(self):
        for marker in ("homeTeamId","awayTeamId","homeTeamName","awayTeamName","homeScore","awayScore","utcDate","leagueId"):
            self.assertIn(marker, MODULE)
        self.assertIn("mc-crest-wrap", CSS)

    def test_upcoming_match_handoff_opens_its_existing_probability_analysis(self):
        self.assertIn('data-provider-match-id=', MODULE)
        self.assertIn('data-match-action=', MODULE)
        self.assertIn('canOpenAnalysis ? "analysis" : "overview"', MODULE)
        self.assertIn('data-db-tab="probability"', MODULE)
        self.assertIn('probLeagueSelect', MODULE)
        self.assertIn('probMatchSelect', MODULE)
        self.assertIn('providerMatchId', MODULE)
        self.assertIn('วิเคราะห์คู่นี้', MODULE)

    def test_match_center_handoff_uses_the_four_primary_navigation_routes(self):
        self.assertIn('const route = button.dataset.matchAction === "analysis" ? "analyze" : "leagues"', MODULE)
        self.assertIn("data-primary-route=\"' + route + '\"", MODULE)
        self.assertIn("else document.querySelector('[data-page=\"fixtures\"]')?.click()", MODULE)

    def test_non_upcoming_matches_keep_database_context_fallback(self):
        self.assertIn('canOpenAnalysis ? "analysis" : "overview"', MODULE)
        self.assertIn('data-db-tab="overview"', MODULE)
        self.assertIn('discoveryDateFrom', MODULE)

    def test_analysis_handoff_matches_the_existing_analysis_status_contract(self):
        self.assertIn('["SCHEDULED","TIMED"]', MODULE)
        self.assertIn('analysisStatus', MODULE)
        self.assertIn('providerMatchId !== ""', MODULE)

    def test_offline_asset_and_cache_are_versioned(self):
        self.assertIn("football-time-v97", WORKER)
        self.assertIn('"./js/handicap-reference.js"', WORKER)
        self.assertIn('"./css/match-center.css?v=7"', WORKER)
        self.assertIn('"./js/match-center.js"', WORKER)

    def test_app_version_is_consistent_and_visible(self):
        self.assertIn('<title>Project Football Time V6.26.5-beta.7</title>', HTML)
        self.assertIn('<meta name="application-version" content="6.26.5-beta.7">', HTML)


    def test_match_cards_show_compact_model_and_automatic_handicap_summary(self):
        self.assertIn('getMatchCardAnalysis', HTML)
        self.assertIn('renderAnalysisSummary(match,cardAnalysis)', MODULE)
        self.assertIn('mc-analysis-summary', MODULE)
        self.assertIn('pft-handicap-reference-ready', MODULE)
        self.assertNotIn('id="handicapLineSelect"', HTML)

    def test_network_and_cache_delivery_are_distinguished(self):
        self.assertIn('headers.set("X-PFT-Data-Source", "network")', WORKER)
        self.assertIn('headers.set("X-PFT-Data-Source", "cache")', WORKER)
        self.assertIn('response.headers.get("X-PFT-Data-Source")', HTML)
        self.assertIn('getDataDelivery:()=>footballDBDelivery', HTML)
        self.assertIn("ความสดรายลีก", MODULE)

    def test_dynamic_data_cache_ignores_cache_busting_query_strings(self):
        self.assertIn('new Request(url.origin + url.pathname, { method: "GET" })', WORKER)
        self.assertIn('caches.match(cacheKey)', WORKER)
        self.assertIn('cache.put(cacheKey, copy)', WORKER)
        handler_start = WORKER.index('if (url.pathname.endsWith("/data/football-database.json")')
        handler_end = WORKER.index('if (url.origin !== self.location.origin)', handler_start)
        dynamic_handler = WORKER[handler_start:handler_end]
        self.assertNotIn('caches.match(request)', dynamic_handler)


    def test_daily_calendar_filters_by_bangkok_date(self):
        self.assertIn('id="matchCenterDate"', HTML)
        self.assertIn('id="matchCenterDateStrip"', HTML)
        self.assertIn('data-calendar-shift="-7"', HTML)
        self.assertIn('data-calendar-shift="7"', HTML)
        self.assertIn('function matchDateKey(match)', MODULE)
        self.assertIn('matchDateKey(match) === selectedDate', MODULE)
        self.assertIn('timeZone:"Asia/Bangkok"', MODULE)
        self.assertIn('function shiftDateKey(dateKey, days)', MODULE)

    def test_category_and_multi_competition_filters_are_present(self):
        for category in ("all","club","international"):
            self.assertIn('data-match-category="' + category + '"', HTML)
        self.assertIn('id="matchCenterLeagueFilters"', HTML)
        self.assertIn('activeLeagues = new Set()', MODULE)
        self.assertIn('activeLeagues.has(value)', MODULE)
        self.assertIn('COMP:', MODULE)
        self.assertIn('leagueFilterValues(match)', MODULE)
        self.assertIn('renderLeagueFilters()', MODULE)


    def test_daily_view_includes_finished_results_by_default(self):
        self.assertIn('let activeFilter = "all";', MODULE)
        self.assertIn('data-match-filter="all" aria-pressed="true">ทั้งหมด</button>', HTML)
        self.assertIn('status === "FINISHED"', MODULE)
        self.assertIn('match.homeScore !== null', MODULE)
        self.assertIn('match.awayScore !== null', MODULE)

    def test_yesterday_shortcut_uses_bangkok_calendar_date(self):
        self.assertIn('class="mc-calendar-yesterday">เมื่อวาน</button>', HTML)
        self.assertIn('$(".mc-calendar-yesterday")?.addEventListener("click"', MODULE)
        self.assertIn('setSelectedDate(shiftDateKey(bangkokDate(),-1))', MODULE)
        self.assertIn('timeZone:"Asia/Bangkok"', MODULE)

    def test_daily_result_sync_uses_existing_provider_workflow(self):
        self.assertIn('cron: "0 23 * * *"', SYNC_WORKFLOW)
        self.assertIn('https://api.football-data.org/v4/competitions/$code/$endpoint', SYNC_WORKFLOW)
        self.assertIn('for endpoint in teams matches standings', SYNC_WORKFLOW)
        self.assertIn('"status":m.get("status")', DATABASE_BUILDER)
        self.assertIn('ft.get("home")', DATABASE_BUILDER)
        self.assertIn('ft.get("away")', DATABASE_BUILDER)

    def test_calendar_does_not_add_api_or_provider_calls(self):
        self.assertEqual(len(re.findall(r"\bfetch\s*\(", MODULE)), 2)
        self.assertIn('football-time-v97', WORKER)



    def test_manual_match_events_keep_player_names_without_legacy_profile_links(self):
        self.assertIn('const player = item.player?.name', MODULE)
        self.assertIn('esc(player)', MODULE)
        self.assertNotIn("data-canonical-player-ref", MODULE)
        self.assertNotIn("pft-open-canonical-player", MODULE)

if __name__ == "__main__":
    unittest.main()
