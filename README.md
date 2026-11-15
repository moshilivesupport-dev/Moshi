# 🩷💜🩵 Moshi — Soft Social Commerce 2.0

Projet neuf et indépendant, créé à partir du cahier des charges Moshi fourni dans la conversation. Il ne dérive d'aucun dépôt existant.

## Stack
Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Lucide · Supabase SDK · LiveKit SDK.

## Démarrage
```bash
npm install
cp .env.example .env.local
npm run dev
```
Ouvrir http://localhost:3000.

## Écrans inclus
- Feed vertical de démonstration avec interactions locales, navigation, actions sociales et cartes produits.
- Boutique avec recherche visuelle et filtres de catégories.
- Profil avec avatar, statistiques et grille vidéo.
- Live : page d'entrée de démonstration.
- Messagerie : stories et conversations de démonstration.

## Design system
Rose `#FF8FB1`, violet `#9D7BEA`, bleu `#60A5FA`, fond `#F9FAFB`, sombre `#111111`, texte `#1F2937`. Typographie Poppins, composants arrondis, ombres douces et glassmorphism.

## Intégrations à configurer
Les variables Supabase et LiveKit sont listées dans `.env.example`. Les écrans utilisent actuellement des données de démonstration. Les identifiants, tables, politiques RLS, buckets, endpoints de tokens LiveKit, webhooks, paiements, inventaire et flux temps réel doivent être configurés et raccordés à votre projet avant mise en production. Ne jamais exposer `LIVEKIT_API_SECRET` dans le navigateur.

## Notes
- Les médias distants de démonstration nécessitent une connexion Internet.
- Le logo final Moshi peut être ajouté dans `public/` puis branché dans l'en-tête.
- Ce ZIP constitue un socle UI/UX autonome, pas un backend e-commerce ou streaming déjà déployé.
