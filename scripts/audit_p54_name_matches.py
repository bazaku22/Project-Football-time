#!/usr/bin/env python3
"""Offline exact-name reconciliation of one club's P54 export and reference roster.

Research only. No network, provider calls, canonical ID assignment, or database writes.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from scripts.wikidata_p54_jsonl_extractor import normalize_sparql_json


def normalize_name(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.casefold()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def load_reference(path: Path) -> list[str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        payload = payload.get("players")
    if not isinstance(payload, list):
        raise ValueError("reference input must be a JSON array or an object with a players array")
    names = []
    for index, item in enumerate(payload, 1):
        name = item if isinstance(item, str) else item.get("name") if isinstance(item, dict) else None
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"reference row {index} must contain a non-empty name")
        names.append(name.strip())
    if not names:
        raise ValueError("reference roster must not be empty")
    return names


def audit(reference_names: list[str], p54_report: dict) -> dict:
    candidates_by_name: dict[str, dict[str, dict]] = defaultdict(dict)
    for candidate in p54_report["candidates"]:
        label = candidate.get("label")
        qid = candidate.get("wikidata_item_id")
        if isinstance(label, str) and label.strip() and isinstance(qid, str):
            candidates_by_name[normalize_name(label)][qid] = candidate

    reference_counts: dict[str, int] = defaultdict(int)
    for name in reference_names:
        reference_counts[normalize_name(name)] += 1

    rows = []
    for name in reference_names:
        normalized = normalize_name(name)
        matches = candidates_by_name.get(normalized, {})
        if reference_counts[normalized] > 1 or len(matches) > 1:
            status = "ambiguous_name_match"
        elif len(matches) == 1:
            status = "provisional_name_match"
        else:
            status = "no_match_in_export"
        rows.append({
            "reference_name": name,
            "normalized_name": normalized,
            "status": status,
            "matched_qids": sorted(matches),
            "matched_labels": sorted({c.get("label") for c in matches.values() if c.get("label")}),
            "p54_statement_count": sum(
                len(c.get("p54_statements", [])) for c in matches.values()
            ),
        })

    counts = defaultdict(int)
    for row in rows:
        counts[row["status"]] += 1
    return {
        "schemaVersion": 1,
        "season_context": p54_report.get("season_context", "2026/27"),
        "club_qid_filter": p54_report["club_qid_filter"],
        "matching_method": "exact_full_name_after_unicode_diacritic_case_and_punctuation_normalization",
        "fuzzy_matching": False,
        "substring_matching": False,
        "alias_matching": False,
        "status": "research_only_provisional",
        "production_import": False,
        "canonical_ids_assigned": False,
        "provider_api_calls": 0,
        "supabase_writes": 0,
        "reference_names_count": len(reference_names),
        "matched_count": counts["provisional_name_match"],
        "ambiguous_count": counts["ambiguous_name_match"],
        "unmatched_count": counts["no_match_in_export"],
        "rows": rows,
        "limitations": [
            "A provisional name match is not a verified real-world identity or current-season registration.",
            "P54 is historical represented-team evidence and does not prove current squad membership.",
            "Missing names may reflect incomplete exports, occupation filters, labels, or source coverage.",
            "Ambiguous matches are not force-resolved; no guessed aliases or fuzzy matches are attempted.",
            "No canonical app IDs, provider mappings, statistics attribution, or Production imports are created."
        ]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--p54-json", required=True, help="One-club WDQS SPARQL JSON or flat JSON export")
    parser.add_argument("--team-qid", required=True, help="Exact club QID used in the P54 query")
    parser.add_argument("--reference-json", required=True, help="JSON array of player names or {players:[{name:...}]}")
    parser.add_argument("--output", required=True, help="Output audit JSON path")
    args = parser.parse_args()

    p54_path, reference_path, output_path = map(Path, (args.p54_json, args.reference_json, args.output))
    for path in (p54_path, reference_path):
        if not path.is_file():
            parser.error(f"input file does not exist: {path}")
    p54_report = normalize_sparql_json(json.loads(p54_path.read_text(encoding="utf-8")), args.team_qid)
    result = audit(load_reference(reference_path), p54_report)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    print(
        f"Club {args.team_qid}: {result['matched_count']} provisional matches, "
        f"{result['ambiguous_count']} ambiguous, {result['unmatched_count']} unmatched."
    )
    print("Research only: no canonical IDs, provider calls, statistics attribution, or Supabase writes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
