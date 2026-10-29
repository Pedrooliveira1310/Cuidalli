import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
async function start(options = {}) {
  const app = createApp({ databasePath: ':memory:', ...options });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  function client() {
    let cookie = '';
    return async (path, method = 'GET', body, expected = 200, headers = {}) => {
      const res = await fetch(base + path, { method, headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
      const result = await res.json(); assert.equal(res.status, expected, JSON.stringify(result)); return result;
    };
  }
  return { ...app, base, client };
}
const caregiver = { name: 'Ana', email: 'ana@example.com', password: 'senha-forte-123' };
const seniorData = { name: 'Maria', birth_date: '1950-05-10', phone: '11999991234', address: 'Rua A', timezone: 'America/Sao_Paulo' };
test('fluxo integrado: contas, CRUD, confirmação, assistente, SOS, inatividade e autorização', async t => {
  let clock = new Date('2026-10-29T12:00:00Z');
  const app = await start({ now: () => clock }); t.after(app.close);
  const care = app.client(), elder = app.client(), stranger = app.client();
  await care('/api/seniors', 'GET', undefined, 401);
  await care('/api/register', 'POST', { ...caregiver, password: 'curta' }, 400);
  await care('/api/register', 'POST', caregiver, 201);
  await care('/api/register', 'POST', caregiver, 409);
  await care('/api/seniors', 'POST', { ...seniorData, birth_date: '2030-01-01' }, 400);
  const { id } = await care('/api/seniors', 'POST', seniorData, 201);
  const path = `/api/seniors/${id}`;
  await care(`${path}/account`, 'POST', { email: 'maria@example.com', password: 'idosa-segura-123' }, 201);
  await elder('/api/login', 'POST', { email: 'maria@example.com', password: 'errada-123456' }, 401);
  const login = await elder('/api/login', 'POST', { email: 'maria@example.com', password: 'idosa-segura-123' });
  assert.equal(login.user.role, 'senior'); assert.equal(login.user.password_hash, undefined);
  await stranger('/api/register', 'POST', { ...caregiver, email: 'outro@example.com' }, 201);
  await stranger(path, 'GET', undefined, 404);
  await stranger(`${path}/sos`, 'POST', {}, 404);
  assert.equal((await stranger('/api/seniors')).seniors.length, 0);
  await elder('/api/seniors', 'POST', seniorData, 403);
  await elder(`${path}/medications`, 'POST', { name: 'X' }, 403);
  await care(`${path}/medications`, 'POST', { name: 'Losartana', dosage: '50 mg', time: '24:01' }, 400);
  await care(`${path}/medications`, 'POST', { name: 'Losartana', dosage: '50 mg', time: '08:00', notes: 'Prescrição médica' }, 201);
  await care(`${path}/appointments`, 'POST', { specialty: 'Clínica', starts_at: '2026-10-30T14:00', location: 'UBS' }, 400);
  await care(`${path}/appointments`, 'POST', { specialty: 'Clínica', starts_at: '2026-10-30T14:00:00-03:00', location: 'UBS' }, 201);
  await care(`${path}/contacts`, 'POST', { name: 'Ana', phone: '11999998888', relationship: 'Filha' }, 201);
  let data = await elder(path); const medication = data.medications[0];
  assert.equal(data.appointments[0].starts_at, '2026-10-30T17:00:00.000Z');
  await elder(`${path}/confirmations`, 'POST', { medication_id: medication.id, status: 'nao_tomei' }, 201);
  await elder(`${path}/confirmations`, 'POST', { medication_id: medication.id, status: 'tomei' }, 201);
  data = await care(path); assert.equal(data.medications[0].status, 'tomei'); assert.equal(data.confirmations.length, 1);
  assert.match((await elder(`${path}/assistant`, 'POST', { message: 'Meus remédios' })).reply, /Losartana/);
  assert.equal((await care(path)).interactions.length, 1);
  const sos = await elder(`${path}/sos`, 'POST', {}, 201); assert.equal(sos.contact.name, 'Ana');
  await elder(`${path}/sos`, 'POST', {}, 201); assert.equal((await care(path)).alerts.length, 1);
  const alert = (await care(path)).alerts[0];
  await elder(`${path}/alerts/${alert.id}`, 'PATCH', {}, 403);
  await care(`${path}/alerts/${alert.id}`, 'PATCH', {});
  assert.equal((await care(path)).alerts[0].status, 'resolved');
  // Background caregiver reads do not reset senior activity.
  clock = new Date('2026-10-30T13:00:00Z'); app.scanInactivity(); app.scanInactivity();
  data = await care(path); assert.equal(data.alerts.filter(a => a.kind === 'inactivity').length, 1);
  assert.equal(data.medications[0].status, null);
  const inactivity = data.alerts.find(a => a.kind === 'inactivity');
  await care(`${path}/alerts/${inactivity.id}`, 'PATCH', {});
  app.scanInactivity();
  assert.equal((await care(path)).alerts.filter(a => a.kind === 'inactivity').length, 1);
  await elder(`${path}/confirmations`, 'POST', { status: 'tomei' }, 400);
  await care(`${path}/activity`, 'POST', {}, 403);
  await elder(`${path}/activity`, 'POST', {}, 201);
  assert.equal((await care(path)).last_active, clock.toISOString());
  await care(`${path}/medications/${medication.id}`, 'PUT', { name: 'Losartana', dosage: '25 mg', time: '09:00' });
  assert.equal((await elder(path)).medications[0].dosage, '25 mg');
  const appointment = data.appointments[0];
  await care(`${path}/appointments/${appointment.id}`, 'PUT', { ...appointment, location: 'Hospital' });
  const contact = data.contacts[0];
  await care(`${path}/contacts/${contact.id}`, 'PUT', { ...contact, relationship: 'Cuidadora' });
  await care(path, 'PUT', { ...seniorData, inactivity_hours: 12 });
  assert.equal((await care(path)).inactivity_hours, 12);
  for (const [resource, rid] of [['medications', medication.id], ['appointments', appointment.id], ['contacts', contact.id]]) await care(`${path}/${resource}/${rid}`, 'DELETE');
  data = await care(path); assert.equal(data.contacts.length + data.medications.length + data.appointments.length + data.confirmations.length, 0);
  await elder('/api/logout', 'POST'); await elder('/api/me', 'GET', undefined, 401);
  await elder('/api/login', 'POST', { email: 'maria@example.com', password: 'idosa-segura-123' });
  await care(path, 'DELETE'); await elder('/api/me', 'GET', undefined, 401);
  assert.equal((await care('/api/seniors')).seniors.length, 0);
});
test('sessão expira, bloqueio de origem, JSON e headers de segurança', async t => {
  let clock = new Date(); const app = await start({ now: () => clock, secureCookies: true }); t.after(app.close); const c = app.client();
  const res = await fetch(app.base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(caregiver) });
  assert.equal(res.status, 201); assert.match(res.headers.get('set-cookie'), /HttpOnly.*SameSite=Strict.*Secure/);
  await c('/api/login', 'POST', caregiver);
  await c('/api/seniors', 'POST', seniorData, 403, { Origin: 'https://evil.example' });
  await c('/api/seniors', 'POST', seniorData, 415, { 'Content-Type': 'text/plain' });
  const bad = await fetch(app.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(bad.status, 400);
  const large = await fetch(app.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(17000) }) }); assert.equal(large.status, 413);
  const page = await fetch(app.base); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.match(await page.text(), /lang="pt-BR"/);
  clock = new Date(clock.getTime() + 8 * 86400000); await c('/api/me', 'GET', undefined, 401);
});
test('dados persistem após reinício e senhas não são armazenadas em texto', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'cuidali-')); t.after(() => rm(dir, { recursive: true, force: true })); const databasePath = join(dir, 'test.sqlite');
  const first = await start({ databasePath }); const c = first.client();
  try {
    await c('/api/register', 'POST', caregiver, 201); await c('/api/seniors', 'POST', seniorData, 201);
    const saved = first.db.prepare('SELECT password_hash FROM users').get().password_hash;
    assert.notEqual(saved, caregiver.password); assert.equal(saved.includes(caregiver.password), false);
  } finally { await first.close(); }
  const second = await start({ databasePath }); t.after(second.close); const d = second.client();
  await d('/api/login', 'POST', caregiver); assert.equal((await d('/api/seniors')).seniors[0].name, 'Maria');
});
test('alertas sem contato continuam úteis e eventos avisam outras sessões sem dados pessoais', async t => {
  const app = await start(); t.after(app.close); const c = app.client();
  await c('/api/register', 'POST', caregiver, 201); const { id } = await c('/api/seniors', 'POST', seniorData, 201);
  const login = await fetch(app.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(caregiver) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const controller = new AbortController();
  const events = await fetch(app.base + '/api/events', { headers: { Cookie: cookie }, signal: controller.signal });
  const reader = events.body.getReader(); const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /event: ready/);
  const result = await c(`/api/seniors/${id}/sos`, 'POST', {}, 201); assert.equal(result.contact, null); assert.match(result.message, /192/);
  assert.match(decoder.decode((await reader.read()).value), /event: change\ndata: \{\}/);
  controller.abort(); await reader.cancel().catch(() => {});
});
