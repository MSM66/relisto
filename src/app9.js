/* =====================================================================
   PANORAMA DEL ARMARIO: segmentos excluyentes calculados con tus datos,
   valor solo con precios registrados y outfits confirmados por semana.
   Sin métricas ambientales, sin proveedores reales y sin culpa.
   ===================================================================== */
UI.health = { sel: null, week: null };
UI.closet.seg = UI.closet.seg || null;

const SEG_COPY = {
  nuevas: (n) => 'Llegaron hace menos de ' + n + ' días y aún no tienen uso: todavía es pronto para juzgarlas.',
  rotacion: (n) => 'Las usaste en los últimos ' + n + ' días. Repetir también es tener estilo.',
  ocasionales: (n, th) => 'Más de ' + n + ' días sin uso registrado, pero menos de ' + th + '. Una combinación nueva las devuelve a la rotación.',
  redescubrir: (n, th) => 'Llevan ' + th + ' días o más sin uso registrado. Pueden tener una nueva historia contigo o con otra persona.',
  ajuste: () => 'En reparación o marcadas como “no me queda bien” desde su ficha.',
  motivo: (n, th) => 'Superan ' + th + ' días, pero las excluiste de la revisión: temporada, sentimental, trabajo…'
};

function healthBar(h) {
  const sel = UI.health.sel;
  const segs = HEALTH_SEGS.map((s, k) => Object.assign({ slot: k + 1, def: s }, h.segs[s.id])).filter((s) => s.count);
  const bar = '<div class="hbar" role="group" aria-label="Distribución de ' + h.total + ' prendas activas">' + segs.map((s) =>
    '<button type="button" class="hseg s' + s.slot + (sel && sel !== s.id ? ' dim' : '') + '" style="flex-grow:' + s.count + '" data-act="healthSel" data-seg="' + s.id + '" aria-pressed="' + (sel === s.id) + '" aria-label="' + esc(s.def.label) + ': ' + s.count + ' de ' + h.total + ' prendas (' + s.pct + '%)">' +
    '<span class="hb-tip" role="presentation"><b>' + esc(s.def.label) + '</b> ' + s.count + ' · ' + s.pct + '%</span></button>').join('') + '</div>';
  const legend = '<div class="hlegend">' + segs.map((s) => '<button type="button" class="hleg' + (sel === s.id ? ' on' : '') + '" data-act="healthSel" data-seg="' + s.id + '"><i class="sw s' + s.slot + '"></i>' + esc(s.def.short) + ' <b class="num">' + s.count + '</b></button>').join('') + '</div>';
  const cur = sel && h.segs[sel] && h.segs[sel].count ? h.segs[sel] : null;
  const readout = '<p class="small hread" aria-live="polite">' + (cur ? '<b>' + esc(HEALTH_SEGS.find((x) => x.id === sel).label) + ':</b> ' + plural(cur.count, 'prenda', 'prendas') + ' de ' + h.total + ' (' + cur.pct + '%)' + (cur.priced ? ' · ' + fmtPEN(cur.value) + ' registrados' : '') + '.' : 'Toca una franja para ver su detalle.') + '</p>';
  return bar + legend + readout;
}

function segCard(h, s, slot) {
  const seg = h.segs[s.id]; const n = HEALTH_WINDOW; const th = h.threshold;
  const usable = seg.items.filter((x) => isUsable(x.item));
  let value = '';
  if (seg.priced) value = '<span class="small"><b class="num">' + fmtPEN(seg.value) + '</b> ' + (s.id === 'redescubrir' || s.id === 'ocasionales' ? 'esperando una nueva combinación' : 'en precios registrados') + (seg.priced < seg.count ? ' (' + seg.priced + ' de ' + seg.count + ' con precio)' : '') + '</span>';
  const thumbs = '<div class="hthumbs">' + seg.items.slice(0, 4).map((x) => '<button type="button" class="hthumb" data-act="openItem" data-item="' + x.item.id + '" aria-label="Abrir ' + esc(x.item.name) + '">' + thumb(x.item, { noTag: true, noFlip: true }) + '</button>').join('') + (seg.count > 4 ? '<span class="hmore num">+' + (seg.count - 4) + '</span>' : '') + '</div>';
  let act = '';
  if (s.id === 'nuevas' && usable.length) act = '<button class="btn sm primary" data-act="useItem" data-item="' + usable[usable.length - 1].item.id + '">Estrenar en un outfit</button>';
  if (s.id === 'ocasionales' && usable.length) act = '<button class="btn sm primary" data-act="useItem" data-item="' + usable[0].item.id + '">Darle protagonismo</button>';
  if (s.id === 'redescubrir') act = '<button class="btn sm primary" data-act="nav" data-view="circular">Revisar en Circular</button>';
  return '<article class="card stack tight hcard' + (UI.health.sel === s.id ? ' on' : '') + '" id="hc-' + s.id + '"><div class="row between" style="flex-wrap:nowrap"><span class="row" style="gap:8px;flex-wrap:nowrap;min-width:0"><i class="sw s' + slot + '"></i><b>' + esc(s.label) + '</b></span><span class="hcount"><b class="num">' + seg.count + '</b><span class="tiny muted num">' + seg.pct + '%</span></span></div>' +
    '<span class="small muted">' + esc(SEG_COPY[s.id](n, th)) + '</span>' + value + thumbs +
    '<div class="row">' + act + '<button class="btn sm" data-act="healthFilter" data-seg="' + s.id + '">Ver ' + (seg.count === 1 ? 'la prenda' : 'las ' + seg.count) + '</button></div></article>';
}

function weeklyChart(weeks) {
  const max = Math.max(1, ...weeks.map((w) => w.n)); const total = weeks.reduce((a, w) => a + w.n, 0);
  const sel = UI.health.week;
  const label = (w) => fmtDate(w.start, { day: 'numeric', month: 'short', year: undefined });
  const cols = weeks.map((w, k) => {
    const hpx = w.n ? Math.max(6, Math.round((w.n / max) * 96)) : 0; const last = k === weeks.length - 1;
    return '<button type="button" class="wcol' + (sel === k ? ' on' : '') + '" data-act="healthWeek" data-k="' + k + '" aria-label="Semana del ' + label(w) + ': ' + plural(w.n, 'outfit confirmado', 'outfits confirmados') + '">' +
      '<span class="wval num' + (last || sel === k || w.n === max && w.n ? '' : ' quiet') + '">' + w.n + '</span><span class="wbar" style="height:' + hpx + 'px"></span>' +
      '<span class="wlab' + ((weeks.length - 1 - k) % 2 ? ' alt' : '') + '">' + (last ? 'Esta sem.' : label(w)) + '</span><span class="hb-tip" role="presentation">' + label(w) + '–' + fmtDate(w.end, { day: 'numeric', month: 'short', year: undefined }) + ': <b>' + w.n + '</b></span></button>';
  }).join('');
  const cur = sel !== null && weeks[sel] ? weeks[sel] : null;
  const table = '<details class="more"><summary>Ver como tabla</summary><div class="table-wrap"><table><thead><tr><th scope="col">Semana</th><th scope="col">Outfits confirmados</th></tr></thead><tbody>' + weeks.map((w) => '<tr><td>' + label(w) + ' – ' + fmtDate(w.end, { day: 'numeric', month: 'short', year: undefined }) + '</td><td class="num">' + w.n + '</td></tr>').join('') + '</tbody></table></div></details>';
  return '<div class="card stack"><div class="row between"><span class="eyebrow">Outfits confirmados por semana</span><span class="tiny muted num">' + total + ' en 8 semanas</span></div>' +
    (total ? '<div class="wchart">' + cols + '</div><p class="small hread" aria-live="polite">' + (cur ? 'Semana del ' + label(cur) + ' al ' + fmtDate(cur.end, { day: 'numeric', month: 'short', year: undefined }) + ': <b>' + plural(cur.n, 'outfit confirmado', 'outfits confirmados') + '</b>.' : 'Solo cuenta “Sí, lo usé”. Toca una semana para ver su detalle.') + '</p>' + table
      : '<p class="small muted">Aún no hay outfits confirmados en las últimas 8 semanas. Cuando toques “Sí, lo usé”, aparecerán aquí.</p>') + '</div>';
}

function renderPanorama() {
  const w = ws(); const p = prof(); const th = currentThreshold();
  const h = closetHealth(w, p.id, TODAY, th);
  if (!h.total) return emptyState('Aún no hay panorama', 'Agrega algunas prendas y confirma tus outfits: aquí verás cuáles están en rotación y cuáles puedes redescubrir.', '<button class="btn primary" data-act="addItem">' + IC.camera + 'Agregar prenda</button>');
  const demo = isDemo() ? ' <span class="chip sim">Simulado</span>' : '';
  const tiles = '<div class="kpis k2"><div class="kpi"><b class="num">' + h.total + '</b><span>prendas activas' + (h.gone ? ' · ' + h.gone + ' ya circularon' : '') + '</span></div>' +
    '<div class="kpi"><b class="num">' + h.segs.rotacion.pct + '%</b><span>en rotación (últimos ' + HEALTH_WINDOW + ' días)</span></div>' +
    (h.priced ? '<div class="kpi"><b class="num">' + fmtPEN(h.value) + '</b><span>valor registrado' + (h.priced < h.total ? ' (' + h.priced + ' de ' + h.total + ' con precio)' : '') + '</span></div>' : '') +
    (h.avgCpu !== null ? '<div class="kpi"><b class="num">' + fmtPEN(Math.round(h.avgCpu * 10) / 10) + '</b><span>costo promedio por uso</span></div>' : '') + '</div>';
  const zero = HEALTH_SEGS.filter((s) => !h.segs[s.id].count);
  const cards = '<div class="grid two">' + HEALTH_SEGS.map((s, k) => h.segs[s.id].count ? segCard(h, s, k + 1) : '').join('') + '</div>' +
    (zero.length ? '<p class="tiny muted">Sin prendas ahora en: ' + esc(zero.map((s) => s.label).join(', ')) + '.</p>' : '');
  const top = h.top.length ? '<div class="card stack tight" style="align-content:start"><span class="eyebrow">Tus infaltables</span><div class="stack tight">' + h.top.map((x) => '<button type="button" class="hrow" data-act="openItem" data-item="' + x.item.id + '"><span class="hrow-th">' + thumb(x.item, { noTag: true, noFlip: true }) + '</span><span class="stack tight" style="min-width:0"><b class="small">' + esc(x.item.name) + '</b><span class="tiny muted">' + plural(x.uses, 'uso', 'usos') + (x.item.price ? ' · ' + fmtPEN(Math.round(x.item.price / x.uses * 10) / 10) + ' por uso' : '') + '</span></span></button>').join('') + '</div></div>' : '';
  return '<div class="stack">' +
    '<div class="card stack"><div class="row between"><span class="eyebrow">Salud de tu armario' + demo + '</span><button class="btn sm ghost" data-act="nav" data-view="circular">Umbral: ' + th + ' días</button></div>' + tiles + healthBar(h) + '</div>' +
    cards + '<div class="grid two">' + weeklyChart(weeklyWear(w, p.id, TODAY, 8)) + top + '</div>' +
    '<p class="tiny muted">Cada prenda activa está en un solo grupo. Los días se cuentan desde el último uso confirmado o, si nunca se registró, desde que la agregaste. El valor usa solo precios que registraste' + (isDemo() ? ' (en la demo son ficticios)' : '') + '; el costo por uso incluye los usos anteriores que indicaste. No calculamos agua, CO₂ ni ahorro: no hay una metodología verificable para hacerlo aquí.</p></div>';
}

/* ---------- Pestaña nueva en Mi armario ---------- */
const _renderCloset9 = renderCloset;
renderCloset = function () { // eslint-disable-line no-func-assign
  if (UI.closet.tab !== 'panorama') return _renderCloset9().replace('<button role="tab" type="button" data-act="closetTab" data-tab="guardados"', '<button role="tab" type="button" data-act="closetTab" data-tab="panorama" aria-selected="false">Panorama</button><button role="tab" type="button" data-act="closetTab" data-tab="guardados"');
  const head = sectionTitle('Mi armario', '<button class="btn primary desk-only" data-act="addItem">' + IC.plus + 'Agregar prenda</button>', 'Prendas, accesorios y outfits');
  const tabs = '<div class="tabs" role="tablist">' + [['prendas', 'Prendas'], ['panorama', 'Panorama'], ['guardados', 'Outfits guardados'], ['historial', 'Historial']].map(([id, l]) => '<button role="tab" type="button" data-act="closetTab" data-tab="' + id + '" aria-selected="' + (id === 'panorama') + '">' + l + '</button>').join('') + '</div>';
  return head + tabs + renderPanorama();
};

/* ---------- Filtro por grupo en la lista de prendas ---------- */
const _renderItems9 = renderItems;
renderItems = function () { // eslint-disable-line no-func-assign
  const c = UI.closet;
  if (!c.seg) return _renderItems9();
  const w = ws(); const th = currentThreshold();
  const keep = new Set(ownedItems(w, prof().id).filter((i) => healthSegment(w, i, TODAY, th) === c.seg).map((i) => i.id));
  const orig = w.items;
  w.items = orig.filter((i) => keep.has(i.id) || i.ownerId !== prof().id);
  let html;
  try { html = _renderItems9(); } finally { w.items = orig; }
  const k = HEALTH_SEGS.findIndex((s) => s.id === c.seg);
  const chip = '<div class="seg-filter"><i class="sw s' + (k + 1) + '"></i><span class="small">Grupo: <b>' + esc(HEALTH_SEGS[k].label) + '</b> · ' + keep.size + '</span><button type="button" class="btn sm ghost" data-act="healthClear">Quitar filtro</button><button type="button" class="btn sm ghost" data-act="closetTab" data-tab="panorama">Volver al panorama</button></div>';
  return chip + html;
};

/* ---------- Acceso desde Hoy ---------- */
const _renderTodaySide9 = renderTodaySide;
renderTodaySide = function () { // eslint-disable-line no-func-assign
  return _renderTodaySide9().replace('<p class="small muted">Repetir también es tener estilo. Antes de comprar, descubre otra combinación.</p></div>', '<p class="small muted">Repetir también es tener estilo. Antes de comprar, descubre otra combinación.</p><div class="row"><button class="btn sm" data-act="healthOpen">Ver panorama del armario</button></div></div>');
};

Object.assign(ACT, {
  healthSel: (el) => { UI.health.sel = UI.health.sel === el.dataset.seg ? null : el.dataset.seg; render(); },
  healthWeek: (el) => { const k = Number(el.dataset.k); UI.health.week = UI.health.week === k ? null : k; render(); },
  healthFilter: (el) => { UI.closet.seg = el.dataset.seg; UI.closet.tab = 'prendas'; UI.closet.cat = 'todas'; UI.closet.avail = 'activas'; UI.closet.q = ''; UI.view = 'armario'; render(); window.scrollTo(0, 0); },
  healthClear: () => { UI.closet.seg = null; render(); },
  healthOpen: () => { UI.view = 'armario'; UI.closet.tab = 'panorama'; UI.modal = null; render(); window.scrollTo(0, 0); },
  toggleFit: (el) => { const i = w_item(el.dataset.item); if (!i) return; i.fitIssue = !i.fitIssue; i.updatedAt = TODAY; commit(); toast(i.fitIssue ? 'Marcada: necesita ajuste.' : 'Listo: ya te queda bien.'); }
});
const _closetTab9 = ACT.closetTab;
ACT.closetTab = (el) => { if (el.dataset.tab !== 'prendas') UI.closet.seg = null; _closetTab9(el); };

/* ---------- “No me queda bien” en la ficha ---------- */
const _renderItemView9 = renderItemView;
renderItemView = function (m) { // eslint-disable-line no-func-assign
  const html = _renderItemView9(m); const i = w_item(m.itemId); if (!i || isGone(i)) return html;
  const fit = '<div class="row"><button type="button" class="chip btnchip" data-act="toggleFit" data-item="' + i.id + '" aria-pressed="' + !!i.fitIssue + '">' + (i.fitIssue ? IC.check : '') + 'No me queda bien: necesita ajuste</button></div>';
  return html.replace('<div class="row"><button class="btn sm primary" data-act="useItem"', fit + '<div class="row"><button class="btn sm primary" data-act="useItem"');
};
