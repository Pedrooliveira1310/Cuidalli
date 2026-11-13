# Cuidali — atualização de interface e conta

13 de novembro de 2026.

## Alterações

- Identidade visual baseada no protótipo Figma, com logo e ícones originais, cores azul e dourado, letras legíveis e controles grandes.
- Seta superior para voltar e navegação Idoso com ícone do protótipo.
- Edição de nome, nascimento, telefone e e-mail; alterações de contato exigem a senha atual.
- Cadastro e edição de medicamentos e consultas pelo próprio idoso, mantendo autorização por titular e vínculo.
- Recuperação de senha por e-mail, código de uso único com expiração e limite de tentativas; sessões anteriores revogadas após troca.
- Biometria Android protegida por chave do sistema e confirmação do usuário. Ative em Meus dados após entrar com senha.
- Termos e Política de Privacidade com contato kannalicorp@gmail.com.
- Textos de presença e dores simplificados e atualização de registros com ação explícita.
- Assistente sem título repetido e sem confundir programação de TV com hora atual.

## Validação

- API existente: 129 verificações aprovadas.
- Cuidados e assistente: 43 verificações aprovadas.
- Push e autorização: 18 verificações aprovadas.
- Conta, medicamentos do idoso, intenção de horário e recuperação: 24 verificações aprovadas.
- Navegador: 14 regressões existentes e 2 novos fluxos validados (uma expectativa de rótulo e uma seta superior foram corrigidas durante a revisão).
- TypeScript e 7 testes unitários aprovados.
- Compilação Android final de release com biometria, integridade dos arquivos e assinatura aprovadas. APK 1.1.0 (versão interna 6).
- No endereço público: 5 fluxos reais aprovados. O fluxo completo de cuidados foi repetido com limite de 180 segundos para acomodar a conexão remota e passou em cerca de 1 minuto.

## Dependências finais

O usuário solicitou preparar a configuração de e-mail. O código e as telas estão prontos; o envio real depende de conectar uma conta de e-mail transacional conforme Configurar-email-Cuidali.md. Não foi confirmado recebimento real de e-mail nesta atualização.

A ativação da biometria e a entrada na mesma conta após reabrir o aplicativo foram confirmadas pelo usuário, usando a digital do proprietário e sem digitar a senha. Teste físico de biometria aprovado; o APK 1.1.0 foi instalado com sucesso no celular, sem erros observados na inicialização. O envio FCM da versão anterior foi confirmado pelo usuário.

## Rodada complementar de testes

- Seis fluxos reais do site publicado aprovados: cuidados completos e vínculo, falha de conexão, interpretação do assistente, alteração protegida de telefone/e-mail, recuperação e privacidade na interface, cadastro e edição pelo idoso.
- Alterações de telefone/e-mail recusadas com senha incorreta e persistentes após nova entrada com a senha correta. O telefone antigo deixou de permitir entrada após a alteração.
- Perguntas sobre novela e horário atual distinguidas; perguntas sobre consultas encaminhadas à agenda.
- Código de recuperação expirado recusado; após cinco tentativas incorretas, o código permanece bloqueado mesmo com o valor correto. As tentativas não alteram a senha vigente.
- Envio real de e-mail não testado: depende do provedor, conforme configuração preparada.
- Verificação adicional publicada aprovada: botão Estou bem hoje, atualização efetiva de dores, novo texto do mapa e respostas do assistente.

## Identidade e interface — versão 1.2.0

- Logo original aplicada ao ícone Android, com recursos adaptativos e tamanhos para aparelhos anteriores.
- Favicon PNG, ícone de toque Apple e ícones PWA de 192 e 512 pixels, incluindo variante maskable. O HTML referencia os novos arquivos com versão de cache.
- Página inicial com cabeçalho de marca, resumo do dia, progresso real das doses e cartões com ícone, horário e estado.
- Lembretes em uma coluna no celular e duas em telas maiores; menu de cuidados organizado por rotina e conta; navegação com ícones consistentes e destaque da aba selecionada.
- Prévia conferida em 320, 390 e 1280 pixels; os ícones web foram carregados e tiveram dimensões verificadas.
