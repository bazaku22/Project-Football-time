-- Phase 5.6: private one-time squad previews and owner-scoped uniqueness.
create table if not exists public.player_sync_previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'strikerapi',
  status text not null default 'preview',
  payload jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  consumed_at timestamptz
);
alter table public.player_sync_previews enable row level security;
create policy "player_sync_previews_select_own" on public.player_sync_previews for select to authenticated using ((select auth.uid()) = user_id);
create policy "player_sync_previews_insert_own" on public.player_sync_previews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "player_sync_previews_update_own" on public.player_sync_previews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.player_records drop constraint if exists player_records_provider_provider_player_id_league_id_team_i_key;
