# Wyscout local parser pilot

This is a **local-only, read-only parser** for one processed Wyscout match JSON file. It is not wired into the app, Supabase, Local Storage, or any scheduled workflow.

## Source and scope

The public Wyscout event collection covers the 2017/18 seasons of the five major European leagues (1,941 matches and about 3.25 million event rows across the collection). The dataset repository lists separate Players, Teams, Matches, and Events assets and describes the collection as CC BY 4.0. Before importing any asset, retain a copy of the original Figshare item metadata and verify its item-level license and attribution fields. The public mirror's README is useful discovery evidence, not a substitute for preserving the original item metadata.

- Collection: https://doi.org/10.6084/m9.figshare.c.4415000
- Dataset paper: https://doi.org/10.1038/s41597-019-0247-7
- Processed event mirror and schema reference: https://github.com/koenvo/wyscout-soccer-match-event-dataset
- Sample match inspected: 2499841, Huddersfield Town vs Manchester City.

## Parser behavior

Run locally:

```bash
python3 scripts/wyscout_event_pilot.py --input /path/to/one-match.json
```

Optional output file (created only when explicitly requested):

```bash
python3 scripts/wyscout_event_pilot.py --input /path/to/one-match.json --output /path/to/local-preview.json
```

The parser produces:
- Match ID and raw event row count.
- Counts by event category.
- Per-provider-player-ID counts by event and sub-event category.
- Team IDs observed for each provider player ID.
- Count of event rows without a usable positive player ID.

It deliberately does **not** infer goals, assists, shots on target, pass accuracy, xG, or player names. Those require reliable tag definitions, lineups/substitutions, and the separate master datasets. It never creates a Football Time canonical ID.

## Validation

```bash
python3 -m unittest tests/test_wyscout_event_pilot.py
```

The tests use synthetic events only; no external dataset is downloaded or committed.

## Rights gate

The dataset's public repository states CC BY 4.0 and identifies the original Figshare collection. Before production use, preserve original Figshare metadata for each asset (Events, Players, Teams, Matches), verify the license and attribution at item level, and document any third-party exclusions. Attribution should cite Pappalardo et al. (2019), the Figshare collection, and the license. If an item-level license cannot be verified, do not import or persist that item.

## Safety

- No network calls in the parser.
- No Supabase or Local Storage writes.
- No StrikerAPI calls or credits.
- No changes to the 156 existing player records.
- No raw third-party dataset files committed.
- No app UI, service worker, or deployment changes.
