# Football Time Ecosystem Export Center v1 — Implementation Notes

**Status:** Draft implementation for review; not merged or deployed to the user's device.

## Included in this change

- Adds a secondary Tools entry: **ส่งออกข้อมูลไป Football rich**.
- Adds a fixture-only export for PL, PD, BL1, SA, and FL1.
- Defaults to season `2026-2027`.
- Uses the FT-owned shared ID `FT-M-FOOTBALLDATA-{providerMatchId}`.
- Preserves the existing FT provider match ID and team IDs in each record.
- Emits the v1.0.0 exchange envelope with `data_type: "fixtures"`.
- Skips fixtures without a provider match ID, duplicate provider match IDs, invalid kickoff timestamps, invalid team references, or unsupported statuses. The UI reports skipped counts after export.
- Does not write to Local Storage, IndexedDB, Supabase, or the source football database.

## Deliberate limitation: actual results

Result export is not enabled in this phase. The current database snapshot does not yet provide verified per-match result revision and correction-audit metadata. Exporting finished scores with a guessed revision or timestamp would violate the approved single-source-of-truth contract. Result export will be enabled only after FT has a persistent revision/audit mechanism and the rich importer can consume revisions idempotently.

## Service worker safety

- Cache version advances to `football-time-v101` to install the new exporter asset and updated app shell.
- Previous service-worker caches are retained during this staged rollout; this change does not clear Local Storage, IndexedDB, or prior Cache Storage entries.
- Normal app requests are read from the current cache namespace first.

## Manual acceptance checklist

1. Open the Tools section and select **ส่งออกข้อมูลไป Football rich**.
2. Confirm the page waits for the main football database and becomes ready after it loads.
3. Leave all five leagues selected and season `2026-2027`; confirm the displayed fixture count is consistent with the source database.
4. Export fixtures and inspect the JSON envelope:
   - `schema_version` is `1.0.0`.
   - `exported_by` is `football-time`.
   - `data_type` is `fixtures`.
   - Scope contains only selected league IDs and the selected season.
   - Every record has a stable `FT-M-FOOTBALLDATA-...` ID, provider ID, existing team IDs, ISO timestamp, and supported status.
5. Export the same scope again; confirm entity Match IDs remain identical even though `export_id` and `exported_at` are new.
6. Uncheck one league and export again; confirm no records from that league are present.
7. Confirm skipped-record counts are shown and no local records are modified.
8. Confirm result export is explicitly marked as waiting for result revision/audit support.
9. Confirm the app can still load from the previous offline shell if the new cache install fails; no old cache is deleted by this change.

## Not yet verified

- Runtime behavior on the user's Android device.
- Real database export counts from the installed app.
- Full JSON Schema validation using a Draft 2020-12 validator.
- Football rich import preview and ID mapping.
- Result revision generation and correction audit.
