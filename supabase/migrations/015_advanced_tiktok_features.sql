-- ============================================================
-- Moshi v1.3 – Fonctionnalités avancées style TikTok
-- Stories, Messages, Duet/Stitch, Sounds, Analytics, Signals
-- ============================================================

-- 1. STORIES
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  media_url   text not null,
  media_type  text not null check (media_type in ('image','video')),
  duration    integer default 5, -- secondes (images)
  views_count integer not null default 0,
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  created_at  timestamptz not null default now()
);
create index if not exists stories_user_idx on public.stories(user_id);
create index if not exists stories_expires_idx on public.stories(expires_at);

create table if not exists public.story_views (
  story_id uuid references public.stories(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (story_id, viewer_id)
);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

create policy "Stories public read" on public.stories for select using (expires_at > now());
create policy "Users insert own stories" on public.stories for insert with check (auth.uid() = user_id);
create policy "Users delete own stories" on public.stories for delete using (auth.uid() = user_id);
create policy "Story views readable" on public.story_views for select using (true);
create policy "Users can view stories" on public.story_views for insert with check (auth.uid() = viewer_id);

-- 2. MESSAGES PRIVÉS (DM)
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text,
  media_url       text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "Members see conversations" on public.conversations for select
  using (exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid()));
create policy "Members see membership" on public.conversation_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_members m2
    where m2.conversation_id = conversation_id and m2.user_id = auth.uid()
  ));
create policy "Users join conversations" on public.conversation_members for insert
  with check (auth.uid() = user_id);
create policy "Members read messages" on public.messages for select
  using (exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()
  ));
create policy "Users send messages" on public.messages for insert
  with check (auth.uid() = sender_id);

-- 3. SOUNDS / MUSIQUES
create table if not exists public.sounds (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist        text,
  audio_url     text not null,
  duration      integer, -- secondes
  usage_count   integer not null default 0,
  is_trending   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Lien vidéo ↔ son
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='videos' and column_name='sound_id') then
    alter table public.videos add column sound_id uuid references public.sounds(id) on delete set null;
  end if;
end $$;

alter table public.sounds enable row level security;
create policy "Sounds public" on public.sounds for select using (true);

-- 4. DUET / STITCH
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='videos' and column_name='duet_from_id') then
    alter table public.videos add column duet_from_id uuid references public.videos(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='videos' and column_name='stitch_from_id') then
    alter table public.videos add column stitch_from_id uuid references public.videos(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='videos' and column_name='stitch_start_ms') then
    alter table public.videos add column stitch_start_ms integer;
  end if;
end $$;

-- 5. ANALYTICS CRÉATEUR
create table if not exists public.video_events (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('view','like','comment','share','watch_time','click_profile','click_product')),
  value      numeric, -- ex: secondes regardées
  created_at timestamptz not null default now()
);
create index if not exists video_events_video_idx on public.video_events(video_id, created_at);
create index if not exists video_events_type_idx on public.video_events(event_type);

alter table public.video_events enable row level security;
create policy "Anyone can insert events" on public.video_events for insert with check (true);
create policy "Owners read their analytics" on public.video_events for select
  using (exists (
    select 1 from public.videos v where v.id = video_id and v.user_id = auth.uid()
  ));

-- 6. SIGNALS POUR RECOMMANDATION (simple)
create table if not exists public.user_interests (
  user_id    uuid references public.profiles(id) on delete cascade,
  tag        text not null,
  score      numeric not null default 1,
  updated_at timestamptz default now(),
  primary key (user_id, tag)
);

alter table public.user_interests enable row level security;
create policy "Users manage own interests" on public.user_interests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. LIVE SESSIONS (métadonnées – le stream WebRTC est côté client/provider)
create table if not exists public.live_sessions (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  title         text,
  status        text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  provider      text default 'livekit', -- livekit | agora | custom
  room_name     text,
  playback_url  text,
  viewers_count integer not null default 0,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.live_sessions enable row level security;
create policy "Lives public read" on public.live_sessions for select using (true);
create policy "Hosts manage lives" on public.live_sessions for all
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- ============================================================
-- Fin 015
-- ============================================================
