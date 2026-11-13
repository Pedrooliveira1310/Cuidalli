# Cuidali — validação da atualização

Data: 13 de novembro de 2026.

A atualização reúne site e APK na mesma aplicação e no mesmo banco. Foi instalada com sucesso no Android conectado. A publicação online ainda não foi executada.

## Alterações

- SOS com registro persistente, aceite identificado do cuidador, conclusão e histórico.
- Inatividade configurável, deduplicação e monitor no servidor.
- Alertas de novos registros de dor.
- Assistente por texto, voz no Android e navegador compatível, leitura de respostas e seleção explícita de dose para confirmação.
- Lembrete ativo com confirmação de medicamento e integração com agenda.
- Sessão web por cookie HttpOnly e armazenamento Android protegido por chave do sistema.
- Correção do empacotamento de arquivos e das janelas de confirmação no Android.
- Remoção de mensagens sobre recursos previstos para futuras sprints das telas do aplicativo.
- Configuração de URL de produção no processo de geração do APK, sem configuração manual para o usuário final.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Integração existente da API e MySQL | 129 verificações aprovadas |
| SOS, aceite, permissões, inatividade e assistente | 43 verificações aprovadas |
| Testes unitários do cliente | 7 testes aprovados |
| Fluxos e regressões no Chrome | 14 testes aprovados |
| Tipagem TypeScript | Aprovada |
| Assinatura e alinhamento do APK | Aprovados |
| Instalação da atualização no celular | Sucesso |
| Entrada, voz, discador e retorno ao aplicativo | Confirmados pelo usuário no celular |
| Agenda com data, horário e local | Confirmada pelo usuário no celular |
| Recebimento de SOS pelo cuidador vinculado | Confirmado pelo usuário |
| Notificações com aplicativo fechado em produção | Ainda não validadas |
| Implantação Docker e HTTPS | Arquivos preparados; Docker indisponível neste computador para executar a composição |
| Publicação e acesso fora do computador | Não executados; hospedagem ainda não conectada |

O fluxo integrado do navegador confirmou cadastro, login, vínculos, medicamentos, dor, consultas, contato principal, SOS, aceite sincronizado do cuidador e manutenção da sessão ao recarregar. Os testes de proteção cobrem vínculos revogados, acesso indevido, sessão expirada, conexão indisponível e preservação do histórico.

## Condições para liberar a publicação

1. Conectar a hospedagem e configurar o banco persistente, HTTPS e endereço definitivo.
2. Conectar o projeto de notificações e substituir o acompanhamento de validação por push de produção, incluindo entrega com app fechado.
3. Validar a entrega dos avisos com o aplicativo fechado no ambiente publicado. Os testes locais de voz, discador, retorno ao aplicativo, agenda e SOS ao cuidador já foram confirmados pelo usuário.
4. Gerar o APK com o endereço definitivo e validar novamente o acesso fora da rede local.

O APK atual usa acompanhamento Android por serviço visível e consulta periódica. Esse mecanismo permite validar os fluxos, mas tem restrições de execução em versões recentes do Android e não é substituto de push de produção. O navegador atual recebe avisos com a página aberta. O pacote não deve ser apresentado como se a entrega de avisos com tudo fechado já estivesse validada.

Referências técnicas: [limites dos serviços Android](https://developer.android.com/develop/background-work/services/fgs/timeout) e [alvo de API para publicação no Google Play](https://developer.android.com/google/play/requirements/target-sdk).
