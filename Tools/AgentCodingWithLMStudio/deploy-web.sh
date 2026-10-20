#!/usr/bin/env bash
# Publie la version web de proce55us : https://gaelhugo.github.io/editor.proce55us/
#
#   ./deploy-web.sh
#
# Lancé automatiquement par ../AgentCodingWithLMStudio-mac/release.sh après chaque
# release : la version web et l'app macOS sont construites depuis le même commit,
# avec le même numéro de version (celui de ../AgentCodingWithLMStudio-mac/package.json).
#
# GitHub Pages n'a pas de proxy : VITE_DIRECT_API=1 fait appeler les services
# directement (src/llm/endpoints.js). Le site construit est poussé sur la branche
# main du dépôt gaelhugo/editor.proce55us (un commit par version).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="https://github.com/gaelhugo/editor.proce55us.git"
BASE="/editor.proce55us/"
VERSION="$(node -p "require('$HERE/../AgentCodingWithLMStudio-mac/package.json').version")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "→ Version web v$VERSION"
cd "$HERE"
[[ -d node_modules ]] || npm ci
# Variable vide = modèle actuellement chargé dans LM Studio (au lieu de celui du .env)
VITE_DIRECT_API=1 VITE_LMSTUDIO_MODEL="" \
  npx vite build --base "$BASE" --outDir "$WORK/build" --emptyOutDir --logLevel warn
touch "$WORK/build/.nojekyll"

echo "→ Publication sur $REPO_URL"
git clone -q --depth 1 "$REPO_URL" "$WORK/site" 2>/dev/null \
  || git init -q -b main "$WORK/site"
cd "$WORK/site"
# Remplace tout le contenu par le nouveau build (l'historique du dépôt garde chaque version)
git rm -rq --ignore-unmatch . >/dev/null
cp -R "$WORK/build/." .
git add -A
if git diff --cached --quiet; then
  echo "  (aucun changement)"
else
  git commit -q -m "proce55us v$VERSION"
  git push -q "$REPO_URL" HEAD:main
fi
echo "✓ https://gaelhugo.github.io/editor.proce55us/ (v$VERSION, mise en ligne d'ici ~1 min)"
