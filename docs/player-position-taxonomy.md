# Player Position Taxonomy and Manchester United Pilot

Status: research/design fixture only  
Season: 2026/27  
Club: Manchester United  
Research date: 2026-11-12

## Purpose

Introduce position-aware player records without assuming that a player's broad squad category proves a specific tactical role. The first pilot contains Bruno Fernandes, Matheus Cunha, Bryan Mbeumo, Kobbie Mainoo, and Harry Maguire.

## Position model

- `position_group`: one of `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`.
- `verified_specific_position`: optional single primary role such as GK, CB, LB, RB, DM, CM, AM, LW, RW, CF, or ST. Leave null until supported by a reliable source.
- `secondary_positions`: zero or more additional positions, each independently evidenced.
- `playing_roles`: tactical roles (e.g. ball-playing defender, box-to-box midfielder). These require evidence and must not be inferred from a broad position label.
- `provider_position_tags`: preserve source-specific tags exactly; a player may have multiple tags (e.g. FW,MF). Never collapse provider tags into a single specific position without evidence.
- `match_position_history`: future match-level observations with source, match ID, observation timestamp and confidence. Do not infer these from squad lists.

## Pilot classification

| Player | Shirt | Official squad group | Provider tags | Verified specific position |
|---|---:|---|---|---|
| Bruno Fernandes | 8 | Midfielder | MF | Pending |
| Matheus Cunha | 10 | Forward | FW, MF | Pending |
| Bryan Mbeumo | 19 | Forward | MF, FW | Pending |
| Kobbie Mainoo | 37 | Midfielder | MF | Pending |
| Harry Maguire | 5 | Defender | DF | Pending |

Official squad categories and shirt numbers are cross-referenced against:
- https://www.manutd.com/en/teams/mens-team
- https://www.premierleague.com/en/clubs/1/manchester-united/squad

Provider-specific position tags are cross-referenced against:
- https://fbref.com/en/squads/19538871/2026-2027/Manchester-United-Stats

These are research references, not blanket permission to copy source databases into the app. The pilot fixture intentionally stores no season-statistics values. Data rights remain pending review.

## Player Database UI

The Player Database position filter groups records into Forward, Midfielder, Defender, Goalkeeper, Multi-position, and Unknown. It can read an explicit `positionGroup` field or conservatively classify recognized position abbreviations from the existing `position` field. Unknown or unrecognized values remain Unknown; multi-group provider tags remain Multi-position.

## Data quality rules

1. Preserve the source's original position tags and source reference.
2. Distinguish official squad category from match-level actual position.
3. Do not infer a tactical role from a player's name, reputation, or broad group.
4. A missing position is unknown, not evidence that the player cannot play there.
5. Position group is for navigation/filtering; specific position and role require stronger evidence.
6. Do not mix statistics across competitions or seasons. Keep each source observation and collection timestamp separate.
7. Conflicting values remain separate observations until scope, metric definition, and source rights are reviewed.
8. Rights review is independent of factual cross-checking. A value matching multiple sites is not automatically licensed for production use.

## Import boundary

The JSON fixture under `tests/fixtures/` is test-only. It is not loaded by the app, not a production import file, and not connected to Supabase. No API calls, credits, production writes, or migrations are part of this pilot.
