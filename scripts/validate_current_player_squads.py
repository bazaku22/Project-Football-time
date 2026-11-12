#!/usr/bin/env python3
"""Validate the offline 2026/27 five-league player intake pilot.

This validator is deliberately read-only. It never calls a provider or writes to
Supabase. Research-only rows with pending source-rights review are accepted as
research candidates, never as production-importable records.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ALLOWED_LEAGUES = {"PL", "PD", "BL1", "SA", "FL1"}
TARGET_SEASON = "2026/27"


def validate(data: dict, expected_season: str = TARGET_SEASON) -> list[str]:
    errors: list[str] = []
    if data.get("schemaVersion") != 1:
        errors.append("schemaVersion must equal 1")
    if data.get("season") != expected_season:
        errors.append(f"dataset season must equal {expected_season}")
    if data.get("status") != "research_only":
        errors.append("dataset status must remain research_only")
    if data.get("production_import") is not False:
        errors.append("production_import must be false")
    if data.get("provider_api_calls") != 0:
        errors.append("provider_api_calls must equal 0")

    sources = data.get("sources")
    players = data.get("players")
    if not isinstance(sources, list) or not sources:
        errors.append("sources must be a non-empty list")
        sources = []
    if not isinstance(players, list):
        errors.append("players must be a list")
        players = []

    source_by_id = {}
    for source in sources:
        if not isinstance(source, dict):
            errors.append("every source must be an object")
            continue
        source_id = source.get("id")
        if not source_id or source_id in source_by_id:
            errors.append(f"source id missing or duplicated: {source_id}")
            continue
        source_by_id[source_id] = source
        if source.get("season") != expected_season:
            errors.append(f"source {source_id} is not scoped to {expected_season}")
        if not str(source.get("url", "")).startswith("https://"):
            errors.append(f"source {source_id} must have an HTTPS URL")
        if source.get("terms_status") != "pending_review":
            errors.append(f"source {source_id} must remain pending_review")

    seen_ids = set()
    seen_memberships = set()
    seen_leagues = set()
    for row in players:
        if not isinstance(row, dict):
            errors.append("every player row must be an object")
            continue
        player_id = row.get("id")
        if not player_id or player_id in seen_ids:
            errors.append(f"player id missing or duplicated: {player_id}")
        seen_ids.add(player_id)
        if not str(player_id).startswith("research:"):
            errors.append(f"player {player_id} must use a research-only id")
        if row.get("season") != expected_season:
            errors.append(f"player {player_id} has a non-current season")
        league = row.get("league_id")
        if league not in ALLOWED_LEAGUES:
            errors.append(f"player {player_id} has unsupported league {league}")
        else:
            seen_leagues.add(league)
        if not row.get("name") or not row.get("club_id") or not row.get("club_name"):
            errors.append(f"player {player_id} is missing name or canonical club mapping")
        source = source_by_id.get(row.get("source_id"))
        if source is None:
            errors.append(f"player {player_id} references an unknown source")
        elif source.get("league_id") != league:
            errors.append(f"player {player_id} source league does not match")
        if row.get("rights_status") != "pending_review":
            errors.append(f"player {player_id} must remain pending_review")
        if row.get("photo") is not None:
            errors.append(f"player {player_id} has a photo without completed rights review")
        if row.get("statistics") != {}:
            errors.append(f"player {player_id} statistics must remain empty until source review")
        if row.get("provider_ids") != []:
            errors.append(f"player {player_id} provider ids require exact mapping review")
        if row.get("squad_level") not in {"first_team", "u21", "u18", "reserve", "unknown"}:
            errors.append(f"player {player_id} has an invalid squad level")
        if row.get("position") not in {None, "goalkeeper", "defender", "midfielder", "forward", "striker"}:
            errors.append(f"player {player_id} has an invalid position")
        membership = (league, row.get("club_id"), row.get("season"), str(row.get("name", "")).casefold())
        if membership in seen_memberships:
            errors.append(f"duplicate player membership: {membership}")
        seen_memberships.add(membership)

    if len(seen_leagues) != 5:
        errors.append("pilot must contain records from all five target leagues")
    if data.get("records_count") != len(players):
        errors.append("records_count does not match players length")
    if data.get("coverage") != "five_league_source_pilot_not_complete":
        errors.append("coverage must explicitly state that this is not complete")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="data/current-player-squads-2026-27.json")
    parser.add_argument("--season", default=TARGET_SEASON)
    args = parser.parse_args()
    path = Path(args.input)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid JSON: {exc}", file=sys.stderr)
        return 2
    errors = validate(data, args.season)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Validated {len(data['players'])} research-only player memberships across five leagues.")
    print("No provider API calls, production writes, migrations, or deletes were performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
