# Project Football Time — Phase 0 UX Feature Map

Date: 2026-11-11  
Status: Read-only audit artifact; no application implementation in this change  
Base: `main` at `f3583fdab72d999c4b88a2f949d34b782d80b573`  
Product direction: Simple but Complete

## 1. Audit scope and safety

This document records the current user-facing structure and maps existing features to the approved four-area information architecture. The audit inspected the current `index.html`, linked CSS and JavaScript modules, manifest, and service worker.

This phase does not change application HTML, CSS, JavaScript, data files, API workflows, secrets, Supabase configuration, service-worker behavior, or deployment settings. No Local Storage data was read from or modified on a user's device.

Preservation requirements:
- Keep `pft_matches_v1` and `pft_probability_predictions_v1` unchanged.
- Keep the existing player database and its current records; no bulk refresh or import.
- Preserve immutable pre-match snapshots, central records, and the legacy test history.
- Keep the current approved API cadence and zero-recurring-cost target.
- No direct changes to `main` or Production. All future implementation must use a feature branch, tests, PR review, and explicit user approval before merge.

## 2. Current navigation and page inventory

The current bottom navigation has five entries:
1. `home` — หน้าหลัก. Currently renders the dated test-fixture schedule from `data/test-fixtures-2026-11.json`, not the normal football database's full match center.
2. `fixtures` — ฐานข้อมูล. Hosts the league/team database workspace and ten sub-tabs.
3. `summary` — สรุปผล. Renders the experimental model summary via `#testExperimentSummary`; it is not yet the unified history of all match-analysis snapshots.
4. `analysis` — หลักการ. Contains explanatory methodology content.
5. `archive` — คลัง Legacy. Preserves the older #001–#011 test records, including local and central records and backup/restore controls.

The current HTML has five `.page` sections: `home`, `summary`, `fixtures`, `analysis`, and `archive`. Navigation uses `[data-page]` buttons and toggles `.page.active`.

### 2.1 Existing database sub-tabs

The `fixtures` page currently has ten `[data-db-tab]` panels:

| Tab key | Current label | Existing responsibility |
|---|---|---|
| `overview` | ภาพรวมลีก | League selector/cards, standings, team list, match list and database status |
| `form` | ฟอร์มทีม | Recent completed-match form |
| `profile` | โปรไฟล์ทีม | Team profile and summary statistics |
| `homeaway` | เหย้า/เยือน | Home and away performance comparison |
| `h2h` | พบกัน | Head-to-head history |
| `league` | สถิติลีก | League-level statistics |
| `probability` | ความน่าจะเป็น | Match probability analysis and reference handicap display |
| `accuracy` | ความแม่นยำ | Prediction evaluation and calibration |
| `advanced` | วิเคราะห์เชิงลึก | Team strength, attack/defence, readiness and data-quality explanations |
| `players` | ฐานข้อมูลนักเตะ | Player reference data, cloud access, import preview and export |

The page contains 112 identified element IDs. Several are data/render targets and workflow controls, not independent screens. Do not rename or remove IDs as a visual cleanup shortcut.

## 3. Current supporting modules and responsibilities

| File | Observed responsibility | UX treatment |
|---|---|---|
| `js/probability-metrics.js` | Probability validation, outcome matching and evaluation metrics | Keep calculation layer; present simple accuracy first and technical metrics second |
| `js/test-experiment.js` | Test snapshots, model forecast panels and experimental summary | Keep clearly separated from ordinary match history |
| `js/asian-handicap.js` | Handicap probability calculation helpers | Keep as supporting statistical calculation, not a betting workflow |
| `js/test-experiment-enhancements.js` | Experimental model/handicap analysis, reference-data loading and model breakdown | Secondary/technical view; preserve existing API limits |
| `js/player-database.js` | Local/central player record merge, render, import/export and event handling | Secondary player reference area |
| `js/football-discovery.js` | Search index for leagues, teams, matches and local players; favorites; date-filtered fixtures; navigation into pages/tabs | Reuse as a shared discovery/search capability; avoid duplicating it |
| `js/player-stats-import.js` | CSV parsing, validation, preview and downloadable outputs | Keep in player maintenance tools; do not auto-import |
| `js/player-cloud.js` | Supabase player auth, private data loading, preview/save and refresh/sign-out actions | Keep isolated in player maintenance; do not broaden scope |

The inline application script in `index.html` also owns the primary navigation, database tab switching, football database loading, team statistics rendering, probability rendering, legacy record management, and service-worker registration. Any later refactor must account for this coupling rather than replacing the page wholesale.

## 4. Current data and interaction boundaries

### 4.1 Distinct data domains

- Football database: loaded from `data/football-database.json` and used for leagues, teams, standings, matches and statistics. The loader validates expected top-level arrays and dispatches `pft-football-database-ready`.
- Test fixtures: loaded separately from `data/test-fixtures-2026-11.json`; currently displayed on the home page. These are experiment fixtures and must not silently become the real Match Center source.
- Legacy/local test records: `pft_matches_v1`; local records and central test records are merged by ID for display. Existing backup/restore includes the probability-prediction array.
- Probability snapshots: `pft_probability_predictions_v1`; the evaluation layer joins snapshots to finished football database matches by provider match ID.
- Player records: local player key `pft_players_v1`, plus private cloud data delivered through custom events. Keep player data separate from team/match history.

### 4.2 Important existing interactions

- Main page navigation is event-bound to `[data-page]`.
- Database tabs are event-bound to `[data-db-tab]`; panels use IDs `dbtab-<tab-key>`.
- League selection rerenders several dependent statistics and analysis views.
- Team pickers enhance native select controls; preserve their native value/change behavior.
- Football discovery search/favorites/date filtering opens existing pages and database tabs. Reuse these entry points when consolidating navigation.
- Player cloud preview has explicit save and cancel controls. Preserve preview-before-save behavior.
- Legacy import explicitly confirms replacement of local records and probability predictions. Do not surface this destructive action as an everyday shortcut.
- Service worker is registered from `sw.js`; any future asset/CSS/JS changes must consider cache versioning and offline behavior.

## 5. Approved target information architecture

The approved four primary areas are:

### A. หน้าหลัก — Match Center

Purpose: the everyday entry point for real football fixtures.

Proposed content:
- Today/upcoming/live/completed match groups, sourced from the existing football database.
- Five core league filters: PL, PD, BL1, SA and FL1.
- Search and favorites, reusing Football Discovery where practical.
- Match cards with kickoff in Thailand time, competition, status and score when available.
- Clear unavailable/stale-data states; never substitute test fixtures or invented data.

The current test-fixture schedule must remain a distinct experiment destination, not be presented as ordinary league fixtures.

### B. ลีกและทีม

Purpose: browse competition and team context.

Proposed content:
- League selector and standings.
- Team profile and recent form.
- Home/away comparison.
- Head-to-head history.
- League statistics.

Use a compact secondary selector or contextual tabs within this area. Avoid exposing ten technical tabs in the main navigation.

### C. วิเคราะห์

Purpose: inspect one selected match and understand the model output.

Proposed content:
- Match header and data timestamp/readiness.
- 1X2 probabilities with clear labels.
- Probability kept distinct from confidence/data readiness.
- Main plain-language contributing factors and supporting team statistics.
- Advanced analysis, model diagnostics and reference handicap context collapsed or secondary.
- Explicit limitations and missing-data notes.

Do not change model coefficients or historical predictions as part of a UI redesign.

### D. ประวัติ

Purpose: review saved analysis and actual outcomes.

Proposed content:
- Saved pre-match probability snapshots and their immutable timestamps.
- Match actual results once completed.
- Evaluated, correct, incorrect and pending counts with an explicit denominator.
- Simple overall accuracy first; league/model breakdown, Brier, log loss and ECE in a secondary technical view.
- Preserve distinct legacy result types and experimental test summaries; do not combine incompatible populations.

## 6. Secondary destinations and controls

Keep these accessible but outside the four primary navigation items:
- Player database and cloud maintenance.
- Model calibration and technical diagnostics.
- Experimental fixture list and experiment summary.
- Legacy archive and its historical record workflow.
- Backup/restore.
- Experimental tools and import previews.

These are not candidates for deletion merely because they move out of the primary navigation.

## 7. Visual design implementation direction

Use one shared design-token layer and one consistent component language. Retain the current dark navy/blue identity with teal as the primary accent, readable neutral text, and semantic status colors.

Recommended token groups:
- Surfaces: app background, elevated panel, nested panel, border.
- Text: primary, secondary, muted, inverse.
- Accent: primary teal, secondary blue.
- Status: success, warning, error, informational.
- Shape/spacing: consistent radius, spacing scale, control height and card padding.
- Motion: restrained transitions with `prefers-reduced-motion` support.

Dark theme is the first implementation target. Keep token naming compatible with a future light theme, but do not add a theme switch until there is a clear user benefit and a complete contrast-tested palette.

Responsive requirements:
- Android portrait is the primary acceptance target.
- Four-item bottom navigation must fit narrow screens without horizontal overflow.
- Controls should have comfortable touch targets.
- Wide tables may scroll horizontally within their own container.
- Sticky headers/sub-navigation must not overlap content or consume excessive vertical space.
- Preserve safe-area padding and offline behavior.

Accessibility requirements:
- Visible keyboard focus.
- Semantic button labels and expanded/pressed states.
- Sufficient contrast for text and status colors.
- Do not communicate state using color alone.
- Reduced-motion support.

## 8. CSS findings and refactor risks

The HTML currently links these stylesheets in order:
1. `css/ui-refresh.css?v=1`
2. `css/football-discovery.css?v=1`
3. `css/ui-refresh-v2.css?v=1`

The HTML also contains a large inline base style block. The two UI refresh files both override many shared selectors (root tokens, body, header, cards, controls, navigation, database sub-navigation, responsive breakpoints and motion preferences). The database sub-navigation sticky offset is defined differently across layers, making cascade order significant.

Recommendation:
- Do not delete either refresh stylesheet immediately.
- First record computed/required behavior and identify selectors actually used.
- Consolidate incrementally into a single token/component layer only after visual regression checks.
- Keep Football Discovery-specific selectors separate until their interactions and responsive states are verified.
- Update service-worker asset cache version only when the final asset changes are ready and tested.

## 9. Version and consistency note

The HTML document title currently says `Project Football Time V5.7.1`, while the visible app badge was observed as `V6.0.0-beta.1` during the prior audit. Treat this as a documentation/UI consistency issue to verify before changing; do not arbitrarily rename the app or claim a release version.

## 10. Implementation sequence and acceptance gates

1. **Phase 0 — Feature map and dependency baseline:** this document; complete before UI code changes.
2. **Screen map sign-off:** finalize exact screen hierarchy and entry/return paths.
3. **Phase 1 — Design system:** shared tokens and reusable visual primitives, visual-only where possible.
4. **Phase 2 — Match Center and navigation:** separate real fixtures from experimental fixtures.
5. **Phase 3 — League/team workspace:** reorganize existing statistics without changing calculations.
6. **Phase 4 — Analysis/history:** clarify probability, reasons, snapshots and actual results without changing historical records.
7. **Phase 5 — Responsive/accessibility/regression:** Android device testing and cache/offline validation.

For each implementation phase:
- Use a dedicated feature branch from current `main`.
- Keep the diff small and reviewable.
- Run syntax checks and focused regression tests for touched behavior.
- Verify storage keys and serialized record shapes are unchanged.
- Verify existing search, favorites, league selection, team pickers, import/export and player cloud preview flows as applicable.
- Open a PR with changed-file scope, tests, risks and screenshots where available.
- Do not merge or deploy until the user explicitly approves the PR.

## 11. Explicit non-goals

- No new data provider or API polling.
- No paid API, billing, subscription or recurring cost.
- No production schema or Supabase security changes.
- No new player-stat ingestion or bulk StrikerAPI refresh.
- No betting placement, deposits, withdrawals, payouts, bookmaker links or promotional gambling UI.
- No model retraining or coefficient tuning.
- No deletion of old screens/data until a verified replacement exists and the user explicitly approves the scope.
