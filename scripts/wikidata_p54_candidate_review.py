#!/usr/bin/env python3
"""Build a research-only review queue from a Wikidata P54 SPARQL JSON export.

This tool is deliberately offline: it never calls Wikidata, a football provider,
or Supabase. It does not assign canonical IDs or decide that a player is registered.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

SEASON_START = date(2026, 7, 1)
SEASON_END = date(2027, 6, 30)
QID_RE = re.compile(r"^Q[1-9][0-9]*$")
STATEMENT_RE = re.compile(r"/entity/statement/(Q[1-9][0-9]*\$[^/?#]+)$")
WIKIDATA_ENTITY_HOSTS = {"www.wikidata.org", "wikidata.org"}


def binding_value(row: dict, key: str) -> str:
    item = row.get(key) or {}
    return str(item.get("value") or "").strip()


def qid_from_uri(value: str) -> str:
    parsed = urlparse(value)
    if parsed.netloc not in WIKIDATA_ENTITY_HOSTS:
        return ""
    match = re.search(r"/entity/(Q[1-9][0-9]*)$", parsed.path)
    return match.group(1) if match else ""


def statement_guid_from_uri(value: str) -> str:
    match = STATEMENT_RE.search(urlparse(value).path)
    return match.group(1) if match else ""


def parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def classify(start_raw: str, end_raw: str, rank: str, references: list[dict]) -> str:
    if rank.endswith("DeprecatedRank"):
        return "deprecated_statement"
    if not references:
        return "missing_source_reference"

    start = parse_date(start_raw)
    end = parse_date(end_raw)
    if start_raw and start is None or end_raw and end is None:
        return "invalid_date_qualifier"
    if start and start > SEASON_END or end and end < SEASON_START:
        return "outside_target_season"
    if start is None and end is None:
        return "date_scope_unknown"
    if start is None or end is None:
        return "date_scope_partial"
    return "referenced_candidate_needs_human_review"


def normalize_export(payload: dict, expected_team_qid: str | None = None) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("SPARQL export must be a JSON object")
    bindings = payload.get("results", {}).get("bindings")
    if not isinstance(bindings, list):
        raise ValueError("SPARQL export must contain results.bindings")
    if expected_team_qid and not QID_RE.fullmatch(expected_team_qid):
        raise ValueError("expected team must be a Wikidata QID")

    grouped: dict[str, dict] = {}
    for row_number, row in enumerate(bindings, start=1):
        player_uri = binding_value(row, "player")
        team_uri = binding_value(row, "team")
        player_qid = qid_from_uri(player_uri)
        team_qid = qid_from_uri(team_uri)
        statement_uri = binding_value(row, "statement")
        statement_guid = statement_guid_from_uri(statement_uri)
        if not player_qid or not team_qid or not statement_guid:
            raise ValueError(f"row {row_number}: invalid player, team, or statement URI")
        if expected_team_qid and team_qid != expected_team_qid:
            raise ValueError(f"row {row_number}: team {team_qid} does not match requested {expected_team_qid}")

        rank_uri = binding_value(row, "rank")
        rank = rank_uri.rsplit("#", 1)[-1] if rank_uri else "rank_unknown"
        start = binding_value(row, "start")
        end = binding_value(row, "end")
        player_label = binding_value(row, "playerLabel")
        team_label = binding_value(row, "teamLabel")
        player_url = f"https://www.wikidata.org/wiki/{player_qid}"
        team_url = f"https://www.wikidata.org/wiki/{team_qid}"

        reference_node = binding_value(row, "reference")
        reference_url = binding_value(row, "referenceUrl")
        reference_source = binding_value(row, "referenceSource")
        retrieved = binding_value(row, "retrieved")
        reference = None
        if reference_node:
            reference = {
                "reference_node": reference_node,
                "reference_url": reference_url,
                "reference_source_qid": qid_from_uri(reference_source),
                "retrieved_at": retrieved,
            }

        current = grouped.get(statement_guid)
        if current is None:
            current = {
                "player_qid": player_qid,
                "player_label": player_label,
                "player_url": player_url,
                "team_qid": team_qid,
                "team_label": team_label,
                "team_url": team_url,
                "statement_guid": statement_guid,
                "rank": rank,
                "start_time": start,
                "end_time": end,
                "references": [],
            }
            grouped[statement_guid] = current
        else:
            immutable = ("player_qid", "team_qid", "rank", "start_time", "end_time")
            incoming = (player_qid, team_qid, rank, start, end)
            if tuple(current[key] for key in immutable) != incoming:
                raise ValueError(f"statement {statement_guid}: conflicting values across reference rows")
            if not current["player_label"] and player_label:
                current["player_label"] = player_label
            if not current["team_label"] and team_label:
                current["team_label"] = team_label

        if reference and reference not in current["references"]:
            current["references"].append(reference)

    candidates = []
    for statement_guid, item in sorted(grouped.items()):
        item["references"].sort(key=lambda ref: (
            ref.get("reference_source_qid") or "",
            ref.get("reference_url") or "",
            ref.get("retrieved_at") or "",
            ref.get("reference_node") or "",
        ))
        item["review_status"] = classify(
            item["start_time"], item["end_time"], item["rank"], item["references"]
        )
        item["review_required"] = True
        item["canonical_player_id"] = ""
        item["provider_player_id"] = ""
        candidates.append(item)

    counts = defaultdict(int)
    for item in candidates:
        counts[item["review_status"]] += 1
    return {
        "schemaVersion": 1,
        "season": "2026/27",
        "as_of": "2026-11-14",
        "status": "research_only",
        "retrieval_mode": "offline_sparql_json_export",
        "source": "Wikidata structured data",
        "source_license": "CC0-1.0",
        "source_license_url": "https://www.wikidata.org/wiki/Wikidata:Licensing",
        "property": "P54",
        "expected_team_qid": expected_team_qid or "",
        "records_count": len(candidates),
        "review_status_counts": dict(sorted(counts.items())),
        "network_access": False,
        "provider_api_calls": 0,
        "provider_monthly_cost_thb": 0,
        "supabase_reads": 0,
        "supabase_writes": 0,
        "supabase_migrations": 0,
        "production_import": False,
        "canonical_player_ids_assigned": 0,
        "automatic_merges": 0,
        "limitations": [
            "P54 means a person represents or represented a team; it does not prove current registration, first-team status, or roster completeness.",
            "A referenced statement is still a candidate and requires independent season-specific human review.",
            "Missing or partial start/end qualifiers are not treated as proof of current membership.",
            "Reference URLs identify evidence; Wikidata CC0 does not relicense third-party referenced content.",
            "No name-only matching, canonical ID assignment, automatic merge, provider call, or database write is performed.",
        ],
        "candidates": candidates,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Wikidata Query Service SPARQL JSON export")
    parser.add_argument("--team-qid", help="Expected club QID, e.g. Q9617; rejects rows for other clubs")
    parser.add_argument("--output", required=True, type=Path, help="Output research-only JSON review file")
    args = parser.parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        result = normalize_export(payload, args.team_qid)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"WIKIDATA P54 REVIEW FAILED: {exc}", file=sys.stderr)
        return 2
    print(f"P54 statements: {result['records_count']}")
    print(f"Review statuses: {json.dumps(result['review_status_counts'], sort_keys=True)}")
    print("Research-only preview — no canonical IDs, provider calls, or database writes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
