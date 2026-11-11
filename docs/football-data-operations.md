## Football data operations

Five core leagues (PL, PD, BL1, SA, FL1) are required in the scheduled sync. ELC is fetched separately with one attempt per endpoint; an incomplete or failed ELC fetch cannot block the core update. The builder preserves previous ELC teams, season memberships, standings and matches atomically, marks ELC stale and retains its previous successful-sync timestamp. If no complete prior ELC dataset exists, it fails closed. Prediction snapshots remain immutable; stale leagues are excluded from new snapshot generation and result evaluation.

For an exceptional ELC-only check, use Actions → Diagnose ELC Data (ELC only) → Run workflow. It makes at most three requests, does not retry, does not publish or modify the database, and uploads payloads plus a summary for seven days. This assistant connection cannot dispatch GitHub Actions; a repository maintainer must start it manually.

The app distinguishes network-delivered data from a cached fallback and displays per-league freshness separately. Network delivery alone does not mean every league is fresh.
