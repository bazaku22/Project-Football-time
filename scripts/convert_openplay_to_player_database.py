#!/usr/bin/env python3
"""Convert a locally obtained OpenPlay Parquet snapshot to PFT player DB schema.

This tool never downloads data and never writes to the production database unless
an explicit output path is supplied. Review upstream data rights before publishing
any generated file.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import pandas as pd

LEAGUES = {
    "eng": ("PL", "Premier League"),
    "esp": ("PD", "La Liga"),
    "ger": ("BL1", "Bundesliga"),
    "ita": ("SA", "Serie A"),
    "fra": ("FL1", "Ligue 1"),
}
REQUIRED = {
    "comp", "season", "team", "player_id", "player", "position",
    "is_starter", "minutes_played", "goals", "assists", "xg", "xa",
    "shots", "shots_on_target", "key_passes", "tackles", "interceptions",
    "yellow_cards", "second_yellows", "red_cards",
}
SUM_FIELDS = [
    "minutes_played", "goals", "assists", "xg", "xa", "shots",
    "shots_on_target", "key_passes", "tackles", "interceptions",
    "yellow_cards", "second_yellows", "red_cards",
]


def clean(value):
    if value is None or pd.isna(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def season_label(value: object) -> str:
    if isinstance(value, (int, float)) and float(value).is_integer():
        raw = str(int(value))
    else:
        raw = str(value).strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 4:
        return f"20{digits[:2]}/20{digits[2:]}"
    return raw


def slug(value: object) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "unknown"


def aggregate(frame: pd.DataFrame) -> list[dict]:
    missing = REQUIRED.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing required fields: {sorted(missing)}")
    data = frame[frame["comp"].isin(LEAGUES)].copy()
    if data.empty:
        raise ValueError("No rows found for the five supported leagues")

    data["player_id"] = data["player_id"].astype(str)
    data["team"] = data["team"].fillna("Unknown team").astype(str)
    data["player"] = data["player"].fillna("").astype(str)
    data["position"] = data["position"].fillna("Unknown").astype(str)
    data["is_starter"] = data["is_starter"].map(
        lambda x: None if pd.isna(x) else bool(x)
    )
    for field in SUM_FIELDS:
        data[field] = pd.to_numeric(data[field], errors="coerce")

    keys = ["comp", "season", "player_id", "player", "team", "position"]
    grouped = data.groupby(keys, dropna=False, sort=True)
    rows = []
    for key, group in grouped:
        comp, season, provider_id, name, team, position = key
        league_id, league_name = LEAGUES[comp]
        starts = group["is_starter"].dropna()
        stats = {
            "appearances": int(len(group)),
            "lineups": int(starts.sum()) if len(starts) else None,
        }
        target_names = {
            "minutes_played": "minutes", "goals": "goals",
            "assists": "assists", "xg": "xg", "xa": "xa",
            "shots": "shotsTotal", "shots_on_target": "shotsOnTarget",
            "key_passes": "keyPasses", "tackles": "tackles",
            "interceptions": "interceptions", "yellow_cards": "yellowCards",
            "red_cards": "redCards",
        }
        for source, target in target_names.items():
            values = group[source].dropna()
            stats[target] = clean(values.sum()) if len(values) else None

        minutes = stats["minutes"]
        if minutes is not None and minutes > 0:
            stats["goalsPer90"] = (
                round(stats["goals"] * 90 / minutes, 4)
                if stats["goals"] is not None else None
            )
            stats["xgPer90"] = (
                round(stats["xg"] * 90 / minutes, 4)
                if stats["xg"] is not None else None
            )
        else:
            stats["goalsPer90"] = None
            stats["xgPer90"] = None

        season_text = season_label(season)
        team_id = f"openplay:{league_id}:{slug(team)}"
        player_key = f"openplay:{provider_id}"
        record_id = f"{player_key}:{league_id}:{season_text}:{slug(team)}:{slug(position)}"
        rows.append({
            "id": record_id,
            "playerId": player_key,
            "name": name,
            "age": None,
            "nationality": None,
            "height": None,
            "weight": None,
            "photo": None,
            "number": None,
            "position": position,
            "teamId": team_id,
            "teamName": team,
            "leagueId": league_id,
            "leagueName": league_name,
            "season": season_text,
            "statistics": stats,
            "profileStatus": "historical_stats",
            "source": {
                "provider": "OpenPlay",
                "providerPlayerId": str(provider_id),
                "providerTeamName": team,
                "season": season_text,
                "dataType": "historical_player_match_aggregate",
                "attribution": "openplay (Noah Bair)",
                "sourceRelease": "data-v0.1.0",
            },
        })
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate generated player record IDs")
    return rows


def self_test() -> None:
    sample = pd.DataFrame([
        {
            "comp": "eng", "season": "2526", "team": "Example FC",
            "player_id": 7, "player": "Sample Player", "position": "FW",
            "is_starter": True, "minutes_played": 90, "goals": 1,
            "assists": 0, "xg": 0.4, "xa": 0.1, "shots": 3,
            "shots_on_target": 2, "key_passes": 1, "tackles": 0,
            "interceptions": 0, "yellow_cards": 0, "second_yellows": 0,
            "red_cards": 0,
        },
        {
            "comp": "eng", "season": "2526", "team": "Example FC",
            "player_id": 7, "player": "Sample Player", "position": "FW",
            "is_starter": False, "minutes_played": 30, "goals": 0,
            "assists": 1, "xg": 0.2, "xa": 0.3, "shots": 1,
            "shots_on_target": 1, "key_passes": 2, "tackles": 1,
            "interceptions": 0, "yellow_cards": 1, "second_yellows": 0,
            "red_cards": 0,
        },
    ])
    result = aggregate(sample)
    assert len(result) == 1
    row = result[0]
    assert row["season"] == "2025/26"
    assert row["statistics"]["appearances"] == 2
    assert row["statistics"]["lineups"] == 1
    assert row["statistics"]["minutes"] == 120
    assert row["statistics"]["goals"] == 1
    assert row["statistics"]["assists"] == 1
    assert row["statistics"]["goalsPer90"] == 0.75
    assert row["statistics"]["xgPer90"] == 0.45
    assert row["statistics"]["yellowCards"] == 1
    print("SELF_TEST_OK: aggregation, season labels, per-90 metrics, and IDs")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Path to a locally obtained player_match_stats.parquet")
    parser.add_argument("--output", type=Path, help="Explicit output JSON path; never defaults to production DB")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.input or not args.output:
        parser.error("--input and --output are required unless --self-test is used")
    frame = pd.read_parquet(args.input, engine="pyarrow")
    records = aggregate(frame)
    output = {
        "schemaVersion": 1,
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "source": {
            "provider": "OpenPlay",
            "status": "historical_import_candidate",
            "release": "data-v0.1.0",
            "attribution": "openplay (Noah Bair)",
            "recordCount": len(records),
            "note": "Historical data only through 2025/26. Review upstream rights before public distribution.",
        },
        "nextProfileOffset": 0,
        "records": records,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(f"Converted {len(records):,} player-season-team-position records to {args.output}")


if __name__ == "__main__":
    main()
