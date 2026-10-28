/* =====================================================================
   VISTAS: Mi plan, Circular, Mi perfil, recorrido, comprobaciones, proyecto
   ===================================================================== */
function currentFilters() {
  const k = spaceKey() + ':' + (UI.plan.reqId || '');
  return UI.plan.filters[k] || null;
}
function initFilters(req) {
  const p = prof();
  const k = spaceKey() + ':' + req.id;
  if (!UI.plan.filters[k]) {
    UI.plan.filters[k] = { districts: (req.districts && req.districts.length ? req.districts : p.districts || []).slice(), physical: true, deliveryOn: true,
      budget: req.maxBudgetPEN || '', budgetMode: 'total', color: req.color || '', material: req.material || '', size: req.size || '', subtype: req.subtype || '', condition: req.condition || 'nuevo' };
  }
  return UI.plan.filters[k];
}
function filtersForSearch(f) { return Object.assign({}, f, { modality: f.deliveryOn ? 'delivery' : 'recojo' }); }
function pseudoItem(name, category, color) { return { id: 'x', name, category, subtype: deriveSubtype(name, category), color: color || 'gris', cut: 'regular', material: '' }; }

function renderPlan() {
  const t = UI.plan.tab;
  const tabs = '<div class="tabs" role="tablist">' + [['faltantes', 'Necesidades y compras'], ['pedidos', 'Pedidos'], ['calendario', 'Calendario'], ['presupuesto', 'Presupuesto']].map(([id, l]) => '<button role="tab" type="button" data-act="planTab" data-tab="' + id + '" aria-selected="' + (t === id) + '">' + l + '</button>').join('') + '</div>';
  const body = t === 'pedidos' ? renderOrders() : t === 'calendario' ? renderCalendar() : t === 'presupuesto' ? renderBudget() : renderNeeds();
  return sectionTitle('Mi plan', isDemo() ? '<span class="chip sim">Comercios, precios y pedidos simulados</span>' : '', 'Compra con intención') + tabs + body;
}
function renderNeeds() {
  const w = ws(); const p = prof();
  const reqs = w.missing.filter((m) => m.ownerId === p.id);
  const reqCards = reqs.length ? reqs.map(renderRequirement).join('') : '<div class="card">' + emptyState('Sin faltantes guardados', 'Cuando a un outfit le falte una pieza, regístrala desde la tarjeta o aquí.', '<button class="btn" data-act="newReq">Registrar un faltante</button>') + '</div>';
  const plans = w.plans.filter((x) => x.ownerId === p.id);
  const quotes = w.quotes.filter((q) => q.ownerId === p.id);
  const styled = styleCompleteness(p).paletteReady;
  const sugg = styled ? styleSuggestions(w, p.id, p, 4) : versatileSuggestions(w, p.id);
  const value = '<div class="stack">' + sectionTitle('Lo que suma a mi armario', '', 'Valor estimado por combinaciones') +
    '<p class="small muted" style="max-width:70ch">Calculamos las combinaciones válidas y deduplicadas con tus prendas disponibles en tus contextos, antes y después de sumar una candidata. Son posibilidades estimadas, no garantía de uso. Accesorios y reordenamientos no cuentan como combinaciones nuevas.</p>' +
    (styled ? '' : '<div class="card explore row between"><span class="small" style="flex:1;min-width:200px"><b>Sugerencias a tu medida.</b> Con tu subtono, tono de piel y forma del rostro, RELISTO elige colores y cuellos de tu paleta.</span><button class="btn sm primary" data-act="styleOpen">' + IC.palette + 'Completar en 1 minuto</button></div>') +
    (sugg.length ? '<div class="grid two">' + sugg.map((s) => valueCard(s)).join('') + '</div>' : '<div class="note">Con tu armario actual no hay una prenda versátil que sume combinaciones sin duplicar algo que ya tienes.</div>') + '</div>';
  const plansHTML = '<div class="card stack"><span class="eyebrow">Planes de compra</span>' + (plans.length ? plans.map((pl) => '<div class="row between"><span><b>' + esc(pl.id) + '</b> · ' + esc(pl.reason || '') + '<br><span class="small muted">Presupuesto ' + fmtPEN(pl.budgetPEN) + ' · fecha planificada ' + fmtDate(pl.plannedDate) + '</span></span><span class="badge info">' + esc(pl.status) + '</span></div>').join('<hr class="sep">') : '<span class="small muted">Sin planes por ahora.</span>') + '</div>';
  const quotesHTML = '<div class="card stack"><span class="eyebrow">Cotizaciones y enlaces guardados</span>' + (quotes.length ? quotes.map((q) => '<div class="row between"><span><b>' + esc(q.label) + '</b><br><span class="small muted">' + esc(q.detail) + ' · guardada ' + fmtDate(q.date) + '</span></span><span class="badge ' + (q.kind === 'link' ? 'neutral' : 'warn') + '">' + esc(q.status) + '</span></div>').join('<hr class="sep">') + '<p class="tiny muted">Actualiza precios y stock antes de comprar: una cotización guardada puede cambiar.</p>' : '<span class="small muted">Aún no guardas cotizaciones.</span>') + '</div>';
  const alt = '<div class="card soft stack tight"><span class="eyebrow" style="color:inherit">Antes de comprar</span><p class="small">Primero combina y reutiliza. Luego evalúa reparación, préstamo o segunda mano. Una compra solo se recomienda si suma combinaciones reales y no basta con lavar, reparar o reutilizar.</p></div>';
  return '<div class="row"><button class="btn sm" data-act="newReq">' + IC.plus + 'Registrar un faltante</button></div>' + reqCards + value + '<div class="grid two">' + plansHTML + quotesHTML + '</div>' + alt;
}
function valueCard(s) {
  const c = s.candidate; const open = UI.plan.openValue === c.id;
  return '<div class="card stack"><div class="row" style="flex-wrap:nowrap"><div style="width:76px;flex:none">' + thumb(c, { noTag: true }) + '</div><div class="stack tight"><b>' + esc(c.name) + '</b><span class="small">Esta prenda abre nuevas combinaciones: permitiría <b class="num">' + s.added.length + '</b> combinaciones nuevas con tus prendas (de ' + s.before + ' a ' + s.after + ').</span></div></div>' +
    (s.reasons ? '<ul class="clean why stack tight">' + s.reasons.slice(1, 4).map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>' : '') +
    '<span class="tiny muted">Candidata hipotética: talla y material no confirmados. ' + (s.reasons ? 'Sugerencia por tu paleta y reglas de combinación.' : 'Sugerencia por reglas de demostración.') + '</span>' +
    '<div class="row"><button class="btn sm" data-act="toggleValue" data-id="' + c.id + '" aria-expanded="' + open + '">' + (open ? 'Ocultar combinaciones' : 'Ver las ' + s.added.length + ' combinaciones') + '</button><button class="btn sm ghost" data-act="similarCheck" data-name="' + esc(c.name) + '">Ya tengo algo parecido</button></div>' +
    (open ? '<ol class="small" style="margin:0;padding-left:20px;display:grid;gap:3px">' + s.added.map((a) => '<li>' + esc(a.items.map((i) => i.name).join(' + ')) + ' <span class="muted">(' + esc(a.contexts.join(', ')) + ')</span></li>').join('') + '</ol>' : '') + '</div>';
}
function renderRequirement(req) {
  const w = ws(); const p = prof();
  const existing = req.existingCompatibleItemId ? w.items.find((i) => i.id === req.existingCompatibleItemId) : null;
  const similar = ownedItems(w, p.id).filter((i) => !isGone(i) && i.category === req.category && norm(i.color).includes(norm(req.color || '')) && (!req.subtype || norm(i.subtype).includes(norm(req.subtype)) || norm(i.name).includes(norm(req.subtype))));
  const resolved = req.status !== 'abierta';
  const exploring = UI.plan.explore[req.id] || !existing || existing.availability !== 'en reparación';
  let repair = '';
  if (existing && existing.availability === 'en reparación') {
    repair = '<div class="card soft stack tight"><b>Ya tienes estos ' + esc(req.subtype || existing.name) + ': reparación estimada de ejemplo ' + fmtPEN(existing.repairEstimate) + ', listos en ' + esc(existing.repairReadyDays) + ' días</b>' +
      '<span class="small">' + esc(existing.name) + ' (' + existing.id + ') está en reparación. Repararlos evita una compra y conserva una prenda que ya funciona en tu armario.</span>' +
      '<div class="row"><button class="btn sm primary" data-act="resolveItem" data-item="' + existing.id + '">Marcar reparación completada (demo)</button>' + (UI.plan.explore[req.id] ? '' : '<button class="btn sm" data-act="exploreBuy" data-req="' + req.id + '">Explorar compra igualmente</button>') + '</div></div>';
  } else if (existing && isUsable(existing)) {
    repair = '<div class="note ok row between"><span>' + esc(existing.name) + ' ya está disponible. No necesitas comprar para este faltante.</span>' + (UI.plan.explore[req.id] ? '' : '<button class="btn sm" data-act="exploreBuy" data-req="' + req.id + '">Comparar compra igualmente</button>') + '</div>';
  } else if (similar.length) {
    repair = '<div class="note info">Ya tienes algo parecido: ' + esc(similar.map((i) => i.name + ' (' + i.availability + ')').join(', ')) + '.</div>';
  }
  const head = '<div class="row between"><div class="stack tight"><span class="eyebrow">Faltante ' + esc(req.id) + ' · ' + esc(CATEGORIES[req.category] || req.category) + '</span><h3 class="serif" style="font-size:24px">' + esc([req.subtype, req.color].filter(Boolean).join(' ')) + ' · ' + esc(req.size || 'talla por definir') + '</h3></div><span class="badge ' + (resolved ? 'ok' : 'warn') + '">' + esc(req.status) + '</span></div>' +
    '<div class="row">' + [req.material && 'material: ' + req.material, req.condition && 'condición: ' + req.condition, req.maxBudgetPEN && 'hasta ' + fmtPEN(req.maxBudgetPEN), req.neededBy && 'para el ' + fmtDate(req.neededBy)].filter(Boolean).map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>' +
    (req.exclusive ? '<span class="small"><b>Requisitos excluyentes:</b> ' + esc(req.exclusive) + '</span>' : '') +
    (req.refPhotoName ? '<span class="small muted">Foto de referencia adjunta (se usa solo como referencia, no se analiza).</span>' : '') +
    '<div class="row"><button class="btn sm ghost" data-act="editReq" data-req="' + req.id + '">Editar ficha</button></div>';
  let search = '';
  if (exploring && (!resolved || UI.plan.explore[req.id])) search = renderSearch(req);
  return '<div class="card stack">' + head + repair + search + '</div>';
}
function renderSearch(req) {
  const w = ws(); const f = initFilters(req);
  UI.plan.reqId = req.id;
  const res = UI.plan.result[spaceKey() + ':' + req.id];
  const allD = [...new Set(LIMA_DISTRICTS.concat(prof().districts || []))];
  const form = '<div class="stack"><span class="eyebrow">Buscar 3 opciones</span>' +
    '<div class="field"><span class="lbl">Distritos</span><div class="row">' + allD.map((d, i) => '<button type="button" class="chip btnchip" id="dist' + i + '" data-act="toggleList" data-scope="filters" data-path="districts" data-val="' + esc(d) + '" aria-pressed="' + f.districts.includes(d) + '">' + esc(d) + '</button>').join('') + '</div></div>' +
    '<div class="switch-row">' + fCheck('f-phys', 'Tienda física en estos distritos', 'filters', 'physical', f.physical) + fCheck('f-deliv', 'Delivery a mi distrito', 'filters', 'deliveryOn', f.deliveryOn) + '</div>' +
    '<span class="tiny muted">Una tienda que entrega en tu distrito no está ubicada allí. Sin “Delivery”, se compara recojo en tienda (envío S/ 0).</span>' +
    '<div class="form-grid">' + fInput('f-budget', 'Presupuesto (S/)', 'filters', 'budget', f.budget, 'number') +
    fSelect('f-bmode', 'Aplicar presupuesto a', 'filters', 'budgetMode', f.budgetMode, [['total', 'Total (producto + envío)'], ['producto', 'Solo producto']]) +
    fInput('f-mat', 'Material', 'filters', 'material', f.material) + fInput('f-size', 'Talla', 'filters', 'size', f.size) + fInput('f-col', 'Color', 'filters', 'color', f.color) +
    fSelect('f-cond', 'Condición', 'filters', 'condition', f.condition, ['nuevo', 'segunda mano', 'cualquiera']) + '</div>' +
    '<div class="row"><button class="btn primary" data-act="searchOffers" data-req="' + req.id + '">Buscar 3 opciones</button><span class="small muted">' + (isDemo() ? 'Filtra el catálogo ficticio precargado.' : '') + '</span></div></div>';
  if (!isDemo() || !w.offers.length) {
    return '<div data-req-scope="' + req.id + '" class="stack">' + form.replace(/<div class="row"><button class="btn primary" data-act="searchOffers"[\s\S]*$/, '') + '<div class="note info stack tight"><b>Búsqueda real no conectada</b><span>No hay catálogo ni API comercial conectados en esta versión. Puedes guardar un enlace que encontraste: quedará como “sin verificar” y abrirlo no confirma stock ni compra.</span>' +
      '<div class="row"><label class="sr-only" for="link-in">Enlace de producto</label><input class="input" id="link-in" style="flex:1;min-width:200px" placeholder="https://…" value="' + esc(UI.plan.link) + '"' + bindAttr('ui', 'plan.link') + '><button class="btn sm" data-act="saveLink" data-req="' + req.id + '">Guardar enlace</button></div></div>' + '</div>';
  }
  return '<div data-req-scope="' + req.id + '" class="stack">' + form + (res ? renderSearchResults(res, f) : '') + '</div>';
}
function renderSearchResults(res, f) {
  const modality = f.deliveryOn ? 'delivery' : 'recojo';
  const rows = res.results.concat(res.pending);
  const card = (r, pending) => {
    const o = r.offer;
    return '<div class="card stack" style="background:var(--surface-2)"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="width:84px;flex:none">' + thumb(pseudoItem(o.product, 'calzado', o.color), { noTag: true }) + '</div><div class="stack tight" style="min-width:0">' +
      '<div class="row" style="gap:4px"><span class="chip sim">Simulado</span>' + (r.lowestKnown ? '<span class="chip ok">Menor total conocido</span>' : '') + (pending ? '<span class="chip bad">Pendiente de cotizar</span>' : '') + '</div>' +
      '<b>' + esc(o.product) + '</b><span class="small muted">' + esc(o.store) + ' · ' + esc(o.district) + ' · ' + esc(o.branch) + '</span></div></div>' +
      '<div class="row small"><span>Precio <b class="num">' + fmtPEN(o.pricePEN) + '</b></span><span>Envío <b class="num">' + (r.shipping === null ? 'sin cotizar' : fmtPEN(r.shipping)) + '</b></span><span>Total <b class="num">' + (r.total === null ? 'desconocido' : fmtPEN(r.total)) + '</b></span><span>Plazo de ejemplo <b class="num">' + r.eta + ' d</b></span></div>' +
      '<span class="tiny muted">Coincide: ' + esc(r.matches.join(', ')) + (r.pendingData.length ? ' · Pendiente: ' + esc(r.pendingData.join(', ')) : '') + (r.budgetState === 'desconocido' ? ' · No se puede afirmar que cumple el presupuesto' : r.budgetState === 'cumple' ? ' · Dentro del presupuesto' : '') + '</span>' +
      '<div class="row"><button class="btn sm primary" data-act="buyDemo" data-offer="' + o.id + '" data-mod="' + modality + '">Comprar (demo)</button><button class="btn sm ghost" data-act="saveQuote" data-offer="' + o.id + '" data-mod="' + modality + '">Guardar cotización</button></div></div>';
  };
  const table = rows.length ? '<div class="table-wrap"><table><caption class="sr-only">Comparador de ofertas simuladas</caption><thead><tr><th scope="col">Dato</th>' + rows.map((r) => '<th scope="col">' + esc(r.offer.store.replace(' — tienda ficticia', '')) + '</th>').join('') + '</tr></thead><tbody>' +
    [['Producto', (r) => r.offer.product], ['Distrito', (r) => r.offer.district], ['Material', (r) => r.offer.material], ['Talla', (r) => r.offer.size], ['Condición', (r) => r.offer.condition],
      ['Precio', (r) => fmtPEN(r.offer.pricePEN), 1], ['Envío', (r) => r.shipping === null ? 'sin cotizar' : fmtPEN(r.shipping), 1], ['Total conocido', (r) => r.total === null ? 'desconocido' : fmtPEN(r.total), 1],
      ['Plazo (ejemplo)', (r) => r.eta + ' días', 1], ['Stock de ejemplo', (r) => r.stock + ' u.', 1], ['Coincidencias', (r) => r.matches.length + ''], ['Datos pendientes', (r) => r.pendingData.join(', ') || '—'], ['Origen', () => 'Simulado']]
      .map(([label, fn, num]) => '<tr><th scope="row">' + label + '</th>' + rows.map((r) => '<td' + (num ? ' class="num"' : '') + '>' + esc(fn(r)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '';
  return '<div class="stack"><div class="row between"><span class="eyebrow">Resultados · ' + (modality === 'delivery' ? 'delivery' : 'recojo en tienda') + '</span><span class="chip sim">Catálogo ficticio: no son resultados reales</span></div>' +
    res.notes.map((n) => '<div class="note">' + esc(n) + '</div>').join('') +
    (res.results.length ? '<div class="grid two">' + res.results.map((r) => card(r, false)).join('') + '</div>' : '') +
    (res.pending.length ? '<span class="eyebrow">Aparte: total desconocido</span><div class="grid two">' + res.pending.map((r) => card(r, true)).join('') + '</div>' : '') +
    (!rows.length ? '<div class="note bad">Ninguna oferta del catálogo simulado cumple estos filtros.</div>' : '') + table +
    (res.excluded.length ? '<details class="more"><summary>Por qué hay ' + plural(res.excluded.length, 'oferta excluida', 'ofertas excluidas') + '</summary><ul class="small">' + res.excluded.map((e) => '<li>' + esc(e.offer.store) + ': ' + esc(e.reason) + '</li>').join('') + '</ul></details>' : '') +
    '<p class="tiny muted">Orden: requisitos, costo total conocido, disponibilidad y plazo. Ninguna opción con costos desconocidos se declara “la más barata”.</p></div>';
}
function orderCard(o) {
  const nx = nextOrderStatus(o);
  const flow = ORDER_FLOW[o.modality] || ORDER_FLOW.recojo;
  const idx = flow.indexOf(o.status);
  const added = o.addedItemId ? ws().items.find((i) => i.id === o.addedItemId) : null;
  return '<div class="card stack"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="width:76px;flex:none">' + thumb(pseudoItem(o.product, o.category, o.color), { noTag: true }) + '</div><div class="stack tight" style="min-width:0">' +
    '<div class="row" style="gap:4px"><span class="chip sim">Pedido simulado</span><span class="chip num">' + esc(o.id) + '</span></div><b>' + esc(o.product) + '</b>' +
    '<span class="small muted">' + esc(o.store) + ' · ' + esc(o.district) + ' · ' + (o.modality === 'recojo' ? 'sucursal de demostración, sin dirección real' : 'entrega a dirección ficticia') + '</span></div></div>' +
    '<div class="steps" aria-label="Estado del pedido">' + (o.status === 'cancelado' ? '<span class="now">cancelado</span>' : flow.map((s, i) => '<span class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '">' + esc(s.replace(' (simulado)', '')) + '</span>').join('')) + '</div>' +
    '<div class="row small"><span>Talla ' + esc(o.size) + '</span><span>' + esc(o.material) + '</span><span>Total <b class="num">' + fmtPEN(o.total) + '</b></span><span>' + (o.etaDays ? 'Plazo de ejemplo: ' + o.etaDays + ' días' : esc(o.etaText || '')) + '</span></div>' +
    (o.modality === 'recojo' ? '<span class="tiny muted">Código de recojo: ' + esc(o.pickupCode || o.id) + ' (solo existe en esta demo; no es válido en ninguna tienda)</span>' : '') +
    '<div class="row">' + (nx && o.demo && o.status !== 'cancelado' ? '<button class="btn sm primary" data-act="advanceOrder" data-order="' + o.id + '">Avanzar estado de demostración</button>' : '') +
    (!isReceived(o) && o.status !== 'cancelado' ? '<button class="btn sm ghost" data-act="cancelOrder" data-order="' + o.id + '">Cancelar</button>' : '') +
    (isReceived(o) ? (added ? '<span class="chip ok">Añadida al armario como ' + esc(added.name) + '</span>' : '<button class="btn sm primary" data-act="orderToCloset" data-order="' + o.id + '">Revisar ficha y añadir al armario</button>') : '') + '</div></div>';
}
function renderOrders() {
  const w = ws(); const p = prof();
  const os = w.orders.filter((o) => o.ownerId === p.id);
  const pick = os.filter((o) => o.modality === 'recojo');
  const del = os.filter((o) => o.modality !== 'recojo');
  const banner = '<div class="note sim">Demostración: no se realizará ningún pago ni pedido. Los estados avanzan solo cuando pulsas “Avanzar estado de demostración”.</div>';
  if (!os.length) return banner + emptyState('Sin pedidos', isDemo() ? 'Busca opciones desde un faltante y simula una compra.' : 'Los pedidos simulados existen solo en el espacio de demostración. En tu espacio personal, la compra real queda como ampliación futura.', '');
  return banner + '<div class="stack">' + sectionTitle('Mis recogidas', '<span class="chip num">' + pick.length + '</span>') + (pick.length ? '<div class="grid two">' + pick.map(orderCard).join('') + '</div>' : '<span class="small muted">Sin recogidas.</span>') + '</div>' +
    '<div class="stack">' + sectionTitle('Delivery', '<span class="chip num">' + del.length + '</span>') + (del.length ? '<div class="grid two">' + del.map(orderCard).join('') + '</div>' : '<span class="small muted">Sin pedidos con delivery.</span>') + '</div>';
}
function renderCalendar() {
  const w = ws(); const p = prof();
  const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i));
  const logs = w.wearLogs.filter((l) => l.ownerId === p.id && ['planificado', 'elegido', 'usado'].includes(l.status));
  const warnings = [];
  days.forEach((d, i) => {
    const todays = logs.filter((l) => l.date === d && l.status !== 'usado');
    todays.forEach((l) => l.snapshot.items.forEach((s) => {
      const it = w.items.find((x) => x.id === s.id);
      if (it && !isUsable(it)) warnings.push(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }) + ': ' + it.name + ' está ' + it.availability + '.');
      const next = logs.filter((l2) => l2 !== l && l2.status !== 'usado' && l2.date > d && daysBetween(d, l2.date) <= 1 && l2.snapshot.items.some((x) => x.id === s.id));
      if (next.length) warnings.push(it ? it.name + ' aparece en días seguidos: ¿podrás lavarla a tiempo?' : '');
    }));
  });
  return '<div class="note">Planifica la semana. RELISTO avisa si una prenda está por lavar o se repite en días seguidos, pero no marca nada por lavar automáticamente.</div>' +
    [...new Set(warnings.filter(Boolean))].map((x) => '<div class="note bad">' + esc(x) + '</div>').join('') +
    '<div class="cal">' + days.map((d) => {
      const l = logs.filter((x) => x.date === d);
      return '<div class="day' + (d === TODAY ? ' today' : '') + '"><b class="small">' + esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short', year: undefined })) + '</b>' +
        (l.length ? l.map((x) => '<div class="stack tight"><span class="small"><b>' + esc(x.snapshot.name) + '</b></span><span class="badge ' + (LOG_STATUS[x.status] || ['neutral'])[0] + '">' + esc((LOG_STATUS[x.status] || [0, x.status])[1]) + '</span>' +
          (x.status !== 'usado' ? '<button class="btn sm ghost" data-act="cancelChoice" data-log="' + x.id + '">Quitar</button>' : '') + '</div>').join('') : '<span class="tiny muted">Libre</span>') +
        '<button class="btn sm ghost" data-act="planDay" data-date="' + d + '">' + IC.plus + 'Planificar</button></div>';
    }).join('') + '</div>';
}
function renderBudget() {
  const w = ws(); const p = prof();
  const month = TODAY.slice(0, 7);
  const spent = w.orders.filter((o) => o.ownerId === p.id && o.status !== 'cancelado' && (o.createdAt || '').slice(0, 7) === month && o.total !== null).reduce((a, o) => a + o.total, 0);
  const planned = w.plans.filter((x) => x.ownerId === p.id && /evaluando|pendiente|planificado/.test(x.status)).reduce((a, x) => a + (x.budgetPEN || 0), 0);
  const budget = Number(p.monthlyBudget) || 0;
  return '<div class="card stack">' + '<div class="form-grid">' + fInput('b-month', 'Presupuesto mensual orientativo (S/)', 'prof', 'monthlyBudget', p.monthlyBudget ?? '', 'number') +
    fSelect('b-freq', 'Frecuencia deseada de compras', 'prof', 'shoppingFrequency', p.shoppingFrequency, ['cuando lo necesito', 'una vez al mes', 'cada tres meses', 'dos veces al año']) + '</div>' +
    '<div class="kpis"><div class="kpi"><b class="num">' + (budget ? fmtPEN(budget) : '—') + '</b><span>presupuesto del mes</span></div><div class="kpi"><b class="num">' + fmtPEN(spent) + '</b><span>gasto ' + (isDemo() ? 'simulado' : 'registrado') + ' este mes</span></div>' +
    '<div class="kpi"><b class="num">' + fmtPEN(planned) + '</b><span>compras planificadas abiertas</span></div><div class="kpi"><b class="num">' + (budget ? fmtPEN(budget - spent) : '—') + '</b><span>disponible estimado</span></div></div>' +
    '<p class="small muted">El presupuesto es opcional y solo tuyo. Préstamo, segunda mano y reparación suelen costar menos que una prenda nueva: compáralos antes.</p></div>';
}

/* ============================ CIRCULAR ============================ */
function currentThreshold() {
  const k = spaceKey();
  return UI.circ.threshold[k] || (prof() && prof().donationThresholdDays) || 365;
}
const CIRC_STEPS = ['¿La has usado fuera de la app?', '¿La volvemos a combinar?', '¿Necesita reparación?', '¿Quieres venderla, intercambiarla o donarla?'];
function renderCircular() {
  const w = ws(); const p = prof(); const th = currentThreshold();
  const ref = TODAY;
  const r = dormantItems(w, p.id, th, ref);
  const thControls = '<div class="row">' + [365, 180, 90].map((n) => '<button class="chip btnchip" data-act="threshold" data-n="' + n + '" aria-pressed="' + (th === n) + '">' + n + ' días</button>').join('') +
    '<label class="sr-only" for="th-custom">Umbral personalizado en días</label><input class="input" id="th-custom" type="number" min="7" max="2000" style="width:110px" placeholder="Otro" value="' + esc(UI.circ.custom) + '"' + bindAttr('ui', 'circ.custom') + '><button class="btn sm" data-act="thresholdCustom">Aplicar</button></div>';
  const flowCard = (row) => {
    const i = row.item; const step = UI.circ.flow[i.id] || 0;
    const intent = w.circular.find((c) => c.itemId === i.id && c.status === 'intención');
    let body = '';
    if (intent) body = '<div class="note info">Intención registrada: ' + esc(intent.kind === 'donacion' ? 'donar' : intent.kind === 'venta' ? 'vender' : 'prestar o intercambiar') + '. Sigue en “Seguimiento”.</div>';
    else if (step === 0) body = '<div class="row"><button class="btn sm primary" data-act="usedOutside" data-item="' + i.id + '">Sí, registrar un uso hoy</button><button class="btn sm" data-act="circStep" data-item="' + i.id + '" data-step="1">No</button></div>';
    else if (step === 1) body = '<div class="row"><button class="btn sm primary" data-act="useItem" data-item="' + i.id + '">Combinarla ahora</button><button class="btn sm" data-act="circStep" data-item="' + i.id + '" data-step="2">No por ahora</button></div>';
    else if (step === 2) body = '<div class="row"><button class="btn sm primary" data-act="startRepair" data-item="' + i.id + '">Enviar a reparación</button><button class="btn sm" data-act="circStep" data-item="' + i.id + '" data-step="3">No necesita</button></div>';
    else body = '<div class="row"><button class="btn sm primary" data-act="circIntent" data-item="' + i.id + '" data-kind="donacion">Quiero donar</button><button class="btn sm" data-act="circIntent" data-item="' + i.id + '" data-kind="venta">Quiero venderla</button><button class="btn sm" data-act="circIntent" data-item="' + i.id + '" data-kind="prestamo">Prestar o intercambiar</button><button class="btn sm ghost" data-act="circStep" data-item="' + i.id + '" data-step="0">Conservarla</button></div>';
    return '<div class="card stack"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="width:84px;flex:none">' + thumb(i, { noTag: true }) + '</div><div class="stack tight" style="min-width:0"><b>' + esc(i.name) + '</b>' +
      '<span class="small"><b class="num">' + row.days + ' días</b> sin uso ' + (row.basis === 'último uso' ? 'desde el último uso registrado' + (isDemo() ? ' (historial simulado)' : '') : 'desde que la agregaste: nunca se registró un uso, así que no sabemos su historial anterior') + '</span>' +
      '<span class="small muted">Una prenda sin uso puede tener una nueva historia.</span></div></div>' +
      '<div class="steps">' + CIRC_STEPS.map((s, k) => '<span class="' + (k < step ? 'done' : k === step ? 'now' : '') + '">' + (k + 1) + '. ' + esc(s) + '</span>').join('') + '</div>' +
      (intent ? '' : '<b class="small">' + esc(CIRC_STEPS[step]) + '</b>') + body +
      '<details class="more"><summary>Excluir de esta revisión</summary><div class="row" style="margin-top:6px">' + ['temporada', 'ceremonial', 'sentimental', 'trabajo', 'guardada'].map((k) => '<button class="chip btnchip" data-act="toggleExclusion" data-item="' + i.id + '" data-k="' + k + '" aria-pressed="' + !!i.exclusions[k] + '">' + k + '</button>').join('') + '</div></details></div>';
  };
  const review = r.review.length ? '<div class="grid two">' + r.review.map(flowCard).join('') + '</div>' : '<div class="card">' + emptyState('Nada por revisar', 'Ninguna prenda supera ' + th + ' días sin uso registrado. Repetir también es tener estilo.', '') + '</div>';
  const excluded = r.excluded.length ? '<details class="more"><summary>' + plural(r.excluded.length, 'prenda excluida', 'prendas excluidas') + ' de la revisión</summary><ul class="small">' + r.excluded.map((x) => '<li>' + esc(x.item.name) + ' · ' + x.days + ' días · ' + esc(x.exclusions.join(', ')) + ' <button class="btn sm ghost" data-act="clearExclusions" data-item="' + x.item.id + '">Volver a incluir</button></li>').join('') + '</ul></details>' : '';
  const repairs = ownedItems(w, p.id).filter((i) => i.availability === 'en reparación');
  const repairHTML = '<div class="card stack"><span class="eyebrow">Reparaciones</span>' + (repairs.length ? repairs.map((i) => '<div class="row between"><span><b>' + esc(i.name) + '</b>' + (i.repairEstimate ? '<br><span class="small muted">Estimado de ejemplo ' + fmtPEN(i.repairEstimate) + ' · listo en ' + i.repairReadyDays + ' días</span>' : '') + '</span><button class="btn sm" data-act="resolveItem" data-item="' + i.id + '">Marcar reparación completada (demo)</button></div>').join('<hr class="sep">') : '<span class="small muted">No hay prendas en reparación.</span>') + '</div>';
  const actions = w.circular.filter((c) => c.ownerId === p.id && c.kind !== 'revision');
  const kindL = { donacion: 'Donación', venta: 'Venta', prestamo: 'Préstamo / intercambio', reparacion: 'Reparación' };
  const track = '<div class="card stack"><span class="eyebrow">Seguimiento</span>' + (actions.length ? actions.map((a) => {
    const it = w.items.find((i) => i.id === a.itemId);
    return '<div class="stack tight"><div class="row between"><b>' + esc(kindL[a.kind] || a.kind) + ' · ' + esc(it ? it.name : a.itemId) + '</b><span class="badge ' + (/entregada|vendida|acordado|completada/.test(a.status) ? 'ok' : a.status === 'cancelada' ? 'neutral' : 'warn') + '">' + esc(a.status) + '</span></div>' +
      (a.status === 'intención' && a.kind !== 'reparacion' ? '<div class="row"><button class="btn sm" data-act="circDetails" data-id="' + a.id + '">Completar detalles</button><button class="btn sm primary" data-act="circConfirm" data-id="' + a.id + '">' + (a.kind === 'donacion' ? 'Confirmar entrega de demostración' : a.kind === 'venta' ? 'Confirmar venta (demo)' : 'Confirmar acuerdo (demo)') + '</button><button class="btn sm ghost" data-act="circCancel" data-id="' + a.id + '">Cancelar</button></div>' : '') +
      (a.destination ? '<span class="tiny muted">Destino: ' + esc(a.destination) + '</span>' : '') + '</div>';
  }).join('<hr class="sep">') : '<span class="small muted">Sin acciones en curso. “Quiero donar” solo registra la intención; la entrega se confirma aparte.</span>') +
    '<p class="tiny muted">RELISTO no propone entidades receptoras ni servicios de recojo sin verificar su existencia, ubicación y condiciones.</p></div>';
  const recentCir = (w.circular.find((c) => c.ownerId === p.id && c.kind === 'revision' && c.status === 'sugerida'));
  const period = UI.circ.period;
  const h = habits(w, p.id, TODAY, period);
  const cpu = h.cpu.filter((x) => x.cpu !== null).sort((a, b) => b.cpu - a.cpu).slice(0, 4);
  const habitsHTML = '<div class="card stack"><div class="row between"><span class="eyebrow">Panel de hábitos</span><div class="row">' + [30, 90].map((n) => '<button class="chip btnchip" data-act="period" data-n="' + n + '" aria-pressed="' + (period === n) + '">' + n + ' días</button>').join('') + '</div></div>' +
    '<div class="kpis"><div class="kpi"><b class="num">' + h.distinctUsed + '</b><span>prendas distintas usadas en ' + period + ' días</span></div><div class="kpi"><b class="num">' + h.pctWithUse + '%</b><span>artículos con al menos un uso</span></div>' +
    '<div class="kpi"><b class="num">' + h.totalUses + '</b><span>usos registrados</span></div><div class="kpi"><b class="num">' + h.recovered + '</b><span>prendas recuperadas del desuso</span></div>' +
    '<div class="kpi"><b class="num">' + h.repairs + '</b><span>reparaciones completadas</span></div><div class="kpi"><b class="num">' + h.donations + '</b><span>donaciones entregadas</span></div></div>' +
    (cpu.length ? '<div class="stack tight"><span class="small"><b>Costo por uso</b> (precio registrado ÷ usos registrados)</span>' + cpu.map((x) => '<div class="row between small"><span>' + esc(x.item.name) + '</span><span class="num">' + fmtPEN(Math.round(x.cpu * 100) / 100) + ' · ' + x.uses + ' usos</span></div>').join('') + '</div>' : '') +
    '<p class="tiny muted">El costo por uso se basa en los usos registrados y puede no incluir usos anteriores' + (isDemo() ? '; en la demo, los usos base y los precios son ficticios' : '') + '. No mostramos agua, CO₂ ni impacto de donación: no hay metodología verificable para calcularlos aquí. Repetir un outfit no demuestra por sí solo una compra evitada.</p></div>';
  return sectionTitle('Dale más vida', '', 'Circular') +
    '<div class="card soft stack tight"><b class="serif" style="font-size:22px">Antes de comprar, descubre otra combinación.</b><span class="small">Reutiliza, repara, presta, vende o dona. Todas son decisiones voluntarias.</span></div>' +
    '<div class="card stack"><span class="eyebrow">Umbral de revisión: ' + th + ' días sin uso registrado</span>' + thControls + '<span class="tiny muted">El tiempo cuenta desde el último uso confirmado. Si nunca se registró un uso, desde la incorporación. Un armario recién cargado no permite saber si una prenda llevaba un año sin usarse.</span></div>' +
    (recentCir ? '<div class="note info">Caso sugerido: ' + esc(recentCir.reason) + '. ' + esc(recentCir.note) + '</div>' : '') +
    sectionTitle('Para revisar', '<span class="chip num">' + r.review.length + '</span>') + review + excluded +
    '<div class="grid two">' + repairHTML + track + '</div>' + habitsHTML +
    '<div class="note">Reciclaje textil: si una prenda está desgastada o rota sin arreglo, márcalo al completar los detalles de donación; RELISTO te lo indicará como destino adecuado, sin inventar puntos de reciclaje.</div>';
}

/* ============================ MI PERFIL ============================ */
const MONK = ['#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96', '#a07e56', '#825c43', '#604134', '#3a312a', '#292420'];
function renderProfile() {
  const p = prof(); const t = UI.profTab;
  const tabs = [['esenciales', 'Lo esencial'], ['medidas', 'Medidas y ajuste'], ['color', 'Color y rostro'], ['figura', 'Tu figura'], ['comodidad', 'Comodidad'], ['estilo', 'Estilo'], ['datos', 'Privacidad y datos']];
  const tabsHTML = '<div class="tabs" role="tablist">' + tabs.map(([id, l]) => '<button role="tab" type="button" data-act="profTab" data-tab="' + id + '" aria-selected="' + (t === id) + '">' + l + '</button>').join('') + '</div>';
  const skip = (section) => '<button class="btn sm ghost" data-act="skip" data-section="' + section + '">Prefiero omitir</button>';
  let body = '';
  if (t === 'esenciales') {
    body = renderStyleNudge(false) + '<div class="card stack"><p class="small muted">Solo lo mínimo para empezar: nombre o alias, un estilo y una ocasión. Todo lo demás es opcional y puedes completarlo después.</p><div class="form-grid">' +
      fInput('p-name', 'Nombre o alias', 'prof', 'name', p.name) +
      fSelect('p-gender', 'Género', 'prof', 'gender', p.gender, ['masculino', 'femenino', 'otro', 'autodescripción', 'prefiero no indicarlo']) +
      (p.gender === 'autodescripción' ? fInput('p-gself', 'Autodescripción', 'prof', 'genderSelf', p.genderSelf || '') : '') +
      fSelect('p-expr', 'Expresión de vestimenta', 'prof', 'expression', p.expression, ['masculina', 'femenina', 'andrógina', 'mixta', 'sin preferencia']) +
      fInput('p-city', 'Ciudad', 'prof', 'city', p.city) + fSelect('p-cur', 'Moneda', 'prof', 'currency', p.currency || 'PEN', [['PEN', 'Soles (S/)']]) + '</div>' +
      '<p class="tiny muted">La expresión es independiente del género. RELISTO no limita categorías ni prendas por género.</p>' +
      '<div class="field"><span class="lbl">Tus distritos habituales</span>' + chipToggles('prof', 'districts', LIMA_DISTRICTS, p.districts, 'pd') + '</div><div class="row">' + skip('identidad') + '</div></div>';
  } else if (t === 'medidas') {
    const ft = p.heightCm ? Math.floor(p.heightCm / 30.48) : null; const inch = p.heightCm ? Math.round((p.heightCm / 2.54) - ft * 12) : null;
    body = '<div class="grid two"><div class="card stack"><div class="form-grid">' + fInput('p-h', 'Altura (cm)', 'prof', 'heightCm', p.heightCm ?? '', 'number') +
      '<div class="field"><span class="lbl">Equivalencia</span><span class="small num" style="padding:9px 0">' + (p.heightCm ? '≈ ' + ft + ' ft ' + inch + ' in' : '—') + '</span></div>' +
      fSelect('p-ss', 'Sistema de tallas', 'prof', 'sizeSystem', p.sizeSystem, ['EU', 'US', 'UK', 'letras', 'otro']) +
      fInput('p-ts', 'Talla superior', 'prof', 'topSize', p.topSize || '') + fInput('p-bs', 'Talla inferior', 'prof', 'bottomSize', p.bottomSize || '') + fInput('p-sh', 'Calzado', 'prof', 'shoeSize', p.shoeSize || '') +
      fSelect('p-fit', 'Ajuste preferido', 'prof', 'fit', p.fit || 'regular', ['ceñido', 'regular', 'relajado', 'oversized']) +
      fSelect('p-build', 'Complexión (opcional)', 'prof', 'build', p.build, ['delgada', 'media', 'atlética', 'robusta', 'autodescripción', 'prefiero omitir']) +
      ['pecho', 'cintura', 'cadera', 'entrepierna', 'pie'].map((m) => fInput('p-m-' + m, (m === 'pecho' ? 'Pecho/busto' : m === 'pie' ? 'Largo del pie' : m.charAt(0).toUpperCase() + m.slice(1)) + ' (cm)', 'prof', 'measures.' + m, p.measures[m], 'number')).join('') + '</div>' +
      '<p class="tiny muted">Las complexiones son etiquetas de interfaz, no una clasificación certificada. No pedimos peso ni calculamos IMC. Usamos la serie ISO 8559 solo como referencia conceptual de medidas; no hay equivalencia universal entre tallas de marcas: verifica siempre con la tabla de la tienda.</p><div class="row">' + skip('medidas') + '</div></div>' +
      '<div class="card stack"><span class="eyebrow">Cómo medir</span><svg viewBox="0 0 200 230" style="max-width:220px" role="img" aria-label="Figura con líneas de medida"><g fill="none" stroke="var(--ink-3)" stroke-width="2"><circle cx="100" cy="28" r="16"/><path d="M70 60h60l10 70-14 4-6-50v66l8 70h-20l-8-62-8 62H72l8-70V88l-6 50-14-4z"/></g>' +
      '<g stroke="var(--accent)" stroke-width="2.5"><line x1="72" y1="78" x2="128" y2="78"/><line x1="76" y1="104" x2="124" y2="104"/><line x1="76" y1="128" x2="124" y2="128"/><line x1="100" y1="150" x2="100" y2="214"/></g>' +
      '<g font-size="11" fill="var(--ink-2)" font-family="Manrope, sans-serif"><text x="134" y="82">pecho</text><text x="130" y="108">cintura</text><text x="130" y="132">cadera</text><text x="106" y="190">entrepierna</text></g></svg>' +
      '<ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Usa una cinta flexible, sobre ropa ligera, sin apretar.</li><li>Pecho/busto: la parte más amplia, cinta horizontal.</li><li>Cintura: la parte más estrecha del torso.</li><li>Cadera: la parte más amplia, con pies juntos.</li><li>Entrepierna: desde la ingle hasta el suelo, sin calzado.</li><li>Pie: del talón al dedo más largo, de pie.</li></ul></div></div>';
  } else if (t === 'color') {
    body = renderStyleNudge(true) + '<div class="card stack"><span class="eyebrow">Subtono (lo declaras tú)</span><div class="under-grid">' + Object.entries(PALETTES).map(([k, v]) => '<button type="button" class="under-card" data-act="profSet" data-path="undertone" data-val="' + k + '" aria-pressed="' + (p.undertone === k) + '"><span class="under-sw">' + v.colors.slice(0, 4).map((c) => '<i style="background:' + colorHex(c) + '"></i>').join('') + '</span><b>' + esc(cap1(k)) + '</b><span class="tiny">' + esc(v.hint) + '</span></button>').join('') +
      '<button type="button" class="under-card" data-act="profSet" data-path="undertone" data-val="no sé" aria-pressed="' + (p.undertone === 'no sé') + '"><b>No sé</b><span class="tiny">Prueba: ¿te favorecen más las joyas doradas (cálido) o plateadas (frío)? ¿Ambas? (neutro)</span></button></div></div>' +
      '<div class="card stack"><span class="eyebrow">Tono de piel (opcional, selección manual)</span><div class="row">' + MONK.map((c, i) => '<button class="tone-swatch" style="background:' + c + '" data-act="setTone" data-n="' + (i + 1) + '" aria-pressed="' + (p.skinTone === 'Monk ' + (i + 1) + ', seleccionado manualmente') + '" aria-label="Tono Monk ' + (i + 1) + '"></button>').join('') + '<button class="btn sm ghost" data-act="setTone" data-n="0">Prefiero omitir</button></div>' +
      '<span class="tiny muted">Referencia: Escala Monk de tono de piel (Dr. Ellis Monk, publicada por Google, CC BY 4.0). Actual: ' + esc(p.skinTone) + '. RELISTO no infiere etnia, atractivo, salud ni personalidad.</span></div>' +
      '<div class="card stack"><span class="eyebrow">Forma del rostro (visagismo, opcional)</span>' + faceShapePicker(p) + '</div>' +
      '<div class="card stack"><span class="eyebrow">Cabello y ojos (opcional)</span><div class="field"><span class="lbl">Color de cabello</span><div class="swatches">' + Object.entries(HAIR_COLORS).filter(([k]) => k !== 'otro').map(([k, hx]) => '<button type="button" class="swatch" style="background:' + hx + '" data-act="profSet" data-path="hair" data-val="' + esc(k) + '" aria-pressed="' + (p.hair === k) + '" aria-label="' + esc(k) + '" title="' + esc(k) + '"></button>').join('') + '</div></div>' +
      '<div class="form-grid">' + fInput('p-eyes', 'Ojos', 'prof', 'eyes', p.eyes) + '</div></div>' +
      renderPaletteCard(p) + '<p class="small muted">Las armonías de color y el visagismo son sugerencias flexibles basadas en lo que declaras, no reglas. Tu gusto manda.</p><div class="row">' + skip('color') + '</div>';
  } else if (t === 'figura') {
    body = renderFigureTab();
  } else if (t === 'comodidad') {
    body = '<div class="card stack"><div class="form-grid">' + fSelect('p-heat', 'Sensibilidad al calor', 'prof', 'comfort.calor', p.comfort.calor, ['baja', 'normal', 'alta']) + fSelect('p-cold', 'Sensibilidad al frío', 'prof', 'comfort.frio', p.comfort.frio, ['baja', 'normal', 'alta']) +
      fSelect('p-cov', 'Preferencia de cobertura', 'prof', 'comfort.coverage', p.comfort.coverage, ['sin preferencia', 'más cobertura', 'cobertura estándar', 'menos cobertura']) + fInput('p-mob', 'Movilidad (opcional)', 'prof', 'comfort.mobility', p.comfort.mobility) + '</div>' +
      fCheck('p-comfy', 'Prefiero calzado cómodo y plano', 'prof', 'comfort.comfyShoes', p.comfort.comfyShoes) +
      '<div class="field"><span class="lbl">Fibras o tejidos que me incomodan (se excluyen antes de puntuar)</span>' + chipToggles('prof', 'comfort.avoidFabrics', ['lana', 'poliéster', 'nylon', 'lino', 'viscosa', 'denim', 'punto'], p.comfort.avoidFabrics, 'af') + '</div>' +
      '<div class="field"><label for="p-need">Una necesidad personal (sin dar explicaciones)</label><textarea class="input" id="p-need"' + bindAttr('prof', 'comfort.note') + '>' + esc(p.comfort.note) + '</textarea></div><div class="row">' + skip('comodidad') + '</div></div>';
  } else if (t === 'estilo') {
    const cols = ['blanco', 'negro', 'gris', 'beige', 'marfil', 'azul marino', 'celeste', 'azul', 'terracota', 'burdeos', 'salvia', 'oliva', 'camel', 'arena'];
    body = '<div class="card stack"><span class="eyebrow">Estilos (puedes mezclarlos)</span><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))">' + STYLE_DEFS.map(([s, def]) => {
      const key = s === 'urbano/streetwear' && (p.styles || []).includes('urbano') ? 'urbano' : s;
      return '<button class="style-card" data-act="toggleList" data-scope="prof" data-path="styles" data-val="' + esc(key) + '" aria-pressed="' + (p.styles || []).includes(key) + '"><b>' + esc(s) + '</b><span>' + esc(def) + '</span></button>';
    }).join('') + '</div></div>' +
      '<div class="card stack"><div class="field"><span class="lbl">Colores favoritos</span>' + chipToggles('prof', 'colors', cols, p.colors, 'fc') + '</div><div class="field"><span class="lbl">Colores que prefiero evitar</span>' + chipToggles('prof', 'avoidColors', cols, p.avoidColors, 'ac') + '</div>' +
      '<div class="form-grid">' + fSelect('p-pat', 'Estampados', 'prof', 'patterns', p.patterns, ['ninguno', 'algunos', 'muchos']) + fSelect('p-con', 'Nivel de contraste', 'prof', 'contrast', p.contrast, ['bajo', 'medio', 'alto']) +
      fInput('p-sil', 'Silueta preferida', 'prof', 'silhouette', p.silhouette) + fInput('p-len', 'Largo preferido', 'prof', 'length', p.length) +
      fSelect('p-exp', 'Nivel de exploración', 'prof', 'exploration', p.exploration, ['seguro', 'equilibrado', 'experimental']) + fSelect('p-rep', 'Repetir o variar', 'prof', 'repeat', p.repeat, [['repetir', 'Me gusta repetir combinaciones'], ['variar', 'Prefiero variar']]) + '</div>' +
      '<div class="field"><span class="lbl">Fibras o materiales preferidos</span>' + chipToggles('prof', 'fibers', ['algodón', 'lino', 'lana', 'seda', 'poliéster', 'viscosa', 'cuero'], p.fibers, 'fb') + '</div>' +
      '<div class="field"><span class="lbl">Tejidos y acabados preferidos (no son fibras)</span>' + chipToggles('prof', 'weaves', ['denim', 'punto', 'sarga', 'satén', 'popelina', 'piqué', 'jersey'], p.weaves, 'wv') + '</div>' +
      '<div class="field"><span class="lbl">Preferencias declaradas</span>' + chipToggles('prof', 'values', ['vegana', 'segunda mano', 'reparable'], p.values, 'vl') + '</div></div>' +
      '<div class="card stack"><span class="eyebrow">Aprendizaje</span><p class="small">RELISTO aprende solo de lo que expresas (“Me gusta”, “No es para mí” y sus motivos) y de usos confirmados. Una sola elección no te encasilla y no hacer clic no cuenta como rechazo.</p>' +
      '<span class="small muted">Ajustes aprendidos: ' + (Object.keys(p.learned.itemAdj).length + Object.keys(p.learned.colorAdj).length) + '</span><div class="row"><button class="btn sm" data-act="resetLearned">Restablecer preferencias aprendidas</button></div></div>';
  } else {
    body = renderDataTab();
  }
  return sectionTitle('Mi perfil', isDemo() ? '<span class="chip sim">Perfil ficticio de ejemplo</span>' : '', 'Preferencias, medidas, privacidad') + tabsHTML + body;
}
function renderDataTab() {
  const t = saveStateText(); const p = prof();
  const photoCount = Object.keys(PHOTOS).length;
  return renderAccountCard() + '<div class="grid two"><div class="card stack"><span class="eyebrow">Conservación de datos</span><div class="note ' + (CAP.storage === 'saved' ? 'ok' : 'info') + '"><b>' + esc(t.strong) + '.</b> ' + esc(t.rest) + '</div>' +
    (IS_PWA ? '<p class="small">Tus fotos se guardan en este teléfono (' + photoCount + ' ahora' + (CAP.usage && CAP.usage.usage ? ', unos ' + Math.max(1, Math.round(CAP.usage.usage / 1048576)) + ' MB en total' : '') + '). Nada se sube a internet. Si pierdes o cambias el teléfono, o borras los datos del navegador, solo los recuperas con un respaldo.</p>' +
      '<div class="card soft stack tight"><b>Respaldo completo</b><span class="small">Un archivo con tus prendas, historial y fotos. Guárdalo en Archivos, Drive o tu correo, y restáuralo aquí abajo con “Elegir archivo”. El archivo no está cifrado: guárdalo en un lugar privado.</span><div class="row"><button class="btn sm primary" data-act="fullBackup">Crear respaldo completo</button></div></div>' + renderInstallCard(true) +
      '<span class="tiny muted">Versión de la app: ' + esc(APP_VERSION) + (CAP.persisted ? ' · almacenamiento persistente concedido' : '') + '</span>'
      : '<p class="small">Las fotos se muestran solo durante esta sesión y no se guardan ni se exportan' + (photoCount ? ' (tienes ' + photoCount + ' en esta sesión)' : '') + '. Las ilustraciones de la demo se reconstruyen a partir de sus atributos.</p>') +
    '<div class="row"><button class="btn sm" data-act="exportJSON">' + (IS_PWA ? 'Exportar solo texto' : 'Exportar JSON') + '</button></div>' +
    (UI.exportText ? '<div class="field"><label for="exp-out">Copia este texto para conservar tus datos</label><textarea class="input" id="exp-out" readonly style="min-height:120px;font-family:ui-monospace,monospace;font-size:12px">' + esc(UI.exportText) + '</textarea><div class="row"><button class="btn sm primary" data-act="copyExport">Copiar</button><span class="tiny muted">Las fotos se omiten: deberás volver a adjuntarlas.</span></div></div>' : '') +
    '<hr class="sep"><span class="eyebrow">Importar</span><div class="field"><label for="imp-in">Pega un JSON exportado de RELISTO</label><textarea class="input" id="imp-in" style="min-height:90px;font-family:ui-monospace,monospace;font-size:12px"' + bindAttr('ui', 'importText') + '>' + esc(UI.importText) + '</textarea></div>' +
    '<div class="row"><button class="btn sm" data-act="importJSON">Revisar importación</button><label class="btn sm ghost" for="imp-file" tabindex="0">Elegir archivo .json</label><input id="imp-file" type="file" accept="application/json,.json" hidden data-act-change="importFile"></div>' +
    (UI.importMsg ? '<div class="note ' + (UI.importMsg.ok ? 'ok' : 'bad') + '">' + UI.importMsg.html + '</div>' : '') + '</div>' +
    '<div class="card stack"><span class="eyebrow">Espacios</span><p class="small">La demo y tu espacio personal están separados. Reiniciar la demo solo afecta a datos ficticios.</p>' +
    '<div class="row"><button class="btn sm" data-act="askResetDemo">Reiniciar demo</button>' + (S.personal ? '<button class="btn sm ghost" data-act="askDeletePersonal">Borrar mi espacio personal</button>' : '<button class="btn sm primary" data-act="startPersonal">Empezar con mi armario</button>') + '</div>' +
    '<hr class="sep"><span class="eyebrow">Accesibilidad</span>' + fCheck('p-rm', 'Reducir movimiento', 'prof', 'reduceMotion', p.reduceMotion) +
    '<hr class="sep"><span class="eyebrow">Integraciones</span><ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">' +
    '<li>Sugerencias de atributos por foto con IA: ' + (CAP.aiImages ? 'disponible al agregar una prenda con foto; se activa solo si pulsas “Sugerir con IA”.' : IS_PWA ? 'solo en la versión dentro de Claude; aquí completas la ficha a mano.' : 'no disponible en esta vista.') + '</li>' +
    '<li>Clima automático: no conectado (adaptador futuro).</li><li>Búsqueda real de productos: no conectada (adaptador futuro).</li><li>Comercio y pagos reales: no conectados (adaptador futuro).</li></ul>' +
    '<p class="tiny muted">Eventos de uso guardados localmente en este espacio: ' + ws().events.length + ' (sin fotos, medidas ni direcciones). No se envía analítica a terceros.</p></div></div>';
}

/* ============================ RECORRIDO, PRUEBAS, PROYECTO ============================ */
const SCENES = [
  ['Resuelve mi mañana', 'Alex · Reunión con confianza. Pulsa “Arma mi día”: verás OA1, OA2 y OA3. “Ver tres más” suma OA4, OA5 y OA6 (máximo seis). La camisa de rayas (por lavar) y los Oxford (en reparación) quedan fuera. Elige uno y confirma “Sí, lo usé”: el historial y los contadores cambian una sola vez.'],
  ['Vestido y accesorios', 'Valeria · Cena con estilo. “Burdeos protagonista” cubre 3 de 3 unidades: el vestido vale por superior e inferior. Quita el collar con “Cambiar una prenda”: sigue en 100%.'],
  ['Falta una pieza', 'Alex · Evento formal. “Formal pendiente de calzado” tiene 3 de 4 unidades (75%). Primero se ofrece reparar tus Oxford; al marcarlos disponibles e incorporarlos, llega a 100%.'],
  ['Compara y recoge', 'Alex · Mi plan. Con tres distritos y S/350, en delivery compara S/267, S/301 y una opción pendiente de cotizar. Simula la compra, avanza su estado y añádela al armario una vez. También puedes simular el recojo de DEMO-1042.'],
  ['Una nueva vida', 'Alex · Circular. A 365 días aparece el suéter camel (430 días de desuso simulado). Baja a 90: entra la camiseta terracota (120 días). “Quiero donar” registra intención; la entrega se confirma aparte.'],
  ['Empiezo con lo mío', 'Abre un espacio personal vacío sin borrar la demo. Registra una prenda con foto real. Con solo superior e inferior, la propuesta parcial queda en 2 de 3 (67%): no se inventan zapatos.']
];
function renderTour() {
  return sectionTitle('Recorrido guiado', '<button class="btn sm" data-act="askResetDemo">Reiniciar demo</button>', 'Seis escenas independientes') +
    '<p class="muted" style="max-width:70ch">Cada escena prepara el perfil, el contexto y la pantalla. Puedes probarlas en cualquier orden. Reiniciar la demo nunca toca tu espacio personal.</p>' +
    '<div class="grid cards">' + SCENES.map(([t, d], i) => '<div class="card scene"><span class="n">' + (i + 1) + '</span><h3 class="serif" style="font-size:22px">' + esc(t) + '</h3><p class="small">' + esc(d) + '</p><div class="row"><button class="btn sm primary" data-act="scene" data-n="' + (i + 1) + '">Ir a la escena</button></div></div>').join('') + '</div>';
}
function renderTests() {
  const r = UI.tests;
  return sectionTitle('Comprobaciones', '<button class="btn primary" data-act="runTests">' + IC.flask + (r ? 'Volver a ejecutar' : 'Ejecutar comprobaciones') + '</button>', 'Verificación automática') +
    '<p class="muted" style="max-width:70ch">Pruebas de reglas que se ejecutan en tu navegador sobre una copia nueva de la semilla: conteos, IDs, completitud, máximo seis, idempotencia, ofertas, pedidos, desuso y separación de espacios. No modifican tus datos.</p>' +
    (r ? '<div class="card"><div class="row between" style="margin-bottom:8px"><b>' + r.filter((x) => x.ok).length + ' de ' + r.length + ' comprobaciones superadas</b><span class="badge ' + (r.every((x) => x.ok) ? 'ok' : 'bad') + '">' + (r.every((x) => x.ok) ? 'Todo en orden' : 'Revisar fallos') + '</span></div>' +
      r.map((x) => '<div class="test-row"><span class="mark ' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✓' : '✗') + '</span><span style="min-width:0"><b>' + esc(x.name) + '</b>' + (x.detail ? '<br><span class="small muted">' + esc(x.detail) + '</span>' : '') + '</span></div>').join('') + '</div>' : '') +
    '<div class="note">Fuera de estas pruebas quedan aspectos visuales (desbordamientos en móvil, contraste) y la carga real de fotos: compruébalos usando la app.</div>';
}
function renderAbout() {
  const ev = ws().events;
  const firstGen = ev.find((e) => e.type === 'generate'); const firstChoose = ev.find((e) => e.type === 'choose');
  const tfo = firstGen && firstChoose ? Math.max(0, Math.round((new Date(firstChoose.at) - new Date(firstGen.at)) / 1000)) : null;
  const chosen = ev.filter((e) => e.type === 'choose').length; const worn = ev.filter((e) => e.type === 'confirm_wear').length;
  const block = (t, txt) => '<div class="card stack tight"><span class="eyebrow">' + t + '</span><p class="small">' + txt + '</p></div>';
  return sectionTitle('Sobre el proyecto', '<span class="chip">Vista de Product Management</span>', 'RELISTO') +
    '<div class="card soft stack"><b class="serif" style="font-size:26px">Descubre qué ponerte con lo que ya tienes y compra con intención.</b><span class="small">Vístete rápido. Dale más vida a tu ropa.</span></div>' +
    '<div class="grid cards">' +
    block('Segmento inicial', 'Personas adultas que estudian o trabajan en Lima, con armario variado, que quieren reducir el esfuerzo diario de elegir ropa. Ampliable a otras ciudades.') +
    block('Problema', 'Decidir qué vestir consume tiempo; se repiten pocas prendas, se olvidan otras y se compra sin saber cuánto aportará la compra al armario.') +
    block('Trabajo por resolver', '“Cuando tengo una actividad, quiero elegir rápidamente una combinación que me guste, me resulte cómoda y sea adecuada, aprovechando mi ropa disponible.”') +
    block('Propuesta de valor', 'Decisión rápida + inventario real + aprendizaje de preferencias expresadas + compras que amplían combinaciones + circulación responsable.') +
    block('Hipótesis a validar', '1) Con unas cinco prendas compatibles ya hay valor percibido. 2) La carga inicial del armario es la principal barrera de activación. 3) Ver la completitud y las alternativas reduce compras impulsivas. 4) Las personas confirman el uso si el gesto es de un toque.') +
    block('MVP (este prototipo)', 'Perfil mínimo, armario con fotos de sesión, generador determinista 3→6, completitud transparente, historial con confirmación de uso, comparador y pedido simulados, desuso y donación con estados separados, exportación JSON.') +
    block('Ampliación futura', 'Etiquetado por imagen con IA (opcional y confirmado por la persona), clima real, catálogos autorizados con stock confirmado, checkout seguro del comercio, sincronización de fotos, entidades de donación verificadas.') +
    block('Modelo de negocio (hipótesis)', 'Acceso básico gratuito a armario y outfits; funciones avanzadas opcionales. Una futura afiliación sería visible y nunca desplazaría un outfit completo y adecuado.') +
    block('Criterios de éxito', '<b>Métrica principal:</b> outfits confirmados como usados por usuario activo semanal (activo = completó una acción central esa semana). <b>Complementarias:</b> tiempo al primer outfit elegido, paso de elección a uso, retorno semanal, diversidad de prendas usadas, satisfacción y rechazos por disponibilidad.') +
    '</div><div class="card stack"><span class="eyebrow">Eventos locales de esta sesión (ejemplo, no evidencia de demanda)</span><div class="kpis">' +
    '<div class="kpi"><b class="num">' + ev.filter((e) => e.type === 'generate').length + '</b><span>generaciones</span></div><div class="kpi"><b class="num">' + chosen + '</b><span>elecciones</span></div><div class="kpi"><b class="num">' + worn + '</b><span>usos confirmados</span></div>' +
    '<div class="kpi"><b class="num">' + (tfo === null ? '—' : tfo + ' s') + '</b><span>tiempo al primer outfit elegido</span></div><div class="kpi"><b class="num">' + (chosen ? Math.round((100 * worn) / chosen) + '%' : '—') + '</b><span>de elección a uso</span></div></div>' +
    '<p class="tiny muted">No se ha realizado investigación ni validación de mercado. Estas cifras son eventos locales de prueba.</p></div>';
}
