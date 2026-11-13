#!/usr/bin/env python3
"""Fetch current 2026/27 player season leaders into a review-only staging file."""
from __future__ import annotations
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_URL = "https://mcp.strikerapi.com/v1/get_leaders"
TARGET_SEASON = "2026/27"
SEASON_START_YEAR = 2026
CREDIT_COST_PER_REQUEST = 5
LEAGUES = {
    "PL": {"api": "soccer", "name": "Premier League"},
    "PD": {"api": "laliga", "name": "La Liga"},
    "BL1": {"api": "bundesliga", "name": "Bundesliga"},
    "SA": {"api": "seriea", "name": "Serie A"},
    "FL1": {"api": "ligue1", "name": "Ligue 1"},
}
STAT_CATEGORIES = (
    "goals", "assists", "goal_contributions", "shots", "shots_on_target",
    "xg", "yellow_cards", "red_cards", "saves", "clean_sheets",
)
LEADER_LIMIT = 100

def fetch_leaders(league: str, stat: str) -> dict[str, Any]:
    key = os.environ.get("STRIKERAPI_API_KEY", "").strip()
    if not key:
        raise ValueError("STRIKERAPI_API_KEY is required for --fetch")
    try:
        import requests
    except ImportError as exc:
        raise ValueError("requests is required for --fetch") from exc
    response = requests.post(
        BASE_URL,
        headers={"x-api-key": key, "Content-Type": "application/json"},
        json={"league": league, "season": SEASON_START_YEAR, "stage": "league",
              "stat": stat, "min_games": 1, "limit": LEADER_LIMIT},
        timeout=60,
    )
    if response.status_code == 402:
        raise RuntimeError("STRIKERAPI_CREDITS_EXHAUSTED")
    if response.status_code == 429:
        raise RuntimeError("STRIKERAPI_RATE_LIMITED")
    response.raise_for_status()
    body = response.json()
    if isinstance(body, dict) and body.get("error"):
        raise RuntimeError(str(body.get("message") or body["error"]))
    data = body.get("data", body) if isinstance(body, dict) else body
    if not isinstance(data, dict):
        raise ValueError(f"unexpected get_leaders response for {league}/{stat}")
    return data

def load_fixture(path: str) -> dict[str, Any]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("fixture must be a JSON object keyed by league then stat")
    return payload

def normalize(fixtures: dict[str, Any], collected_at: str | None = None,
              live: bool = False) -> dict[str, Any]:
    unknown = set(fixtures) - set(LEAGUES)
    if unknown:
        raise ValueError(f"unsupported league codes: {', '.join(sorted(unknown))}")
    missing = set(LEAGUES) - set(fixtures)
    if missing:
        raise ValueError(f"missing five-league leader payloads: {', '.join(sorted(missing))}")
    stamp = collected_at or datetime.now(timezone.utc).isoformat()
    player_map: dict[str, dict[str, Any]] = {}
    coverage: dict[str, dict[str, int]] = {}
    source_rows: list[dict[str, Any]] = []

    for league_id, config in LEAGUES.items():
        league_payload = fixtures[league_id]
        if not isinstance(league_payload, dict):
            raise ValueError(f"{league_id} payload must be an object")
        coverage[league_id] = {}
        for stat in STAT_CATEGORIES:
            if stat not in league_payload:
                raise ValueError(f"missing {league_id}/{stat} leader payload")
            payload = league_payload[stat]
            if not isinstance(payload, dict):
                raise ValueError(f"{league_id}/{stat} payload must be an object")
            payload = payload.get("data", payload)
            if not isinstance(payload, dict):
                raise ValueError(f"{league_id}/{stat} data must be an object")
            season = payload.get("season")
            if str(season) not in (str(SEASON_START_YEAR), TARGET_SEASON):
                raise ValueError(f"{league_id}/{stat} returned season {season!r}; expected {TARGET_SEASON}")
            if payload.get("stage") not in (None, "league"):
                raise ValueError(f"{league_id}/{stat} returned unexpected stage {payload.get('stage')!r}")
            leaders = payload.get("leaders")
            if not isinstance(leaders, list):
                raise ValueError(f"{league_id}/{stat} must contain a leaders array")
            coverage[league_id][stat] = len(leaders)
            for leader in leaders:
                if not isinstance(leader, dict):
                    raise ValueError(f"{league_id}/{stat} leader entries must be objects")
                player_id = str(leader.get("player_id") or "").strip()
                name = str(leader.get("name") or "").strip()
                if not player_id or not name:
                    raise ValueError(f"{league_id}/{stat} leader is missing player_id or name")
                row = {
                    "league_id": league_id, "league_name": config["name"],
                    "season": TARGET_SEASON, "stat": stat,
                    "provider_player_id": player_id, "player_name": name,
                    "position": leader.get("position"), "provider_team": leader.get("team"),
                    "rank": leader.get("rank"), "value": leader.get("value"),
                    "per90": leader.get("per90"), "games": leader.get("games"),
                    "minutes": leader.get("minutes"), "source_endpoint": "get_leaders",
                    "source_provider": "StrikerAPI",
                }
                source_rows.append(row)
                key = f"strikerapi:{player_id}"
                player = player_map.setdefault(key, {
                    "provider": "strikerapi", "provider_player_id": player_id,
                    "provider_identity_key": key, "canonical_player_id": None,
                    "name_variants": [], "league_ids": [], "provider_teams": [],
                    "season": TARGET_SEASON, "stats": {},
                    "identity_review_status": "pending_canonical_identity_review",
                })
                if name not in player["name_variants"]:
                    player["name_variants"].append(name)
                if league_id not in player["league_ids"]:
                    player["league_ids"].append(league_id)
                team = leader.get("team")
                if team and team not in player["provider_teams"]:
                    player["provider_teams"].append(team)
                player["stats"].setdefault(league_id, {})[stat] = {
                    "rank": leader.get("rank"), "value": leader.get("value"),
                    "per90": leader.get("per90"), "games": leader.get("games"),
                    "minutes": leader.get("minutes"),
                }

    players = list(player_map.values())
    for player in players:
        if len(player["name_variants"]) > 1 or len(player["league_ids"]) > 1:
            player["identity_review_status"] = "needs_manual_review"

    return {
        "schema_version": 1, "type": "strikerapi_current_season_player_leaders",
        "status": "staging_only", "season": TARGET_SEASON,
        "season_start_year": SEASON_START_YEAR, "production_import": False,
        "supabase_writes": 0, "supabase_migrations": 0, "canonical_ids_assigned": 0,
        "provider_api_calls": len(LEAGUES) * len(STAT_CATEGORIES) if live else 0,
        "estimated_credits": len(LEAGUES) * len(STAT_CATEGORIES) * CREDIT_COST_PER_REQUEST if live else 0,
        "generated_at": stamp,
        "source": {
            "provider": "StrikerAPI", "endpoint": "get_leaders",
            "season_parameter": SEASON_START_YEAR, "stage": "league",
            "rights_status": "engineering_intake_review",
            "rights_note": "Provider documentation permits use inside the user's own product within its terms and prohibits raw feed resale. This is not legal advice or blanket clearance of third-party rights.",
        },
        "scope": {
            "leagues": list(LEAGUES), "stat_categories": list(STAT_CATEGORIES),
            "leader_limit_per_category": LEADER_LIMIT,
            "competition_stage": "league_table_matches_only", "season_only": True,
        },
        "coverage": {
            "leader_rows_by_league_and_stat": coverage,
            "total_leader_rows": len(source_rows), "unique_provider_players": len(players),
            "all_five_leagues_present": set(coverage) == set(LEAGUES),
        },
        "players": players, "leader_observations": source_rows,
        "limitations": [
            "Top 100 per stat only; this is not a complete player-season database.",
            "Players outside all ten top-100 lists are not represented.",
            "Only league-table matches are included; cups and international matches are excluded.",
            "Missing metrics are absent, not zero.",
            "No canonical player or team IDs are assigned.",
            "No match-by-match player lines are included.",
            "Provider statistics may be corrected; retain dated snapshots.",
        ],
    }

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", help="Offline JSON fixture keyed by league then stat")
    parser.add_argument("--fetch", action="store_true", help="Fetch 50 live endpoints (250 credits)")
    parser.add_argument("--output", default="data/staging/strikerapi-player-leaders-2026-27.json")
    args = parser.parse_args()
    if args.fetch and args.fixture:
        parser.error("--fetch and --fixture cannot be used together")
    if not args.fetch and not args.fixture:
        parser.error("provide --fixture for offline mode or --fetch for live staging")
    if args.fetch:
        payloads = {code: {stat: fetch_leaders(config["api"], stat)
                           for stat in STAT_CATEGORIES}
                    for code, config in LEAGUES.items()}
    else:
        payloads = load_fixture(args.fixture)
    result = normalize(payloads, live=args.fetch)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": result["status"], "season": result["season"],
        "provider_api_calls": result["provider_api_calls"],
        "estimated_credits": result["estimated_credits"],
        "coverage": result["coverage"], "output": str(output),
    }, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
