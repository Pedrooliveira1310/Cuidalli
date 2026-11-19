# Continuidade do TCC Cuidali
Atualizado em 19/11/2026.

## Instrução para o próximo chat
Continue o desenvolvimento e a validação do TCC Cuidali a partir dos arquivos desta pasta. Leia este documento e VALIDACAO.md antes de alterar o projeto. O usuário quer site e APK profissionais e acessíveis para idosos, coerentes com o protótipo, sem mensagens de sprint ou funcionalidades fictícias. Não trate todos os testes históricos como executados neste novo computador.

## Arquivos e versão
- Cuidali-codigo-fonte.zip: código-fonte, backend, interface e empacotamento Android. Extraia para uma pasta e abra essa pasta como projeto no Codex.
- Cuidali.apk: versão 1.2.0, versionCode 7, assinada; foi instalada no celular de teste.
- VALIDACAO.md: verificações executadas e limitações.
- Site: https://cuidali-production.up.railway.app/
- Repositório: Pedrooliveira1310/Cuidalli, branch release/cuidali-unificado.
- Último commit publicado conhecido: 4c1330d363b5d1d5e404540cdbc7d0574fa5753b.

## Estrutura
Backend PHP/MySQL, interface React Native Web/Expo e APK Android com WebView. Site e APK usam o mesmo serviço publicado no Railway. Firebase é usado para notificações. Confira README.md e LEIA-ME.md para configuração. Os caminhos absolutos do computador anterior precisam ser ajustados no computador de casa. Dependências e ferramentas de compilação precisam ser instaladas novamente conforme o ambiente disponível.

## Estado funcional
Cadastro e entrada, vínculo idoso/cuidador, medicamentos e doses, consultas, dores, contatos, SOS e alertas. Edição dos dados da conta; termos e política de privacidade; assistente de voz com intenção de horário corrigida. O usuário confirmou entrada por biometria com digital após reabrir o app e confirmou notificações em testes anteriores.

## Última tarefa concluída
Logo original aplicada ao ícone Android e favicon/PWA. Interface 1.2.0 reorganizada com cabeçalho, resumo do dia, cartões de doses, menus por rotina e conta, textos maiores e botões amplos. Site publicado. Compilação, assinatura do APK e 18 testes de navegador aprovados anteriormente. Em 19/11, a revisão pública confirmou carregamento das imagens, favicon, retorno ao topo ao navegar e ausência de transbordamento em 320px; capturas revisadas também em 390px e 1280px. O script anterior capturava imagens antes da montagem/carregamento; as capturas foram refeitas aguardando esses estados, sem mudança no código do aplicativo.

## Pendências e cuidados
- Envio real de recuperação por e-mail ainda depende de configurar um provedor transacional (Brevo ou Resend). Código e guia preparados; não afirmar que o recebimento de e-mail foi validado.
- Contato público autorizado: kannalicorp@gmail.com.
- Não redefinir banco de produção nem executar testes destrutivos contra o site publicado.
- Configurações secretas, chaves de assinatura e credenciais não estão no ZIP público. Caso precise recompilar uma atualização com a mesma identidade de assinatura, recuperar o armazenamento seguro da chave original; não gerar uma chave substituta sem discutir o impacto.
- Não copiar toda a pasta .codex nem arquivos de autenticação entre computadores para tentar migrar o chat.
- Antes de modificar, verificar o estado atual do repositório e do serviço; não presumir que ficaram inalterados.
