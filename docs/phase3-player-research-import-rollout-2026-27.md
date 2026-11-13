# Phase 3 — Player Research + Verified Import rollout (2026/27)

**Status:** implementation plan and source-gating decision; no player records imported.  
**Prepared:** 2026-11-13.  
**Branch:** `feature/phase3-player-research-import-rollout-2026-11`.

## 1. Decision

Adopt a **Research → Verify → Local Preview → Approved Import** workflow as the preferred path for player directory and statistics data where a source grants the required rights. Do not replace the existing five-league API sync yet.

This is a source-by-source, field-by-field strategy, not a blanket declaration that all public football pages can be copied into the app. Public visibility, a search result, or a downloadable file is not by itself permission to reproduce or redistribute a database.

## 2. Existing implementation to reuse

The following foundations already exist on `main` and must be extended rather than duplicated:

- PR #100: canonical player identity, provider-ID mapping, memberships and source-observation model.
- PR #110 and #120: 2026/27 five-league pilot contract and 96-club coverage register.
- PR #112: source reuse-rights gate.
- PR #126: source assessment work (the PR remains open; review its branch before reusing any unmerged changes).
- PR #151 and #152: manual research contract, offline validator and local-only research import UI for match research.
- PR #156: Canonical Player Hub with Overall / Club / National Team categories, exact-ID linking, provenance and rights display.
- `data/player-intake-manifest-2026-27.json` and `data/player-statistics-intake-2026-27.json`: empty offline intake templates with existing validators.
- `scripts/player_source_pipeline.py`, `scripts/wikidata_p54_jsonl_extractor.py`, and `scripts/reep_snapshot_inspector.py`: offline-only identity and membership evidence tooling.

Do not create a second canonical player table or a second generic statistics table without a demonstrated schema gap.

## 3. Source eligibility decision

### Identity / crosswalk sources

- **Reep public register:** CC0 1.0 for rights Reep holds; useful for stable identity and provider-ID bridges only. The public release is not a complete current-season player roster or player-statistics feed. Do not interpret team-season participation as a player squad membership. Third-party rights are not granted by Reep's CC0 dedication.
- **Wikidata structured data:** CC0 structured data and P54 (member of sports team) can be used as a discovery/cross-check signal when statement IDs, rank, date qualifiers and references are preserved. P54 alone does not prove 2026/27 registration, first-team status, matchday eligibility or complete coverage.
- **OpenFootball Players:** CC0 identity reference only; it does not establish current club membership.

### Roster and statistics sources

- The five official league / organiser sources currently recorded in `data/current-player-squads-2026-27.json` remain `written_permission_required`; do not bulk-copy them into the app until permission or a separately reviewed lawful basis is recorded.
- The UOC Transfermarkt-derived dataset is CC BY-NC-SA 4.0 and research-oriented; it is not approved for this app's production intake.
- Transfermarkt-derived datasets currently identified as stale do not cover 2026/27 squads; do not scrape upstream sites as a workaround.
- Any additional dataset or provider must pass a separate review for the exact fields, intended app use, commercial use, database rights, redistribution, attribution, retention and update rights.

A source can be approved for identity only while remaining blocked for membership, statistics, images or redistribution. Keep these permissions separate.

## 4. Target data flow

1. **Discover:** research source pages and datasets. Search snippets are discovery hints only; record direct source URLs.
2. **Assess rights:** record publisher, source scope, licence/terms URL, review date, permission basis, commercial-use permission, database-rights review, redistribution permission and attribution requirements.
3. **Capture:** store only permitted fields. Preserve source-native player ID, source name, direct URL, observed timestamp, season, competition, team, squad level, metric definition and units.
4. **Resolve identity:** link only by an exact provider ID mapping or an explicitly reviewed identity decision. Never merge on display name alone.
5. **Verify membership:** require dated evidence for 2026/27, canonical club mapping, first-team / academy classification where supported, and a review state for conflicts or loans.
6. **Verify statistics:** preserve competition and season scope; keep match rows separate from competition and season totals; unknown stays null, not zero.
7. **Preview locally:** validate JSON/CSV offline, show rejected rows and reasons, and store reviewer decisions on the device only until a separately approved import.
8. **Promote:** only rights-cleared and verified rows may be proposed for Production. Production import is a separate approval and must be additive, auditable and idempotent.

## 5. First pilot: Premier League 2026/27

Use the Premier League as the first **workflow pilot**, not as an assumption that its data is already reusable. It has a clear season-specific squad-list discovery surface and a defined set of 20 clubs, making it practical to measure research coverage.

Pilot stages:
- Start with one representative club and then expand to a small cohort only after the source-rights gate is cleared.
- Record roster scope (submitted senior list, eligible U21, academy, loaned-out, injured/unregistered) separately; do not conflate a published squad list with full player membership.
- Capture only facts that are permitted for the intended in-app use.
- Keep all rows Research Only until both source rights and player/team identity are reviewed.
- If written permission is not available, do not copy roster rows. Use the pilot to validate the evidence ledger and leave the dataset empty rather than substituting scraped or unlicensed data.

After the first pilot passes, repeat the same process for La Liga, Bundesliga, Serie A and Ligue 1. Do not assume the five leagues share the same registration rules or data definitions.

## 6. Acceptance criteria before reducing API sync

Keep the existing football-data.org sync unchanged until a representative trial demonstrates all of the following:

- Rights: every promoted field has a documented permission basis for the intended use; no pending or prohibited source enters the app dataset.
- Coverage: at least 98% of the in-scope target cohort is accounted for, with explicit statuses for unavailable / permission-pending / not published.
- Identity: at least 99% of promoted player rows have exact provider-ID or manually reviewed canonical identity links; no name-only auto-merge.
- Freshness: the source update cadence and observed timestamps meet the product's agreed freshness target; stale records are visibly marked.
- Accuracy: conflicts against the existing provider are measured and resolved; no silent source overwrite.
- Operations: research/import effort, update latency, failure rate and provider/API cost are measured over at least four consecutive weekly cycles.
- Rollback: the existing API path remains available until the replacement cohort has passed review and can be rolled back without data loss.

These are proposed engineering gates for the pilot, not claims about current coverage.

## 7. Current blockers and open work

- The checked-in intake manifests are empty drafts. No rights-cleared 2026/27 player memberships or player-season statistics have been promoted.
- The previous 96-club register records 5/96 representative roster reviews, 0/96 rights-cleared sources and 0/96 verified current-season memberships.
- PR #137 (local squad review workspace) and PR #140 (provisional player directory) are still open and have stale-base CI failures. PR #137 also has a local-only UI assertion failure. They must be rebased/consolidated against the current `main` and revalidated; do not merge either as-is.
- PR #126 is still open. Its source assessment must be reconciled with the later source research already on `main` before deciding whether any unique content should be carried forward.
- PR #156 is merged and already supplies the Canonical Player Hub foundation.

## 8. Safety boundaries

- No provider API calls, API credits, trials or paid services in this rollout.
- No scraping or automated copying from league, club, federation, aggregator or search-result pages.
- No Supabase Production DDL, writes, imports, updates, archives or deletes.
- No automatic identity merges and no name-only joins.
- No changes to 2025/26 history or existing legacy player records.
- No change to the existing five-league API schedule until the acceptance criteria are measured and the user separately approves the cutover.
- Feature branch + PR only. Merge and deployment require separate explicit approval.
