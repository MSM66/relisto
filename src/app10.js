/* =====================================================================
   VITRINA “QUE LO SEPAN”: publicar, explorar cerca, ofertar, acordar,
   confirmar la entrega y opinar. En la demo todo es Simulado; en la app
   instalada la vitrina se comparte entre las cuentas de este celular.
   ===================================================================== */
UI.circ.tab = UI.circ.tab || 'revisar';
UI.mk = { sub: 'explorar', cat: 'todas', near: false, sort: 'parati', amt: {}, counter: {}, rev: {}, priceEdit: {} };
let MKDEV = mkNew();
const MKPH = {};

function mkStore() {
  const w = ws();
  if (isDemo()) { if (!w.market) { w.market = seedDemoMarket(w, w.referenceDate || TODAY); scheduleSave(); } return w.market; }
  if (IS_PWA) return MKDEV;
  if (!w.market) w.market = mkNew();
  return w.market;
}
function mkSave() {
  if (IS_PWA && !isDemo()) { LOCAL.set('market', MKDEV).catch(() => toast('No se pudo guardar la vitrina en el teléfono.')); render(); }
  else commit();
}
function mkMe() {
  const p = prof() || {}; const d = (p.districts || []).find((x) => DISTRICT_LL[x]) || UI.mk.district || '';
  if (isDemo()) return { id: 'demo:' + p.id, name: p.name, district: UI.mk.district || d };
  if (IS_PWA && AUTH.acct) return { id: AUTH.acct.id, name: AUTH.acct.name || p.name || 'Tú', district: UI.mk.district || d };
  return { id: 'yo', name: p.name || 'Tú', district: UI.mk.district || d };
}
const mkPseudo = (l) => Object.assign({ id: 'MK-' + l.id, mkPhoto: l.id, availability: 'disponible', ownerId: 'mk' }, l.snap);
const _photoFor10 = photoFor;
photoFor = function (item) { // eslint-disable-line no-func-assign
  if (item && item.mkPhoto) return MKPH[item.mkPhoto] || null;
  return _photoFor10(item);
};
async function mkLoadDevice() {
  try {
    const m = await LOCAL.get('market'); if (m && Array.isArray(m.listings)) MKDEV = m;
    const rows = await LOCAL.photoRange('mk:');
    rows.forEach(({ key, val }) => { if (!val || !val.buf) return; const blob = new Blob([val.buf], { type: val.type || 'image/jpeg' }); MKPH[key.slice(3)] = { url: URL.createObjectURL(blob), file: blob, originalUrl: null, cropped: false }; });
  } catch (e) { /* sin vitrina guardada */ }
}
if (IS_PWA) mkLoadDevice().then(() => { try { render(); } catch (e) { /* aún iniciando */ } });

/* Cuando una venta se concreta, la prenda pasa a “vendida” en el armario de quien vendió. */
function mkSync() {
  const M = mkStore(); const me = mkMe(); const w = ws(); let changed = false;
  M.listings.filter((l) => (l.sellerId === me.id || (isDemo() && String(l.sellerId).startsWith('demo:'))) && l.status === 'vendida' && !l.sellerSynced).forEach((l) => {
    l.sellerSynced = true; changed = true;
    const it = w.items.find((i) => i.id === l.itemId && (!isDemo() || 'demo:' + i.ownerId === l.sellerId));
    if (it && !isGone(it)) {
      it.availability = 'vendida'; it.updatedAt = TODAY;
      w.circular.push({ id: 'CV' + l.id, ownerId: it.ownerId, itemId: it.id, kind: 'venta', status: 'vendida', destination: 'Vitrina RELISTO · ' + (l.buyerName || 'comprador') + ' · ' + fmtPEN(l.soldPrice), createdAt: TODAY, origin: isDemo() ? 'demo' : 'real' });
    }
  });
  if (changed) { scheduleSave(); if (IS_PWA && !isDemo()) LOCAL.set('market', MKDEV).catch(() => {}); }
}

/* ---------- Piezas visuales ---------- */
function starsHTML(avg, count) {
  if (!count) return '<span class="tiny muted">Sin opiniones aún</span>';
  const full = Math.round(avg);
  return '<span class="stars" aria-label="' + avg + ' de 5 estrellas, ' + plural(count, 'opinión', 'opiniones') + '"><span aria-hidden="true">' + '★'.repeat(full) + '<span class="off">' + '★'.repeat(5 - full) + '</span></span> <b class="num">' + String(avg).replace('.', ',') + '</b> <span class="tiny muted">(' + count + ')</span></span>';
}
function mkCard(r, me) {
  const l = r.listing;
  return '<article class="mk-card"><button type="button" class="mk-open" data-act="mkOpen" data-id="' + l.id + '" aria-label="Ver ' + esc(l.snap.name) + ', ' + fmtPEN(l.price) + '">' + thumb(mkPseudo(l), { noTag: true, noFlip: true }) + '</button>' +
    '<div class="mk-body"><div class="mk-top"><b class="mk-price num">' + fmtPEN(l.price) + '</b>' + (l.acceptOffers ? '<span class="tiny muted">acepta ofertas</span>' : '') + '</div>' +
    '<span class="mk-name">' + esc(l.snap.name) + '</span><span class="tiny muted">' + esc(nearLabel(me.district, l.district)) + (l.snap.size ? ' · talla ' + esc(l.snap.size) : '') + '</span>' +
    (r.gap ? '<span class="chip ok tiny-chip">Cubre un faltante de tu plan</span>' : r.added ? '<span class="chip explore tiny-chip">+' + r.added + ' outfits con tu armario</span>' : '') +
    '<span class="tiny">' + esc(l.sellerName) + ' · ' + starsHTML(r.rep.avg, r.rep.count) + '</span></div></article>';
}
function mkStatusBadge(s) {
  const map = { publicada: ['ok', 'Publicada'], reservada: ['warn', 'Acuerdo en curso'], vendida: ['info', 'Vendida'], retirada: ['neutral', 'Retirada'],
    pendiente: ['warn', 'Esperando respuesta'], contraoferta: ['warn', 'Contraoferta'], aceptada: ['ok', 'Aceptada'], rechazada: ['neutral', 'No aceptada'], retirada_o: ['neutral', 'Retirada'],
    'en espera': ['neutral', 'En espera'], 'no concretada': ['neutral', 'No concretada'], cancelada: ['neutral', 'Acuerdo cancelado'] };
  const [c, t] = map[s] || ['neutral', s];
  return '<span class="badge ' + c + '">' + esc(t) + '</span>';
}
const DEAL_STEPS = [['acordado', 'Acordado'], ['entregada', 'Entregada'], ['recibida', 'Recibida']];
function dealSteps(o) {
  const k = DEAL_STEPS.findIndex(([id]) => id === o.deal);
  return '<div class="steps">' + DEAL_STEPS.map(([, t], i) => '<span class="' + (i < k ? 'done' : i === k ? 'now' : '') + '">' + (i + 1) + '. ' + t + '</span>').join('') + '</div>';
}
const SAFETY = '<p class="tiny muted">RELISTO no procesa pagos. Coordinen en un lugar público o con delivery, revisen la prenda antes de pagar y no adelanten dinero a quien no conocen.</p>';

/* ---------- Vitrina ---------- */
function renderVitrina() {
  const M = mkStore(); const me = mkMe(); const w = ws(); const p = prof();
  const inbox = mkInbox(M, me.id); const s = UI.mk.sub;
  const sub = '<div class="seg2" role="group" aria-label="Vitrina">' + [['explorar', 'Explorar', 0], ['vendo', 'Vendo', inbox.sell], ['compro', 'Compro', inbox.buy]].map(([id, t, n]) =>
    '<button type="button" data-act="mkSub" data-val="' + id + '" aria-pressed="' + (s === id) + '">' + t + (n ? ' <span class="nbadge num">' + n + '</span>' : '') + '</button>').join('') + '</div>';
  const scope = isDemo() ? '<div class="note">' + '<span class="chip sim">Simulado</span> Vecinos y opiniones de ejemplo. Prueba vender tu suéter o comprar algo de Noa o Valeria.</div>'
    : IS_PWA ? '<div class="note info">Por ahora la vitrina se comparte entre las cuentas de <b>este celular</b>. Para que la vean otros celulares hace falta conectar un servidor (siguiente paso).</div>'
      : '<div class="note info">En esta vista de prueba solo ves tus publicaciones. Prueba la demo para ver la vitrina con vecinos simulados.</div>';
  const head = '<div class="card soft stack tight"><div class="row between" style="flex-wrap:nowrap;gap:10px"><span class="stack tight" style="min-width:0"><b class="serif" style="font-size:22px">Que lo sepan</b><span class="small">Publica una prenda con tu precio. Te pueden comprar u ofertar, y quien compra te deja estrellas.</span></span>' +
    '<button class="btn primary" data-act="mkPick">' + IC.plus + 'Publicar</button></div></div>';
  let body = '';
  if (s === 'explorar') {
    const dsel = '<div class="field" style="margin:0"><label for="mk-dist">Estás en</label><select class="input" id="mk-dist" data-act-change="mkDist">' + opt('', me.district, 'Elige tu distrito') + MK_DISTRICTS.map((d) => opt(d, me.district)).join('') + '</select></div>';
    const cats = ['todas'].concat(Object.keys(CATEGORIES));
    const filters = '<div class="stack tight"><div class="mk-filters">' + dsel +
      '<div class="field" style="margin:0"><label for="mk-sort">Ordenar</label><select class="input" id="mk-sort" data-act-change="mkSort">' + [['parati', 'Para ti'], ['cerca', 'Más cerca'], ['precio', 'Menor precio']].map(([v, t]) => opt(v, UI.mk.sort, t)).join('') + '</select></div></div>' +
      '<div class="chip-scroll"><button class="chip btnchip" data-act="mkNear" aria-pressed="' + UI.mk.near + '">Cerca de mí (≤ 6 km)</button>' + cats.map((k) => '<button class="chip btnchip" data-act="mkCat" data-val="' + k + '" aria-pressed="' + (UI.mk.cat === k) + '">' + esc(k === 'todas' ? 'Todo' : CATEGORIES[k]) + '</button>').join('') + '</div></div>';
    const rows = mkBrowse(M, w, p.id, me, { cat: UI.mk.cat, near: UI.mk.near && !!me.district, sort: UI.mk.sort });
    body = filters + (rows.length ? '<div class="mk-grid">' + rows.map((r) => mkCard(r, me)).join('') + '</div>'
      : '<div class="card">' + emptyState('Aún no hay prendas aquí', M.listings.some((l) => l.status === 'publicada' && l.sellerId !== me.id) ? 'Prueba quitar filtros o ampliar la distancia.' : 'Sé quien empieza: publica algo que ya no uses.', '<button class="btn primary" data-act="mkPick">Publicar una prenda</button>') + '</div>') +
      '<p class="tiny muted">“+N outfits” cuenta combinaciones nuevas con las prendas que ya tienes. La distancia es aproximada entre distritos: el costo del delivery lo acuerdan entre ustedes.</p>';
  } else if (s === 'vendo') body = renderVendo(M, me);
  else body = renderCompro(M, me);
  return '<div class="stack">' + head + scope + sub + body + '</div>';
}
function renderVendo(M, me) {
  const rep = mkReputation(M, me.id);
  const mine = M.listings.filter((l) => l.sellerId === me.id);
  const repCard = '<div class="card row between"><span class="stack tight"><span class="eyebrow">Tu reputación</span>' + starsHTML(rep.avg, rep.count) + '</span><span class="small"><b class="num">' + rep.sales + '</b> ' + (rep.sales === 1 ? 'venta' : 'ventas') + '</span></div>';
  if (!mine.length) return repCard + '<div class="card">' + emptyState('Aún no publicas nada', 'Elige una prenda que lleve tiempo sin uso y ponle precio. Seguirá en tu armario hasta que se venda.', '<button class="btn primary" data-act="mkPick">Elegir prenda</button>') + '</div>';
  const order = { reservada: 0, publicada: 1, vendida: 2, retirada: 3 };
  return repCard + '<div class="stack">' + mine.slice().sort((a, b) => order[a.status] - order[b.status] || b.updatedAt.localeCompare(a.updatedAt)).map((l) => {
    const offers = M.offers.filter((o) => o.listingId === l.id);
    const pend = offers.filter((o) => o.status === 'pendiente');
    const deal = offers.find((o) => o.id === l.dealOfferId && o.status === 'aceptada');
    const sold = l.status === 'vendida' ? offers.find((o) => o.deal === 'recibida') : null;
    const review = sold && M.reviews.find((r) => r.offerId === sold.id);
    let inner = '';
    if (l.status === 'publicada') {
      inner += pend.length ? pend.map((o) => '<div class="mk-offer"><div class="row between" style="flex-wrap:nowrap"><span class="stack tight" style="min-width:0"><b>' + esc(o.buyerName) + (o.origin === 'demo' ? ' <span class="chip sim">Simulado</span>' : '') + '</b><span class="tiny muted">' + (o.buyerDistrict ? esc(nearLabel(l.district, o.buyerDistrict)) + ' · ' : '') + fmtDate(o.createdAt) + '</span></span><span class="stack tight" style="text-align:right"><b class="num">' + fmtPEN(o.amount) + '</b><span class="tiny muted">' + (o.kind === 'compra' ? 'compra al precio' : Math.round((100 * o.amount) / l.price) + '% de tu precio') + '</span></span></div>' +
        (o.message ? '<span class="small">“' + esc(o.message) + '”</span>' : '') +
        '<div class="row"><button class="btn sm primary" data-act="mkRespond" data-id="' + o.id + '" data-a="aceptar">Aceptar ' + fmtPEN(o.amount) + '</button>' + (o.kind === 'oferta' ? '<button class="btn sm" data-act="mkCounterOpen" data-id="' + o.id + '">Contraofertar</button>' : '') + '<button class="btn sm ghost" data-act="mkRespond" data-id="' + o.id + '" data-a="rechazar">No, gracias</button></div>' +
        (UI.mk.counter[o.id] !== undefined ? '<div class="row"><label class="sr-only" for="ct-' + o.id + '">Tu contraoferta en soles</label><input class="input num" id="ct-' + o.id + '" type="number" inputmode="numeric" min="' + (o.amount + 1) + '" max="' + l.price + '" style="width:110px" value="' + esc(UI.mk.counter[o.id]) + '" data-mk-counter="' + o.id + '"><button class="btn sm primary" data-act="mkRespond" data-id="' + o.id + '" data-a="contraofertar">Enviar contraoferta</button></div>' : '') + '</div>').join('')
        : '<span class="small muted">Sin ofertas todavía.</span>';
      inner += UI.mk.priceEdit[l.id] !== undefined ? '<div class="row"><label class="sr-only" for="pe-' + l.id + '">Nuevo precio</label><input class="input num" id="pe-' + l.id + '" type="number" inputmode="numeric" min="1" style="width:110px" value="' + esc(UI.mk.priceEdit[l.id]) + '" data-mk-price="' + l.id + '"><button class="btn sm primary" data-act="mkPriceSave" data-id="' + l.id + '">Guardar precio</button></div>'
        : '<div class="row"><button class="btn sm ghost" data-act="mkPriceEdit" data-id="' + l.id + '">Cambiar precio</button><button class="btn sm ghost" data-act="mkWithdraw" data-id="' + l.id + '">Retirar de la vitrina</button></div>';
    } else if (deal) {
      inner = dealSteps(deal) + '<span class="small">Acordaste con <b>' + esc(deal.buyerName) + '</b> por <b class="num">' + fmtPEN(deal.amount) + '</b>.' + (deal.contact ? ' Coordina: <b>' + esc(deal.contact) + '</b>' : '') + '</span>' +
        '<div class="row">' + (deal.deal === 'acordado' ? '<button class="btn sm primary" data-act="mkDeal" data-id="' + deal.id + '" data-s="entregar">Ya la entregué</button>' : '<span class="small muted">Esperando que ' + esc(deal.buyerName) + ' confirme que la recibió.</span>') + '<button class="btn sm ghost" data-act="mkDeal" data-id="' + deal.id + '" data-s="cancelar">Cancelar acuerdo</button></div>';
    } else if (sold) {
      inner = '<span class="small">Vendida a <b>' + esc(sold.buyerName) + '</b> por <b class="num">' + fmtPEN(l.soldPrice) + '</b> · ' + fmtDate(l.soldAt) + '</span>' + (review ? '<div class="mk-review">' + starsHTML(review.stars, 1) + (review.tags.length ? '<span class="tiny">' + esc(review.tags.join(' · ')) + '</span>' : '') + (review.comment ? '<span class="small">“' + esc(review.comment) + '”</span>' : '') + '</div>' : '<span class="tiny muted">Aún sin opinión de quien compró.</span>');
    }
    return '<article class="card stack tight"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:flex-start"><div style="width:64px;flex:none">' + thumb(mkPseudo(l), { noTag: true, noFlip: true }) + '</div><div class="stack tight" style="min-width:0;flex:1"><div class="row between" style="flex-wrap:nowrap;gap:6px"><b>' + esc(l.snap.name) + '</b>' + mkStatusBadge(l.status) + '</div>' +
      '<span class="small"><b class="num">' + fmtPEN(l.price) + '</b> · ' + esc(l.condition) + ' · ' + esc(l.district) + '</span>' + (l.status === 'publicada' && pend.length ? '<span class="tiny"><b>' + plural(pend.length, 'oferta por responder', 'ofertas por responder') + '</b></span>' : '') + '</div></div>' + inner + '</article>';
  }).join('') + '</div>' + SAFETY;
}
function renderCompro(M, me) {
  const mine = M.offers.filter((o) => o.buyerId === me.id);
  if (!mine.length) return '<div class="card">' + emptyState('Aún no ofertas', 'En Explorar, abre una prenda y cómprala al precio o haz una oferta.', '<button class="btn" data-act="mkSub" data-val="explorar">Explorar la vitrina</button>') + '</div>';
  const rank = (o) => (o.status === 'contraoferta' || (o.status === 'aceptada' && o.deal !== 'recibida') ? 0 : o.deal === 'recibida' && !M.reviews.some((r) => r.offerId === o.id) ? 1 : o.status === 'pendiente' ? 2 : 3);
  return '<div class="stack">' + mine.slice().sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt)).map((o) => {
    const l = mkListing(M, o.listingId); if (!l) return '';
    const review = M.reviews.find((r) => r.offerId === o.id);
    let inner = '';
    if (o.status === 'pendiente') inner = '<span class="small">Ofreciste <b class="num">' + fmtPEN(o.amount) + '</b>' + (o.kind === 'compra' ? ' (precio completo)' : ' de ' + fmtPEN(l.price)) + '. Esperando a ' + esc(l.sellerName) + '.</span><div class="row"><button class="btn sm ghost" data-act="mkBuyer" data-id="' + o.id + '" data-a="retirar">Retirar oferta</button></div>';
    else if (o.status === 'contraoferta') inner = '<span class="small">' + esc(l.sellerName) + ' te propone <b class="num">' + fmtPEN(o.counter) + '</b> (ofreciste ' + fmtPEN(o.amount) + ').</span><div class="row"><button class="btn sm primary" data-act="mkBuyer" data-id="' + o.id + '" data-a="aceptar">Aceptar ' + fmtPEN(o.counter) + '</button><button class="btn sm ghost" data-act="mkBuyer" data-id="' + o.id + '" data-a="rechazar">No, gracias</button></div>';
    else if (o.status === 'aceptada' && o.deal !== 'recibida') inner = dealSteps(o) + '<span class="small">¡Trato hecho por <b class="num">' + fmtPEN(o.amount) + '</b>! ' + (l.contact ? 'Coordina con ' + esc(l.sellerName) + ': <b>' + esc(l.contact) + '</b>.' : 'Coordina la entrega con ' + esc(l.sellerName) + ' en ' + esc(l.district) + '.') + '</span>' +
      '<div class="row"><button class="btn sm primary" data-act="mkDeal" data-id="' + o.id + '" data-s="recibir">' + IC.check + 'La recibí</button><button class="btn sm ghost" data-act="mkDeal" data-id="' + o.id + '" data-s="cancelar">Cancelar acuerdo</button></div>' + SAFETY;
    else if (o.deal === 'recibida') {
      const r = UI.mk.rev[o.id] || { stars: 0, tags: [], comment: '' };
      inner = (review ? '<div class="mk-review"><span class="tiny muted">Tu opinión</span>' + starsHTML(review.stars, 1) + (review.comment ? '<span class="small">“' + esc(review.comment) + '”</span>' : '') + '</div>'
        : '<div class="stack tight mk-rate"><b class="small">¿Cómo te fue con ' + esc(l.sellerName) + '?</b><div class="row star-pick" role="group" aria-label="Estrellas">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="star-btn' + (n <= r.stars ? ' on' : '') + '" data-act="mkStar" data-id="' + o.id + '" data-n="' + n + '" aria-label="' + n + ' de 5" aria-pressed="' + (n === r.stars) + '">★</button>').join('') + '</div>' +
          '<div class="row">' + MK_REVIEW_TAGS.map((t) => '<button type="button" class="chip btnchip" data-act="mkTag" data-id="' + o.id + '" data-t="' + esc(t) + '" aria-pressed="' + r.tags.includes(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
          '<label class="sr-only" for="rc-' + o.id + '">Comentario</label><input class="input" id="rc-' + o.id + '" placeholder="Comentario (opcional)" maxlength="280" value="' + esc(r.comment) + '" data-mk-comment="' + o.id + '"><div class="row"><button class="btn sm primary" data-act="mkReview" data-id="' + o.id + '"' + (r.stars ? '' : ' disabled') + '>Enviar opinión</button></div></div>') +
        (o.addedItemId === 'historial' ? '' : o.addedItemId ? '<span class="chip ok">Ya está en tu armario</span>' : '<div class="row"><button class="btn sm" data-act="mkAddCloset" data-id="' + o.id + '">' + IC.plus + 'Agregar a mi armario</button></div>');
    } else inner = '<span class="small muted">' + (o.status === 'rechazada' ? 'No se concretó esta vez.' : o.status === 'en espera' ? 'Hay otro acuerdo en curso; si no se concreta, tu oferta vuelve a estar pendiente.' : 'Sin acción pendiente.') + '</span>';
    return '<article class="card stack tight"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:flex-start"><button type="button" class="mk-open" style="width:64px;flex:none" data-act="mkOpen" data-id="' + l.id + '" aria-label="Ver ' + esc(l.snap.name) + '">' + thumb(mkPseudo(l), { noTag: true, noFlip: true }) + '</button><div class="stack tight" style="min-width:0;flex:1"><div class="row between" style="flex-wrap:nowrap;gap:6px"><b>' + esc(l.snap.name) + '</b>' + (o.deal === 'recibida' ? '<span class="badge ok">Recibida</span>' : mkStatusBadge(o.status)) + '</div>' +
      '<span class="tiny muted">' + esc(l.sellerName) + ' · ' + esc(nearLabel(me.district, l.district)) + '</span></div></div>' + inner + '</article>';
  }).join('') + '</div>';
}

/* ---------- Hojas (modales) ---------- */
function mkEligible() {
  const w = ws(); const p = prof(); const M = mkStore(); const me = mkMe(); const th = currentThreshold();
  const rank = { redescubrir: 0, motivo: 1, ocasionales: 2, ajuste: 3, nuevas: 4, rotacion: 5 };
  return ownedItems(w, p.id).filter((i) => !isGone(i) && !mkActiveForItem(M, me.id, i.id))
    .map((i) => ({ i, seg: healthSegment(w, i, TODAY, th), d: daysSinceUse(w, i, TODAY).days })).sort((a, b) => rank[a.seg] - rank[b.seg] || b.d - a.d);
}
function renderMkPick() {
  const list = mkEligible();
  return modalWrap('¿Qué quieres que sepan?', '<p class="small muted">Arriba, las que llevan más tiempo sin uso. La prenda sigue en tu armario hasta que se venda.</p>' +
    (list.length ? '<div class="stack tight">' + list.map(({ i, seg, d }) => '<button type="button" class="swap-row" data-act="mkPublishOpen" data-item="' + i.id + '"><span class="swap-th">' + thumb(i, { noTag: true, noFlip: true }) + '</span><span class="swap-info"><b>' + esc(i.name) + '</b><span class="tiny muted">' + esc(HEALTH_SEGS.find((s) => s.id === seg).label) + ' · ' + (d ? relDays(d) : 'hoy') + (i.price ? ' · pagaste ' + fmtPEN(i.price) : '') + '</span></span></button>').join('') + '</div>'
      : emptyState('Nada para publicar', 'Todas tus prendas ya están en la vitrina o salieron del armario.', '')), { eyebrow: 'Vitrina' });
}
function renderMkPublish(m) {
  const d = m.draft; const i = w_item(d.itemId); if (!i) return '';
  const st = itemStats(ws(), i); const ph = photoFor(i);
  const ctx = (i.price ? 'Pagaste ' + fmtPEN(i.price) + (i.origin === 'demo' ? ' (ficticio)' : '') + ' · ' : '') + plural(st.wearCount, 'uso registrado', 'usos registrados');
  const delivery = Object.entries(MK_DELIVERY).map(([k, t]) => '<button type="button" class="chip btnchip" data-act="mkDraftDel" data-val="' + k + '" aria-pressed="' + d.delivery.includes(k) + '">' + esc(t) + '</button>').join('');
  const myD = ((prof() || {}).districts || []).filter((x) => DISTRICT_LL[x]);
  return modalWrap('Que lo sepan', '<div class="stack">' +
    '<div class="row" style="flex-wrap:nowrap;gap:12px;align-items:center"><div style="width:84px;flex:none">' + thumb(i, { noTag: true, noFlip: true }) + '</div><div class="stack tight" style="min-width:0"><b>' + esc(i.name) + '</b><span class="tiny muted">' + esc(i.code || '') + (i.size ? ' · talla ' + esc(i.size) : '') + '</span><span class="tiny muted">' + esc(ctx) + '</span></div></div>' +
    (ph ? '' : '<div class="note">Sin foto se muestra la ilustración. Una foto real ayuda a que vean la prenda como es: agrégala desde su ficha.</div>') +
    '<div class="field"><label for="mk-price">Tu precio de venta (S/, sin céntimos) *</label><input class="input num" id="mk-price" type="number" inputmode="numeric" step="1" min="1" max="100000" placeholder="Ej.: 60" value="' + esc(d.price ?? '') + '" data-mk-draft="price"></div>' +
    '<label class="check"><input type="checkbox"' + (d.acceptOffers ? ' checked' : '') + bindAttr('mf', 'acceptOffers') + '> Acepto ofertas (puedo responder con una contraoferta)</label>' +
    '<div class="field"><span class="lbl">Estado de la prenda</span><div class="row">' + MK_CONDITIONS.map((c) => '<button type="button" class="chip btnchip" data-act="mkDraftSet" data-k="condition" data-val="' + c + '" aria-pressed="' + (d.condition === c) + '">' + esc(c) + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="mk-pd">Distrito de entrega *</label><select class="input" id="mk-pd"' + bindAttr('mf', 'district') + '>' + opt('', d.district, 'Elige tu distrito') + (myD.length ? '<optgroup label="Tus distritos">' + myD.map((x) => opt(x, d.district)).join('') + '</optgroup><optgroup label="Todos">' : '') + MK_DISTRICTS.map((x) => opt(x, d.district)).join('') + (myD.length ? '</optgroup>' : '') + '</select><span class="tiny muted">Solo se muestra el distrito, nunca tu dirección.</span></div>' +
    '<div class="field"><span class="lbl">Entrega</span><div class="row">' + delivery + '</div></div>' +
    '<details class="more"' + (d.note || d.contact ? ' open' : '') + '><summary>Detalles y contacto (opcional)</summary><div class="stack tight" style="margin-top:8px">' +
    '<div class="field"><label for="mk-note">Nota para quien compra</label><input class="input" id="mk-note" maxlength="280" placeholder="Ej.: la usé dos veces, tiene un hilo suelto" value="' + esc(d.note || '') + '"' + bindAttr('mf', 'note') + '></div>' +
    '<div class="field"><label for="mk-contact">Cómo coordinar</label><input class="input" id="mk-contact" maxlength="80" placeholder="WhatsApp, Instagram…" value="' + esc(d.contact || '') + '"' + bindAttr('mf', 'contact') + '><span class="tiny muted">Solo lo ve la persona con quien cierres el trato.</span></div></div></details>' +
    (m.error ? '<div class="note bad">' + esc(m.error) + '</div>' : '') + SAFETY +
    '<div class="sheet-foot row"><button class="btn primary" data-act="mkPublish">' + IC.spark + 'Publicar en la vitrina</button>' + (m.fromCircular ? '<button class="btn ghost" data-act="mkSellOutside" data-item="' + i.id + '">Prefiero venderla por mi cuenta</button>' : '<button class="btn ghost" data-act="closeModal">Ahora no</button>') + '</div></div>', { eyebrow: 'Vitrina · publicar' });
}
function renderMkListing(m) {
  const M = mkStore(); const me = mkMe(); const l = mkListing(M, m.id); if (!l) return '';
  const rep = mkReputation(M, l.sellerId); const mine = l.sellerId === me.id;
  const r = mine ? null : mkBrowse({ listings: [l], offers: [], reviews: [] }, ws(), prof().id, me, {})[0];
  const myOffer = M.offers.find((o) => o.listingId === l.id && o.buyerId === me.id && ['pendiente', 'contraoferta', 'aceptada', 'en espera'].includes(o.status));
  const amt = UI.mk.amt[l.id] ?? '';
  let actions = '';
  if (mine) actions = '<div class="note info row between"><span>Es tu publicación.</span><button class="btn sm" data-act="mkGoVendo">Ver en Vendo</button></div>';
  else if (l.status !== 'publicada') actions = '<div class="note">Esta prenda ya tiene un acuerdo en curso o se vendió.</div>';
  else if (myOffer) actions = '<div class="note info row between"><span>Ya ofertaste ' + fmtPEN(myOffer.amount) + '. Estado: ' + esc(myOffer.status) + '.</span><button class="btn sm" data-act="mkGoCompro">Ver en Compro</button></div>';
  else actions = '<div class="stack tight"><button class="btn primary" data-act="mkBuy" data-id="' + l.id + '">Comprar a ' + fmtPEN(l.price) + '</button>' +
    (l.acceptOffers ? '<div class="row" style="flex-wrap:nowrap"><label class="sr-only" for="mk-amt">Tu oferta en soles</label><input class="input num" id="mk-amt" type="number" inputmode="numeric" min="1" max="' + (l.price - 1) + '" placeholder="Tu oferta (S/)" value="' + esc(amt) + '" data-mk-amt="' + l.id + '" style="flex:1;min-width:0"><button class="btn" data-act="mkMakeOffer" data-id="' + l.id + '">Ofertar</button></div>' : '<span class="tiny muted">Precio fijo: no acepta ofertas.</span>') +
    '<details class="more"><summary>Mensaje y contacto (opcional)</summary><div class="stack tight" style="margin-top:8px"><label class="sr-only" for="mk-msg">Mensaje para quien vende</label><input class="input" id="mk-msg" maxlength="200" placeholder="Ej.: ¿puedo recogerla el sábado?" value="' + esc(UI.mk.msg || '') + '" data-mk-msg="1"><label class="sr-only" for="mk-ct">Cómo coordinar</label><input class="input" id="mk-ct" maxlength="80" placeholder="Cómo coordinar: WhatsApp, Instagram…" value="' + esc(UI.mk.contact || '') + '" data-mk-ct="1"><span class="tiny muted">Tu contacto solo se comparte si aceptan tu oferta.</span></div></details></div>';
  const reviews = rep.reviews.slice(0, 3).map((x) => '<div class="mk-review">' + starsHTML(x.stars, 1) + '<span class="tiny muted">' + esc(x.fromName) + ' · compra verificada · ' + fmtDate(x.createdAt) + (x.origin === 'demo' ? ' · Simulado' : '') + '</span>' + (x.tags.length ? '<span class="tiny">' + esc(x.tags.join(' · ')) + '</span>' : '') + (x.comment ? '<span class="small">“' + esc(x.comment) + '”</span>' : '') + '</div>').join('');
  const chips = [l.condition, l.snap.size ? 'talla ' + l.snap.size : null, l.snap.material && !/no confirmado/.test(l.snap.material) ? l.snap.material : null].filter(Boolean).map((t) => '<span class="chip">' + esc(t) + '</span>').join('');
  return modalWrap(l.snap.name, '<div class="grid two"><div class="stack tight">' + thumb(mkPseudo(l), { cls: 'xl', noTag: !MKPH[l.id] }) + '</div><div class="stack">' +
    '<div class="row between"><b class="mk-price big num">' + fmtPEN(l.price) + '</b>' + (l.acceptOffers ? '<span class="chip">Acepta ofertas</span>' : '<span class="chip">Precio fijo</span>') + '</div>' +
    '<div class="row">' + chips + '</div>' +
    '<span class="small">' + IC.pin.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"') + ' ' + esc(nearLabel(me.district, l.district)) + ' · ' + esc(l.delivery.map((x) => MK_DELIVERY[x]).join(' o ')) + '</span>' +
    (l.note ? '<span class="small">“' + esc(l.note) + '”</span>' : '') +
    (r && (r.gap || r.added) ? '<div class="note ok">' + (r.gap ? 'Cubre un faltante de tu plan (' + esc(r.gap.subtype) + '). ' : '') + (r.added ? 'Con tu armario suma <b>' + plural(r.added, 'outfit nuevo', 'outfits nuevos') + '</b>.' : '') + (r.similar ? ' Ya tienes ' + plural(r.similar, 'prenda parecida', 'prendas parecidas') + '.' : '') + '</div>' : r && r.similar ? '<div class="note">Ya tienes ' + plural(r.similar, 'prenda parecida', 'prendas parecidas') + ': antes de comprar, mira si la necesitas.</div>' : '') +
    actions + (m.error ? '<div class="note bad">' + esc(m.error) + '</div>' : '') +
    '<div class="stack tight"><div class="row between"><span class="eyebrow">Vende ' + esc(l.sellerName) + (l.origin === 'demo' ? ' · Simulado' : '') + '</span>' + starsHTML(rep.avg, rep.count) + '</div><span class="tiny muted">' + plural(rep.sales, 'venta concretada', 'ventas concretadas') + '. Solo opina quien recibió una prenda.</span>' + reviews + '</div>' + SAFETY + '</div></div>', { eyebrow: 'Vitrina · publicado ' + fmtDate(l.createdAt) });
}

/* ---------- Circular con pestañas ---------- */
const _renderCircular10 = renderCircular;
renderCircular = function () { // eslint-disable-line no-func-assign
  mkSync();
  const n = mkInbox(mkStore(), mkMe().id).total;
  const tabs = '<div class="tabs" role="tablist">' + [['revisar', 'Dale más vida'], ['vitrina', 'Vitrina']].map(([id, l]) => '<button role="tab" type="button" data-act="circTab" data-tab="' + id + '" aria-selected="' + (UI.circ.tab === id) + '">' + l + (id === 'vitrina' && n ? ' <span class="nbadge num">' + n + '</span>' : '') + '</button>').join('') + '</div>';
  if (UI.circ.tab === 'vitrina') return sectionTitle('Vitrina', '', 'Circular') + tabs + renderVitrina();
  const html = _renderCircular10();
  const cut = html.indexOf('<div class="card soft stack tight">');
  return html.slice(0, cut) + tabs + html.slice(cut);
};
const _renderModal10 = renderModal;
renderModal = function () { // eslint-disable-line no-func-assign
  const m = UI.modal;
  if (m.type === 'mkPick') return renderMkPick();
  if (m.type === 'mkPublish') return renderMkPublish(m);
  if (m.type === 'mkListing') return renderMkListing(m);
  return _renderModal10();
};
/* Punto de aviso en la navegación cuando algo espera tu respuesta. */
const _render10 = render;
const mkFreshUI = () => ({ sub: 'explorar', cat: 'todas', near: false, sort: 'parati', amt: {}, counter: {}, rev: {}, priceEdit: {} });
render = function () { // eslint-disable-line no-func-assign
  if (!(IS_PWA && UI.auth)) { let who = null; try { who = mkMe().id; } catch (e) { who = null; } if (who && UI.mk.who && UI.mk.who !== who) UI.mk = mkFreshUI(); if (who) UI.mk.who = who; }
  _render10();
  if (IS_PWA && UI.auth) return;
  let n = 0; try { n = mkInbox(mkStore(), mkMe().id).total; } catch (e) { n = 0; }
  document.querySelectorAll('[data-act="nav"][data-view="circular"]').forEach((b) => { b.classList.toggle('has-dot', n > 0); if (n) b.setAttribute('aria-label', 'Circular, ' + plural(n, 'aviso', 'avisos') + ' en la vitrina'); });
};
/* Ficha de la prenda: acceso directo. */
const _renderItemView10 = renderItemView;
renderItemView = function (m) { // eslint-disable-line no-func-assign
  const html = _renderItemView10(m); const i = w_item(m.itemId); if (!i || isGone(i)) return html;
  const l = mkActiveForItem(mkStore(), mkMe().id, i.id);
  const b = l ? '<button class="btn sm" data-act="mkGoVendo">En la vitrina · ' + fmtPEN(l.price) + '</button>' : '<button class="btn sm" data-act="mkPublishOpen" data-item="' + i.id + '">' + IC.share + 'Que lo sepan</button>';
  return html.replace('<div class="row"><button class="btn sm ghost" data-act="editItem"', '<div class="row">' + b + '</div><div class="row"><button class="btn sm ghost" data-act="editItem"');
};
/* Panorama: “Por redescubrir” también puede ir a la vitrina. */
const _segCard10 = segCard;
segCard = function (h, s, slot) { // eslint-disable-line no-func-assign
  const html = _segCard10(h, s, slot);
  if (s.id !== 'redescubrir' && s.id !== 'ocasionales') return html;
  return html.replace('<button class="btn sm" data-act="healthFilter"', '<button class="btn sm" data-act="mkPick">Que lo sepan</button><button class="btn sm" data-act="healthFilter"');
};

/* ---------- Acciones ---------- */
const mkToday = () => (isDemo() ? (ws().referenceDate || TODAY) : TODAY);
function mkRun(r, ok) { if (r && r.error) { toast(r.error); return false; } if (ok) toast(ok); mkSave(); return true; }
function mkDemoReply(M, o) {
  if (!isDemo() || !o || !String(o.sellerId).startsWith('demo:') || o.sellerId === mkMe().id) return;
  const l = mkListing(M, o.listingId);
  if (o.amount >= Math.round(l.price * 0.9)) { mkRespond(M, o.id, l.sellerId, 'aceptar', null, mkToday()); o.simReply = true; toast(l.sellerName + ' aceptó tu oferta (respuesta simulada).'); }
  else { const c = Math.round((o.amount + l.price) / 2); mkRespond(M, o.id, l.sellerId, 'contraofertar', c > o.amount ? c : l.price, mkToday()); o.simReply = true; toast(l.sellerName + ' te contraofertó (respuesta simulada).'); }
}
Object.assign(ACT, {
  circTab: (el) => { UI.circ.tab = el.dataset.tab; render(); },
  mkSub: (el) => { UI.mk.sub = el.dataset.val; UI.circ.tab = 'vitrina'; UI.view = 'circular'; UI.modal = null; render(); },
  mkGoVendo: () => { UI.mk.sub = 'vendo'; UI.circ.tab = 'vitrina'; UI.view = 'circular'; UI.modal = null; render(); window.scrollTo(0, 0); },
  mkGoCompro: () => { UI.mk.sub = 'compro'; UI.circ.tab = 'vitrina'; UI.view = 'circular'; UI.modal = null; render(); window.scrollTo(0, 0); },
  mkCat: (el) => { UI.mk.cat = el.dataset.val; render(); },
  mkNear: () => { if (!mkMe().district) { toast('Primero elige tu distrito.'); return; } UI.mk.near = !UI.mk.near; render(); },
  mkPick: () => openModal({ type: 'mkPick' }),
  mkOpen: (el) => { UI.mk.amt = {}; openModal({ type: 'mkListing', id: el.dataset.id }); },
  mkPublishOpen: (el) => {
    const p = prof() || {}; const d0 = (p.districts || []).find((x) => DISTRICT_LL[x]) || mkMe().district || '';
    openModal({ type: 'mkPublish', fromCircular: !!el.dataset.circ, draft: { itemId: el.dataset.item, price: null, acceptOffers: true, condition: 'buen estado', district: d0, delivery: ['recojo'], note: '', contact: '' } });
  },
  mkDraftSet: (el) => { UI.modal.draft[el.dataset.k] = el.dataset.val; render(); },
  mkDraftDel: (el) => { const d = UI.modal.draft; const k = el.dataset.val; d.delivery = d.delivery.includes(k) ? d.delivery.filter((x) => x !== k) : d.delivery.concat(k); render(); },
  mkPublish: () => guard('mkp', () => {
    const m = UI.modal; const d = m.draft; const M = mkStore(); const me = mkMe(); const item = w_item(d.itemId);
    const r = mkPublish(M, Object.assign({}, d, { seller: me, item, origin: isDemo() ? 'demo' : 'real', hasPhoto: !!photoFor(item) }), mkToday());
    if (r.error) { m.error = r.error; render(); return; }
    const ph = photoFor(item);
    if (ph && ph.file) { MKPH[r.listing.id] = { url: URL.createObjectURL(ph.file), file: ph.file, originalUrl: null, cropped: false }; if (IS_PWA && !isDemo()) LOCAL.photoPut('mk:' + r.listing.id, ph.file).catch(() => {}); }
    else if (ph) MKPH[r.listing.id] = ph;
    if (isDemo()) { // una vecina simulada se interesa
      const buyer = ['noa', 'valeria'].find((id) => 'demo:' + id !== me.id); const bp = ws().profiles.find((x) => x.id === buyer);
      mkOffer(M, { listingId: r.listing.id, buyer: { id: 'demo:' + buyer, name: bp.name, district: (bp.districts || [])[0] }, amount: r.listing.acceptOffers ? Math.max(1, Math.round(r.listing.price * 0.85)) : r.listing.price, message: '¡Me interesa! ¿Sigue disponible?', origin: 'demo' }, mkToday());
    }
    UI.modal = null; UI.view = 'circular'; UI.circ.tab = 'vitrina'; UI.mk.sub = 'vendo';
    if (d.district) UI.mk.district = UI.mk.district || d.district;
    celebrate('¡Que lo sepan!');
    mkRun(r, isDemo() ? 'Publicada. Llegó una oferta simulada: revísala en Vendo.' : 'Publicada en la vitrina.');
    window.scrollTo(0, 0);
  }),
  mkSellOutside: (el) => { UI.modal = null; _circIntent10({ dataset: { item: el.dataset.item, kind: 'venta' } }); },
  mkBuy: (el) => guard('mkb', () => { const M = mkStore(); const l = mkListing(M, el.dataset.id); const r = mkOffer(M, { listingId: l.id, buyer: mkMe(), amount: l.price, message: UI.mk.msg, contact: UI.mk.contact, origin: isDemo() ? 'demo' : 'real' }, mkToday()); if (r.error) { UI.modal.error = r.error; render(); return; } mkDemoReply(M, r.offer); UI.mk.msg = ''; UI.modal = null; UI.mk.sub = 'compro'; mkRun(r, isDemo() ? null : 'Pedido enviado: ' + l.sellerName + ' debe confirmarlo.'); }),
  mkMakeOffer: (el) => guard('mko', () => { const M = mkStore(); const id = el.dataset.id; const r = mkOffer(M, { listingId: id, buyer: mkMe(), amount: UI.mk.amt[id], message: UI.mk.msg, contact: UI.mk.contact, origin: isDemo() ? 'demo' : 'real' }, mkToday()); if (r.error) { UI.modal.error = r.error; render(); return; } mkDemoReply(M, r.offer); UI.mk.msg = ''; UI.modal = null; UI.mk.sub = 'compro'; mkRun(r, isDemo() ? null : 'Oferta enviada.'); }),
  mkRespond: (el) => guard('mkr' + el.dataset.id, () => { const a = el.dataset.a; const r = mkRespond(mkStore(), el.dataset.id, mkMe().id, a, UI.mk.counter[el.dataset.id], mkToday()); if (!r.error) delete UI.mk.counter[el.dataset.id]; mkRun(r, a === 'aceptar' ? '¡Trato hecho! Coordina la entrega.' : a === 'contraofertar' ? 'Contraoferta enviada.' : 'Oferta rechazada con amabilidad.'); }),
  mkCounterOpen: (el) => { const o = mkOfferById(mkStore(), el.dataset.id); const l = mkListing(mkStore(), o.listingId); UI.mk.counter[o.id] = Math.round((o.amount + l.price) / 2); render(); },
  mkBuyer: (el) => guard('mkby' + el.dataset.id, () => { const a = el.dataset.a; mkRun(mkBuyerRespond(mkStore(), el.dataset.id, mkMe().id, a, mkToday()), a === 'aceptar' ? '¡Trato hecho! Coordina la entrega.' : a === 'retirar' ? 'Oferta retirada.' : 'Listo.'); }),
  mkDeal: (el) => guard('mkd' + el.dataset.id, () => { const s = el.dataset.s; const r = mkDealStep(mkStore(), el.dataset.id, mkMe().id, s, mkToday()); mkSync(); if (!r.error && s === 'recibir') celebrate('¡Segunda vida!'); mkRun(r, s === 'recibir' ? 'Recibida. Cuéntanos cómo te fue y agrégala a tu armario.' : s === 'entregar' ? 'Marcada como entregada.' : 'Acuerdo cancelado. La prenda vuelve a la vitrina.'); }),
  mkStar: (el) => { const id = el.dataset.id; const r = UI.mk.rev[id] || (UI.mk.rev[id] = { stars: 0, tags: [], comment: '' }); r.stars = Number(el.dataset.n); render(); },
  mkTag: (el) => { const id = el.dataset.id; const r = UI.mk.rev[id] || (UI.mk.rev[id] = { stars: 0, tags: [], comment: '' }); const t = el.dataset.t; r.tags = r.tags.includes(t) ? r.tags.filter((x) => x !== t) : r.tags.concat(t); render(); },
  mkReview: (el) => guard('mkrv' + el.dataset.id, () => { const id = el.dataset.id; const r = UI.mk.rev[id] || {}; const res = mkReview(mkStore(), { offerId: id, fromId: mkMe().id, stars: r.stars, tags: r.tags, comment: r.comment, origin: isDemo() ? 'demo' : 'real' }, mkToday()); if (!res.error) delete UI.mk.rev[id]; mkRun(res, '¡Gracias! Tu opinión ayuda a la comunidad.'); }),
  mkAddCloset: (el) => guard('mka' + el.dataset.id, () => {
    const M = mkStore(); const o = mkOfferById(M, el.dataset.id); const l = mkListing(M, o.listingId); const w = ws();
    const data = Object.assign({}, l.snap, { ownerId: prof().id, price: o.amount, acquisition: 'segunda mano · Vitrina RELISTO', notes: 'Comprada a ' + l.sellerName + ' (' + l.district + ').' });
    delete data.code;
    const item = addItem(w, data, TODAY);
    const ph = MKPH[l.id];
    if (ph && ph.file) { PHOTOS[S.space + ':' + item.id] = { url: URL.createObjectURL(ph.file), file: ph.file, originalUrl: null, cropped: false }; persistPhoto(S.space + ':' + item.id, PHOTOS[S.space + ':' + item.id]); }
    o.addedItemId = item.id;
    if (IS_PWA && !isDemo()) LOCAL.set('market', MKDEV).catch(() => {});
    toast(item.name + ' ya está en tu armario con el código ' + (item.code || '') + '.');
    commit();
  }),
  mkPriceEdit: (el) => { const l = mkListing(mkStore(), el.dataset.id); UI.mk.priceEdit[l.id] = l.price; render(); },
  mkPriceSave: (el) => { const id = el.dataset.id; const r = mkSetPrice(mkStore(), id, mkMe().id, UI.mk.priceEdit[id], mkToday()); if (!r.error) delete UI.mk.priceEdit[id]; mkRun(r, 'Precio actualizado.'); },
  mkWithdraw: (el) => guard('mkw' + el.dataset.id, () => mkRun(mkWithdraw(mkStore(), el.dataset.id, mkMe().id, mkToday()), 'Retirada. Sigue en tu armario.'))
});
const _circIntent10 = ACT.circIntent;
ACT.circIntent = (el) => { if (el.dataset.kind === 'venta' && !el.dataset.outside) { ACT.mkPublishOpen({ dataset: { item: el.dataset.item, circ: '1' } }); return; } _circIntent10(el); };
Object.assign(CHG, {
  mkDist: (el) => { UI.mk.district = el.value; render(); },
  mkSort: (el) => { UI.mk.sort = el.value; render(); }
});
/* Campos libres de la vitrina (sin volver a dibujar en cada tecla). */
document.addEventListener('input', (e) => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.mkAmt) UI.mk.amt[t.dataset.mkAmt] = t.value;
  else if (t.dataset.mkCounter) UI.mk.counter[t.dataset.mkCounter] = t.value;
  else if (t.dataset.mkPrice) UI.mk.priceEdit[t.dataset.mkPrice] = t.value;
  else if (t.dataset.mkDraft && UI.modal && UI.modal.draft) UI.modal.draft[t.dataset.mkDraft] = t.value;
  else if (t.dataset.mkMsg) UI.mk.msg = t.value;
  else if (t.dataset.mkCt) UI.mk.contact = t.value;
  else if (t.dataset.mkComment) { const id = t.dataset.mkComment; (UI.mk.rev[id] || (UI.mk.rev[id] = { stars: 0, tags: [], comment: '' })).comment = t.value; }
});
