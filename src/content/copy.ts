/** Toda a copy da página num só lugar, para revisão seção por seção. */

export const cta = {
  primary: 'Quero ser um dos Primeiros da Vila',
  short: 'Quero ser um dos primeiros',
};

export const hero = {
  headline: 'Cuidado que faz parte da rotina.',
  support: 'Um clube criado para tornar a vida com seu cão mais prática, divertida e especial.',
};

export type MomentId = 'comer' | 'brincar' | 'passear' | 'cuidar' | 'junto';

export const rotina = {
  eyebrow: 'A rotina',
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
  eyebrow: 'Curadoria',
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

export const club = {
  eyebrow: 'O Club',
  headline: 'Existe um jeito PetVila de cuidar.',
  soon: 'Em breve',
  plans: [
    { id: 'essential', name: 'Vila Essential', copy: 'O essencial para deixar a rotina ainda melhor.', core: false },
    { id: 'care', name: 'Vila Care', copy: 'Uma experiência mais completa de cuidado, descoberta e diversão.', core: true },
  ],
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

export const cookies = {
  title: 'Cookies na Vila',
  text: 'Usamos cookies do Google Analytics e da Meta para contar visitas e entender quais anúncios trazem gente para a Vila. Eles só entram se você aceitar.',
  more: 'Saiba mais',
  accept: 'Aceitar',
  deny: 'Recusar',
  prefs: 'Preferências de cookies',
};

export const ufs = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];
