-- Football Time: provider-neutral player statistics foundation.
-- Additive only: does not alter legacy player_records or sync tables.
-- DRAFT FOR REVIEW. This file has NOT been applied to the live Supabase project.

create table public.ft_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_player_key text not null check (length(btrim(canonical_player_key)) > 0),
  display_name text not null check (length(btrim(display_name)) > 0),
  normalized_name text,
  date_of_birth date,
  nationality text,
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ft_players_user_id_id_key unique (user_id, id),
  constraint ft_players_user_canonical_key unique (user_id, canonical_player_key)
);

create table public.ft_player_source_ids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null,
  source_name text not null check (length(btrim(source_name)) > 0),
  provider_player_id text not null check (length(btrim(provider_player_id)) > 0),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  verified_at timestamptz,
  source_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ft_player_source_ids_user_id_id_key unique (user_id, id),
  constraint ft_player_source_ids_player_fk
    foreign key (user_id, player_id)
    references public.ft_players (user_id, id) on delete restrict,
  constraint ft_player_source_ids_verified_at_check
    check (verification_status <> 'verified' or verified_at is not null),
  constraint ft_player_source_ids_provider_identity_key
    unique (user_id, source_name, provider_player_id)
);

create table public.ft_player_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null check (length(btrim(source_name)) > 0),
  file_name text not null check (length(btrim(file_name)) > 0),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_seen integer not null default 0 check (rows_seen >= 0),
  rows_accepted integer not null default 0 check (rows_accepted >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  status text not null default 'previewed'
    check (status in ('previewed', 'approved', 'committed', 'failed', 'cancelled')),
  error_summary text,
  created_at timestamptz not null default now(),
  constraint ft_player_import_batches_user_id_id_key unique (user_id, id),
  constraint ft_player_import_batches_counts_check
    check (rows_accepted + rows_rejected <= rows_seen),
  constraint ft_player_import_batches_finished_check
    check (finished_at is null or finished_at >= started_at)
);

create table public.ft_player_stat_source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null,
  source_name text not null check (length(btrim(source_name)) > 0),
  source_record_key text,
  season text not null check (season ~ '^[0-9]{4}/[0-9]{2}$'),
  competition_id text not null check (length(btrim(competition_id)) > 0),
  team_id text not null check (length(btrim(team_id)) > 0),
  squad_level text not null
    check (squad_level in ('first_team', 'u21', 'u18', 'other_youth')),
  statistics_scope text not null
    check (statistics_scope in ('season', 'competition', 'match')),
  match_id text,
  stat_date date,
  stats jsonb not null default '{}'::jsonb
    check (jsonb_typeof(stats) = 'object'),
  source_url text,
  source_updated_at timestamptz,
  collected_at timestamptz not null,
  rights_status text not null
    check (rights_status in ('approved', 'manual_review', 'not_approved')),
  permission_reference text not null
    check (length(btrim(permission_reference)) > 0),
  import_batch_id uuid not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  constraint ft_player_stat_source_records_user_id_id_player_key
    unique (user_id, id, player_id),
  constraint ft_player_stat_source_records_player_fk
    foreign key (user_id, player_id)
    references public.ft_players (user_id, id) on delete restrict,
  constraint ft_player_stat_source_records_batch_fk
    foreign key (user_id, import_batch_id)
    references public.ft_player_import_batches (user_id, id) on delete restrict,
  constraint ft_player_stat_source_records_scope_check
    check (
      (statistics_scope = 'match' and match_id is not null
        and length(btrim(match_id)) > 0 and stat_date is not null)
      or
      (statistics_scope <> 'match' and match_id is null and stat_date is null)
    ),
  constraint ft_player_stat_source_records_source_hash_key
    unique (user_id, source_name, content_hash)
);

create table public.ft_player_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null,
  team_id text not null check (length(btrim(team_id)) > 0),
  season text not null check (season ~ '^[0-9]{4}/[0-9]{2}$'),
  squad_level text not null
    check (squad_level in ('first_team', 'u21', 'u18', 'other_youth')),
  valid_from date,
  valid_to date,
  source_name text not null check (length(btrim(source_name)) > 0),
  source_record_key text,
  collected_at timestamptz not null default now(),
  source_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ft_player_memberships_user_id_id_key unique (user_id, id),
  constraint ft_player_memberships_player_fk
    foreign key (user_id, player_id)
    references public.ft_players (user_id, id) on delete restrict,
  constraint ft_player_memberships_valid_dates_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.ft_player_stats_current (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null,
  season text not null check (season ~ '^[0-9]{4}/[0-9]{2}$'),
  competition_id text not null check (length(btrim(competition_id)) > 0),
  team_id text not null check (length(btrim(team_id)) > 0),
  squad_level text not null
    check (squad_level in ('first_team', 'u21', 'u18', 'other_youth')),
  statistics_scope text not null
    check (statistics_scope in ('season', 'competition', 'match')),
  match_id text,
  stat_date date,
  stats jsonb not null check (jsonb_typeof(stats) = 'object'),
  selected_source_record_id uuid not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'disputed')),
  updated_at timestamptz not null default now(),
  constraint ft_player_stats_current_user_id_id_key unique (user_id, id),
  constraint ft_player_stats_current_player_fk
    foreign key (user_id, player_id)
    references public.ft_players (user_id, id) on delete restrict,
  constraint ft_player_stats_current_source_fk
    foreign key (user_id, selected_source_record_id, player_id)
    references public.ft_player_stat_source_records (user_id, id, player_id)
    on delete restrict,
  constraint ft_player_stats_current_scope_check
    check (
      (statistics_scope = 'match' and match_id is not null
        and length(btrim(match_id)) > 0 and stat_date is not null)
      or
      (statistics_scope <> 'match' and match_id is null and stat_date is null)
    )
);

create table public.ft_player_stat_change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_stat_id uuid not null,
  source_record_id uuid not null,
  previous_stats jsonb,
  new_stats jsonb not null check (jsonb_typeof(new_stats) = 'object'),
  change_reason text not null check (length(btrim(change_reason)) > 0),
  changed_at timestamptz not null default now(),
  constraint ft_player_stat_change_history_current_fk
    foreign key (user_id, current_stat_id)
    references public.ft_player_stats_current (user_id, id) on delete restrict,
  constraint ft_player_stat_change_history_source_fk
    foreign key (user_id, source_record_id)
    references public.ft_player_stat_source_records (user_id, id) on delete restrict,
  constraint ft_player_stat_change_history_previous_json_check
    check (previous_stats is null or jsonb_typeof(previous_stats) = 'object')
);

-- Index ownership/FK lookup columns and the main read paths.
create index ft_players_owner_name_idx
  on public.ft_players (user_id, normalized_name);
create index ft_player_source_ids_player_idx
  on public.ft_player_source_ids (user_id, player_id);
create index ft_player_import_batches_owner_started_idx
  on public.ft_player_import_batches (user_id, started_at desc);
create index ft_player_stat_source_records_player_scope_idx
  on public.ft_player_stat_source_records
    (user_id, player_id, season, competition_id, team_id, squad_level);
create index ft_player_stat_source_records_batch_idx
  on public.ft_player_stat_source_records (user_id, import_batch_id);
create index ft_player_memberships_player_season_idx
  on public.ft_player_memberships (user_id, player_id, season, team_id);
create index ft_player_stats_current_player_scope_idx
  on public.ft_player_stats_current
    (user_id, player_id, season, competition_id, team_id, squad_level);
create unique index ft_player_stats_current_aggregate_key
  on public.ft_player_stats_current
    (user_id, player_id, season, competition_id, team_id, squad_level, statistics_scope)
  where match_id is null;
create unique index ft_player_stats_current_match_key
  on public.ft_player_stats_current
    (user_id, player_id, season, competition_id, team_id, squad_level, statistics_scope, match_id)
  where match_id is not null;
create index ft_player_stat_change_history_current_idx
  on public.ft_player_stat_change_history (user_id, current_stat_id, changed_at desc);
create index ft_player_stat_change_history_source_idx
  on public.ft_player_stat_change_history (user_id, source_record_id);

-- All tables are private to the authenticated owner. No anon access and no DELETE.
alter table public.ft_players enable row level security;
alter table public.ft_player_source_ids enable row level security;
alter table public.ft_player_import_batches enable row level security;
alter table public.ft_player_stat_source_records enable row level security;
alter table public.ft_player_memberships enable row level security;
alter table public.ft_player_stats_current enable row level security;
alter table public.ft_player_stat_change_history enable row level security;

revoke all on table
  public.ft_players,
  public.ft_player_source_ids,
  public.ft_player_import_batches,
  public.ft_player_stat_source_records,
  public.ft_player_memberships,
  public.ft_player_stats_current,
  public.ft_player_stat_change_history
from anon, authenticated;

grant select, insert, update on table
  public.ft_players,
  public.ft_player_source_ids,
  public.ft_player_import_batches,
  public.ft_player_memberships,
  public.ft_player_stats_current
to authenticated;

grant select, insert on table
  public.ft_player_stat_source_records,
  public.ft_player_stat_change_history
to authenticated;

-- Backend-only service_role permissions mirror the least-privilege table operations.
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

create policy ft_players_select_own on public.ft_players
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_players_insert_own on public.ft_players
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ft_players_update_own on public.ft_players
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ft_player_source_ids_select_own on public.ft_player_source_ids
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_source_ids_insert_own on public.ft_player_source_ids
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ft_player_source_ids_update_own on public.ft_player_source_ids
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ft_player_import_batches_select_own on public.ft_player_import_batches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_import_batches_insert_own on public.ft_player_import_batches
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ft_player_import_batches_update_own on public.ft_player_import_batches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ft_player_stat_source_records_select_own on public.ft_player_stat_source_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_stat_source_records_insert_own on public.ft_player_stat_source_records
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy ft_player_memberships_select_own on public.ft_player_memberships
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_memberships_insert_own on public.ft_player_memberships
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ft_player_memberships_update_own on public.ft_player_memberships
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ft_player_stats_current_select_own on public.ft_player_stats_current
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_stats_current_insert_own on public.ft_player_stats_current
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.ft_player_stat_source_records s
      where s.user_id = ft_player_stats_current.user_id
        and s.id = ft_player_stats_current.selected_source_record_id
        and s.player_id = ft_player_stats_current.player_id
        and s.season = ft_player_stats_current.season
        and s.competition_id = ft_player_stats_current.competition_id
        and s.team_id = ft_player_stats_current.team_id
        and s.squad_level = ft_player_stats_current.squad_level
        and s.statistics_scope = ft_player_stats_current.statistics_scope
        and s.match_id is not distinct from ft_player_stats_current.match_id
        and s.stat_date is not distinct from ft_player_stats_current.stat_date
        and s.stats = ft_player_stats_current.stats
        and s.rights_status = 'approved'
    )
  );
create policy ft_player_stats_current_update_own on public.ft_player_stats_current
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.ft_player_stat_source_records s
      where s.user_id = ft_player_stats_current.user_id
        and s.id = ft_player_stats_current.selected_source_record_id
        and s.player_id = ft_player_stats_current.player_id
        and s.season = ft_player_stats_current.season
        and s.competition_id = ft_player_stats_current.competition_id
        and s.team_id = ft_player_stats_current.team_id
        and s.squad_level = ft_player_stats_current.squad_level
        and s.statistics_scope = ft_player_stats_current.statistics_scope
        and s.match_id is not distinct from ft_player_stats_current.match_id
        and s.stat_date is not distinct from ft_player_stats_current.stat_date
        and s.stats = ft_player_stats_current.stats
        and s.rights_status = 'approved'
    )
  );

create policy ft_player_stat_change_history_select_own on public.ft_player_stat_change_history
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ft_player_stat_change_history_insert_own on public.ft_player_stat_change_history
  for insert to authenticated with check ((select auth.uid()) = user_id);
