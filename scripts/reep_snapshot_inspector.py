#!/usr/bin/env python3
"""Inspect a locally staged Reep DuckDB snapshot without exporting player data."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

AS_OF = "2026-11-12"


def quote_identifier(value: str) -> str:
    """Quote an identifier returned by DuckDB metadata, never user SQL."""
    return '"' + value.replace('"', '""') + '"'


def classify_table(columns: list[str]) -> list[str]:
    names = {column.casefold() for column in columns}
    roles: list[str] = []
    if {"reep_id", "entity_type"} <= names or {"id", "entity_type"} <= names:
        roles.append("possible_entity_catalogue")
    if {"provider", "external_id"} <= names and ({"reep_id"} <= names or {"entity_id"} <= names):
        roles.append("possible_provider_bridge")
    if ({"relation"} <= names or {"predicate"} <= names) and (
        {"source_id", "target_id"} <= names or {"subject_id", "object_id"} <= names
    ):
        roles.append("possible_relationship_edges")
    return roles


def inspect_connection(connection: Any) -> dict:
    """Return schema metadata and row counts only; never read or emit row values."""
    table_names = [str(row[0]) for row in connection.execute("SHOW TABLES").fetchall()]
    tables = []
    for table_name in sorted(table_names, key=str.casefold):
        quoted = quote_identifier(table_name)
        description = connection.execute(f"DESCRIBE SELECT * FROM {quoted}").fetchall()
        columns = []
        for row in description:
            columns.append({
                "name": str(row[0]),
                "type": str(row[1]) if len(row) > 1 else "unknown",
                "nullable": str(row[2]) if len(row) > 2 else None,
            })
        row_count = int(connection.execute(f"SELECT COUNT(*) FROM {quoted}").fetchone()[0])
        names = [column["name"] for column in columns]
        tables.append({
            "table": table_name,
            "row_count": row_count,
            "columns": columns,
            "candidate_roles": classify_table(names),
        })
    return {"table_count": len(tables), "tables": tables}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_snapshot(snapshot: Path, expected_sha256: str | None = None,
                     release_stamp: str | None = None) -> dict:
    if not snapshot.is_file():
        raise ValueError(f"snapshot file does not exist: {snapshot}")
    if snapshot.suffix.casefold() not in {".duckdb", ".db"}:
        raise ValueError("snapshot must be a local .duckdb or .db file")
    digest = sha256_file(snapshot) if expected_sha256 else None
    if expected_sha256 and digest.casefold() != expected_sha256.casefold():
        raise ValueError("snapshot SHA-256 does not match expected checksum")

    try:
        import duckdb  # optional local dependency; never installed or downloaded by this script
    except ImportError as exc:
        raise ValueError("DuckDB Python package is required locally; install it from a trusted package source") from exc

    connection = None
    try:
        connection = duckdb.connect(
            str(snapshot.resolve()),
            read_only=True,
            config={"enable_external_access": "false"},
        )
        catalog = inspect_connection(connection)
    finally:
        if connection is not None:
            connection.close()

    return {
        "schemaVersion": 1,
        "generated_at": AS_OF,
        "status": "local_schema_inspected",
        "season_context": "2026/27",
        "source": "Reep Register local snapshot",
        "release_stamp": release_stamp,
        "snapshot_file_name": snapshot.name,
        "snapshot_size_bytes": snapshot.stat().st_size,
        "snapshot_sha256": digest,
        "read_only": True,
        "external_access": False,
        "row_values_exported": False,
        "production_import": False,
        "provider_api_calls": 0,
        "provider_monthly_cost_thb": 0,
        "supabase_writes": 0,
        "supabase_deletes": 0,
        "supabase_migrations": 0,
        **catalog,
        "interpretation_guardrails": [
            "Table and column names are structural hints only; candidate_roles are not confirmed semantic mappings.",
            "A provider bridge or player identity entity does not prove current-season club membership.",
            "Team-season participation is not a player-to-club roster edge.",
            "Do not export or ingest rows until the actual schema, licence scope and field semantics are reviewed.",
            "No player row values are read into the report or exported.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, help="Path to an already staged local Reep .duckdb/.db file")
    parser.add_argument("--output", default="data/reep-snapshot-inspection-2026-27.json")
    parser.add_argument("--expected-sha256", help="Optional checksum from a trusted release manifest")
    parser.add_argument("--release-stamp", help="Release identifier recorded in the trusted manifest")
    args = parser.parse_args()
    try:
        report = inspect_snapshot(Path(args.snapshot), args.expected_sha256, args.release_stamp)
        Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Inspected {report['table_count']} DuckDB tables; schema only, read-only.")
    print("No row values exported; no network/API calls, Production imports or Supabase mutations.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
