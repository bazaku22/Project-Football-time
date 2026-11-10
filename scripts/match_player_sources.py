#!/usr/bin/env python3
"""Generate a conservative, read-only cross-source player identity candidate report.

This utility reads two Project Football Time player-database JSON exports.
It never calls an API, edits inputs, merges records, or writes to Supabase.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def identity_key(record: dict) -> tuple[str, str, str, str] | None:
    name = normalize(record.get("name"))
    league = normalize(record.get("leagueId"))
    season = normalize(record.get("season"))
    team = normalize(record.get("teamName"))
    if not all((name, league, season, team)):
        return None
    return name, league, season, team


def load_records(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise ValueError(f"{path}: expected an object with a records array")
    records = payload["records"]
    for i, row in enumerate(records):
        if not isinstance(row, dict):
            raise ValueError(f"{path}: records[{i}] must be an object")
        for field in ("playerId", "name", "leagueId", "season"):
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f"{path}: records[{i}] missing string field {field}")
    return records


def build_report(left: list[dict], right: list[dict]) -> dict:
    index: dict[tuple[str, str, str, str], list[dict]] = defaultdict(list)
    skipped_right = 0
    for row in right:
        key = identity_key(row)
        if key is None:
            skipped_right += 1
            continue
        index[key].append(row)

    matches, ambiguous, unmatched, skipped_left = [], [], [], 0
    used_right: set[int] = set()
    for row in left:
        key = identity_key(row)
        if key is None:
            skipped_left += 1
            continue
        candidates = index.get(key, [])
        item = {
            "leftPlayerId": row["playerId"],
            "leftName": row["name"],
            "leagueId": row["leagueId"],
            "season": row["season"],
            "teamName": row.get("teamName"),
            "matchMethod": "exact_normalized_name_league_season_team",
            "autoLink": False,
        }
        if len(candidates) == 1:
            candidate = candidates[0]
            item.update({
                "rightPlayerId": candidate["playerId"],
                "rightName": candidate["name"],
                "status": "candidate_requires_review",
            })
            matches.append(item)
            used_right.add(id(candidate))
        elif len(candidates) > 1:
            item.update({
                "candidatePlayerIds": [x["playerId"] for x in candidates],
                "status": "ambiguous",
            })
            ambiguous.append(item)
        else:
            item["status"] = "unmatched"
            unmatched.append(item)

    return {
        "schemaVersion": 1,
        "mode": "read_only_candidate_report",
        "matchingRule": "normalized name + league + season + team",
        "autoLinksCreated": 0,
        "summary": {
            "leftRecords": len(left),
            "rightRecords": len(right),
            "candidateMatches": len(matches),
            "ambiguous": len(ambiguous),
            "unmatched": len(unmatched),
            "leftSkippedMissingTeamOrIdentity": skipped_left,
            "rightSkippedMissingTeamOrIdentity": skipped_right,
            "rightRecordsMatched": len(used_right),
        },
        "matches": matches,
        "ambiguous": ambiguous,
        "unmatched": unmatched,
        "warning": "Candidates are not verified identities. Review transfers, duplicate names, team aliases, and youth/senior teams manually.",
    }


def self_test() -> None:
    left = [
        {"playerId": "striker:1", "name": "José Example", "leagueId": "PL", "season": "2026", "teamName": "Arsenal"},
        {"playerId": "striker:2", "name": "Alex Smith", "leagueId": "PL", "season": "2026", "teamName": "United"},
        {"playerId": "striker:3", "name": "No Team", "leagueId": "PL", "season": "2026", "teamName": ""},
        {"playerId": "striker:4", "name": "Transfer", "leagueId": "PL", "season": "2026", "teamName": "Old FC"},
    ]
    right = [
        {"playerId": "openplay:9", "name": "Jose Example", "leagueId": "PL", "season": "2026", "teamName": "Arsenal"},
        {"playerId": "openplay:10", "name": "Alex Smith", "leagueId": "PL", "season": "2026", "teamName": "United"},
        {"playerId": "openplay:11", "name": "Alex Smith", "leagueId": "PL", "season": "2026", "teamName": "United"},
        {"playerId": "openplay:12", "name": "Transfer", "leagueId": "PL", "season": "2026", "teamName": "New FC"},
    ]
    report = build_report(left, right)
    assert report["summary"]["candidateMatches"] == 1
    assert report["summary"]["ambiguous"] == 1
    assert report["summary"]["unmatched"] == 1
    assert report["summary"]["leftSkippedMissingTeamOrIdentity"] == 1
    assert report["autoLinksCreated"] == 0
    print("SELF_TEST_OK: conservative match, ambiguous duplicate, transfer mismatch, missing team")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--left", type=Path)
    parser.add_argument("--right", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.left or not args.right or not args.output:
        parser.error("--left, --right, and --output are required unless --self-test is used")
    report = build_report(load_records(args.left), load_records(args.right))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
