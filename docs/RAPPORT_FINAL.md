# Lawhi v2 — rapport de reconstruction

_1er octobre 2026 — dépôt `C:\Users\MO\lawhi-v2` (Git local, non poussé)._

## 1. Architecture

Monorepo pnpm + Turborepo : `apps/mobile` (Expo), `apps/api` (NestJS), `apps/admin` (React/Vite),
`packages/shared`, `quran-data`, `content`, `i18n`, `config`. Détails et schéma :
[ARCHITECTURE.md](ARCHITECTURE.md).

## 2. Technologies

TypeScript 6 strict partout · Expo SDK 57 / React Native 0.86 / React 19 · React Navigation 7 ·
Zustand 5 · TanStack Query 5 (persistance hors ligne) · i18next · NestJS 12 · Prisma 7 ·
PostgreSQL 16 / Supabase (Auth, Storage) · Zod 4 · adhan (horaires) · jose (JWT) · Jest, Vitest,
Testing Library · ESLint 9 · Prettier.

## 3. Fonctionnalités terminées (vérifiées par tests ou exécution)

- **Coran** : 114 sourates, Hafs (6 236 versets) et Warsh (6 213) réels, juz / hizb / rubʿ / pages,
  basmala propre à chaque riwaya, lecture continue, recherche arabe hors ligne (et `2:255`),
  reprise de lecture, favoris, taille du texte, choix de la riwaya mémorisé.
- **Audio** : 20 récitateurs Hafs EveryAyah (fichiers vérifiés), verset par verset, lecture /
  pause / précédent / suivant / arrêt, progression, enchaînement automatique, cache et
  préchargement, erreurs réseau affichées, lecture en arrière-plan.
- **Horaires** : calcul local hors ligne, GPS ou recherche de ville (Nominatim via l'API, cache),
  12 méthodes (MWL par défaut), madhab pour ʿAsr, prochaine prière.
- **Notifications** : 12 jours planifiés (60 alertes), diff sans doublon, replanification à
  l'ouverture, au retour au premier plan, au changement de ville / méthode / mode / langue et
  en tâche de fond ; permissions gérées ; mode adhan seulement si un fichier légal est fourni.
- **Qibla** : calcul pur testé, capteur de cap, calibration, sens de rotation le plus court,
  retour haptique, messages pour refus de permission / absence de capteur / Web.
- **Adhkar & adʿiya** : 67 + 18 textes identiques à l'app Flutter (215/215 vérifiés), sources,
  compteurs quotidiens, progression, favoris, recherche, tasbih.
- **Bibliothèque** : 7 livres, téléchargement PDF avec progression / annulation / contrôle du
  format, lecteur intégré avec reprise de page, extraits texte lisibles hors ligne.
- **Dons** : MRU uniquement, montants proposés par le serveur, opérateurs mauritaniens configurés
  par l'admin, statut `pending` à la création, référence et preuve (image/PDF), suivi, annulation,
  progression des projets calculée sur les seuls dons confirmés. Jamais de « paiement réussi ».
- **Admin** : tableau de bord, liste filtrable/recherchable/paginée, preuve via URL temporaire,
  confirmation / refus motivé, historique, numéros des opérateurs, objectifs, montants proposés.
- **Comptes** : inscription, connexion, session persistante, mot de passe oublié (lien
  `lawhi://` traité dans l'app), déconnexion, suppression du compte (données effacées, dons en
  attente annulés, dons confirmés anonymisés). Les fonctions religieuses restent sans compte.
- **Langues** : arabe, français, anglais sur toute l'app (306 clés contrôlées automatiquement,
  y compris les codes d'erreur de l'API), RTL/LTR, mode sombre réel.

## 4. Fonctionnalités restantes / limites connues

| Sujet                                        | État                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build natif Android (`expo run:android`)     | **Non terminé** : la compilation Gradle a échoué par manque d'espace disque (0 o libre, ~2 Go actuellement). Les bundles JS Android (Hermes) et Web se génèrent. Prévoir ~10 Go libres ou EAS Build. |
| iOS                                          | Non compilé (nécessite un Mac ou EAS Build).                                                                                                                                                         |
| Supabase réel                                | Projet à créer par toi ; l'auth et le stockage ont été testés avec un JWKS local et un stockage disque, pas encore contre Supabase.                                                                  |
| Récitateurs Warsh                            | Aucun : aucune source avec correspondance vérifiée des versets. L'app l'indique.                                                                                                                     |
| Son d'adhan                                  | Aucun fichier sous licence ; procédure dans `apps/mobile/assets/sounds/README.md`.                                                                                                                   |
| Traductions FR/EN des adhkar                 | Vides par principe (aucune traduction générée).                                                                                                                                                      |
| 2 PDF (40 hadiths, Adhkar de Nawawi)         | Liens archive.org morts dans l'app actuelle ; extraits texte disponibles.                                                                                                                            |
| Synchronisation des préférences/favoris      | L'API est prête (`/me/settings`, `/me/bookmarks`, `/me/reading-positions`) ; l'app les garde encore en local.                                                                                        |
| Fuseau d'une ville recherchée                | Heures affichées dans le fuseau de l'appareil (indiqué à l'écran).                                                                                                                                   |
| Icône / écran de démarrage                   | Encore ceux du modèle Expo : à remplacer par l'identité visuelle Lawhi.                                                                                                                              |
| Admin                                        | Interface en français uniquement.                                                                                                                                                                    |
| Tests E2E sur appareil (Detox/Maestro) et CI | Non mis en place ; le scénario don → validation admin est couvert par les e2e API.                                                                                                                   |

## 5. Tables PostgreSQL

`User`, `UserSettings`, `Surah`, `Verse`, `Reciter`, `ReadingPosition`, `Bookmark`,
`DhikrCategory`, `Dhikr`, `Book`, `BookChapter`, `BookEntry`, `DonationCause`, `PaymentMethod`,
`Donation`, `DonationEvent`, `AppConfig` (+ `_prisma_migrations`). Rôle de chacune :
[ARCHITECTURE.md](ARCHITECTURE.md#modèle-de-données-postgresql).

## 6. Endpoints API

Liste complète : [ARCHITECTURE.md](ARCHITECTURE.md#endpoints-api).

## 7. Migrations Prisma (toutes additives)

1. `20261001060047_init` — schéma complet.
2. `20261001060105_verse_search_trgm` — extension `pg_trgm` + index GIN de recherche.
3. `20261001062654_book_pdf_size` — colonne `Book.pdfSizeMb`.
4. `20261001075716_enable_row_level_security` — RLS sur toutes les tables (API REST Supabase fermée).

## 8. Tests

| Paquet              | Tests                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@lawhi/shared`     | 26 (Qibla, MRU, téléphones, statuts de don, horaires, planification des notifications)                                                               |
| `@lawhi/api`        | 6 unitaires + 34 e2e sur PostgreSQL réel (auth, permissions, Coran, prière, contenus, dons, moyens de paiement, preuves, limites de débit, sécurité) |
| `@lawhi/mobile`     | 29 (traductions, données hors ligne, stores, liens d'auth, navigation, écrans)                                                                       |
| `@lawhi/admin`      | 3                                                                                                                                                    |
| `@lawhi/quran-data` | régénération + recoupement des sources (échoue au moindre écart)                                                                                     |
| `@lawhi/i18n`       | complétude ar/fr/en                                                                                                                                  |

## 9. Lint / typecheck

`pnpm typecheck` : 5/5 OK · `pnpm lint` : 5/5 OK, 0 avertissement · Prettier : conforme.

## 10. Build

| Cible                             | Résultat                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm build` (shared, API, admin) | OK                                                                           |
| `expo export --platform web`      | OK (1 102 modules)                                                           |
| `expo export --platform android`  | OK (bundle Hermes 8,2 Mo, 1 406 modules)                                     |
| `expo prebuild` Android           | OK                                                                           |
| `gradlew assembleDebug`           | **Échec : disque plein** (pas une erreur de code)                            |
| `expo-doctor`                     | 20/21, puis `@types/jest` aligné ; nouvelle vérification impossible (réseau) |

## 11. Configuration Expo

`apps/mobile/app.config.ts` : nom Lawhi / لوحي, `com.lawhi.lawhi` (iOS et Android, conservé),
version 2.0.0 (versionCode / buildNumber 2), schéma `lawhi`, thème automatique, permissions
minimales (localisation, notifications, alarmes exactes ; micro bloqué), plugins expo-audio
(arrière-plan), expo-location, expo-notifications (son d'adhan seulement si fichier présent),
expo-background-task, react-native-blob-util.

## 12. Configuration Node.js

`apps/api` : NestJS, préfixe `/api`, configuration validée par Zod (`src/config/env.ts`), Prisma 7
avec adaptateur `pg`, garde d'authentification globale, limitation de débit, Helmet, CORS.

## 13. Configuration Supabase

Auth e-mail + mot de passe, URLs de redirection `lawhi://` ; base PostgreSQL gérée par les
migrations Prisma (RLS activé) ; bucket privé `donation-proofs` créé automatiquement par l'API.
Étapes : [DEPLOYMENT.md](DEPLOYMENT.md#1-supabase-nouveau-projet).

## 14. Variables d'environnement

| Où                          | Variables                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/.env` (serveur)   | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROOFS_BUCKET`, `CORS_ORIGINS`, `PORT`, `NODE_ENV`, `NOMINATIM_USER_AGENT`, `LOCAL_STORAGE_DIR` (dev uniquement) |
| `apps/mobile/.env` (public) | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`                                                                                                      |
| `apps/admin/.env` (public)  | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                                                                                                           |
| `.env` racine (dev)         | `LAWHI_DB_PASSWORD` (Docker)                                                                                                                                                            |

Aucun fichier `.env`, keystore ou clé n'est versionné.

## 15. Lancement

Voir [README.md](../README.md#démarrage-rapide-développement).

## 16. Déploiement

Voir [DEPLOYMENT.md](DEPLOYMENT.md).

## Constats sur l'app Flutter d'origine (corrigés dans la v2)

- Table `hizbStarts` fausse à partir du hizb 12 (ex. hizb 60 placé à 78:1 au lieu de 87:1).
- Le package Dart `quran` colle la basmala au verset 2:1 (texte Tanzil modifié).
- Métadonnée Tanzil : rubʿ 106 à 15:50 au lieu de 15:49 (écart documenté, valeur Quran.com retenue).
- Mode sombre inexistant (le thème sombre renvoyait le thème clair).
- Devise « دج », montants de dons inventés, un seul numéro pour 7 opérateurs.
- Écrans de bibliothèque non accessibles, route `libraryChapter` absente, 2 liens PDF morts.
