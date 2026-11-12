#!/usr/bin/env python3
"""Create an offline, match-scoped StrikerAPI player-statistics intake preview.

By default this tool only reads a local JSON fixture. Network access requires
--fetch and exactly one --game-id (one get_game request, 5 credits). Output is
always staging-only: no Supabase writes, migrations, imports, or scheduled jobs.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_URL = "https://mcp.strikerapi.com/v1/get_game"
LEAGUE_CODES = {"soccer": "PL", "laliga": "PD", "bundesliga": "BL1", "seriea": "SA", "ligue1": "FL1"}
METRIC_FIELDS = (
    "goals", "assists", "shots", "shots_on_target", "yellow_cards",
    "red_cards", "saves", "xg", "xa", "clean_sheets",
)


def load_payload(path: str) -> dict[str, Any]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("input must be a JSON object")
    return payload.get("data", payload)


def fetch_game(game_id: str, league: str) -> dict[str, Any]:
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
        json={"game_id": game_id, "league": league},
        timeout=60,
    )
    if response.status_code == 402:
        raise RuntimeError("STRIKERAPI_CREDITS_EXHAUSTED")
    if response.status_code == 429:
        raise RuntimeError("STRIKERAPI_RATE_LIMITED")
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and payload.get("error"):
        raise RuntimeError(str(payload.get("message") or payload["error"]))
    return payload.get("data", payload) if isinstance(payload, dict) else payload


def numeric(value: Any) -> int | float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value >= 0:
        return value
    return None


def normalize(payload: dict[str, Any], collected_at: str | None = None) -> dict[str, Any]:
    game = payload.get("game")
    players = payload.get("players")
    if not isinstance(game, dict) or not isinstance(players, list):
        raise ValueError("payload must contain game object and players array")
    game_id = str(game.get("game_id") or "").strip()
    date = str(game.get("date") or "").strip()
    if not game_id or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        raise ValueError("game_id and YYYY-MM-DD game.date are required")
    if str(game.get("status") or "").lower() != "final":
        raise ValueError("only final matches can be staged")
    season_year = game.get("season")
    if not isinstance(season_year, (int, str)) or not str(season_year).isdigit():
        raise ValueError("game.season must be the season start year")
    league = str(game.get("league") or "").strip().lower()
    if league not in LEAGUE_CODES:
        raise ValueError("unsupported or missing StrikerAPI league code")
    season_start = int(season_year)
    season = f"{season_start}/{str((season_start + 1) % 100).zfill(2)}"
    stamp = collected_at or datetime.now(timezone.utc).isoformat()
    team_codes = {}
    for side in ("home", "away"):
        team = game.get(side)
        if isinstance(team, dict) and team.get("team_id") and team.get("abbrev"):
            team_codes[str(team["team_id"])] = str(team["abbrev"]).strip().upper()
    team_codes = {}
    for side in ("home", "away"):
        team = game.get(side)
        if isinstance(team, dict) and team.get("team_id") and team.get("abbrev"):
            team_codes[str(team["team_id"])] = str(team["abbrev"]).strip().upper()
    rows = []
    seen = set()
    for player in players:
        if not isinstance(player, dict):
            raise ValueError("every players entry must be an object")
        pid = str(player.get("player_id") or "").strip()
        team_code = str(player.get("team_id") or "").strip()
        if not pid or not team_code:
            continue
        canonical_team_code = team_codes.get(team_code)
        if not canonical_team_code:
            raise ValueError(f"player team_id {team_code} is not present in match home/away metadata")
        canonical_team_code = team_codes.get(team_code)
        if not canonical_team_code:
            raise ValueError(f"player team_id {team_code} is not present in match home/away metadata")
        key = (pid, team_code)
        if key in seen:
            raise ValueError(f"duplicate player/team identity in match: {pid}/{team_code}")
        seen.add(key)
        stats: dict[str, int | float] = {}
        if player.get("starter") is not None:
            stats["appearances"] = 1
            stats["starts"] = 1 if player.get("starter") is True else 0
        for field in METRIC_FIELDS:
            value = numeric(player.get(field))
            if value is not None:
                stats[field] = value
        minute_on = numeric(player.get("minute_on"))
        minute_off = numeric(player.get("minute_off"))
        if minute_on is not None and minute_off is not None and minute_off >= minute_on:
            stats["minutes"] = minute_off - minute_on
        rows.append({
            "provider": "strikerapi",
            "provider_player_id": pid,
            "player_name": str(player.get("name") or ""),
            "team_code": canonical_team_code,
            "provider_team_id": team_code,
            "season": season,
            "competition_code": LEAGUE_CODES[league],
            "squad_level": "first_team",
            "statistics_scope": "match",
            "match_id": game_id,
            "stat_date": date,
            **stats,
            "source_url": "https://strikerapi.com/docs/get-game",
            "source_record_id": f"strikerapi:get_game:{game_id}:{pid}",
            "collected_at": stamp,
            "rights_status": "manual_review",
            "permission_reference": "STRIKERAPI_TERMS_REVIEW_REQUIRED",
            "notes": "STAGING ONLY; exact canonical player mapping and independent rights approval required before import.",
        })
    if not rows:
        raise ValueError("no players with provider player_id and team_id were returned")
    return {
        "schemaVersion": 1,
        "type": "strikerapi_match_player_stats_intake",
        "status": "staging_only",
        "production_import": False,
        "supabase_writes": 0,
        "supabase_migrations": 0,
        "provider_api_calls": 1 if payload.get("_fetched_live") else 0,
        "estimated_credits": 5 if payload.get("_fetched_live") else 0,
        "game": {
            "match_id": game_id, "date": date, "season": season,
            "league": league, "competition": game.get("competition"),
            "home": game.get("home"), "away": game.get("away"),
        },
        "source": {
            "provider": "StrikerAPI", "endpoint": "get_game",
            "source_url": "https://strikerapi.com/docs/get-game",
            "collected_at": stamp,
            "rights_status": "manual_review",
            "rights_note": "Provider access does not by itself clear third-party competition/database rights; review current terms before import.",
        },
        "counts": {"players": len(rows), "rows_with_stats": sum(bool(set(r) & set(METRIC_FIELDS)) for r in rows)},
        "statistics": rows,
        "limitations": [
            "No canonical player key is assigned; exact provider ID mapping is required.",
            "Null provider metrics remain absent and are never converted to zero.",
            "Minutes are emitted only when both minute_on and minute_off are supplied.",
            "No season totals are calculated here; derive them from accepted match rows after identity and rights review.",
            "This output is not import-approved and never writes to Supabase.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", help="Local get_game JSON fixture; no API call")
    source.add_argument("--fetch", action="store_true", help="Make one live get_game request (5 credits)")
    parser.add_argument("--game-id", help="Required with --fetch")
    parser.add_argument("--league", default="soccer", choices=sorted(LEAGUE_CODES))
    parser.add_argument("--output", default="data/staging/strikerapi-match-stats-preview.json")
    args = parser.parse_args()
    if args.fetch and not args.game_id:
        parser.error("--game-id is required with --fetch")
    try:
        payload = fetch_game(args.game_id, args.league) if args.fetch else load_payload(args.input)
        if args.fetch:
            payload["_fetched_live"] = True
        result = normalize(payload)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Staged {result['counts']['players']} player rows for match {result['game']['match_id']}.")
    print(f"API calls: {result['provider_api_calls']}; estimated credits: {result['estimated_credits']}.")
    print("Staging only: no Supabase writes, migrations, or imports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
