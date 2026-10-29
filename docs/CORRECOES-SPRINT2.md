# Revisão da sprint 2

Alterações feitas na branch `sprint-2`, sem modificar a main, migrações ou credenciais existentes.

## Correções

- Remover cuidadores preserva o acesso próprio do idoso. Para cuidadores, somente a remoção da pessoa selecionada limpa a seleção.
- Respostas 401/403/404 retiram os dados protegidos, inclusive durante edição. Falhas de conexão preservam a última leitura e oferecem nova tentativa; doses ficam bloqueadas até uma atualização bem-sucedida.
- Saída local imediata, token removido da memória mesmo se o armazenamento seguro falhar, e aviso caso o servidor não consiga revogar a sessão. Escritas no SecureStore são serializadas. Respostas 401 da sessão anterior e conclusões de logout antigas não interferem no login novo. Login/cadastro não levam Authorization antigo.
- Atualização manual das listas, ao retornar ao aplicativo/aba e ao mudar o dia em São Paulo.
- Inputs web específicos, autocomplete, senha visível/oculta, observações multilinha, filtro compartilhado de telefone para digitação e colagem, código hexadecimal maiúsculo de 12 caracteres e limites de comprimento. Dosagem continua livre para texto/unidades.
- De 1 a 24 horários individuais, edição preservada, validação de horários incompletos/duplicados. Teclado numérico nativo com separadores para datas/horas.
- Datas brasileiras e ISO, validação de calendário, nascimento de 1900 até hoje e ordem do tratamento. Consultas interpretadas explicitamente em America/Sao_Paulo e persistidas em UTC. Erros de campos indicados junto ao campo, com borda e foco; trava síncrona impede envios simultâneos e desabilita controles durante salvamento.
- Acesso direto de SOS sem contato para Contatos, ação Usar no SOS, telefones selecionáveis e abertura de discador com tratamento de erro e sem afirmar que uma ligação ocorreu.
- Rolagem reiniciada ao mudar tela/pessoa, Cuidados selecionada nas telas internas, tratamento do Voltar do Android e correspondência peito/costas superiores e abdômen/lombar. Mapa limitado à largura disponível.
- API retorna 409 para editar medicamento desativado/consulta cancelada, com verificação transacional. Limites de texto contam caracteres Unicode; senha mantém limite de 72 bytes. Mensagens usam nomes de campos em português. Autorizações, doses e históricos preservados.

## Validação executada

- `npm run typecheck`: aprovado.
- Sintaxe dos cinco arquivos PHP: aprovada (PHP 8.4.27).
- `npm run test:unit`: 5 testes aprovados; filtro compartilhado, máscaras/datas, sessão antiga, limpeza de memória com falha de armazenamento e discador simulado.
- Integração HTTP: 129 verificações aprovadas com MariaDB real, em banco separado `cuidali_test`. A API foi executada com `APP_TIMEZONE=UTC` para verificar independência do fuso do processo. Inclui limites Unicode/bytes, datas brasileiras, conflitos, autorização, vínculos, horários, doses, consultas, contatos e dores.
- Playwright/Chromium: 13 testes aprovados em viewport 390×844, incluindo mapa em 320×740. O fluxo principal usa API/banco reais para cadastro, login, vínculo, medicamento com dois horários e edição, doses, dor/visualização, consulta/criação/edição/cancelamento, contato/principal e SOS. Os demais testes controlam falhas e respostas de rede, incluindo 401 atrasado após novo login, saída offline, limpeza após revogação, atualização na virada do dia e colagem real pelo clipboard.
- `npm run export:web`: aprovado. HTML e JavaScript foram novamente obtidos do servidor local na porta 8081, confirmando `http://127.0.0.1:8001` como API no bundle; `/health` validou conexão com banco. Essa URL é para o navegador neste ambiente local, não para um celular externo.
- Screenshots em `mobile/test-results`: SOS, mapa a 320 px e telas de dor. Inspeção visual sem transbordamento horizontal.

O banco usado foi criado para testes nesta máquina; os testes destrutivos não apontam para o banco de desenvolvimento. Os E2E também usam a API de testes, sem dados reais. Nenhuma migração nova é necessária. Não foram alteradas senhas ou credenciais existentes.

## Reproduzir

Com as ferramentas e banco preparados conforme o README, inicie a API isolada:

```sh
bash scripts/cloud-start.sh test-api
```

Em outro terminal, execute a integração **somente no banco de testes**:

```sh
DB_PORT=3307 DB_USER=cuidali DB_NAME=cuidali_test TEST_ALLOW_RESET=1 \
  /workspace/cuidali-tools/bin/php backend/tests/integration.php
```

Para o frontend, dentro de `mobile`:

```sh
npm run typecheck
npm run test:unit
EXPO_PUBLIC_API_URL=http://127.0.0.1:8001 npm run export:web
python -m http.server 8081 --directory dist
# Outro terminal, também em mobile:
CHROMIUM_PATH=/usr/bin/chromium E2E_API_URL=http://127.0.0.1:8001 npm run test:e2e
```

Neste ambiente cloud, a exportação também usou `EXPO_NO_TELEMETRY=1`, `EXPO_OFFLINE=1`, `__UNSAFE_EXPO_HOME_DIRECTORY=/workspace/cuidali-tools/expo` e `XDG_CACHE_HOME=/workspace/cuidali-tools/cache`, pois a home global não é gravável. Não altere a URL do bundle sem exportá-lo novamente. Não execute a integração destrutiva enquanto o E2E estiver em andamento.

## Limitações

Não foram executados testes em aparelho físico ou emulador Android/iOS. SecureStore, teclados/máscaras nativos e botão Voltar ainda precisam de verificação no dispositivo. O discador foi testado com simulação de sucesso/erro; navegador não comprova chamada nem disponibilidade de aplicativo de telefone. A exportação web e a viewport móvel não demonstram funcionamento em aparelho físico. Não houve teste nesta revisão com PHP 8.2, MySQL 8 ou Windows/XAMPP.
