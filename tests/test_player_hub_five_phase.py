import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
JS=(ROOT/"js/player-hub.js").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")
class PlayerHubFivePhaseTests(unittest.TestCase):
 def test_hub_and_assets_are_loaded(self):
  self.assertIn('id="playerHub"',HTML)
  self.assertIn("./js/player-hub.js",HTML)
  self.assertIn('id="playerHubProfile"',HTML)
  self.assertIn("./css/player-hub.css?v=1",HTML)
 def test_team_navigation_and_profile_sections(self):
  for token in ["playerHubLeagues","playerHubTeams","playerHubRoster","data-hub-player","overview","season","matches","performance"]:
   self.assertIn(token,JS)
 def test_stats_are_not_fabricated(self):
  self.assertIn("ยังไม่มีสถิติฤดูกาล",JS)
  self.assertIn("ยังไม่มีข้อมูลสถิติรายนัด",JS)
  self.assertIn("PROVISIONAL",JS)
  self.assertIn("player-team-name-registry-2026-27.json",JS)
  self.assertIn("provider_display_names_verified",JS)
 def test_service_worker_cache(self):
  self.assertIn("football-time-v79",SW)
  self.assertIn("./data/player-team-name-registry-2026-27.json",SW)
  self.assertIn("./js/player-hub.js",SW)
if __name__=="__main__":unittest.main()
