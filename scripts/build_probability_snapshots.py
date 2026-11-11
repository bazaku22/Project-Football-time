#!/usr/bin/env python3
"""Create immutable pre-match 1X2 probability snapshots for future fixtures."""
import json
import math
import os
from datetime import datetime, timezone

DB_PATH = "data/football-database.json"
MODEL_VERSION = "pft-poisson-1.0"
MAX_GOALS = 10


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def geometric_mean(values, fallback):
    valid = [max(0.05, float(value)) for value in values
             if isinstance(value, (int, float)) and math.isfinite(value) and value >= 0]
    if not valid:
        return fallback
    return math.prod(valid) ** (1 / len(valid))


def clamp(value, lower, upper):
    return max(lower, min(upper, value))


def poisson_series(rate):
    values = [math.exp(-rate)]
    for goals in range(1, MAX_GOALS + 1):
        values.append(values[-1] * rate / goals)
    return values


def main():
    with open(DB_PATH, encoding="utf-8") as handle:
        database = json.load(handle)

    now = datetime.now(timezone.utc)
    matches = database.get("matches", [])
    standings = database.get("standings", [])
    raw_snapshots = database.get("probabilitySnapshots", [])
    snapshots = []
    known_ids = set()
    if not isinstance(raw_snapshots, list):
        raise ValueError("probabilitySnapshots must be a list; refusing to discard history.")

    for row in raw_snapshots:
        if not isinstance(row, dict) or row.get("matchId") is None:
            raise ValueError("Invalid historical snapshot; refusing to discard history.")
        match_id = str(row["matchId"])
        if match_id in known_ids:
            raise ValueError(f"Duplicate historical snapshot for match {match_id}; refusing to discard history.")
        snapshots.append(row)
        known_ids.add(match_id)
    matches_by_id = {str(match.get("providerMatchId")): match for match in matches
                     if match.get("providerMatchId") is not None}
    for snapshot in snapshots:
        match = matches_by_id.get(str(snapshot.get("matchId")))
        if (match and match.get("status") == "FINISHED"
                and isinstance(match.get("homeScore"), int)
                and isinstance(match.get("awayScore"), int)
                and match["homeScore"] >= 0 and match["awayScore"] >= 0
                and not snapshot.get("actualOutcome")):
            if match["homeScore"] > match["awayScore"]:
                snapshot["actualOutcome"] = "home"
            elif match["homeScore"] == match["awayScore"]:
                snapshot["actualOutcome"] = "draw"
            else:
                snapshot["actualOutcome"] = "away"
            snapshot["actualScore"] = f'{match["homeScore"]}-{match["awayScore"]}'
            snapshot["evaluatedAt"] = now.isoformat()

    finished_by_league = {}
    for match in matches:
        if (match.get("status") == "FINISHED"
                and isinstance(match.get("homeScore"), int)
                and isinstance(match.get("awayScore"), int)
                and match["homeScore"] >= 0 and match["awayScore"] >= 0):
            key = (match.get("leagueId"), match.get("season"))
            finished_by_league.setdefault(key, []).append(match)

    standings_by_team = {
        (row.get("leagueId"), row.get("season"), row.get("teamId")): row
        for row in standings
    }
    metrics_cache = {}

    def team_metrics(league_id, season, team_id, finished):
        key = (league_id, season, team_id)
        if key in metrics_cache:
            return metrics_cache[key]

        games = [m for m in finished
                 if m.get("homeTeamId") == team_id or m.get("awayTeamId") == team_id]
        games.sort(key=lambda m: parse_date(m.get("utcDate")) or datetime.min.replace(tzinfo=timezone.utc),
                   reverse=True)

        def venue_stats(venue):
            rows = [m for m in games if m.get("homeTeamId") == team_id] if venue == "home" else [
                m for m in games if m.get("awayTeamId") == team_id
            ]
            played = len(rows)
            goals_for = goals_against = points = 0
            for row in rows:
                gf = row["homeScore"] if venue == "home" else row["awayScore"]
                ga = row["awayScore"] if venue == "home" else row["homeScore"]
                goals_for += gf
                goals_against += ga
                points += 3 if gf > ga else 1 if gf == ga else 0
            return {
                "played": played,
                "gfpg": goals_for / played if played else 0,
                "gapg": goals_against / played if played else 0,
            }

        recent = games[:5]
        form_points = 0
        for row in recent:
            is_home = row.get("homeTeamId") == team_id
            gf = row["homeScore"] if is_home else row["awayScore"]
            ga = row["awayScore"] if is_home else row["homeScore"]
            form_points += 3 if gf > ga else 1 if gf == ga else 0

        standing = standings_by_team.get(key)
        metrics = {
            "played": len(games),
            "home": venue_stats("home"),
            "away": venue_stats("away"),
            "form_count": len(recent),
            "form_ppg": form_points / len(recent) if recent else 0,
            "standing": standing,
        }
        metrics_cache[key] = metrics
        return metrics

    added = 0
    for match in matches:
        if match.get("status") not in ("SCHEDULED", "TIMED"):
            continue
        match_id = match.get("providerMatchId")
        kickoff = parse_date(match.get("utcDate"))
        if match_id is None or kickoff is None or kickoff <= now:
            continue
        match_id = str(match_id)
        if match_id in known_ids:
            continue

        league_id, season = match.get("leagueId"), match.get("season")
        finished = finished_by_league.get((league_id, season), [])
        if not finished:
            continue

        home_id, away_id = match.get("homeTeamId"), match.get("awayTeamId")
        if not home_id or not away_id:
            continue
        home = team_metrics(league_id, season, home_id, finished)
        away = team_metrics(league_id, season, away_id, finished)
        if not home["played"] or not away["played"]:
            continue

        league_home_goals = sum(m["homeScore"] for m in finished) / len(finished)
        league_away_goals = sum(m["awayScore"] for m in finished) / len(finished)
        lambda_home = geometric_mean([
            home["home"]["gfpg"] if home["home"]["played"] else None,
            away["away"]["gapg"] if away["away"]["played"] else None,
            league_home_goals,
        ], league_home_goals or 1.4)
        lambda_away = geometric_mean([
            away["away"]["gfpg"] if away["away"]["played"] else None,
            home["home"]["gapg"] if home["home"]["played"] else None,
            league_away_goals,
        ], league_away_goals or 1.1)

        league_rows = [row for row in standings
                       if row.get("leagueId") == league_id and row.get("season") == season]
        league_ppg = (
            sum(row.get("points", 0) / max(1, row.get("played", 0)) for row in league_rows)
            / len(league_rows)
            if league_rows else 1.35
        )
        home_standing, away_standing = home["standing"], away["standing"]
        home_form_factor = clamp(1 + (home["form_ppg"] - 1.35) * 0.035, 0.88, 1.12)
        away_form_factor = clamp(1 + (away["form_ppg"] - 1.35) * 0.035, 0.88, 1.12)
        home_table_factor = (
            clamp(1 + (home_standing["points"] / max(1, home_standing["played"]) - league_ppg) * 0.025, 0.92, 1.08)
            if home_standing else 1
        )
        away_table_factor = (
            clamp(1 + (away_standing["points"] / max(1, away_standing["played"]) - league_ppg) * 0.025, 0.92, 1.08)
            if away_standing else 1
        )
        lambda_home *= home_form_factor * home_table_factor
        lambda_away *= away_form_factor * away_table_factor

        h2h = [m for m in finished if (
            (m.get("homeTeamId") == home_id and m.get("awayTeamId") == away_id)
            or (m.get("homeTeamId") == away_id and m.get("awayTeamId") == home_id)
        )]
        h2h_home_goals = h2h_away_goals = 0
        for row in h2h:
            if row.get("homeTeamId") == home_id:
                h2h_home_goals += row["homeScore"]
                h2h_away_goals += row["awayScore"]
            else:
                h2h_home_goals += row["awayScore"]
                h2h_away_goals += row["homeScore"]
        if len(h2h) >= 3:
            lambda_home = lambda_home * 0.85 + (h2h_home_goals / len(h2h)) * 0.15
            lambda_away = lambda_away * 0.85 + (h2h_away_goals / len(h2h)) * 0.15

        lambda_home = clamp(lambda_home, 0.2, 3.5)
        lambda_away = clamp(lambda_away, 0.2, 3.5)
        home_poisson, away_poisson = poisson_series(lambda_home), poisson_series(lambda_away)
        home_win = draw = away_win = 0.0
        for home_goals, home_probability in enumerate(home_poisson):
            for away_goals, away_probability in enumerate(away_poisson):
                probability = home_probability * away_probability
                if home_goals > away_goals:
                    home_win += probability
                elif home_goals == away_goals:
                    draw += probability
                else:
                    away_win += probability
        total = home_win + draw + away_win
        p_home = round(home_win / total * 100, 1)
        p_draw = round(draw / total * 100, 1)
        p_away = round(100 - p_home - p_draw, 1)

        venue_sample = min(home["home"]["played"], away["away"]["played"])
        form_sample = min(home["form_count"], away["form_count"])
        confidence_score = round((
            0.60 * min(1, venue_sample / 8)
            + 0.25 * min(1, form_sample / 5)
            + 0.15 * (1 if home_standing and away_standing else 0)
        ) * 100)
        confidence = "สูง" if confidence_score >= 75 else "กลาง" if confidence_score >= 45 else "ต่ำ"
        top_probability = max(p_home, p_draw, p_away)
        probability_level = "สูง" if top_probability >= 65 else "กลาง" if top_probability >= 45 else "ต่ำ"

        snapshots.append({
            "matchId": match_id,
            "leagueId": league_id,
            "season": season,
            "utcDate": match.get("utcDate"),
            "homeTeamName": match.get("homeTeamName"),
            "awayTeamName": match.get("awayTeamName"),
            "probabilities": {"home": p_home, "draw": p_draw, "away": p_away},
            "expectedGoals": {"home": round(lambda_home, 2), "away": round(lambda_away, 2)},
            "probabilityLevel": probability_level,
            "confidenceScore": confidence_score,
            "confidence": confidence,
            "sample": {
                "homeVenue": home["home"]["played"],
                "awayVenue": away["away"]["played"],
                "homeForm": home["form_count"],
                "awayForm": away["form_count"],
                "h2h": len(h2h),
            },
            "modelVersion": MODEL_VERSION,
            "createdAt": now.isoformat(),
        })
        known_ids.add(match_id)
        added += 1

    snapshots.sort(key=lambda row: row.get("createdAt", ""))

    database["probabilitySnapshots"] = snapshots
    with open(DB_PATH, "w", encoding="utf-8") as handle:
        json.dump(database, handle, ensure_ascii=False, indent=2)

    print(f"Pre-match probability snapshots added: {added}")
    print(f"Total immutable snapshots retained: {len(snapshots)}")


if __name__ == "__main__":
    main()
