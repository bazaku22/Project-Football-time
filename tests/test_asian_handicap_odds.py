import importlib.util
import unittest
import statistics

spec = importlib.util.spec_from_file_location("odds_fetch", "scripts/fetch_asian_handicap_odds.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OddsParserTests(unittest.TestCase):
    def test_extracts_valid_home_and_away_lines(self):
        event = {
            "id": "evt-1", "sport_key": "soccer_epl",
            "home_team": "Arsenal", "away_team": "Chelsea",
            "commence_time": "2026-11-15T16:30:00Z",
            "bookmakers": [{
                "title": "Example Book",
                "markets": [{
                    "key": "spreads", "last_update": "2026-11-11T05:00:00Z",
                    "outcomes": [
                        {"name": "Arsenal", "point": -0.75, "price": 1.9},
                        {"name": "Chelsea", "point": 0.75, "price": 1.9},
                    ],
                }],
            }],
        }
        result = module.parse_event(event, "PL", "Premier League")
        self.assertIsNotNone(result)
        self.assertEqual(result["referenceHomeLine"], -0.75)
        self.assertEqual(result["referenceAwayLine"], 0.75)
        self.assertIn(result["referenceAwayLine"], [0.75])
        self.assertEqual(result["bookmakers"][0]["bookmaker"], "Example Book")


    def test_even_bookmaker_sample_uses_an_actual_offered_line(self):
        lines = [-3.0, -3.0, -2.75, -2.5]
        self.assertIn(statistics.median_low(lines), lines)
        self.assertNotEqual(statistics.median(lines), statistics.median_low(lines))

    def test_ignores_unbalanced_or_missing_market_lines(self):
        event = {
            "home_team": "A", "away_team": "B", "bookmakers": [{
                "title": "Bad",
                "markets": [{
                    "key": "spreads",
                    "outcomes": [
                        {"name": "A", "point": -0.5},
                        {"name": "B", "point": 0.25},
                    ],
                }],
            }],
        }
        self.assertIsNone(module.parse_event(event, "PL", "Premier League"))

    def test_ignores_non_spread_markets(self):
        event = {
            "home_team": "A", "away_team": "B", "bookmakers": [{
                "title": "Example",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "A", "price": 1.8}, {"name": "B", "price": 2.1}
                ]}],
            }],
        }
        self.assertIsNone(module.parse_event(event, "PL", "Premier League"))


if __name__ == "__main__":
    unittest.main()
