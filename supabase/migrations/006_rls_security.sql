-- =====================================================================
-- Migration 006 : sécurité (RLS + gardes anti-escalade de privilèges)
-- À exécuter APRÈS 001 → 005, dans le SQL Editor de Supabase.
-- Idempotente : peut être relancée sans erreur.
--
-- Principe :
--  * Le client (clé anon / utilisateur connecté) ne peut PAS créer de
--    commandes, de transactions, ni modifier un solde : ces écritures
--    passeront par des routes serveur (clé service role, qui contourne la RLS).
--  * Dans le SQL Editor, auth.uid() est NULL : vous gardez tous les droits
--    (ex. promouvoir un admin à la main).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_approved_seller()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller' and seller_status = 'approved'
  );
$$;

create or replace function public.owns_stream(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.live_streams where id = sid and seller_id = auth.uid());
$$;

create or replace function public.owns_product(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.products where id = pid and seller_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 1. Gardes (triggers) : empêchent un utilisateur de s'auto-promouvoir
-- ---------------------------------------------------------------------

-- 1a. profiles : impossible de se mettre admin / vérifié / gonfler ses stats
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- SQL Editor / service role / mise à jour par un autre trigger / admin
  if auth.uid() is null or pg_trigger_depth() > 1 or public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Modification de l''identifiant interdite';
  end if;

  if new.is_verified     is distinct from old.is_verified
  or new.followers_count is distinct from old.followers_count
  or new.following_count is distinct from old.following_count
  or new.fan_points      is distinct from old.fan_points
  or new.fan_level_id    is distinct from old.fan_level_id then
    raise exception 'Champ protégé : modification interdite';
  end if;

  -- Seule transition de rôle permise : acheteur -> vendeur en attente (onboarding)
  if new.role is distinct from old.role then
    if not (old.role = 'buyer' and new.role = 'seller' and new.seller_status = 'pending') then
      raise exception 'Changement de rôle interdit';
    end if;
  end if;

  -- Seule transition de statut permise : (none|rejected) -> pending
  if new.seller_status is distinct from old.seller_status then
    if not (new.seller_status = 'pending' and old.seller_status in ('none', 'rejected')) then
      raise exception 'Changement de statut vendeur interdit';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- 1b. orders : seuls le statut / suivi / adresse peuvent changer côté client
create or replace function public.guard_order_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.buyer_id       is distinct from old.buyer_id
  or new.seller_id      is distinct from old.seller_id
  or new.stream_id      is distinct from old.stream_id
  or new.product_id     is distinct from old.product_id
  or new.quantity       is distinct from old.quantity
  or new.unit_price     is distinct from old.unit_price
  or new.total_amount   is distinct from old.total_amount
  or new.currency       is distinct from old.currency
  or new.escrow_status  is distinct from old.escrow_status then
    raise exception 'Champ de commande protégé';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() = old.seller_id and (
         (old.status = 'paid' and new.status = 'shipped')
      or (old.status in ('pending', 'paid') and new.status = 'cancelled')
    ) then
      return new;
    elsif auth.uid() = old.buyer_id and (
         (old.status = 'shipped' and new.status = 'delivered')
      or (old.status in ('shipped', 'delivered') and new.status = 'disputed')
      or (old.status = 'pending' and new.status = 'cancelled')
    ) then
      return new;
    else
      raise exception 'Transition de statut de commande interdite';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists guard_order_update on public.orders;
create trigger guard_order_update
  before update on public.orders
  for each row execute function public.guard_order_update();

-- ---------------------------------------------------------------------
-- 2. Activer la RLS sur toutes les tables restantes
-- ---------------------------------------------------------------------
alter table public.categories            enable row level security;
alter table public.gifts                 enable row level security;
alter table public.fan_levels            enable row level security;
alter table public.flash_deals           enable row level security;
alter table public.wishlists             enable row level security;
alter table public.live_battles          enable row level security;
alter table public.orders                enable row level security;
alter table public.product_ratings       enable row level security;
alter table public.affiliates            enable row level security;
alter table public.referrals             enable row level security;
alter table public.viewing_streaks       enable row level security;
alter table public.live_clips            enable row level security;
alter table public.stories               enable row level security;
alter table public.stream_leaderboard    enable row level security;
alter table public.notifications         enable row level security;
alter table public.payment_methods       enable row level security;
alter table public.gift_packs            enable row level security;
alter table public.delivery_points       enable row level security;
alter table public.shipments             enable row level security;
alter table public.scheduled_lives       enable row level security;
alter table public.stream_guests         enable row level security;
alter table public.product_suggestions   enable row level security;
alter table public.community_gifts       enable row level security;
alter table public.stream_replays        enable row level security;
alter table public.platform_settings     enable row level security;
alter table public.cinetpay_transactions enable row level security;

-- ---------------------------------------------------------------------
-- 3. Politiques
-- ---------------------------------------------------------------------

-- ===== profiles =====
-- (lecture publique conservée de 001 ; voir note sur l'e-mail en bas de fichier)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- ===== coins_wallet : lecture seule pour le client =====
-- On supprime la politique qui permettait de s'offrir des coins.
drop policy if exists "Users update own wallet" on public.coins_wallet;
drop policy if exists "Admins see all wallets" on public.coins_wallet;
create policy "Admins see all wallets"
  on public.coins_wallet for select using (public.is_admin());

-- ===== categories / gifts / fan_levels / delivery_points / gift_packs =====
drop policy if exists "Categories public" on public.categories;
create policy "Categories public" on public.categories for select using (true);
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Gifts public" on public.gifts;
create policy "Gifts public" on public.gifts for select using (true);
drop policy if exists "Admins manage gifts" on public.gifts;
create policy "Admins manage gifts" on public.gifts for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Fan levels public" on public.fan_levels;
create policy "Fan levels public" on public.fan_levels for select using (true);
drop policy if exists "Admins manage fan levels" on public.fan_levels;
create policy "Admins manage fan levels" on public.fan_levels for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Delivery points public" on public.delivery_points;
create policy "Delivery points public" on public.delivery_points for select using (true);
drop policy if exists "Admins manage delivery points" on public.delivery_points;
create policy "Admins manage delivery points" on public.delivery_points for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Gift packs public" on public.gift_packs;
create policy "Gift packs public" on public.gift_packs for select using (true);
drop policy if exists "Admins manage gift packs" on public.gift_packs;
create policy "Admins manage gift packs" on public.gift_packs for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== products : seulement les vendeurs approuvés (ou admin) =====
drop policy if exists "Sellers manage own products" on public.products;
drop policy if exists "Approved sellers insert products" on public.products;
drop policy if exists "Sellers update own products" on public.products;
drop policy if exists "Sellers delete own products" on public.products;
drop policy if exists "Admins manage products" on public.products;

create policy "Approved sellers insert products" on public.products for insert
  with check (auth.uid() = seller_id and public.is_approved_seller());
create policy "Sellers update own products" on public.products for update
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "Sellers delete own products" on public.products for delete
  using (auth.uid() = seller_id);
create policy "Admins manage products" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== product_images (RLS activée en 001 mais SANS politique : tout était refusé) =====
drop policy if exists "Product images public" on public.product_images;
create policy "Product images public" on public.product_images for select using (true);
drop policy if exists "Sellers manage own product images" on public.product_images;
create policy "Sellers manage own product images" on public.product_images for all
  using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images" on public.product_images for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== live_streams =====
drop policy if exists "Sellers manage own streams" on public.live_streams;
drop policy if exists "Approved sellers create streams" on public.live_streams;
drop policy if exists "Sellers update own streams" on public.live_streams;
drop policy if exists "Sellers delete own streams" on public.live_streams;
drop policy if exists "Admins manage streams" on public.live_streams;

create policy "Approved sellers create streams" on public.live_streams for insert
  with check (auth.uid() = seller_id and public.is_approved_seller());
-- Un live "killed" par un admin ne peut plus être relancé par le vendeur
create policy "Sellers update own streams" on public.live_streams for update
  using (auth.uid() = seller_id and status <> 'killed')
  with check (auth.uid() = seller_id and status <> 'killed');
create policy "Sellers delete own streams" on public.live_streams for delete
  using (auth.uid() = seller_id and status <> 'killed');
create policy "Admins manage streams" on public.live_streams for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== live_messages (RLS activée en 001 mais SANS politique : le chat était bloqué) =====
drop policy if exists "Live messages public" on public.live_messages;
create policy "Live messages public" on public.live_messages for select using (true);
drop policy if exists "Users post own messages" on public.live_messages;
create policy "Users post own messages" on public.live_messages for insert
  with check (auth.uid() = user_id);
drop policy if exists "Admins delete messages" on public.live_messages;
create policy "Admins delete messages" on public.live_messages for delete
  using (public.is_admin());

-- ===== gift_transactions / transactions : lecture seule (écriture = serveur) =====
drop policy if exists "Users see own gift transactions" on public.gift_transactions;
create policy "Users see own gift transactions" on public.gift_transactions for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin());

drop policy if exists "Users see own transactions" on public.transactions;
create policy "Users see own transactions" on public.transactions for select
  using (auth.uid() = user_id or public.is_admin());

-- ===== withdrawals =====
drop policy if exists "Sellers see own withdrawals" on public.withdrawals;
create policy "Sellers see own withdrawals" on public.withdrawals for select
  using (auth.uid() = seller_id or public.is_admin());
drop policy if exists "Approved sellers request withdrawals" on public.withdrawals;
create policy "Approved sellers request withdrawals" on public.withdrawals for insert
  with check (
    auth.uid() = seller_id
    and status = 'pending'
    and processed_by is null
    and public.is_approved_seller()
  );
drop policy if exists "Admins process withdrawals" on public.withdrawals;
create policy "Admins process withdrawals" on public.withdrawals for update
  using (public.is_admin()) with check (public.is_admin());

-- ===== orders : pas d'INSERT client (création par la route serveur) =====
drop policy if exists "Order parties can view" on public.orders;
create policy "Order parties can view" on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id or public.is_admin());
drop policy if exists "Order parties can update" on public.orders;
create policy "Order parties can update" on public.orders for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== shipments =====
drop policy if exists "Order parties view shipments" on public.shipments;
create policy "Order parties view shipments" on public.shipments for select
  using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = shipments.order_id and auth.uid() in (o.buyer_id, o.seller_id)
    )
  );
drop policy if exists "Sellers manage shipments" on public.shipments;
create policy "Sellers manage shipments" on public.shipments for all
  using (exists (select 1 from public.orders o where o.id = shipments.order_id and o.seller_id = auth.uid()))
  with check (exists (select 1 from public.orders o where o.id = shipments.order_id and o.seller_id = auth.uid()));
drop policy if exists "Admins manage shipments" on public.shipments;
create policy "Admins manage shipments" on public.shipments for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== product_ratings : seulement après une commande livrée =====
drop policy if exists "Ratings public" on public.product_ratings;
create policy "Ratings public" on public.product_ratings for select using (true);
drop policy if exists "Buyers rate delivered orders" on public.product_ratings;
create policy "Buyers rate delivered orders" on public.product_ratings for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'delivered'
    )
  );
drop policy if exists "Users edit own ratings" on public.product_ratings;
create policy "Users edit own ratings" on public.product_ratings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own ratings" on public.product_ratings;
create policy "Users delete own ratings" on public.product_ratings for delete
  using (auth.uid() = user_id or public.is_admin());

-- ===== flash_deals / live_clips / stream_replays / stream_guests / product_suggestions =====
drop policy if exists "Flash deals public" on public.flash_deals;
create policy "Flash deals public" on public.flash_deals for select using (true);
drop policy if exists "Sellers manage own flash deals" on public.flash_deals;
create policy "Sellers manage own flash deals" on public.flash_deals for all
  using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists "Admins manage flash deals" on public.flash_deals;
create policy "Admins manage flash deals" on public.flash_deals for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Clips public" on public.live_clips;
create policy "Clips public" on public.live_clips for select using (true);
drop policy if exists "Sellers manage own clips" on public.live_clips;
create policy "Sellers manage own clips" on public.live_clips for all
  using (public.owns_stream(stream_id)) with check (public.owns_stream(stream_id));
drop policy if exists "Admins manage clips" on public.live_clips;
create policy "Admins manage clips" on public.live_clips for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Replays public" on public.stream_replays;
create policy "Replays public" on public.stream_replays for select using (true);
drop policy if exists "Sellers manage own replays" on public.stream_replays;
create policy "Sellers manage own replays" on public.stream_replays for all
  using (public.owns_stream(stream_id)) with check (public.owns_stream(stream_id));
drop policy if exists "Admins manage replays" on public.stream_replays;
create policy "Admins manage replays" on public.stream_replays for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Guests public" on public.stream_guests;
create policy "Guests public" on public.stream_guests for select using (true);
drop policy if exists "Sellers manage own stream guests" on public.stream_guests;
create policy "Sellers manage own stream guests" on public.stream_guests for all
  using (public.owns_stream(stream_id)) with check (public.owns_stream(stream_id));
drop policy if exists "Admins manage stream guests" on public.stream_guests;
create policy "Admins manage stream guests" on public.stream_guests for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Suggestions public" on public.product_suggestions;
create policy "Suggestions public" on public.product_suggestions for select using (true);
drop policy if exists "Admins manage suggestions" on public.product_suggestions;
create policy "Admins manage suggestions" on public.product_suggestions for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== live_battles =====
drop policy if exists "Battles public" on public.live_battles;
create policy "Battles public" on public.live_battles for select using (true);
drop policy if exists "Sellers manage own battles" on public.live_battles;
create policy "Sellers manage own battles" on public.live_battles for all
  using (public.owns_stream(stream_a_id) or public.owns_stream(stream_b_id))
  with check (public.owns_stream(stream_a_id) or public.owns_stream(stream_b_id));
drop policy if exists "Admins manage battles" on public.live_battles;
create policy "Admins manage battles" on public.live_battles for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== scheduled_lives / community_gifts / stories =====
drop policy if exists "Scheduled lives public" on public.scheduled_lives;
create policy "Scheduled lives public" on public.scheduled_lives for select using (true);
drop policy if exists "Sellers manage own scheduled lives" on public.scheduled_lives;
create policy "Sellers manage own scheduled lives" on public.scheduled_lives for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "Admins manage scheduled lives" on public.scheduled_lives;
create policy "Admins manage scheduled lives" on public.scheduled_lives for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Community gifts public" on public.community_gifts;
create policy "Community gifts public" on public.community_gifts for select using (true);
drop policy if exists "Admins manage community gifts" on public.community_gifts;
create policy "Admins manage community gifts" on public.community_gifts for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Active stories public" on public.stories;
create policy "Active stories public" on public.stories for select
  using (expires_at > now() or auth.uid() = seller_id or public.is_admin());
drop policy if exists "Sellers manage own stories" on public.stories;
create policy "Sellers manage own stories" on public.stories for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id and public.is_approved_seller());
drop policy if exists "Admins manage stories" on public.stories;
create policy "Admins manage stories" on public.stories for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== données personnelles =====
drop policy if exists "Own wishlist" on public.wishlists;
create policy "Own wishlist" on public.wishlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own streak" on public.viewing_streaks;
create policy "Own streak" on public.viewing_streaks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own payment methods" on public.payment_methods;
create policy "Own payment methods" on public.payment_methods for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own notifications read" on public.notifications;
create policy "Own notifications read" on public.notifications for select
  using (auth.uid() = user_id);
drop policy if exists "Own notifications update" on public.notifications;
create policy "Own notifications update" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Own notifications delete" on public.notifications;
create policy "Own notifications delete" on public.notifications for delete
  using (auth.uid() = user_id);

-- ===== affiliation : lecture seule + création de son propre code =====
drop policy if exists "Own affiliate read" on public.affiliates;
create policy "Own affiliate read" on public.affiliates for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Own affiliate create" on public.affiliates;
create policy "Own affiliate create" on public.affiliates for insert
  with check (auth.uid() = user_id and total_earned_coins = 0);

drop policy if exists "Own referrals read" on public.referrals;
create policy "Own referrals read" on public.referrals for select
  using (
    public.is_admin() or exists (
      select 1 from public.affiliates a where a.id = referrals.affiliate_id and a.user_id = auth.uid()
    )
  );

-- ===== classement : lecture publique, écriture serveur =====
drop policy if exists "Leaderboard public" on public.stream_leaderboard;
create policy "Leaderboard public" on public.stream_leaderboard for select using (true);

-- ===== paramètres plateforme : lecture publique, écriture admin =====
drop policy if exists "Settings readable" on public.platform_settings;
create policy "Settings readable" on public.platform_settings for select using (true);
drop policy if exists "Admins manage settings" on public.platform_settings;
create policy "Admins manage settings" on public.platform_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== transactions CinetPay : lecture seule (écriture = webhook serveur) =====
drop policy if exists "Own cinetpay transactions" on public.cinetpay_transactions;
create policy "Own cinetpay transactions" on public.cinetpay_transactions for select
  using (auth.uid() = user_id or public.is_admin());

-- ===== support_tickets : on empêche de s'auto-répondre / s'auto-résoudre =====
drop policy if exists "Users can create own tickets" on public.support_tickets;
create policy "Users can create own tickets" on public.support_tickets for insert
  with check (
    auth.uid() = user_id
    and status = 'open'
    and admin_response is null
    and resolved_by is null
    and resolved_at is null
  );

-- ---------------------------------------------------------------------
-- 4. Storage : chaque utilisateur n'écrit que dans son propre dossier
--    (chemins du code : avatars/<userId>/... et products/<sellerId>/...)
-- ---------------------------------------------------------------------
drop policy if exists "moshi_read_public_buckets" on storage.objects;
create policy "moshi_read_public_buckets" on storage.objects for select
  using (bucket_id in ('avatars', 'products'));

drop policy if exists "moshi_upload_own_folder" on storage.objects;
create policy "moshi_upload_own_folder" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'products')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "moshi_update_own_folder" on storage.objects;
create policy "moshi_update_own_folder" on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'products')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "moshi_delete_own_folder" on storage.objects;
create policy "moshi_delete_own_folder" on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'products')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 5. Vérification : doit renvoyer 0 ligne
-- ---------------------------------------------------------------------
-- select tablename from pg_tables
-- where schemaname = 'public' and not rowsecurity;

-- NOTE : la table profiles reste lisible par tous (nécessaire pour afficher
-- vendeurs et chat), ce qui expose aussi email, age, gender et country.
-- À traiter ensuite avec une vue "public_profiles" ne contenant que les
-- colonnes publiques.