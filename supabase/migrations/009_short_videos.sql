-- ============================================================
-- Moshi – Short videos (TikTok-style), max 45 seconds
-- Migration 009 (après 001–008 du projet principal)
-- Acheteurs ET vendeurs peuvent publier
-- ============================================================

create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  caption text,
  duration_seconds numeric(5,2) not null
    check (duration_seconds > 0 and duration_seconds <= 45),
  product_id uuid references public.products(id) on delete set null,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  status text not null default 'published'
    check (status in ('processing', 'published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_videos_user on public.videos(user_id);
create index if not exists idx_videos_status_created
  on public.videos(status, created_at desc);

create table if not exists public.video_likes (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_video_comments_video
  on public.video_comments(video_id, created_at desc);

-- RLS
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

create policy "videos_select_published_or_owner"
  on public.videos for select
  using (status = 'published' or auth.uid() = user_id);

create policy "videos_insert_own"
  on public.videos for insert
  with check (auth.uid() = user_id);

create policy "videos_update_own"
  on public.videos for update
  using (auth.uid() = user_id);

create policy "videos_delete_own"
  on public.videos for delete
  using (auth.uid() = user_id);

create policy "video_likes_select_all"
  on public.video_likes for select using (true);

create policy "video_likes_insert_own"
  on public.video_likes for insert with check (auth.uid() = user_id);

create policy "video_likes_delete_own"
  on public.video_likes for delete using (auth.uid() = user_id);

create policy "video_comments_select_all"
  on public.video_comments for select using (true);

create policy "video_comments_insert_own"
  on public.video_comments for insert with check (auth.uid() = user_id);

create policy "video_comments_delete_own"
  on public.video_comments for delete using (auth.uid() = user_id);

-- Compteur de likes
create or replace function public.update_video_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.videos
      set like_count = like_count + 1, updated_at = now()
      where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update public.videos
      set like_count = greatest(0, like_count - 1), updated_at = now()
      where id = OLD.video_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_video_like_change on public.video_likes;
create trigger on_video_like_change
  after insert or delete on public.video_likes
  for each row execute function public.update_video_like_count();

-- Storage policies for bucket "videos" (créer le bucket public dans le dashboard)
-- Les policies Storage se gèrent aussi dans Dashboard → Storage → Policies
-- Exemple (à adapter si besoin) :
-- allow authenticated upload to folder = auth.uid()
-- allow public read
