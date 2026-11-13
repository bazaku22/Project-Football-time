import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PlayerMatchEventEntryUITests(unittest.TestCase):
    def test_secondary_tools_exposes_local_player_event_entry(self):
        nav = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        self.assertIn('["playerMatchEvents","บันทึกเหตุการณ์ผู้เล่น"]', nav)
        self.assertIn('page.id = "playerMatchEventEntryPage"', nav)
        self.assertIn('target === "playerMatchEvents"', nav)
        self.assertIn('activate("playerMatchEventEntryPage", null, "")', nav)

    def test_page_supports_match_lineup_sources_and_goal_substitution_events(self):
        nav = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        for marker in [
            'id="pmeCompetition"', 'id="pmeMatch"', 'id="pmeLineupTeam"',
            'id="pmePlayerRole"', 'id="pmeSourceUrl"', 'id="pmeSourceRights"',
            'id="pmeLineupSources"', 'id="pmeEventSources"', 'id="pmeEventType"', 'id="pmeLineupCoverage"', 'id="pmeEventCoverage"',
            'id="pmeExport"'
        ]:
            self.assertIn(marker, nav)
        entry = (ROOT / "js/player-match-event-entry.js").read_text(encoding="utf-8")
        self.assertIn('id="pmeGoalType"', entry)
        self.assertIn('id="pmeAssistStatus"', entry)
        self.assertIn('function findLineup(key){if(key==null||key==="")return null;const index=Number(key)', entry)
        self.assertIn('const sourceIds=selectedSourceIds("pmeLineupSources")', entry)
        self.assertIn('const sourceIds=selectedSourceIds("pmeEventSources")', entry)
        self.assertIn('authoritativeSources.length>=1', entry)
        self.assertIn('$("pmeReviewedConfirm").checked=false', entry)
        self.assertNotIn('const first=r.sources[0].source_id', entry)

    def test_entry_module_is_local_only_and_uses_canonical_finished_matches(self):
        source = (ROOT / "js/player-match-event-entry.js").read_text(encoding="utf-8")
        self.assertIn('localStorage.setItem(STORAGE_KEY,JSON.stringify(next))', source)
        self.assertIn('window.FootballTimeAppContext?.getDatabase?.()', source)
        self.assertIn('String(row.status||"").toUpperCase()==="FINISHED"', source)
        self.assertIn('row.providerMatchId!=null', source)
        self.assertIn('reuse_rights:$("pmeSourceRights").value', source)
        self.assertIn('event_id:"event-"', source)
        self.assertNotIn("fetch(", source)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn("XMLHttpRequest", source)

    def test_mount_failure_is_visible_and_does_not_lock_out_retry(self):
        source = (ROOT / "js/player-match-event-entry.js").read_text(encoding="utf-8")
        mount = source[source.index("  function mount(){"):source.index("\n  if(document.readyState", source.index("  function mount(){"))]
        self.assertIn('const missing=required.filter(id=>!$(id)||!page.contains($(id)))', mount)
        self.assertIn('Player Match Event Entry initialization failed:', mount)
        self.assertIn('page.dataset.mounted="true"', mount)
        self.assertLess(mount.index('renderMatchOptions();renderAll();renderEventFields();renderStatsTable();'),
                        mount.index('page.dataset.mounted="true"'))
        self.assertIn('page.dataset.mounted="false"', mount)
        self.assertIn('setAttribute("role","alert")', mount)

    def test_styles_and_scripts_are_cached_and_app_version_is_bumped(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('content="6.26.5-beta.3"', html)
        self.assertIn('<main id="main">', html)
        self.assertEqual(html.count('<main id="main">'), 1)
        self.assertIn('./css/player-match-event-entry.css?v=1', html)
        self.assertIn('./js/player-match-event-entry.js', html)
        self.assertIn('./css/player-match-event-entry.css?v=1', sw)
        self.assertIn('./js/player-match-event-entry.js', sw)
        self.assertIn('const CACHE = "football-time-v90"', sw)


if __name__ == "__main__":
    unittest.main()
