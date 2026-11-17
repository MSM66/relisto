/* =====================================================================
   MOTOR: lee la base de conocimiento interna (KB). No se muestra en la app.
   KB lo inyecta build.sh: en la versión de tienda va codificado.
   ===================================================================== */
const KB_FAM = (() => {
  const m = {};
  Object.entries(KB.families || {}).forEach(([fam, list]) => list.forEach((c) => { m[norm(c)] = fam; }));
  return m;
})();
const kbFamily = (c) => KB_FAM[norm(c)] || null;
const KB_INDEX = (() => {
  const m = new Map(); const k = (a, b) => [a, b].sort().join('|');
  (KB.pairs || []).forEach(([a, b, tier]) => { const key = k(a, b); if (!m.has(key) || (KB.weights[tier] || 0) > (KB.weights[m.get(key)] || 0)) m.set(key, tier); });
  (KB.avoid || []).forEach(([a, b]) => m.set(k(a, b), 'avoid'));
  return { get: (a, b) => m.get(k(a, b)) };
})();
/* Mejor par entre la parte de arriba (o cuerpo completo) y la de abajo/calzado; penaliza choques. */
function kbPairs(main) {
  const fam = main.map((i) => ({ i, f: kbFamily(i.color), r: roleOf(i) }));
  let best = null; let delta = 0;
  for (let x = 0; x < fam.length; x++) {
    for (let y = x + 1; y < fam.length; y++) {
      const A = fam[x]; const B = fam[y];
      if (!A.f || !B.f) continue;
      const keyRoles = [A.r, B.r].sort().join('+');
      if (!['bottom+top', 'full+shoes', 'shoes+top', 'bottom+shoes'].includes(keyRoles)) continue;
      const t = KB_INDEX.get(A.f, B.f); if (!t) continue;
      if (t === 'avoid') { delta += KB.weights.avoid || -10; continue; }
      const w = (KB.weights[t] || 0) * (keyRoles === 'bottom+top' || keyRoles === 'full+shoes' ? 1 : 0.4);
      if (!best || w > best.w) best = { w, t };
    }
  }
  if (best) delta += Math.round(best.w);
  return { delta, label: best && best.w >= 3 ? KB.labels[best.t] : null };
}
