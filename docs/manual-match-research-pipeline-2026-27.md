# Manual Match Research Pipeline — 2026/27

## Purpose

Provide a controlled, human-reviewed intake path for match results and player match performance across the five core leagues and UEFA Nations League, while reducing avoidable provider API usage.

This is a research/intake contract, not an automated source collector. Google Search may help discover and cross-check sources, but a Google result card or snippet is not a source record and must never be copied as the sole evidence.

## Scope

- Core club competitions: Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1).
- International: UEFA Nations League only (UNL); no friendlies or other national-team competitions.
- Season: 2026/27 only.
- Match data: final result/status, goals, assists, cards, and optionally player ratings.
- Keep provider match IDs and existing fixture IDs. Do not create duplicate fixtures.
- Keep international data isolated from club databases, player history, and club models.

## Daily workflow

1. Find the day's completed fixtures in Google Search.
2. Open the original competition organiser, federation, or a licensed data provider. Google is a discovery/cross-check layer, not the origin of record.
3. Verify fixture identity, date/time, full-time score, goal events, assist attribution, and cards. Record the direct source URL and checked timestamp.
4. Check the source's reuse terms for the intended in-app use. A public page or a CC licence on an aggregator does not automatically grant rights to the underlying match data.
5. Enter only data with a traceable source. Conflicts become `needs_review`; do not guess or silently overwrite provider data.
6. Validate the JSON locally with `python3 scripts/validate_manual_match_research.py`.
7. Review the diff and submit a feature-branch PR. Never write directly to `main`.

## API quota strategy

- Keep the existing football-data.org workflow as the current source for club fixtures, team identity, standings, and match IDs.
- Evaluate manual research first for post-match score verification and supplemental events/ratings; do not disable or change the existing scheduled sync in this phase.
- Only consider reducing an endpoint or schedule after measuring actual requests, coverage, update latency, and mismatch rates over a representative trial.
- Never replace an authoritative provider field with a manual value without a documented conflict resolution.

## Data and rights rules

- A Google search result, sports card, snippet, or knowledge panel is not an API and is not an automatically reusable dataset.
- Store direct source URLs, source names, checked-at timestamps, and explicit reuse-rights assessment.
- `reuse_rights: confirmed` means an engineering reviewer has recorded a clear permission basis for this intended use; it is not a legal opinion.
- `pending` or `prohibited` sources may be retained in a private research log but must not be published into the app.
- Player ratings are provider-specific. Preserve provider, scale, source, and rights status. Never average ratings from different providers.
- Do not store copied articles, commentary, images, or long text passages.

## Record policy

- `verified`: at least two independent direct sources, including an official organiser/federation or licensed provider, with consistent facts. Publication still requires confirmed reuse rights.
- `needs_review`: conflicting, incomplete, or weakly sourced information.
- `unverified`: research not completed.
- Unknown player identity stays as a name-only provisional record. Never invent a canonical player ID.
- Events and ratings are optional. Missing data must remain missing, not be inferred.

## Current implementation boundary

This phase adds a versioned data contract and offline validator only. It does not:
- call any provider API or consume credits;
- scrape Google, UEFA, federation, or live-score pages;
- run a scheduled research workflow;
- write to Supabase Production;
- alter the existing five-league sync, Match Center display, player database, or model history.

A later phase can add a reviewed import UI and Match Center rendering after this contract and source-rights workflow are validated.
