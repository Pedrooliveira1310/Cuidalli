# Cuidali

Aplicação de cuidado compartilhado para pessoas idosas e seus cuidadores. Site e APK usam a mesma interface React Native Web e a mesma API PHP com MySQL. O vínculo por código autoriza o compartilhamento de dados com múltiplos cuidadores.

Site publicado: https://cuidali-production.up.railway.app

## Recursos

- Cadastro e acesso por telefone e senha, com perfis de pessoa idosa e cuidador.
- Vínculos por código temporário e revogável.
- Medicamentos com vários horários, período de uso e histórico preservado após desativação.
- Consultas, contatos e escolha do contato principal.
- Registro de dor com mapa corporal, intensidade e confirmação de visualização.
- SOS persistente com acompanhamento e conclusão pelo cuidador, além de ligação pelo discador.
- Monitor de atividade com limite configurável e deduplicação de alertas.
- Assistente por texto e voz, consulta de dados e confirmação explícita da dose selecionada.
- Lembretes ativos, integração com agenda e site instalável.

## Desenvolvimento

Requer PHP 8.2+, MySQL 8 ou MariaDB, Node compatível com `mobile/package.json`. Copie `backend/.env.example` para `backend/.env` e preencha as variáveis de banco. Execute `php backend/migrate.php`, `php -S 127.0.0.1:8000 -t backend/public backend/public/index.php` e, em outro processo, `php backend/monitor.php --continuous`.

A interface web compilada está em `backend/web`. Para recompilar, dentro de `mobile`, execute `npm ci`, `npm run typecheck` e `node node_modules/expo/bin/cli export --platform web --output-dir ../backend/web`. Preserve os arquivos de instalação PWA ao reconstruir o HTML.

## Implantação

1. Configure um domínio e um servidor com Docker Compose. Aponte o DNS para o servidor e libere as portas 80 e 443.
2. Copie `.env.example` para `.env`; defina domínio, e-mail administrativo e duas senhas fortes e diferentes para o banco.
3. Execute `docker compose up -d --build`. O serviço app aplica as migrações; o Caddy fornece HTTPS; o monitor verifica inatividade a cada minuto.
4. Verifique `https://SEU-DOMINIO/health` e os fluxos de cadastro, vínculo, cuidados e SOS com contas fictícias.
5. Configure backups do banco, teste a restauração e mantenha a chave de assinatura Android sob controle da equipe.

O pacote também pode ser implantado em hospedagem PHP/MySQL. Sirva apenas `backend/public`, encaminhe as rotas para `index.php`, configure `COOKIE_SECURE=true` e agende `php backend/monitor.php` a cada minuto. Não exponha as pastas de configuração, banco, código ou testes.

No Railway, o Dockerfile serve o app na porta 80. Use MySQL como serviço separado, vincule as variáveis de conexão e execute o monitor como serviço separado. O ambiente está publicado com aplicação, banco e monitor separados.

## APK

Dentro de `mobile`, execute:

```powershell
.\android-package\build-apk.ps1 -Sdk 'CAMINHO-DO-SDK' -Java 'CAMINHO-DO-JDK' -ServerUrl 'https://SEU-DOMINIO' -OutputPath 'C:\entrega\Cuidali.apk'
```

Com `ServerUrl`, o APK abre direto no serviço e oculta a configuração manual. A geração padrão usa a origem pública do Cuidali. Use a mesma chave para atualizar a instalação existente. O código-fonte distribuído não inclui a chave.

O alvo Android é API 36. A assinatura é verificada pelo processo de geração. A aprovação de uma loja, a configuração de conta de distribuição e a validação física são etapas separadas.

## Avisos em segundo plano

O Android usa Firebase Cloud Messaging. O navegador usa Firebase Messaging com service worker e requer HTTPS e permissão de notificações. O servidor mantém fila com deduplicação e novas tentativas e verifica sessão e vínculo antes da entrega.

Configure FIREBASE_SERVICE_ACCOUNT_JSON como segredo no servidor e no monitor e APP_PUBLIC_URL com a origem pública. Não publique a chave privada. Para recompilar os scripts web, execute npm ci e node build-rollup.mjs em web-push. Preserve push-client.js e install.js no HTML.

A nova entrega FCM em segundo plano está em validação no aparelho.

## Verificação

- `npm run typecheck` e `npm run test:unit`, em `mobile`.
- `php backend/tests/integration.php`: exige banco exclusivo terminado em `_test`, `TEST_ALLOW_RESET=1` e API correspondente. Apaga os dados desse banco.
- `php backend/tests/release.php`: usa apenas banco terminado em `_test`; verifica SOS, permissões, aceite, inatividade e assistente com contas fictícias.
- Testes de navegador: em `mobile`, defina `E2E_WEB_URL`, `E2E_API_URL` e `CHROMIUM_PATH`, depois execute `npm run test:e2e`.

Não aponte os testes para um banco com dados de usuários. A instalação anterior no telefone já teve cadastro e login confirmados pelo usuário; a atualização atual precisa de validação de discador, áudio, agenda e avisos no aparelho.

## Atualização de interface e conta

O protótipo visual foi aplicado à interface. Pessoas idosas podem cadastrar e editar seus medicamentos e consultas. Meus dados permite editar o perfil e ativar biometria no Android. A recuperação usa e-mail e código de uso único; configure o emissor conforme [CONFIGURAR-EMAIL.md](docs/CONFIGURAR-EMAIL.md). O envio real depende de credenciais do provedor no servidor. Consulte VALIDACAO.md para resultados e limites de verificação.

## Marca e atualização do site

A logo original está em mobile/assets/prototype/logo.png. Os ícones derivados são gerados pelo script scripts/create-brand-icons.ps1, preservando o símbolo original. Após exportar o Expo para web-export, execute node scripts/publish-web.mjs web-export para atualizar o site preservando favicon, manifesto e notificações.
