-- =====================================================================
-- Migration 012 : bucket Storage "stories" (photos et vidéos de 24 h)
-- À exécuter dans le SQL Editor de Supabase. Idempotente.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 31457280,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moshi_stories_read" on storage.objects;
create policy "moshi_stories_read" on storage.objects for select
  using (bucket_id = 'stories');

drop policy if exists "moshi_stories_upload" on storage.objects;
create policy "moshi_stories_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moshi_stories_delete" on storage.objects;
create policy "moshi_stories_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
