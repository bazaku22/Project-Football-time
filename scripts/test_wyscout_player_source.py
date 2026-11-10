#!/usr/bin/env python3
"""Non-publishing Wyscout pilot for five-league player event coverage.

Reads the public index and a small, evenly-spaced sample of match event files.
Only aggregate counts are printed; no source records are written or redistributed.
Dataset: Pappalardo et al. (2019), CC BY 4.0. See docs for attribution.
"""
from __future__ import annotations

import json
import re
import sys
import time
from collections import Counter, defaultdict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

INDEX_URL = (
    "https://raw.githubusercontent.com/koenvo/"
    "wyscout-soccer-match-event-dataset/main/processed-v2/README.md"
)
EVENT_BASE = (
    "https://raw.githubusercontent.com/koenvo/"
    "wyscout-soccer-match-event-dataset/main/processed-v2/files"
)
LEAGUES = {
    "England": "Premier League",
    "Spain": "La Liga",
    "Germany": "Bundesliga",
    "Italy": "Serie A",
    "France": "Ligue 1",
}
SAMPLES_PER_LEAGUE = 3


def fetch_bytes(url: str, attempts: int = 3) -> bytes:
    last_error = None
    for attempt in range(attempts):
        try:
            request = Request(url, headers={"User-Agent": "Project-Football-Time-Research/1.0"})
            with urlopen(request, timeout=45) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def read_index() -> dict[str, list[tuple[str, str]]]:
    content = fetch_bytes(INDEX_URL).decode("utf-8")
    grouped: dict[str, list[tuple[str, str]]] = defaultdict(list)
    pattern = re.compile(
        r"\|\[(\d+)\]\(files/\d+\.json\)\|.*?\|([^|]+)\|\s*$"
    )
    for line in content.splitlines():
        match = pattern.search(line)
        if not match:
            continue
        match_id, source = match.groups()
        source_match = re.fullmatch(r"matches_(England|Spain|Germany|Italy|France)\.json", source.strip())
        if source_match:
            grouped[source_match.group(1)].append((match_id, source.strip()))
    return grouped


def main() -> int:
    grouped = read_index()
    all_players: set[int] = set()
    all_teams: set[int] = set()
    total_events = 0
    total_matches = 0
    aggregate_types: Counter[str] = Counter()
    player_actions: Counter[int] = Counter()
    league_summary = []

    for country, league_name in LEAGUES.items():
        rows = grouped.get(country, [])
        if not rows:
            raise RuntimeError(f"No indexed matches found for {league_name}")
        count = min(SAMPLES_PER_LEAGUE, len(rows))
        indexes = sorted({round(i * (len(rows) - 1) / max(count - 1, 1)) for i in range(count)})
        selected = [rows[i] for i in indexes]
        league_players: set[int] = set()
        league_teams: set[int] = set()
        league_events = 0
        league_types: Counter[str] = Counter()

        for match_id, _source in selected:
            payload = json.loads(fetch_bytes(f"{EVENT_BASE}/{match_id}.json").decode("utf-8"))
            events = payload.get("events") if isinstance(payload, dict) else None
            if not isinstance(events, list):
                raise RuntimeError(f"Unexpected event payload for match {match_id}")
            league_events += len(events)
            for event in events:
                event_type = str(event.get("eventName") or "Unknown")
                league_types[event_type] += 1
                player_id = event.get("playerId")
                team_id = event.get("teamId")
                if isinstance(player_id, int):
                    league_players.add(player_id)
                    player_actions[player_id] += 1
                if isinstance(team_id, int):
                    league_teams.add(team_id)
            time.sleep(0.15)

        all_players.update(league_players)
        all_teams.update(league_teams)
        total_events += league_events
        total_matches += len(selected)
        aggregate_types.update(league_types)
        league_summary.append((league_name, len(rows), len(selected), len(league_teams), len(league_players), league_events))

    print("Wyscout Open Dataset player-source pilot")
    print("Season: 2017/18 | Scope: sampled matches, not full-season player totals")
    print("License: CC BY 4.0; attribution required")
    print("League | Indexed matches | Sampled | Teams | Players observed | Events")
    for row in league_summary:
        print(" | ".join(str(value) for value in row))
    print(f"Total sampled matches: {total_matches}")
    print(f"Unique players observed across samples: {len(all_players)}")
    print(f"Teams represented: {len(all_teams)}")
    print(f"Events processed: {total_events}")
    print("Event categories: " + ", ".join(f"{name}={count}" for name, count in sorted(aggregate_types.items())))
    print(f"Players with at least one recorded event: {len(player_actions)}")
    print("Not measured: full-season appearances, minutes, goals/assists totals, xG, or current squads.")
    print("Raw event/player records were processed in memory only and were not saved or redistributed.")
    if total_matches != len(LEAGUES) * SAMPLES_PER_LEAGUE or not all_players:
        raise RuntimeError("Pilot did not complete the expected sample")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Pilot failed: {exc}", file=sys.stderr)
        raise
