# Phase 3 — Player Database Rebuild Plan

**Status:** In progress — offline quality-gate slice  
**Branch:** `feature/phase-3-player-db-rebuild-2026-11`  
**Data policy:** Preserve legacy records; rebuild the canonical dataset without destructive cutover.

## Decision

Football Time will establish the seven existing `ft_*` tables as the future canonical player-statistics store. The existing legacy `public.player_records` data remains untouched and is treated as an archive/compatibility source until a separately reviewed migration plan exists. The public `data/player-database.json` snapshot is not a source of truth and must not be populated with unverified records.

This rebuild is additive. It does not drop, truncate, delete, rename, or rewrite legacy player records, existing snapshots, or match history.

## Canonical quality gates

A player-statistics row cannot be considered ready for canonical import unless all of the following are true:

1. It has a stable Football Time canonical player key.
2. It has an exact, non-empty provider player ID and provider name.
3. The provider identity mapping is unique: `(provider, provider_player_id)` resolves to one canonical player only.
4. Team, season, competition, squad level, and statistics scope are explicit and internally consistent.
5. Unknown metrics remain blank/null; measured zero remains numeric zero.
6. Source observation, collection timestamp, content hash, import batch, and permission evidence are retained.
7. Rights status is approved by a human reviewer; a text label alone is not legal verification.
8. Conflicting or ambiguous identities are quarantined; no automatic matching by name, transliteration, birth date, nationality, or club.
9. Current statistics point to an immutable source observation for the same player and exact scope.
10. Any correction appends a new observation and a reasoned history entry; it does not erase the earlier source record.

## Rebuild sequence

### R0 — Freeze and preserve the legacy boundary
- Keep `player_records` and existing player UI compatibility intact.
- Do not run cleanup SQL or delete legacy rows.
- Record the legacy row count only as an audit observation, not as a canonical dataset count.

### R1 — Enforce identity quality before preview/import
- Require `provider_player_id` on every statistics CSV row.
- Require exact provider-ID mapping before a row can pass identity resolution.
- Keep unresolved identities in `needs_identity_review`.
- Fail closed on duplicate provider-ID mappings and mismatched scope.

### R2 — Build and review a canonical import manifest
- Preserve source file SHA-256 and mapping file SHA-256.
- Review identity, rights, season, team, competition, squad level, scope, metric definitions, and data freshness.
- Keep source observations separate across providers; never average or overwrite conflicting metrics silently.

### R3 — Implement a transactional database write path
- Write canonical player, verified provider ID, import batch, immutable source observation, membership, reviewed current-stat pointer, and change history atomically.
- Reject non-approved rights and mismatched player/scope/source references.
- Use authenticated ownership and existing RLS; no public/anon access.
- Roll back the whole batch on any invariant failure.
- This stage requires separate review of SQL/RLS tests and explicit user approval before any production database write.

### R4 — Reconcile legacy records without destructive migration
- Compare legacy records to canonical identities using exact provider IDs where available.
- Keep unmatched and conflicting records in archive/quarantine.
- Only reviewed mappings may link legacy records to canonical IDs.
- Never bulk-copy legacy rows into the canonical store merely because names look similar.

### R5 — Evaluate model eligibility
- Require feature availability timestamp strictly before target kickoff.
- Exclude post-kickoff season totals from historical pre-match features.
- Keep player-derived features experimental until chronological held-out evaluation shows repeatable improvement in Brier score, Log Loss, and calibration.
- Do not change the production prediction model as part of the database rebuild alone.

## Current implementation in this slice

- The offline CSV validator now requires a non-empty `provider_player_id`.
- Regression coverage verifies that a row with a canonical key but no provider identity is rejected.
- No provider APIs, credentials, credits, Supabase connections, production writes, or destructive operations are used.

## Completion criteria

The rebuild is not complete when tables merely exist. It is complete only after canonical records are populated from permitted sources, identity and provenance audits pass, import rollback/RLS tests pass, legacy data remains preserved, and the app reads the reviewed canonical dataset without breaking existing user records.
