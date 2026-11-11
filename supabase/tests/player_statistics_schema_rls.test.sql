begin;

select plan(30);

-- Table existence and owner-scoped RLS are checked for every new relation.
select ok(to_regclass('public.ft_players') is not null, 'ft_players exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_players')), 'ft_players has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_players' and policyname = 'ft_players_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_players' and policyname = 'ft_players_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_players has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_players', 'select') and not has_table_privilege('authenticated', 'public.ft_players', 'delete'), 'ft_players denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_source_ids') is not null, 'ft_player_source_ids exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_source_ids')), 'ft_player_source_ids has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_source_ids' and policyname = 'ft_player_source_ids_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_source_ids' and policyname = 'ft_player_source_ids_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_source_ids has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_source_ids', 'select') and not has_table_privilege('authenticated', 'public.ft_player_source_ids', 'delete'), 'ft_player_source_ids denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_import_batches') is not null, 'ft_player_import_batches exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_import_batches')), 'ft_player_import_batches has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_import_batches' and policyname = 'ft_player_import_batches_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_import_batches' and policyname = 'ft_player_import_batches_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_import_batches has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_import_batches', 'select') and not has_table_privilege('authenticated', 'public.ft_player_import_batches', 'delete'), 'ft_player_import_batches denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_stat_source_records') is not null, 'ft_player_stat_source_records exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_stat_source_records')), 'ft_player_stat_source_records has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_source_records' and policyname = 'ft_player_stat_source_records_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_source_records' and policyname = 'ft_player_stat_source_records_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_stat_source_records has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_stat_source_records', 'select') and not has_table_privilege('authenticated', 'public.ft_player_stat_source_records', 'delete'), 'ft_player_stat_source_records denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_memberships') is not null, 'ft_player_memberships exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_memberships')), 'ft_player_memberships has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_memberships' and policyname = 'ft_player_memberships_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_memberships' and policyname = 'ft_player_memberships_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_memberships has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_memberships', 'select') and not has_table_privilege('authenticated', 'public.ft_player_memberships', 'delete'), 'ft_player_memberships denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_stats_current') is not null, 'ft_player_stats_current exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_stats_current')), 'ft_player_stats_current has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stats_current' and policyname = 'ft_player_stats_current_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stats_current' and policyname = 'ft_player_stats_current_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_stats_current has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_stats_current', 'select') and not has_table_privilege('authenticated', 'public.ft_player_stats_current', 'delete'), 'ft_player_stats_current denies anon SELECT and authenticated DELETE');

select ok(to_regclass('public.ft_player_stat_change_history') is not null, 'ft_player_stat_change_history exists');
select ok((select relrowsecurity from pg_class where oid = to_regclass('public.ft_player_stat_change_history')), 'ft_player_stat_change_history has RLS enabled');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_change_history' and policyname = 'ft_player_stat_change_history_select_own' and cmd = 'SELECT' and 'authenticated' = any(roles::text[]))
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_change_history' and policyname = 'ft_player_stat_change_history_insert_own' and cmd = 'INSERT' and 'authenticated' = any(roles::text[])),
  'ft_player_stat_change_history has authenticated owner SELECT and INSERT policies'
);
select ok(not has_table_privilege('anon', 'public.ft_player_stat_change_history', 'select') and not has_table_privilege('authenticated', 'public.ft_player_stat_change_history', 'delete'), 'ft_player_stat_change_history denies anon SELECT and authenticated DELETE');

select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_source_records' and cmd = 'UPDATE'),
  'source observations are append-only (no UPDATE policy)'
);
select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ft_player_stat_change_history' and cmd = 'UPDATE'),
  'change history is append-only (no UPDATE policy)'
);

select * from finish();
rollback;
