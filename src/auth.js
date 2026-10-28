/* =====================================================================
   CUENTAS LOCALES (solo en la app instalada)
   Usuario: DNI o carné de extranjería. Contraseña creada por la persona.
   El armario y sus fotos se cifran con AES-GCM usando una clave de datos
   aleatoria; esa clave se guarda envuelta (AES-KW) con una clave derivada
   de la contraseña (PBKDF2-SHA-256) y, aparte, con el código de recuperación.
   Nada sale del teléfono. No se valida el documento con RENIEC.
   ===================================================================== */
const AUTH = { acct: null, key: null, accounts: [], fails: 0, lockUntil: 0 };
const LEGACY = { personal: null, photoCount: 0 };
const PBKDF2_ITER = 210000;
const TXT_ENC = new TextEncoder();
const TXT_DEC = new TextDecoder();
const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function randBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
async function deriveKek(secret, salt) {
  const base = await crypto.subtle.importKey('raw', TXT_ENC.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-KW', length: 256 }, false, ['wrapKey', 'unwrapKey']);
}
async function wrapWith(secret, dataKey) {
  const salt = randBytes(16); const k = await deriveKek(secret, salt);
  return { salt: b64(salt), wrapped: b64(await crypto.subtle.wrapKey('raw', dataKey, k, 'AES-KW')) };
}
async function unwrapWith(secret, rec, extractable) {
  const k = await deriveKek(secret, unb64(rec.salt));
  return crypto.subtle.unwrapKey('raw', unb64(rec.wrapped), k, 'AES-KW', { name: 'AES-GCM' }, !!extractable, ['encrypt', 'decrypt']);
}
async function docHash(type, num) { return b64(await crypto.subtle.digest('SHA-256', TXT_ENC.encode('relisto:' + type + ':' + num))); }
async function encryptBuf(key, buf) { const iv = randBytes(12); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf); return { iv: iv.buffer, ct }; }
async function decryptBuf(key, rec) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(rec.iv) }, key, rec.ct); }
async function encryptJSON(key, obj) { return encryptBuf(key, TXT_ENC.encode(JSON.stringify(obj))); }
async function decryptJSON(key, rec) { return JSON.parse(TXT_DEC.decode(await decryptBuf(key, rec))); }
function makeRecoveryCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = randBytes(16); let s = ''; for (let i = 0; i < 16; i++) s += A[r[i] % 32]; return s.match(/.{4}/g).join('-'); }
const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const DOC_TYPES = { dni: 'DNI', ce: 'Carné de extranjería' };
function normDoc(type, num) { const n = String(num || '').trim().toUpperCase().replace(/\s|-/g, ''); return n; }
function docError(type, num) {
  if (type === 'dni' && !/^\d{8}$/.test(num)) return 'El DNI tiene 8 dígitos.';
  if (type === 'ce' && !/^[A-Z0-9]{8,12}$/.test(num)) return 'El carné de extranjería tiene entre 8 y 12 caracteres.';
  return '';
}
function maskDoc(type, num) { return (type === 'dni' ? 'DNI ' : 'CE ') + '•'.repeat(Math.max(0, num.length - 3)) + num.slice(-3); }
function pwScore(pw) {
  let s = 0; if (!pw) return 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++;
  if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return s;
}
function pwError(pw, pw2) {
  if (!pw || pw.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
  if (!(/[a-zA-Z]/.test(pw) && /\d/.test(pw))) return 'Combina letras y números en tu contraseña.';
  if (pw2 !== undefined && pw !== pw2) return 'Las contraseñas no coinciden.';
  return '';
}

/* ---------- Sesión ---------- */
async function openAccount(acct, key, keep) {
  AUTH.acct = acct; AUTH.key = key; AUTH.fails = 0;
  const rec = await LOCAL.get('acct-data:' + acct.id);
  const data = rec ? await decryptJSON(key, rec) : buildPersonalWorkspace(TODAY, { name: acct.name });
  S.personal = data; S.space = 'personal';
  forgetPhotos('personal:');
  await loadAccountPhotos(acct.id, key);
  if (keep) await LOCAL.set('session', { acctId: acct.id, key });
  else await LOCAL.del('session');
  Object.keys(UI.gen).forEach((k) => { if (k.startsWith('personal:')) delete UI.gen[k]; });
  Object.keys(UI.draft).forEach((k) => { if (k.startsWith('personal:')) delete UI.draft[k]; });
}
async function restoreSession() {
  try {
    const s = await LOCAL.get('session');
    if (!s || !s.key) return false;
    const acct = AUTH.accounts.find((a) => a.id === s.acctId);
    if (!acct) return false;
    await openAccount(acct, s.key, true);
    return true;
  } catch (e) { AUTH.acct = null; AUTH.key = null; S.personal = null; S.space = 'demo'; return false; }
}
async function logout() {
  AUTH.acct = null; AUTH.key = null;
  await LOCAL.del('session').catch(() => {});
  forgetPhotos('personal:');
  S.personal = null; S.space = 'demo';
  Object.keys(UI.gen).forEach((k) => { if (k.startsWith('personal:')) delete UI.gen[k]; });
  Object.keys(UI.draft).forEach((k) => { if (k.startsWith('personal:')) delete UI.draft[k]; });
  await doSave();
}
/** En la app instalada, el armario personal pide cuenta. Devuelve true si abrió la pantalla de acceso. */
function needAuth() {
  if (!IS_PWA || AUTH.acct) return false;
  UI.modal = null;
  UI.auth = AUTH.accounts.length ? { screen: 'login', acctId: AUTH.accounts.length === 1 ? AUTH.accounts[0].id : null } : { screen: 'signup', docType: 'dni', keep: true };
  render();
  return true;
}

/* ---------- Flujos ---------- */
async function doSignup() {
  const a = UI.auth; a.error = '';
  const num = normDoc(a.docType, a.doc);
  a.error = docError(a.docType, num) || (String(a.name || '').trim() ? '' : 'Escribe tu nombre o alias.') || pwError(a.pw, a.pw2);
  if (a.error) return render();
  const hash = await docHash(a.docType, num);
  if (AUTH.accounts.some((x) => x.docHash === hash)) { a.error = 'Ya existe una cuenta con ese documento en este teléfono. Inicia sesión.'; return render(); }
  a.busy = true; render();
  try {
    const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const code = makeRecoveryCode();
    const acct = { id: 'a' + Array.from(randBytes(6), (b) => b.toString(16).padStart(2, '0')).join(''), docType: a.docType, docHash: hash, docMasked: maskDoc(a.docType, num),
      name: String(a.name).trim().slice(0, 40), createdAt: TODAY, pw: await wrapWith(a.pw, dataKey), rc: await wrapWith(normCode(code), dataKey) };
    const key = await unwrapWith(a.pw, acct.pw, false); // copia no exportable para la sesión
    AUTH.accounts.push(acct); await LOCAL.set('accounts', AUTH.accounts); await LOCAL.set('welcomed', true);
    AUTH.acct = acct; AUTH.key = key;
    let migrated = 0;
    if (LEGACY.personal) {
      S.personal = LEGACY.personal;
      const p = S.personal.profiles.find((x) => x.id === S.personal.activeProfileId);
      if (p && (!p.name || p.name === 'Tú')) p.name = acct.name;
      const rows = await LOCAL.photoRange('personal:');
      for (const { key: k, val } of rows) {
        const blob = new Blob([val.buf], { type: val.type || 'image/jpeg' });
        PHOTOS[k] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false };
        await persistPhoto(k, PHOTOS[k]); migrated++;
      }
      await LOCAL.photoDelRange('personal:');
      LEGACY.personal = null;
    } else {
      S.personal = buildPersonalWorkspace(TODAY, { name: acct.name });
    }
    S.space = 'personal';
    if (a.keep !== false) await LOCAL.set('session', { acctId: acct.id, key });
    await doSave();
    UI.auth = { screen: 'code', code, migrated, items: S.personal.items.length };
  } catch (e) {
    a.busy = false; a.error = 'No se pudo crear la cuenta en este navegador. Prueba con Chrome o Safari actualizados.';
  }
  render();
}
async function doLogin() {
  const a = UI.auth; a.error = '';
  if (Date.now() < AUTH.lockUntil) { a.error = 'Demasiados intentos. Espera ' + Math.ceil((AUTH.lockUntil - Date.now()) / 1000) + ' segundos.'; return render(); }
  let acct = a.acctId ? AUTH.accounts.find((x) => x.id === a.acctId) : null;
  if (!acct) {
    const num = normDoc(a.docType || 'dni', a.doc);
    const err = docError(a.docType || 'dni', num); if (err) { a.error = err; return render(); }
    const hash = await docHash(a.docType || 'dni', num);
    acct = AUTH.accounts.find((x) => x.docHash === hash);
    if (!acct) { a.error = 'No hay una cuenta con ese documento en este teléfono. Puedes crear una.'; return render(); }
  }
  if (!a.pw) { a.error = 'Escribe tu contraseña.'; return render(); }
  a.busy = true; render();
  let key = null;
  try { key = await unwrapWith(a.pw, acct.pw, false); } catch (e) { key = null; }
  if (!key) {
    AUTH.fails++; if (AUTH.fails >= 5) { AUTH.lockUntil = Date.now() + 30000; AUTH.fails = 0; }
    a.busy = false; a.pw = ''; a.error = 'Contraseña incorrecta.' + (AUTH.lockUntil > Date.now() ? ' Espera 30 segundos para volver a intentar.' : '');
    return render();
  }
  try { await openAccount(acct, key, a.keep !== false); } catch (e) { a.busy = false; a.error = 'No se pudo abrir tu armario. Si tienes un respaldo, puedes restaurarlo.'; return render(); }
  await LOCAL.set('welcomed', true);
  UI.auth = null; UI.view = 'hoy'; render();
  toast('Hola, ' + acct.name + '. Tu armario está listo.');
  maybeAutoTour();
}
async function doRecover() {
  const a = UI.auth; a.error = '';
  let acct = a.acctId ? AUTH.accounts.find((x) => x.id === a.acctId) : null;
  if (!acct) {
    const num = normDoc(a.docType || 'dni', a.doc); const err = docError(a.docType || 'dni', num); if (err) { a.error = err; return render(); }
    const hash = await docHash(a.docType || 'dni', num); acct = AUTH.accounts.find((x) => x.docHash === hash);
    if (!acct) { a.error = 'No hay una cuenta con ese documento en este teléfono.'; return render(); }
  }
  a.error = (normCode(a.code).length === 16 ? '' : 'El código tiene 16 caracteres, por ejemplo ABCD-EFGH-JKLM-NPQR.') || pwError(a.pw, a.pw2);
  if (a.error) return render();
  a.busy = true; render();
  let dataKey = null;
  try { dataKey = await unwrapWith(normCode(a.code), acct.rc, true); } catch (e) { dataKey = null; }
  if (!dataKey) { a.busy = false; a.error = 'El código de recuperación no coincide.'; return render(); }
  acct.pw = await wrapWith(a.pw, dataKey);
  await LOCAL.set('accounts', AUTH.accounts);
  const key = await unwrapWith(a.pw, acct.pw, false);
  await openAccount(acct, key, true);
  UI.auth = null; UI.view = 'hoy'; render();
  toast('Contraseña nueva guardada. Tu código de recuperación sigue siendo el mismo.');
}
async function doChangePassword() {
  const m = UI.modal; const d = m.draft; m.error = '';
  m.error = pwError(d.pw, d.pw2); if (m.error) return render();
  m.busy = true; render();
  let dataKey = null;
  try { dataKey = await unwrapWith(d.current || '', AUTH.acct.pw, true); } catch (e) { dataKey = null; }
  if (!dataKey) { m.busy = false; m.error = 'La contraseña actual no es correcta.'; return render(); }
  AUTH.acct.pw = await wrapWith(d.pw, dataKey);
  await LOCAL.set('accounts', AUTH.accounts);
  if (await LOCAL.get('session')) { AUTH.key = await unwrapWith(d.pw, AUTH.acct.pw, false); await LOCAL.set('session', { acctId: AUTH.acct.id, key: AUTH.key }); }
  UI.modal = null; render(); toast('Contraseña actualizada.');
}
async function doDeleteAccount() {
  const id = AUTH.acct.id;
  await LOCAL.photoDelRange('u:' + id + ':'); await LOCAL.del('acct-data:' + id);
  AUTH.accounts = AUTH.accounts.filter((a) => a.id !== id); await LOCAL.set('accounts', AUTH.accounts);
  await logout();
  UI.modal = null; UI.auth = { screen: AUTH.accounts.length ? 'login' : 'welcome' }; render();
  toast('Cuenta eliminada de este teléfono.');
}
async function shareApp() {
  const url = location.href.split('#')[0].split('?')[0];
  const data = { title: 'RELISTO', text: 'Vístete rápido con la ropa que ya tienes. Instala RELISTO y crea tu cuenta con tu DNI:', url };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado: ' + url); } catch (e) { toast('Comparte este enlace: ' + url); }
}

/* ---------- Pantallas ---------- */
function authField(id, label, path, val, type, extra) {
  return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '"' + bindAttr('auth', path, '', /pw$/.test(path)) + (extra || '') + '></div>';
}
function pwField(id, label, path, val, live) {
  const a = UI.auth || {}; const show = a.showPw;
  return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><div class="pw-row"><input class="input" id="' + id + '" type="' + (show ? 'text' : 'password') + '" value="' + esc(val || '') + '" autocomplete="' + (path === 'pw' && a.screen === 'login' ? 'current-password' : 'new-password') + '"' + bindAttr('auth', path, '', live) + '>' +
    '<button type="button" class="icon-btn soft" data-act="authShowPw" aria-pressed="' + !!show + '" aria-label="' + (show ? 'Ocultar contraseña' : 'Mostrar contraseña') + '">' + IC.eye + '</button></div></div>';
}
function docFields(a) {
  return '<div class="seg2" role="group" aria-label="Tipo de documento">' + Object.entries(DOC_TYPES).map(([k, v]) => '<button type="button" data-act="authDocType" data-val="' + k + '" aria-pressed="' + ((a.docType || 'dni') === k) + '">' + v + '</button>').join('') + '</div>' +
    authField('au-doc', (a.docType || 'dni') === 'dni' ? 'Número de DNI' : 'Número de carné', 'doc', a.doc, 'text', ' inputmode="' + ((a.docType || 'dni') === 'dni' ? 'numeric' : 'text') + '" autocomplete="username" maxlength="12" placeholder="' + ((a.docType || 'dni') === 'dni' ? '8 dígitos' : '8 a 12 caracteres') + '"');
}
function renderAuth() {
  const a = UI.auth; const err = a.error ? '<div class="note bad" role="alert">' + esc(a.error) + '</div>' : '';
  const busy = a.busy ? ' disabled' : '';
  const brand = '<div class="auth-brand">' + LOGO + '<b>RELISTO</b><span>Vístete rápido. Dale más vida a tu ropa.</span></div>';
  let body = '';
  if (a.screen === 'welcome') {
    body = '<h1 class="serif auth-h">Tu próximo gran outfit puede estar en tu armario.</h1>' +
      '<ul class="clean auth-feats"><li>' + IC.spark + '<span><b>Un toque, tres outfits</b> con la ropa que ya tienes.</span></li><li>' + IC.camera + '<span><b>Tu armario con fotos</b>, guardado en este teléfono.</span></li><li>' + IC.lock + '<span><b>Tu cuenta, cifrada</b> con tu contraseña. Nada se sube a internet.</span></li></ul>' +
      (LEGACY.personal ? '<div class="note ok">Encontramos tu armario actual (' + plural(LEGACY.personal.items.length, 'prenda', 'prendas') + (LEGACY.photoCount ? ', ' + plural(LEGACY.photoCount, 'foto', 'fotos') : '') + '). Pasará a tu cuenta al crearla.</div>' : '') +
      '<button class="btn primary lg wide" data-act="authGo" data-screen="signup">Crear mi cuenta</button>' +
      (AUTH.accounts.length ? '<button class="btn lg wide" data-act="authGo" data-screen="login">Ya tengo cuenta</button>' : '') +
      '<button class="btn ghost wide" data-act="authDemo">Explorar la demo sin cuenta</button>';
  } else if (a.screen === 'signup') {
    const sc = pwScore(a.pw); const lbl = ['', 'débil', 'aceptable', 'buena', 'fuerte'][sc];
    body = '<h1 class="serif auth-h">Crea tu cuenta</h1><p class="small muted">Tu documento es tu usuario en este teléfono. No se envía a ningún lado ni se valida con RENIEC.</p>' +
      '<form class="stack" data-auth-form="signup" novalidate>' + docFields(a) + authField('au-name', 'Nombre o alias', 'name', a.name, 'text', ' autocomplete="nickname" maxlength="40"') +
      pwField('au-pw', 'Crea una contraseña', 'pw', a.pw, true) +
      '<div class="pw-meter" aria-live="polite"><i class="s' + sc + '"></i><span class="tiny muted">' + (a.pw ? 'Seguridad: ' + lbl : 'Mínimo 8 caracteres, con letras y números.') + '</span></div>' +
      pwField('au-pw2', 'Repite la contraseña', 'pw2', a.pw2) +
      '<label class="check" for="au-keep"><input type="checkbox" id="au-keep"' + (a.keep !== false ? ' checked' : '') + bindAttr('auth', 'keep', 'bool') + '> Mantener la sesión iniciada en este teléfono</label>' +
      err + '<button class="btn primary lg wide" type="submit"' + busy + '>' + (a.busy ? 'Creando y cifrando…' : 'Crear cuenta') + '</button></form>' +
      '<div class="row" style="justify-content:center">' + (AUTH.accounts.length ? '<button class="btn ghost" data-act="authGo" data-screen="login">Ya tengo cuenta</button>' : '') + '<button class="btn ghost" data-act="authDemo">Ver la demo</button></div>';
  } else if (a.screen === 'code') {
    body = '<h1 class="serif auth-h">Guarda tu código de recuperación</h1>' +
      '<p class="small">Si olvidas tu contraseña, este código es la <b>única</b> forma de entrar a tu armario. Ni RELISTO ni nadie más puede recuperarlo.</p>' +
      '<div class="rc-code" aria-label="Código de recuperación">' + esc(a.code) + '</div>' +
      '<div class="row"><button class="btn" data-act="authCopyCode">Copiar código</button></div>' +
      '<p class="tiny muted">Anótalo en papel, guárdalo en tu gestor de contraseñas o en un lugar fuera de este teléfono.</p>' +
      (a.migrated || a.items ? '<div class="note ok">Tu armario anterior pasó a tu cuenta: ' + plural(a.items, 'prenda', 'prendas') + (a.migrated ? ' y ' + plural(a.migrated, 'foto', 'fotos') : '') + ', ahora cifradas.</div>' : '') +
      '<label class="check" for="au-saved"><input type="checkbox" id="au-saved"' + (a.saved ? ' checked' : '') + bindAttr('auth', 'saved', 'bool') + '> Ya guardé mi código</label>' +
      '<button class="btn primary lg wide" data-act="authFinish"' + (a.saved ? '' : ' disabled') + '>Entrar a RELISTO</button>';
  } else if (a.screen === 'login' || a.screen === 'recover') {
    const rec = a.screen === 'recover';
    const chosen = a.acctId ? AUTH.accounts.find((x) => x.id === a.acctId) : null;
    const list = AUTH.accounts.length && !a.otherDoc ? '<div class="stack tight"><span class="eyebrow">¿Quién eres?</span><div class="acct-list">' + AUTH.accounts.map((x) => '<button type="button" class="acct" data-act="authPick" data-id="' + x.id + '" aria-pressed="' + (a.acctId === x.id) + '">' + avatar(x.name) + '<span class="stack tight" style="text-align:left;min-width:0"><b>' + esc(x.name) + '</b><span class="tiny muted">' + esc(x.docMasked) + '</span></span></button>').join('') + '</div><button class="btn sm ghost" data-act="authOtherDoc">Usar otro documento</button></div>' : '';
    const docInput = (!AUTH.accounts.length || a.otherDoc) ? docFields(a) : '';
    body = '<h1 class="serif auth-h">' + (rec ? 'Recupera tu cuenta' : (chosen ? 'Hola de nuevo, ' + esc(chosen.name) : 'Entra a tu armario')) + '</h1>' +
      '<form class="stack" data-auth-form="' + a.screen + '" novalidate>' + list + docInput +
      (rec ? authField('au-code', 'Código de recuperación', 'code', a.code, 'text', ' autocapitalize="characters" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX"') + pwField('au-pw', 'Nueva contraseña', 'pw', a.pw, true) + pwField('au-pw2', 'Repite la nueva contraseña', 'pw2', a.pw2)
        : pwField('au-pw', 'Contraseña', 'pw', a.pw) + '<label class="check" for="au-keep"><input type="checkbox" id="au-keep"' + (a.keep !== false ? ' checked' : '') + bindAttr('auth', 'keep', 'bool') + '> Mantener la sesión iniciada</label>') +
      err + '<button class="btn primary lg wide" type="submit"' + busy + ((AUTH.accounts.length && !a.otherDoc && !a.acctId) ? ' disabled' : '') + '>' + (a.busy ? 'Verificando…' : rec ? 'Guardar nueva contraseña' : 'Entrar') + '</button></form>' +
      '<div class="row" style="justify-content:center">' + (rec ? '<button class="btn ghost" data-act="authGo" data-screen="login">Volver</button>' : '<button class="btn ghost" data-act="authGo" data-screen="recover">Olvidé mi contraseña</button>') +
      '<button class="btn ghost" data-act="authGo" data-screen="signup">Crear otra cuenta</button><button class="btn ghost" data-act="authDemo">Ver la demo</button></div>';
  }
  return '<main class="auth-wrap"><div class="auth-card">' + brand + body + '<p class="tiny muted auth-foot">Las cuentas viven solo en este teléfono. Para usar RELISTO en otro teléfono, crea ahí tu cuenta y restaura un respaldo.</p></div></main>' +
    '<div id="toast" class="toast" role="status" aria-live="polite"' + (UI.toast ? '' : ' hidden') + '>' + esc(UI.toast || '') + '</div>';
}
function focusAuth() {
  const a = UI.auth; if (!a || a.focused === a.screen) return;
  a.focused = a.screen;
  setTimeout(() => { const el = document.querySelector('.auth-card input:not([type="checkbox"])') || document.querySelector('.auth-card .btn.primary'); if (el) try { el.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
}
function renderAccountMini() {
  if (AUTH.acct) return '<div class="acct-mini" data-tour="account">' + avatar(AUTH.acct.name) + '<span class="stack tight" style="min-width:0"><b>' + esc(AUTH.acct.name) + '</b><span class="tiny">' + esc(AUTH.acct.docMasked) + '</span></span><button type="button" class="btn sm" style="background:rgba(255,255,255,.1);color:var(--on-nav);border-color:rgba(255,255,255,.25)" data-act="authLogout">Salir</button></div>';
  return '<button type="button" class="btn sm" data-tour="account" style="background:rgba(255,255,255,.1);color:var(--on-nav);border-color:rgba(255,255,255,.25)" data-act="authOpen">' + IC.lock + 'Entrar o crear cuenta</button>';
}
function renderAccountCard() {
  if (!IS_PWA) return '';
  if (!AUTH.acct) return '<div class="card stack"><span class="eyebrow">Tu cuenta</span><p class="small">Crea tu cuenta con tu DNI para guardar tu armario cifrado en este teléfono.</p><div class="row"><button class="btn primary" data-act="authOpen">' + IC.lock + 'Entrar o crear cuenta</button><button class="btn" data-act="share">' + IC.share + 'Compartir RELISTO</button></div></div>';
  return '<div class="card stack" data-tour="account-card"><span class="eyebrow">Tu cuenta</span><div class="row" style="flex-wrap:nowrap">' + avatar(AUTH.acct.name, 'lg') + '<span class="stack tight"><b>' + esc(AUTH.acct.name) + '</b><span class="small muted">' + esc(AUTH.acct.docMasked) + ' · desde ' + fmtDate(AUTH.acct.createdAt) + '</span></span></div>' +
    '<p class="small">Tu armario y tus fotos están cifrados con tu contraseña en este teléfono. Para usar RELISTO en otro teléfono, crea ahí tu cuenta y restaura un respaldo completo.</p>' +
    '<div class="row"><button class="btn" data-act="share">' + IC.share + 'Compartir RELISTO</button><button class="btn" data-act="pwOpen">Cambiar contraseña</button><button class="btn" data-act="authLogout">Cerrar sesión</button></div>' +
    '<div class="row"><button class="btn sm ghost" data-act="askDeleteAccount">Eliminar mi cuenta de este teléfono</button></div></div>';
}
