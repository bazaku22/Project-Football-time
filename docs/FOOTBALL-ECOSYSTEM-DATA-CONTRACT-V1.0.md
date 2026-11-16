# Football Ecosystem — Shared Data Contract v1.0

**Status:** Draft for review; architecture decisions approved, implementation not yet enabled  
**Contract ID:** FEC-SDC-1.0  
**Scope:** Phase 1 — Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1)  
**Primary season:** 2026-2027  
**Last updated:** 2026-11-16

> This document defines the shared data boundary between Project Football Time (FT) and Football rich. It is a specification, not a production migration. Existing application behavior remains unchanged until a separate implementation PR is reviewed and approved.

## 1. Approved architecture decisions

1. **Football Time is the single source of truth** for factual football data: leagues, seasons, clubs, players, fixtures, actual match results, and factual statistics.
2. **Football rich is the analysis client.** It owns analyses, 1X2/AH probabilities, risk assessments, prediction history, and model-performance evaluation.
3. Football rich must not independently create, correct, or maintain official match results. It may store an imported, read-only result snapshot and an audit trail for evaluation.
4. Football rich must not call external football-data, odds-data, or AI APIs. It receives football data from FT through user-controlled JSON export/import.
5. External data APIs, if used, are confined to FT. No new provider, paid plan, subscription, or cost is permitted without the user's explicit approval. Existing provider access and licensing/cost status must be verified before use.
6. Phase 1 data exchange is limited to PL, PD, BL1, SA, and FL1. Other leagues remain preserved but outside this migration.
7. Existing records, IDs, predictions, analyses, and history must be preserved. No clearing browser storage, IndexedDB, app cache, or production data as a migration shortcut.

## 2. Ownership matrix

| Domain | Owner | Football rich behavior |
|---|---|---|
| League and season catalogue | FT | Read/import |
| Club identity and season membership | FT | Read/import |
| Player identity and club membership | FT | Read/import |
| Fixtures and kickoff/status facts | FT | Read/import |
| Actual scores and match events | FT | Import only; read-only |
| Team/player factual statistics | FT | Read/import |
| Source provenance and data freshness | FT | Preserve and display where useful |
| Pre-match research and analysis | Football rich | Own |
| 1X2/AH probabilities and risk | Football rich | Own |
| Prediction history | Football rich | Own, immutable after creation except audit annotations |
| Model evaluation/performance | Football rich | Own, recompute from FT result revisions |
| Official result corrections | FT only | Never author; consume revision |

## 3. Phase 1 catalogue

| League ID | Competition | Country |
|---|---|---|
| PL | Premier League | England |
| PD | La Liga | Spain |
| BL1 | Bundesliga | Germany |
| SA | Serie A | Italy |
| FL1 | Ligue 1 | France |

Use the existing FT league IDs. Do not create aliases or rename IDs during migration. Season IDs use the normalized format `YYYY-YYYY`, e.g. `2026-2027`. The display label may be localized independently.

## 4. Identity rules

### 4.1 Shared Match ID

For matches with a stable football-data.org provider match ID, FT creates and persists:

```text
FT-M-FOOTBALLDATA-{providerMatchId}
```

Example: `FT-M-FOOTBALLDATA-560643`.

Rules:
- The ID is generated once by FT and remains stable across exports, corrections, and seasons.
- Do not regenerate an ID from team names, kickoff time, or current competition labels.
- Do not assume a provider ID is interchangeable with the shared ID; keep both fields.
- If a match has no stable provider ID, FT must assign and persist an immutable local ID such as `FT-M-LOCAL-{uuid}` before export. Never generate a new value on every export.
- If a match cannot be confidently reconciled to an existing record, flag it for manual review. Never fuzzy-match and silently merge.

### 4.2 Existing IDs

- Preserve FT's current league IDs and team IDs, including existing provider-qualified IDs such as `football-data:65`.
- Preserve Football rich's existing local UUID as `legacy_rich_match_id` / an identity-map entry. Do not replace it in-place.
- Maintain an explicit mapping table: `match_id` ↔ `legacy_rich_match_id` ↔ provider identity.
- Preserve existing player IDs. Name-only player matching is not sufficient to merge identities automatically.
- If any legacy ID must eventually change, retain a permanent old-to-new mapping and audit record.

### 4.3 Required match identity fields

- `match_id`: shared immutable ID
- `provider`: provider key, e.g. `football-data`
- `provider_match_id`: original provider ID as a string
- `league_id`, `season_id`
- `home_team_id`, `away_team_id`
- `kickoff_at`: ISO-8601 timestamp with timezone
- `home_team_name`, `away_team_name`: historical display snapshots

## 5. JSON exchange envelope

All FT-to-rich files use UTF-8 JSON and this envelope:

```json
{
  "schema_version": "1.0.0",
  "export_id": "FT-EXPORT-2026-000001",
  "exported_by": "football-time",
  "exported_at": "2026-11-16T16:00:00+07:00",
  "data_type": "fixtures",
  "scope": {
    "league_ids": ["PL", "PD", "BL1", "SA", "FL1"],
    "season_ids": ["2026-2027"]
  },
  "records": []
}
```

Allowed `data_type` values:
- `fixtures`
- `clubs`
- `team_statistics`
- `players`
- `player_statistics`
- `match_results`
- `legacy_match_result_snapshots` (separate, explicitly unverified historical snapshots; never a revision chain)

The `export_id` is unique per generated file. Re-exporting the same records creates a new export ID but does not change their entity IDs or result revisions. Timestamps must include an explicit timezone. Unknown optional values are omitted or represented as `null` according to the record schema; missing is never interpreted as zero.

## 6. Fixture record

```json
{
  "match_id": "FT-M-FOOTBALLDATA-560643",
  "provider": "football-data",
  "provider_match_id": "560643",
  "league_id": "PL",
  "season_id": "2026-2027",
  "home_team_id": "football-data:65",
  "away_team_id": "football-data:63",
  "home_team_name": "Manchester City FC",
  "away_team_name": "Fulham FC",
  "kickoff_at": "2026-11-20T20:00:00+07:00",
  "status": "SCHEDULED",
  "source": {
    "provider": "football-data.org",
    "retrieved_at": "2026-11-16T15:45:00+07:00"
  },
  "record_updated_at": "2026-11-16T15:45:00+07:00"
}
```

The example is illustrative. Real names, IDs, dates, status, and source timestamps must come from verified FT records. A team rename must not rewrite historical match-name snapshots.

## 7. Actual result record and revisions

```json
{
  "match_id": "FT-M-FOOTBALLDATA-560643",
  "league_id": "PL",
  "season_id": "2026-2027",
  "home_score": 2,
  "away_score": 1,
  "status": "FINISHED",
  "result_revision": 1,
  "updated_at": "2026-11-20T22:05:00+07:00",
  "correction_reason": "Initial verified result.",
  "source": {
    "provider": "football-data.org",
    "verified_at": "2026-11-20T22:05:00+07:00"
  },
  "revision_history": [
    {
      "result_revision": 1,
      "home_score": 2,
      "away_score": 1,
      "status": "FINISHED",
      "change_type": "baseline",
      "reason": "Initial verified result.",
      "recorded_at": "2026-11-20T22:05:00+07:00",
      "source": {
        "provider": "football-data.org",
        "verified_at": "2026-11-20T22:05:00+07:00"
      }
    }
  ]
}
```

Rules:
- Only FT can create or correct an official result.
- Revision starts at 1 and increases monotonically for each accepted correction to that match.
- Each revision records the prior value, new value, source, timestamp, and correction reason where available.
- Do not change a result revision merely because the same unchanged result is exported again.
- Goal/card events are optional and only included when verified. Incomplete events must be marked as partial or omitted; never invent scorers or assists.
- Football rich imports revisions for evaluation. It must retain its prior imported revision and settlement audit trail.
- A changed result causes affected evaluation records to be recalculated or marked pending recalculation; it must not rewrite the original prediction or forecast probabilities.


## 7A. Legacy result snapshots (non-revision evidence)

Legacy FT results that predate trusted Result Revision History use a separate envelope type: `legacy_match_result_snapshots`. Each record must be marked `legacy_database_snapshot`, `not_independently_verified`, and `revision_history_available: false`. The database generation timestamp is only the observation time of the source file, not a match-result verification timestamp. No revision number, result update time, correction reason, or revision history may be synthesized for this data type.

Football rich must store these records separately from verified result snapshots and must not overwrite `match_results`, predictions, analyses, or performance records. Any retrospective use must be labelled as legacy/unverified and excluded from verified-result metrics unless the user explicitly selects a separate legacy analysis view.

## 8. Statistics and player data

Every statistics record must reference stable IDs and include:
- `league_id` and `season_id`
- `team_id` or `player_id`
- measurement period / competition context
- source/provider and retrieval timestamp
- record update timestamp
- coverage/completeness indicator when known

Rules:
- Zero and unavailable are different. Use numeric zero only when the source confirms zero.
- Do not import research-only or rights-unverified player lists as authoritative player records.
- Do not merge players based only on matching names.
- Keep national-team statistics out of the Phase 1 club-league scope unless separately approved.
- Player statistics remain subject to source licensing and coverage review.

## 9. Import validation and conflict handling

Football rich must validate the complete file before writing:
1. Supported schema version and data type.
2. Valid envelope, timestamps, and required fields.
3. Supported Phase 1 league and season scope.
4. Unique `export_id` and no duplicate record IDs within the file.
5. Known `match_id`, `team_id`, `league_id`, and `season_id` references.
6. Home/away identity agrees with the linked fixture.
7. Result revision is newer than the locally imported revision, or is an identical replay.
8. Source provenance is present for factual records.

Import outcomes:
- **Accepted:** valid new or newer records.
- **Accepted with warnings:** safe records imported while explicitly identified optional data is missing.
- **Rejected:** invalid identity, conflicting equal revision, unknown mapping, or unsafe overwrite.

Idempotency:
- Re-importing the same `export_id` is a no-op with a clear duplicate notice.
- Re-importing an identical entity/revision from a different export is also a no-op.
- Older revisions must never overwrite newer revisions.
- Equal revision with different factual content is a conflict and must be rejected for review.
- Never silently overwrite a conflict or discard a record.

## 10. Football rich legacy compatibility

The existing Football rich stores and import tools are not deleted by this contract.

During implementation:
- Keep existing local match UUIDs and link them to the shared `match_id`.
- Reconcile legacy result records with FT results before changing the result workflow.
- Convert the current result importer into an FT-origin-only import path only after a tested migration exists.
- Disable rich-side official result authoring for Phase 1 only after the new importer and rollback path pass tests.
- Existing prediction, analysis, research, evidence, and performance history must remain intact.
- Existing combined fixture/analysis import must not create a second fixture when an FT fixture with the shared ID exists. For Phase 1, analysis must attach to the FT-origin fixture; unresolved matches go to review rather than creating duplicates.

## 11. API and network policy

**Football Time**
- May use already approved data providers for collection, subject to the user's 0-THB target, provider limits, licensing, and explicit approval.
- No new API/provider or paid plan without explicit approval.
- Keep secrets out of client-side files and exported JSON.

**Football rich**
- No external football-data API.
- No external odds API.
- No AI API.
- No automatic web scraping or external football-data enrichment.
- Uses local analysis code and FT-imported data. Any required logos/assets should be bundled locally or supplied in the FT export; no hidden external data fetch.

GitHub Pages may still require internet to load/update the hosted app; this is distinct from the analysis engine calling an external API.

## 12. Migration and release gates

No production migration is authorized by this specification alone. Implementation must proceed through reviewed feature branches and pull requests.

Required sequence:
1. Backup current FT JSON/local data and document current storage keys.
2. Backup/export Football rich IndexedDB stores, including matches, predictions, results, analyses, and performance history.
3. Build and validate the shared ID mapping without changing production records.
4. Add FT export generation and result revision/audit support.
5. Add rich import preview, validation, conflict reporting, and rollback-safe writes.
6. Reconcile existing rich fixtures/results before enabling read-only result sync.
7. Test duplicates, corrections, stale revisions, unknown IDs, partial statistics, and failed imports.
8. Verify the five-league scope and confirm no external football/AI API requests from rich.
9. Obtain user approval before merging implementation PRs or enabling migration in the live app.

**Never clear app data/cache as a migration step. Never delete legacy structures until their data has been migrated, verified, and explicitly approved for removal.**

## 13. Acceptance checklist

- [ ] All five Phase 1 leagues use existing league IDs.
- [ ] FT exports stable shared Match IDs.
- [ ] Rich retains and maps every existing local UUID.
- [ ] Fixture import is idempotent and does not create duplicate matches.
- [ ] FT is the only official result writer.
- [ ] Rich accepts only FT-origin result revisions for Phase 1.
- [ ] Older or conflicting result revisions cannot silently overwrite newer data.
- [ ] Prediction and analysis history survives result corrections.
- [ ] Statistics preserve provenance and distinguish zero from unavailable.
- [ ] Rich makes no football-data, odds-data, or AI API calls.
- [ ] Migration backup and rollback are tested.
- [ ] No new costs or paid providers are introduced.

---
This contract is mirrored in both repositories. Any future change must update both copies in the same reviewed change set.
