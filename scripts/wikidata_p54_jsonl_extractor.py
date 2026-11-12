#!/usr/bin/env python3
"""Stream a locally staged Wikidata JSONL dump into a P54 evidence review file.

No network access, API calls, package installation, club-name matching, or database writes.
The output is an intermediate research artifact, not the validated intake manifest.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Iterator

AS_OF = date(2026, 11, 12)
PLAYER_OCCUPATION_QIDS = {"Q937857"}  # association football player
QID_RE = re.compile(r"^Q[1-9][0-9]*$")


def entity_qid(snak: dict) -> str | None:
    value = snak.get("datavalue", {}).get("value", {})
    qid = value.get("id") if isinstance(value, dict) else None
    return qid if isinstance(qid, str) and QID_RE.fullmatch(qid) else None


def time_date(snak: dict) -> str | None:
    value = snak.get("datavalue", {}).get("value", {})
    raw = value.get("time") if isinstance(value, dict) else None
    if not isinstance(raw, str):
        return None
    match = re.match(r"^[+-](\d{4,})-(\d{2})-(\d{2})T", raw)
    if not match:
        return None
    year, month, day = map(int, match.groups())
    if year < 1 or year > 9999:
        return None
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def english_label(entity: dict) -> str | None:
    labels = entity.get("labels", {})
    en = labels.get("en", {}) if isinstance(labels, dict) else {}
    value = en.get("value") if isinstance(en, dict) else None
    return value.strip() if isinstance(value, str) and value.strip() else None


def reference_urls(statement: dict) -> list[str]:
    urls: set[str] = set()
    for reference in statement.get("references", []) or []:
        snaks = reference.get("snaks", {}) if isinstance(reference, dict) else {}
        for snak in snaks.get("P854", []) if isinstance(snaks, dict) else []:
            value = snak.get("datavalue", {}).get("value") if isinstance(snak, dict) else None
            if isinstance(value, str) and value.startswith("https://"):
                urls.add(value)
    return sorted(urls)


def extract_entity(entity: dict) -> dict | None:
    qid = entity.get("id")
    if not isinstance(qid, str) or not QID_RE.fullmatch(qid):
        return None
    claims = entity.get("claims", {})
    if not isinstance(claims, dict):
        return None
    occupations = set()
    for occupation in claims.get("P106", []):
        if isinstance(occupation, dict):
            value = entity_qid(occupation.get("mainsnak", {}))
            if value:
                occupations.add(value)
    if not occupations.intersection(PLAYER_OCCUPATION_QIDS):
        return None

    statements = []
    for statement in claims.get("P54", []):
        if not isinstance(statement, dict):
            continue
        mainsnak = statement.get("mainsnak", {})
        team_qid = entity_qid(mainsnak) if isinstance(mainsnak, dict) else None
        if not team_qid:
            continue
        qualifiers = statement.get("qualifiers", {})
        qualifiers = qualifiers if isinstance(qualifiers, dict) else {}
        starts = qualifiers.get("P580", [])
        ends = qualifiers.get("P582", [])
        start = time_date(starts[0]) if starts else None
        end = time_date(ends[0]) if ends else None
        sid = statement.get("id")
        if not isinstance(sid, str) or not sid:
            continue
        statements.append({
            "statement_id": sid,
            "property": "P54",
            "team_item_id": team_qid,
            "rank": statement.get("rank", "normal"),
            "qualifiers": {"start_time": start, "end_time": end},
            "references": [{"url": url} for url in reference_urls(statement)],
            "reference_count": len(statement.get("references", []) or []),
        })
    if not statements:
        return None
    return {
        "wikidata_item_id": qid,
        "label": english_label(entity),
        "occupation_item_ids": sorted(occupations),
        "p54_statements": statements,
    }


def iter_jsonl(path: Path) -> Iterator[dict]:
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"invalid JSON at line {line_number}: {exc}") from exc
            if not isinstance(value, dict):
                raise ValueError(f"line {line_number} must contain a JSON object")
            yield value


def extract(path: Path, dump_date: str) -> dict:
    try:
        observed = date.fromisoformat(dump_date)
    except ValueError as exc:
        raise ValueError("dump-date must be YYYY-MM-DD") from exc
    if observed > AS_OF:
        raise ValueError("dump-date cannot be in the future relative to the project review date")
    candidates = []
    entities_seen = 0
    players_seen = 0
    for entity in iter_jsonl(path):
        entities_seen += 1
        row = extract_entity(entity)
        if row:
            players_seen += 1
            candidates.append(row)
    candidates.sort(key=lambda row: row["wikidata_item_id"])
    return {
        "schemaVersion": 1,
        "season_context": "2026/27",
        "as_of": AS_OF.isoformat(),
        "dump_date": observed.isoformat(),
        "source": "Wikidata structured data",
        "source_license": "CC0-1.0",
        "retrieval_mode": "local_jsonl_dump",
        "status": "research_only_unmapped",
        "network_access": False,
        "production_import": False,
        "provider_api_calls": 0,
        "provider_monthly_cost_thb": 0,
        "supabase_writes": 0,
        "supabase_deletes": 0,
        "supabase_migrations": 0,
        "input_file_name": path.name,
        "input_sha256": None,
        "input_entities_scanned": entities_seen,
        "football_player_entities_with_p54": players_seen,
        "records_count": len(candidates),
        "club_qid_mapping_applied": False,
        "league_membership_assigned": False,
        "candidates": candidates,
        "limitations": [
            "P106 association-football-player is a discovery filter, not a complete or authoritative player classification.",
            "P54 team QIDs are not mapped to canonical clubs or leagues by this extractor.",
            "P54 statements do not prove 2026/27 registration, first-team status, matchday eligibility or complete roster coverage.",
            "Statements without dated qualifiers or HTTPS references remain visible for review but are not current-membership evidence.",
            "No player rows are auto-imported and no identity is matched by name."
        ]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Locally staged Wikidata JSONL dump; one entity JSON object per line")
    parser.add_argument("--dump-date", required=True, help="Date/version of the local dump, YYYY-MM-DD")
    parser.add_argument("--output", default="/tmp/wikidata-p54-extract-2026-27.json")
    args = parser.parse_args()
    try:
        source = Path(args.input)
        if not source.is_file():
            raise ValueError(f"input file does not exist: {source}")
        report = extract(source, args.dump_date)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Scanned {report['input_entities_scanned']} entities; extracted {report['records_count']} football-player P54 evidence records.")
    print("Output remains unmapped Research Only; no network/API calls or Production/Supabase writes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
