/* =====================================================================
   VISTAS: estructura, Hoy y Mi armario
   ===================================================================== */
const NAV = [['hoy', 'Hoy'], ['armario', 'Mi armario'], ['plan', 'Mi plan'], ['circular', 'Circular'], ['perfil', 'Mi perfil']];
const SUBNAV = [['recorrido', 'Recorrido guiado', 'guide'], ['comprobaciones', 'Comprobaciones', 'flask'], ['proyecto', 'Sobre el proyecto', 'info']];

function render() {
  const fa = document.activeElement;
  const fid = fa && fa.id ? fa.id : null;
  let sel = null; try { sel = fa && typeof fa.selectionStart === 'number' ? [fa.selectionStart, fa.selectionEnd] : null; } catch (e) { sel = null; }
  const mroot = document.getElementById('modal-root');
  const modalScroll = mroot.querySelector('.modal') ? mroot.querySelector('.modal').scrollTop : 0;
  document.getElementById('app').innerHTML = renderShell();
  mroot.innerHTML = UI.modal ? renderModal() : '';
  if (UI.modal && mroot.querySelector('.modal')) mroot.querySelector('.modal').scrollTop = modalScroll;
  renderSaveState();
  const p = prof();
  document.documentElement.classList.toggle('reduce-motion', !!(p && p.reduceMotion));
  if (fid) {
    const el = document.getElementById(fid);
    if (el && el !== document.activeElement) {
      try { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && /text|search|textarea/.test(el.type || 'textarea')) el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* sin selección */ }
    }
  }
}
function whoOptions() {
  const opts = [];
  S.demo.profiles.forEach((p) => opts.push(['demo:' + p.id, p.name + ' · demo']));
  opts.push(['personal', S.personal ? 'Mi armario' : 'Empezar con mi armario…']);
  return opts;
}
function renderShell() {
  const w = ws(); const p = prof();
  const who = isDemo() ? 'demo:' + w.activeProfileId : 'personal';
  const flag = isDemo() ? '<span class="demo-flag" title="Perfiles, prendas, precios, tiendas y pedidos son ficticios">Datos de demostración</span>' : '<span class="real-flag">Tu espacio personal</span>';
  const nav = NAV.map(([id, label]) => '<button type="button" data-act="nav" data-view="' + id + '"' + (UI.view === id ? ' aria-current="page"' : '') + '>' + IC[id] + '<span>' + label + '</span></button>').join('');
  const sub = SUBNAV.map(([id, label, ic]) => '<button type="button" data-act="nav" data-view="' + id + '"' + (UI.view === id ? ' aria-current="page"' : '') + '>' + IC[ic] + '<span>' + label + '</span></button>').join('');
  const side = '<aside class="side" aria-label="Navegación principal">' +
    '<a class="logo" href="#" data-act="nav" data-view="hoy">' + LOGO + '<span><b>RELISTO</b><small>Vístete rápido. Dale más vida a tu ropa</small></span></a>' +
    '<div class="seg" role="group" aria-label="Espacio"><button type="button" data-act="space" data-space="demo" aria-pressed="' + isDemo() + '">Explorar demo</button><button type="button" data-act="space" data-space="personal" aria-pressed="' + !isDemo() + '">' + (S.personal ? 'Mi armario' : 'Empezar con mi armario') + '</button></div>' +
    (isDemo() ? '<div class="stack tight"><label class="side-label" for="who-side">Perfil de ejemplo</label><select id="who-side" data-act-change="who">' + S.demo.profiles.map((x) => opt('demo:' + x.id, who, x.name)).join('') + '</select></div>' : '') +
    '<div>' + flag + '</div>' +
    '<button type="button" class="btn big-cta" style="background:var(--gold);border-color:var(--gold);color:#2B2208" data-act="armaDia">' + IC.spark + 'Arma mi día</button>' +
    '<nav class="sidenav">' + nav + '</nav>' +
    '<div class="stack tight"><span class="side-label">Más</span><nav class="sidenav sub">' + sub + '</nav></div>' +
    '<div class="save-state" data-save-state style="margin-top:auto"></div></aside>';
  const top = '<header class="topbar"><a class="logo" href="#" data-act="nav" data-view="hoy" aria-label="RELISTO, ir a Hoy">' + LOGO + '<b>RELISTO</b></a><span class="grow"></span>' +
    '<label class="sr-only" for="who-top">Perfil o espacio</label><select id="who-top" style="max-width:150px" data-act-change="who">' + whoOptions().map((o) => opt(o[0], who, o[1])).join('') + '</select>' +
    '<button type="button" class="btn sm" style="background:rgba(255,255,255,.1);color:var(--on-nav);border-color:rgba(255,255,255,.25)" data-act="menu" aria-label="Más opciones">Más</button></header>';
  const bottom = '<nav class="bottomnav" aria-label="Navegación principal">' + NAV.map(([id, label]) => '<button type="button" data-act="nav" data-view="' + id + '"' + (UI.view === id ? ' aria-current="page"' : '') + '><span class="navdot">' + IC[id] + '</span>' + label + '</button>').join('') + '</nav>';
  const fab = UI.view !== 'hoy' ? '<div class="fab"><button type="button" class="btn primary big-cta" data-act="armaDia">' + IC.spark + 'Arma mi día</button></div>' : '';
  const mobileFlag = '<div class="row" style="justify-content:space-between" data-mobile-flag>' + flag + '</div>';
  return '<div class="shell">' + side + '<div style="min-width:0">' + top + '<main class="main" id="main"><div class="main-inner">' +
    '<div class="mobile-only">' + mobileFlag + '</div>' + renderView() + '</div></main></div></div>' + bottom + fab +
    renderPWABanners() + '<div id="toast" class="toast" role="status" aria-live="polite"' + (UI.toast ? '' : ' hidden') + '>' + esc(UI.toast || '') + '</div>';
}
function renderView() {
  if (!ws() || !prof()) return emptyState('Sin perfil', 'Crea tu espacio personal para empezar.', '<button class="btn primary" data-act="startPersonal">Empezar con mi armario</button>');
  switch (UI.view) {
    case 'armario': return renderCloset();
    case 'plan': return renderPlan();
    case 'circular': return renderCircular();
    case 'perfil': return renderProfile();
    case 'recorrido': return renderTour();
    case 'comprobaciones': return renderTests();
    case 'proyecto': return renderAbout();
    default: return renderHoy();
  }
}

/* ============================ HOY ============================ */
function ctxSummaryChips(d) {
  const chips = [d.occasion, d.district, d.time, d.temperatureC + ' °C (' + (d.weatherSource || 'manual') + ')', d.dressCode].concat(d.intent || []);
  const hard = Object.values(d.hard || {}).map((h) => '<span class="chip bad">Excluyente: ' + esc(h.label) + '</span>').join('');
  const must = d.mustUse ? (ws().items.find((i) => i.id === d.mustUse) || {}).name : '';
  return '<div class="ctx-chips">' + chips.filter(Boolean).map((c) => '<span class="chip">' + esc(c) + '</span>').join('') + hard +
    (must ? '<span class="chip explore">Quiero usar: ' + esc(must) + '</span>' : '') +
    ((d.exclude || []).length ? '<span class="chip">' + plural(d.exclude.length, 'prenda excluida', 'prendas excluidas') + '</span>' : '') + '</div>';
}
function renderHoy() {
  const w = ws(); const p = prof(); const d = currentDraft();
  const owned = ownedItems(w, p.id);
  const longDate = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date());
  if (!owned.length) {
    return '<section class="hero"><span class="eyebrow">' + esc(longDate) + ' · ' + esc(p.city || 'Lima') + '</span><h1>Hola, ' + esc(p.name) + '. <em>Empecemos por tu armario.</em></h1>' +
      '<p class="muted">Con unas cinco prendas compatibles (superior, inferior y calzado) ya puedes recibir tu primer outfit. No necesitas completar todo.</p>' +
      '<div class="row"><button class="btn primary lg" data-act="addItem">' + IC.plus + 'Agregar mi primera prenda</button><button class="btn" data-act="nav" data-view="perfil">Completar mi perfil</button></div></section>';
  }
  const ctxs = w.contexts.filter((c) => c.ownerId === p.id);
  const hint = isDemo() && UI.sceneHint ? '<div class="card explore row between"><div class="stack tight" style="flex:1;min-width:220px"><b>¿Primera vez aquí?</b><span class="small">Prueba el recorrido guiado: seis escenas, de “Resuelve mi mañana” a “Empiezo con lo mío”.</span></div><div class="row"><button class="btn sm" data-act="nav" data-view="recorrido">' + IC.guide + 'Ver recorrido</button><button class="btn sm ghost" data-act="hideHint" aria-label="Ocultar sugerencia">' + IC.x + '</button></div></div>' : '';
  const hero = '<section class="hero" aria-labelledby="hoy-title">' +
    '<span class="eyebrow">' + esc(longDate) + ' · ' + esc(p.city || 'Lima') + '</span>' +
    '<h1 id="hoy-title">Hola, ' + esc(p.name) + '. <em>Hoy, con lo que tengo.</em></h1>' +
    '<p class="muted" style="max-width:60ch">Tu próximo gran outfit puede estar en tu armario.</p>' +
    '<div class="row"><label class="sr-only" for="ctx-select">Contexto guardado</label><select class="input" id="ctx-select" style="max-width:300px" data-act-change="ctx">' + ctxs.map((c) => opt(c.id, d.id, c.name)).join('') + '</select>' +
    '<button class="btn sm" data-act="toggleCtx" aria-expanded="' + UI.ctxOpen + '">' + (UI.ctxOpen ? 'Cerrar edición' : 'Editar contexto') + '</button></div>' +
    renderNL() + ctxSummaryChips(d) + (UI.ctxOpen ? renderCtxForm(d) : '') +
    '<div class="switch-row">' + fCheck('opt-avail', 'Solo ropa disponible', 'draft', 'onlyAvailable', d.onlyAvailable !== false) + fCheck('opt-rep', 'No repetir el outfit de ayer', 'draft', 'noRepeatYesterday', d.noRepeatYesterday) + fCheck('opt-shop', 'Sin sugerencias de compra', 'draft', 'noShopping', d.noShopping) + '</div>' +
    '<div class="row"><button class="btn primary big-cta" data-act="armaDia">' + IC.spark + 'Arma mi día</button><span class="small muted">Sugerencias por reglas de demostración: deterministas, sin IA.</span></div></section>';
  return (IS_PWA ? renderInstallCard(false) : '') + hint + hero + '<div class="layout-today"><div class="stack" style="gap:18px;min-width:0">' + renderResults() + '</div><aside class="stack" aria-label="Resumen del día">' + renderTodaySide() + '</aside></div>';
}
function renderNL() {
  const m = UI.mic || {};
  const listening = m.state === 'listening';
  return '<div class="nl-box"><label for="nl" class="eyebrow">Cuéntalo con tus palabras</label>' +
    '<div class="nl-row"><textarea class="input" id="nl" rows="2" placeholder="Reunión importante en San Isidro, quiero verme profesional y cercano, caminaré bastante y prefiero azul"' + bindAttr('ui', 'nl') + '>' + esc(UI.nl) + '</textarea>' +
    '<button type="button" class="mic' + (listening ? ' on' : '') + '" data-act="mic" aria-pressed="' + listening + '" aria-label="' + (listening ? 'Detener dictado' : 'Dictar con el micrófono') + '" title="' + (listening ? 'Detener dictado' : 'Dictar con el micrófono') + '">' + IC.mic + '</button></div>' +
    (listening ? '<span class="small" style="color:var(--accent-ink)" role="status">Te escucho… habla con naturalidad y toca el micrófono para terminar.</span>' : '') +
    (m.msg ? '<div class="note ' + (m.state === 'unavailable' ? 'info' : 'ok') + '" role="status">' + esc(m.msg) + '</div>' : '') +
    '<div class="row"><button class="btn sm soft" data-act="parseNL">Convertir en campos</button><span class="tiny muted">Interpretación por reglas: revisa y corrige los campos antes de generar.</span></div>' +
    (UI.nlFound.length ? '<div class="note info">Detectado: ' + esc(UI.nlFound.join(' · ')) + (UI.ctxOpen ? '' : ' <button class="btn sm ghost" data-act="toggleCtx">Revisar campos</button>') + '</div>' : '') + '</div>';
}
function renderCtxForm(d) {
  const owned = ownedItems(ws(), d.ownerId).filter((i) => !isGone(i));
  const mains = owned.filter((i) => ['top', 'bottom', 'full', 'shoes', 'layer'].includes(roleOf(i)));
  const field = d.occasion === 'trabajo de campo' ? '<div class="note bad"><b>Trabajo de campo:</b> indica las reglas de vestimenta de tu organización. RELISTO no sustituye el equipo de protección personal (EPP) ni una evaluación de seguridad.</div>' +
    '<div class="field"><label for="ctx-org">Reglas de vestimenta de la organización</label><textarea class="input" id="ctx-org"' + bindAttr('draft', 'orgRules') + '>' + esc(d.orgRules || '') + '</textarea></div>' : '';
  return '<div class="card" style="display:grid;gap:14px">' +
    '<div class="form-grid">' +
    fSelect('c-occ', 'Ocasión', 'draft', 'occasion', d.occasion, OCCASIONS) +
    fInput('c-date', 'Fecha', 'draft', 'date', d.date, 'date') + fInput('c-time', 'Hora', 'draft', 'time', d.time, 'time') +
    fSelect('c-dur', 'Duración', 'draft', 'duration', d.duration, ['1-2 horas', 'medio día', 'día completo', 'noche']) +
    fSelect('c-set', 'Interior / exterior', 'draft', 'setting', d.setting, ['interior', 'exterior', 'mixto']) +
    fInput('c-city', 'Ciudad', 'draft', 'city', d.city) +
    fSelect('c-dist', 'Distrito', 'draft', 'district', d.district, LIMA_DISTRICTS) +
    fSelect('c-code', 'Código de vestimenta', 'draft', 'dressCode', DRESS_CODES.some((c) => c.id === d.dressCode) ? d.dressCode : '__orig', [['__orig', d.dressCode]].filter(() => !DRESS_CODES.some((c) => c.id === d.dressCode)).concat(DRESS_CODES.map((c) => [c.id, c.label]))) +
    fInput('c-temp', 'Temperatura (°C, manual)', 'draft', 'temperatureC', d.temperatureC, 'number') +
    fSelect('c-wea', 'Condiciones', 'draft', 'weather', d.weather, ['templado', 'soleado', 'nublado', 'llovizna', 'viento']) +
    fSelect('c-walk', 'Necesidad de caminar', 'draft', 'walking', d.walking, ['baja', 'moderada', 'alta']) +
    fSelect('c-cov', 'Cobertura de ropa', 'draft', 'coverage', d.coverage, ['sin preferencia', 'más cobertura', 'cobertura estándar', 'menos cobertura']) +
    fInput('c-col', 'Colores preferidos hoy', 'draft', 'colorsPrefText', (d.colorsPref || []).join(', ')) +
    fSelect('c-must', 'Quiero usar esta prenda', 'draft', 'mustUse', d.mustUse || '', [['', 'Sin preferencia']].concat(owned.map((i) => [i.id, i.name + (isUsable(i) ? '' : ' (' + i.availability + ')')]))) +
    '</div>' + fCheck('c-amb', 'Habrá cambio de ambiente (p. ej., oficina y luego cena)', 'draft', 'changeAmbience', d.changeAmbience) +
    '<div class="field"><span class="lbl">Intención</span>' + chipToggles('draft', 'intent', INTENTS, d.intent, 'int') +
    '<span class="tiny muted">“Máxima visibilidad” significa protagonismo visual; la cobertura se elige aparte. Ninguna combinación garantiza resultados sociales.</span></div>' +
    '<details class="more"><summary>No usar estas prendas (' + (d.exclude || []).length + ')</summary><div style="margin-top:8px">' + chipToggles('draft', 'exclude', mains.map((i) => i.id), d.exclude, 'exc').replace(/>([A-Z]+\d+)</g, (m, id) => '>' + esc((owned.find((i) => i.id === id) || {}).name || id) + '<') + '</div></details>' +
    '<div class="field"><label for="c-req">Requisitos específicos</label><input class="input" id="c-req" value="' + esc(d.specificReqs || '') + '"' + bindAttr('draft', 'specificReqs') + ' placeholder="Ej.: sin estampados, calzado cerrado"></div>' + field +
    '<div class="note">Clima automático: no conectado (adaptador futuro). Usa temperatura y condiciones manuales.</div>' +
    '<div class="row"><button class="btn sm" data-act="saveCtx">Guardar como contexto</button></div></div>';
}
function renderResults() {
  const g = genState(); const d = currentDraft();
  if (!g) {
    return '<div class="card explore stack"><span class="eyebrow" style="color:inherit">Listo cuando tú lo estés</span><h3 class="serif" style="font-size:24px">Tres propuestas con tus prendas disponibles</h3>' +
      '<p class="small">Pulsa “Arma mi día”. Verás una opción segura, una con personalidad y una más creativa, todas adecuadas para ' + esc(d.name || d.occasion) + '. Puedes ampliar hasta seis.</p></div>';
  }
  const stale = g.hash !== draftHash(d) ? '<div class="note info row between"><span>Cambiaste el contexto. Vuelve a armar para actualizar las propuestas.</span><button class="btn sm" data-act="armaDia">Actualizar</button></div>' : '';
  const isPartial = g.mode === 'partial';
  const canMore = g.slots.length < 6 && !isPartial;
  const head = sectionTitle(isPartial ? 'Con faltantes' : 'Listo para hoy',
    '<span class="chip num">' + g.slots.length + ' de 6 como máximo</span>' +
    (canMore ? '<button class="btn sm" data-act="genMore">' + IC.plus + 'Ver tres más</button>' : '') +
    '<button class="btn sm" data-act="genRegen">' + IC.swap + 'Otras opciones</button>' +
    (g.note && /Ya viste/.test(g.note) ? '<button class="btn sm ghost" data-act="armaDia">Nueva ronda</button>' : ''), isPartial ? 'Faltan piezas imprescindibles' : 'Completos y disponibles');
  const notes = (g.notes.concat(g.note ? [g.note] : [])).map((n) => '<div class="note">' + esc(n) + '</div>').join('');
  const fresh = Date.now() - g.at < 900 ? ' fresh' : '';
  const cards = g.slots.length ? '<div class="grid cards' + fresh + '">' + g.slots.map((c, i) => outfitCard(c, i, { partial: isPartial })).join('') + '</div>' : emptyState('Sin combinaciones', 'Agrega prendas o cambia el contexto.', '<button class="btn" data-act="addItem">Agregar prenda</button>');
  let partialSec = '';
  if (g.partials.length && (d.onlyAvailable === false || g.completeCount < 3)) {
    partialSec = sectionTitle('Con faltantes', '', 'Separadas de “Listo para hoy”') + '<div class="grid cards">' + g.partials.map((c, i) => outfitCard(c, i, { partial: true, section: true })).join('') + '</div>';
  }
  return stale + head + notes + cards + partialSec;
}
function todayLogFor(key) {
  const w = ws();
  return w.wearLogs.filter((l) => l.ownerId === w.activeProfileId && l.key === key && l.date === TODAY && ['elegido', 'planificado', 'usado'].includes(l.status)).pop() || null;
}
function outfitCard(c, idx, opts) {
  const w = ws(); const d = currentDraft(); const g = genState();
  const invalid = liveCheck(c);
  const items = c.itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean);
  const comp = completeness(w, c.itemIds, d, c.template);
  const partial = comp.percent < 100;
  const names = roleNames(d.occasion);
  const role = opts.section ? 'Con faltantes' : (!opts.partial && idx < 3 ? names[idx] : (partial ? 'Combinación parcial' : 'Alternativa ' + (idx + 1)));
  const log = todayLogFor(c.key);
  const saved = w.saved.some((s) => s.key === c.key && s.ownerId === w.activeProfileId);
  const pinned = g && g.pinned === c.key;
  // Collage
  const top = items.find((i) => roleOf(i) === 'top') || items.find((i) => roleOf(i) === 'full');
  const bottom = items.find((i) => roleOf(i) === 'bottom');
  const shoes = items.find((i) => roleOf(i) === 'shoes');
  const big = [top, bottom || shoes].filter(Boolean);
  const rest = items.filter((i) => !big.includes(i));
  const missingTiles = comp.units.filter((u) => !u.itemId).map((u) => '<div class="missing-tile mid" style="grid-column:span 2">Falta ' + esc(u.label.toLowerCase()) + '</div>').join('');
  const collage = '<div class="collage" aria-label="Collage de prendas">' + big.map((i) => thumb(i, { cls: 'big', noTag: true })).join('') + rest.map((i) => thumb(i, { cls: roleOf(i) === 'accessory' ? 'acc' : 'mid', noTag: true }).replace('class="thumb', 'style="grid-column:span ' + (roleOf(i) === 'accessory' ? 2 : 2) + '" class="thumb')).join('') + missingTiles + '</div>';
  const anyPhoto = items.some((i) => photoFor(i));
  const pieces = '<ul class="clean pieces">' + items.map((i) => {
    const optional = roleOf(i) === 'accessory' || (roleOf(i) === 'layer' && !d.requiredSlots.includes('capa'));
    return '<li><span class="dot" style="background:' + colorHex(i.color) + '"></span><span style="min-width:0"><b>' + esc(i.name) + '</b> <span class="muted">· ' + esc(CATEGORIES[i.category] || i.category) + ' · ' + matLabel(i) + ' · corte ' + esc(i.cut) + '</span>' +
      (optional ? ' <span class="chip" style="padding:1px 7px;font-size:11px">opcional</span>' : '') + (isUsable(i) ? '' : ' ' + availBadge(i.availability)) + '</span></li>';
  }).join('') + '</ul>';
  const units = '<ul class="clean units">' + comp.units.map((u) => {
    const it = u.itemId ? w.items.find((i) => i.id === u.itemId) : null;
    let fix = '';
    const blockedId = (it && !u.covered && u.status === 'no disponible') ? it.id : u.ownedBlockedId;
    if (blockedId) {
      const b = w.items.find((i) => i.id === blockedId);
      fix = ' <button class="btn sm soft" data-act="resolveItem" data-item="' + b.id + '">' + (b.availability === 'en reparación' ? 'Marcar reparación terminada (demo)' : ['por lavar', 'en lavandería'].includes(b.availability) ? 'Marcar como lavada' : 'Marcar disponible') + '</button>';
    } else if (!u.covered && !u.itemId && /^Tienes /.test(u.note)) {
      const cand = ownedItems(w, d.ownerId).find((i) => !isGone(i) && isUsable(i) && slotMatches(i, u.slot) && meetsHard(i, (d.hard || {})[u.slot]));
      if (cand) fix = ' <button class="btn sm primary" data-act="incorporate" data-key="' + esc(c.key) + '" data-item="' + cand.id + '">Incorporar ' + esc(cand.name) + '</button>';
    } else if (!u.covered && !u.itemId && !d.noShopping) {
      const tmplReq = c.template && c.template.missingRequirementId && w.missing.find((m) => m.id === c.template.missingRequirementId);
      fix = tmplReq ? ' <button class="btn sm" data-act="openReq" data-req="' + tmplReq.id + '">Ver faltante ' + tmplReq.id + '</button>' : ' <button class="btn sm" data-act="newReqFromUnit" data-slot="' + u.slot + '">Registrar faltante</button> <button class="btn sm ghost" data-act="addItem">Agregar prenda</button>';
    } else if (!u.covered && !u.itemId) {
      fix = ' <button class="btn sm ghost" data-act="addItem">Agregar prenda</button>';
    }
    return '<li><span class="mark ' + (u.covered ? 'ok' : 'no') + '" aria-hidden="true">' + (u.covered ? '✓' : '✗') + '</span><span><b>' + esc(u.label) + '</b>' + (u.viaFull ? ' (cubierta por prenda de cuerpo completo)' : '') + ': ' +
      (u.covered ? esc(it.name) : esc(u.note || (it ? it.name + ' no disponible' : 'falta'))) + ' <span class="sr-only">' + (u.covered ? 'cubierta' : 'no cubierta') + '</span>' + fix + '</span></li>';
  }).join('') + '</ul>';
  const actions = invalid ? '<div class="note bad">Propuesta deshabilitada: ' + esc(invalid) + '</div>' :
    (log && log.status === 'usado' ? '<div class="row"><span class="badge ok">Usado hoy · registrado</span><button class="btn sm ghost" data-act="undoWear" data-log="' + log.id + '">Deshacer</button></div>'
      : log ? '<div class="row"><span class="badge info">' + (log.status === 'planificado' ? 'Planificado para hoy' : 'Elegido: lo usarás hoy') + '</span><button class="btn sm primary" data-act="confirmWear" data-log="' + log.id + '">' + IC.check + 'Sí, lo usé</button><button class="btn sm ghost" data-act="cancelChoice" data-log="' + log.id + '">Cancelar elección</button></div>'
        : '<div class="row">' + (partial ? '<button class="btn sm primary" disabled title="Completa las unidades imprescindibles para elegirlo">Elegir</button>' : '<button class="btn sm primary" data-act="choose" data-key="' + esc(c.key) + '" title="Registra la intención “Lo usaré hoy”">Elegir · lo usaré hoy</button>') +
          '<button class="btn sm" data-act="swap" data-key="' + esc(c.key) + '">' + IC.swap + 'Cambiar una prenda</button></div>') +
    '<div class="row">' + (saved ? '<span class="chip ok">Guardado</span>' : '<button class="btn sm ghost" data-act="saveOutfit" data-key="' + esc(c.key) + '">' + IC.save + 'Guardar</button>') +
    (!partial && !invalid ? '<button class="btn sm ghost" data-act="planOutfit" data-key="' + esc(c.key) + '">' + IC.plan + 'Planificar</button>' : '') +
    '<button class="btn sm ghost" data-act="like" data-key="' + esc(c.key) + '" aria-label="Me gusta">' + IC.heart + 'Me gusta</button>' +
    '<button class="btn sm ghost" data-act="notForMe" data-key="' + esc(c.key) + '">' + IC.x + 'No es para mí</button>' +
    (!opts.section ? '<button class="btn sm ghost" data-act="pin" data-key="' + esc(c.key) + '" aria-pressed="' + !!pinned + '">' + IC.pin + (pinned ? 'Fijado' : 'Fijar') + '</button>' : '') + '</div>';
  const source = c.source === 'plantilla' ? 'Receta ' + esc(c.templateId) : c.source === 'editado' ? 'Editada por ti' : 'Generada por reglas';
  return '<article class="outfit' + (partial ? ' partial' : '') + (pinned ? ' pinned' : '') + (invalid ? ' invalid' : '') + '" aria-label="' + esc(c.name) + '">' +
    '<div class="row between"><span class="role">' + esc(role) + '</span><span class="row" style="gap:4px"><span class="chip">' + esc(c.style || '') + '</span><span class="chip info" title="Sugerencia por reglas de demostración, sin IA">' + source + '</span></span></div>' +
    '<h3>' + esc(c.name) + '</h3>' + collage + '<span class="tiny muted">' + (anyPhoto ? 'Collage con tus fotos e ilustraciones' : 'Ilustraciones de tus prendas registradas: no son fotos ni prueban material o talla') + '</span>' +
    '<div class="stack tight"><div class="row between"><b class="num">' + comp.percent + '% completo</b><span class="small muted num">' + comp.covered + ' de ' + comp.total + ' unidades imprescindibles</span></div><div class="meter' + (partial ? ' partial' : '') + '" role="img" aria-label="' + comp.percent + ' por ciento"><i style="width:' + comp.percent + '%"></i></div>' +
    '<details class="more"' + (partial ? ' open' : '') + '><summary>Desglose de completitud</summary>' + units + '<p class="tiny muted" style="margin-top:6px">Fórmula: 100 × unidades cubiertas por prendas propias disponibles ÷ unidades imprescindibles. Los accesorios son opcionales y no cambian el porcentaje.</p></details></div>' +
    pieces + (c.reasons && c.reasons.length ? '<div class="stack tight"><span class="eyebrow">Por qué funciona</span><ul class="clean why stack tight">' + c.reasons.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul></div>' : '') +
    '<div class="stack tight"><span class="eyebrow">Cómo llevarlo</span><p class="small">' + esc((c.tips || []).join(' ')) + '</p></div>' + actions + '</article>';
}
function renderTodaySide() {
  const w = ws(); const p = prof();
  const logs = w.wearLogs.filter((l) => l.ownerId === p.id && l.status !== 'deshecho' && l.status !== 'descartado');
  const today = logs.filter((l) => l.date === TODAY);
  const last = logs.slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))[0];
  let dayCard;
  if (today.length) {
    dayCard = today.map((l) => '<div class="stack tight"><span class="eyebrow">' + (l.status === 'usado' ? 'Usado hoy' : l.status === 'planificado' ? 'Planificado para hoy' : 'Elegido para hoy') + '</span><b>' + esc(l.snapshot.name) + '</b><span class="small muted">' + esc(l.snapshot.items.map((s) => s.name).join(', ')) + '</span>' +
      (l.status !== 'usado' ? '<div class="row"><button class="btn sm primary" data-act="confirmWear" data-log="' + l.id + '">' + IC.check + 'Sí, lo usé</button></div>' : '<div class="row"><button class="btn sm ghost" data-act="undoWear" data-log="' + l.id + '">Deshacer</button></div>') + '</div>').join('<hr class="sep">');
  } else if (last) {
    dayCard = '<span class="eyebrow">Último outfit registrado</span><b>' + esc(last.snapshot.name) + '</b><span class="small muted">' + esc(last.status) + ' · ' + fmtDate(last.date) + ' (' + relDays(daysBetween(last.date, TODAY)) + ')</span>';
  } else dayCard = '<span class="eyebrow">Hoy</span><span class="small muted">Aún no eliges un outfit.</span>';
  const th = currentThreshold();
  const forgotten = ownedItems(w, p.id).filter((i) => isUsable(i) && !Object.values(i.exclusions || {}).some(Boolean) && ['top', 'bottom', 'full', 'layer', 'shoes'].includes(roleOf(i)))
    .map((i) => Object.assign({ item: i }, daysSinceUse(w, i, TODAY))).sort((a, b) => b.days - a.days)[0];
  const fCard = forgotten && forgotten.days >= 30 ? '<div class="card soft stack tight"><span class="eyebrow" style="color:inherit">Dale otra oportunidad</span><div class="row" style="flex-wrap:nowrap;align-items:center"><div style="width:72px;flex:none">' + thumb(forgotten.item, { noTag: true }) + '</div><div class="stack tight" style="min-width:0"><b>' + esc(forgotten.item.name) + '</b><span class="small">' + (forgotten.basis === 'último uso' ? 'Sin uso registrado ' + relDays(forgotten.days) : 'Sin usos desde que la agregaste (' + relDays(forgotten.days) + ')') + '</span></div></div>' +
    '<p class="small">Ya está en tu armario. Hagámosla protagonista.</p><div class="row"><button class="btn sm primary" data-act="useItem" data-item="' + forgotten.item.id + '">Quiero usar esta prenda</button></div></div>' : '';
  const cov = templateCoverage(w, p.id);
  const h = habits(w, p.id, TODAY, 30);
  const util = '<div class="card stack"><span class="eyebrow">Utilidad de tu armario</span>' +
    (cov.total ? '<div class="kpi"><b class="num">' + cov.ok + ' de ' + cov.total + '</b><span>plantillas de interés que puedes completar hoy <button class="btn sm ghost" data-act="coverage">Ver cuáles</button></span></div>' : '') +
    '<div class="kpi"><b class="num">' + h.distinctUsed + ' de ' + h.eligible + '</b><span>prendas con uso en los últimos 30 días</span></div>' +
    '<p class="small muted">Repetir también es tener estilo. Antes de comprar, descubre otra combinación.</p></div>';
  return '<div class="card stack">' + dayCard + '</div>' + fCard + util +
    '<div class="card stack tight"><span class="eyebrow">Tu armario</span><div class="row"><button class="btn sm" data-act="addItem">' + IC.plus + 'Agregar prenda</button><button class="btn sm ghost" data-act="quickWear">Registrar uso rápido</button></div></div>';
}

/* ============================ MI ARMARIO ============================ */
function renderCloset() {
  const t = UI.closet.tab;
  const tabs = '<div class="tabs" role="tablist">' + [['prendas', 'Prendas'], ['guardados', 'Outfits guardados'], ['historial', 'Historial']].map(([id, l]) => '<button role="tab" type="button" data-act="closetTab" data-tab="' + id + '" aria-selected="' + (t === id) + '">' + l + '</button>').join('') + '</div>';
  const body = t === 'guardados' ? renderSaved() : t === 'historial' ? renderHistory() : renderItems();
  return sectionTitle('Mi armario', '<button class="btn primary" data-act="addItem">' + IC.plus + 'Agregar prenda</button><label class="btn" for="batch-input" tabindex="0">' + IC.camera + 'Fotos en lote</label><input id="batch-input" type="file" accept="image/*" multiple hidden data-act-change="batch">', 'Prendas, accesorios y outfits') + tabs + body;
}
function renderItems() {
  const w = ws(); const p = prof(); const c = UI.closet;
  const all = ownedItems(w, p.id);
  const q = norm(c.q);
  const cats = Object.keys(CATEGORIES).concat([...new Set(all.map((i) => i.category).filter((x) => !CATEGORIES[x]))]);
  let list = all.filter((i) => {
    if (c.cat !== 'todas' && i.category !== c.cat) return false;
    if (c.avail === 'activas' && isGone(i)) return false;
    if (c.avail === 'disponibles' && !isUsable(i)) return false;
    if (c.avail === 'no disponibles' && (isUsable(i) || isGone(i))) return false;
    if (c.avail === 'salieron' && !isGone(i)) return false;
    if (q && !norm([i.name, i.color, i.material, i.weave, i.subtype, i.id, (i.tags || []).join(' ')].join(' ')).includes(q)) return false;
    return true;
  }).map((i) => ({ i, st: itemStats(w, i) }));
  const lu = (x) => x.st.lastUsed || '0000';
  if (c.sort === 'reciente') list.sort((a, b) => lu(b).localeCompare(lu(a)));
  if (c.sort === 'olvidadas') list.sort((a, b) => lu(a).localeCompare(lu(b)));
  if (c.sort === 'nombre') list.sort((a, b) => a.i.name.localeCompare(b.i.name, 'es'));
  if (c.sort === 'usos') list.sort((a, b) => b.st.wearCount - a.st.wearCount);
  const avail = all.filter(isUsable).length;
  const filters = '<div class="card stack"><div class="row between"><span class="small"><b class="num">' + all.filter((i) => !isGone(i)).length + '</b> artículos activos · <b class="num">' + avail + '</b> disponibles' + (isDemo() ? ' · fichas ficticias de demostración' : '') + '</span>' +
    '<button class="btn sm ghost" data-act="quickWear">Registrar uso rápido</button></div>' +
    '<div class="form-grid"><div class="field"><label for="closet-q">Buscar</label><input class="input" id="closet-q" type="search" value="' + esc(c.q) + '" placeholder="Nombre, color, material…"' + bindAttr('ui', 'closet.q', '', true) + '></div>' +
    fSelect('closet-av', 'Disponibilidad', 'ui', 'closet.avail', c.avail, [['activas', 'Activas'], ['disponibles', 'Disponibles'], ['no disponibles', 'No disponibles'], ['salieron', 'Vendidas o donadas'], ['todas', 'Todas']]) +
    fSelect('closet-sort', 'Ordenar', 'ui', 'closet.sort', c.sort, [['reciente', 'Último uso: reciente'], ['olvidadas', 'Último uso: más antiguo'], ['usos', 'Más usadas'], ['nombre', 'Nombre']]) + '</div>' +
    '<div class="row">' + ['todas'].concat(cats).filter((k) => k === 'todas' || all.some((i) => i.category === k)).map((k) => '<button class="chip btnchip" data-act="closetCat" data-cat="' + esc(k) + '" aria-pressed="' + (c.cat === k) + '">' + esc(k === 'todas' ? 'Todas' : CATEGORIES[k] || k) + ' <span class="num">' + (k === 'todas' ? all.length : all.filter((i) => i.category === k).length) + '</span></button>').join('') + '</div></div>';
  const grid = list.length ? '<div class="grid items">' + list.map(({ i, st }) => '<button type="button" class="item-card' + (isGone(i) ? ' gone' : '') + '" data-act="openItem" data-item="' + i.id + '">' + thumb(i) +
    '<span class="name">' + esc(i.name) + '</span><span class="row" style="gap:4px">' + availBadge(i.availability) + '</span>' +
    '<span class="meta">' + (st.lastUsed ? 'Último uso ' + relDays(daysBetween(st.lastUsed, TODAY)) : 'Sin usos registrados') + ' · <span class="num">' + st.wearCount + '</span> usos</span></button>').join('') + '</div>'
    : emptyState(all.length ? 'Nada coincide con los filtros' : 'Tu armario está vacío', all.length ? 'Prueba otra búsqueda o categoría.' : 'Registra una prenda con o sin foto. Con superior, inferior y calzado ya hay outfits.', '<button class="btn primary" data-act="addItem">Agregar prenda</button>');
  return filters + grid;
}
function miniCollage(itemIds) {
  const w = ws();
  return '<div class="collage">' + itemIds.map((id) => w.items.find((i) => i.id === id)).filter(Boolean).slice(0, 6).map((i) => '<div style="grid-column:span 2">' + thumb(i, { noTag: true }) + '</div>').join('') + '</div>';
}
function renderSaved() {
  const w = ws(); const p = prof();
  const list = w.saved.filter((s) => s.ownerId === p.id);
  if (!list.length) return emptyState('Aún no guardas outfits', 'En Hoy, pulsa “Guardar” en una propuesta para tenerla a mano. Guardar no cuenta como uso.', '<button class="btn" data-act="nav" data-view="hoy">Ir a Hoy</button>');
  return '<div class="grid cards">' + list.map((s) => {
    const gone = s.itemIds.map((id) => w.items.find((i) => i.id === id)).filter((i) => !i || isGone(i));
    const ctx = w.contexts.find((c) => c.id === s.contextId);
    return '<article class="outfit"><span class="role">Guardado · ' + esc(ctx ? ctx.name : 'sin contexto') + '</span><h3>' + esc(s.name) + '</h3>' + miniCollage(s.itemIds) +
      '<span class="small muted">' + esc(s.itemIds.map((id) => (w.items.find((i) => i.id === id) || { name: id }).name).join(', ')) + '</span>' +
      (gone.length ? '<div class="note bad">Incluye prendas que ya no están disponibles para nuevas sugerencias.</div>' : '') +
      '<div class="row">' + (gone.length ? '' : '<button class="btn sm primary" data-act="useSaved" data-id="' + s.id + '">Lo usaré hoy</button>') + '<button class="btn sm ghost" data-act="unsave" data-id="' + s.id + '">Quitar de guardados</button></div></article>';
  }).join('') + '</div>';
}
const LOG_STATUS = { elegido: ['info', 'Elegido (intención)'], planificado: ['info', 'Planificado'], usado: ['ok', 'Usado (confirmado)'], deshecho: ['neutral', 'Uso deshecho'], descartado: ['neutral', 'Elección cancelada'] };
function renderHistory() {
  const w = ws(); const p = prof();
  const logs = w.wearLogs.filter((l) => l.ownerId === p.id).slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  if (!logs.length) return emptyState('Sin historial todavía', 'Cuando confirmes “Sí, lo usé”, aparecerá aquí con fecha, ocasión y prendas.', '');
  return '<div class="note">Generado → guardado → elegido → planificado → usado. Solo “Sí, lo usé” actualiza el último uso y el contador. ' + (isDemo() ? 'Los registros H01–H07 son historial simulado.' : '') + '</div>' +
    '<div class="stack">' + logs.map((l) => {
      const [cls, label] = LOG_STATUS[l.status] || ['neutral', l.status];
      const items = l.snapshot.items.map((s) => { const it = w.items.find((i) => i.id === s.id); return esc(s.name) + (it && isGone(it) ? ' <span class="chip">' + esc(it.availability) + '</span>' : ''); }).join(', ');
      return '<div class="card stack tight"><div class="row between"><b>' + esc(l.snapshot.name) + '</b><span class="badge ' + cls + '">' + label + '</span></div>' +
        '<span class="small muted">' + fmtDate(l.date) + ' · ' + esc(l.contextName || l.occasion || '') + (l.origin === 'demo' ? ' · demo' : '') + '</span><span class="small">' + items + '</span>' +
        ((l.recovered || []).length ? '<span class="chip ok">Recuperó ' + plural(l.recovered.length, 'prenda del desuso', 'prendas del desuso') + '</span>' : '') +
        (l.status === 'usado' ? '<div class="form-grid">' + logRating(l, 'comfort', 'Comodidad') + logRating(l, 'satisfaction', 'Satisfacción') +
          '<div class="field"><label for="ln-' + l.id + '">Notas</label><input class="input" id="ln-' + l.id + '" value="' + esc(l.notes || '') + '" data-log-note="' + l.id + '"></div></div>' : '') +
        '<div class="row">' + (['elegido', 'planificado'].includes(l.status) ? '<button class="btn sm primary" data-act="confirmWear" data-log="' + l.id + '">' + IC.check + 'Sí, lo usé</button><button class="btn sm ghost" data-act="cancelChoice" data-log="' + l.id + '">Cancelar</button>' : '') +
        (l.status === 'usado' ? '<button class="btn sm ghost" data-act="undoWear" data-log="' + l.id + '">Deshacer confirmación</button>' : '') + '</div></div>';
    }).join('') + '</div>';
}
function logRating(l, field, label) {
  return '<div class="field"><label for="lr-' + field + l.id + '">' + label + ' (opcional)</label><select class="input" id="lr-' + field + l.id + '" data-log-rate="' + l.id + '" data-field="' + field + '">' +
    [['', '—'], ['1', '1 · baja'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 · alta']].map((o) => opt(o[0], l[field] ?? '', o[1])).join('') + '</select></div>';
}
