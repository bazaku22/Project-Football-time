# Football Time Statistics Import Foundation

**Status:** Phase B design + offline import preflight  
**Version:** 1.0  
**Scope:** Season 2026/27 only; no API calls; no database writes.

## Purpose

Define a provider-neutral CSV format and a local validation step so Football Time can collect data from sources only where storage/use rights have been checked. This is an import foundation, not an automatic scraper or a production database sync.

## Non-negotiable rules

- No paid services, billing, new providers, API requests, or quota use in this phase.
- Never scrape a website merely because its pages are publicly viewable.
- A source must have a documented permission/licence basis that allows the intended collection, storage, and app display.
- Preserve the original source record and provenance. Do not silently combine conflicting sources.
- Blank numeric cells mean unknown/not supplied. A literal `0` means the source explicitly reports zero.
- Do not infer missing values or convert blank values to zero.
- First-team and youth statistics are separate dimensions; never aggregate them together by default.
- Season totals, competition totals, and match-level statistics must not be mixed.

## CSV contract

The canonical template is `data/import-templates/player-statistics-template.csv`.

### Identity and scope columns

| Column | Required | Meaning |
|---|---:|---|
| `canonical_player_key` | Yes | Football Time internal player key, if already resolved. Leave blank only for an unresolved row that must be reviewed manually. |
| `provider` | Yes | Source/provider name, e.g. `manual`, `licensed_csv_vendor`. |
| `provider_player_id` | No | Player identifier in that source. |
| `player_name` | Yes | Name as represented by the source. Not sufficient alone to merge identities. |
| `team_code` | Yes | Football Time team code. |
| `season` | Yes | Season label, e.g. `2026/27`. |
| `competition_code` | Yes | Competition code; use a distinct code for youth competitions. |
| `squad_level` | Yes | `first_team`, `u21`, `u18`, or `other_youth`. |
| `statistics_scope` | Yes | `season`, `competition`, or `match`. |
| `match_id` | Match only | Stable Football Time match key, if known. |
| `stat_date` | Match only | Match date in ISO `YYYY-MM-DD`. |

### Provenance and rights columns

| Column | Required | Meaning |
|---|---:|---|
| `source_url` | No | Exact source page/file reference, where available. |
| `source_record_id` | No | Stable source record identifier. |
| `collected_at` | Yes | ISO 8601 timestamp with timezone. |
| `rights_status` | Yes | Must be `approved` before a row is eligible for a future production import. Use `manual_review` or `not_approved` to quarantine it. |
| `permission_reference` | Yes | Licence, terms clause, written permission reference, or internal approval note. Do not use a blank value. |
| `notes` | No | Context, source caveats, or manual review notes. |

### Statistic columns

Supported optional numeric fields:
- `appearances`, `starts`, `minutes`
- `goals`, `assists`
- `shots`, `shots_on_target`
- `xg`, `xa`
- `yellow_cards`, `red_cards`
- `saves`, `clean_sheets`

A blank cell means unknown. Values must be non-negative. `shots_on_target` must not exceed `shots` when both are supplied; `starts` must not exceed `appearances` when both are supplied.

## Validation and import lifecycle

1. Keep the original file unchanged as an immutable source artifact.
2. Run the local preflight validator.
3. Resolve all unresolved player identities against Football Time's canonical player IDs.
4. Review rights status and source permission evidence.
5. Resolve duplicate/conflicting records; never auto-pick a winner.
6. Produce a reviewed import manifest with file checksum, row counts, reviewer, and timestamp.
7. Only a later, separately reviewed implementation may write approved rows into Supabase.

The validator in `scripts/validate_player_stats_csv.py` is offline and read-only. It does not contact any network, call an API, modify the CSV, or connect to Supabase. Run it with `python scripts/validate_player_stats_csv.py path/to/file.csv`. A passing result is only a structural preflight; it does not independently prove that a source licence or permission is legally sufficient. A human must verify the permission reference before setting `rights_status=approved`.

## Duplicate key

The intended natural key is:

`canonical_player_key + season + competition_code + team_code + squad_level + statistics_scope + (match_id when scope=match)`

If the same key occurs more than once, validation fails and requires human reconciliation. Source-specific raw rows will be stored separately in the future schema so competing sources can coexist.

## Current limitations

- This phase does not resolve player IDs automatically.
- It does not certify legal rights; a human must verify and document the permission basis.
- It does not import or update production data.
- It does not schedule recurring work.
- Youth competition codes and team codes must be mapped to the Football Time catalogue before production use.

## Next implementation gate

After the CSV format and validator are reviewed, the next safe step is a non-destructive Supabase migration design for source records, canonical statistics, import batches, and change history, with RLS and rollback notes. No migration should be applied until the SQL and access model have been reviewed.
