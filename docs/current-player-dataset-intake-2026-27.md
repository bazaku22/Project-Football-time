# Current Player Dataset Intake — 2026/27

## Goal

Build a clean, reviewable player dataset for the **2026/27 season only**. The current-season directory must not mix in prior-season memberships or unclassified legacy rows.

This document defines the intake and review contract. It does not claim that a 2026/27 dataset has already been populated.

## Safety boundary

- Preparation and validation may happen in a feature branch using offline, rights-reviewed source material.
- No provider API calls, API credits, Production Supabase writes, migrations, or deletes are authorized by this intake plan.
- Do not delete the existing 2025/26 canonical records or the 189 legacy `player_records` rows as part of this work.
- Prior-season canonical records are historical archive data; they are not current-season player memberships.
- Legacy rows remain quarantined until provider-specific team IDs and player identities are mapped with evidence.
- Do not import the five Research Only Manchester United pilot records into Production.

## Season and membership rules

- Target season: `2026/27`.
- A player appears in the current directory only when a source confirms membership with the relevant club for 2026/27.
- Do not infer current membership from a previous season, an old photograph, a transfer rumour, or a provider team ID that has not been mapped.
- Distinguish first-team, U21/reserve, and academy membership. Do not label every squad record `first_team` by default.
- A player may have multiple season memberships over time; preserve identity separately from season membership.
- Missing or conflicting position evidence remains explicitly unknown/pending review; never invent a position.

## Source and identity policy

- Use StrikerAPI as a foundational identity/master-data source where available (provider player ID, name, and current squad membership), subject to a documented permission and cost review.
- Do not treat any one provider as the sole source for every statistic. Link independently permitted statistical sources to a canonical internal player ID.
- Preserve provider name, provider player ID, source URL/reference, retrieval date, season, competition, team, metric definition, and rights status for every imported fact.
- Reconcile identities only on strong evidence. Ambiguous name-only matches stay in a review queue.
- Never scrape AiScore, LiveScore, or any source without permission.
- No API call is made until the user separately approves the provider, expected cost/credits, and scope.

## Initial official-source inventory

These are discovery references for checking current-season membership and player facts, not blanket permission to copy or republish their data. Terms, database rights, attribution, and intended use must be reviewed before ingestion.

| Competition | Current-season source discovered | Intended use / limitation |
|---|---|---|
| Premier League | [2026/27 squad lists](https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists), [2026/27 squad numbers](https://www.premierleague.com/en/news/4725682/all-20-premier-league-clubs-squad-numbers-for-202627-season), [player directory](https://www.premierleague.com/en/players) | Official first-team and U21 squad evidence; distinguish the 25-player submitted list from eligible U21s |
| La Liga | [Official club squad pages](https://www.laliga.com/clubes/fc-barcelona/plantilla), [2026/27 player profile example](https://www.laliga.com/en-GB/player/jude-bellingham) | Club squad membership, position and player profile facts; verify each club's page and season |
| Bundesliga | [Official Bundesliga player directory](https://www.bundesliga.com/en/bundesliga/player/) | Current club grouping, position and shirt-number evidence; confirm each player record and season |
| Serie A | [Official 2026/27 player statistics](https://www.legaseriea.it/serie-a/statistiche/giocatori), [English player statistics](https://en.legaseriea.it/serie-a/statistiche/giocatori) | Current-season appearances and player list; statistics are competition-scoped and should not be mistaken for full squad membership |
| Ligue 1 | [Official Ligue 1 Data Zone](https://ligue1.com/en/data-zone/ligue1mcdonalds) | Current-season club and statistical discovery; obtain squad membership from official club evidence where the data zone does not establish full roster membership |

A discovered page may be incomplete, dynamically rendered, or scoped to registered first-team players only. Record the exact page, observed date, scope, and any uncertainty for each player. Do not use third-party aggregators as the sole identity or membership authority.

## Required player intake fields

| Field | Requirement |
|---|---|
| `canonical_player_id` | Stable internal ID; never reuse for another person |
| `full_name` | Source-backed name |
| `display_name` | Optional UI label |
| `date_of_birth` | Optional; retain source and rights status |
| `nationality` | Optional; retain source |
| `position` | Controlled taxonomy; nullable until verified |
| `club_id` | Canonical club ID, not a provider-specific ID |
| `season` | Must equal `2026/27` for this intake |
| `squad_level` | `first_team`, `u21`, `u18`, `reserve`, or `unknown` |
| `membership_evidence` | Source reference and observed date |
| `provider_ids` | Provider + exact provider player ID |
| `statistics` | Separate source-linked records with competition, season, metric definition, and sample scope |
| `rights_status` | Explicit approval/review state per source record |

## Photo policy

1. Prefer a photograph that verifiably shows the player in their **current club kit**.
2. Use it only when the file's copyright license, attribution requirements, source page, and applicable usage restrictions have been reviewed.
3. Record image URL, source page, author/photographer, license, license URL, capture date, and review status.
4. A copyright license does not by itself clear personality/publicity rights. Keep that review separate.
5. If no suitable, permitted current-kit photograph is available, use the existing initials/club-colour avatar fallback. Do not substitute an unlicensed official club image or mislabel a national-team/old-club photo as current.
6. Do not copy image binaries into the repository unless license compatibility and attribution obligations are reviewed.

## Import and release gates

A player membership is eligible for a future import only after all checks pass:

- season is exactly `2026/27`;
- canonical club mapping is verified;
- provider identity is exact and unique, or manually reviewed;
- squad level and position have source evidence or are explicitly unknown;
- source rights status permits the intended use;
- duplicate checks pass;
- statistics retain their source, competition, season, metric definition, and sample size;
- the complete import can be validated offline before any Production write.

Production import, update, archive, and deletion are separate operations and require separate explicit approval. A future import must be staged and checked before any cleanup of old records is considered.

## Initial audit baseline (2026-11-12)

- Canonical player identities: 29.
- Canonical memberships: 29, all Arsenal 2025/26.
- Canonical current-stat rows: 29.
- Legacy `player_records`: 189 across six provider-specific team IDs; club mapping unresolved.
- Canonical 2026/27 memberships observed: 0.

These observations mean the current-season dataset is **not populated yet**. The old canonical records are archive candidates, not junk; the legacy rows are unclassified and quarantined. Do not claim the current player directory is complete until a verified 2026/27 import has passed the gates above.

## Next implementation steps

1. Build an offline 2026/27 intake manifest and validation tests.
2. Gather club membership evidence from permitted, no-cost sources where available; do not make API calls.
3. Resolve team/player identities and squad levels, marking uncertainty rather than guessing.
4. Review club-kit photo availability and rights; fall back to club-colour avatars where needed.
5. Present the validated import manifest for approval before any Production write.
