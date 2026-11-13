import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
MODULE = (ROOT / "js" / "player-identity-review.js").read_text(encoding="utf-8")
WORKER = (ROOT / "sw.js").read_text(encoding="utf-8")
RECONCILER = (ROOT / "scripts" / "reconcile_player_identity.py").read_text(encoding="utf-8")


class PlayerIdentityReviewUITests(unittest.TestCase):
    def test_legacy_identity_review_ui_is_removed_from_app(self):
        for marker in ('id="dbtab-players"', 'id="playerIdentityReviewPanel"',
                       'id="playerTeamAliasReviewPanel"'):
            self.assertNotIn(marker, HTML)
        self.assertNotIn('./js/player-identity-review.js', HTML)
        self.assertNotIn('./js/player-team-alias-review.js', HTML)
        self.assertNotIn('./css/player-identity-review.css?v=1', HTML)

    def test_manual_review_actions_and_filter_exist(self):
        for marker in ("approve", "rejected", "followup", "candidate_keys",
                       "reviewed_at", "reviewer", "player-id-mapping-reviewed.csv",
                       "player-identity-review-decisions.csv", "createAllProvisional", "provisional_player_key", "provisional-player-review-2026-27.csv", "create-provisional"):
            self.assertIn(marker, MODULE)

    def test_review_decisions_are_local_only_and_no_network_or_supabase_write(self):
        self.assertIn("pft_player_identity_review_decisions_v1", MODULE)
        self.assertNotIn("fetch(", MODULE)
        self.assertNotIn("createClient", MODULE)
        self.assertNotIn("supabase", MODULE.lower())
        self.assertIn("localStorage", MODULE)
        self.assertNotIn("playerIdentityCreateAllProvisional", HTML)
        self.assertNotIn("playerIdentityExportProvisional", HTML)
        self.assertNotIn('<option value="provisional">สร้างรายการรอตรวจ</option>', HTML)
        self.assertIn('if(row.status==="conflicting_identity_observations"){held++;return;}', MODULE)
        self.assertIn('if(existing)return;', MODULE)

    def test_reconciler_preserves_original_reviewer_evidence(self):
        self.assertIn('"reviewer": mapped[0].get("reviewer", "")', RECONCILER)
        self.assertIn('"reviewed_at": mapped[0].get("reviewed_at", "")', RECONCILER)

    def test_legacy_team_alias_review_ui_is_removed_from_app(self):
        self.assertNotIn('id="playerTeamAliasReviewPanel"', HTML)
        self.assertNotIn('./js/player-team-alias-review.js', HTML)
        self.assertNotIn('./js/player-team-alias-review.js', WORKER)
        alias_module = (ROOT / "js" / "player-team-alias-review.js").read_text(encoding="utf-8")
        self.assertIn("pft_player_team_alias_decisions_2026_27_v1", alias_module)
        self.assertNotIn("fetch(", alias_module)
        self.assertNotIn("supabase", alias_module.lower())

    def test_service_worker_no_longer_precaches_legacy_identity_tools(self):
        self.assertIn("football-time-v91", WORKER)
        self.assertNotIn('"./css/player-identity-review.css?v=1"', WORKER)
        self.assertNotIn('"./js/player-identity-review.js"', WORKER)
        self.assertNotIn('"./js/player-team-alias-review.js"', WORKER)


if __name__ == "__main__":
    unittest.main()
