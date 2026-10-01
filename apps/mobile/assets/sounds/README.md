# Son d'adhan

Aucun fichier d'adhan n'est fourni : les enregistrements disponibles en ligne sont
généralement protégés par le droit d'auteur.

Pour activer le mode « adhan » des notifications :

1. Obtenir un enregistrement dont vous avez les droits (enregistrement propre,
   licence libre explicite, ou autorisation écrite du muezzin / de l'éditeur).
2. Le convertir en **WAV**, mono, 30 secondes maximum (limite iOS des sons de
   notification), et le déposer ici sous le nom exact `adhan.wav`.
3. Reconstruire l'application (`npx expo run:android` ou `eas build`).

`app.config.ts` détecte le fichier : sans lui, l'option « adhan » est masquée et
les notifications utilisent le son système.
