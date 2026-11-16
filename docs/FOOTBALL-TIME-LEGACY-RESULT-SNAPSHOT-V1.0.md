# Football Time — Legacy Result Snapshot Export v1.0

**Status:** Implementation proposal. This format is deliberately separate from Match Results v1.0.

## Purpose

Allow existing finished scores that predate the trusted Result Revision History to move from Football Time to Football rich without pretending they have a revision chain or independently verified per-result provenance.

## Data type

- `data_type: legacy_match_result_snapshots`
- `snapshot_policy: non_revision_legacy`
- Scope: PL, PD, BL1, SA, FL1; season 2026-2027.
- Identity: the existing `FT-M-FOOTBALLDATA-{providerMatchId}` only.
- Each record carries the score plus explicit evidence classification:
  - `classification: legacy_database_snapshot`
  - `verification_status: not_independently_verified`
  - `revision_history_available: false`
  - `database_generated_at` is the time the source database file was generated, not the time the match result was verified.

## Exclusions and validation

Records without a stable provider match ID or non-negative integer full-time scores are excluded and counted in the export preview. Duplicate/invalid shared IDs are excluded. The exporter is read-only and never generates a local ID, revision number, result update timestamp, source verification timestamp, or correction history.

## Separation from verified results

- Legacy snapshots are not accepted by the strict `match_results` exporter/importer.
- Legacy snapshots must be stored in a separate additive field in Football rich.
- They must not overwrite `match_results`, predictions, analyses, performance records, or imported verified revisions.
- Legacy snapshots must be visibly marked as unverified legacy evidence wherever used.
- They may be used for retrospective exploratory evaluation only with an explicit low-confidence / legacy-data label. They must not be pooled silently with verified-result metrics.
- Re-importing the same snapshot must be idempotent; a conflicting score for the same match must be flagged, not silently overwritten.

## Database rebuild safety

The FT database builder now retains a pre-existing finished result without revision metadata as a separate `legacyResultSnapshot`. It does not convert the database-file timestamp into a fabricated result verification time or baseline revision. If the current provider feed shows a changed score, that current feed observation begins a new revision chain at revision 1 while the prior legacy snapshot remains preserved. Existing revision metadata without its required history fails closed.
