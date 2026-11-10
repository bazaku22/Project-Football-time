# Reep private alias pilot

This pilot compares the names in the signed-in user's private StrikerAPI player records with Reep's public `provider_aliases.csv.gz` release.

## Privacy and write-safety

- The pilot reads only records returned to the currently authenticated owner by the existing `player-data` Edge Function.
- The browser sends no player names or IDs to GitHub.
- The authenticated `reep-aliases` Edge Function fetches the public Reep release pointer and manifest, downloads only `provider_aliases.csv.gz`, and verifies its byte length and SHA-256 before returning it.
- Matching is performed in the signed-in browser session. The player's names and match candidates are not written to Supabase, Local Storage, or GitHub.
- The pilot does not call StrikerAPI and consumes no StrikerAPI credits.
- The existing 156 player records and all match/prediction records are unchanged.

## Matching method

- Exact normalized-name matching only: Unicode normalization, diacritic removal, case folding, and punctuation/whitespace normalization.
- No fuzzy matching, no automatic linking, and no canonical player ID writes.
- Results are candidates only. The public provider alias table does not include `entity_type`; therefore a candidate Reep ID is not yet proven to be a player. Manual review and entity-type verification are required before any future linking.
- Multiple Reep IDs for one player name are marked ambiguous. Missing aliases are reported as unmatched, not treated as evidence that the player does not exist.

## Source and release handling

- Source: Reep public register, `provider_aliases.csv.gz`.
- Release stamp is read dynamically from `https://data.reep.football/releases/latest.json`; no release is hardcoded.
- The proxy follows the release manifest and verifies the file's declared size and SHA-256.
- Reep describes the public release as CC0 1.0. The release stamp is retained with the result for reproducibility.
- This pilot uses only the aliases table; it does not import the full 1.17 GB register.

## Limits

- Maximum 500 private player rows per run; the current pilot is expected to use 156.
- Maximum compressed alias file accepted by the proxy: 30 MiB.
- Browser must support `DecompressionStream("gzip")`.
- Alias rows with embedded newlines are not expected in the public schema; parser handles quoted commas and escaped quotes.
- Candidate output remains in page memory only and disappears when the page is reloaded.
