# Cuidali

**Assistente Virtual e Plataforma de Cuidado para Idosos**

> Kannali Corp: Conectando gerações, cuidando de vidas.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Sprint](https://img.shields.io/badge/sprint-1%20conclu%C3%ADda-blue)
![Curso](https://img.shields.io/badge/SENAI-4%C2%BA%20Termo%20DS-informational)

---

## Sobre o projeto

O envelhecimento da população, muitas vezes acompanhado de isolamento social, traz desafios crescentes ao cuidado com a saúde e o bem-estar da pessoa idosa. O **Cuidali** é um sistema que integra um **aplicativo mobile acessível** para idosos e um **painel web** para cuidadores e familiares, combinando interação conversacional (voz e texto), lembretes ativos de medicação com confirmação, agendamento de consultas médicas e um botão de emergência SOS.

A proposta é desmistificar a tecnologia para a terceira idade: interface com botões ampliados, alto contraste e navegação mínima, prevenindo erros acidentais e promovendo autonomia.

Projeto desenvolvido como Trabalho de Conclusão do 4º Termo do curso Técnico em Desenvolvimento de Sistemas — SENAI "A. Jacob Lafer", sob metodologia ágil Scrum.

## Equipe — Kannali Corp

| Integrante | Função Scrum / Especialidade |
| --- | --- |
| Pedro de Oliveira | Scrum Master / Backend Engineer |
| Enzo Avanze | Product Owner / Full Stack Developer |
| Isabella Dias da Silva | UI/UX Specialist / Mobile Developer |
| Enzo Yudi Kadooka | Frontend Lead / Mobile Developer |
| Vitor Matheus Canali Pereira | Database Specialist / Backend Developer |
| Evelyn Silva de Lima | QA Engineer / Technical Writer |

## Funcionalidades

**App mobile (idoso)**
- Tela inicial simplificada com lembretes do dia
- Lembrete de medicação com confirmação ("Já tomei" / "Ainda não")
- Lembrete de consultas médicas
- Botão de emergência SOS (toque único, aciona contato de confiança)
- Assistente conversacional por voz e texto

**Painel web (familiar / cuidador)**
- Cadastro do idoso, medicamentos, horários e consultas
- Cadastro de contato(s) de emergência
- Histórico de confirmações de medicação e alertas de SOS
- Alerta de inatividade (idoso sem interagir com o app por período prolongado)

## Diferenciais

- **Confirmação ativa** — o app conversa com o idoso e pede confirmação, em vez de apenas disparar uma notificação estática
- **Alerta de inatividade** — detecta longos períodos sem uso e avisa o familiar
- **Acessibilidade real** — tipografia grande (18–28px), alto contraste, áreas de toque de no mínimo 56px, seguindo diretrizes WCAG 2.1

## Identidade visual

| Cor | Hex | Uso |
| --- | --- | --- |
| Azul Institucional | `#1A365D` | Cabeçalhos, navegação, títulos |
| Azul Acolhedor | `#2B6CB0` | Botões primários, ícones, estados ativos |
| Vermelho SOS | `#E53E3E` | Botão de emergência e alertas urgentes |
| Verde Sucesso | `#38A169` | Confirmação de medicação, status positivo |
| Fundo Neutro | `#F7FAFC` | Fundo de tela, alta legibilidade |

Tipografia: famílias sem serifa (Inter, Roboto), priorizando legibilidade para o público idoso.

## Modelagem de dados

Modelagem completa disponível em [`/docs`](./docs):
- **MER** — modelo conceitual (entidades e relacionamentos)
- **DER** — modelo detalhado (atributos, chaves primárias/estrangeiras, tipos de dados)
- **Dicionário de Dados** — especificação completa de todas as entidades

Entidades principais: `Idoso`, `Familiar_Cuidador`, `Medicamento`, `Confirmacao`, `Consulta`, `Contato_Emergencia`, `Alerta_Emergencia`, `Historico_Interacao`.

## Protótipo

Protótipo de alta fidelidade desenvolvido no Figma, cobrindo o fluxo completo: seleção de perfil → cadastro → login/biometria → tela inicial → lembrete de remédio → lembrete de consulta → SOS → assistente conversacional.

🔗 Link do protótipo: https://www.figma.com/design/LlvM0OKdhtX7vr7LzgoKRS/Untitled?node-id=0-1&p=f&t=Gvd4CPKAeHMS5v0W-0

## Roadmap (Sprints)

| Sprint | Objetivo | Entregáveis |
| --- | --- | --- |
| **Sprint 1** ✅ | Levantamento de requisitos, modelagem conceitual/lógica (MER/DER), dicionário de dados, protótipo de alta fidelidade | Documento de requisitos, MER, DER, dicionário de dados, protótipo Figma |
| **Sprint 2** 🔄 | Desenvolvimento da API REST, estrutura do banco de dados, telas iniciais do mobile | Banco de dados criado, rotas da API, telas de autenticação/home |
| **Sprint 3** ⏳ | Integração SOS, assistente de voz, testes de acessibilidade/usabilidade, documentação técnica ABNT | Sistema funcional completo, relatório de testes, apresentação final |

## Tecnologias

> Stack em definição pela equipe — atualizar conforme decisões técnicas forem fechadas.

- **Mobile:** a definir (ex.: React Native/Expo)
- **Web:** a definir
- **Backend:** API REST
- **Banco de dados:** relacional (MySQL)

## Status do projeto

🚧 Em desenvolvimento — Sprint 1 concluída.

## Contexto acadêmico

Projeto desenvolvido para fins educacionais como parte do Trabalho de Conclusão do curso Técnico em Desenvolvimento de Sistemas, SENAI "A. Jacob Lafer" — Santo André, 2026.
