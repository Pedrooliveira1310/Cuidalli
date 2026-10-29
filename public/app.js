const main = document.querySelector('main');
const account = document.querySelector('#account');
const modal = document.querySelector('#modal');
const state = { user: null, seniors: [], selected: null, tab: 'home', register: false, events: null, lastActivity: 0, drafts: {}, connection: 'connecting', asking: false };
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = (value, timezone) => new Date(value).toLocaleString('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' });
const current = () => state.seniors.find(s => s.id === state.selected);
let noticeTimer;
function notify(message) { const el = document.querySelector('#notice'); el.textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { el.textContent = ''; }, 6000); }
async function api(path, method = 'GET', data) {
  let res;
  try { res = await fetch(`/api${path}`, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, ...(data ? { body: JSON.stringify(data) } : {}) }); }
  catch { throw Error('Não foi possível conectar ao Cuidali. Confira sua conexão e tente novamente.'); }
  let body;
  try { body = await res.json(); } catch { throw Error('O servidor não respondeu como esperado. Tente novamente em instantes.'); }
  if (!res.ok) { if (res.status === 401 && state.user) { reset(); render(); } throw Error(body.error || 'Não foi possível concluir.'); }
  return body;
}
function reset() { state.events?.close(); state.events = null; state.user = null; state.seniors = []; state.selected = null; state.lastActivity = 0; state.tab = 'home'; state.register = false; state.drafts = {}; state.connection = 'connecting'; reminded.clear(); modal.close(); window.speechSynthesis?.cancel(); }
function connectionMessage() {
  if (!navigator.onLine) return 'Sem conexão · os dados podem estar desatualizados. Para pedir ajuda, use o telefone.';
  return state.connection === 'connected' ? '● Atualização automática conectada' : state.connection === 'connecting' ? 'Conectando à atualização automática…' : 'Reconectando… Use Atualizar se necessário.';
}
function updateConnection() { document.querySelector('.connection')?.replaceChildren(connectionMessage()); }
function updateNetwork() { document.querySelector('#network-status').hidden = navigator.onLine; updateConnection(); }
async function load(renderPage = true) {
  const data = await api('/seniors'); state.seniors = data.seniors;
  if (!current()) state.selected = state.seniors[0]?.id;
  if (renderPage) render();
}
function connect() {
  state.events?.close(); state.connection = 'connecting'; updateConnection(); const events = new EventSource('/api/events'); state.events = events;
  events.addEventListener('change', () => load(false).then(() => {
    // Preserve forms and typed messages while applying external changes elsewhere.
    if (!modal.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) render();
    else notify('Há atualizações. Use Atualizar ao terminar.');
  }).catch(() => {}));
  events.addEventListener('ready', () => { state.connection = 'connected'; updateConnection(); });
  events.onerror = () => { state.connection = 'reconnecting'; updateConnection(); };
}
function input(name, label, type = 'text', value = '', extra = '') { return `<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>${type === 'password' ? `<button type="button" class="text-button password-toggle" data-action="toggle-password" aria-pressed="false">Mostrar senha</button>` : ''}`; }
function icon(name, extra = '') {
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    leaf: '<path d="M20 3C9 2 3 7 4 14c1 6 11 9 14 2 2-4 2-8 2-13Z"/><path d="M4 21 15 10M8 17v-5m0 5h5"/>',
    pill: '<path d="m10 4-6 6a6 6 0 0 0 8 8l6-6a6 6 0 0 0-8-8Z"/><path d="m7 7 9 9"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 5h3m4 0h3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    chat: '<path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 1 1 19 0Z"/><path d="M7 10h10M7 14h6"/>',
    history: '<path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7m2-5v6l4 2"/>',
    people: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-18a4 4 0 0 1 0 8m2 4a6 6 0 0 1 3 6"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    phone: '<path d="m5 3 4 1 1 5-3 2a14 14 0 0 0 6 6l2-3 5 1 1 4c0 2-2 3-4 2C9 19 5 15 3 7c-1-2 0-4 2-4Z"/>'
  };
  return `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`;
}
function empty(message) { return `<p class="empty">${icon('leaf')}<span>${message}</span></p>`; }
function auth() {
  main.className = 'auth-page';
  account.innerHTML = '<span class="header-note">Cuidado em cada conexão</span>';
  main.innerHTML = `<div class="auth-layout">
    <section class="auth-story">
      <p class="eyebrow"><span class="status-dot"></span> MAIS PRESENÇA. MAIS CUIDADO.</p>
      <h1 class="hero-title">Cuidar de quem <br>você ama pode <br>ser <em>mais leve.</em></h1>
      <p class="hero-description">Mais autonomia para quem você ama.<br>Mais tranquilidade para quem cuida.</p>
      <div class="hero-art">
        <span class="art-tag">${icon('heart')} Perto, mesmo à distância</span>
        <img src="/care-illustration.svg" width="640" height="370" alt="Ilustração de uma pessoa idosa e uma cuidadora juntas em um banco.">
        <div class="art-caption"><span class="art-mark">${icon('people')}</span><div><strong>O cuidado começa na conexão.</strong><span>Para idosos, familiares e cuidadores.</span></div></div>
      </div>
      <div class="hero-features"><span>${icon('pill')} Rotina organizada</span><span>${icon('heart')} Rede de apoio</span><span>${icon('chat')} Mais companhia</span></div>
    </section>
    <section class="card auth-card" aria-label="Acesso ao Cuidali">
      <div class="tabs"><button data-action="login-tab" aria-pressed="${!state.register}">Entrar</button><button data-action="register-tab" aria-pressed="${state.register}">Criar conta</button></div>
      <div class="auth-heading"><span class="auth-emblem">${icon(state.register ? 'people' : 'heart')}</span><p class="eyebrow">SEU ESPAÇO DE CUIDADO</p><h2>${state.register ? 'Vamos cuidar juntos?' : 'Que bom ter você aqui.'}</h2><p class="muted">${state.register ? 'Crie sua conta de familiar ou cuidador e comece sua rede de apoio.' : 'Entre na sua conta para continuar cuidando do que mais importa.'}</p></div>
      <form id="auth-form">${state.register ? input('name', 'Seu nome', 'text', '', 'required maxlength="100" autocomplete="name" placeholder="Como podemos chamar você?"') : ''}${input('email', 'E-mail', 'email', '', 'required autocomplete="username" maxlength="254" placeholder="voce@exemplo.com"')}${input('password', 'Senha (mínimo de 10 caracteres)', 'password', '', `required minlength="10" maxlength="128" placeholder="Digite sua senha" autocomplete="${state.register ? 'new-password' : 'current-password'}"`)}<div class="form-error" role="alert"></div><button type="submit">${state.register ? 'Criar minha conta' : 'Entrar com segurança'} ${icon('arrow')}</button></form>
      <div class="auth-help">${icon('people')}<p><strong>Primeiro acesso do idoso?</strong><br>Peça ao cuidador para cadastrar seu acesso no painel.</p></div>
      <p class="auth-assurance">${icon('shield')} Um espaço para cuidar e se conectar.</p>
    </section>
  </div>`;
}
function render() {
  if (!state.user) return auth();
  main.className = 'dashboard-page';
  const care = state.user.role === 'caregiver'; const s = current();
  account.innerHTML = `<span class="account-avatar" aria-hidden="true">${escape(state.user.name.trim().slice(0, 1).toUpperCase())}</span><span class="account-info"><strong>${escape(state.user.name)}</strong><small>${care ? 'Familiar / cuidador' : 'Meu cuidado'}</small></span><button class="secondary small" data-action="logout">Sair</button>`;
  const total = s?.medications.length || 0, done = s?.medications.filter(m => m.status === 'tomei').length || 0;
  const upcoming = s?.appointments.filter(a => new Date(a.starts_at) >= new Date()).length || 0;
  const openAlerts = s?.alerts.filter(a => a.status === 'open').length || 0;
  main.innerHTML = `<div class="page-heading"><div><p class="eyebrow">${care ? 'SUA REDE DE CUIDADO' : 'SEU DIA, COM MAIS TRANQUILIDADE'}</p><h1>${care ? 'Cuidar é estar presente.' : `Olá, ${escape(s?.name.split(' ')[0] || state.user.name)}!`}</h1><p class="muted">${care ? 'Tudo o que você precisa para acompanhar quem ama.' : 'Vamos cuidar do seu dia, um passo de cada vez.'}</p></div><button class="secondary" data-action="refresh">↻ Atualizar</button></div>
    <p class="connection" role="status">${connectionMessage()}</p>
    ${care ? `<div class="care-selector"><div class="person-picker"><span class="picker-icon">${icon('people')}</span><div><label for="senior-picker">Pessoa acompanhada</label><select id="senior-picker">${state.seniors.length ? state.seniors.map(x => `<option value="${x.id}" ${x.id === s?.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('') : '<option>Nenhuma pessoa cadastrada</option>'}</select></div></div><div class="actions"><button data-action="new-senior">+ Cadastrar idoso</button>${s ? '<button class="secondary" data-action="profile">Editar perfil</button>' : ''}</div></div>` : ''}
    ${!s ? `<section class="card onboarding-card"><span class="onboarding-icon">${icon('people')}</span><h2>${care ? 'Toda rede de cuidado começa com alguém.' : 'Seu cadastro ainda não foi vinculado'}</h2><p>${care ? 'Cadastre a pessoa que você acompanha. Depois, organize os medicamentos, as consultas e os contatos de confiança em um só lugar.' : 'Peça ao seu cuidador para verificar seu cadastro.'}</p>${care ? '<button data-action="new-senior">+ Cadastrar idoso</button>' : ''}</section>` : `
    <div class="section-label"><h2>Um olhar para o seu dia</h2><span>${escape(s.day.split('-').reverse().join('/'))}</span></div>
    <div class="stats">
      <div class="stat"><span class="stat-icon">${icon('pill')}</span><div><span>Remédios de hoje</span><strong>${done}<small> / ${total}</small></strong><span>${total ? 'Confirmações registradas' : 'Nenhum remédio cadastrado'}</span></div></div>
      <div class="stat"><span class="stat-icon peach">${icon('calendar')}</span><div><span>Próximas consultas</span><strong>${upcoming}</strong><span>${upcoming === 1 ? 'Consulta na sua agenda' : 'Consultas na sua agenda'}</span></div></div>
      <div class="stat ${openAlerts ? 'has-alerts' : ''}"><span class="stat-icon ${openAlerts ? 'rose' : 'lavender'}">${icon('bell')}</span><div><span>Alertas em aberto</span><strong>${openAlerts}</strong><span>${openAlerts ? 'Precisam de atenção' : 'Nenhum alerta em aberto'}</span></div></div>
    </div>
    <nav class="nav" aria-label="Áreas do cuidado">${[['home', 'Início', 'home'], ['assistant', 'Assistente', 'chat'], ['history', 'Histórico', 'history']].map(([tab, label, symbol]) => `<button data-action="tab" data-id="${tab}" ${state.tab === tab ? 'aria-current="page"' : ''}>${icon(symbol)} ${label}</button>`).join('')}</nav>
    ${state.tab === 'home' ? home(s, care) : state.tab === 'assistant' ? assistant(s) : history(s, care)}`}`;
}
function home(s, care) {
  return `<div class="grid"><section class="card medication-card"><div class="toolbar"><h2><span class="heading-icon">${icon('pill')}</span> Remédios de hoje</h2>${care ? '<button class="secondary small" data-action="new-medications">+ Adicionar</button>' : ''}</div><p class="muted">${escape(s.day.split('-').reverse().join('/'))} · ${escape(s.timezone)}</p>${s.medications.map(m => `<article class="item"><span class="badge ${m.status === 'tomei' ? '' : 'warning'}">${escape(m.time)} · ${m.status === 'tomei' ? 'Já tomou' : m.status === 'nao_tomei' ? 'Ainda não tomou' : 'A confirmar'}</span><h3>${escape(m.name)} <span class="muted">${escape(m.dosage)}</span></h3>${m.notes ? `<p>${escape(m.notes)}</p>` : ''}<div class="actions"><button class="success" data-action="confirm" data-id="${m.id}" data-status="tomei">✓ Já tomei</button><button class="secondary" data-action="confirm" data-id="${m.id}" data-status="nao_tomei">Ainda não</button>${care ? manage('medications', m.id) : ''}</div></article>`).join('') || empty('Nenhum medicamento cadastrado.')}</section>
    <section class="card sos-panel"><span class="support-icon">${icon('phone')}</span><p class="eyebrow">SUA REDE ESTÁ AQUI</p><h2>Precisa de ajuda?</h2><p>Toque para registrar um alerta no painel do cuidador e abrir a opção de ligar para seu contato de confiança.</p><button class="danger sos-button" data-action="sos">☎ SOS · Pedir ajuda</button><p><small>O alerta depende de internet e do cuidador acessar o painel. Para ligar, use um aparelho com telefonia. Não enviamos SMS ou WhatsApp.</small></p>${s.contacts[0] ? `<p>Contato principal: <strong>${escape(s.contacts[0].name)}</strong><br><a class="button secondary" href="tel:${escape(s.contacts[0].phone.replace(/[^+\d]/g, ''))}">Ligar ${escape(s.contacts[0].phone)}</a></p>` : '<p>Nenhum contato de confiança cadastrado.</p>'}</section>
    <section class="card appointments-card"><div class="toolbar"><h2><span class="heading-icon peach">${icon('calendar')}</span> Consultas</h2>${care ? '<button class="secondary small" data-action="new-appointments">+ Agendar</button>' : ''}</div>${s.appointments.map(a => `<article class="item"><span class="badge ${Date.parse(a.starts_at) < Date.now() ? 'warning' : ''}">${when(a.starts_at, s.timezone)}</span><h3>${escape(a.specialty)}</h3><p>${escape(a.doctor)}<br>${escape(a.location)}</p><div class="actions"><button class="secondary small" data-action="calendar" data-id="${a.id}">Adicionar à agenda</button>${care ? manage('appointments', a.id) : ''}</div></article>`).join('') || empty('Nenhuma consulta agendada.')}</section>
    <section class="card contacts-card"><div class="toolbar"><h2><span class="heading-icon lavender">${icon('people')}</span> Contatos de confiança</h2>${care ? '<button class="secondary small" data-action="new-contacts">+ Adicionar</button>' : ''}</div>${s.contacts.map((c, i) => `<article class="item"><h3>${escape(c.name)} ${i === 0 ? '<span class="badge">Principal</span>' : ''}</h3><p>${escape(c.relationship)} · ${escape(c.phone)}</p><div class="actions"><a class="button secondary small" href="tel:${escape(c.phone.replace(/[^+\d]/g, ''))}">Ligar</a>${care ? manage('contacts', c.id) : ''}</div></article>`).join('') || empty('Cadastre um contato para usar a ligação de emergência.')}</section>
    ${care ? `<section class="card wide"><div class="toolbar"><h2><span class="heading-icon peach">${icon('bell')}</span> Alertas e acompanhamento</h2>${!s.user_id ? '<button data-action="new-account">Criar acesso do idoso</button>' : '<span class="badge">Acesso do idoso ativo</span>'}</div><p class="muted">Última interação do idoso: ${when(s.last_active, s.timezone)}. Alerta após ${s.inactivity_hours}h sem interação. O monitoramento requer o servidor em execução.</p>${alerts(s, care)}</section>` : ''}</div>`;
}
function manage(resource, id) { return `<button class="text-button small" data-action="edit" data-resource="${resource}" data-id="${id}">Editar</button><button class="text-button small" data-action="delete" data-resource="${resource}" data-id="${id}">Excluir</button>`; }
function alerts(s, care) { return s.alerts.map(a => `<article class="item"><span class="badge ${a.status === 'open' ? 'red' : ''}">${a.status === 'open' ? 'Em aberto' : 'Atendido'}</span><h3>${a.kind === 'sos' ? 'SOS · Pedido de ajuda' : 'Ausência de interação'}</h3><p>${when(a.created_at, s.timezone)}</p>${care && a.status === 'open' ? `<button class="secondary" data-action="resolve" data-id="${a.id}">Marcar como atendido</button>` : ''}</article>`).join('') || empty('Nenhum alerta registrado.'); }
function history(s, care) {
  return `<div class="grid"><section class="card"><h2>Histórico de medicação</h2>${s.confirmations.map(c => `<article class="item"><h3>${escape(c.name)} · ${escape(c.dosage)}</h3><p>${c.status === 'tomei' ? '✓ Tomou' : 'Ainda não tomou'} · ${escape(c.day)} às ${escape(c.time)}</p><small>Atualizado: ${when(c.created_at, s.timezone)}</small></article>`).join('') || empty('As confirmações aparecerão aqui.')}</section><section class="card"><h2>Histórico de alertas</h2>${alerts(s, care)}</section></div>`;
}
function assistant(s) {
  return `<section class="card assistant-card"><span class="auth-emblem">${icon('chat')}</span><p class="eyebrow">UMA COMPANHIA PARA O SEU DIA</p><h2>Como posso ajudar hoje?</h2><p class="muted">Consulte seus lembretes por texto ou voz. Este assistente usa respostas programadas e não fornece orientação médica.</p><div class="actions">${['Meus remédios', 'Minhas consultas', 'Que dia é hoje?', 'Preciso de ajuda'].map(t => `<button class="secondary" data-action="ask" data-message="${t}">${t}</button>`).join('')}</div><div class="chat" role="log" aria-label="Conversa com o assistente">${[...s.interactions].reverse().map(i => `<div class="bubble user"><strong>Você</strong><p>${escape(i.content)}</p></div><div class="bubble"><strong>Cuidali</strong><p>${escape(i.reply)}</p></div>`).join('')}</div><form id="chat-form">${input('message', 'Sua mensagem', 'text', state.drafts[s.id] || '', 'required maxlength="500" autocomplete="off"')}<div class="actions"><button type="submit">Enviar mensagem</button><button type="button" class="secondary" data-action="listen">🎙 Falar</button><button type="button" class="secondary" data-action="read">Ouvir última resposta</button><button type="button" class="secondary" data-action="stop-speaking">Parar leitura</button></div><div class="form-error" role="alert"></div></form><p><small>Voz depende do navegador, das permissões do microfone e de HTTPS (ou localhost). O reconhecimento pode ser processado pelo serviço do navegador. Texto está sempre disponível.</small></p></section>`;
}
function showDialog(title, html) { modal.innerHTML = `<div class="dialog-head"><h2 id="modal-title">${title}</h2><button class="secondary small" data-action="close-modal" aria-label="Fechar janela">✕</button></div>${html}`; modal.showModal(); }
function formDialog(title, fields, onSubmit) {
  showDialog(title, `<form id="editor">${fields}<div class="form-error" role="alert"></div><div class="actions"><button type="submit">Salvar</button><button type="button" class="secondary" data-action="close-modal">Cancelar</button></div></form>`);
  document.querySelector('#editor').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(form))); modal.close(); await load(); notify('Salvo com sucesso.'); }
    catch (error) { form.querySelector('.form-error').textContent = error.message; } finally { button.disabled = false; }
  });
}
function seniorForm(editing = false) {
  const s = editing ? current() : {};
  formDialog(editing ? 'Perfil e acompanhamento' : 'Cadastrar pessoa idosa', `${input('name', 'Nome completo', 'text', s.name, 'required maxlength="100"')}${input('birth_date', 'Data de nascimento', 'date', s.birth_date, 'required')}${input('phone', 'Telefone com DDD', 'tel', s.phone, 'required maxlength="20"')}${input('address', 'Endereço (opcional)', 'text', s.address, 'maxlength="200"')}${input('timezone', 'Fuso horário', 'text', s.timezone || 'America/Sao_Paulo', 'required')}<small>Exemplo: America/Sao_Paulo</small>${editing ? input('inactivity_hours', 'Alertar após quantas horas sem interação?', 'number', s.inactivity_hours, 'required min="1" max="168"') : ''}`, async b => {
    if (editing) b.inactivity_hours = Number(b.inactivity_hours);
    const r = await api(`/seniors${editing ? '/' + s.id : ''}`, editing ? 'PUT' : 'POST', b); if (r.id) state.selected = r.id;
  });
  if (editing) {
    const button = document.createElement('button'); button.className = 'text-button'; button.textContent = 'Excluir pessoa e todos os seus dados'; button.type = 'button';
    button.onclick = async () => { if (confirm('Excluir permanentemente esta pessoa, acesso, medicamentos e histórico?')) { try { await api(`/seniors/${s.id}`, 'DELETE'); modal.close(); await load(); } catch (e) { notify(e.message); } } }; modal.append(button);
  }
}
function editResource(resource, id) {
  const s = current(), v = s[resource].find(x => x.id === id) || {};
  let fields;
  if (resource === 'medications') fields = `${input('name', 'Medicamento', 'text', v.name, 'required maxlength="100"')}${input('dosage', 'Dosagem prescrita', 'text', v.dosage, 'required maxlength="50"')}${input('time', 'Horário diário', 'time', v.time, 'required')}${input('notes', 'Observações (opcional)', 'text', v.notes, 'maxlength="500"')}<p><small>Para várias doses por dia, cadastre uma entrada para cada horário. Não altere prescrições sem orientação profissional.</small></p>`;
  if (resource === 'contacts') fields = `${input('name', 'Nome do contato', 'text', v.name, 'required maxlength="100"')}${input('phone', 'Telefone com DDD', 'tel', v.phone, 'required maxlength="20"')}${input('relationship', 'Parentesco ou relação', 'text', v.relationship, 'required maxlength="50"')}<p><small>O primeiro contato cadastrado será usado como principal no SOS.</small></p>`;
  if (resource === 'appointments') {
    const local = v.starts_at ? new Date(Date.parse(v.starts_at) - new Date(v.starts_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    fields = `${input('specialty', 'Especialidade', 'text', v.specialty, 'required maxlength="100"')}${input('doctor', 'Profissional (opcional)', 'text', v.doctor, 'maxlength="100"')}${input('starts_at', 'Data e hora (fuso deste aparelho)', 'datetime-local', local, 'required')}${input('location', 'Local da consulta', 'text', v.location, 'required maxlength="150"')}`;
  }
  formDialog(`${id ? 'Editar' : 'Cadastrar'} ${ { medications: 'medicamento', contacts: 'contato', appointments: 'consulta' }[resource]}`, fields, b => { if (resource === 'appointments') b.starts_at = new Date(b.starts_at).toISOString(); return api(`/seniors/${s.id}/${resource}${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', b); });
}
function speak(message) { if (!window.speechSynthesis) return notify('Leitura de voz indisponível neste navegador.'); window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(message); utterance.lang = 'pt-BR'; utterance.rate = .9; window.speechSynthesis.speak(utterance); }
async function ask(message, clearDraft = false) {
  if (state.asking) return;
  const seniorId = current().id;
  const submittedDraft = state.drafts[seniorId] || '';
  state.asking = true;
  const controls = document.querySelectorAll('[data-action=ask], #chat-form [type=submit]');
  controls.forEach(button => { button.disabled = true; });
  try {
    const r = await api(`/seniors/${seniorId}/assistant`, 'POST', { message });
    // A quick question must not erase a separately typed message, nor a new draft.
    if (clearDraft && state.drafts[seniorId] === submittedDraft) delete state.drafts[seniorId];
    await load(); speak(r.reply); document.querySelector('.chat')?.scrollTo(0, 999999);
  } finally {
    state.asking = false;
    controls.forEach(button => { button.disabled = false; });
    document.querySelectorAll('[data-action=ask], #chat-form [type=submit]').forEach(button => { button.disabled = false; });
  }
}
function calendar(a) {
  const clean = s => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
  const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kannali//Cuidali//PT-BR','BEGIN:VEVENT',`UID:${a.id}@cuidali`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(a.starts_at)}`,`DTEND:${stamp(Date.parse(a.starts_at)+3600000)}`,`SUMMARY:${clean(a.specialty)}`,`LOCATION:${clean(a.location)}`,`DESCRIPTION:${clean(a.doctor)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); link.href = url; link.download = 'consulta.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const action = b.dataset.action, s = current();
  if (action === 'toggle-password') {
    const field = b.previousElementSibling.querySelector('input');
    const show = field.type === 'password'; field.type = show ? 'text' : 'password';
    b.textContent = show ? 'Ocultar senha' : 'Mostrar senha'; b.setAttribute('aria-pressed', String(show)); return;
  }
  try {
    if (action === 'login-tab' || action === 'register-tab') {
      const register = action === 'register-tab';
      if (register === state.register) return;
      const email = document.querySelector('#auth-form [name=email]').value;
      state.register = register; render();
      document.querySelector('#auth-form [name=email]').value = email;
      document.querySelector(`[data-action=${action}]`).focus();
    }
    if (action === 'logout') { await api('/logout', 'POST'); reset(); render(); }
    if (action === 'refresh') { await load(); notify('Dados atualizados.'); }
    if (action === 'tab') { state.tab = b.dataset.id; render(); }
    if (action === 'close-modal') modal.close();
    if (action === 'new-senior') seniorForm();
    if (action === 'profile') seniorForm(true);
    if (['new-medications', 'new-appointments', 'new-contacts'].includes(action)) editResource(action.slice(4));
    if (action === 'edit') editResource(b.dataset.resource, b.dataset.id);
    if (action === 'delete' && confirm('Excluir este registro? Esta ação não pode ser desfeita.')) { await api(`/seniors/${s.id}/${b.dataset.resource}/${b.dataset.id}`, 'DELETE'); await load(); }
    if (action === 'new-account') formDialog('Criar acesso do idoso', `${input('email', 'E-mail para acesso', 'email', '', 'required autocomplete="off"')}${input('password', 'Senha (mínimo de 10 caracteres)', 'password', '', 'required minlength="10" maxlength="128" autocomplete="new-password"')}<p><small>Compartilhe o acesso com a pessoa de forma segura. Ela verá somente seus próprios dados.</small></p>`, b => api(`/seniors/${s.id}/account`, 'POST', b));
    if (action === 'confirm') { await api(`/seniors/${s.id}/confirmations`, 'POST', { medication_id: b.dataset.id, status: b.dataset.status }); await load(); notify(b.dataset.status === 'tomei' ? 'Confirmação registrada. Obrigado por se cuidar!' : 'Registrado como ainda não tomado.'); }
    if (action === 'resolve') { await api(`/seniors/${s.id}/alerts/${b.dataset.id}`, 'PATCH', {}); await load(); notify('Alerta marcado como atendido.'); }
    if (action === 'sos') {
      b.disabled = true;
      const r = await api(`/seniors/${s.id}/sos`, 'POST', {}); await load();
      showDialog('Pedido de ajuda registrado', `<p>${escape(r.message)}</p>${r.contact ? `<a class="button danger" href="tel:${escape(r.contact.phone.replace(/[^+\d]/g, ''))}">☎ Ligar para ${escape(r.contact.name)}</a>` : ''}<p>Em emergência médica no Brasil: <a href="tel:192">ligue 192</a>.</p><button class="secondary" data-action="close-modal">Voltar</button>`); speak(r.message);
    }
    if (action === 'ask') await ask(b.dataset.message);
    if (action === 'read') speak(s.interactions[0]?.reply || 'Como posso ajudar hoje?');
    if (action === 'stop-speaking') window.speechSynthesis?.cancel();
    if (action === 'calendar') calendar(s.appointments.find(a => a.id === b.dataset.id));
    if (action === 'listen') {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) return notify('Seu navegador não oferece reconhecimento de voz. Digite sua mensagem.');
      const recognition = new Recognition(); recognition.lang = 'pt-BR'; recognition.interimResults = false;
      recognition.onresult = e => { const input = document.querySelector('[name=message]'); if (input) { input.value = e.results[0][0].transcript; state.drafts[current().id] = input.value; input.focus(); notify('Confira o texto e toque em Enviar mensagem.'); } };
      recognition.onerror = () => notify('Não foi possível ouvir. Confira a permissão do microfone ou digite.'); recognition.start(); notify('Estou ouvindo…');
    }
  } catch (error) { notify(error.message); b.disabled = false; }
});
document.addEventListener('submit', async e => {
  if (!['auth-form', 'chat-form'].includes(e.target.id)) return;
  e.preventDefault(); const form = e.target, button = form.querySelector('[type=submit]'); button.disabled = true; form.querySelector('.form-error').textContent = '';
  try {
    const data = Object.fromEntries(new FormData(form));
    if (form.id === 'auth-form') { state.user = (await api(state.register ? '/register' : '/login', 'POST', data)).user; await load(); connect(); window.scrollTo(0, 0); }
    else await ask(data.message, true);
  } catch (error) { form.querySelector('.form-error').textContent = error.message; } finally { button.disabled = false; }
});
document.addEventListener('input', e => { if (e.target.matches('#chat-form [name=message]') && current()) state.drafts[current().id] = e.target.value; });
document.addEventListener('change', e => { if (e.target.id === 'senior-picker') { state.selected = e.target.value; render(); } });
// Only actual interaction counts as activity; background refresh never conceals inactivity.
function activity() { if (state.user?.role === 'senior' && current() && Date.now() - state.lastActivity > 60000) { state.lastActivity = Date.now(); api(`/seniors/${current().id}/activity`, 'POST', {}).catch(() => {}); } }
document.addEventListener('pointerdown', activity); document.addEventListener('keydown', activity);
const reminded = new Set();
setInterval(() => {
  const s = current(); if (!s || state.user?.role !== 'senior') return;
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: s.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone }).format(new Date());
  // Refresh stale dates on rollover before showing reminders for the new day.
  if (day !== s.day) { load(false).catch(() => {}); return; }
  for (const m of s.medications) {
    const key = `${day}:${m.id}`;
    if (m.time <= clock && m.status !== 'tomei' && !reminded.has(key)) { reminded.add(key); notify(`Hora do remédio: ${m.name}, ${m.dosage}. Confirme na tela Início.`); speak(`Lembrete: ${m.name}, ${m.dosage}. Já tomou? Confirme na tela Início.`); }
  }
  for (const a of s.appointments) {
    const remaining = Date.parse(a.starts_at) - Date.now(), key = `appointment:${a.id}:${a.starts_at}`;
    if (remaining > 0 && remaining <= 3600000 && !reminded.has(key)) { reminded.add(key); notify(`Consulta em breve: ${a.specialty}. ${when(a.starts_at, s.timezone)}`); speak(`Sua consulta de ${a.specialty} será em breve. Confira os detalhes na tela Início.`); }
  }
}, 30000);
window.addEventListener('offline', () => { updateNetwork(); notify('Sem internet. Não é possível sincronizar ou enviar SOS. Use o telefone para pedir ajuda.'); });
window.addEventListener('online', () => { updateNetwork(); if (state.user) load().catch(e => notify(e.message)); });
updateNetwork();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
try { state.user = (await api('/me')).user; await load(); connect(); } catch { render(); }
