import http from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { AppError, text, phone, date, time, zone, dayInZone, assistantReply } from './domain.js';
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const hashToken = token => createHash('sha256').update(token).digest('hex');
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function passwordValid(password, saved) {
  const [salt, hash] = saved.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}
function credentials(body) {
  const email = text(body.email, 'E-mail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'E-mail inválido.');
  const password = text(body.password, 'Senha', 128);
  if (password.length < 10) throw new AppError(400, 'A senha deve ter pelo menos 10 caracteres.');
  return { email, password };
}
export function createApp({ databasePath = process.env.DATABASE_PATH || './data/cuidali.sqlite', now = () => new Date(), secureCookies = process.env.COOKIE_SECURE === 'true' } = {}) {
  const db = openDatabase(databasePath);
  const clients = new Set();
  const limits = new Map();
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  function publish() { for (const c of clients) c.res.write('event: change\ndata: {}\n\n'); }
  function scanInactivity() {
    const current = now();
    for (const s of all('SELECT * FROM seniors')) {
      if (current.getTime() - Date.parse(s.last_active) >= s.inactivity_hours * 3600000 && !get("SELECT id FROM alerts WHERE senior_id=? AND kind='inactivity' AND created_at>=? LIMIT 1", s.id, s.last_active)) {
        const result = run("INSERT OR IGNORE INTO alerts(id,senior_id,kind,created_at) VALUES (?,?,'inactivity',?)", randomUUID(), s.id, current.toISOString());
        if (result.changes) publish();
      }
    }
  }
  const timer = setInterval(scanInactivity, 60_000); timer.unref();
  function session(req) {
    const token = /(?:^|;\s*)cuidali_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if (!token) throw new AppError(401, 'Entre na sua conta para continuar.');
    const user = get('SELECT u.id,u.name,u.email,u.role,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', hashToken(token), now().getTime());
    if (!user) throw new AppError(401, 'Sessão expirada. Entre novamente.');
    return { user, token };
  }
  function caregiver(user) { if (user.role !== 'caregiver') throw new AppError(403, 'Apenas o cuidador pode gerenciar este cadastro.'); }
  function seniorAccess(id, user) {
    const s = get('SELECT * FROM seniors WHERE id=?', id);
    if (!s || (s.caregiver_id !== user.id && s.user_id !== user.id)) throw new AppError(404, 'Pessoa não encontrada.');
    return s;
  }
  function snapshot(s) {
    const day = dayInZone(now(), s.timezone);
    return { ...s, day,
      medications: all('SELECT m.*,c.status,c.created_at AS confirmed_at FROM medications m LEFT JOIN confirmations c ON c.medication_id=m.id AND c.day=? WHERE m.senior_id=? ORDER BY m.time,m.name', day, s.id),
      appointments: all('SELECT * FROM appointments WHERE senior_id=? ORDER BY starts_at', s.id),
      contacts: all('SELECT * FROM contacts WHERE senior_id=? ORDER BY rowid', s.id),
      alerts: all('SELECT * FROM alerts WHERE senior_id=? ORDER BY created_at DESC LIMIT 100', s.id),
      confirmations: all('SELECT c.*,m.name,m.dosage,m.time FROM confirmations c JOIN medications m ON m.id=c.medication_id WHERE m.senior_id=? ORDER BY c.created_at DESC LIMIT 100', s.id),
      interactions: all('SELECT * FROM interactions WHERE senior_id=? ORDER BY created_at DESC LIMIT 30', s.id)
    };
  }
  function cookie(res, token, expired = false) {
    res.setHeader('Set-Cookie', `cuidali_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expired ? 0 : 604800}${secureCookies ? '; Secure' : ''}`);
  }
  async function readBody(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new AppError(415, 'Envie JSON.');
    let body = ''; for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) throw new AppError(413, 'Dados muito grandes.'); }
    try { const b = JSON.parse(body); if (!b || Array.isArray(b) || typeof b !== 'object') throw Error(); return b; } catch { throw new AppError(400, 'JSON inválido.'); }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    function json(value, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const method = req.method;
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && req.headers.origin) {
        let origin; try { origin = new URL(req.headers.origin); } catch { throw new AppError(403, 'Origem inválida.'); }
        if (origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) throw new AppError(403, 'Origem não permitida.');
      }
      if (path === '/api/health' && method === 'GET') return json({ status: 'ok' });
      if ((path === '/api/register' || path === '/api/login') && method === 'POST') {
        const key = req.socket.remoteAddress;
        const current = now().getTime();
        if (limits.size > 10000) for (const [k, v] of limits) if (v.until <= current) limits.delete(k);
        const entry = limits.get(key) || { count: 0, until: current + 900000 };
        if (current >= entry.until) { entry.count = 0; entry.until = current + 900000; }
        if (++entry.count > 30) throw new AppError(429, 'Muitas tentativas. Aguarde 15 minutos.');
        limits.set(key, entry);
        const body = await readBody(req); const { email, password } = credentials(body);
        let user;
        if (path === '/api/register') {
          const name = text(body.name, 'Nome', 100);
          if (get('SELECT id FROM users WHERE email=?', email)) throw new AppError(409, 'Este e-mail já está cadastrado.');
          const id = randomUUID(); run("INSERT INTO users VALUES (?,?,?,?,'caregiver',?)", id, name, email, passwordHash(password), now().toISOString());
          user = { id, name, email, role: 'caregiver' };
        } else {
          const saved = get('SELECT * FROM users WHERE email=?', email);
          // Equal-cost hash for unknown users reduces account enumeration through timing.
          const valid = passwordValid(password, saved?.password_hash || dummyHash);
          if (!saved || !valid) throw new AppError(401, 'E-mail ou senha incorretos.');
          user = { id: saved.id, name: saved.name, email: saved.email, role: saved.role };
        }
        if (user.role === 'senior') run('UPDATE seniors SET last_active=? WHERE user_id=?', now().toISOString(), user.id);
        run('DELETE FROM sessions WHERE expires_at<=?', current);
        const token = randomBytes(32).toString('hex');
        run('INSERT INTO sessions VALUES (?,?,?)', hashToken(token), user.id, current + 604800000);
        cookie(res, token); return json({ user }, path === '/api/register' ? 201 : 200);
      }
      if (path.startsWith('/api/')) {
        const { user, token } = session(req);
        if (path === '/api/me' && method === 'GET') return json({ user });
        if (path === '/api/logout' && method === 'POST') { run('DELETE FROM sessions WHERE token_hash=?', hashToken(token)); cookie(res, '', true); return json({ ok: true }); }
        if (path === '/api/events' && method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.write('retry: 3000\nevent: ready\ndata: {}\n\n');
          const client = { res, user }; clients.add(client);
          const heartbeat = setInterval(() => {
            if (!get('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?', hashToken(token), now().getTime())) return res.end();
            res.write(': heartbeat\n\n');
          }, 15000); heartbeat.unref();
          res.on('close', () => { clients.delete(client); clearInterval(heartbeat); }); return;
        }
        if (path === '/api/seniors' && method === 'GET') {
          scanInactivity();
          return json({ seniors: all('SELECT * FROM seniors WHERE caregiver_id=? OR user_id=? ORDER BY name', user.id, user.id).map(snapshot) });
        }
        if (path === '/api/seniors' && method === 'POST') {
          caregiver(user); const b = await readBody(req);
          const name = text(b.name, 'Nome', 100), birth = date(b.birth_date, 'Nascimento');
          if (birth > now().toISOString().slice(0, 10)) throw new AppError(400, 'Nascimento não pode estar no futuro.');
          const id = randomUUID();
          run('INSERT INTO seniors(id,caregiver_id,name,birth_date,phone,address,timezone,last_active) VALUES (?,?,?,?,?,?,?,?)', id, user.id, name, birth, phone(b.phone), text(b.address, 'Endereço', 200, true), zone(b.timezone), now().toISOString());
          publish(); return json({ id }, 201);
        }
        const match = /^\/api\/seniors\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(path);
        if (!match) throw new AppError(404, 'Rota não encontrada.');
        const [, id, resource, resourceId] = match; const s = seniorAccess(id, user);
        if (!resource && method === 'GET') { scanInactivity(); return json(snapshot(s)); }
        if (!resource && method === 'PUT') {
          caregiver(user); const b = await readBody(req); const birth = date(b.birth_date, 'Nascimento');
          if (birth > now().toISOString().slice(0, 10)) throw new AppError(400, 'Nascimento não pode estar no futuro.');
          if (!Number.isInteger(b.inactivity_hours) || b.inactivity_hours < 1 || b.inactivity_hours > 168) throw new AppError(400, 'Inatividade: use de 1 a 168 horas.');
          run('UPDATE seniors SET name=?,birth_date=?,phone=?,address=?,timezone=?,inactivity_hours=? WHERE id=?', text(b.name, 'Nome', 100), birth, phone(b.phone), text(b.address, 'Endereço', 200, true), zone(b.timezone), b.inactivity_hours, id);
        } else if (!resource && method === 'DELETE') {
          caregiver(user); db.exec('BEGIN');
          try { run('DELETE FROM seniors WHERE id=?', id); if (s.user_id) run('DELETE FROM users WHERE id=?', s.user_id); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
        } else if (resource === 'account' && method === 'POST' && !resourceId) {
          caregiver(user); const b = await readBody(req); const { email, password } = credentials(b);
          if (s.user_id) throw new AppError(409, 'Esta pessoa já tem acesso próprio.');
          if (get('SELECT id FROM users WHERE email=?', email)) throw new AppError(409, 'Este e-mail já está cadastrado.');
          const uid = randomUUID(); db.exec('BEGIN');
          try { run("INSERT INTO users VALUES (?,?,?,?,'senior',?)", uid, s.name, email, passwordHash(password), now().toISOString()); run('UPDATE seniors SET user_id=? WHERE id=?', uid, id); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
        } else if (resource === 'activity' && method === 'POST' && !resourceId) {
          if (user.role !== 'senior') throw new AppError(403, 'A atividade precisa ser registrada pela própria pessoa.');
          run('UPDATE seniors SET last_active=? WHERE id=?', now().toISOString(), id);
        } else if (resource === 'confirmations' && method === 'POST' && !resourceId) {
          const b = await readBody(req);
          const medicationId = text(b.medication_id, 'Medicamento', 100);
          if (!get('SELECT id FROM medications WHERE id=? AND senior_id=?', medicationId, id)) throw new AppError(404, 'Medicamento não encontrado.');
          if (!['tomei', 'nao_tomei'].includes(b.status)) throw new AppError(400, 'Confirmação inválida.');
          run('INSERT INTO confirmations VALUES (?,?,?,?,?) ON CONFLICT(medication_id,day) DO UPDATE SET status=excluded.status,created_at=excluded.created_at', randomUUID(), b.medication_id, dayInZone(now(), s.timezone), b.status, now().toISOString());
          if (user.role === 'senior') run('UPDATE seniors SET last_active=? WHERE id=?', now().toISOString(), id);
        } else if (resource === 'sos' && method === 'POST' && !resourceId) {
          const contact = get('SELECT * FROM contacts WHERE senior_id=? ORDER BY rowid LIMIT 1', id);
          // Collapse accidental rapid double taps, but always return the calling contact.
          const recent = get("SELECT id FROM alerts WHERE senior_id=? AND kind='sos' AND status='open' AND created_at>?", id, new Date(now().getTime() - 30000).toISOString());
          if (!recent) run("INSERT INTO alerts(id,senior_id,kind,created_at,contact_id) VALUES (?,?,'sos',?,?)", randomUUID(), id, now().toISOString(), contact?.id || null);
          if (user.role === 'senior') run('UPDATE seniors SET last_active=? WHERE id=?', now().toISOString(), id);
          publish(); return json({ contact: contact || null, message: contact ? 'Alerta registrado no painel. Toque em ligar para chamar seu contato.' : 'Alerta registrado no painel. Nenhum contato cadastrado. Em emergência médica no Brasil, ligue 192.' }, 201);
        } else if (resource === 'alerts' && resourceId && method === 'PATCH') {
          caregiver(user); if (!get('SELECT id FROM alerts WHERE id=? AND senior_id=?', resourceId, id)) throw new AppError(404, 'Alerta não encontrado.');
          run("UPDATE alerts SET status='resolved',resolved_at=? WHERE id=?", now().toISOString(), resourceId);
        } else if (resource === 'assistant' && method === 'POST' && !resourceId) {
          const b = await readBody(req); const content = text(b.message, 'Mensagem', 500); const data = snapshot(s);
          const reply = assistantReply(content, data.medications, data.appointments, now(), s.timezone);
          run('INSERT INTO interactions VALUES (?,?,?,?,?)', randomUUID(), id, content, reply, now().toISOString());
          if (user.role === 'senior') run('UPDATE seniors SET last_active=? WHERE id=?', now().toISOString(), id);
          publish(); return json({ reply });
        } else if (['medications', 'appointments', 'contacts'].includes(resource) && ['POST', 'PUT', 'DELETE'].includes(method)) {
          caregiver(user);
          if (method === 'POST' && resourceId || method !== 'POST' && !resourceId) throw new AppError(404, 'Rota não encontrada.');
          // Table names come exclusively from the fixed allowlist above; values are bound.
          if (resourceId && !get(`SELECT id FROM ${resource} WHERE id=? AND senior_id=?`, resourceId, id)) throw new AppError(404, 'Registro não encontrado.');
          if (method === 'DELETE') run(`DELETE FROM ${resource} WHERE id=?`, resourceId);
          else {
            const b = await readBody(req); let fields, values;
            if (resource === 'medications') { fields = ['name', 'dosage', 'time', 'notes']; values = [text(b.name, 'Medicamento', 100), text(b.dosage, 'Dosagem', 50), time(b.time), text(b.notes, 'Observações', 500, true)]; }
            if (resource === 'contacts') { fields = ['name', 'phone', 'relationship']; values = [text(b.name, 'Nome', 100), phone(b.phone), text(b.relationship, 'Parentesco', 50)]; }
            if (resource === 'appointments') {
              const starts = text(b.starts_at, 'Data e hora', 40);
              if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})$/.test(starts) || !Number.isFinite(Date.parse(starts))) throw new AppError(400, 'Informe data, hora e fuso válidos.');
              date(starts.slice(0, 10)); time(starts.slice(11, 16));
              fields = ['specialty', 'starts_at', 'location', 'doctor']; values = [text(b.specialty, 'Especialidade', 100), new Date(starts).toISOString(), text(b.location, 'Local', 150), text(b.doctor, 'Profissional', 100, true)];
            }
            if (method === 'POST') run(`INSERT INTO ${resource}(id,senior_id,${fields.join(',')}) VALUES (${Array(fields.length + 2).fill('?').join(',')})`, randomUUID(), id, ...values);
            else run(`UPDATE ${resource} SET ${fields.map(f => `${f}=?`).join(',')} WHERE id=?`, ...values, resourceId);
          }
        } else throw new AppError(404, 'Rota não encontrada.');
        publish(); return json({ ok: true }, method === 'POST' ? 201 : 200);
      }
      if (method !== 'GET' && method !== 'HEAD') throw new AppError(405, 'Método não permitido.');
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/sw.js': ['sw.js', 'text/javascript'], '/icon.svg': ['icon.svg', 'image/svg+xml'], '/care-illustration.svg': ['care-illustration.svg', 'image/svg+xml'] };
      if (!files[path]) throw new AppError(404, 'Página não encontrada.');
      const [file, type] = files[path]; const content = await readFile(publicDir + file);
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); res.end(method === 'HEAD' ? undefined : content);
    } catch (e) {
      if (!e.status) console.error('Request failed:', e.message);
      if (!res.headersSent) json({ error: e.status ? e.message : 'Não foi possível concluir. Tente novamente.' }, e.status || 500);
      else res.end();
    }
  });
  const dummyHash = passwordHash(randomBytes(32).toString('hex'));
  return { server, db, scanInactivity, close: async () => { clearInterval(timer); for (const c of clients) c.res.end(); server.closeIdleConnections(); await new Promise(resolve => server.close(resolve)); db.close(); } };
}
