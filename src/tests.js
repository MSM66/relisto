/* =====================================================================
   COMPROBACIONES AUTOMÁTICAS: se ejecutan sobre una copia nueva de la
   semilla (no tocan tus datos). Cubren conteos, IDs, completitud,
   máximo seis, idempotencia, ofertas, pedidos, desuso y separación.
   ===================================================================== */
function runSelfTests(today) {
  today = today || todayLima();
  const out = [];
  const check = (name, fn) => {
    try { const r = fn(); out.push({ name, ok: r === true || (r && r.ok), detail: r && r.detail ? r.detail : '' }); }
    catch (e) { out.push({ name, ok: false, detail: 'Error: ' + e.message }); }
  };
  const S = freshState(today);
  const ws = () => S.demo;
  const ctx = (id) => ws().contexts.find((c) => c.id === id);
  const prof = (id) => ws().profiles.find((p) => p.id === id);
  const gen = (cid, opts) => { const c = ctx(cid); return generateOutfits(ws(), c, prof(c.ownerId), opts || {}, today); };

  check('Abre con Alex como perfil activo', () => ws().activeProfileId === 'alex');
  check('39 artículos: 18 de Alex, 12 de Valeria y 9 de Noa', () => {
    const c = (o) => ws().items.filter((i) => i.ownerId === o).length;
    return { ok: ws().items.length === 39 && c('alex') === 18 && c('valeria') === 12 && c('noa') === 9, detail: ws().items.length + ' = ' + c('alex') + ' + ' + c('valeria') + ' + ' + c('noa') };
  });
  check('13 plantillas, 7 registros, 3 ofertas, 1 pedido, 1 caso de desuso', () => ws().templates.length === 13 && ws().wearLogs.length === 7 && ws().offers.length === 3 && ws().orders.length === 1 && ws().circular.length === 1);
  check('IDs únicos y propietarios válidos', () => {
    const ids = new Set(ws().items.map((i) => i.id)); const pids = new Set(ws().profiles.map((p) => p.id));
    const tplOk = ws().templates.every((t) => t.itemIds.every((id) => { const it = ws().items.find((i) => i.id === id); return it && it.ownerId === t.ownerId; }));
    return ids.size === 39 && ws().items.every((i) => pids.has(i.ownerId)) && tplOk;
  });
  check('A17 (por lavar) y A11 (en reparación) no están disponibles', () => {
    const a17 = ws().items.find((i) => i.id === 'A17'), a11 = ws().items.find((i) => i.id === 'A11');
    return !isUsable(a17) && !isUsable(a11) && a17.availability === 'por lavar' && a11.availability === 'en reparación';
  });
  check('Escena 1: “Arma mi día” muestra OA1, OA2 y OA3 completos', () => {
    const g = gen('C01'); const first = pickDiverse(g.complete, [], 3, ws());
    return { ok: first.map((c) => c.templateId).join(',') === 'OA1,OA2,OA3' && first.every((c) => c.completeness.percent === 100), detail: first.map((c) => c.templateId || c.key).join(', ') };
  });
  check('Escena 1: “Ver tres más” añade OA4, OA5 y OA6 hasta seis', () => {
    const g = gen('C01'); const first = pickDiverse(g.complete, [], 3, ws()); const more = pickDiverse(g.complete, first, 6 - first.length, ws());
    return { ok: more.map((c) => c.templateId).join(',') === 'OA4,OA5,OA6' && first.length + more.length === 6, detail: more.map((c) => c.templateId || c.key).join(', ') };
  });
  check('Nunca más de seis candidatos simultáneos', () => {
    const g = gen('C01'); const shown = pickDiverse(g.complete, [], 3, ws());
    const more = pickDiverse(g.complete, shown, Math.max(0, 6 - shown.length), ws());
    const extra = pickDiverse(g.complete, shown.concat(more), Math.max(0, 6 - shown.length - more.length), ws());
    return shown.length + more.length + extra.length <= 6;
  });
  check('Ninguna sugerencia completa usa A17 ni A11', () => gen('C01').complete.every((c) => !c.itemIds.includes('A17') && !c.itemIds.includes('A11')) && gen('C02').complete.every((c) => !c.itemIds.includes('A17') && !c.itemIds.includes('A11')));
  check('Las combinaciones no se duplican', () => { const k = gen('C01').complete.map((c) => c.key); return new Set(k).size === k.length; });
  check('El contexto cambia las sugerencias (C01 ≠ C02)', () => {
    const a = gen('C01').complete.slice(0, 3).map((c) => c.key).join(), b = gen('C02').complete.slice(0, 3).map((c) => c.key).join();
    return { ok: a !== b, detail: 'C02 empieza con ' + gen('C02').complete[0].name };
  });
  check('La disponibilidad cambia las sugerencias (A12 por lavar)', () => {
    const T = freshState(today); const w = T.demo; w.items.find((i) => i.id === 'A12').availability = 'por lavar';
    const c = w.contexts.find((x) => x.id === 'C01'); const g = generateOutfits(w, c, w.profiles[0], {}, today);
    return g.complete.every((x) => !x.itemIds.includes('A12')) && g.partial.some((x) => x.templateId === 'OA1');
  });
  check('Escena 3: OA7 da 3 de 4 unidades = 75%', () => {
    const t = ws().templates.find((x) => x.id === 'OA7'); const r = completeness(ws(), t.itemIds, ctx('C03'), t);
    return { ok: r.percent === 75 && r.covered === 3 && r.total === 4, detail: r.covered + '/' + r.total + ' = ' + r.percent + '%' };
  });
  check('Escena 3: con A11 disponible e incorporado, OA7 llega a 100%', () => {
    const T = freshState(today); const w = T.demo; completeRepair(w, 'A11', today);
    const t = w.templates.find((x) => x.id === 'OA7'); const r = completeness(w, t.itemIds.concat('A11'), w.contexts.find((c) => c.id === 'C03'), t);
    return { ok: r.percent === 100, detail: r.percent + '%' };
  });
  check('Escena 3: sin reparar, la unidad faltante reconoce que ya tienes A11', () => {
    const t = ws().templates.find((x) => x.id === 'OA7'); const r = completeness(ws(), t.itemIds, ctx('C03'), t);
    return r.units.find((u) => u.slot === 'calzado').ownedBlockedId === 'A11';
  });
  check('Escena 2: vestido + botines = 100%; sin collar sigue en 100%', () => {
    const t = ws().templates.find((x) => x.id === 'OV1');
    const a = completeness(ws(), t.itemIds, ctx('C04'), t).percent;
    const b = completeness(ws(), t.itemIds.filter((id) => id !== 'V12'), ctx('C04'), t).percent;
    return { ok: a === 100 && b === 100, detail: a + '% → ' + b + '%' };
  });
  check('Escena 2: Valeria tiene tres combinaciones válidas', () => gen('C04').complete.length >= 3);
  check('Escena 6: solo superior e inferior = 2 de 3 (67%)', () => {
    const T = freshState(today); T.personal = buildPersonalWorkspace(today, { name: 'Prueba' }); const w = T.personal;
    addItem(w, { name: 'Camiseta gris', category: 'superior', color: 'gris' }, today);
    addItem(w, { name: 'Jean azul', category: 'inferior', color: 'azul' }, today);
    const c = w.contexts[0]; const g = generateOutfits(w, c, w.profiles[0], {}, today);
    const p = g.partial[0];
    return { ok: !g.complete.length && p && p.completeness.percent === 67 && !p.itemIds.some((id) => roleOf(w.items.find((i) => i.id === id)) === 'shoes'), detail: p ? p.completeness.covered + '/' + p.completeness.total + ' = ' + p.completeness.percent + '%' : 'sin propuesta' };
  });
  check('Elegir y guardar no suman usos; “Sí, lo usé” suma una sola vez', () => {
    const T = freshState(today); const w = T.demo; const c = w.contexts.find((x) => x.id === 'C01');
    const cand = generateOutfits(w, c, w.profiles[0], {}, today).complete[0];
    const it = w.items.find((i) => i.id === cand.itemIds[0]); const before = itemStats(w, it).wearCount;
    const log = chooseOutfit(w, cand, c, today); saveOutfit(w, cand, c, today);
    const mid = itemStats(w, it).wearCount;
    confirmWear(w, log.id, today, 365); confirmWear(w, log.id, today, 365); chooseOutfit(w, cand, c, today);
    const after = itemStats(w, it).wearCount;
    undoWear(w, log.id); const undone = itemStats(w, it).wearCount;
    return { ok: mid === before && after === before + 1 && undone === before, detail: before + ' → ' + mid + ' → ' + after + ' → deshacer ' + undone };
  });
  const f3 = { districts: ['Miraflores', 'San Isidro', 'Santiago de Surco'], physical: true, modality: 'delivery', budget: 350, budgetMode: 'total', color: 'negro', material: 'cuero', size: 'EU 42', subtype: 'Oxford', condition: 'nuevo' };
  check('Escena 4: tres distritos → S/267 y S/301, y una pendiente de cotizar', () => {
    const r = searchOffers(ws().offers, ws().missing[0], f3);
    return { ok: r.results.map((x) => x.total).join(',') === '267,301' && r.pending.length === 1 && r.pending[0].offer.id === 'DEMO-P02' && r.pending[0].total === null && r.results[0].lowestKnown, detail: r.results.map((x) => fmtPEN(x.total)).join(', ') + ' + pendiente ' + r.pending.map((x) => x.offer.id).join() };
  });
  check('Recojo: envío cero, total = precio en las tres', () => {
    const r = searchOffers(ws().offers, ws().missing[0], Object.assign({}, f3, { modality: 'recojo' }));
    return r.results.length === 3 && r.results.every((x) => x.shipping === 0 && x.total === x.offer.pricePEN);
  });
  check('Solo Miraflores devuelve una oferta (no se inventan otras)', () => {
    const r = searchOffers(ws().offers, ws().missing[0], Object.assign({}, f3, { districts: ['Miraflores'] }));
    return { ok: r.results.length + r.pending.length === 1 && r.results[0].offer.id === 'DEMO-P01', detail: (r.results.length + r.pending.length) + ' resultado(s)' };
  });
  check('Filtros reales: talla EU 41 o presupuesto S/260 excluyen ofertas', () => {
    const a = searchOffers(ws().offers, ws().missing[0], Object.assign({}, f3, { size: 'EU 41' }));
    const b = searchOffers(ws().offers, ws().missing[0], Object.assign({}, f3, { budget: 260 }));
    return a.results.length === 0 && a.pending.length === 0 && b.results.length === 0 && b.pending.length === 1;
  });
  check('Delivery con envío sin cotizar no permite confirmar', () => createOrder(freshState(today).demo, ws().offers[1], 'delivery', today, 'x') === null);
  check('Pedido simulado: doble clic crea un solo pedido DEMO-1043', () => {
    const T = freshState(today); const w = T.demo; const a = createOrder(w, w.offers[0], 'delivery', today, 'tok'); const b = createOrder(w, w.offers[0], 'delivery', today, 'tok');
    return { ok: a === b && a.id === 'DEMO-1043' && w.orders.length === 2 && a.total === 301, detail: a.id + ' · ' + fmtPEN(a.total) };
  });
  check('Pedido recibido se añade al armario una sola vez', () => {
    const T = freshState(today); const w = T.demo; const o = createOrder(w, w.offers[2], 'recojo', today, 't2');
    const early = addOrderItem(w, o.id, {}, today).added;
    while (advanceOrder(w, o.id, today)) { /* avanzar */ }
    const n0 = w.items.length; const r1 = addOrderItem(w, o.id, {}, today); const r2 = addOrderItem(w, o.id, {}, today);
    return { ok: !early && r1.added && !r2.added && w.items.length === n0 + 1 && isReceived(o), detail: 'estado final: ' + o.status };
  });
  check('DEMO-1042: recojo simulado y alta única en el armario', () => {
    const T = freshState(today); const w = T.demo; advanceOrder(w, 'DEMO-1042', today);
    const n0 = w.items.length; addOrderItem(w, 'DEMO-1042', {}, today); addOrderItem(w, 'DEMO-1042', {}, today);
    return w.items.length === n0 + 1 && w.items[w.items.length - 1].baselineWearCount === 0;
  });
  check('Escena 5: a 365 días entra A18 (430 días)', () => {
    const r = dormantItems(ws(), 'alex', 365, ws().referenceDate);
    return { ok: r.review.map((x) => x.item.id).join() === 'A18' && r.review[0].days === 430, detail: r.review.map((x) => x.item.id + ' (' + x.days + ' d)').join(', ') };
  });
  check('Escena 5: a 90 días entran A18 y A04 (120 días)', () => {
    const r = dormantItems(ws(), 'alex', 90, ws().referenceDate);
    return { ok: r.review.map((x) => x.item.id).sort().join() === 'A04,A18', detail: r.review.map((x) => x.item.id + ' (' + x.days + ' d)').join(', ') };
  });
  check('Intención de donar y entrega confirmada son estados distintos', () => {
    const T = freshState(today); const w = T.demo; const a = circularIntent(w, 'A18', 'donacion', today);
    const mid = w.items.find((i) => i.id === 'A18').availability;
    confirmCircular(w, a.id, today); confirmCircular(w, a.id, today);
    return { ok: mid === 'disponible' && a.status === 'entregada (demo)' && w.items.find((i) => i.id === 'A18').availability === 'donada', detail: 'intención → ' + mid + ' · entrega → donada' };
  });
  check('Una prenda donada sale de sugerencias y conserva su historial', () => {
    const T = freshState(today); const w = T.demo; const a = circularIntent(w, 'A01', 'donacion', today); confirmCircular(w, a.id, today);
    const c = w.contexts.find((x) => x.id === 'C01'); const g = generateOutfits(w, c, w.profiles[0], {}, today);
    return g.complete.every((x) => !x.itemIds.includes('A01')) && w.wearLogs.find((l) => l.id === 'H01').snapshot.items.some((s) => s.id === 'A01');
  });
  check('Reiniciar demo no borra el espacio personal', () => {
    const T = freshState(today); T.personal = buildPersonalWorkspace(today, { name: 'Prueba' }); addItem(T.personal, { name: 'Camisa azul', category: 'superior', color: 'azul' }, today);
    T.demo.items[0].name = 'Editada'; resetDemo(T, today);
    return T.personal.items.length === 1 && T.demo.items[0].name === 'Camisa blanca';
  });
  check('Exportar e importar valida estructura y propietarios', () => {
    const T = freshState(today); const e = JSON.parse(JSON.stringify(exportState(T, 2)));
    const ok = validateImport(e).ok; const bad = JSON.parse(JSON.stringify(e)); bad.spaces.demo.items[0].ownerId = 'intruso';
    return ok && !validateImport(bad).ok && !validateImport({ app: 'X' }).ok && e.photosOmitted === 2;
  });
  check('Cobertura de Alex: 6 de 7 plantillas completas', () => {
    const r = templateCoverage(ws(), 'alex'); return { ok: r.ok === 6 && r.total === 7, detail: r.ok + ' de ' + r.total };
  });
  check('Texto libre → campos editables', () => {
    const r = parseContextText('Reunión importante en San Isidro, quiero verme profesional y cercano, caminaré bastante y prefiero azul');
    const f = r.fields;
    return { ok: f.occasion === 'reunión' && f.district === 'San Isidro' && f.walking === 'alta' && f.intent.includes('profesionalismo') && f.intent.includes('cercanía') && f.colorsPref[0] === 'azul', detail: r.found.join(' · ') };
  });
  return out;
}
