# Assets oficiais da marca

| Arquivo            | Usado em                                                  |
| ------------------ | --------------------------------------------------------- |
| `logo-petvila.svg` | Header, Footer, páginas internas (cor herdada do `tone`)  |
| `caixas-petvila.svg` | Hero: as duas caixas empilhadas, como no print da embalagem |
| `caixa-frente.svg` | O Club: frente da caixa com a frase "Todo mês, uma nova surpresa para seu pet!" |
| `cao-petvila.svg`  | Primeiros da Vila: o cão em traço da caixa (cor herdada do `color`) |

O logo atual foi vetorizado do print do brand book. Ao receber o vetor oficial,
substitua o arquivo mantendo um único `<path>` (ou vários) com `fill="currentColor"`
e rode `node scripts/brand-icons.mjs` para regenerar favicon e imagem de compartilhamento.

As artes das caixas foram vetorizadas do print da embalagem (06/10/2026): o cão foi
contornado do traço original; "petvila" e "club." reaproveitam o `logo-petvila.svg`; a frase
foi convertida em curvas na Bricolage Grotesque 800 (aproximação da fonte da caixa). Entram na
página pelo componente `BrandArt.astro`. Ao receber os arquivos da embalagem, troque pelos oficiais.

Fotografias e ilustrações: veja `docs/assets.md`.
