# Entrega da sprint 2

## Implementado

- Aplicativo Expo/TypeScript com seleção de perfil, cadastro, login, sessão segura no Android/iOS e saída.
- API PHP OO/PDO com banco relacional persistente, validação, hashes de senha/token/código, expiração, revogação, limites de tentativas e CORS configurável.
- Vinculação muitos-para-muitos por código de uso único, temporário e revogável; seleção de pessoa idosa e remoção de vínculo.
- Homes com dados reais, doses do dia, consultas do dia e última atividade efetiva do idoso. Ausência de dados não significa “tudo tranquilo”.
- CRUD de medicamentos (desativação), múltiplos horários e período de uso; confirmação única por dose/data, com pending que pode virar taken e histórico para o cuidador.
- CRUD de consultas (cancelamento), locais e detalhes. Lista mantém canceladas identificadas; home exibe apenas consultas do dia não canceladas. Consultas futuras ficam na lista completa, com data e hora.
- CRUD de contatos por idoso/cuidador vinculado e escolha do principal do SOS.
- Dor com mapa frente/costas e alternativa textual acessível, lado anatômico explícito, tipo, intensidade, início e observação. Histórico, evolução dos últimos sete registros e visualização identificada por cuidador.
- SOS abre discador e explica sua limitação; assistente com atalhos determinísticos para remédios, consultas, data e SOS.
- Campos rotulados, ações de pelo menos 56 px, texto ampliável, rolagem, tratamento de teclado, confirmações destrutivas, bloqueio durante salvamento e mensagens de carregamento/erro/vazio.

Referências: DOCX original e imagens exportadas fornecidas pelo usuário, incluindo fluxos do idoso, cuidador e relógio. O link Figma ficou bloqueado pelo proxy (403), então a inspeção visual foi feita nas imagens. O logotipo original não estava disponível como arquivo isolado no repositório; não foi substituído por marca inventada. A seleção de dor mantém o mapa e oferece nomes de regiões para não depender apenas de posição/cor. Escala numérica 1–10 concilia a intensidade do painel do cuidador com a seleção do idoso.

## Validação executada nesta entrega

Ambiente Linux, Node 24, **PHP 8.4.27** e **MariaDB 11.8.6**. Código escrito para PHP 8.2+, mas PHP 8.2 não foi executado neste ambiente.

- Migração aplicada em bancos separados de desenvolvimento e teste; segunda execução sem reaplicar versões.
- Lint PHP e typecheck TypeScript aprovados.
- Compilação Expo web e exportação dos bundles Hermes Android/iOS aprovadas. Exportar bundle não gera APK/IPA nem comprova execução no dispositivo.
- Metro iniciado e manifesto Android do Cuidali obtido por HTTP; API reiniciada pelo helper e dados fictícios dos E2E mantidos no MariaDB (contas, vínculo, medicamento, confirmação e dor).
- **115 verificações de integração HTTP** em `backend/tests/integration.php`, usando MariaDB real: cadastro/login dos perfis, telefone duplicado, data inválida, login inválido, identificação da sessão, sessão expirada, logout, limites de tentativas, códigos válido/inválido/expirado/revogado/consumido/substituído, múltiplos vínculos, autorização/IDs trocados, CRUD, unicidade de dose, pending → taken sem regressão, consulta em UTC, contato principal, dor e visualização única, histórico após desativação e perda de acesso após desvinculação.
- **2 testes E2E Chromium** em `mobile/tests/flows.spec.ts`, com viewport 390×844: cadastro do idoso, obrigatoriedade dos campos, login, listas vazias, vínculo com cuidador, medicamento de dois horários, confirmação pendente/depois tomada, dor real exibida ao cuidador e marcação como visto; teste separado aborta a conexão e verifica erro/reabilitação do formulário.
- Dados dos testes são fictícios. Nenhum seed ou credencial de demonstração é necessário; crie contas pelo cadastro. Os E2E deixam seus próprios registros fictícios no banco de desenvolvimento. Testes de integração limpam somente o banco com sufixo `_test`, mediante confirmação por variável.

## Limitações e sprint 3

Não foram executados testes em celular físico, emulador Android/iOS, Windows/XAMPP ou PHP 8.2. SecureStore está integrado e compila, mas sua persistência nativa precisa ser verificada no dispositivo. A compilação web e os E2E não demonstram funcionamento nativo. Não foram verificados leitor de tela, teclado nativo ou discador em telefone; o aplicativo trata falha ao abri-lo.

Sprint 3: aplicativo do relógio, notificações remotas SOS, entrega/aceite de emergências, monitoramento de inatividade, assistente conversacional com IA/voz, integração real com agenda, recuperação de senha e biometria caso aprovadas. Esses recursos não aparecem como prontos. Não há aviso automático ao cuidador ao registrar dor: os dados ficam disponíveis ao abrir/atualizar o painel.

Antes de uso com dados reais de saúde: validação no dispositivo, testes de usabilidade com idosos, revisão de segurança/LGPD e políticas de consentimento, retenção, auditoria e backup. Esta entrega é uma aplicação acadêmica de desenvolvimento.
