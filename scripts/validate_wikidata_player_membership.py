#!/usr/bin/env python3
"""Validate manually exported Wikidata P54 records for offline review only.

This tool reads a local JSON file. It never contacts Wikidata, downloads dumps,
calls APIs, or writes to Supabase.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

TARGET_SEASON = "2026/27"
AS_OF = date(2026, 11, 12)
LEAGUES = {"PL", "PD", "BL1", "SA", "FL1"}
QID = re.compile(r"^Q[1-9][0-9]*$")
STATEMENT_ID = re.compile(r"^[A-Za-z0-9.$:_-]{1,128}$")


def valid_date(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value[:10])
        return len(value) >= 10
    except ValueError:
        return False


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    if data.get("schemaVersion") != 1:
        errors.append("schemaVersion must equal 1")
    if data.get("season") != TARGET_SEASON:
        errors.append(f"season must equal {TARGET_SEASON}")
    if data.get("as_of") != AS_OF.isoformat():
        errors.append(f"as_of must equal {AS_OF.isoformat()}")
    if data.get("status") != "research_only":
        errors.append("status must remain research_only")
    if data.get("production_import") is not False:
        errors.append("production_import must be false")
    if data.get("provider_api_calls") != 0:
        errors.append("provider_api_calls must equal 0")
    if data.get("source_license") != "CC0-1.0":
        errors.append("source_license must record CC0-1.0")
    if data.get("retrieval_mode") != "manual_local_export":
        errors.append("retrieval_mode must be manual_local_export")
    if data.get("network_access") is not False:
        errors.append("network_access must be false")

    candidates = data.get("candidates")
    if not isinstance(candidates, list):
        errors.append("candidates must be a list")
        candidates = []
    if data.get("records_count") != len(candidates):
        errors.append("records_count does not match candidates length")

    seen_people: set[str] = set()
    seen_memberships: set[tuple] = set()
    for row in candidates:
        if not isinstance(row, dict):
            errors.append("every candidate must be an object")
            continue
        qid = row.get("wikidata_item_id")
        if not isinstance(qid, str) or not QID.fullmatch(qid):
            errors.append(f"invalid Wikidata player item id: {qid}")
        elif qid in seen_people:
            errors.append(f"duplicate Wikidata player item: {qid}")
        seen_people.add(qid)

        if not row.get("label") or not row.get("club_name") or not row.get("canonical_club_id"):
            errors.append(f"candidate {qid} is missing player or canonical club identity")
        if row.get("club_item_id") and not QID.fullmatch(str(row["club_item_id"])):
            errors.append(f"candidate {qid} has invalid club_item_id")
        if row.get("league_id") not in LEAGUES:
            errors.append(f"candidate {qid} has unsupported league")
        if row.get("season") != TARGET_SEASON:
            errors.append(f"candidate {qid} has a non-current season")
        if row.get("review_status") != "pending_manual_review":
            errors.append(f"candidate {qid} must remain pending_manual_review")
        if row.get("membership_assessment") not in {"potentially_current", "historical", "unclear"}:
            errors.append(f"candidate {qid} has invalid membership_assessment")
        if not valid_date(row.get("retrieved_at")) or row.get("retrieved_at", "")[:10] > AS_OF.isoformat():
            errors.append(f"candidate {qid} has invalid or future retrieved_at")

        statements = row.get("p54_statements")
        if not isinstance(statements, list) or not statements:
            errors.append(f"candidate {qid} must include at least one P54 statement")
            continue
        active_evidence = False
        statement_ids = set()
        for st in statements:
            if not isinstance(st, dict):
                errors.append(f"candidate {qid} contains a malformed P54 statement")
                continue
            sid = st.get("statement_id")
            if not isinstance(sid, str) or not STATEMENT_ID.fullmatch(sid) or sid in statement_ids:
                errors.append(f"candidate {qid} has missing or duplicate statement_id")
            statement_ids.add(sid)
            if st.get("property") != "P54":
                errors.append(f"candidate {qid} statement must use P54")
            if st.get("rank") not in {"normal", "preferred", "deprecated"}:
                errors.append(f"candidate {qid} has invalid P54 rank")
            if not QID.fullmatch(str(st.get("team_item_id", ""))):
                errors.append(f"candidate {qid} has invalid P54 team_item_id")
            qualifiers = st.get("qualifiers")
            if not isinstance(qualifiers, dict):
                errors.append(f"candidate {qid} P54 statement must include qualifiers object")
                qualifiers = {}
            start = qualifiers.get("start_time")
            end = qualifiers.get("end_time")
            start_ok = valid_date(start)
            end_ok = end is None or valid_date(end)
            if not start_ok or not end_ok:
                errors.append(f"candidate {qid} P54 statement has invalid start_time/end_time qualifiers")
            refs = st.get("references")
            if not isinstance(refs, list) or not refs:
                errors.append(f"candidate {qid} P54 statement requires at least one reference")
                refs = []
            for ref in refs:
                if not isinstance(ref, dict) or not str(ref.get("url", "")).startswith("https://"):
                    errors.append(f"candidate {qid} P54 references must include HTTPS URLs")
            if (
                st.get("rank") in {"normal", "preferred"}
                and start_ok and end_ok
                and date.fromisoformat(start[:10]) <= AS_OF
                and (end is None or date.fromisoformat(end[:10]) > AS_OF)
                and refs
            ):
                active_evidence = True

        if row.get("membership_assessment") == "potentially_current" and not active_evidence:
            errors.append(f"candidate {qid} marked potentially_current without dated, referenced non-deprecated P54 evidence")

        key = (qid, row.get("canonical_club_id"), row.get("season"))
        if key in seen_memberships:
            errors.append(f"duplicate player-club-season candidate: {key}")
        seen_memberships.add(key)

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="data/wikidata-player-membership-review-2026-27.json")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid JSON: {exc}", file=sys.stderr)
        return 2
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Validated {len(data['candidates'])} Wikidata candidates for offline manual review.")
    print("No network/API calls, provider calls, Production writes, migrations, or deletes were performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
