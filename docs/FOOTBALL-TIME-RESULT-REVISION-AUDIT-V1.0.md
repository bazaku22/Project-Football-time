# Football Time — Result Revision & Audit Log v1.0

**Status:** Draft implementation for review; no production database has been rebuilt or deployed by this PR.

## Purpose

Give Football Time an immutable, monotonic revision trail for official finished match scores so Football rich can later import the latest result revision without guessing whether a score was corrected.

## Stored fields on each finished match

- `resultRevision`: positive integer, starts at 1.
- `resultUpdatedAt`: timezone-aware UTC timestamp when FT first accepted the result or detected a correction.
- `resultSource`: provider and verification timestamp.

## Database-level audit log

The top-level `resultRevisionHistory` array is append-only and preserved between database rebuilds. Each entry contains:

- Shared Match ID: `FT-M-FOOTBALLDATA-{providerMatchId}`
- Provider match ID
- Revision number
- Home and away score
- Finished status
- Change type: `baseline`, `correction`, or `preserved`
- Recorded timestamp, reason, and source provenance

## Revision behavior

1. First complete `FINISHED` score accepted by FT receives revision 1.
2. Repeated syncs with the same score keep the same revision and timestamp; no duplicate audit entry is added.
3. If the provider changes a previously finished score, FT increments the revision and appends a correction entry. Earlier history remains unchanged.
4. If a previously finished match disappears from a provider snapshot, FT retains the previous finished record and its audit trail.
5. If a previously verified finished result becomes incomplete or non-finished in a new provider snapshot, the rebuild fails closed. It does not silently erase the result or invent a void/cancellation revision. A separately reviewed correction workflow is required.
6. Existing finished results without revision metadata are assigned a baseline revision using the previous FT database snapshot timestamp. If that timestamp is unavailable, the rebuild is refused.
7. Probability snapshots and other existing database history remain preserved.

## Safety boundaries

- No new provider, API, subscription, or AI API.
- The existing football-data.org sync remains the only source used by the database builder.
- No Supabase writes or schema migrations.
- No production data is changed by editing this branch. The normal database update workflow must be explicitly run after review.
- Football rich remains unable to author official results. The exporter/importer will consume these revisions later.

## Tests added

- First finished score receives revision 1 and an audit entry.
- Unchanged scores do not increment or duplicate revisions.
- Corrected scores increment revision and preserve the previous score entry.
- A previously finished score becoming incomplete causes the rebuild to fail without replacing the existing database file.
- A previously finished result omitted from the latest provider feed is retained.
- The database validator checks revision metadata, source timestamps, unique history keys, and consistency between the latest audit entry and current score.
- Existing result audit entries survive a rebuild.

## Not yet enabled

This PR does not enable match-result export to Football rich. That follows after the importer handles result revisions idempotently, rejects stale/equal-conflicting revisions, and stores a read-only audit trail.
