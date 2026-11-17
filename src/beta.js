/* =====================================================================
   BETA PRIVADA: etiqueta "Beta", comentarios desde cualquier pantalla
   (se guardan en Supabase; sin conexión quedan en cola) y un recordatorio
   amable para opinar después de unos días de uso.
   ===================================================================== */
const BETA_ON = IS_PWA;
const FB_KINDS = [['me-encanta', 'Me encantó'], ['fallo', 'Algo falló'], ['confuso', 'Me confundió'], ['idea', 'Tengo una idea']];
const FB_FACES = ['😞', '😕', '😐', '🙂', '😍'];
const fbFlag = (k, v) => { try { if (v === undefined) return localStorage.getItem('relisto-fb-' + k); localStorage.setItem('relisto-fb-' + k, String(v)); } catch (e) { return null; } return null; };
function screenName() {
  const v = UI.view; const sub = v === 'armario' ? UI.closet.tab : v === 'plan' ? UI.plan.tab : v === 'circular' ? (UI.circ.tab === 'vitrina' ? 'vitrina-' + UI.mk.sub : 'revisar') : v === 'perfil' ? UI.profTab : '';
  return (v + (sub ? '/' + sub : '') + (UI.modal ? ' · ' + UI.modal.type : '')).slice(0, 60);
}
function deviceInfo() {
  const ua = navigator.userAgent || '';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro';
  return (os + ' · ' + window.innerWidth + 'x' + window.innerHeight + ' · ' + (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? 'instalada' : 'navegador')).slice(0, 160);
}
function renderFeedback(m) {
  return modalWrap('¿Qué te parece RELISTO?', '<p class="small muted">Estás probando una versión temprana. Lo que nos cuentes decide lo que mejoramos primero.</p>' +
    '<div class="fb-faces" role="group" aria-label="¿Cómo te sientes con la app?">' + FB_FACES.map((f, i) => '<button type="button" class="fb-face" data-act="fbRate" data-n="' + (i + 1) + '" aria-pressed="' + (m.rating === i + 1) + '" aria-label="' + ['Nada bien', 'No mucho', 'Normal', 'Bien', 'Me encanta'][i] + '">' + f + '</button>').join('') + '</div>' +
    '<div class="row">' + FB_KINDS.map(([k, t]) => '<button type="button" class="chip btnchip" data-act="fbKind" data-val="' + k + '" aria-pressed="' + (m.kind === k) + '">' + t + '</button>').join('') + '</div>' +
    '<div class="field"><label for="fb-msg">Cuéntanos (opcional)</label><textarea class="input" id="fb-msg" rows="4" maxlength="2000" placeholder="' + (m.kind === 'fallo' ? '¿Qué estabas haciendo y qué pasó?' : m.kind === 'idea' ? '¿Qué te gustaría que hiciera RELISTO?' : 'Lo que más te gustó, lo que cambiarías…') + '" data-fb-msg="1">' + esc(m.message || '') + '</textarea></div>' +
    '<p class="tiny muted">Se envía con la pantalla donde estabas (' + esc(m.screen) + '), la versión de la app y el tipo de teléfono. Nada más.</p>' +
    (m.error ? '<div class="note bad">' + esc(m.error) + '</div>' : '') +
    '<div class="sheet-foot row"><button class="btn primary" data-act="fbSend"' + (m.busy ? ' disabled' : '') + '>' + (m.busy ? 'Enviando…' : 'Enviar comentario') + '</button><button class="btn ghost" data-act="closeModal">Ahora no</button></div>', { eyebrow: 'Beta privada' });
}
async function fbDeliver(item) {
  if (typeof CLOUD === 'undefined' || !CLOUD.on) return { local: true };
  const args = { p_rating: item.rating || null, p_kind: item.kind || 'comentario', p_message: item.message || '', p_screen: item.screen, p_version: APP_VERSION, p_device: item.device };
  const r = (typeof isCloudAcct === 'function' && isCloudAcct()) ? await SB.rpc('send_feedback', args) : await SB.json('/rest/v1/rpc/send_feedback', { method: 'POST', anon: true, json: args });
  if (r && r.error) throw Object.assign(new Error(r.error), { user: true });
  return r;
}
async function fbFlush() {
  let q = []; try { q = JSON.parse(localStorage.getItem('relisto-fb-queue') || '[]'); } catch (e) { q = []; }
  if (!q.length) return;
  const left = [];
  for (const it of q) { try { await fbDeliver(it); } catch (e) { if (!e.user) left.push(it); } }
  try { localStorage.setItem('relisto-fb-queue', JSON.stringify(left)); } catch (e) { /* */ }
}
window.addEventListener('online', () => { fbFlush(); });
setTimeout(fbFlush, 4000);

if (BETA_ON) {
  /* Etiqueta "Beta" en la barra superior y en el panel lateral: abre los comentarios. */
  const _renderShell13 = renderShell;
  renderShell = function () { // eslint-disable-line no-func-assign
    return _renderShell13()
      .replace('<span class="grow"></span>', '<span class="grow"></span><button type="button" class="beta-pill" data-act="fbOpen" data-tour="beta" aria-label="Beta: enviar un comentario">Beta<span class="beta-pill-txt"> · Opina</span></button>')
      .replace('<div class="save-state" data-save-state', '<button type="button" class="btn sm beta-side" data-act="fbOpen">💬 Enviar comentario</button><div class="save-state" data-save-state');
  };
  /* Recordatorio en Pendientes tras dos días de uso, si aún no opinó. */
  const _pendingList13 = pendingList;
  pendingList = function () { // eslint-disable-line no-func-assign
    const out = _pendingList13();
    let first = fbFlag('first'); if (!first) { fbFlag('first', Date.now()); first = Date.now(); }
    if (!fbFlag('sent') && !fbFlag('snooze') && Date.now() - Number(first) > 2 * 86400000) out.push({ id: 'beta', icon: IC.spark, title: '¿Qué te parece RELISTO?', text: 'Llevas unos días probándolo. Tu opinión decide qué mejoramos primero.', btn: '<button class="btn sm primary" data-act="fbOpen">Opinar</button><button class="btn sm ghost" data-act="fbSnooze">Más tarde</button>' });
    return out;
  };
  const _renderModal13 = renderModal;
  renderModal = function () { return UI.modal.type === 'feedback' ? renderFeedback(UI.modal) : _renderModal13(); }; // eslint-disable-line no-func-assign
  const _renderModalMenu13 = renderModal;
  renderModal = function () { // eslint-disable-line no-func-assign
    const html = _renderModalMenu13();
    if (UI.modal.type !== 'menu') return html;
    const i = html.indexOf('<div class="stack">');
    return i < 0 ? html : html.slice(0, i + 19) + '<button class="btn" style="justify-content:flex-start" data-act="fbOpen">💬 Enviar comentario (beta)</button><button class="btn" style="justify-content:flex-start" data-act="storiesOpen">' + IC.spark + 'Ver la bienvenida</button>' + html.slice(i + 19);
  };
}
document.addEventListener('input', (e) => { if (e.target && e.target.dataset && e.target.dataset.fbMsg && UI.modal && UI.modal.type === 'feedback') UI.modal.message = e.target.value; });
Object.assign(ACT, {
  fbOpen: () => { const screen = screenName(); openModal({ type: 'feedback', rating: 0, kind: '', message: '', screen }); },
  fbRate: (el) => { UI.modal.rating = Number(el.dataset.n); UI.modal.error = ''; render(); },
  fbKind: (el) => { UI.modal.kind = UI.modal.kind === el.dataset.val ? '' : el.dataset.val; UI.modal.error = ''; render(); },
  fbSnooze: () => { fbFlag('snooze', 1); UI.modal = null; render(); toast('Te lo recordamos más adelante.'); },
  fbSend: () => guard('fbs', async () => {
    const m = UI.modal; m.error = '';
    if (!m.rating && !String(m.message || '').trim()) { m.error = 'Elige una carita o escribe algo.'; return render(); }
    const item = { rating: m.rating, kind: m.kind, message: String(m.message || '').trim(), screen: m.screen.replace(/ · feedback$/, ''), device: deviceInfo(), at: Date.now() };
    m.busy = true; render();
    try { await fbDeliver(item); }
    catch (e) {
      if (e.user) { m.busy = false; m.error = e.message; return render(); }
      try { const q = JSON.parse(localStorage.getItem('relisto-fb-queue') || '[]'); q.push(item); localStorage.setItem('relisto-fb-queue', JSON.stringify(q.slice(-20))); } catch (e2) { /* */ }
    }
    fbFlag('sent', 1); UI.modal = null; render();
    celebrate('¡Gracias!'); toast('Recibido. Gracias por ayudarnos a mejorar RELISTO.');
  })
});
