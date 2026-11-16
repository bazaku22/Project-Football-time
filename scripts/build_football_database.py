import json
import os
from datetime import datetime, timezone
from phase6_league_catalog import LEAGUE_CATALOG, PROVIDER_LEAGUES

base = os.path.join(os.environ["RUNNER_TEMP"], "football-data")
os.makedirs("data", exist_ok=True)
db_path = "data/football-database.json"
previous = None
snapshots = []
if os.path.exists(db_path):
    try:
        with open(db_path, encoding="utf-8") as f: previous = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise RuntimeError("Refusing to rebuild: existing database is unreadable.") from e
    if not isinstance(previous, dict): raise ValueError("Existing database root must be an object.")
    snapshots = previous.get("probabilitySnapshots", [])
    if not isinstance(snapshots, list): raise ValueError("probabilitySnapshots is not a list.")

def read(code, endpoint):
    with open(os.path.join(base, f"{code}-{endpoint}.json"), encoding="utf-8") as f: return json.load(f)

def optional_elc():
    paths = [os.path.join(base, f"ELC-{e}.json") for e in ("teams","matches","standings")]
    if not all(os.path.isfile(p) for p in paths): return None
    try:
        payload = [read("ELC", e) for e in ("teams","matches","standings")]
        if not isinstance(payload[0].get("teams"), list) or not payload[0]["teams"]: return None
        if not isinstance(payload[1].get("matches"), list): return None
        groups = payload[2].get("standings")
        if not isinstance(groups, list) or not any(g.get("type")=="TOTAL" and isinstance(g.get("table"),list) and g["table"] for g in groups): return None
        return payload
    except (OSError, ValueError, TypeError, AttributeError, json.JSONDecodeError): return None

teams, team_seasons, standings, matches = {}, [], [], []
now = datetime.now(timezone.utc).isoformat()
league_sync = {}
elc = optional_elc()

def process(code, td, md, sd):
    season_info = td.get("season") or (td.get("competition") or {}).get("currentSeason") or {}
    start, end = season_info.get("startDate"), season_info.get("endDate")
    if not start or not end: raise ValueError(f"Season dates missing for {code}")
    season = start[:4] + "-" + end[:4]
    comp_id = (td.get("competition") or {}).get("id")
    for team in td.get("teams", []):
        pid = team.get("id")
        if pid is None: raise ValueError(f"Team ID missing in {code}")
        tid = f"football-data:{pid}"
        teams[tid] = {"id":tid,"provider":"football-data.org","providerTeamId":pid,
          "name":team.get("name"),"shortName":team.get("shortName"),"tla":team.get("tla"),
          "crest":team.get("crest"),"country":(team.get("area") or {}).get("name")}
        team_seasons.append({"teamId":tid,"leagueId":code,"season":season,
          "providerCompetitionId":comp_id,"seasonStart":start,"seasonEnd":end})
    total = [g for g in sd.get("standings",[]) if g.get("type")=="TOTAL"]
    if not total: raise ValueError(f"TOTAL standings missing for {code}")
    for group in total:
      for row in group.get("table",[]):
        pid=(row.get("team") or {}).get("id")
        if pid is None: raise ValueError(f"Standing team ID missing in {code}")
        standings.append({"leagueId":code,"season":season,"teamId":f"football-data:{pid}",
          "position":row.get("position"),"played":row.get("playedGames"),"won":row.get("won"),
          "draw":row.get("draw"),"lost":row.get("lost"),"goalsFor":row.get("goalsFor"),
          "goalsAgainst":row.get("goalsAgainst"),"goalDifference":row.get("goalDifference"),
          "points":row.get("points"),"updatedAt":now})
    for m in md.get("matches",[]):
      home,away=m.get("homeTeam") or {},m.get("awayTeam") or {}
      ft=(m.get("score") or {}).get("fullTime") or {}
      cancelled=m.get("status")=="CANCELLED"
      matches.append({"providerMatchId":m.get("id"),"leagueId":code,"season":season,
        "utcDate":m.get("utcDate"),"status":m.get("status"),
        "homeTeamId":f"football-data:{home['id']}" if home.get("id") is not None else None,
        "awayTeamId":f"football-data:{away['id']}" if away.get("id") is not None else None,
        "homeTeamName":home.get("name"),"awayTeamName":away.get("name"),
        "homeScore":None if cancelled else ft.get("home"),"awayScore":None if cancelled else ft.get("away")})
    print(f"{code}: teams={len(td.get('teams',[]))}, matches={len(md.get('matches',[]))}")

for league in PROVIDER_LEAGUES:
    code=league["id"]
    if code=="ELC" and elc is None:
        old=previous or {}
        old_ts=[x for x in old.get("teamSeasons",[]) if x.get("leagueId")=="ELC"]
        old_st=[x for x in old.get("standings",[]) if x.get("leagueId")=="ELC"]
        old_ms=[x for x in old.get("matches",[]) if x.get("leagueId")=="ELC"]
        if not old_ts or not old_st or not old_ms:
            raise RuntimeError("ELC unavailable and no complete previous ELC data; refusing incomplete publication.")
        refs={x.get("teamId") for x in old_ts+old_st}
        for m in old_ms: refs.update(x for x in (m.get("homeTeamId"),m.get("awayTeamId")) if x)
        for t in old.get("teams",[]):
            if t.get("id") in refs: teams.setdefault(t["id"],t)
        team_seasons.extend(old_ts); standings.extend(old_st); matches.extend(old_ms)
        src=old.get("source") or {}; old_sync=(src.get("leagueSync") or {}).get("ELC") or {}
        last=old_sync.get("lastSuccessfulSync") or src.get("lastSuccessfulSync") or old.get("generatedAt")
        league_sync["ELC"]={"status":"stale","lastSuccessfulSync":last}
        print("ELC unavailable/incomplete: previous ELC rows preserved atomically.")
        continue
    payload=elc if code=="ELC" else tuple(read(code,e) for e in ("teams","matches","standings"))
    process(code,*payload)
    league_sync[code]={"status":"fresh","lastSuccessfulSync":now}


def valid_score(value):
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0

def valid_finished_result(match):
    return (
        isinstance(match, dict)
        and match.get("status") == "FINISHED"
        and valid_score(match.get("homeScore"))
        and valid_score(match.get("awayScore"))
    )

def parse_timestamp(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc).isoformat()

def apply_result_revisions(current_matches, previous_database, generated_at):
    previous_database = previous_database or {}
    previous_matches = previous_database.get("matches", [])
    if not isinstance(previous_matches, list):
        raise ValueError("Previous matches is not a list; refusing result revision rebuild.")
    history = previous_database.get("resultRevisionHistory", [])
    if not isinstance(history, list):
        raise ValueError("resultRevisionHistory is not a list; refusing result revision rebuild.")

    previous_by_id = {}
    for old in previous_matches:
        if not isinstance(old, dict) or old.get("providerMatchId") is None:
            continue
        provider_id = str(old["providerMatchId"])
        if provider_id in previous_by_id:
            raise ValueError(f"Duplicate previous provider match ID: {provider_id}")
        previous_by_id[provider_id] = old

    history_by_match = {}
    history_keys = set()
    for entry in history:
        if not isinstance(entry, dict):
            raise ValueError("Invalid result revision history entry.")
        match_id = entry.get("matchId")
        revision = entry.get("resultRevision")
        if not isinstance(match_id, str) or not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
            raise ValueError("Invalid result revision history identity.")
        key = (match_id, revision)
        if key in history_keys:
            raise ValueError(f"Duplicate result revision history entry: {match_id} revision {revision}")
        history_keys.add(key)
        history_by_match.setdefault(match_id, []).append(entry)

    previous_snapshot_at = (
        parse_timestamp(previous_database.get("generatedAt"))
        or parse_timestamp((previous_database.get("source") or {}).get("lastSuccessfulSync"))
    )

    def shared_match_id(provider_id):
        return "FT-M-FOOTBALLDATA-" + str(provider_id)

    def latest_revision(match_id):
        entries = history_by_match.get(match_id, [])
        return max((entry["resultRevision"] for entry in entries), default=0)

    def append_history(match, revision, recorded_at, reason, change_type):
        provider_id = str(match["providerMatchId"])
        match_id = shared_match_id(provider_id)
        key = (match_id, revision)
        entry = {
            "matchId": match_id,
            "providerMatchId": provider_id,
            "resultRevision": revision,
            "homeScore": match["homeScore"],
            "awayScore": match["awayScore"],
            "status": "FINISHED",
            "changeType": change_type,
            "reason": reason,
            "recordedAt": recorded_at,
            "source": {"provider": "football-data.org", "verifiedAt": recorded_at}
        }
        if key in history_keys:
            existing = next(x for x in history if x["matchId"] == match_id and x["resultRevision"] == revision)
            for field in ("homeScore", "awayScore", "status"):
                if existing.get(field) != entry[field]:
                    raise RuntimeError(
                        f"Result revision conflict for {match_id} revision {revision}; "
                        "refusing to rewrite immutable history."
                    )
            return
        history.append(entry)
        history_keys.add(key)
        history_by_match.setdefault(match_id, []).append(entry)

    current_by_id = {}
    for match in current_matches:
        provider_id = match.get("providerMatchId")
        if provider_id is None:
            continue
        key = str(provider_id)
        if key in current_by_id:
            raise ValueError(f"Duplicate current provider match ID: {key}")
        current_by_id[key] = match

    for provider_id, match in current_by_id.items():
        old = previous_by_id.get(provider_id)
        old_finished = valid_finished_result(old)
        current_finished = valid_finished_result(match)
        match_id = shared_match_id(provider_id)
        old_revision = old.get("resultRevision", 0) if isinstance(old, dict) else 0
        if not isinstance(old_revision, int) or isinstance(old_revision, bool) or old_revision < 0:
            raise ValueError(f"Invalid previous result revision for {match_id}")
        known_revision = max(old_revision, latest_revision(match_id))

        if old_finished and not current_finished:
            raise RuntimeError(
                f"Previously verified result disappeared or became invalid for {match_id}; "
                "refusing to publish a result rollback without a reviewed correction workflow."
            )

        if not current_finished:
            continue

        if old_finished:
            latest_entries = history_by_match.get(match_id, [])
            if latest_entries:
                latest_entry = max(latest_entries, key=lambda row: row["resultRevision"])
                if (latest_entry.get("homeScore"), latest_entry.get("awayScore")) != (old["homeScore"], old["awayScore"]):
                    raise RuntimeError(f"Previous result and revision history disagree for {match_id}.")
            if (old["homeScore"], old["awayScore"]) == (match["homeScore"], match["awayScore"]):
                revision = known_revision or 1
                updated_at = (
                    parse_timestamp(old.get("resultUpdatedAt"))
                    or (max(latest_entries, key=lambda row: row["resultRevision"]).get("recordedAt") if latest_entries else None)
                    or previous_snapshot_at
                )
                if not updated_at:
                    raise RuntimeError(f"Missing trusted timestamp for existing result {match_id}.")
                old_source = old.get("resultSource") if isinstance(old.get("resultSource"), dict) else {}
                result_source = {
                    "provider": old_source.get("provider") or "football-data.org",
                    "verifiedAt": parse_timestamp(old_source.get("verifiedAt")) or updated_at
                }
                reason = "Baseline revision preserved from the previous FT database snapshot."
                append_history(old, revision, updated_at, reason, "baseline")
            else:
                baseline_revision = known_revision or 1
                baseline_at = (
                    parse_timestamp(old.get("resultUpdatedAt"))
                    or (max(latest_entries, key=lambda row: row["resultRevision"]).get("recordedAt") if latest_entries else None)
                    or previous_snapshot_at
                )
                if not baseline_at:
                    raise RuntimeError(f"Missing trusted timestamp for prior result {match_id}.")
                append_history(
                    old, baseline_revision, baseline_at,
                    "Baseline revision retained before recording a provider score correction.",
                    "baseline"
                )
                revision = baseline_revision + 1
                updated_at = generated_at
                reason = (
                    "Provider score changed from "
                    + str(old["homeScore"]) + "-" + str(old["awayScore"])
                    + " to " + str(match["homeScore"]) + "-" + str(match["awayScore"])
                    + " between FT database snapshots."
                )
                append_history(match, revision, updated_at, reason, "correction")
                result_source = {"provider": "football-data.org", "verifiedAt": updated_at}
        else:
            revision = known_revision + 1 if known_revision else 1
            updated_at = generated_at
            reason = "First complete FINISHED score observed and accepted by Football Time."
            append_history(match, revision, updated_at, reason, "baseline")
            result_source = {"provider": "football-data.org", "verifiedAt": updated_at}

        match["resultRevision"] = revision
        match["resultUpdatedAt"] = updated_at
        match["resultSource"] = result_source

    # Keep previously verified finished matches if a provider snapshot omits them.
    # This prevents a partial feed from silently deleting official FT results.
    for provider_id, old in previous_by_id.items():
        if provider_id in current_by_id or not valid_finished_result(old):
            continue
        preserved = dict(old)
        match_id = shared_match_id(provider_id)
        old_revision = old.get("resultRevision", 0)
        if not isinstance(old_revision, int) or isinstance(old_revision, bool) or old_revision < 0:
            raise ValueError(f"Invalid previous result revision for {match_id}")
        revision = max(old_revision, latest_revision(match_id)) or 1
        latest_entries = history_by_match.get(match_id, [])
        updated_at = (
            parse_timestamp(old.get("resultUpdatedAt"))
            or (max(latest_entries, key=lambda row: row["resultRevision"]).get("recordedAt") if latest_entries else None)
            or previous_snapshot_at
        )
        if not updated_at:
            raise RuntimeError(f"Missing trusted timestamp for preserved result {match_id}.")
        source = old.get("resultSource") if isinstance(old.get("resultSource"), dict) else {}
        preserved["resultRevision"] = revision
        preserved["resultUpdatedAt"] = updated_at
        preserved["resultSource"] = {
            "provider": source.get("provider") or "football-data.org",
            "verifiedAt": parse_timestamp(source.get("verifiedAt")) or updated_at
        }
        append_history(
            preserved, revision, updated_at,
            "Previously verified FT result retained because the latest provider snapshot omitted this fixture.",
            "preserved"
        )
        current_matches.append(preserved)

    return history

result_revision_history = apply_result_revisions(matches, previous, now)

database={"schemaVersion":"1.4.0","generatedAt":now,
 "source":{"provider":"football-data.org","apiVersion":"v4",
 "attribution":"Data provided by football-data.org","lastSuccessfulSync":now,"leagueSync":league_sync},
 "leagues":LEAGUE_CATALOG,"teams":list(teams.values()),"teamSeasons":team_seasons,
 "standings":standings,"matches":matches,"probabilitySnapshots":snapshots,
 "resultRevisionHistory":result_revision_history}
with open(db_path,"w",encoding="utf-8") as f: json.dump(database,f,ensure_ascii=False,indent=2)
print("Database generated; immutable snapshots retained:",len(snapshots))
