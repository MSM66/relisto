/* =====================================================================
   ESTILO PERSONAL: paleta por subtono, contraste, forma del rostro
   (visagismo) y sugerencias de prendas que suman. Todo se basa en datos
   que la persona declara; son sugerencias flexibles, no reglas.
   ===================================================================== */
const PALETTES = {
  'cálido': { label: 'cálida', colors: ['camel', 'terracota', 'oliva', 'mostaza', 'crema', 'marrón', 'coral', 'verde bosque'], metal: 'dorado', hint: 'Tonos con base amarilla o dorada.' },
  'frío': { label: 'fría', colors: ['azul marino', 'burdeos', 'esmeralda', 'lavanda', 'gris', 'fucsia', 'azul rey', 'blanco'], metal: 'plateado', hint: 'Tonos con base azulada o rosada.' },
  'neutro': { label: 'neutra', colors: ['azul marino', 'salvia', 'rosa palo', 'gris', 'beige', 'verde azulado', 'blanco roto', 'burdeos'], metal: 'dorado o plateado', hint: 'Te acompañan tonos cálidos y fríos suavizados.' },
  'oliva': { label: 'oliva', colors: ['oliva', 'berenjena', 'mostaza', 'verde azulado', 'terracota', 'camel', 'burdeos', 'crema'], metal: 'dorado', hint: 'Tonos profundos y terrosos.' }
};
const FACE_SHAPES = {
  ovalado: { label: 'Ovalado', necks: ['casi cualquier cuello'], tip: 'Tu forma admite casi todos los cuellos: elige por gusto y ocasión.', glasses: 'casi cualquier montura', path: 'M50 10 C72 10 82 32 82 52 C82 76 68 92 50 92 C32 92 18 76 18 52 C18 32 28 10 50 10Z' },
  redondo: { label: 'Redondo', necks: ['cuello en V', 'cuello camisero en punta'], tip: 'Los cuellos en V y las líneas verticales suelen alargar visualmente el rostro.', glasses: 'monturas rectangulares', path: 'M50 12 C75 12 86 32 86 52 C86 74 72 90 50 90 C28 90 14 74 14 52 C14 32 25 12 50 12Z' },
  cuadrado: { label: 'Cuadrado', necks: ['cuello en V suave', 'cuello redondo'], tip: 'Las formas suaves y redondeadas equilibran una mandíbula marcada.', glasses: 'monturas redondas u ovaladas', path: 'M24 14 H76 Q84 14 84 24 V72 Q84 90 66 90 H34 Q16 90 16 72 V24 Q16 14 24 14Z' },
  alargado: { label: 'Alargado', necks: ['cuello redondo', 'cuello barco', 'cuello alto'], tip: 'Los cuellos horizontales o altos suelen acortar visualmente el rostro.', glasses: 'monturas anchas', path: 'M50 6 C68 6 76 26 76 50 C76 78 66 96 50 96 C34 96 24 78 24 50 C24 26 32 6 50 6Z' },
  'corazón': { label: 'Corazón', necks: ['cuello barco', 'cuello redondo'], tip: 'Los cuellos amplios equilibran una frente más ancha que el mentón.', glasses: 'monturas con base ancha', path: 'M18 22 Q18 12 34 12 H66 Q82 12 82 22 Q82 56 50 92 Q18 56 18 22Z' },
  diamante: { label: 'Diamante', necks: ['cuello barco', 'cuello en V moderado'], tip: 'Los cuellos que suman anchura arriba equilibran pómulos marcados.', glasses: 'monturas ovaladas', path: 'M50 8 Q70 28 84 50 Q70 74 50 94 Q30 74 16 50 Q30 28 50 8Z' }
};
const MONK_HEX = ['#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96', '#a07e56', '#825c43', '#604134', '#3a312a', '#292420'];
const HAIR_COLORS = { negro: '#1d1a19', 'castaño oscuro': '#3b2a20', 'castaño': '#6b4a33', rubio: '#c9a76a', pelirrojo: '#a4512b', canoso: '#bdbcb8', otro: '#7a6a5a' };
const HAIR_STYLES = ['corto', 'medio', 'largo', 'recogido', 'rizado', 'rapado'];
function monkIndex(p) { const m = String((p && p.skinTone) || '').match(/Monk (\d+)/); return m ? Number(m[1]) : null; }
function skinHex(p) { if (p && p.avatar && p.avatar.skinHex) return p.avatar.skinHex; const i = monkIndex(p); return i ? MONK_HEX[i - 1] : '#c8a17e'; }
function hairHex(p) { if (p && p.avatar && p.avatar.hairHex) return p.avatar.hairHex; return HAIR_COLORS[(p && p.hair) || ''] || HAIR_COLORS['castaño oscuro']; }
function contrastLevel(p) {
  const hasSkin = monkIndex(p) || (p.avatar && p.avatar.skinHex); const hasHair = p.hair || (p.avatar && p.avatar.hairHex);
  if (hasSkin && hasHair) { const d = Math.abs(hexLum(skinHex(p)) - hexLum(hairHex(p))); return d > 0.45 ? 'alto' : d > 0.22 ? 'medio' : 'bajo'; }
  return p.contrast || null;
}
const CONTRAST_TIP = {
  alto: 'Tu contraste natural es alto: combinaciones claras y oscuras juntas (blanco con azul marino, negro con crema) suelen verse nítidas.',
  medio: 'Tu contraste es medio: combina un tono claro con uno medio, sin extremos.',
  bajo: 'Tu contraste es suave: tonos cercanos entre sí (beige con camel, gris con azul grisáceo) suelen armonizar.'
};
/** Qué tan completo está el perfil de estilo y qué falta. */
function styleCompleteness(p) {
  const checks = [
    ['styles', 'Estilos', (p.styles || []).length > 0],
    ['colors', 'Colores favoritos', (p.colors || []).length > 0],
    ['undertone', 'Subtono', p.undertone && p.undertone !== 'no sé'],
    ['skin', 'Tono de piel', !!(monkIndex(p) || (p.avatar && p.avatar.skinHex))],
    ['face', 'Forma del rostro', !!(p.faceShape && FACE_SHAPES[p.faceShape])],
    ['build', 'Complexión', p.build && p.build !== 'prefiero omitir'],
    ['fit', 'Ajuste preferido', !!p.fit],
    ['hair', 'Cabello', !!(p.hair || (p.avatar && p.avatar.hairStyle))]
  ];
  const done = checks.filter((c) => c[2]).length;
  return { percent: Math.round((100 * done) / checks.length), done, total: checks.length, missing: checks.filter((c) => !c[2]).map((c) => c[1]), paletteReady: !!PALETTES[p.undertone] };
}
function personalPalette(p) {
  const pal = PALETTES[p.undertone]; if (!pal) return null;
  const avoid = (p.avoidColors || []).map(norm);
  return Object.assign({}, pal, { colors: pal.colors.filter((c) => !avoid.includes(norm(c))), contrast: contrastLevel(p), face: FACE_SHAPES[p.faceShape] || null });
}
function inPalette(p, color) { const pal = PALETTES[p && p.undertone]; return !!pal && pal.colors.some((c) => norm(color).includes(norm(c))); }

/* ---------- Sugerencias de prendas que suman, con paleta y rostro ---------- */
const STYLE_ARCHETYPES = [
  { type: 'camiseta', category: 'superior', formality: 1, neck: 'redondo' }, { type: 'camiseta', category: 'superior', formality: 1, neck: 'V' },
  { type: 'camisa', category: 'superior', formality: 3, neck: 'camisero' }, { type: 'polo', category: 'superior', formality: 2, neck: 'camisero' },
  { type: 'suéter', category: 'superior', formality: 2, neck: 'redondo', warmth: 3 }, { type: 'blusa', category: 'superior', formality: 3, neck: 'barco' },
  { type: 'pantalón', category: 'inferior', formality: 3 }, { type: 'chino', category: 'inferior', formality: 2 }, { type: 'jean', category: 'inferior', formality: 2 },
  { type: 'falda', category: 'inferior', formality: 3 }, { type: 'blazer', category: 'capa', formality: 4, warmth: 2 },
  { type: 'zapatillas', category: 'calzado', formality: 1 }, { type: 'mocasines', category: 'calzado', formality: 3 }
];
const NECK_FOR_FACE = { redondo: 'V', cuadrado: 'redondo', alargado: 'barco', 'corazón': 'barco', diamante: 'barco', ovalado: null };
function neckLabel(n) { return { V: 'cuello en V', redondo: 'cuello redondo', barco: 'cuello barco', camisero: 'cuello camisero' }[n] || ''; }
function styleSuggestions(ws, ownerId, p, limit) {
  const pal = personalPalette(p);
  if (!pal) return [];
  const colors = pal.colors.concat(['blanco', 'negro', 'gris', 'azul marino', 'beige']).filter((c, i, a) => a.indexOf(c) === i);
  const wantNeck = NECK_FOR_FACE[p.faceShape] || null;
  const fit = p.fit === 'relajado' || p.fit === 'oversized' ? 'relajado' : p.fit === 'ceñido' ? 'ceñido' : 'regular';
  const owned = ownedItems(ws, ownerId).filter((i) => !isGone(i));
  const out = [];
  STYLE_ARCHETYPES.forEach((a, ai) => {
    if (wantNeck && a.neck && a.neck !== wantNeck && a.neck !== 'camisero' && ['camiseta', 'blusa'].includes(a.type)) return;
    colors.forEach((color) => {
      if (owned.some((i) => i.subtype === a.type && norm(i.color) === norm(color))) return;
      const cand = { id: 'SUG' + ai + '-' + norm(color).replace(/\s/g, ''), ownerId, name: (a.type.charAt(0).toUpperCase() + a.type.slice(1)) + ' ' + agreeColor(a.type, color) + (a.neck && a.neck !== 'camisero' ? ' (' + neckLabel(a.neck) + ')' : ''),
        category: a.category, subtype: a.type, color, cut: a.category === 'calzado' ? 'bajo' : fit, formality: a.formality, warmth: a.warmth || 1, availability: 'disponible', material: 'material no confirmado', hypothetical: true };
      const v = purchaseValue(ws, ownerId, cand);
      if (!v.added.length) return;
      const palBonus = inPalette(p, color) ? 6 : 0;
      const favBonus = (p.colors || []).some((c) => norm(c) === norm(color)) ? 4 : 0;
      const reasons = [];
      reasons.push('Permitiría ' + v.added.length + ' combinaciones nuevas con tus prendas.');
      if (palBonus) reasons.push('El ' + color + ' está en tu paleta ' + pal.label + '.');
      else if (['blanco', 'negro', 'gris', 'azul marino', 'beige'].includes(color)) reasons.push('Neutro que combina con casi todo tu armario.');
      if (a.neck && wantNeck && a.neck === wantNeck && pal.face) reasons.push(cap1(neckLabel(a.neck)) + ': ' + pal.face.tip.charAt(0).toLowerCase() + pal.face.tip.slice(1));
      if (a.category !== 'calzado' && p.fit) reasons.push('Corte ' + fit + ', como prefieres.');
      out.push({ candidate: cand, added: v.added, before: v.before, after: v.after, score: v.added.length * 2 + palBonus + favBonus, reasons });
    });
  });
  out.sort((x, y) => y.score - x.score);
  // Variedad: primero una por categoría y color distinto; luego se completa por puntaje.
  const picked = []; const seenType = new Set(); const seenCat = new Set(); const seenColor = new Set(); const max = limit || 3;
  for (const s of out) { const c = s.candidate; if (seenCat.has(c.category) || seenColor.has(norm(c.color))) continue; seenCat.add(c.category); seenColor.add(norm(c.color)); seenType.add(c.subtype); picked.push(s); if (picked.length >= max) return picked; }
  for (const s of out) { if (picked.includes(s) || seenType.has(s.candidate.subtype)) continue; seenType.add(s.candidate.subtype); picked.push(s); if (picked.length >= max) break; }
  return picked;
}
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Color dominante de una foto ---------- */
function dominantColor(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob); const img = new Image();
    img.onload = () => {
      const N = 48; const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, N, N);
      let px; try { px = ctx.getImageData(0, 0, N, N).data; } catch (e) { URL.revokeObjectURL(url); return resolve(null); }
      URL.revokeObjectURL(url);
      // Fondo estimado con el borde de la imagen
      let br = 0, bg = 0, bb = 0, bn = 0;
      for (let i = 0; i < N; i++) for (const [x, y] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) { const k = (y * N + x) * 4; br += px[k]; bg += px[k + 1]; bb += px[k + 2]; bn++; }
      br /= bn; bg /= bn; bb /= bn;
      const buckets = new Map();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const k = (y * N + x) * 4; const r = px[k], g = px[k + 1], b = px[k + 2];
        const dBg = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
        const dx = x / N - 0.5, dy = y / N - 0.5; const center = 1.6 - Math.sqrt(dx * dx + dy * dy) * 2;
        const w = Math.max(0.05, center) * (dBg < 40 ? 0.15 : 1);
        const key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
        const e = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 }; e.w += w; e.r += r * w; e.g += g * w; e.b += b * w; buckets.set(key, e);
      }
      let best = null; buckets.forEach((e) => { if (!best || e.w > best.w) best = e; });
      if (!best) return resolve(null);
      const hex = '#' + [best.r / best.w, best.g / best.w, best.b / best.w].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      resolve(hex);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
function hexToRgb(h) { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function nearestColorName(hex) {
  const [r, g, b] = hexToRgb(hex); let best = null, bd = Infinity;
  QUICK_COLORS.forEach((name) => {
    const ch = colorHex(name); if (!ch.startsWith('#')) return;
    const [r2, g2, b2] = hexToRgb(ch); const rm = (r + r2) / 2;
    const d = Math.sqrt((2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2);
    if (d < bd) { bd = d; best = name; }
  });
  return best;
}
