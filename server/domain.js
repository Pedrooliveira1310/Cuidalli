export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function text(value, label, max = 150, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AppError(400, `${label}: informe de 1 a ${max} caracteres.`);
  return value.trim();
}
export function phone(value) {
  const result = text(value, 'Telefone', 20);
  if (!/^\+?[\d ()-]{8,20}$/.test(result) || result.replace(/\D/g, '').length < 8) throw new AppError(400, 'Telefone inválido. Inclua o DDD.');
  return result;
}
export function date(value, label = 'Data') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new AppError(400, `${label} inválida.`);
  return value;
}
export function time(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new AppError(400, 'Horário inválido.');
  return value;
}
export function dayInZone(now, zone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function zone(value = 'America/Sao_Paulo') {
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format(); } catch { throw new AppError(400, 'Fuso horário inválido.'); }
  return value;
}
export function assistantReply(message, medications, appointments, now, timezone) {
  const m = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/ajuda|socorro|emergencia|sos/.test(m)) return 'Se precisar de ajuda, toque no botão SOS para avisar seu cuidador e ligar para o contato de confiança. Em emergência médica no Brasil, ligue 192.';
  if (/dose|dosagem|diagnostico|sintoma|tratamento|posso tomar|devo tomar/.test(m)) return 'Não forneço diagnósticos nem altero tratamentos. Consulte seu profissional de saúde sobre doses e sintomas.';
  if (/remedio|medicamento|tomar/.test(m)) return medications.length ? `Seus medicamentos cadastrados: ${medications.map(x => `${x.name}, ${x.dosage}, às ${x.time}`).join('; ')}. Siga a prescrição do seu profissional de saúde.` : 'Você ainda não tem medicamentos cadastrados. Peça ajuda ao seu cuidador.';
  if (/consulta|medico|agenda/.test(m)) {
    const upcoming = appointments.filter(x => Date.parse(x.starts_at) >= now.getTime());
    return upcoming.length ? `Sua próxima consulta é de ${upcoming[0].specialty}, em ${new Date(upcoming[0].starts_at).toLocaleString('pt-BR', { timeZone: timezone })}, no local ${upcoming[0].location}.` : 'Não há próximas consultas cadastradas.';
  }
  if (/dia|data|hora/.test(m)) return `Agora é ${now.toLocaleString('pt-BR', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' })}.`;
  return 'Estou aqui com você. Posso consultar seus remédios, suas consultas, a data de hoje ou orientar como pedir ajuda. Não forneço diagnósticos nem altero tratamentos.';
}
