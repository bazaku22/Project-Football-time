# Football Ecosystem Import Test Cases v1.0

These are implementation acceptance cases. They are not a claim that either app's runtime importer has already passed them.

| ID | Input condition | Expected behavior |
|---|---|---|
| IMP-01 | Valid Phase 1 fixture, new shared ID | Accept once and create one linked match |
| IMP-02 | Same export ID imported twice | Second import is a no-op with duplicate notice |
| IMP-03 | Same fixture in a different export | No duplicate match; update only permitted newer factual fields |
| IMP-04 | Existing rich UUID maps to shared ID | Preserve UUID and create identity-map link |
| IMP-05 | Shared ID has unknown team or league reference | Reject that record for review |
| IMP-06 | Same shared ID appears twice in one file | Reject duplicate records before writing |
| IMP-07 | Result revision 1 imported, then revision 2 | Accept revision 2 and retain revision 1 audit |
| IMP-08 | Revision 1 re-imported after revision 2 | Ignore stale revision; do not roll back |
| IMP-09 | Same revision number but different score | Reject as conflict; require FT correction with higher revision |
| IMP-10 | Result has negative/non-integer score | Reject invalid record |
| IMP-11 | Statistics value is null | Preserve as unavailable; do not coerce to zero |
| IMP-12 | Statistics value is numeric zero | Preserve as confirmed zero |
| IMP-13 | Player name matches but player ID differs/unknown | Do not merge; send to identity review |
| IMP-14 | Unsupported league outside Phase 1 | Preserve source file; do not import into Phase 1 |
| IMP-15 | Missing timezone in timestamp | Reject or quarantine; never guess local timezone |
| IMP-16 | Import validation fails midway | No partial unsafe write; rollback transaction |
| IMP-17 | FT corrects a result | Rich updates evaluation from newer revision; prediction snapshot remains unchanged |
| IMP-18 | Result record lacks FT provenance | Reject as non-authoritative |
| IMP-19 | Rich attempts to author official result | Block in Phase 1 after read-only sync is safely enabled |
| IMP-20 | Network request from rich to football/odds/AI API | Test must fail; rich analysis should operate on imported/local data |

## Release gates

- Validate JSON Schema and timestamp formats.
- Test the cases above against a disposable copy of the app database.
- Export and verify backups before migration.
- Verify no app cache/storage clearing is required.
- Do not disable legacy result entry until all existing results have been reconciled and rollback is proven.
- Do not merge implementation or change production data without explicit approval.
