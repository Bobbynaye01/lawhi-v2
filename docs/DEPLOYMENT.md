# Déploiement

## 1. Supabase (nouveau projet)

1. Créer le projet sur supabase.com (région la plus proche : Europe de l'Ouest).
2. **Authentication → Providers** : activer _Email_ (confirmation d'e-mail recommandée).
3. **Authentication → URL Configuration** : ajouter `lawhi://` (app mobile) et l'URL de
   l'admin dans _Redirect URLs_ (liens de confirmation et de récupération de mot de passe).
4. Récupérer (Project Settings) :
   - `SUPABASE_URL` et la clé **anon / publishable** → applications (publique) ;
   - la clé **service_role** → **uniquement** `apps/api/.env` sur le serveur ;
   - l'URI de connexion PostgreSQL (_Session pooler_, port 5432) → `DATABASE_URL`.
5. Aucune table ni bucket à créer à la main : les migrations Prisma créent le schéma et
   activent le RLS ; l'API crée le bucket privé `donation-proofs` au premier envoi de preuve.

## 2. API (NestJS)

N'importe quel hébergeur Node 22+ (Render, Railway, Fly.io, VPS…).

```bash
pnpm install --frozen-lockfile
pnpm --filter @lawhi/api build
pnpm --filter @lawhi/api db:deploy   # migrations non destructives
pnpm --filter @lawhi/api db:seed     # idempotent : ne réécrit jamais les réglages admin
pnpm --filter @lawhi/api start       # NODE_ENV=production
```

Variables : voir `apps/api/.env.example` (`DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`, `NOMINATIM_USER_AGENT` avec une adresse de contact).
Vérification : `GET /api/health` → `{"status":"ok"}`.

Premier administrateur : se connecter une fois dans l'app ou l'admin, puis sur le serveur :
`pnpm --filter @lawhi/api admin:grant adresse@exemple.mr`.
Ensuite dans l'admin : saisir les **vrais numéros** de chaque opérateur et les activer.

## 3. Admin web

```bash
pnpm --filter @lawhi/admin build     # dist/ statique (Netlify, Vercel, Nginx…)
```

Variables (publiques) : `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Ajouter l'URL de l'admin à `CORS_ORIGINS` de l'API.

## 4. Application mobile

Variables (publiques, dans `apps/mobile/.env` ou les secrets EAS) : `EXPO_PUBLIC_API_URL`,
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- Développement Android local : `npx expo run:android` (Android SDK + ~10 Go libres).
- Builds cloud : `npx eas-cli@latest build --platform android|ios` (compte Expo requis ;
  obligatoire pour iOS sans Mac).
- **Signature Android** : pour que la v2 remplace l'app Flutter déjà installée, il faut le même
  identifiant (`com.lawhi.lawhi`, conservé) **et la même clé** : réutiliser
  `lawhi/android/upload-keystore.jks` (Flutter) comme keystore EAS ou de build local.
- Son d'adhan : voir `apps/mobile/assets/sounds/README.md`.

## 5. Base locale et tests

```bash
docker compose up -d
pnpm test   # crée/actualise la base lawhi_test (refus si le nom ne finit pas par _test)
```
