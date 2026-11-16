# Football Time → Football rich Fixture Export v1.0

**Status:** Implementation draft for review  
**Contract:** FEC-SDC-1.0  
**Scope:** PL, PD, BL1, SA, FL1 · season 2026-2027

## Purpose

Generate a user-controlled JSON file from the existing Football Time database so it can be imported by Football rich's Fixture Import v1. The exporter reads the already-loaded local database snapshot only. It does not call a provider, write to storage, or change source records.

## User flow

1. Open Football Time.
2. Open **เครื่องมือเพิ่มเติม** on Match Center.
3. Choose **ส่งออกข้อมูลไป Football rich**.
4. Select **ตรวจสอบข้อมูลและเตรียมไฟล์**.
5. Review the five-league record counts and select **ดาวน์โหลดไฟล์ JSON**.
6. In Football rich, open Tools Center → **นำเข้าข้อมูลจาก Football Time** and select the downloaded JSON file.

## Contract

- Envelope: schema version 1.0.0, data type `fixtures`, exported_by `football-time`.
- Fixed scope: PL, PD, BL1, SA, FL1 and season `2026-2027`.
- Include every matching fixture regardless of status (scheduled, live, finished, postponed, suspended, cancelled, or awarded).
- Shared Match ID: `FT-M-FOOTBALLDATA-{providerMatchId}`; IDs are deterministic and unchanged between exports.
- Preserve provider match ID, league/season, team IDs and historical team-name snapshots, kickoff, status, source provider, retrieval timestamp, and record update timestamp.
- Reject missing provider IDs, unknown statuses, missing team-season membership, invalid timestamps, duplicate IDs, or an incomplete five-league dataset.
- Scores and result fields are deliberately excluded. Actual results use the separate FT result/revision export contract.
- The export ID and exported timestamp identify each generated file; re-exporting does not alter entity IDs.

## Safety

- Read-only: no Local Storage, IndexedDB, Supabase, database JSON, or match records are modified.
- No network requests, football APIs, odds APIs, AI APIs, or new providers are used.
- No API keys or secrets are included.
- Other leagues and seasons are excluded from the file but remain untouched in Football Time.
- This exporter does not change the legacy result workflow or any existing match/prediction history.

## Validation and release gates

The application validates the complete envelope before enabling download. Automated tests cover five-league scope, season restriction, stable IDs, provenance, status allowlist, score exclusion, duplicate/missing identity, incomplete league coverage, team membership, and no source-data mutation.

The tests do not replace a real-device acceptance test. After merge/deploy, test one export from the live Football Time app and import it into Football rich without clearing app data or cache. Verify preview counts and idempotent re-import before relying on it operationally.
