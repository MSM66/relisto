/* =====================================================================
   EXPERIENCIA MÓVIL: recorrido rápido, celebración, hojas inferiores
   (contexto y perfiles) y acciones de cuenta.
   ===================================================================== */

/* ---------- Recorrido rápido (marcas guiadas) ---------- */
const TOUR_STEPS = [
  { sel: ['[data-tour="ctx"]'], title: 'Dime a dónde vas', text: 'Toca aquí y escribe o dicta tu día: “reunión en San Isidro, caminaré bastante”. RELISTO lo convierte en campos.' },
  { sel: ['[data-tour="arma"]', '[data-tour="nav-arma"]'], title: 'Un toque, tres outfits', text: '“Arma mi día” combina solo ropa disponible. Desliza para ver cada propuesta y amplía hasta seis.' },
  { sel: ['.outfit .grow-btn', '[data-tour="arma"]'], before: () => { if (!genState() && ownedItems(ws(), ws().activeProfileId).length) doGenerate(); }, title: 'Elige y confirma', text: '“Me lo pongo hoy” anota tu elección. Cuando lo uses, toca “Sí, lo usé”: así RELISTO aprende qué usas de verdad.' },
  { sel: ['[data-tour="nav-armario"]', '[data-tour="side-armario"]'], title: 'Tu armario con fotos', text: 'Toma una foto, elige qué es y su color, y listo: el nombre se completa solo.' },
  { sel: ['[data-tour="nav-circular"]', '[data-tour="side-circular"]'], title: 'Dale más vida', text: 'Prendas olvidadas, reparación, venta o donación. Sin culpa: repetir también es tener estilo.' },
  { sel: ['[data-tour="who"]', '[data-tour="account"]', '[data-tour="side-perfil"]'], title: IS_PWA ? 'Tu cuenta, tus datos' : 'Perfiles y datos', text: IS_PWA ? 'Aquí cambias de perfil, entras a tu cuenta y compartes RELISTO. Tu armario queda cifrado en este teléfono.' : 'Cambia entre Alex, Valeria y Noa o entra a tu armario personal.' }
];
function tourDone() { try { return localStorage.getItem('relisto-tour-done') === '1'; } catch (e) { return false; } }
function maybeAutoTour() { if (IS_PWA && !tourDone() && !UI.auth && !UI.modal) setTimeout(() => startTour(), 450); }
function startTour() { UI.modal = null; UI.view = 'hoy'; UI.sceneHint = false; UI.tour = { i: 0, scrolled: -1 }; render(); }
function endTour(done) {
  UI.tour = null; try { localStorage.setItem('relisto-tour-done', '1'); } catch (e) { /* */ }
  const root = document.getElementById('tour-root'); if (root) root.innerHTML = '';
  render();
  if (done) toast('¡Listo! Cuando quieras repetirlo, está en el menú ⋯ → Recorrido rápido.');
}
function visibleEl(sels) {
  for (const s of sels) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
    }
  }
  return null;
}
function renderTourLayer() {
  let root = document.getElementById('tour-root');
  if (!root) { root = document.createElement('div'); root.id = 'tour-root'; document.body.appendChild(root); }
  if (!UI.tour || UI.auth) { root.innerHTML = ''; return; }
  const t = UI.tour; const step = TOUR_STEPS[t.i];
  const el = visibleEl(step.sel);
  if (el && t.scrolled !== t.i) { t.scrolled = t.i; const r0 = el.getBoundingClientRect(); if (getComputedStyle(el).position !== 'fixed' && (r0.top < 70 || r0.bottom > window.innerHeight - 90)) el.scrollIntoView({ block: 'center' }); }
  const r = el ? el.getBoundingClientRect() : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0, bottom: window.innerHeight / 2 };
  const pad = 6; const vh = window.innerHeight; const vw = window.innerWidth;
  const hole = el ? '<div class="tour-hole" style="top:' + (r.top - pad) + 'px;left:' + (r.left - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px"></div>' : '<div class="tour-hole none"></div>';
  const below = (r.top + r.height / 2) < vh / 2;
  const cardW = Math.min(360, vw - 32);
  const left = Math.max(16, Math.min(vw - cardW - 16, r.left + r.width / 2 - cardW / 2));
  const pos = below ? 'top:' + Math.min(vh - 220, r.bottom + pad + 12) + 'px' : 'bottom:' + Math.max(16, vh - r.top + pad + 12) + 'px';
  const last = t.i === TOUR_STEPS.length - 1;
  root.innerHTML = '<div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-d">' + hole +
    '<div class="tour-card" style="' + pos + ';left:' + left + 'px;width:' + cardW + 'px">' +
    '<span class="eyebrow">Paso ' + (t.i + 1) + ' de ' + TOUR_STEPS.length + '</span><b id="tour-t" class="serif">' + esc(step.title) + '</b><p id="tour-d" class="small">' + esc(step.text) + '</p>' +
    '<div class="tour-dots" aria-hidden="true">' + TOUR_STEPS.map((_, k) => '<i' + (k === t.i ? ' class="on"' : '') + '></i>').join('') + '</div>' +
    '<div class="row between"><button type="button" class="btn sm ghost" data-act="tourEnd">Saltar</button><div class="row">' + (t.i ? '<button type="button" class="btn sm" data-act="tourPrev">Atrás</button>' : '') +
    '<button type="button" class="btn sm primary" data-act="tourNext" id="tour-next">' + (last ? '¡Empezar!' : 'Siguiente') + '</button></div></div></div></div>';
  setTimeout(() => { const b = document.getElementById('tour-next'); if (b && document.activeElement !== b) try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
}
function tourGo(i) {
  if (i < 0) return;
  if (i >= TOUR_STEPS.length) return endTour(true);
  UI.tour.i = i; const st = TOUR_STEPS[i];
  if (st.before) st.before();
  UI.view = 'hoy'; render();
}
window.addEventListener('resize', () => { if (UI.tour) renderTourLayer(); });
window.addEventListener('scroll', () => { if (UI.tour) window.requestAnimationFrame(renderTourLayer); }, { passive: true });

/* ---------- Celebración ---------- */
function celebrate(text) {
  try { if (navigator.vibrate) navigator.vibrate(text ? [14, 40, 22] : 12); } catch (e) { /* */ }
  const p = prof();
  if ((p && p.reduceMotion) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const el = document.createElement('div'); el.className = 'celebrate'; el.setAttribute('aria-hidden', 'true');
  const cols = ['#D9B76F', '#D86A52', '#9CC3A2', '#B8A2D6'];
  el.innerHTML = '<span class="burst">' + Array.from({ length: 14 }, (_, i) => '<i style="--a:' + (i * (360 / 14)) + 'deg;--c:' + cols[i % 4] + '"></i>').join('') + '</span><span class="tick">' + IC.check + '</span>' + (text ? '<b>' + esc(text) + '</b>' : '');
  document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
}
function monthUses() {
  const w = ws(); const m = TODAY.slice(0, 7);
  return w.wearLogs.filter((l) => l.ownerId === w.activeProfileId && l.status === 'usado' && l.date.slice(0, 7) === m && l.contextId).length;
}

/* ---------- Hojas inferiores ---------- */
function renderWhoSheet() {
  const w = S.demo; const cur = isDemo() ? 'demo:' + w.activeProfileId : 'personal';
  const row = (v, name, sub, extra) => '<button type="button" class="acct' + (v === cur ? ' current' : '') + '" data-act="whoPick" data-v="' + v + '" aria-pressed="' + (v === cur) + '">' + avatar(name, v.startsWith('demo') ? 'demo' : '') + '<span class="stack tight" style="text-align:left;min-width:0;flex:1"><b>' + esc(name) + '</b><span class="tiny muted">' + esc(sub) + '</span></span>' + (v === cur ? '<span class="chip ok">En uso</span>' : '') + (extra || '') + '</button>';
  const personal = IS_PWA
    ? (AUTH.acct ? row('personal', AUTH.acct.name, 'Mi armario · ' + AUTH.acct.docMasked) : '<button type="button" class="acct" data-act="authOpen">' + '<span class="avatar">' + IC.lock + '</span><span class="stack tight" style="text-align:left"><b>Entrar o crear mi cuenta</b><span class="tiny muted">Con tu DNI y una contraseña</span></span></button>')
    : row('personal', S.personal ? (S.personal.profiles[0] || {}).name || 'Mi armario' : 'Empezar con mi armario', S.personal ? 'Mi armario personal' : 'Espacio vacío y separado de la demo');
  return modalWrap('¿Quién usa RELISTO?', '<div class="stack tight"><span class="eyebrow">Tu armario</span>' + personal + '</div>' +
    '<div class="stack tight"><span class="eyebrow">Perfiles de demostración</span>' + w.profiles.map((p) => row('demo:' + p.id, p.name, 'Demo · ' + plural(w.items.filter((i) => i.ownerId === p.id && !isGone(i)).length, 'prenda', 'prendas') + ' ficticias')).join('') + '</div>' +
    '<div class="row"><button class="btn" data-act="nav" data-view="perfil">' + IC.perfil + 'Mi perfil y ajustes</button>' + (IS_PWA ? '<button class="btn" data-act="share">' + IC.share + 'Compartir RELISTO</button>' : '') + (IS_PWA && AUTH.acct ? '<button class="btn ghost" data-act="authLogout">Cerrar sesión</button>' : '') + '</div>');
}
function renderPwModal(m) {
  const d = m.draft;
  return modalWrap('Cambiar contraseña', '<div class="stack">' +
    '<div class="field"><label for="pw-cur">Contraseña actual</label><input class="input" id="pw-cur" type="password" autocomplete="current-password" value="' + esc(d.current || '') + '"' + bindAttr('mf', 'current') + '></div>' +
    '<div class="field"><label for="pw-new">Nueva contraseña</label><input class="input" id="pw-new" type="password" autocomplete="new-password" value="' + esc(d.pw || '') + '"' + bindAttr('mf', 'pw') + '></div>' +
    '<div class="field"><label for="pw-new2">Repite la nueva contraseña</label><input class="input" id="pw-new2" type="password" autocomplete="new-password" value="' + esc(d.pw2 || '') + '"' + bindAttr('mf', 'pw2') + '></div>' +
    (m.error ? '<div class="note bad" role="alert">' + esc(m.error) + '</div>' : '') +
    '<div class="row"><button class="btn primary" data-act="pwSave"' + (m.busy ? ' disabled' : '') + '>' + (m.busy ? 'Guardando…' : 'Guardar') + '</button><button class="btn ghost" data-act="closeModal">Cancelar</button></div>' +
    '<p class="tiny muted">Tu código de recuperación sigue siendo el mismo.</p></div>');
}

/* ---------- Acciones nuevas ---------- */
Object.assign(ACT, {
  tourStart: () => startTour(),
  tourNext: () => tourGo(UI.tour.i + 1),
  tourPrev: () => tourGo(UI.tour.i - 1),
  tourEnd: () => endTour(false),
  ctxSheet: () => openModal({ type: 'ctx' }),
  toggleCtx: () => openModal({ type: 'ctx' }),
  ctxPick: (el) => { setContext(el.dataset.id); commit(); },
  ctxDone: () => { UI.modal = null; ACT.armaDia(); },
  whoSheet: () => openModal({ type: 'who' }),
  whoPick: (el) => { UI.modal = null; CHG.who({ value: el.dataset.v }); },
  toggleFilters: () => { UI.closet.showFilters = !UI.closet.showFilters; render(); },
  mfSet: (el) => {
    const m = UI.modal; if (!m || !m.draft) return; const d = m.draft; const v = el.dataset.val;
    if (el.dataset.path === 'category') { if (d.category !== v) { d.category = v; d.subtype = ''; } }
    else if (el.dataset.path === 'subtype') d.subtype = d.subtype === v ? '' : v;
    else if (el.dataset.path === 'color') d.color = norm(d.color) === norm(v) ? '' : v;
    render();
  },
  share: () => shareApp(),
  pwaHow: () => { PWA_UI.showHow = true; render(); },
  authOpen: () => { if (!needAuth()) { UI.modal = null; S.space = 'personal'; commit(); } },
  authGo: (el) => { const keep = UI.auth || {}; UI.auth = { screen: el.dataset.screen, docType: keep.docType || 'dni', doc: keep.doc || '', keep: true, acctId: el.dataset.screen !== 'signup' && AUTH.accounts.length === 1 ? AUTH.accounts[0].id : keep.acctId || null }; render(); },
  authDemo: async () => { await LOCAL.set('welcomed', true); UI.auth = null; S.space = 'demo'; render(); maybeAutoTour(); },
  authDocType: (el) => { UI.auth.docType = el.dataset.val; UI.auth.error = ''; render(); },
  authShowPw: () => { UI.auth.showPw = !UI.auth.showPw; render(); },
  authPick: (el) => { UI.auth.acctId = el.dataset.id; UI.auth.error = ''; UI.auth.focused = null; render(); },
  authOtherDoc: () => { UI.auth.otherDoc = true; UI.auth.acctId = null; UI.auth.focused = null; render(); },
  authCopyCode: () => { const c = UI.auth.code; try { navigator.clipboard.writeText(c).then(() => toast('Código copiado. Guárdalo fuera de este teléfono.'), () => toast('Anota el código: ' + c)); } catch (e) { toast('Anota el código: ' + c); } },
  authFinish: () => { UI.auth = null; UI.view = S.personal && S.personal.items.length ? 'hoy' : 'hoy'; render(); toast('¡Listo, ' + AUTH.acct.name + '! Tu cuenta está creada y cifrada.'); maybeAutoTour(); },
  authLogout: () => guard('lo', async () => { UI.modal = null; await logout(); UI.auth = { screen: 'login', acctId: AUTH.accounts.length === 1 ? AUTH.accounts[0].id : null }; render(); }),
  pwOpen: () => openModal({ type: 'pw', draft: {} }),
  pwSave: () => doChangePassword(),
  askDeleteAccount: () => openModal({ type: 'confirm', title: 'Eliminar mi cuenta', text: 'Se borran de este teléfono tu cuenta, tu armario, tu historial y tus fotos. No se puede deshacer. Haz un respaldo completo antes si quieres conservarlos.', okLabel: 'Eliminar definitivamente', okAct: 'deleteAccountNow', danger: true }),
  deleteAccountNow: () => guard('da', () => doDeleteAccount())
});
// Envoltorios: mantienen la lógica original y suman lo nuevo.
const _armaDia = ACT.armaDia;
ACT.armaDia = (el, e) => { UI.carouselReset = true; _armaDia(el, e); };
const _confirmWear = ACT.confirmWear;
ACT.confirmWear = (el, e) => {
  const before = ws().wearLogs.filter((l) => l.status === 'usado').length;
  _confirmWear(el, e);
  if (ws().wearLogs.filter((l) => l.status === 'usado').length > before) { const n = monthUses(); celebrate('¡Usado!'); toast('Registrado: +1 uso. Llevas ' + plural(n, 'outfit usado', 'outfits usados') + ' este mes.'); }
};
const _choose = ACT.choose;
ACT.choose = (el, e) => { _choose(el, e); celebrate(null); };
for (const k of ['space', 'startPersonal']) {
  const orig = ACT[k];
  ACT[k] = (el, e) => { if ((k === 'startPersonal' || (el && el.dataset.space === 'personal')) && needAuth()) return; orig(el, e); };
}
const _who = CHG.who;
CHG.who = (el) => { if (el.value === 'personal' && needAuth()) return; _who(el); };
const _setupScene = setupScene;
// La escena 6 en la app instalada empieza por la cuenta.
setupScene = function (n) { if (n === 6 && needAuth()) return; _setupScene(n); }; // eslint-disable-line no-func-assign
const _reviewImport = ACT.reviewImport;
ACT.reviewImport = (obj) => {
  if (IS_PWA && obj && obj.spaces && obj.spaces.personal && !AUTH.acct) { UI.importMsg = { ok: false, html: 'Este respaldo incluye un armario personal. Entra a tu cuenta (o créala) y vuelve a importarlo.' }; render(); return; }
  _reviewImport(obj);
};
const _openModalRender = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  const m = UI.modal;
  if (m.type === 'ctx') return modalWrap('¿A dónde vas hoy?', renderCtxSheetBody(), { eyebrow: 'Contexto del día' });
  if (m.type === 'who') return renderWhoSheet();
  if (m.type === 'pw') return renderPwModal(m);
  if (m.type === 'menu') {
    return modalWrap('Más', '<div class="stack">' +
      '<button class="btn" style="justify-content:flex-start" data-act="tourStart">' + IC.spark + 'Recorrido rápido</button>' +
      '<button class="btn" style="justify-content:flex-start" data-act="nav" data-view="perfil">' + IC.perfil + 'Mi perfil, datos y respaldo</button>' +
      (IS_PWA ? '<button class="btn" style="justify-content:flex-start" data-act="share">' + IC.share + 'Compartir RELISTO</button>' : '') +
      SUBNAV.map(([id, l, ic]) => '<button class="btn" style="justify-content:flex-start" data-act="nav" data-view="' + id + '">' + IC[ic] + (id === 'recorrido' ? 'Escenas de demostración' : l) + '</button>').join('') +
      '<div class="note"><span data-save-state></span></div></div>');
  }
  return _openModalRender();
};

/* ---------- Formularios de acceso ---------- */
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-auth-form]'); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.authForm;
  if (UI.auth && UI.auth.busy) return;
  if (kind === 'signup') doSignup(); else if (kind === 'login') doLogin(); else if (kind === 'recover') doRecover();
});
