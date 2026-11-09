-- =====================================================================
-- XAFEARN — durcissement sécurité Supabase
-- À exécuter dans Supabase > SQL Editor, bloc par bloc.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- ÉTAPE 0 — AUDIT (lecture seule). Lance ces requêtes d'abord.
-- ─────────────────────────────────────────────────────────────────────

-- Tables SANS Row Level Security (rowsecurity = false  =>  accessible à tous avec la clé anon !)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;

-- Toutes les policies existantes (vérifie surtout profiles, withdrawals,
-- coin_withdrawals, ad_submissions, campaigns, treasures, messages, conversations)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- ─────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 — Fonction de clic WhatsApp : fixer le search_path
-- (une fonction SECURITY DEFINER sans search_path fixé est détournable)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.increment_whatsapp_click(tracking_id_param text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ad_submissions
  set whatsapp_clicks = coalesce(whatsapp_clicks, 0) + 1
  where tracking_id = tracking_id_param;
end;
$$;

revoke all on function public.increment_whatsapp_click(text) from public;
grant execute on function public.increment_whatsapp_click(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 — Empêcher un utilisateur de se promouvoir admin / se débloquer
-- Sans ça, si la policy "update own profile" est permissive, n'importe qui
-- peut faire:  update profiles set role='admin' where id = <son id>
-- (la clé anon est publique, dans l'APK). SÛR à exécuter maintenant :
-- l'app ne change que role = annonceur/diffuseur côté utilisateur.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- SQL Editor / service_role : pas d'utilisateur connecté => autorisé
  if auth.uid() is null then
    return new;
  end if;

  select (p.role = 'admin') or coalesce((to_jsonb(p) ->> 'is_admin')::boolean, false)
    into caller_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  if new.role is distinct from old.role and new.role not in ('annonceur', 'diffuseur') then
    raise exception 'Changement de rôle non autorisé';
  end if;

  if coalesce(to_jsonb(new) ->> 'is_admin', 'false') is distinct from coalesce(to_jsonb(old) ->> 'is_admin', 'false') then
    raise exception 'Modification de is_admin non autorisée';
  end if;

  if coalesce(to_jsonb(new) ->> 'is_blocked', 'false') is distinct from coalesce(to_jsonb(old) ->> 'is_blocked', 'false') then
    raise exception 'Modification de is_blocked non autorisée';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- ─────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 — SOLDES (balance / coins_balance)  ⚠️ NE PAS EXÉCUTER TOUT DE SUITE
-- Aujourd'hui l'app modifie directement balance et coins_balance depuis le
-- téléphone (retrait, achat de jetons, tâches). Donc un utilisateur peut
-- s'attribuer le solde qu'il veut avec la clé anon. La vraie correction est
-- de déplacer ces opérations dans des fonctions RPC (security definer) qui
-- valident tout côté serveur, PUIS d'activer le blocage ci-dessous.
-- Si tu l'actives avant la migration, retrait / jetons / tâches cesseront
-- de fonctionner.
--
-- create or replace function public.block_direct_balance_update()
-- returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   if auth.uid() is null then return new; end if;  -- RPC security definer / service_role
--   if current_setting('role', true) = 'authenticated'
--      and (new.balance is distinct from old.balance
--           or new.coins_balance is distinct from old.coins_balance) then
--     raise exception 'Modification directe du solde interdite';
--   end if;
--   return new;
-- end $$;
-- ⚠️ À adapter : les RPC existantes (send_coins, spin_wheel, request_coin_withdrawal,
-- activate_premium_account...) doivent passer ce contrôle (ex: variable de session
-- posée dans la RPC). On le fait ensemble une fois les règles métier fournies.
