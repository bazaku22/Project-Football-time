-- Atomic, owner-scoped player statistics import RPC.
-- Additive migration. No legacy player data is modified or deleted.
-- SECURITY DEFINER is required because authenticated direct table writes are revoked.
-- Ownership is always derived from auth.uid(); all relations are schema-qualified.

create or replace function public.import_player_statistics_batch(
  p_source_name text, p_file_name text, p_file_sha256 text, p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch_id uuid;
  v_row jsonb;
  v_membership jsonb;
  v_stats jsonb;
  v_player_id uuid;
  v_provider_link_id uuid;
  v_linked_player_id uuid;
  v_source_record_id uuid;
  v_current_id uuid;
  v_previous_stats jsonb;
  v_metric record;
  v_rows_seen integer;
  v_rows_accepted integer := 0;
  v_source_name text;
  v_provider_player_id text;
  v_canonical_key text;
  v_display_name text;
  v_season text;
  v_competition_id text;
  v_team_id text;
  v_squad_level text;
  v_scope text;
  v_match_id text;
  v_stat_date date;
  v_permission_reference text;
  v_content_hash text;
  v_collected_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_source_name is null or length(btrim(p_source_name)) = 0
     or p_file_name is null or length(btrim(p_file_name)) = 0
     or p_file_sha256 is null or p_file_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_import_batch_metadata' using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'rows_must_be_array_with_1_to_500_items' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then
    raise exception 'rows_must_be_array_with_1_to_500_items' using errcode = '22023';
  end if;

  v_rows_seen := jsonb_array_length(p_rows);
  insert into public.ft_player_import_batches
    (user_id, source_name, file_name, file_sha256, rows_seen, status)
  values (v_user_id, btrim(p_source_name), btrim(p_file_name),
          p_file_sha256, v_rows_seen, 'approved')
  returning id into v_batch_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_row) is distinct from 'object' then
      raise exception 'each_import_row_must_be_object' using errcode = '22023';
    end if;

    v_source_name := btrim(coalesce(v_row->>'source_name', p_source_name));
    v_provider_player_id := btrim(coalesce(v_row->>'provider_player_id', ''));
    v_canonical_key := btrim(coalesce(v_row->>'canonical_player_key', ''));
    v_display_name := btrim(coalesce(v_row->>'display_name', ''));
    v_season := btrim(coalesce(v_row->>'season', ''));
    v_competition_id := btrim(coalesce(v_row->>'competition_id', ''));
    v_team_id := btrim(coalesce(v_row->>'team_id', ''));
    v_squad_level := coalesce(v_row->>'squad_level', '');
    v_scope := coalesce(v_row->>'statistics_scope', '');
    v_match_id := nullif(btrim(coalesce(v_row->>'match_id', '')), '');
    v_stat_date := nullif(v_row->>'stat_date', '')::date;
    v_permission_reference := btrim(coalesce(v_row->>'permission_reference', ''));
    v_content_hash := coalesce(v_row->>'content_hash', '');
    v_collected_at := nullif(v_row->>'collected_at', '')::timestamptz;
    v_stats := v_row->'stats';
    v_membership := v_row->'membership';

    if v_source_name <> btrim(p_source_name)
       or v_provider_player_id = '' or v_canonical_key = '' or v_display_name = ''
       or v_season !~ '^[0-9]{4}/[0-9]{2}$'
       or v_competition_id = '' or v_team_id = ''
       or v_squad_level not in ('first_team','u21','u18','other_youth')
       or v_scope not in ('season','competition','match')
       or v_permission_reference = ''
       or v_content_hash !~ '^[0-9a-f]{64}$'
       or v_collected_at is null
       or v_row->>'identity_verified' is distinct from 'true'
       or v_row->>'rights_reviewed' is distinct from 'true'
       or v_row->>'rights_status' is distinct from 'approved'
       or jsonb_typeof(v_stats) is distinct from 'object'
       or jsonb_typeof(v_membership) is distinct from 'object' then
      raise exception 'row_identity_scope_rights_or_provenance_invalid' using errcode = '22023';
    end if;

    if (v_scope = 'match' and (v_match_id is null or v_stat_date is null))
       or (v_scope <> 'match' and (v_match_id is not null or v_stat_date is not null)) then
      raise exception 'statistics_scope_mismatch' using errcode = '22023';
    end if;

    for v_metric in
      select key, value from jsonb_each(v_stats)
      where key in ('appearances','starts','minutes','goals','assists','shots',
                    'shots_on_target','xg','xa','yellow_cards','red_cards',
                    'saves','clean_sheets')
    loop
      if v_metric.value <> 'null'::jsonb then
        if jsonb_typeof(v_metric.value) <> 'number'
           or (v_metric.value #>> '{}')::numeric < 0 then
          raise exception 'invalid_non_negative_metric: %', v_metric.key using errcode = '22023';
        end if;
      end if;
    end loop;
    if v_stats ? 'starts' and v_stats ? 'appearances'
       and jsonb_typeof(v_stats->'starts') = 'number'
       and jsonb_typeof(v_stats->'appearances') = 'number'
       and (v_stats->>'starts')::numeric > (v_stats->>'appearances')::numeric then
      raise exception 'starts_exceeds_appearances' using errcode = '22023';
    end if;
    if v_stats ? 'shots_on_target' and v_stats ? 'shots'
       and jsonb_typeof(v_stats->'shots_on_target') = 'number'
       and jsonb_typeof(v_stats->'shots') = 'number'
       and (v_stats->>'shots_on_target')::numeric > (v_stats->>'shots')::numeric then
      raise exception 'shots_on_target_exceeds_shots' using errcode = '22023';
    end if;

    if btrim(coalesce(v_membership->>'team_id','')) <> v_team_id
       or btrim(coalesce(v_membership->>'season','')) <> v_season
       or coalesce(v_membership->>'squad_level','') <> v_squad_level then
      raise exception 'membership_scope_mismatch' using errcode = '22023';
    end if;

    insert into public.ft_players
      (user_id, canonical_player_key, display_name, normalized_name)
    values (v_user_id, v_canonical_key, v_display_name, lower(v_display_name))
    on conflict (user_id, canonical_player_key)
    do update set updated_at = pg_catalog.now()
    returning id into v_player_id;

    select id, player_id into v_provider_link_id, v_linked_player_id
    from public.ft_player_source_ids
    where user_id = v_user_id and source_name = v_source_name
      and provider_player_id = v_provider_player_id
    for update;

    if v_provider_link_id is not null then
      if v_linked_player_id <> v_player_id then
        raise exception 'provider_identity_already_linked_to_another_player' using errcode = '23505';
      end if;
      update public.ft_player_source_ids
      set verification_status = 'verified',
          verified_at = coalesce(verified_at, pg_catalog.now()),
          updated_at = pg_catalog.now()
      where user_id = v_user_id and id = v_provider_link_id;
    else
      insert into public.ft_player_source_ids
        (user_id, player_id, source_name, provider_player_id,
         verification_status, verified_at)
      values (v_user_id, v_player_id, v_source_name, v_provider_player_id,
              'verified', pg_catalog.now())
      returning id into v_provider_link_id;
    end if;

    insert into public.ft_player_stat_source_records
      (user_id, player_id, source_name, source_record_key, season,
       competition_id, team_id, squad_level, statistics_scope, match_id,
       stat_date, stats, source_url, source_updated_at, collected_at,
       rights_status, permission_reference, import_batch_id, content_hash)
    values
      (v_user_id, v_player_id, v_source_name,
       nullif(v_row->>'source_record_key',''), v_season, v_competition_id,
       v_team_id, v_squad_level, v_scope, v_match_id, v_stat_date, v_stats,
       nullif(v_row->>'source_url',''),
       nullif(v_row->>'source_updated_at','')::timestamptz,
       v_collected_at, 'approved', v_permission_reference, v_batch_id, v_content_hash)
    returning id into v_source_record_id;

    if not exists (
      select 1 from public.ft_player_memberships m
      where m.user_id = v_user_id and m.player_id = v_player_id
        and m.team_id = v_team_id and m.season = v_season
        and m.squad_level = v_squad_level and m.source_name = v_source_name
        and m.source_record_key is not distinct from nullif(v_membership->>'source_record_key','')
        and m.valid_from is not distinct from nullif(v_membership->>'valid_from','')::date
        and m.valid_to is not distinct from nullif(v_membership->>'valid_to','')::date
    ) then
      insert into public.ft_player_memberships
        (user_id, player_id, team_id, season, squad_level, valid_from,
         valid_to, source_name, source_record_key, collected_at)
      values
        (v_user_id, v_player_id, v_team_id, v_season, v_squad_level,
         nullif(v_membership->>'valid_from','')::date,
         nullif(v_membership->>'valid_to','')::date,
         v_source_name, nullif(v_membership->>'source_record_key',''), v_collected_at);
    end if;

    select id, stats into v_current_id, v_previous_stats
    from public.ft_player_stats_current
    where user_id = v_user_id and player_id = v_player_id
      and season = v_season and competition_id = v_competition_id
      and team_id = v_team_id and squad_level = v_squad_level
      and statistics_scope = v_scope
      and match_id is not distinct from v_match_id
    for update;

    if v_current_id is null then
      insert into public.ft_player_stats_current
        (user_id, player_id, season, competition_id, team_id, squad_level,
         statistics_scope, match_id, stat_date, stats, selected_source_record_id,
         verification_status)
      values
        (v_user_id, v_player_id, v_season, v_competition_id, v_team_id,
         v_squad_level, v_scope, v_match_id, v_stat_date, v_stats,
         v_source_record_id, 'pending')
      returning id into v_current_id;
    else
      update public.ft_player_stats_current
      set stats = v_stats, stat_date = v_stat_date,
          selected_source_record_id = v_source_record_id,
          verification_status = 'pending', updated_at = pg_catalog.now()
      where user_id = v_user_id and id = v_current_id;
    end if;

    insert into public.ft_player_stat_change_history
      (user_id, current_stat_id, source_record_id, previous_stats, new_stats, change_reason)
    values
      (v_user_id, v_current_id, v_source_record_id, v_previous_stats, v_stats,
       coalesce(nullif(btrim(v_row->>'change_reason'),''),'atomic player statistics import'));
    v_rows_accepted := v_rows_accepted + 1;
  end loop;

  update public.ft_player_import_batches
  set rows_accepted = v_rows_accepted, rows_rejected = 0,
      status = 'committed', finished_at = pg_catalog.now()
  where user_id = v_user_id and id = v_batch_id;

  return pg_catalog.jsonb_build_object(
    'batch_id', v_batch_id, 'rows_seen', v_rows_seen,
    'rows_accepted', v_rows_accepted, 'rows_rejected', 0, 'status', 'committed'
  );
end;
$$;

revoke all on function public.import_player_statistics_batch(text,text,text,jsonb) from public, anon;
grant execute on function public.import_player_statistics_batch(text,text,text,jsonb) to authenticated;

revoke insert, update on table
  public.ft_players, public.ft_player_source_ids, public.ft_player_import_batches,
  public.ft_player_stat_source_records, public.ft_player_memberships,
  public.ft_player_stats_current, public.ft_player_stat_change_history
from authenticated;
