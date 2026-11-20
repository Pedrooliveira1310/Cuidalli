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

## Roteiro da banca — cerca de 90 segundos

1. **0–15 s · O problema.** Apresente o Cuidali como uma forma de manter a autonomia da pessoa idosa e compartilhar o acompanhamento com alguém de confiança. Abra o [site](https://cuidali-production.up.railway.app/) no Safari ou no navegador do computador.
2. **15–35 s · A rotina de Maria.** Toque em **Testar demonstração**. Mostre uma de duas doses confirmadas, confirme a dose restante e mostre a barra completa.
3. **35–65 s · O pedido e a resposta.** Use o SOS de exemplo e toque em **Ver como Ana**. Mostre que a confirmação aparece no painel dela, abra **Alertas** e assuma o pedido.
4. **65–90 s · O que mudou.** Volte para Maria e aponte o nome de Ana no pedido. Mostre o resumo do cuidador se houver tempo.

O roteiro usa dados fictícios da mesma aba. O teste automatizado da visita guiada verifica o progresso das doses, a troca de perfil, a retomada após recarregar e o nome da cuidadora na resposta de SOS. O fluxo com API e banco de teste está em `mobile/tests/flows.spec.ts`.

Para o ensaio em dois aparelhos, use contas fictícias vinculadas num ambiente de teste com API compartilhada. Para o teste de usabilidade, peça a uma pessoa idosa que encontre e confirme uma dose e a um cuidador que encontre e assuma o alerta. Registre o tempo, se houve ajuda e onde cada pessoa hesitou. Esses resultados dependem das sessões com participantes.

### Imagem da abertura

A foto ilustrativa foi gerada no ImageGen integrado e otimizada para a web em `mobile/assets/brand/cuidado-em-familia.jpg`.

> Use case: photorealistic-natural. Asset type: photo for the opening of Cuidali, a Brazilian family-care web app. Landscape 4:3 editorial photograph of a Brazilian woman in her early seventies and her adult daughter in her forties at a dining table in an understated Brazilian home. The older woman is holding and using her own smartphone while the daughter sits beside her and looks naturally at the same screen; both are relaxed, quietly smiling, with the older woman taking the lead. Morning window light, candid warm atmosphere, restrained blue and cream clothing, soft greenery and a clear uncluttered background. Medium shot, frame both faces and the phone near the middle so the photograph also crops well in a wide mobile strip. Realistic hands and age texture. No writing, interface overlays, readable screen, logos, medical setting, or watermark.
