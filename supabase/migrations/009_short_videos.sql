-- ============================================================
-- Moshi – Module Vidéos courtes (max 45 s)
-- Migration 009
-- Compatible avec migrations 001 → 008 (auth, profiles, products)
-- ============================================================

-- 1. Table principale des vidéos
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text,
  description   text,
  video_url     text not null,
  thumbnail_url text,
  duration      integer not null check (duration > 0 and duration <= 45), -- secondes, max 45s
  views_count   integer not null default 0,
  likes_count   integer not null default 0,
  comments_count integer not null default 0,
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index utiles
create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_is_public_idx on public.videos(is_public) where is_public = true;

-- 2. Likes
create table if not exists public.video_likes (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(video_id, user_id)
);

create index if not exists video_likes_video_id_idx on public.video_likes(video_id);
create index if not exists video_likes_user_id_idx on public.video_likes(user_id);

-- 3. Commentaires
create table if not exists public.video_comments (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_comments_video_id_idx on public.video_comments(video_id);
create index if not exists video_comments_user_id_idx on public.video_comments(user_id);

-- 4. Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_updated_at on public.videos;
create trigger videos_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

drop trigger if exists video_comments_updated_at on public.video_comments;
create trigger video_comments_updated_at
  before update on public.video_comments
  for each row execute function public.set_updated_at();

-- 5. Compteurs (likes / comments) via triggers
create or replace function public.handle_video_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.videos
    set likes_count = likes_count + 1
    where id = new.video_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.videos
    set likes_count = greatest(0, likes_count - 1)
    where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists video_likes_count on public.video_likes;
create trigger video_likes_count
  after insert or delete on public.video_likes
  for each row execute function public.handle_video_like_count();

create or replace function public.handle_video_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.videos
    set comments_count = comments_count + 1
    where id = new.video_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.videos
    set comments_count = greatest(0, comments_count - 1)
    where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists video_comments_count on public.video_comments;
create trigger video_comments_count
  after insert or delete on public.video_comments
  for each row execute function public.handle_video_comment_count();

-- 6. Incrémenter les vues (fonction sécurisée)
create or replace function public.increment_video_views(video_uuid uuid)
returns void as $$
begin
  update public.videos
  set views_count = views_count + 1
  where id = video_uuid and is_public = true;
end;
$$ language plpgsql security definer;

-- ============================================================
-- RLS
-- ============================================================

alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

-- VIDEOS
drop policy if exists "Public videos are viewable by everyone" on public.videos;
create policy "Public videos are viewable by everyone"
  on public.videos for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can insert their own videos" on public.videos;
create policy "Users can insert their own videos"
  on public.videos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own videos" on public.videos;
create policy "Users can update their own videos"
  on public.videos for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own videos" on public.videos;
create policy "Users can delete their own videos"
  on public.videos for delete
  using (auth.uid() = user_id);

-- LIKES
drop policy if exists "Likes are viewable by everyone" on public.video_likes;
create policy "Likes are viewable by everyone"
  on public.video_likes for select
  using (true);

drop policy if exists "Authenticated users can like" on public.video_likes;
create policy "Authenticated users can like"
  on public.video_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own likes" on public.video_likes;
create policy "Users can remove their own likes"
  on public.video_likes for delete
  using (auth.uid() = user_id);

-- COMMENTS
drop policy if exists "Comments are viewable by everyone" on public.video_comments;
create policy "Comments are viewable by everyone"
  on public.video_comments for select
  using (true);

drop policy if exists "Authenticated users can comment" on public.video_comments;
create policy "Authenticated users can comment"
  on public.video_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.video_comments;
create policy "Users can update their own comments"
  on public.video_comments for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.video_comments;
create policy "Users can delete their own comments"
  on public.video_comments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Fin migration 009
-- ============================================================
