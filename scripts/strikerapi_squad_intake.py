#!/usr/bin/env python3
"""Build a StrikerAPI current-squad staging snapshot for 2026/27.

Offline fixture mode is the default. Live mode makes exactly five get_squad
requests (one per league, 50 credits at the documented 10-credit cost each).
The output is staging-only: it assigns no canonical IDs and never writes to
Supabase or the public player database.
"""
from __future__ import annotations
import argparse, json, os, sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_URL = "https://mcp.strikerapi.com/v1/get_squad"
LEAGUES = {
    "PL": {"api": "soccer", "name": "Premier League"},
    "PD": {"api": "laliga", "name": "La Liga"},
    "BL1": {"api": "bundesliga", "name": "Bundesliga"},
    "SA": {"api": "seriea", "name": "Serie A"},
    "FL1": {"api": "ligue1", "name": "Ligue 1"},
}
TARGET_SEASON = "2026/27"
CREDIT_COST_PER_LEAGUE = 10

def season_label(value: Any) -> str:
    text = str(value or "").strip()
    if text == TARGET_SEASON: return text
    if text == "2026": return TARGET_SEASON
    if text.isdigit() and len(text) == 4:
        year = int(text)
        return f"{year}/{str((year + 1) % 100).zfill(2)}"
    return text

def load_fixture(path: str) -> dict[str, Any]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, dict): raise ValueError("fixture must be a JSON object keyed by league code")
    return payload

def fetch_squad(league: str) -> dict[str, Any]:
    key = os.environ.get("STRIKERAPI_API_KEY", "").strip()
    if not key: raise ValueError("STRIKERAPI_API_KEY is required for --fetch")
    try: import requests
    except ImportError as exc: raise ValueError("requests is required for --fetch") from exc
    response = requests.post(BASE_URL, headers={"x-api-key": key, "Content-Type": "application/json"},
                             json={"league": league}, timeout=60)
    if response.status_code == 402: raise RuntimeError("STRIKERAPI_CREDITS_EXHAUSTED")
    if response.status_code == 429: raise RuntimeError("STRIKERAPI_RATE_LIMITED")
    response.raise_for_status()
    body = response.json()
    if isinstance(body, dict) and body.get("error"):
        raise RuntimeError(str(body.get("message") or body["error"]))
    data = body.get("data", body) if isinstance(body, dict) else body
    if not isinstance(data, dict): raise ValueError(f"unexpected get_squad response for {league}")
    return data

def normalize(fixtures: dict[str, Any], collected_at: str | None = None, live: bool = False) -> dict[str, Any]:
    unknown = set(fixtures) - set(LEAGUES)
    if unknown: raise ValueError(f"unsupported league codes: {', '.join(sorted(unknown))}")
    missing = set(LEAGUES) - set(fixtures)
    if missing: raise ValueError(f"missing five-league squad payloads: {', '.join(sorted(missing))}")
    stamp = collected_at or datetime.now(timezone.utc).isoformat()
    rows, counts = [], {}
    observations: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for league_id, config in LEAGUES.items():
        payload = fixtures[league_id]
        if not isinstance(payload, dict): raise ValueError(f"{league_id} payload must be an object")
        payload = payload.get("data", payload)
        if not isinstance(payload, dict): raise ValueError(f"{league_id} data must be an object")
        season = season_label(payload.get("season"))
        if season != TARGET_SEASON: raise ValueError(f"{league_id} returned season {season!r}; expected {TARGET_SEASON}")
        players = payload.get("players")
        if not isinstance(players, list) or not players: raise ValueError(f"{league_id} must contain a non-empty players array")
        league_rows = 0
        for player in players:
            if not isinstance(player, dict): raise ValueError(f"{league_id} player entries must be objects")
            provider_id, name = str(player.get("player_id") or "").strip(), str(player.get("name") or "").strip()
            if not provider_id or not name: raise ValueError(f"{league_id} player is missing player_id or name")
            team_id = str(player.get("team_id") or payload.get("team_id") or "").strip()
            team_name = str(player.get("team_name") or player.get("team") or payload.get("team_name") or "").strip()
            position = player.get("position")
            if isinstance(position, dict): position = position.get("name") or position.get("label")
            jersey, age = player.get("jersey"), player.get("age")
            observations[provider_id].append({
                "league_id": league_id, "league_name": config["name"],
                "name": name, "provider_team_id": team_id or None,
                "provider_team_name": team_name or None
            })
            rows.append({
                "provider":"strikerapi", "provider_player_id":provider_id,
                "provider_identity_key":f"strikerapi:{provider_id}", "canonical_player_id":None,
                "full_name":name, "age":age if isinstance(age,(int,float)) and not isinstance(age,bool) else None,
                "nationality":player.get("citizenship") or player.get("nationality"),
                "position":str(position).strip() if position not in (None,"") else None,
                "shirt_number":jersey if isinstance(jersey,(int,str)) else None,
                "league_id":league_id, "league_name":config["name"], "season":TARGET_SEASON,
                "provider_team_id":team_id or None, "provider_team_name":team_name or None,
                "canonical_team_id":None, "team_mapping_status":"needs_exact_team_id_review",
                "provider_identity_status":"pending_cross_league_review",
                "squad_level":"unknown", "membership_status":"provider_current_squad_observation",
                "source":{"provider":"StrikerAPI","endpoint":"get_squad","league_parameter":config["api"],
                          "provider_player_id":provider_id,"provider_team_id":team_id or None,
                          "season_value":str(payload.get("season")),"collected_at":stamp,"rights_status":"manual_review"}
            })
            league_rows += 1
        counts[league_id] = league_rows

    duplicate_reports = []
    master_candidates = []
    for provider_id, items in observations.items():
        leagues = sorted({x["league_id"] for x in items})
        names = sorted({x["name"] for x in items})
        teams = sorted({x["provider_team_id"] for x in items if x["provider_team_id"]})
        is_repeated = len(items) > 1
        conflict = len(names) > 1 or len(teams) > 1
        identity_status = "needs_manual_review" if is_repeated else "single_observation"
        if is_repeated:
            duplicate_reports.append({
                "provider": "strikerapi", "provider_player_id": provider_id,
                "observation_count": len(items), "leagues": leagues, "names": names,
                "provider_team_ids": teams,
                "review_status": "conflicting_identity_observations" if conflict else "repeated_across_leagues",
                "note": "Preserved as one provider identity candidate with separate league membership observations; do not auto-assign a canonical player ID."
            })
        master_candidates.append({
            "provider": "strikerapi", "provider_player_id": provider_id,
            "provider_identity_key": f"strikerapi:{provider_id}", "canonical_player_id": None,
            "name_variants": names, "membership_observation_count": len(items),
            "league_ids": leagues, "provider_team_ids": teams,
            "identity_review_status": identity_status if is_repeated else "pending_canonical_identity_review"
        })
    for row in rows:
        count = len(observations[row["provider_player_id"]])
        row["provider_identity_status"] = "needs_manual_review" if count > 1 else "single_observation"

    return {
        "schemaVersion":1,"type":"strikerapi_current_squad_intake","status":"staging_only",
        "season":TARGET_SEASON,"production_import":False,"supabase_writes":0,"supabase_migrations":0,
        "canonical_ids_assigned":0,"provider_api_calls":len(LEAGUES) if live else 0,
        "estimated_credits":len(LEAGUES)*CREDIT_COST_PER_LEAGUE if live else 0,"generated_at":stamp,
        "source":{"provider":"StrikerAPI","endpoint":"get_squad","rights_status":"manual_review",
                  "rights_note":"Provider access is not blanket clearance for third-party competition/database rights. Review intended use before import."},
        "coverage":{"leagues":counts,"total_player_memberships":len(rows),
                    "unique_provider_players":len(master_candidates),"repeated_provider_ids":len(duplicate_reports),
                    "all_five_leagues_present":set(counts)==set(LEAGUES)},
        "player_master_candidates":master_candidates,
        "duplicate_provider_id_review":duplicate_reports,
        "players":rows,
        "limitations":[
            "Provider player IDs are source identities, not Football Time canonical IDs.",
            "Repeated provider IDs across league payloads are preserved as separate membership observations and flagged for review, not discarded or auto-merged.",
            "Provider team IDs are not treated as Football Time team IDs; exact mapping review is required.",
            "Squad level remains unknown unless independently evidenced; get_squad presence alone does not prove first-team registration.",
            "Missing fields remain null; no values are inferred from player names.",
            "Rights status remains manual_review; this staging file is not approved for Production import."
        ]
    }

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    source=parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input",help="Offline JSON fixture keyed by PL, PD, BL1, SA, FL1")
    source.add_argument("--fetch",action="store_true",help="Fetch all five league squads (50 credits)")
    parser.add_argument("--output",type=Path,default=Path("data/staging/strikerapi-current-squads-2026-27.json"))
    args=parser.parse_args()
    try:
        fixtures={code:fetch_squad(config["api"]) for code,config in LEAGUES.items()} if args.fetch else load_fixture(args.input)
        result=normalize(fixtures,live=args.fetch)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    except (OSError,json.JSONDecodeError,ValueError,RuntimeError) as exc:
        print(f"ERROR: {exc}",file=sys.stderr); return 2
    print(f"Staged {result['coverage']['total_player_memberships']} player memberships.")
    print(f"Unique provider players: {result['coverage']['unique_provider_players']}; repeated IDs flagged: {result['coverage']['repeated_provider_ids']}.")
    print(f"Provider API calls: {result['provider_api_calls']}; estimated credits: {result['estimated_credits']}.")
    print("Staging only: no canonical ID assignment, Supabase writes, migrations, or imports.")
    return 0

if __name__=="__main__": raise SystemExit(main())
