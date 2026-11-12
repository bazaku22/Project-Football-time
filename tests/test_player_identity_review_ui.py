import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-identity-review.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
RECONCILER = (ROOT / "scripts" / "reconcile_player_identity.py").read_text(encoding="utf-8")


class PlayerIdentityReviewUITests(unittest.TestCase):
    def test_review_panel_is_in_player_database_workspace(self):
        panel = HTML[HTML.index('id="dbtab-players"'):HTML.index('id="dbtab-accuracy"')]
        for marker in ("playerIdentityReviewPanel", "playerIdentityReviewFile",
                       "playerIdentityReviewer", "playerIdentityReviewRows",
                       "playerIdentityExportMappings", "playerIdentityExportDecisions"):
            self.assertIn(marker, panel)
        self.assertIn('./js/player-identity-review.js', HTML)
        self.assertIn('./css/player-identity-review.css?v=1', HTML)

    def test_manual_review_actions_and_filter_exist(self):
        for marker in ("approve", "rejected", "followup", "candidate_keys",
                       "reviewed_at", "reviewer", "player-id-mapping-reviewed.csv",
                       "player-identity-review-decisions.csv"):
            self.assertIn(marker, MODULE)

    def test_review_decisions_are_local_only_and_no_network_or_supabase_write(self):
        self.assertIn("pft_player_identity_review_decisions_v1", MODULE)
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("createClient", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("localStorage", MODULE)

    def test_reconciler_preserves_original_reviewer_evidence(self):
        self.assertIn('"reviewer": mapped[0].get("reviewer", "")', RECONCILER)
        self.assertIn('"reviewed_at": mapped[0].get("reviewed_at", "")', RECONCILER)

    def test_service_worker_caches_new_assets_and_invalidates_old_cache(self):
        self.assertIn("football-time-v63", WORKER)
        self.assertIn('"./css/player-identity-review.css?v=1"', WORKER)
        self.assertIn('"./js/player-identity-review.js"', WORKER)


if __name__ == "__main__":
    unittest.main()
