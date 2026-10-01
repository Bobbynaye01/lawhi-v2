# Architecture

## Vue d'ensemble

```
            ┌────────────── apps/mobile (Expo) ──────────────┐
            │ Coran, adhkar, livres, horaires, Qibla :         │
            │   HORS LIGNE (données embarquées + calcul local) │
            │ Comptes, dons : via l'API                        │
            └──────┬────────────────────────────┬─────────────┘
       Supabase Auth (clé publique)       HTTPS + JWT Supabase
                   │                            │
            ┌──────▼──────┐              ┌──────▼──────────────┐      ┌──────────────┐
            │  Supabase    │  JWKS public │  apps/api (NestJS)  │◄────►│ PostgreSQL   │
            │  Auth        │◄─────────────│  logique sensible   │      │ (Supabase)   │
            │  Storage     │◄─ service ───│  Prisma, Zod, RLS   │      └──────────────┘
            └─────────────┘   role (serveur)└──────▲──────────────┘
                                                   │ HTTPS + JWT
                                            ┌──────┴──────┐
                                            │ apps/admin  │
                                            └─────────────┘
```

## Décisions

| Sujet             | Décision                                                                         | Raison                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Backend           | NestJS 12                                                                        | Modules, guards, pipes : un module par domaine                                                              |
| Validation        | Zod, schémas partagés (`@lawhi/shared`)                                          | Mêmes règles dans l'app, l'admin et l'API                                                                   |
| Auth              | Supabase Auth ; l'API vérifie les JWT via le JWKS public                         | Aucun secret dans les clients ; inscription, récupération, sessions gérées                                  |
| Rôle admin        | Stocké dans la table `User`, attribué par `pnpm --filter @lawhi/api admin:grant` | Jamais déduit du jeton, jamais modifiable via l'API                                                         |
| Accès aux données | Uniquement via l'API ; RLS activé sans policy sur toutes les tables              | L'API REST automatique de Supabase est fermée aux clés publiques                                            |
| Coran             | Texte embarqué dans l'app + servi par l'API, généré par un seul script           | Hors ligne dès l'installation, une seule source de vérité                                                   |
| Horaires          | Calcul local (`adhan`), même moteur dans l'app et l'API                          | Fonctionne sans réseau ; notifications planifiables 12 jours à l'avance                                     |
| Notifications     | Plan déterministe + diff (annuler l'obsolète, ajouter le manquant)               | Aucun doublon ; replanification à chaque ouverture, changement de réglage ou de langue, et en tâche de fond |
| Preuves de don    | Upload via l'API (signature binaire vérifiée) vers un bucket Supabase privé      | Contrôle serveur du type/taille ; consultation admin par URL signée de 5 min                                |
| État mobile       | Un store Zustand par domaine ; TanStack Query pour les données serveur           | Séparation claire ; seules les données publiques sont persistées hors ligne                                 |
| TypeScript        | 6.0.3 épinglé                                                                    | TS 7 (réécriture Go) trop récent pour l'outillage                                                           |

## Modèle de données (PostgreSQL)

| Table                              | Rôle                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `User`                             | Miroir d'un utilisateur Supabase (`id` = `sub` du JWT), rôle, statut                            |
| `UserSettings`                     | Préférences synchronisables (langue, riwaya, méthode…)                                          |
| `Surah`, `Verse`                   | Texte Hafs et Warsh, page, juz, hizb, rubʿ, texte normalisé pour la recherche (index trigramme) |
| `Reciter`                          | Récitateurs vérifiés (EveryAyah)                                                                |
| `ReadingPosition`, `Bookmark`      | Reprise de lecture et favoris par riwaya                                                        |
| `DhikrCategory`, `Dhikr`           | Adhkar et adʿiya (traductions vides tant qu'aucune source reconnue)                             |
| `Book`, `BookChapter`, `BookEntry` | Bibliothèque : PDF + extraits texte                                                             |
| `DonationCause`                    | Projets (objectif en MRU facultatif)                                                            |
| `PaymentMethod`                    | Opérateurs mauritaniens ; activable seulement avec un numéro                                    |
| `Donation`                         | Don : montant, MRU, code, référence, preuve privée, statut                                      |
| `DonationEvent`                    | Journal d'audit de chaque changement de statut                                                  |
| `AppConfig`                        | Configuration serveur (montants proposés, version des données coraniques)                       |

Statuts d'un don : `pending → submitted → confirmed | rejected`, `cancelled` par le donateur
avant décision. Transitions contrôlées par `canTransition` (partagé) et par une mise à jour
conditionnelle en base (deux admins ne peuvent pas décider en même temps). Un admin ne peut
jamais traiter son propre don.

## Endpoints (`/api`)

Public : `GET health`, `GET settings`, `GET quran/surahs`, `GET quran/surahs/:id?riwaya=`,
`GET quran/juz/:n`, `GET quran/hizb/:n`, `GET quran/rub/:n`, `GET quran/pages/:n`,
`GET quran/search?q=`, `GET quran/reciters`, `GET prayer/methods`,
`GET prayer/times?lat&lon&date&days&method&madhab`, `GET prayer/cities?q=`, `GET qibla?lat&lon`,
`GET adhkar/categories`, `GET adhkar/categories/:id`, `GET library/books`,
`GET library/books/:id`, `GET library/books/:id/chapters/:chapterId`,
`GET donations/causes`, `GET donations/payment-methods`.

Utilisateur connecté : `GET|PATCH|DELETE me`, `PUT me/settings`, `GET me/reading-positions`,
`PUT me/reading-positions/:riwaya`, `GET|POST me/bookmarks`, `DELETE me/bookmarks/:id`,
`POST donations`, `GET donations/mine`, `GET donations/:id`, `POST donations/:id/reference`,
`POST donations/:id/proof` (multipart), `POST donations/:id/cancel`.

Admin : `GET admin/donations` (filtres statut/projet/moyen/dates, recherche, pagination),
`GET admin/donations/stats`, `GET admin/donations/:id`, `GET admin/donations/:id/proof`,
`PATCH admin/donations/:id/confirm`, `PATCH admin/donations/:id/reject`,
`GET|PATCH admin/payment-methods(/:id)`, `GET|POST|PATCH admin/causes(/:id)`,
`PUT admin/donation-presets`.

Pas de WebSocket : aucun besoin de temps réel (l'admin rafraîchit au focus).

## Sécurité

Helmet, CORS restreint aux origines déclarées (`CORS_ORIGINS`), limitation de débit globale
(120 req/min/IP) et renforcée sur les routes sensibles (10 dons/min, 20 recherches de ville/min),
corps JSON limité à 100 ko, validation Zod de chaque entrée, filtre d'erreurs qui ne renvoie
jamais de stack, SQL, jeton ou configuration, journalisation sans paramètres de requête,
variables d'environnement validées au démarrage (Supabase obligatoire en production, stockage
local interdit en production).
