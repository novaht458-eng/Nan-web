#!/usr/bin/env bash
ACTION="$1"
PKG="$2"
BASE_URL="https://tu-sitio.netlify.app/.netlify/functions"

if [ "$ACTION" = "install" ]; then
  if [ -z "$PKG" ]; then echo "uso: nan install paquete@version"; exit 1; fi
  echo "descargando $PKG ..."
  resp=$(curl -s "${BASE_URL}/servePackage?p=${PKG}")
  if echo "$resp" | jq -e . >/dev/null 2>&1; then
    filename=$(echo "$resp" | jq -r .filename)
    b64=$(echo "$resp" | jq -r .b64)
    tmp="/tmp/nan_${RANDOM}_$filename"
    echo "$b64" | base64 -d > "$tmp"
    mkdir -p ./nan_modules
    if file "$tmp" | grep -q 'Zip archive'; then
      unzip -o "$tmp" -d "nan_modules/${PKG}"
    else
      mkdir -p "nan_modules/${PKG}"
      tar -xzf "$tmp" -C "nan_modules/${PKG}"
    fi
    echo "instalado en ./nan_modules/${PKG}"
    rm "$tmp"
  else
    echo "error: respuesta invalida: $resp"
    exit 1
  fi
else
  echo "uso: $0 install paquete@version"
fi
