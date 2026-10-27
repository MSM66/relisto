/* =====================================================================
   PLATAFORMA LOCAL (app instalable): IndexedDB para datos y fotos,
   compresión de fotos, respaldo completo, instalación y actualizaciones.
   En el artefacto de Claude (IS_PWA = false) solo se usa compressImage.
   ===================================================================== */
const LOCAL = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('relisto', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async tx(store, mode, fn) {
    if (!this.db) this.db = await this.open();
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const s = t.objectStore(store); const box = {};
      fn(s, box);
      t.oncomplete = () => res(box.out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  get(k) { return this.tx('kv', 'readonly', (s, box) => { const r = s.get(k); r.onsuccess = () => { box.out = r.result; }; }); },
  set(k, v) { return this.tx('kv', 'readwrite', (s) => { s.put(v, k); }); },
  async photoPut(k, blob) { const buf = await blob.arrayBuffer(); return this.tx('photos', 'readwrite', (s) => { s.put({ type: blob.type || 'image/jpeg', buf }, k); }); },
  photoDel(k) { return this.tx('photos', 'readwrite', (s) => { s.delete(k); }); },
  photoAll() {
    return this.tx('photos', 'readonly', (s, box) => {
      box.out = [];
      const r = s.openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { box.out.push({ key: c.key, val: c.value }); c.continue(); } };
    });
  }
};

/* ---------- Fotos ---------- */
function compressImage(file, max, quality) {
  max = max || 1400; quality = quality || 0.82;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => resolve(b && b.size < file.size ? b : file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
/** Muestra la foto al instante y la reemplaza por su versión comprimida cuando está lista. */
function attachPhoto(modal, file) {
  const ph = readImageFile(file);
  modal.photo = ph;
  compressImage(file).then((blob) => {
    if (blob === file) return;
    ph.file = blob; ph.url = URL.createObjectURL(blob);
    if (UI.modal === modal && modal.photo === ph) render();
  });
  return ph;
}
function persistPhoto(key, ph) {
  if (!IS_PWA || !ph || !ph.file) return;
  LOCAL.photoPut(key, ph.file).catch(() => toast('No se pudo guardar la foto en el teléfono: puede que falte espacio.'));
}
function dropPhotosPrefix(prefix) {
  Object.keys(PHOTOS).forEach((k) => { if (k.startsWith(prefix)) { delete PHOTOS[k]; if (IS_PWA) LOCAL.photoDel(k).catch(() => {}); } });
}
function blobToDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
async function dataURLToBlob(d) { const r = await fetch(d); return r.blob(); }

/* ---------- Carga y guardado locales ---------- */
async function initLocal() {
  try {
    const raw = await LOCAL.get('state');
    const photos = await LOCAL.photoAll();
    photos.forEach(({ key, val }) => {
      if (!val || !val.buf) return;
      const blob = new Blob([val.buf], { type: val.type || 'image/jpeg' });
      PHOTOS[key] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false };
    });
    let restored = false;
    if (raw && !CAP.dirty) {
      let parsed = null; try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (parsed && validateImport(parsed).ok) {
        S.demo = parsed.spaces.demo || S.demo; S.personal = parsed.spaces.personal || null;
        S.space = parsed.space === 'personal' && S.personal ? 'personal' : 'demo';
        UI.view = (parsed.ui && parsed.ui.view) || UI.view; UI.sceneHint = false; restored = true;
      }
    }
    CAP.storage = 'local';
    if (!restored) await doSave();
    render();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then((p) => { CAP.persisted = p; }).catch(() => {});
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { CAP.usage = e; }).catch(() => {});
  } catch (e) {
    CAP.storage = 'error'; CAP.lastError = 'indexeddb'; renderSaveState();
  }
}

/* ---------- Respaldo completo (datos + fotos) ---------- */
async function makeFullBackup() {
  const out = exportState(S, 0);
  out.note = 'Respaldo completo de RELISTO: datos y fotos de este teléfono.';
  out.photos = {};
  for (const [k, ph] of Object.entries(PHOTOS)) { if (ph && ph.file) out.photos[k] = await blobToDataURL(ph.file); }
  out.photosOmitted = 0;
  return out;
}
async function saveBackupFile() {
  const obj = await makeFullBackup();
  const name = 'relisto-respaldo-' + TODAY + '.json';
  const file = new File([JSON.stringify(obj)], name, { type: 'application/json' });
  const n = Object.keys(obj.photos).length;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Respaldo de RELISTO' });
      return 'Respaldo listo (' + n + ' fotos). Guárdalo en Archivos, Drive o envíalo a tu correo.';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'Respaldo cancelado.'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return 'Respaldo descargado (' + n + ' fotos): ' + name + '.';
}
function validBackupPhotos(photos) {
  if (!photos) return {};
  const ok = {};
  Object.entries(photos).slice(0, 3000).forEach(([k, v]) => {
    if (/^(demo|personal):[A-Za-z0-9_-]{1,24}$/.test(k) && typeof v === 'string' && /^data:image\/(jpeg|png|webp|gif|heic|heif);base64,/.test(v)) ok[k] = v;
  });
  return ok;
}
async function restorePhotos(obj) {
  const photos = validBackupPhotos(obj.photos);
  ['demo', 'personal'].forEach((sp) => { if (obj.spaces[sp]) dropPhotosPrefix(sp + ':'); });
  let n = 0;
  for (const [k, d] of Object.entries(photos)) {
    const sp = k.split(':')[0]; if (!obj.spaces[sp]) continue;
    const blob = await dataURLToBlob(d);
    PHOTOS[k] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false };
    if (IS_PWA) await LOCAL.photoPut(k, blob).catch(() => {});
    n++;
  }
  return n;
}

/* ---------- Instalación y actualizaciones ---------- */
const PWA_UI = { deferred: null, updateReady: false, reloadOnChange: false, reg: null, installDismissed: false };
const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function initPWA() {
  if (!IS_PWA) return;
  try { PWA_UI.installDismissed = localStorage.getItem('relisto-install-dismissed') === '1'; } catch (e) { /* sin almacenamiento */ }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); PWA_UI.deferred = e; render(); });
  window.addEventListener('appinstalled', () => { PWA_UI.deferred = null; toast('RELISTO quedó instalada en tu pantalla de inicio.'); render(); });
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (PWA_UI.reloadOnChange) location.reload(); });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    PWA_UI.reg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage('SKIP_WAITING'); // la página ya es nueva: activar sin interrumpir
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) { PWA_UI.updateReady = true; render(); }
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
function applyUpdate() {
  const reg = PWA_UI.reg;
  if (reg && reg.waiting) { PWA_UI.reloadOnChange = true; reg.waiting.postMessage('SKIP_WAITING'); setTimeout(() => location.reload(), 2500); }
  else location.reload();
}
function renderPWABanners() {
  if (!IS_PWA) return '';
  let out = '';
  if (PWA_UI.updateReady) out += '<div class="update-bar" role="status"><span><b>Hay una versión nueva de RELISTO.</b> Tus prendas y fotos se mantienen.</span><button class="btn sm" style="background:var(--gold);border-color:var(--gold);color:#2B2208" data-act="pwaUpdate">Actualizar</button></div>';
  return out;
}
function renderInstallCard(force) {
  if (!IS_PWA || isStandalone() || (PWA_UI.installDismissed && !force)) return '';
  const how = PWA_UI.deferred ? '<button class="btn sm primary" data-act="pwaInstall">Instalar RELISTO</button>'
    : isIOS() ? '<span class="small">En Safari, toca <b>Compartir</b> (el cuadrado con la flecha) y luego <b>Agregar a pantalla de inicio</b>. Abre RELISTO siempre desde ese ícono.</span>'
      : '<span class="small">En Chrome, abre el menú <b>⋮</b> y elige <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.</span>';
  return '<div class="card explore stack tight"><div class="row between"><b>Instala RELISTO en tu celular</b>' + (force ? '' : '<button class="btn sm ghost" data-act="pwaDismiss" aria-label="Ocultar">' + IC.x + '</button>') + '</div>' +
    '<span class="small">Queda con su propio ícono, a pantalla completa y funciona sin conexión.</span>' + how + '</div>';
}
