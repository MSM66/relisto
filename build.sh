#!/bin/sh
set -e
cd "$(dirname "$0")"
VERSION="$(date -u +%Y%m%d.%H%M)"
# Supabase (clave pública "publishable"; la seguridad la dan las reglas RLS del servidor)
CFG_URL=$(node -e 'try{process.stdout.write(require("./supabase/config.json").url||"")}catch(e){}')
CFG_KEY=$(node -e 'try{process.stdout.write(require("./supabase/config.json").key||"")}catch(e){}')
SB_URL="${SB_URL-$CFG_URL}"; SB_KEY="${SB_KEY-$CFG_KEY}"
mkdir -p build
# Base de conocimiento: legible en la versión académica, codificada en la de tienda
node -e '
const fs = require("fs"); const kb = JSON.parse(fs.readFileSync("src/kb-data.json", "utf8")); delete kb.note;
fs.writeFileSync("build/kb-plain.js", "const KB = " + JSON.stringify(kb) + ";\n");
const key = Buffer.from("rl" + Date.now().toString(36)); const raw = Buffer.from(JSON.stringify(kb), "utf8");
const enc = Buffer.from(raw.map((b, i) => b ^ key[i % key.length])).toString("base64");
fs.writeFileSync("build/kb-enc.js", "const KB = (() => { const k = " + JSON.stringify(key.toString()) + "; const b = atob(" + JSON.stringify(enc) + "); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i) ^ k.charCodeAt(i % k.length); return JSON.parse(new TextDecoder().decode(u)); })();\n");
'
CORE1="src/seed.js src/rules.js build/KB src/kb.js src/illus.js src/ops.js src/market.js"
CORE2="src/qr.js src/visage.js src/figure.js src/local.js src/auth.js src/app1.js src/app2.js src/app3.js src/app4.js src/app5.js src/app6.js src/app7.js src/app8.js src/app9.js src/app10.js src/app11.js src/cloud.js src/beta.js src/welcome.js src/boot.js"
JS_ACAD="$(echo $CORE1 | sed 's#build/KB#build/kb-plain.js#') src/tests.js $CORE2"
printf 'function runSelfTests() { return []; }\n' > build/notests.js
JS_STORE="$(echo $CORE1 | sed 's#build/KB#build/kb-enc.js#') build/notests.js $CORE2"
# 1) Artefacto de Claude (versión académica completa)
{
  cat src/head.html
  printf '<div id="app"></div>\n<div id="modal-root"></div>\n<script>\n"use strict";\nconst IS_PWA = false;\nconst IS_STORE = false;\nconst SB_URL = "";\nconst SB_KEY = "";\nconst APP_VERSION = "%s";\n' "$VERSION"
  cat $JS_ACAD
  printf '\n</script>\n'
} > artifact/relisto.html
# 2) App instalable (GitHub Pages): index = versión de tienda; academico.html = versión completa
rm -rf docs && mkdir -p docs/icons
page() { # $1 IS_STORE, $2 archivo JS
  printf '<!doctype html>\n<html lang="es-PE">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta name="theme-color" content="#173F35">\n<meta name="description" content="Relisto. Ya tienes qué ponerte. Arma outfits con la ropa que ya tienes y dale más vida.">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="RELISTO">\n'
  printf '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%%}[hidden]{display:none!important}</style>\n'
  grep -v 'claude:viewport-fit-sides' src/head.html
  printf '</head>\n<body>\n<div id="app"></div>\n<div id="modal-root"></div>\n<script>\n'
  cat "$2"
  printf '\n</script>\n</body>\n</html>\n'
}
{ printf '"use strict";\nconst IS_PWA = true;\nconst IS_STORE = true;\nconst SB_URL = "%s";\nconst SB_KEY = "%s";\nconst APP_VERSION = "%s";\n' "$SB_URL" "$SB_KEY" "$VERSION"; cat $JS_STORE; } > build/store.js
/opt/npm-tools/node_modules/.bin/esbuild build/store.js --minify-whitespace --minify-syntax --legal-comments=none --log-level=warning --outfile=build/store.min.js
{ printf '"use strict";\nconst IS_PWA = true;\nconst IS_STORE = false;\nconst SB_URL = "%s";\nconst SB_KEY = "%s";\nconst APP_VERSION = "%s";\n' "$SB_URL" "$SB_KEY" "$VERSION"; cat $JS_ACAD; } > build/acad.js
page true build/store.min.js > docs/index.html
page false build/acad.js > docs/academico.html
sed "s/__VERSION__/$VERSION/" pwa-src/sw.js > docs/sw.js
cp pwa-src/manifest.webmanifest pwa-src/README.md docs/
node -e '
const fs = require("fs"); let cfg = {}; try { cfg = require("./supabase/config.json"); } catch (e) {}
const head = fs.readFileSync("pwa-src/_legal_head.html", "utf8"); const date = "17 de noviembre de 2026";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const contact = cfg.contact ? " Escríbenos a <a href=\"mailto:" + esc(cfg.contact) + "\">" + esc(cfg.contact) + "</a>." : " Escríbenos desde la app (Mi perfil → Privacidad y datos).";
const owner = cfg.owner ? " El responsable del tratamiento de tus datos es " + esc(cfg.owner) + "." : "";
const del = cfg.contact ? "<div class=\"box\"><b>Si ya no tienes la app</b><p>Escribe a <a href=\"mailto:" + esc(cfg.contact) + "?subject=Eliminar%20mi%20cuenta%20RELISTO\">" + esc(cfg.contact) + "</a> desde el correo de tu cuenta con el asunto “Eliminar mi cuenta”. La eliminamos en un máximo de 7 días y te confirmamos por correo.</p></div>" : "";
for (const [f, t] of [["privacidad", "Política de privacidad"], ["eliminar-cuenta", "Eliminar tu cuenta"]]) {
  const body = fs.readFileSync("pwa-src/" + f + ".body.html", "utf8").replace("__DATE__", date).replace("__OWNER__", owner).replace("__CONTACT__", contact).replace("__CONTACTDEL__", del);
  fs.writeFileSync("docs/" + f + ".html", head.replace("__TITLE__", t) + body + "</main></body></html>\n");
}'
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
