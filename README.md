# Kdanse Web

Site de réservation et paiement pour Kdanse, construit en Next.js.

## Setup

```bash
# Installer les dépendances
npm install

# Créer un fichier .env.local avec les identifiants Firebase
cp .env.local.example .env.local
# Éditer .env.local avec vos identifiants

# Lancer le serveur dev
npm run dev
```

Le site est accessible sur `http://localhost:3000`.

## Variables d'environnement

### Dev
Utiliser le projet Firebase `kdanse-app-dev`.

### Prod
Utiliser le projet Firebase `kdanse-app-84cf1` (sur Vercel).

## Structure

- `app/` — Routes Next.js (App Router)
- `src/lib/` — Utilitaires (Firebase config, helpers)
- `src/contexts/` — Contextes React (Auth, etc.)
- `src/hooks/` — Hooks personnalisés
- `src/types/` — Types TypeScript (User, Membership, Stage, etc.)
- `src/components/` — Composants réutilisables

## Phase 1 (Fondations) ✓

- ✓ Auth Firebase partagée
- ✓ Page de connexion
- ✓ Dashboard basique
- ✓ Admin : gestion des permissions par page
- → Prochaine étape : configurer Firestore & déployer Vercel

## Phases suivantes

- Phase 2 : Saisons, cours, tarifs
- Phase 3 : Adhésion + paiement HelloAsso
- Phase 4 : Comptabilité
