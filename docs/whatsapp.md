# Integração WhatsApp (Meta Cloud API)

Fundação da comunicação 1:1 pela API oficial da Meta: opt-in no cadastro dos
Primeiros da Vila, boas-vindas por template aprovado e status de entrega pelo
webhook. Sem grupos, Comunidades, campanhas em massa ou chatbot.

## Arquitetura

Tudo roda nas funções serverless que a LP já usa na Vercel e grava na mesma
planilha Google dos leads (Apps Script). Não há base nova.

```
Formulário (LeadDialog)
  └─ POST /api/leads ─ valida e grava o lead na planilha (com opt-in) ─ responde 201
        └─ depois da resposta (waitUntil): sendWelcome
              ├─ WHATSAPP_ENABLED, opt-in, telefone e configuração
              ├─ welcome_claim na planilha (idempotência, com lock)
              ├─ Graph API: template de boas-vindas
              └─ welcome_record: wamid + "accepted" (ou "failed" + erro)

Meta ─ POST /api/webhooks/whatsapp ─ confere assinatura ─ responde 200
        └─ depois da resposta: welcome_status na planilha, localizando o lead pelo wamid
```

| Arquivo | Papel |
| --- | --- |
| `src/lib/whatsapp/config.ts` | Lê as variáveis de ambiente; diz o que falta para enviar |
| `src/lib/whatsapp/client.ts` | Único ponto que chama a Graph API: autenticação, `sendTemplate`, `sendText`, erros |
| `src/lib/whatsapp/phone.ts` | Telefone para E.164 (`55` + DDD + número) e máscara para logs |
| `src/lib/whatsapp/welcome.ts` | Regras e orquestração das boas-vindas |
| `src/lib/whatsapp/status.ts` | Status possíveis e regra de atualização (espelhada no Code.gs) |
| `src/lib/whatsapp/webhook.ts` | Verificação GET, assinatura e leitura defensiva do POST |
| `src/lib/whatsapp/events.ts` | Aplica os eventos do webhook na base |
| `src/lib/whatsapp/log.ts` | Logs JSON sem token e com telefone mascarado |
| `src/pages/api/webhooks/whatsapp.ts` | Endpoint público do webhook |
| `src/lib/leads/store.ts` | Ações `claimWelcome`, `recordWelcome`, `applyWelcomeStatus` na planilha e no arquivo local |
| `integrations/google-sheets/Code.gs` | Colunas novas e ações `welcome_*` |

## URL de callback (painel da Meta)

```
https://petvilaclub.com.br/api/webhooks/whatsapp
```

Use exatamente o domínio canônico, sem `www` e sem barra no fim: os outros
domínios respondem com redirecionamento, e a Meta não segue redirecionamento.
No campo **Verificar token**, use o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
Assine o campo **messages** do webhook.

Prévias da Vercel com proteção de implantação ativa não são alcançáveis pela Meta;
teste o webhook em produção (com `WHATSAPP_ENABLED=false` não há envio).

## Variáveis de ambiente

Só no painel da Vercel (Production e, se quiser testar, Preview). Nenhuma usa
`PUBLIC_`, então nada chega ao navegador. Placeholders em `.env.example`.

| Variável | Obrigatória para | Observação |
| --- | --- | --- |
| `WHATSAPP_ENABLED` | ligar o envio | `true` liga; qualquer outro valor desliga (padrão) |
| `WHATSAPP_ACCESS_TOKEN` | envio | Token permanente de usuário do sistema |
| `WHATSAPP_PHONE_NUMBER_ID` | envio | ID do número, não o número |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | referência | Lido pela configuração; não usado no envio |
| `WHATSAPP_API_VERSION` | envio | `vNN.N`, a versão exibida no painel do app |
| `WHATSAPP_WELCOME_TEMPLATE_NAME` | boas-vindas | Nome exato do template aprovado |
| `WHATSAPP_WELCOME_TEMPLATE_LANGUAGE` | boas-vindas | Padrão `pt_BR` |
| `WHATSAPP_WELCOME_TEMPLATE_PARAM_NAME` | boas-vindas | Vazio para `{{1}}`; `nome` se o template usar `{{nome}}` |
| `WHATSAPP_VERIFY_TOKEN` | webhook (GET) | Valor escolhido por nós, repetido no painel da Meta |
| `WHATSAPP_APP_SECRET` | webhook (POST) | Chave secreta do app; sem ela os eventos são recebidos e ignorados |

Também continuam necessárias `LEADS_SHEETS_URL` e `LEADS_SHEETS_TOKEN`.

## Ligar e desligar

- `WHATSAPP_ENABLED=false` (ou ausente): o cadastro segue igual, o opt-in é
  gravado e nenhuma chamada à Meta acontece. O webhook continua respondendo.
- `WHATSAPP_ENABLED=true`: novos cadastros com opt-in e telefone válido recebem
  o template. Se faltar alguma variável de envio, o log `welcome.skipped` com
  `reason: misconfigured` diz qual, e nada é enviado.
- Mudou a variável na Vercel, faça um novo deploy para ela valer.
- Ligar não dispara boas-vindas para quem se cadastrou antes: só cadastros novos.

## Opt-in e dados gravados

A última etapa do cadastro tem a caixa, desmarcada por padrão e opcional:
"Aceito receber novidades, lançamentos e comunicações da PetVila Club pelo WhatsApp."
O consentimento geral obrigatório deixou de citar o WhatsApp (versão `2026-10-07`).

Colunas novas na aba **Leads**, depois de "Plano de interesse" (AB em diante):

| Coluna | Conteúdo |
| --- | --- |
| `source` | `lp-primeiros-da-vila` |
| `whatsapp_e164` | `5511912345678` (texto) |
| `whatsapp_opt_in` | `sim` / `não` |
| `whatsapp_opt_in_at` | ISO 8601 (UTC), horário do servidor |
| `whatsapp_opt_in_texto` | Texto exato que a pessoa marcou |
| `welcome_message_id` | wamid retornado pela Meta |
| `welcome_message_status` | `sending`, `accepted`, `sent`, `delivered`, `read`, `failed` |
| `welcome_sent_at`, `welcome_delivered_at`, `welcome_read_at`, `welcome_failed_at` | Carimbo de cada etapa (ISO 8601) |
| `welcome_error_code`, `welcome_error_message` | Código e "título: mensagem (detalhes)" da Meta |

Nenhum token é gravado na planilha.

## Idempotência

Antes de chamar a Meta, o site pede à planilha `welcome_claim` (dentro do lock do
Apps Script). A reserva só acontece se o lead ainda não tem status de boas-vindas
**e** nenhum outro lead com o mesmo número tem boas-vindas em andamento ou
entregue. Assim, refresh, reenvio do formulário, cadastro repetido ou
reprocessamento não geram segunda mensagem. Uma falha (`failed`) libera o número
para um cadastro novo, mas o mesmo lead nunca é reenviado automaticamente.

Se a função cair entre a reserva e a resposta da Meta, o lead fica em `sending`
e não é reenviado; o log mostra o caso.

## Status

- Envio aceito: `accepted` + `welcome_message_id`.
- Webhook: `sent`, `delivered`, `read` gravam o carimbo e só avançam o status;
  evento atrasado só preenche o carimbo. `failed` prevalece e grava o erro.
- Erro no envio (Meta recusou, rede, configuração): `failed` + código e mensagem.
- O webhook pode chegar antes de o wamid estar na planilha; o processamento tenta
  de novo após 3 s e 8 s.
- Mensagens recebidas são só registradas no log (tipo e número mascarado).

## Logs

Uma linha JSON por evento, com `"scope":"whatsapp"` (Vercel > Logs):
`welcome.attempt`, `welcome.accepted` (com `wamid`), `welcome.skipped` (com
`reason`), `welcome.send_error`, `welcome.record_error`, `webhook.verified`,
`webhook.received`, `webhook.status_applied`, `webhook.status_unmatched`,
`webhook.message_received`, `webhook.rejected`, `webhook.ignored`.
Telefones aparecem como `5511*******78`; tokens nunca aparecem.

## Atualizar a planilha (Code.gs)

Obrigatório antes de ligar o envio: a versão anterior não conhece as ações
`welcome_*` e, sem ela, nenhuma mensagem é enviada (log `welcome.claim_error`).

1. Abra a planilha > Extensões > Apps Script.
2. Substitua o conteúdo de `Code.gs` por `integrations/google-sheets/Code.gs` e salve.
3. Implantar > Gerenciar implantações > editar a implantação atual > Versão: Nova versão > Implantar.
   A URL `/exec` continua a mesma.

As colunas novas aparecem sozinhas no primeiro cadastro depois disso.

## O que ainda depende da Meta

1. Conta do WhatsApp Business verificada e número registrado na Cloud API.
2. Usuário do sistema com token permanente (permissões `whatsapp_business_messaging`
   e `whatsapp_business_management`) em `WHATSAPP_ACCESS_TOKEN`.
3. `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_VERSION`
   e `WHATSAPP_APP_SECRET` copiados do painel.
4. Webhook: URL de callback acima, `WHATSAPP_VERIFY_TOKEN`, assinatura do campo `messages`.
5. Template de boas-vindas criado e aprovado em `pt_BR`, com uma variável para o
   primeiro nome. Texto proposto:

   > Oi, {{1}}! 🐾
   >
   > Que bom ter você por aqui.
   >
   > Seu cadastro nos Primeiros da Vila foi confirmado e, a partir de agora, você vai receber por aqui as principais novidades da PetVila Club.
   >
   > Estamos construindo um novo jeito de cuidar de quem faz parte da nossa rotina todos os dias.
   >
   > Bem-vindo à Vila. 🧡

   Se o template for criado com variável nomeada (`{{nome}}`), defina
   `WHATSAPP_WELCOME_TEMPLATE_PARAM_NAME=nome`. A categoria (Marketing ou
   Utilidade) é definida pela Meta na aprovação e afeta o custo por mensagem.
6. Forma de pagamento na conta do WhatsApp Business.
7. Code.gs atualizado (acima) e só então `WHATSAPP_ENABLED=true`.
