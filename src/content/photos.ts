/**
 * Fotos PROVISÓRIAS do Unsplash (licença Unsplash: uso comercial livre, sem
 * atribuição obrigatória). Servidas pelo CDN do próprio Unsplash, que entrega
 * WebP/AVIF no tamanho pedido. Trocar pelas fotos reais da PetVila quando
 * existirem: basta mudar o `src` para um import local (ver Photo.astro).
 */
export interface StockPhoto {
  id: string; // trecho depois de images.unsplash.com/photo-
  alt: string;
}

const p = (id: string, alt: string): StockPhoto => ({ id, alt });

export const photos = {
  hero: p('1779049979022-77528c1aa6e3', 'Tutora sorrindo com seu cão no colo, em casa'),
  rotina: {
    comer: p('1767023024653-3d6f74909ccf', 'Buldogue francês comendo na tigela'),
    brincar: p('1723071266996-2da3f7da6f10', 'Tutora brincando com o cão num campo'),
    passear: p('1579365802746-eb22c1496e81', 'Tutora passeando com o cão de coleira no parque'),
    cuidar: p('1787813583412-48f6101e92e3', 'Pessoa escovando um lulu-da-pomerânia branco'),
    junto: p('1773332611573-5e5bfa8e5de5', 'Tutora tricotando no sofá com o cão dormindo ao lado'),
  },
  curadoria: {
    brinquedos: p('1616887446499-27116f0e3b05', 'Golden retriever mordendo uma bolinha'),
    snacks: p('1741942732547-45a0d0c2b99a', 'Cão esperando um petisco'),
    cuidado: p('1632236705239-ac6f4908638d', 'Pessoa escovando os dentes de um cão'),
    utilidades: p('1708062270783-0e9fa7f4c1c1', 'Guia vermelha sobre uma pedra'),
  },
} as const;
