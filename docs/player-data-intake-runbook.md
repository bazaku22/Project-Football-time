# Player Data Intake — Offline Fixture Runbook

This is a **synthetic, offline acceptance fixture** for the Phase 3 player-data intake path. Every player ID, player name, statistics row, permission reference, and review identity in `tests/fixtures/player-intake/` is invented for tests. The fixture is not a real player dataset and its `fixture-only-not-a-real-license` marker is not evidence of a licence or permission.

## Run the pipeline

From the repository root:

```bash
python scripts/reconcile_player_identity.py \
  tests/fixtures/player-intake/provider-roster.csv \
  tests/fixtures/player-intake/canonical-players.csv \
  tests/fixtures/player-intake/player-id-mapping-reviewed.csv \
  --out /tmp/player-identity-review-queue.csv \
  --summary /tmp/player-identity-review-summary.json

python scripts/preview_player_stats_import.py \
  tests/fixtures/player-intake/player-statistics.csv \
  tests/fixtures/player-intake/player-id-mapping-reviewed.csv \
  --out /tmp/player-statistics-preview.json \
  --csv-out /tmp/player-statistics-preview.csv
```

The regression test runs both commands and checks three distinct outcomes:

- `SYN-001`: exact provider-ID mapping with reviewer evidence; preview remains pending human review.
- `SYN-002`: no exact provider-ID mapping; identity remains unresolved even though the row has a plausible-looking name.
- `SYN-003`: exact mapping exists, but rights are marked `manual_review`; the row is quarantined.

The test also verifies that the original statistics and mapping CSV files are unchanged and that the preview contains SHA-256 checksums.

## What a passing test means

It proves only that the local scripts can process a controlled synthetic example and preserve the expected fail-closed states. It does **not** prove:
- that any real source is licensed or legally usable;
- that a real provider dataset has been collected;
- that canonical production identities are complete;
- that data has been imported into Supabase;
- that any player statistics are approved for the prediction model.

All commands are local and offline. No API calls, provider credits, network requests, Supabase writes, or production migrations are part of this fixture.
