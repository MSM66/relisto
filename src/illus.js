/* =====================================================================
   ILUSTRACIONES SVG LOCALES (generadas a partir de categoría, color y corte)
   Son ilustrativas: no son fotografías ni prueban material o talla.
   ===================================================================== */
const COLOR_HEX = {
  'blanco': '#F3F1EB', 'celeste': '#A8C7E2', 'azul marino': '#24344F', 'terracota': '#C66A4F', 'beige': '#D8C29E',
  'azul oscuro': '#2F4868', 'gris': '#8D9094', 'oliva': '#6C7242', 'negro': '#2A2A2A', 'marron': '#7B4F2E', 'marrón': '#7B4F2E',
  'plateado': '#C5CAD0', 'camel': '#C09A6A', 'marfil': '#EFE6D2', 'salvia': '#A7BEA1', 'azul': '#4C78A6', 'burdeos': '#6D1F2E',
  'dorado': '#CDA65C', 'arena': '#D7C5A2', 'rojo': '#B23A3A', 'verde': '#3F7A4F', 'rosa': '#E3A6B4', 'amarillo': '#E6C350',
  'morado': '#6E4E8C', 'lila': '#B8A2D6', 'naranja': '#DD8243', 'crema': '#EFE3C8', 'vino': '#6D1F2E', 'jean': '#4A6C93'
};
function colorHex(c) {
  const n = norm(c);
  if (COLOR_HEX[n]) return COLOR_HEX[n];
  const key = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length).find((k) => n.includes(norm(k)));
  if (key) return COLOR_HEX[key];
  let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return 'hsl(' + h + ',22%,55%)';
}
function shade(hex, amt) {
  if (!hex.startsWith('#')) return 'rgba(0,0,0,.35)';
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (x) => Math.max(0, Math.min(255, Math.round(amt < 0 ? x * (1 + amt) : x + (255 - x) * amt)));
  return '#' + [f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
let ILLUS_UID = 0;
function illusSVG(item, opts) {
  opts = opts || {};
  const uid = 'p' + (++ILLUS_UID);
  const twoTone = norm(item.color).includes(' y ');
  const base = colorHex(twoTone ? item.color.split(' y ')[0] : item.color);
  const second = twoTone ? colorHex(item.color.split(' y ')[1]) : null;
  const light = base === '#F3F1EB' || base === '#EFE6D2' || base === '#EFE3C8';
  const line = light ? '#9A968B' : shade(base, -0.35);
  const fill = twoTone ? 'url(#' + uid + ')' : base;
  const detail = light ? '#B9B4A8' : shade(base, base === '#2A2A2A' ? 0.25 : -0.22);
  const defs = twoTone ? '<defs><pattern id="' + uid + '" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="' + second + '"/><rect width="4" height="8" fill="' + base + '"/></pattern></defs>' : '';
  const st = 'stroke="' + line + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
  const sub = item.subtype || deriveSubtype(item.name, item.category);
  const relaxed = /relaj|oversized|amplio/.test(norm(item.cut));
  let body = '';
  const longSleeve = (w) => {
    const x0 = 60 - w, x1 = 60 + w;
    return '<path d="M' + (x0) + ' 30 L44 22 L52 20 Q60 27 68 20 L76 22 L' + x1 + ' 30 L' + (x1 + 12) + ' 88 L' + (x1 + 2) + ' 90 L' + (x1 - 4) + ' 50 L' + (x1 - 4) + ' 100 L' + (x0 + 4) + ' 100 L' + (x0 + 4) + ' 50 L' + (x0 - 2) + ' 90 L' + (x0 - 12) + ' 88 Z" fill="' + fill + '" ' + st + '/>';
  };
  const shortSleeve = (w) => {
    const x0 = 60 - w, x1 = 60 + w;
    return '<path d="M' + x0 + ' 30 L44 22 L52 20 Q60 28 68 20 L76 22 L' + x1 + ' 30 L' + (x1 + 10) + ' 46 L' + (x1 - 2) + ' 52 L' + (x1 - 3) + ' 46 L' + (x1 - 3) + ' 100 L' + (x0 + 3) + ' 100 L' + (x0 + 3) + ' 46 L' + (x0 + 2) + ' 52 L' + (x0 - 10) + ' 46 Z" fill="' + fill + '" ' + st + '/>';
  };
  const w = relaxed ? 26 : 22;
  switch (sub) {
    case 'camisa': case 'blusa': case 'sobrecamisa':
      body = longSleeve(w) +
        '<path d="M52 20 L60 34 L68 20 L64 18 L60 24 L56 18 Z" fill="' + fill + '" ' + st + '/>' +
        '<line x1="60" y1="34" x2="60" y2="100" ' + st + ' stroke="' + detail + '"/>' +
        [44, 56, 68, 80, 92].map((y) => '<circle cx="62.5" cy="' + y + '" r="1.3" fill="' + detail + '"/>').join('') +
        (sub === 'sobrecamisa' ? '<rect x="44" y="44" width="11" height="10" rx="1.5" fill="none" ' + st + ' stroke="' + detail + '"/><rect x="66" y="44" width="11" height="10" rx="1.5" fill="none" ' + st + ' stroke="' + detail + '"/>' : '<rect x="45" y="44" width="10" height="9" rx="1.5" fill="none" ' + st + ' stroke="' + detail + '"/>');
      break;
    case 'polo':
      body = shortSleeve(w) + '<path d="M52 20 L60 30 L68 20 L64 26 L60 33 L56 26 Z" fill="' + detail + '"/><line x1="60" y1="33" x2="60" y2="46" stroke="' + detail + '" stroke-width="1.6"/><circle cx="62" cy="37" r="1.2" fill="' + line + '"/><circle cx="62" cy="43" r="1.2" fill="' + line + '"/>';
      break;
    case 'top':
      body = '<path d="M42 26 Q48 22 50 20 Q60 32 70 20 Q72 22 78 26 L80 100 L40 100 Z" fill="' + fill + '" ' + st + '/><path d="M50 20 L48 12 M70 20 L72 12" ' + st + '/>';
      break;
    case 'suéter':
      body = longSleeve(w + 1) + '<path d="M52 20 Q60 30 68 20" fill="none" stroke="' + detail + '" stroke-width="3"/>' +
        '<rect x="' + (60 - w - 1 + 4) + '" y="94" width="' + (2 * (w + 1) - 8) + '" height="6" fill="' + detail + '" opacity=".55"/>' +
        '<path d="M' + (60 + w + 1 + 1) + ' 84 l10 1 M' + (60 - w - 1 - 1) + ' 84 l-10 1" stroke="' + detail + '" stroke-width="3"/>';
      break;
    case 'camiseta': case 'prenda superior':
      body = shortSleeve(w) + '<path d="M52 20 Q60 29 68 20" fill="none" stroke="' + detail + '" stroke-width="2.4"/>';
      break;
    case 'jean': case 'chino': case 'pantalón': case 'pantalón de vestir': case 'cargo': case 'prenda inferior': case 'short': {
      const spread = relaxed || sub === 'cargo' ? 6 : 0;
      const len = sub === 'short' ? 62 : 108;
      body = '<path d="M38 14 L82 14 L' + (86 + spread) + ' ' + len + ' L' + (66) + ' ' + len + ' L60 40 L54 ' + len + ' L' + (34 - spread) + ' ' + len + ' Z" fill="' + fill + '" ' + st + '/>' +
        '<rect x="38" y="14" width="44" height="7" fill="' + detail + '" opacity=".5"/>' +
        (sub === 'pantalón de vestir' ? '<line x1="47" y1="22" x2="45" y2="' + len + '" stroke="' + detail + '" stroke-width="1"/><line x1="73" y1="22" x2="75" y2="' + len + '" stroke="' + detail + '" stroke-width="1"/>' : '') +
        (sub === 'jean' ? '<path d="M40 24 Q46 32 54 26 M80 24 Q74 32 66 26" fill="none" stroke="' + shade(base, 0.35) + '" stroke-width="1.2" stroke-dasharray="2 2"/>' : '') +
        (sub === 'chino' ? '<path d="M41 22 L47 30 M79 22 L73 30" stroke="' + detail + '" stroke-width="1.4"/>' : '') +
        (sub === 'cargo' ? '<rect x="' + (30 - spread / 2) + '" y="58" width="12" height="14" rx="2" fill="' + detail + '" opacity=".7"/><rect x="' + (78 + spread / 2) + '" y="58" width="12" height="14" rx="2" fill="' + detail + '" opacity=".7"/>' : '');
      break;
    }
    case 'falda':
      body = '<path d="M44 18 L76 18 L92 104 Q60 110 28 104 Z" fill="' + fill + '" ' + st + '/><rect x="44" y="18" width="32" height="7" fill="' + detail + '" opacity=".5"/><path d="M52 30 L44 102 M68 30 L76 102 M60 30 L60 106" stroke="' + detail + '" stroke-width="1" opacity=".6"/>';
      break;
    case 'vestido': case 'enterizo':
      body = '<path d="M48 12 L52 12 Q60 22 68 12 L72 12 L76 44 L70 50 L94 110 Q60 116 26 110 L50 50 L44 44 Z" fill="' + fill + '" ' + st + '/><path d="M50 50 Q60 54 70 50" fill="none" stroke="' + detail + '" stroke-width="2.5"/><path d="M58 60 L52 108 M64 60 L72 108" stroke="' + detail + '" stroke-width="1" opacity=".6"/>';
      break;
    case 'blazer': case 'abrigo': case 'chaleco':
      body = (sub === 'chaleco' ? '<path d="M40 24 L52 18 L60 50 L68 18 L80 24 L82 102 L38 102 Z" fill="' + fill + '" ' + st + '/>' : longSleeve(w + 2)) +
        '<path d="M52 20 L60 58 L68 20 L74 24 L66 46 L70 50 L60 66 L50 50 L54 46 L46 24 Z" fill="' + detail + '" ' + st + '/>' +
        '<circle cx="60" cy="74" r="1.8" fill="' + line + '"/><circle cx="60" cy="84" r="1.8" fill="' + line + '"/>' +
        '<line x1="42" y1="80" x2="53" y2="80" stroke="' + line + '" stroke-width="1.6"/><line x1="67" y1="80" x2="78" y2="80" stroke="' + line + '" stroke-width="1.6"/>';
      break;
    case 'casaca': case 'capa':
      body = longSleeve(w + 2) + '<path d="M50 18 L60 26 L70 18 L70 12 L50 12 Z" fill="' + detail + '" ' + st + '/><line x1="60" y1="26" x2="60" y2="100" stroke="' + line + '" stroke-width="2"/>' +
        '<path d="M44 62 l9 -3 M76 62 l-9 -3" stroke="' + line + '" stroke-width="1.6"/><rect x="' + (60 - w + 2) + '" y="94" width="' + (2 * w - 4) + '" height="6" fill="' + detail + '" opacity=".6"/>';
      break;
    case 'zapatillas':
      body = '<path d="M14 72 Q16 52 34 50 L52 46 Q64 54 78 58 L100 64 Q108 68 106 78 L14 80 Z" fill="' + fill + '" ' + st + '/>' +
        '<path d="M12 80 L108 80 Q108 90 98 90 L18 90 Q12 90 12 80 Z" fill="#F7F5EF" stroke="' + (light ? '#9A968B' : '#8C887E') + '" stroke-width="1.6"/>' +
        '<path d="M50 52 L58 66 M56 50 L64 63 M62 52 L70 64" stroke="' + detail + '" stroke-width="2"/><circle cx="26" cy="62" r="4" fill="none" stroke="' + detail + '" stroke-width="1.6"/>';
      break;
    case 'oxford': case 'zapatos': case 'mocasines':
      body = '<path d="M12 74 Q12 58 30 56 L54 54 Q70 52 84 60 L104 66 Q112 70 110 80 L14 80 Z" fill="' + fill + '" ' + st + '/>' +
        '<path d="M14 80 L110 80 L110 84 L28 84 L26 92 L14 92 Z" fill="' + shade(base, -0.45) + '"/>' +
        (sub === 'oxford' ? '<path d="M56 56 Q66 62 76 60 M58 60 l12 -2 M60 64 l12 -2" fill="none" stroke="' + detail + '" stroke-width="1.6"/>' : '<path d="M60 56 Q72 64 86 62" fill="none" stroke="' + detail + '" stroke-width="3"/><rect x="66" y="58" width="12" height="4" rx="2" fill="' + detail + '"/>');
      break;
    case 'botines':
      body = '<path d="M28 20 L60 20 L62 60 Q76 62 96 70 Q106 74 104 84 L22 84 Z" fill="' + fill + '" ' + st + '/><path d="M22 84 L104 84 L104 88 L40 88 L38 98 L24 98 Z" fill="' + shade(base, -0.45) + '"/><line x1="58" y1="26" x2="58" y2="60" stroke="' + detail + '" stroke-width="1.6"/>';
      break;
    case 'sandalias':
      body = '<path d="M14 84 L104 76 Q110 80 104 86 L20 92 Z" fill="' + shade(base, -0.15) + '" ' + st + '/><path d="M70 78 Q78 52 92 74 M40 82 Q50 62 62 80" fill="none" stroke="' + base + '" stroke-width="5"/><path d="M20 92 L22 104 L30 104 L30 90" fill="' + shade(base, -0.4) + '"/>';
      break;
    case 'mochila':
      body = '<path d="M48 22 Q60 6 72 22" fill="none" ' + st + ' stroke-width="4"/><rect x="34" y="22" width="52" height="80" rx="16" fill="' + fill + '" ' + st + '/><rect x="42" y="64" width="36" height="28" rx="8" fill="' + detail + '" ' + st + '/><line x1="42" y1="72" x2="78" y2="72" stroke="' + line + '" stroke-width="1.4"/>';
      break;
    case 'bolso':
      body = '<path d="M44 44 Q60 14 76 44" fill="none" ' + st + ' stroke-width="4"/><path d="M28 44 L92 44 L86 98 L34 98 Z" fill="' + fill + '" ' + st + '/><path d="M28 44 L92 44 L88 62 Q60 70 32 62 Z" fill="' + detail + '" opacity=".6"/><circle cx="60" cy="64" r="3" fill="' + line + '"/>';
      break;
    case 'cinturón':
      body = '<rect x="8" y="52" width="104" height="16" rx="3" fill="' + fill + '" ' + st + '/><rect x="36" y="46" width="22" height="28" rx="4" fill="none" stroke="#B9A67A" stroke-width="3.5"/><line x1="47" y1="52" x2="62" y2="60" stroke="#B9A67A" stroke-width="2.5"/>' +
        [74, 84, 94].map((x) => '<circle cx="' + x + '" cy="60" r="1.8" fill="' + line + '"/>').join('');
      break;
    case 'reloj':
      body = '<rect x="48" y="8" width="24" height="104" rx="8" fill="' + shade(base, -0.1) + '" ' + st + '/>' +
        [20, 30, 82, 92, 102].map((y) => '<line x1="50" y1="' + y + '" x2="70" y2="' + y + '" stroke="' + line + '" stroke-width="1" opacity=".6"/>').join('') +
        '<circle cx="60" cy="60" r="22" fill="' + base + '" ' + st + '/><circle cx="60" cy="60" r="17" fill="#FBFAF6" stroke="' + line + '" stroke-width="1.2"/><line x1="60" y1="60" x2="60" y2="48" stroke="#2A2A2A" stroke-width="2"/><line x1="60" y1="60" x2="69" y2="64" stroke="#2A2A2A" stroke-width="1.6"/>';
      break;
    case 'collar':
      body = '<path d="M26 22 Q60 104 94 22" fill="none" stroke="' + base + '" stroke-width="2.5" stroke-dasharray="1 3.2" stroke-linecap="round"/><path d="M60 70 L68 82 L60 96 L52 82 Z" fill="' + base + '" ' + st + '/>';
      break;
    default:
      body = '<path d="M30 30 L76 30 L96 60 L76 90 L30 90 Z" fill="' + fill + '" ' + st + '/><circle cx="40" cy="60" r="5" fill="#FBFAF6" ' + st + '/>';
  }
  return '<svg viewBox="0 0 120 120" role="img" aria-label="Ilustración de ' + escapeHTML(item.name) + '" class="illus">' + defs + body + '</svg>';
}
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
