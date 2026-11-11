-- Two-user ownership isolation and import lifecycle test.
-- Uses synthetic auth users and deterministic IDs inside one transaction.
-- The final ROLLBACK is mandatory: no test identities or rows are retained.

begin;

insert into auth.users (id, aud, role, email)
values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','ft-rls-user-a-rollback@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','ft-rls-user-b-rollback@example.invalid');

insert into public.ft_players (id,user_id,canonical_player_key,display_name)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111','test-a-player','Test Player A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','22222222-2222-4222-8222-222222222222','test-b-player','Test Player B');

insert into public.ft_player_source_ids
 (id,user_id,player_id,source_name,provider_player_id,verification_status,verified_at)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fixture','provider-a','verified',now()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','fixture','provider-b','verified',now());

insert into public.ft_player_import_batches
 (id,user_id,source_name,file_name,file_sha256,rows_seen,rows_accepted,rows_rejected,status)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','11111111-1111-4111-8111-111111111111','fixture','a.csv',repeat('a',64),1,1,0,'approved'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4','22222222-2222-4222-8222-222222222222','fixture','b.csv',repeat('b',64),1,1,0,'approved');

insert into public.ft_player_stat_source_records
 (id,user_id,player_id,source_name,season,competition_id,team_id,squad_level,statistics_scope,stats,collected_at,rights_status,permission_reference,import_batch_id,content_hash)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fixture','2026/27','PL','ARS','first_team','season','{"appearances":3,"goals":1}'::jsonb,now(),'approved','rollback-test-permission','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',repeat('c',64)),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','fixture','2026/27','PL','MUN','first_team','season','{"appearances":4,"goals":2}'::jsonb,now(),'approved','rollback-test-permission','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',repeat('d',64)),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fixture','2026/27','PL','ARS','first_team','competition','{"appearances":3,"goals":1}'::jsonb,now(),'approved','rollback-test-permission','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',repeat('e',64)),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','fixture','2026/27','PL','ARS','first_team','competition','{"appearances":3,"goals":1}'::jsonb,now(),'manual_review','pending-rights-review','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',repeat('f',64));

insert into public.ft_player_memberships
 (id,user_id,player_id,team_id,season,squad_level,source_name)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','ARS','2026/27','first_team','fixture'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','MUN','2026/27','first_team','fixture');

insert into public.ft_player_stats_current
 (id,user_id,player_id,season,competition_id,team_id,squad_level,statistics_scope,stats,selected_source_record_id)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026/27','PL','ARS','first_team','season','{"appearances":3,"goals":1}'::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','2026/27','PL','MUN','first_team','season','{"appearances":4,"goals":2}'::jsonb,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5');

insert into public.ft_player_stat_change_history
 (id,user_id,current_stat_id,source_record_id,previous_stats,new_stats,change_reason)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',null,'{"appearances":3,"goals":1}'::jsonb,'initial test observation'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',null,'{"appearances":4,"goals":2}'::jsonb,'initial test observation');

-- User A can see only A's records, cannot create/modify B's records,
-- and can complete the approved import lifecycle.
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
declare n bigint; affected bigint;
begin
 if auth.uid() <> '11111111-1111-4111-8111-111111111111'::uuid then raise exception 'A auth.uid mismatch'; end if;
 select count(*) into n from public.ft_players; if n <> 1 then raise exception 'A player isolation failed'; end if;
 select count(*) into n from public.ft_player_source_ids; if n <> 1 then raise exception 'A provider-ID isolation failed'; end if;
 select count(*) into n from public.ft_player_import_batches; if n <> 1 then raise exception 'A import-batch isolation failed'; end if;
 select count(*) into n from public.ft_player_stat_source_records; if n <> 3 then raise exception 'A source-record isolation failed'; end if;
 select count(*) into n from public.ft_player_memberships; if n <> 1 then raise exception 'A membership isolation failed'; end if;
 select count(*) into n from public.ft_player_stats_current; if n <> 1 then raise exception 'A current-stat isolation failed'; end if;
 select count(*) into n from public.ft_player_stat_change_history; if n <> 1 then raise exception 'A history isolation failed'; end if;
 select count(*) into n from public.ft_players where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
 if n <> 0 then raise exception 'A can read B player'; end if;

 begin
   insert into public.ft_players(user_id,canonical_player_key,display_name)
   values ('22222222-2222-4222-8222-222222222222','forged-a-to-b','forged');
   raise exception 'cross-user INSERT unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;

 update public.ft_players set display_name='unauthorized-change'
 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'A updated B player'; end if;

 begin
   update public.ft_players set user_id='22222222-2222-4222-8222-222222222222'
   where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
   raise exception 'owner transfer unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;

 if has_table_privilege('authenticated','public.ft_players','delete') then raise exception 'authenticated has DELETE'; end if;
 if has_table_privilege('authenticated','public.ft_player_stat_source_records','update') then raise exception 'source observations have UPDATE'; end if;
 if has_table_privilege('authenticated','public.ft_player_stat_change_history','update') then raise exception 'history has UPDATE'; end if;

 -- Import pipeline: canonical identity, provider ID, batch, immutable source row,
 -- reviewed current stat, and explicit history record in one transaction.
 insert into public.ft_players(id,user_id,canonical_player_key,display_name)
 values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1',auth.uid(),'test-import-player-a','Test Import Player A');
 insert into public.ft_player_source_ids(id,user_id,player_id,source_name,provider_player_id,verification_status,verified_at)
 values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2',auth.uid(),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','fixture-provider','fixture-player-001','verified',now());
 insert into public.ft_player_import_batches(id,user_id,source_name,file_name,file_sha256,rows_seen,rows_accepted,rows_rejected,status)
 values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3',auth.uid(),'fixture-provider','rollback-import.csv',repeat('1',64),1,1,0,'approved');
 insert into public.ft_player_stat_source_records
 (id,user_id,player_id,source_name,season,competition_id,team_id,squad_level,statistics_scope,stats,source_url,collected_at,rights_status,permission_reference,import_batch_id,content_hash)
 values
 ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4',auth.uid(),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','fixture-provider','2026/27','PL','ARS','first_team','season','{"appearances":5,"starts":4,"minutes":360,"goals":2,"assists":1}'::jsonb,'https://example.invalid/source',now(),'approved','rollback-test-permission-approval','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',repeat('2',64));
 insert into public.ft_player_stats_current
 (id,user_id,player_id,season,competition_id,team_id,squad_level,statistics_scope,stats,selected_source_record_id,verification_status)
 values
 ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5',auth.uid(),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','2026/27','PL','ARS','first_team','season','{"appearances":5,"starts":4,"minutes":360,"goals":2,"assists":1}'::jsonb,'cccccccc-cccc-4ccc-8ccc-ccccccccccc4','verified');
 insert into public.ft_player_stat_change_history
 (id,user_id,current_stat_id,source_record_id,previous_stats,new_stats,change_reason)
 values
 ('cccccccc-cccc-4ccc-8ccc-ccccccccccc6',auth.uid(),'cccccccc-cccc-4ccc-8ccc-ccccccccccc5','cccccccc-cccc-4ccc-8ccc-ccccccccccc4',null,'{"appearances":5,"starts":4,"minutes":360,"goals":2,"assists":1}'::jsonb,'end-to-end rollback import test');

 select count(*) into n from public.ft_player_stats_current where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc5';
 if n <> 1 then raise exception 'approved source did not create current stat'; end if;
 select count(*) into n from public.ft_player_stat_change_history where current_stat_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc5';
 if n <> 1 then raise exception 'history record was not created'; end if;

 begin
   insert into public.ft_player_stats_current
   (user_id,player_id,season,competition_id,team_id,squad_level,statistics_scope,stats,selected_source_record_id)
   values
   (auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','2026/27','PL','ARS','first_team','competition','{"appearances":3,"goals":1}'::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6');
   raise exception 'manual_review source unexpectedly accepted as current stats';
 exception when insufficient_privilege then null;
 end;
end $$;

reset role;

-- User B independently sees only B's records and cannot update A's player.
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$
declare n bigint; affected bigint;
begin
 if auth.uid() <> '22222222-2222-4222-8222-222222222222'::uuid then raise exception 'B auth.uid mismatch'; end if;
 select count(*) into n from public.ft_players; if n <> 1 then raise exception 'B player isolation failed'; end if;
 select count(*) into n from public.ft_player_source_ids; if n <> 1 then raise exception 'B provider-ID isolation failed'; end if;
 select count(*) into n from public.ft_player_import_batches; if n <> 1 then raise exception 'B import-batch isolation failed'; end if;
 select count(*) into n from public.ft_player_stat_source_records; if n <> 1 then raise exception 'B source-record isolation failed'; end if;
 select count(*) into n from public.ft_player_memberships; if n <> 1 then raise exception 'B membership isolation failed'; end if;
 select count(*) into n from public.ft_player_stats_current; if n <> 1 then raise exception 'B current-stat isolation failed'; end if;
 select count(*) into n from public.ft_player_stat_change_history; if n <> 1 then raise exception 'B history isolation failed'; end if;
 update public.ft_players set display_name='unauthorized-change'
 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'B updated A player'; end if;
end $$;

rollback;
