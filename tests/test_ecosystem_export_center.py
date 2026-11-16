import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class EcosystemExportCenterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.navigation = (ROOT / "js/primary-navigation.js").read_text(encoding="utf-8")
        cls.exporter = (ROOT / "js/ecosystem-export-center.js").read_text(encoding="utf-8")
        cls.service_worker = (ROOT / "sw.js").read_text(encoding="utf-8")

    def test_export_center_is_reachable_from_secondary_tools(self):
        self.assertIn('["ecosystemExport","ส่งออกข้อมูลไป Football rich"]', self.navigation)
        self.assertIn('page.id = "ecosystemExport"', self.navigation)

    def test_exporter_is_loaded_and_precached(self):
        self.assertIn('./js/ecosystem-export-center.js', self.html)
        self.assertIn('./js/ecosystem-export-center.js', self.service_worker)

    def test_export_scope_is_limited_to_approved_five_leagues(self):
        for league in ('"PL"', '"PD"', '"BL1"', '"SA"', '"FL1"'):
            self.assertIn(league, self.exporter)
        self.assertNotIn('"UNL"', self.exporter)

    def test_shared_match_id_uses_provider_identity(self):
        self.assertIn('"FT-M-FOOTBALLDATA-" + providerId', self.exporter)
        self.assertIn('provider_match_id: providerId', self.exporter)

    def test_export_uses_contract_envelope_and_fixture_type(self):
        for marker in ('schema_version: "1.0.0"', 'exported_by: "football-time"',
                       'data_type: "fixtures"', 'scope: { league_ids: leagueIds, season_ids: [seasonId] }'):
            self.assertIn(marker, self.exporter)

    def test_ambiguous_or_incomplete_fixtures_are_not_silently_exported(self):
        for marker in ('missingProviderId', 'duplicateProviderId', 'invalidFields',
                       'duplicateIds.has(providerId)', 'Number.isNaN(kickoff.getTime())'):
            self.assertIn(marker, self.exporter)

    def test_result_export_is_not_fabricated_before_revision_audit_exists(self):
        self.assertIn('Result Revision & Audit Log', self.navigation)
        self.assertNotIn('result_revision', self.exporter)
        self.assertNotIn('match_results', self.exporter)

    def test_service_worker_rollout_does_not_delete_prior_caches(self):
        self.assertIn('football-time-v101', self.service_worker)
        self.assertNotIn('caches.delete', self.service_worker)
        self.assertIn('cacheName: CACHE', self.service_worker)


if __name__ == "__main__":
    unittest.main()
