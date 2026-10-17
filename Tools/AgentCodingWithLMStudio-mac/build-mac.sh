#!/usr/bin/env bash
# Construit l'application macOS autonome « proce55us » (l'Atelier prompts webcam).
#
#   ./build-mac.sh             → dist/*.dmg et dist/*.zip (universel : Apple Silicon + Intel)
#   ./build-mac.sh --web-only  → construit seulement l'application web dans app/ (pour « npm start »)
#
# L'application web (../AgentCodingWithLMStudio) n'est pas modifiée : elle est
# simplement construite (vite build) directement dans le dossier app/ d'ici.
#
# Par défaut, l'app utilise le modèle chargé dans LM Studio sur chaque Mac.
# Pour imposer un modèle : VITE_LMSTUDIO_MODEL=nom-du-modele ./build-mac.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$HERE/../AgentCodingWithLMStudio"

[[ "$(uname)" == "Darwin" ]] || { echo "Ce script doit être lancé sur macOS." >&2; exit 1; }
command -v npm >/dev/null || { echo "Node.js (npm) est requis : https://nodejs.org" >&2; exit 1; }

echo "→ 1/3 Dépendances"
[[ -d "$WEB/node_modules" ]] || (cd "$WEB" && npm ci)
[[ -d "$HERE/node_modules" ]] || (cd "$HERE" && npm ci)

echo "→ 2/3 Application web → app/"
# Variable vide = modèle actuellement chargé dans LM Studio (au lieu de celui du .env)
(cd "$WEB" && VITE_LMSTUDIO_MODEL="${VITE_LMSTUDIO_MODEL-}" \
  npx vite build --outDir "$HERE/app" --emptyOutDir --logLevel warn)

[[ "${1:-}" == "--web-only" ]] && { echo "✓ app/ prête (lancer : npm start)"; exit 0; }

# Icône générée (grille de pixels « 55 ») si absente
[[ -f "$HERE/build/icon.icns" ]] || node "$HERE/make-icon.js"

echo "→ 3/3 Application macOS → dist/"
(cd "$HERE" && npx electron-builder --mac --publish never)

echo "✓ Terminé :"
ls -1 "$HERE"/dist/*.dmg "$HERE"/dist/*.zip
