#!/usr/bin/env bash
set -euo pipefail

branch="${GITHUB_REF_NAME:?GITHUB_REF_NAME is required}"
max_attempts=3

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

for attempt in $(seq 1 "$max_attempts"); do
  echo "Database publish attempt $attempt/$max_attempts"

  # Rebase the *inputs* onto the newest database, not the generated JSON.
  # The API payloads in RUNNER_TEMP are reused; no API request is made here.
  git fetch origin "+refs/heads/${branch}:refs/remotes/origin/${branch}"
  git checkout -B "$branch" "origin/$branch"

  python3 scripts/build_football_database.py
  python3 scripts/build_probability_snapshots.py
  python3 scripts/validate_football_database.py

  git add data/football-database.json

  if git diff --cached --quiet; then
    echo "Database has no changes."
    exit 0
  fi

  git commit -m "Update football database"

  if git push origin "HEAD:refs/heads/$branch"; then
    echo "Database update pushed successfully."
    exit 0
  fi

  echo "::warning::Push failed; the remote branch may have advanced. Rebuilding from its latest database state."
  if (( attempt < max_attempts )); then
    sleep $((2 ** attempt))
  fi
done

echo "::error::Could not publish database after $max_attempts attempts. No force push was attempted."
exit 1
