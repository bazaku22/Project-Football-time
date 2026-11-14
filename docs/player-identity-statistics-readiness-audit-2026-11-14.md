# Player identity and statistics readiness audit — 2026-11-14

## Decision

**Do not start a bulk player-statistics import yet.** The user-facing Player Database flow is present and has been confirmed by the owner on Android, but the 2026/27 roster observations are not canonical player identities and no rights-cleared, sufficiently complete player-statistics dataset is currently staged.

This audit is repository-only and read-only with respect to Production. It does not call a provider, consume API credits, run a Supabase query, apply a migration, write to Supabase, modify Local Storage, or deploy the app.

## Verified repository state

| Area | Current evidence | Readiness |
|---|---|---|
| User-facing flow | PR #181 provides league → club → searchable roster → source-linked profile. Owner confirmed Android roster and profile navigation. | UI milestone verified by owner |
| 2026/27 roster research | `data/footballsquads-roster-intake-2026-27.json`: 96 club pages, 3,415 name observations. Every row remains `source_listed_pending_independent_crosscheck` / `name_only_unverified`; provider IDs and statistics are empty. | Research only; not canonical |
| Source reuse rights | Existing source assessment says FootballSquads has no established open-data licence or permission for extraction/database reuse/redistribution. | Not cleared |
| Other roster sample | `data/current-player-squads-2026-27.json`: 25 observations, research-only, all provider IDs/statistics empty and rights pending review. | Not importable |
| Club coverage register | `data/player-coverage-2026-27.json`: 96 club catalogue entries across five leagues, 0 rights-approved sources and 0 Production-eligible clubs; only 5 clubs have a reviewed research page. | Club universe only, not player coverage |
| Identity candidate pipeline | `data/player-source-pipeline-report-2026-27.json`: 0 Wikidata candidates, 0 Reep entities/bridges/edges and no supplied Reep snapshot. | No candidate crosswalk to review |
| Wikidata membership review | `data/wikidata-player-membership-review-2026-27.json`: CC0 P54 review file is empty (0 candidates). | No current membership evidence |
| Statistics intake | `data/player-statistics-intake-2026-27.json`: draft, 0 records, 0 sources. | Empty |
| Player match-event ledger seed | `data/player-match-event-ledger-2026-27.json`: `research_intake_empty`, no expected finished match IDs and no records. The app's PR #179 reads the device-local ledger, so this bundled seed alone does not describe every user's local device state. | No bundled event evidence |
| Existing research statistics | `data/football-research-stats-2026-27.json` is derived from existing football-data.org fixtures/results and explicitly describes team/match research, not player statistics. | Cannot populate player profiles |
| Existing cloud player cohort | The Operations Center records a read-only Production snapshot of 29 canonical players, 29 provider mappings, 29 memberships, 29 current-stat rows and 29 source observations, all OpenPlay / 2025/26. Keep this historical cohort archived; it is not 2026/27 coverage. | Historical pilot only |
| Provider sync | `.github/workflows/update-player-database.yml` is manual-only and requires a StrikerAPI secret. A run may consume provider quota/credits. | Requires separate cost and rights approval |

## What the current app can safely show

- The FootballSquads names may remain visible as **source-listed / pending verification** research observations.
- Player profile statistics must remain unknown (—), not zero, until a verified player identity and eligible source record exist.
- PR #179 only derives totals from the device-local Player Match Event Ledger after its review, complete-coverage, two-source, authoritative-source, reuse-rights and permission-basis gates. It must not join roster names to ledger players by name.
- The existing 7 reviewed team crosswalk decisions are team mappings only; they do not establish any player identity mapping.

## Candidate source decisions

1. **Wikidata P54 (CC0 structured data):** the best zero-provider-cost lead for a narrowly scoped research pilot. A P54 statement is only a candidate membership signal; require item ID, statement references, rank, qualifiers, retrieval timestamp, exact club/season evidence and independent checks. It does not by itself prove current registration, first-team status or completeness. The project currently has no export/candidates.
2. **Reep identity register:** identity/provider-ID crosswalk candidate only. The repository's prior assessment says squad and lineup membership edges are not in its public release. No API call or large download is approved.
3. **FootballSquads:** may remain a research reference only until reuse permission is established. Its 3,415 observations must not be bulk-imported or redistributed based on public visibility alone.
4. **StrikerAPI / API-Football / other paid feeds:** do not call, request a trial, or consume credits in this phase. First review plan limits, exact field coverage, commercial reuse, attribution and monthly cost, then obtain explicit authorization.
5. **Existing football-data.org results:** useful for match/team context but not a source of player appearances, goals or assists in the current research export.

## Recommended next implementation sequence

### Phase A — zero-cost identity evidence pilot
- Obtain or build a small, properly sourced Wikidata P54 candidate export for one club in each of the five leagues.
- Keep all rows research-only and preserve QIDs, statement GUIDs, qualifiers, references and retrieved timestamps.
- Compare each candidate against an independently reviewed current-season source; classify registered senior squad, U21/youth, matchday appearance and unknown separately.
- Generate an offline reconciliation report only. No canonical player IDs or automatic merges are assigned.

### Phase B — statistics source eligibility
- Evaluate one candidate statistics source against the required fields: appearances, starts, minutes, goals and assists, with competition and match scope.
- Confirm whether it covers league, domestic cups and continental club competitions for 2026/27, or explicitly mark gaps.
- Record licence, licensor authority, permitted commercial use, attribution, redistribution, source freshness and field-level restrictions.
- Do not assume a provider's API access grants rights to redistribute its data in the app.

### Phase C — one-club statistics proof
- Only after Phases A and B pass, build a one-club offline sample with exact provider player IDs and exact team/season/competition IDs.
- Run the existing intake validator and import preview; quarantine every ambiguous, incomplete, duplicate or rights-pending row.
- Confirm totals against independent match-level evidence and avoid double-counting season aggregates with competition/match records.

### Phase D — approval gate
- Present the user with the source, scope, estimated API credits/cost, fields, coverage gaps and exact records proposed.
- Obtain separate approval before any provider call that consumes credits and separate approval before Production Supabase writes/migrations.
- Only then prepare a narrowly scoped implementation PR and Android test release.

## Acceptance criteria before any real statistics appear

- Every profile maps to one canonical player ID through a reviewed exact provider-ID bridge; no name-only matching.
- Every membership is season-, team- and squad-level scoped with source provenance.
- Every statistic has a source record, metric definition, competition scope, collection timestamp, rights status and permission basis.
- Current-season all-club-competition totals are not presented unless the source actually covers league + domestic cups + continental competitions.
- Unknown remains null/—; a missing feed is never represented as zero.
- Imports are idempotent, atomic, auditable and reversible through the existing controlled workflow.
- No existing Match Center, Match Event Ledger history, 2025/26 archive, or existing player records are overwritten.

## Outcome of this audit

The blocker is **not the Player Profile UI**. It is the absence of a verified 2026/27 canonical identity bridge and a rights-cleared player-statistics source with sufficient competition coverage. The safest next coding task is the offline Wikidata identity-evidence pilot, not a bulk import or a provider sync.

## Source files reviewed

- `docs/player-open-data-source-assessment-2026-11.md`
- `docs/player-data-operations-center-2026-11.md`
- `data/footballsquads-roster-intake-2026-27.json`
- `data/current-player-squads-2026-27.json`
- `data/player-coverage-2026-27.json`
- `data/player-source-pipeline-report-2026-27.json`
- `data/wikidata-player-membership-review-2026-27.json`
- `data/player-intake-manifest-2026-27.json`
- `data/player-statistics-intake-2026-27.json`
- `data/player-match-event-ledger-2026-27.json`
- `data/football-research-stats-2026-27.json`
- `js/player-database-mvp.js`
- `js/player-stats-import.js`
- `scripts/player_reconciliation_pipeline.py`
- `.github/workflows/update-player-database.yml`

