# API REST · Sprint 2

JSON UTF-8. URL de desenvolvimento: API iniciada em `backend` com `php -S 0.0.0.0:8000 -t public public/index.php`. Envie `Content-Type: application/json` e, após login, `Authorization: Bearer <token>`. IDs retornados pelo PDO podem ser números ou strings numéricas. O cliente não determina a identidade ou perfil efetivo.

Datas de calendário e de doses: `YYYY-MM-DD`, fuso America/Sao_Paulo. Horários: `HH:MM`. Entrada de consulta: `YYYY-MM-DDTHH:MM` **em São Paulo**; saída de timestamps: `YYYY-MM-DD HH:MM:SS` **UTC**. O cliente converte timestamps para São Paulo.

| Método e rota | Corpo / resultado | Permissão |
|---|---|---|
| GET /health | `{status:"ok",timezone:"America/Sao_Paulo"}` | Pública, verifica DB |
| POST /auth/register | role, name, birth_date, phone, password; emergency_contact para elder | Pública; 201, id |
| POST /auth/login | phone, password | Pública; token, user, expires_in_seconds |
| GET /me | user | Autenticado |
| POST /auth/logout | sem corpo | Autenticado; revoga sessão atual |
| GET /links | items: id, name, phone da contraparte | Somente vínculos próprios |
| DELETE /links/{userId} | sem corpo; message | Um dos participantes |
| POST /link-codes | id, code, expires_in_seconds, message | Idoso; expira em 600 s |
| DELETE /link-codes/{id} | message | Idoso dono do código |
| POST /links/redeem | code; retorna elder_id, message | Cuidador; consumo atômico |
| GET /elders/{e}/dashboard | elder, date, timezone, last_activity, doses, appointments, dose_history | Idoso próprio / cuidador vinculado |
| GET /elders/{e}/medications[/{id}] | items; inclui times: [{id,time}] | Idoso próprio / cuidador vinculado |
| POST /elders/{e}/medications | name, dosage, start_date, end_date, times: ["08:00","20:00"] | Cuidador vinculado |
| PATCH /elders/{e}/medications/{id} | Mesmos campos completos | Cuidador vinculado |
| DELETE /elders/{e}/medications/{id} | Desativa; preserva horários e confirmações | Cuidador vinculado |
| POST /elders/{e}/doses/{timeId} | date, status: taken ou pending; retorna dose | Somente idoso próprio, data de hoje |
| GET /elders/{e}/appointments[/{id}] | items; inclui canceladas | Idoso próprio / cuidador vinculado |
| POST /elders/{e}/appointments | doctor, specialty, scheduled_at, location | Cuidador vinculado |
| PATCH /elders/{e}/appointments/{id} | Mesmos campos completos | Cuidador vinculado |
| DELETE /elders/{e}/appointments/{id} | Cancela; não apaga | Cuidador vinculado |
| GET /elders/{e}/contacts[/{id}] | items | Idoso próprio / cuidador vinculado |
| POST /elders/{e}/contacts | name, phone, relationship, is_primary: boolean | Idoso próprio / cuidador vinculado |
| PATCH /elders/{e}/contacts/{id} | Mesmos campos completos | Idoso próprio / cuidador vinculado |
| DELETE /elders/{e}/contacts/{id} | Exclusão física | Idoso próprio / cuidador vinculado |
| GET /elders/{e}/pains[/{id}] | items com views: caregiver_id, name, viewed_at | Idoso próprio / cuidador vinculado |
| POST /elders/{e}/pains | view, region, type, intensity, onset, notes | Somente idoso próprio |
| POST /elders/{e}/pains/{id}/seen | Visualização por cuidador, idempotente | Cuidador vinculado |

Todas as rotas aninhadas validam o vínculo/identidade **antes** de procurar registros e restringem os IDs ao idoso da URL. Enviar elder_id, user_id ou role extras no corpo não concede acesso. Não há autorização apenas por nome/telefone.

## Exemplos

Cadastro do idoso (`201`):

```json
{"role":"elder","name":"Pessoa Fictícia","birth_date":"1958-05-10","phone":"11900001111","password":"SenhaFicticia123","emergency_contact":{"name":"Contato Fictício","phone":"11900002222","relationship":"Filho"}}
```

Para cuidador, use `role: "caregiver"` e omita emergency_contact. Nomes não são únicos. Telefones são normalizados removendo espaços, parênteses, +, ponto e hífen, com 10–15 dígitos. Use a mesma convenção de DDI no cadastro e no login: não há inferência de país.

Login (`200`):

```json
{"phone":"11900001111","password":"SenhaFicticia123"}
```

Resposta (token ilustrativo):

```json
{"token":"<64 caracteres hexadecimais>","user":{"id":1,"role":"elder","name":"Pessoa Fictícia","birth_date":"1958-05-10","phone":"11900001111","created_at":"2026-01-01 12:00:00"},"expires_in_seconds":604800}
```

Criação de medicamento (`201`):

```json
{"name":"Medicamento fictício","dosage":"50 mg","start_date":"2026-10-23","end_date":"2026-11-23","times":["08:00","20:00"]}
```

Resposta: `{"id":1,"message":"Medicamento salvo."}`. Faça GET medications ou dashboard para obter o **time_id**, distinto do medication_id. Confirmação usa `POST /elders/1/doses/1`, corpo `{"date":"2026-10-23","status":"pending"}`. Depois envie `taken`. UNIQUE(time_id,dose_date) impede duplicidade; taken não regride. pending significa “ainda não”, nunca “perdida”. O dashboard traz doses de hoje e até 200 confirmações recentes do idoso; medicamentos desativados continuam no histórico.

Consulta: `{"doctor":"Dra. Fictícia","specialty":"Cardiologia","scheduled_at":"2026-10-25T14:00","location":"Clínica fictícia, sala 3"}`.

Dor: `{"view":"front","region":"left_knee","type":"Pontada","intensity":8,"onset":"Hoje","notes":"Após caminhar"}`.

`view`: front/back. `region`: head, chest, abdomen, upper_back, lower_back, left/right_shoulder, left/right_arm, left/right_hand, left/right_hip, left/right_leg, left/right_knee, left/right_foot (expanda left/right em duas opções). Lados anatômicos da pessoa, com imagem de costas espelhada. `type`: Pontada, Queimação, Latejante, Aperto / peso, Formigamento, Constante. `onset`: Hoje, Alguns dias, Mais de 1 semana. `notes` opcional, até 1000 bytes. Intensidade inteira de 1 a 10: 1–2 leve, 3–4 média, 5–6 forte, 7–8 muito forte, 9–10 máxima. Não é diagnóstico. O gráfico mostra os últimos sete registros reais, não médias ou dias sem dados.

## Erros e segurança

Erros têm formato `{"error":"Mensagem legível"}`. 400 JSON inválido; 401 credenciais/sessão inválidas ou expiradas; 403 perfil/vínculo insuficiente; 404 rota/registro não encontrado; 405 método não suportado; 409 telefone duplicado; 413 corpo acima de 16 KiB; 422 campos/código inválidos; 429 limite de tentativas; 500 erro interno sem SQL/credenciais.

Senhas com password_hash/verify, tokens aleatórios de 256 bits armazenados apenas por SHA-256, expiração configurável em SESSION_HOURS (padrão 168 h) e logout revogável. Códigos aleatórios de 48 bits, armazenados por hash, uso único com bloqueio transacional e expiração de dez minutos. Gerar novo código revoga os anteriores não usados. Um código compartilhado **autoriza diretamente** o cuidador; não há aprovação pendente ou “cuidador principal” privilegiado.

Janela de 15 minutos: login até 10 tentativas por telefone e 40 por IP; resgate de código até 10 por cuidador e 30 por IP; geração até 20 por idoso; cadastro até 20 por IP. Tentativas bem-sucedidas também contam. Não confiar em X-Forwarded-For fornecido pelo cliente. Deploy com proxy exige configuração de IP real confiável no servidor. Faça limpeza periódica de sessões expiradas e rate_limits vencidos; esses registros não concedem acesso após expiração.

CORS usa lista explícita de origens, sem cookies. Em produção, use HTTPS, contas DB com menor privilégio, gestão segura de segredos, backups, política de retenção e revisão de segurança antes de dados reais de saúde. Não existe endpoint de recuperação de senha, biometria, notificações, diagnóstico ou IA nesta versão.
