#!/usr/bin/env python3
"""Build a local, read-only player-statistics import preview.

Matching is exact on (provider, provider_player_id). Names are descriptive only
and are never used as an automatic identity key. No network or database access.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from validate_player_stats_csv import validate

MAPPING_REQUIRED = {"provider", "provider_player_id", "canonical_player_key"}
STAT_REQUIRED = {
    "provider", "provider_player_id", "canonical_player_key", "player_name",
    "team_code", "season", "competition_code", "squad_level",
    "statistics_scope", "collected_at", "rights_status", "permission_reference",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_mapping(path: Path):
    mapping = {}
    duplicate_keys = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = set(reader.fieldnames or [])
        missing = sorted(MAPPING_REQUIRED - headers)
        if missing:
            raise ValueError("Mapping CSV missing columns: " + ", ".join(missing))
        for line, raw in enumerate(reader, start=2):
            row = {k: (v or "").strip() for k, v in raw.items() if k}
            provider, provider_id, canonical = (
                row.get("provider", ""), row.get("provider_player_id", ""),
                row.get("canonical_player_key", ""),
            )
            if not provider or not provider_id or not canonical:
                raise ValueError(f"Mapping row {line}: provider, provider_player_id and canonical_player_key are required")
            key = (provider.casefold(), provider_id)
            if key in mapping:
                duplicate_keys.add(key)
            else:
                mapping[key] = {
                    "canonical_player_key": canonical,
                    "team_code": row.get("team_code", ""),
                    "season": row.get("season", ""),
                }
    if duplicate_keys:
        raise ValueError("Mapping contains duplicate provider/player IDs: " +
                         ", ".join(f"{p}:{i}" for p, i in sorted(duplicate_keys)))
    return mapping


def build_preview(source: Path, mapping_path: Path):
    mapping = read_mapping(mapping_path)
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames or []
        missing = sorted(STAT_REQUIRED - set(fields))
        if missing:
            raise ValueError("Statistics CSV missing columns: " + ", ".join(missing))
        source_rows = []
        for line, raw in enumerate(reader, start=2):
            row = {k: (v or "").strip() for k, v in raw.items() if k}
            row["_source_line"] = line
            original_key = row.get("canonical_player_key", "")
            if not original_key:
                provider_key = (row.get("provider", "").casefold(), row.get("provider_player_id", ""))
                mapped = mapping.get(provider_key)
                if mapped:
                    row["canonical_player_key"] = mapped["canonical_player_key"]
                    if mapped["team_code"] and mapped["team_code"] != row.get("team_code", ""):
                        row["_mapping_issue"] = "mapping team_code does not match source row"
                    if mapped["season"] and mapped["season"] != row.get("season", ""):
                        row["_mapping_issue"] = "mapping season does not match source row"
            row["_identity_resolution"] = (
                "provided_in_source" if original_key else
                "exact_provider_id_match" if row["canonical_player_key"] else
                "unresolved"
            )
            source_rows.append(row)

    # Validate a resolved temporary copy. Original CSV remains untouched.
    validation_rows = [{k: v for k, v in row.items() if not k.startswith("_")} for row in source_rows]
    errors, rows_seen, _eligible = validate_rows_in_memory(fields, validation_rows)
    by_line = {}
    global_issues = []
    for error in errors:
        if error.startswith("Row "):
            try:
                line = int(error.split(":", 1)[0].split()[1])
                by_line.setdefault(line, []).append(error.split(": ", 1)[1])
            except (ValueError, IndexError):
                pass
        else:
            global_issues.append(error)

    results = []
    for row in source_rows:
        line = row["_source_line"]
        issues = list(global_issues) + by_line.get(line, [])
        if row["_identity_resolution"] == "unresolved":
            status = "needs_identity_review"
        elif row.get("_mapping_issue"):
            issues.append(row["_mapping_issue"])
            status = "rejected_or_needs_review"
        elif issues:
            status = "rejected_or_needs_review"
        else:
            # Passing a rights flag is not a legal determination.
            status = "structurally_valid_pending_human_review"
        results.append({
            "source_line": line,
            "player_name": row.get("player_name", ""),
            "canonical_player_key": row.get("canonical_player_key", ""),
            "identity_resolution": row["_identity_resolution"],
            "team_code": row.get("team_code", ""),
            "season": row.get("season", ""),
            "competition_code": row.get("competition_code", ""),
            "squad_level": row.get("squad_level", ""),
            "statistics_scope": row.get("statistics_scope", ""),
            "provider": row.get("provider", ""),
            "status": status,
            "issues": issues,
            "row": {k: v for k, v in row.items() if not k.startswith("_")},
        })
    counts = Counter(item["status"] for item in results)
    manifest = {
        "app": "Project Football Time",
        "type": "player-statistics-import-preview",
        "preview_only": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": source.name,
        "source_sha256": sha256(source),
        "mapping_file": mapping_path.name,
        "mapping_sha256": sha256(mapping_path),
        "rows_seen": rows_seen,
        "summary": dict(counts),
        "global_issues": global_issues,
        "rows": results,
        "notice": "Preview only. No database writes. Human identity and data-rights review remains mandatory.",
    }
    return manifest


def validate_rows_in_memory(fields, rows):
    # Use the existing validator without creating or modifying any user file.
    import csv as csv_module
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "resolved-preview.csv"
        with temp_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv_module.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        return validate(temp_path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("statistics_csv", type=Path)
    parser.add_argument("player_mapping_csv", type=Path)
    parser.add_argument("--out", type=Path, default=Path("player-statistics-preview.json"))
    parser.add_argument("--csv-out", type=Path, default=Path("player-statistics-preview.csv"))
    args = parser.parse_args()
    try:
        input_paths = {args.statistics_csv.resolve(), args.player_mapping_csv.resolve()}
        output_paths = {args.out.resolve(), args.csv_out.resolve()}
        if len(output_paths) != 2 or output_paths & input_paths:
            raise ValueError("Output paths must be distinct and must not overwrite either input file")
        manifest = build_preview(args.statistics_csv, args.player_mapping_csv)
        args.out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        columns = [
            "source_line", "player_name", "canonical_player_key", "identity_resolution",
            "team_code", "season", "competition_code", "squad_level",
            "statistics_scope", "provider", "status", "issues",
        ]
        with args.csv_out.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns)
            writer.writeheader()
            for item in manifest["rows"]:
                output = {key: item.get(key, "") for key in columns}
                output["issues"] = " | ".join(item["issues"])
                writer.writerow(output)
    except (OSError, ValueError, csv.Error) as exc:
        print(f"PREVIEW FAILED: {exc}", file=sys.stderr)
        return 2
    print(f"Rows previewed: {manifest['rows_seen']}")
    for status, count in sorted(manifest["summary"].items()):
        print(f"{status}: {count}")
    print(f"JSON report: {args.out}")
    print(f"CSV report: {args.csv_out}")
    print("PREVIEW ONLY — no database rows were inserted or updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
