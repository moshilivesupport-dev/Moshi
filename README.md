# Moshi – Fixes 1 · 2 · 3 · 4

Pack prêt à coller pour corriger :

1. **Bug création de compte** (rôle Vendeur / Acheteur)
2. **Barre de navigation** (5 onglets max, style TikTok)
3. **Accueil type TikTok** (feed vertical immersif)
4. **Profils** (voir les autres + photo de profil modifiable)

Compatible avec tes migrations actuelles (jusqu’à 012).

---

## Contenu

```
supabase/migrations/
  013_profile_role_and_avatar.sql

src/components/
  auth/SignupForm.tsx
  layout/BottomNav.tsx
  home/HomeFeed.tsx
  profile/ProfileView.tsx

src/app/
  page.tsx                        ← Nouvel Accueil (feed)
  auth/signup/page.tsx
  profil/page.tsx                 ← Redirige vers son propre profil
  profil/[id]/page.tsx            ← Profil public / privé
```

---

## Installation

### 1. Migration SQL

Dans le **SQL Editor** Supabase :

→ Exécuter `013_profile_role_and_avatar.sql`

### 2. Storage – Bucket `avatars`

Dashboard Supabase → Storage → New bucket :

- Nom : `avatars`
- **Public** : oui

Policy recommandée (INSERT) :
```sql
create policy "Users can upload their avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Copier les fichiers

| Source | Destination |
|--------|-------------|
| `src/components/auth/SignupForm.tsx` | `src/components/auth/` |
| `src/components/layout/BottomNav.tsx` | `src/components/layout/` |
| `src/components/home/HomeFeed.tsx` | `src/components/home/` |
| `src/components/profile/ProfileView.tsx` | `src/components/profile/` |
| `src/app/page.tsx` | `src/app/page.tsx` (remplace l’ancien) |
| `src/app/auth/signup/page.tsx` | `src/app/auth/signup/` |
| `src/app/profil/*` | `src/app/profil/` |

### 4. Intégrer la BottomNav

Dans ton layout principal (`src/app/layout.tsx` ou un `MainLayout`) :

```tsx
import BottomNav from "@/components/layout/BottomNav";

// ...
<body>
  {children}
  <BottomNav />
</body>
```

### 5. Adapter les liens de la BottomNav (si besoin)

Dans `BottomNav.tsx`, vérifie les `href` :

- `/` → Accueil
- `/live` → tes lives
- `/create` ou `/videos/new` → bouton central
- `/boutique` → ta boutique
- `/profil` → profil de l’utilisateur connecté

---

## Ce qui est corrigé

| Point | Solution |
|-------|----------|
| 1. Bug rôle | `SignupForm` envoie `role` dans `raw_user_meta_data` + trigger `handle_new_user` le respecte |
| 2. Navigation | `BottomNav` avec 5 onglets + bouton central + |
| 3. Accueil TikTok | `HomeFeed` + `page.tsx` → feed vertical snap/autoplay |
| 4. Profils | Page `/profil/[id]` + upload avatar + voir les autres |

---

## Notes importantes

- Le trigger `handle_new_user` **remplace** l’ancien. Vérifie qu’il n’y a pas de conflit avec une ancienne version.
- Si tu as déjà une page d’inscription, remplace juste le formulaire par `SignupForm`.
- Le feed Accueil charge actuellement les **vidéos**. Tu pourras y ajouter les lives plus tard.

