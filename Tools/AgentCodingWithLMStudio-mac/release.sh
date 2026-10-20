#!/usr/bin/env bash
# Publie une nouvelle release GitHub de proce55us.
#
#   ./release.sh 1.2.0  →  version 1.2.0 dans package.json (commit), build,
#                          push de main + tag v1.2.0, release GitHub + upload dmg/zip,
#                          puis la version web (../AgentCodingWithLMStudio/deploy-web.sh)
#   ./release.sh        →  idem avec la version actuelle de package.json
#
# Notes de la release : la section « ## X.Y.Z » de CHANGELOG.md (à écrire avant).
# Les artifacts ont des noms sans version (proce55us-universal.dmg) : le lien
# « releases/latest/download/… » de la page d'accueil reste donc toujours bon,
# et son badge de version (dernière release) se met à jour tout seul.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

REPO="gaelhugo/ECAL_MID_1_2027"
API="https://api.github.com/repos/$REPO"

# 1. Version : argument facultatif → package.json (+ lockfile), puis commit
if [[ -n "${1:-}" ]]; then
  npm version "$1" --no-git-tag-version --allow-same-version >/dev/null
  git add package.json package-lock.json
  git diff --cached --quiet || git commit -q -m "chore: proce55us v$1"
fi
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

# Notes : section de CHANGELOG.md pour cette version (texte par défaut sinon)
NOTES="$(awk -v v="## $VERSION" '$0 == v { on = 1; next } /^## / { on = 0 } on' CHANGELOG.md 2>/dev/null)"
[[ -n "${NOTES//[[:space:]]/}" ]] || NOTES="Build macOS universel de proce55us $TAG."
NOTES="$NOTES

---
macOS 12+ · Apple Silicon & Intel · ad-hoc signed: on first launch, open **System Settings → Privacy & Security → Open Anyway**."

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  TOKEN="$GITHUB_TOKEN"
else
  TOKEN="$(security find-generic-password -s 'gh:github.com' -w 2>/dev/null \
    || security find-internet-password -s github.com -w 2>/dev/null)" \
    || { echo "Aucun token GitHub dans le trousseau (ou exporte GITHUB_TOKEN)." >&2; exit 1; }
fi
AUTH=(-H "Authorization: token $TOKEN")

echo "→ Build de proce55us $TAG"
./build-mac.sh

echo "→ Push de main + tag $TAG"
git push -q origin HEAD
git tag -f "$TAG"
git push -q -f origin "$TAG"

echo "→ Release GitHub $TAG"
BODY="$(node -e 'process.stdout.write(JSON.stringify({
  tag_name: process.argv[1], name: "proce55us " + process.argv[1], body: process.argv[2] }))' "$TAG" "$NOTES")"
RELEASE_JSON="$(curl -s "${AUTH[@]}" -H 'Content-Type: application/json' -d "$BODY" "$API/releases")"
UPLOAD_URL="$(printf '%s' "$RELEASE_JSON" | node -pe \
  "JSON.parse(require('fs').readFileSync(0)).upload_url?.split('{')[0] ?? ''")"

# La release existe déjà pour ce tag → on met ses notes à jour et on réutilise son upload_url
if [[ -z "$UPLOAD_URL" ]]; then
  echo "  (release existante, mise à jour)"
  EXISTING="$(curl -s "${AUTH[@]}" "$API/releases/tags/$TAG")"
  RELEASE_ID="$(printf '%s' "$EXISTING" | node -pe "JSON.parse(require('fs').readFileSync(0)).id")"
  curl -s -X PATCH "${AUTH[@]}" -H 'Content-Type: application/json' -d "$BODY" \
    "$API/releases/$RELEASE_ID" >/dev/null
  UPLOAD_URL="$(printf '%s' "$EXISTING" | node -pe \
    "JSON.parse(require('fs').readFileSync(0)).upload_url.split('{')[0]")"
fi

echo "→ Upload des artifacts"
for f in dist/proce55us-universal.dmg dist/proce55us-universal-mac.zip; do
  name="$(basename "$f")"
  # Supprimer l'asset du même nom s'il existe déjà (re-upload propre)
  ASSET_ID="$(curl -s "${AUTH[@]}" "$API/releases/tags/$TAG" | node -pe \
    "JSON.parse(require('fs').readFileSync(0)).assets.find(a => a.name === '$name')?.id ?? ''")"
  [[ -n "$ASSET_ID" ]] && curl -s -X DELETE "${AUTH[@]}" "$API/releases/assets/$ASSET_ID" >/dev/null
  curl -s "${AUTH[@]}" -H 'Content-Type: application/octet-stream' \
    --data-binary @"$f" "$UPLOAD_URL?name=$name" \
    | node -pe "'  ✓ ' + JSON.parse(require('fs').readFileSync(0)).name"
done

echo "✓ Publié : https://github.com/$REPO/releases/tag/$TAG"

# Version web : même commit, même version → toujours synchronisée avec l'app macOS
"$HERE/../AgentCodingWithLMStudio/deploy-web.sh"
