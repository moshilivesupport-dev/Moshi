-- Moshi Remaining Features

-- MOBILE MONEY PROVIDERS
create table public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('wave', 'orange_money', 'moov', 'mtn_momo', 'free_money', 'stripe', 'card')),
  phone_number text,
  is_default boolean default false,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- GIFT PACKS (produit + gift virtuel)
create table public.gift_packs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  product_id uuid references public.products(id),
  gift_id uuid references public.gifts(id),
  price numeric(12,2) not null,
  currency text default 'XOF',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- DELIVERY / POINTS RELAIS
create table public.delivery_points (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  is_active boolean default true
);

create table public.shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  delivery_point_id uuid references public.delivery_points(id),
  carrier text,
  tracking_code text,
  status text default 'preparing' check (status in ('preparing', 'shipped', 'in_transit', 'at_relay', 'delivered', 'failed')),
  insurance boolean default false,
  insurance_amount numeric(12,2) default 0,
  estimated_delivery date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LIVE CALENDAR
create table public.scheduled_lives (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  notify_followers boolean default true,
  status text default 'scheduled' check (status in ('scheduled', 'live', 'cancelled', 'completed')),
  stream_id uuid references public.live_streams(id),
  created_at timestamptz default now()
);

-- GUEST / COLLAB MODE
create table public.stream_guests (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  guest_id uuid references public.profiles(id),
  role text default 'guest' check (role in ('guest', 'co-host', 'influencer')),
  joined_at timestamptz default now(),
  left_at timestamptz
);

-- PRODUCT SUGGESTIONS (AI stub)
create table public.product_suggestions (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  product_id uuid references public.products(id),
  score numeric(5,2) default 0,
  reason text,
  created_at timestamptz default now()
);

-- COMMUNITY GIFTS (vendeur redistribue)
create table public.community_gifts (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id),
  seller_id uuid references public.profiles(id),
  gift_id uuid references public.gifts(id),
  quantity integer default 1,
  distributed_count integer default 0,
  created_at timestamptz default now()
);

-- REPLAYS
create table public.stream_replays (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade unique,
  replay_url text,
  duration_seconds integer,
  highlights jsonb default '[]', -- [{t: 120, type: 'gift'|'sale'|'peak', label: '...'}]
  view_count integer default 0,
  created_at timestamptz default now()
);

-- Extend products for quality/price filters
alter table public.products add column if not exists quality_tier text default 'standard' check (quality_tier in ('budget', 'standard', 'premium'));
alter table public.products add column if not exists is_featured boolean default false;

-- Seed some delivery points (Togo / West Africa examples)
insert into public.delivery_points (name, city, address) values
  ('Point Relais Agoe', 'Lomé', 'Carrefour Agoe'),
  ('Point Relais Tokoin', 'Lomé', 'Tokoin Université'),
  ('Point Relais Plateau', 'Abidjan', 'Plateau'),
  ('Point Relais Cocody', 'Abidjan', 'Cocody Centre'),
  ('Point Relais Accra Central', 'Accra', 'Central Market');
