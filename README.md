# 🛍️ Moshi – Live Shopping Platform

**Version :** 1.3.0 (Final Release)  
**Stack :** Next.js 15 · React 19 · Supabase · Tailwind CSS · TypeScript · Cloudflare  

Moshi est une plateforme de **live shopping immersive** inspirée de TikTok. Elle permet à **tout le monde** (acheteurs comme vendeurs, même avec 0 abonné) de créer du contenu, de diffuser des lives interactifs, de vendre des produits en direct et de monétiser via un système de cadeaux virtuels.

---

## 📑 Sommaire

1. [Fonctionnalités Clés](#-fonctionnalités-clés)
2. [Stack Technique](#-stack-technique)
3. [Prérequis](#-prérequis)
4. [Installation Locale](#-installation-locale)
5. [Variables d'Environnement](#-variables-denvironnement)
6. [Configuration Base de Données & Storage](#-configuration-base-de-données--storage)
7. [Structure du Projet](#-structure-du-projet)
8. [Configuration Administrateur](#-configuration-administrateur)
9. [Scripts Disponibles](#-scripts-disponibles)
10. [Déploiement (Cloudflare)](#-déploiement-cloudflare)
11. [Roadmap](#-roadmap)

---

## ✨ Fonctionnalités Clés

### 📱 Expérience Utilisateur (Style TikTok)
- **Feed Vertical Immersif** : Scroll magnétique (`snap-y`), autoplay intelligent, préchargement des vidéos.
- **Interactions** : Double-tap pour liker (avec animation cœur), pull-to-refresh, partage natif.
- **Stories 24h** : Barre de stories en haut du feed avec viewer plein écran et barres de progression.
- **Recherche Avancée** : Onglets dédiés pour trouver des Créateurs, des Produits ou des Vidéos.

### 🎥 Live Shopping (Ouvert à Tous)
- **Live pour tous** : Acheteurs et vendeurs peuvent lancer un live, même avec 0 abonné.
- **Chat Temps Réel** : Messages instantanés via Supabase Realtime.
- **Produits Épinglés** : Les vendeurs peuvent mettre en avant des produits pendant le live pour un achat rapide.
- **Monétisation (Coins & Cadeaux)** : 
  - Boutique de coins (packs avec bonus).
  - Envoi de cadeaux animés (Rose, Lion, Fusée, etc.) avec système de **combo**.
  - Classement des **Top Donateurs** en direct.

### 💬 Social & Communication
- **Messagerie Privée (DM)** : Conversations en temps réel style Instagram/TikTok.
- **Notifications In-App** : Filtrables (Likes, Follows, Commentaires, Cadeaux) avec indicateurs non-lus.
- **Profils Riches** : Stats (abonnés, vidéos), grille de contenu, bio, avatar.

### 🛡️ Administration & Sécurité
- **Rôles Utilisateurs** : `acheteur`, `vendeur`, `admin`.
- **Row Level Security (RLS)** : Politiques de sécurité strictes sur toutes les tables Supabase.
- **Modération** : Possibilité pour les admins de gérer les utilisateurs et le contenu.

---

## 🛠️ Stack Technique

- **Frontend** : Next.js 15 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS, `tailwind-merge`, `clsx`
- **Animations** : Framer Motion
- **Backend / BDD** : Supabase (Auth, PostgreSQL, Realtime, Storage, RLS)
- **Icônes** : Lucide React
- **Live Video (Prêt)** : Structure prête pour LiveKit / Agora WebRTC
- **Déploiement** : Cloudflare Pages via `@opennextjs/cloudflare`

---

## 📋 Prérequis

- Node.js 20+ (recommandé)
- npm, yarn ou pnpm
- Un compte [Supabase](https://supabase.com/)
- Un compte [Cloudflare](https://dash.cloudflare.com/) (pour le déploiement)

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
# Éditez .env.local avec vos clés Supabase (voir section suivante)

# 4. Appliquer les migrations SQL
# Allez dans votre Dashboard Supabase > SQL Editor et exécutez les scripts de création de tables/RLS.

# 5. Créer les buckets Storage
# Allez dans Storage > New Bucket : 'videos', 'avatars', 'stories' (Public: Oui)

# 6. Lancer le serveur de développement
npm run dev


