/* =====================================================================
   RELISTO 3: cartas que se voltean, códigos por prenda, agrupación,
   perfil de estilo con paleta y visagismo, figura ilustrada,
   "Ver outfit completo", lavado rápido y etiquetas QR.
   ===================================================================== */

/* ---------- Armario: cartas, grupos y lavado ---------- */
function siblingsOf(item) { return ownedItems(ws(), item.ownerId).filter((i) => !isGone(i) && i.subtype === item.subtype && norm(i.color) === norm(item.color)); }
function itemCard(i, st) {
  const sib = siblingsOf(i); const idx = sib.findIndex((x) => x.id === i.id);
  return '<div class="item-card' + (isGone(i) ? ' gone' : '') + '" data-act="openItem" data-item="' + i.id + '">' + thumb(i) +
    '<button type="button" class="item-open" data-act="openItem" data-item="' + i.id + '"><span class="row between" style="flex-wrap:nowrap;gap:6px"><span class="name">' + esc(i.name) + '</span><span class="code">' + esc(i.code || '') + '</span></span>' +
    '<span class="row" style="gap:4px">' + availBadge(i.availability) + (sib.length > 1 ? '<span class="chip info" style="padding:1px 7px;font-size:11px">' + (idx + 1) + ' de ' + sib.length + '</span>' : '') + '</span>' +
    '<span class="meta">' + (st.lastUsed ? 'Último uso ' + relDays(daysBetween(st.lastUsed, TODAY)) : 'Sin usos registrados') + ' · <span class="num">' + st.wearCount + '</span> usos</span></button></div>';
}
function renderItemGroups(list) {
  const groups = new Map();
  list.forEach((x) => { const k = x.i.category + '|' + x.i.subtype + '|' + norm(x.i.color); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
  const byCat = {};
  groups.forEach((arr, k) => { const cat = k.split('|')[0]; (byCat[cat] = byCat[cat] || []).push(arr); });
  return Object.keys(CATEGORIES).concat(Object.keys(byCat).filter((c) => !CATEGORIES[c])).filter((c) => byCat[c]).map((cat) => {
    const rows = byCat[cat].sort((a, b) => b.length - a.length || a[0].i.subtype.localeCompare(b[0].i.subtype, 'es'));
    return '<section class="stack tight"><div class="row between"><h3 class="serif" style="font-size:21px">' + esc(CATEGORIES[cat] || cat) + '</h3><span class="tiny muted">' + plural(rows.reduce((a, r) => a + r.length, 0), 'prenda', 'prendas') + '</span></div>' +
      rows.map((arr) => {
        const i0 = arr[0].i;
        const head = '<div class="group-head"><span class="dot" style="background:' + (i0.photoHex || colorHex(i0.color)) + '"></span><b>' + esc(cap1(i0.subtype)) + ' · ' + esc(i0.color) + '</b>' + (arr.length > 1 ? '<span class="chip info">×' + arr.length + '</span><span class="tiny muted">Distínguelas por su código y foto</span>' : '') + '</div>';
        return '<div class="group">' + head + '<div class="chip-scroll group-row">' + arr.map(({ i, st }) => itemCard(i, st)).join('') + '</div></div>';
      }).join('') + '</section>';
  }).join('');
}
function washBar(all) {
  const dirty = all.filter((i) => ['por lavar', 'en lavandería'].includes(i.availability));
  if (!dirty.length) return '';
  return '<div class="wash-bar"><span class="small"><b class="num">' + dirty.length + '</b> ' + (dirty.length === 1 ? 'prenda por lavar' : 'prendas por lavar') + ': ' + esc(dirty.slice(0, 3).map((i) => i.name).join(', ')) + (dirty.length > 3 ? '…' : '') + '</span><button type="button" class="btn sm" data-act="washAll">Ya las lavé</button></div>';
}
const _todayBanner = todayBanner;
todayBanner = function () { // eslint-disable-line no-func-assign
  const html = _todayBanner(); if (!html) return html;
  const w = ws(); const l = w.wearLogs.filter((x) => x.ownerId === w.activeProfileId && x.date === TODAY && x.status === 'usado').pop();
  if (!l || html.indexOf('today-banner done') < 0) return html;
  const clothes = l.snapshot.items.map((s) => w.items.find((i) => i.id === s.id)).filter((i) => i && !isGone(i) && ['top', 'bottom', 'full', 'layer'].includes(roleOf(i)) && ['disponible', 'por lavar'].includes(i.availability));
  if (!clothes.length) return html;
  const row = '<div class="wash-row"><span class="tiny">¿Algo va a lavar?</span>' + clothes.map((i) => '<button type="button" class="chip btnchip" data-act="washToggle" data-item="' + i.id + '" aria-pressed="' + (i.availability === 'por lavar') + '">' + esc(i.name) + '</button>').join('') + '</div>';
  return html.slice(0, html.lastIndexOf('</div>')) + row + '</div>';
};

/* ---------- Ficha de prenda ---------- */
function itemUrl(code) { return location.origin + location.pathname + '#p-' + code; }
renderItemView = function (m) { // eslint-disable-line no-func-assign
  const w = ws(); const i = w_item(m.itemId); if (!i) return '';
  const st = itemStats(w, i); const ds = daysSinceUse(w, i, TODAY);
  const logs = w.wearLogs.filter((l) => l.status === 'usado' && l.snapshot.items.some((s) => s.id === i.id)).sort((a, b) => b.date.localeCompare(a.date));
  const row = (k, v) => '<tr><th scope="row">' + k + '</th><td>' + v + '</td></tr>';
  const ph = photoFor(i); const sib = siblingsOf(i).filter((x) => x.id !== i.id);
  const visual = '<div class="stack tight">' + thumb(i, { cls: 'xl' }) + (ph ? '<span class="tiny muted">Toca ' + IC.camera.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"') + ' para voltear entre la ilustración y tu foto. La ilustración usa el color de tu foto.</span>' : '<span class="tiny muted">Ilustración generada por categoría, color y corte. Agrega una foto para verla al voltear la carta.</span>') + '</div>';
  const codeBlock = '<div class="code-block"><span class="eyebrow">Código de la prenda</span><b class="code-big">' + esc(i.code || '—') + '</b>' +
    (sib.length ? '<span class="small">Tienes ' + plural(sib.length + 1, 'prenda igual', 'prendas iguales') + ' (' + esc(i.subtype + ' ' + i.color) + '):</span><div class="row">' + sib.map((x) => '<button type="button" class="chip btnchip" data-act="openItem" data-item="' + x.id + '">' + esc(x.code) + ' · ' + esc(x.name) + '</button>').join('') + '</div>' : '<span class="tiny muted">Único en tu armario con este tipo y color.</span>') +
    (IS_PWA && i.code ? '<details class="more"><summary>Etiqueta QR para la percha o caja</summary><div class="label-preview">' + QR.svg(itemUrl(i.code), { label: 'Código QR de ' + i.code }) + '<span class="stack tight"><b>' + esc(i.code) + '</b><span class="small">' + esc(i.name) + '</span><span class="tiny muted">Escanéala con la cámara del celular para abrir esta prenda en RELISTO.</span></span></div><div class="row"><button class="btn sm" data-act="labelsPrint" data-one="' + i.id + '">Imprimir esta etiqueta</button></div></details>' : '') + '</div>';
  return modalWrap(i.name, '<div class="grid two"><div class="stack">' + visual + codeBlock +
    '<div class="field"><label for="iv-av">Disponibilidad</label><select class="input" id="iv-av" data-act-change="avail" data-item="' + i.id + '"' + (isGone(i) ? ' disabled' : '') + '>' + AVAILABILITY.map((a) => opt(a, i.availability)).join('') + '</select></div>' +
    '<div class="row"><button class="btn sm primary" data-act="useItem" data-item="' + i.id + '"' + (isUsable(i) ? '' : ' disabled') + '>Quiero usar esta prenda</button><button class="btn sm" data-act="itemUseToday" data-item="' + i.id + '"' + (isGone(i) ? ' disabled' : '') + '>Registrar uso hoy</button></div>' +
    '<div class="row"><button class="btn sm ghost" data-act="editItem" data-item="' + i.id + '">Editar ficha</button>' + (ph ? '<button class="btn sm ghost" data-act="reusePhoto" data-item="' + i.id + '">Usar esta foto para otra prenda</button>' : '') + '</div></div>' +
    '<div class="stack"><div class="kpis"><div class="kpi"><b class="num">' + st.wearCount + '</b><span>usos' + (i.baselineWearCount ? ' (' + i.baselineWearCount + ' anteriores' + (i.origin === 'demo' ? ', simulados' : '') + ')' : '') + '</span></div><div class="kpi"><b class="num">' + (st.lastUsed ? relDays(ds.days) : '—') + '</b><span>último uso</span></div>' + (i.price ? '<div class="kpi"><b class="num">' + (st.wearCount ? fmtPEN(Math.round(i.price / st.wearCount * 10) / 10) : '—') + '</b><span>costo por uso</span></div>' : '') + '</div>' +
    '<div class="table-wrap"><table><tbody>' + row('Código', esc(i.code || '—')) + row('Categoría', esc(CATEGORIES[i.category] || i.category) + ' · ' + esc(i.subtype)) + row('Color', '<span class="dot" style="display:inline-block;vertical-align:-1px;background:' + (i.photoHex || colorHex(i.color)) + '"></span> ' + esc(i.color) + (i.photoHex ? ' <span class="tiny muted">(tono tomado de tu foto)</span>' : '') + ' · ' + esc(i.pattern || 'liso')) +
    row('Fibra o material', matLabel(i)) + row('Tejido o acabado', esc(i.weave || '—')) + row('Corte', esc(i.cut)) + row('Talla', esc(i.size || '—') + ' ' + esc(i.sizeSystem || '')) +
    row('Formalidad', esc(['', 'casual', 'smart casual', 'business casual', 'formal'][i.formality] || i.formality)) + row('Precio', i.price ? fmtPEN(i.price) + (i.origin === 'demo' ? ' (ficticio)' : '') : '—') +
    row('Incorporada', fmtDate(i.createdAt)) + row('Último uso', st.lastUsed ? fmtDate(st.lastUsed) : 'sin usos registrados') + row('Origen de los datos', esc(i.attributeSource)) + (i.repairEstimate ? row('Reparación', 'estimado de ejemplo ' + fmtPEN(i.repairEstimate) + ', ' + i.repairReadyDays + ' días') : '') + '</tbody></table></div>' +
    '<details class="more"><summary>Excluir de revisiones de desuso</summary><div class="row" style="margin-top:6px">' + ['temporada', 'ceremonial', 'sentimental', 'trabajo', 'guardada'].map((k) => '<button class="chip btnchip" data-act="toggleExclusion" data-item="' + i.id + '" data-k="' + k + '" aria-pressed="' + !!i.exclusions[k] + '">' + k + '</button>').join('') + '</div></details>' +
    '<div class="stack tight"><span class="eyebrow">Historial de uso</span>' + (logs.length ? logs.slice(0, 6).map((l) => '<span class="small">' + fmtDate(l.date) + ' · ' + esc(l.snapshot.name) + '</span>').join('') : '<span class="small muted">Sin registros en la app.</span>') + '</div></div></div>', { eyebrow: (i.code ? i.code + ' · ' : '') + (CATEGORIES[i.category] || i.category) });
};

/* ---------- Perfil de estilo: incentivo, paleta y rostro ---------- */
function renderStyleNudge(inline) {
  const p = prof(); if (!p) return '';
  const c = styleCompleteness(p);
  if (c.percent === 100 && !inline) return '';
  const meter = '<div class="meter" role="img" aria-label="' + c.percent + ' por ciento"><i style="width:' + c.percent + '%;background:var(--accent)"></i></div>';
  if (c.percent === 100) return '<div class="card soft row between"><span class="small"><b>Tu perfil de estilo está completo.</b> Las sugerencias usan tu paleta y tu rostro.</span><button class="btn sm" data-act="styleOpen">Revisar</button></div>';
  return '<div class="style-nudge"><div class="row between" style="flex-wrap:nowrap;gap:10px"><span class="stack tight" style="min-width:0"><span class="eyebrow" style="color:inherit">Tu perfil de estilo · ' + c.percent + '%</span><b>' + (c.paletteReady ? 'Afina tus sugerencias' : 'Descubre tu paleta personal') + '</b></span>' + IC.palette.replace('<svg', '<svg class="nudge-ic"') + '</div>' + meter +
    '<span class="small">Con tu subtono, tono de piel y forma del rostro, RELISTO elige colores y cuellos que suelen armonizar contigo, y sugiere qué prenda sumaría más a tu armario.</span>' +
    '<span class="tiny">Falta: ' + esc(c.missing.slice(0, 4).join(', ')) + (c.missing.length > 4 ? '…' : '') + '</span>' +
    '<div class="row"><button class="btn sm primary" data-act="styleOpen">' + IC.spark + 'Completar en 1 minuto</button>' + (inline ? '' : '<button class="btn sm ghost" data-act="styleLater">Ahora no</button>') + '</div></div>';
}
function faceShapePicker(p) {
  return '<div class="face-grid">' + Object.entries(FACE_SHAPES).map(([k, f]) => '<button type="button" class="face-card" data-act="profSet" data-path="faceShape" data-val="' + k + '" aria-pressed="' + (p.faceShape === k) + '"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + f.path + '" fill="none" stroke="currentColor" stroke-width="5"/></svg><span>' + f.label + '</span></button>').join('') +
    '<button type="button" class="face-card" data-act="profSet" data-path="faceShape" data-val="" aria-pressed="' + !p.faceShape + '"><svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="66" text-anchor="middle" font-size="46" fill="currentColor">?</text></svg><span>No sé</span></button></div>' +
    '<span class="tiny muted">Mírate al espejo con el cabello recogido y compara el ancho de frente, pómulos y mandíbula. Es una guía, no una medida.</span>';
}
function renderPaletteCard(p) {
  const pal = personalPalette(p);
  if (!pal) return '<div class="card explore stack tight"><b>Tu paleta personal</b><span class="small">Elige tu subtono para ver los colores que suelen armonizar contigo.</span><div class="row"><button class="btn sm primary" data-act="styleOpen">' + IC.palette + 'Descubrir mi paleta</button></div></div>';
  return '<div class="card palette-card stack"><div class="row between"><span class="stack tight"><span class="eyebrow">Tu paleta personal</span><b class="serif" style="font-size:22px">Paleta ' + esc(pal.label) + '</b></span><span class="chip">Metales: ' + esc(pal.metal) + '</span></div>' +
    '<div class="pal-sw">' + pal.colors.map((c) => '<span><i style="background:' + colorHex(c) + '"></i><small>' + esc(c) + '</small></span>').join('') + '</div>' +
    (pal.contrast ? '<p class="small">' + esc(CONTRAST_TIP[pal.contrast]) + '</p>' : '') +
    (pal.face ? '<p class="small"><b>Rostro ' + esc(pal.face.label.toLowerCase()) + ':</b> ' + esc(pal.face.tip) + ' Prueba ' + esc(pal.face.necks.join(' o ')) + '; en lentes, ' + esc(pal.face.glasses) + '.</p>' : '') +
    '<p class="tiny muted">Basado en principios generales de colorimetría y visagismo, a partir de lo que declaras. Son sugerencias, no reglas: tu gusto y tu comodidad mandan.</p>' +
    '<div class="row"><button class="btn sm" data-act="goSuggest">Ver qué sumaría a mi armario</button></div></div>';
}
const _renderTodaySide = renderTodaySide;
renderTodaySide = function () { // eslint-disable-line no-func-assign
  return (UI.styleLater ? '' : renderStyleNudge(false)) + _renderTodaySide();
};

/* ---------- Asistente "Tu estilo en 1 minuto" ---------- */
const STYLE_STEPS = ['undertone', 'skin', 'face', 'hair', 'build', 'colors', 'reveal'];
function renderStyleWizard(m) {
  const p = prof(); const step = STYLE_STEPS[m.step]; const n = STYLE_STEPS.length - 1;
  const prog = '<div class="steps">' + STYLE_STEPS.slice(0, n).map((s, k) => '<span class="' + (k < m.step ? 'done' : k === m.step ? 'now' : '') + '">' + (k + 1) + '</span>').join('') + '</div>';
  const nav = (canSkip) => '<div class="sheet-foot row">' + (m.step ? '<button class="btn" data-act="styleBack">Atrás</button>' : '') + '<button class="btn primary grow-btn" data-act="styleNext">' + (m.step === n - 1 ? 'Ver mi paleta' : 'Siguiente') + '</button>' + (canSkip ? '<button class="btn ghost" data-act="styleNext">Prefiero omitir</button>' : '') + '</div>';
  let body = '';
  if (step === 'undertone') body = '<p class="small">¿Qué te favorece más: joyas doradas o plateadas? ¿Tus venas en la muñeca se ven verdosas (cálido) o azuladas (frío)?</p><div class="under-grid">' + Object.entries(PALETTES).map(([k, v]) => '<button type="button" class="under-card" data-act="profSet" data-path="undertone" data-val="' + k + '" aria-pressed="' + (p.undertone === k) + '"><span class="under-sw">' + v.colors.slice(0, 4).map((c) => '<i style="background:' + colorHex(c) + '"></i>').join('') + '</span><b>' + esc(k) + '</b><span class="tiny">' + esc(v.hint) + '</span></button>').join('') + '</div>' + nav(true);
  else if (step === 'skin') body = '<p class="small">Elige el tono más cercano al tuyo. Sirve para el contraste y para tu figura ilustrada.</p><div class="row">' + MONK.map((c, i) => '<button class="tone-swatch lg" style="background:' + c + '" data-act="setTone" data-n="' + (i + 1) + '" aria-pressed="' + (monkIndex(p) === i + 1) + '" aria-label="Tono Monk ' + (i + 1) + '"></button>').join('') + '</div><span class="tiny muted">Escala Monk (Dr. Ellis Monk, CC BY 4.0). RELISTO no infiere nada a partir de este dato.</span>' + nav(true);
  else if (step === 'face') body = faceShapePicker(p) + nav(true);
  else if (step === 'hair') body = '<div class="field"><span class="lbl">Color</span><div class="swatches">' + Object.entries(HAIR_COLORS).filter(([k]) => k !== 'otro').map(([k, hx]) => '<button type="button" class="swatch" style="background:' + hx + '" data-act="profSet" data-path="hair" data-val="' + esc(k) + '" aria-pressed="' + (p.hair === k) + '" aria-label="' + esc(k) + '" title="' + esc(k) + '"></button>').join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Estilo (para tu figura)</span><div class="chip-scroll">' + HAIR_STYLES.map((h) => '<button type="button" class="chip btnchip" data-act="figSet" data-path="hairStyle" data-val="' + h + '" aria-pressed="' + ((p.avatar || {}).hairStyle === h) + '">' + h + '</button>').join('') + '</div></div>' + nav(true);
  else if (step === 'build') body = '<div class="field"><span class="lbl">Complexión (etiqueta de interfaz, opcional)</span><div class="chip-scroll">' + ['delgada', 'media', 'atlética', 'robusta'].map((b) => '<button type="button" class="chip btnchip" data-act="profSet" data-path="build" data-val="' + b + '" aria-pressed="' + (p.build === b) + '">' + b + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Ajuste que prefieres</span><div class="chip-scroll">' + ['ceñido', 'regular', 'relajado', 'oversized'].map((b) => '<button type="button" class="chip btnchip" data-act="profSet" data-path="fit" data-val="' + b + '" aria-pressed="' + (p.fit === b) + '">' + b + '</button>').join('') + '</div></div><span class="tiny muted">No pedimos peso ni calculamos IMC.</span>' + nav(true);
  else if (step === 'colors') {
    const cols = (personalPalette(p) || { colors: [] }).colors.concat(QUICK_COLORS).filter((c, i, a) => a.indexOf(c) === i).slice(0, 22);
    body = '<p class="small">Toca los colores que más usas o te gustan.</p><div class="swatches">' + cols.map((c) => '<button type="button" class="swatch" style="background:' + colorHex(c) + '" data-act="toggleList" data-scope="prof" data-path="colors" data-val="' + esc(c) + '" aria-pressed="' + (p.colors || []).includes(c) + '" aria-label="' + esc(c) + '" title="' + esc(c) + '"></button>').join('') + '</div><span class="small muted">' + esc((p.colors || []).join(', ') || 'Ninguno elegido') + '</span>' + nav(true);
  } else {
    body = '<div class="reveal"><div class="reveal-fig">' + figureSVG(p, previewItems(), { label: 'Tu figura ilustrada' }) + '</div><div class="stack">' + renderPaletteCard(p) + '</div></div>' +
      '<div class="sheet-foot row"><button class="btn primary grow-btn" data-act="goSuggest">Ver qué sumaría a mi armario</button><button class="btn" data-act="goFigure">Ajustar mi figura</button></div>';
  }
  const titles = { undertone: 'Tu subtono', skin: 'Tu tono de piel', face: 'La forma de tu rostro', hair: 'Tu cabello', build: 'Complexión y ajuste', colors: 'Tus colores favoritos', reveal: 'Tu paleta personal' };
  return modalWrap(titles[step], (step === 'reveal' ? '' : prog) + body, { eyebrow: 'Tu estilo en 1 minuto' });
}

/* ---------- Figura ilustrada y "Ver outfit completo" ---------- */
function previewItems() {
  const w = ws(); const g = genState();
  if (g && g.slots[0]) return g.slots[0].itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean);
  const l = w.wearLogs.filter((x) => x.ownerId === w.activeProfileId && x.status === 'usado' && x.snapshot.items.length > 1).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (l) return l.snapshot.items.map((s) => w.items.find((i) => i.id === s.id)).filter(Boolean);
  const d = currentDraft();
  const r = d ? generateOutfits(w, d, prof(), genOpts(d), TODAY) : null;
  const c = r && (r.complete[0] || r.partial[0]);
  return c ? c.itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean) : [];
}
function renderFigureTab() {
  const p = prof(); const av = p.avatar || {};
  const fp = UI.figPhoto;
  return '<div class="grid two"><div class="card stack fig-card"><span class="eyebrow">Tu figura ilustrada</span><div class="fig-wrap">' + figureSVG(p, previewItems(), { label: 'Tu figura con un outfit de tu armario' }) + '</div><span class="tiny muted">Vista ilustrativa con un outfit de tu armario. No representa ajuste, tejido ni talla reales.</span></div>' +
    '<div class="stack"><div class="card stack"><div class="field"><span class="lbl">Tono de piel</span><div class="row">' + MONK.map((c, i) => '<button class="tone-swatch" style="background:' + c + '" data-act="setTone" data-n="' + (i + 1) + '" aria-pressed="' + (!av.skinHex && monkIndex(p) === i + 1) + '" aria-label="Tono Monk ' + (i + 1) + '"></button>').join('') + (av.skinHex ? '<span class="tone-swatch" style="background:' + av.skinHex + '" aria-pressed="true" title="Tomado de tu foto"></span><button class="btn sm ghost" data-act="figSet" data-path="skinHex" data-val="">Quitar tono de foto</button>' : '') + '</div></div>' +
    '<div class="field"><span class="lbl">Cabello</span><div class="swatches">' + Object.entries(HAIR_COLORS).filter(([k]) => k !== 'otro').map(([k, hx]) => '<button type="button" class="swatch" style="background:' + hx + '" data-act="profSet" data-path="hair" data-val="' + esc(k) + '" aria-pressed="' + (!av.hairHex && p.hair === k) + '" aria-label="' + esc(k) + '" title="' + esc(k) + '"></button>').join('') + (av.hairHex ? '<span class="swatch" style="background:' + av.hairHex + '" aria-pressed="true" title="Tomado de tu foto"></span>' : '') + '</div>' +
    '<div class="chip-scroll">' + HAIR_STYLES.map((h) => '<button type="button" class="chip btnchip" data-act="figSet" data-path="hairStyle" data-val="' + h + '" aria-pressed="' + (av.hairStyle === h) + '">' + h + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Complexión</span><div class="chip-scroll">' + ['delgada', 'media', 'atlética', 'robusta'].map((b) => '<button type="button" class="chip btnchip" data-act="profSet" data-path="build" data-val="' + b + '" aria-pressed="' + (p.build === b) + '">' + b + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Rostro</span>' + faceShapePicker(p) + '</div></div>' +
    '<div class="card stack"><span class="eyebrow">Desde tu foto (opcional)</span><p class="small">Sube una foto tuya y toca tu piel o tu cabello: la figura toma esos tonos. Tú eliges; RELISTO no analiza tu rostro.</p>' +
    '<div class="row"><label class="btn sm" for="fig-photo" tabindex="0">' + IC.camera + (fp ? 'Otra foto' : 'Subir mi foto') + '</label><input id="fig-photo" type="file" accept="image/*" hidden data-act-change="figPhoto">' +
    (fp ? '<div class="seg2 mini" role="group" aria-label="Qué tono elegir"><button type="button" data-act="figMode" data-val="skin" aria-pressed="' + (UI.figMode !== 'hair') + '">Piel</button><button type="button" data-act="figMode" data-val="hair" aria-pressed="' + (UI.figMode === 'hair') + '">Cabello</button></div>' : '') + '</div>' +
    (fp ? '<canvas id="fig-canvas" class="fig-canvas" data-act="figPick" aria-label="Tu foto: toca para elegir el tono de ' + (UI.figMode === 'hair' ? 'cabello' : 'piel') + '"></canvas><span class="tiny muted">Tu foto no se guarda ni se envía: se descarta al cerrar la app.</span>' : '') + '</div></div></div>';
}
function lookItems(m) {
  const w = ws();
  if (m.itemIds) return m.itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean);
  const c = findCandidate(m.key); return c ? c.itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean) : [];
}
function renderLook(m) {
  const p = prof(); const items = lookItems(m); const c = m.key ? findCandidate(m.key) : null;
  const d = currentDraft(); const comp = completeness(ws(), items.map((i) => i.id), d, c && c.template);
  const log = c ? todayLogFor(c.key) : null; const sc = styleCompleteness(p);
  const action = !c ? '' : log && log.status === 'usado' ? '<span class="badge ok">Usado hoy · registrado</span>' : log ? '<button class="btn primary grow-btn" data-act="confirmWear" data-log="' + log.id + '">' + IC.check + 'Sí, lo usé</button>' : comp.percent === 100 ? '<button class="btn primary grow-btn" data-act="choose" data-key="' + esc(c.key) + '">' + IC.check + 'Me lo pongo hoy</button>' : '';
  return modalWrap(m.title || (c ? c.name : 'Outfit completo'), '<div class="look"><div class="look-fig">' + figureSVG(p, items, { label: 'Figura ilustrada con ' + items.map((i) => i.name).join(', ') }) +
    '<span class="chip">Vista ilustrativa</span></div><div class="stack">' +
    '<div class="row between"><span class="pct' + (comp.percent < 100 ? ' partial' : '') + '"><b class="num">' + comp.percent + '% completo</b></span><span class="tiny muted">' + comp.covered + ' de ' + comp.total + ' unidades</span></div>' +
    '<div class="look-pieces">' + items.map((i) => '<div class="look-piece">' + thumb(i, { noTag: true }) + '<span class="tiny"><b>' + esc(i.name) + '</b><br><span class="code">' + esc(i.code || '') + '</span></span></div>').join('') + '</div>' +
    (c && c.tips ? '<p class="small">' + esc(c.tips.join(' ')) + '</p>' : '') +
    '<p class="tiny muted">La figura usa tu tono de piel, cabello y complexión, y el color real de cada prenda (de su ficha o de su foto). No representa ajuste, tejido ni talla.</p>' +
    (sc.percent < 100 ? '<button class="btn sm ghost" data-act="goFigure">' + IC.figure + 'Personalizar mi figura</button>' : '') +
    '<div class="sheet-foot row">' + action + (c ? '<button class="btn" data-act="swap" data-key="' + esc(c.key) + '">' + IC.swap + 'Cambiar una prenda</button>' : '') + '</div></div></div>', { eyebrow: 'Ver outfit completo' });
}

/* ---------- Etiquetas QR (app instalada) ---------- */
function renderLabels(m) {
  const items = ownedItems(ws(), ws().activeProfileId).filter((i) => !isGone(i));
  const sel = m.sel;
  return modalWrap('Etiquetas QR', '<p class="small">Imprime etiquetas con el código de cada prenda y pégalas en perchas, cajas o bolsas. Al escanearlas con la cámara se abre la prenda en RELISTO.</p>' +
    '<div class="row"><button class="btn sm" data-act="labelsAll">' + (sel.size === items.length ? 'Quitar todas' : 'Elegir todas') + '</button><span class="small muted">' + sel.size + ' elegidas</span></div>' +
    '<div class="label-list">' + items.map((i) => '<label class="check label-row" for="lb-' + i.id + '"><input type="checkbox" id="lb-' + i.id + '" data-act-change="labelToggle" data-item="' + i.id + '"' + (sel.has(i.id) ? ' checked' : '') + '><span class="code">' + esc(i.code) + '</span> ' + esc(i.name) + '</label>').join('') + '</div>' +
    '<p class="tiny muted">En iPhone, la app instalada guarda sus datos aparte de Safari: si al escanear se abre Safari, busca el código en tu armario.</p>' +
    '<div class="sheet-foot row"><button class="btn primary grow-btn" data-act="labelsPrint"' + (sel.size ? '' : ' disabled') + '>Imprimir ' + plural(sel.size, 'etiqueta', 'etiquetas') + '</button></div>', { eyebrow: 'Tu armario' });
}
function printLabels(items) {
  let root = document.getElementById('print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = '<div class="labels-sheet">' + items.map((i) => '<div class="print-label">' + QR.svg(itemUrl(i.code)) + '<div><b>' + esc(i.code) + '</b><span>' + esc(i.name) + '</span><small>RELISTO</small></div></div>').join('') + '</div>';
  setTimeout(() => { try { window.print(); } catch (e) { toast('No se pudo abrir la impresión en este navegador.'); } }, 50);
}

/* ---------- Enlace directo a una prenda (#p-CÓDIGO) ---------- */
function handleItemHash() {
  const mt = String(location.hash || '').match(/^#p-([A-Z]{3}-\d{3})$/);
  if (!mt) return;
  if (IS_PWA && UI.auth) { UI.pendingCode = mt[1]; return; }
  openByCode(mt[1]);
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* */ }
}
function openByCode(code) {
  const w = ws(); if (!w) return false;
  const it = w.items.find((i) => i.code === code && i.ownerId === w.activeProfileId);
  if (!it) { toast('No encontramos la prenda ' + code + ' en este armario.'); return false; }
  UI.view = 'armario'; openModal({ type: 'itemView', itemId: it.id }); return true;
}
window.addEventListener('hashchange', handleItemHash);

/* ---------- Render: lienzo de la foto de referencia ---------- */
const _render6 = render;
render = function () { // eslint-disable-line no-func-assign
  _render6();
  const cv = document.getElementById('fig-canvas');
  if (cv && UI.figPhoto && UI.figPhoto.img) {
    const img = UI.figPhoto.img; const W = Math.min(520, cv.parentElement.clientWidth - 4); const scale = W / img.width;
    cv.width = W; cv.height = Math.round(img.height * scale);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  }
  if (UI.pendingCode && !UI.auth && ws()) { const c = UI.pendingCode; UI.pendingCode = null; setTimeout(() => openByCode(c), 0); }
};

/* ---------- Acciones ---------- */
Object.assign(ACT, {
  flip: (el, e) => { e.stopPropagation(); const k = el.dataset.key; if (UI.flipped.has(k)) UI.flipped.delete(k); else UI.flipped.add(k); const card = el.closest('.flip'); if (card) { card.classList.toggle('flipped'); el.setAttribute('aria-pressed', String(UI.flipped.has(k))); const tag = card.querySelector('.tag'); if (tag) tag.textContent = UI.flipped.has(k) ? 'Tu foto' : 'Ilustración'; el.innerHTML = UI.flipped.has(k) ? IC.spark : IC.camera; } },
  closetMode: (el) => { UI.closet.mode = el.dataset.val; render(); },
  lookOpen: (el) => openModal({ type: 'look', key: el.dataset.key }),
  lookSaved: (el) => { const s = ws().saved.find((x) => x.id === el.dataset.id); if (s) openModal({ type: 'look', itemIds: s.itemIds, title: s.name }); },
  styleOpen: () => openModal({ type: 'style', step: 0 }),
  styleNext: () => { UI.modal.step = Math.min(STYLE_STEPS.length - 1, UI.modal.step + 1); if (STYLE_STEPS[UI.modal.step] === 'reveal') { celebrate('Tu paleta'); } render(); const md = document.querySelector('.modal'); if (md) md.scrollTop = 0; },
  styleBack: () => { UI.modal.step = Math.max(0, UI.modal.step - 1); render(); },
  styleLater: () => { UI.styleLater = true; render(); },
  goSuggest: () => { UI.modal = null; UI.view = 'plan'; UI.plan.tab = 'faltantes'; render(); setTimeout(() => { const h = Array.from(document.querySelectorAll('h2')).find((x) => /Lo que suma/.test(x.textContent)); if (h) h.scrollIntoView({ block: 'start' }); }, 0); },
  goFigure: () => { UI.modal = null; UI.view = 'perfil'; UI.profTab = 'figura'; render(); window.scrollTo(0, 0); },
  profSet: (el) => { const p = prof(); const k = el.dataset.path; const v = el.dataset.val; p[k] = p[k] === v && k !== 'undertone' ? (k === 'faceShape' ? '' : p[k]) : v; if (k === 'hair') { p.avatar = Object.assign({}, p.avatar, { hairHex: null }); } commit(); },
  figSet: (el) => { const p = prof(); p.avatar = Object.assign({}, p.avatar); p.avatar[el.dataset.path] = el.dataset.val || null; commit(); },
  figMode: (el) => { UI.figMode = el.dataset.val; render(); },
  figPick: (el, e) => {
    const r = el.getBoundingClientRect(); const x = Math.round((e.clientX - r.left) * (el.width / r.width)); const y = Math.round((e.clientY - r.top) * (el.height / r.height));
    const ctx = el.getContext('2d'); let d; try { d = ctx.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data; } catch (er) { return; }
    let R = 0, G = 0, B = 0, n = 0; for (let k = 0; k < d.length; k += 4) { R += d[k]; G += d[k + 1]; B += d[k + 2]; n++; }
    const hex = '#' + [R / n, G / n, B / n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const p = prof(); p.avatar = Object.assign({}, p.avatar);
    if (UI.figMode === 'hair') { p.avatar.hairHex = hex; if (!p.avatar.hairStyle) p.avatar.hairStyle = 'medio'; toast('Color de cabello tomado de tu foto.'); } else { p.avatar.skinHex = hex; toast('Tono de piel tomado de tu foto.'); }
    commit();
  },
  washToggle: (el) => { const i = w_item(el.dataset.item); if (!i) return; i.availability = i.availability === 'por lavar' ? 'disponible' : 'por lavar'; toast(i.availability === 'por lavar' ? i.name + ': por lavar. No aparecerá en sugerencias hasta que la laves.' : i.name + ': disponible.'); commit(); },
  washAll: () => { const w = ws(); const dirty = ownedItems(w, w.activeProfileId).filter((i) => ['por lavar', 'en lavandería'].includes(i.availability)); dirty.forEach((i) => { i.availability = 'disponible'; }); celebrate(null); toast(plural(dirty.length, 'prenda vuelve', 'prendas vuelven') + ' a estar disponibles.'); commit(); },
  labelsOpen: () => openModal({ type: 'labels', sel: new Set(ownedItems(ws(), ws().activeProfileId).filter((i) => !isGone(i)).map((i) => i.id)) }),
  labelsAll: () => { const m = UI.modal; const all = ownedItems(ws(), ws().activeProfileId).filter((i) => !isGone(i)).map((i) => i.id); m.sel = m.sel.size === all.length ? new Set() : new Set(all); render(); },
  labelsPrint: (el) => { const w = ws(); const ids = el.dataset.one ? [el.dataset.one] : Array.from(UI.modal.sel); printLabels(ids.map((id) => w.items.find((i) => i.id === id)).filter((i) => i && i.code)); }
});
Object.assign(CHG, {
  labelToggle: (el) => { const s = UI.modal.sel; if (el.checked) s.add(el.dataset.item); else s.delete(el.dataset.item); render(); },
  figPhoto: (el) => {
    const f = el.files && el.files[0]; el.value = ''; if (!f) return;
    const img = new Image(); img.onload = () => { UI.figPhoto = { img }; UI.figMode = UI.figMode || 'skin'; render(); toast('Toca tu piel en la foto. Luego elige “Cabello” y toca tu cabello.'); };
    img.onerror = () => toast('No se pudo abrir esa imagen.'); img.src = URL.createObjectURL(f);
  }
});
const _renderModal6 = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  const m = UI.modal;
  if (m.type === 'look') return renderLook(m);
  if (m.type === 'style') return renderStyleWizard(m);
  if (m.type === 'labels') return renderLabels(m);
  return _renderModal6();
};
