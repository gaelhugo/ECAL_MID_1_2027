#!/usr/bin/env bash
# Publie une nouvelle release GitHub de proce55us.
#
#   1. Incrémenter "version" dans package.json
#   2. ./release.sh  →  build + tag vX.Y.Z + release GitHub + upload dmg/zip
#
# Les artifacts ont des noms sans version (proce55us-universal.dmg) : le lien
# « releases/latest/download/… » de la page d'accueil reste donc toujours bon.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
REPO="gaelhugo/ECAL_MID_1_2027"
API="https://api.github.com/repos/$REPO"

echo "→ Build de proce55us $TAG"
./build-mac.sh

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  TOKEN="$GITHUB_TOKEN"
else
  TOKEN="$(security find-generic-password -s 'gh:github.com' -w 2>/dev/null \
    || security find-internet-password -s github.com -w 2>/dev/null)" \
    || { echo "Aucun token GitHub dans le trousseau (ou exporte GITHUB_TOKEN)." >&2; exit 1; }
fi
AUTH=(-H "Authorization: token $TOKEN")

echo "→ Tag $TAG"
git tag -f "$TAG"
git push -f origin "$TAG"

echo "→ Release GitHub $TAG"
RELEASE_JSON="$(curl -s "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"tag_name\":\"$TAG\",\"name\":\"proce55us $TAG\",\"body\":\"Build macOS universel de proce55us $TAG (Apple Silicon + Intel, macOS 12+).\"}" \
  "$API/releases")"
UPLOAD_URL="$(printf '%s' "$RELEASE_JSON" | node -pe \
  "JSON.parse(require('fs').readFileSync(0)).upload_url?.split('{')[0] ?? ''")"

# La release existe déjà pour ce tag → on réutilise son upload_url
if [[ -z "$UPLOAD_URL" ]]; then
  echo "  (release existante, réutilisation)"
  UPLOAD_URL="$(curl -s "${AUTH[@]}" "$API/releases/tags/$TAG" | node -pe \
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
