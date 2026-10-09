# PetVila Club · Landing Page de pré-lançamento — Primeira entrega

Data: 05/10/2026 · Status: v0.2 funcional. Fotos provisórias do Unsplash, cadastro ligado a planilha Google, CRM em `/crm`. Logo, fontes e ilustrações ainda aguardam o brand book.

## 1. Brand book

**O arquivo de identidade visual não chegou ao projeto.** A pasta de arquivos estava vazia e a mensagem não tinha anexo. Por isso esta versão usa só o que o briefing define:

- Paleta oficial (sem alteração de valores): Patinha `#E25D28`, Chamego `#FFE1BC`, Terra `#562A22`, Fucinho `#301F03`.
- Personalidade: casual, divertida, artesanal, afetiva, familiar. Creator + Caregiver.
- Logo: **não foi recriado nem redesenhado**. Há um espaço reservado marcado "logo oficial" no header, no footer e na página 404. Ao salvar `src/assets/brand/logo-petvila.svg` (e `logo-petvila-claro.svg` para fundos escuros), o componente `Logo` passa a usar o arquivo oficial automaticamente.
- Logo: vetorizado do print enviado pelo Felipe em 05/10/2026 (`src/assets/brand/logo-petvila.svg`, cor via `currentColor`). Substituir pelo vetor oficial quando chegar; favicon, apple-touch-icon e og-image são regenerados com `node scripts/brand-icons.mjs`.
- Tipografia: **aproximação** do alfabeto enviado (grotesca larga e pesada com versões Display e Text) usando Bricolage Grotesque (OFL), pois o nome da fonte não veio no print. Trocar pelos arquivos oficiais em `src/styles/global.css` (`--font-display`, `--font-body`).
- Elementos gráficos do Hero, Manifesto e Primeiros da Vila são formas neutras (círculos, blob, traço) **provisórias**, só para validar composição e movimento. Devem ser substituídos pelas ilustrações oficiais.

Quando o brand book chegar, a revisão é: logo, fontes, ilustrações, padrões/texturas e qualquer regra de uso (área de respiro, combinações de cor proibidas, tamanho mínimo).

### Contraste da paleta (WCAG)

| Combinação | Razão | Uso permitido |
| --- | --- | --- |
| Fucinho sobre Chamego | 12,7 | Qualquer texto |
| Terra sobre Chamego / Chamego sobre Terra | 9,6 | Qualquer texto |
| Fucinho sobre Patinha | 4,4 | Só texto grande ou negrito ≥ 18,7px |
| Patinha sobre Terra | 3,3 | Só títulos grandes |
| Patinha sobre Chamego | 2,9 | **Só decorativo**, nunca texto |

Por isso o CTA é Fucinho com texto Chamego, e o laranja aparece em formas, sublinhados e no botão de seta.

## 2. Referência descomplica.church

O ambiente de desenvolvimento não conseguiu abrir o site (a rede bloqueou o acesso), então **não analisei a referência diretamente**. A estratégia de interação foi construída a partir da lista de comportamentos do briefing (hover, cursor, parallax leve, scroll storytelling, CTA magnético, revelação progressiva). Se quiser, mande prints ou um vídeo curto da referência e eu ajusto o nível de movimento.

## 3. Arquitetura técnica

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Framework | **Astro 7** | Gera HTML estático (ótimo para SEO e Core Web Vitals), zero JS por padrão, componentes `.astro` simples de manter. |
| Interatividade | **TypeScript puro, sem biblioteca de animação** | Os efeitos pedidos são resolvidos com CSS (transições, keyframes) + `IntersectionObserver` + um único loop `requestAnimationFrame`. Resultado: ~15 KB de JS (≈5 KB gzip) para a página inteira. GSAP/Lenis/Framer seriam 30–80 KB a mais sem ganho real aqui. Se no refinamento quisermos timelines complexas, GSAP (hoje gratuito) é a escolha natural. |
| Smooth scroll | **Não usado** | Scroll "sequestrado" prejudica acessibilidade e sensação nativa no mobile. |
| Fontes | `@fontsource` (self-hosted) | Sem requisição ao Google (melhor para LGPD e performance), `font-display: swap`. |
| Formulário | `<dialog>` nativo + validação compartilhada cliente/servidor | Foco preso, Esc fecha, acessível sem biblioteca. |
| Backend do cadastro | Rota `/api/leads` (função serverless) | Valida, carimba data/hora no servidor e encaminha para um webhook configurável. |
| Hospedagem sugerida | **Vercel** (adapter já configurado) | Deploy contínuo do GitHub, HTTPS automático, domínios e redirects simples, função serverless grátis no volume de uma LP. **Pendente de confirmação.** |

Dependências de produção: `astro`, `@astrojs/vercel` e duas fontes. Nada mais.

## 4. Componentes

| Componente | Papel |
| --- | --- |
| `BaseLayout` | `<head>` com SEO, canonical, Open Graph, JSON-LD, analytics e o liga/desliga de animação antes do primeiro paint. |
| `Header` | Logo, âncoras e CTA compacto. Ganha fundo ao rolar e se esconde ao descer. |
| `Hero` | Headline com entrada palavra por palavra, formas da marca reagindo ao cursor (parallax de profundidade) e ao scroll. |
| `Rotina` | Cinco momentos. Desktop: hover/foco nas palavras troca foto, ilustração e microcopy. Mobile: trilho com palco fixo; o scroll passa pelos momentos e os chips permitem pular. |
| `Curadoria` | "Menos coisas. Mais coisas certas." com sublinhado desenhado. Lista editorial de 4 categorias; no desktop uma imagem segue o cursor e a faixa Patinha sobe no hover. |
| `Club` | Vila Essential e Vila Care como superfícies grandes (Care com mais peso). Blob segue o cursor; selo giratório "Em breve". Sem preço, sem compra. |
| `Manifesto` | Fundo Terra, palavras acendem conforme o scroll; o fecho "Vila" entra no final e o panorama da Vila sobe da base. |
| `PrimeirosDaVila` | Seção de conversão em Patinha. |
| `LeadDialog` | Cadastro em 5 etapas + tela "Bem-vindos à Vila" com o nome do cão. |
| `Footer`, `Logo`, `Placeholder`, `CtaButton`, `Analytics`, `SimplePage` | Apoio. |

## 5. Estrutura de arquivos

```
petvila-lp/
├─ astro.config.mjs        # site canônico, adapter Vercel
├─ vercel.json             # redirects .com/www → .com.br, headers de segurança e cache
├─ .env.example            # variáveis públicas e privadas, separadas
├─ public/                 # favicon, apple-touch-icon, og-image (provisórios)
├─ scripts/                # brand-icons.mjs, build-preview.py
├─ docs/primeira-entrega.md
└─ src/
   ├─ assets/brand/        # coloque aqui o logo oficial (troca automática)
   ├─ config/site.ts       # URL, Instagram, contato, razão social (PENDENTES)
   ├─ content/copy.ts      # toda a copy da página num lugar só
   ├─ styles/global.css    # tokens da marca, tipografia, reveal, reduced motion
   ├─ layouts/BaseLayout.astro
   ├─ components/          # uma seção por arquivo
   ├─ scripts/             # env.ts, motion.ts, sections.ts, lead-form.ts
   ├─ lib/
   │  ├─ tracking.ts       # track() único + captura de UTMs
   │  └─ leads/            # schema.ts (validação), client.ts, store.ts (destino)
   └─ pages/
      ├─ index.astro, 404.astro, privacidade.astro, termos.astro
      ├─ robots.txt.ts, sitemap.xml.ts
      └─ api/leads.ts      # função serverless do cadastro
```

## 6. Estratégia de animação e interação

Princípio: cada movimento comunica algo. O que se move é sempre a marca (formas, sublinhados, selo), nunca o conteúdo "pulando" sem motivo.

- **Só `transform` e `opacity`** são animados (rodam na GPU, não causam reflow). Nenhuma animação depende de bibliotecas.
- **Um único `requestAnimationFrame`** para efeitos ligados ao cursor; efeitos de scroll só calculam quando há scroll.
- **Desktop (mouse):** parallax de profundidade no Hero e na seção de conversão, CTA magnético, ponto-cursor Patinha que cresce sobre elementos clicáveis (não substitui o cursor do sistema), hover que troca o momento da Rotina, imagem que segue o cursor na Curadoria, blob que segue o cursor nos planos.
- **Mobile (touch):** nada depende de hover. A Rotina vira um trilho com palco fixo controlado pelo scroll e chips com estado selecionado; os planos "acendem" quando chegam ao centro da tela; o cadastro abre como folha de baixo para cima.
- **Revelação progressiva:** o conteúdo só fica escondido se o JS confirmou que vai revelá-lo (sem JS, tudo aparece).
- **`prefers-reduced-motion`:** desliga parallax, cursor, magnetismo, rotação do selo e a revelação das palavras do Manifesto; tudo aparece direto.
- **Acessibilidade:** botões reais com `aria-pressed` na Rotina, foco visível em tudo, `<dialog>` com foco preso, mensagens de erro com `aria-live`, alvos de toque ≥ 44px, campos com 18px (evita zoom no iOS).

## 7. Assets do brand book para reaproveitar

Sem o arquivo não consigo listar o que existe nele. O que a página já está preparada para receber:

| Asset | Onde entra |
| --- | --- |
| Logo principal (SVG) e versão para fundo escuro | Header, Footer, 404, OG image, favicon |
| Fontes oficiais (arquivos ou nome no Google Fonts) | Todo o site |
| Ilustrações / elementos gráficos | Hero (2), Rotina (5 selos), Manifesto (panorama da Vila) |
| Padrões e texturas | Fundos de seção (hoje há uma textura de papel genérica) |
| Fotos já produzidas, se houver | Hero, Rotina, Curadoria |

## 8. Assets que ainda precisamos produzir

**Fotos provisórias**: Hero, os 5 momentos da Rotina e as 4 categorias da Curadoria já usam fotos do Unsplash (licença de uso comercial livre), servidas pelo CDN do Unsplash em WebP/AVIF no tamanho certo, com um véu quente da paleta para unificar. Lista e troca em `src/content/photos.ts`. Não consegui gerar imagens com IA neste ambiente; as ilustrações seguem como formas da marca até o brand book.


Cada placeholder na página tem uma etiqueta dizendo exatamente o que vai ali.

| Asset | Qtde | Formato sugerido |
| --- | --- | --- |
| Foto Hero: tutor e cão num momento de rotina | 1 | vertical 3:4, ≥ 1600px no lado maior |
| Fotos dos momentos: comer, brincar, passear, cuidar, estar junto | 5 | 4:3 ou 1:1, mesma direção de luz e cor |
| Ilustrações dos 5 momentos (selos) | 5 | SVG |
| Fotos conceituais da curadoria: brinquedos, snacks, cuidado, utilidades (sem produtos próprios) | 4 | vertical 3:4 |
| Panorama ilustrado "a Vila" | 1 | SVG horizontal |
| OG image com logo | 1 | 1200×630 PNG |
| Favicon e apple-touch-icon a partir do logo | 2 | SVG + PNG 180px |

As fotos entram pelo componente `<Image>` do Astro (gera WebP/AVIF e tamanhos responsivos automaticamente).

## 9. Pendências de negócio (não assumi nada)

1. ~~Destino dos leads~~ **Decidido**: planilha Google + CRM próprio em `/crm` (ver seção 12). Sem a planilha configurada, o formulário em produção responde "indisponível" de propósito para não perder leads em silêncio.
2. ~~Hospedagem~~ **Decidido**: Vercel.
3. ~~Instagram oficial e e-mail de contato~~ **Decidido**: @petvilaclub e contato@petvilaclub.com, em `src/config/site.ts`.
4. ~~Razão social e CNPJ~~ **Decidido**: Pet Vila Club LTDA, CNPJ 69.194.320/0001-26 (rodapé, Política e Termos).
5. **Política de Privacidade e Termos**: redigidos em 06/10/2026 com controlador, operadores e direitos do titular, refletindo o código atual. Falta revisão jurídica. A seção Cookies da Política muda sozinha quando GA4 ou Meta Pixel são ativados.
6. ~~Banner de cookies~~ **Feito**: com `PUBLIC_GA4_ID` ou `PUBLIC_META_PIXEL_ID` definidos em produção, aparece um aviso de cookies; GA4 e Meta Pixel só são baixados depois de "Aceitar". "Recusar" tem o mesmo peso, a escolha vale 12 meses (localStorage `pv_cookie_consent`) e pode ser trocada pelo link "Preferências de cookies" no rodapé e na Política de Privacidade. Revogar apaga os cookies `_ga`/`_fbp` e recarrega a página. A seção Cookies da política ainda entra na revisão jurídica.
7. **Consentimento**: hoje é um único checkbox obrigatório (e-mail + WhatsApp + política). Se quiser WhatsApp opcional separado, é rápido mudar.
8. **Microcopy dos 5 momentos e frase de apoio "Entrar não é comprar nem assinar nada"**: propostas minhas para revisão.
9. **Faixas de idade do cão** (filhote, 1–3, 4–7, 8+), com opção de data de nascimento: confirmar se servem para segmentação.

## 10. Dados do cadastro

Cada lead é gravado com: `id`, `criado_em` (UTC, carimbo do servidor), `nome`, `email`, `whatsapp` (só dígitos), `nome_cao`, `porte`, `idade_faixa`, `nascimento`, `cidade`, `uf`, `interesses[]`, `preferredPlan` (plano de interesse: `essential`, `care` ou `undecided`; vem do botão do card do plano ou, nos demais botões, da pergunta no formulário; vazio nos leads anteriores ao campo), `consentimento`, `consentimento_versao`, `consentimento_texto`, `cta_origem` (qual botão gerou o lead), `utm_source/medium/campaign/content/term`, `referrer`, `landing_page`. Há honeypot anti-spam.

Eventos de tracking já emitidos (para `dataLayer`, GA4 e Meta quando ativos): `cta_click`, `lead_form_open`, `lead_step_complete`, `lead_form_close`, `lead_submit_error`, `generate_lead` (vira `Lead` no Meta), `rotina_moment`, `section_view`, `instagram_click`.

## 11. Deploy e domínios: diagnóstico (nada foi alterado)

Levantado por consulta pública de DNS e RDAP em 05/10/2026.

| Item | petvilaclub.com.br | petvilaclub.com |
| --- | --- | --- |
| Registro | Registro.br (titular não consultado: o RDAP não respondeu daqui) | GoDaddy, registrado em 20/04/2026, expira em 20/04/2027, com travas de transferência/alteração |
| DNS controlado por | **GoDaddy** (`ns29/ns30.domaincontrol.com`) | **GoDaddy** (`ns29/ns30.domaincontrol.com`) |
| Raiz (A) | `15.197.225.128` e `3.33.251.168` (pelo padrão, parking/encaminhamento da GoDaddy; inferido, não confirmado no painel) | `185.158.133.1` (IP que a Lovable usa para domínios customizados; inferido). HTTPS falha no handshake, então hoje não há site válido ali |
| www | CNAME → `petvilaclub.com.br` | A → `185.158.133.1` |
| E-mail | Sem MX | **Microsoft 365 em uso**: MX `petvilaclub-com.mail.protection.outlook.com`, TXT `v=spf1 include:secureserver.net -all`, TXT `NETORGFT21193662.onmicrosoft.com`, CNAME `autodiscover` → `autodiscover.outlook.com` |
| Aplicação hospedada | Nenhuma ainda | Algo apontando para a Lovable, aparentemente inativo |

**Registros que não podem ser tocados**: todos os de e-mail do `.com` (MX, os dois TXT, `autodiscover` e quaisquer outros do Microsoft 365 que existam na zona, como `_sip`, `lyncdiscover`, `enterpriseregistration`).

**Lovable**: Felipe confirmou em 05/10/2026 que nada na Lovable precisa ser mantido; os dois domínios vêm para a Vercel.

### Alterações aprovadas (hospedagem na Vercel)

Os valores finais são os que a Vercel mostrar ao adicionar cada domínio ao projeto; os abaixo são os padrões dela.

| Zona | Registro | Hoje | Passa a ser |
| --- | --- | --- | --- |
| petvilaclub.com.br | A `@` | `15.197.225.128`, `3.33.251.168` | `76.76.21.21` (remover os dois atuais) |
| petvilaclub.com.br | `www` | CNAME → `petvilaclub.com.br` | CNAME → `cname.vercel-dns.com` |
| petvilaclub.com | A `@` | `185.158.133.1` | `76.76.21.21` |
| petvilaclub.com | `www` | A → `185.158.133.1` | CNAME → `cname.vercel-dns.com` (remover o A) |
| petvilaclub.com | MX, TXT, autodiscover | e-mail Microsoft 365 | **sem alteração** |

Além disso, se houver encaminhamento ("Forwarding") ativo no painel da GoDaddy para o `.com.br`, ele precisa ser desligado, senão sobrescreve o registro A.

Na Vercel: `petvilaclub.com.br` como domínio principal; `www.petvilaclub.com.br`, `petvilaclub.com` e `www.petvilaclub.com` como redirect 308 para ele (o `vercel.json` também garante isso). HTTPS é emitido automaticamente.

### Passo a passo do deploy

1. Repositório no GitHub com este código (push feito daqui assim que o repositório existir).
2. Vercel: Add New Project, importar o repositório (Astro é detectado sozinho).
3. Variáveis em Production: `PUBLIC_APP_ENV=production`, `PUBLIC_SITE_URL=https://petvilaclub.com.br`, `LEADS_SHEETS_URL`, `LEADS_SHEETS_TOKEN`, `CRM_PASSWORD`, `CRM_SESSION_SECRET`. Em Preview: as mesmas, com `PUBLIC_APP_ENV=preview`.
4. Vercel > Settings > Domains: adicionar `petvilaclub.com.br` (principal), `www.petvilaclub.com.br`, `petvilaclub.com` e `www.petvilaclub.com` (redirecionando para o principal).
5. GoDaddy > DNS de cada domínio: aplicar a tabela acima com os valores que a Vercel mostrar; desligar "Forwarding" se estiver ativo; **não tocar nos registros de e-mail do `.com`**.
6. Na Lovable, remover o domínio customizado do projeto antigo (evita conflito de verificação).

### Validação depois do deploy

SSL nos 4 hosts, redirect 308 de `.com`, `www.com` e `www.com.br` para `https://petvilaclub.com.br` preservando caminho, `robots.txt` liberado só em produção, `sitemap.xml`, canonical e Open Graph, 404 customizada, envio real do formulário chegando no destino, Lighthouse mobile e animações em produção.

## 12. Leads: planilha Google + CRM

**Planilha (base)**: cada cadastro vira uma linha na aba `Leads`, com todas as colunas da seção 10 mais `status`, `nota` e `atualizado_em`. A ponte é um Apps Script (`integrations/google-sheets/Code.gs`) publicado como App da Web e protegido por um TOKEN. Textos que começam com `=`, `+`, `-` ou `@` são gravados como texto para não virarem fórmula.

Instalação (uma vez, na conta Google da PetVila):
1. Criar a planilha e abrir Extensões > Apps Script.
2. Colar `Code.gs`, salvar.
3. Configurações do projeto > Propriedades do script: `TOKEN` = senha longa aleatória.
4. Implantar > Nova implantação > App da Web; executar como **Eu**, acesso **Qualquer pessoa**. Autorizar.
5. Copiar a URL `/exec` para `LEADS_SHEETS_URL` e o TOKEN para `LEADS_SHEETS_TOKEN` na Vercel.

**CRM (`https://petvilaclub.com.br/crm`)**: tela protegida por senha (`CRM_PASSWORD`, sessão de 12 h em cookie assinado), fora do Google e do sitemap. Mostra:
- totais (cadastros, hoje, últimos 7 dias, sem contato);
- distribuição por porte, interesses, origem (UTM) e estado;
- busca e filtros por status, porte, interesse e estado;
- tabela com link direto para WhatsApp e e-mail, **status editável** (novo, contatado, qualificado, descartado) e **nota** por lead, gravados na própria planilha;
- exportação CSV do que está filtrado.

Os nomes de status são uma proposta; dá para trocar em `store.ts` e `Code.gs`. Quando a operação crescer, a mesma interface `LeadStore` permite trocar a planilha por um CRM dedicado sem mexer no site.
