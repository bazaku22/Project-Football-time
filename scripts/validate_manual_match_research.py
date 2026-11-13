#!/usr/bin/env python3
"""Offline safety and consistency validator for manual match research intake."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "manual-match-research-2026-27.json"
ALLOWED = {"PL", "PD", "BL1", "SA", "FL1", "UNL"}
CLUB = {"PL", "PD", "BL1", "SA", "FL1"}
INTERNATIONAL = {"UNL"}
STATUSES = {"SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"}
RIGHTS = {"confirmed", "pending", "prohibited"}


def fail(message):
    raise ValueError(message)


def valid_timestamp(value, label):
    if not isinstance(value, str):
        fail(f"{label} must be an ISO-8601 timestamp")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{label} must be an ISO-8601 timestamp")


def validate(data):
    if data.get("schema_version") != "1.0.0" or data.get("dataset_id") != "manual-match-research-2026-27":
        fail("Unexpected dataset identity or schema version")
    if data.get("season") != "2026/27" or data.get("timezone") != "Asia/Bangkok":
        fail("Only the 2026/27 season and Asia/Bangkok display timezone are in scope")
    scope = data.get("scope", {})
    if scope.get("club_competitions") != ["PL", "PD", "BL1", "SA", "FL1"]:
        fail("Core club competition scope must remain the five approved leagues")
    if scope.get("international_competitions") != ["UNL"]:
        fail("International scope must remain UEFA Nations League only")
    records = data.get("records")
    if not isinstance(records, list):
        fail("records must be an array")
    ids = set()
    fixture_keys = set()
    for row in records:
        rid = row.get("record_id")
        if not rid or rid in ids:
            fail(f"Missing or duplicate record_id: {rid}")
        ids.add(rid)
        competition = row.get("competition_code")
        if competition not in ALLOWED or row.get("season") != "2026/27":
            fail(f"{rid}: competition or season is out of scope")
        fixture = row.get("fixture_ref", {})
        if not fixture.get("home_team") or not fixture.get("away_team"):
            fail(f"{rid}: home_team and away_team are required")
        if competition in CLUB:
            if fixture.get("provider_match_id") in (None, ""):
                fail(f"{rid}: club records must retain provider_match_id")
            if fixture.get("international_fixture_id"):
                fail(f"{rid}: club record cannot use an international fixture ID")
            fixture_key = (competition, str(fixture["provider_match_id"]))
        else:
            if not fixture.get("international_fixture_id"):
                fail(f"{rid}: Nations League records require the existing international fixture ID")
            if fixture.get("provider_match_id") not in (None, ""):
                fail(f"{rid}: international records cannot use a club provider match ID")
            fixture_key = (competition, str(fixture["international_fixture_id"]))
        if fixture_key in fixture_keys:
            fail(f"{rid}: duplicate fixture research record for {fixture_key}")
        fixture_keys.add(fixture_key)
        if row.get("match_status") not in STATUSES:
            fail(f"{rid}: invalid match_status")
        score = row.get("score")
        if row.get("match_status") == "FINISHED" and not isinstance(score, dict):
            fail(f"{rid}: FINISHED record requires a score")
        if score is not None:
            if not isinstance(score.get("home"), int) or not isinstance(score.get("away"), int):
                fail(f"{rid}: score values must be integers")
            if min(score["home"], score["away"]) < 0:
                fail(f"{rid}: score cannot be negative")
        sources = row.get("sources", [])
        if not sources:
            fail(f"{rid}: at least one direct source is required")
        source_urls = set()
        authoritative = 0
        for source in sources:
            url = source.get("url", "")
            if not url.startswith("https://") or url in source_urls:
                fail(f"{rid}: source URLs must be unique HTTPS URLs")
            source_urls.add(url)
            if source.get("reuse_rights") not in RIGHTS:
                fail(f"{rid}: invalid source reuse_rights")
            valid_timestamp(source.get("checked_at"), f"{rid} source checked_at")
            if source.get("source_type") in {"competition_organiser", "federation", "licensed_provider"}:
                authoritative += 1
        verification = row.get("verification_status")
        if verification not in {"verified", "needs_review", "unverified"}:
            fail(f"{rid}: invalid verification_status")
        if verification == "verified" and (len(sources) < 2 or authoritative < 1):
            fail(f"{rid}: verified requires two direct sources including an organiser, federation, or licensed provider")
        if verification == "verified" and any(s.get("reuse_rights") != "confirmed" for s in sources):
            fail(f"{rid}: verified/publishable records require confirmed reuse rights for every source")
        event_ids = set()
        for event in row.get("events", []):
            eid = event.get("event_id")
            if not eid or eid in event_ids:
                fail(f"{rid}: missing or duplicate event_id")
            event_ids.add(eid)
            if event.get("type") not in {"goal", "assist", "yellow_card", "red_card", "own_goal", "penalty_goal"}:
                fail(f"{rid}: invalid event type")
            if not event.get("player", {}).get("name") or not event.get("team"):
                fail(f"{rid}: event must identify player name and team")
            if not event.get("source_urls") or not set(event["source_urls"]).issubset(source_urls):
                fail(f"{rid}: every event must cite source URLs already listed on the record")
        for rating in row.get("ratings", []):
            if not rating.get("provider") or not rating.get("player", {}).get("name"):
                fail(f"{rid}: rating requires player and provider")
            low, high, value = rating.get("scale_min"), rating.get("scale_max"), rating.get("value")
            if not all(isinstance(x, (int, float)) for x in (low, high, value)) or low >= high or not low <= value <= high:
                fail(f"{rid}: rating value must be within its provider-specific scale")
            if rating.get("reuse_rights") not in RIGHTS:
                fail(f"{rid}: invalid rating reuse_rights")
            if rating.get("reuse_rights") != "confirmed":
                # Keep the rating in research intake, but never treat it as publishable.
                continue
            if rating.get("source_url") not in source_urls:
                fail(f"{rid}: rating source_url must also be listed in sources")
            valid_timestamp(rating.get("checked_at"), f"{rid} rating checked_at")
    expected_status = "research_records_present" if records else "research_intake_empty"
    if data.get("dataset_status") != expected_status:
        fail(f"dataset_status must be {expected_status}")
    return {"records": len(records), "fixtures": len(fixture_keys), "status": expected_status}


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_PATH
    data = json.loads(path.read_text(encoding="utf-8"))
    result = validate(data)
    print(f"Manual match research valid: {result['records']} records / {result['fixtures']} fixtures ({result['status']}).")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
