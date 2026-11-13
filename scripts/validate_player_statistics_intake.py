#!/usr/bin/env python3
"""Validate an offline, rights-cleared 2026/27 player-statistics intake manifest.

This validator is read-only. It never fetches data, calls a provider, or writes
to Supabase. Empty manifests are valid drafts; unreviewed data is not importable.
"""
from __future__ import annotations
import argparse
import json
import math
import sys
from pathlib import Path

LEAGUES = {"PL", "PD", "BL1", "SA", "FL1"}
METRICS = {
    "appearances", "starts", "minutes", "goals", "assists",
    "yellow_cards", "red_cards", "clean_sheets", "saves", "goals_conceded",
    "xg", "xa", "shots", "shots_on_target", "key_passes",
    "tackles", "interceptions", "passes_completed", "passes_attempted",
}


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
    rows = data.get("statistics")
    if not isinstance(sources, list):
        errors.append("sources must be a list")
        sources = []
    if not isinstance(rows, list):
        errors.append("statistics must be a list")
        rows = []
    source_map: dict[str, dict] = {}
    for source in sources:
        if not isinstance(source, dict):
            errors.append("every source must be an object")
            continue
        sid = source.get("id")
        if not sid or sid in source_map:
            errors.append(f"source id missing or duplicated: {sid}")
            continue
        source_map[sid] = source
        for field in ("publisher", "source_scope", "licence_id", "metric_definitions"):
            if not source.get(field):
                errors.append(f"source {sid} missing {field}")
        for field in ("source_url", "licence_url"):
            if not str(source.get(field, "")).startswith("https://"):
                errors.append(f"source {sid} requires HTTPS {field}")
        if source.get("rights_review_status") != "approved":
            errors.append(f"source {sid} rights review is not approved")
        for field in ("commercial_use_allowed", "database_rights_reviewed", "redistribution_allowed"):
            if source.get(field) is not True:
                errors.append(f"source {sid} must have {field}=true")
        if not source.get("licence_reviewed_at"):
            errors.append(f"source {sid} missing licence_reviewed_at")
        if source.get("attribution_required") is True and not source.get("attribution_text"):
            errors.append(f"source {sid} requires attribution_text")

    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            errors.append("every statistics row must be an object")
            continue
        rid = row.get("id")
        if not rid:
            errors.append("statistics row missing id")
            continue
        if rid in seen:
            errors.append(f"duplicate statistics row id: {rid}")
        seen.add(rid)
        if row.get("season") != season:
            errors.append(f"row {rid} has a non-current season")
        if row.get("league_id") not in LEAGUES:
            errors.append(f"row {rid} has an unsupported league")
        for field in ("canonical_player_key", "provider_player_id", "club_id", "club_name", "competition_id"):
            if not row.get(field):
                errors.append(f"row {rid} missing {field}")
        if row.get("identity_match_status") != "exact":
            errors.append(f"row {rid} requires exact player identity mapping")
        if row.get("rights_status") != "approved":
            errors.append(f"row {rid} rights_status is not approved")
        if not str(row.get("observed_at", "")):
            errors.append(f"row {rid} missing observed_at")
        if not str(row.get("evidence_url", "")).startswith("https://"):
            errors.append(f"row {rid} requires HTTPS evidence_url")
        source = source_map.get(row.get("source_id"))
        if source is None:
            errors.append(f"row {rid} references an unknown source")
        elif source.get("rights_review_status") != "approved":
            errors.append(f"row {rid} uses a source without approved rights")
        stats = row.get("metrics")
        if not isinstance(stats, dict) or not stats:
            errors.append(f"row {rid} must include at least one metric")
            continue
        for metric, value in stats.items():
            if metric not in METRICS:
                errors.append(f"row {rid} has unsupported metric {metric}")
            if (isinstance(value, bool) or not isinstance(value, (int, float))
                    or not math.isfinite(value) or value < 0):
                errors.append(f"row {rid} metric {metric} must be a finite non-negative number")
        for metric in stats:
            if metric not in (source.get("metric_definitions") or {}):
                errors.append(f"row {rid} metric {metric} has no source definition")
        if all(isinstance(stats.get(k), (int, float)) and not isinstance(stats.get(k), bool)
               for k in ("appearances", "starts") if k in stats):
            if stats.get("starts", 0) > stats.get("appearances", stats.get("starts", 0)):
                errors.append(f"row {rid} starts cannot exceed appearances")
        if "minutes" in stats and "appearances" in stats and stats["minutes"] > stats["appearances"] * 150:
            errors.append(f"row {rid} minutes exceed a conservative 150-minute-per-appearance sanity bound")
        if "shots_on_target" in stats and "shots" in stats and stats["shots_on_target"] > stats["shots"]:
            errors.append(f"row {rid} shots_on_target cannot exceed shots")

    if data.get("records_count") != len(rows):
        errors.append("records_count does not match statistics length")
    if not rows and data.get("status") != "draft":
        errors.append("empty statistics manifest must remain draft")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="data/player-statistics-intake-2026-27.json")
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
    print(f"Validated {len(data['statistics'])} player-stat rows from {len(data['sources'])} rights-reviewed sources.")
    print("Offline validation only; no provider calls, Production writes, migrations, or imports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
