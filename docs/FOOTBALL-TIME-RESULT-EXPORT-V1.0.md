# Football Time — Match Result Revision Export v1.0

**Status:** Draft implementation for review. This change does not run a database rebuild or deploy to production.

## Purpose

Expose the FT-owned official result revision history to Football rich through a user-controlled JSON download. Football Time remains the only source of actual results; Football rich consumes the file as read-only evidence for forecast evaluation.

## Export scope

- Competitions: PL, PD, BL1, SA, FL1
- Season: 2026-2027
- Records: FT matches with status `FINISHED`
- Identity: `FT-M-FOOTBALLDATA-{providerMatchId}`
- Envelope: Data Contract v1.0, `data_type: match_results`

## Revision preservation

Each result record includes the latest score and revision plus the complete ordered `revision_history`:
- revision number
- home and away score
- FINISHED status
- change type (baseline, correction, preserved)
- recorded timestamp and reason
- source provider and verification timestamp

The exporter fails closed if any finished match in scope lacks a stable provider ID, valid score, current revision, source provenance, or a complete contiguous revision history. It also verifies that the latest history entry exactly matches the current match record. It never fabricates a revision, timestamp, score, or correction reason.

## Safety

- Read-only access to the already-loaded Football Time database.
- No provider/API calls, network enrichment, Supabase writes, database mutations, or Local Storage/IndexedDB changes.
- No change to the existing fixture export format.
- No changes to Football rich or its result importer in this PR.
- The file is downloaded only after the user explicitly presses the download button.
- Existing caches and application data are not cleared.

## Validation

The focused Node regression test covers:
- valid multi-revision export
- preservation of the earlier score
- missing revision history
- latest-score/history mismatch
- missing result provenance

CI also checks JavaScript syntax and JSON Schema syntax. Real-device FT export and Football rich import acceptance remain separate release gates.
