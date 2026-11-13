import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class NotificationCenterTests(unittest.TestCase):
 def test_assets_are_loaded_and_cached(self):
  h=(ROOT/"index.html").read_text();s=(ROOT/"sw.js").read_text()
  for p in ("./js/notification-center.js","./css/notification-center.css?v=1"): self.assertIn(p,h);self.assertIn(p,s)
 def test_dialog_and_trigger_are_accessible(self):
  h=(ROOT/"index.html").read_text()
  for p in ('id="pftNotificationButton"','id="pftNotificationDialog"','id="pftNotificationList"','id="pftToastRoot"','aria-label="เปิดศูนย์การแจ้งเตือน"'): self.assertIn(p,h)
 def test_database_event_hooks_and_deduplication_exist(self):
  j=(ROOT/"js/notification-center.js").read_text()
  for p in ("pft-football-database-ready","pft-football-database-error","pft_seen_football_db_stamp_v1","dedupeKey"): self.assertIn(p,j)
if __name__=="__main__": unittest.main()