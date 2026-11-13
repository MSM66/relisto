/* =====================================================================
   USABILIDAD 3.6: Hoy compacto, confirmación de ayer, primeros pasos,
   pendientes en un solo lugar, avisos con Deshacer, perfil en 4 pestañas,
   pestañas que no se cortan y explicaciones plegadas.
   ===================================================================== */
IC.bell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';

/* ---------- 8) Explicaciones plegadas ---------- */
function infoMore(title, html, tiny) {
  return '<details class="info-more"><summary><span class="i-dot" aria-hidden="true">i</span>' + esc(title) + '</summary><p class="' + (tiny ? 'tiny' : 'small') + ' muted">' + html + '</p></details>';
}

/* ---------- 6) Avisos abajo y con Deshacer ---------- */
toast = function (msg, undo) { // eslint-disable-line no-func-assign
  UI.toast = msg; UI.toastUndo = typeof undo === 'function' ? undo : null;
  paintToast();
  clearTimeout(UI.toastTimer);
  UI.toastTimer = setTimeout(() => { UI.toast = null; UI.toastUndo = null; const t = document.getElementById('toast'); if (t) t.hidden = true; }, UI.toastUndo ? 7000 : 4200);
};
function paintToast() {
  const el = document.getElementById('toast'); if (!el) return;
  el.hidden = !UI.toast;
  el.classList.toggle('over-sheet', !!UI.modal);
  el.classList.toggle('over-fab', !!document.querySelector('.fab-add'));
  el.innerHTML = '<span>' + esc(UI.toast || '') + '</span>' + (UI.toastUndo ? '<button type="button" class="toast-undo" data-act="toastUndo">Deshacer</button>' : '');
}
/* Deshacer genérico: guarda una copia del espacio (y de la vitrina) antes de la acción. */
function withUndo(name, fallbackMsg, when) {
  const orig = ACT[name]; if (!orig) return;
  ACT[name] = function (el, e) {
    if (when && !when(el)) return orig(el, e);
    const space = S.space; const snap = JSON.stringify(S[space]); const mk = IS_PWA && !isDemo() ? JSON.stringify(MKDEV) : null;
    const before = UI.toast; UI.toast = null;
    orig(el, e);
    if (JSON.stringify(S[space]) === snap && (!mk || mk === JSON.stringify(MKDEV))) { if (!UI.toast) UI.toast = before; return; }
    toast(UI.toast || fallbackMsg, () => {
      if (S.space !== space) { toast('Ya no se puede deshacer: cambiaste de espacio.'); return; }
      S[space] = JSON.parse(snap);
      if (mk) { MKDEV = JSON.parse(mk); LOCAL.set('market', MKDEV).catch(() => {}); }
      toast('Deshecho.'); commit();
    });
  };
}

/* ---------- 3) Pendientes en un solo lugar ---------- */
function pendingList() {
  const w = ws(); const p = prof(); if (!w || !p) return [];
  const out = [];
  const mine = w.wearLogs.filter((l) => l.ownerId === p.id && ['elegido', 'planificado'].includes(l.status));
  mine.filter((l) => l.date === TODAY).slice(-1).forEach((l) => out.push({ id: 'hoy', icon: IC.hoy, title: 'Confirma tu outfit de hoy', text: '«' + l.snapshot.name + '»', btn: '<button class="btn sm primary" data-act="confirmWear" data-log="' + l.id + '">' + IC.check + 'Sí, lo usé</button>' }));
  const y = pastUnconfirmed();
  if (y) out.push({ id: 'ayer', icon: IC.hoy, title: '¿Usaste «' + y.snapshot.name + '»?', text: 'Lo elegiste ' + relDays(daysBetween(y.date, TODAY)) + ' y falta confirmarlo.', btn: '<button class="btn sm primary" data-act="confirmWear" data-log="' + y.id + '">Sí</button><button class="btn sm" data-act="pastNo" data-log="' + y.id + '">No</button>' });
  const dirty = ownedItems(w, p.id).filter((i) => ['por lavar', 'en lavandería'].includes(i.availability));
  if (dirty.length) out.push({ id: 'lavar', icon: IC.armario, title: plural(dirty.length, 'prenda por lavar', 'prendas por lavar'), text: dirty.slice(0, 3).map((i) => i.name).join(', ') + (dirty.length > 3 ? '…' : ''), btn: '<button class="btn sm" data-act="washAll">Ya las lavé</button>' });
  let inbox = { sell: 0, buy: 0 }; try { inbox = mkInbox(mkStore(), mkMe().id); } catch (e) { /* sin vitrina */ }
  if (inbox.sell) out.push({ id: 'vendo', icon: IC.circular, title: plural(inbox.sell, 'aviso en tus ventas', 'avisos en tus ventas'), text: 'Ofertas por responder o entregas por coordinar.', btn: '<button class="btn sm primary" data-act="mkGoVendo">Ver en Vendo</button>' });
  if (inbox.buy) out.push({ id: 'compro', icon: IC.circular, title: plural(inbox.buy, 'aviso en tus compras', 'avisos en tus compras'), text: 'Contraofertas, entregas por confirmar u opiniones por dejar.', btn: '<button class="btn sm primary" data-act="mkGoCompro">Ver en Compro</button>' });
  const rep = ownedItems(w, p.id).filter((i) => i.availability === 'en reparación');
  if (rep.length) out.push({ id: 'repara', icon: IC.circular, title: plural(rep.length, 'prenda en reparación', 'prendas en reparación'), text: rep.map((i) => i.name).join(', '), btn: '<button class="btn sm" data-act="pendGo" data-view="circular">Ver en Circular</button>' });
  const ready = (w.orders || []).filter((o) => o.ownerId === p.id && /listo para recoger|en reparto/.test(o.status));
  if (ready.length) out.push({ id: 'pedido', icon: IC.plan, title: plural(ready.length, 'pedido por recibir', 'pedidos por recibir') + (isDemo() ? ' (simulado)' : ''), text: ready.map((o) => o.id + ' · ' + o.status).join(', '), btn: '<button class="btn sm" data-act="pendGo" data-view="plan" data-tab="pedidos">Ver pedidos</button>' });
  return out;
}
function pastUnconfirmed() {
  const w = ws(); const p = prof(); if (!w || !p) return null;
  const from = addDays(TODAY, -3);
  return w.wearLogs.filter((l) => l.ownerId === p.id && ['elegido', 'planificado'].includes(l.status) && l.date < TODAY && l.date >= from).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
function renderPending() {
  const list = pendingList();
  return modalWrap('Pendientes', list.length ? '<div class="stack tight">' + list.map((x) => '<div class="pend-row"><span class="pend-ic" aria-hidden="true">' + x.icon + '</span><span class="stack tight" style="min-width:0;flex:1"><b>' + esc(x.title) + '</b><span class="small muted">' + esc(x.text) + '</span><span class="row">' + x.btn + '</span></span></div>').join('') + '</div>'
    : emptyState('Todo al día', 'Aquí verás outfits por confirmar, prendas por lavar y avisos de la vitrina.', ''), { eyebrow: list.length ? plural(list.length, 'cosa espera tu respuesta', 'cosas esperan tu respuesta') : 'Sin pendientes' });
}
const _renderShell11 = renderShell;
renderShell = function () { // eslint-disable-line no-func-assign
  const n = pendingList().length;
  const bell = (cls) => '<button type="button" class="' + cls + '" data-act="pendOpen" aria-label="Pendientes' + (n ? ': ' + n : ': ninguno') + '">' + IC.bell + (cls === 'icon-btn bell' ? '' : '<span>Pendientes</span>') + (n ? '<span class="nbadge num bell-n">' + n + '</span>' : '') + '</button>';
  return _renderShell11()
    .replace('<button type="button" class="icon-btn" data-act="menu"', bell('icon-btn bell') + '<button type="button" class="icon-btn" data-act="menu"')
    .replace('<button type="button" data-act="tourStart">', bell('side-bell') + '<button type="button" data-act="tourStart">');
};

/* ---------- 1) Hoy compacto · 2) ¿Lo usaste? · 7) Primeros pasos ---------- */
const _renderInstallCard11 = renderInstallCard;
renderInstallCard = function (force) { return force ? _renderInstallCard11(true) : ''; }; // eslint-disable-line no-func-assign
const _renderResults11 = renderResults;
renderResults = function () { return genState() ? _renderResults11() : ''; }; // eslint-disable-line no-func-assign

function firstSteps() {
  if (isDemo()) return '';
  const w = ws(); const p = prof(); if (!p || p.firstStepsDone) return '';
  const n = ownedItems(w, p.id).length;
  const armed = !!p.armedOnce || w.wearLogs.some((l) => l.ownerId === p.id);
  const used = w.wearLogs.some((l) => l.ownerId === p.id && l.status === 'usado');
  const steps = [
    [n >= 3, 'Agrega 3 prendas', n >= 3 ? 'Listo' : n + ' de 3 · arriba, abajo y calzado', '<button class="btn sm primary" data-act="addItem">' + IC.camera + 'Agregar</button>'],
    [armed, 'Arma tu día', 'Un toque y verás tres outfits', n >= 3 ? '<button class="btn sm primary" data-act="armaDia">' + IC.spark + 'Armar</button>' : ''],
    [used, 'Confirma lo que usaste', 'Con “Sí, lo usé” el armario aprende', '']
  ];
  const done = steps.filter((s) => s[0]).length;
  if (done === 3) { p.firstStepsDone = true; scheduleSave(); return ''; }
  const next = steps.findIndex((s) => !s[0]);
  return '<section class="card first-steps stack tight" aria-label="Primeros pasos"><div class="row between"><span class="eyebrow">Primeros pasos · ' + done + ' de 3</span><button class="btn sm ghost" data-act="firstSkip">Omitir</button></div>' +
    '<div class="meter" role="img" aria-label="' + done + ' de 3 pasos"><i style="width:' + Math.round((done / 3) * 100) + '%"></i></div>' +
    steps.map((s, k) => '<div class="fs-row' + (s[0] ? ' done' : k === next ? ' now' : '') + '"><span class="fs-n" aria-hidden="true">' + (s[0] ? IC.check : k + 1) + '</span><span class="stack tight" style="flex:1;min-width:0"><b>' + s[1] + '</b><span class="tiny muted">' + esc(s[2]) + '</span></span>' + (k === next ? s[3] : '') + '</div>').join('') + '</section>';
}
function pastBanner() {
  const l = pastUnconfirmed(); if (!l) return '';
  const w = ws();
  const thumbs = l.snapshot.items.slice(0, 3).map((s) => { const it = w.items.find((i) => i.id === s.id) || s; return '<span class="mini">' + thumb(Object.assign({ cut: 'regular' }, it), { noTag: true, noFlip: true }) + '</span>'; }).join('');
  const when = daysBetween(l.date, TODAY) === 1 ? 'ayer' : 'el ' + fmtDate(l.date, { weekday: 'long', day: 'numeric', month: undefined, year: undefined });
  return '<div class="today-banner past" role="group" aria-label="Confirmar un outfit anterior"><span class="minis">' + thumbs + '</span><span class="stack tight" style="flex:1;min-width:0"><b>¿Usaste ' + when + ' «' + esc(l.snapshot.name) + '»?</b>' +
    '<span class="row"><button class="btn sm primary" data-act="confirmWear" data-log="' + l.id + '">' + IC.check + 'Sí</button><button class="btn sm" data-act="pastNo" data-log="' + l.id + '">No</button><button class="btn sm ghost" data-act="pastOther" data-log="' + l.id + '">Usé otra cosa</button></span></span></div>';
}
const _todayBanner11 = todayBanner;
todayBanner = function () { return pastBanner() + _todayBanner11(); }; // eslint-disable-line no-func-assign

function accRow(id, icon, title, sub, body) {
  const open = UI.hoyOpen === id;
  return '<div class="acc' + (open ? ' open' : '') + '"><button type="button" class="acc-head" data-act="hoyAcc" data-id="' + id + '" aria-expanded="' + open + '"><span class="acc-ic" aria-hidden="true">' + icon + '</span><span class="stack tight" style="flex:1;min-width:0;text-align:left"><b>' + title + '</b>' + (sub ? '<span class="tiny muted">' + sub + '</span>' : '') + '</span><span class="acc-chev" aria-hidden="true">›</span></button>' + (open ? '<div class="acc-body">' + body + '</div>' : '') + '</div>';
}
renderTodaySide = function () { // eslint-disable-line no-func-assign
  const w = ws(); const p = prof(); const rows = [];
  const sc = styleCompleteness(p);
  if (sc.percent < 100 && !UI.styleLater) rows.push(accRow('estilo', IC.palette, 'Tu perfil de estilo · ' + sc.percent + '%', sc.paletteReady ? 'Afina tus sugerencias' : 'Descubre tu paleta personal', renderStyleNudge(false)));
  const forgotten = ownedItems(w, p.id).filter((i) => isUsable(i) && !Object.values(i.exclusions || {}).some(Boolean) && ['top', 'bottom', 'full', 'layer', 'shoes'].includes(roleOf(i)))
    .map((i) => Object.assign({ item: i }, daysSinceUse(w, i, TODAY))).sort((a, b) => b.days - a.days)[0];
  if (forgotten && forgotten.days >= 30) rows.push(accRow('olvidada', IC.circular, 'Dale otra oportunidad', esc(forgotten.item.name) + ' · ' + (forgotten.basis === 'último uso' ? 'sin uso ' + relDays(forgotten.days) : 'sin estrenar'),
    '<div class="row" style="flex-wrap:nowrap;align-items:center"><div style="width:72px;flex:none">' + thumb(forgotten.item, { noTag: true }) + '</div><span class="small">Ya está en tu armario. Hagámosla protagonista.</span></div><div class="row"><button class="btn sm primary" data-act="useItem" data-item="' + forgotten.item.id + '">Quiero usar esta prenda</button><button class="btn sm" data-act="openItem" data-item="' + forgotten.item.id + '">Ver ficha</button></div>'));
  const cov = templateCoverage(w, p.id); const h = habits(w, p.id, TODAY, 30);
  rows.push(accRow('armario', IC.armario, 'Tu armario', h.distinctUsed + ' de ' + h.eligible + ' prendas en uso este mes',
    (cov.total ? '<div class="kpi"><b class="num">' + cov.ok + ' de ' + cov.total + '</b><span>plantillas de interés que puedes completar hoy <button class="btn sm ghost" data-act="coverage">Ver cuáles</button></span></div>' : '') +
    '<div class="row"><button class="btn sm primary" data-act="addItem">' + IC.plus + 'Agregar prenda</button><button class="btn sm" data-act="quickWear">Registrar uso rápido</button><button class="btn sm" data-act="healthOpen">Ver panorama</button></div>'));
  const last = w.wearLogs.filter((l) => l.ownerId === p.id && l.date < TODAY && l.status === 'usado').sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)).pop();
  if (last) rows.push(accRow('ultimo', IC.check, 'Último outfit usado', esc(last.snapshot.name) + ' · ' + relDays(daysBetween(last.date, TODAY)), '<span class="small">' + esc(last.snapshot.items.map((s) => s.name).join(', ')) + '</span><div class="row"><button class="btn sm" data-act="pendGo" data-view="armario" data-tab="historial">Ver historial</button></div>'));
  const inst = _renderInstallCard11(false);
  if (inst) rows.push(accRow('instalar', IC.spark, 'Instala RELISTO', 'Ícono propio, pantalla completa y sin conexión', inst));
  return '<div class="acc-list" aria-label="Accesos">' + rows.join('') + '</div>';
};
const _renderHoy11 = renderHoy;
renderHoy = function () { // eslint-disable-line no-func-assign
  const html = _renderHoy11(); const fs = firstSteps();
  if (!fs) return html;
  const i = html.indexOf('<section class="hero"');
  const j = html.indexOf('</section>', i) + 10;
  return html.slice(0, j) + fs + html.slice(j);
};

/* ---------- 4) Perfil en 4 pestañas ---------- */
const PROF_GROUPS = [['tu', 'Tú y tu estilo', ['esenciales', 'estilo']], ['imagen', 'Color y figura', ['figura', 'color']], ['medidas', 'Medidas y comodidad', ['medidas', 'comodidad']], ['datos', 'Privacidad y datos', ['datos']]];
const profGroup = (t) => PROF_GROUPS.find((g) => g[0] === t || g[2].includes(t)) || PROF_GROUPS[0];
const _renderProfile11 = renderProfile;
renderProfile = function () { // eslint-disable-line no-func-assign
  const cur = UI.profTab; const g = profGroup(cur);
  const TAB = '<div class="tabs" role="tablist">';
  const parts = g[2].map((t) => { UI.profTab = t; const h = _renderProfile11(); const a = h.indexOf(TAB); return { head: h.slice(0, a), body: h.slice(h.indexOf('</div>', a) + 6) }; });
  UI.profTab = cur;
  let body = parts.map((x) => x.body).join('');
  if (g[0] === 'imagen') {
    const nudge = renderStyleNudge(true);
    body = body.replace(nudge, '');
    body = nudge + body + infoMore('Sobre los tonos de piel', 'Referencia: Escala Monk de tono de piel (Dr. Ellis Monk, publicada por Google, CC BY 4.0). La selección es manual. RELISTO no infiere etnia, atractivo, salud ni personalidad.', true);
  }
  const tabs = TAB + PROF_GROUPS.map(([id, l]) => '<button role="tab" type="button" data-act="profTab" data-tab="' + id + '" aria-selected="' + (g[0] === id) + '">' + l + '</button>').join('') + '</div>';
  return parts[0].head + tabs + body;
};

/* ---------- 5) Pestañas que no se cortan ---------- */
function wireTabs() {
  document.querySelectorAll('.tabs').forEach((t) => {
    const upd = () => { t.classList.toggle('fade-r', t.scrollLeft + t.clientWidth < t.scrollWidth - 4); t.classList.toggle('fade-l', t.scrollLeft > 4); };
    const sel = t.querySelector('[aria-selected="true"]');
    if (sel && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, sel.offsetLeft - (t.clientWidth - sel.offsetWidth) / 2);
    upd(); t.addEventListener('scroll', upd, { passive: true });
  });
}

const _renderModal11 = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  if (UI.modal.type === 'pending') return renderPending();
  const html = _renderModal11();
  if (UI.modal.type === 'quickWear' && UI.modal.date) return html.replace('Cuenta como uso confirmado hoy.', 'Cuenta como uso confirmado ' + (daysBetween(UI.modal.date, TODAY) === 1 ? 'ayer' : 'el ' + fmtDate(UI.modal.date)) + '.').split('Usé hoy').join('La usé');
  return html;
};
const _render11 = render;
render = function () { // eslint-disable-line no-func-assign
  _render11();
  if (IS_PWA && UI.auth) return;
  paintToast(); wireTabs();
};

Object.assign(ACT, {
  toastUndo: () => { const u = UI.toastUndo; UI.toastUndo = null; if (u) u(); },
  pendOpen: () => openModal({ type: 'pending' }),
  pendGo: (el) => { UI.modal = null; UI.view = el.dataset.view; if (el.dataset.view === 'plan' && el.dataset.tab) UI.plan.tab = el.dataset.tab; if (el.dataset.view === 'armario' && el.dataset.tab) UI.closet.tab = el.dataset.tab; if (el.dataset.view === 'circular') UI.circ.tab = 'revisar'; render(); window.scrollTo(0, 0); },
  hoyAcc: (el) => { UI.hoyOpen = UI.hoyOpen === el.dataset.id ? null : el.dataset.id; render(); },
  firstSkip: () => { const p = prof(); if (p) { p.firstStepsDone = true; commit(); } },
  pastNo: (el) => { const l = ws().wearLogs.find((x) => x.id === el.dataset.log); if (l && l.status !== 'usado') l.status = 'descartado'; toast('Anotado: ese día no lo usaste.'); commit(); },
  pastOther: (el) => { const l = ws().wearLogs.find((x) => x.id === el.dataset.log); if (!l) return; const date = l.date; if (l.status !== 'usado') l.status = 'descartado'; scheduleSave(); openModal({ type: 'quickWear', date }); }
});
const _quickWearItem11 = ACT.quickWearItem;
ACT.quickWearItem = (el) => {
  const date = UI.modal && UI.modal.date; if (!date) return _quickWearItem11(el);
  guard('qw' + el.dataset.item, () => { const l = quickWear(ws(), el.dataset.item, date, currentThreshold()); UI.modal = null; if (l) toast('Uso registrado: ' + l.snapshot.items[0].name + '.'); commit(); });
};
const _armaDia11 = ACT.armaDia;
ACT.armaDia = (el, e) => { const p = prof(); if (p && !isDemo() && !p.armedOnce && ownedItems(ws(), p.id).length) { p.armedOnce = true; scheduleSave(); } return _armaDia11(el, e); };
/* Acciones delicadas con Deshacer */
withUndo('washAll', 'Prendas marcadas como lavadas.');
withUndo('unsave', 'Quitado de guardados.');
withUndo('mkWithdraw', 'Retirada de la vitrina.');
withUndo('mkRespond', 'Oferta rechazada.', (el) => el.dataset.a === 'rechazar');
withUndo('cancelChoice', 'Elección cancelada.');
withUndo('pastNo', 'Anotado.');
