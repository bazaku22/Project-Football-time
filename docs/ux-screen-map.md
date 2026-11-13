# Project Football Time — UX Screen Map

Date: 2026-11-11  
Status: Proposed screen hierarchy based on the approved Simple but Complete direction  
Related audit: `docs/phase-0-ux-feature-map.md`

## 1. Navigation model

The target experience has four primary destinations:

1. **หน้าหลัก — Match Center**
2. **ลีกและทีม**
3. **วิเคราะห์**
4. **ประวัติ**

The four destinations replace the current five-item bottom navigation only after the new destinations have working, verified entry paths. The current five-page structure remains intact until then.

Global discovery (search and favorites) should remain accessible from the Match Center and may open a league, team, or match in its relevant destination. Avoid creating a second search index.

## 2. Primary screen map

### 2.1 หน้าหลัก — Match Center

**Purpose:** Find a real match quickly and open its context.

**Screen sections**
- Header: app identity, data freshness/status.
- Search: existing Football Discovery search.
- Quick filters: Today, Upcoming, Live, Finished; league filter for PL, PD, BL1, SA, FL1.
- Favorites: existing saved league/team/match favorites.
- Match list: date-grouped match cards with competition, teams/crests, Thailand kickoff time, status and score when known.
- Empty/stale/error state: clearly state no matches or unavailable/outdated source data; never fabricate fixtures.

**Match card action**
- Select match → open the selected match in **วิเคราะห์**.
- Selecting a team name/crest → open that team in **ลีกและทีม**.
- Selecting a competition → open that league in **ลีกและทีม**.

**Data boundary**
- The current `home` page uses `data/test-fixtures-2026-11.json`. It is an experiment fixture list, not the production Match Center source.
- The actual Match Center must use the existing football database and must not silently fall back to experiment fixtures.
- Keep experiment fixtures reachable only through the secondary Experimental area until a deliberate replacement is implemented.

### 2.2 ลีกและทีม

**Purpose:** Explore league context and team performance without exposing a long technical tab strip.

**Default view — League overview**
- League selector/cards.
- Season and data freshness.
- Standings table.
- Teams list.
- Competition fixtures/results list.

**Contextual views**
- Team profile: season overview and key statistics.
- Recent form: last 5 or 10 completed matches.
- Home/away: separate home and away performance.
- Head-to-head: selected pair and actual historical meetings.
- League statistics: goals and result trends.

**Navigation**
- League selection updates the overview and contextual views.
- Team selection opens the team profile, retaining the selected league/season where valid.
- Match selection from a league/team view opens that match in **วิเคราะห์**.
- Back/return should restore the previous league/team selection and scroll context where practical; do not rely on browser history alone for in-app tab state.

**Existing feature mapping**
- `overview` → League overview.
- `profile` → Team profile.
- `form` → Recent form.
- `homeaway` → Home/away.
- `h2h` → Head-to-head.
- `league` → League statistics.

### 2.3 วิเคราะห์

**Purpose:** Explain one selected match and its model output.

**Screen sections**
1. Match header: competition, teams, kickoff/status and source freshness.
2. Data readiness: available/missing inputs and limitations.
3. Main 1X2 output: home/draw/away probabilities.
4. Confidence/readiness: presented separately from probability.
5. Main reasons: concise plain-language factors, supported by available statistics.
6. Supporting comparison: form, home/away, goals, league position/points per match, H2H when sample is meaningful.
7. Save/snapshot state: indicate whether a pre-match prediction snapshot has been saved; never edit an existing snapshot retroactively.
8. Advanced details: collapsible technical diagnostics and reference handicap statistical context.

**Navigation**
- Match Center, League & Team, or History may open a selected match here.
- Returning should take the user back to the originating list when practical.
- A match that has started/finished must not be presented as eligible for a new pre-match snapshot.
- If required data is unavailable, show a limitation rather than inventing a probability or reason.

**Existing feature mapping**
- `probability` → primary match analysis.
- `advanced` → secondary technical details.
- `analysis` explanatory methodology → secondary “How analysis works” help page, not a primary destination.

### 2.4 ประวัติ

**Purpose:** Review saved analysis snapshots and outcomes, with populations kept distinct.

**Default view**
- Summary counts: evaluated, correct, incorrect, pending.
- Accuracy with explicit numerator/denominator and only eligible evaluated predictions.
- Filters: period, league, outcome status, model where available.
- Saved prediction list: match, saved timestamp, original probability, actual result and evaluation state.

**History detail**
- Immutable original snapshot.
- Actual match result once available.
- Evaluation explanation and data eligibility.
- No retroactive rewrite of prediction values.

**Secondary technical view**
- Calibration, Brier score, log loss and ECE.
- Show sample size and limitations alongside every metric.

**Separate collections**
- Main saved probability snapshots (`pft_probability_predictions_v1`).
- Experimental model summary (`testExperimentSummary`).
- Legacy #001–#011 records (`pft_matches_v1`).
- Do not merge these into one accuracy denominator unless a future, explicitly reviewed data contract proves their populations and metrics are comparable.

## 3. Secondary destinations

These are reachable from a restrained “เครื่องมือเพิ่มเติม” / settings entry, not from the four-item primary navigation:

| Destination | Contents | Guardrail |
|---|---|---|
| Player database | Player search, league/team filters, reference records | Keep separate from match history; no bulk provider refresh |
| Player data maintenance | Cloud sign-in, refresh, preview/save/cancel, CSV preview and export | Preserve preview-before-save and explicit confirmation |
| Technical calibration | Calibration curve and advanced evaluation metrics | Secondary to plain-language accuracy; show sample size |
| Experimental tools | Experiment fixtures, experiment model summary, pilots | Clearly label experimental; never mix with real fixtures |
| Legacy archive | Historical #001–#011 records and their existing summaries | Preserve data and current keys; do not silently migrate |
| Backup / Restore | Existing JSON backup/export and legacy import where applicable | Destructive replacement stays secondary and explicitly confirmed |
| How analysis works | Model principles, limitations and snapshot policy | Explanatory content, not a competing analysis screen |

## 4. Shared navigation and return behavior

- Bottom navigation contains exactly four primary destinations.
- Search is global and reuses Football Discovery.
- A match opened from any list carries its match identity into Analyze.
- A team opened from a match carries team identity into League & Team.
- Use a clear back/return action for contextual navigation; preserve the source list/filter/selection when feasible.
- Secondary destinations should provide an obvious return to the prior primary destination.
- Avoid nesting more than two levels for ordinary daily tasks.
- Keep technical and destructive controls out of the everyday match-card flow.

## 5. Component hierarchy

```text
App shell
├── Header
│   ├── Brand / version
│   └── Data status
├── Main content
│   ├── Match Center
│   │   ├── Global search
│   │   ├── Date/status/league filters
│   │   ├── Favorites
│   │   └── Match cards
│   ├── League & Team
│   │   ├── League overview
│   │   ├── Standings / teams
│   │   └── Team contextual views
│   ├── Analyze
│   │   ├── Match header / readiness
│   │   ├── 1X2 probabilities / confidence
│   │   ├── Reasons / supporting stats
│   │   └── Advanced details
│   ├── History
│   │   ├── Accuracy summary
│   │   ├── Saved snapshots
│   │   └── Technical evaluation
│   └── Secondary tools
│       ├── Players
│       ├── Calibration
│       ├── Experiments
│       ├── Legacy
│       └── Backup / Restore
└── Four-item bottom navigation
```

## 6. Current-to-target migration map

| Current page/tab | Target destination | Migration treatment |
|---|---|---|
| `home` test fixtures | Experimental tools | Move out of Match Center; keep experiment data clearly labeled |
| `fixtures/overview` | League & Team | Becomes league default view |
| `fixtures/form` | League & Team → Recent form | Contextual team view |
| `fixtures/profile` | League & Team → Team profile | Contextual team view |
| `fixtures/homeaway` | League & Team → Home/away | Contextual team view |
| `fixtures/h2h` | League & Team → Head-to-head | Contextual team-pair view |
| `fixtures/league` | League & Team → League statistics | Contextual league view |
| `fixtures/probability` | Analyze | Match-centric analysis |
| `fixtures/advanced` | Analyze → Advanced details | Collapsed/secondary |
| `fixtures/accuracy` | History → Technical evaluation | Secondary technical view |
| `fixtures/players` | Secondary tools → Players | Separate maintenance destination |
| `summary` experiment model summary | Experimental tools | Keep separate from general saved analysis history |
| `analysis` methodology | Secondary tools → How analysis works | Contextual help |
| `archive` | Secondary tools → Legacy archive | Preserve as-is until replacement is verified |

## 7. Implementation order and gates

1. Build the shared visual foundation without changing page IDs, event contracts, data shapes or storage keys.
2. Introduce the four-item navigation shell and screen-state routing on a feature branch; keep legacy destinations reachable.
3. Build the real Match Center from the existing football database; test no-data, stale-data and offline states.
4. Rehouse league/team views without changing calculations.
5. Connect selected-match analysis and immutable snapshot/history views without rewriting past records.
6. Move experiment, player, calibration and legacy tools into secondary destinations.
7. Run regression tests for search, favorites, date filters, league/team selectors, match selection, snapshots, player preview/save/cancel, backup/restore and offline cache.
8. Complete Android portrait testing before release.

## 8. Explicit non-goals

- No new API provider, polling schedule, paid plan or billing.
- No changes to model coefficients or probability history.
- No Local Storage key rename, reset, destructive migration or record replacement.
- No player-stat ingestion, bulk StrikerAPI refresh or automatic cloud save.
- No Supabase production schema/auth changes.
- No betting placement, deposits, withdrawals, payouts, bookmaker links or gambling promotion.
- No merge to `main` or Production deployment without explicit user approval.
