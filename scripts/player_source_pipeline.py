#!/usr/bin/env python3
"""Offline comparison of local Reep identity exports and Wikidata P54 review evidence."""
from __future__ import annotations
import argparse, json, re, sys
from collections import defaultdict
from datetime import date
from pathlib import Path

AS_OF = date(2026, 11, 12)
QID = re.compile(r"^Q[1-9][0-9]*$")

def load(path):
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: top-level JSON must be an object")
    return value

def rows(data, key):
    value = data.get(key, [])
    if not isinstance(value, list) or any(not isinstance(x, dict) for x in value):
        raise ValueError(f"{key} must be a list of objects")
    return value

def active_p54(candidate):
    result = []
    for st in candidate.get("p54_statements", []):
        if not isinstance(st, dict) or st.get("property") != "P54" or st.get("rank") not in {"normal", "preferred"}:
            continue
        q = st.get("qualifiers") or {}
        try:
            start = date.fromisoformat(str(q.get("start_time"))[:10])
            end = date.fromisoformat(str(q["end_time"])[:10]) if q.get("end_time") else None
        except (ValueError, TypeError):
            continue
        if start <= AS_OF and (end is None or end > AS_OF):
            result.append(st)
    return result

def analyze(reep, wikidata):
    for data, label in ((wikidata, "Wikidata"), (reep, "Reep")):
        if data is None:
            continue
        if data.get("production_import") is not False or data.get("network_access") is not False or data.get("provider_api_calls") != 0:
            raise ValueError(f"{label} input must explicitly disable Production import, network access and provider API calls")
    candidates = rows(wikidata, "candidates")
    if wikidata.get("records_count") != len(candidates):
        raise ValueError("Wikidata records_count does not match candidates")
    qid_to_reep = defaultdict(set)
    players, bridges, edges, player_membership_edges = set(), 0, 0, 0
    release = None
    if reep is not None:
        release = reep.get("release_stamp")
        for entity in rows(reep, "entities"):
            rid = str(entity.get("reep_id", "")).strip()
            kind = str(entity.get("entity_type", entity.get("type", ""))).lower()
            if rid and kind in {"player", "person:player", "football_player"}:
                players.add(rid)
        for bridge in rows(reep, "bridges"):
            rid, provider, external = (str(bridge.get(k, "")).strip() for k in ("reep_id", "provider", "external_id"))
            if rid and provider and external:
                bridges += 1
            if rid and provider.lower() in {"wikidata", "wikidata_qid"} and QID.fullmatch(external):
                qid_to_reep[external].add(rid)
        for edge in rows(reep, "edges"):
            edges += 1
            relation = str(edge.get("relation", edge.get("type", ""))).lower()
            source_type = str(edge.get("source_type", "")).lower()
            if any(k in relation for k in ("squad", "lineup", "membership")) and source_type in {"player", "person:player", "football_player"}:
                player_membership_edges += 1

    matched, active_count, unmatched, duplicate_links, conflicts, identity_rows = 0, 0, [], [], [], []
    for candidate in candidates:
        qid = candidate.get("wikidata_item_id")
        linked = sorted(qid_to_reep.get(qid, set()))
        matched += bool(linked)
        if not linked:
            unmatched.append(qid)
        if len(linked) > 1:
            duplicate_links.append({"wikidata_item_id": qid, "reep_ids": linked})
        active = active_p54(candidate)
        teams = sorted({str(st.get("team_item_id")) for st in active})
        active_count += bool(active)
        if len(teams) > 1:
            conflicts.append({"wikidata_item_id": qid, "active_team_item_ids": teams,
                              "classification": "overlapping_active_P54_statements_needs_manual_review"})
        identity_rows.append({"wikidata_item_id": qid, "label": candidate.get("label"),
                              "reep_ids": linked, "active_p54_team_item_ids": teams,
                              "canonical_club_id": candidate.get("canonical_club_id"),
                              "league_id": candidate.get("league_id"),
                              "review_status": "research_only_pending_manual_review"})
    return {
        "schemaVersion": 1, "generated_at": AS_OF.isoformat(), "season": "2026/27",
        "status": "research_only", "production_import": False, "provider_api_calls": 0,
        "provider_monthly_cost_thb": 0, "supabase_writes": 0, "supabase_deletes": 0, "supabase_migrations": 0,
        "sources": {"reep_release_stamp": release, "reep_input_supplied": reep is not None, "wikidata_input": "local_manual_export"},
        "counts": {"wikidata_candidates": len(candidates), "reep_player_entities": len(players),
                   "reep_provider_bridges": bridges, "reep_relationship_edges": edges,
                   "reep_player_squad_or_lineup_edges": player_membership_edges,
                   "wikidata_qids_matched_to_reep": matched, "wikidata_qids_unmatched_to_reep": len(unmatched),
                   "wikidata_candidates_with_dated_active_p54": active_count,
                   "duplicate_qid_to_reep_links": len(duplicate_links),
                   "overlapping_active_multi_club_candidates": len(conflicts)},
        "limitations": [
            "A dated Wikidata P54 statement is a candidate signal, not proof of 2026/27 registration, first-team status or complete roster coverage.",
            "Reep identity bridges do not establish current club membership; public release relationships may omit player squad/lineup edges.",
            "No roster completeness, third-party commercial reuse permission, photo rights or Production eligibility is asserted.",
            "Name-only matches are never auto-merged; unresolved identity links require manual review."],
        "unmatched_wikidata_qids": unmatched, "duplicate_reep_identity_links": duplicate_links,
        "overlapping_active_multi_club_candidates": conflicts, "identity_review_rows": identity_rows}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wikidata-json", default="data/wikidata-player-membership-review-2026-27.json")
    parser.add_argument("--reep-json", help="Optional locally staged normalized Reep export; no download is performed")
    parser.add_argument("--output", default="data/player-source-pipeline-report-2026-27.json")
    args = parser.parse_args()
    try:
        report = analyze(load(args.reep_json) if args.reep_json else None, load(args.wikidata_json))
        Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    c = report["counts"]
    print(f"Offline Research Only report: {c['wikidata_candidates']} Wikidata candidates; {c['reep_player_entities']} Reep player entities.")
    print(f"QID links: {c['wikidata_qids_matched_to_reep']}; active P54 candidates: {c['wikidata_candidates_with_dated_active_p54']}.")
    print("No network/API calls, provider charges, Supabase writes/deletes/migrations or Production imports.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
