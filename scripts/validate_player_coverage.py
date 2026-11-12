#!/usr/bin/env python3
"""Validate the offline 2026/27 five-league club coverage register."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

EXPECTED = {"PL": 20, "PD": 20, "BL1": 18, "SA": 20, "FL1": 18}
RESEARCH_ONLY = {
    ("PL", "Arsenal"),
    ("PD", "Real Madrid"),
    ("BL1", "FC Bayern München"),
    ("SA", "Milan"),
    ("FL1", "Paris Saint-Germain"),
}

def validate(data: dict) -> list[str]:
    errors: list[str] = []
    if data.get("schemaVersion") != 1: errors.append("schemaVersion must equal 1")
    if data.get("season") != "2026/27": errors.append("season must equal 2026/27")
    if data.get("production_import") is not False: errors.append("production_import must be false")
    if data.get("provider_api_calls") != 0: errors.append("provider_api_calls must equal 0")
    if data.get("provider_monthly_cost_thb") != 0: errors.append("provider_monthly_cost_thb must equal 0")
    if data.get("rights_approved_sources") != 0: errors.append("rights_approved_sources must equal 0")
    clubs = data.get("clubs")
    if not isinstance(clubs, list):
        return errors + ["clubs must be a list"]
    ids: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    counts = {league: 0 for league in EXPECTED}
    for row in clubs:
        if not isinstance(row, dict):
            errors.append("each club must be an object")
            continue
        club_id = row.get("club_id")
        league_id = row.get("league_id")
        club_name = row.get("club_name")
        if not club_id or club_id in ids: errors.append(f"missing or duplicate club_id: {club_id}")
        ids.add(club_id)
        if league_id not in EXPECTED:
            errors.append(f"unsupported league_id: {league_id}")
        else:
            counts[league_id] += 1
        pair = (league_id, club_name)
        if pair in pairs: errors.append(f"duplicate league/club pair: {pair}")
        pairs.add(pair)
        if row.get("season") != "2026/27": errors.append(f"{club_id} has wrong season")
        if not str(row.get("club_catalogue_source_url", "")).startswith("https://"):
            errors.append(f"{club_id} requires HTTPS catalogue source")
        if row.get("roster_source_reuse_status") != "not_cleared":
            errors.append(f"{club_id} must remain not_cleared")
        if row.get("membership_coverage_status") != "not_assessed":
            errors.append(f"{club_id} must remain not_assessed")
        if row.get("production_import_eligible") is not False:
            errors.append(f"{club_id} cannot be production import eligible")
        expected_review = "research_only_view_reviewed" if pair in RESEARCH_ONLY else "not_assessed"
        if row.get("roster_source_review_status") != expected_review:
            errors.append(f"{club_id} has unexpected roster source review status")
    if counts != EXPECTED:
        errors.append(f"league club counts must equal {EXPECTED}; got {counts}")
    if len(clubs) != sum(EXPECTED.values()):
        errors.append(f"expected {sum(EXPECTED.values())} club rows; got {len(clubs)}")
    summaries = data.get("league_summary")
    if not isinstance(summaries, list) or len(summaries) != len(EXPECTED):
        errors.append("league_summary must contain exactly five leagues")
    else:
        for row in summaries:
            league_id = row.get("league_id")
            if league_id not in EXPECTED or row.get("expected_clubs") != EXPECTED.get(league_id) or row.get("listed_clubs") != counts.get(league_id):
                errors.append(f"invalid league summary for {league_id}")
    return errors

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="data/player-coverage-2026-27.json")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid JSON: {exc}", file=sys.stderr)
        return 2
    errors = validate(data)
    if errors:
        for error in errors: print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Validated club coverage register: {len(data['clubs'])} clubs across five leagues.")
    print("Coverage register only; no player membership completeness, provider calls, or Production import is asserted.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
