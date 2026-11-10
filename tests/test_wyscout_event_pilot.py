import unittest

from scripts.wyscout_event_pilot import aggregate_events


class WyscoutEventPilotTests(unittest.TestCase):
    def test_aggregates_provider_event_counts_without_inventing_metrics(self):
        result = aggregate_events({
            "matchId": 123,
            "events": [
                {"playerId": 10, "teamId": 1, "eventName": "Pass", "subEventName": "Simple pass"},
                {"playerId": 10, "teamId": 1, "eventName": "Pass", "subEventName": "Launch"},
                {"playerId": 20, "teamId": 2, "eventName": "Shot", "subEventName": "Shot"},
                {"playerId": 0, "teamId": 2, "eventName": "Foul", "subEventName": "Foul"},
            ],
        })
        self.assertEqual(result["matchId"], 123)
        self.assertEqual(result["eventRows"], 4)
        self.assertEqual(result["eventRowsByType"], {"Foul": 1, "Pass": 2, "Shot": 1})
        self.assertEqual(result["uniquePlayersWithAttributedEvents"], 2)
        self.assertEqual(result["eventsWithoutPlayerId"], 1)
        first = result["players"][0]
        self.assertEqual(first["providerPlayerId"], "10")
        self.assertEqual(first["eventCounts"], {"Pass": 2})
        self.assertEqual(first["subEventCounts"], {"Launch": 1, "Simple pass": 1})
        self.assertIn("not Football Time canonical IDs", " ".join(result["limitations"]))

    def test_rejects_missing_events_array(self):
        with self.assertRaises(ValueError):
            aggregate_events({"matchId": 123})


if __name__ == "__main__":
    unittest.main()
