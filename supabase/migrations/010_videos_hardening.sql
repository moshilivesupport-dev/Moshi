-- =====================================================================
-- Migration 010 : module vidéos (tables + RLS durcie + Storage)
-- Autonome et idempotente : à exécuter que la 009 (version d'origine) ait été
-- lancée ou non. Dans le SQL Editor de Supabase.
--
-- Corrige les failles de la version d'origine :
--  * un utilisateur pouvait republier une vidéo masquée/supprimée par un admin
--  * il pouvait créer/modifier ses propres compteurs (likes, vues, commentaires)
--  * il pouvait pointer l'URL vers n'importe quel site
--  * aucun admin ne pouvait modérer
--  * comment_count n'était jamais mis à jour
--  * aucune policy Storage : l'upload était refusé
-- =====================================================================
create extension if not exists "uuid-ossp";

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Tables ----------
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
  status text default 'published' check (status in ('processing','published','hidden','removed')),
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

-- ---------- Nettoyage des policies d'origine ----------
drop policy if exists "Published videos are public" on public.videos;
drop policy if exists "Authenticated users can insert own videos" on public.videos;
drop policy if exists "Users can update own videos" on public.videos;
drop policy if exists "Users can delete own videos" on public.videos;
drop policy if exists "Likes are public" on public.video_likes;
drop policy if exists "Users can like" on public.video_likes;
drop policy if exists "Users can unlike" on public.video_likes;
drop policy if exists "Comments are public" on public.video_comments;
drop policy if exists "Users can comment" on public.video_comments;
drop policy if exists "Users can delete own comments" on public.video_comments;

-- ---------- videos ----------
drop policy if exists "videos_select" on public.videos;
create policy "videos_select" on public.videos for select
  using (status = 'published' or auth.uid() = user_id or public.is_admin());

-- Compteurs à zéro, statut publié, et fichier obligatoirement dans SON dossier Storage
drop policy if exists "videos_insert" on public.videos;
create policy "videos_insert" on public.videos for insert
  with check (
    auth.uid() = user_id
    and status = 'published'
    and coalesce(view_count, 0) = 0
    and coalesce(like_count, 0) = 0
    and coalesce(comment_count, 0) = 0
    and url like ('%/storage/v1/object/public/videos/' || auth.uid()::text || '/%')
  );

drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own" on public.videos for update
  using (auth.uid() = user_id and status <> 'removed')
  with check (auth.uid() = user_id);

drop policy if exists "videos_delete" on public.videos;
create policy "videos_delete" on public.videos for delete
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "videos_admin_all" on public.videos;
create policy "videos_admin_all" on public.videos for all
  using (public.is_admin()) with check (public.is_admin());

-- Garde : le propriétaire ne change que légende / produit / vignette et peut
-- seulement alterner publié <-> masqué. Jamais les compteurs, l'URL, ni un statut
-- posé par un admin (removed).
create or replace function public.guard_video_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 or public.is_admin() then
    return new;
  end if;

  if new.user_id          is distinct from old.user_id
  or new.url              is distinct from old.url
  or new.duration_seconds is distinct from old.duration_seconds
  or new.view_count       is distinct from old.view_count
  or new.like_count       is distinct from old.like_count
  or new.comment_count    is distinct from old.comment_count then
    raise exception 'Champ protégé : modification interdite';
  end if;

  if new.status is distinct from old.status then
    if not (old.status in ('published','hidden') and new.status in ('published','hidden')) then
      raise exception 'Changement de statut interdit';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_video_update on public.videos;
create trigger guard_video_update
  before update on public.videos
  for each row execute function public.guard_video_update();

-- ---------- likes ----------
drop policy if exists "video_likes_select" on public.video_likes;
create policy "video_likes_select" on public.video_likes for select using (true);

drop policy if exists "video_likes_insert" on public.video_likes;
create policy "video_likes_insert" on public.video_likes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.videos v where v.id = video_id and v.status = 'published')
  );

drop policy if exists "video_likes_delete" on public.video_likes;
create policy "video_likes_delete" on public.video_likes for delete
  using (auth.uid() = user_id);

-- ---------- commentaires ----------
drop policy if exists "video_comments_select" on public.video_comments;
create policy "video_comments_select" on public.video_comments for select using (true);

drop policy if exists "video_comments_insert" on public.video_comments;
create policy "video_comments_insert" on public.video_comments for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.videos v where v.id = video_id and v.status = 'published')
  );

drop policy if exists "video_comments_delete" on public.video_comments;
create policy "video_comments_delete" on public.video_comments for delete
  using (auth.uid() = user_id or public.is_admin());

-- ---------- compteurs (likes + commentaires) ----------
create or replace function public.update_video_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.videos set like_count = like_count + 1 where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update public.videos set like_count = greatest(0, like_count - 1) where id = OLD.video_id;
  end if;
  return null;
end $$;

drop trigger if exists on_video_like_change on public.video_likes;
create trigger on_video_like_change
  after insert or delete on public.video_likes
  for each row execute function public.update_video_like_count();

create or replace function public.update_video_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.videos set comment_count = comment_count + 1 where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update public.videos set comment_count = greatest(0, comment_count - 1) where id = OLD.video_id;
  end if;
  return null;
end $$;

drop trigger if exists on_video_comment_change on public.video_comments;
create trigger on_video_comment_change
  after insert or delete on public.video_comments
  for each row execute function public.update_video_comment_count();

-- ---------- Storage : bucket "videos" (80 Mo, MP4/WebM/MOV) + droits par dossier ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 83886080, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moshi_videos_read" on storage.objects;
create policy "moshi_videos_read" on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "moshi_videos_upload" on storage.objects;
create policy "moshi_videos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moshi_videos_delete" on storage.objects;
create policy "moshi_videos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
