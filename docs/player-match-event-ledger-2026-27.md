# Player Match Event Ledger — 2026/27

**Status:** First offline implementation slice; no production ingestion.
**Scope:** Premier League, La Liga, Bundesliga, Serie A and Ligue 1, 2026/27 season.
**Primary purpose:** Derive player appearances, goals and assists from reviewed match-level evidence owned by Football Time.

## 1. Data flow

Existing fixture database → reviewed match lineups/events → FT Player identity resolution → derived season totals

The match ledger is the source of evidence. Aggregate player totals are derived output and must never be manually edited as a second source of truth.

## 2. What counts

- **Appearance:** A player named in the Starting XI, or a substitute with an evidenced substitution-on event. A player merely listed on the bench does not receive an appearance.
- **Goal:** A normal goal or penalty goal credited to the player. Penalties count as goals.
- **Own goal:** Retain the event and the responsible player as match evidence, but do not add a goal to that player's personal goals total.
- **Assist:** Count only when the source explicitly credits the assist. An explicitly confirmed no-assist event is different from unknown assist attribution.
- **Unknown:** Missing or incomplete evidence is never converted to zero. The derived output remains a lower bound until expected fixture, lineup and event coverage are complete.

This slice does not calculate minutes played, starts, cards, ratings, xG, or other metrics.

## 3. Identity

- Use a Football Time-owned immutable identifier such as FT-P-000001 only after a reviewer confirms identity.
- Keep unresolved observations with their exact observed name and no FT Player ID. Never auto-merge on name, shirt number, transliteration or club alone.
- Provider IDs are optional, source-scoped cross-references; they are not the canonical identity.
- Transfers change team membership, not player identity.
- A bench-only player can be retained as an identity observation but is not an appearance.

## 4. Match-level evidence

Each finished match record includes:
- existing provider match ID, competition and season;
- internal home/away team IDs;
- lineup coverage (complete, partial, unknown);
- event coverage (complete, partial, unknown);
- source records with direct URLs, checked timestamps and reuse-rights status;
- Starting XI and substitute lists;
- substitution events with player-on and player-off;
- goal events with normal/penalty/own-goal classification and explicit assist status.

The ledger deliberately does not copy report prose, images, page layout or commentary.

## 5. Rights and publication gates

A public page or manual transcription is not automatically a reuse licence. Every source retains a rights status and permission basis. Records with pending/prohibited rights may remain in private research staging but must not be published to the app. A record may be marked verified only when:
- at least two direct sources are recorded, including an official organiser, federation or licensed provider;
- all source rights are explicitly confirmed for the intended retention/use;
- lineup and event coverage are both complete.

This is an engineering gate, not legal advice. The previous five-league audit found no source family cleared for bulk retention or redistribution. This first slice therefore ships only an empty dataset, schema, validator and offline derivation tests; it does not populate historical match events.

## 6. Coverage and interpretation

The dataset carries the expected finished-match IDs from the existing fixture database. The derivation reports missing match IDs and counts of matches with complete lineups/events. Unless the expected fixture set is fully represented and all relevant match records have complete lineups/events, season totals are explicitly marked as lower bounds.

A match not yet researched is unknown, not a zero-appearance match. A player absent from a complete match lineup may be recorded as having no appearance in that match; a player absent from an incomplete lineup must not be assigned a zero from that record.

## 7. Roster completeness limitation

Match reports can establish players who appeared and players named on the bench, but they cannot prove the complete registered squad for a club. Players who never appear in a report cannot be discovered from match events alone. A complete all-player directory therefore still needs a separately rights-cleared roster source or an explicitly accepted incomplete-coverage label. This implementation does not invent missing squad members.

## 8. Safety boundary

- No provider API calls or credits.
- No scraping or automated extraction.
- No Supabase Production reads/writes or schema changes.
- No changes to Match Center rendering, legacy Player page, predictions or other app features.
- No merge to main or deployment.
