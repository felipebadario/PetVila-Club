/** Toda a copy da página num só lugar, para revisão seção por seção. */

export const cta = {
  primary: 'Quero ser um dos Primeiros da Vila',
  short: 'Quero ser um dos primeiros',
};

export const hero = {
  headline: 'Cuidado que faz parte da rotina.',
  support:
    'Um clube de assinatura mensal para cães. Todo mês, uma nova curadoria para deixar a rotina de vocês mais prática, interessante e cheia de descobertas.',
};

export type MomentId = 'comer' | 'brincar' | 'passear' | 'cuidar' | 'junto';

export const rotina = {
  headline: 'A rotina é onde o cuidado acontece.',
  intro: 'A PetVila não começa quando uma caixa chega. Ela está nos pequenos momentos entre você e seu cão.',
  // Microcopy de cada momento: proposta inicial para revisão.
  moments: [
    { id: 'comer', label: 'Comer', copy: 'A tigela de todo dia, com mais cuidado em cada escolha.' },
    { id: 'brincar', label: 'Brincar', copy: 'Aquele tempo que é só de vocês dois. E que passa rápido.' },
    { id: 'passear', label: 'Passear', copy: 'A rua, o parque, o caminho de sempre que nunca é igual.' },
    { id: 'cuidar', label: 'Cuidar', copy: 'Os gestos pequenos que fazem diferença no dia a dia.' },
    { id: 'junto', label: 'Estar junto', copy: 'O sofá, o fim de tarde, o silêncio bom de ter companhia.' },
  ] satisfies { id: MomentId; label: string; copy: string }[],
};

export const curadoria = {
  headline: ['Menos coisas.', 'Mais coisas certas.'],
  intro:
    'A gente não quer só mandar produtos para a sua casa. Quer escolher o que faz sentido para a rotina de vocês.',
  support:
    'Tudo que entra na Vila passa por uma curadoria pensada para a rotina de quem realmente vive com um cão.',
  categories: [
    { id: 'brinquedos', label: 'Brinquedos', copy: 'Diversão com propósito.' },
    { id: 'snacks', label: 'Snacks', copy: 'Escolhas que fazem sentido.' },
    { id: 'cuidado', label: 'Cuidado', copy: 'Produtos para o dia a dia.' },
    { id: 'utilidades', label: 'Utilidades', copy: 'Soluções para uma rotina mais simples.' },
  ],
};

/**
 * Como funciona o Club. A entrega é sempre mensal; 3, 6 e 12 meses são a
 * duração do ciclo, nunca a frequência. Não prometer benefícios além dos definidos.
 */
export const comoFunciona = {
  headline: 'Como funciona o Club',
  intro:
    'A PetVila é um clube de assinatura mensal para cães. Todo mês, uma nova curadoria de produtos chega para deixar a rotina com seu cão mais prática, interessante e cheia de descobertas.',
  steps: {
    vila: {
      title: 'Escolha sua Vila',
      copy: 'Dois planos, o mesmo cuidado na escolha de cada produto.',
    },
    ciclo: {
      title: 'Escolha seu ciclo',
      copy: 'Assine por 3, 6 ou 12 meses. O ciclo mínimo é de 3 meses.',
    },
    mensal: {
      title: 'Receba todos os meses',
      copy: 'Seja qual for o ciclo, uma nova curadoria PetVila chega para o seu cão todo mês.',
    },
    club: {
      title: 'Faça parte do Club',
      copy: 'Além da curadoria mensal, quem é membro passa a ter condições exclusivas dentro do universo PetVila.',
      link: 'Veja o que muda para membros',
    },
  },
  cycles: [3, 6, 12] as const,
  // {n} = meses do ciclo escolhido. Lido por leitores de tela quando o ciclo muda.
  cycleCaption: '{n} meses de assinatura, {n} curadorias: uma PetVila por mês.',
  cycleUnit: 'meses',
  cycleGroupLabel: 'Duração do ciclo',
  closing: 'Não é uma compra avulsa. É uma experiência que acompanha a rotina de vocês mês após mês.',
};

export const club = {
  headline: 'Existe um jeito PetVila de cuidar.',
  soon: 'Em breve',
  perMonth: 'produtos selecionados todos os meses',
  cycle: 'Assinatura mensal em ciclos de 3, 6 ou 12 meses',
  plans: [
    {
      id: 'essential' as const,
      name: 'Vila Essential',
      tagline: 'O essencial, bem escolhido.',
      copy: 'O essencial para fazer o mês do seu cão ainda melhor.',
      count: 3,
      items: ['1 brinquedo selecionado', '1 snack', '1 produto de cuidado ou higiene'],
      core: false,
    },
    {
      id: 'care' as const,
      name: 'Vila Care',
      tagline: 'A experiência completa PetVila.',
      copy: 'Mais cuidado. Mais descobertas. Mais PetVila.',
      count: 5,
      items: [
        '1 brinquedo premium em destaque',
        '1 brinquedo complementar',
        '1 snack premium',
        '1 snack de descoberta ou funcional',
        '1 produto de cuidado ou higiene',
      ],
      core: true,
      originals: {
        title: 'PetVila Originals',
        copy: 'Acesso antecipado e prioridade em lançamentos de produtos originais PetVila, incluindo edições e disponibilidades limitadas.',
      },
    },
  ],
};

/**
 * PetVila Store + Club. A Store é outra aplicação, aberta a todos; aqui só o conceito.
 * Nada de percentual, valores, frete grátis, cashback ou benefícios não definidos.
 */
export const store = {
  headline: ['A loja é para todos.', 'O Club é para quem quer viver mais da PetVila.'],
  intro:
    'Em breve, a PetVila Store abre para todo mundo, assinante ou não. Quem faz parte do Club entra nela com vantagens de membro.',
  items: [
    {
      id: 'store',
      title: 'PetVila Store',
      copy: 'Aberta para todos, com produtos escolhidos pelo mesmo olhar da curadoria.',
    },
    {
      id: 'membro',
      title: 'Preço de membro',
      copy: 'Preços e condições especiais para membros em produtos selecionados. As condições podem variar conforme o produto e o plano.',
    },
    {
      id: 'originals',
      title: 'PetVila Originals',
      copy: 'Os produtos próprios da PetVila, com vantagens para membros. No Vila Care, acesso antecipado e prioridade nos lançamentos.',
    },
  ],
  note: 'A Store e as assinaturas ainda não estão abertas. Por enquanto, por aqui, dá para entrar nos Primeiros da Vila.',
};

export const manifesto = {
  lines: ['Cães não são parte da nossa rotina.', 'Eles fazem parte da nossa vida.'],
  closing: 'Por isso criamos uma Vila inteira pensando neles.',
};

export const primeiros = {
  headline: ['A Vila ainda nem abriu.', 'Mas você já pode entrar.'],
  sub: 'Seja um dos Primeiros da Vila.',
  copy:
    'Estamos preparando o lançamento da PetVila Club. Faça parte da nossa primeira comunidade e tenha acesso antecipado às novidades e às condições especiais que estamos preparando para a estreia.',
  note: 'Entrar não é comprar nem assinar nada.',
};

export const form = {
  steps: {
    tutor: { title: 'Como podemos te chamar?', label: 'Seu nome' },
    dog: { title: 'E quem é o protagonista dessa história?', label: 'Nome do seu cão' },
    about: { title: 'Conta um pouquinho sobre {dog}.', sizeLabel: 'Porte', ageLabel: 'Idade aproximada' },
    contact: { title: 'Por onde a gente te avisa?' },
    plan: {
      title: 'Qual plano mais combina com você e seu cão?',
      hint: 'Não se preocupe com valores agora. Queremos entender qual experiência faz mais sentido para a sua rotina.',
    },
    interests: {
      title: 'O que mais faria diferença na rotina com {dog}?',
      hint: 'Opcional. Pode marcar mais de um.',
    },
  },
  sizes: [
    { value: 'pequeno', label: 'Pequeno' },
    { value: 'medio', label: 'Médio' },
    { value: 'grande', label: 'Grande' },
  ],
  ages: [
    { value: 'filhote', label: 'Filhote (até 1 ano)' },
    { value: 'jovem', label: '1 a 3 anos' },
    { value: 'adulto', label: '4 a 7 anos' },
    { value: 'senior', label: '8 anos ou mais' },
  ],
  // Etapa exibida só quando o cadastro não foi aberto pelo botão de um dos planos.
  // Nome e frase de Essential e Care vêm dos próprios cards da seção O Club.
  plans: [
    // Detalhes iguais aos dos cards: quem abre o cadastro pelo topo pode não ter visto a seção.
    ...club.plans.map((p) => ({
      value: p.id,
      label: p.name,
      copy: p.tagline,
      count: p.count as number | undefined,
      items: p.items as string[],
      originals: 'originals' in p ? p.originals : undefined,
    })),
    { value: 'undecided', label: 'Ainda não sei', copy: 'Quero conhecer melhor antes de escolher.', count: undefined, items: [] as string[], originals: undefined },
  ],
  interests: [
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'brinquedos', label: 'Brinquedos' },
    { value: 'higiene', label: 'Higiene e cuidado' },
    { value: 'passeios', label: 'Passeios' },
    { value: 'organizacao', label: 'Organização' },
    { value: 'viagens', label: 'Viagens' },
  ],
  // Versão do texto de consentimento: grave junto do lead para auditoria LGPD.
  consentVersion: '2026-10-05',
  consentText:
    'Quero receber novidades da PetVila Club por e-mail e WhatsApp. Li e concordo com a Política de Privacidade.',
  success: {
    title: 'Bem-vindos à Vila.',
    body: 'Você e {dog} agora fazem parte dos Primeiros da Vila.',
    complement:
      'Estamos preparando tudo para abrir as portas da PetVila Club. Quando chegar a hora, vocês estarão entre os primeiros a saber.',
    instagram: 'Acompanhe a Vila no Instagram',
  },
};

export const ufs = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];
