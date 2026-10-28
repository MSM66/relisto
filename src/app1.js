/* =====================================================================
   INTERFAZ: estado central, persistencia, utilidades de render
   ===================================================================== */
let TODAY = todayLima();
let S = freshState(TODAY);
const PHOTOS = {}; // fotos: en el artefacto viven solo en la sesión; en la app instalada se guardan en IndexedDB.: clave espacio:id → {url, file, originalUrl}
const CAP = { storage: 'pending', doc: null, sample: null, aiImages: false, dirty: false, saving: false, pendingSave: false, lastError: '' };
const UI = {
  view: 'hoy', modal: null, toast: null, toastTimer: null,
  gen: {}, draft: {}, ctxOpen: false, nl: '', nlFound: [],
  closet: { tab: 'prendas', q: '', cat: 'todas', avail: 'activas', sort: 'reciente', mode: 'grid' }, flipped: new Set(),
  plan: { tab: 'faltantes', explore: {}, filters: {}, result: {}, link: '' },
  circ: { threshold: {}, custom: '', flow: {}, period: 30 },
  profTab: 'esenciales', busy: new Set(), tests: null, exportText: '', importText: '', importMsg: null, sceneHint: true
};
const esc = escapeHTML;
const ws = () => S[S.space];
const prof = () => { const w = ws(); return w ? w.profiles.find((p) => p.id === w.activeProfileId) : null; };
const spaceKey = () => S.space + ':' + (ws() ? ws().activeProfileId : '');
const isDemo = () => S.space === 'demo';
const relDays = (n) => n <= 0 ? 'hoy' : n === 1 ? 'ayer' : 'hace ' + n + ' días';
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
function photoFor(item) { return PHOTOS[S.space + ':' + item.id] || null; }
function logEvent(type) { const w = ws(); if (!w) return; w.events.push({ type, at: new Date().toISOString() }); if (w.events.length > 300) w.events.shift(); }

/* ---------- Persistencia (almacenamiento personal del artefacto) ---------- */
function commit(opts) {
  CAP.dirty = true;
  scheduleSave();
  if (!opts || opts.render !== false) render();
}
let saveTimer = null;
function scheduleSave() {
  if (!CAP.doc && !IS_PWA) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 900);
}
async function doSave() {
  if (!CAP.doc && !IS_PWA) return;
  if (CAP.saving) { CAP.pendingSave = true; return; }
  CAP.saving = true;
  try {
    if (IS_PWA) {
      await LOCAL.set('state', JSON.stringify({ app: 'RELISTO', version: SCHEMA_VERSION, space: S.space, spaces: { demo: S.demo, personal: LEGACY.personal || null }, ui: { view: UI.view } }));
      if (AUTH.acct && AUTH.key && S.personal) await LOCAL.set('acct-data:' + AUTH.acct.id, await encryptJSON(AUTH.key, S.personal));
      CAP.storage = 'local';
    }
    else { const payload = JSON.stringify({ app: 'RELISTO', version: SCHEMA_VERSION, space: S.space, spaces: { demo: S.demo, personal: S.personal }, ui: { view: UI.view } }); await CAP.doc.set({ payload, savedAt: new Date().toISOString() }); CAP.storage = 'saved'; }
    CAP.lastError = '';
  } catch (e) {
    CAP.storage = 'error'; CAP.lastError = (e && e.code) || 'error';
  }
  CAP.saving = false;
  renderSaveState();
  if (CAP.pendingSave) { CAP.pendingSave = false; doSave(); }
}
async function initCapabilities() {
  if (IS_PWA) { initPWA(); return initLocal(); }
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function') { CAP.storage = 'session'; renderSaveState(); return; }
  cl.use('sample').then(async (sample) => {
    if (!sample) return;
    CAP.sample = sample;
    try { const lim = await sample.limits(); CAP.aiImages = !!(lim && lim.images); } catch (e) { CAP.aiImages = false; }
    if (UI.modal && UI.modal.type === 'item') render();
  }).catch(() => {});
  try {
    const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
    if (!db || !user) { CAP.storage = 'session'; renderSaveState(); return; }
    const uid = await user.id();
    if (!uid) { CAP.storage = 'session'; renderSaveState(); return; }
    const doc = db.doc('data/users/' + uid + '/relisto');
    const snap = await doc.get();
    CAP.doc = doc;
    if (snap.exists) {
      const d = snap.data();
      let parsed = null;
      try { parsed = JSON.parse(d.payload); } catch (e) { parsed = null; }
      const v = parsed ? validateImport(parsed) : { ok: false };
      if (parsed && v.ok && !CAP.dirty) {
        S.demo = parsed.spaces.demo || S.demo; S.personal = parsed.spaces.personal || null;
        S.space = parsed.space === 'personal' && S.personal ? 'personal' : 'demo';
        UI.view = (parsed.ui && parsed.ui.view) || UI.view;
        CAP.storage = 'saved';
        UI.sceneHint = false;
        render();
        toast('Recuperamos tus datos guardados. Las fotos de sesiones anteriores no se conservan.');
        return;
      }
    }
    await doSave();
    render();
  } catch (e) {
    CAP.storage = 'session'; renderSaveState();
  }
}
function saveStateText() {
  switch (CAP.storage) {
    case 'local': return { strong: 'Guardado en este teléfono', rest: 'Prendas, historial y fotos quedan en este dispositivo. Haz un respaldo de vez en cuando.' };
    case 'saved': return { strong: 'Guardado para futuras sesiones', rest: 'Datos de texto en tu almacenamiento personal. Las fotos no se guardan.' };
    case 'error': return { strong: 'No se pudo guardar', rest: 'Datos de esta sesión: exporta para conservarlos.' };
    case 'pending': return { strong: 'Comprobando almacenamiento…', rest: 'Mientras tanto, todo funciona en esta sesión.' };
    default: return { strong: 'Datos de esta sesión', rest: 'Exporta para conservarlos (Mi perfil → Datos).' };
  }
}
function renderSaveState() {
  document.querySelectorAll('[data-save-state]').forEach((el) => {
    const t = saveStateText(); el.innerHTML = '<b>' + esc(t.strong) + '</b><br>' + esc(t.rest);
  });
}

/* ---------- Iconos (trazo coherente) ---------- */
const IC = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  armario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.2a1.9 1.9 0 1 1 1.9 1.9c-1 0-1.9.7-1.9 1.7v.4"/><path d="M12 10.2 3.4 16.4c-.9.6-.4 2 .7 2h15.8c1.1 0 1.6-1.4.7-2Z"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6"/></svg>',
  circular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M17.8 2.8v3.8H14M6.2 21.2v-3.8H10"/></svg>',
  perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.2c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M19 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5h6l-1 5 3 3v1.5H7V11.5l3-3z"/><path d="M12 13v7.5"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>',
  guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5c2.7-1 5.3-1 8 .7 2.7-1.7 5.3-1.7 8-.7v13c-2.7-1-5.3-1-8 .7-2.7-1.7-5.3-1.7-8-.7z"/><path d="M12 6.2v13"/></svg>',
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.4A1.5 1.5 0 0 0 6.3 20.5h11.4a1.5 1.5 0 0 0 1.3-2.1l-5.5-9.7V3.5"/><path d="M7.6 14h8.8"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM17.5 17.5h3v3M14 20.5h2"/></svg>',
  figure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.6" r="2.4"/><path d="M8 9h8l-1 6h-6zM9.5 15l-1 6.5M14.5 15l1 6.5"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-.9 1.8-1.8 0-1.2-1-1.6-1-2.6 0-1 .8-1.6 1.8-1.6h2.1a3.8 3.8 0 0 0 3.8-3.8C20.5 6.7 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11.5" r="1.2"/><circle cx="10" cy="7.4" r="1.2"/><circle cx="14.6" cy="7.4" r="1.2"/></svg>',
  hanger: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 17a5 5 0 1 1 5 5c-2.7 0-5 2-5 4.5v1.5"/><path d="M32 28 9 44c-2.4 1.7-1.2 5 1.7 5h42.6c2.9 0 4.1-3.3 1.7-5z"/></svg>'
};
const LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M33.5 13.5A15 15 0 1 0 35 20" fill="none" stroke="#D9B76F" stroke-width="3" stroke-linecap="round"/><path d="M35 9.5v5.2h-5.2" fill="none" stroke="#D9B76F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="20.3" y="27.2" text-anchor="middle" font-family="DM Serif Display, Georgia, serif" font-size="21" fill="currentColor">R</text></svg>';

/* ---------- Fragmentos reutilizables ---------- */
function availBadge(a) {
  const cls = a === 'disponible' ? 'ok' : ['por lavar', 'en lavandería'].includes(a) ? 'warn' : a === 'en reparación' ? 'bad' : GONE.includes(a) ? 'neutral' : 'info';
  return '<span class="badge ' + cls + '">' + esc(a) + '</span>';
}
/** Miniatura: muestra la ilustración y, si hay foto, se voltea como una carta para ver la foto real. */
function thumb(item, opts) {
  opts = opts || {};
  const ph = photoFor(item);
  const cls = opts.cls || '';
  if (!ph) return '<div class="thumb ' + cls + '">' + illusSVG(item) + (opts.noTag ? '' : '<span class="tag">Ilustración</span>') + '</div>';
  if (opts.noFlip) return '<div class="thumb ' + cls + '"><img src="' + ph.url + '" alt="Foto de ' + esc(item.name) + '">' + (opts.noTag ? '' : '<span class="tag">Tu foto</span>') + '</div>';
  const key = S.space + ':' + item.id; const fl = UI.flipped.has(key);
  return '<div class="thumb flip ' + cls + (fl ? ' flipped' : '') + '"' + (opts.style ? ' style="' + opts.style + '"' : '') + '><div class="flip-in"><div class="face front">' + illusSVG(item) + '</div><div class="face back"><img src="' + ph.url + '" alt="Foto de ' + esc(item.name) + '"></div></div>' +
    (opts.noTag ? '' : '<span class="tag">' + (fl ? 'Tu foto' : 'Ilustración') + '</span>') +
    '<button type="button" class="flip-btn" data-act="flip" data-key="' + esc(key) + '" aria-pressed="' + fl + '" aria-label="' + (fl ? 'Ver la ilustración de ' : 'Ver la foto real de ') + esc(item.name) + '">' + (fl ? IC.spark : IC.camera) + '</button></div>';
}
function matLabel(item) {
  const unk = /no confirmado|desconocido/.test(norm(item.material));
  return unk ? 'material no confirmado' : esc(item.material) + (item.attributeSource && /sugerido/.test(item.attributeSource) ? ' (sugerido)' : ' (confirmado)');
}
function demoTag() { return isDemo() ? '<span class="chip sim">Simulado</span>' : ''; }
function sectionTitle(title, right, eyebrow) {
  return '<div class="section-title"><div class="stack tight">' + (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + '</span>' : '') + '<h2>' + title + '</h2></div>' + (right ? '<div class="row">' + right + '</div>' : '') + '</div>';
}
function emptyState(title, text, action) {
  return '<div class="empty">' + IC.hanger + '<b>' + esc(title) + '</b><p class="small">' + esc(text) + '</p>' + (action || '') + '</div>';
}
function opt(v, cur, label) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label || v) + '</option>'; }
function bindAttr(scope, path, type, live) { return ' data-bind="' + scope + '.' + path + '"' + (type ? ' data-type="' + type + '"' : '') + (live ? ' data-live="1"' : ''); }
function fSelect(id, label, scope, path, value, options, extra) {
  return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><select class="input" id="' + id + '"' + bindAttr(scope, path) + (extra || '') + '>' +
    options.map((o) => Array.isArray(o) ? opt(o[0], value, o[1]) : opt(o, value)).join('') + '</select></div>';
}
function fInput(id, label, scope, path, value, type, extra) {
  return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value ?? '') + '"' +
    bindAttr(scope, path, type === 'number' ? 'number' : '') + (extra || '') + '></div>';
}
function fCheck(id, label, scope, path, value) {
  return '<label class="check" for="' + id + '"><input type="checkbox" id="' + id + '"' + (value ? ' checked' : '') + bindAttr(scope, path, 'bool') + '> ' + esc(label) + '</label>';
}
function chipToggles(scope, path, list, current, idp) {
  return '<div class="row">' + list.map((v, i) => '<button type="button" class="chip btnchip" id="' + idp + i + '" data-act="toggleList" data-scope="' + scope + '" data-path="' + path + '" data-val="' + esc(v) + '" aria-pressed="' + ((current || []).includes(v) ? 'true' : 'false') + '">' + esc(v) + '</button>').join('') + '</div>';
}
function scopeObj(scope) {
  if (scope === 'prof') return prof();
  if (scope === 'draft') return currentDraft();
  if (scope === 'mf') return UI.modal && UI.modal.draft;
  if (scope === 'ui') return UI;
  if (scope === 'auth') return UI.auth;
  if (scope === 'filters') return currentFilters();
  return null;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}

/* ---------- Contexto en edición ---------- */
function currentDraft() {
  const w = ws(); const p = prof(); if (!w || !p) return null;
  const k = spaceKey();
  if (!UI.draft[k]) {
    const cid = (w.selectedContext && w.selectedContext[p.id]) || (w.contexts.find((c) => c.ownerId === p.id) || {}).id;
    const c = w.contexts.find((x) => x.id === cid && x.ownerId === p.id);
    UI.draft[k] = c ? Object.assign(clone(c), { date: TODAY, onlyAvailable: true, noRepeatYesterday: false, mustUse: '', exclude: [], noShopping: false, changeAmbience: false }) : null;
  }
  return UI.draft[k];
}
function setContext(cid) {
  const w = ws(); const p = prof();
  w.selectedContext[p.id] = cid;
  delete UI.draft[spaceKey()];
  currentDraft();
}
function draftHash(d) { return JSON.stringify([d.id, d.occasion, d.dressCode, d.formality, d.temperatureC, d.walking, d.intent, d.colorsPref, d.onlyAvailable, d.noRepeatYesterday, d.mustUse, d.exclude, d.requiredSlots]); }
function genKey() { const d = currentDraft(); return spaceKey() + ':' + (d ? d.id : 'none'); }
function genState() { return UI.gen[genKey()] || null; }
function genOpts(d) { return { onlyAvailable: d.onlyAvailable !== false, noRepeatYesterday: !!d.noRepeatYesterday, mustUse: d.mustUse || null, exclude: d.exclude || [] }; }

function doGenerate(mode) {
  const d = currentDraft(); const p = prof(); if (!d) return;
  const r = generateOutfits(ws(), d, p, genOpts(d), TODAY);
  const k = genKey(); const prev = UI.gen[k];
  const dismissed = prev ? prev.dismissed : [];
  const live = r.complete.filter((c) => !dismissed.includes(c.key));
  const liveP = r.partial.filter((c) => !dismissed.includes(c.key));
  const base = live.length ? live : liveP;
  let slots;
  let shown = prev && mode ? prev.shown.slice() : [];
  let pinned = prev && prev.pinned ? prev.slots.find((s) => s.key === prev.pinned) : null;
  let note = '';
  if (mode === 'more' && prev) {
    const room = Math.min(3, 6 - prev.slots.length);
    const add = room > 0 ? pickDiverse(base.filter((c) => !prev.slots.some((s) => s.key === c.key)), prev.slots, room, ws()) : [];
    slots = prev.slots.concat(add);
    if (!add.length) note = 'No hay más combinaciones distintas con tu armario actual para este contexto.';
  } else if (mode === 'regen' && prev) {
    const keep = pinned ? [pinned] : [];
    const want = Math.max(3, prev.slots.length) - keep.length;
    const fresh = base.filter((c) => !shown.includes(c.key) && !keep.some((x) => x.key === c.key));
    const add = pickDiverse(fresh, keep, want, ws());
    slots = keep.concat(add);
    if (add.length < want) note = add.length ? 'Solo quedaban ' + add.length + ' combinaciones nuevas: no repetimos para llenar cupos.' : 'Ya viste todas las combinaciones distintas. Puedes empezar una ronda nueva.';
  } else {
    pinned = null; shown = [];
    slots = pickDiverse(base, [], 3, ws());
  }
  slots = slots.slice(0, 6);
  slots.forEach((s) => { if (!shown.includes(s.key)) shown.push(s.key); });
  UI.gen[k] = { slots, shown, pinned: pinned ? pinned.key : null, notes: r.notes, note, mode: live.length ? 'complete' : 'partial', completeCount: live.length,
    partials: live.length ? liveP.slice(0, 3) : [], dismissed, hash: draftHash(d), at: Date.now() };
  logEvent('generate');
}
function findCandidate(key) {
  const g = genState(); if (!g) return null;
  return g.slots.find((s) => s.key === key) || g.partials.find((s) => s.key === key) || null;
}
function liveCheck(cand) { // la propuesta sigue siendo válida con el estado actual
  const w = ws(); const d = currentDraft();
  for (const id of cand.itemIds) {
    const it = w.items.find((i) => i.id === id);
    if (!it) return 'Una prenda ya no existe en el armario.';
    if (it.ownerId !== d.ownerId) return 'Contiene una prenda de otro perfil.';
    if (isGone(it)) return it.name + ' fue ' + it.availability + '.';
    if ((d.exclude || []).includes(id)) return it.name + ' está en “No usar estas prendas”.';
  }
  return null;
}
function toast(msg) {
  UI.toast = msg;
  const el = document.getElementById('toast');
  if (el) { el.hidden = false; el.textContent = msg; }
  clearTimeout(UI.toastTimer);
  UI.toastTimer = setTimeout(() => { UI.toast = null; const t = document.getElementById('toast'); if (t) t.hidden = true; }, 4200);
}
function guard(key, fn) { // evita dobles clics en acciones con efectos
  if (UI.busy.has(key)) return;
  UI.busy.add(key);
  try { fn(); } finally { setTimeout(() => UI.busy.delete(key), 700); }
}
