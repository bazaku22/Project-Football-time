#!/usr/bin/env python3
"""Fetch upcoming Asian handicap reference lines from The Odds API.

One request per supported league, one region and one market per daily run.
The API key is read only from the environment and is never written to disk.
"""
from __future__ import annotations

import json
import os
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROVIDER = "The Odds API"
BASE_URL = "https://api.the-odds-api.com/v4/sports"
REGION = "eu"
MARKET = "spreads"
OUTPUT = Path("data/asian-handicap-odds.json")
LEAGUES = {
    "PL": ("soccer_epl", "Premier League"),
    "PD": ("soccer_spain_la_liga", "La Liga"),
    "BL1": ("soccer_germany_bundesliga", "Bundesliga"),
    "SA": ("soccer_italy_serie_a", "Serie A"),
    "FL1": ("soccer_france_ligue_one", "Ligue 1"),
}


def parse_event(event: dict, league_id: str, league_name: str) -> dict | None:
    home, away = event.get("home_team"), event.get("away_team")
    if not isinstance(home, str) or not isinstance(away, str):
        return None
    bookmakers = []
    for bookmaker in event.get("bookmakers", []):
        for market in bookmaker.get("markets", []):
            if market.get("key") != MARKET:
                continue
            outcomes = market.get("outcomes", [])
            home_outcome = next((x for x in outcomes if x.get("name") == home), None)
            away_outcome = next((x for x in outcomes if x.get("name") == away), None)
            if not home_outcome or not away_outcome:
                continue
            point = home_outcome.get("point")
            away_point = away_outcome.get("point")
            if not isinstance(point, (int, float)) or not isinstance(away_point, (int, float)):
                continue
            if abs(float(point) + float(away_point)) > 0.02:
                continue
            bookmakers.append({
                "bookmaker": str(bookmaker.get("title") or bookmaker.get("key") or "ไม่ระบุ"),
                "lastUpdate": market.get("last_update"),
                "homeLine": float(point),
                "awayLine": float(away_point),
            })
    if not bookmakers:
        return None
    lines = sorted(x["homeLine"] for x in bookmakers)
    return {
        "id": event.get("id"),
        "leagueId": league_id,
        "league": league_name,
        "sportKey": event.get("sport_key"),
        "homeTeam": home,
        "awayTeam": away,
        "commenceTime": event.get("commence_time"),
        "provider": PROVIDER,
        "bookmakers": bookmakers,
        "referenceHomeLine": float(statistics.median(lines)),
        "referenceAwayLine": float(-statistics.median(lines)),
    }


def request_league(sport_key: str, api_key: str, start: datetime, end: datetime):
    query = urlencode({
        "apiKey": api_key,
        "regions": REGION,
        "markets": MARKET,
        "oddsFormat": "decimal",
        "dateFormat": "iso",
        "commenceTimeFrom": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commenceTimeTo": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    req = Request(f"{BASE_URL}/{sport_key}/odds/?{query}", headers={"User-Agent": "Project-Football-Time/5.7"})
    with urlopen(req, timeout=35) as response:
        payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, list):
            raise ValueError(f"Unexpected API payload for {sport_key}")
        headers = {key.lower(): value for key, value in response.headers.items()}
        quota = {
            "remaining": int(headers["x-requests-remaining"]) if headers.get("x-requests-remaining", "").isdigit() else None,
            "used": int(headers["x-requests-used"]) if headers.get("x-requests-used", "").isdigit() else None,
            "last": int(headers["x-requests-last"]) if headers.get("x-requests-last", "").isdigit() else None,
        }
        return payload, quota


def main() -> int:
    api_key = os.environ.get("THE_ODDS_API_KEY", "").strip()
    if not api_key:
        print("THE_ODDS_API_KEY is missing; refusing to run.", file=sys.stderr)
        return 2
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)
    events, quotas = [], []
    for index, (league_id, (sport_key, league_name)) in enumerate(LEAGUES.items()):
        try:
            payload, quota = request_league(sport_key, api_key, now, end)
        except HTTPError as exc:
            try:
                body = json.loads(exc.read().decode("utf-8"))
                detail = str(body.get("message") or body.get("error_code") or body.get("error") or "")
            except (ValueError, UnicodeDecodeError):
                detail = ""
            detail = detail.replace(api_key, "[redacted]")[:240]
            print(f"Odds request failed for {league_id}: HTTP {exc.code}. {detail} (API key and URL hidden).", file=sys.stderr)
            return 1
        except URLError as exc:
            print(f"Odds request failed for {league_id}: network error ({type(exc.reason).__name__}).", file=sys.stderr)
            return 1
        except (TimeoutError, ValueError) as exc:
            print(f"Odds request failed for {league_id}: {type(exc).__name__}: {exc}", file=sys.stderr)
            return 1
        quotas.append(quota)
        requests_still_needed = len(LEAGUES) - index - 1
        if quota["remaining"] is not None and quota["remaining"] < requests_still_needed:
            print("Quota is too low to complete all five leagues; preserving the previous data file.")
            return 0
        for item in payload:
            normalized = parse_event(item, league_id, league_name)
            if normalized:
                events.append(normalized)
        print(f"{league_id}: {len(payload)} events received, {sum(x['leagueId'] == league_id for x in events)} with usable handicap lines")
    remaining_values = [x["remaining"] for x in quotas if x["remaining"] is not None]
    used_values = [x["used"] for x in quotas if x["used"] is not None]
    data = {
        "schemaVersion": 1,
        "provider": PROVIDER,
        "market": MARKET,
        "region": REGION,
        "fetchedAt": now.isoformat().replace("+00:00", "Z"),
        "windowDays": 7,
        "quota": {
            "remaining": min(remaining_values) if remaining_values else None,
            "used": max(used_values) if used_values else None,
            "last": sum(x["last"] or 0 for x in quotas),
            "requestsPerRun": len(LEAGUES),
        },
        "events": sorted(events, key=lambda x: x["commenceTime"] or ""),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(events)} matches with handicap lines to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
