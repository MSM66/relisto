/* =====================================================================
   NUBE (Supabase): cuentas con correo, armario sincronizado, fotos en
   Storage y vitrina compartida entre teléfonos. Solo en la app instalada
   y solo si build.sh recibió SB_URL y SB_KEY (clave pública "publishable").
   Sin esas claves, la app sigue con las cuentas locales de siempre.
   ===================================================================== */
const CLOUD = { on: IS_PWA && !!SB_URL && !!SB_KEY, session: null, version: null, market: null, pushTimer: null, pushing: false, dirty: false, status: 'idle', lastPull: 0, pollTimer: null };
const APP_URL = () => location.origin + location.pathname.replace(/[^/]*$/, '');
const isCloudAcct = () => CLOUD.on && !!AUTH.acct && !!AUTH.acct.cloud;
(() => { try { const q = new URLSearchParams(location.search).get('invite'); if (q) { localStorage.setItem('relisto-invite', q.trim().toUpperCase().slice(0, 40)); history.replaceState(null, '', location.pathname + location.hash); } } catch (e) { /* */ } })();
const savedInvite = () => { try { return localStorage.getItem('relisto-invite') || ''; } catch (e) { return ''; } };

/* ---------- Cliente mínimo (fetch) ---------- */
const SB = {
  async raw(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ apikey: SB_KEY }, opts.headers || {});
    if (!opts.anon && CLOUD.session) headers.Authorization = 'Bearer ' + CLOUD.session.access_token;
    else if (/^eyJ/.test(SB_KEY)) headers.Authorization = 'Bearer ' + SB_KEY;
    if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
    return fetch(SB_URL + path, { method: opts.method || 'GET', headers, body: opts.body });
  },
  async json(path, opts) {
    const r = await SB.raw(path, opts);
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = { message: txt }; }
    if (!r.ok) { const err = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status)); err.status = r.status; err.code = j && (j.error_code || j.code); throw err; }
    return j;
  },
  async ensureFresh() {
    const s = CLOUD.session; if (!s) return;
    if (s.expires_at && s.expires_at * 1000 - Date.now() > 60000) return;
    try { await SB.setSession(await SB.json('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: true, json: { refresh_token: s.refresh_token } })); } catch (e) { if (e.status === 400 || e.status === 401) { await cloudSignedOut('Tu sesión venció. Vuelve a entrar.'); throw e; } }
  },
  async setSession(s) {
    if (!s || !s.access_token) return;
    if (!s.expires_at && s.expires_in) s.expires_at = Math.floor(Date.now() / 1000) + Number(s.expires_in);
    CLOUD.session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user || (CLOUD.session && CLOUD.session.user) };
    await LOCAL.set('sb-session', CLOUD.session);
  },
  signUp: (email, password, name, invite) => SB.json('/auth/v1/signup?redirect_to=' + encodeURIComponent(APP_URL()), { method: 'POST', anon: true, json: { email, password, data: { name, invite } } }),
  signIn: (email, password) => SB.json('/auth/v1/token?grant_type=password', { method: 'POST', anon: true, json: { email, password } }),
  recover: (email) => SB.json('/auth/v1/recover?redirect_to=' + encodeURIComponent(APP_URL()), { method: 'POST', anon: true, json: { email } }),
  user: () => SB.json('/auth/v1/user'),
  updateUser: (attrs) => SB.json('/auth/v1/user', { method: 'PUT', json: attrs }),
  signOut: () => SB.raw('/auth/v1/logout', { method: 'POST' }).catch(() => null),
  async rpc(fn, args) { await SB.ensureFresh(); return SB.json('/rest/v1/rpc/' + fn, { method: 'POST', json: args || {} }); },
  async upload(bucket, path, blob) { await SB.ensureFresh(); const r = await SB.raw('/storage/v1/object/' + bucket + '/' + path, { method: 'POST', headers: { 'x-upsert': 'true', 'Content-Type': blob.type || 'image/jpeg' }, body: blob }); if (!r.ok) throw new Error('upload ' + r.status); },
  async download(bucket, path) { await SB.ensureFresh(); const r = await SB.raw('/storage/v1/object/authenticated/' + bucket + '/' + path); if (!r.ok) throw new Error('download ' + r.status); return r.blob(); },
  async list(bucket, prefix) { await SB.ensureFresh(); return SB.json('/storage/v1/object/list/' + bucket, { method: 'POST', json: { prefix, limit: 1000, offset: 0 } }); },
  async remove(bucket, paths) { if (!paths.length) return; await SB.ensureFresh(); await SB.json('/storage/v1/object/' + bucket, { method: 'DELETE', json: { prefixes: paths } }); },
  publicUrl: (bucket, path) => SB_URL + '/storage/v1/object/public/' + bucket + '/' + path
};
const sbError = (e) => {
  const m = String((e && e.message) || '');
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu correo: te enviamos un enlace al registrarte.';
  if (/already registered|already exists/i.test(m)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/database error saving new user|invite_required/i.test(m)) return 'Ese código de invitación no es válido o ya se usó todas las veces.';
  if (/not authorized|email_address_not_authorized/i.test(m) || (e && e.code === 'email_address_not_authorized')) return 'Todavía no podemos enviar correos a esa dirección. Intenta más tarde.';
  if (/rate limit|too many/i.test(m) || (e && e.status === 429)) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  if (/password/i.test(m) && /6|weak|short/i.test(m)) return 'La contraseña es muy débil: usa al menos 8 caracteres con letras y números.';
  if (e instanceof TypeError || /failed to fetch|network/i.test(m)) return 'Sin conexión. Revisa tu internet y vuelve a intentarlo.';
  return 'No se pudo completar: ' + m.slice(0, 120);
};
const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

/* ---------- Abrir la cuenta en la nube ---------- */
async function openCloud(session, opts) {
  opts = opts || {};
  await SB.setSession(session);
  CLOUD.imported = (await LOCAL.get('imported-local').catch(() => [])) || [];
  const u = CLOUD.session.user || (await SB.user());
  CLOUD.session.user = u; await LOCAL.set('sb-session', CLOUD.session);
  const name = (u.user_metadata && u.user_metadata.name) || (u.email || '').split('@')[0];
  AUTH.acct = { id: u.id, name, email: u.email, cloud: true, createdAt: (u.created_at || TODAY).slice(0, 10) }; AUTH.key = null;
  const cache = await LOCAL.get('cloud-cache:' + u.id);
  if (cache && cache.data) { S.personal = cache.data; CLOUD.version = cache.version; CLOUD.dirty = !!cache.dirty; }
  forgetPhotos('personal:');
  (await LOCAL.photoRange('c:' + u.id + ':')).forEach(({ key, val }) => { if (!val || !val.buf) return; const blob = new Blob([val.buf], { type: val.type || 'image/jpeg' }); PHOTOS['personal:' + key.split(':')[2]] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false }; });
  try { await cloudPull(name); } catch (e) { if (!S.personal) S.personal = buildPersonalWorkspace(TODAY, { name }); CLOUD.status = 'offline'; }
  S.space = 'personal';
  Object.keys(UI.gen).forEach((k) => { if (k.startsWith('personal:')) delete UI.gen[k]; });
  Object.keys(UI.draft).forEach((k) => { if (k.startsWith('personal:')) delete UI.draft[k]; });
  syncPhotosDown();
  cloudMarketRefresh();
  startCloudPolling();
}
async function cloudPull(name) {
  const r = await SB.rpc('wardrobe_get');
  if (r && r.data && (!CLOUD.dirty || !S.personal)) {
    const v = validateImport({ app: 'RELISTO', version: SCHEMA_VERSION, spaces: { personal: r.data } });
    if (v.ok) { S.personal = r.data; CLOUD.version = r.version; CLOUD.dirty = false; }
  } else if (r && r.data && CLOUD.dirty) {
    CLOUD.version = r.version; cloudPush(true);
  } else if (!r) {
    if (!S.personal) S.personal = buildPersonalWorkspace(TODAY, { name });
    CLOUD.version = null; cloudPush(true);
  }
  CLOUD.status = 'saved'; CLOUD.lastPull = Date.now();
  await LOCAL.set('cloud-cache:' + AUTH.acct.id, { data: S.personal, version: CLOUD.version, dirty: CLOUD.dirty });
}
function scheduleCloudPush() { if (!isCloudAcct()) return; CLOUD.dirty = true; clearTimeout(CLOUD.pushTimer); CLOUD.pushTimer = setTimeout(() => cloudPush(false), 1500); }
async function cloudPush(force) {
  if (!isCloudAcct() || !S.personal) return;
  if (CLOUD.pushing) { CLOUD.again = true; return; }
  CLOUD.pushing = true; CLOUD.status = 'saving'; renderSaveState();
  try {
    let r = await SB.rpc('wardrobe_save', { p_data: S.personal, p_base: CLOUD.version, p_force: !!force });
    if (r && r.conflict) { r = await SB.rpc('wardrobe_save', { p_data: S.personal, p_base: r.version, p_force: true }); toast('Tus cambios de este teléfono se guardaron sobre una versión de otro dispositivo.'); }
    if (r && r.ok) { CLOUD.version = r.version; CLOUD.dirty = false; CLOUD.status = 'saved'; }
  } catch (e) { CLOUD.status = 'offline'; }
  CLOUD.pushing = false;
  if (AUTH.acct) await LOCAL.set('cloud-cache:' + AUTH.acct.id, { data: S.personal, version: CLOUD.version, dirty: CLOUD.dirty }).catch(() => {});
  renderSaveState();
  if (CLOUD.again) { CLOUD.again = false; cloudPush(false); }
}
async function syncPhotosDown() {
  if (!isCloudAcct()) return;
  const uid = AUTH.acct.id;
  try {
    const files = await SB.list('wardrobe', uid);
    const want = new Set((S.personal ? S.personal.items : []).map((i) => i.id));
    for (const f of files || []) {
      const id = String(f.name || '').replace(/\.[a-z]+$/i, '');
      if (!want.has(id) || PHOTOS['personal:' + id]) continue;
      const blob = await SB.download('wardrobe', uid + '/' + f.name);
      PHOTOS['personal:' + id] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false };
      await LOCAL.photoPut('c:' + uid + ':' + id, blob).catch(() => {});
    }
    render();
  } catch (e) { /* sin conexión: se intentará luego */ }
}
async function cloudSignedOut(msg) {
  const uid = AUTH.acct && AUTH.acct.id;
  CLOUD.session = null; CLOUD.market = null; CLOUD.version = null; clearInterval(CLOUD.pollTimer);
  await LOCAL.del('sb-session').catch(() => {});
  if (uid) { await LOCAL.del('cloud-cache:' + uid).catch(() => {}); await LOCAL.photoDelRange('c:' + uid + ':').catch(() => {}); }
  AUTH.acct = null; AUTH.key = null; forgetPhotos('personal:'); S.personal = null; S.space = 'demo';
  if (msg) { UI.auth = { screen: 'login' }; render(); toast(msg); }
}

/* ---------- Reemplazos de las funciones de cuenta ---------- */
if (CLOUD.on) {
  needAuth = function () { // eslint-disable-line no-func-assign
    if (AUTH.acct) return false;
    UI.modal = null; UI.auth = { screen: 'login', keep: true }; render(); return true;
  };
  restoreSession = async function () { // eslint-disable-line no-func-assign
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('access_token')) {
      const s = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: h.get('expires_in') };
      history.replaceState(null, '', location.pathname);
      CLOUD.session = s;
      try { await openCloud(s); CLOUD.imported = (await LOCAL.get('imported-local').catch(() => [])) || []; if (h.get('type') === 'recovery') UI.auth = { screen: 'reset' }; else if (localLeftovers().length || LEGACY.personal) UI.auth = { screen: 'import', isNew: true }; return true; } catch (e) { CLOUD.session = null; }
    }
    if (h.get('error_description')) { history.replaceState(null, '', location.pathname); UI.authMsg = 'El enlace venció o ya se usó. Pide uno nuevo.'; }
    const s = await LOCAL.get('sb-session').catch(() => null);
    if (!s || !s.refresh_token) return false;
    CLOUD.session = s;
    try { await openCloud(s); return true; } catch (e) { CLOUD.session = null; return false; }
  };
  logout = async function () { // eslint-disable-line no-func-assign
    clearTimeout(CLOUD.pushTimer); if (CLOUD.dirty) await cloudPush(false);
    await SB.signOut(); await cloudSignedOut(); await doSave();
  };
  doSignup = async function () { // eslint-disable-line no-func-assign
    const a = UI.auth; a.error = '';
    const invite = String(a.invite || savedInvite()).trim().toUpperCase();
    a.error = (invite ? '' : 'Escribe tu código de invitación.') || (String(a.name || '').trim() ? '' : 'Escribe tu nombre o alias.') || (emailOk(a.email) ? '' : 'Escribe un correo válido.') || pwError(a.pw, a.pw2) || (a.terms ? '' : 'Acepta la política de privacidad para continuar.');
    if (a.error) return render();
    a.busy = true; render();
    try {
      const okInvite = await SB.json('/rest/v1/rpc/beta_check_invite', { method: 'POST', anon: true, json: { p_code: invite } }).catch((e) => { if (e instanceof TypeError) throw e; return true; });
      if (okInvite === false) { a.busy = false; a.error = 'Ese código de invitación no es válido o ya se usó todas las veces.'; return render(); }
      try { localStorage.setItem('relisto-invite', invite); } catch (e) { /* */ }
      const r = await SB.signUp(String(a.email).trim().toLowerCase(), a.pw, String(a.name).trim().slice(0, 40), invite);
      if (r && r.access_token) { await openCloud(r); await LOCAL.set('welcomed', true); afterCloudLogin(true); return; }
      UI.auth = { screen: 'confirm', email: String(a.email).trim() };
    } catch (e) { a.busy = false; a.error = sbError(e); }
    render();
  };
  doLogin = async function () { // eslint-disable-line no-func-assign
    const a = UI.auth; a.error = '';
    if (!emailOk(a.email)) { a.error = 'Escribe tu correo.'; return render(); }
    if (!a.pw) { a.error = 'Escribe tu contraseña.'; return render(); }
    a.busy = true; render();
    try { const r = await SB.signIn(String(a.email).trim().toLowerCase(), a.pw); await openCloud(r); await LOCAL.set('welcomed', true); afterCloudLogin(false); }
    catch (e) { a.busy = false; a.pw = ''; a.error = sbError(e); render(); }
  };
  doRecover = async function () { // eslint-disable-line no-func-assign
    const a = UI.auth; a.error = '';
    if (!emailOk(a.email)) { a.error = 'Escribe el correo de tu cuenta.'; return render(); }
    a.busy = true; render();
    try { await SB.recover(String(a.email).trim().toLowerCase()); UI.auth = { screen: 'sent', email: a.email }; }
    catch (e) { a.busy = false; a.error = sbError(e); }
    render();
  };
  doChangePassword = async function () { // eslint-disable-line no-func-assign
    const m = UI.modal; const d = m.draft; m.error = pwError(d.pw, d.pw2); if (m.error) return render();
    m.busy = true; render();
    try { await SB.signIn(AUTH.acct.email, d.current || ''); } catch (e) { m.busy = false; m.error = 'La contraseña actual no es correcta.'; return render(); }
    try { await SB.updateUser({ password: d.pw }); UI.modal = null; render(); toast('Contraseña actualizada.'); } catch (e) { m.busy = false; m.error = sbError(e); render(); }
  };
  doDeleteAccount = async function () { // eslint-disable-line no-func-assign
    const uid = AUTH.acct.id;
    try {
      const mine = (await SB.list('wardrobe', uid).catch(() => [])).map((f) => uid + '/' + f.name);
      await SB.remove('wardrobe', mine).catch(() => {});
      const pub = (await SB.list('listings', uid).catch(() => [])).map((f) => uid + '/' + f.name);
      await SB.remove('listings', pub).catch(() => {});
      const r = await SB.rpc('delete_my_account'); if (r && r.error) throw new Error(r.error);
    } catch (e) { UI.modal = null; render(); toast('No se pudo eliminar la cuenta: ' + sbError(e)); return; }
    await cloudSignedOut(); UI.modal = null; UI.auth = { screen: 'welcome' }; render();
    toast('Tu cuenta y todos tus datos se eliminaron.');
  };
  shareApp = async function () { // eslint-disable-line no-func-assign
    const url = APP_URL();
    const data = { title: 'RELISTO', text: 'Relisto: ya tienes qué ponerte. Arma outfits con la ropa que ya tienes. Crea tu cuenta gratis:', url };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado: ' + url); } catch (e) { toast('Comparte este enlace: ' + url); }
  };
}
function localLeftovers() {
  return (AUTH.accounts || []).filter((x) => !(CLOUD.imported || []).includes(x.id));
}
async function afterCloudLogin(isNew) {
  doSave();
  CLOUD.imported = (await LOCAL.get('imported-local').catch(() => [])) || [];
  if (UI.pendingReset) { UI.pendingReset = false; UI.auth = { screen: 'reset' }; return render(); }
  if (localLeftovers().length || LEGACY.personal) { UI.auth = { screen: 'import', isNew }; return render(); }
  UI.auth = null; UI.view = 'hoy'; render();
  toast(isNew ? '¡Listo, ' + AUTH.acct.name + '! Tu cuenta está creada.' : 'Hola, ' + AUTH.acct.name + '. Tu armario está listo.');
  maybeAutoTour();
}

/* Pasar un armario guardado en este teléfono (cuentas con DNI o versión sin cuentas) a la cuenta en la nube. */
async function doImportLocal(acctId) {
  const a = UI.auth; a.error = '';
  let data = null; let photos = [];
  try {
    if (acctId === 'legacy') {
      data = LEGACY.personal;
      photos = (await LOCAL.photoRange('personal:')).map(({ key, val }) => [key.split(':')[1], new Blob([val.buf], { type: val.type || 'image/jpeg' })]);
    } else {
      const acct = AUTH.accounts.find((x) => x.id === acctId);
      let key = null; try { key = await unwrapWith(a.pw || '', acct.pw, false); } catch (e) { key = null; }
      if (!key) { a.error = 'La contraseña de ese armario no es correcta.'; return render(); }
      a.busy = true; render();
      const rec = await LOCAL.get('acct-data:' + acct.id); data = rec ? await decryptJSON(key, rec) : null;
      for (const { key: k, val } of await LOCAL.photoRange('u:' + acct.id + ':')) {
        try { const buf = val.enc ? await decryptBuf(key, val) : val.buf; photos.push([k.split(':')[2], new Blob([buf], { type: val.type || 'image/jpeg' })]); } catch (e) { /* foto ilegible */ }
      }
    }
    if (!data) { a.busy = false; a.error = 'Ese armario está vacío.'; return render(); }
    a.busy = true; render();
    const p = data.profiles.find((x) => x.id === data.activeProfileId); if (p) p.name = AUTH.acct.name;
    S.personal = data; S.space = 'personal'; forgetPhotos('personal:');
    for (const [id, blob] of photos) { PHOTOS['personal:' + id] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false }; await persistPhoto('personal:' + id, PHOTOS['personal:' + id]); }
    await cloudPush(true);
    CLOUD.imported = (CLOUD.imported || []).concat(acctId); await LOCAL.set('imported-local', CLOUD.imported);
    if (acctId === 'legacy') { LEGACY.personal = null; await LOCAL.photoDelRange('personal:').catch(() => {}); await doSave(); }
    UI.auth = null; UI.view = 'hoy'; render();
    toast('Listo: ' + plural(data.items.length, 'prenda', 'prendas') + (photos.length ? ' y ' + plural(photos.length, 'foto', 'fotos') : '') + (data.items.length + photos.length === 1 ? ' ya está' : ' ya están') + ' en tu cuenta.');
  } catch (e) { a.busy = false; a.error = 'No se pudo pasar el armario: ' + sbError(e); render(); }
}

/* ---------- Guardado y fotos ---------- */
const _doSave12 = doSave;
doSave = async function () { // eslint-disable-line no-func-assign
  await _doSave12();
  if (isCloudAcct() && S.personal) { LOCAL.set('cloud-cache:' + AUTH.acct.id, { data: S.personal, version: CLOUD.version, dirty: true }).catch(() => {}); scheduleCloudPush(); }
};
const _persistPhoto12 = persistPhoto;
persistPhoto = async function (key, ph) { // eslint-disable-line no-func-assign
  if (!isCloudAcct() || !key.startsWith('personal:')) return _persistPhoto12(key, ph);
  if (!ph || !ph.file) return;
  const id = key.split(':')[1]; const uid = AUTH.acct.id;
  await LOCAL.photoPut('c:' + uid + ':' + id, ph.file).catch(() => {});
  SB.upload('wardrobe', uid + '/' + id + '.jpg', ph.file).catch(() => { CLOUD.photoRetry = (CLOUD.photoRetry || []).concat(id); });
};
const _renderSaveState12 = renderSaveState;
renderSaveState = function () { // eslint-disable-line no-func-assign
  if (!isCloudAcct()) return _renderSaveState12();
  const txt = { saving: 'Guardando en tu cuenta…', saved: 'Guardado en tu cuenta', offline: 'Sin conexión: se guardará al volver', idle: 'Guardado en tu cuenta' }[CLOUD.status] || '';
  document.querySelectorAll('[data-save-state]').forEach((el) => { el.textContent = txt; el.dataset.state = CLOUD.status; });
};
window.addEventListener('online', () => { if (isCloudAcct()) { if (CLOUD.dirty) cloudPush(false); (CLOUD.photoRetry || []).splice(0).forEach((id) => { const ph = PHOTOS['personal:' + id]; if (ph) persistPhoto('personal:' + id, ph); }); cloudMarketRefresh(); } });

/* ---------- Vitrina compartida ---------- */
const _mkStore12 = mkStore;
mkStore = function () { // eslint-disable-line no-func-assign
  if (isCloudAcct() && !isDemo()) return CLOUD.market || (CLOUD.market = mkNew());
  return _mkStore12();
};
const _mkSave12 = mkSave;
mkSave = function () { if (isCloudAcct() && !isDemo()) { render(); return; } _mkSave12(); }; // eslint-disable-line no-func-assign
async function cloudMarketRefresh() {
  if (!isCloudAcct()) return;
  try {
    const snap = await SB.rpc('mk_snapshot'); if (!snap || snap.error) return;
    snap.listings.forEach((l) => { if (l.hasPhoto && !(MKPH[l.id] && MKPH[l.id].file)) MKPH[l.id] = { url: SB.publicUrl('listings', l.sellerId + '/' + l.id + '.jpg') }; });
    CLOUD.market = snap; CLOUD.blocked = snap.blocked || [];
    if (!UI.modal || /^mk/.test(UI.modal.type) || UI.modal.type === 'pending') render();
  } catch (e) { /* sin conexión */ }
}
function startCloudPolling() {
  clearInterval(CLOUD.pollTimer);
  CLOUD.pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && isCloudAcct()) cloudMarketRefresh(); }, 45000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && isCloudAcct() && Date.now() - CLOUD.lastPull > 60000) { CLOUD.lastPull = Date.now(); if (!CLOUD.dirty) cloudPull(AUTH.acct.name).then(render).catch(() => {}); cloudMarketRefresh(); } });
/* Cada acción de la vitrina se valida en el teléfono (respuesta inmediata) y la decide el servidor. */
function cloudMk(fn, args, after) {
  SB.rpc(fn, args).then(async (r) => {
    if (r && r.error) toast(r.error);
    if (after && r && !r.error) await after(r);
  }).catch((e) => toast(sbError(e))).then(cloudMarketRefresh);
}
const MK_WRAP = {
  mkPublish: (M, d, today, r) => cloudMk('mk_publish', { p: { itemId: d.item.id, snap: mkSnapshot(d.item), price: d.price, acceptOffers: d.acceptOffers !== false, condition: d.condition, district: d.district, delivery: d.delivery, note: d.note || '', contact: d.contact || '', hasPhoto: false } }, async (res) => {
    const ph = MKPH[r.listing.id] || photoFor(d.item);
    if (ph && ph.file && res.id) { MKPH[res.id] = ph; try { await SB.upload('listings', AUTH.acct.id + '/' + res.id + '.jpg', ph.file); await SB.rpc('mk_photo_ready', { p_listing: res.id }); } catch (e) { toast('La foto no se pudo subir; la publicación quedó con la ilustración.'); } }
  }),
  mkSetPrice: (M, id, s, price) => cloudMk('mk_set_price', { p_listing: id, p_price: Math.round(Number(price)) }),
  mkWithdraw: (M, id) => cloudMk('mk_withdraw', { p_listing: id }),
  mkOffer: (M, d) => cloudMk('mk_offer', { p_listing: d.listingId, p_amount: Number(d.amount), p_message: d.message || '', p_contact: d.contact || '', p_district: (d.buyer && d.buyer.district) || '' }),
  mkRespond: (M, id, s, action, counter) => cloudMk('mk_respond', { p_offer: id, p_action: action, p_counter: counter == null ? null : Math.round(Number(counter)) }),
  mkBuyerRespond: (M, id, b, action) => cloudMk('mk_buyer_respond', { p_offer: id, p_action: action }),
  mkDealStep: (M, id, a, step) => cloudMk('mk_deal_step', { p_offer: id, p_step: step }),
  mkReview: (M, d) => cloudMk('mk_review', { p_offer: d.offerId, p_stars: Math.round(Number(d.stars)), p_tags: d.tags || [], p_comment: d.comment || '' })
};
function wrapMk(orig, name) {
  return function (M) {
    const r = orig.apply(this, arguments);
    if (M && M === CLOUD.market && isCloudAcct() && !(r && r.error)) MK_WRAP[name].apply(null, Array.from(arguments).concat([r]));
    return r;
  };
}
/* eslint-disable no-func-assign */
mkPublish = wrapMk(mkPublish, 'mkPublish'); mkSetPrice = wrapMk(mkSetPrice, 'mkSetPrice'); mkWithdraw = wrapMk(mkWithdraw, 'mkWithdraw');
mkOffer = wrapMk(mkOffer, 'mkOffer'); mkRespond = wrapMk(mkRespond, 'mkRespond'); mkBuyerRespond = wrapMk(mkBuyerRespond, 'mkBuyerRespond');
mkDealStep = wrapMk(mkDealStep, 'mkDealStep'); mkReview = wrapMk(mkReview, 'mkReview');
/* eslint-enable no-func-assign */
const _mkSync12 = mkSync;
mkSync = function () { // eslint-disable-line no-func-assign
  const M = mkStore(); const before = isCloudAcct() ? M.listings.filter((l) => !l.sellerSynced).map((l) => l.id) : [];
  _mkSync12();
  if (isCloudAcct()) M.listings.filter((l) => l.sellerSynced && before.includes(l.id)).forEach((l) => SB.rpc('mk_mark_synced', { p_listing: l.id }).catch(() => {}));
};
const _mkAddCloset12 = ACT.mkAddCloset;
ACT.mkAddCloset = async (el) => {
  const M = mkStore(); const o = mkOfferById(M, el.dataset.id); const l = o && mkListing(M, o.listingId);
  if (isCloudAcct() && l && MKPH[l.id] && !MKPH[l.id].file && MKPH[l.id].url) { try { const blob = await (await fetch(MKPH[l.id].url)).blob(); MKPH[l.id] = { url: URL.createObjectURL(blob), file: blob }; } catch (e) { /* sin foto */ } }
  _mkAddCloset12(el);
  if (isCloudAcct() && o && o.addedItemId) SB.rpc('mk_mark_added', { p_offer: o.id, p_item: o.addedItemId }).catch(() => {});
};

/* ---------- Reportar y bloquear (todas las versiones) ---------- */
const REPORT_REASONS = ['Prenda falsa o engañosa', 'Estafa o pide pago por adelantado', 'Contenido inapropiado', 'Ya no está disponible', 'Otro motivo'];
UI.mkBlockedLocal = UI.mkBlockedLocal || [];
const blockedIds = () => (isCloudAcct() && !isDemo() ? CLOUD.blocked || [] : UI.mkBlockedLocal);
const _mkBrowse12 = mkBrowse;
mkBrowse = function (M, w, ownerId, me, f) { return _mkBrowse12(M, w, ownerId, me, f).filter((r) => !blockedIds().includes(r.listing.sellerId)); }; // eslint-disable-line no-func-assign
const _renderMkListing12 = renderMkListing;
renderMkListing = function (m) { // eslint-disable-line no-func-assign
  const html = _renderMkListing12(m); const l = mkListing(mkStore(), m.id); if (!l || l.sellerId === mkMe().id) return html;
  const blocked = blockedIds().includes(l.sellerId);
  const tools = '<div class="row mk-safety"><button class="btn sm ghost" data-act="mkReportOpen" data-id="' + l.id + '">Reportar publicación</button><button class="btn sm ghost" data-act="mkBlock" data-user="' + esc(l.sellerId) + '" data-on="' + !blocked + '">' + (blocked ? 'Desbloquear a ' : 'Bloquear a ') + esc(l.sellerName) + '</button></div>';
  const i = html.lastIndexOf('</div></div></div></div>');
  return i > 0 ? html.slice(0, i) + tools + html.slice(i) : html;
};
function renderMkReport(m) {
  return modalWrap('Reportar publicación', '<p class="small muted">Tu reporte es anónimo para quien publica. Lo revisamos y, si incumple las normas, la retiramos.</p>' +
    '<div class="stack tight">' + REPORT_REASONS.map((r) => '<button type="button" class="chip btnchip" data-act="mkReportReason" data-val="' + esc(r) + '" aria-pressed="' + (m.reason === r) + '">' + esc(r) + '</button>').join('') + '</div>' +
    '<div class="field"><label for="rp-detail">Detalle (opcional)</label><input class="input" id="rp-detail" maxlength="500" value="' + esc(m.detail || '') + '" data-mk-report="1"></div>' +
    '<div class="sheet-foot row"><button class="btn primary" data-act="mkReportSend"' + (m.reason ? '' : ' disabled') + '>Enviar reporte</button><button class="btn ghost" data-act="closeModal">Cancelar</button></div>', { eyebrow: 'Vitrina · seguridad' });
}
const _renderModal12 = renderModal;
renderModal = function () { return UI.modal.type === 'mkReport' ? renderMkReport(UI.modal) : _renderModal12(); }; // eslint-disable-line no-func-assign
document.addEventListener('input', (e) => { if (e.target && e.target.dataset && e.target.dataset.mkReport && UI.modal) UI.modal.detail = e.target.value; });
Object.assign(ACT, {
  mkReportOpen: (el) => openModal({ type: 'mkReport', id: el.dataset.id, reason: '', detail: '' }),
  mkReportReason: (el) => { UI.modal.reason = el.dataset.val; render(); },
  mkReportSend: () => guard('mkrp', () => {
    const m = UI.modal; UI.modal = null;
    if (isCloudAcct() && !isDemo()) SB.rpc('mk_report', { p_listing: m.id, p_reason: m.reason, p_detail: m.detail || '' }).then((r) => toast(r && r.error ? r.error : 'Gracias. Revisaremos la publicación.')).catch((e) => toast(sbError(e)));
    else toast('Gracias. Revisaremos la publicación.' + (isDemo() ? ' (simulado)' : ''));
    render();
  }),
  mkBlock: (el) => guard('mkbl', () => {
    const user = el.dataset.user; const on = el.dataset.on === 'true';
    if (isCloudAcct() && !isDemo()) cloudMk('mk_block', { p_user: user, p_on: on });
    else UI.mkBlockedLocal = on ? UI.mkBlockedLocal.concat(user) : UI.mkBlockedLocal.filter((x) => x !== user);
    if (on) UI.modal = null;
    toast(on ? 'Bloqueado: ya no verás sus publicaciones ni podrá ofertarte.' : 'Desbloqueado.'); render();
  })
});

/* ---------- Pantallas de acceso con correo ---------- */
if (CLOUD.on) {
  const _renderAuth12 = renderAuth;
  renderAuth = function () { // eslint-disable-line no-func-assign
    const a = UI.auth; const err = a.error ? '<div class="note bad" role="alert">' + esc(a.error) + '</div>' : (UI.authMsg ? '<div class="note info">' + esc(UI.authMsg) + '</div>' : '');
    const busy = a.busy ? ' disabled' : '';
    const brand = '<div class="auth-brand">' + LOGO + '<b>RELISTO</b>' + (a.screen === 'welcome' ? '' : '<span>Ya tienes qué ponerte.</span>') + '</div>';
    const email = (id) => authField(id || 'au-email', 'Correo', 'email', a.email, 'email', ' autocomplete="email" inputmode="email" maxlength="120" placeholder="tu@correo.com"');
    const links = (arr) => '<div class="row" style="justify-content:center">' + arr.map(([scr, t]) => scr === 'demo' ? '<button class="btn ghost" data-act="authDemo">' + t + '</button>' : '<button class="btn ghost" data-act="authGo" data-screen="' + scr + '">' + t + '</button>').join('') + '</div>';
    let body = '';
    if (a.screen === 'welcome') {
      body = '<h1 class="serif auth-h">Relisto. <em>Ya tienes qué ponerte.</em></h1><p class="muted" style="margin:0">Tu próximo gran outfit ya está en tu armario: solo falta combinarlo.</p>' +
        '<ul class="clean auth-feats"><li>' + IC.spark + '<span><b>Un toque, tres outfits</b> con la ropa que ya tienes.</span></li><li>' + IC.camera + '<span><b>Tu armario con fotos</b>, en tu cuenta y en todos tus teléfonos.</span></li><li>' + IC.circular + '<span><b>La Vitrina</b>: vende lo que no usas a gente cerca de ti.</span></li></ul>' +
        '<span class="beta-tag">Beta privada</span><button class="btn primary lg wide" data-act="authGo" data-screen="signup">Crear mi cuenta gratis</button><button class="btn lg wide" data-act="authGo" data-screen="login">Ya tengo cuenta</button><button class="btn ghost wide" data-act="authDemo">Explorar la demo sin cuenta</button>';
    } else if (a.screen === 'signup') {
      const sc = pwScore(a.pw); const lbl = ['', 'débil', 'aceptable', 'buena', 'fuerte'][sc];
      const inv = a.invite !== undefined ? a.invite : savedInvite();
      body = '<h1 class="serif auth-h">Crea tu cuenta</h1><p class="small muted" style="margin:0">RELISTO está en beta privada: necesitas el código que te compartieron.</p><form class="stack" data-auth-form="signup" novalidate>' + authField('au-invite', 'Código de invitación', 'invite', inv, 'text', ' autocapitalize="characters" autocomplete="off" maxlength="40" placeholder="Ej.: RELISTO-BETA"') + authField('au-name', 'Nombre o alias', 'name', a.name, 'text', ' autocomplete="nickname" maxlength="40"') + email() +
        pwField('au-pw', 'Crea una contraseña', 'pw', a.pw, true) + '<div class="pw-meter" aria-live="polite"><i class="s' + sc + '"></i><span class="tiny muted">' + (a.pw ? 'Seguridad: ' + lbl : 'Mínimo 8 caracteres, con letras y números.') + '</span></div>' +
        pwField('au-pw2', 'Repite la contraseña', 'pw2', a.pw2) +
        '<label class="check" for="au-terms"><input type="checkbox" id="au-terms"' + (a.terms ? ' checked' : '') + bindAttr('auth', 'terms', 'bool') + '> <span>Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a></span></label>' +
        err + '<button class="btn primary lg wide" type="submit"' + busy + '>' + (a.busy ? 'Creando tu cuenta…' : 'Crear cuenta') + '</button></form>' + links([['login', 'Ya tengo cuenta'], ['demo', 'Ver la demo']]);
    } else if (a.screen === 'login') {
      body = '<h1 class="serif auth-h">Entra a tu armario</h1><form class="stack" data-auth-form="login" novalidate>' + email() + pwField('au-pw', 'Contraseña', 'pw', a.pw) + err +
        '<button class="btn primary lg wide" type="submit"' + busy + '>' + (a.busy ? 'Entrando…' : 'Entrar') + '</button></form>' + links([['recover', 'Olvidé mi contraseña'], ['signup', 'Crear cuenta'], ['demo', 'Ver la demo']]);
    } else if (a.screen === 'recover') {
      body = '<h1 class="serif auth-h">Recupera tu cuenta</h1><p class="small muted">Te enviaremos un enlace para crear una contraseña nueva.</p><form class="stack" data-auth-form="recover" novalidate>' + email() + err +
        '<button class="btn primary lg wide" type="submit"' + busy + '>' + (a.busy ? 'Enviando…' : 'Enviar enlace') + '</button></form>' + links([['login', 'Volver']]);
    } else if (a.screen === 'sent' || a.screen === 'confirm') {
      body = '<h1 class="serif auth-h">Revisa tu correo</h1><p class="small">' + (a.screen === 'sent' ? 'Si existe una cuenta con <b>' + esc(a.email) + '</b>, te llegará un enlace para crear una contraseña nueva.' : 'Te enviamos un enlace a <b>' + esc(a.email) + '</b> para confirmar tu cuenta. Ábrelo desde este teléfono.') + '</p><p class="tiny muted">¿No llegó? Revisa la carpeta de spam o promociones.</p>' + links([['login', 'Ir a entrar']]);
    } else if (a.screen === 'reset') {
      body = '<h1 class="serif auth-h">Crea una contraseña nueva</h1><form class="stack" data-auth-form="reset" novalidate>' + pwField('au-pw', 'Nueva contraseña', 'pw', a.pw, true) + pwField('au-pw2', 'Repite la contraseña', 'pw2', a.pw2) + err +
        '<button class="btn primary lg wide" type="submit"' + busy + '>Guardar contraseña</button></form>';
    } else if (a.screen === 'import') {
      const list = localLeftovers();
      body = '<h1 class="serif auth-h">Trae tu armario de este teléfono</h1><p class="small">Encontramos ' + (LEGACY.personal ? 'un armario guardado sin cuenta' : list.length === 1 ? 'un armario guardado con tu DNI' : list.length + ' armarios guardados con DNI') + '. Pásalo a tu cuenta para tenerlo en todos tus teléfonos.' + (S.personal && S.personal.items.length ? ' <b>Reemplazará</b> las ' + plural(S.personal.items.length, 'prenda', 'prendas') + ' que ya tienes en tu cuenta.' : '') + '</p>' +
        (LEGACY.personal ? '<button class="btn primary wide" data-act="importLocal" data-id="legacy">Pasar ' + plural(LEGACY.personal.items.length, 'prenda', 'prendas') + ' a mi cuenta</button>' : '') +
        list.map((x) => '<form class="card stack tight" data-auth-form="import" data-id="' + x.id + '" novalidate><div class="row" style="flex-wrap:nowrap">' + avatar(x.name) + '<span class="stack tight"><b>' + esc(x.name) + '</b><span class="tiny muted">' + esc(x.docMasked) + '</span></span></div>' +
          (a.pick === x.id ? pwField('au-pw', 'Contraseña de ese armario', 'pw', a.pw) + err + '<button class="btn primary" type="submit"' + busy + '>' + (a.busy ? 'Pasando…' : 'Pasar a mi cuenta') + '</button>' : '<button type="button" class="btn" data-act="importPick" data-id="' + x.id + '">Elegir este armario</button>') + '</form>').join('') +
        '<button class="btn ghost wide" data-act="importSkip">Ahora no</button>';
    } else return _renderAuth12();
    return '<main class="auth-wrap"><div class="auth-card">' + brand + body + '<p class="tiny muted auth-foot">Tu armario se guarda en tu cuenta (solo tú puedes verlo) y una copia queda en este teléfono para usarlo sin conexión.</p></div></main>' +
      '<div id="toast" class="toast" role="status" aria-live="polite"' + (UI.toast ? '' : ' hidden') + '>' + esc(UI.toast || '') + '</div>';
  };
  renderAccountMini = function () { // eslint-disable-line no-func-assign
    if (AUTH.acct) return '<div class="acct-mini" data-tour="account">' + avatar(AUTH.acct.name) + '<span class="stack tight" style="min-width:0"><b>' + esc(AUTH.acct.name) + '</b><span class="tiny" style="overflow:hidden;text-overflow:ellipsis">' + esc(AUTH.acct.email || '') + '</span></span><button type="button" class="btn sm" style="background:rgba(255,255,255,.1);color:var(--on-nav);border-color:rgba(255,255,255,.25)" data-act="authLogout">Salir</button></div>';
    return '<button type="button" class="btn sm" data-tour="account" style="background:rgba(255,255,255,.1);color:var(--on-nav);border-color:rgba(255,255,255,.25)" data-act="authOpen">' + IC.lock + 'Entrar o crear cuenta</button>';
  };
  renderAccountCard = function () { // eslint-disable-line no-func-assign
    if (!AUTH.acct) return '<div class="card stack"><span class="eyebrow">Tu cuenta</span><p class="small">Crea tu cuenta gratis con tu correo para guardar tu armario y usarlo en todos tus teléfonos.</p><div class="row"><button class="btn primary" data-act="authOpen">' + IC.lock + 'Entrar o crear cuenta</button><button class="btn" data-act="share">' + IC.share + 'Compartir RELISTO</button></div></div>';
    return '<div class="card stack" data-tour="account-card"><span class="eyebrow">Tu cuenta</span><div class="row" style="flex-wrap:nowrap">' + avatar(AUTH.acct.name, 'lg') + '<span class="stack tight" style="min-width:0"><b>' + esc(AUTH.acct.name) + '</b><span class="small muted" style="overflow-wrap:anywhere">' + esc(AUTH.acct.email || '') + '</span></span></div>' +
      '<p class="small">Tu armario se guarda en tu cuenta en la nube: solo tú puedes verlo. Una copia queda en este teléfono para usarlo sin conexión.</p>' +
      '<div class="row"><button class="btn" data-act="share">' + IC.share + 'Compartir RELISTO</button><button class="btn" data-act="pwOpen">Cambiar contraseña</button><button class="btn" data-act="authLogout">Cerrar sesión</button></div>' +
      (localLeftovers().length || LEGACY.personal ? '<div class="note info row between"><span class="small">Hay un armario guardado en este teléfono sin pasar a tu cuenta.</span><button class="btn sm" data-act="importOpen">Traerlo</button></div>' : '') +
      '<div class="row"><a class="btn sm ghost" href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a><button class="btn sm ghost" data-act="askDeleteAccount">Eliminar mi cuenta</button></div></div>';
  };
    ACT.askDeleteAccount = () => openModal({ type: 'confirm', title: 'Eliminar mi cuenta', text: 'Se borran para siempre tu cuenta, tu armario, tus fotos, tu historial y tus publicaciones de la Vitrina, en la nube y en este teléfono. No se puede deshacer.', okLabel: 'Eliminar todo', okAct: 'deleteAccountNow', danger: true });
  ACT.authGo = (el) => { const keep = UI.auth || {}; UI.authMsg = ''; UI.auth = { screen: el.dataset.screen, email: keep.email || '', terms: keep.terms, invite: keep.invite }; render(); };
  Object.assign(ACT, {
    importPick: (el) => { UI.auth.pick = el.dataset.id; UI.auth.pw = ''; UI.auth.error = ''; render(); },
    importLocal: (el) => doImportLocal(el.dataset.id),
    importOpen: () => { UI.modal = null; UI.auth = { screen: 'import' }; render(); },
    importSkip: () => { UI.auth = null; UI.view = 'hoy'; render(); toast('Puedes traerlo después desde Mi perfil → Privacidad y datos.'); }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-auth-form]'); if (!f || !UI.auth) return;
    const kind = f.dataset.authForm;
    if (kind === 'reset') {
      e.preventDefault(); const a = UI.auth; a.error = pwError(a.pw, a.pw2); if (a.error) return render();
      a.busy = true; render();
      try { await SB.updateUser({ password: a.pw }); UI.auth = null; UI.view = 'hoy'; render(); toast('Contraseña nueva guardada.'); } catch (err) { a.busy = false; a.error = sbError(err); render(); }
    } else if (kind === 'import') { e.preventDefault(); doImportLocal(f.dataset.id); }
  });
}

/* ---------- Textos y detalles en modo nube ---------- */
const _saveStateText12 = saveStateText;
saveStateText = function () { // eslint-disable-line no-func-assign
  if (!isCloudAcct() || isDemo()) return _saveStateText12();
  return CLOUD.status === 'offline' ? { strong: 'Sin conexión', rest: 'Tus cambios quedan en este teléfono y se suben solos al volver la conexión.' } : { strong: 'Guardado en tu cuenta', rest: 'Tu armario y tus fotos están en la nube y en este teléfono. Entra con tu correo en otro teléfono y lo verás igual.' };
};
const _renderDataTab12 = renderDataTab;
renderDataTab = function () { // eslint-disable-line no-func-assign
  const html = _renderDataTab12();
  if (!isCloudAcct() || isDemo()) return html;
  return html.replace(/<p class="small">Tus fotos se guardan en este teléfono[\s\S]*?<\/p>/, '<p class="small">Tus fotos se guardan en tu cuenta (solo tú puedes verlas) y en este teléfono para verlas sin conexión.</p>')
    .replace('<b>Respaldo completo</b><span class="small">Un archivo con tus prendas, historial y fotos.', '<b>Respaldo completo (opcional)</b><span class="small">Tu cuenta ya guarda todo en la nube. Si igual quieres un archivo con tus prendas, historial y fotos:');
};
const _renderVitrina12 = renderVitrina;
renderVitrina = function () { // eslint-disable-line no-func-assign
  const html = _renderVitrina12();
  if (!isCloudAcct() || isDemo()) return html;
  return html.replace(/<div class="note info">Por ahora la vitrina se comparte[\s\S]*?<\/div>/, '<div class="note info">Vitrina en línea: lo que publicas lo ven personas de tu ciudad. Ordenamos por cercanía y nadie ve tu contacto hasta que cierras un trato.</div>');
};
/* Si una foto de la vitrina no carga, se muestra la ilustración. */
document.addEventListener('error', (e) => {
  const img = e.target; if (!img || img.tagName !== 'IMG' || !/\/storage\/v1\/object\/public\/listings\//.test(img.src || '')) return;
  const id = (img.src.split('/').pop() || '').replace(/\.[a-z]+$/i, '');
  if (MKPH[id] && !MKPH[id].file) { delete MKPH[id]; clearTimeout(CLOUD.imgTimer); CLOUD.imgTimer = setTimeout(render, 50); }
}, true);
