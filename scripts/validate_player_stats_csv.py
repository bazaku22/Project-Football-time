#!/usr/bin/env python3
"""Offline, read-only preflight validator for Football Time player-statistics CSV files."""
from __future__ import annotations

import argparse
import csv
import math
import re
import sys
from datetime import datetime
from pathlib import Path

REQUIRED = {
    "canonical_player_key", "provider", "player_name", "team_code", "season",
    "competition_code", "squad_level", "statistics_scope", "collected_at",
    "rights_status", "permission_reference",
}
STAT_FIELDS = {
    "appearances", "starts", "minutes", "goals", "assists", "shots",
    "shots_on_target", "xg", "xa", "yellow_cards", "red_cards", "saves",
    "clean_sheets",
}
INTEGER_FIELDS = STAT_FIELDS - {"xg", "xa"}
SQUAD_LEVELS = {"first_team", "u21", "u18", "other_youth"}
SCOPES = {"season", "competition", "match"}
RIGHTS = {"approved", "manual_review", "not_approved"}
SEASON_RE = re.compile(r"^\d{4}/\d{2}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Include provider in the key: different providers' observations must coexist.
KEY_FIELDS = (
    "canonical_player_key", "provider", "season", "competition_code",
    "team_code", "squad_level", "statistics_scope",
)


def parse_timestamp(value: str) -> bool:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.tzinfo is not None and parsed.utcoffset() is not None
    except (TypeError, ValueError):
        return False


def valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def validate(path: Path) -> tuple[list[str], int, int]:
    errors: list[str] = []
    rows_seen = 0
    eligible = 0
    seen: dict[tuple[str, ...], int] = {}

    try:
        handle = path.open("r", encoding="utf-8-sig", newline="")
    except OSError as exc:
        return [f"Cannot read file: {exc}"], 0, 0

    with handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        if len(headers) != len(set(headers)):
            errors.append("CSV contains duplicate column names")
            return errors, 0, 0
        missing = sorted(REQUIRED - set(headers))
        if missing:
            errors.append("Missing required columns: " + ", ".join(missing))
            return errors, 0, 0

        for line, raw in enumerate(reader, start=2):
            rows_seen += 1
            row_error_start = len(errors)
            if None in raw:
                errors.append(f"Row {line}: contains more values than the header")
            row = {k: (v or "").strip() for k, v in raw.items() if k is not None}
            prefix = f"Row {line}: "
            if not any(row.values()):
                errors.append(prefix + "empty row")
                continue

            for field in (
                "provider", "player_name", "team_code", "season",
                "competition_code", "squad_level", "statistics_scope",
                "collected_at", "rights_status", "permission_reference",
            ):
                if not row.get(field):
                    errors.append(prefix + f"{field} is required")

            if row.get("season") and not SEASON_RE.fullmatch(row["season"]):
                errors.append(prefix + "season must use YYYY/YY, e.g. 2026/27")
            if row.get("squad_level") and row["squad_level"] not in SQUAD_LEVELS:
                errors.append(prefix + "invalid squad_level")
            if row.get("statistics_scope") and row["statistics_scope"] not in SCOPES:
                errors.append(prefix + "invalid statistics_scope")
            if row.get("rights_status") and row["rights_status"] not in RIGHTS:
                errors.append(prefix + "invalid rights_status")
            if row.get("collected_at") and not parse_timestamp(row["collected_at"]):
                errors.append(prefix + "collected_at must be ISO 8601 with timezone")

            if row.get("statistics_scope") == "match":
                if not row.get("match_id"):
                    errors.append(prefix + "match_id is required for match scope")
                if not row.get("stat_date") or not DATE_RE.fullmatch(row["stat_date"]):
                    errors.append(prefix + "stat_date must be YYYY-MM-DD for match scope")
                elif not valid_date(row["stat_date"]):
                    errors.append(prefix + "stat_date is not a valid calendar date")
            elif row.get("match_id") or row.get("stat_date"):
                errors.append(prefix + "match_id/stat_date must be blank unless scope=match")

            values: dict[str, float] = {}
            for field in STAT_FIELDS:
                value = row.get(field, "")
                if not value:
                    continue  # Blank means unknown, never zero.
                try:
                    number = float(value)
                    if not math.isfinite(number) or number < 0:
                        raise ValueError
                    if field in INTEGER_FIELDS and not number.is_integer():
                        raise ValueError
                    values[field] = number
                except ValueError:
                    errors.append(
                        prefix + f"{field} must be a finite non-negative "
                        + ("integer" if field in INTEGER_FIELDS else "number")
                    )

            if "starts" in values and "appearances" in values and values["starts"] > values["appearances"]:
                errors.append(prefix + "starts cannot exceed appearances")
            if "shots_on_target" in values and "shots" in values and values["shots_on_target"] > values["shots"]:
                errors.append(prefix + "shots_on_target cannot exceed shots")

            if row.get("canonical_player_key"):
                key = tuple(row.get(field, "") for field in KEY_FIELDS)
                if row.get("statistics_scope") == "match":
                    key += (row.get("match_id", ""),)
                if key in seen:
                    errors.append(prefix + f"duplicate same-provider natural key (first seen on row {seen[key]})")
                else:
                    seen[key] = line
            else:
                errors.append(prefix + "canonical_player_key unresolved; resolve player identity before import")

            if row.get("rights_status") != "approved":
                errors.append(prefix + "rights_status is not approved; row is quarantined")

            if len(errors) == row_error_start and row.get("rights_status") == "approved":
                eligible += 1

    if rows_seen == 0:
        errors.append("CSV contains a header but no data rows")
    return errors, rows_seen, eligible


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path, help="Path to player statistics CSV")
    args = parser.parse_args()
    errors, rows, eligible = validate(args.csv_file)
    print(f"Rows checked: {rows}")
    print(f"Rows passing all structural and rights-status checks: {eligible}")
    if errors:
        print(f"Validation issues: {len(errors)}")
        for error in errors:
            print(f"- {error}")
        print("RESULT: NOT READY — no data was imported.")
        return 1
    print("RESULT: VALIDATION PASSED — preflight only; no data was imported.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
