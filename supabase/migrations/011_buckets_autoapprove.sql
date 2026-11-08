-- =====================================================================
-- Migration 011 : buckets Storage manquants + approbation vendeur automatique
-- À exécuter dans le SQL Editor de Supabase. Idempotente.
--
--  * Crée les buckets "avatars" et "products" (erreur "Bucket not found")
--  * Approbation vendeur AUTOMATIQUE : la personne doit toujours soumettre sa demande
--    (photo, pays, âge 18+, genre) ; si le dossier est complet, il est validé aussitôt
--  * Un admin n'est plus rétrogradé par erreur quand il remplit le formulaire vendeur
-- Pour réactiver l'approbation manuelle plus tard :
--   update public.platform_settings set value = 'false' where key = 'auto_approve_sellers';
-- =====================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- 1. Buckets Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',  'avatars',  true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('products', 'products', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moshi_read_public_buckets" on storage.objects;
create policy "moshi_read_public_buckets" on storage.objects for select
  using (bucket_id in ('avatars', 'products'));

drop policy if exists "moshi_upload_own_folder" on storage.objects;
create policy "moshi_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'products') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moshi_update_own_folder" on storage.objects;
create policy "moshi_update_own_folder" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'products') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moshi_delete_own_folder" on storage.objects;
create policy "moshi_delete_own_folder" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'products') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 2. Réglage : approbation automatique ----------
insert into public.platform_settings (key, value) values ('auto_approve_sellers', 'true')
on conflict (key) do nothing;

-- ---------- 3. Garde des profils (remplace celle de la 006) ----------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean;
  v_auto  boolean;
begin
  -- SQL Editor / service role / mise à jour par un autre trigger
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  v_admin := public.is_admin();

  if v_admin then
    -- Un admin ne se rétrograde pas lui-même par erreur (ex. formulaire vendeur)
    if old.role = 'admin' and new.role is distinct from 'admin' and auth.uid() = old.id then
      new.role := 'admin';
    end if;
  else
    if new.id is distinct from old.id then
      raise exception 'Modification de l''identifiant interdite';
    end if;

    if new.is_verified     is distinct from old.is_verified
    or new.followers_count is distinct from old.followers_count
    or new.following_count is distinct from old.following_count
    or new.fan_points      is distinct from old.fan_points
    or new.fan_level_id    is distinct from old.fan_level_id then
      raise exception 'Champ protégé : modification interdite';
    end if;

    -- Seule transition de rôle permise : acheteur -> vendeur (onboarding)
    if new.role is distinct from old.role then
      if not (old.role = 'buyer' and new.role = 'seller' and new.seller_status = 'pending') then
        raise exception 'Changement de rôle interdit';
      end if;
    end if;

    -- Seule transition de statut permise : (none|rejected) -> pending
    if new.seller_status is distinct from old.seller_status then
      if not (new.seller_status = 'pending' and old.seller_status in ('none', 'rejected')) then
        raise exception 'Changement de statut vendeur interdit';
      end if;
    end if;
  end if;

  -- Approbation automatique : la demande doit avoir été SOUMISE (statut "pending")
  -- et le dossier doit être complet. Sinon elle reste en attente de l'admin.
  select coalesce(value = 'true'::jsonb, false) into v_auto
  from public.platform_settings where key = 'auto_approve_sellers';

  if coalesce(v_auto, false)
     and new.seller_status = 'pending'
     and coalesce(new.avatar_url, '') <> ''
     and coalesce(new.country, '') <> ''
     and coalesce(new.gender, '') <> ''
     and coalesce(new.age, 0) >= 18 then
    new.seller_status := 'approved';
    new.is_verified := true;
  end if;

  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------- 4. Valide les demandes DÉJÀ soumises et complètes ----------
update public.profiles
set seller_status = 'approved', is_verified = true
where seller_status = 'pending'
  and coalesce(avatar_url, '') <> ''
  and coalesce(country, '') <> ''
  and coalesce(gender, '') <> ''
  and coalesce(age, 0) >= 18;
