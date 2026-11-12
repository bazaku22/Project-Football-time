# Phase 1 — System Health & Quality Audit

**Audit date:** 2026-11-12  
**Audited baseline:** `main` at `b144fbc8d75bdd17518f356496cfad2b18535730`  
**Application version:** `6.8.0-beta.1`  
**Service worker cache:** `football-time-v57`

## Executive summary

The current production baseline is healthy at the repository/CI level: the latest observed validation, UI/Handicap validation, and Pages deployment runs completed successfully. The application already has the four primary navigation areas (Home/Match Center, Leagues & Teams, Analysis, History), so this audit recommends preserving that structure and improving the existing capabilities rather than rebuilding navigation.

No production files, user data, scheduled workflows, or external API quotas were changed or consumed during this audit.

## Verified findings

### 1. GitHub and deployment baseline

- Default branch: `main`.
- Audited main commit: `b144fbc8d75bdd17518f356496cfad2b18535730`.
- Application version in `index.html`: `6.8.0-beta.1`.
- Service worker cache in `sw.js`: `football-time-v57`.
- The latest observed runs associated with the baseline completed successfully:
  - Validate Football Time App — run `43186689346`.
  - UI and Handicap Validation — run `43186689264`.
  - Pages build and deployment — run `43186688915`.

These results establish that those runs passed; they do not establish that every live data source is currently fresh or that every Android device has loaded the newest cache.

### 2. Primary navigation and existing feature areas

The current `index.html` exposes four primary pages:

1. Home / Match Center
2. Leagues & Teams
3. Analysis
4. History

The main navigation should remain at four items. Database utilities, player statistics, experimental analysis and other secondary tools should remain secondary rather than expanding the primary navigation without a clear user need.

The current app includes:
- 1X2 analysis and probability snapshots/history.
- Club Asian Handicap analysis, reference helper and settlement history.
- A separate International Handicap workspace and isolated history.
- Analysis Insight and supporting match data.
- Probability evaluation including accuracy, Brier score, Log Loss and calibration summaries.
- Football database and player-data tooling.

### 3. Legacy pull requests

Two older PRs remain open and should not be merged without refreshing/reviewing them against the current baseline:

- PR #38 — automatic prediction-results history. Its intended user-facing history capability is already represented in the current `index.html` implementation, including `renderProbabilityHistory()`. Reassess only for genuinely missing functionality; do not merge stale code simply to close the PR.
- PR #65 — Phase 0 UX feature/screen map. Its description and proposed UX map predate the current four-page navigation. Update or supersede the documentation based on the current app rather than treating its old screen map as authoritative.

Neither PR was merged or closed during this audit.

### 4. Branch governance

The repository API reported `main` as unprotected and no repository rulesets were returned during the audit. This is a governance gap, but enabling protection requires a separate compatibility review.

Before enforcing required checks or restricting direct pushes, verify:
- Which scheduled workflows commit generated database/reference files back to `main`.
- Whether those workflows use the default `GITHUB_TOKEN` or a dedicated token/app.
- Whether required status-check names are stable and available on pull requests.
- Whether the repository plan and permissions support the intended rules.

Do not enable a rule that silently blocks the existing data-refresh workflows. Prefer a narrowly scoped ruleset/branch policy with an explicit automation-compatible path, then verify it with a controlled PR and workflow review.

### 5. Data freshness and source coverage

The repository contains separate reference datasets for Club Handicap and experimental International Handicap. The International reference data has a recorded fetch timestamp of `2026-11-12T08:42:17.589930Z`; this is the capture time, not proof that every bookmaker quote remains fresh now.

The application must continue to gate probability display on source count, source-update age, valid pre-match capture and model readiness. Missing or stale source coverage must remain visible as a limitation; never substitute fabricated or stale fallback values.

No new provider requests or manual syncs were made as part of this audit.

## Risks and follow-up work

| Priority | Finding | Recommended next action |
|---|---|---|
| High | `main` has no reported branch protection/ruleset | Inspect workflow write-back permissions and required checks; propose safe governance separately |
| High | Reference data freshness changes over time | Add/verify visible as-of timestamps and stale/coverage diagnostics without fetching new data |
| Medium | Legacy PR #38 and #65 are stale relative to current app | Review and close/update only after confirming no unique work is lost |
| Medium | Player data has separate public/local/cloud paths | Audit source provenance, canonical IDs and user-facing empty/error states without changing cloud data |
| Medium | Probability metrics can be misread with small samples | Preserve sample-size caveats and distinguish accuracy from calibration/confidence |

## Next implementation sequence

1. Finish a read-only audit of data schemas, identity constraints, timestamps, workflow triggers and write permissions.
2. Add non-destructive diagnostics for data completeness/freshness where the current UI lacks them.
3. Review Club and International model separation and storage-key boundaries.
4. Review accuracy/calibration sample eligibility and ensure only immutable, valid pre-match snapshots are evaluated.
5. Open focused PRs with tests; do not merge or deploy without the established safety gates.

## Scope and limitations

This is a repository and workflow-level audit, not a live production-device test, legal review, or independent verification of all external provider records. Supabase data was not queried or modified. The scheduled sync workflows were not dispatched. No API quota was consumed.


## Phase 1 deep audit — implementation findings

### 6. Navigation consistency correction

A runtime inspection found that `js/international-handicap-workspace.js` appended a fifth button directly to the primary `.nav`, even though `js/primary-navigation.js` defines exactly four primary routes. This contradicted the four-item navigation requirement.

The Phase 1 branch moves the International Handicap entry into the existing **เครื่องมือเพิ่มเติม** secondary-tools group. The International page, data files, model, and Local Storage keys are unchanged. A regression assertion was added to `tests/test_primary_navigation.py`.

### 7. Football and player data readiness

- The published `data/player-database.json` currently has `records: []`, `generatedAt: null`, and source status `awaiting_api_key`. Therefore, the public repository snapshot does not demonstrate a populated player database.
- The repository has separate manual workflows for StrikerAPI player database updates and API Ninjas current-squad updates. The checked-in empty database metadata still identifies `API-Football`, which is inconsistent with those current importer paths and should be reconciled before treating player-source provenance as production-ready.
- No player sync was dispatched and no provider quota was consumed. Private/cloud player records were not queried, so this finding applies to the checked-in public JSON only.

### 8. Club and International isolation

Verified source-level boundaries:
- Club snapshots use `pft_handicap_snapshots_v1`; International uses `pft_international_handicap_snapshots_r1` and `pft_international_handicap_results_r1`.
- International workspace reads only `data/experimental/international-r1/`; the contract tests explicitly reject references to the Club snapshot key and club database.
- International Handicap is limited to the 10 UEFA Nations League fixtures; friendlies are excluded from the handicap workspace.
- The International reference workflow is `workflow_dispatch` only, requests one provider payload per run, and commits only `handicap-reference.json`. It has no schedule.
- The current international reference sample includes one fixture with only one bookmaker; its three-source readiness gate correctly withholds probabilities for that fixture. The remaining dataset is experimental and must retain its source and model limitations.

### 9. Accuracy and calibration audit

- 1X2 evaluation validates probability vectors, excludes snapshots created at/after kickoff, and evaluates against stored outcomes or finished match scores. Tests cover accuracy, multiclass Brier (0–2 scale), Log Loss, top-label ECE, pending/excluded counts, and empty datasets.
- The probability snapshot builder preserves existing snapshots, appends only future fixtures, and records outcomes without overwriting the original forecast or capture time. Integration tests cover history retention and fail-closed handling of corrupt/invalid history.
- Club Handicap history validates five mutually exclusive settlement outcomes, quarter-line splits, pre-kickoff capture, and finished-match score evaluation. Tests cover settlement and independent Brier/Log Loss summaries.
- International Handicap calculates per-snapshot Brier and Log Loss only when a user-entered result exists. Results are entered after the fixture and include a source text field, but are not independently fetched or verified by the app. This is an evidence/provenance limitation, not proof that the result is wrong.
- Current sample counts are small for experimental International evaluation. Do not interpret the displayed metrics as established model accuracy or calibration.

### 10. CI and merge gate

The audit documentation-only commit does not match the path filters in the existing validation workflows, so no CI run was created for the initial PR #97 commit. The Phase 1 navigation correction touches files covered by the existing application and UI/Handicap validation path filters; the updated PR must be evaluated on those checks before merge.

### 11. Scope boundary

This Phase 1 work is a source-code, repository-data, workflow, and test-contract audit. It does not prove live Supabase contents, private cloud player records, provider-side freshness at the current moment, or Android device behavior. No scheduled/manual workflow, provider API request, Supabase write, production deployment, or user-data mutation was performed.
