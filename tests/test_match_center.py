import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
SYNC_WORKFLOW = (ROOT / ".github" / "workflows" / "update-football-database.yml").read_text(encoding="utf-8")
DATABASE_BUILDER = (ROOT / "scripts" / "build_football_database.py").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "match-center.js").read_text(encoding="utf-8")
UNIFIED = (ROOT / "js" / "unified-match-center.js").read_text(encoding="utf-8")
CSS = (ROOT / "css" / "match-center.css").read_text(encoding="utf-8")


class MatchCenterTests(unittest.TestCase):
    def test_match_center_uses_real_database_and_five_core_leagues(self):
        self.assertIn('id="matchCenterApp"', HTML)
        self.assertIn('getDatabase?.()', MODULE)
        self.assertIn('new Set(["PL","PD","BL1","SA","FL1","ELC","INTL"])', MODULE)
        self.assertIn("international-matches.json", MODULE)
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

    def test_match_center_keeps_club_leagues_and_adds_separate_national_competition(self):
        self.assertIn('CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1","ELC","INTL"])', MODULE)
        self.assertIn("mergeInternationalData", MODULE)
        self.assertIn("loadInternationalData", MODULE)
        self.assertNotIn("internationalFixtures", MODULE)
        self.assertNotIn("Nations League", MODULE)

    def test_filters_and_time_are_bangkok_local(self):
        for key in ("upcoming","live","finished","all"):
            self.assertIn('data-match-filter="' + key + '"', HTML)
        self.assertIn('timeZone:"Asia/Bangkok"', MODULE)

    def test_match_card_uses_team_crests_and_database_match_fields(self):
        for marker in ("homeTeamId","awayTeamId","homeTeamName","awayTeamName","homeScore","awayScore","utcDate","leagueId"):
            self.assertIn(marker, MODULE)
        self.assertIn("mc-crest-wrap", CSS)
        self.assertNotIn("mc-crest-fallback", MODULE)
        self.assertIn("team?.crest", MODULE)

    def test_match_details_expand_inline_without_page_navigation(self):
        self.assertIn('data-unified-match=', MODULE)
        self.assertIn('aria-expanded="false"', MODULE)
        self.assertIn('ดูรายละเอียดการแข่งขัน', MODULE)
        self.assertNotIn('data-match-action=', MODULE)
        self.assertNotIn('data-provider-match-id=', MODULE)
        self.assertIn('matchCard.append(detail())', UNIFIED)
        self.assertIn('detailHome.insertBefore(detail(),detailAnchor)', UNIFIED)

    def test_match_detail_button_does_not_route_to_another_page(self):
        self.assertNotIn('function openInDatabase', MODULE)
        self.assertIn('open(matchButton)', UNIFIED)
        self.assertIn('if (selectedButton === button) { close(); return; }', UNIFIED)

    def test_match_details_keep_database_context_and_tabs(self):
        self.assertIn('getMatchById?.(id)', UNIFIED)
        self.assertIn('data-mc-detail-tab="overview"', HTML)
        self.assertIn('data-mc-detail-tab="events"', HTML)
        self.assertIn('data-mc-detail-tab="statistics"', HTML)
        self.assertIn('data-mc-detail-tab="analysis"', HTML)

    def test_analysis_summary_keeps_its_existing_data_contract(self):
        self.assertIn('["SCHEDULED","TIMED"]', MODULE)
        self.assertIn('getMatchCardAnalysis', MODULE)
        self.assertIn('renderAnalysisSummary(match,cardAnalysis)', MODULE)

    def test_offline_asset_and_cache_are_versioned(self):
        self.assertIn("football-time-v124", WORKER)
        self.assertIn('"./data/international-matches.json"', WORKER)
        self.assertIn('"./js/handicap-reference.js"', WORKER)
        self.assertIn('"./css/match-center.css?v=8"', WORKER)
        self.assertIn('"./js/match-center.js"', WORKER)

    def test_app_version_is_consistent_and_visible(self):
        self.assertIn('<title>Project Football Time V7.1</title>', HTML)
        self.assertIn('<meta name="application-version" content="7.1">', HTML)


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
        self.assertNotIn("ความสดรายลีก", MODULE)
        self.assertNotIn('id="matchCenterDataState"', HTML)

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

    def test_league_filter_includes_the_separate_national_competition(self):
        self.assertNotIn('data-match-category="international"', HTML)
        self.assertNotIn('data-match-category="club"', HTML)
        self.assertIn('id="matchCenterLeagueFilters"', HTML)
        self.assertIn('activeLeagues = new Set()', MODULE)
        self.assertIn('activeLeagues.has(String(match.leagueId))', MODULE)
        self.assertIn('renderLeagueFilters()', MODULE)
        self.assertIn('id="matchCenterLeagueSelect"', MODULE)
        self.assertIn("CORE_LEAGUES.has(String(match.leagueId))", MODULE)

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
        self.assertEqual(len(re.findall(r"\bfetch\s*\(", MODULE)), 1)
        self.assertIn("INTERNATIONAL_DATA_URL", MODULE)
        self.assertIn('football-time-v124', WORKER)



    def test_manual_match_events_keep_player_names_without_legacy_profile_links(self):
        self.assertIn('const eventPlayer = (event)', UNIFIED)
        self.assertIn('playerLink(event)', UNIFIED)
        self.assertNotIn("data-canonical-player-ref", UNIFIED)
        self.assertNotIn("pft-open-canonical-player", UNIFIED)

if __name__ == "__main__":
    unittest.main()
