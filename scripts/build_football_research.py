#!/usr/bin/env python3
"""Offline research summaries derived from the existing Football Time database."""
from __future__ import annotations
import argparse, json, re, tempfile, os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def season_rank(value):
    m = re.search(r"(20\d{2})", str(value or ""))
    return int(m.group(1)) if m else -1

def valid_date(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None

def finished(m):
    return (m.get("status") == "FINISHED" and
            all(isinstance(x, int) and not isinstance(x, bool) and x >= 0
                for x in (m.get("homeScore"), m.get("awayScore"))))

def summarize(rows, limit=10):
    rows = sorted(rows, key=lambda x: x["date"], reverse=True)[:limit]
    w = sum(x["outcome"] == "W" for x in rows)
    d = sum(x["outcome"] == "D" for x in rows)
    l = sum(x["outcome"] == "L" for x in rows)
    gf, ga, n = sum(x["gf"] for x in rows), sum(x["ga"] for x in rows), len(rows)
    return {
        "played": n, "wins": w, "draws": d, "losses": l, "points": w * 3 + d,
        "form": "".join(x["outcome"] for x in rows[::-1]),
        "goalsFor": gf, "goalsAgainst": ga,
        "goalsForPerMatch": round(gf / n, 3) if n else None,
        "goalsAgainstPerMatch": round(ga / n, 3) if n else None,
        "lastMatchDate": rows[0]["date"] if rows else None,
    }

def build_research(db, generated_at=None):
    if not isinstance(db, dict):
        raise ValueError("Database root must be an object")
    matches, teams, memberships, standings = (db.get(k) for k in ("matches", "teams", "teamSeasons", "standings"))
    if not all(isinstance(x, list) for x in (matches, teams, memberships, standings)):
        raise ValueError("Database must contain matches, teams, teamSeasons and standings arrays")
    seasons = {}
    for row in memberships:
        league, season = row.get("leagueId"), row.get("season")
        if league and season and season_rank(season) > season_rank(seasons.get(league)):
            seasons[league] = str(season)
    names = {str(t["id"]): t.get("name") for t in teams if t.get("id") is not None}
    by_league = defaultdict(list)
    for m in matches:
        if finished(m) and m.get("leagueId") and valid_date(m.get("utcDate")):
            league = m["leagueId"]
            if league not in seasons or str(m.get("season")) == seasons[league]:
                by_league[league].append(m)
    table = {(str(x.get("leagueId")), str(x.get("season")), str(x.get("teamId"))): x
             for x in standings if x.get("teamId") is not None}
    reports = []
    for league in sorted(set(seasons) | set(by_league)):
        season, games = seasons.get(league), by_league.get(league, [])
        all_rows, home_rows, away_rows = defaultdict(list), defaultdict(list), defaultdict(list)
        total = hg = ag = 0
        for m in games:
            h, a, hs, aws = str(m.get("homeTeamId") or ""), str(m.get("awayTeamId") or ""), m["homeScore"], m["awayScore"]
            total += hs + aws; hg += hs; ag += aws
            for tid, gf, ga, venue, bucket in ((h, hs, aws, "home", home_rows), (a, aws, hs, "away", away_rows)):
                if not tid: continue
                outcome = "W" if gf > ga else "D" if gf == ga else "L"
                row = {"date": m["utcDate"], "gf": gf, "ga": ga, "outcome": outcome}
                all_rows[tid].append(row); bucket[tid].append(row)
        team_ids = set(all_rows)
        team_ids.update(str(x["teamId"]) for x in memberships
                        if x.get("leagueId") == league and (not season or str(x.get("season")) == season))
        team_data = []
        for tid in sorted(team_ids):
            s = table.get((league, str(season or ""), tid))
            team_data.append({
                "teamId": tid, "teamName": names.get(tid) or tid,
                "standing": {k: s.get(k) for k in ("position", "played", "points", "goalsFor", "goalsAgainst")} if s else None,
                "last10": summarize(all_rows.get(tid, [])),
                "home": summarize(home_rows.get(tid, [])),
                "away": summarize(away_rows.get(tid, [])),
            })
        h2h = []
        upcoming = [m for m in matches if m.get("leagueId") == league and
                    (not season or str(m.get("season") or "") == season) and
                    m.get("status") != "FINISHED" and m.get("homeTeamId") and m.get("awayTeamId")]
        for fixture in upcoming:
            h, a = str(fixture["homeTeamId"]), str(fixture["awayTeamId"])
            history = [m for m in matches if m.get("leagueId") == league and finished(m) and
                       (not season or str(m.get("season") or "") == season) and
                       {str(m.get("homeTeamId") or ""), str(m.get("awayTeamId") or "")} == {h, a}]
            history.sort(key=lambda m: m.get("utcDate") or "", reverse=True)
            sample = []
            for old in history[:5]:
                home_selected = str(old.get("homeTeamId")) == h
                sample.append({"date": old.get("utcDate"), "homeTeamName": old.get("homeTeamName"),
                    "awayTeamName": old.get("awayTeamName"), "homeScore": old["homeScore"],
                    "awayScore": old["awayScore"],
                    "selectedHomeTeamGoals": old["homeScore"] if home_selected else old["awayScore"],
                    "selectedAwayTeamGoals": old["awayScore"] if home_selected else old["homeScore"]})
            h2h.append({"matchId": fixture.get("providerMatchId"), "homeTeamId": h, "awayTeamId": a,
                        "sampleSize": len(sample), "matches": sample,
                        "limitation": "Descriptive only; small samples do not imply predictive certainty."})
        n = len(games)
        reports.append({"leagueId": league, "season": season, "completedMatches": n,
            "goalBaseline": {"goalsPerMatch": round(total/n, 3) if n else None,
                             "homeGoalsPerMatch": round(hg/n, 3) if n else None,
                             "awayGoalsPerMatch": round(ag/n, 3) if n else None},
            "teams": team_data, "upcomingHeadToHead": h2h})
    source = db.get("source") if isinstance(db.get("source"), dict) else {}
    return {"schemaVersion": 1, "generatedAt": generated_at or datetime.now(timezone.utc).isoformat(),
        "status": "derived_from_existing_database",
        "source": {"provider": source.get("provider", "existing-football-database"),
                   "databaseGeneratedAt": db.get("generatedAt"), "leagueSync": source.get("leagueSync", {}),
                   "method": "Local calculations from existing completed fixtures/results; no additional source."},
        "refreshPolicy": {"runsPerDay": 2, "timezone": "Asia/Bangkok", "scheduleBangkok": ["07:15", "19:15"]},
        "limitations": ["This is derived team/match research, not independent scouting or player statistics.",
            "Only completed matches in the current catalogue season are used for form and league baselines.",
            "Early-season home/away and H2H samples may be small; sample sizes are shown.",
            "Refresh cannot make the upstream database fresher than its source."],
        "leagues": reports}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", type=Path, default=ROOT / "data/football-database.json")
    p.add_argument("--output", type=Path, default=ROOT / "data/football-research-stats-2026-27.json")
    args = p.parse_args()
    db = json.loads(args.input.read_text(encoding="utf-8"))
    result = build_research(db)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=args.output.parent, prefix=args.output.name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2); f.write("\n")
        os.replace(temp, args.output)
    except Exception:
        try: os.unlink(temp)
        except OSError: pass
        raise
    print("Research report generated:", len(result["leagues"]), "leagues")
    print("Offline only: no API calls, provider credits, Supabase writes or migrations.")

if __name__ == "__main__":
    main()
