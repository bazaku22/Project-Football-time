#!/usr/bin/env python3
"""Validate a rights-cleared, offline 2026/27 player intake manifest.

This tool is deliberately offline and read-only. It does not fetch sources,
call providers, write to Supabase, or import records.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

LEAGUES = {"PL", "PD", "BL1", "SA", "FL1"}
SQUAD_LEVELS = {"first_team", "u21", "u18", "reserve", "unknown"}
MEMBERSHIP_TYPES = {"registered_squad", "first_team_roster", "academy_roster"}


def validate(data: dict, season: str = "2026/27") -> list[str]:
    errors: list[str] = []
    if data.get("schemaVersion") != 1:
        errors.append("schemaVersion must equal 1")
    if data.get("season") != season:
        errors.append(f"season must equal {season}")
    if data.get("status") not in {"draft", "research_only"}:
        errors.append("status must be draft or research_only")
    if data.get("production_import") is not False:
        errors.append("production_import must be false")
    if data.get("provider_api_calls") != 0:
        errors.append("provider_api_calls must equal 0")

    sources = data.get("sources")
    memberships = data.get("memberships")
    if not isinstance(sources, list):
        errors.append("sources must be a list")
        sources = []
    if not isinstance(memberships, list):
        errors.append("memberships must be a list")
        memberships = []
    if memberships and not sources:
        errors.append("memberships cannot exist without reviewed sources")

    source_map: dict[str, dict] = {}
    for source in sources:
        if not isinstance(source, dict):
            errors.append("every source must be an object")
            continue
        source_id = source.get("id")
        if not source_id or source_id in source_map:
            errors.append(f"source id missing or duplicated: {source_id}")
            continue
        source_map[source_id] = source
        for field in ("publisher", "source_scope", "licence_id"):
            if not source.get(field):
                errors.append(f"source {source_id} missing {field}")
        for field in ("source_url", "licence_url"):
            if not str(source.get(field, "")).startswith("https://"):
                errors.append(f"source {source_id} requires HTTPS {field}")
        if source.get("rights_review_status") != "approved":
            errors.append(f"source {source_id} rights review is not approved")
        for field in ("commercial_use_allowed", "database_rights_reviewed", "redistribution_allowed"):
            if source.get(field) is not True:
                errors.append(f"source {source_id} must have {field}=true")
        if not source.get("licence_reviewed_at"):
            errors.append(f"source {source_id} missing licence_reviewed_at")
        if source.get("attribution_required") is True and not source.get("attribution_text"):
            errors.append(f"source {source_id} requires attribution_text")

    seen_membership_ids: set[str] = set()
    seen_pairs: set[tuple] = set()
    for row in memberships:
        if not isinstance(row, dict):
            errors.append("every membership must be an object")
            continue
        row_id = row.get("id")
        if not row_id or row_id in seen_membership_ids:
            errors.append(f"membership id missing or duplicated: {row_id}")
        seen_membership_ids.add(row_id)
        if row.get("season") != season:
            errors.append(f"membership {row_id} has a non-current season")
        if row.get("league_id") not in LEAGUES:
            errors.append(f"membership {row_id} has an unsupported league")
        if not row.get("player_name") or not row.get("source_player_id"):
            errors.append(f"membership {row_id} needs player_name and exact source_player_id")
        if not row.get("club_id") or not row.get("club_name"):
            errors.append(f"membership {row_id} needs canonical club mapping")
        if row.get("squad_level") not in SQUAD_LEVELS:
            errors.append(f"membership {row_id} has an invalid squad_level")
        if row.get("membership_type") not in MEMBERSHIP_TYPES:
            errors.append(f"membership {row_id} has an invalid membership_type")
        if row.get("membership_status") != "current_verified":
            errors.append(f"membership {row_id} is not current_verified")
        if row.get("rights_status") != "approved":
            errors.append(f"membership {row_id} rights_status is not approved")
        if not str(row.get("evidence_url", "")).startswith("https://"):
            errors.append(f"membership {row_id} requires HTTPS evidence_url")
        if not row.get("observed_at"):
            errors.append(f"membership {row_id} missing observed_at")
        source = source_map.get(row.get("source_id"))
        if source is None:
            errors.append(f"membership {row_id} references an unknown source")
        elif source.get("rights_review_status") != "approved":
            errors.append(f"membership {row_id} uses a source without approved rights")
        key = (row.get("league_id"), row.get("club_id"), row.get("season"), str(row.get("source_player_id")))
        if key in seen_pairs:
            errors.append(f"duplicate source player membership: {key}")
        seen_pairs.add(key)

    if data.get("records_count") != len(memberships):
        errors.append("records_count does not match memberships length")
    if not memberships and data.get("status") != "draft":
        errors.append("empty manifest must remain draft")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="data/player-intake-manifest-2026-27.json")
    parser.add_argument("--season", default="2026/27")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid JSON: {exc}", file=sys.stderr)
        return 2
    errors = validate(data, args.season)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Validated intake manifest: {len(data['memberships'])} memberships, {len(data['sources'])} reviewed sources.")
    print("Offline validation only; no provider calls, Production writes, migrations, or imports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
