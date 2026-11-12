#!/usr/bin/env python3
"""Fetch one isolated UEFA Nations League Asian Handicap snapshot.

Exactly one The Odds API request per manual run. Never touches club odds,
club fixtures, production history, Local Storage, or Supabase.
"""
from __future__ import annotations
import json, os, statistics, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROVIDER = "The Odds API"
SPORT_KEY = "soccer_uefa_nations_league"
REGION = "eu"
MARKET = "spreads"
FIXTURES_FILE = Path("data/experimental/international-r1/fixtures.json")
ALIASES_FILE = Path("data/experimental/international-r1/team-aliases.json")
OUTPUT = Path("data/experimental/international-r1/handicap-reference.json")
BASE_URL = "https://api.the-odds-api.com/v4/sports"

def parse_time(value):
    if not value: return None
    try: return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except (TypeError, ValueError): return None

def canonical_team(value, aliases):
    normalized = " ".join(str(value or "").casefold().split())
    for row in aliases.get("canonical_teams", []):
        if normalized == " ".join(row["canonical_name"].casefold().split()): return row["team_id"]
    for row in aliases.get("aliases", []):
        if normalized == " ".join(row["source_name"].casefold().split()): return row["canonical_team_id"]
    return ""

def match_fixture(event, fixtures, aliases):
    home_id, away_id = canonical_team(event.get("home_team"), aliases), canonical_team(event.get("away_team"), aliases)
    kickoff = parse_time(event.get("commence_time"))
    if not home_id or not away_id or not kickoff: return None
    candidates = []
    for fixture in fixtures:
        if fixture.get("match_type") != "nations_league": continue
        fixture_time = parse_time(fixture.get("kickoff_utc"))
        if not fixture_time: continue
        if canonical_team(fixture.get("home_team"), aliases) != home_id: continue
        if canonical_team(fixture.get("away_team"), aliases) != away_id: continue
        if abs((fixture_time - kickoff).total_seconds()) > 6 * 60 * 60: continue
        candidates.append(fixture)
    return candidates[0] if len(candidates) == 1 else None

def parse_event(event, fixtures, aliases):
    fixture = match_fixture(event, fixtures, aliases)
    if not fixture: return None
    home, away, bookmakers = event.get("home_team"), event.get("away_team"), []
    for bookmaker in event.get("bookmakers", []):
        for market in bookmaker.get("markets", []):
            if market.get("key") != MARKET: continue
            outcomes = market.get("outcomes", [])
            h = next((x for x in outcomes if x.get("name") == home), None)
            a = next((x for x in outcomes if x.get("name") == away), None)
            if not h or not a: continue
            hp, ap = h.get("point"), a.get("point")
            if not isinstance(hp, (int, float)) or not isinstance(ap, (int, float)): continue
            if abs(float(hp) + float(ap)) > 0.02: continue
            bookmakers.append({"bookmaker": str(bookmaker.get("title") or bookmaker.get("key") or "ไม่ระบุ"),
                               "lastUpdate": market.get("last_update"),
                               "homeLine": float(hp), "awayLine": float(ap)})
    if not bookmakers: return None
    ref_home = float(statistics.median_low(sorted(x["homeLine"] for x in bookmakers)))
    return {"fixtureId": fixture["id"], "providerEventId": event.get("id"),
            "sportKey": event.get("sport_key") or SPORT_KEY, "homeTeam": home, "awayTeam": away,
            "commenceTime": event.get("commence_time"), "provider": PROVIDER,
            "bookmakers": bookmakers, "referenceHomeLine": ref_home, "referenceAwayLine": -ref_home}

def request_nations_league(api_key, start, end):
    query = urlencode({"apiKey": api_key, "regions": REGION, "markets": MARKET,
        "oddsFormat": "decimal", "dateFormat": "iso",
        "commenceTimeFrom": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commenceTimeTo": end.strftime("%Y-%m-%dT%H:%M:%SZ")})
    req = Request(f"{BASE_URL}/{SPORT_KEY}/odds/?{query}",
                  headers={"User-Agent": "Project-Football-Time/6.7"})
    with urlopen(req, timeout=35) as response:
        payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, list): raise ValueError("Unexpected Nations League odds payload")
        headers = {k.lower(): v for k, v in response.headers.items()}
        quota = {name: int(headers[key]) if headers.get(key, "").isdigit() else None
                 for name, key in (("remaining", "x-requests-remaining"), ("used", "x-requests-used"), ("last", "x-requests-last"))}
        return payload, quota

def build_dataset(payload, fixtures_data, aliases, fetched_at, quota):
    selected, matched, unmatched = [], set(), 0
    for event in payload:
        record = parse_event(event, fixtures_data.get("fixtures", []), aliases)
        if not record or record["fixtureId"] in matched:
            unmatched += 1
            continue
        matched.add(record["fixtureId"])
        selected.append(record)
    return {"schemaVersion": 1, "datasetId": fixtures_data.get("dataset_id"),
        "datasetStatus": "experimental_isolated_provider_handicap_reference",
        "competition": "UEFA Nations League", "sportKey": SPORT_KEY, "provider": PROVIDER,
        "market": MARKET, "region": REGION,
        "fetchedAt": fetched_at.isoformat().replace("+00:00", "Z"),
        "apiRequestsThisRun": 1, "quota": quota, "eventCountReceived": len(payload),
        "matchedFixtureCount": len(selected), "unmatchedOrDuplicateEventCount": unmatched,
        "events": sorted(selected, key=lambda row: row["commenceTime"] or ""),
        "usageNote": "Experimental reference data only. No bookmaker prices, betting advice, or production club data."}

def main():
    api_key = os.environ.get("THE_ODDS_API_KEY", "").strip()
    if not api_key:
        print("THE_ODDS_API_KEY is missing; refusing to run.", file=sys.stderr); return 2
    try:
        fixtures = json.loads(FIXTURES_FILE.read_text(encoding="utf-8"))
        aliases = json.loads(ALIASES_FILE.read_text(encoding="utf-8"))
        now = datetime.now(timezone.utc)
        payload, quota = request_nations_league(api_key, now, now + timedelta(days=14))
        data = build_dataset(payload, fixtures, aliases, now, quota)
    except HTTPError as exc:
        print(f"Nations League odds request failed: HTTP {exc.code}. API key and URL hidden.", file=sys.stderr); return 1
    except URLError as exc:
        print(f"Nations League odds request failed: network error ({type(exc.reason).__name__}).", file=sys.stderr); return 1
    except (OSError, ValueError, KeyError) as exc:
        print(f"Nations League odds sync failed: {type(exc).__name__}: {exc}", file=sys.stderr); return 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Saved {data['matchedFixtureCount']} isolated Nations League Handicap references; exactly one API request used.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
