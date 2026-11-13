#!/usr/bin/env python3
"""Validate and derive conservative player totals from the offline match-event ledger."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/player-match-event-ledger-2026-27.json"
COMPETITIONS = {"PL", "PD", "BL1", "SA", "FL1"}
FT_ID = re.compile(r"^FT-P-[0-9]{6}$")
MINUTE = re.compile(r"^[0-9]{1,3}(?:\+[0-9]{1,2})?$")


def _valid_player(player: object, errors: list[str], label: str) -> None:
    if not isinstance(player, dict):
        errors.append(f"{label}: player must be an object")
        return
    if not isinstance(player.get("observed_name"), str) or not player["observed_name"].strip():
        errors.append(f"{label}: observed_name is required")
    status, player_id = player.get("identity_status"), player.get("ft_player_id")
    if status not in {"verified", "unresolved"}:
        errors.append(f"{label}: identity_status is invalid")
    if status == "verified" and (not isinstance(player_id, str) or not FT_ID.fullmatch(player_id)):
        errors.append(f"{label}: verified identity requires an FT Player ID")
    if status == "unresolved" and player_id is not None:
        errors.append(f"{label}: unresolved identity must not carry an FT Player ID")


def validate(data: dict) -> dict:
    errors: list[str] = []
    if data.get("schema_version") != "1.0.0" or data.get("dataset_id") != "player-match-event-ledger-2026-27":
        errors.append("unsupported schema or dataset id")
    if data.get("season") != "2026/27":
        errors.append("only season 2026/27 is supported")
    if data.get("scope", {}).get("competitions") != ["PL", "PD", "BL1", "SA", "FL1"]:
        errors.append("competition scope must contain the five core leagues")
    records = data.get("records")
    if not isinstance(records, list):
        errors.append("records must be an array")
        records = []
    if data.get("dataset_status") != ("research_records_present" if records else "research_intake_empty"):
        errors.append("dataset_status does not match record count")

    expected_ids = [str(value) for value in data.get("expected_finished_match_ids", [])]
    if len(expected_ids) != len(set(expected_ids)):
        errors.append("expected_finished_match_ids contains duplicates")
    seen_matches: set[str] = set()
    for index, row in enumerate(records, start=1):
        label = f"match {index}"
        if not isinstance(row, dict):
            errors.append(f"{label}: record must be an object")
            continue
        match_id = str(row.get("match_id", ""))
        if not match_id or match_id in seen_matches:
            errors.append(f"{label}: match_id is empty or duplicated")
        seen_matches.add(match_id)
        if row.get("competition_code") not in COMPETITIONS or row.get("season") != "2026/27" or row.get("match_status") != "FINISHED":
            errors.append(f"{label}: competition, season, or match status is out of scope")
        home, away = row.get("home_team") or {}, row.get("away_team") or {}
        if not home.get("team_id") or not home.get("name") or not away.get("team_id") or not away.get("name") or home.get("team_id") == away.get("team_id"):
            errors.append(f"{label}: home/away team identity is invalid")
        if row.get("lineup_coverage") not in {"complete", "partial", "unknown"}:
            errors.append(f"{label}: lineup_coverage is invalid")
        if row.get("event_coverage") not in {"complete", "partial", "unknown"}:
            errors.append(f"{label}: event_coverage is invalid")
        if row.get("review_status") not in {"verified", "needs_review", "unverified"}:
            errors.append(f"{label}: review_status is invalid")

        sources = row.get("sources") or []
        source_ids, authoritative = set(), 0
        for source in sources:
            sid = source.get("source_id")
            if not sid or sid in source_ids or not source.get("name") or not str(source.get("url", "")).startswith("https://"):
                errors.append(f"{label}: source identity or HTTPS URL is invalid")
            source_ids.add(sid)
            if source.get("source_type") in {"official_competition", "federation", "licensed_provider"}:
                authoritative += 1
            if source.get("reuse_rights") not in {"confirmed", "pending", "prohibited"} or not source.get("checked_at"):
                errors.append(f"{label}: source rights or checked_at is invalid")
        if not sources:
            errors.append(f"{label}: at least one direct source is required")
        if row.get("review_status") == "verified":
            if len(sources) < 2 or authoritative < 1:
                errors.append(f"{label}: verified records require two direct sources including an organiser, federation, or licensed provider")
            if any(source.get("reuse_rights") != "confirmed" for source in sources):
                errors.append(f"{label}: verified records require confirmed reuse rights")
            if row.get("lineup_coverage") != "complete" or row.get("event_coverage") != "complete":
                errors.append(f"{label}: verified records require complete lineup and event coverage")

        lineup_keys = set()
        for item in row.get("lineups") or []:
            player = item.get("player")
            _valid_player(player, errors, label)
            if item.get("team_id") not in {home.get("team_id"), away.get("team_id")}:
                errors.append(f"{label}: lineup team_id is not one of the fixture teams")
            if item.get("role") not in {"starting_xi", "substitute"}:
                errors.append(f"{label}: lineup role is invalid")
            key = (item.get("team_id"), (player or {}).get("ft_player_id") or (player or {}).get("observed_name", "").casefold())
            if key in lineup_keys:
                errors.append(f"{label}: duplicate player in a team's lineup")
            lineup_keys.add(key)
            if not item.get("source_ids") or any(sid not in source_ids for sid in item.get("source_ids", [])):
                errors.append(f"{label}: lineup evidence must reference known source_ids")

        event_ids = set()
        for event in row.get("events") or []:
            event_id = event.get("event_id")
            if not event_id or event_id in event_ids:
                errors.append(f"{label}: event_id is empty or duplicated")
            event_ids.add(event_id)
            if not MINUTE.fullmatch(str(event.get("minute", ""))):
                errors.append(f"{label}: event minute is invalid")
            if event.get("team_id") not in {home.get("team_id"), away.get("team_id")}:
                errors.append(f"{label}: event team_id is not one of the fixture teams")
            if not event.get("source_ids") or any(sid not in source_ids for sid in event.get("source_ids", [])):
                errors.append(f"{label}: event evidence must reference known source_ids")
            if event.get("type") == "substitution":
                _valid_player(event.get("player_on"), errors, label)
                _valid_player(event.get("player_off"), errors, label)
            elif event.get("type") == "goal":
                goal_type = event.get("goal_type")
                if goal_type in {"normal", "penalty"}:
                    _valid_player(event.get("scorer"), errors, label)
                elif goal_type == "own_goal":
                    _valid_player(event.get("own_goal_player"), errors, label)
                    if event.get("scorer") is not None or event.get("assist_status") == "explicit":
                        errors.append(f"{label}: own goals must not be credited as a player goal or assist")
                else:
                    errors.append(f"{label}: goal_type is invalid")
                status = event.get("assist_status")
                if status not in {"explicit", "none_confirmed", "unknown"}:
                    errors.append(f"{label}: assist_status is invalid")
                if status == "explicit":
                    _valid_player(event.get("assist_player"), errors, label)
                elif event.get("assist_player") is not None:
                    errors.append(f"{label}: non-explicit assist must not carry an assist player")
            else:
                errors.append(f"{label}: event type is invalid")

    if expected_ids and not seen_matches.issubset(set(expected_ids)):
        errors.append("recorded match ids contain matches outside expected_finished_match_ids")
    if errors:
        raise ValueError("; ".join(errors))
    return {"records": len(records), "events": sum(len(row.get("events", [])) for row in records)}


def derive_player_statistics(data: dict) -> dict:
    """Return confirmed-ID lower-bound totals; unresolved names are never auto-merged."""
    validate(data)
    players, appeared = {}, set()

    def ensure(player):
        if player.get("identity_status") != "verified" or not player.get("ft_player_id"):
            return None
        pid = player["ft_player_id"]
        return players.setdefault(pid, {"ft_player_id": pid, "display_name": player["observed_name"],
                                        "appearances": 0, "goals": 0, "assists": 0})

    def mark_appearance(match_id, player):
        result = ensure(player)
        if result is not None:
            key = (match_id, player["ft_player_id"])
            if key not in appeared:
                appeared.add(key)
                result["appearances"] += 1

    for row in data["records"]:
        match_id = str(row["match_id"])
        for item in row.get("lineups", []):
            if item["role"] == "starting_xi":
                mark_appearance(match_id, item["player"])
            else:
                ensure(item["player"])  # Bench listing alone is not an appearance.
        for event in row.get("events", []):
            if event["type"] == "substitution":
                mark_appearance(match_id, event["player_on"])
            elif event["type"] == "goal":
                if event["goal_type"] in {"normal", "penalty"}:
                    scorer = ensure(event["scorer"])
                    if scorer is not None:
                        scorer["goals"] += 1
                elif event["goal_type"] == "own_goal":
                    ensure(event["own_goal_player"])  # Retain the identity, but do not credit a goal.
                if event["assist_status"] == "explicit":
                    assister = ensure(event["assist_player"])
                    if assister is not None:
                        assister["assists"] += 1

    expected = {str(value) for value in data.get("expected_finished_match_ids", [])}
    recorded = {str(row["match_id"]) for row in data["records"]}
    complete = bool(expected) and expected == recorded and all(
        row["lineup_coverage"] == "complete" and row["event_coverage"] == "complete"
        for row in data["records"]
    )
    return {
        "season": data["season"], "totals_are_lower_bounds": not complete,
        "coverage": {
            "expected_finished_matches": len(expected), "recorded_matches": len(recorded),
            "missing_match_ids": sorted(expected - recorded),
            "lineup_complete_matches": sum(row["lineup_coverage"] == "complete" for row in data["records"]),
            "event_complete_matches": sum(row["event_coverage"] == "complete" for row in data["records"])
        },
        "players": sorted(players.values(), key=lambda item: item["ft_player_id"])
    }


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    result = validate(data)
    stats = derive_player_statistics(data)
    print(f"Valid ledger: {result['records']} matches, {result['events']} events")
    print(f"Derived player records: {len(stats['players'])}; totals_are_lower_bounds={stats['totals_are_lower_bounds']}")


if __name__ == "__main__":
    main()
