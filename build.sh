#!/bin/sh
set -e
cd "$(dirname "$0")"
JS="src/seed.js src/rules.js src/illus.js src/ops.js src/tests.js src/qr.js src/visage.js src/figure.js src/local.js src/auth.js src/app1.js src/app2.js src/app3.js src/app4.js src/app5.js src/app6.js src/boot.js"
VERSION="$(date -u +%Y%m%d.%H%M)"
# 1) Artefacto de Claude
{
  cat src/head.html
  printf '<div id="app"></div>\n<div id="modal-root"></div>\n<script>\n"use strict";\nconst IS_PWA = false;\nconst APP_VERSION = "%s";\n' "$VERSION"
  cat $JS
  printf '\n</script>\n'
} > artifact/relisto.html
# 2) App instalable (carpeta lista para GitHub Pages)
rm -rf docs && mkdir -p docs/icons
{
  printf '<!doctype html>\n<html lang="es-PE">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta name="theme-color" content="#173F35">\n<meta name="description" content="Vístete rápido. Dale más vida a tu ropa.">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="RELISTO">\n'
  printf '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%%}[hidden]{display:none!important}</style>\n'
  grep -v 'claude:viewport-fit-sides' src/head.html
  printf '</head>\n<body>\n<div id="app"></div>\n<div id="modal-root"></div>\n<script>\n"use strict";\nconst IS_PWA = true;\nconst APP_VERSION = "%s";\n' "$VERSION"
  cat $JS
  printf '\n</script>\n</body>\n</html>\n'
} > docs/index.html
sed "s/__VERSION__/$VERSION/" pwa-src/sw.js > docs/sw.js
cp pwa-src/manifest.webmanifest pwa-src/README.md docs/
touch docs/.nojekyll
node -e '
const sharp = require("/opt/npm-tools/node_modules/sharp"); const fs = require("fs");
const svg = fs.readFileSync("pwa-src/icon.svg");
const pad = Buffer.from(fs.readFileSync("pwa-src/icon.svg","utf8").replace("translate(56 56) scale(10)","translate(126 126) scale(6.5)"));
Promise.all([
  sharp(svg).resize(192,192).png().toFile("docs/icons/icon-192.png"),
  sharp(svg).resize(512,512).png().toFile("docs/icons/icon-512.png"),
  sharp(svg).resize(180,180).png().toFile("docs/icons/apple-touch-icon.png"),
  sharp(pad).resize(512,512).png().toFile("docs/icons/icon-maskable-512.png")
]).then(()=>console.log("icons ok"));'
echo "version $VERSION"
