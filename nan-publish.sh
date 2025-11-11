#!/usr/bin/env bash
# uso:
# ./nan-publish.sh nombre version archivo.zip APIKEY
# o
# ./nan-publish.sh --git https://github.com/user/repo [--token TOKEN] nombre version APIKEY

ARGS=("$@")
if [ "$1" = "--git" ]; then
  GITURL="$2"
  shift 2
  if [ "$1" = "--token" ]; then
    GITTOKEN="$2"
    shift 2
  fi
  NAME="$1"
  VERSION="$2"
  APIKEY="$3"
  # llamamos API con git_repo_url
  curl -s -X POST "https://tu-sitio.netlify.app/.netlify/functions/publish" -H "Content-Type: application/json" -d @- <<EOF
{
  "apikey":"$APIKEY",
  "name":"$NAME",
  "version":"$VERSION",
  "description":"Publicado via nan-publish.sh (git)",
  "git_repo_url":"$GITURL",
  "git_token":"${GITTOKEN:-""}"
}
EOF
else
  NAME="$1"
  VERSION="$2"
  FILE="$3"
  APIKEY="$4"
  if [ -z "$NAME" ] || [ -z "$VERSION" ] || [ -z "$FILE" ] || [ -z "$APIKEY" ]; then
    echo "uso: $0 nombre version archivo.zip APIKEY  OR  $0 --git <url> [--token token] nombre version APIKEY"
    exit 1
  fi
  b64=$(base64 -w 0 "$FILE")
  curl -s -X POST "https://tu-sitio.netlify.app/.netlify/functions/publish" -H "Content-Type: application/json" -d @- <<EOF
{
  "apikey":"$APIKEY",
  "name":"$NAME",
  "version":"$VERSION",
  "description":"Publicado via nan-publish.sh",
  "file_b64":"$b64",
  "filename":"$(basename $FILE)"
}
EOF
fi
