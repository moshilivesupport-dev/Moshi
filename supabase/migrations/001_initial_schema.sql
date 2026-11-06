-- Moshi Live Shopping - Initial Schema
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  country text,
  age integer check (age is null or age >= 13),
  gender text check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  is_verified boolean default false,
  seller_status text default 'none' check (seller_status in ('none', 'pending', 'approved', 'rejected')),
  bio text,
  followers_count integer default 0,
  following_count integer default 0,
  preferred_currency text default 'XOF',
  preferred_language text default 'fr',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FOLLOWERS
create table public.followers (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create index idx_followers_follower on public.followers(follower_id);
create index idx_followers_following on public.followers(following_id);

-- CATEGORIES
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now()
);

-- PRODUCTS
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'XOF',
  category_id uuid references public.categories(id),
  stock integer default 0 check (stock >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_seller on public.products(seller_id);

-- PRODUCT IMAGES (min 2 enforced in app)
create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position integer default 0,
  created_at timestamptz default now()
);

create index idx_product_images_product on public.product_images(product_id);

-- LIVE STREAMS
create table public.live_streams (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'killed')),
  stream_url text,
  thumbnail_url text,
  viewer_count integer default 0,
  peak_viewers integer default 0,
  total_revenue numeric(14,2) default 0,
  total_gifts integer default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

create index idx_live_streams_seller on public.live_streams(seller_id);
create index idx_live_streams_status on public.live_streams(status);

-- COINS WALLET
create table public.coins_wallet (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

-- GIFTS CATALOG
create table public.gifts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  coin_cost integer not null check (coin_cost > 0),
  animation_url text,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- GIFT TRANSACTIONS
create table public.gift_transactions (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete set null,
  sender_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  gift_id uuid not null references public.gifts(id),
  quantity integer default 1 check (quantity > 0),
  coins_spent integer not null,
  created_at timestamptz default now()
);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('purchase_coins', 'gift_sent', 'payout', 'sale', 'refund')),
  amount numeric(14,2),
  currency text,
  coins integer,
  status text default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- WITHDRAWALS
create table public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'paid', 'rejected')),
  notes text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- LIVE CHAT MESSAGES (optional, can also use Realtime only)
create table public.live_messages (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  content text not null,
  original_lang text,
  created_at timestamptz default now()
);

create index idx_live_messages_stream on public.live_messages(stream_id);

-- Seed gifts
insert into public.gifts (name, slug, coin_cost, icon) values
  ('Golden Rose', 'golden-rose', 50, '🌹'),
  ('Super Moshi Star', 'super-moshi-star', 200, '⭐'),
  ('Diamond Heart', 'diamond-heart', 500, '💎'),
  ('Crown of Glory', 'crown', 1000, '👑'),
  ('Moshi Rocket', 'rocket', 300, '🚀'),
  ('Fire Flame', 'fire', 100, '🔥');

-- Seed some categories
insert into public.categories (name, slug) values
  ('Mode', 'mode'),
  ('Beauté', 'beaute'),
  ('Électronique', 'electronique'),
  ('Maison', 'maison'),
  ('Sport', 'sport');

-- RLS
alter table public.profiles enable row level security;
alter table public.followers enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.live_streams enable row level security;
alter table public.coins_wallet enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.live_messages enable row level security;

-- Basic policies (expand in production)
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Anyone can view followers"
  on public.followers for select using (true);

create policy "Users can follow"
  on public.followers for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.followers for delete using (auth.uid() = follower_id);

create policy "Products are public"
  on public.products for select using (true);

create policy "Sellers manage own products"
  on public.products for all using (auth.uid() = seller_id);

create policy "Live streams public"
  on public.live_streams for select using (true);

create policy "Sellers manage own streams"
  on public.live_streams for all using (auth.uid() = seller_id);

create policy "Users see own wallet"
  on public.coins_wallet for select using (auth.uid() = user_id);

create policy "Users update own wallet"
  on public.coins_wallet for update using (auth.uid() = user_id);

-- Trigger to create profile + wallet on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  insert into public.coins_wallet (user_id, balance) values (new.id, 0);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update followers count
create or replace function public.update_followers_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = NEW.following_id;
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = OLD.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = OLD.follower_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on public.followers
  for each row execute procedure public.update_followers_count();
