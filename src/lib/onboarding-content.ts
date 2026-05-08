/**
 * Conteúdo do tutorial admin · nicho-aware.
 *
 * Cada negócio tem `category` (string) que mapeia copy adaptada:
 * exemplos de serviço, dicas estratégicas de fidelidade, tom da
 * boas-vindas. Categoria desconhecida cai pro DEFAULT.
 *
 * Categorias reais do app (vêm do cadastro): Barbearia · Salão de
 * beleza · Estúdio de tatuagem · Clínica estética · Nail designer ·
 * Manicure · Psicólogo / Terapeuta · Personal trainer.
 */

export type OnboardingCopy = {
  /** Frase do slide 1 do welcome modal (após "Bem-vindo, [nome]") */
  welcomeSubtitle: string
  /** Exemplos de serviço típicos do nicho (3-4) — usado no checklist item 2 */
  serviceExamples: string[]
  /** Frase de motivação curta no slide 3 (antes do checklist preview) */
  motivacao: string
  /** Dicas estratégicas de fidelidade adaptadas */
  dicaReativacao: string
  dicaIndicacao: string
  dicaPontualidade: string
  /** Header do card de fidelidade — fala a "linguagem" do nicho */
  fidelidadeHeader: string
}

const DEFAULT_COPY: OnboardingCopy = {
  welcomeSubtitle:
    'Vamos deixar seu negócio rodando 100% online em poucos minutos. Sem complicação.',
  serviceExamples: ['Atendimento padrão', 'Consulta', 'Sessão'],
  motivacao: '5 passos rápidos pra começar a faturar pelo app.',
  dicaReativacao:
    'Cliente sumido por 60+ dias? Mande mensagem com pontos triplos se ele voltar essa semana. Reativa base dormente sem dar desconto direto na sua margem.',
  dicaIndicacao:
    'Quem indica e o indicado fecha: ambos ganham pontos. 1 cliente fiel pode trazer 5-10. Configura pontos generosos aqui — o ROI bate qualquer Meta Ads.',
  dicaPontualidade:
    'Pontos por chegar pontual cortam até 70% das faltas. No-show é seu maior inimigo (perde horário + perde dinheiro). 50 pontos por chegar no horário sai mais barato que cobrir a falta.',
  fidelidadeHeader: 'Como o programa de fidelidade funciona',
}

const COPY_BY_CATEGORY: Record<string, Partial<OnboardingCopy>> = {
  'Barbearia': {
    welcomeSubtitle:
      'Sua barbearia digital tá quase pronta. Bora deixar tudo no jeito pra começar a receber agendamentos.',
    serviceExamples: ['Corte masculino', 'Barba', 'Sobrancelha', 'Combo Corte + Barba'],
    motivacao: '5 passos pra sua barbearia rodar no piloto automático.',
    dicaReativacao:
      'Cliente que sumiu por 60+ dias volta forte com mensagem de "pontos triplos pra retornar essa semana". Barba/cabelo crescem rápido — eles SEMPRE vão precisar de você. Você só precisa lembrá-los.',
    dicaIndicacao:
      'Cliente fiel da barbearia indica os amigos do trabalho/academia. Configura pontos altos aqui — 1 indicação rentabilizou pode trazer 5-10 caras novos. Crescimento orgânico zero custo.',
    dicaPontualidade:
      'Cliente que falta na barbearia trava sua agenda — você fica olhando relógio e perde dinheiro. 50 pontos por chegar pontual reduz no-show em até 70%. Vale cada pontinho.',
    fidelidadeHeader: 'Fidelidade na barbearia · como funciona',
  },
  'Salão de beleza': {
    welcomeSubtitle:
      'Seu salão digital tá quase pronto. Vamos configurar pra clientes agendarem sozinhas pelo celular.',
    serviceExamples: ['Escova', 'Corte feminino', 'Hidratação', 'Manicure'],
    motivacao: '5 passos pra seu salão receber agendamento até dormindo.',
    dicaReativacao:
      'Cliente que parou de vir há 2-3 meses? Manda WhatsApp com "ganhe pontos triplos voltando essa semana". Mulheres adoram cuidar de si — só precisam do empurrãozinho. Reativa base dormente sem cortar margem.',
    dicaIndicacao:
      'Sua cliente fiel tem 5-10 amigas que ainda não conhecem seu trabalho. Configura pontos generosos por indicação — quando ambas ganham, o boca-a-boca explode. ROI bate Meta Ads de longe.',
    dicaPontualidade:
      'No salão atrasos quebram a agenda do dia inteiro (procedimentos longos). 50 pontos pra cliente que chegar no horário corta atraso em 70%. Sua agenda fica fluida e cliente fica feliz com o brinde.',
    fidelidadeHeader: 'Fidelidade no salão · como funciona',
  },
  'Estúdio de tatuagem': {
    welcomeSubtitle:
      'Seu estúdio digital tá quase pronto. Bora deixar tudo certinho pra começar a captar tatuados online.',
    serviceExamples: ['Tatuagem pequena', 'Tatuagem grande', 'Retoque', 'Piercing'],
    motivacao: '5 passos pra seu estúdio operar profissional.',
    dicaReativacao:
      'Cliente que tatuou há 6+ meses tá pensando na próxima. Mande mensagem com bônus de pontos pra fechar a próxima nessa semana — o desejo já existe, só precisa do gatilho.',
    dicaIndicacao:
      'Tatuagem é arte mostrada na rua. Cada cliente vira marketing andante. Configure pontos altos por indicação — quando o amigo fechar, ambos ganham. 1 cliente vira 5 fácil.',
    dicaPontualidade:
      'Sessão de tattoo é longa, atraso atrapalha o dia inteiro. 50 pontos por pontualidade reduz no-show em até 70% e seu fluxo fica respeitado.',
    fidelidadeHeader: 'Fidelidade no estúdio · como funciona',
  },
  'Clínica estética': {
    welcomeSubtitle:
      'Sua clínica digital tá quase pronta. Vamos configurar pra ficar disponível 24h pra seus clientes.',
    serviceExamples: ['Limpeza de pele', 'Drenagem', 'Massagem', 'Avaliação'],
    motivacao: '5 passos pra sua clínica receber agendamento profissional.',
    dicaReativacao:
      'Tratamento estético é jornada — cliente que sumiu vai voltar quando lembrar do efeito. Mensagem com pontos triplos pra retornar essa semana traz a base dormente sem dar desconto direto na sua margem.',
    dicaIndicacao:
      'Cliente que viu resultado vira propaganda andante. Configure pontos generosos — quando ambos ganham, vira referral em escala. 1 cliente fiel traz 5-10.',
    dicaPontualidade:
      'Procedimentos estéticos têm hora certa (preparação, repouso). Cliente atrasado quebra protocolo. 50 pontos pra chegar pontual corta no-show em até 70%.',
    fidelidadeHeader: 'Fidelidade na clínica · como funciona',
  },
  'Nail designer': {
    welcomeSubtitle:
      'Seu studio nail tá quase pronto. Bora deixar tudo no jeito pra clientes agendarem direto pelo Insta.',
    serviceExamples: ['Esmaltação em gel', 'Nail art', 'Manutenção', 'Spa das mãos'],
    motivacao: '5 passos pro studio rodar online de verdade.',
    dicaReativacao:
      'Cliente nail volta a cada 3 semanas SEM EXCEÇÃO — quando some, é porque foi pra concorrência. Mensagem com pontos triplos pra retornar traz ela de volta antes de criar hábito com outra.',
    dicaIndicacao:
      'Nail é o serviço mais "fotogênico" — toda cliente posta no story. Configure pontos altos por indicação e cresça via Insta organicamente. 1 cliente fiel traz 5-10 amigas.',
    dicaPontualidade:
      'No nail atraso quebra a agenda inteira do dia (cada serviço dura 1-2h). 50 pontos pra chegar no horário reduz no-show em 70% — sua agenda fica fluida.',
    fidelidadeHeader: 'Fidelidade no studio nail · como funciona',
  },
  'Manicure': {
    welcomeSubtitle:
      'Seu atendimento digital tá quase pronto. Vamos configurar pra clientes agendarem sozinhas.',
    serviceExamples: ['Mão', 'Pé', 'Mão e pé', 'Esmaltação em gel'],
    motivacao: '5 passos pra agenda lotada todo mês.',
    dicaReativacao:
      'Cliente de manicure volta a cada 2-3 semanas religiosamente. Quando some, é porque encontrou outra. Mensagem com pontos triplos pra voltar essa semana resgata ela antes de virar costume.',
    dicaIndicacao:
      'Cliente fiel da manicure indica vizinhas, colegas de trabalho, amigas. Configure pontos generosos por indicação — 1 indicação que fecha pode trazer 5-10.',
    dicaPontualidade:
      'No-show na manicure dói no bolso (horário desperdiçado, sem pago). 50 pontos por pontualidade corta no-show em 70%. Compensa de longe.',
    fidelidadeHeader: 'Fidelidade na manicure · como funciona',
  },
  'Psicólogo / Terapeuta': {
    welcomeSubtitle:
      'Seu consultório digital tá quase pronto. Vamos configurar agendamento online com discrição.',
    serviceExamples: ['Sessão individual', 'Avaliação inicial', 'Sessão online', 'Pacote 4 sessões'],
    motivacao: '5 passos pro consultório receber agendamento profissional.',
    dicaReativacao:
      'Paciente que parou tratamento mas precisa voltar pode receber convite com bônus de pontos pra agendar essa semana. Tom acolhedor, sem pressão — abre espaço pra ele retomar.',
    dicaIndicacao:
      'Paciente que melhora indica amigos/família. Configure pontos generosos — cresce com confiança. 1 indicação vale ouro nessa área.',
    dicaPontualidade:
      'Sessão tem hora certa, atraso atrapalha o próximo paciente. 50 pontos por pontualidade reduz no-show em 70% e respeita seu fluxo.',
    fidelidadeHeader: 'Fidelidade no consultório · como funciona',
  },
  'Personal trainer': {
    welcomeSubtitle:
      'Sua agenda de personal tá quase pronta. Bora deixar tudo no jeito pra alunos agendarem sozinhos.',
    serviceExamples: ['Sessão individual', 'Avaliação física', 'Treino online', 'Pacote 4 sessões'],
    motivacao: '5 passos pra agenda cheia de aluno comprometido.',
    dicaReativacao:
      'Aluno que sumiu meses depois de iniciar quer voltar (todos querem voltar). Mensagem com pontos triplos pra retornar essa semana derruba a barreira mental.',
    dicaIndicacao:
      'Aluno fiel é seu melhor marketing — corpo é resultado visível. Configure pontos altos por indicação — quando o amigo da academia fechar, ambos ganham.',
    dicaPontualidade:
      'Personal não tolera atraso (treino tem hora). 50 pontos pra chegar pontual reduz no-show em 70% e preserva sua agenda.',
    fidelidadeHeader: 'Fidelidade no personal · como funciona',
  },
}

export function getOnboardingCopy(category: string | null | undefined): OnboardingCopy {
  if (!category) return DEFAULT_COPY
  const partial = COPY_BY_CATEGORY[category]
  if (!partial) return DEFAULT_COPY
  return { ...DEFAULT_COPY, ...partial }
}

/**
 * Itens fixos do checklist · derivados do estado SQL.
 * O 1º label é o título; o 2º é o subtítulo motivacional.
 */
export type ChecklistItemKey =
  | 'horarios'
  | 'servicos'
  | 'profissionais'
  | 'qrcode'
  | 'agendamento'

export const CHECKLIST_ITEMS: Array<{
  key: ChecklistItemKey
  emoji: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}> = [
  {
    key: 'horarios',
    emoji: '⏰',
    title: 'Configurar horários',
    subtitle: 'Quando seu negócio atende',
    ctaLabel: 'Configurar horários',
    ctaHref: '/admin/configuracoes?tab=horarios',
  },
  {
    key: 'servicos',
    emoji: '💼',
    title: 'Cadastrar pelo menos 1 serviço',
    subtitle: 'Sem serviço, ninguém agenda',
    ctaLabel: 'Adicionar serviço',
    ctaHref: '/admin/configuracoes?tab=servicos',
  },
  {
    key: 'profissionais',
    emoji: '👤',
    title: 'Adicionar profissional',
    subtitle: 'Você ou sua equipe',
    ctaLabel: 'Adicionar profissional',
    ctaHref: '/admin/configuracoes?tab=profissionais',
  },
  {
    key: 'qrcode',
    emoji: '🔗',
    title: 'Compartilhar link da sua página',
    subtitle: 'Stories, status, bio do Insta',
    ctaLabel: 'Pegar link e QR Code',
    ctaHref: '/admin/configuracoes?tab=qr-code',
  },
  {
    key: 'agendamento',
    emoji: '📅',
    title: 'Receber o 1º agendamento',
    subtitle: 'Pode ser teste seu mesmo',
    ctaLabel: 'Ver minha página',
    ctaHref: '',
  },
]
