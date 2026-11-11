# Player Statistics Import UI — Preview stage

## Scope
The Players tab accepts two local CSV files: a statistics source (maximum 5 MB) and provider-ID mapping (maximum 2 MB). The browser checks required columns, the 2026/27 season boundary, metric sanity, match-scope fields, exact (provider, provider_player_id) mapping, duplicate natural keys, and SHA-256 file hashes. Names are descriptive only and never resolve identity. Blank metrics remain unknown.

Rows are displayed individually as structurally valid pending human review or quarantined with reasons. Passing preflight is not a data-rights determination. A human must verify permission evidence before any import.

## Safety boundary
This is a local-only preview and report-export tool. It does not upload files, call a provider, call Supabase, or write to any table. JSON and CSV downloads are preview reports only. The existing player cloud panel and legacy squad preview/save flow are unchanged. This UI never invokes the legacy player-data sync or save-preview actions.

## Persistence is not enabled
Production persistence into ft_* tables remains disabled. It requires an authenticated transactional RPC/Edge Function, real Auth-session HTTP tests, RLS verification, source-rights approval, and separately authorized production deployment. A sequence of client-side REST writes is not an atomic transaction.

## CSV columns
Statistics CSV requires provider, provider_player_id, player_name, team_code, season, competition_code, squad_level, statistics_scope, collected_at, rights_status, and permission_reference, plus the canonical/statistic/match fields supported by the offline importer.

Mapping CSV requires provider, provider_player_id, and canonical_player_key. Optional team_code and season constrain a mapping.
