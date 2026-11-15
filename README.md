# 🩷💜🩵 Moshi – Soft Social Commerce

**Version :** 2.0.0 (Refonte UI/UX)  
**Stack :** Next.js 15 · React 19 · Supabase · Tailwind CSS · Framer Motion · TypeScript · LiveKit · Cloudflare  

Moshi est une plateforme de **Live Shopping immersive** et sociale. Inspirée des codes du divertissement (style TikTok), Moshi se distingue par son identité visuelle **douce, moderne et professionnelle** ("Soft Social Commerce") et par sa vocation à connecter créateurs, acheteurs et vendeurs dans un écosystème unique.

---

## ✨ Nouvelle Identité Visuelle

La version 2.0 introduit le **Moshi Design System**, conçu pour être lumineux, fluide et chaleureux.

### 🎨 Palette Officielle
| Couleur | Code Hex | Utilisation |
| :--- | :--- | :--- |
| **Rose Pastel** | `#FF8FB1` | Accents, Dégradés |
| **Violet** | `#9D7BEA` | Couleur Primaire, Boutons |
| **Bleu Pastel** | `#60A5FA` | Accents, Dégradés |
| **Fond Clair** | `#F9FAFB` | Arrière-plan principal |
| **Fond Sombre** | `#111111` | Mode sombre, Vidéos |
| **Texte** | `#1F2937` | Lisibilité |

**Dégradé Signature :** Rose → Violet → Bleu Pastel

### 🧩 Composants de Base
- **Boutons** : Arrondis (pill), avec variantes `gradient`, `soft`, `glass` et `outline`.
- **Cartes** : Coins très arrondis (`rounded-3xl`), ombres douces.
- **Avatars** : Bordure dégradée signature.
- **Effet Glassmorphism** : Utilisé pour les boutons flottants sur les vidéos et les lives.

---

## 🚀 Fonctionnalités Clés

### 📱 Expérience Utilisateur (Feed & Social)
- **Feed Vertical Immersif** : Scroll magnétique, autoplay intelligent, mélange aléatoire de vidéos et de lives.
- **Interactions** : Double-tap pour liker, commentaires, partages, enregistrements.
- **Stories 24h** : Barre de stories avec viewer, compteur de vues et suppression.
- **Recherche Avancée** : Onglets dédiés (Créateurs, Produits, Vidéos).
- **Messagerie** : Conversations privées en temps réel (Supabase Realtime).

### 🎥 Live Shopping (Ouvert à Tous)
- **Live pour tous** : Acheteurs et vendeurs peuvent lancer un live.
- **Live Shopping (Vendeur)** : Produits épinglés, achat en un clic, gestion du stock.
- **Chat Temps Réel** : Messages instantanés, notifications de "Join" et "Follow".
- **Monétisation** : Envoi de cadeaux virtuels (animations), système de pièces (Coins).

### 🛍️ E-commerce & Vendeurs
- **Dashboard Vendeur** : Gestion des produits (ajout, modification, suppression).
- **Boutique Publique** : Catalogue de produits avec recherche et filtres.
- **Commandes** : Suivi des commandes acheteurs/vendeurs avec statuts (Pending, Paid, Shipped, Delivered).
- **Notifications** : Alertes pour les commandes, cadeaux, likes et abonnements.

### 🛡️ Administration & Sécurité
- **Rôles** : `acheteur`, `vendeur`, `admin`.
- **Sécurité** : Row Level Security (RLS) strict sur toutes les tables Supabase.
- **Modération** : Gestion des utilisateurs et du contenu signalé.

---

## 🛠️ Stack Technique

- **Frontend** : Next.js 15 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS, Framer Motion (animations), Lucide React (icônes)
- **Backend / BDD** : Supabase (Auth, PostgreSQL, Realtime, Storage, RLS)
- **Live Video** : LiveKit (WebRTC)
- **Déploiement** : Cloudflare Pages via `@opennextjs/cloudflare`

---

## 📋 Prérequis

- Node.js 20+ (recommandé)
- npm, yarn ou pnpm
- Un compte [Supabase](https://supabase.com/)
- Un compte [LiveKit](https://livekit.io/)
- Un compte [Cloudflare](https://dash.cloudflare.com/)

---

## 🚀 Installation Locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/moshilivesupport-dev/Moshi.git
cd Moshi

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditez .env.local avec vos clés (voir section suivante)

# 4. Appliquer les migrations SQL
# Allez dans votre Dashboard Supabase > SQL Editor et exécutez les scripts de création de tables/RLS.

# 5. Créer les buckets Storage
# Storage > New Bucket : 'videos', 'avatars', 'stories', 'products' (Public: Oui)

# 6. Lancer le serveur de développement
npm run dev