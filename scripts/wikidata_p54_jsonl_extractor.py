#!/usr/bin/env python3
"""Extract Wikidata P54 evidence from a local JSONL dump or scoped SPARQL JSON export.

No network access, API calls, package installation, club-name matching, or database writes.
The output is an intermediate research artifact, not the validated intake manifest.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

AS_OF = date(2026, 11, 14)
PLAYER_OCCUPATION_QIDS = {"Q937857"}  # association football player
QID_RE = re.compile(r"^Q[1-9][0-9]*$")
WIKIDATA_HOSTS = {"www.wikidata.org", "wikidata.org"}


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


def reference_evidence(statement: dict) -> list[dict]:
    """Preserve reference metadata without treating the referenced page as CC0."""
    result = []
    for reference in statement.get("references", []) or []:
        snaks = reference.get("snaks", {}) if isinstance(reference, dict) else {}
        if not isinstance(snaks, dict):
            snaks = {}
        source_ids = set()
        retrieved_dates = set()
        for snak in snaks.get("P248", []) + snaks.get("P143", []):
            qid = entity_qid(snak) if isinstance(snak, dict) else None
            if qid:
                source_ids.add(qid)
        for snak in snaks.get("P813", []):
            retrieved = time_date(snak) if isinstance(snak, dict) else None
            if retrieved:
                retrieved_dates.add(retrieved)
        urls = []
        for snak in snaks.get("P854", []):
            value = snak.get("datavalue", {}).get("value") if isinstance(snak, dict) else None
            if isinstance(value, str) and value.startswith("https://"):
                urls.append(value)
        result.append({
            "source_urls": sorted(set(urls)),
            "source_item_ids": sorted(source_ids),
            "retrieved_dates": sorted(retrieved_dates),
            "snak_properties": sorted(snaks.keys()),
        })
    return result


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
            "qualifier_observations": {
                "start_times": [value for snak in starts if (value := time_date(snak))],
                "end_times": [value for snak in ends if (value := time_date(snak))],
            },
            "references": [{"url": url} for url in reference_urls(statement)],
            "reference_evidence": reference_evidence(statement),
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


def binding_value(row: dict, key: str) -> str:
    item = row.get(key) or {}
    return str(item.get("value") or "").strip()


def qid_from_uri(value: str) -> str | None:
    parsed = urlparse(value)
    if parsed.netloc not in WIKIDATA_HOSTS:
        return None
    match = re.search(r"/entity/(Q[1-9][0-9]*)$", parsed.path)
    return match.group(1) if match else None


def statement_id_from_uri(value: str) -> str | None:
    parsed = urlparse(value)
    if parsed.netloc not in WIKIDATA_HOSTS:
        return None
    match = re.search(r"/entity/statement/(Q[1-9][0-9]*\$[A-Za-z0-9.$:_-]+)$", parsed.path)
    return match.group(1) if match else None


def sparql_date(value: str) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if raw.startswith("+"):
        raw = raw[1:]
    try:
        return date.fromisoformat(raw[:10]).isoformat()
    except ValueError:
        return None


def normalize_sparql_json(payload: dict, team_qid: str) -> dict:
    """Normalize one-club WDQS SPARQL JSON while retaining exact statement provenance."""
    if not isinstance(payload, dict) or not isinstance(payload.get("results", {}).get("bindings"), list):
        raise ValueError("SPARQL JSON must contain results.bindings")
    if not QID_RE.fullmatch(team_qid):
        raise ValueError("team-qid must be a Wikidata QID")

    players: dict[str, dict] = {}
    statements: dict[str, dict] = {}
    for line_number, row in enumerate(payload["results"]["bindings"], 1):
        player_qid = qid_from_uri(binding_value(row, "player"))
        occupation_qid = qid_from_uri(binding_value(row, "occupation"))
        found_team_qid = qid_from_uri(binding_value(row, "team"))
        statement_id = statement_id_from_uri(binding_value(row, "statement"))
        if not player_qid or not found_team_qid or not statement_id or occupation_qid != "Q937857":
            raise ValueError(f"row {line_number}: invalid player, team, or statement URI / occupation binding")
        if found_team_qid != team_qid:
            raise ValueError(f"row {line_number}: team {found_team_qid} does not match requested {team_qid}")

        player = players.setdefault(player_qid, {
            "wikidata_item_id": player_qid,
            "label": binding_value(row, "playerLabel") or None,
            "occupation_item_ids": ["Q937857"],
            "p54_statements": [],
        })
        rank_uri = binding_value(row, "rank")
        rank = rank_uri.rsplit("#", 1)[-1].replace("Rank", "").lower() if rank_uri else "unknown"
        start_raw = binding_value(row, "start")
        end_raw = binding_value(row, "end")
        start = sparql_date(start_raw) if start_raw else None
        end = sparql_date(end_raw) if end_raw else None
        if start_raw and start is None or end_raw and end is None:
            raise ValueError(f"statement {statement_id}: invalid P580/P582 date qualifier")
        key = f"{player_qid}|{statement_id}"
        statement = statements.get(key)
        if statement is None:
            statement = {
                "statement_id": statement_id,
                "property": "P54",
                "team_item_id": team_qid,
                "rank": rank,
                "qualifiers": {"start_time": start, "end_time": end},
                "qualifier_observations": {
                    "start_times": [start] if start else [],
                    "end_times": [end] if end else [],
                },
                "references": [],
                "reference_evidence": [],
                "reference_count": 0,
            }
            statements[key] = statement
            player["p54_statements"].append(statement)
        elif statement["qualifiers"] != {"start_time": start, "end_time": end} or statement["rank"] != rank:
            raise ValueError(f"statement {statement_id}: conflicting rank/date values across rows")

        reference_node = binding_value(row, "reference")
        if reference_node:
            source_qid = qid_from_uri(binding_value(row, "referenceSource"))
            reference_url = binding_value(row, "referenceUrl")
            retrieved = binding_value(row, "retrieved")
            evidence = {
                "reference_node": reference_node,
                "source_urls": [reference_url] if reference_url.startswith("https://") else [],
                "source_item_ids": [source_qid] if source_qid else [],
                "retrieved_dates": [retrieved[:10]] if retrieved else [],
            }
            if evidence not in statement["reference_evidence"]:
                statement["reference_evidence"].append(evidence)
            if reference_url.startswith("https://"):
                ref = {"url": reference_url}
                if ref not in statement["references"]:
                    statement["references"].append(ref)

    candidates = []
    for player_qid in sorted(players):
        player = players[player_qid]
        player["p54_statements"].sort(key=lambda row: row["statement_id"])
        for statement in player["p54_statements"]:
            statement["reference_count"] = len(statement["reference_evidence"])
        candidates.append(player)

    return {
        "schemaVersion": 1,
        "season_context": "2026/27",
        "as_of": AS_OF.isoformat(),
        "source": "Wikidata structured data",
        "source_license": "CC0-1.0",
        "retrieval_mode": "manual_wdqs_sparql_json_export",
        "status": "research_only_unmapped",
        "network_access": False,
        "production_import": False,
        "provider_api_calls": 0,
        "provider_monthly_cost_thb": 0,
        "supabase_writes": 0,
        "supabase_deletes": 0,
        "supabase_migrations": 0,
        "input_format": "wikidata_query_service_sparql_json",
        "club_qid_filter": team_qid,
        "input_statements_scanned": len(statements),
        "records_count": len(candidates),
        "club_qid_mapping_applied": False,
        "league_membership_assigned": False,
        "candidates": candidates,
        "limitations": [
            "P106 association-football-player is a discovery filter, not a complete or authoritative player classification.",
            "P54 is historical membership evidence and does not prove 2026/27 registration, first-team status or roster completeness.",
            "Missing or partial dates and missing references remain unresolved; no current-membership status is inferred.",
            "Reference URLs and source item IDs are evidence pointers; Wikidata CC0 does not relicense third-party referenced content.",
            "No name-only matching, canonical ID assignment, automatic merge, provider call or database write is performed.",
        ],
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
    parser.add_argument("--input", required=True, help="Local Wikidata JSONL dump or WDQS SPARQL JSON export")
    parser.add_argument("--input-format", choices=("jsonl", "sparql-json"), default="jsonl")
    parser.add_argument("--dump-date", help="Required for JSONL input, YYYY-MM-DD")
    parser.add_argument("--team-qid", help="Required for SPARQL JSON input; exact selected club QID")
    parser.add_argument("--output", default="/tmp/wikidata-p54-extract-2026-27.json")
    args = parser.parse_args()
    try:
        source = Path(args.input)
        if not source.is_file():
            raise ValueError(f"input file does not exist: {source}")
        if args.input_format == "sparql-json":
            if not args.team_qid:
                raise ValueError("--team-qid is required for SPARQL JSON input")
            payload = json.loads(source.read_text(encoding="utf-8"))
            report = normalize_sparql_json(payload, args.team_qid)
        else:
            if not args.dump_date:
                raise ValueError("--dump-date is required for JSONL input")
            report = extract(source, args.dump_date)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Scanned {report.get('input_entities_scanned', report.get('input_statements_scanned', 0))} source records; extracted {report['records_count']} player candidates.")
    print("Output remains unmapped Research Only; no network/API calls or Production/Supabase writes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
