-- =====================================================================
-- XAFEARN — LOT 2 : notifications push sur le téléphone
-- À exécuter dans Supabase > SQL Editor (sans risque : ajoute 1 table + 2 fonctions).
-- =====================================================================

-- Un « jeton d'appareil » identifie un téléphone auprès de Firebase.
create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null unique,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Chacun ne voit que ses propres appareils. Aucune policy d'écriture : on n'écrit que via les
-- fonctions ci-dessous (et le serveur du site avec la clé service, qui contourne la RLS).
drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own" on public.device_tokens
  for select to authenticated using (user_id = auth.uid());

-- Enregistre (ou transfère) le téléphone au compte connecté.
-- Si quelqu'un se connecte avec un autre compte sur le même téléphone, le jeton change de propriétaire.
create or replace function public.register_device_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Non connecté'; end if;
  if p_token is null or length(p_token) < 20 then raise exception 'Jeton invalide'; end if;

  insert into public.device_tokens (user_id, token, platform)
  values (uid, p_token, coalesce(nullif(trim(p_platform), ''), 'android'))
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- Retire le téléphone (déconnexion) : seulement si le jeton appartient bien à l'appelant.
create or replace function public.unregister_device_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.device_tokens where token = p_token and user_id = auth.uid();
end;
$$;

revoke all on function public.register_device_token(text, text) from public, anon;
revoke all on function public.unregister_device_token(text)     from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;
grant execute on function public.unregister_device_token(text)     to authenticated;
