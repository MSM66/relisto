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
  const uid = 'f' + (++FIG_UID);
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
  if (style === 'largo') out.push('<path d="M' + (cx - headRx - 4) + ' ' + (Y.head - 4) + ' Q' + (cx - headRx - 10) + ' 110 ' + (cx - b.sh + 6) + ' 132 L' + (cx + b.sh - 6) + ' 132 Q' + (cx + headRx + 10) + ' 110 ' + (cx + headRx + 4) + ' ' + (Y.head - 4) + ' Z" fill="' + hair + '"/>');
  if (style === 'medio') out.push('<path d="M' + (cx - headRx - 3) + ' ' + (Y.head - 2) + ' Q' + (cx - headRx - 6) + ' 80 ' + (cx - headRx + 2) + ' 86 L' + (cx + headRx - 2) + ' 86 Q' + (cx + headRx + 6) + ' 80 ' + (cx + headRx + 3) + ' ' + (Y.head - 2) + ' Z" fill="' + hair + '"/>');
  // Piernas y brazos (piel)
  const legL = 'M' + (cx - b.hi + 1) + ' ' + (Y.hip - 4) + ' L' + (cx - 21) + ' ' + Y.ankle + ' L' + (cx - 9) + ' ' + Y.ankle + ' L' + (cx - 2) + ' ' + Y.crotch + ' Z';
  const legR = 'M' + (cx + b.hi - 1) + ' ' + (Y.hip - 4) + ' L' + (cx + 21) + ' ' + Y.ankle + ' L' + (cx + 9) + ' ' + Y.ankle + ' L' + (cx + 2) + ' ' + Y.crotch + ' Z';
  out.push('<path d="' + legL + '" fill="' + skin + '"/><path d="' + legR + '" fill="' + skin + '"/>');
  out.push(line(armL[0], armL[1], b.limb * 1.6, skin) + line(armR[0], armR[1], b.limb * 1.6, skin));
  out.push('<circle cx="' + armL[1][0] + '" cy="' + (armL[1][1] + 6) + '" r="' + (b.limb * 0.85) + '" fill="' + skin + '"/><circle cx="' + armR[1][0] + '" cy="' + (armR[1][1] + 6) + '" r="' + (b.limb * 0.85) + '" fill="' + skin + '"/>');
  // Torso, cuello y cabeza
  const torso = 'M' + (cx - b.sh) + ' ' + Y.sh + ' Q' + (cx - b.sh - 1) + ' 120 ' + (cx - b.wa) + ' ' + Y.waist + ' Q' + (cx - b.hi - 1) + ' 198 ' + (cx - b.hi) + ' ' + Y.hip + ' L' + (cx + b.hi) + ' ' + Y.hip + ' Q' + (cx + b.hi + 1) + ' 198 ' + (cx + b.wa) + ' ' + Y.waist + ' Q' + (cx + b.sh + 1) + ' 120 ' + (cx + b.sh) + ' ' + Y.sh + ' Q' + cx + ' ' + (Y.sh - 12) + ' ' + (cx - b.sh) + ' ' + Y.sh + ' Z';
  out.push('<path d="' + torso + '" fill="' + skin + '"/>');
  out.push('<rect x="' + (cx - 8) + '" y="' + Y.neck0 + '" width="16" height="' + (Y.sh - Y.neck0 + 4) + '" rx="6" fill="' + skinD + '"/>');
  out.push(face === 'cuadrado' ? '<rect x="' + (cx - headRx) + '" y="' + (Y.head - headRy) + '" width="' + headRx * 2 + '" height="' + headRy * 2 + '" rx="11" fill="' + skin + '"/>'
    : '<ellipse cx="' + cx + '" cy="' + Y.head + '" rx="' + headRx + '" ry="' + headRy + '" fill="' + skin + '"/>');
  // Pies (piel) si no hay calzado o hay sandalias
  const feet = (col) => '<ellipse cx="' + (cx - 16) + '" cy="' + (Y.ankle + 8) + '" rx="12" ry="6" fill="' + col + '"/><ellipse cx="' + (cx + 16) + '" cy="' + (Y.ankle + 8) + '" rx="12" ry="6" fill="' + col + '"/>';
  if (!shoes || shoes.subtype === 'sandalias') out.push(feet(skin));
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
    if (it.subtype === 'jean') out.push('<path d="M' + (cx - b.wa + 4) + ' ' + (Y.waist + 6) + ' Q' + (cx - 12) + ' ' + (Y.waist + 18) + ' ' + (cx - 4) + ' ' + (Y.waist + 6) + ' M' + (cx + b.wa - 4) + ' ' + (Y.waist + 6) + ' Q' + (cx + 12) + ' ' + (Y.waist + 18) + ' ' + (cx + 4) + ' ' + (Y.waist + 6) + '" fill="none" stroke="' + shade(garmentHex(it), 0.35) + '" stroke-width="1" stroke-dasharray="2 2"/>');
    if (it.subtype === 'pantalón de vestir' || it.subtype === 'pantalón') out.push('<path d="M' + (cx - 16) + ' ' + (Y.hip) + ' L' + ((ox + ix) / 2) + ' ' + hemY + ' M' + (cx + 16) + ' ' + Y.hip + ' L' + (2 * cx - (ox + ix) / 2) + ' ' + hemY + '" stroke="' + darker(garmentHex(it), 0.2) + '" stroke-width="0.8"/>');
  };
  if (full && full.subtype === 'enterizo') drawBottom(Object.assign({}, full, { subtype: 'pantalón' }));
  else if (bottom) drawBottom(bottom);
  else if (!full) out.push('<path d="M' + (cx - b.wa - 2) + ' ' + (Y.waist - 4) + ' L' + (cx + b.wa + 2) + ' ' + (Y.waist - 4) + ' L' + (cx + 22) + ' ' + Y.ankle + ' L' + (cx + 8) + ' ' + Y.ankle + ' L' + cx + ' ' + Y.crotch + ' L' + (cx - 8) + ' ' + Y.ankle + ' L' + (cx - 22) + ' ' + Y.ankle + ' Z" ' + missingStyle + '/>');
  // Calzado
  if (shoes) {
    const c = garmentHex(shoes); const s = st(c);
    const sole = shoes.subtype === 'zapatillas' ? '#F4F2EC' : darker(c, 0.45);
    [-1, 1].forEach((side) => {
      const x = cx + side * 16;
      if (shoes.subtype === 'botines') out.push('<path d="M' + (x - 9) + ' ' + (Y.ankle - 24) + ' L' + (x + 9) + ' ' + (Y.ankle - 24) + ' L' + (x + 10) + ' ' + (Y.ankle + 6) + ' Q' + (x + side * 16) + ' ' + (Y.ankle + 6) + ' ' + (x + side * 15) + ' ' + (Y.ankle + 12) + ' L' + (x - 11) + ' ' + (Y.ankle + 12) + ' Z" fill="' + c + '" ' + s + '/>');
      else if (shoes.subtype === 'sandalias') out.push('<path d="M' + (x - 10) + ' ' + (Y.ankle + 4) + ' L' + (x + 10) + ' ' + (Y.ankle + 9) + ' M' + (x - 9) + ' ' + (Y.ankle + 10) + ' L' + (x + 9) + ' ' + (Y.ankle + 4) + '" stroke="' + c + '" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="' + x + '" cy="' + (Y.ankle + 14) + '" rx="13" ry="3" fill="' + darker(c, 0.3) + '"/>');
      else out.push('<path d="M' + (x - 11) + ' ' + (Y.ankle - 2) + ' Q' + x + ' ' + (Y.ankle - 7) + ' ' + (x + 10) + ' ' + (Y.ankle - 1) + ' Q' + (x + side * 17) + ' ' + (Y.ankle + 3) + ' ' + (x + side * 16) + ' ' + (Y.ankle + 10) + ' L' + (x - side * 12) + ' ' + (Y.ankle + 10) + ' Z" fill="' + c + '" ' + s + '/><rect x="' + (Math.min(x - side * 12, x + side * 16) - 1) + '" y="' + (Y.ankle + 9) + '" width="30" height="4" rx="2" fill="' + sole + '"/>');
    });
  } else out.push('<g ' + missingStyle + '><rect x="' + (cx - 30) + '" y="' + (Y.ankle + 1) + '" width="26" height="12" rx="5"/><rect x="' + (cx + 4) + '" y="' + (Y.ankle + 1) + '" width="26" height="12" rx="5"/></g>');
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
    if (['camisa', 'polo', 'sobrecamisa'].includes(it.subtype)) {
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
    [-1, 1].forEach((sd) => {
      const sh = cx + sd * (b.sh + 3); const hx = cx + sd * (b.hi + 6);
      out.push('<path d="M' + sh + ' ' + (Y.sh - 1) + ' Q' + (cx + sd * (b.sh + 4)) + ' 130 ' + (cx + sd * (b.wa + 4)) + ' ' + Y.waist + ' L' + hx + ' ' + hem + ' L' + (cx + sd * 4) + ' ' + hem + ' L' + (cx + sd * 4) + ' ' + (Y.sh + 62) + ' L' + (cx + sd * 13) + ' ' + (Y.sh - 7) + ' Z" fill="' + col + '" ' + s + '/>');
      if (['blazer', 'abrigo'].includes(layer.subtype)) out.push('<path d="M' + (cx + sd * 13) + ' ' + (Y.sh - 7) + ' L' + (cx + sd * 21) + ' ' + (Y.sh + 26) + ' L' + (cx + sd * 12) + ' ' + (Y.sh + 30) + ' L' + (cx + sd * 4) + ' ' + (Y.sh + 62) + '" fill="' + darker(base, 0.12) + '" ' + s + '/>');
    });
    if (layer.subtype === 'blazer') out.push('<circle cx="' + (cx + 6) + '" cy="' + (Y.sh + 82) + '" r="2" fill="' + darker(base, 0.45) + '"/>');
  }
  // Bolso o mochila
  const bag = role('accessory').find((i) => i.category === 'bolso');
  if (bag) {
    const c = garmentHex(bag);
    if (bag.subtype === 'mochila') out.push(line([cx - b.sh + 12, Y.sh - 4], [cx - b.wa + 6, 176], 5, c) + line([cx + b.sh - 12, Y.sh - 4], [cx + b.wa - 6, 176], 5, c));
    else out.push(line([cx + b.sh - 10, Y.sh - 4], [cx - b.hi - 4, 206], 3, darker(c, 0.2)) + '<rect x="' + (cx - b.hi - 22) + '" y="198" width="30" height="24" rx="5" fill="' + c + '" ' + st(c) + '/>');
  }
  // Accesorios
  acc.forEach((i) => {
    const c = garmentHex(i);
    if (i.subtype === 'reloj') out.push('<rect x="' + (armL[1][0] - 5) + '" y="' + (armL[1][1] - 4) + '" width="10" height="7" rx="2" fill="' + c + '" stroke="' + darker(c, 0.4) + '"/>');
    if (i.subtype === 'collar' && !(layer && ['abrigo'].includes(layer.subtype))) out.push('<path d="M' + (cx - 10) + ' ' + (Y.sh - 7) + ' Q' + cx + ' ' + (Y.sh + 20) + ' ' + (cx + 10) + ' ' + (Y.sh - 7) + '" fill="none" stroke="' + c + '" stroke-width="1.8"/><circle cx="' + cx + '" cy="' + (Y.sh + 13) + '" r="3" fill="' + c + '"/>');
    if (i.subtype === 'lentes') out.push('<g fill="none" stroke="#222" stroke-width="1.8"><circle cx="' + (cx - 8) + '" cy="' + (Y.head + 2) + '" r="6"/><circle cx="' + (cx + 8) + '" cy="' + (Y.head + 2) + '" r="6"/><line x1="' + (cx - 2) + '" y1="' + (Y.head + 2) + '" x2="' + (cx + 2) + '" y2="' + (Y.head + 2) + '"/></g>');
    if (i.subtype === 'pañuelo') out.push('<path d="M' + (cx - 12) + ' ' + (Y.sh - 6) + ' L' + (cx + 12) + ' ' + (Y.sh - 6) + ' L' + cx + ' ' + (Y.sh + 14) + ' Z" fill="' + c + '" ' + st(c) + '/>');
  });
  // Cabello de adelante
  const capTop = Y.head - headRy - 4;
  const cap = 'M' + (cx - headRx - 2) + ' ' + (Y.head - 2) + ' Q' + (cx - headRx - 3) + ' ' + capTop + ' ' + cx + ' ' + capTop + ' Q' + (cx + headRx + 3) + ' ' + capTop + ' ' + (cx + headRx + 2) + ' ' + (Y.head - 2) + ' Q' + (cx + headRx - 4) + ' ' + (Y.head - 14) + ' ' + (cx + 6) + ' ' + (Y.head - 16) + ' Q' + (cx - 10) + ' ' + (Y.head - 18) + ' ' + (cx - headRx - 2) + ' ' + (Y.head - 2) + ' Z';
  if (style === 'rapado') out.push('<path d="' + cap + '" fill="' + hair + '" opacity=".45"/>');
  else if (style === 'rizado') { out.push('<path d="' + cap + '" fill="' + hair + '"/>'); for (let a = -150; a <= -30; a += 20) { const r = a * Math.PI / 180; out.push('<circle cx="' + (cx + Math.cos(r) * (headRx + 2)).toFixed(1) + '" cy="' + (Y.head - 6 + Math.sin(r) * (headRy + 1)).toFixed(1) + '" r="7" fill="' + hair + '"/>'); } }
  else { out.push('<path d="' + cap + '" fill="' + hair + '"/>'); if (style === 'recogido') out.push('<circle cx="' + cx + '" cy="' + (capTop - 5) + '" r="9" fill="' + hair + '"/>'); }
  if (acc.some((i) => i.subtype === 'sombrero')) { const h = acc.find((i) => i.subtype === 'sombrero'); const c = garmentHex(h); out.push('<ellipse cx="' + cx + '" cy="' + (capTop + 8) + '" rx="' + (headRx + 16) + '" ry="6" fill="' + c + '" ' + st(c) + '/><path d="M' + (cx - headRx + 2) + ' ' + (capTop + 8) + ' Q' + cx + ' ' + (capTop - 26) + ' ' + (cx + headRx - 2) + ' ' + (capTop + 8) + ' Z" fill="' + c + '" ' + st(c) + '/>'); }
  return '<svg viewBox="0 0 200 420" class="figure" role="img" aria-label="' + esc(opts.label || 'Figura ilustrativa con el outfit') + '"><ellipse cx="100" cy="404" rx="54" ry="7" fill="currentColor" opacity=".08"/>' + out.join('') + '</svg>';
}
