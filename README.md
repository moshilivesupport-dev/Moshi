# Moshi – Live Shopping Platform

**Version :** Complete (v1.1 + v1.2 + v1.3)  
**Stack :** Next.js 15 · Supabase · Tailwind CSS · TypeScript  

Moshi est une plateforme de **live shopping** avec une expérience proche de TikTok : feed vertical immersif, vidéos courtes, follows, lives vendeurs, boutique, coins et profils.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Structure du projet](#structure-du-projet)
4. [Prérequis](#prérequis)
5. [Installation](#installation)
6. [Variables d’environnement](#variables-denvironnement)
7. [Migrations SQL](#migrations-sql)
8. [Storage (buckets)](#storage-buckets)
9. [Navigation](#navigation)
10. [Modules détaillés](#modules-détaillés)
11. [Scripts](#scripts)
12. [Déploiement](#déploiement)
13. [Roadmap / points d’attention](#roadmap--points-dattention)
14. [Licence](#licence)

---

## Fonctionnalités

### Cœur expérience (style TikTok)

| Fonctionnalité | Description |
|----------------|-------------|
| Feed vertical immersif | Swipe, autoplay, snap plein écran |
| Pour toi / Suivis | Onglets en haut de l’accueil |
| Vidéos courtes | Max 45 secondes, MP4 / WebM / MOV |
| Like / Commentaire / Partage | Interactions sur le feed et les pages détail |
| Compteur de vues | Incrément via RPC |
| Follow / Unfollow | Bouton + compteurs abonnés / abonnements |
| Recherche | Créateurs et vidéos |
| Notifications | Follow, likes, système |
| Profils | Publics + photo de profil modifiable |
| Stories | Barre stories 24 h (fondation) |

### ADN Moshi (Live Shopping)

| Fonctionnalité | Description |
|----------------|-------------|
| Rôles | Acheteur / Vendeur à l’inscription (respecté en base) |
| Live Shopping | Pages lives + structure WebRTC (`LiveRoom`) |
| Boutique | Page shop produits vendeurs |
| Hub Créer | Vidéo · Live · Produit |
| Coins / Gifts | Prévu dans l’écosystème (selon tes modules existants) |

### Avancé (fondations)

| Fonctionnalité | Description |
|----------------|-------------|
| Recommandation | Score transparent (récence, popularité, follows, intérêts) |
| Duet / Stitch | Colonnes SQL + bouton + query params |
| Effets & filtres | Panneau UI prêt à brancher MediaPipe / Banuba |
| Sons tendance | Table `sounds` + page `/sounds` |
| Messages privés | Conversations + liste |
| Analytics créateur | Vues, likes, commentaires, watch time |
| Live WebRTC | Métadonnées + UI ; brancher LiveKit ou Agora |

---

## Stack technique

- **Frontend :** Next.js 15 (App Router), React 19, TypeScript  
- **Style :** Tailwind CSS  
- **Backend / Auth / DB :** Supabase (Auth, Postgres, RLS, Storage, Realtime)  
- **Icons :** lucide-react  
- **Live (à brancher) :** LiveKit ou Agora  

---

## Structure du projet

```
moshi-complete/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env.example
├── README.md
│
├── public/
│   └── icons/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout global + BottomNav
│   │   ├── page.tsx                # Accueil (Pour toi / Suivis)
│   │   ├── globals.css
│   │   ├── auth/signup/            # Inscription Acheteur / Vendeur
│   │   ├── live/                   # Découverte lives
│   │   ├── boutique/               # Shop
│   │   ├── create/                 # Hub création
│   │   ├── profil/                 # Profils (me + [id])
│   │   ├── videos/                 # Feed / new / [id]
│   │   ├── search/                 # Recherche
│   │   ├── notifications/          # Notifications
│   │   ├── messages/               # Messages privés
│   │   ├── sounds/                 # Sons tendance
│   │   └── analytics/              # Analytics créateur
│   │
│   ├── components/
│   │   ├── layout/BottomNav.tsx
│   │   ├── home/HomeFeed.tsx
│   │   ├── feed/HomeTabs.tsx
│   │   ├── feed/FollowingFeed.tsx
│   │   ├── social/FollowButton.tsx
│   │   ├── video/VideoFeed.tsx
│   │   ├── video/VideoUploadForm.tsx
│   │   ├── profile/ProfileView.tsx
│   │   ├── auth/SignupForm.tsx
│   │   ├── stories/StoryBar.tsx
│   │   ├── live/LiveRoom.tsx
│   │   ├── duet/DuetButton.tsx
│   │   ├── effects/EffectsPanel.tsx
│   │   └── ui/Button.tsx · Input.tsx
│   │
│   └── lib/
│       ├── supabase/client.ts
│       ├── supabase/server.ts
│       ├── recommendation.ts
│       └── utils.ts
│
└── supabase/migrations/
    ├── 009_short_videos.sql
    ├── 013_profile_role_and_avatar.sql
    ├── 014_tiktok_core_social.sql
    └── 015_advanced_tiktok_features.sql
```

---

## Prérequis

- Node.js 18+ (recommandé 20+)
- Compte Supabase
- npm ou pnpm

---

## Installation

```bash
# 1. Cloner / dézipper le projet
cd moshi-complete

# 2. Installer les dépendances
npm install

# 3. Configurer l’environnement
cp .env.example .env.local
# Éditer .env.local avec tes clés Supabase

# 4. Appliquer les migrations (SQL Editor Supabase)
#    Voir section Migrations ci-dessous

# 5. Créer les buckets Storage
#    Voir section Storage

# 6. Lancer en dev
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

---

## Variables d’environnement

Fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Optionnel (live) :

```env
LIVEKIT_URL=wss://xxx.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

---

## Migrations SQL

À exécuter **dans l’ordre**, après tes migrations existantes (001 → 008 ou 001 → 012).

| Fichier | Rôle |
|---------|------|
| `009_short_videos.sql` | Tables `videos`, `video_likes`, `video_comments` + RLS + triggers vues/likes |
| `013_profile_role_and_avatar.sql` | Rôle `acheteur` / `vendeur`, avatar, trigger `handle_new_user` |
| `014_tiktok_core_social.sql` | `follows`, `notifications`, compteurs profil |
| `015_advanced_tiktok_features.sql` | Stories, messages, sounds, duet/stitch, analytics, live_sessions, intérêts |

**Dans le SQL Editor Supabase :** ouvrir chaque fichier → Run.

Si erreur sur `profiles_role_check` : la migration 013 drop puis recrée la contrainte. Utiliser la version corrigée fournie dans le pack.

---

## Storage (buckets)

Dashboard Supabase → **Storage** → New bucket :

| Bucket | Public | Usage |
|--------|--------|--------|
| `videos` | Oui | Vidéos courtes |
| `avatars` | Oui | Photos de profil |
| `stories` | Oui | Stories (images / vidéos courtes) |

**Policies recommandées (exemple INSERT avatars / videos) :**

```sql
-- Lecture publique
create policy "Public read"
on storage.objects for select
using (bucket_id in ('videos', 'avatars', 'stories'));

-- Upload authentifié dans son dossier
create policy "Users upload own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('videos', 'avatars', 'stories')
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Navigation

Barre du bas (5 onglets) :

```
[ Accueil ]   [ Live ]   [  +  ]   [ Boutique ]   [ Profil ]
```

| Onglet | Route | Contenu |
|--------|-------|---------|
| Accueil | `/` | Feed Pour toi / Suivis |
| Live | `/live` | Lives en cours / à venir |
| + | `/create` | Vidéo · Live · Produit |
| Boutique | `/boutique` | Catalogue produits |
| Profil | `/profil` | Profil connecté (redirige vers `/profil/[id]`) |

Pages secondaires utiles :

- `/search` — Recherche  
- `/notifications` — Notifications  
- `/messages` — Messages privés  
- `/sounds` — Sons tendance  
- `/analytics` — Stats créateur  
- `/videos` — Feed vidéos  
- `/videos/new` — Publier une vidéo  
- `/auth/signup` — Création de compte  

---

## Modules détaillés

### Accueil (feed)

- Composants : `HomeTabs`, `HomeFeed`, `FollowingFeed`
- Onglets **Pour toi** (recommandation / popularité) et **Suivis** (créateurs suivis)
- Actions : like, commentaire, partage, follow via profil

### Vidéos

- Upload max **45 s**, contrôle client + contrainte SQL  
- Formats : MP4, WebM, QuickTime  
- Likes, commentaires, vues  

### Profils

- `/profil` → profil de l’utilisateur connecté  
- `/profil/[id]` → profil public  
- Upload avatar (bucket `avatars`)  
- Bouton Follow sur les profils des autres  

### Inscription

- Choix visible **Acheteur** / **Vendeur**  
- Rôle envoyé dans `raw_user_meta_data` et appliqué par le trigger `handle_new_user`  

### Live

- Page liste `/live`  
- Composant `LiveRoom` prêt pour **LiveKit** ou **Agora**  
- Table `live_sessions` pour métadonnées  

### Boutique & Créer

- `/boutique` — vitrine produits  
- `/create` — hub vers vidéo, live ou produit  

### Social avancé

- Follows + notifications  
- Recherche créateurs / vidéos  
- Stories (barre + tables 24 h)  
- Messages (liste conversations)  
- Duet / Stitch (liens + colonnes SQL)  
- Sons (`/sounds`)  
- Analytics (`/analytics`)  

---

## Scripts

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # ESLint
```

---

## Déploiement

Compatible avec :

- **Vercel** (Next.js natif)  
- **Cloudflare** (via OpenNext / opennextjs-cloudflare, comme ton setup actuel)  

Pense à définir les mêmes variables d’environnement en production et à autoriser l’URL de prod dans Supabase (Auth → URL configuration).

---

## Roadmap / points d’attention

### À brancher pour un niveau production

1. **Live réel** — Intégrer LiveKit (ou Agora) dans `LiveRoom.tsx`  
2. **Messages** — Page thread `/messages/[id]` + Realtime Supabase  
3. **Stories** — Player plein écran + upload  
4. **Duet** — UI d’enregistrement côte à côte sur `/videos/new`  
5. **Effets AR** — MediaPipe / Banuba / WebGL sur `EffectsPanel`  
6. **Sons** — Lier un son à l’upload vidéo  
7. **Recommandation** — Optionnel : embeddings / modèle ML  

### Conflits fréquents avec un repo Git existant

- `layout.tsx` : Navbar vs BottomNav  
- `page.tsx` : ancien accueil vs `HomeTabs`  
- Ancien `Navbar.tsx` si du code BottomNav a été collé dedans  
- Migrations déjà présentes (009, 010, etc.) : n’exécuter que le manquant  

---

## Licence

Projet privé Moshi. Tous droits réservés.

---

**Moshi Complete** — une base unique pour avancer sans fragmenter les packs v1.1 / v1.2 / v1.3.
