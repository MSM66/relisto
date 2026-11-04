/* =====================================================================
   VITRINA (mercado entre personas): reglas puras.
   Publicar con precio propio, comprar o recibir ofertas, contraofertar,
   cerrar el acuerdo, confirmar la entrega y opinar (solo compras reales).
   RELISTO no procesa pagos ni calcula precios de delivery.
   ===================================================================== */
/* Centro aproximado de cada distrito (lat, lng). Solo para ordenar por cercanía. */
const DISTRICT_LL = {
  'Barranco': [-12.149, -77.021], 'Jesús María': [-12.076, -77.049], 'La Molina': [-12.083, -76.935], 'Lince': [-12.084, -77.034],
  'Magdalena del Mar': [-12.091, -77.071], 'Miraflores': [-12.121, -77.030], 'Pueblo Libre': [-12.075, -77.064], 'San Borja': [-12.103, -76.999],
  'San Isidro': [-12.097, -77.037], 'San Miguel': [-12.077, -77.091], 'Santiago de Surco': [-12.146, -76.991], 'Surquillo': [-12.113, -77.016],
  'Cercado de Lima': [-12.046, -77.043], 'Breña': [-12.060, -77.051], 'La Victoria': [-12.069, -77.020], 'Rímac': [-12.030, -77.030],
  'San Luis': [-12.075, -76.995], 'Chorrillos': [-12.169, -77.024], 'San Juan de Miraflores': [-12.157, -76.973], 'Villa El Salvador': [-12.213, -76.937],
  'Ate': [-12.026, -76.920], 'Santa Anita': [-12.043, -76.971], 'San Juan de Lurigancho': [-11.983, -77.001], 'Los Olivos': [-11.970, -77.072],
  'San Martín de Porres': [-12.000, -77.060], 'Comas': [-11.935, -77.044], 'Callao': [-12.056, -77.118]
};
const MK_DISTRICTS = Object.keys(DISTRICT_LL).sort((a, b) => a.localeCompare(b, 'es'));
const MK_CONDITIONS = ['nueva con etiqueta', 'como nueva', 'buen estado', 'con detalles'];
const MK_DELIVERY = { recojo: 'Recojo en punto acordado', delivery: 'Delivery (lo paga quien compra)' };
const MK_REVIEW_TAGS = ['Como se describió', 'Puntual', 'Buena comunicación', 'Bien cuidada'];
const MK_OPEN = ['pendiente', 'contraoferta'];

function distKm(a, b) {
  const A = DISTRICT_LL[a]; const B = DISTRICT_LL[b];
  if (!A || !B) return null;
  if (a === b) return 0;
  const R = 6371; const r = (d) => (d * Math.PI) / 180;
  const dLat = r(B[0] - A[0]); const dLng = r(B[1] - A[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(A[0])) * Math.cos(r(B[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
function nearLabel(from, to) {
  if (!from || !to) return to || 'Distrito sin indicar';
  const d = distKm(from, to);
  if (d === 0) return to + ' · tu distrito';
  return d === null ? to : to + ' · ≈ ' + (d < 1 ? '1' : Math.round(d)) + ' km';
}

function mkNew() { return { listings: [], offers: [], reviews: [], seq: { l: 1, o: 1, r: 1 } }; }
function mkId(M, k, p) { M.seq = M.seq || {}; const n = M.seq[k] || 1; M.seq[k] = n + 1; return p + String(n).padStart(3, '0') + '-' + Math.random().toString(36).slice(2, 6); }
const mkErr = (msg) => ({ error: msg });
const mkListing = (M, id) => M.listings.find((l) => l.id === id);
const mkOfferById = (M, id) => M.offers.find((o) => o.id === id);
function mkSnapshot(item) {
  const s = {};
  ['name', 'category', 'subtype', 'color', 'photoHex', 'size', 'sizeSystem', 'cut', 'material', 'pattern', 'weave', 'formality', 'warmth', 'code'].forEach((k) => { if (item[k] !== undefined) s[k] = item[k]; });
  return s;
}
function mkActiveForItem(M, sellerId, itemId) { return M.listings.find((l) => l.sellerId === sellerId && l.itemId === itemId && ['publicada', 'reservada'].includes(l.status)); }

function mkPublish(M, d, today) {
  const price = Math.round(Number(d.price));
  if (!d.item) return mkErr('Elige una prenda.');
  if (!(price >= 1 && price <= 100000)) return mkErr('Pon un precio de venta entre S/ 1 y S/ 100 000.');
  if (!DISTRICT_LL[d.district]) return mkErr('Indica tu distrito para que vean qué tan cerca estás.');
  if (!d.delivery || !d.delivery.length) return mkErr('Elige al menos una forma de entrega.');
  if (mkActiveForItem(M, d.seller.id, d.item.id)) return mkErr('Esta prenda ya está en la vitrina.');
  const l = {
    id: mkId(M, 'l', 'L'), sellerId: d.seller.id, sellerName: d.seller.name, itemId: d.item.id, snap: mkSnapshot(d.item),
    price, acceptOffers: d.acceptOffers !== false, condition: MK_CONDITIONS.includes(d.condition) ? d.condition : 'buen estado',
    district: d.district, delivery: d.delivery.filter((x) => MK_DELIVERY[x]), note: String(d.note || '').slice(0, 280), contact: String(d.contact || '').slice(0, 80),
    status: 'publicada', createdAt: today, updatedAt: today, origin: d.origin || 'real', hasPhoto: !!d.hasPhoto
  };
  M.listings.unshift(l);
  return { listing: l };
}
function mkSetPrice(M, listingId, sellerId, price, today) {
  const l = mkListing(M, listingId); price = Math.round(Number(price));
  if (!l || l.sellerId !== sellerId) return mkErr('No es tu publicación.');
  if (l.status !== 'publicada') return mkErr('Solo puedes cambiar el precio mientras está publicada.');
  if (!(price >= 1 && price <= 100000)) return mkErr('Precio no válido.');
  l.price = price; l.updatedAt = today; return { listing: l };
}
function mkWithdraw(M, listingId, sellerId, today) {
  const l = mkListing(M, listingId);
  if (!l || l.sellerId !== sellerId) return mkErr('No es tu publicación.');
  if (l.status !== 'publicada') return mkErr('Solo se retira una publicación sin acuerdo en curso.');
  l.status = 'retirada'; l.updatedAt = today;
  M.offers.filter((o) => o.listingId === l.id && (MK_OPEN.includes(o.status) || o.status === 'en espera')).forEach((o) => { o.status = 'no concretada'; o.updatedAt = today; });
  return { listing: l };
}
function mkOffer(M, d, today) {
  const l = mkListing(M, d.listingId);
  if (!l || l.status !== 'publicada') return mkErr('Esta prenda ya no está disponible.');
  if (l.sellerId === d.buyer.id) return mkErr('Es tu propia publicación.');
  let amount = Math.round(Number(d.amount));
  if (!(amount >= 1)) return mkErr('Escribe un monto válido.');
  if (amount >= l.price) amount = l.price;
  if (amount < l.price && !l.acceptOffers) return mkErr('Quien vende no acepta ofertas: el precio es S/ ' + l.price + '.');
  if (amount < Math.ceil(l.price * 0.3)) return mkErr('La oferta es muy baja para esta prenda. Prueba con un monto más cercano al precio.');
  M.offers.filter((o) => o.listingId === l.id && o.buyerId === d.buyer.id && MK_OPEN.includes(o.status)).forEach((o) => { o.status = 'retirada'; o.updatedAt = today; });
  const o = {
    id: mkId(M, 'o', 'O'), listingId: l.id, sellerId: l.sellerId, buyerId: d.buyer.id, buyerName: d.buyer.name, buyerDistrict: d.buyer.district || '',
    amount, kind: amount === l.price ? 'compra' : 'oferta', counter: null, message: String(d.message || '').slice(0, 200), contact: String(d.contact || '').slice(0, 80),
    status: 'pendiente', deal: null, createdAt: today, updatedAt: today, origin: d.origin || 'real'
  };
  M.offers.unshift(o);
  return { offer: o };
}
function mkAccept(M, o, today) {
  const l = mkListing(M, o.listingId);
  o.status = 'aceptada'; o.deal = 'acordado'; o.updatedAt = today;
  if (o.counter) o.amount = o.counter;
  l.status = 'reservada'; l.dealOfferId = o.id; l.updatedAt = today;
  M.offers.filter((x) => x.listingId === l.id && x.id !== o.id && MK_OPEN.includes(x.status)).forEach((x) => { x.status = 'en espera'; x.updatedAt = today; });
}
function mkRespond(M, offerId, sellerId, action, counter, today) {
  const o = mkOfferById(M, offerId); const l = o && mkListing(M, o.listingId);
  if (!o || !l || l.sellerId !== sellerId) return mkErr('No es una oferta de tus publicaciones.');
  if (o.status !== 'pendiente' || l.status !== 'publicada') return mkErr('Esta oferta ya no está pendiente.');
  if (action === 'aceptar') { mkAccept(M, o, today); return { offer: o }; }
  if (action === 'rechazar') { o.status = 'rechazada'; o.updatedAt = today; return { offer: o }; }
  if (action === 'contraofertar') {
    const c = Math.round(Number(counter));
    if (!(c > o.amount && c <= l.price)) return mkErr('La contraoferta debe estar entre S/ ' + (o.amount + 1) + ' y S/ ' + l.price + '.');
    o.status = 'contraoferta'; o.counter = c; o.updatedAt = today; return { offer: o };
  }
  return mkErr('Acción desconocida.');
}
function mkBuyerRespond(M, offerId, buyerId, action, today) {
  const o = mkOfferById(M, offerId); const l = o && mkListing(M, o.listingId);
  if (!o || o.buyerId !== buyerId) return mkErr('No es tu oferta.');
  if (action === 'retirar' && MK_OPEN.concat('en espera').includes(o.status)) { o.status = 'retirada'; o.updatedAt = today; return { offer: o }; }
  if (o.status !== 'contraoferta' || l.status !== 'publicada') return mkErr('No hay contraoferta pendiente.');
  if (action === 'aceptar') { mkAccept(M, o, today); return { offer: o }; }
  if (action === 'rechazar') { o.status = 'rechazada'; o.updatedAt = today; return { offer: o }; }
  return mkErr('Acción desconocida.');
}
function mkDealStep(M, offerId, actorId, step, today) {
  const o = mkOfferById(M, offerId); const l = o && mkListing(M, o.listingId);
  if (!o || o.status !== 'aceptada' || !l) return mkErr('No hay un acuerdo en curso.');
  const seller = l.sellerId === actorId; const buyer = o.buyerId === actorId;
  if (!seller && !buyer) return mkErr('No participas en este acuerdo.');
  if (step === 'entregar' && seller && o.deal === 'acordado') { o.deal = 'entregada'; o.updatedAt = today; return { offer: o }; }
  if (step === 'recibir' && buyer && ['acordado', 'entregada'].includes(o.deal)) {
    o.deal = 'recibida'; o.updatedAt = today; o.receivedAt = today;
    l.status = 'vendida'; l.soldAt = today; l.soldPrice = o.amount; l.buyerId = o.buyerId; l.buyerName = o.buyerName; l.updatedAt = today;
    M.offers.filter((x) => x.listingId === l.id && x.status === 'en espera').forEach((x) => { x.status = 'no concretada'; x.updatedAt = today; });
    return { offer: o, listing: l };
  }
  if (step === 'cancelar' && o.deal !== 'recibida') {
    o.status = 'cancelada'; o.deal = null; o.cancelledBy = seller ? 'vende' : 'compra'; o.updatedAt = today;
    l.status = 'publicada'; l.dealOfferId = null; l.updatedAt = today;
    M.offers.filter((x) => x.listingId === l.id && x.status === 'en espera').forEach((x) => { x.status = 'pendiente'; x.updatedAt = today; });
    return { offer: o };
  }
  return mkErr('Ese paso no corresponde ahora.');
}
function mkReview(M, d, today) {
  const o = mkOfferById(M, d.offerId);
  if (!o || o.buyerId !== d.fromId || o.deal !== 'recibida') return mkErr('Solo opina quien recibió la prenda.');
  if (M.reviews.some((r) => r.offerId === o.id)) return mkErr('Ya dejaste tu opinión.');
  const stars = Math.round(Number(d.stars));
  if (!(stars >= 1 && stars <= 5)) return mkErr('Elige de 1 a 5 estrellas.');
  const r = { id: mkId(M, 'r', 'R'), offerId: o.id, listingId: o.listingId, fromId: o.buyerId, fromName: o.buyerName, toId: o.sellerId, stars,
    tags: (d.tags || []).filter((t) => MK_REVIEW_TAGS.includes(t)), comment: String(d.comment || '').slice(0, 280), createdAt: today, origin: d.origin || 'real', verified: true };
  M.reviews.unshift(r);
  return { review: r };
}
function mkReputation(M, userId) {
  const rs = M.reviews.filter((r) => r.toId === userId);
  const sales = M.listings.filter((l) => l.sellerId === userId && l.status === 'vendida').length;
  return { count: rs.length, avg: rs.length ? Math.round((rs.reduce((a, r) => a + r.stars, 0) / rs.length) * 10) / 10 : null, sales, reviews: rs };
}
/* Lo que espera una acción tuya (para el punto de aviso). */
function mkInbox(M, userId) {
  const mineL = new Set(M.listings.filter((l) => l.sellerId === userId).map((l) => l.id));
  const sell = M.offers.filter((o) => mineL.has(o.listingId) && (o.status === 'pendiente' || (o.status === 'aceptada' && o.deal === 'acordado'))).length;
  const buy = M.offers.filter((o) => o.buyerId === userId && (o.status === 'contraoferta' || (o.status === 'aceptada' && ['acordado', 'entregada'].includes(o.deal)) || (o.deal === 'recibida' && !M.reviews.some((r) => r.offerId === o.id)))).length;
  return { sell, buy, total: sell + buy };
}
/* Explorar: publicaciones de otras personas con cercanía y aporte a tu armario. */
function mkBrowse(M, ws, ownerId, me, f) {
  f = f || {};
  const rows = M.listings.filter((l) => l.status === 'publicada' && l.sellerId !== me.id).map((l) => {
    const cand = Object.assign({ id: 'MKC-' + l.id, ownerId, availability: 'disponible', hypothetical: true, warmth: 1, formality: 2, cut: 'regular', material: 'material no confirmado' }, l.snap);
    const v = purchaseValue(ws, ownerId, cand);
    const gap = (ws.missing || []).find((m) => m.ownerId === ownerId && m.status === 'abierta' && m.subtype && norm(m.subtype) === norm(l.snap.subtype));
    return { listing: l, km: distKm(me.district, l.district), added: v.added.length, similar: v.similar.length, gap: gap || null, rep: mkReputation(M, l.sellerId) };
  }).filter((r) => {
    if (f.cat && f.cat !== 'todas' && r.listing.snap.category !== f.cat) return false;
    if (f.near && (r.km === null || r.km > 6)) return false;
    if (f.maxPrice && r.listing.price > f.maxPrice) return false;
    return true;
  });
  const near = (r) => (r.km === null ? 99 : r.km);
  if (f.sort === 'cerca') rows.sort((a, b) => near(a) - near(b) || a.listing.price - b.listing.price);
  else if (f.sort === 'precio') rows.sort((a, b) => a.listing.price - b.listing.price);
  else rows.sort((a, b) => (b.gap ? 8 : 0) + b.added - near(b) / 3 - ((a.gap ? 8 : 0) + a.added - near(a) / 3));
  return rows;
}

/* Vitrina de ejemplo (todo ficticio, etiquetado como Simulado). */
function seedDemoMarket(ws, today) {
  const M = mkNew(); const it = (id) => ws.items.find((i) => i.id === id);
  const S = (id, name) => ({ id: 'demo:' + id, name });
  const pub = (sid, sname, itemId, price, cond, district, delivery, note, acceptOffers, days) => {
    const r = mkPublish(M, { seller: S(sid, sname), item: it(itemId), price, condition: cond, district, delivery, note, acceptOffers, origin: 'demo' }, addDays(today, -days));
    return r.listing;
  };
  pub('noa', 'Noa', 'N06', 95, 'como nueva', 'San Borja', ['recojo', 'delivery'], 'La usé poco; me queda grande de hombros.', true, 3);
  pub('valeria', 'Valeria', 'V07', 140, 'buen estado', 'Barranco', ['recojo'], 'Forro en perfecto estado.', true, 5);
  pub('noa', 'Noa', 'N03', 70, 'buen estado', 'Santiago de Surco', ['recojo', 'delivery'], '', true, 8);
  pub('valeria', 'Valeria', 'V09', 120, 'como nueva', 'Miraflores', ['recojo', 'delivery'], 'Precio fijo.', false, 2);
  const mine = pub('alex', 'Alex', 'A18', 80, 'buen estado', 'Miraflores', ['recojo'], 'Suéter de punto, sin bolitas.', true, 1);
  mkOffer(M, { listingId: mine.id, buyer: { id: 'demo:noa', name: 'Noa', district: 'San Borja' }, amount: 65, message: '¿Lo dejarías en 65? Puedo recogerlo el sábado.', origin: 'demo' }, today);
  // Ventas pasadas con opiniones verificadas (ficticias).
  const past = [['valeria', 'Valeria', { name: 'Casaca de jean', category: 'capa', subtype: 'casaca', color: 'azul', size: 'M' }, 90, 'noa', 'Noa', 5, ['Como se describió', 'Puntual'], 'Llegó tal cual las fotos.', 20],
    ['valeria', 'Valeria', { name: 'Sandalias doradas', category: 'calzado', subtype: 'sandalias', color: 'dorado', size: 'EU 38' }, 60, 'alex', 'Alex', 4, ['Buena comunicación'], 'Todo bien, coordinamos rápido.', 34],
    ['noa', 'Noa', { name: 'Polo gris', category: 'superior', subtype: 'polo', color: 'gris', size: 'L' }, 35, 'valeria', 'Valeria', 5, ['Bien cuidada', 'Puntual'], '', 15]];
  past.forEach(([sid, sn, snap, price, bid, bn, stars, tags, comment, days]) => {
    const d0 = addDays(today, -days);
    const l = mkPublish(M, { seller: S(sid, sn), item: Object.assign({ id: 'OLD-' + snap.name }, snap), price, district: sid === 'noa' ? 'San Borja' : 'Barranco', delivery: ['recojo'], origin: 'demo' }, d0).listing;
    const o = mkOffer(M, { listingId: l.id, buyer: { id: 'demo:' + bid, name: bn }, amount: price, origin: 'demo' }, d0).offer;
    mkRespond(M, o.id, l.sellerId, 'aceptar', null, d0); mkDealStep(M, o.id, 'demo:' + bid, 'recibir', addDays(d0, 2));
    mkReview(M, { offerId: o.id, fromId: 'demo:' + bid, stars, tags, comment, origin: 'demo' }, addDays(d0, 2));
    o.addedItemId = 'historial';
  });
  return M;
}
