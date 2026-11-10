-- ============================================================
-- Moshi v1.2 – Cœur social style TikTok
-- Follows, notifications, compteurs profil
-- ============================================================

-- 1. FOLLOWS
create table if not exists public.follows (
  id          uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- 2. Compteurs sur profiles
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='followers_count') then
    alter table public.profiles add column followers_count integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='following_count') then
    alter table public.profiles add column following_count integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='videos_count') then
    alter table public.profiles add column videos_count integer not null default 0;
  end if;
end $$;

-- Triggers compteurs follows
create or replace function public.handle_follow_counts()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists follow_counts on public.follows;
create trigger follow_counts
  after insert or delete on public.follows
  for each row execute function public.handle_follow_counts();

-- 3. NOTIFICATIONS basiques
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  type        text not null check (type in ('follow','like','comment','live','system')),
  message     text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users see their notifications" on public.notifications;
create policy "Users see their notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- 4. Helper : est-ce que je follow quelqu'un ?
create or replace function public.is_following(target uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target
  );
$$;

-- ============================================================
-- Fin 014
-- ============================================================
