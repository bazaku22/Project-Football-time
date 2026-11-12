# Phase 3 — Team & Player Intelligence

Status: implementation in progress  
Baseline: main at V6.9.1-beta.1 / Service Worker V59  
Scope: five major European leagues; no paid data source and no provider sync during this phase's offline implementation.

## Objectives

1. Establish trustworthy player identity across providers without matching on name alone.
2. Preserve team, competition, season, squad level, and time-bounded membership.
3. Keep source observations immutable and separate from reviewed/current statistics.
4. Expose player and team profiles with explicit data freshness and provenance.
5. Prepare carefully gated player-derived features for later model experiments without changing the production probability model until evidence supports them.

## Current repository and database baseline

- `data/player-database.json` is currently an empty public snapshot (`records: []`, `generatedAt: null`, status `awaiting_api_key`). It must not be described as a populated public player database.
- The private legacy `public.player_records` table was recorded as containing 189 user-owned rows during the 2026-11-11 migration review. These are private provider/roster records, not proof that the canonical `ft_*` model dataset is populated.
- Seven additive `ft_*` tables are already present in production Supabase: canonical players, provider IDs, import batches, immutable source observations, memberships, reviewed current stats, and change history. All are owner-scoped by RLS. At migration review time, the seven tables were empty.
- The existing CSV import pipeline validates exact provider-ID mappings, scope, season, metrics, and rights metadata, then produces a local preview. It does not write to the database.
- StrikerAPI is the preferred source for player identity/master data and current squad membership where available. Its detailed season performance is a source, not a universal truth. Other permitted providers may contribute independent metrics with source/model labels.
- API Ninjas is a roster/bio fallback only; its documented current squad endpoint does not provide season performance totals.
- OpenPlay data is historical through 2025/26 and requires upstream rights review; research pilots are not production data. Do not scrape Understat or other sources whose automated access is disallowed or unverified.

## Canonical identity rules

- The internal player identity is independent of every provider's player ID.
- A provider identity is `(source_name, provider_player_id)`; it may link to one canonical player only after exact-ID evidence or a reviewed mapping.
- Never merge players using name, transliteration, date of birth, nationality, or club name alone. These can generate review candidates, not verified links.
- Keep aliases and conflicting mappings visible; ambiguous candidates remain quarantined.
- Team membership is a separate, time-bounded relation. A player changing clubs must not create a new canonical player.
- First-team, U21, U18, and other youth data must remain distinct.

## Statistics and provenance

Every observation must retain:
- canonical player ID and provider player ID;
- source/provider, source record key or URL, collection timestamp and source update timestamp;
- season, competition, team, squad level, and statistics scope (season / competition / match);
- metric name, definition, unit, and provider/model label where relevant;
- rights status and permission reference;
- content hash and import batch.

Unknown stays null; zero is a measured zero. Never silently combine provider xG models, per-90 definitions, or differently scoped totals. Corrections append a new source observation and a reasoned change-history row; they do not erase the original observation.

## Model-use policy: prevent leakage

Player data may improve future match forecasts, but only if it is available before the forecast's kickoff cutoff.

- Season totals collected after kickoff must not be used to recreate a historical pre-match feature vector.
- Match-level observations are eligible only when their match finished and their source observation was collected before the target match kickoff.
- Current roster membership is not proof of starting status, availability, injury status, or expected minutes.
- Do not infer injury, suspension, lineup, or absence from missing data.
- Candidate team-level features include verified squad continuity, recent player minutes share, player attacking contribution per 90, position-group depth, and availability/lineup strength. Each needs a defined denominator, minimum sample, and pre-kickoff timestamp.
- Normalize per-90 rates using exposure minutes; apply shrinkage/minimum-minute gates to avoid overreacting to tiny samples.
- Compare a baseline model with a player-feature model on the same chronological, held-out fixtures. Use walk-forward evaluation, Brier, Log Loss, calibration, and sample counts by league.
- Keep the production model unchanged until the player-feature experiment demonstrates repeatable out-of-sample improvement and no leakage. Store an explicit model version and immutable pre-match feature snapshot.

## Provider budget and operations

- Target recurring provider cost remains 0 THB/month.
- Do not call provider APIs, dispatch manual workflows, or consume credits during code review and offline implementation.
- The StrikerAPI import workflow is manual-only to protect credits. Its 500-credit free-tier figure and endpoint costs must be rechecked against current provider terms before any real import; do not treat historical pricing notes as guaranteed.
- No scheduled import should be enabled by this phase without an explicit quota and rights review.
- Never expose provider keys in browser code, repository files, JSON snapshots, or logs.

## Implementation gates

1. Offline importer tests prove exact season/team selection, null-vs-zero handling, preservation of valid prior values, and fail-closed behavior.
2. CI validates the importer and existing player-statistics/RLS tests.
3. Identity reconciliation remains reviewable; no automatic cross-provider merges based on names.
4. Any database write path must use the existing owner-scoped schema and transactional import lifecycle; source observations and history remain append-only.
5. Team/player UI must show provenance, freshness, sample size, and unavailable data honestly.
6. Player-derived model features stay experimental until a separate chronological evaluation passes.

## Changes in this Phase 3 work branch

- Fix StrikerAPI season selection so a profile cannot silently fall back to the first season returned by the provider when the requested season is absent.
- Reject a season-stat row whose supplied team conflicts with the current player team.
- Preserve existing metric values when the provider omits a metric, while accepting a real numeric zero as a valid update.
- Match football-data teams by normalized name only when the candidate is unique; ambiguous team-name collisions remain unmapped rather than selecting an arbitrary club.
- Add offline regression tests; no API request or database write is needed to run them.

## Explicit non-goals

- No provider sync, no manual workflow dispatch, no API quota consumption.
- No new paid source or change to the 0 THB/month target.
- No automatic canonical identity merges.
- No player-feature production model change in this implementation slice.
- No changes to Club Handicap, International experimental data, match snapshots, or historical prediction records.
