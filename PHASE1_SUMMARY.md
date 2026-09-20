# Phase 1 - Fondations du site + Auth partagée ✓

Résumé de ce qui a été livré le 20/09/2026.

## Scaffold + Setup

- [x] Repo `kdanse-web` créé en Next.js 16 (App Router, Tailwind)
- [x] Dépendances : Firebase, next-auth prêtes (auth pour plus tard)
- [x] Config TypeScript/webpack pour alias `@/src`
- [x] Build webpack testé et fonctionnelle (`npm run build -- --webpack`)

## Auth Firebase partagée

- [x] Config `src/lib/firebase.ts` : support dev (`kdanse-app-dev`) et prod (`kdanse-app-84cf1`) via `.env.local`
- [x] AuthContext (`src/contexts/AuthContext.tsx`) : listening `onAuthStateChanged`, chargement du profil utilisateur depuis Firestore
- [x] Hook `useAuth()` (`src/hooks/useAuth.ts`) : accès facile au contexte auth dans les composants
- [x] ProtectedRoute : composant pour restreindre l'accès aux pages non-authentifiées

## Pages & Layout

- [x] Layout racine avec `AuthProvider` wrapping
- [x] Page de connexion `/login` : formulaire email/password Firebase Auth
- [x] Dashboard `/` (protégé) : affichage du nom et rôles utilisateur
- [x] Layout protégé `/app/(protected)/layout.tsx` : nav avec logout, lien admin
- [x] Page admin `/admin/settings/page-permissions` : gestion des permissions par page (sauvegardes dans Firestore `appSettings/main`)

## Types & Modèles

- [x] Types Kdanse adaptés (`src/types/index.ts`) :
  - User, UserRole (admin/prof/animateur/user)
  - Stage (avec StagePricing : solo/couple/ffdanse/withHousing)
  - Membership (inscription à un stage, avec `visibleUserIds`)
  - PaymentGroup, PaymentInstallment (chèque/virement/helloasso)
  - BankAccount (pour comptabilité future)
  - PagePermissions (rôles dynamiques par page, pas des 4 rôles fixes)

## Config Firebase

- [x] `.env.local` : identifiants pour `kdanse-app-dev` (Christophe a créé le projet)
- [x] `.env.local.example` : template pour futurs devs
- [x] `firestore.rules` : règles de sécurité complètes (Firestore, préférées à Realtime DB)
  - Authentification obligatoire
  - Admins accès total
  - Utilisateurs voient leurs données + celles partagées via `visibleUserIds`
  - Collections existantes (seances, activites, inscriptions) restent ouvertes pour l'app mobile

## Déploiement

- [x] `vercel.json` : config build (webpack) + secrets à configurer
- [x] `package.json` : scripts `dev` et `build` prêts

## Checklist avant Phase 2

### À faire immédiatement

- [ ] **Déployer `firestore.rules`** sur `kdanse-app-dev` (Firebase Console → Firestore → Rules)
- [ ] **Obtenir identifiants prod** (`NEXT_PUBLIC_FIREBASE_*` de `kdanse-app-84cf1`) et les fournir pour Vercel
- [ ] **Créer premier utilisateur** dans Firestore `users/{uid}` avec `roles: ['admin']`
- [ ] **Tester l'app** en local :
  ```bash
  npm install
  npm run dev
  ```
  - Login avec un email/password Firebase
  - Dashboard affiche le nom et rôles
  - Admin → Accès pages : page charge les perms existantes (ex: vide, ou `'membership': ['admin']`)
  - Sauvegarder une perm, vérifier Firestore `appSettings/main.pagePermissions`

### Avant Phase 2

- [ ] Déployer sur Vercel (nouvelles variables d'env)
- [ ] Vérifier que la connexion marche en prod
- [ ] S'arranger pour que les futurs devs hors ligne puissent cloner et `npm run dev` (donner les identifiants dev)

## Prochains chantiers (Phase 2)

1. **Données de base** : créer collections `stages`, `levels`, `danceStyles`, `pricingPlans`
2. **Pages admin** : CRUD Stages, niveaux, styles, tarifs (copier le pattern CDCV)
3. **Dashboard utilisateur** : liste des stages disponibles, inscription basique (pas encore paiement)

## Architecture confirmée

- Repo séparé `kdanse-web` (ne pas toucher `kdanse-app`)
- Firebase `kdanse-app-dev` pour développement, `kdanse-app-84cf1` pour production (même compte Google)
- Pas de monorepo : types dupliqués vs `@kdanse/types` (trop de setup pour la taille du projet)
- Vercel pour hosting (no-brainer avec Next.js)
- Rôles dynamiques par page, pas les 4 rôles fixes de kdanse-app
