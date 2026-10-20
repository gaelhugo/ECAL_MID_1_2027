# Atelier prompts webcam

Vanilla JS + Vite. Commentaires du code source en français.

- Langues (`src/i18n/`) : interface, exemples et commentaires du code généré en français ou en anglais.
  Langue = Réglages (localStorage `atelier.lang` : `fr`/`en`, absent = automatique), sinon système
  (`navigator.languages[0]` commence par `fr` → français, sinon anglais). Changer de langue recharge la page.
  Textes d'interface : `fr.json`/`en.json` via `t("clé", { variables })` — jamais de texte en dur dans le code.
  Exemples : `title`, `prompt`, `code` = `{ fr, en }` (lus avec `pick()`) ; dans `code`, ne traduire que
  commentaires et textes affichés, les instructions restent identiques.
  Consignes au modèle (`PromptBuilder.js`, `modes.js`) en anglais ; `LANGUAGE_RULES` (règle + rappel final) et
  `LANGUAGE_REMINDERS` (ajouté à la demande, dans la langue voulue) imposent la langue des commentaires.

- Dev : `npm run dev` · Build (vérification) : `npm run build`
- Processus de démo : un fichier JSON par processus dans `src/examples/*.json`, chargé automatiquement
  (`import.meta.glob`, triés par nom) ; format décrit en tête de `src/examples/index.js`
  (`{ title, mode, steps: [{ title, prompt, code: [lignes] }] }`, champs localisables `{ fr, en }`).
  `DEFAULT_FILE` = chargé au démarrage (`raster-image.json`).
  « Nouveau processus » (1er du menu) = une seule cellule vide. Côté interface, on dit « processus » (pas « notebook »).
- Modes (`src/runtime/modes.js`) : `vanilla` (JavaScript canvas, défaut), `p5` (p5.js 1.11.13, mode global),
  `three` (three.js r186 → `window.THREE` + `THREE.OrbitControls`, via `runtime/libs/three-global.js?worker&url`,
  module ES donc cellules « deferred »), `dom` (page entière, helper `css()`). Champ `"mode"` du JSON ;
  le menu n'affiche que les processus du mode choisi, chaque mode a son « Nouveau processus ».
  Un mode fournit : style de base, bibliothèque (aperçu = fichiers locaux, export = CDN), règles du prompt système.
  Bibliothèques épinglées dans `package.json` (versions exactes) : garder `P5_VERSION`/`THREE_VERSION` synchronisées.
- Le code de chaque étape s'exécute dans sa propre balise `<script>` (iframe), rejouée dans l'ordre :
  déclarer chaque `const`/`let` une seule fois ; ce qui évolue est une `function` redéfinie plus tard.
- Prompt modifié → génération (`src/llm/`), par défaut via LM Studio, relayé par le proxy Vite `/lmstudio`
  (cible `LMSTUDIO_URL`, défaut `http://localhost:1234` ; modèle `VITE_LMSTUDIO_MODEL` dans `.env`,
  actuellement `qwen2.5-coder-14b-instruct`, sinon le modèle chargé).
- Réglages (⚙︎, `src/ui/SettingsPanel.js`, localStorage `atelier.settings`) : choix du service, LM Studio par défaut.
  Services dans `src/llm/providers.js` ; adresses dans `src/llm/endpoints.js` (`TARGETS`, partagées avec
  le proxy Vite et `../AgentCodingWithLMStudio-mac/electron/server.js`). Par défaut chacun passe par
  un proxy Vite (`/gemini`, `/groq`, `/mistral`, `/openrouter`) ; en build `VITE_DIRECT_API=1`
  (version web GitHub Pages), le navigateur appelle les services directement et `LlmClient` ajoute
  `targetAddressSpace: "local"` pour LM Studio (prompt Chrome « accès au réseau local »).
  `LlmClient` = API OpenAI, `GeminiClient` = API Gemini (clé dans `x-goog-api-key`).
- Version web publiée : https://gaelhugo.github.io/editor.proce55us/ (dépôt `gaelhugo/editor.proce55us`,
  build seul). `deploy-web.sh` construit (`VITE_DIRECT_API=1`, `--base /editor.proce55us/`) et pousse ;
  lancée automatiquement à la fin de `../AgentCodingWithLMStudio-mac/release.sh` (même version que l'app macOS).
- Contexte envoyé au modèle : code complet des cellules rendues au-dessus + fonctions actives (`ProgramSummary`).
- Cellules : `id` unique et stable (≠ position) ; le noyau rejoue dans l'ordre du notebook (`kernel.run(cells, order)`).
- Le code utilise des guillemets doubles (formatage Prettier de l'utilisateur).
