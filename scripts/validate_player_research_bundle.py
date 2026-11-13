#!/usr/bin/env python3
"""Cross-check the two offline 2026/27 player research manifests as one PL pilot bundle."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
try:
    from .validate_player_intake_manifest import validate as validate_memberships
    from .validate_player_statistics_intake import validate as validate_statistics
except ImportError:
    from validate_player_intake_manifest import validate as validate_memberships
    from validate_player_statistics_intake import validate as validate_statistics

def validate_bundle(membership: dict, statistics: dict) -> list[str]:
    errors=[]
    if not isinstance(membership,dict) or not isinstance(statistics,dict):
        return ["both manifests must be JSON objects"]
    for label,data,validator,key in (
        ("membership",membership,validate_memberships,"memberships"),
        ("statistics",statistics,validate_statistics,"statistics"),
    ):
        errors.extend(f"{label}: {message}" for message in validator(data))
        rows=data.get(key,[])
        for row in rows if isinstance(rows,list) else []:
            if isinstance(row,dict) and row.get("league_id")!="PL":
                errors.append(f"{label}: pilot only permits league_id=PL (found {row.get('league_id')})")
    membership_sources={x.get("id"):x for x in membership.get("sources",[]) if isinstance(x,dict) and x.get("id")}
    statistics_sources={x.get("id"):x for x in statistics.get("sources",[]) if isinstance(x,dict) and x.get("id")}
    for source_id in sorted(set(membership_sources)&set(statistics_sources)):
        for field in ("publisher","source_url","licence_id","licence_url","rights_review_status","commercial_use_allowed","database_rights_reviewed","redistribution_allowed"):
            if membership_sources[source_id].get(field)!=statistics_sources[source_id].get(field):
                errors.append(f"source {source_id}: membership/statistics manifests disagree on {field}")
    return errors

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--memberships",type=Path,default=Path("data/player-intake-manifest-2026-27.json"))
    parser.add_argument("--statistics",type=Path,default=Path("data/player-statistics-intake-2026-27.json"))
    args=parser.parse_args()
    try:
        membership=json.loads(args.memberships.read_text(encoding="utf-8"))
        statistics=json.loads(args.statistics.read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read valid manifests: {exc}",file=sys.stderr);return 2
    errors=validate_bundle(membership,statistics)
    if errors:
        for message in errors: print("ERROR: "+message,file=sys.stderr)
        print("RESULT: BLOCKED — no data was imported.",file=sys.stderr);return 1
    print("Premier League 2026/27 research bundle validated.")
    print(f"Membership rows: {len(membership['memberships'])}; statistics rows: {len(statistics['statistics'])}")
    print("Offline validation only; no provider calls or Production writes.")
    return 0
if __name__=="__main__": raise SystemExit(main())
