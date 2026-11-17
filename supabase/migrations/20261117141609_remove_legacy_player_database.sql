-- Retire the legacy Player Database schema. Match, result, and analysis tables are intentionally untouched.
drop table if exists public.ft_player_stat_change_history;
drop table if exists public.ft_player_stats_current;
drop table if exists public.ft_player_memberships;
drop table if exists public.ft_player_source_ids;
drop table if exists public.ft_player_stat_source_records;
drop table if exists public.ft_player_import_batches;
drop table if exists public.ft_players;
drop table if exists public.player_sync_previews;
drop table if exists public.player_sync_runs;
drop table if exists public.player_records;
