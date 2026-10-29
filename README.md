# Cuidali

**Cuidado que conecta.** Plataforma da Kannali Corp para idosos e seus familiares/cuidadores, desenvolvida para o projeto do 4º termo do SENAI “A. Jacob Lafer”.

## Executar

Requer **Node.js 24+** (SQLite nativo). Sem dependências de produção, chaves externas ou serviços pagos.

```sh
npm ci
npm start
```

Abra `http://localhost:3000`. Em desenvolvimento, `npm run dev` reinicia a API quando seus arquivos mudam. O servidor cria `data/cuidali.sqlite` automaticamente e preserva os dados entre reinícios. Não há conta ou senha padrão.

1. Em **Criar conta**, cadastre o cuidador.
2. Cadastre a pessoa idosa, seus medicamentos (uma entrada para cada horário), consultas e contatos de confiança.
3. Use **Criar acesso do idoso** para definir seu e-mail e senha. Transmita essas credenciais de forma segura.
4. No celular ou em outra janela, entre com o acesso do idoso. Ele vê apenas seus próprios dados e pode confirmar remédios, conversar com o assistente e pedir ajuda.
5. O cuidador acompanha confirmações e alertas automaticamente no painel, e marca alertas como atendidos após verificar a situação.

## Entrega de código até a sprint 3

O ponto de partida da branch `sprint-1` continha documentação. Esta implementação inclui a base da sprint 2 e a integração/testes da sprint 3:

- Autenticação por e-mail/senha; contas e permissões distintas para cuidador e idoso.
- CRUD de pessoas idosas, medicamentos, contatos e consultas, com persistência relacional e integridade referencial.
- Confirmação diária de medicamentos (`Já tomei` / `Ainda não`), histórico e dia calculado no fuso da pessoa.
- Consultas com exportação `.ics` para agenda e lembretes durante o uso do aplicativo.
- SOS com registro persistente, atualização automática no painel e ligação `tel:` para o contato principal.
- Alerta de inatividade com limite configurável de 1 a 168 horas. Apenas ações reais do idoso renovam a atividade; abrir o painel do cuidador não renova esse prazo. Um único alerta por episódio de inatividade.
- Assistente por texto, leitura em voz alta e reconhecimento de fala quando oferecido pelo navegador. Respostas programadas consultam os dados cadastrados; sem LLM ou diagnóstico médico.
- Interface em português, responsiva, com alvos de toque de 56px, rótulos de formulário, navegação por teclado, foco visível e regiões de aviso acessíveis.
- Manifesto e service worker para instalação como **aplicação web/PWA**, conforme suporte do navegador. Não inclui binários nativos Android/iOS ou login biométrico.
- Testes unitários, de integração HTTP e fluxo real em Chromium, além de CI no GitHub Actions.

Somente código e instruções operacionais do repositório fazem parte desta entrega. O documento acadêmico original foi preservado; apresentação e documentação ABNT não foram produzidas.

## Configuração

Variáveis opcionais estão em `.env.example`. Para usar arquivo local:

```sh
cp .env.example .env
node --env-file=.env server/index.js
```

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface de escuta; use `0.0.0.0` em container |
| `PORT` | `3000` | Porta HTTP |
| `DATABASE_PATH` | `./data/cuidali.sqlite` | Banco SQLite persistente |
| `COOKIE_SECURE` | `false` | Defina `true` em produção via HTTPS |

Para acesso pelo celular, hospede atrás de proxy reverso HTTPS com domínio acessível. Microfone e instalação dependem de contexto seguro e suporte do navegador. O painel usa Server-Sent Events: configure o proxy sem buffering para `/api/events` e com timeout adequado. Configure o encaminhamento de `Host` para o mesmo host público, pois a API verifica a origem das escritas.

Processos precisam permanecer ativos para detectar inatividade; o monitor roda a cada minuto e também ao consultar o painel. Requisições e alertas precisam de internet. Lembretes falados são executados a cada 30 segundos **enquanto o aplicativo está aberto**; não há push em segundo plano. Mantenha o aplicativo aberto para recebê-los. Reconhecimento de voz pode enviar áudio ao serviço do navegador; o servidor Cuidali armazena apenas o texto enviado e a resposta.

O SOS avisa **dentro do painel**, sem SMS, WhatsApp, chamada automática ou despacho de emergência. O cuidador precisa acompanhar o painel. A ligação depende da confirmação do usuário e de telefonia disponível no aparelho. O primeiro contato cadastrado é o principal; sem contato, o alerta ainda é registrado e o app exibe a orientação de ligar 192 no Brasil.

## Testes

```sh
npm run check
npm test
```

A suíte Node testa validação, autenticação e expiração, isolamento de contas, permissões, CRUD, medicação por dia/fuso, SOS, deduplicação, inatividade, assistente, eventos, segurança HTTP e persistência após reinício. Usa bancos temporários; não altera os dados de desenvolvimento.

Teste opcional de navegador (Python 3.10+, Chromium):

```sh
python -m venv .venv
.venv/bin/pip install -r requirements-browser.txt
CHROMIUM_PATH=/usr/bin/chromium .venv/bin/python tests/browser_smoke.py
```

O teste inicia uma API e banco temporários, exercita cuidador e idoso em sessões independentes, CRUD, exportação de agenda, confirmação sincronizada, SOS, assistente, layout de celular, ampliação de texto e acessibilidade básica de rótulos/teclado/alvos de toque. Não substitui auditoria WCAG nem testes com usuários idosos. Áudio/microfone e ligação telefônica precisam de verificação manual em aparelho compatível.

## Estrutura e API

```text
server/index.js       inicialização e encerramento
server/app.js         API HTTP, autorização, sessões e eventos
server/db.js          schema SQLite e índices
server/domain.js      validação, fusos e assistente
public/               interface web/PWA
tests/               testes de domínio, API e navegador
.github/workflows/    integração contínua
```

Rotas principais (JSON, autenticação via cookie):

| Rota | Métodos | Uso |
| --- | --- | --- |
| `/api/register`, `/api/login` | POST | Cadastro de cuidador e login |
| `/api/me`, `/api/health` | GET | Sessão e saúde da API |
| `/api/logout` | POST | Revogar sessão |
| `/api/seniors` | GET, POST | Listar pessoas autorizadas / cadastrar |
| `/api/seniors/:id` | GET, PUT, DELETE | Perfil e todos os dados relacionados |
| `/api/seniors/:id/account` | POST | Acesso individual do idoso |
| `/api/seniors/:id/medications`, `appointments`, `contacts` | POST | Cadastrar recurso |
| `/api/seniors/:id/{recurso}/:item` | PUT, DELETE | Editar/excluir recurso |
| `/api/seniors/:id/confirmations` | POST | `medication_id`, `status` |
| `/api/seniors/:id/assistant` | POST | `message` |
| `/api/seniors/:id/sos` | POST | Alerta e contato para ligação |
| `/api/seniors/:id/activity` | POST | Atividade da própria pessoa idosa |
| `/api/seniors/:id/alerts/:alerta` | PATCH | Cuidador marca como atendido |
| `/api/events` | GET | Avisos SSE de atualização (sem dados pessoais) |

Use GET do perfil para consultar os recursos e os últimos 100 registros de confirmações/alertas e 30 interações. Horários de consulta na API devem ter fuso explícito (ISO 8601). A interface converte o horário local do aparelho para UTC. Confirmações se referem ao dia atual no fuso do idoso; não são prescrições nem ajuste de dosagem.

## Segurança e operação

Senhas usam scrypt com sal aleatório; tokens de sessão aleatórios são armazenados apenas como hash, expiram em sete dias e são revogados ao sair. Cookies HttpOnly/SameSite, verificação de origem, consultas parametrizadas, limite de corpo, limite de tentativas de login, escape de conteúdo e CSP estão implementados. O service worker armazena apenas arquivos públicos, sem dados clínicos nem respostas da API.

SQLite foi escolhido como banco relacional para uma execução local reproduzível; **não há adaptador MySQL** nesta versão. Use uma instância de servidor por arquivo de banco. Para produção, configure HTTPS, `COOKIE_SECURE=true`, disco criptografado, backups protegidos e política de retenção/consentimento. O arquivo do banco contém dados pessoais sem criptografia própria. Restrinja acesso ao diretório `data/`; não o versione. Para uma cópia simples consistente, pare o servidor antes de copiar **todo** o diretório `data/`, inclusive arquivos WAL presentes; restaure com o servidor parado. Não há recuperação de senha por e-mail nesta versão.

A aplicação é um projeto acadêmico funcional. Uso assistencial real exige validação operacional e de privacidade; alertas não substituem serviços de emergência.

## Equipe

Pedro de Oliveira · Enzo Avanze · Isabella Dias da Silva · Enzo Yudi Kadooka · Vitor Matheus Canali Pereira · Evelyn Silva de Lima.

Documento original de concepção: [Kannali_Cuidali.docx](Kannali_Cuidali.docx).
