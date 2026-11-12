# Phase 6.7 — Match Analysis Workspace Refinement

## Goal
Make the dedicated Match Analysis destination easier to scan on mobile while preserving the existing model, source data, and history.

## Changes
- Keep the existing league and upcoming-match selectors.
- Keep the existing 1X2 probability, score-margin distribution, expected-goals, data-readiness, and automatic Asian Handicap calculations unchanged.
- Move the match-specific Analysis Insight panel out of the 1X2 result block and render it after the automatic Handicap panel, so the explanation follows both probability sections.
- Clear the Insight container before each render to prevent stale match explanations when the selected fixture changes or cannot be calculated.
- Refine spacing and match-analysis layout without changing other destinations.

## Safety and compatibility
- No API calls, providers, schedules, quota, or recurring jobs added.
- No changes to probability formulas, Handicap settlement, source selection, history keys, Local Storage, Supabase, or database files.
- Preserve existing snapshots and all historical records.
- App version: 6.7.0-beta.1
- Service worker cache: V54

## Validation
- Automated contract tests verify Insight placement and runtime relocation, stale-state clearing, and app/cache version alignment.
- Existing app, navigation, match-center, Handicap, history, and calibration checks remain required.
- Android acceptance is pending until the user confirms the deployed build works.
