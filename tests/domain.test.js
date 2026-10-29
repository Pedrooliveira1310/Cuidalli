import { test } from 'node:test';
import assert from 'node:assert/strict';
import { date, time, phone, zone, dayInZone, assistantReply } from '../server/domain.js';
test('validação de datas, horários, telefones e fusos', () => {
  assert.equal(date('2024-02-29'), '2024-02-29');
  for (const v of ['2025-02-29', '2026-13-01', 'amanhã', null]) assert.throws(() => date(v));
  assert.equal(time('23:59'), '23:59');
  for (const v of ['24:00', '8:00', '12:99']) assert.throws(() => time(v));
  assert.equal(phone('(11) 99999-1234'), '(11) 99999-1234');
  assert.throws(() => phone('<script>'));
  assert.throws(() => zone('inexistente'));
  assert.equal(dayInZone(new Date('2026-10-30T01:00:00Z'), 'America/Sao_Paulo'), '2026-10-29');
});
test('assistente usa os cadastros, respeita fuso e não prescreve', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  const meds = [{ name: 'Remédio cadastrado', dosage: '50 mg', time: '08:00' }];
  assert.match(assistantReply('meus remédios', meds, [], now, 'America/Sao_Paulo'), /50 mg.*08:00/);
  assert.match(assistantReply('socorro', [], [], now, 'America/Sao_Paulo'), /192/);
  assert.match(assistantReply('qual dose devo tomar?', [], [], now, 'America/Sao_Paulo'), /Não forneço diagnósticos/);
  assert.match(assistantReply('minhas consultas', [], [{specialty:'Cardiologia', starts_at:'2026-10-30T12:00:00Z', location:'UBS'}], now, 'America/Sao_Paulo'), /Cardiologia.*UBS/);
});
