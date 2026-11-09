-- ============================================================
-- Moshi – Fix rôle (acheteur/vendeur) + avatar profil
-- Migration 013
-- ============================================================

-- 1. S'assurer que la colonne role existe et est correctement contrainte
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    alter table public.profiles
      add column role text not null default 'acheteur'
      check (role in ('acheteur', 'vendeur'));
  else
    -- Forcer les valeurs invalides vers 'acheteur'
    update public.profiles
    set role = 'acheteur'
    where role is null or role not in ('acheteur', 'vendeur');

    -- Ajouter la contrainte si elle n'existe pas
    begin
      alter table public.profiles
        add constraint profiles_role_check
        check (role in ('acheteur', 'vendeur'));
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

-- 2. S'assurer que avatar_url existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    alter table public.profiles
      add column avatar_url text;
  end if;
end $$;

-- 3. S'assurer que username et full_name existent
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) then
    alter table public.profiles add column username text unique;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    alter table public.profiles add column full_name text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'bio'
  ) then
    alter table public.profiles add column bio text;
  end if;
end $$;

-- 4. Fonction de création de profil qui RESPECTE le rôle choisi
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  chosen_role text;
begin
  -- Lire le rôle depuis les metadata d'inscription
  chosen_role := lower(coalesce(
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'user_role',
    'acheteur'
  ));

  if chosen_role not in ('acheteur', 'vendeur') then
    chosen_role := 'acheteur';
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    username,
    avatar_url
  ) values (
    new.id,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    username = coalesce(excluded.username, profiles.username),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  return new;
end;
$$;

-- Recréer le trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. RLS profil (lecture publique, écriture propriétaire)
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Bucket avatars (si pas déjà créé)
-- À faire aussi dans le Dashboard Storage si besoin :
-- Bucket name: avatars | Public: oui

-- ============================================================
-- Fin migration 013
-- ============================================================
