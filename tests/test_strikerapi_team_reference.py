import unittest
from scripts.strikerapi_team_reference import LEAGUES, normalize


def payloads():
    return {
        code: {
            "season": 2026,
            "teams": [{
                "team_id": f"{code}-1", "abbrev": "ARS",
                "name": "Arsenal FC", "display_name": "Arsenal FC",
                "short_name": "Arsenal"
            }]
        }
        for code in LEAGUES
    }


class StrikerApiTeamReferenceTests(unittest.TestCase):
    def test_normalizes_five_league_reference_without_canonical_ids(self):
        result = normalize(payloads(), collected_at="2026-11-13T00:00:00+00:00")
        self.assertEqual(result["season"], "2026/27")
        self.assertEqual(result["provider_api_calls"], 5)
        self.assertEqual(result["estimated_credits"], 5)
        self.assertEqual(len(result["teams"]), 5)
        self.assertFalse(result["production_import"])

    def test_rejects_missing_league(self):
        source = payloads()
        source.pop("FL1")
        with self.assertRaisesRegex(ValueError, "exactly"):
            normalize(source)

    def test_rejects_duplicate_provider_team_id_within_league(self):
        source = payloads()
        source["PL"]["teams"].append(dict(source["PL"]["teams"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            normalize(source)


if __name__ == "__main__":
    unittest.main()
