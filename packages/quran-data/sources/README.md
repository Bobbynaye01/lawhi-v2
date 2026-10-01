# Sources du texte coranique

Aucun texte n'est saisi à la main. Tous les fichiers de `data/` sont générés par
`scripts/build.ts` à partir des fichiers ci-dessous, téléchargés le 2026-10-01.

| Fichier | Origine | Rôle | Licence |
|---|---|---|---|
| `alquran-cloud-uthmani.json` | `https://api.alquran.cloud/v1/quran/quran-uthmani` — texte **Tanzil Uthmani** + métadonnées (juz, page, rub', sajda) | Texte Hafs canonique | Tanzil : copie verbatim autorisée avec attribution (tanzil.net) |
| `qurancom-uthmani.json` | `https://api.quran.com/api/v4/quran/verses/uthmani` | Contrôle croisé indépendant (rasm identique exigé) | Quran Foundation |
| `qurancom-chapters-{ar,fr,en}.json` | `https://api.quran.com/api/v4/chapters` | Noms des sourates, lieu de révélation | Quran Foundation |
| `warsh-quranpedia-mushaf4.json` | Quranpedia, mushaf n° 4 (KFGQPC — Warsh ʿan Nāfiʿ), repris de l'app Flutter | Texte Warsh | KFGQPC : usage gratuit, texte non modifié, attribution |
| `qurancom-rub-boundaries.json` | `https://api.quran.com/api/v4/rub_el_hizbs` | Bornes des 240 rub' (référence) | Quran Foundation |
| `flutter-divisions.json` | Extrait automatiquement de `lawhi/lib/features/quran/data/quran_divisions.dart` | Contrôle des bornes juz/hizb/rub' Hafs | Interne |

Remarque : AlQuran.cloud préfixe le premier verset de chaque sourate (sauf 1 et 9)
par la basmala ; le script la retire et vérifie le résultat contre Quran.com.

## Écarts constatés entre sources (2026-10-01)

- **Rub' n° 106** : Tanzil le fait commencer à 15:50 ; Quran.com, l'app Flutter et le mushaf de Médine à **15:49**. La valeur Quran.com est retenue ; l'écart Tanzil est listé dans `KNOWN_TANZIL_RUB_ERRORS`.
- **Table `hizbStarts` de l'app Flutter** : fausse à partir du hizb 12 (décalée). Elle n'est plus utilisée ; le hizb est calculé par `⌈rub / 4⌉`, contrôlé par `juz = ⌈hizb / 2⌉`.
