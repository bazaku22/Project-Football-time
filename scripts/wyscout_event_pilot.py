#!/usr/bin/env python3
"""Local-only Wyscout event counter. No network, database, or app writes."""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def _positive_id(value: Any) -> str | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return str(number) if number > 0 else None


def aggregate_events(document: dict[str, Any]) -> dict[str, Any]:
    events = document.get("events")
    if not isinstance(events, list):
        raise ValueError("Input must contain an 'events' array")

    players: dict[str, dict[str, Any]] = {}
    event_types: Counter[str] = Counter()
    by_player: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"teamIds": set(), "eventCounts": Counter(), "subEventCounts": Counter()}
    )
    missing_player_events = 0

    for event in events:
        if not isinstance(event, dict):
            continue
        event_name = str(event.get("eventName") or "Unknown")
        sub_event = str(event.get("subEventName") or "Unknown")
        event_types[event_name] += 1
        player_id = _positive_id(event.get("playerId"))
        team_id = _positive_id(event.get("teamId"))
        if player_id is None:
            missing_player_events += 1
            continue
        row = by_player[player_id]
        row["eventCounts"][event_name] += 1
        row["subEventCounts"][sub_event] += 1
        if team_id:
            row["teamIds"].add(team_id)

    for player_id, row in sorted(by_player.items(), key=lambda item: int(item[0])):
        players[player_id] = {
            "provider": "wyscout",
            "providerPlayerId": player_id,
            "teamIds": sorted(row["teamIds"], key=int),
            "eventCounts": dict(sorted(row["eventCounts"].items())),
            "subEventCounts": dict(sorted(row["subEventCounts"].items())),
            "totalAttributedEvents": sum(row["eventCounts"].values()),
        }

    return {
        "schemaVersion": 1,
        "source": "Wyscout public event dataset",
        "aggregationLevel": "single_match_event_counts",
        "matchId": document.get("matchId"),
        "eventRows": len(events),
        "eventRowsByType": dict(sorted(event_types.items())),
        "uniquePlayersWithAttributedEvents": len(players),
        "eventsWithoutPlayerId": missing_player_events,
        "players": list(players.values()),
        "limitations": [
            "Counts are raw event-category counts, not official season statistics.",
            "No goal, assist, shot-on-target, pass-accuracy, or xG inference is made.",
            "Provider player IDs are not Football Time canonical IDs.",
            "Player names and team names are not inferred from IDs.",
            "Do not combine overlapping provider counts or import without item-level rights review.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Path to one Wyscout match JSON file")
    parser.add_argument("--output", help="Optional local output path; otherwise print JSON to stdout")
    args = parser.parse_args()

    source = Path(args.input)
    document = json.loads(source.read_text(encoding="utf-8"))
    result = aggregate_events(document)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
