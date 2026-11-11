-- =====================================================================
-- XAFEARN — LOT 3 : verrouillage des fonctions sensibles
-- À exécuter dans Supabase > SQL Editor (tout le fichier d'un coup).
--
-- Ce que ça corrige (constaté dans ta base) :
--   1. request_coin_withdrawal(p_user_id, …) : n'importe quel utilisateur pouvait vider les jetons d'un AUTRE
--      en passant son identifiant, et deux appels simultanés pouvaient retirer deux fois les mêmes jetons.
--   2. Taux de retrait : 1 jeton = 5 FCFA alors qu'on achète 800 jetons pour 1000 FCFA (1,25 FCFA / jeton) :
--      acheter puis retirer multipliait l'argent par 4. Aligné sur la règle du site : 1 jeton = 0,60 FCFA.
--      → Pour changer le taux : modifie « v_rate » plus bas (une seule ligne).
--   3. handle_leekpay_payment(…) : fonction qui CRÉDITE de l'argent, appelable par n'importe quel utilisateur connecté.
--      Elle n'est utilisée que par le serveur du site : on la réserve au serveur.
--   4. activate_premium_account(p_user_id) : un utilisateur ne peut plus activer/débiter un autre compte
--      (les admins et le serveur gardent ce droit).
--   5. Fonctions admin_* : plus appelables sans être connecté.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1) RETRAIT DE JETONS (même signature qu'avant : l'app et le site continuent de fonctionner)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.request_coin_withdrawal(p_user_id uuid, p_coins integer, p_method text, p_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  uid           uuid := auth.uid();
  v_coins       integer;
  v_fcfa        integer;
  v_phone       text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_rate        constant numeric := 0.60;   -- 1 jeton = 0,60 FCFA (règle du site). Modifier ici si besoin.
  v_min_coins   constant integer := 100;
  v_withdrawal  text;
begin
  -- Le retrait ne peut concerner que le compte de la personne connectée
  if uid is null or p_user_id is distinct from uid then
    return json_build_object('success', false, 'error', 'Action non autorisée.');
  end if;

  if p_coins is null or p_coins < v_min_coins then
    return json_build_object('success', false, 'error', 'Minimum ' || v_min_coins || ' jetons pour retirer.');
  end if;
  if p_coins > 100000000 then
    return json_build_object('success', false, 'error', 'Montant trop élevé.');
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    return json_build_object('success', false, 'error', 'Numéro de téléphone invalide.');
  end if;
  if length(trim(coalesce(p_method, ''))) < 2 or length(p_method) > 50 then
    return json_build_object('success', false, 'error', 'Moyen de retrait invalide.');
  end if;

  -- Verrou sur le profil : deux demandes simultanées ne peuvent plus utiliser les mêmes jetons
  select coins_balance into v_coins from public.profiles where id = uid for update;
  if v_coins is null then
    return json_build_object('success', false, 'error', 'Utilisateur introuvable.');
  end if;
  if v_coins < p_coins then
    return json_build_object('success', false, 'error', 'Solde de jetons insuffisant.');
  end if;

  v_fcfa := floor(p_coins * v_rate)::integer;

  insert into public.withdrawals (user_id, amount, method, phone, status, type)
  values (uid, v_fcfa, trim(p_method), v_phone, 'pending', 'coins_exchange')
  returning id::text into v_withdrawal;

  update public.profiles set coins_balance = coins_balance - p_coins where id = uid;

  insert into public.notifications (user_id, title, message, link)
  values (uid, 'Demande de retrait envoyée',
          'Ta demande de ' || v_fcfa || ' FCFA est en cours de traitement.', '/dashboard/historique');

  return json_build_object('success', true, 'fcfa_amount', v_fcfa, 'withdrawal_id', v_withdrawal);
exception when others then
  raise warning 'request_coin_withdrawal: %', sqlerrm;   -- le détail reste dans les logs, pas chez l'utilisateur
  return json_build_object('success', false, 'error', 'Une erreur est survenue. Réessaie.');
end;
$function$;

revoke all on function public.request_coin_withdrawal(uuid, integer, text, text) from public, anon;
grant execute on function public.request_coin_withdrawal(uuid, integer, text, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 2) handle_leekpay_payment : réservée au serveur (clé service)
-- ─────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'handle_leekpay_payment'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    raise notice 'Verrouillée : %', r.sig;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 3) activate_premium_account(p_user_id uuid) : on l'enveloppe d'un contrôle d'identité
--    (renommée en « _inner », inaccessible aux utilisateurs ; les appels existants passent par l'enveloppe)
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_oid  oid;
  v_ret  text;
  v_body text;
  v_check constant text := $c$
    if auth.uid() is not null
       and auth.uid() <> p_user_id
       and not exists (select 1 from public.profiles p
                       where p.id = auth.uid()
                         and (p.role = 'admin' or coalesce((to_jsonb(p) ->> 'is_admin')::boolean, false)))
    then
      raise exception 'Action non autorisée';
    end if;
  $c$;
begin
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'activate_premium_account_inner') then
    raise notice 'activate_premium_account déjà protégée : rien à faire';
    return;
  end if;

  select p.oid, pg_get_function_result(p.oid) into v_oid, v_ret
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname = 'activate_premium_account'
    and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
  limit 1;

  if v_oid is null then
    raise notice 'activate_premium_account(p_user_id uuid) introuvable : étape ignorée';
    return;
  end if;

  execute 'alter function public.activate_premium_account(uuid) rename to activate_premium_account_inner';
  execute 'revoke all on function public.activate_premium_account_inner(uuid) from public, anon, authenticated';

  if v_ret = 'void' then
    v_body := 'perform public.activate_premium_account_inner(p_user_id);';
  else
    v_body := 'return public.activate_premium_account_inner(p_user_id);';
  end if;

  execute format(
    'create function public.activate_premium_account(p_user_id uuid) returns %s language plpgsql security definer set search_path = public as $w$ begin %s %s end $w$',
    v_ret, v_check, v_body);

  execute 'revoke all on function public.activate_premium_account(uuid) from public, anon';
  execute 'grant execute on function public.activate_premium_account(uuid) to authenticated';
  raise notice 'activate_premium_account protégée';
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 4) Fonctions admin_* : jamais appelables sans être connecté
-- ─────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 5) AUDIT (lecture seule) : fonctions qui ne vérifient pas qui les appelle
--    Lance cette requête seule et envoie-moi le résultat : je m'occupe des lignes « false ».
-- ─────────────────────────────────────────────────────────────────────
-- select p.proname                                            as fonction,
--        pg_get_function_identity_arguments(p.oid)            as arguments,
--        p.prosecdef                                          as security_definer,
--        position('auth.uid' in pg_get_functiondef(p.oid)) > 0 as verifie_auth_uid,
--        has_function_privilege('anon', p.oid, 'execute')     as anon_peut_executer
-- from pg_proc p
-- where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prosecdef
-- order by verifie_auth_uid, p.proname;
