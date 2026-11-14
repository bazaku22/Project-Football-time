#!/usr/bin/env python3
"""Validate manual FootballSquads roster intake without touching production."""
from __future__ import annotations

import json
import sys
from pathlib import Path

EXPECTED_LEAGUE_COUNTS = {"PL": 20, "PD": 20, "BL1": 18, "SA": 20, "FL1": 18}
ATTRIBUTION = (
    "Source of Material is http://www.footballsquads.com. Material: "
    "© FootballSquads.com, 1999 - , All Rights Reserved"
)


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    if data.get("schema_version") != 1:
        errors.append("schema_version must equal 1")
    if data.get("season") != "2026/27":
        errors.append("season must equal 2026/27")
    if data.get("status") not in {"partial_research_only", "complete_research_only"}:
        errors.append("status must remain research-only")
    if data.get("production_import") is not False:
        errors.append("production_import must be false")
    if data.get("provider_api_calls") != 0:
        errors.append("provider_api_calls must equal 0")
    if data.get("club_pages_target") != sum(EXPECTED_LEAGUE_COUNTS.values()):
        errors.append("club_pages_target must equal 96")
    if data.get("attribution") != ATTRIBUTION:
        errors.append("publisher attribution must match the required notice")

    sources = data.get("sources")
    rows = data.get("memberships")
    if not isinstance(sources, list) or not sources:
        errors.append("sources must be a non-empty list")
        sources = []
    if not isinstance(rows, list):
        errors.append("memberships must be a list")
        rows = []
    source_ids: set[str] = set()
    source_by_id: dict[str, dict] = {}
    clubs: set[tuple[str, str]] = set()
    for source in sources:
        if not isinstance(source, dict):
            errors.append("every source must be an object")
            continue
        source_id = source.get("id")
        if not source_id or source_id in source_ids:
            errors.append(f"source id missing or duplicated: {source_id}")
            continue
        source_ids.add(source_id)
        source_by_id[source_id] = source
        if source.get("league_id") not in EXPECTED_LEAGUE_COUNTS:
            errors.append(f"source {source_id} has unsupported league")
        if not (str(source.get("url", "")).startswith("https://www.footballsquads.co.uk/") or str(source.get("url", "")).startswith("https://footballsquads.co.uk/")):
            errors.append(f"source {source_id} must use a FootballSquads HTTPS page")
        if source.get("collection_method") != "manual_transcription":
            errors.append(f"source {source_id} must be manually transcribed")
        if source.get("automated_extraction") is not False:
            errors.append(f"source {source_id} must not use automated extraction")
        if not source.get("observed_at") or not source.get("current_roster_boundary"):
            errors.append(f"source {source_id} needs observation date and roster boundary")
        if source.get("terms_url") != "https://footballsquads.co.uk/tou.htm":
            errors.append(f"source {source_id} must retain the terms URL")
        if source.get("reuse_basis") is None:
            errors.append(f"source {source_id} needs a documented reuse basis")
        clubs.add((source.get("league_id"), source.get("provider_team_id")))

    seen_ids: set[str] = set()
    seen_memberships: set[tuple[str, str, str]] = set()
    for row in rows:
        if not isinstance(row, dict):
            errors.append("every membership must be an object")
            continue
        row_id = row.get("id")
        if not row_id or row_id in seen_ids:
            errors.append(f"membership id missing or duplicated: {row_id}")
        seen_ids.add(row_id)
        if row.get("season") != "2026/27":
            errors.append(f"membership {row_id} has a non-current season")
        if row.get("source_id") not in source_by_id:
            errors.append(f"membership {row_id} references an unknown source")
        elif row.get("league_id") != source_by_id[row["source_id"]].get("league_id"):
            errors.append(f"membership {row_id} league does not match its source")
        if not row.get("name") or not row.get("club_name") or not row.get("club_id"):
            errors.append(f"membership {row_id} is missing a name or club reference")
        if row.get("membership_status") != "source_listed_pending_independent_crosscheck":
            errors.append(f"membership {row_id} must remain pending cross-check")
        if row.get("identity_status") != "name_only_unverified":
            errors.append(f"membership {row_id} must not claim verified identity")
        if row.get("provider_ids") != []:
            errors.append(f"membership {row_id} must not invent provider IDs")
        if row.get("statistics") != {}:
            errors.append(f"membership {row_id} statistics must remain empty")
        if row.get("photo") is not None:
            errors.append(f"membership {row_id} must not include an uncleared photo")
        key = (row.get("league_id"), row.get("club_id"), str(row.get("name", "")).casefold())
        if key in seen_memberships:
            errors.append(f"duplicate membership: {key}")
        seen_memberships.add(key)

    if data.get("roster_memberships_count") != len(rows):
        errors.append("roster_memberships_count does not match memberships length")
    if data.get("club_pages_reviewed") != len(clubs):
        errors.append("club_pages_reviewed does not match distinct source clubs")
    if data.get("status") == "complete_research_only" and data.get("club_pages_reviewed") != 96:
        errors.append("complete status requires all 96 club pages")
    if data.get("status") == "complete_research_only":
        covered = {league for league, _ in clubs}
        if covered != set(EXPECTED_LEAGUE_COUNTS):
            errors.append("complete status requires all five leagues")
        club_counts = {
            league: len({team_id for league_id, team_id in clubs if league_id == league})
            for league in EXPECTED_LEAGUE_COUNTS
        }
        if club_counts != EXPECTED_LEAGUE_COUNTS:
            errors.append(f"complete status requires exact league club counts: {EXPECTED_LEAGUE_COUNTS}")
    return errors


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "data/footballsquads-roster-intake-2026-27.json")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid JSON: {exc}", file=sys.stderr)
        return 2
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(
        f"Validated {len(data['memberships'])} source-listed memberships "
        f"from {data['club_pages_reviewed']}/96 club pages (research only)."
    )
    print("No provider API calls or Production writes were performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
