# E-mails de recuperação do Cuidali

O sistema já inclui cadastro de e-mail, pedido de código, validação, criação de nova senha e revogação das sessões antigas. O envio real depende da ativação de um serviço de e-mail transacional. Nenhuma chave de envio acompanha o código-fonte.

## Conectar Brevo

1. Crie uma conta em https://www.brevo.com/ e conclua a confirmação da conta e a ativação do envio transacional.
2. Cadastre o remetente Cuidali com o e-mail kannalicorp@gmail.com e confirme o e-mail recebido pelo provedor. O provedor pode exigir validações adicionais e substituir o domínio de um remetente Gmail; um domínio próprio autenticado é a opção recomendada para a identidade definitiva.
3. Crie uma chave **API**, diferente da chave SMTP.
4. No Railway, abra o projeto Cuidali → serviço Cuidali → Variables e configure:

```text
MAIL_FROM=kannalicorp@gmail.com
MAIL_FROM_NAME=Cuidali
BREVO_API_KEY=<chave privada da sua conta Brevo>
```

5. Aplique a atualização no Railway. Nunca coloque a chave no aplicativo, no repositório ou em documentos públicos.
6. No Cuidali, cadastre seu e-mail em Meus dados. Saia, abra Esqueci minha senha e solicite o código. Confira a caixa de entrada e a pasta de spam. O código expira em 10 minutos e aceita no máximo cinco tentativas.
7. Após redefinir a senha, confirme que a senha antiga deixou de funcionar e que os aparelhos com a sessão antiga precisam entrar novamente.

## Alternativa: Resend

Verifique um domínio de envio no Resend. Configure `RESEND_API_KEY` e `MAIL_FROM` com o remetente autorizado e deixe `BREVO_API_KEY` vazio. Uma conta restrita a testes não equivale a envio liberado para todos os usuários.

## Estado da validação

O fluxo de recuperação foi testado com um emissor isolado: destinatário cadastrado, código incorreto recusado, uso único, troca de senha e encerramento de sessões antigas. O recebimento de e-mail real permanece pendente até a configuração do provedor.

Referências: [API transacional Brevo](https://developers.brevo.com/docs/send-a-transactional-email), [remetentes e domínios](https://developers.brevo.com/docs/getting-started-with-senders-and-domains), [tratamento de remetentes Gmail](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication).
