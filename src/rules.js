/* =====================================================================
   REGLAS: funciones puras (sin DOM). Fechas, armario, completitud,
   generador de outfits, ofertas, pedidos, desuso y métricas.
   ===================================================================== */
const TZ = 'America/Lima';
const DAY_MS = 86400000;
const SCHEMA_VERSION = 1;

/* ---------- Fechas (cadenas YYYY-MM-DD en hora de Lima) ---------- */
function todayLima(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now || new Date());
}
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}
function daysBetween(a, b) { // b - a en días
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / DAY_MS);
}
function fmtDate(iso, opts) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', Object.assign({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, opts || {})).format(new Date(Date.UTC(y, m - 1, d)));
}
function fmtPEN(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Desconocido';
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------- Vocabulario ---------- */
const CATEGORIES = {
  superior: 'Parte superior', inferior: 'Parte inferior', cuerpo_completo: 'Cuerpo completo',
  capa: 'Capa', calzado: 'Calzado', bolso: 'Bolso o mochila', accesorio: 'Accesorio'
};
const ROLE_OF = { superior: 'top', inferior: 'bottom', cuerpo_completo: 'full', capa: 'layer', calzado: 'shoes', bolso: 'accessory', accesorio: 'accessory' };
const AVAILABILITY = ['disponible', 'por lavar', 'en lavandería', 'en reparación', 'prestada', 'guardada por temporada', 'reservada para un evento', 'vendida', 'donada'];
const AVAIL_NORMALIZE = { en_reparacion: 'en reparación', por_lavar: 'por lavar', en_lavanderia: 'en lavandería', guardada: 'guardada por temporada', reservada: 'reservada para un evento' };
const GONE = ['vendida', 'donada'];
const SUBTYPES = [ // orden: lo más específico primero
  ['sobrecamisa', 'sobrecamisa'], ['camiseta', 'camiseta'], ['polo', 'polo'], ['camisa', 'camisa'], ['blusa', 'blusa'], ['top', 'top'],
  ['sueter', 'suéter'], ['chompa', 'suéter'], ['jean', 'jean'], ['cargo', 'cargo'], ['chino', 'chino'], ['pantalon de vestir', 'pantalón de vestir'],
  ['short', 'short'], ['falda', 'falda'], ['pantalon', 'pantalón'], ['vestido', 'vestido'], ['enterizo', 'enterizo'], ['blazer', 'blazer'],
  ['casaca', 'casaca'], ['chaqueta', 'casaca'], ['abrigo', 'abrigo'], ['chaleco', 'chaleco'], ['zapatillas', 'zapatillas'], ['oxford', 'oxford'],
  ['mocasin', 'mocasines'], ['botines', 'botines'], ['botas', 'botines'], ['sandalia', 'sandalias'], ['zapatos', 'zapatos'], ['cinturon', 'cinturón'],
  ['reloj', 'reloj'], ['collar', 'collar'], ['mochila', 'mochila'], ['bolso', 'bolso'], ['corbata', 'corbata'], ['panuelo', 'pañuelo'],
  ['sombrero', 'sombrero'], ['lentes', 'lentes']
];
function deriveSubtype(name, category) {
  const n = norm(name);
  for (const [k, v] of SUBTYPES) if (n.includes(k)) return v;
  return { superior: 'prenda superior', inferior: 'prenda inferior', cuerpo_completo: 'vestido', capa: 'capa', calzado: 'zapatos', bolso: 'bolso', accesorio: 'accesorio' }[category] || 'otro';
}
const FORMALITY = {
  camiseta: 1, polo: 2, top: 2, 'suéter': 2, camisa: 3, blusa: 3, sobrecamisa: 1, 'prenda superior': 2,
  jean: 2, cargo: 1, chino: 2, 'pantalón': 3, 'pantalón de vestir': 4, falda: 3, short: 1, 'prenda inferior': 2,
  vestido: 3, enterizo: 3, blazer: 4, casaca: 2, abrigo: 3, chaleco: 3, capa: 2,
  zapatillas: 1, mocasines: 3, oxford: 4, zapatos: 3, botines: 3, sandalias: 2
};
const WARMTH = { 'suéter': 3, blazer: 2, casaca: 2, abrigo: 3, sobrecamisa: 2, camiseta: 1, top: 1, polo: 1 };
const DRESS_CODES = [
  { id: 'casual', label: 'Casual', formality: 1 },
  { id: 'smart casual', label: 'Smart casual', formality: 2 },
  { id: 'business casual', label: 'Business casual', formality: 3 },
  { id: 'formal', label: 'Formal / sastrería', formality: 4 }
];
function dressCodeFormality(code) {
  const c = norm(code);
  if (c.includes('sastr') || c.includes('formal') && !c.includes('casual')) return 4;
  if (c.includes('business')) return 3;
  if (c.includes('smart')) return 2;
  return 1;
}
const NEUTRALS = ['blanco', 'negro', 'gris', 'beige', 'marfil', 'camel', 'arena', 'azul marino', 'azul oscuro', 'marron', 'plateado', 'dorado', 'crudo', 'denim'];
const isNeutral = (c) => NEUTRALS.includes(norm(c)) || norm(c) === 'azul y blanco';
const STYLE_LEVEL = { casual: 1, 'urbano': 1.4, 'urbano/streetwear': 1.4, 'deportivo/athleisure': 1, minimalista: 2, bohemio: 1.8, 'smart casual': 2.2, creativo: 2.1, 'romántico': 2.5, preppy: 2.4, 'clásico': 2.7, 'business casual': 3, 'elegante de noche': 3.4, formal: 4 };
const STYLE_DEFS = [
  ['casual', 'Prendas cómodas y sencillas para el día a día.'],
  ['smart casual', 'Relajado pero cuidado: piezas básicas con un toque pulido.'],
  ['business casual', 'Profesional sin traje completo: camisa, pantalón de vestir o chino.'],
  ['formal', 'Sastrería y calzado de vestir para ocasiones con código.'],
  ['minimalista', 'Pocas piezas, líneas limpias y paleta neutra.'],
  ['clásico', 'Básicos atemporales que no dependen de tendencias.'],
  ['preppy', 'Inspiración colegial: polos, cárdigans, mocasines y orden.'],
  ['urbano/streetwear', 'Siluetas amplias, zapatillas y capas con actitud.'],
  ['deportivo/athleisure', 'Tejidos técnicos y prendas deportivas fuera del gimnasio.'],
  ['bohemio', 'Texturas naturales, estampados y caídas fluidas.'],
  ['romántico', 'Tonos suaves, detalles delicados y movimiento.'],
  ['creativo', 'Mezclas inesperadas de color, forma o textura.'],
  ['elegante de noche', 'Piezas protagonistas y acabados especiales para la noche.']
];
const OCCASIONS = ['oficina', 'reunión', 'presentación', 'entrevista', 'clases', 'trabajo de campo', 'almuerzo', 'cita', 'cena', 'fiesta', 'boda', 'evento', 'evento cultural', 'viaje', 'paseo', 'otra'];
const INTENTS = ['confianza', 'profesionalismo', 'cercanía', 'elegancia', 'creatividad', 'deslumbrar', 'intención romántica', 'pasar desapercibido', 'máxima visibilidad', 'comodidad'];
const LIMA_DISTRICTS = ['Barranco', 'Jesús María', 'La Molina', 'Lince', 'Magdalena del Mar', 'Miraflores', 'Pueblo Libre', 'San Borja', 'San Isidro', 'San Miguel', 'Santiago de Surco', 'Surquillo', 'Cercado de Lima'];

/* ---------- Construcción de espacios ---------- */
function itemFromRow(row, cols) {
  const o = {};
  cols.forEach((c, i) => { o[c] = row[i]; });
  return o;
}
function parseHardRequirement(text) {
  const t = norm(text);
  const req = { label: text };
  const kw = SUBTYPES.filter(([k]) => t.includes(k)).map(([, v]) => v);
  if (kw.length) req.subtypes = [...new Set(kw)];
  const colors = ['negro', 'blanco', 'gris', 'beige', 'marron', 'azul marino', 'azul', 'celeste', 'burdeos'];
  const c = colors.find((x) => t.includes(x));
  if (c) req.color = c;
  const mats = ['cuero', 'algodon', 'lana', 'lino', 'seda', 'poliester'];
  const m = mats.find((x) => t.includes(x));
  if (m) req.material = m;
  const s = text.match(/EU\s?\d{2}/i);
  if (s) req.size = s[0].toUpperCase().replace(/EU(\d)/, 'EU $1');
  return req;
}
function normalizeSlots(slots) {
  const out = [];
  (slots || []).forEach((s) => {
    if (s === 'superior_e_inferior_o_cuerpo_completo') out.push('superior', 'inferior');
    else out.push(s);
  });
  return [...new Set(out)];
}
function buildContext(c, ref) {
  const hard = {};
  Object.entries(c.hardRequirements || {}).forEach(([slot, txt]) => { hard[slot] = parseHardRequirement(txt); });
  return {
    id: c.id, ownerId: c.ownerId, name: c.name, occasion: c.occasion, date: ref, time: c.time || '09:00', duration: 'medio día',
    setting: 'interior', city: 'Lima', district: c.district || 'Miraflores', dressCode: c.dressCode || 'casual',
    formality: dressCodeFormality(c.dressCode || ''), intent: c.intent || [], walking: c.walking || 'moderada',
    temperatureC: c.temperatureC ?? 20, weather: 'templado', weatherSource: c.weatherSource || 'manual',
    requiredSlots: normalizeSlots(c.requiredSlots || ['superior', 'inferior', 'calzado']), hard,
    allowWhiteSneakers: !!c.allowCleanWhiteSneakers, coverage: 'sin preferencia', colorsPref: [], note: c.note || '',
    orgRules: '', specificReqs: '', origin: 'demo', createdAt: ref
  };
}
function buildDemoWorkspace(seed, ref) {
  const cols = seed.itemColumns;
  const items = seed.items.map((row) => {
    const raw = Object.assign({}, seed.itemDefaults, itemFromRow(row, cols));
    Object.assign(raw, seed.itemOverrides[raw.id] || {});
    const avail = AVAIL_NORMALIZE[raw.availability] || raw.availability;
    const subtype = deriveSubtype(raw.nombre, raw.categoria);
    const size = String(raw.talla);
    return {
      id: raw.id, ownerId: raw.ownerId, name: raw.nombre, category: raw.categoria, subtype,
      color: raw.color, pattern: raw.color.includes(' y ') ? 'rayas' : 'liso', material: raw.fibra_o_material,
      weave: raw.tejido_o_acabado, cut: raw.corte, size, sizeSystem: /^EU/.test(size) ? 'EU' : (/^(XS|S|M|L|XL)$/.test(size) ? 'letras' : 'otro'),
      brand: '', season: 'todo el año', warmth: WARMTH[subtype] || 1, formality: FORMALITY[subtype] || 2, comfort: 2,
      care: '', price: raw.precioDemoPEN, tags: [], availability: avail,
      createdAt: addDays(ref, -raw.createdDaysAgo), acquisition: '',
      baselineLastUsed: addDays(ref, -raw.baselineLastUsedDaysAgo), baselineWearCount: raw.baselineWearCount,
      attributeSource: raw.attributeSource, origin: 'demo',
      exclusions: { temporada: !!raw.seasonalExclusion, ceremonial: false, sentimental: !!raw.sentimental, trabajo: false, guardada: false },
      repairEstimate: raw.repairEstimateDemoPEN || null, repairReadyDays: raw.repairReadyInDaysDemo || null,
      notes: '', updatedAt: ref
    };
  });
  const contexts = seed.contexts.map((c) => buildContext(c, ref));
  const templates = seed.outfitTemplates.map((t) => Object.assign({ origin: 'demo', createdAt: ref }, clone(t), { requiredSlots: normalizeSlots(t.requiredSlots) }));
  const tmplById = Object.fromEntries(templates.map((t) => [t.id, t]));
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const wearLogs = seed.wearLogs.map((h) => {
    const t = tmplById[h.outfitId];
    const ctx = contexts.find((c) => c.id === t.contextId);
    return {
      id: h.id, ownerId: h.ownerId, outfitId: h.outfitId, contextId: t.contextId, occasion: ctx ? ctx.occasion : '',
      date: addDays(ref, -h.daysAgo), status: 'usado', origin: 'demo', createdAt: addDays(ref, -h.daysAgo), confirmedAt: addDays(ref, -h.daysAgo),
      snapshot: snapshotOf(t.name, t.itemIds.map((id) => itemById[id])), notes: 'Registro histórico simulado', comfort: null, satisfaction: null, recovered: []
    };
  });
  const missing = seed.missingRequirements.map((m) => Object.assign({ origin: 'demo', createdAt: ref, cut: 'clásico', weave: 'liso', sizeSystem: 'EU', measures: '', exclusive: 'Cuero, color negro, talla EU 42', refPhoto: false, status: 'abierta' }, clone(m), { neededBy: addDays(ref, m.neededInDays) }));
  const offers = seed.commercialOffers.map((o) => Object.assign({ createdAt: ref, quotedAt: ref }, clone(o)));
  const plans = seed.purchasePlans.map((p) => Object.assign({ origin: 'demo', createdAt: ref, reason: 'Evento formal: falta calzado Oxford negro disponible' }, clone(p), { plannedDate: addDays(ref, p.plannedInDays) }));
  const orders = seed.orders.map((o) => Object.assign(clone(o), {
    createdAt: addDays(ref, -2), total: o.pricePEN, deliveryPEN: 0, etaText: 'Listo para recoger (ejemplo)', size: o.size,
    history: [{ status: 'confirmado (simulado)', at: addDays(ref, -2) }, { status: 'en preparación (simulado)', at: addDays(ref, -1) }, { status: o.status, at: ref }],
    addedItemId: null, pickupCode: 'DEMO-RECOJO-1042'
  }));
  const circular = seed.circularActions.map((c) => Object.assign({ origin: 'demo', createdAt: ref, kind: 'revision', history: [] }, clone(c)));
  const profiles = seed.profiles.map((p) => Object.assign(defaultProfileExtras(), clone(p), { origin: 'demo' }));
  return withCodes({
    mode: 'demo', referenceDate: ref, activeProfileId: 'alex', profiles, items, contexts, templates, wearLogs, missing, offers,
    plans, orders, circular, saved: [], feedback: [], quotes: [], links: [], events: [],
    seq: { order: 1043, log: 1, item: 1, ctx: 1, saved: 1, req: 2, cir: 2, fb: 1, quote: 1 },
    selectedContext: { alex: 'C01', valeria: 'C04', noa: 'C05' }
  });
}
function withCodes(ws) { ensureCodes(ws); return ws; }
function defaultProfileExtras() {
  return {
    gender: 'prefiero no indicarlo', expression: 'sin preferencia', heightCm: null, heightUnit: 'cm', sizeSystem: 'EU', build: 'prefiero omitir',
    measures: { pecho: '', cintura: '', cadera: '', entrepierna: '', pie: '' }, skinTone: 'prefiere omitir', undertone: 'no sé', hair: '', eyes: '',
    comfort: { calor: 'normal', frio: 'normal', avoidFabrics: [], mobility: '', comfyShoes: false, coverage: 'sin preferencia', note: '' },
    city: 'Lima', currency: 'PEN', districts: [], monthlyBudget: null, shoppingFrequency: 'cuando lo necesito',
    styles: [], colors: [], neutrals: [], avoidColors: [], patterns: 'algunos', contrast: 'medio', silhouette: '', length: '',
    fibers: [], weaves: [], values: [], exploration: 'equilibrado', repeat: 'variar', donationThresholdDays: 365,
    learned: { itemAdj: {}, colorAdj: {} }, aiOptIn: false, reduceMotion: false
  };
}
function buildPersonalWorkspace(ref, profileInput) {
  const p = Object.assign(defaultProfileExtras(), {
    id: 'yo', name: (profileInput && profileInput.name) || 'Tú', styles: profileInput && profileInput.style ? [profileInput.style] : [], origin: 'real'
  });
  const occ = (profileInput && profileInput.occasion) || 'oficina';
  const ctx = buildContext({ id: 'PC01', ownerId: 'yo', name: 'Mi ' + occ, occasion: occ, district: 'Miraflores', time: '09:00', temperatureC: 20, weatherSource: 'manual', dressCode: occ === 'clases' || occ === 'paseo' ? 'casual' : 'smart casual', intent: ['comodidad'], requiredSlots: ['superior', 'inferior', 'calzado'] }, ref);
  ctx.origin = 'real';
  return {
    mode: 'personal', referenceDate: ref, activeProfileId: 'yo', profiles: [p], items: [], contexts: [ctx], templates: [], wearLogs: [],
    missing: [], offers: [], plans: [], orders: [], circular: [], saved: [], feedback: [], quotes: [], links: [], events: [],
    seq: { order: 1, log: 1, item: 1, ctx: 2, saved: 1, req: 1, cir: 1, fb: 1, quote: 1 }, selectedContext: { yo: 'PC01' }
  };
}
function snapshotOf(name, items) {
  return { name, items: items.filter(Boolean).map((i) => ({ id: i.id, name: i.name, category: i.category, subtype: i.subtype, color: i.color, material: i.material })) };
}

/* ---------- Estadísticas derivadas de cada prenda ---------- */
function itemStats(ws, item) {
  let count = item.baselineWearCount || 0;
  let last = item.baselineLastUsed || null;
  let confirmedLogs = 0;
  for (const l of ws.wearLogs) {
    if (l.status !== 'usado' || l.ownerId !== item.ownerId) continue;
    if (l.snapshot.items.some((s) => s.id === item.id)) {
      count++; confirmedLogs++;
      if (!last || l.date > last) last = l.date;
    }
  }
  return { wearCount: count, lastUsed: last, confirmedLogs };
}
function daysSinceUse(ws, item, today) {
  const st = itemStats(ws, item);
  if (st.lastUsed) return { days: daysBetween(st.lastUsed, today), basis: 'último uso' };
  return { days: daysBetween(item.createdAt, today), basis: 'incorporación' };
}
const roleOf = (item) => ROLE_OF[item.category] || 'accessory';
const isUsable = (item) => item.availability === 'disponible';
const isGone = (item) => GONE.includes(item.availability);
function ownedItems(ws, ownerId) { return ws.items.filter((i) => i.ownerId === ownerId); }

/* ---------- Requisitos excluyentes ---------- */
function meetsHard(item, req) {
  if (!req) return true;
  if (req.subtypes && !req.subtypes.includes(item.subtype) && !req.subtypes.some((s) => norm(item.name).includes(norm(s)))) return false;
  if (req.color && !norm(item.color).includes(req.color)) return false;
  if (req.material && !norm(item.material).includes(req.material)) return false;
  if (req.size && norm(item.size) !== norm(req.size)) return false;
  return true;
}

/* ---------- Completitud transparente ---------- */
const SLOT_LABEL = { superior: 'Superior', inferior: 'Inferior', calzado: 'Calzado', capa: 'Capa' };
function requiredSlotsFor(ctx, template) {
  return [...new Set([...(ctx ? ctx.requiredSlots : ['superior', 'inferior', 'calzado']), ...((template && template.requiredSlots) || [])])];
}
function completeness(ws, itemIds, ctx, template) {
  const items = itemIds.map((id) => ws.items.find((i) => i.id === id)).filter(Boolean);
  const slots = requiredSlotsFor(ctx, template);
  const full = items.find((i) => roleOf(i) === 'full');
  const units = slots.map((slot) => {
    let item = null;
    if (slot === 'superior') item = items.find((i) => roleOf(i) === 'top') || full || null;
    else if (slot === 'inferior') item = items.find((i) => roleOf(i) === 'bottom') || full || null;
    else if (slot === 'calzado') item = items.find((i) => roleOf(i) === 'shoes') || null;
    else if (slot === 'capa') item = items.find((i) => roleOf(i) === 'layer') || null;
    else item = items.find((i) => i.category === slot) || null;
    const req = ctx && ctx.hard ? ctx.hard[slot] : null;
    const u = { slot, label: SLOT_LABEL[slot] || slot, itemId: item ? item.id : null, covered: false, status: 'falta', note: '', viaFull: !!(item && item === full) };
    if (item) {
      if (item.ownerId !== (ctx ? ctx.ownerId : item.ownerId)) { u.status = 'inválida'; u.note = 'La prenda no pertenece a este perfil.'; }
      else if (!meetsHard(item, req)) { u.status = 'no cumple'; u.note = 'No cumple: ' + req.label; }
      else if (!isUsable(item)) { u.status = 'no disponible'; u.note = 'La tienes: falta dejarla disponible (' + item.availability + ').'; }
      else { u.covered = true; u.status = 'cubierta'; }
    }
    if (!u.covered && !item && ctx) {
      const owned = ownedItems(ws, ctx.ownerId).filter((i) => !isGone(i) && slotMatches(i, slot) && meetsHard(i, req));
      const ready = owned.find(isUsable);
      const blocked = owned.find((i) => !isUsable(i));
      if (ready) u.note = 'Tienes ' + ready.name + ' disponible para esta unidad.';
      else if (blocked) { u.note = 'La tienes: ' + blocked.name + ' (' + blocked.availability + '). Falta dejarla disponible.'; u.ownedBlockedId = blocked.id; }
      else u.note = req ? 'No tienes ' + req.label + ' registrado.' : 'No tienes ' + (SLOT_LABEL[slot] || slot).toLowerCase() + ' registrado.';
    }
    return u;
  });
  const covered = units.filter((u) => u.covered).length;
  return { units, covered, total: units.length, percent: units.length ? Math.round((100 * covered) / units.length) : 0 };
}
function slotMatches(item, slot) {
  const r = roleOf(item);
  if (slot === 'superior') return r === 'top' || r === 'full';
  if (slot === 'inferior') return r === 'bottom' || r === 'full';
  if (slot === 'calzado') return r === 'shoes';
  if (slot === 'capa') return r === 'layer';
  return item.category === slot;
}

/* ---------- Motor de recomendaciones ---------- */
function mainKey(itemIds, ws) {
  const items = itemIds.map((id) => ws.items.find((i) => i.id === id)).filter(Boolean);
  return items.filter((i) => ['top', 'bottom', 'full', 'shoes'].includes(roleOf(i))).map((i) => i.id).sort().join('+');
}
function mainPieces(itemIds, ws) {
  return itemIds.map((id) => ws.items.find((i) => i.id === id)).filter((i) => i && ['top', 'bottom', 'full', 'shoes'].includes(roleOf(i)));
}
function formalityOk(item, ctx) {
  const r = roleOf(item);
  if (!['top', 'bottom', 'full', 'shoes', 'layer'].includes(r)) return true;
  if (r === 'shoes' && ctx.allowWhiteSneakers && item.subtype === 'zapatillas' && norm(item.color) === 'blanco') return true;
  if (r === 'layer') return item.formality >= ctx.formality - 2;
  return item.formality >= ctx.formality - 1 && item.formality <= ctx.formality + 2;
}
function harmony(items) {
  const non = [...new Set(items.filter((i) => !isNeutral(i.color)).map((i) => norm(i.color)))];
  return { nonNeutral: non, ok: non.length <= 2 };
}
function restrictedByProfile(item, profile) {
  const avoid = ((profile && profile.comfort && profile.comfort.avoidFabrics) || []).map(norm);
  return avoid.some((f) => f && (norm(item.material).includes(f) || norm(item.weave).includes(f)));
}
function eligiblePool(ws, ctx, profile, opts) {
  const exclude = new Set(opts.exclude || []);
  return ownedItems(ws, ctx.ownerId).filter((i) => !isGone(i) && !exclude.has(i.id) && !restrictedByProfile(i, profile));
}
function yesterdayKey(ws, ownerId, today) {
  const y = addDays(today, -1);
  const l = ws.wearLogs.find((w) => w.ownerId === ownerId && w.status === 'usado' && w.date === y);
  return l ? l.snapshot.items.filter((s) => ['superior', 'inferior', 'cuerpo_completo', 'calzado'].includes(s.category)).map((s) => s.id).sort().join('+') : null;
}
function styleFor(items, profile) {
  const avg = items.reduce((a, i) => a + (i.formality || 2), 0) / Math.max(1, items.length);
  const pool = (profile && profile.styles && profile.styles.length ? profile.styles : Object.keys(STYLE_LEVEL));
  let best = pool[0], bd = 99;
  pool.forEach((s) => { const d = Math.abs((STYLE_LEVEL[s] ?? 2) - avg); if (d < bd) { bd = d; best = s; } });
  if (bd > 0.9) {
    Object.keys(STYLE_LEVEL).forEach((s) => { const d = Math.abs(STYLE_LEVEL[s] - avg); if (d < bd) { bd = d; best = s; } });
  }
  return best;
}
function scoreOutfit(ws, items, ctx, profile, today) {
  let score = 50; const reasons = [];
  const main = items.filter((i) => ['top', 'bottom', 'full', 'shoes'].includes(roleOf(i)));
  const h = harmony(main);
  if (h.nonNeutral.length === 0) { score += 4; reasons.push({ w: 3, t: 'Paleta neutra (' + [...new Set(main.map((i) => i.color))].join(', ') + '): combina sin esfuerzo.' }); }
  else if (h.nonNeutral.length === 1) { score += 8; reasons.push({ w: 4, t: 'Un solo punto de color (' + h.nonNeutral[0] + ') sobre base neutra.' }); }
  else score -= 2;
  const favs = [...(profile.colors || []), ...(ctx.colorsPref || [])].map(norm);
  const favHits = main.filter((i) => favs.some((f) => f && norm(i.color).includes(f)));
  if (favHits.length) { score += 6 * favHits.length; reasons.push({ w: 5, t: 'Usa colores que elegiste: ' + [...new Set(favHits.map((i) => i.color))].join(', ') + '.' }); }
  const avoid = (profile.avoidColors || []).map(norm);
  main.forEach((i) => { if (avoid.some((a) => a && norm(i.color).includes(a))) score -= 12; });
  if (typeof inPalette === 'function' && PALETTES[profile.undertone]) {
    const palHits = main.filter((i) => inPalette(profile, i.color));
    if (palHits.length) { score += 3 * palHits.length; reasons.push({ w: 4, t: 'Tonos de tu paleta ' + PALETTES[profile.undertone].label + ': ' + [...new Set(palHits.map((i) => i.color))].join(', ') + '.' }); }
  }
  const style = styleFor(main, profile);
  if ((profile.styles || []).includes(style)) { score += 8; reasons.push({ w: 4, t: 'Encaja con tu estilo ' + style + '.' }); }
  const avgF = main.reduce((a, i) => a + i.formality, 0) / Math.max(1, main.length);
  if (Math.abs(avgF - ctx.formality) <= 0.7) { score += 5; reasons.push({ w: 3, t: 'Formalidad adecuada para ' + ctx.dressCode + '.' }); }
  main.forEach((i) => {
    const d = daysSinceUse(ws, i, today).days;
    if (d >= 45) { score += 5; reasons.push({ w: 6, t: 'Recupera ' + i.name.toLowerCase() + ', sin uso registrado hace ' + d + ' días.' }); }
    if (d <= 1 && profile.repeat !== 'repetir') score -= 6;
  });
  const shoes = main.find((i) => roleOf(i) === 'shoes');
  if (shoes && ctx.walking === 'alta') {
    if (['zapatillas', 'mocasines'].includes(shoes.subtype)) { score += 5; reasons.push({ w: 5, t: 'Calzado plano para caminar bastante.' }); }
    if (/tac[oó]n/.test(norm(shoes.cut)) || shoes.subtype === 'oxford') score -= 6;
  }
  if (ctx.temperatureC >= 24) main.forEach((i) => { if (i.warmth >= 3) score -= 8; });
  if (ctx.temperatureC <= 16) main.forEach((i) => { if (i.warmth >= 3) { score += 4; reasons.push({ w: 3, t: i.name + ' abriga para ' + ctx.temperatureC + ' °C.' }); } });
  const intents = ctx.intent || [];
  if (intents.includes('profesionalismo') && avgF >= 2.6) score += 5;
  if (intents.includes('cercanía') && avgF <= 3.2) score += 3;
  if (intents.includes('elegancia') && avgF >= 2.8) score += 5;
  if (intents.includes('comodidad') && main.some((i) => ['relajado', 'oversized'].includes(i.cut) || i.subtype === 'zapatillas')) score += 5;
  if (intents.some((x) => ['creatividad', 'deslumbrar', 'máxima visibilidad'].includes(x)) && h.nonNeutral.length >= 1) { score += 5; reasons.push({ w: 4, t: 'Un color con protagonismo para la intención que marcaste.' }); }
  if (intents.includes('pasar desapercibido') && h.nonNeutral.length === 0) score += 5;
  if (profile.exploration === 'experimental' && h.nonNeutral.length === 2) score += 6;
  if (profile.exploration === 'seguro' && h.nonNeutral.length === 2) score -= 6;
  const L = profile.learned || { itemAdj: {}, colorAdj: {} };
  items.forEach((i) => { score += (L.itemAdj[i.id] || 0) + (L.colorAdj[norm(i.color)] || 0); });
  reasons.sort((a, b) => b.w - a.w);
  return { score, reasons: [...new Set(reasons.map((r) => r.t))].slice(0, 3), style };
}
function usageTips(ws, items, ctx, profile) {
  const tips = [];
  const top = items.find((i) => roleOf(i) === 'top');
  const layer = items.find((i) => roleOf(i) === 'layer');
  const shoes = items.find((i) => roleOf(i) === 'shoes');
  const acc = items.filter((i) => roleOf(i) === 'accessory');
  if (top && top.subtype === 'camisa' && ctx.formality <= 3) tips.push('Mangas dobladas a dos vueltas para un aire más cercano.');
  if (top && top.subtype === 'camisa' && ctx.formality >= 4) tips.push('Camisa por dentro y mangas abotonadas.');
  if (layer && !ctx.requiredSlots.includes('capa')) tips.push(layer.name + ' es opcional: llévalo si refresca o el ambiente es más formal.');
  if (!layer && ctx.temperatureC <= 19) {
    const cand = ownedItems(ws, ctx.ownerId).find((i) => roleOf(i) === 'layer' && isUsable(i) && formalityOk(i, ctx));
    if (cand) tips.push('A ' + ctx.temperatureC + ' °C puedes sumar ' + cand.name.toLowerCase() + '.');
  }
  const belt = acc.find((i) => i.subtype === 'cinturón');
  if (belt && shoes && norm(belt.color) === norm(shoes.color)) tips.push('Cinturón y calzado en el mismo tono: une el conjunto.');
  if (ctx.walking === 'alta' && shoes && !['zapatillas', 'mocasines'].includes(shoes.subtype)) tips.push('Caminarás bastante: considera llevar un calzado de recambio.');
  if (ctx.occasion === 'trabajo de campo') tips.push('Confirma las reglas de vestimenta y EPP de tu organización: este outfit no las sustituye.');
  if (!tips.length) tips.push('Lleva las piezas tal como están: el conjunto ya está equilibrado.');
  return tips.slice(0, 3);
}
function nameFor(items) {
  const main = items.filter((i) => ['top', 'full', 'bottom'].includes(roleOf(i)));
  const cols = [...new Set(main.map((i) => i.color))];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (cols.length === 1) return cap(cols[0]) + ' total';
  return cap(cols[0] || 'Combinación') + ' con ' + (cols[1] || 'neutros');
}
/** Devuelve combinaciones completas y parciales, deterministas, deduplicadas. */
function generateOutfits(ws, ctx, profile, opts, today) {
  opts = opts || {};
  const onlyAvailable = opts.onlyAvailable !== false;
  const pool = eligiblePool(ws, ctx, profile, opts);
  const yKey = opts.noRepeatYesterday ? yesterdayKey(ws, ctx.ownerId, today) : null;
  const must = opts.mustUse && pool.find((i) => i.id === opts.mustUse) ? opts.mustUse : null;
  const notes = [];
  if (opts.mustUse && !must) notes.push('La prenda que quieres usar no está disponible para este perfil o fue excluida.');
  const seen = new Set(); const complete = []; const partial = [];
  const consider = (cand) => {
    if (seen.has(cand.key)) return; seen.add(cand.key);
    if (yKey && cand.key === yKey) return;
    if (must && !cand.itemIds.includes(must)) return;
    const comp = completeness(ws, cand.itemIds, ctx, cand.template);
    const items = cand.itemIds.map((id) => ws.items.find((i) => i.id === id));
    const sc = scoreOutfit(ws, items, ctx, profile, today);
    const out = Object.assign(cand, { completeness: comp, score: cand.template ? 100000 - cand.tIndex : sc.score, affinity: sc.score, reasons: sc.reasons, style: cand.style || sc.style, tips: usageTips(ws, items, ctx, profile) });
    if (comp.percent === 100) complete.push(out); else partial.push(out);
  };
  let tIdx = 0;
  // 1) Plantillas (recetas) del contexto: válidas solo si sus IDs existen, son del perfil y no están excluidas.
  ws.templates.filter((t) => t.ownerId === ctx.ownerId && t.contextId === ctx.id).forEach((t) => {
    const ids = t.itemIds.filter((id) => pool.some((p) => p.id === id));
    if (ids.length !== t.itemIds.length) {
      const lost = t.itemIds.filter((id) => !pool.some((p) => p.id === id));
      notes.push('La plantilla ' + t.name + ' se omitió: incluye prendas excluidas o fuera del armario (' + lost.join(', ') + ').');
      return;
    }
    const items = ids.map((id) => ws.items.find((i) => i.id === id));
    consider({ tIndex: tIdx++, key: mainKey(ids, ws) + '|' + (requiredSlotsFor(ctx, t).includes('capa') ? 'capa:' + (items.find((i) => roleOf(i) === 'layer') || {}).id : ''), itemIds: ids, name: t.name, style: t.style, source: 'plantilla', templateId: t.id, template: t });
  });
  // 2) Combinaciones generadas a partir del inventario
  const avail = (i) => (onlyAvailable ? isUsable(i) : true);
  const by = (role) => pool.filter((i) => roleOf(i) === role && avail(i) && formalityOk(i, ctx));
  const hard = ctx.hard || {};
  const tops = by('top').filter((i) => meetsHard(i, hard.superior));
  const bottoms = by('bottom').filter((i) => meetsHard(i, hard.inferior));
  const fulls = by('full');
  const shoes = by('shoes').filter((i) => meetsHard(i, hard.calzado));
  const needLayer = ctx.requiredSlots.includes('capa');
  const layers = needLayer ? by('layer').filter((i) => meetsHard(i, hard.capa)) : [null];
  const bases = [];
  tops.forEach((t) => bottoms.forEach((b) => bases.push([t, b])));
  fulls.forEach((f) => bases.push([f]));
  const shoeOpts = shoes.length ? shoes : [null];
  const layerOpts = layers.length ? layers : [null];
  bases.forEach((base) => shoeOpts.forEach((s) => layerOpts.forEach((l) => {
    const items = [...base, s, l].filter(Boolean);
    if (!harmony(items.filter((i) => roleOf(i) !== 'layer')).ok) return;
    const ids = items.map((i) => i.id);
    const key = mainKey(ids, ws) + '|' + (needLayer ? 'capa:' + (l ? l.id : '') : '');
    consider({ key, itemIds: ids, name: nameFor(items), source: 'generado' });
  })));
  // 3) Si la base no alcanza (sin superior o inferior), parciales con lo que hay
  if (!bases.length) {
    const parts = [tops[0], bottoms[0], fulls[0], shoes[0]].filter(Boolean);
    if (parts.length) consider({ key: 'parcial:' + parts.map((p) => p.id).sort().join('+'), itemIds: [...new Set(parts.map((p) => p.id))], name: 'Lo que ya tienes', source: 'generado' });
  }
  const order = (a, b) => b.score - a.score || (a.key < b.key ? -1 : 1);
  complete.sort(order); partial.sort(order);
  if (!complete.length && !partial.length) notes.push('No hay prendas suficientes para armar una combinación. Agrega una parte superior, una inferior y calzado.');
  else if (!complete.length) notes.push('Ninguna combinación está completa con prendas disponibles. Te mostramos las parciales con sus faltantes explícitos.');
  else if (complete.length < 3) notes.push('Solo hay ' + complete.length + ' combinación' + (complete.length > 1 ? 'es completas' : ' completa') + ' para este contexto con tu armario disponible: el código de vestimenta y la disponibilidad limitan las opciones.');
  return { complete, partial, notes };
}
/** Selecciona hasta `n` candidatos variados (≥2 piezas principales distintas si se puede, ≥1 siempre). */
function pickDiverse(ranked, chosen, n, ws) {
  const out = [];
  const diff = (a, b) => {
    const A = new Set(a.key.split('|')[0].split('+')); const B = b.key.split('|')[0].split('+');
    return B.filter((x) => !A.has(x)).length;
  };
  const taken = () => [...chosen, ...out];
  for (const need of [2, 1]) {
    for (const c of ranked) {
      if (out.length >= n) break;
      if (taken().some((t) => t.key === c.key)) continue;
      if (c.source === 'plantilla' || taken().every((t) => diff(t, c) >= need)) out.push(c);
    }
  }
  return out.slice(0, n);
}
const ROLE_NAMES = {
  default: ['Mi opción segura', 'Mi opción con personalidad', 'Mi opción más creativa'],
  'cita': ['La que nunca falla', 'Con chispa', 'La más atrevida (y adecuada)'],
  'cena': ['La que nunca falla', 'Con chispa', 'La más atrevida (y adecuada)'],
  'clases': ['Cómoda y segura', 'Con personalidad', 'La más creativa'],
  'evento': ['Sobria y correcta', 'Con un detalle propio', 'La más expresiva'],
  'reunión': ['Mi opción segura', 'Mi opción con personalidad', 'Mi opción más creativa']
};
function roleNames(occasion) { return ROLE_NAMES[occasion] || ROLE_NAMES.default; }

/* ---------- Cobertura del armario (plantillas de interés) ---------- */
function templateCoverage(ws, ownerId, interestIds) {
  const list = ws.templates.filter((t) => t.ownerId === ownerId && (!interestIds || interestIds.includes(t.id)));
  const rows = list.map((t) => {
    const ctx = ws.contexts.find((c) => c.id === t.contextId);
    const comp = completeness(ws, t.itemIds.filter((id) => { const it = ws.items.find((i) => i.id === id); return it && !isGone(it); }), ctx, t);
    return { template: t, ctx, comp, ok: comp.percent === 100 };
  });
  return { rows, ok: rows.filter((r) => r.ok).length, total: rows.length };
}

/* ---------- Valor de una compra: combinaciones nuevas ---------- */
function comboSet(ws, ownerId, extraItem) {
  const items = ownedItems(ws, ownerId).filter((i) => isUsable(i)).concat(extraItem ? [extraItem] : []);
  const contexts = ws.contexts.filter((c) => c.ownerId === ownerId);
  const set = new Map();
  contexts.forEach((ctx) => {
    const ok = (i) => formalityOk(i, ctx);
    const hard = ctx.hard || {};
    const tops = items.filter((i) => roleOf(i) === 'top' && ok(i) && meetsHard(i, hard.superior));
    const bottoms = items.filter((i) => roleOf(i) === 'bottom' && ok(i) && meetsHard(i, hard.inferior));
    const fulls = items.filter((i) => roleOf(i) === 'full' && ok(i));
    const shoes = items.filter((i) => roleOf(i) === 'shoes' && ok(i) && meetsHard(i, hard.calzado));
    const needLayer = ctx.requiredSlots.includes('capa');
    const layers = needLayer ? items.filter((i) => roleOf(i) === 'layer' && ok(i) && meetsHard(i, hard.capa)) : [null];
    const bases = []; tops.forEach((t) => bottoms.forEach((b) => bases.push([t, b]))); fulls.forEach((f) => bases.push([f]));
    bases.forEach((b) => shoes.forEach((s) => layers.forEach((l) => {
      const combo = [...b, s, l].filter(Boolean);
      if (!harmony(combo.filter((i) => roleOf(i) !== 'layer')).ok) return;
      const key = combo.map((i) => i.id).sort().join('+');
      if (!set.has(key)) set.set(key, { key, items: combo, contexts: [ctx.name] });
      else if (!set.get(key).contexts.includes(ctx.name)) set.get(key).contexts.push(ctx.name);
    })));
  });
  return set;
}
function purchaseValue(ws, ownerId, candidate) {
  const before = comboSet(ws, ownerId, null);
  const after = comboSet(ws, ownerId, candidate);
  const added = [...after.values()].filter((c) => !before.has(c.key));
  const similar = ownedItems(ws, ownerId).filter((i) => !isGone(i) && i.subtype === candidate.subtype && norm(i.color) === norm(candidate.color));
  return { before: before.size, after: after.size, added, similar };
}
const VERSATILE_ARCHETYPES = [
  { name: 'Pantalón chino azul marino', category: 'inferior', subtype: 'chino', color: 'azul marino', formality: 2 },
  { name: 'Pantalón negro recto', category: 'inferior', subtype: 'pantalón', color: 'negro', formality: 3 },
  { name: 'Camiseta blanca', category: 'superior', subtype: 'camiseta', color: 'blanco', formality: 1 },
  { name: 'Camisa blanca', category: 'superior', subtype: 'camisa', color: 'blanco', formality: 3 },
  { name: 'Zapatillas blancas', category: 'calzado', subtype: 'zapatillas', color: 'blanco', formality: 1 },
  { name: 'Mocasines negros', category: 'calzado', subtype: 'mocasines', color: 'negro', formality: 3 },
  { name: 'Blusa negra', category: 'superior', subtype: 'blusa', color: 'negro', formality: 3 }
];
function versatileSuggestions(ws, ownerId) {
  return VERSATILE_ARCHETYPES.map((a, idx) => {
    const cand = Object.assign({ id: 'CAND' + idx, ownerId, availability: 'disponible', material: 'material no confirmado', weave: '', cut: 'regular', size: '', warmth: 1, hypothetical: true }, a);
    return Object.assign({ candidate: cand }, purchaseValue(ws, ownerId, cand));
  }).filter((r) => r.similar.length === 0 && r.added.length > 0).sort((a, b) => b.added.length - a.added.length).slice(0, 2);
}

/* ---------- Ofertas simuladas ---------- */
function searchOffers(offers, req, f) {
  const results = []; const pending = []; const excluded = []; const notes = [];
  const budget = Number(f.budget) || null;
  offers.forEach((o) => {
    const matches = []; const pendingData = [];
    const fail = (why) => excluded.push({ offer: o, reason: why });
    if (f.color && !norm(o.color).includes(norm(f.color))) return fail('Color distinto (' + o.color + ')');
    matches.push('color ' + o.color);
    if (f.material && !norm(o.material).includes(norm(f.material))) return fail('Material distinto (' + o.material + ')');
    matches.push('material ' + o.material);
    if (f.size && norm(o.size) !== norm(f.size)) return fail('Talla distinta (' + o.size + ')');
    matches.push('talla ' + o.size);
    if (f.subtype && !norm(o.product).includes(norm(f.subtype))) return fail('No es ' + f.subtype);
    if (f.condition && f.condition !== 'cualquiera' && o.condition !== f.condition) return fail('Condición ' + o.condition);
    if (f.physical) {
      if (!f.districts.includes(o.district)) return fail('Tienda ubicada fuera de los distritos elegidos (' + o.district + ')');
      matches.push('tienda en ' + o.district);
    }
    if (f.modality === 'recojo' && !f.physical && !f.districts.includes(o.district)) { /* recojo fuera de distritos: se informa */ pendingData.push('recojo en ' + o.district); }
    const shipping = f.modality === 'recojo' ? 0 : o.deliveryPEN;
    const total = f.modality === 'recojo' ? o.pricePEN : (o.deliveryPEN === null ? null : o.pricePEN + o.deliveryPEN);
    if (f.modality === 'delivery' && o.deliveryPEN === null) pendingData.push('envío sin cotizar');
    if (f.modality === 'delivery' && !f.physical) pendingData.push('cobertura de delivery no confirmada');
    let budgetState = 'sin presupuesto';
    if (budget) {
      const base = f.budgetMode === 'producto' ? o.pricePEN : total;
      if (base === null) budgetState = 'desconocido';
      else if (base <= budget) budgetState = 'cumple';
      else return fail('Supera el presupuesto (' + fmtPEN(base) + ' > ' + fmtPEN(budget) + ')');
    }
    const eta = f.modality === 'recojo' ? o.pickupInDays : o.deliveryInDays;
    const row = { offer: o, shipping, total, eta, matches, pendingData, budgetState, stock: o.stockDemo };
    if (total === null || budgetState === 'desconocido') pending.push(row); else results.push(row);
  });
  results.sort((a, b) => b.matches.length - a.matches.length || a.total - b.total || (b.stock > 0) - (a.stock > 0) || a.eta - b.eta);
  if (results.length) results[0].lowestKnown = true;
  const shown = results.slice(0, 3);
  const pend = pending.slice(0, Math.max(0, 3 - shown.length));
  if (shown.length + pend.length < 3) notes.push('Se encontraron ' + (shown.length + pend.length) + ' de 3 opciones con estos filtros. No se inventan resultados para completar.');
  if (!f.physical && f.modality === 'delivery') notes.push('Sin filtro de tienda física: el catálogo simulado no confirma cobertura de delivery por distrito.');
  return { results: shown, pending: pend, excluded, notes };
}

/* ---------- Pedidos simulados ---------- */
const ORDER_FLOW = {
  recojo: ['confirmado (simulado)', 'en preparación (simulado)', 'listo para recoger (simulado)', 'recibido/recogido (simulado)'],
  delivery: ['confirmado (simulado)', 'en preparación (simulado)', 'en reparto (simulado)', 'recibido/recogido (simulado)']
};
function nextOrderStatus(order) {
  const flow = ORDER_FLOW[order.modality] || ORDER_FLOW.recojo;
  const i = flow.indexOf(order.status);
  if (i < 0 || i === flow.length - 1) return null;
  return flow[i + 1];
}
const isReceived = (o) => o.status === 'recibido/recogido (simulado)';

/* ---------- Desuso y hábitos ---------- */
function dormantItems(ws, ownerId, threshold, today) {
  const review = []; const excluded = [];
  ownedItems(ws, ownerId).forEach((i) => {
    if (isGone(i)) return;
    const d = daysSinceUse(ws, i, today);
    if (d.days < threshold) return;
    const ex = Object.entries(i.exclusions || {}).filter(([, v]) => v).map(([k]) => k);
    const row = { item: i, days: d.days, basis: d.basis };
    if (ex.length) excluded.push(Object.assign(row, { exclusions: ex })); else review.push(row);
  });
  review.sort((a, b) => b.days - a.days);
  return { review, excluded };
}
function habits(ws, ownerId, today, periodDays) {
  const items = ownedItems(ws, ownerId);
  const eligible = items.filter((i) => !isGone(i));
  const from = addDays(today, -periodDays);
  const usedInPeriod = new Set();
  let confirmedInPeriod = 0;
  ws.wearLogs.filter((l) => l.ownerId === ownerId && l.status === 'usado' && l.date > from).forEach((l) => { confirmedInPeriod++; l.snapshot.items.forEach((s) => usedInPeriod.add(s.id)); });
  eligible.forEach((i) => { const st = itemStats(ws, i); if (st.lastUsed && st.lastUsed > from) usedInPeriod.add(i.id); });
  const withUse = eligible.filter((i) => itemStats(ws, i).wearCount > 0).length;
  const cpu = eligible.filter((i) => i.price).map((i) => { const st = itemStats(ws, i); return { item: i, uses: st.wearCount, cpu: st.wearCount ? i.price / st.wearCount : null }; });
  const recovered = ws.wearLogs.filter((l) => l.ownerId === ownerId && l.status === 'usado').reduce((a, l) => a + (l.recovered || []).length, 0);
  const repairs = ws.circular.filter((c) => c.ownerId === ownerId && c.kind === 'reparacion' && c.status === 'completada').length;
  const donations = ws.circular.filter((c) => c.ownerId === ownerId && c.kind === 'donacion' && c.status === 'entregada (demo)').length;
  return {
    distinctUsed: [...usedInPeriod].filter((id) => eligible.some((i) => i.id === id)).length, eligible: eligible.length,
    pctWithUse: eligible.length ? Math.round((100 * withUse) / eligible.length) : 0, confirmedInPeriod,
    totalUses: eligible.reduce((a, i) => a + itemStats(ws, i).wearCount, 0), cpu, recovered, repairs, donations
  };
}

/* ---------- Texto libre → campos de contexto ---------- */
function parseContextText(text, base) {
  const t = norm(text); const out = {}; const found = [];
  const occ = OCCASIONS.slice().sort((a, b) => b.length - a.length).find((o) => t.includes(norm(o)));
  if (occ) { out.occasion = occ; found.push('ocasión: ' + occ); }
  const dist = LIMA_DISTRICTS.find((d) => t.includes(norm(d)));
  if (dist) { out.district = dist; found.push('distrito: ' + dist); }
  const intents = [];
  if (/profesional/.test(t)) intents.push('profesionalismo');
  if (/cercan|cercano|cercana|amable/.test(t)) intents.push('cercanía');
  if (/confian|seguro de mi|segura de mi/.test(t)) intents.push('confianza');
  if (/elegan/.test(t)) intents.push('elegancia');
  if (/creativ/.test(t)) intents.push('creatividad');
  if (/deslumbr/.test(t)) intents.push('deslumbrar');
  if (/romant/.test(t)) intents.push('intención romántica');
  if (/desapercib|discret/.test(t)) intents.push('pasar desapercibido');
  if (/visib|protagon/.test(t)) intents.push('máxima visibilidad');
  if (/comod/.test(t)) intents.push('comodidad');
  if (intents.length) { out.intent = intents; found.push('intención: ' + intents.join(', ')); }
  if (/caminar[ée] (bastante|mucho)|mucho caminar|caminar mucho|caminare bastante/.test(t)) { out.walking = 'alta'; found.push('caminar: alta'); }
  else if (/camin/.test(t)) { out.walking = 'moderada'; found.push('caminar: moderada'); }
  const col = t.match(/prefiero (el |los |tonos? )?([a-z ]+?)(\.|,|$| y )/);
  if (col) { const c = col[2].trim(); if (c && c.length < 20) { out.colorsPref = [c]; found.push('color preferido: ' + c); } }
  const temp = t.match(/(\d{1,2})\s?(°|grados|ºc|°c)/);
  if (temp) { out.temperatureC = Number(temp[1]); found.push('temperatura: ' + temp[1] + ' °C'); }
  const hr = t.match(/a las (\d{1,2})(?::(\d{2}))?/);
  if (hr) { out.time = String(hr[1]).padStart(2, '0') + ':' + (hr[2] || '00'); found.push('hora: ' + out.time); }
  if (/importante|entrevista|presentaci/.test(t) && !out.dressCode) { out.dressCode = 'business casual'; out.formality = 3; found.push('código sugerido: business casual'); }
  if (/formal|boda|gala/.test(t)) { out.dressCode = 'formal'; out.formality = 4; }
  return { fields: out, found };
}

/* ---------- Importación segura ---------- */
function validateImport(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['El archivo no contiene un objeto JSON.'] };
  if (obj.app !== 'RELISTO') errors.push('No es una exportación de RELISTO.');
  if (obj.version !== SCHEMA_VERSION) errors.push('Versión no compatible (' + obj.version + '). Se espera ' + SCHEMA_VERSION + '.');
  const spaces = obj.spaces || {};
  ['demo', 'personal'].forEach((k) => {
    const w = spaces[k];
    if (w === undefined || w === null) return;
    const arrays = ['profiles', 'items', 'contexts', 'templates', 'wearLogs', 'missing', 'offers', 'plans', 'orders', 'circular', 'saved'];
    arrays.forEach((a) => { if (!Array.isArray(w[a])) errors.push(k + ': falta la lista ' + a + '.'); });
    if (errors.length) return;
    if (w.items.length > 2000 || w.wearLogs.length > 5000) errors.push(k + ': supera los límites (2000 prendas, 5000 registros).');
    const pids = new Set(w.profiles.map((p) => p.id));
    const ids = new Set();
    w.items.forEach((i) => {
      if (typeof i.id !== 'string' || !i.id) errors.push(k + ': una prenda no tiene ID válido.');
      else if (ids.has(i.id)) errors.push(k + ': ID repetido ' + i.id + '.');
      ids.add(i.id);
      if (!pids.has(i.ownerId)) errors.push(k + ': la prenda ' + i.id + ' tiene un propietario desconocido (' + i.ownerId + ').');
      if (typeof i.name !== 'string') errors.push(k + ': la prenda ' + i.id + ' no tiene nombre.');
    });
    ['wearLogs', 'orders', 'saved', 'contexts'].forEach((a) => w[a].forEach((r) => { if (r.ownerId && !pids.has(r.ownerId)) errors.push(k + ': registro ' + r.id + ' con propietario desconocido.'); }));
    if (k === 'demo' && w.mode !== 'demo') errors.push('demo: el espacio no está marcado como demostración.');
    if (k === 'personal' && w.mode !== 'personal') errors.push('personal: el espacio no está marcado como personal.');
  });
  if (!spaces.demo && !spaces.personal) errors.push('El archivo no contiene espacios.');
  return { ok: errors.length === 0, errors: errors.slice(0, 8) };
}
