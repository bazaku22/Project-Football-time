import unittest

from phase6_league_catalog import LEAGUE_CATALOG, PLANNED_LEAGUES, PROVIDER_LEAGUES


class Phase6LeagueCatalogTests(unittest.TestCase):
    def test_eight_stable_league_ids_are_unique(self):
        ids = [row["id"] for row in LEAGUE_CATALOG]
        self.assertEqual(len(ids), 8)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(
            set(ids), {"PL", "PD", "BL1", "SA", "FL1", "ELC", "J1", "J2"}
        )

    def test_only_six_leagues_are_enabled_for_existing_provider(self):
        self.assertEqual(
            {row["id"] for row in PROVIDER_LEAGUES},
            {"PL", "PD", "BL1", "SA", "FL1", "ELC"},
        )
        self.assertTrue(all(row["providerCompetitionCode"] for row in PROVIDER_LEAGUES))

    def test_j_leagues_are_visible_but_do_not_trigger_api_calls(self):
        self.assertEqual({row["id"] for row in PLANNED_LEAGUES}, {"J1", "J2"})
        self.assertTrue(all(row["providerCompetitionCode"] is None for row in PLANNED_LEAGUES))
        self.assertTrue(all(
            row["dataStatus"] == "not_available_on_current_free_tier"
            for row in PLANNED_LEAGUES
        ))
        self.assertTrue(all(row["seasonFormat"] == "calendar_year" for row in PLANNED_LEAGUES))


if __name__ == "__main__":
    unittest.main()
