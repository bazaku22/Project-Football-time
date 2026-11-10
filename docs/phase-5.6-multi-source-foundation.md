# Phase 5.6 — Multi-source player database foundation

## Goal

Keep the authenticated Supabase `player_records` table as the private source-of-truth store while allowing multiple providers to contribute separately attributable records. Do not create a second public player database and do not publish private player records to GitHub Pages.

## Verified starting point (2026-11-10)

- Supabase `player_records` has 156 owner-scoped rows from StrikerAPI, covering the five target leagues in season label `2026` (2026/27): PL 31, PD 36, BL1 29, SA 32, FL1 28.
- Row identity is currently provider-scoped: owner + provider + provider player ID + league + team + season.
- A provider ID is not a Project Football Time canonical player ID. IDs from different providers must never be assumed equal.
- The current cloud player UI maps each provider row into the existing player list. This foundation does not alter the UI, database, 156 saved rows, match history, or probability snapshots.

## Multi-source model

1. **Provider records remain separate.** Keep each source's original player ID, raw provider name, league/team/season context, metrics, and fetch timestamp in its own record.
2. **Canonical identity is a separate layer.** A future owner-scoped identity-link table should connect one internal PFT player ID to one or more provider IDs. Do not repurpose a provider ID as the canonical ID.
3. **Statistics remain source- and season-specific.** Never add values from two providers together. Do not silently replace one provider's xG, rating, or other model-specific metric with another provider's value.
4. **Missing is not zero.** Missing or unsupported metrics remain null/absent. Zero is valid only when the provider explicitly reports zero.
5. **No destructive refresh.** New provider rows are additive. Updating a provider row may only update that provider's own fields; it must not erase another provider's row or source metadata.
6. **Provenance is mandatory.** Store provider, endpoint/dataset release, fetched-at time, season, league, team, and metric definition where available.

## Conservative identity matching

The offline matcher in `scripts/match_player_sources.py` only produces a review report; it never merges or writes records.

- Exact provider-ID crosswalk: safe only when an explicit verified crosswalk already exists.
- Automatic candidate generation: exact normalized player name + league + season + normalized team. This is a candidate, not proof of identity.
- If multiple candidates exist, mark ambiguous.
- Name-only, fuzzy-name, same-shirt-number, or same-team matches are suggestions only and must never be auto-linked.
- Transfers, duplicate names, youth/senior team collisions, and team aliases require manual review or an authoritative crosswalk.
- Persist a canonical identity link only after a reviewed match, recording match method, confidence, and reviewer confirmation.

## Source policy

| Source | Intended use | Gate |
|---|---|---|
| Existing StrikerAPI rows | Current 2026/27 squads and any verified profile statistics | Keep within the free-credit budget; make no request during matching |
| Reep | Potential provider-ID crosswalk | Confirm dataset coverage, identifier semantics, and license/version before importing |
| OpenFootball Players | Basic public-domain player facts where fields and IDs match | Confirm exact source file and coverage; not a performance-statistics feed |
| OpenPlay | Historical player-season statistics through 2025/26 | **Hold**: maintainer's CC BY 4.0 declaration does not resolve upstream WhoScored/Opta rights |
| Other providers | Fill only verified gaps | Review terms, storage/caching permission, cost, coverage, and metric definitions first |

## Credit and import safeguards

- No StrikerAPI request is made by the matcher or its self-test.
- Do not schedule or run full syncs as part of this foundation.
- Before any paid or credit-consuming test, calculate endpoint cost and obtain explicit user approval.
- Prefer offline/public-domain sources with clear rights, but never treat a public URL as permission to store or redistribute its contents.
- Keep all cloud data owner-scoped with RLS. Never place provider keys or Supabase secret/service-role keys in browser code or repository files.

## Current scope

This change adds documentation and an offline, read-only identity-candidate report. It intentionally does **not**:
- alter Supabase schema or policies;
- write or import any player data;
- call any external provider;
- change the existing 156 StrikerAPI records;
- enable automatic sync or publish player records.

## Next gated stages

1. Review the identity-candidate report against a small, user-approved sample.
2. Verify rights and source coverage for Reep/OpenFootball before using either dataset.
3. Design and review an owner-scoped canonical identity-link table migration.
4. Only then import a tiny source pilot into a Preview, inspect conflicts, and require explicit save confirmation.
