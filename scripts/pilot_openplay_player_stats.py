#!/usr/bin/env python3
"""Evaluate OpenPlay historical player statistics without changing production data."""

from __future__ import annotations

import argparse
import json
import tempfile
import urllib.request
from pathlib import Path

import pandas as pd

RELEASE = "data-v0.1.0"
BASE = f"https://github.com/nlbair/openplay/releases/download/{RELEASE}"
LEAGUES = {
    "eng": "Premier League",
    "esp": "La Liga",
    "ger": "Bundesliga",
    "ita": "Serie A",
    "fra": "Ligue 1",
}
REQUIRED = {
    "comp", "season", "date", "team", "player_id", "player", "position",
    "is_starter", "minutes_played", "goals", "assists", "xg", "xa",
    "shots", "shots_on_target", "key_passes", "tackles", "interceptions",
    "yellow_cards", "second_yellows", "red_cards",
}
SUM_FIELDS = [
    "minutes_played", "goals", "assists", "xg", "xa", "shots",
    "shots_on_target", "key_passes", "tackles", "interceptions",
    "yellow_cards", "second_yellows", "red_cards",
]


def aggregate_player_seasons(frame: pd.DataFrame) -> pd.DataFrame:
    """Aggregate player-match rows into provider-specific player-season rows."""
    missing = REQUIRED.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing required fields: {sorted(missing)}")

    data = frame[frame["comp"].isin(LEAGUES)].copy()
    if data.empty:
        raise ValueError("No rows found for the five target leagues")

    data["is_starter"] = data["is_starter"].fillna(False).astype(bool)
    grouped = data.groupby(
        ["comp", "season", "player_id", "player", "team", "position"],
        dropna=False,
    )
    result = grouped.agg(
        appearances=("player_id", "size"),
        starts=("is_starter", "sum"),
        **{field: (field, "sum") for field in SUM_FIELDS},
    ).reset_index()
    result["league"] = result["comp"].map(LEAGUES)
    return result


def self_test() -> None:
    rows = []
    for comp in LEAGUES:
        rows.append({
            "comp": comp, "season": "2526", "date": "2026-01-01",
            "team": "Example FC", "player_id": 7, "player": "Sample Player",
            "position": "FW", "is_starter": True, "minutes_played": 90,
            "goals": 1, "assists": 0, "xg": 0.4, "xa": 0.1, "shots": 3,
            "shots_on_target": 2, "key_passes": 1, "tackles": 0,
            "interceptions": 0, "yellow_cards": 0, "second_yellows": 0,
            "red_cards": 0,
        })
    result = aggregate_player_seasons(pd.DataFrame(rows))
    assert len(result) == 5
    assert set(result["league"]) == set(LEAGUES.values())
    assert int(result["appearances"].sum()) == 5
    print("SELF_TEST_OK: five league mappings and player-season aggregation")


def download_asset(name: str, destination: Path) -> None:
    request = urllib.request.Request(
        f"{BASE}/{name}",
        headers={"User-Agent": "Project-Football-Time-open-data-pilot"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        destination.write_bytes(response.read())


def run_pilot() -> None:
    with tempfile.TemporaryDirectory(prefix="pft-openplay-") as temp_dir:
        source = Path(temp_dir) / "player_match_stats.parquet"
        print(f"Downloading OpenPlay {RELEASE} player_match_stats.parquet ...")
        download_asset("player_match_stats.parquet", source)
        frame = pd.read_parquet(source, engine="pyarrow")
        result = aggregate_player_seasons(frame)

        print("\nOPENPLAY PLAYER DATA PILOT")
        print(f"Release: {RELEASE}")
        print(f"Player-match rows in source: {len(frame):,}")
        print(f"Player-season-team-position rows (five leagues): {len(result):,}")
        print(f"Unique provider player IDs (five leagues): {result['player_id'].nunique():,}")
        print(f"Season range: {', '.join(sorted(result['season'].astype(str).unique()))}")
        print("\nCoverage by league and season:")
        summary = result.groupby(["league", "season"], dropna=False).agg(
            player_season_rows=("player_id", "size"),
            unique_players=("player_id", "nunique"),
            appearances=("appearances", "sum"),
            minutes=("minutes_played", "sum"),
            goals=("goals", "sum"),
            assists=("assists", "sum"),
            xg=("xg", "sum"),
            xa=("xa", "sum"),
        ).reset_index()
        print(summary.to_string(index=False))
        print("\nField coverage:")
        for field in ["minutes_played", "goals", "assists", "xg", "xa",
                      "shots", "key_passes", "tackles", "interceptions"]:
            print(f"  {field}: {frame[field].notna().mean():.1%}")
        print("\nNo source rows or player records were saved to the repository.")
        print("Attribution: openplay (Noah Bair), CC BY 4.0.")
        print("Snapshot ends at 2025/26; it is not a live 2026/27 feed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        run_pilot()


if __name__ == "__main__":
    main()
