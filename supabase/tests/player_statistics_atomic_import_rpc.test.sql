-- Atomic RPC behavior, owner isolation, and all-or-nothing rollback.
-- All synthetic rows and users are rolled back.
begin;
insert into auth.users (id,aud,role,email) values
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated','ft-rpc-user-a@example.invalid'),
 ('44444444-4444-4444-8444-444444444444','authenticated','authenticated','ft-rpc-user-b@example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

do $$
declare result jsonb; n bigint;
begin
 result := public.import_player_statistics_batch(
  'fixture-provider','player-batch.csv',repeat('a',64),
  '[{
    "canonical_player_key":"rpc-player-a","display_name":"RPC Test Player",
    "provider_player_id":"provider-1001","identity_verified":true,
    "rights_reviewed":true,"rights_status":"approved","season":"2026/27",
    "competition_id":"PL","team_id":"ARS","squad_level":"first_team",
    "statistics_scope":"season",
    "stats":{"appearances":8,"starts":6,"minutes":540,"goals":2,"assists":1,"xg":1.25,"xa":0.5},
    "collected_at":"2026-11-12T09:00:00Z","permission_reference":"test-only-reviewed-rights",
    "content_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "source_record_key":"provider-row-1001","source_url":"https://example.invalid/player/1001",
    "change_reason":"initial import test",
    "membership":{"team_id":"ARS","season":"2026/27","squad_level":"first_team","source_record_key":"squad-row-1001"}
  }]'::jsonb
 );
 if result->>'status' <> 'committed' or (result->>'rows_accepted')::int <> 1 then raise exception 'valid import failed: %',result; end if;
 select count(*) into n from public.ft_players where canonical_player_key='rpc-player-a';
 if n<>1 then raise exception 'canonical player missing'; end if;
 select count(*) into n from public.ft_player_source_ids where provider_player_id='provider-1001' and verification_status='verified';
 if n<>1 then raise exception 'provider identity missing'; end if;
 select count(*) into n from public.ft_player_import_batches where status='committed' and rows_accepted=1;
 if n<>1 then raise exception 'batch metadata incorrect'; end if;
 select count(*) into n from public.ft_player_stat_source_records where content_hash=repeat('b',64);
 if n<>1 then raise exception 'immutable source observation missing'; end if;
 select count(*) into n from public.ft_player_memberships where player_id=(select id from public.ft_players where canonical_player_key='rpc-player-a');
 if n<>1 then raise exception 'membership missing'; end if;
 select count(*) into n from public.ft_player_stats_current where player_id=(select id from public.ft_players where canonical_player_key='rpc-player-a') and verification_status='pending';
 if n<>1 then raise exception 'current stats must remain pending review'; end if;
 select count(*) into n from public.ft_player_stat_change_history h join public.ft_player_stats_current c on c.id=h.current_stat_id where c.player_id=(select id from public.ft_players where canonical_player_key='rpc-player-a');
 if n<>1 then raise exception 'change history missing'; end if;

 begin
  perform public.import_player_statistics_batch(
   'fixture-provider','must-rollback.csv',repeat('c',64),
   '[
    {"canonical_player_key":"rollback-first","display_name":"Rollback First","provider_player_id":"rollback-1",
     "identity_verified":true,"rights_reviewed":true,"rights_status":"approved","season":"2026/27",
     "competition_id":"PL","team_id":"ARS","squad_level":"first_team","statistics_scope":"season",
     "stats":{"appearances":1,"goals":0},"collected_at":"2026-11-12T09:00:00Z",
     "permission_reference":"test-rights","content_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
     "membership":{"team_id":"ARS","season":"2026/27","squad_level":"first_team"}},
    {"canonical_player_key":"rollback-second","display_name":"Rollback Second","provider_player_id":"rollback-2",
     "identity_verified":true,"rights_reviewed":true,"rights_status":"manual_review","season":"2026/27",
     "competition_id":"PL","team_id":"ARS","squad_level":"first_team","statistics_scope":"season",
     "stats":{"appearances":1},"collected_at":"2026-11-12T09:00:00Z",
     "permission_reference":"pending-rights","content_hash":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
     "membership":{"team_id":"ARS","season":"2026/27","squad_level":"first_team"}}
   ]'::jsonb
  );
  raise exception 'invalid batch unexpectedly committed';
 exception when sqlstate '22023' then null;
 end;
 select count(*) into n from public.ft_players where canonical_player_key in ('rollback-first','rollback-second');
 if n<>0 then raise exception 'failed batch left player records'; end if;
 select count(*) into n from public.ft_player_import_batches where file_name='must-rollback.csv';
 if n<>0 then raise exception 'failed batch left batch record'; end if;
 select count(*) into n from public.ft_player_stat_source_records where content_hash in (repeat('d',64),repeat('e',64));
 if n<>0 then raise exception 'failed batch left source observations'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
do $$ declare n bigint; begin
 select count(*) into n from public.ft_players;
 if n<>0 then raise exception 'second user can read first user records'; end if;
end $$;

do $$
begin
 if has_table_privilege('authenticated','public.ft_players','insert') then raise exception 'direct INSERT still granted'; end if;
 if has_table_privilege('authenticated','public.ft_player_stats_current','update') then raise exception 'direct UPDATE still granted'; end if;
end $$;
rollback;
