# Lawhi — لوحي

Application islamique pour la Mauritanie : Coran (Hafs et Warsh), horaires de prière et
notifications, Qibla, adhkar et adʿiya, bibliothèque, dons en MRU.

Monorepo pnpm + Turborepo :

| Dossier               | Contenu                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `apps/mobile`         | Application Expo (Android, iOS, Web) — React Native, React Navigation, Zustand, TanStack Query, i18next |
| `apps/api`            | API REST NestJS + Prisma (PostgreSQL / Supabase)                                                        |
| `apps/admin`          | Administration des dons (React + Vite)                                                                  |
| `packages/shared`     | Types, schémas Zod, logique pure (horaires, notifications, Qibla, MRU, statuts de don)                  |
| `packages/quran-data` | Texte coranique vérifié (Hafs, Warsh) généré à partir de sources documentées                            |
| `packages/content`    | Adhkar, adʿiya, livres, récitateurs — extraits à l'identique de l'app Flutter                           |
| `packages/i18n`       | Traductions `ar.json`, `fr.json`, `en.json`                                                             |
| `packages/config`     | Configuration ESLint partagée                                                                           |
| `docs/`               | Architecture, déploiement, rapport                                                                      |

## Démarrage rapide (développement)

Prérequis : Node 22+, pnpm 10, Docker (base PostgreSQL locale).

```bash
pnpm install
cp .env.example .env                      # mot de passe de la base locale
cp apps/api/.env.example apps/api/.env    # même mot de passe dans DATABASE_URL
docker compose up -d                      # PostgreSQL 16 sur le port 5433

pnpm --filter @lawhi/api build            # génère le client Prisma et compile
pnpm --filter @lawhi/api db:deploy        # applique les migrations
pnpm --filter @lawhi/api db:seed          # Coran, contenus, moyens de paiement (désactivés)
pnpm dev:api                              # http://localhost:3000/api

cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_API_URL, Supabase (public)
pnpm dev:mobile                           # Expo (le lecteur PDF exige un development build)

cp apps/admin/.env.example apps/admin/.env
pnpm dev:admin                            # http://localhost:5173
```

## Qualité

```bash
pnpm typecheck   # TypeScript strict, tous les paquets
pnpm lint        # ESLint
pnpm test        # 98 tests + vérification des données coraniques et des traductions
pnpm build       # shared, API, admin
pnpm --filter @lawhi/mobile export:web
```

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
et [`docs/RAPPORT_FINAL.md`](docs/RAPPORT_FINAL.md).
