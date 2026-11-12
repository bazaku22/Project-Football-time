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
