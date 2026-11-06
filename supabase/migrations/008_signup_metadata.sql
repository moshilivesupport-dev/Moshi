-- =====================================================================
-- Migration 008 : enregistrer l'âge et l'acceptation des CGU à l'inscription
-- À exécuter dans le SQL Editor de Supabase. Idempotente.
--
-- Avec la confirmation d'e-mail, l'utilisateur n'a PAS encore de session juste
-- après signUp : l'ancien UPDATE côté navigateur (age, terms_accepted_at) était
-- donc refusé par la RLS. Le trigger de création de profil lit désormais ces
-- valeurs dans les métadonnées envoyées au signUp.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_age   int;
  v_terms boolean := coalesce(new.raw_user_meta_data->>'terms_accepted', '') = 'true';
begin
  if coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]{1,3}$' then
    v_age := (new.raw_user_meta_data->>'age')::int;
  end if;

  if v_age is not null and v_age < 18 then
    raise exception 'Age minimum : 18 ans';
  end if;

  insert into public.profiles (id, email, username, full_name, age, terms_accepted_at, terms_version)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_age,
    case when v_terms then now() end,
    case when v_terms then coalesce(new.raw_user_meta_data->>'terms_version', '1.0') end
  );

  insert into public.coins_wallet (user_id, balance) values (new.id, 0);
  return new;
end;
$$;
