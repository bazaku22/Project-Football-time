#!/usr/bin/env python3
"""Fetch five-league StrikerAPI team reference data for 2026/27 (5 credits)."""
from __future__ import annotations
import argparse, json, os, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_URL = "https://mcp.strikerapi.com/v1/list_teams"
LEAGUES = {"PL": "soccer", "PD": "laliga", "BL1": "bundesliga", "SA": "seriea", "FL1": "ligue1"}
SEASON = 2026


def fetch_league(league: str) -> dict[str, Any]:
    key = os.environ.get("STRIKERAPI_API_KEY", "").strip()
    if not key:
        raise ValueError("STRIKERAPI_API_KEY is required")
    try:
        import requests
    except ImportError as exc:
        raise ValueError("requests is required") from exc
    response = requests.post(
        BASE_URL, headers={"x-api-key": key, "Content-Type": "application/json"},
        json={"season": SEASON, "league": league}, timeout=60,
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
    if not isinstance(data, dict) or not isinstance(data.get("teams"), list) or not data["teams"]:
        raise ValueError(f"unexpected list_teams response for {league}")
    if str(data.get("season")) != str(SEASON):
        raise ValueError(f"{league} returned season {data.get('season')!r}; expected {SEASON}")
    return data


def normalize(payloads: dict[str, dict[str, Any]], collected_at: str | None = None) -> dict[str, Any]:
    if set(payloads) != set(LEAGUES):
        raise ValueError("team reference must include exactly PL, PD, BL1, SA and FL1")
    teams, seen = [], set()
    for league_id, api_league in LEAGUES.items():
        payload = payloads[league_id]
        if str(payload.get("season")) != str(SEASON):
            raise ValueError(f"{league_id} team reference season must be {SEASON}")
        rows = payload.get("teams")
        if not isinstance(rows, list) or not rows:
            raise ValueError(f"{league_id} teams must be a non-empty array")
        for row in rows:
            if not isinstance(row, dict) or not str(row.get("team_id") or "").strip():
                raise ValueError(f"{league_id} contains a team without team_id")
            key = (league_id, str(row["team_id"]))
            if key in seen:
                raise ValueError(f"duplicate provider team ID {key}")
            seen.add(key)
            teams.append({
                "league_id": league_id, "api_league": api_league,
                "provider_team_id": str(row["team_id"]),
                "abbrev": str(row.get("abbrev") or "").strip(),
                "name": str(row.get("name") or "").strip(),
                "display_name": str(row.get("display_name") or "").strip(),
                "short_name": str(row.get("short_name") or "").strip(),
            })
    return {
        "schema_version": 1, "season": "2026/27", "provider": "strikerapi",
        "endpoint": "list_teams", "status": "reference_only", "production_import": False,
        "provider_api_calls": 5, "estimated_credits": 5,
        "collected_at": collected_at or datetime.now(timezone.utc).isoformat(),
        "teams": teams,
        "limitations": [
            "Provider team names and IDs are reference observations, not Football Time canonical IDs.",
            "Name-based cross-provider matches remain candidates requiring human review.",
            "No canonical IDs, aliases, player memberships or database records are written.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/staging/strikerapi-team-reference-2026-27.json"))
    args = parser.parse_args()
    try:
        payloads = {code: fetch_league(api) for code, api in LEAGUES.items()}
        result = normalize(payloads)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"TEAM REFERENCE FETCH FAILED: {exc}", file=sys.stderr)
        return 2
    print(f"Provider team reference rows: {len(result['teams'])}")
    print("Provider calls: 5; estimated credits: 5; staging only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
