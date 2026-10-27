/* =====================================================================
   OPERACIONES DE ESTADO: transiciones explícitas e idempotentes.
   Mutan el espacio recibido y devuelven el registro afectado.
   ===================================================================== */
function nextId(ws, kind, prefix, pad) {
  const n = ws.seq[kind]++;
  return prefix + String(n).padStart(pad || 3, '0');
}
function freshState(today) {
  return { app: 'RELISTO', version: SCHEMA_VERSION, space: 'demo', demo: buildDemoWorkspace(SEED, today), personal: null };
}
function resetDemo(S, today) { S.demo = buildDemoWorkspace(SEED, today); return S; }

function addItem(ws, data, today) {
  const prefix = ws.mode === 'demo' ? 'D' : 'MI';
  let id = nextId(ws, 'item', prefix);
  while (ws.items.some((i) => i.id === id)) id = nextId(ws, 'item', prefix);
  const subtype = data.subtype || deriveSubtype(data.name, data.category);
  const item = Object.assign({
    id, ownerId: ws.activeProfileId, name: 'Prenda', category: 'superior', subtype, color: 'sin color', pattern: 'liso',
    material: 'material no confirmado', weave: '', cut: 'regular', size: '', sizeSystem: 'otro', brand: '', season: 'todo el año',
    warmth: WARMTH[subtype] || 1, formality: FORMALITY[subtype] || 2, comfort: 2, care: '', price: null, tags: [], availability: 'disponible',
    createdAt: today, acquisition: '', baselineLastUsed: null, baselineWearCount: 0, attributeSource: 'confirmado por la persona',
    origin: ws.mode === 'demo' ? 'demo' : 'real', exclusions: { temporada: false, ceremonial: false, sentimental: false, trabajo: false, guardada: false },
    repairEstimate: null, repairReadyDays: null, notes: '', updatedAt: today
  }, data, { id, subtype });
  ws.items.push(item);
  return item;
}
function updateItem(ws, id, data, today) {
  const it = ws.items.find((i) => i.id === id && i.ownerId === ws.activeProfileId);
  if (!it) return null;
  Object.assign(it, data, { id: it.id, ownerId: it.ownerId, updatedAt: today });
  if (data.name || data.category) it.subtype = data.subtype || deriveSubtype(it.name, it.category);
  return it;
}
function findDuplicates(ws, draft, ignoreId) {
  return ownedItems(ws, ws.activeProfileId).filter((i) => i.id !== ignoreId && !isGone(i) && i.category === draft.category &&
    norm(i.color) === norm(draft.color) && deriveSubtype(i.name, i.category) === deriveSubtype(draft.name, draft.category));
}

/* ---- Elección, plan y uso ---- */
function chooseOutfit(ws, cand, ctx, today, status, date) {
  status = status || 'elegido'; date = date || today;
  const existing = ws.wearLogs.find((l) => l.ownerId === ctx.ownerId && l.date === date && l.key === cand.key && ['elegido', 'planificado', 'usado'].includes(l.status));
  if (existing) return existing;
  const items = cand.itemIds.map((id) => ws.items.find((i) => i.id === id)).filter(Boolean);
  const log = {
    id: nextId(ws, 'log', 'L'), ownerId: ctx.ownerId, key: cand.key, outfitId: cand.templateId || null, contextId: ctx.id, occasion: ctx.occasion,
    contextName: ctx.name, date, status, origin: ws.mode === 'demo' ? 'demo' : 'real', createdAt: today, confirmedAt: null,
    snapshot: snapshotOf(cand.name, items), notes: '', comfort: null, satisfaction: null, recovered: []
  };
  ws.wearLogs.push(log);
  return log;
}
function confirmWear(ws, logId, today, threshold) {
  const log = ws.wearLogs.find((l) => l.id === logId);
  if (!log || log.status === 'usado') return { log, changed: false };
  log.recovered = log.snapshot.items.filter((s) => {
    const it = ws.items.find((i) => i.id === s.id);
    return it && daysSinceUse(ws, it, today).days >= (threshold || 365);
  }).map((s) => s.id);
  log.status = 'usado'; log.confirmedAt = today;
  if (log.date > today) log.date = today;
  return { log, changed: true };
}
function undoWear(ws, logId) {
  const log = ws.wearLogs.find((l) => l.id === logId);
  if (!log || log.status !== 'usado') return { log, changed: false };
  log.status = 'deshecho'; log.recovered = [];
  return { log, changed: true };
}
function quickWear(ws, itemId, today, threshold) {
  const it = ws.items.find((i) => i.id === itemId);
  if (!it || isGone(it)) return null;
  const recovered = daysSinceUse(ws, it, today).days >= (threshold || 365) ? [it.id] : [];
  const log = {
    id: nextId(ws, 'log', 'L'), ownerId: it.ownerId, key: 'rapido:' + it.id + ':' + today + ':' + ws.seq.log, outfitId: null, contextId: null,
    occasion: 'registro rápido', contextName: 'Uso registrado sin outfit guardado', date: today, status: 'usado', origin: ws.mode === 'demo' ? 'demo' : 'real',
    createdAt: today, confirmedAt: today, snapshot: snapshotOf('Uso de ' + it.name, [it]), notes: '', comfort: null, satisfaction: null, recovered
  };
  ws.wearLogs.push(log);
  return log;
}
function saveOutfit(ws, cand, ctx, today) {
  const existing = ws.saved.find((s) => s.ownerId === ctx.ownerId && s.key === cand.key);
  if (existing) return existing;
  const s = { id: nextId(ws, 'saved', 'G'), ownerId: ctx.ownerId, key: cand.key, name: cand.name, style: cand.style, itemIds: cand.itemIds.slice(), contextId: ctx.id, createdAt: today, origin: ws.mode === 'demo' ? 'demo' : 'real' };
  ws.saved.push(s);
  return s;
}

/* ---- Reparación, desuso y circularidad ---- */
function startRepair(ws, itemId, today) {
  const it = ws.items.find((i) => i.id === itemId);
  if (!it || isGone(it)) return null;
  it.availability = 'en reparación'; it.updatedAt = today;
  const a = { id: nextId(ws, 'cir', 'CIR', 2), ownerId: it.ownerId, itemId, kind: 'reparacion', status: 'en curso', createdAt: today, history: [{ status: 'en curso', at: today }], origin: ws.mode === 'demo' ? 'demo' : 'real' };
  ws.circular.push(a);
  return a;
}
function completeRepair(ws, itemId, today) {
  const it = ws.items.find((i) => i.id === itemId);
  if (!it || it.availability !== 'en reparación') return null;
  it.availability = 'disponible'; it.updatedAt = today;
  let a = ws.circular.find((c) => c.itemId === itemId && c.kind === 'reparacion' && c.status === 'en curso');
  if (!a) { a = { id: nextId(ws, 'cir', 'CIR', 2), ownerId: it.ownerId, itemId, kind: 'reparacion', status: 'en curso', createdAt: today, history: [], origin: ws.mode === 'demo' ? 'demo' : 'real' }; ws.circular.push(a); }
  a.status = 'completada'; a.history.push({ status: 'completada', at: today });
  ws.missing.filter((m) => m.existingCompatibleItemId === itemId && m.status === 'abierta').forEach((m) => { m.status = 'resuelta con reparación'; });
  ws.plans.filter((p) => ws.missing.some((m) => m.id === p.requirementId && m.existingCompatibleItemId === itemId)).forEach((p) => { if (!/compra/.test(p.status)) p.status = 'resuelto con reparación'; });
  return a;
}
function circularIntent(ws, itemId, kind, today, details) {
  const it = ws.items.find((i) => i.id === itemId);
  if (!it || isGone(it)) return null;
  const open = ws.circular.find((c) => c.itemId === itemId && c.kind === kind && c.status === 'intención');
  if (open) return open;
  const a = Object.assign({ id: nextId(ws, 'cir', 'CIR', 2), ownerId: it.ownerId, itemId, kind, status: 'intención', destination: null, condition: '', clean: false, createdAt: today, history: [{ status: 'intención', at: today }], origin: ws.mode === 'demo' ? 'demo' : 'real' }, details || {});
  ws.circular.push(a);
  ws.circular.filter((c) => c.itemId === itemId && c.kind === 'revision').forEach((c) => { c.status = 'en curso'; });
  return a;
}
function confirmCircular(ws, actionId, today) {
  const a = ws.circular.find((c) => c.id === actionId);
  if (!a || a.status !== 'intención') return { action: a, changed: false };
  const it = ws.items.find((i) => i.id === a.itemId);
  a.status = a.kind === 'donacion' ? 'entregada (demo)' : a.kind === 'venta' ? 'vendida (demo)' : 'acordado (demo)';
  a.history.push({ status: a.status, at: today });
  if (it && a.kind === 'donacion') it.availability = 'donada';
  if (it && a.kind === 'venta') it.availability = 'vendida';
  if (it && a.kind === 'prestamo') it.availability = 'prestada';
  ws.circular.filter((c) => c.itemId === a.itemId && c.kind === 'revision').forEach((c) => { c.status = 'resuelta'; });
  return { action: a, changed: true };
}
function cancelCircular(ws, actionId, today) {
  const a = ws.circular.find((c) => c.id === actionId);
  if (!a || a.status !== 'intención') return null;
  a.status = 'cancelada'; a.history.push({ status: 'cancelada', at: today });
  return a;
}

/* ---- Pedidos simulados ---- */
function createOrder(ws, offer, modality, today, token) {
  const prev = ws.orders.find((o) => o.checkoutToken && o.checkoutToken === token);
  if (prev) return prev;
  const total = modality === 'recojo' ? offer.pricePEN : (offer.deliveryPEN === null ? null : offer.pricePEN + offer.deliveryPEN);
  if (total === null) return null; // no se confirma con importe incompleto
  const req = ws.missing.find((m) => m.id === offer.requirementId);
  const o = {
    id: 'DEMO-' + ws.seq.order++, ownerId: ws.activeProfileId, demo: true, source: 'simulación', offerId: offer.id, product: offer.product,
    category: req ? req.category : 'calzado', subtype: req ? req.subtype : '', material: offer.material, color: offer.color, size: offer.size,
    store: offer.store, district: offer.district, modality, pricePEN: offer.pricePEN, deliveryPEN: modality === 'recojo' ? 0 : offer.deliveryPEN, total,
    etaDays: modality === 'recojo' ? offer.pickupInDays : offer.deliveryInDays, status: 'confirmado (simulado)', createdAt: today,
    history: [{ status: 'confirmado (simulado)', at: today }], addedItemId: null, checkoutToken: token, requirementId: offer.requirementId,
    note: 'Pedido simulado: no hay pago, reserva ni comercio real.'
  };
  ws.orders.push(o);
  ws.plans.filter((p) => p.requirementId === offer.requirementId).forEach((p) => { p.status = 'compra simulada confirmada'; });
  return o;
}
function advanceOrder(ws, orderId, today) {
  const o = ws.orders.find((x) => x.id === orderId);
  if (!o || !o.demo) return null;
  const nx = nextOrderStatus(o);
  if (!nx) return null;
  o.status = nx; o.history.push({ status: nx, at: today });
  return o;
}
function cancelOrder(ws, orderId, today) {
  const o = ws.orders.find((x) => x.id === orderId);
  if (!o || isReceived(o) || o.status === 'cancelado') return null;
  o.status = 'cancelado'; o.history.push({ status: 'cancelado', at: today });
  return o;
}
function addOrderItem(ws, orderId, fields, today) {
  const o = ws.orders.find((x) => x.id === orderId);
  if (!o || !isReceived(o)) return { item: null, added: false };
  if (o.addedItemId) return { item: ws.items.find((i) => i.id === o.addedItemId), added: false };
  const item = addItem(ws, Object.assign({
    name: o.product, category: o.category || 'superior', color: o.color, material: o.material, size: o.size,
    sizeSystem: /^EU/.test(o.size) ? 'EU' : 'letras', price: o.pricePEN, acquisition: 'compra simulada ' + o.id,
    attributeSource: 'ficha del pedido simulado', ownerId: o.ownerId
  }, fields || {}), today);
  o.addedItemId = item.id;
  return { item, added: true };
}

/* ---- Exportación ---- */
function exportState(S, photosOmitted) {
  return { app: 'RELISTO', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), note: 'Solo datos de texto. Las fotos no se incluyen: vuelve a adjuntarlas.', photosOmitted: photosOmitted || 0, spaces: { demo: S.demo, personal: S.personal } };
}
