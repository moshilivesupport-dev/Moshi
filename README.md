# Moshi – Module Vidéos (max 45 s)

Pack **uniquement vidéos** à intégrer dans le projet Moshi existant  
(compatible migrations 001–008, auth, profiles, products).

**Qui peut poster :** acheteurs **et** vendeurs (tout compte connecté).

---

## Contenu

```
src/components/video/
  VideoUploadForm.tsx   Upload + contrôle durée ≤ 45s
  VideoFeed.tsx         Feed vertical (snap + autoplay)

src/app/videos/
  page.tsx              Feed /videos
  new/page.tsx          Publier /videos/new
  [id]/page.tsx         Détail /videos/[id]

supabase/migrations/
  009_short_videos.sql  Tables videos, likes, comments + RLS
```

---

## Installation

### 1. Copier les fichiers dans ton repo Moshi

| Source (ce ZIP) | Destination (projet Moshi) |
|-----------------|----------------------------|
| `src/components/video/*` | `src/components/video/` |
| `src/app/videos/*` | `src/app/videos/` |
| `supabase/migrations/009_short_videos.sql` | `supabase/migrations/` |

### 2. SQL Supabase

Dans le **SQL Editor**, après les migrations 001→008 :

→ exécuter `009_short_videos.sql`  
→ choisir **Run and enable RLS**

### 3. Storage

Dashboard Supabase → **Storage** → New bucket :

- Nom : `videos`
- **Public** : oui

Policies Storage recommandées :
- **SELECT** : public
- **INSERT** : authenticated, chemin commençant par `{user_id}/`

### 4. Navbar (optionnel)

Dans `src/components/layout/Navbar.tsx` :

```tsx
import { Clapperboard } from "lucide-react";

// dans le tableau links :
{ href: "/videos", label: "Vidéos", icon: Clapperboard },
```

### 5. Tester

```bash
npm run dev
```

- Feed : http://localhost:3000/videos  
- Publier : http://localhost:3000/videos/new (connecté)

---

## Règles métier

| Règle | Détail |
|-------|--------|
| Durée max | **45 secondes** (client + `CHECK` SQL) |
| Taille max | 80 Mo |
| Formats | MP4, WebM, QuickTime |
| Auteurs | Tous les profils authentifiés |

---

## Dépendances

Déjà présentes dans Moshi : `@supabase/ssr`, `lucide-react`, `@/components/ui/Button`, `@/components/ui/Input`, `@/lib/utils` (`formatNumber`).
