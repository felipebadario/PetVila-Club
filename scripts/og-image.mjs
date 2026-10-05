// Gera public/og-image.png e public/apple-touch-icon.png PROVISÓRIOS a partir da paleta.
// Substituir pela arte oficial com o logo assim que o brand book estiver disponível.
import sharp from 'sharp';

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#FFE1BC"/>
  <circle cx="1030" cy="150" r="260" fill="#E25D28"/>
  <circle cx="160" cy="520" r="34" fill="#301F03"/>
  <circle cx="760" cy="520" r="70" fill="none" stroke="#562A22" stroke-width="5"/>
  <text x="80" y="140" font-family="Georgia, serif" font-weight="700" font-size="40" fill="#562A22">PetVila Club</text>
  <text x="80" y="300" font-family="Georgia, serif" font-weight="700" font-size="92" fill="#301F03">Cuidado que faz</text>
  <text x="80" y="400" font-family="Georgia, serif" font-weight="700" font-size="92" fill="#301F03">parte da rotina.</text>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og-image.png');

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#FFE1BC"/><circle cx="90" cy="90" r="70" fill="#E25D28"/><circle cx="90" cy="90" r="26" fill="#FFE1BC"/></svg>`;
await sharp(Buffer.from(icon)).png().toFile('public/apple-touch-icon.png');
console.log('ok');
