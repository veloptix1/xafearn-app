-- =====================================================================
-- XAFEARN — LOT 2 : paiements configurables + création sécurisée des campagnes
-- À exécuter dans Supabase > SQL Editor (sans risque : ajoute 3 fonctions).
--
--   • get_payment_settings()         : réglages de paiement lisibles par les utilisateurs connectés
--                                      (sans exposer le reste de la table app_settings)
--   • admin_set_payment_settings()   : modification réservée aux admins (lien SoleasPay, activer/désactiver…)
--   • create_campaign()              : création d'une campagne payée avec le solde, budget recalculé côté serveur
--                                      (1,92 FCFA par vue, minimum 300 vues)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1) RÉGLAGES DE PAIEMENT (lecture)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.get_payment_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'provider',         coalesce((select value from public.app_settings where key = 'payment_provider'), 'leekpay'),
    'leekpay_enabled',  coalesce((select value from public.app_settings where key = 'leekpay_enabled'), 'true') = 'true',
    'soleaspay_enabled',coalesce((select value from public.app_settings where key = 'soleaspay_enabled'), 'false') = 'true',
    'soleaspay_link',   coalesce((select value from public.app_settings where key = 'soleaspay_payment_link'), ''),
    'activation_price', coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'activation_price'), 2000)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2) RÉGLAGES DE PAIEMENT (écriture, admin uniquement)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.admin_set_payment_settings(
  p_provider        text,
  p_soleas_link     text,
  p_leek_enabled    boolean,
  p_soleas_enabled  boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  is_admin boolean;
  v_link   text := trim(coalesce(p_soleas_link, ''));
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;

  select (p.role = 'admin') or coalesce((to_jsonb(p) ->> 'is_admin')::boolean, false)
    into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then
    return jsonb_build_object('success', false, 'error', 'Accès réservé aux administrateurs');
  end if;

  if p_provider not in ('leekpay', 'soleaspay', 'manual', 'disabled') then
    return jsonb_build_object('success', false, 'error', 'Fournisseur invalide');
  end if;

  -- Un lien de paiement doit être une adresse https (pas de javascript:, pas de http non chiffré)
  if v_link <> '' and v_link !~* '^https://[^\s]+$' then
    return jsonb_build_object('success', false, 'error', 'Le lien doit commencer par https://');
  end if;
  if length(v_link) > 500 then
    return jsonb_build_object('success', false, 'error', 'Lien trop long');
  end if;

  insert into public.app_settings (key, value, updated_at) values
    ('payment_provider',       p_provider,                                  now()),
    ('soleaspay_payment_link', v_link,                                      now()),
    ('leekpay_enabled',        case when p_leek_enabled   then 'true' else 'false' end, now()),
    ('soleaspay_enabled',      case when p_soleas_enabled then 'true' else 'false' end, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  return jsonb_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3) CRÉATION D'UNE CAMPAGNE (payée avec le solde)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.create_campaign(
  p_title        text,
  p_description  text,
  p_image_url    text,
  p_price        numeric,
  p_sector       text,
  p_country      text,
  p_city         text,
  p_neighborhood text,
  p_whatsapp     text,
  p_views        integer,
  p_is_flash     boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid            uuid := auth.uid();
  p              record;
  price_per_view constant numeric := 1.92;
  min_views      constant integer := 300;
  v_budget       numeric;
  v_balance      numeric;
  v_id           text;
  v_whatsapp     text := regexp_replace(coalesce(p_whatsapp, ''), '\s', '', 'g');
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Non connecté');
  end if;

  if length(trim(coalesce(p_title, ''))) < 3 or length(p_title) > 120 then
    return jsonb_build_object('success', false, 'error', 'Titre invalide (3 à 120 caractères).');
  end if;
  if length(coalesce(p_description, '')) > 2000 then
    return jsonb_build_object('success', false, 'error', 'Description trop longue.');
  end if;
  if p_price is null or p_price < 0 or p_price > 100000000 then
    return jsonb_build_object('success', false, 'error', 'Prix invalide.');
  end if;
  if v_whatsapp <> '' and v_whatsapp !~ '^\+?[0-9]{6,20}$' then
    return jsonb_build_object('success', false, 'error', 'Numéro WhatsApp invalide.');
  end if;
  if p_image_url is not null and p_image_url !~* '^https://' then
    return jsonb_build_object('success', false, 'error', 'Image invalide.');
  end if;
  if p_views is null or p_views < min_views then
    return jsonb_build_object('success', false, 'error', 'Le nombre de vues minimum est de ' || min_views || '.');
  end if;
  if p_views > 10000000 then
    return jsonb_build_object('success', false, 'error', 'Nombre de vues trop élevé.');
  end if;

  v_budget := round(p_views * price_per_view, 2);   -- calculé ici : le client ne choisit plus le prix

  select id, balance into p from public.profiles where id = uid for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Profil introuvable');
  end if;

  if coalesce(p.balance, 0) < v_budget then
    return jsonb_build_object('success', false,
      'error', 'Solde insuffisant. Il te faut ' || round(v_budget)::bigint || ' FCFA.');
  end if;

  insert into public.campaigns
    (user_id, title, description, image_url, price, sector, country, city, neighborhood,
     whatsapp, views_purchased, budget, is_flash, status, expires_at)
  values
    (uid, trim(p_title), trim(coalesce(p_description, '')), p_image_url, p_price, p_sector, p_country, p_city,
     p_neighborhood, v_whatsapp, p_views, v_budget, coalesce(p_is_flash, false), 'pending',
     case when coalesce(p_is_flash, false) then now() + interval '2 hours' else null end)
  returning id::text into v_id;

  update public.profiles set balance = balance - v_budget where id = uid returning balance into v_balance;

  insert into public.notifications (user_id, title, message, link)
  values (uid, 'Campagne créée 📢',
          'Ta campagne "' || trim(p_title) || '" est en attente de validation.', '/dashboard/annonces');

  return jsonb_build_object('success', true, 'campaign_id', v_id, 'budget', v_budget, 'new_balance', v_balance);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- DROITS
-- ─────────────────────────────────────────────────────────────────────
revoke all on function public.get_payment_settings()                                         from public, anon;
revoke all on function public.admin_set_payment_settings(text, text, boolean, boolean)       from public, anon;
revoke all on function public.create_campaign(text,text,text,numeric,text,text,text,text,text,integer,boolean) from public, anon;

grant execute on function public.get_payment_settings()                                         to authenticated;
grant execute on function public.admin_set_payment_settings(text, text, boolean, boolean)       to authenticated;
grant execute on function public.create_campaign(text,text,text,numeric,text,text,text,text,text,integer,boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- RECOMMANDÉ ensuite (RLS de app_settings) : les utilisateurs ne doivent pas pouvoir écrire dans cette table.
--   alter table public.app_settings enable row level security;
--   (garde seulement une policy SELECT ; l'écriture passe par admin_set_payment_settings)
-- ─────────────────────────────────────────────────────────────────────
