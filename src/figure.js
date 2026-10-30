/* =====================================================================
   FIGURA ILUSTRADA: una silueta tipo figurín, con el tono de piel,
   cabello y complexión que la persona elige, vestida con las prendas
   reales del outfit (color de la ficha o tomado de su foto).
   Es una vista ilustrativa: no representa ajuste, tejido ni talla.
   ===================================================================== */
const BUILDS = { delgada: { sh: 37, wa: 26, hi: 32, limb: 8.5 }, media: { sh: 41, wa: 30, hi: 36, limb: 9.5 }, 'atlética': { sh: 46, wa: 31, hi: 36, limb: 10.5 }, robusta: { sh: 47, wa: 40, hi: 44, limb: 11.5 } };
function garmentHex(item) { return item.photoHex || colorHex(norm(item.color).includes(' y ') ? item.color.split(' y ')[0] : item.color); }
function darker(hex, a) { return shade(hex.startsWith('#') ? hex : '#888888', -(a || 0.3)); }
let FIG_UID = 0;
function figureSVG(p, items, opts) {
  opts = opts || {};
  const uid = 'f' + (++FIG_UID); const back = opts.view === 'back';
  const b = BUILDS[p && p.build] || BUILDS.media;
  const cx = 100; const skin = skinHex(p || {}); const skinD = darker(skin, 0.18);
  const hair = hairHex(p || {}); const style = (p && p.avatar && p.avatar.hairStyle) || (p && p.hair ? 'medio' : 'corto');
  const role = (r) => items.filter((i) => roleOf(i) === r);
  const top = role('top')[0]; const bottom = role('bottom')[0]; const full = role('full')[0]; const layer = role('layer')[0]; const shoes = role('shoes')[0];
  const acc = role('accessory');
  const out = [];
  const st = (hex) => 'stroke="' + darker(hex, 0.35) + '" stroke-width="1.4" stroke-linejoin="round"';
  const pattern = (item, base) => {
    if (!item || !norm(item.color).includes(' y ')) return base;
    const id = uid + 'p' + item.id; const c2 = colorHex(item.color.split(' y ')[1]);
    out.push('<defs><pattern id="' + id + '" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="' + c2 + '"/><rect width="3.5" height="7" fill="' + base + '"/></pattern></defs>');
    return 'url(#' + id + ')';
  };
  const face = (p && FACE_SHAPES[p.faceShape]) ? p.faceShape : 'ovalado';
  const headRx = { redondo: 22.5, alargado: 18.5, cuadrado: 21, 'corazón': 20, diamante: 19.5, ovalado: 20 }[face];
  const headRy = { redondo: 24, alargado: 28, cuadrado: 24.5, 'corazón': 25.5, diamante: 26, ovalado: 26 }[face];
  const Y = { head: 44, neck0: 64, sh: 92, waist: 182, hip: 212, crotch: 232, knee: 305, ankle: 384 };
  const armL = [[cx - b.sh + 3, Y.sh + 5], [cx - b.sh - 9, 212]]; const armR = [[cx + b.sh - 3, Y.sh + 5], [cx + b.sh + 9, 212]];
  const lerp = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
  const line = (a, c, w, col, extra) => '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + c[0].toFixed(1) + '" y2="' + c[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || '') + '/>';
  // Cabello de atrás
  if (!back && style === 'largo') out.push('<path d="M' + (cx - headRx - 4) + ' ' + (Y.head - 4) + ' Q' + (cx - headRx - 10) + ' 110 ' + (cx - b.sh + 6) + ' 132 L' + (cx + b.sh - 6) + ' 132 Q' + (cx + headRx + 10) + ' 110 ' + (cx + headRx + 4) + ' ' + (Y.head - 4) + ' Z" fill="' + hair + '"/>');
  if (!back && style === 'medio') out.push('<path d="M' + (cx - headRx - 3) + ' ' + (Y.head - 2) + ' Q' + (cx - headRx - 6) + ' 80 ' + (cx - headRx + 2) + ' 86 L' + (cx + headRx - 2) + ' 86 Q' + (cx + headRx + 6) + ' 80 ' + (cx + headRx + 3) + ' ' + (Y.head - 2) + ' Z" fill="' + hair + '"/>');
  // Piernas y brazos (piel)
  const legL = 'M' + (cx - b.hi + 1) + ' ' + (Y.hip - 4) + ' L' + (cx - 21) + ' ' + Y.ankle + ' L' + (cx - 9) + ' ' + Y.ankle + ' L' + (cx - 2) + ' ' + Y.crotch + ' Z';
  const legR = 'M' + (cx + b.hi - 1) + ' ' + (Y.hip - 4) + ' L' + (cx + 21) + ' ' + Y.ankle + ' L' + (cx + 9) + ' ' + Y.ankle + ' L' + (cx + 2) + ' ' + Y.crotch + ' Z';
  out.push('<path d="' + legL + '" fill="' + skin + '"/><path d="' + legR + '" fill="' + skin + '"/>');
  out.push(line(armL[0], armL[1], b.limb * 1.6, skin) + line(armR[0], armR[1], b.limb * 1.6, skin));
  // Torso, cuello y cabeza
  const torso = 'M' + (cx - b.sh) + ' ' + Y.sh + ' Q' + (cx - b.sh - 1) + ' 120 ' + (cx - b.wa) + ' ' + Y.waist + ' Q' + (cx - b.hi - 1) + ' 198 ' + (cx - b.hi) + ' ' + Y.hip + ' L' + (cx + b.hi) + ' ' + Y.hip + ' Q' + (cx + b.hi + 1) + ' 198 ' + (cx + b.wa) + ' ' + Y.waist + ' Q' + (cx + b.sh + 1) + ' 120 ' + (cx + b.sh) + ' ' + Y.sh + ' Q' + cx + ' ' + (Y.sh - 12) + ' ' + (cx - b.sh) + ' ' + Y.sh + ' Z';
  out.push('<path d="' + torso + '" fill="' + skin + '"/>');
  out.push('<rect x="' + (cx - 8) + '" y="' + Y.neck0 + '" width="16" height="' + (Y.sh - Y.neck0 + 4) + '" rx="6" fill="' + skinD + '"/>');
  out.push(face === 'cuadrado' ? '<rect x="' + (cx - headRx) + '" y="' + (Y.head - headRy) + '" width="' + headRx * 2 + '" height="' + headRy * 2 + '" rx="11" fill="' + skin + '"/>'
    : '<ellipse cx="' + cx + '" cy="' + Y.head + '" rx="' + headRx + '" ry="' + headRy + '" fill="' + skin + '"/>');
  // Pies (piel) si no hay calzado o hay sandalias
  const feet = (col) => '<ellipse cx="' + (cx - 17) + '" cy="' + (Y.ankle + 8) + '" rx="8" ry="7" fill="' + col + '"/><ellipse cx="' + (cx + 17) + '" cy="' + (Y.ankle + 8) + '" rx="8" ry="7" fill="' + col + '"/>';
  if (!shoes) out.push(feet(skin));
  // Parte inferior
  const missingStyle = 'fill="none" stroke="#9A968B" stroke-width="1.6" stroke-dasharray="4 4"';
  const drawBottom = (it) => {
    const col = pattern(it, garmentHex(it)); const s = st(garmentHex(it));
    const relaxed = /relaj|oversized|amplio|cargo/.test(norm(it.cut) + ' ' + it.subtype) ? 5 : 0;
    if (it.subtype === 'falda') {
      const hem = /midi|evas/.test(norm(it.cut)) ? 318 : 292;
      out.push('<path d="M' + (cx - b.wa - 2) + ' ' + (Y.waist - 4) + ' L' + (cx + b.wa + 2) + ' ' + (Y.waist - 4) + ' L' + (cx + b.hi + 20) + ' ' + hem + ' Q' + cx + ' ' + (hem + 8) + ' ' + (cx - b.hi - 20) + ' ' + hem + ' Z" fill="' + col + '" ' + s + '/>');
      return;
    }
    const hemY = it.subtype === 'short' ? 280 : Y.ankle + 2; const t = (hemY - Y.hip) / (Y.ankle - Y.hip);
    const ox = (cx - b.hi) + ((cx - 22) - (cx - b.hi)) * t - relaxed; const ix = (cx - 2) + ((cx - 8) - (cx - 2)) * t + relaxed * 0.4;
    const d = 'M' + (cx - b.wa - 2) + ' ' + (Y.waist - 4) + ' L' + (cx + b.wa + 2) + ' ' + (Y.waist - 4) + ' Q' + (cx + b.hi + 2) + ' 200 ' + (cx + b.hi + 1) + ' ' + Y.hip + ' L' + (2 * cx - ox) + ' ' + hemY + ' L' + (2 * cx - ix) + ' ' + hemY + ' L' + (cx + 1) + ' ' + Y.crotch + ' L' + (cx - 1) + ' ' + Y.crotch + ' L' + ix + ' ' + hemY + ' L' + ox + ' ' + hemY + ' L' + (cx - b.hi - 1) + ' ' + Y.hip + ' Q' + (cx - b.hi - 2) + ' 200 ' + (cx - b.wa - 2) + ' ' + (Y.waist - 4) + ' Z';
    out.push('<path d="' + d + '" fill="' + col + '" ' + s + '/>');
    if (back && ['jean', 'chino', 'pantalón', 'cargo', 'pantalón de vestir', 'short'].includes(it.subtype)) {
      const pc = darker(garmentHex(it), 0.22);
      out.push('<path d="M' + (cx - 21) + ' ' + (Y.waist + 10) + ' h14 v13 q-7 4 -14 0 Z M' + (cx + 7) + ' ' + (Y.waist + 10) + ' h14 v13 q-7 4 -14 0 Z" fill="none" stroke="' + pc + '" stroke-width="1.1"' + (it.subtype === 'jean' ? ' stroke-dasharray="2 1.6"' : '') + '/><line x1="' + cx + '" y1="' + (Y.waist - 3) + '" x2="' + cx + '" y2="' + Y.crotch + '" stroke="' + pc + '" stroke-width="1"/>');
    }
    if (!back && it.subtype === 'jean') out.push('<path d="M' + (cx - b.wa + 4) + ' ' + (Y.waist + 6) + ' Q' + (cx - 12) + ' ' + (Y.waist + 18) + ' ' + (cx - 4) + ' ' + (Y.waist + 6) + ' M' + (cx + b.wa - 4) + ' ' + (Y.waist + 6) + ' Q' + (cx + 12) + ' ' + (Y.waist + 18) + ' ' + (cx + 4) + ' ' + (Y.waist + 6) + '" fill="none" stroke="' + shade(garmentHex(it), 0.35) + '" stroke-width="1" stroke-dasharray="2 2"/>');
    if (it.subtype === 'pantalón de vestir' || it.subtype === 'pantalón') out.push('<path d="M' + (cx - 16) + ' ' + (Y.hip) + ' L' + ((ox + ix) / 2) + ' ' + hemY + ' M' + (cx + 16) + ' ' + Y.hip + ' L' + (2 * cx - (ox + ix) / 2) + ' ' + hemY + '" stroke="' + darker(garmentHex(it), 0.2) + '" stroke-width="0.8"/>');
  };
  if (full && full.subtype === 'enterizo') drawBottom(Object.assign({}, full, { subtype: 'pantalón' }));
  else if (bottom) drawBottom(bottom);
  else if (!full) out.push('<path d="M' + (cx - b.wa - 2) + ' ' + (Y.waist - 4) + ' L' + (cx + b.wa + 2) + ' ' + (Y.waist - 4) + ' L' + (cx + 22) + ' ' + Y.ankle + ' L' + (cx + 8) + ' ' + Y.ankle + ' L' + cx + ' ' + Y.crotch + ' L' + (cx - 8) + ' ' + Y.ankle + ' L' + (cx - 22) + ' ' + Y.ankle + ' Z" ' + missingStyle + '/>');
  // Calzado: vista frontal, punta levemente hacia afuera, suela visible
  const shoe = (fx, side, it) => {
    const c = garmentHex(it); const dk = darker(c, 0.38); const ay = Y.ankle; const o = side * 2.5; // giro hacia afuera
    const body = (top) => 'M' + (fx - 8) + ' ' + top + ' L' + (fx + 8) + ' ' + top + ' Q' + (fx + 10 + o) + ' ' + (ay + 7) + ' ' + (fx + 11 + o) + ' ' + (ay + 11) + ' Q' + (fx + 11 + o) + ' ' + (ay + 15) + ' ' + (fx + 5 + o) + ' ' + (ay + 15) + ' L' + (fx - 5 + o) + ' ' + (ay + 15) + ' Q' + (fx - 11 + o) + ' ' + (ay + 15) + ' ' + (fx - 11 + o) + ' ' + (ay + 11) + ' Q' + (fx - 10 + o) + ' ' + (ay + 7) + ' ' + (fx - 8) + ' ' + top + ' Z';
    const sole = (h, col) => '<path d="M' + (fx - 11.5 + o) + ' ' + (ay + 13) + ' Q' + (fx - 12 + o) + ' ' + (ay + 15 + h) + ' ' + (fx - 5 + o) + ' ' + (ay + 15 + h) + ' L' + (fx + 5 + o) + ' ' + (ay + 15 + h) + ' Q' + (fx + 12 + o) + ' ' + (ay + 15 + h) + ' ' + (fx + 11.5 + o) + ' ' + (ay + 13) + ' Z" fill="' + col + '"/>';
    const sub = it.subtype;
    if (back && sub !== 'sandalias') {
      const isSn = sub === 'zapatillas'; const top = sub === 'botines' ? ay - 22 : ay - 3;
      let r = (sub === 'botines' ? '<rect x="' + (fx - 9) + '" y="' + top + '" width="18" height="' + (ay - top + 2) + '" rx="3" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/>' : '') +
        '<path d="M' + (fx - 8) + ' ' + Math.max(top, ay - 3) + ' L' + (fx + 8) + ' ' + Math.max(top, ay - 3) + ' Q' + (fx + 10) + ' ' + (ay + 8) + ' ' + (fx + 9) + ' ' + (ay + 13) + ' L' + (fx - 9) + ' ' + (ay + 13) + ' Q' + (fx - 10) + ' ' + (ay + 8) + ' ' + (fx - 8) + ' ' + Math.max(top, ay - 3) + ' Z" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/>' +
        '<rect x="' + (fx - 9.5) + '" y="' + (ay + 12) + '" width="19" height="' + (isSn ? 4.5 : 3.5) + '" rx="1.6" fill="' + (isSn ? '#F4F2EC' : darker(c, 0.5)) + '"/>';
      if (isSn) r += '<rect x="' + (fx - 2.5) + '" y="' + (ay - 6) + '" width="5" height="7" rx="1.5" fill="' + (hexLum(c) > 0.7 ? '#CFCABD' : shade(c, 0.4)) + '"/>';
      else if (sub !== 'botines') r += '<path d="M' + (fx - 6) + ' ' + (ay + 4) + ' Q' + fx + ' ' + (ay + 7) + ' ' + (fx + 6) + ' ' + (ay + 4) + '" fill="none" stroke="' + dk + '" stroke-width="1"/>';
      return r;
    }
    if (sub === 'sandalias') {
      return '<path d="M' + (fx - 7) + ' ' + (ay + 2) + ' Q' + (fx - 9 + o) + ' ' + (ay + 12) + ' ' + (fx - 5 + o) + ' ' + (ay + 15) + ' L' + (fx + 5 + o) + ' ' + (ay + 15) + ' Q' + (fx + 9 + o) + ' ' + (ay + 12) + ' ' + (fx + 7) + ' ' + (ay + 2) + ' Z" fill="' + skin + '"/>' +
        '<path d="M' + (fx - 9 + o) + ' ' + (ay + 7) + ' L' + (fx + 9 + o) + ' ' + (ay + 7) + ' M' + (fx - 8 + o) + ' ' + (ay + 12) + ' L' + (fx + 8 + o) + ' ' + (ay + 12) + '" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"/>' + sole(2, dk);
    }
    if (sub === 'botines') return '<path d="M' + (fx - 9) + ' ' + (ay - 22) + ' L' + (fx + 9) + ' ' + (ay - 22) + ' L' + (fx + 9) + ' ' + (ay - 2) + ' Z" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/><rect x="' + (fx - 9) + '" y="' + (ay - 22) + '" width="18" height="22" rx="3" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/><path d="' + body(ay - 2) + '" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/>' + sole(3, dk) + '<line x1="' + (fx + side * 3) + '" y1="' + (ay - 20) + '" x2="' + (fx + side * 3) + '" y2="' + (ay + 4) + '" stroke="' + dk + '" stroke-width="0.9"/>';
    const isSneaker = sub === 'zapatillas';
    let out2 = '<path d="' + body(ay - 3) + '" fill="' + c + '" stroke="' + dk + '" stroke-width="1.2"/>' + sole(isSneaker ? 3.5 : 2.2, isSneaker ? '#F4F2EC' : darker(c, 0.5));
    if (isSneaker) out2 += '<path d="M' + (fx - 4) + ' ' + (ay + 1) + ' L' + (fx + 4) + ' ' + (ay + 1) + ' M' + (fx - 4.5) + ' ' + (ay + 4.5) + ' L' + (fx + 4.5) + ' ' + (ay + 4.5) + '" stroke="' + (hexLum(c) > 0.7 ? '#B9B4A8' : shade(c, 0.45)) + '" stroke-width="1.3" stroke-linecap="round"/>';
    else if (sub === 'mocasines') out2 += '<path d="M' + (fx - 7 + o) + ' ' + (ay + 6) + ' Q' + (fx + o) + ' ' + (ay + 9) + ' ' + (fx + 7 + o) + ' ' + (ay + 6) + '" fill="none" stroke="' + dk + '" stroke-width="1.6"/>';
    else if (sub === 'oxford' || /oxford/.test(norm(it.name))) out2 += '<path d="M' + (fx - 3) + ' ' + (ay + 1) + ' L' + (fx + 3) + ' ' + (ay + 1) + ' M' + (fx - 3) + ' ' + (ay + 4) + ' L' + (fx + 3) + ' ' + (ay + 4) + '" stroke="' + shade(c, 0.35) + '" stroke-width="1"/>';
    if (!isSneaker) out2 += '<ellipse cx="' + (fx + o - side * 4) + '" cy="' + (ay + 10) + '" rx="2.6" ry="1.4" fill="#fff" opacity=".28"/>';
    return out2;
  };
  if (shoes) { out.push(shoe(cx - 15, -1, shoes)); out.push(shoe(cx + 15, 1, shoes)); }
  else out.push('<g ' + missingStyle + '><path d="M' + (cx - 23) + ' ' + (Y.ankle - 2) + ' h16 l3 16 h-22 z"/><path d="M' + (cx + 7) + ' ' + (Y.ankle - 2) + ' h16 l3 16 h-22 z"/></g>');
  // Parte superior o vestido
  const neckPath = (kind, y0) => kind === 'V' ? 'M' + (cx - 11) + ' ' + y0 + ' L' + cx + ' ' + (y0 + 20) + ' L' + (cx + 11) + ' ' + y0 : kind === 'barco' ? 'M' + (cx - 22) + ' ' + (y0 + 1) + ' Q' + cx + ' ' + (y0 + 7) + ' ' + (cx + 22) + ' ' + (y0 + 1) : 'M' + (cx - 11) + ' ' + y0 + ' Q' + cx + ' ' + (y0 + 12) + ' ' + (cx + 11) + ' ' + y0;
  const drawTop = (it, hemY, isDress) => {
    const base = garmentHex(it); const col = pattern(it, base); const s = st(base);
    const loose = /relaj|oversized/.test(norm(it.cut)) ? 4 : 0;
    const sleeve = isDress ? (/midi/.test(norm(it.cut)) ? 'short' : 'none') : ['camiseta', 'polo', 'prenda superior'].includes(it.subtype) ? 'short' : it.subtype === 'top' ? 'none' : 'long';
    const sleeveW = b.limb * 1.6 + 6 + loose;
    if (sleeve !== 'none') {
      [armL, armR].forEach((a) => { const end = sleeve === 'short' ? lerp(a[0], a[1], 0.32) : lerp(a[0], a[1], 0.97); out.push(line(a[0], end, sleeveW + 2, darker(base, 0.35)) + line(a[0], end, sleeveW, col)); });
    }
    let d;
    if (isDress) {
      const hem = /midi/.test(norm(it.cut)) ? 330 : 300;
      d = 'M' + (cx - b.sh - loose) + ' ' + Y.sh + ' Q' + (cx - b.sh - 1) + ' 120 ' + (cx - b.wa) + ' ' + Y.waist + ' L' + (cx - b.hi - 22) + ' ' + hem + ' Q' + cx + ' ' + (hem + 8) + ' ' + (cx + b.hi + 22) + ' ' + hem + ' L' + (cx + b.wa) + ' ' + Y.waist + ' Q' + (cx + b.sh + 1) + ' 120 ' + (cx + b.sh + loose) + ' ' + Y.sh + ' Q' + cx + ' ' + (Y.sh - 12) + ' ' + (cx - b.sh - loose) + ' ' + Y.sh + ' Z';
    } else {
      const hx = hemY > Y.waist + 10 ? b.hi + loose : b.wa + 2 + loose;
      d = 'M' + (cx - b.sh - 1 - loose) + ' ' + Y.sh + ' Q' + (cx - b.sh - 2 - loose) + ' 120 ' + (cx - b.wa - 1 - loose) + ' ' + Math.min(Y.waist, hemY) + ' L' + (cx - hx) + ' ' + hemY + ' L' + (cx + hx) + ' ' + hemY + ' L' + (cx + b.wa + 1 + loose) + ' ' + Math.min(Y.waist, hemY) + ' Q' + (cx + b.sh + 2 + loose) + ' 120 ' + (cx + b.sh + 1 + loose) + ' ' + Y.sh + ' Q' + cx + ' ' + (Y.sh - 12) + ' ' + (cx - b.sh - 1 - loose) + ' ' + Y.sh + ' Z';
    }
    out.push('<path d="' + d + '" fill="' + col + '" ' + s + '/>');
    const neckKind = (it.neck) || (it.subtype === 'blusa' ? 'barco' : it.subtype === 'top' ? 'barco' : 'redondo');
    if (back) {
      if (['camisa', 'polo', 'sobrecamisa'].includes(it.subtype)) out.push('<path d="M' + (cx - 13) + ' ' + (Y.sh - 9) + ' Q' + cx + ' ' + (Y.sh - 13) + ' ' + (cx + 13) + ' ' + (Y.sh - 9) + ' L' + (cx + 12) + ' ' + (Y.sh - 3) + ' Q' + cx + ' ' + (Y.sh - 6) + ' ' + (cx - 12) + ' ' + (Y.sh - 3) + ' Z" fill="' + col + '" ' + s + '/>' + (it.subtype === 'camisa' ? '<path d="M' + (cx - b.sh + 6) + ' ' + (Y.sh + 14) + ' Q' + cx + ' ' + (Y.sh + 20) + ' ' + (cx + b.sh - 6) + ' ' + (Y.sh + 14) + '" fill="none" stroke="' + darker(base, 0.25) + '" stroke-width="0.9"/>' : ''));
      else out.push('<path d="M' + (cx - 10) + ' ' + (Y.sh - 8) + ' Q' + cx + ' ' + (Y.sh - 4) + ' ' + (cx + 10) + ' ' + (Y.sh - 8) + '" fill="' + skin + '" stroke="' + darker(base, 0.35) + '" stroke-width="1.4"/>');
    } else if (['camisa', 'polo', 'sobrecamisa'].includes(it.subtype)) {
      out.push('<path d="M' + (cx - 10) + ' ' + (Y.sh - 7) + ' L' + cx + ' ' + (Y.sh + 8) + ' L' + (cx + 10) + ' ' + (Y.sh - 7) + ' L' + (cx + 4) + ' ' + (Y.sh - 9) + ' L' + cx + ' ' + (Y.sh - 2) + ' L' + (cx - 4) + ' ' + (Y.sh - 9) + ' Z" fill="' + col + '" ' + s + '/>');
      const bottomBtn = it.subtype === 'polo' ? Y.sh + 26 : hemY - 6;
      out.push('<line x1="' + cx + '" y1="' + (Y.sh + 8) + '" x2="' + cx + '" y2="' + bottomBtn + '" stroke="' + darker(base, 0.3) + '" stroke-width="1"/>');
      for (let y = Y.sh + 16; y < bottomBtn; y += 18) out.push('<circle cx="' + (cx + 2.5) + '" cy="' + y + '" r="1.4" fill="' + darker(base, 0.4) + '"/>');
    } else {
      out.push('<path d="' + neckPath(neckKind, Y.sh - 8) + '" fill="' + skin + '" stroke="' + darker(base, 0.35) + '" stroke-width="1.4"/>');
    }
    if (it.subtype === 'suéter') out.push('<rect x="' + (cx - (hemY > Y.waist + 10 ? b.hi : b.wa + 2) - loose) + '" y="' + (hemY - 6) + '" width="' + 2 * ((hemY > Y.waist + 10 ? b.hi : b.wa + 2) + loose) + '" height="6" fill="' + darker(base, 0.15) + '"/>');
  };
  const tucked = top && bottom && (top.formality >= 3 || bottom.subtype === 'falda');
  if (full && full.subtype !== 'enterizo') drawTop(full, 0, true);
  else if (full) drawTop(Object.assign({}, full, { subtype: 'top' }), Y.waist + 2, false);
  else if (top) drawTop(top, tucked ? Y.waist + 2 : 226, false);
  else out.push('<path d="M' + (cx - b.sh) + ' ' + Y.sh + ' L' + (cx - b.wa) + ' ' + Y.waist + ' L' + (cx + b.wa) + ' ' + Y.waist + ' L' + (cx + b.sh) + ' ' + Y.sh + ' Q' + cx + ' ' + (Y.sh - 12) + ' ' + (cx - b.sh) + ' ' + Y.sh + ' Z" ' + missingStyle + '/>');
  // Cinturón
  const belt = acc.find((i) => i.subtype === 'cinturón');
  if (belt && (bottom || full) && (tucked || !top)) { const c = garmentHex(belt); out.push('<rect x="' + (cx - b.wa - 2) + '" y="' + (Y.waist - 3) + '" width="' + (2 * b.wa + 4) + '" height="7" fill="' + c + '" ' + st(c) + '/><rect x="' + (cx - 5) + '" y="' + (Y.waist - 4) + '" width="10" height="9" rx="1.5" fill="none" stroke="#C9B27A" stroke-width="2"/>'); }
  // Capa
  if (layer) {
    const base = garmentHex(layer); const col = pattern(layer, base); const s = st(base);
    const hem = layer.subtype === 'abrigo' ? 300 : layer.subtype === 'casaca' ? 230 : 238;
    if (layer.subtype !== 'chaleco') [armL, armR].forEach((a) => { const end = lerp(a[0], a[1], 0.98); out.push(line(a[0], end, b.limb * 1.6 + 10, darker(base, 0.35)) + line(a[0], end, b.limb * 1.6 + 8, col)); });
    if (back) {
      out.push('<path d="M' + (cx - b.sh - 3) + ' ' + (Y.sh - 1) + ' Q' + (cx - b.sh - 4) + ' 130 ' + (cx - b.wa - 4) + ' ' + Y.waist + ' L' + (cx - b.hi - 6) + ' ' + hem + ' L' + (cx + b.hi + 6) + ' ' + hem + ' L' + (cx + b.wa + 4) + ' ' + Y.waist + ' Q' + (cx + b.sh + 4) + ' 130 ' + (cx + b.sh + 3) + ' ' + (Y.sh - 1) + ' Q' + cx + ' ' + (Y.sh - 14) + ' ' + (cx - b.sh - 3) + ' ' + (Y.sh - 1) + ' Z" fill="' + col + '" ' + s + '/>');
      out.push('<path d="M' + (cx - 14) + ' ' + (Y.sh - 9) + ' Q' + cx + ' ' + (Y.sh - 15) + ' ' + (cx + 14) + ' ' + (Y.sh - 9) + ' L' + (cx + 13) + ' ' + (Y.sh - 2) + ' Q' + cx + ' ' + (Y.sh - 7) + ' ' + (cx - 13) + ' ' + (Y.sh - 2) + ' Z" fill="' + darker(base, 0.12) + '" ' + s + '/>');
      out.push('<line x1="' + cx + '" y1="' + (Y.sh - 2) + '" x2="' + cx + '" y2="' + hem + '" stroke="' + darker(base, 0.3) + '" stroke-width="1"/>');
      if (['blazer', 'abrigo'].includes(layer.subtype)) out.push('<path d="M' + cx + ' ' + (hem - 26) + ' L' + (cx + 4) + ' ' + hem + '" stroke="' + darker(base, 0.4) + '" stroke-width="1.2"/>');
    } else [-1, 1].forEach((sd) => {
      const sh = cx + sd * (b.sh + 3); const hx = cx + sd * (b.hi + 6);
      out.push('<path d="M' + sh + ' ' + (Y.sh - 1) + ' Q' + (cx + sd * (b.sh + 4)) + ' 130 ' + (cx + sd * (b.wa + 4)) + ' ' + Y.waist + ' L' + hx + ' ' + hem + ' L' + (cx + sd * 4) + ' ' + hem + ' L' + (cx + sd * 4) + ' ' + (Y.sh + 62) + ' L' + (cx + sd * 13) + ' ' + (Y.sh - 7) + ' Z" fill="' + col + '" ' + s + '/>');
      if (['blazer', 'abrigo'].includes(layer.subtype)) out.push('<path d="M' + (cx + sd * 13) + ' ' + (Y.sh - 7) + ' L' + (cx + sd * 21) + ' ' + (Y.sh + 26) + ' L' + (cx + sd * 12) + ' ' + (Y.sh + 30) + ' L' + (cx + sd * 4) + ' ' + (Y.sh + 62) + '" fill="' + darker(base, 0.12) + '" ' + s + '/>');
    });
    if (!back && layer.subtype === 'blazer') out.push('<circle cx="' + (cx + 6) + '" cy="' + (Y.sh + 82) + '" r="2" fill="' + darker(base, 0.45) + '"/>');
  }
  // Bolso o mochila
  const bag = role('accessory').find((i) => i.category === 'bolso');
  if (bag) {
    const c = garmentHex(bag);
    if (bag.subtype === 'mochila' && back) out.push('<path d="M' + (cx - 8) + ' ' + (Y.sh + 2) + ' Q' + cx + ' ' + (Y.sh - 10) + ' ' + (cx + 8) + ' ' + (Y.sh + 2) + '" fill="none" stroke="' + darker(c, 0.2) + '" stroke-width="3"/><rect x="' + (cx - b.wa - 2) + '" y="' + (Y.sh + 2) + '" width="' + (2 * b.wa + 4) + '" height="' + (Y.waist - Y.sh - 4) + '" rx="14" fill="' + c + '" ' + st(c) + '/><rect x="' + (cx - b.wa + 6) + '" y="' + (Y.waist - 46) + '" width="' + (2 * b.wa - 12) + '" height="30" rx="8" fill="' + darker(c, 0.12) + '" ' + st(c) + '/><line x1="' + (cx - b.wa + 8) + '" y1="' + (Y.waist - 38) + '" x2="' + (cx + b.wa - 8) + '" y2="' + (Y.waist - 38) + '" stroke="' + darker(c, 0.45) + '" stroke-width="1.2"/>');
    else if (bag.subtype === 'mochila') out.push(line([cx - b.sh + 12, Y.sh - 4], [cx - b.wa + 6, 176], 5, c) + line([cx + b.sh - 12, Y.sh - 4], [cx + b.wa - 6, 176], 5, c));
    else out.push(line([cx + b.sh - 10, Y.sh - 4], [cx - b.hi - 4, 206], 3, darker(c, 0.2)) + '<rect x="' + (cx - b.hi - 22) + '" y="198" width="30" height="24" rx="5" fill="' + c + '" ' + st(c) + '/>');
  }
  // Accesorios
  acc.forEach((i) => {
    const c = garmentHex(i);
    if (i.subtype === 'reloj') out.push('<rect x="' + (armL[1][0] - 5.5) + '" y="' + (armL[1][1] - 9) + '" width="11" height="7" rx="2" fill="' + c + '" stroke="' + darker(c, 0.4) + '"/>');
    if (!back && i.subtype === 'collar' && !(layer && ['abrigo'].includes(layer.subtype))) out.push('<path d="M' + (cx - 10) + ' ' + (Y.sh - 7) + ' Q' + cx + ' ' + (Y.sh + 20) + ' ' + (cx + 10) + ' ' + (Y.sh - 7) + '" fill="none" stroke="' + c + '" stroke-width="1.8"/><circle cx="' + cx + '" cy="' + (Y.sh + 13) + '" r="3" fill="' + c + '"/>');
    if (!back && i.subtype === 'lentes') out.push('<g fill="none" stroke="#222" stroke-width="1.8"><circle cx="' + (cx - 8) + '" cy="' + (Y.head + 2) + '" r="6"/><circle cx="' + (cx + 8) + '" cy="' + (Y.head + 2) + '" r="6"/><line x1="' + (cx - 2) + '" y1="' + (Y.head + 2) + '" x2="' + (cx + 2) + '" y2="' + (Y.head + 2) + '"/></g>');
    if (!back && i.subtype === 'pañuelo') out.push('<path d="M' + (cx - 12) + ' ' + (Y.sh - 6) + ' L' + (cx + 12) + ' ' + (Y.sh - 6) + ' L' + cx + ' ' + (Y.sh + 14) + ' Z" fill="' + c + '" ' + st(c) + '/>');
  });
  // Manos (encima de las mangas)
  out.push('<ellipse cx="' + armL[1][0] + '" cy="' + (armL[1][1] + 7) + '" rx="' + (b.limb * 0.72) + '" ry="' + (b.limb * 0.95) + '" fill="' + skin + '"/><ellipse cx="' + armR[1][0] + '" cy="' + (armR[1][1] + 7) + '" rx="' + (b.limb * 0.72) + '" ry="' + (b.limb * 0.95) + '" fill="' + skin + '"/>');
  // Cabello de adelante
  const capTop = Y.head - headRy - 4;
  const cap = 'M' + (cx - headRx - 2) + ' ' + (Y.head - 2) + ' Q' + (cx - headRx - 3) + ' ' + capTop + ' ' + cx + ' ' + capTop + ' Q' + (cx + headRx + 3) + ' ' + capTop + ' ' + (cx + headRx + 2) + ' ' + (Y.head - 2) + ' Q' + (cx + headRx - 4) + ' ' + (Y.head - 14) + ' ' + (cx + 6) + ' ' + (Y.head - 16) + ' Q' + (cx - 10) + ' ' + (Y.head - 18) + ' ' + (cx - headRx - 2) + ' ' + (Y.head - 2) + ' Z';
  if (back) {
    const full = '<ellipse cx="' + cx + '" cy="' + (Y.head - 2) + '" rx="' + (headRx + 2) + '" ry="' + (headRy + 2) + '" fill="' + hair + '"' + (style === 'rapado' ? ' opacity=".45"' : '') + '/>';
    if (style === 'largo') out.push('<path d="M' + (cx - headRx - 3) + ' ' + (Y.head - 6) + ' Q' + (cx - headRx - 9) + ' 112 ' + (cx - b.sh + 8) + ' 150 Q' + cx + ' 160 ' + (cx + b.sh - 8) + ' 150 Q' + (cx + headRx + 9) + ' 112 ' + (cx + headRx + 3) + ' ' + (Y.head - 6) + ' Z" fill="' + hair + '"/>');
    if (style === 'medio') out.push('<path d="M' + (cx - headRx - 3) + ' ' + (Y.head - 4) + ' Q' + (cx - headRx - 5) + ' 82 ' + (cx - headRx + 3) + ' 90 Q' + cx + ' 96 ' + (cx + headRx - 3) + ' 90 Q' + (cx + headRx + 5) + ' 82 ' + (cx + headRx + 3) + ' ' + (Y.head - 4) + ' Z" fill="' + hair + '"/>');
    out.push(full);
    if (style === 'rizado') for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180; out.push('<circle cx="' + (cx + Math.cos(r) * (headRx + 1)).toFixed(1) + '" cy="' + (Y.head - 2 + Math.sin(r) * (headRy + 1)).toFixed(1) + '" r="7" fill="' + hair + '"/>'); }
    if (style === 'recogido') out.push('<circle cx="' + cx + '" cy="' + (Y.head - 6) + '" r="10" fill="' + darker(hair, 0.15) + '"/>');
  } else if (style === 'rapado') out.push('<path d="' + cap + '" fill="' + hair + '" opacity=".45"/>');
  else if (style === 'rizado') { out.push('<path d="' + cap + '" fill="' + hair + '"/>'); for (let a = -150; a <= -30; a += 20) { const r = a * Math.PI / 180; out.push('<circle cx="' + (cx + Math.cos(r) * (headRx + 2)).toFixed(1) + '" cy="' + (Y.head - 6 + Math.sin(r) * (headRy + 1)).toFixed(1) + '" r="7" fill="' + hair + '"/>'); } }
  else { out.push('<path d="' + cap + '" fill="' + hair + '"/>'); if (style === 'recogido') out.push('<circle cx="' + cx + '" cy="' + (capTop - 5) + '" r="9" fill="' + hair + '"/>'); }
  if (acc.some((i) => i.subtype === 'sombrero')) { const h = acc.find((i) => i.subtype === 'sombrero'); const c = garmentHex(h); out.push('<ellipse cx="' + cx + '" cy="' + (capTop + 8) + '" rx="' + (headRx + 16) + '" ry="6" fill="' + c + '" ' + st(c) + '/><path d="M' + (cx - headRx + 2) + ' ' + (capTop + 8) + ' Q' + cx + ' ' + (capTop - 26) + ' ' + (cx + headRx - 2) + ' ' + (capTop + 8) + ' Z" fill="' + c + '" ' + st(c) + '/>'); }
  const body = back ? '<g transform="translate(200 0) scale(-1 1)">' + out.join('') + '</g>' : out.join('');
  return '<svg viewBox="0 0 200 420" class="figure" role="img" aria-label="' + esc(opts.label || (back ? 'Figura ilustrativa vista de espalda' : 'Figura ilustrativa con el outfit')) + '"><ellipse cx="100" cy="404" rx="54" ry="7" fill="currentColor" opacity=".08"/>' + body + '</svg>';
}
