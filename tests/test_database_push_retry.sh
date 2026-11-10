#!/usr/bin/env bash
set -euo pipefail

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
remote="$tmp/remote.git"
runner="$tmp/runner"
other="$tmp/other"

git init --bare --initial-branch=main "$remote" >/dev/null
git clone "$remote" "$runner" >/dev/null 2>&1
git -C "$runner" config user.name "Retry test"
git -C "$runner" config user.email "retry-test@example.invalid"
mkdir -p "$runner/data"
printf '%s\n' '{"probabilitySnapshots":[{"matchId":"original"}]}' > "$runner/data/football-database.json"
git -C "$runner" add data/football-database.json
git -C "$runner" commit -m "seed database" >/dev/null
git -C "$runner" push origin main >/dev/null

git clone "$remote" "$other" >/dev/null 2>&1
git -C "$other" config user.name "Concurrent writer"
git -C "$other" config user.email "concurrent@example.invalid"
python3 - "$other/data/football-database.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    db = json.load(f)
db["probabilitySnapshots"].append({"matchId": "concurrent"})
with open(path, "w", encoding="utf-8") as f:
    json.dump(db, f)
PY
git -C "$other" add data/football-database.json
git -C "$other" commit -m "concurrent snapshot" >/dev/null
git -C "$other" push origin main >/dev/null

# The runner generated from its stale checkout before the competing push.
python3 - "$runner/data/football-database.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    db = json.load(f)
db["probabilitySnapshots"].append({"matchId": "runner"})
with open(path, "w", encoding="utf-8") as f:
    json.dump(db, f)
PY
git -C "$runner" add data/football-database.json
git -C "$runner" commit -m "stale generated database" >/dev/null

if git -C "$runner" push origin HEAD:refs/heads/main >/dev/null 2>&1; then
  echo "Expected the first push to fail after the concurrent update." >&2
  exit 1
fi

# Retry behavior: fetch latest, reset to it, then rebuild from that base.
git -C "$runner" fetch origin +refs/heads/main:refs/remotes/origin/main >/dev/null
git -C "$runner" checkout -B main origin/main >/dev/null 2>&1
python3 - "$runner/data/football-database.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    db = json.load(f)
ids = {row["matchId"] for row in db["probabilitySnapshots"]}
ids.add("runner")
db["probabilitySnapshots"] = [{"matchId": value} for value in sorted(ids)]
with open(path, "w", encoding="utf-8") as f:
    json.dump(db, f)
PY
git -C "$runner" add data/football-database.json
git -C "$runner" commit -m "retry generated database" >/dev/null
git -C "$runner" push origin HEAD:refs/heads/main >/dev/null

git --git-dir="$remote" show main:data/football-database.json > "$tmp/final.json"
python3 - "$tmp/final.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    ids = {row["matchId"] for row in json.load(f)["probabilitySnapshots"]}
assert ids == {"original", "concurrent", "runner"}, ids
print("Push-race simulation: PASSED")
print("Preserved snapshots:", ", ".join(sorted(ids)))
PY
