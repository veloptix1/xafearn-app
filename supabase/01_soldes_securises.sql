-- =====================================================================
-- XAFEARN — LOT 1 : opérations d'argent exécutées côté serveur
-- À exécuter dans Supabase > SQL Editor (tout le fichier d'un coup).
--
-- Ce fichier est SANS RISQUE pour l'existant : il ajoute seulement 4 fonctions.
-- Ordre conseillé :   1) exécuter ce fichier    2) pousser la nouvelle version de l'app.
--
-- Règles reprises du code actuel :
--   • Bonus quotidien : 50 jetons / jour, comptes Premium uniquement
--   • Retrait FCFA   : frais 5 %, minimum 2000 (niveau 1) / 1000 (niveau 2) / 500 (niveau 3)
--   • Achat de jetons: 800 jetons pour 1000 FCFA, minimum 100 FCFA
--   • Coffres        : 3 essais max, gains par rang selon le palier
--                      diamant 40/25/15/10/10 % · or 50/30/20 % · argent 70/30 % · autre 100 %
--
-- VÉRIFICATION PRÉALABLE (facultative) : le type de l'identifiant des coffres.
--   select data_type from information_schema.columns
--   where table_schema='public' and table_name='treasures' and column_name='id';
--   → si ce n'est PAS « uuid », remplace « uuid » par ce type dans claim_treasure ci-dessous.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1) BONUS QUOTIDIEN
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  p     record;
  today date := (now() at time zone 'utc')::date;
  bonus constant int := 50;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;

  select id, is_premium, coins_balance into p
  from public.profiles where id = uid for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profil introuvable');
  end if;

  if not coalesce(p.is_premium, false) then
    return jsonb_build_object('success', false, 'error', 'Bonus réservé aux comptes Premium.');
  end if;

  if exists (select 1 from public.daily_bonus_claims where user_id = uid and claim_date = today) then
    return jsonb_build_object('success', false, 'error', 'Bonus déjà réclamé aujourd''hui.');
  end if;

  insert into public.daily_bonus_claims (user_id, claim_date) values (uid, today);
  update public.profiles set coins_balance = coalesce(coins_balance, 0) + bonus where id = uid;

  return jsonb_build_object('success', true, 'coins', bonus,
                            'new_balance', coalesce(p.coins_balance, 0) + bonus);
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 2) DEMANDE DE RETRAIT (FCFA)  — débit + demande + notification, atomiques
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.request_withdrawal(
  p_amount    numeric,
  p_country   text,
  p_operator  text,
  p_phone     text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid        uuid := auth.uid();
  p          record;
  fee_rate   constant numeric := 0.05;
  min_amount numeric;
  v_fee      numeric;
  v_net      numeric;
  v_phone    text;
  v_balance  numeric;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;

  select id, balance, level into p from public.profiles where id = uid for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Profil introuvable');
  end if;

  min_amount := case coalesce(p.level, 1) when 3 then 500 when 2 then 1000 else 2000 end;

  if p_amount is null or p_amount < min_amount then
    return jsonb_build_object('success', false,
      'error', 'Le montant minimum pour ton niveau est de ' || min_amount::int || ' FCFA.');
  end if;

  if p_amount > coalesce(p.balance, 0) then
    return jsonb_build_object('success', false, 'error', 'Ton solde est insuffisant.');
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  if v_phone !~ '^[0-9]{8,15}$' then
    return jsonb_build_object('success', false, 'error', 'Numéro de téléphone invalide.');
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then
    return jsonb_build_object('success', false, 'error', 'Nom complet invalide.');
  end if;

  v_fee := round(p_amount * fee_rate, 2);
  v_net := p_amount - v_fee;

  update public.profiles set balance = balance - p_amount where id = uid
  returning balance into v_balance;

  insert into public.withdrawals
    (user_id, amount, fee, net_amount, country, operator, phone_number, full_name, status)
  values
    (uid, p_amount, v_fee, v_net, p_country, p_operator, v_phone, trim(p_full_name), 'pending');

  insert into public.notifications (user_id, title, message, link)
  values (uid, 'Demande de retrait',
          'Ta demande de retrait de ' || p_amount::bigint || ' FCFA a été envoyée. Tu recevras '
          || round(v_net)::bigint || ' FCFA sous 72h.',
          '/dashboard/historique');

  return jsonb_build_object('success', true, 'fee', v_fee, 'net', v_net, 'new_balance', v_balance);
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 3) ACHAT DE JETONS AVEC LE SOLDE FCFA
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.buy_coins_with_balance(p_fcfa integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid            uuid := auth.uid();
  p              record;
  coins          integer;
  v_balance      numeric;
  v_coins        integer;
  min_fcfa       constant integer := 100;
  coins_per_1000 constant integer := 800;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;

  if p_fcfa is null or p_fcfa < min_fcfa then
    return jsonb_build_object('success', false, 'error', 'Le minimum est de ' || min_fcfa || ' FCFA.');
  end if;

  coins := floor(p_fcfa::numeric / 1000 * coins_per_1000)::integer;

  select id, balance into p from public.profiles where id = uid for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Profil introuvable');
  end if;

  if coalesce(p.balance, 0) < p_fcfa then
    return jsonb_build_object('success', false, 'error', 'Solde FCFA insuffisant.');
  end if;

  update public.profiles
     set balance = balance - p_fcfa,
         coins_balance = coalesce(coins_balance, 0) + coins
   where id = uid
  returning balance, coins_balance into v_balance, v_coins;

  return jsonb_build_object('success', true, 'coins', coins,
                            'new_balance', v_balance, 'new_coins', v_coins);
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 4) OUVERTURE D'UN COFFRE (remplace l'appel à /api/treasures/claim, qui ne
--    pouvait pas identifier l'utilisateur depuis l'app mobile)
--    Le verrou « for update » sur le coffre garantit un rang unique par gagnant.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.claim_treasure(p_treasure_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid        uuid := auth.uid();
  t          record;
  v_attempts integer;
  v_code     text := upper(trim(coalesce(p_code, '')));
  v_correct  boolean;
  v_rank     integer;
  pct        numeric[];
  v_prize    numeric;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;
  if v_code = '' then
    return jsonb_build_object('success', false, 'error', 'Données manquantes');
  end if;

  select * into t from public.treasures where id = p_treasure_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Coffre introuvable');
  end if;

  if t.status <> 'active' or (t.expires_at is not null and t.expires_at < now()) then
    return jsonb_build_object('success', false, 'error', 'Ce coffre est déjà terminé ou expiré.');
  end if;

  if exists (select 1 from public.treasure_winners where treasure_id = t.id and user_id = uid) then
    return jsonb_build_object('success', false, 'error', 'Tu as déjà gagné ce coffre !');
  end if;

  select count(*) into v_attempts
  from public.treasure_attempts where treasure_id = t.id and user_id = uid;

  if v_attempts >= 3 then
    return jsonb_build_object('success', false,
      'error', 'Tu as atteint la limite de 3 tentatives pour ce coffre.');
  end if;

  v_correct := (v_code = upper(coalesce(t.secret_code, '')));

  insert into public.treasure_attempts (treasure_id, user_id, code_entered, is_correct)
  values (t.id, uid, v_code, v_correct);

  if not v_correct then
    return jsonb_build_object('success', false,
      'error', 'Code incorrect. Il te reste ' || (2 - v_attempts) || ' tentative(s).');
  end if;

  pct := case t.tier
    when 'diamant' then array[0.40, 0.25, 0.15, 0.10, 0.10]
    when 'or'      then array[0.50, 0.30, 0.20]
    when 'argent'  then array[0.70, 0.30]
    else                array[1.00]
  end;

  select count(*) + 1 into v_rank from public.treasure_winners where treasure_id = t.id;

  if v_rank > array_length(pct, 1) then
    return jsonb_build_object('success', false, 'error', 'Trop tard, tous les lots ont été distribués !');
  end if;

  v_prize := t.prize_pool * pct[v_rank];

  update public.profiles set balance = coalesce(balance, 0) + v_prize where id = uid;

  insert into public.treasure_winners (treasure_id, user_id, rank, prize_amount)
  values (t.id, uid, v_rank, v_prize);

  if v_rank = array_length(pct, 1) then
    update public.treasures set status = 'completed' where id = t.id;
  end if;

  insert into public.notifications (user_id, title, message, link)
  values (uid, 'Trésor trouvé ! 🏆',
          'Félicitations ! Tu as trouvé le code du coffre de ' || coalesce(t.sponsor_name, '')
          || '. Tu as gagné ' || to_char(v_prize, 'FM999999990.00') || ' FCFA (Rang ' || v_rank || ').',
          '/dashboard/coffres');

  return jsonb_build_object('success', true, 'prize', v_prize, 'rank', v_rank,
    'message', 'Bravo ! Tu es le gagnant n°' || v_rank || '. Tu remportes '
               || to_char(v_prize, 'FM999999990.00') || ' FCFA.');
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- DROITS : seuls les utilisateurs connectés peuvent appeler ces fonctions
-- ─────────────────────────────────────────────────────────────────────
revoke all on function public.claim_daily_bonus()                                    from public, anon;
revoke all on function public.request_withdrawal(numeric, text, text, text, text)   from public, anon;
revoke all on function public.buy_coins_with_balance(integer)                        from public, anon;
revoke all on function public.claim_treasure(uuid, text)                             from public, anon;

grant execute on function public.claim_daily_bonus()                                    to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text, text, text)   to authenticated;
grant execute on function public.buy_coins_with_balance(integer)                        to authenticated;
grant execute on function public.claim_treasure(uuid, text)                             to authenticated;
