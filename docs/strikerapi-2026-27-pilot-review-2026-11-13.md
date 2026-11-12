# StrikerAPI 2026/27 pilot rights and cost review — 2026-11-13

## Purpose

This is a source-specific intake review for the five Football Time leagues: Premier League, La Liga, Bundesliga, Serie A and Ligue 1. It does not authorize provider access or Production import.

## Official provider statements reviewed

- Coverage: the official documentation lists all five target leagues and describes player statistics and other football endpoints: https://strikerapi.com/docs
- Pricing: the provider advertises a Free tier with 500 credits/month and no card; paid plans start at $19/month: https://strikerapi.com/
- Commercial display: the provider's rights page says users may build commercial apps and display statistics and derived values in their own product, but may not pass raw data on as a dataset, feed, file or API: https://strikerapi.com/docs/timing-and-rights
- Retention: the provider says data may be stored while the account remains open; after cancellation, stored data may still be used internally but not to continue serving a product.
- Provider independence: StrikerAPI says it is not an official league partner and does not grant league rights. Its own terms therefore do not grant rights to league marks, club crests, player photos, or official endorsement claims.
- Data revisions: the provider says it retains current records rather than a full per-record revision history. Football Time must retain its own retrieval timestamp and immutable snapshots if reproducibility is required.

## Engineering decision

<badge>Candidate — not yet accessed</badge>

StrikerAPI is currently the strongest practical candidate for a controlled 2026/27 pilot because:
1. its official docs list all five target leagues;
2. its published terms permit commercial in-app display of statistics and derived outputs;
3. its published free tier can support a zero-THB pilot if endpoint credit use remains within the monthly 500-credit allowance.

The free tier is finite. A complete 96-club population must not be assumed to fit the quota until the exact endpoints, per-call credit costs, pagination and required request count are calculated. No paid plan or top-up is authorized.

## Required controls before access

1. Obtain explicit user approval before creating/using credentials or making any API request.
2. Present a request budget first: endpoint, purpose, estimated credits, monthly ceiling and expected club/player coverage.
3. Keep provider-native player IDs and source identifiers; do not join players by name alone.
4. Keep roster identity/membership and player performance statistics as separately sourced domains.
5. Store metric definitions, units, competition, season 2026/27, canonical player key, canonical club, retrieval timestamp and provider ID.
6. Keep raw provider responses private; show permitted statistics inside Football Time only. Do not publish a raw data export or replacement feed.
7. Keep player images, crests, league marks and official endorsement claims outside this provider approval; review them separately.
8. Preserve immutable local snapshots and source timestamps because provider records may be overwritten without per-record revision history.
9. Do not write to Supabase Production, run migrations, or import records as part of this source review. A separate exact import plan and approval remains required.

## Current status

- Provider API calls: 0
- Credits consumed: 0
- Paid subscription / top-up: none
- Player records imported: 0
- Supabase Production writes: 0
- 2026/27 source approval: candidate terms reviewed; access not authorized
- 2025/26 archive: unchanged

This review is an engineering intake assessment, not legal advice or a guarantee that all upstream rights are covered.
