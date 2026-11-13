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
- Conta, medicamentos do idoso, intenção de horário e recuperação: 16 verificações aprovadas.
- Navegador: 14 regressões existentes e 2 novos fluxos validados (uma expectativa de rótulo e uma seta superior foram corrigidas durante a revisão).
- TypeScript e 7 testes unitários aprovados.
- Compilação Android final de release com biometria, integridade dos arquivos e assinatura aprovadas. APK 1.1.0 (versão interna 6).
- No endereço público: 5 fluxos reais aprovados. O fluxo completo de cuidados foi repetido com limite de 180 segundos para acomodar a conexão remota e passou em cerca de 1 minuto.

## Dependências finais

O usuário solicitou preparar a configuração de e-mail. O código e as telas estão prontos; o envio real depende de conectar uma conta de e-mail transacional conforme Configurar-email-Cuidali.md. Não foi confirmado recebimento real de e-mail nesta atualização.

A nova biometria ainda precisa de confirmação física no aparelho; a instalação da atualização aguarda reconexão USB. O envio FCM da versão anterior foi confirmado pelo usuário.
