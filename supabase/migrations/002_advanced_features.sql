-- Moshi Advanced Features Migration

-- FAN LEVELS / BADGES
create table public.fan_levels (
  id serial primary key,
  name text not null,
  slug text unique not null,
  min_points integer not null,
  badge_icon text,
  color text
);

insert into public.fan_levels (name, slug, min_points, badge_icon, color) values
  ('Bronze', 'bronze', 0, '🥉', '#cd7f32'),
  ('Silver', 'silver', 500, '🥈', '#c0c0c0'),
  ('Gold', 'gold', 2000, '🥇', '#d4af37'),
  ('Platinum', 'platinum', 8000, '💎', '#e5e4e2'),
  ('Diamond', 'diamond', 25000, '👑', '#b9f2ff');

alter table public.profiles add column if not exists fan_points integer default 0;
alter table public.profiles add column if not exists fan_level_id integer references public.fan_levels(id) default 1;

-- FLASH DEALS
create table public.flash_deals (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  original_price numeric(12,2) not null,
  deal_price numeric(12,2) not null,
  stock_limit integer,
  sold_count integer default 0,
  starts_at timestamptz default now(),
  ends_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- WISHLIST
create table public.wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  stream_id uuid references public.live_streams(id) on delete set null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- LIVE BATTLES
create table public.live_battles (
  id uuid primary key default uuid_generate_v4(),
  stream_a_id uuid references public.live_streams(id),
  stream_b_id uuid references public.live_streams(id),
  title text,
  status text default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  score_a integer default 0,
  score_b integer default 0,
  winner_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- ORDERS (for 1-click buy + escrow)
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid references public.profiles(id),
  seller_id uuid references public.profiles(id),
  stream_id uuid references public.live_streams(id),
  product_id uuid references public.products(id),
  quantity integer default 1,
  unit_price numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  currency text default 'XOF',
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'disputed', 'refunded')),
  escrow_status text default 'held' check (escrow_status in ('held', 'released', 'refunded')),
  shipping_address jsonb,
  tracking_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRODUCT RATINGS
create table public.product_ratings (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- AFFILIATION
create table public.affiliates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) unique,
  referral_code text unique not null,
  total_earned_coins integer default 0,
  created_at timestamptz default now()
);

create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  affiliate_id uuid references public.affiliates(id),
  referred_user_id uuid references public.profiles(id),
  coins_awarded integer default 0,
  created_at timestamptz default now()
);

-- STREAKS
create table public.viewing_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_viewed_date date,
  updated_at timestamptz default now()
);

-- LIVE CLIPS
create table public.live_clips (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  title text,
  start_seconds integer,
  duration_seconds integer default 30,
  clip_url text,
  thumbnail_url text,
  gift_count integer default 0,
  view_count integer default 0,
  created_at timestamptz default now()
);

-- STORIES (24h)
create table public.stories (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text default 'image' check (media_type in ('image', 'video')),
  product_id uuid references public.products(id),
  caption text,
  view_count integer default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- LEADERBOARD (top gifters per stream)
create table public.stream_leaderboard (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  user_id uuid references public.profiles(id),
  total_coins integer default 0,
  rank integer,
  unique(stream_id, user_id)
);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on public.notifications(user_id, is_read);

-- VOICE MESSAGES in chat (extend live_messages)
alter table public.live_messages add column if not exists message_type text default 'text' check (message_type in ('text', 'voice', 'gift', 'system'));
alter table public.live_messages add column if not exists voice_url text;
alter table public.live_messages add column if not exists duration_seconds integer;

-- Indexes
create index idx_flash_deals_stream on public.flash_deals(stream_id);
create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_seller on public.orders(seller_id);
create index idx_stories_seller on public.stories(seller_id);
create index idx_stories_expires on public.stories(expires_at);
