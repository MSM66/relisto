/* =====================================================================
   RELISTO 3.1: calendario con varias opciones por día y ajustes de UX.
   ===================================================================== */
function miniRow(ids, n) {
  const w = ws();
  return '<span class="minis">' + ids.map((id) => w.items.find((i) => i.id === id)).filter(Boolean).filter((i) => roleOf(i) !== 'accessory').slice(0, n || 4)
    .map((i) => '<span class="mini">' + thumb(i, { noTag: true, noFlip: true }) + '</span>').join('') + '</span>';
}
function plannedNear(date, ownerId) {
  const w = ws(); const near = new Map();
  w.wearLogs.filter((l) => l.ownerId === ownerId && ['planificado', 'elegido'].includes(l.status) && l.date !== date && Math.abs(daysBetween(date, l.date)) <= 1)
    .forEach((l) => l.snapshot.items.forEach((s) => near.set(s.id, l.date)));
  return near;
}
function renderPlanDay(m) {
  const w = ws(); const p = prof();
  const ctxs = w.contexts.filter((c) => c.ownerId === p.id);
  const ctx = ctxs.find((c) => c.id === m.ctxId) || ctxs[0];
  const dayLabel = fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: undefined });
  if (!ctx) return modalWrap('Planificar el ' + dayLabel, emptyState('Sin contextos', 'Crea un contexto en Hoy para planificar.', ''));
  const r = generateOutfits(w, ctx, p, { onlyAvailable: true }, TODAY);
  const ranked = r.complete;
  const options = pickDiverse(ranked, [], Math.min(12, m.limit || 6), w);
  m.options = options; m.ctx = ctx;
  const near = plannedNear(m.date, p.id);
  const already = w.wearLogs.filter((l) => l.ownerId === p.id && l.date === m.date && ['planificado', 'elegido', 'usado'].includes(l.status));
  const saved = w.saved.filter((s) => s.ownerId === p.id);
  const ctxChips = '<div class="stack tight"><span class="eyebrow">¿Para qué ocasión?</span><div class="chip-scroll">' + ctxs.map((c) => '<button type="button" class="chip btnchip" data-act="planCtx" data-id="' + c.id + '" aria-pressed="' + (c.id === ctx.id) + '">' + esc(c.name) + '</button>').join('') + '</div></div>';
  const alreadyHTML = already.length ? '<div class="stack tight"><span class="eyebrow">Ya planificado ese día</span>' + already.map((l) => '<div class="plan-opt done">' + miniRow(l.snapshot.items.map((s) => s.id), 3) + '<span class="stack tight" style="flex:1;min-width:0"><b class="small">' + esc(l.snapshot.name) + '</b><span class="tiny muted">' + esc(l.contextName || '') + '</span></span>' + (l.status !== 'usado' ? '<button class="btn sm ghost" data-act="cancelChoice" data-log="' + l.id + '">Quitar</button>' : '<span class="badge ok">Usado</span>') + '</div>').join('') + '</div>' : '';
  const plannedKeys = new Set(already.map((l) => l.key));
  const opts = options.length ? '<div class="stack tight"><span class="eyebrow">' + plural(options.length, 'opción', 'opciones') + ' con tu ropa disponible</span>' + options.map((c, idx) => {
    const clash = c.itemIds.filter((id) => near.has(id)).map((id) => w.items.find((i) => i.id === id)).filter(Boolean);
    const isPlanned = plannedKeys.has(c.key);
    return '<div class="plan-opt">' + miniRow(c.itemIds, 4) + '<span class="stack tight" style="flex:1;min-width:0"><b class="small">' + esc(c.name) + '</b><span class="tiny muted">' + esc(c.style || '') + (c.reasons && c.reasons[0] ? ' · ' + esc(c.reasons[0]) : '') + '</span>' +
      (clash.length ? '<span class="tiny" style="color:var(--warn)">' + esc(clash.map((i) => i.name).join(', ')) + ' ya está en un día seguido</span>' : '') + '</span>' +
      '<span class="plan-acts"><button type="button" class="icon-btn soft sm-ic" data-act="planLook" data-idx="' + idx + '" aria-label="Ver ' + esc(c.name) + ' puesto">' + IC.figure + '</button>' +
      (isPlanned ? '<span class="badge info">Elegido</span>' : '<button type="button" class="btn sm primary" data-act="planPickIdx" data-idx="' + idx + '">Elegir</button>') + '</span></div>';
  }).join('') + (ranked.length > options.length && options.length < 12 ? '<button class="btn sm wide" data-act="planMore">' + IC.plus + 'Ver más opciones</button>' : '') + '</div>'
    : '<div class="note">' + esc(r.notes[0] || 'No hay combinaciones completas para este contexto con tu ropa disponible.') + '</div>';
  const savedHTML = saved.length ? '<details class="more"><summary>Tus outfits guardados (' + saved.length + ')</summary><div class="stack tight" style="margin-top:8px">' + saved.map((s) => '<div class="plan-opt">' + miniRow(s.itemIds, 4) + '<span class="stack tight" style="flex:1;min-width:0"><b class="small">' + esc(s.name) + '</b></span><button type="button" class="btn sm" data-act="planPick" data-saved="' + s.id + '" data-date="' + m.date + '">Elegir</button></div>').join('') + '</div></details>' : '';
  return modalWrap('Planificar el ' + dayLabel, '<p class="small muted">Planificar no cuenta como uso. Ese día confirmas con “Sí, lo usé”. Puedes planificar más de una opción para el mismo día.</p>' + ctxChips + alreadyHTML + opts + savedHTML, { eyebrow: 'Calendario' });
}
renderCalendar = function () { // eslint-disable-line no-func-assign
  const w = ws(); const p = prof(); const off = UI.calOffset || 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + off));
  const logs = w.wearLogs.filter((l) => l.ownerId === p.id && ['planificado', 'elegido', 'usado'].includes(l.status));
  const warnings = [];
  days.forEach((d) => {
    logs.filter((l) => l.date === d && l.status !== 'usado').forEach((l) => l.snapshot.items.forEach((s) => {
      const it = w.items.find((x) => x.id === s.id);
      if (it && !isUsable(it)) warnings.push(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: undefined }) + ': ' + it.name + ' está ' + it.availability + '.');
      if (logs.some((l2) => l2 !== l && l2.status !== 'usado' && l2.date > d && daysBetween(d, l2.date) <= 1 && l2.snapshot.items.some((x) => x.id === s.id)) && it) warnings.push(it.name + ' aparece en días seguidos: ¿podrás lavarla a tiempo?');
    }));
  });
  const nav = '<div class="cal-nav"><button class="icon-btn soft sm-ic" data-act="calNav" data-d="-7" aria-label="Semana anterior"' + (off <= 0 ? ' disabled' : '') + '>‹</button><b class="small">' + (off ? '' : 'Esta semana · ') + esc(fmtDate(days[0], { day: 'numeric', month: 'short', year: undefined })) + ' – ' + esc(fmtDate(days[6], { day: 'numeric', month: 'short', year: undefined })) + '</b><button class="icon-btn soft sm-ic" data-act="calNav" data-d="7" aria-label="Semana siguiente"' + (off >= 21 ? ' disabled' : '') + '>›</button></div>';
  return '<div class="note">Elige qué ponerte cada día. RELISTO te avisa si una prenda está por lavar o se repite en días seguidos.</div>' + nav +
    [...new Set(warnings)].map((x) => '<div class="note bad">' + esc(x) + '</div>').join('') +
    '<div class="cal">' + days.map((d) => {
      const l = logs.filter((x) => x.date === d);
      return '<div class="day' + (d === TODAY ? ' today' : '') + '"><div class="row between" style="flex-wrap:nowrap"><b class="small">' + esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short', year: undefined })) + '</b>' + (d === TODAY ? '<span class="chip ok" style="padding:1px 8px">Hoy</span>' : '') + '</div>' +
        (l.length ? l.map((x) => '<div class="cal-entry">' + miniRow(x.snapshot.items.map((s) => s.id), 3) + '<span class="stack tight" style="min-width:0;flex:1"><b class="small">' + esc(x.snapshot.name) + '</b><span class="badge ' + (LOG_STATUS[x.status] || ['neutral'])[0] + '">' + esc((LOG_STATUS[x.status] || [0, x.status])[1]) + '</span></span>' +
          '<span class="plan-acts"><button type="button" class="icon-btn soft sm-ic" data-act="calLook" data-log="' + x.id + '" aria-label="Ver puesto">' + IC.figure + '</button>' + (x.status !== 'usado' ? '<button type="button" class="icon-btn soft sm-ic" data-act="cancelChoice" data-log="' + x.id + '" aria-label="Quitar del calendario">' + IC.x + '</button>' : '') + '</span></div>').join('') : '<span class="tiny muted">Libre</span>') +
        '<button class="btn sm' + (l.length ? ' ghost' : '') + '" data-act="planDay" data-date="' + d + '">' + IC.plus + (l.length ? 'Otra opción' : 'Planificar') + '</button></div>';
    }).join('') + '</div>';
};
Object.assign(ACT, {
  planDay: (el) => openModal({ type: 'planday', date: el.dataset.date, ctxId: (currentDraft() || {}).id, limit: 6 }),
  planCtx: (el) => { UI.modal.ctxId = el.dataset.id; UI.modal.limit = 6; render(); },
  planMore: () => { UI.modal.limit = Math.min(12, (UI.modal.limit || 6) + 6); render(); },
  planPickIdx: (el) => guard('pp' + el.dataset.idx + UI.modal.date, () => {
    const m = UI.modal; const c = m.options[Number(el.dataset.idx)]; if (!c) return;
    chooseOutfit(ws(), c, m.ctx, TODAY, 'planificado', m.date);
    UI.modal = null; celebrate(null);
    toast('«' + c.name + '» planificado para el ' + fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: undefined }) + '.'); commit();
  }),
  planLook: (el) => { const m = UI.modal; const c = m.options[Number(el.dataset.idx)]; if (!c) return; UI.lookBack = { type: 'planday', date: m.date, ctxId: m.ctxId, limit: m.limit }; openModal({ type: 'look', itemIds: c.itemIds, title: c.name, back: true }); },
  calLook: (el) => { const l = ws().wearLogs.find((x) => x.id === el.dataset.log); if (l) openModal({ type: 'look', itemIds: l.snapshot.items.map((s) => s.id).filter((id) => w_item(id)), title: l.snapshot.name }); },
  calNav: (el) => { UI.calOffset = Math.max(0, Math.min(21, (UI.calOffset || 0) + Number(el.dataset.d))); render(); },
  lookBack: () => { const b = UI.lookBack; UI.lookBack = null; openModal(b); }
});
const _renderModal7 = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  const m = UI.modal;
  if (m.type === 'planday') return renderPlanDay(m);
  if (m.type === 'look' && m.back && UI.lookBack) return _renderModal7().replace('<div class="sheet-foot row">', '<div class="sheet-foot row"><button class="btn" data-act="lookBack">‹ Volver a las opciones</button>');
  return _renderModal7();
};
// Un solo outfit "para hoy": al elegir otro, el anterior (si aún no se usó) deja de estar elegido.
const _choose7 = ACT.choose;
ACT.choose = (el, e) => {
  const w = ws(); const key = el.dataset.key;
  const prev = w.wearLogs.filter((l) => l.ownerId === w.activeProfileId && l.date === TODAY && l.status === 'elegido' && l.key !== key);
  prev.forEach((l) => { l.status = 'descartado'; });
  _choose7(el, e);
  if (prev.length) toast('Cambiaste tu elección de hoy. Cuando lo uses, confirma con “Sí, lo usé”.');
};
