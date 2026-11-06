-- Short videos (TikTok-style), max 45 seconds
-- Both buyers and sellers can post

create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  caption text,
  duration_seconds numeric(5,2) not null check (duration_seconds > 0 and duration_seconds <= 45),
  product_id uuid references public.products(id) on delete set null,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  status text default 'published' check (status in ('processing', 'published', 'hidden', 'removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_videos_user on public.videos(user_id);
create index if not exists idx_videos_status on public.videos(status);
create index if not exists idx_videos_created on public.videos(created_at desc);

create table if not exists public.video_likes (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

create index if not exists idx_video_comments_video on public.video_comments(video_id);

alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

create policy "Published videos are public"
  on public.videos for select using (status = 'published' or auth.uid() = user_id);

create policy "Authenticated users can insert own videos"
  on public.videos for insert with check (auth.uid() = user_id);

create policy "Users can update own videos"
  on public.videos for update using (auth.uid() = user_id);

create policy "Users can delete own videos"
  on public.videos for delete using (auth.uid() = user_id);

create policy "Likes are public"
  on public.video_likes for select using (true);

create policy "Users can like"
  on public.video_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.video_likes for delete using (auth.uid() = user_id);

create policy "Comments are public"
  on public.video_comments for select using (true);

create policy "Users can comment"
  on public.video_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.video_comments for delete using (auth.uid() = user_id);

create or replace function public.update_video_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.videos set like_count = like_count + 1 where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update public.videos set like_count = greatest(0, like_count - 1) where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_video_like_change on public.video_likes;
create trigger on_video_like_change
  after insert or delete on public.video_likes
  for each row execute procedure public.update_video_like_count();
