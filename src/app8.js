/* =====================================================================
   RELISTO 3.2: giro 360° de la figura y hoja "Cambiar una prenda"
   pensada para celular.
   ===================================================================== */

/* ---------- Giro 360° ---------- */
function turntableHTML(p, items, label) {
  return '<div class="turn" data-turn aria-label="Figura con giro 360°. Desliza para girarla.">' +
    '<div class="turn-stage"><div class="turn-face front">' + figureSVG(p, items, { label: label || 'Figura de frente' }) + '</div>' +
    '<div class="turn-face back" hidden>' + figureSVG(p, items, { view: 'back', label: 'Figura de espalda' }) + '</div></div>' +
    '<span class="turn-badge" aria-live="polite">Frente</span><span class="turn-hint" aria-hidden="true">↔ Desliza para girar</span></div>' +
    '<div class="turn-ctl"><button type="button" class="btn sm primary" data-act="turnSpin">' + IC.circular + 'Girar 360°</button><button type="button" class="btn sm" data-act="turnTo" data-a="0">Frente</button><button type="button" class="btn sm" data-act="turnTo" data-a="180">Espalda</button></div>';
}
const TURN = { angle: 0, raf: null };
function applyTurn(root, deg) {
  const stage = root.querySelector('.turn-stage'); if (!stage) return;
  const r = deg * Math.PI / 180; const c = Math.cos(r);
  const sx = Math.max(0.12, Math.abs(c));
  const front = c >= 0;
  stage.style.transform = 'scaleX(' + sx.toFixed(3) + ')';
  stage.style.filter = 'brightness(' + (0.92 + 0.08 * Math.abs(c)).toFixed(3) + ')';
  const f = root.querySelector('.turn-face.front'); const bk = root.querySelector('.turn-face.back');
  if (f && bk) { f.hidden = !front; bk.hidden = front; }
  const badge = root.querySelector('.turn-badge'); if (badge) { const lbl = Math.abs(c) < 0.35 ? 'Perfil' : front ? 'Frente' : 'Espalda'; if (badge.textContent !== lbl) badge.textContent = lbl; }
}
function reducedMotion() { const p = prof(); return !!((p && p.reduceMotion) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)); }
function wireTurntables() {
  document.querySelectorAll('[data-turn]').forEach((root) => {
    if (root.dataset.wired) return; root.dataset.wired = '1';
    applyTurn(root, TURN.angle);
    let drag = null;
    root.addEventListener('pointerdown', (e) => { cancelAnimationFrame(TURN.raf); drag = { x: e.clientX, a: TURN.angle, moved: false }; try { root.setPointerCapture(e.pointerId); } catch (er) { /* */ } root.classList.add('dragging'); });
    root.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 3) drag.moved = true; TURN.angle = drag.a + dx * 1.4; applyTurn(root, TURN.angle); });
    const end = () => { if (!drag) return; drag = null; root.classList.remove('dragging'); const hint = root.querySelector('.turn-hint'); if (hint) hint.remove(); UI.turnUsed = true; };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    root.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); TURN.angle += e.key === 'ArrowRight' ? 30 : -30; applyTurn(root, TURN.angle); } });
    root.tabIndex = 0;
    if (UI.turnUsed) { const hint = root.querySelector('.turn-hint'); if (hint) hint.remove(); }
  });
}
function spinTo(target, ms) {
  const root = document.querySelector('[data-turn]'); if (!root) return;
  cancelAnimationFrame(TURN.raf);
  if (reducedMotion()) { TURN.angle = target; applyTurn(root, TURN.angle); return; }
  const from = TURN.angle; const t0 = performance.now(); const dur = ms || 2200;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur); TURN.angle = from + (target - from) * ease(t);
    const r = document.querySelector('[data-turn]'); if (r) applyTurn(r, TURN.angle);
    if (t < 1) TURN.raf = requestAnimationFrame(step); else TURN.angle = ((TURN.angle % 360) + 360) % 360;
  };
  TURN.raf = requestAnimationFrame(step);
}

/* ---------- "Ver outfit completo" con giro ---------- */
const _renderLook8 = renderLook;
renderLook = function (m) { // eslint-disable-line no-func-assign
  const html = _renderLook8(m);
  const items = lookItems(m); const p = prof();
  const start = html.indexOf('<div class="look-fig">'); const endMark = '<span class="chip">Vista ilustrativa</span></div>';
  const end = html.indexOf(endMark, start);
  if (start < 0 || end < 0) return html;
  return html.slice(0, start) + '<div class="look-fig">' + turntableHTML(p, items, 'Figura ilustrada con ' + items.map((i) => i.name).join(', ')) + '<span class="chip look-chip">Vista ilustrativa</span></div>' + html.slice(end + endMark.length);
};

/* ---------- "Cambiar una prenda" para celular ---------- */
function swapSlots(c, d, items) {
  const full = items.find((i) => roleOf(i) === 'full');
  const slots = [];
  if (full) slots.push({ id: 'full', label: 'Vestido o enterizo', role: 'full', hardSlot: 'superior' });
  else { slots.push({ id: 'superior', label: 'Superior', role: 'top', hardSlot: 'superior' }); slots.push({ id: 'inferior', label: 'Inferior', role: 'bottom', hardSlot: 'inferior' }); }
  slots.push({ id: 'calzado', label: 'Calzado', role: 'shoes', hardSlot: 'calzado' });
  if (d.requiredSlots.includes('capa')) slots.push({ id: 'capa', label: 'Capa', role: 'layer', hardSlot: 'capa' });
  slots.push({ id: 'extras', label: 'Extras' });
  return slots;
}
function swapRow(a, act, from, d, note) {
  const ok = isUsable(a);
  const hint = !ok ? availBadge(a.availability) : (roleOf(a) !== 'accessory' && !formalityOk(a, d) ? '<span class="badge warn">menos formal para ' + esc(d.dressCode) + '</span>' : (note || ''));
  return '<button type="button" class="swap-row' + (ok ? '' : ' off') + '" data-act="' + act + '" data-from="' + (from || '') + '" data-to="' + a.id + '"' + (ok ? '' : ' aria-disabled="true"') + '>' +
    '<span class="swap-th">' + thumb(a, { noTag: true, noFlip: true }) + '</span>' +
    '<span class="swap-info"><b>' + esc(a.name) + '</b><span class="tiny muted"><span class="code">' + esc(a.code || '') + '</span> ' + esc(a.color) + '</span>' + hint + '</span>' +
    '<span class="swap-go" aria-hidden="true">' + (ok ? (act === 'addPiece' ? 'Añadir' : 'Usar') : '—') + '</span></button>';
}
renderSwap = function (m) { // eslint-disable-line no-func-assign
  const w = ws(); const d = currentDraft(); const c = findCandidate(m.key);
  if (!c) return modalWrap('Cambiar una prenda', '<p>La propuesta ya no está en pantalla. Vuelve a “Arma mi día”.</p>');
  const items = c.itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean);
  const owned = ownedItems(w, d.ownerId).filter((i) => !isGone(i));
  const slots = swapSlots(c, d, items);
  const slot = slots.find((s) => s.id === m.slot) || slots[0]; m.slot = slot.id;
  const comp = completeness(w, c.itemIds, d, c.template);
  const head = '<div class="swap-head"><span class="minis">' + items.filter((i) => roleOf(i) !== 'accessory').map((i) => '<span class="mini' + (slot.role && roleOf(i) === slot.role ? ' sel' : '') + '">' + thumb(i, { noTag: true, noFlip: true }) + '</span>').join('') + '</span>' +
    '<span class="pct' + (comp.percent < 100 ? ' partial' : '') + '"><b class="num">' + comp.percent + '% completo</b></span></div>';
  const tabs = '<div class="swap-tabs" role="tablist">' + slots.map((s) => '<button type="button" role="tab" class="chip btnchip" data-act="swapSlot" data-slot="' + s.id + '" aria-selected="' + (s.id === slot.id) + '" aria-pressed="' + (s.id === slot.id) + '">' + esc(s.label) + '</button>').join('') + '</div>';
  let body = '';
  if (slot.id === 'extras') {
    const optional = items.filter((i) => roleOf(i) === 'accessory' || (roleOf(i) === 'layer' && !d.requiredSlots.includes('capa')));
    const addable = owned.filter((i) => (roleOf(i) === 'accessory' || (roleOf(i) === 'layer' && !d.requiredSlots.includes('capa'))) && !c.itemIds.includes(i.id));
    body = '<p class="tiny muted">Accesorios, bolsos y capas opcionales: no cambian la completitud.</p>' +
      (optional.length ? '<div class="stack tight"><span class="eyebrow">En este outfit</span>' + optional.map((i) => '<div class="swap-row cur"><span class="swap-th">' + thumb(i, { noTag: true, noFlip: true }) + '</span><span class="swap-info"><b>' + esc(i.name) + '</b><span class="tiny muted"><span class="code">' + esc(i.code || '') + '</span></span></span><button type="button" class="btn sm ghost" data-act="removePiece" data-item="' + i.id + '">Quitar</button></div>').join('') + '</div>' : '') +
      '<div class="stack tight"><span class="eyebrow">Puedes añadir</span>' + (addable.length ? addable.map((a) => swapRow(a, 'addPiece', '', d)).join('') : '<span class="small muted">No tienes más accesorios registrados.</span>') + '</div>';
  } else {
    const cur = items.find((i) => roleOf(i) === slot.role);
    const alts = owned.filter((i) => roleOf(i) === slot.role && (!cur || i.id !== cur.id) && !c.itemIds.includes(i.id) && meetsHard(i, (d.hard || {})[slot.hardSlot]));
    alts.sort((a, b2) => (isUsable(b2) - isUsable(a)) || (formalityOk(b2, d) - formalityOk(a, d)) || a.name.localeCompare(b2.name, 'es'));
    body = '<div class="stack tight"><span class="eyebrow">Ahora</span>' + (cur ? '<div class="swap-row cur"><span class="swap-th">' + thumb(cur, { noTag: true, noFlip: true }) + '</span><span class="swap-info"><b>' + esc(cur.name) + '</b><span class="tiny muted"><span class="code">' + esc(cur.code || '') + '</span> ' + esc(cur.color) + '</span></span><span class="badge ok">En uso</span></div>' : '<div class="note bad">Falta ' + esc(slot.label.toLowerCase()) + ' en este outfit.</div>') + '</div>' +
      '<div class="stack tight"><span class="eyebrow">' + (alts.length ? 'Cámbialo por' : 'Alternativas') + '</span>' + (alts.length ? alts.map((a) => swapRow(a, cur ? 'swapTo' : 'addPiece', cur ? cur.id : '', d)).join('') : '<span class="small muted">No tienes otras prendas compatibles de este tipo. Puedes agregar una desde tu armario.</span>') + '</div>';
  }
  const foot = '<div class="sheet-foot row"><button type="button" class="btn primary grow-btn" data-act="closeModal">' + IC.check + 'Listo</button><button type="button" class="btn" data-act="lookOpen" data-key="' + esc(c.key) + '">' + IC.figure + 'Verlo puesto</button></div>';
  return modalWrap('Cambiar una prenda', head + tabs + body + foot, { eyebrow: c.name });
};

/* ---------- Registrar uso rápido en filas ---------- */
const _renderModal8 = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  const m = UI.modal;
  if (m.type === 'quickWear') {
    const items = ownedItems(ws(), ws().activeProfileId).filter(isUsable);
    return modalWrap('Registrar uso rápido', '<p class="small muted">Para una prenda que usaste sin un outfit guardado. Cuenta como uso confirmado hoy.</p><div class="stack tight">' +
      items.map((i) => '<button type="button" class="swap-row" data-act="quickWearItem" data-item="' + i.id + '"><span class="swap-th">' + thumb(i, { noTag: true, noFlip: true }) + '</span><span class="swap-info"><b>' + esc(i.name) + '</b><span class="tiny muted"><span class="code">' + esc(i.code || '') + '</span> ' + esc(i.color) + '</span></span><span class="swap-go" aria-hidden="true">Usé hoy</span></button>').join('') + '</div>');
  }
  return _renderModal8();
};

Object.assign(ACT, {
  turnSpin: () => spinTo(Math.round(TURN.angle / 360) * 360 + 360, 2400),
  turnTo: (el) => { const target = Number(el.dataset.a); const base = Math.floor(TURN.angle / 360) * 360; let t = base + target; if (Math.abs(t - TURN.angle) > 180) t += t < TURN.angle ? 360 : -360; spinTo(t, 900); },
  swapSlot: (el) => { UI.modal.slot = el.dataset.slot; render(); const md = document.querySelector('.modal'); if (md) md.scrollTop = 0; }
});
// La hoja "Cambiar una prenda" se abre desde el outfit o desde su vista completa.
const _swapOpen = ACT.swap;
ACT.swap = (el, e) => { openModal({ type: 'swap', key: el.dataset.key, slot: null }); };
const _openLook8 = ACT.lookOpen;
ACT.lookOpen = (el, e) => { TURN.angle = 0; _openLook8(el, e); };
// Tras cada render: activar giro y marcar las filas no disponibles.
const _render8 = render;
render = function () { // eslint-disable-line no-func-assign
  _render8();
  wireTurntables();
};
document.addEventListener('click', (e) => {
  const off = e.target.closest('.swap-row[aria-disabled="true"]');
  if (off) { e.stopImmediatePropagation(); toast('Esa prenda no está disponible ahora: ' + (w_item(off.dataset.to) || {}).availability + '.'); }
}, true);
