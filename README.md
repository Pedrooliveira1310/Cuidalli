# Cuidali · Sprint 2

Kannali Corp — SENAI A. Jacob Lafer. Aplicativo para idosos e cuidadores, com Expo/React Native/TypeScript, API PHP orientada a objetos/PDO e MySQL/MariaDB persistente.

A documentação original da sprint 1 foi preservada em `Kannali_Cuidali.docx` e o README anterior em `docs/README-SPRINT1.md`. Referências visuais: telas do Figma fornecidas pelo autor na conversa (idoso, cuidador e relógio). Foram preservados azul, cartões azuis/amarelos e a organização das jornadas. O relógio não é implementado nesta sprint.

## Requisitos

- Node.js 22.13+ na linha 22, 24.3+ na linha 24, ou 26+ (validação: Node 24.19).
- PHP **8.2 ou superior**, extensões PDO e pdo_mysql.
- MySQL 8 ou MariaDB 10.6 ou superior.
- Expo Go compatível com **SDK 58**, ou development build correspondente. Versões incompatíveis do Expo Go exigem build ou atualização planejada do SDK.
- Para testes web: Chromium ou navegador instalado pelo Playwright.

## Banco e API

Crie um banco e um usuário local. Execute em uma sessão administrativa do MySQL; substitua a senha de exemplo por uma senha local:

```sql
CREATE DATABASE cuidali CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cuidali'@'127.0.0.1' IDENTIFIED BY 'SUBSTITUA_POR_SENHA_LOCAL';
GRANT ALL PRIVILEGES ON cuidali.* TO 'cuidali'@'127.0.0.1';
```

```sh
cd backend
cp .env.example .env
# Configure DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD no .env.
php migrate.php
php -S 0.0.0.0:8000 -t public public/index.php
```

O migrador registra versões em `schema_migrations`. Rode novamente para aplicar novas versões; ele não recria tabelas nem apaga dados. Não altere SQL já aplicado: novas mudanças devem ser novos arquivos numerados. `GET /health` verifica conexão com o banco. O servidor embutido é destinado a desenvolvimento; em produção use HTTPS e servidor PHP apropriado, com raiz exclusivamente em `backend/public`.

## Aplicativo

O projeto usa Expo SDK 58. Para atualizar uma instalação existente, consulte [Migração para SDK 58](docs/MIGRACAO-SDK58.md).

```sh
cd mobile
cp .env.example .env
# Defina EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8000
npm ci
npm start
```

No celular físico, use o IP de rede do computador, nunca `localhost`. Computador e celular devem estar na mesma rede, com porta 8000 liberada no firewall. A URL não contém `/public` usando o comando acima. Abra o QR code com Expo Go compatível. Emulador Android padrão pode usar `http://10.0.2.2:8000`.

```sh
npm run web
npm run typecheck
npm run export:web
```

Para web, adicione a origem exata (por exemplo `http://localhost:8081`) a `CORS_ORIGINS` no backend. CORS não substitui a autenticação. Em Android/iOS o token fica em Expo SecureStore; no navegador fica somente em memória e sair/recarregar exige novo login. Nenhuma senha é armazenada no app.

### Windows / XAMPP

1. Instale XAMPP com PHP 8.2+ e inicie MySQL. Ative `extension=pdo_mysql` em `php.ini`, se necessário.
2. Adicione `C:\xampp\php` ao PATH e confirme `php -v` e `php -m`.
3. Crie banco e usuário no phpMyAdmin/SQL conforme acima. O XAMPP pode usar outro host/porta: ajuste `backend\.env`. Evite usar `root` na aplicação.
4. No PowerShell, dentro de `backend`: `Copy-Item .env.example .env`, edite o arquivo e execute `php migrate.php`.
5. Ainda em `backend`, rode `php -S 0.0.0.0:8000 -t public public/index.php`. Esse modo não depende de rewrite do Apache.
6. Execute `ipconfig`, encontre o IPv4 da interface Wi-Fi e configure `mobile\.env`: `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000`.
7. Em outro terminal: `cd mobile`, `npm ci`, `npm start`. Libere PHP/porta 8000 apenas na rede privada. Reinicie o Metro após mudar a URL.

O `.env` e o SQL não devem ser expostos por Apache. Se optar por Apache, configure um VirtualHost com DocumentRoot em `backend/public` e roteamento para `index.php`, adaptando a URL do app.

## Primeiro uso

Não há seed ou contas prontas. Cadastre contas fictícias pelo app.

1. Selecione o perfil, cadastre nome, nascimento, telefone e senha. O idoso também informa contato de emergência.
2. Entre como idoso, abra **Cuidados → Vínculos**, gere o código e compartilhe-o somente com um cuidador de confiança.
3. Entre como cuidador e informe o código. O compartilhamento é a autorização explícita: o código conclui um vínculo, uma única vez, em até 10 minutos.
4. Selecione o idoso no painel. Cadastre medicamentos com vários horários e período de uso, consultas e contatos. A pessoa idosa vê os dados reais e confirma cada dose do dia.
5. Registros de dor aparecem aos cuidadores vinculados, com histórico de intensidade e visualizações identificadas. Remover o vínculo revoga o acesso.

## Testes

A revisão de correções e sua validação estão em [Correções da sprint 2](docs/CORRECOES-SPRINT2.md). Os testes unitários compartilhados rodam em `mobile` com `npm run test:unit`.

Crie um **banco separado** chamado `cuidali_test`, conceda acesso ao usuário e configure as variáveis nesse terminal. O teste apaga dados desse banco e recusa nomes sem sufixo `_test`.

```sh
cd backend
DB_NAME=cuidali_test php migrate.php
DB_NAME=cuidali_test php -S 127.0.0.1:8001 -t public public/index.php
# Em outro terminal, com as mesmas configurações DB_*:
DB_NAME=cuidali_test TEST_ALLOW_RESET=1 php tests/integration.php
```

No PowerShell, use `$env:DB_NAME='cuidali_test'` e `$env:TEST_ALLOW_RESET='1'` antes dos comandos PHP. Retire essas variáveis após testar. Nunca aponte testes para dados reais.

Teste da interface com API/banco reais (cria contas fictícias e registros no banco configurado pela API):

```sh
# API de testes ativa em 8001, banco cuidali_test, CORS localhost:8081.
cd mobile
# .env com EXPO_PUBLIC_API_URL=http://127.0.0.1:8001 para teste web local.
npm run export:web
python -m http.server 8081 --directory dist
# Outro terminal, em mobile:
npx playwright install chromium
E2E_API_URL=http://127.0.0.1:8001 npm run test:e2e
# Alternativa Linux se Chromium já estiver instalado:
CHROMIUM_PATH=/usr/bin/chromium E2E_API_URL=http://127.0.0.1:8001 npm run test:e2e
```

Use `E2E_WEB_URL` e `E2E_API_URL` para portas diferentes; a URL embutida no bundle também deve ser atualizada. Os testes E2E verificam cadastro, campos obrigatórios, estado vazio, vinculação, criação de medicamento, dose, dor e leitura pelo cuidador, além de falha de rede. São testes no navegador, não em dispositivo físico.

Veja [API e permissões](docs/API.md), [modelo de dados](docs/MODELO.md) e [entrega e validação](docs/ENTREGA.md).

## Ambiente Codex usado nesta entrega

No Debian 13 sem instalação global de pacotes, `bash scripts/cloud-install.sh` prepara ferramentas em `/workspace/cuidali-tools`, valida assinaturas/checksums pelo APT, mantém o banco em `/workspace/cuidali-tools/data` e instala dependências com `npm ci`. Não altera o PHP global. Executa com PHP 8.4, compatível com o mínimo 8.2 do projeto.

Em terminais separados:

```sh
bash scripts/cloud-start.sh api
bash scripts/cloud-start.sh mobile
# Apenas para a suíte HTTP:
bash scripts/cloud-start.sh test-api
DB_PORT=3307 DB_USER=cuidali DB_NAME=cuidali_test TEST_ALLOW_RESET=1 \
  /workspace/cuidali-tools/bin/php backend/tests/integration.php
```

O helper usa contas de banco sem senha **somente no ambiente acadêmico isolado**, ligado a 127.0.0.1:3307, com dados fictícios. Não execute esse helper em servidor compartilhado ou produção. Para outros ambientes e senhas, siga a instalação padrão acima. Não crie worktree para uso normal: cada tarefa cloud já é isolada. Os dados/dependências podem permanecer no snapshot; processos MariaDB, API e Metro precisam ser reiniciados. O Metro cloud usa `--localhost`; conexão de celular físico requer um host alcançável e o procedimento de rede descrito acima.
