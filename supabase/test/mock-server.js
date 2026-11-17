// Servidor de prueba que imita las partes de Supabase que usa RELISTO (auth, rpc, storage)
// sobre un Postgres local con las mismas migraciones.
const http = require('http'); const { spawnSync } = require('child_process'); const crypto = require('crypto');
const PG = ['-h', '/var/tmp/relisto-pg', '-p', '54329', '-U', 'postgres', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'];
const sql = (q) => { const r = spawnSync('psql', PG.concat(['-c', q]), { encoding: 'utf8' }); if (r.status) throw new Error(r.stderr); return r.stdout.trim(); };
const lit = (s) => { const t = '$m' + crypto.randomBytes(3).toString('hex') + '$'; return t + String(s) + t; };
const tokens = new Map(); const refresh = new Map(); const users = new Map(); const files = new Map();
const FN = {};
sql("select p.proname || '|' || coalesce(array_to_string(p.proargnames, ','), '') || '|' || coalesce(array_to_string(array(select format_type(t, null) from unnest(p.proargtypes) t), ','), '') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'")
  .split('\n').filter(Boolean).forEach((l) => { const [n, a, t] = l.split('|'); FN[n] = { names: a ? a.split(',') : [], types: t ? t.split(',') : [] }; });
const session = (u) => { const at = 'at-' + crypto.randomBytes(8).toString('hex'); const rt = 'rt-' + crypto.randomBytes(8).toString('hex'); tokens.set(at, u.id); refresh.set(rt, u.id); return { access_token: at, refresh_token: rt, expires_in: 3600, token_type: 'bearer', user: { id: u.id, email: u.email, user_metadata: { name: u.name }, created_at: new Date().toISOString() } }; };
const uidOf = (req) => tokens.get(String(req.headers.authorization || '').replace(/^Bearer /, '')) || null;
const send = (res, code, body, type) => { res.writeHead(code, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': type || 'application/json' }); res.end(type ? body : JSON.stringify(body)); };
http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const buf = Buffer.concat(chunks); let body = {}; try { body = buf.length && /json/.test(req.headers['content-type'] || '') ? JSON.parse(buf.toString()) : {}; } catch (e) { body = {}; }
    const url = new URL(req.url, 'http://x'); const p = url.pathname;
    try {
      if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain');
      if (!req.headers.apikey && !p.startsWith('/storage/v1/object/public/')) return send(res, 401, { message: 'No API key found in request' });
      if (p === '/auth/v1/signup') {
        if ([...users.values()].some((u) => u.email === body.email)) return send(res, 422, { msg: 'User already registered' });
        if (!body.password || body.password.length < 6) return send(res, 422, { msg: 'Password should be at least 6 characters' });
        const id = crypto.randomUUID(); const u = { id, email: body.email, pw: body.password, name: (body.data || {}).name || '' };
        sql("insert into auth.users (id, email, raw_user_meta_data) values ('" + id + "', " + lit(u.email) + ", " + lit(JSON.stringify(Object.assign({ name: u.name }, body.data || {}))) + "::jsonb)");
        users.set(id, u);
        return send(res, 200, session(u));
      }
      if (p === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'password') { const u = [...users.values()].find((x) => x.email === body.email); if (!u || u.pw !== body.password) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }); return send(res, 200, session(u)); }
        const id = refresh.get(body.refresh_token); if (!id) return send(res, 400, { error_description: 'Invalid Refresh Token' }); return send(res, 200, session(users.get(id)));
      }
      if (p === '/auth/v1/recover') return send(res, 200, {});
      if (p === '/auth/v1/logout') return send(res, 204, '', 'text/plain');
      const uid = uidOf(req);
      if (p === '/auth/v1/user') { if (!uid) return send(res, 401, { msg: 'invalid JWT' }); const u = users.get(uid); if (req.method === 'PUT' && body.password) u.pw = body.password; return send(res, 200, { id: u.id, email: u.email, user_metadata: { name: u.name } }); }
      if (p.startsWith('/rest/v1/rpc/')) {
        const fn = p.split('/').pop(); const meta = FN[fn]; if (!meta) return send(res, 404, { message: 'function not found' });
        const args = Object.entries(body).map(([k, v]) => { const t = meta.types[meta.names.indexOf(k)]; if (!t) throw new Error('arg ' + k); if (v === null || v === undefined) return k + ' => NULL::' + t; if (t === 'jsonb') return k + ' => ' + lit(JSON.stringify(v)) + '::jsonb'; if (t === 'text[]') return k + ' => ' + lit('{' + v.map((x) => '"' + String(x).replace(/"/g, '\\"') + '"').join(',') + '}') + '::text[]'; return k + ' => ' + lit(v) + '::' + t; });
        const out = sql("begin; set local role " + (uid ? 'authenticated' : 'anon') + "; select set_config('request.jwt.claim.sub', '" + (uid || '') + "', true); select coalesce(to_jsonb(public." + fn + '(' + args.join(', ') + ")), 'null'::jsonb); commit;");
        const line = out.split('\n').filter((x) => x && x !== 'BEGIN' && x !== 'COMMIT' && x !== 'SET' && x !== (uid || '')).pop();
        if (fn === 'delete_my_account') { users.delete(uid); }
        return send(res, 200, line, 'application/json');
      }
      if (p.startsWith('/storage/v1/object/list/')) { const b = p.split('/').pop(); const pre = body.prefix + '/'; return send(res, 200, [...files.keys()].filter((k) => k.startsWith(b + '/' + pre)).map((k) => ({ name: k.slice(b.length + 1 + pre.length) }))); }
      if (p.startsWith('/storage/v1/object/public/')) { const k = p.replace('/storage/v1/object/public/', ''); const f = files.get(k); if (!f || !k.startsWith('listings/')) return send(res, 404, { message: 'not found' }); return send(res, 200, f.buf, f.type); }
      if (p.startsWith('/storage/v1/object/authenticated/')) { const k = p.replace('/storage/v1/object/authenticated/', ''); if (!uid || k.split('/')[1] !== uid) return send(res, 403, { message: 'denied' }); const f = files.get(k); return f ? send(res, 200, f.buf, f.type) : send(res, 404, { message: 'not found' }); }
      if (p.startsWith('/storage/v1/object/') && req.method === 'POST') { const k = p.replace('/storage/v1/object/', ''); if (!uid || k.split('/')[1] !== uid) return send(res, 403, { message: 'denied' }); files.set(k, { buf, type: req.headers['content-type'] }); return send(res, 200, { Key: k }); }
      if (p.startsWith('/storage/v1/object/') && req.method === 'DELETE') { const b = p.split('/').pop(); (body.prefixes || []).forEach((x) => { if (x.split('/')[0] === uid) files.delete(b + '/' + x); }); return send(res, 200, []); }
      return send(res, 404, { message: 'no route ' + p });
    } catch (e) { return send(res, 500, { message: String(e.message).slice(0, 300) }); }
  });
}).listen(8128, () => console.log('mock supabase on 8128'));
