#!/usr/bin/env python3
"""Build an offline, rights-attributed OpenPlay historical player-statistics review.

Downloads only the published player_match_stats.parquet, coverage.csv and
 data_issues.csv assets from the pinned OpenPlay release. No app, Supabase,
 provider API, or GitHub repository data writes are performed.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

RELEASE_API = "https://api.github.com/repos/nlbair/openplay/releases/tags/data-v0.1.0"
SOURCE_URL = "https://github.com/nlbair/openplay"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
ATTRIBUTION = "openplay (Noah Bair)"
COMPETITIONS = {"eng", "esp", "ger", "ita", "fra"}
SEASON_LABELS = {"2526": "2025/26"}
METRICS = (
    "appearances", "starts", "minutes", "goals", "assists", "shots",
    "shots_on_target", "xg", "xa", "yellow_cards", "red_cards", "saves",
)
INT_METRICS = set(METRICS) - {"xg", "xa"}
OUTPUT_FIELDS = (
    "source", "source_release", "source_player_id", "player_name",
    "source_team_id", "source_team_name", "competition_code", "season",
    "match_id", "stat_date", "statistics_scope", "data_quality_status",
    *METRICS,
)


def _http_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "Football-Time-OpenPlay-Intake/1.0", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def _download(url: str, path: Path) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Football-Time-OpenPlay-Intake/1.0"})
    digest = hashlib.sha256()
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(request, timeout=180) as response, path.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            digest.update(chunk)
    return digest.hexdigest()


def _checksum_map(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.exists():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s*([0-9a-fA-F]{64})\s+\*?(.+?)\s*$", line)
        if match:
            result[Path(match.group(2)).name] = match.group(1).lower()
    return result


def download_release_assets(directory: Path) -> dict[str, Any]:
    release = _http_json(RELEASE_API)
    if release.get("tag_name") != "data-v0.1.0":
        raise ValueError("OpenPlay release tag mismatch; refusing unpinned data")
    assets = {a.get("name"): a for a in release.get("assets", [])}
    required = ("SHA256SUMS.txt", "player_match_stats.parquet", "coverage.csv", "data_issues.csv")
    missing = [name for name in required if name not in assets]
    if missing:
        raise ValueError("OpenPlay release is missing assets: " + ", ".join(missing))
    checksums_path = directory / "SHA256SUMS.txt"
    sums_asset = assets["SHA256SUMS.txt"]
    sums_hash = _download(sums_asset["browser_download_url"], checksums_path)
    checksums = _checksum_map(checksums_path)
    downloaded: dict[str, Any] = {"release_tag": release["tag_name"], "assets": {}}
    for name in required[1:]:
        asset = assets[name]
        target = directory / name
        actual = _download(asset["browser_download_url"], target)
        expected = checksums.get(name)
        api_digest = str(asset.get("digest") or "")
        if expected and actual != expected:
            raise ValueError(f"SHA-256 mismatch for {name}")
        if api_digest.startswith("sha256:") and actual != api_digest.split(":", 1)[1].lower():
            raise ValueError(f"GitHub asset digest mismatch for {name}")
        if not expected and not api_digest.startswith("sha256:"):
            raise ValueError(f"No verifiable SHA-256 published for {name}")
        downloaded["assets"][name] = {
            "sha256": actual, "size_bytes": target.stat().st_size,
            "verified_against": "SHA256SUMS.txt" if expected else "GitHub asset digest",
        }
    downloaded["assets"]["SHA256SUMS.txt"] = {"sha256": sums_hash, "size_bytes": checksums_path.stat().st_size}
    return downloaded


def _truth(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes"}


def _number(value: Any, integer: bool = False) -> int | float:
    if value is None or value == "":
        return 0
    number = float(value)
    if number < 0:
        raise ValueError("negative statistic value")
    return int(number) if integer else number


def transform_records(
    source_rows: list[dict[str, Any]],
    issue_match_ids: set[str],
    season_label: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    match_rows: list[dict[str, Any]] = []
    players: dict[str, dict[str, Any]] = {}
    eligible_aggregate: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    quarantined_rows = 0

    for row in source_rows:
        comp = str(row.get("comp") or "")
        season_code = str(row.get("season") or "")
        if comp not in COMPETITIONS:
            continue
        if season_code != "2526":
            continue
        source_player_id = str(row.get("player_id") or "").strip()
        if not source_player_id:
            continue
        match_id = str(row.get("match_id") or "")
        quality = "known_issue_quarantined" if match_id in issue_match_ids else "eligible_pending_identity_review"
        quarantined_rows += quality != "eligible_pending_identity_review"
        is_played = _truth(row.get("played"))
        metrics = {
            "appearances": 1 if is_played else 0,
            "starts": 1 if _truth(row.get("is_starter")) else 0,
            "minutes": _number(row.get("minutes_played"), True),
            "goals": _number(row.get("goals"), True),
            "assists": _number(row.get("assists"), True),
            "shots": _number(row.get("shots"), True),
            "shots_on_target": _number(row.get("shots_on_target"), True),
            "xg": _number(row.get("xg")),
            "xa": _number(row.get("xa")),
            "yellow_cards": _number(row.get("yellow_cards"), True) + _number(row.get("second_yellows"), True),
            "red_cards": _number(row.get("red_cards"), True) + _number(row.get("second_yellows"), True),
            "saves": _number(row.get("saves"), True),
        }
        output = {
            "source": "openplay", "source_release": "data-v0.1.0",
            "source_player_id": source_player_id,
            "player_name": str(row.get("player") or ""),
            "source_team_id": str(row.get("team_id") or ""),
            "source_team_name": str(row.get("team") or ""),
            "competition_code": comp, "season": season_label,
            "match_id": match_id, "stat_date": str(row.get("date") or ""),
            "statistics_scope": "match", "data_quality_status": quality,
            **metrics,
        }
        match_rows.append(output)
        if source_player_id not in players:
            players[source_player_id] = {
                "source": "openplay", "source_player_id": source_player_id,
                "source_player_name": str(row.get("player") or ""),
                "canonical_player_key": "", "review_status": "pending_manual_identity_review",
                "reviewer": "", "reviewed_at": "", "notes": "",
            }
        if quality == "known_issue_quarantined":
            continue
        key = (comp, season_label, str(row.get("team_id") or ""), source_player_id)
        aggregate = eligible_aggregate.setdefault(key, {
            "source": "openplay", "source_release": "data-v0.1.0",
            "source_player_id": source_player_id, "player_name": str(row.get("player") or ""),
            "source_team_id": str(row.get("team_id") or ""), "source_team_name": str(row.get("team") or ""),
            "competition_code": comp, "season": season_label, "match_id": "",
            "stat_date": "", "statistics_scope": "season",
            "data_quality_status": "quality_filtered_partial",
            **{metric: 0 for metric in METRICS},
        })
        for metric, value in metrics.items():
            aggregate[metric] += value

    season_rows = sorted(eligible_aggregate.values(), key=lambda x: (x["competition_code"], x["source_team_name"], x["player_name"], x["source_player_id"]))
    report = {
        "source": ATTRIBUTION, "source_url": SOURCE_URL, "license": "CC-BY-4.0",
        "license_url": LICENSE_URL, "attribution_required": True,
        "attribution_text": ATTRIBUTION, "source_release": "data-v0.1.0",
        "season": season_label, "competition_codes": sorted(COMPETITIONS),
        "match_stat_rows": len(match_rows), "season_stat_rows": len(season_rows),
        "unique_source_player_ids": len(players), "known_issue_quarantined_match_rows": quarantined_rows,
        "identity_mappings_approved": 0, "canonical_player_ids_assigned": 0,
        "production_import": False, "supabase_writes": 0, "provider_api_calls": 0,
        "notes": [
            "OpenPlay is a historical snapshot through 2025/26; it is not a live 2026/27 feed.",
            "Source player and team IDs are preserved and are not Football Time canonical IDs.",
            "No player identity is mapped by name. Use the mapping template for human-reviewed exact source-ID mapping.",
            "Known-issue matches are retained in match review output but excluded from season aggregates.",
            "Season aggregates are partial where the source coverage report shows missing matches.",
            "Second yellow cards count as both a yellow-card event and a dismissal in the normalized metrics.",
            "Minutes use OpenPlay expanded minutes and include stoppage time.",
            "No clean sheets or unprovided metrics are inferred.",
        ],
    }
    return match_rows, season_rows, {"report": report, "players": list(players.values())}


def _write_csv(path: Path, rows: list[dict[str, Any]], fields: tuple[str, ...] | list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(fields), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def build_from_parquet(input_path: Path, coverage_path: Path, issues_path: Path, output_dir: Path, season_code: str) -> dict[str, Any]:
    try:
        import duckdb
    except ImportError as exc:
        raise RuntimeError("Install duckdb to read the OpenPlay Parquet file: pip install duckdb") from exc
    if season_code not in SEASON_LABELS:
        raise ValueError("Only the published 2025/26 season is enabled in this historical intake")
    season_label = SEASON_LABELS[season_code]
    issues: set[str] = set()
    with issues_path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            if row.get("comp") in COMPETITIONS and row.get("season") == season_code:
                issues.add(str(row.get("match_id") or ""))
    con = duckdb.connect(database=":memory:")
    try:
        columns = [
            "match_id", "comp", "season", "CAST(date AS VARCHAR) AS date",
            "team_id", "team", "player_id", "player", "is_starter", "played",
            "minutes_played", "goals", "assists", "shots", "shots_on_target",
            "xg", "xa", "yellow_cards", "second_yellows", "red_cards", "saves",
        ]
        placeholders = ",".join("?" for _ in COMPETITIONS)
        query = f"SELECT {', '.join(columns)} FROM read_parquet(?) WHERE comp IN ({placeholders}) AND season = ? ORDER BY comp, match_id, team_id, player_id"
        result = con.execute(query, [str(input_path), *sorted(COMPETITIONS), season_code])
        names = [item[0] for item in result.description]
        rows = [dict(zip(names, values)) for values in result.fetchall()]
    finally:
        con.close()
    match_rows, season_rows, metadata = transform_records(rows, issues, season_label)
    output_dir.mkdir(parents=True, exist_ok=True)
    _write_csv(output_dir / "openplay-player-match-stats-review.csv", match_rows, OUTPUT_FIELDS)
    _write_csv(output_dir / "openplay-player-season-stats-review.csv", season_rows, OUTPUT_FIELDS)
    _write_csv(output_dir / "openplay-player-id-mapping-template.csv", metadata["players"],
               ("source", "source_player_id", "source_player_name", "canonical_player_key", "review_status", "reviewer", "reviewed_at", "notes"))
    coverage_rows = []
    with coverage_path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            if row.get("comp") in COMPETITIONS and row.get("season") == season_code:
                coverage_rows.append(row)
    report = metadata["report"]
    report["coverage"] = coverage_rows
    report["coverage_total_matches_played"] = sum(int(x.get("matches_played") or 0) for x in coverage_rows)
    report["coverage_total_matches_with_events"] = sum(int(x.get("matches_with_events") or 0) for x in coverage_rows)
    report["coverage_total_gaps"] = sum(int(x.get("gaps") or 0) for x in coverage_rows)
    report["input_sha256"] = hashlib.sha256(input_path.read_bytes()).hexdigest()
    (output_dir / "openplay-player-stats-intake-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_dir / "ATTRIBUTION.txt").write_text(
        "Data: openplay (Noah Bair), data release v0.1.0.\n"
        "License: Creative Commons Attribution 4.0 International (CC BY 4.0).\n"
        "Source: https://github.com/nlbair/openplay\n"
        "License: https://creativecommons.org/licenses/by/4.0/\n"
        "This artifact is a historical review/staging export, not a Production import.\n",
        encoding="utf-8",
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download-release", action="store_true", help="Download and checksum-verify pinned OpenPlay release assets")
    parser.add_argument("--input", help="Local player_match_stats.parquet path")
    parser.add_argument("--coverage", help="Local coverage.csv path")
    parser.add_argument("--issues", help="Local data_issues.csv path")
    parser.add_argument("--season", default="2526", choices=sorted(SEASON_LABELS))
    parser.add_argument("--output-dir", default="openplay-intake-output")
    parser.add_argument("--download-dir", default=".openplay-download")
    args = parser.parse_args()
    try:
        download_dir = Path(args.download_dir)
        if args.download_release:
            download_release_assets(download_dir)
            args.input = str(download_dir / "player_match_stats.parquet")
            args.coverage = str(download_dir / "coverage.csv")
            args.issues = str(download_dir / "data_issues.csv")
        if not all((args.input, args.coverage, args.issues)):
            raise ValueError("Provide --input, --coverage and --issues, or use --download-release")
        report = build_from_parquet(Path(args.input), Path(args.coverage), Path(args.issues), Path(args.output_dir), args.season)
    except (OSError, ValueError, RuntimeError, urllib.error.URLError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({k: report[k] for k in ("season", "match_stat_rows", "season_stat_rows", "unique_source_player_ids", "known_issue_quarantined_match_rows", "coverage_total_matches_played", "coverage_total_matches_with_events", "coverage_total_gaps", "production_import", "supabase_writes", "provider_api_calls")}, ensure_ascii=False, indent=2))
    print("Offline staging only. No StrikerAPI credits or Supabase writes were used.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
