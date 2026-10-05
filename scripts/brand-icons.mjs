// Gera favicon, apple-touch-icon e og-image a partir do logo oficial (src/assets/brand/logo-petvila.svg).
// O ícone usa o "p" do próprio logo, recortado; trocar pelo símbolo oficial se o brand book tiver um.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const logo = readFileSync('src/assets/brand/logo-petvila.svg', 'utf8');
const d = logo.match(/ d="([^"]+)"/)[1];
const [vx, vy, vw, vh] = logo.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);

const icon = (fg, bg, rx = 14) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="${rx}" fill="${bg}"/>
<clipPath id="c"><rect x="80" y="100" width="404" height="700"/></clipPath>
<g transform="translate(13.5 7.5) scale(0.095) translate(-96 -263)"><path clip-path="url(#c)" fill="${fg}" fill-rule="evenodd" d="${d}"/></g>
</svg>`;

writeFileSync('public/favicon.svg', icon('#FFE1BC', '#E25D28') + '\n');
await sharp(Buffer.from(icon('#FFE1BC', '#E25D28', 0))).resize(180).png().toFile('public/apple-touch-icon.png');

// OG 1200x630: logo em Chamego sobre Fucinho, como no painel principal do brand book.
const w = 820, h = (w * vh) / vw;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#301F03"/>
<svg x="${(1200 - w) / 2}" y="${(630 - h) / 2}" width="${w}" height="${h}" viewBox="${vx} ${vy} ${vw} ${vh}"><path fill="#FFE1BC" fill-rule="evenodd" d="${d}"/></svg>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og-image.png');
console.log('ok');
