#!/usr/bin/env python3
"""Evaluate StatsBomb Open Data as a supplementary player source.

This is a non-publishing pilot: source files are processed in memory and only
aggregate coverage counts are printed. No source records are written to the repo.
"""
from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "https://raw.githubusercontent.com/hudl/open-data/master/data"
COMPETITION_ID = 9
SEASON_ID = 281
EXPECTED_COMPETITION = "1. Bundesliga"
EXPECTED_SEASON = "2023/2024"


def fetch_json(path: str):
    url = f"{BASE}/{path}"
    last_error = None
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "Project-Football-Time-Research/1.0"})
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Unable to fetch {path}: {last_error}")


def main() -> int:
    matches = fetch_json(f"matches/{COMPETITION_ID}/{SEASON_ID}.json")
    if not isinstance(matches, list):
        raise RuntimeError("Unexpected matches payload")

    players = {}
    teams = set()
    appearances = defaultdict(int)
    starts = defaultdict(int)
    yellow_cards = defaultdict(int)
    red_cards = defaultdict(int)
    matches_read = 0
    players_seen_in_lineups = 0

    for match in matches:
        match_id = match.get("match_id")
        if not match_id:
            continue
        lineups = fetch_json(f"lineups/{match_id}.json")
        if not isinstance(lineups, list):
            continue
        matches_read += 1
        for team in lineups:
            team_id = team.get("team_id")
            team_name = team.get("team_name")
            if team_id is not None:
                teams.add((team_id, team_name))
            for player in team.get("lineup", []):
                player_id = player.get("player_id")
                if player_id is None:
                    continue
                players_seen_in_lineups += 1
                record = players.setdefault(player_id, {
                    "name": player.get("player_nickname") or player.get("player_name"),
                    "team_ids": set(),
                    "positions": set(),
                })
                if team_id is not None:
                    record["team_ids"].add(team_id)
                positions = player.get("positions") or []
                if positions:
                    appearances[player_id] += 1
                    if any(p.get("start_reason") == "Starting XI" and p.get("from") == "00:00" for p in positions):
                        starts[player_id] += 1
                    for position in positions:
                        if position.get("position"):
                            record["positions"].add(position["position"])
                for card in player.get("cards") or []:
                    kind = (card.get("card_type") or "").lower()
                    if "red" in kind or "second yellow" in kind:
                        red_cards[player_id] += 1
                    elif "yellow" in kind:
                        yellow_cards[player_id] += 1
        time.sleep(0.15)

    appeared = [pid for pid, count in appearances.items() if count]
    multi_team = sum(1 for record in players.values() if len(record["team_ids"]) > 1)
    position_coverage = sum(1 for pid in appeared if players[pid]["positions"])

    print("StatsBomb Open Data player-source pilot")
    print(f"Competition: {EXPECTED_COMPETITION} | Season: {EXPECTED_SEASON}")
    print("Coverage note: repository match selection is partial; not a complete league season.")
    print(f"Matches listed: {len(matches)}")
    print(f"Matches with lineups retrieved: {matches_read}")
    print(f"Teams represented: {len(teams)}")
    print(f"Unique players listed: {len(players)}")
    print(f"Players with recorded on-field positions: {len(appeared)}")
    print(f"Players with position labels: {position_coverage}")
    print(f"Player-team-season observations: {players_seen_in_lineups}")
    print(f"Players observed for multiple teams: {multi_team}")
    print(f"Yellow cards in supplied lineups: {sum(yellow_cards.values())}")
    print(f"Red/second-yellow cards in supplied lineups: {sum(red_cards.values())}")
    print("Goals, assists, xG and full-season totals: not included in this pilot.")
    print("Raw player data was not saved or redistributed.")
    if matches_read == 0 or not players:
        raise RuntimeError("Pilot returned no usable lineup data")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Pilot failed: {exc}", file=sys.stderr)
        raise
