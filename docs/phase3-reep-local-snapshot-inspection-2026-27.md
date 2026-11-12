# Phase 3 — Reep local snapshot inspection (2026/27)

**Status:** Inspector implemented; actual snapshot inspection is pending a locally staged release file.  
**Review date:** 2026-11-12.

## Purpose

The Reep public release reviewed for this project is a large DuckDB snapshot. This step provides a local, read-only schema inspector so the real table and column layout can be reviewed before writing any schema-specific adapter. It deliberately does not download the release, install DuckDB, query a hosted API, or export player rows.

## Run locally

Install the DuckDB Python package from a trusted package source yourself, then stage the release file outside the repository (do not commit the multi-gigabyte snapshot):

```sh
python3 scripts/reep_snapshot_inspector.py \
  --snapshot /path/to/reep-release.duckdb \
  --release-stamp 2026-10-25.1 \
  --expected-sha256 YOUR_TRUSTED_RELEASE_SHA256 \
  --output /tmp/reep-schema-report.json
```

The checksum option is recommended when a trusted release manifest supplies a SHA-256. The inspector opens DuckDB with `read_only=True` and `enable_external_access=false`; it enumerates table names, column names/types/nullability and row counts only. It does not select or emit row values. No dependency is installed by the script or CI.

## Interpretation and limits

- Candidate table roles are column-name heuristics, not confirmed schema mappings.
- Do not infer player identity, provider bridge or relationship semantics from table names alone.
- In particular, team-season participation must not be interpreted as player squad membership.
- A schema report alone does not establish commercial reuse rights for third-party data, current-season roster completeness, first-team status, player registration or photo/personality rights.
- The checked-in `data/reep-snapshot-inspection-2026-27.json` is an explicit waiting baseline because no snapshot is staged. It must not be described as an inspected release.

## Safety

Research Only; no network access; no provider API calls or charges; no Production import; no Supabase writes, deletes or migrations. The existing 2025/26 archive and canonical player records are untouched.

## Next evidence gate

After a real local snapshot is staged and the schema report reviewed, add a schema-specific adapter only for fields whose semantics and rights scope are documented. Keep the adapter output research-only and require explicit human review before any player-to-club membership or canonical identity reconciliation.
