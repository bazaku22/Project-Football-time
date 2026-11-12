#!/usr/bin/env python3
"""Offline reconciliation reports for StrikerAPI 2026/27 squad staging data.

This tool only creates review candidates. It never assigns canonical IDs,
merges identities, calls providers, or writes to Supabase.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

LEAGUE_IDS = {"PL", "PD", "BL1", "SA", "FL1"}


def norm(value: object) -> str:
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def load_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected a JSON object")
    return value


def validate_inputs(staging: dict, football_db: dict) -> list[dict]:
    if staging.get("season") != "2026/27":
        raise ValueError("staging season must be 2026/27")
    if staging.get("status") != "staging_only" or staging.get("production_import") is not False:
        raise ValueError("input must be a staging-only StrikerAPI snapshot")
    players = staging.get("players")
    teams = football_db.get("teams")
    if not isinstance(players, list) or not players:
        raise ValueError("staging players must be a non-empty array")
    if not isinstance(teams, list):
        raise ValueError("football database teams must be an array")
    for row in players:
        if not isinstance(row, dict):
            raise ValueError("every staging player row must be an object")
        if row.get("provider") != "strikerapi" or not row.get("provider_player_id"):
            raise ValueError("every row needs provider=strikerapi and provider_player_id")
        if row.get("season") != "2026/27" or row.get("league_id") not in LEAGUE_IDS:
            raise ValueError("every player row must belong to a supported 2026/27 league")
    return teams


def team_candidates(players: list[dict], teams: list[dict]) -> list[dict]:
    observations = {}
    for row in players:
        key = (row["league_id"], str(row.get("provider_team_id") or ""), str(row.get("provider_team_name") or ""))
        observations[key] = row
    output = []
    for (league_id, provider_team_id, provider_team_name), row in sorted(observations.items()):
        matches = []
        source_name = norm(provider_team_name)
        if source_name:
            for team in teams:
                # The database catalogue stores league membership separately.
                team_leagues = {
                    membership.get("leagueId")
                    for membership in []  # populated below from team_seasons
                }
                # League filtering is applied using the database teamSeasons table in main().
                if source_name in {norm(team.get("name")), norm(team.get("shortName"))}:
                    matches.append(team)
        matches.sort(key=lambda item: str(item.get("id", "")))
        output.append({
            "league_id": league_id,
            "provider_team_id": provider_team_id,
            "provider_team_name": provider_team_name,
            "candidate_team_ids": ";".join(str(x.get("id", "")) for x in matches),
            "candidate_team_names": ";".join(str(x.get("name", "")) for x in matches),
            "candidate_count": len(matches),
            "status": "exact_name_candidate_needs_review" if len(matches) == 1 else (
                "ambiguous_exact_name_candidates" if matches else "unmatched_needs_manual_alias"),
            "canonical_team_id": "",
            "review_required": "true",
            "note": "Name match is advisory only; no canonical team ID was assigned."
        })
    return output


def build_team_report(players: list[dict], football_db: dict, provider_reference: dict | None = None) -> list[dict]:
    teams = football_db["teams"]
    memberships = football_db.get("teamSeasons", [])
    if not isinstance(memberships, list):
        raise ValueError("football database teamSeasons must be an array")
    season_members = {
        (m.get("leagueId"), m.get("teamId"))
        for m in memberships if m.get("season") in {"2026-2027", "2026/27"}
    }
    # Only compare teams registered in the same league and target season.
    filtered = []
    for team in teams:
        if any((league, team.get("id")) in season_members for league in LEAGUE_IDS):
            filtered.append(team)
    reference_lookup = {}
    if provider_reference is not None:
        if provider_reference.get("season") != "2026/27" or provider_reference.get("provider") != "strikerapi":
            raise ValueError("provider team reference must be StrikerAPI 2026/27 data")
        if provider_reference.get("status") != "reference_only" or provider_reference.get("production_import") is not False:
            raise ValueError("provider team reference must be reference-only")
        reference_rows = provider_reference.get("teams")
        if not isinstance(reference_rows, list):
            raise ValueError("provider team reference teams must be an array")
        for ref in reference_rows:
            key = (ref.get("league_id"), str(ref.get("provider_team_id") or ""))
            if not key[1] or key in reference_lookup:
                raise ValueError(f"invalid or duplicate provider team reference key: {key}")
            reference_lookup[key] = ref
    result = []
    seen = set()
    for row in players:
        key = (row.get("league_id"), str(row.get("provider_team_id") or ""), str(row.get("provider_team_name") or ""))
        if key in seen:
            continue
        seen.add(key)
        league_id, provider_id, provider_name = key
        provider_ref = reference_lookup.get((league_id, provider_id))
        provider_values = {norm(provider_name)} if provider_name else set()
        if provider_ref:
            provider_values.update(norm(provider_ref.get(field)) for field in (
                "name", "display_name", "short_name", "abbrev"
            ) if provider_ref.get(field))
        provider_values.discard("")
        candidates = []
        match_bases = {}
        for team in filtered:
            if (league_id, team.get("id")) not in season_members:
                continue
            canonical_values = {
                norm(team.get("name")), norm(team.get("shortName")), norm(team.get("tla"))
            }
            canonical_values.discard("")
            if provider_values & canonical_values:
                candidates.append(team)
                match_bases[str(team.get("id", ""))] = "exact_normalized_provider_reference_name_or_abbreviation"
        candidates.sort(key=lambda item: str(item.get("id", "")))
        result.append({
            "league_id": league_id,
            "provider_team_id": provider_id,
            "provider_team_name": provider_name,
            "provider_team_official_name": (provider_ref or {}).get("name", ""),
            "provider_team_abbrev": (provider_ref or {}).get("abbrev", ""),
            "provider_reference_found": "true" if provider_ref else "false",
            "candidate_team_ids": ";".join(str(x.get("id", "")) for x in candidates),
            "candidate_team_names": ";".join(str(x.get("name", "")) for x in candidates),
            "candidate_count": len(candidates),
            "candidate_match_basis": ";".join(match_bases.values()),
            "status": "exact_name_candidate_needs_review" if len(candidates) == 1 else (
                "ambiguous_exact_name_candidates" if candidates else "unmatched_needs_manual_alias"),
            "canonical_team_id": "",
            "review_required": "true",
            "note": "Provider list_teams identity and exact normalized name/abbreviation comparison are advisory only; human approval required."
        })
    return sorted(result, key=lambda x: (x["league_id"], x["provider_team_name"] or "", x["provider_team_id"]))


def build_player_report(players: list[dict]) -> list[dict]:
    grouped = defaultdict(list)
    for row in players:
        grouped[(row["provider"], str(row["provider_player_id"]))].append(row)
    result = []
    for (provider, provider_id), rows in sorted(grouped.items()):
        names = sorted({str(r.get("full_name") or "") for r in rows if r.get("full_name")})
        teams = sorted({str(r.get("provider_team_id") or "") for r in rows if r.get("provider_team_id")})
        leagues = sorted({str(r.get("league_id") or "") for r in rows})
        conflicting = len(names) > 1 or len(teams) > 1
        repeated = len(rows) > 1
        result.append({
            "provider": provider,
            "provider_player_id": provider_id,
            "player_name_variants": ";".join(names),
            "membership_observations": len(rows),
            "league_ids": ";".join(leagues),
            "provider_team_ids": ";".join(teams),
            "status": "conflicting_identity_observations" if repeated and conflicting else (
                "repeated_identity_needs_review" if repeated else "single_observation_needs_canonical_review"),
            "canonical_player_id": "",
            "review_required": "true",
            "note": "No canonical identity assigned; repeated provider IDs and all first observations require review."
        })
    return result


def write_csv(path: Path, rows: list[dict], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def run(staging: dict, football_db: dict, provider_reference: dict | None = None) -> dict:
    teams = validate_inputs(staging, football_db)
    players = staging["players"]
    team_rows = build_team_report(players, football_db, provider_reference)
    player_rows = build_player_report(players)
    team_counts = defaultdict(int)
    for row in team_rows:
        team_counts[row["status"]] += 1
    player_counts = defaultdict(int)
    for row in player_rows:
        player_counts[row["status"]] += 1
    return {
        "schema_version": 1,
        "season": "2026/27",
        "preview_only": True,
        "input_memberships": len(players),
        "unique_provider_players": len(player_rows),
        "team_observations": len(team_rows),
        "team_status_counts": dict(sorted(team_counts.items())),
        "player_status_counts": dict(sorted(player_counts.items())),
        "canonical_player_ids_assigned": 0,
        "canonical_team_ids_assigned": 0,
        "automatic_merges": 0,
        "provider_api_calls": 0,
        "supabase_writes": 0,
        "supabase_migrations": 0,
        "production_import": False,
        "team_registry_records_considered": len(teams),
        "provider_team_reference_records": len(provider_reference.get("teams", [])) if provider_reference else 0,
        "provider_team_reference_api_calls": provider_reference.get("provider_api_calls", 0) if provider_reference else 0,
        "provider_team_reference_estimated_credits": provider_reference.get("estimated_credits", 0) if provider_reference else 0,
        "total_provider_api_calls": provider_reference.get("provider_api_calls", 0) if provider_reference else 0,
        "limitations": [
            "Exact normalized team-name matches are candidates only and require human review.",
            "No fuzzy matching, alias inference, canonical ID assignment, or automatic player merge is performed.",
            "Player identity is grouped only by exact (provider, provider_player_id).",
            "Provider access does not independently establish third-party data reuse rights."
        ],
        "_team_rows": team_rows,
        "_player_rows": player_rows
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staging", required=True, type=Path, help="StrikerAPI staging JSON")
    parser.add_argument("--football-db", required=True, type=Path, help="Football Time football-database.json")
    parser.add_argument("--provider-teams", type=Path, help="Optional StrikerAPI list_teams 2026/27 reference JSON")
    parser.add_argument("--out-dir", type=Path, default=Path("data/staging/reconciliation-2026-27"))
    args = parser.parse_args()
    try:
        provider_reference = load_json(args.provider_teams) if args.provider_teams else None
        result = run(load_json(args.staging), load_json(args.football_db), provider_reference)
        args.out_dir.mkdir(parents=True, exist_ok=True)
        team_rows, player_rows = result.pop("_team_rows"), result.pop("_player_rows")
        write_csv(args.out_dir / "team-mapping-review-2026-27.csv", team_rows, [
            "league_id", "provider_team_id", "provider_team_name",
            "provider_team_official_name", "provider_team_abbrev", "provider_reference_found",
            "candidate_team_ids", "candidate_team_names", "candidate_count", "candidate_match_basis",
            "status", "canonical_team_id", "review_required", "note"])
        write_csv(args.out_dir / "player-identity-review-2026-27.csv", player_rows, [
            "provider", "provider_player_id", "player_name_variants", "membership_observations",
            "league_ids", "provider_team_ids", "status", "canonical_player_id", "review_required", "note"])
        (args.out_dir / "reconciliation-summary-2026-27.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError, KeyError) as exc:
        print(f"RECONCILIATION FAILED: {exc}", file=sys.stderr)
        return 2
    print(f"Player memberships: {result['input_memberships']}")
    print(f"Unique provider players: {result['unique_provider_players']}")
    print(f"Team observations: {result['team_observations']}")
    print("Preview only — no canonical IDs, merges, provider calls or database writes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
