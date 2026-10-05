# PetVila Club · Landing Page de pré-lançamento

Astro 7 + TypeScript, sem biblioteca de animação. Página estática com uma
função serverless (`/api/leads`) para o cadastro "Primeiros da Vila".

Decisões, pendências e diagnóstico de domínio: [`docs/primeira-entrega.md`](docs/primeira-entrega.md).

## Rodar localmente

Requer Node 22.12+.

```sh
npm install
cp .env.example .env
npm run dev        # http://localhost:4321
```

Sem `LEADS_WEBHOOK_URL`, os cadastros feitos em desenvolvimento vão para `.data/leads.jsonl`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (saída em `.vercel/output`) |
| `npm run preview` | Serve o build localmente |
| `npm run check` | Checagem de tipos e de templates |

## Variáveis de ambiente

Veja `.env.example`. Prefixo `PUBLIC_` vai para o navegador; o resto fica só no servidor.
Em produção, configure no painel da hospedagem (nunca no repositório):

- `PUBLIC_APP_ENV=production` (fora disso a página sai com `noindex` e o robots bloqueia tudo)
- `PUBLIC_SITE_URL=https://petvilaclub.com.br`
- `LEADS_WEBHOOK_URL` e, se houver, `LEADS_WEBHOOK_TOKEN`
- `PUBLIC_GA4_ID`, `PUBLIC_META_PIXEL_ID` quando o consentimento de cookies estiver pronto

## Onde mexer

- Copy: `src/content/copy.ts`
- Instagram, contato, razão social: `src/config/site.ts`
- Logo oficial: salve em `src/assets/brand/logo-petvila.svg` (troca automática)
- Cores e fontes: `src/styles/global.css`
- Destino dos leads: `src/lib/leads/store.ts`
- Eventos de tracking: `src/lib/tracking.ts`
- Assets pendentes: procure por `<Placeholder` nos componentes

## Deploy (Vercel)

1. Importe o repositório na Vercel (framework detectado: Astro).
2. Configure as variáveis acima em Production e Preview.
3. Adicione os domínios; os redirects para `https://petvilaclub.com.br` já estão em `vercel.json`.
4. Altere o DNS na GoDaddy conforme a seção 11 do documento de entrega, **preservando os registros de e-mail do `.com`**.
