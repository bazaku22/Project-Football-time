#!/usr/bin/env python3
"""Offline player identity reconciliation queue; never auto-merges players.

Provider identities are exact (provider, provider_player_id) pairs. Existing
mappings become verified only when an explicit review status, reviewer and
timestamp are present. Similar names/DOBs only generate human-review candidates.
No network or database access.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

PROVIDER_REQUIRED = {"provider", "provider_player_id", "player_name"}
CANONICAL_REQUIRED = {"canonical_player_key", "display_name"}
MAPPING_REQUIRED = {"provider", "provider_player_id", "canonical_player_key"}
VERIFIED = "verified"


def normalize_name(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def read_csv(path: Path, required: set[str]) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames or []
        if len(fields) != len(set(fields)):
            raise ValueError(f"{path}: duplicate column names")
        missing = sorted(required - set(fields))
        if missing:
            raise ValueError(f"{path}: missing columns: {', '.join(missing)}")
        rows = []
        for line, raw in enumerate(reader, start=2):
            if None in raw:
                raise ValueError(f"{path}: row {line} has more values than header")
            rows.append({k: (v or "").strip() for k, v in raw.items() if k})
        return rows


def reconcile(provider_rows, canonical_rows, mapping_rows):
    canonical_by_key = {}
    for row in canonical_rows:
        key = row["canonical_player_key"]
        if not key or key in canonical_by_key:
            raise ValueError("Canonical player keys must be non-empty and unique")
        canonical_by_key[key] = row

    by_identity = defaultdict(list)
    for row in mapping_rows:
        key = (row["provider"].casefold(), row["provider_player_id"])
        if not all(key) or not row["canonical_player_key"]:
            raise ValueError("Mapping provider, provider_player_id and canonical_player_key are required")
        by_identity[key].append(row)

    seen_provider_ids = set()
    results = []
    for row in provider_rows:
        provider = row["provider"].casefold()
        provider_id = row["provider_player_id"]
        if not provider or not provider_id or not row["player_name"]:
            raise ValueError("Provider, provider_player_id and player_name are required")
        identity = (provider, provider_id)
        issues = []
        candidates = []
        if identity in seen_provider_ids:
            results.append({
                "provider": provider, "provider_player_id": provider_id,
                "player_name": row["player_name"], "status": "duplicate_provider_identity",
                "canonical_player_key": "", "candidate_keys": "",
                "candidate_reasons": "", "review_required": "true",
                "issues": "Duplicate provider identity within input file",
            })
            continue
        seen_provider_ids.add(identity)

        mapped = by_identity.get(identity, [])
        if len(mapped) > 1:
            status = "conflicting_mapping"
            issues.append("More than one mapping exists for this exact provider identity")
        elif mapped:
            mapping = mapped[0]
            target = mapping["canonical_player_key"]
            if target not in canonical_by_key:
                status = "mapping_target_missing"
                issues.append("Mapped canonical player key does not exist in canonical registry")
            elif mapping.get("review_status", "").casefold() == VERIFIED:
                if not mapping.get("reviewer") or not mapping.get("reviewed_at"):
                    status = "mapping_needs_review"
                    issues.append("Verified mapping is missing reviewer or reviewed_at evidence")
                else:
                    status = "exact_verified_mapping"
            else:
                status = "mapping_needs_review"
                issues.append("Exact provider ID mapping exists but has not been explicitly verified")
            candidates = [target] if target in canonical_by_key else []
        else:
            source_name = normalize_name(row["player_name"])
            source_dob = row.get("date_of_birth", "")
            for key, canonical in canonical_by_key.items():
                reasons = []
                if source_name and source_name == normalize_name(canonical.get("display_name", "")):
                    reasons.append("normalized_name_exact")
                if source_dob and canonical.get("date_of_birth") and source_dob == canonical["date_of_birth"]:
                    reasons.append("date_of_birth_exact")
                if reasons:
                    candidates.append((key, reasons))
            candidates.sort(key=lambda item: item[0])
            status = "needs_identity_review"
            if candidates:
                issues.append("Candidate similarity is advisory only; no identity link was created")
        if mapped and candidates and isinstance(candidates[0], str):
            candidate_text = candidates[0]
            reason_text = "exact_provider_id_mapping"
        else:
            candidate_text = ";".join(key for key, _ in candidates)
            reason_text = ";".join(
                f"{key}:{'+'.join(reasons)}" for key, reasons in candidates
            )
        canonical_key = (
            mapped[0]["canonical_player_key"]
            if len(mapped) == 1 and status == "exact_verified_mapping" else ""
        )
        results.append({
            "provider": provider, "provider_player_id": provider_id,
            "player_name": row["player_name"], "status": status,
            "canonical_player_key": canonical_key, "candidate_keys": candidate_text,
            "candidate_reasons": reason_text, "review_required": str(status != "exact_verified_mapping").lower(),
            "issues": " | ".join(issues),
        })
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("provider_csv", type=Path)
    parser.add_argument("canonical_csv", type=Path)
    parser.add_argument("mapping_csv", type=Path)
    parser.add_argument("--out", type=Path, default=Path("player-identity-review-queue.csv"))
    parser.add_argument("--summary", type=Path, default=Path("player-identity-review-summary.json"))
    args = parser.parse_args()
    try:
        inputs = {p.resolve() for p in (args.provider_csv, args.canonical_csv, args.mapping_csv)}
        outputs = {args.out.resolve(), args.summary.resolve()}
        if len(outputs) != 2 or inputs & outputs:
            raise ValueError("Output paths must be distinct and must not overwrite input files")
        provider = read_csv(args.provider_csv, PROVIDER_REQUIRED)
        canonical = read_csv(args.canonical_csv, CANONICAL_REQUIRED)
        mappings = read_csv(args.mapping_csv, MAPPING_REQUIRED)
        rows = reconcile(provider, canonical, mappings)
        columns = ["provider", "provider_player_id", "player_name", "status",
                   "canonical_player_key", "candidate_keys", "candidate_reasons",
                   "review_required", "issues"]
        with args.out.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
        counts = {}
        for row in rows:
            counts[row["status"]] = counts.get(row["status"], 0) + 1
        args.summary.write_text(json.dumps({
            "preview_only": True, "provider_rows": len(rows), "status_counts": counts,
            "automatic_merges": 0, "database_writes": 0,
            "notice": "Only explicit verified exact provider-ID mappings are resolved. All similarity candidates require human review."
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, csv.Error) as exc:
        print(f"RECONCILIATION FAILED: {exc}", file=sys.stderr)
        return 2
    print(f"Provider identities reviewed: {len(rows)}")
    for status, count in sorted(counts.items()):
        print(f"{status}: {count}")
    print("Preview only — no player identities were merged and no database was changed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
