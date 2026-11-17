/* =====================================================================
   BIENVENIDA EN HISTORIAS + RECORRIDO POR TODA LA APP
   Al instalar: 7 historias de pantalla completa (como en Instagram) con
   piezas reales de RELISTO animadas; la sexta te pregunta tu vibra y tus
   colores, y la séptima te muestra tu figura con esa paleta. Después,
   un recorrido que viaja por Hoy, Armario, Plan, Circular y Perfil.
   ===================================================================== */
const STORY_MS = 6500;
const ST = { root: null, raf: null, timer: 0, last: 0 };
const storiesDone = () => { try { return localStorage.getItem('relisto-stories-done') === '1'; } catch (e) { return true; } };
const STORY_STYLES = [['casual', 'Cómodo y sencillo'], ['smart casual', 'Relajado pero cuidado'], ['urbano/streetwear', 'Urbano, con actitud'], ['clásico', 'Atemporal'], ['minimalista', 'Pocas piezas, muy bien elegidas'], ['creativo', 'Me gusta arriesgar']];
const STORY_COLORS = ['negro', 'blanco', 'gris', 'beige', 'azul marino', 'celeste', 'verde', 'oliva', 'burdeos', 'terracota', 'camel', 'rosa'];
const sItem = (category, subtype, color, extra) => Object.assign({ id: 'ST-' + subtype + color, name: subtype, category, subtype, color, cut: 'regular', formality: 2, pattern: 'liso', availability: 'disponible' }, extra || {});
const miniCard = (items, label, cls) => '<div class="st-card ' + (cls || '') + '"><span class="st-card-l">' + esc(label) + '</span><div class="st-card-g">' + items.map((i) => '<span>' + illusSVG(i) + '</span>').join('') + '</div></div>';
function storyPicks() { UI.story.picks = UI.story.picks || { styles: [], colors: [] }; return UI.story.picks; }
function storyFigureItems() {
  const pk = storyPicks(); const c1 = pk.colors[0] || 'azul marino'; const c2 = pk.colors.find((c) => ['negro', 'gris', 'beige', 'blanco', 'azul marino', 'camel'].includes(c) && c !== c1) || (c1 === 'beige' ? 'azul marino' : 'beige');
  const urban = pk.styles.includes('urbano/streetwear') || pk.styles.includes('casual');
  return [sItem('superior', urban ? 'camiseta' : 'camisa', c1), sItem('inferior', urban ? 'jean' : 'chino', urban ? 'azul' : c2), sItem('calzado', urban ? 'zapatillas' : 'mocasines', urban ? 'blanco' : 'marrón')];
}
const SLIDES = [
  { bg: 'st-forest', render: () => {
    const p = prof() || {}; const n = p.name && !/^Tú$/.test(p.name) ? ', ' + esc(p.name.split(' ')[0]) : '';
    return '<div class="st-vis st-fan">' + miniCard([sItem('superior', 'camisa', 'blanco'), sItem('inferior', 'chino', 'beige'), sItem('calzado', 'mocasines', 'marrón')], 'Segura', 'f1') +
      miniCard([sItem('superior', 'polo', 'azul marino'), sItem('inferior', 'jean', 'azul'), sItem('calzado', 'zapatillas', 'blanco')], 'Con personalidad', 'f2') +
      miniCard([sItem('superior', 'camiseta', 'terracota'), sItem('inferior', 'pantalón', 'negro'), sItem('calzado', 'zapatillas', 'negro')], 'Creativa', 'f3') + '</div>' +
      '<div class="st-copy"><span class="st-eyebrow">Bienvenida</span><h2>Hola' + n + '.<br><em>Ya tienes qué ponerte.</em></h2><p>Tu próximo gran outfit ya está en tu armario. RELISTO solo lo encuentra por ti.</p></div>';
  } },
  { bg: 'st-coral', render: () => '<div class="st-vis st-phone"><div class="st-ctx"><span>Para hoy</span><b>Reunión con confianza</b><i>San Isidro · 09:00 · 22 °C</i></div><div class="st-cta">✨ Arma mi día</div>' +
      '<div class="st-slide">' + miniCard([sItem('superior', 'camisa', 'celeste'), sItem('inferior', 'chino', 'beige'), sItem('calzado', 'mocasines', 'marrón')], '100% completo', 's1') + '</div></div>' +
      '<div class="st-copy"><span class="st-eyebrow">1 · Hoy</span><h2>Un toque,<br><em>tres outfits.</em></h2><p>Dicta a dónde vas y RELISTO combina solo la ropa que tienes limpia y disponible.</p></div>' },
  { bg: 'st-lavender', render: () => '<div class="st-vis st-spin"><div class="st-fig">' + figureSVG(Object.assign({}, prof() || {}, { build: 'media' }), storyFigureItems(), { label: 'Figura ilustrada girando' }) + '</div><span class="st-badge">↻ 360°</span></div>' +
      '<div class="st-copy"><span class="st-eyebrow">2 · Ver puesto</span><h2>Pruébatelo<br><em>sin probártelo.</em></h2><p>Mira el outfit en una figura con tu tono de piel, de frente y de espalda.</p></div>' },
  { bg: 'st-sage', render: () => '<div class="st-vis st-memory"><div class="st-flip"><div class="st-face a">' + illusSVG(sItem('superior', 'polo', 'azul marino')) + '<span>Ilustración</span></div><div class="st-face b">📷<span>Tu foto real</span></div></div>' +
      '<div class="st-tag"><b>SUP-003</b><span>12 usos · último: ayer</span>' + (typeof QR !== 'undefined' ? '<span class="st-qr">' + QR.svg('SUP-003', { label: 'Código QR de ejemplo' }) + '</span>' : '') + '</div></div>' +
      '<div class="st-copy"><span class="st-eyebrow">3 · Tu armario</span><h2>Tu ropa,<br><em>con memoria.</em></h2><p>Una foto basta: ilustración, color, código y cuántas veces la usaste. En Panorama ves qué puedes redescubrir.</p></div>' },
  { bg: 'st-gold', render: () => '<div class="st-vis st-shop"><div class="st-listing">' + illusSVG(sItem('capa', 'sobrecamisa', 'arena')) + '<div><b>S/ 95</b> <i>acepta ofertas</i><span>San Borja · ≈ 4 km</span><em>+6 outfits con tu armario</em><span class="st-stars">★★★★★ 5</span></div></div><div class="st-offer">Noa ofertó <b>S/ 80</b> · <u>Aceptar</u></div></div>' +
      '<div class="st-copy"><span class="st-eyebrow">4 · Circular</span><h2>Lo que no usas,<br><em>que lo sepan.</em></h2><p>Publica con tu precio, recibe ofertas de gente cerca y deja que tu ropa tenga otra vida.</p></div>' },
  { bg: 'st-forest', interactive: true, render: () => {
    const pk = storyPicks();
    return '<div class="st-copy top"><span class="st-eyebrow">5 · Tú</span><h2>¿Cuál es<br><em>tu vibra?</em></h2><p>Elige hasta dos. Así tus primeras sugerencias ya se sienten tuyas.</p></div>' +
      '<div class="st-pick">' + STORY_STYLES.map(([k, t]) => '<button type="button" class="st-opt" data-act="storyStyle" data-val="' + esc(k) + '" aria-pressed="' + pk.styles.includes(k) + '"><b>' + esc(cap1(k.split('/')[0])) + '</b><span>' + esc(t) + '</span></button>').join('') + '</div>' +
      '<span class="st-sub">Colores que más usas</span><div class="st-colors">' + STORY_COLORS.map((c) => '<button type="button" class="st-col" data-act="storyColor" data-val="' + esc(c) + '" aria-pressed="' + pk.colors.includes(c) + '" aria-label="' + esc(c) + '"><i style="background:' + colorHex(c) + '"></i><span>' + esc(c) + '</span></button>').join('') + '</div>';
  } },
  { bg: 'st-coral', final: true, render: () => {
    const pk = storyPicks(); const st = pk.styles[0] ? cap1(pk.styles[0].split('/')[0]) : 'tuyo';
    return '<div class="st-vis st-reveal"><div class="st-fig pop">' + figureSVG(Object.assign({}, prof() || {}, { build: (prof() || {}).build || 'media' }), storyFigureItems(), { label: 'Tu figura con tu estilo' }) + '</div></div>' +
      '<div class="st-copy"><span class="st-eyebrow">Listo</span><h2>Tu estilo:<br><em>' + esc(st) + '.</em></h2><p>Esta es tu figura con tus colores. La afinas cuando quieras en Mi perfil.</p>' +
      (typeof BETA_ON !== 'undefined' && BETA_ON ? '<p class="st-beta">Estás en la <b>beta privada</b>: toca <b>Beta</b> arriba cuando quieras contarnos qué mejorar.</p>' : '') +
      '<div class="st-actions"><button type="button" class="btn lg st-go" data-act="storyFinish" data-tour="1">Mostrarme la app</button><button type="button" class="btn ghost st-skip" data-act="storyFinish">Empezar ya</button></div></div>';
  } }
];
function openStories() {
  UI.story = { i: 0, picks: { styles: ((prof() || {}).styles || []).slice(0, 2), colors: ((prof() || {}).colors || []).slice(0, 3) }, paused: false };
  UI.tour = null; paintStories(); startStoryClock();
}
function closeStories(saveFlag) {
  cancelAnimationFrame(ST.raf); UI.story = null; if (ST.root) ST.root.innerHTML = '';
  document.documentElement.classList.remove('story-open');
  if (saveFlag) try { localStorage.setItem('relisto-stories-done', '1'); } catch (e) { /* */ }
}
function paintStories() {
  if (!ST.root) { ST.root = document.createElement('div'); ST.root.id = 'story-root'; document.body.appendChild(ST.root); }
  const s = UI.story; if (!s) { ST.root.innerHTML = ''; return; }
  const sl = SLIDES[s.i];
  document.documentElement.classList.add('story-open');
  ST.root.innerHTML = '<div class="stories ' + sl.bg + (sl.interactive ? ' interactive' : '') + '" role="dialog" aria-modal="true" aria-label="Bienvenida a RELISTO, historia ' + (s.i + 1) + ' de ' + SLIDES.length + '">' +
    '<div class="st-bars" aria-hidden="true">' + SLIDES.map((_, k) => '<i><b style="width:' + (k < s.i ? 100 : 0) + '%"' + (k === s.i ? ' id="st-now"' : '') + '></b></i>').join('') + '</div>' +
    '<div class="st-top"><span class="st-brand">' + LOGO + 'RELISTO</span><span class="grow"></span>' + (sl.interactive || sl.final ? '' : '<button type="button" class="st-x" data-act="storyPause" aria-label="' + (s.paused ? 'Reanudar' : 'Pausar') + '">' + (s.paused ? '▶' : '❚❚') + '</button>') + '<button type="button" class="st-x" data-act="storySkip" aria-label="Saltar la bienvenida">✕</button></div>' +
    (sl.interactive || sl.final ? '' : '<button type="button" class="st-tap prev" data-act="storyPrev" aria-label="Anterior"></button><button type="button" class="st-tap next" data-act="storyNext" aria-label="Siguiente"></button>') +
    '<div class="st-body" key="' + s.i + '">' + sl.render() + '</div>' +
    (sl.interactive ? '<div class="st-foot"><button type="button" class="btn ghost st-skip" data-act="storyPrev">Atrás</button><button type="button" class="btn lg st-go" data-act="storyNext">' + (storyPicks().styles.length || storyPicks().colors.length ? 'Ver mi estilo' : 'Saltar este paso') + '</button></div>' : '') +
    '</div>';
  const focus = ST.root.querySelector(sl.interactive ? '.st-opt' : sl.final ? '.st-go' : '[data-act="storyNext"]');
  if (focus) try { focus.focus({ preventScroll: true }); } catch (e) { /* */ }
}
function startStoryClock() {
  cancelAnimationFrame(ST.raf); ST.timer = 0; ST.last = performance.now();
  const tick = (now) => {
    const s = UI.story; if (!s) return;
    const sl = SLIDES[s.i];
    if (!s.paused && !sl.interactive && !sl.final && document.visibilityState === 'visible') ST.timer += now - ST.last;
    ST.last = now;
    const bar = document.getElementById('st-now');
    if (bar) bar.style.width = (sl.interactive || sl.final ? 100 : Math.min(100, (ST.timer / STORY_MS) * 100)) + '%';
    if (ST.timer >= STORY_MS) { storyGo(s.i + 1); return; }
    ST.raf = requestAnimationFrame(tick);
  };
  ST.raf = requestAnimationFrame(tick);
}
function storyGo(i) {
  if (!UI.story) return;
  if (i < 0) i = 0;
  if (i >= SLIDES.length) i = SLIDES.length - 1;
  UI.story.i = i; UI.story.paused = false; paintStories(); startStoryClock();
}
function saveStoryPicks() {
  const p = prof(); const pk = storyPicks(); if (!p) return;
  if (pk.styles.length) p.styles = [...new Set(pk.styles.concat(p.styles || []))].slice(0, 4);
  if (pk.colors.length) p.colors = [...new Set(pk.colors.concat(p.colors || []))].slice(0, 6);
  if (pk.styles.length || pk.colors.length) commit({ render: false });
}
Object.assign(ACT, {
  storiesOpen: () => { UI.modal = null; render(); openStories(); },
  storyNext: () => storyGo(UI.story.i + 1),
  storyPrev: () => storyGo(UI.story.i - 1),
  storySkip: () => { saveStoryPicks(); closeStories(true); render(); toast('Puedes volver a verla en el menú ⋯ → Ver la bienvenida.'); },
  storyPause: () => { UI.story.paused = !UI.story.paused; paintStories(); },
  storyStyle: (el) => { const pk = storyPicks(); const v = el.dataset.val; pk.styles = pk.styles.includes(v) ? pk.styles.filter((x) => x !== v) : pk.styles.concat(v).slice(-2); paintStories(); },
  storyColor: (el) => { const pk = storyPicks(); const v = el.dataset.val; pk.colors = pk.colors.includes(v) ? pk.colors.filter((x) => x !== v) : pk.colors.concat(v).slice(-3); paintStories(); },
  storyFinish: (el) => { saveStoryPicks(); closeStories(true); UI.view = 'hoy'; render(); if (el.dataset.tour) setTimeout(startTour, 250); else toast('¡Listo! El recorrido por la app está en el menú ⋯ cuando lo quieras.'); }
});
document.addEventListener('keydown', (e) => {
  if (!UI.story) return;
  if (e.key === 'Escape') { e.preventDefault(); ACT.storySkip(); }
  else if (e.key === 'ArrowRight' && !SLIDES[UI.story.i].interactive) storyGo(UI.story.i + 1);
  else if (e.key === 'ArrowLeft') storyGo(UI.story.i - 1);
}, true);
/* Mantener presionado pausa la historia (como en redes). */
document.addEventListener('pointerdown', (e) => { if (UI.story && e.target.closest && e.target.closest('.st-tap')) { ST.hold = setTimeout(() => { if (UI.story) { UI.story.paused = true; ST.held = true; } }, 350); } });
document.addEventListener('pointerup', () => { clearTimeout(ST.hold); if (ST.held && UI.story) { UI.story.paused = false; ST.held = false; ST.swallow = true; setTimeout(() => { ST.swallow = false; }, 50); } });
document.addEventListener('click', (e) => { if (ST.swallow && e.target.closest && e.target.closest('.st-tap')) { e.stopPropagation(); e.preventDefault(); } }, true);

/* ---------- Recorrido por toda la app ---------- */
const emptyCloset = () => { const w = ws(); const p = prof(); return !!(w && p) && !ownedItems(w, p.id).length; };
const TOUR_ALL = [
  { view: 'hoy', sel: ['[data-tour="ctx"]', '.hero [data-act="addItem"]'],
    get title() { return emptyCloset() ? 'Empieza por tu ropa' : 'Dime a dónde vas'; },
    get text() { return emptyCloset() ? 'Agrega 3 prendas con una foto (arriba, abajo y calzado) y RELISTO ya puede armarte outfits.' : 'Toca aquí y escribe o dicta tu día: “reunión en San Isidro, caminaré bastante”. RELISTO lo convierte en ocasión, clima y estilo.'; } },
  { view: 'hoy', get sel() { return emptyCloset() ? ['[data-tour="nav-arma"]', '.side .big-cta'] : ['[data-tour="arma"]', '[data-tour="nav-arma"]']; }, title: 'Un toque, tres outfits', text: '“Arma mi día” combina solo ropa disponible. Elige uno con “Me lo pongo hoy” y, cuando lo uses, confírmalo.' },
  { view: 'hoy', sel: ['.icon-btn.bell', '.side-bell'], title: 'Todo lo pendiente, aquí', text: 'Outfits por confirmar, ropa por lavar y ofertas de la Vitrina. Si hay algo, verás un número.' },
  { view: 'armario', setup: () => { UI.closet.tab = 'prendas'; }, sel: ['.fab-add', '[data-act="addItem"]'], title: 'Tu armario en fotos', text: 'Toma una foto, elige qué es y listo: el color se detecta solo y cada prenda recibe su código.' },
  { view: 'armario', setup: () => { UI.closet.tab = 'prendas'; }, sel: ['[data-act="closetTab"][data-tab="panorama"]'], title: 'Panorama', text: 'Qué usas, qué es ocasional y qué puedes redescubrir. Sin culpa: repetir también es tener estilo.' },
  { view: 'plan', setup: () => { UI.plan.tab = 'faltantes'; }, sel: ['[data-act="planTab"][data-tab="calendario"]'], title: 'Planifica tu semana', text: 'Elige qué ponerte cada día, con varias opciones. Te avisamos si algo está por lavar o se repite.' },
  { view: 'circular', setup: () => { UI.circ.tab = 'revisar'; }, sel: ['[data-act="circTab"][data-tab="vitrina"]'], title: 'La Vitrina', text: 'Vende lo que no usas con tu precio, recibe ofertas de gente cerca y deja estrellas al comprar.' },
  { view: 'perfil', setup: () => { UI.profTab = 'tu'; }, sel: ['[data-act="profTab"][data-tab="imagen"]'], title: 'Tu paleta y tu figura', text: 'Con tu subtono y tu rostro, RELISTO elige colores que te favorecen y arma tu figura ilustrada.' },
  { view: 'hoy', sel: ['[data-tour="beta"]', '[data-tour="who"]'], title: typeof BETA_ON !== 'undefined' && BETA_ON ? 'Tu opinión manda' : 'Tu cuenta', text: typeof BETA_ON !== 'undefined' && BETA_ON ? 'Estás en la beta privada. Toca “Beta” cuando algo te guste, falle o se te ocurra una idea: lo leemos todo.' : 'Aquí cambias de perfil, entras a tu cuenta y compartes RELISTO.' }
];
TOUR_STEPS.splice(0, TOUR_STEPS.length, ...TOUR_ALL);
tourGo = function (i) { // eslint-disable-line no-func-assign
  if (i < 0) return;
  if (i >= TOUR_STEPS.length) { endTour(true); UI.view = 'hoy'; render(); return; }
  UI.tour.i = i; UI.tour.scrolled = -1; const st = TOUR_STEPS[i];
  UI.modal = null; UI.view = st.view || 'hoy'; if (st.setup) st.setup(); if (st.before) st.before();
  render(); window.scrollTo(0, 0);
  const el = visibleEl(st.sel); const tabs = el && el.closest('.tabs');
  if (tabs) { tabs.scrollLeft = Math.max(0, el.offsetLeft - (tabs.clientWidth - el.offsetWidth) / 2); renderTourLayer(); }
};
startTour = function () { UI.modal = null; UI.sceneHint = false; UI.tour = { i: 0, scrolled: -1 }; tourGo(0); }; // eslint-disable-line no-func-assign
/* Primera vez: historias si nunca vio la bienvenida ni el recorrido. */
maybeAutoTour = function () { // eslint-disable-line no-func-assign
  if (!IS_PWA || UI.auth || UI.modal || UI.story) return;
  if (!storiesDone() && !tourDone()) setTimeout(() => { if (!UI.auth && !UI.story) openStories(); }, 350);
};
