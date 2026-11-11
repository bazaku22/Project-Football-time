-- Restrict inherited/default service_role table privileges on the new player statistics tables.
-- Keep backend operations aligned with the documented least-privilege model.

revoke all on table
  public.ft_players,
  public.ft_player_source_ids,
  public.ft_player_import_batches,
  public.ft_player_stat_source_records,
  public.ft_player_memberships,
  public.ft_player_stats_current,
  public.ft_player_stat_change_history
from service_role;

grant select, insert, update on table
  public.ft_players,
  public.ft_player_source_ids,
  public.ft_player_import_batches,
  public.ft_player_memberships,
  public.ft_player_stats_current
to service_role;

grant select, insert on table
  public.ft_player_stat_source_records,
  public.ft_player_stat_change_history
to service_role;
