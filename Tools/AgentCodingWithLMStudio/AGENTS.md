# Atelier prompts webcam

Vanilla JS + Vite. Commentaires en français.

- Dev : `npm run dev` · Build (vérification) : `npm run build`
- Processus de démo : un fichier JSON par processus dans `src/examples/*.json`, chargé automatiquement
  (`import.meta.glob`, triés par nom) ; format décrit en tête de `src/examples/index.js`
  (`{ title, steps: [{ title, prompt, code: [lignes] }] }`). `DEFAULT_FILE` = chargé au démarrage (`raster-image.json`).
  « Nouveau processus » (1er du menu) = une seule cellule vide. Côté interface, on dit « processus » (pas « notebook »).
- Le code de chaque étape s'exécute dans sa propre balise `<script>` (iframe), rejouée dans l'ordre :
  déclarer chaque `const`/`let` une seule fois ; ce qui évolue est une `function` redéfinie plus tard.
- Prompt modifié → génération via LM Studio (`src/llm/`), relayé par le proxy Vite `/lmstudio`
  (cible `LMSTUDIO_URL`, défaut `http://localhost:1234` ; modèle `VITE_LMSTUDIO_MODEL` dans `.env`,
  actuellement `qwen2.5-coder-14b-instruct`, sinon le modèle chargé).
- Contexte envoyé au modèle : code complet des cellules rendues au-dessus + fonctions actives (`ProgramSummary`).
- Cellules : `id` unique et stable (≠ position) ; le noyau rejoue dans l'ordre du notebook (`kernel.run(cells, order)`).
- Le code utilise des guillemets doubles (formatage Prettier de l'utilisateur).
