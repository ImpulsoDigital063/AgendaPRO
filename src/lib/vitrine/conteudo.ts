/* VITRINE DA CLÍNICA · conteúdo de cada negócio (textos, vídeos, Instagram, mapa).
   O código da página é um só; o que muda de uma clínica pra outra vive aqui.
   Protótipo: fica em arquivo. Quando virar recurso, passa pra uma coluna jsonb
   em businesses e a dona edita pelo painel. `ex: true` = texto de exemplo,
   aparece com selo até a dona mandar o dela. */

export type Texto = { t: string; ex?: boolean }

export type ConteudoVitrine = {
  selo: string
  titulo: { antes: string; destaque: string; depois?: string; ex?: boolean }
  subtitulo: Texto
  /** provas curtas na abertura (só o que é verdade e publicado) */
  selos?: string[]
  /** cidade em etiqueta pequena na abertura (identifica onde fica, sem virar o assunto) */
  local?: string
  /** prévia do link no WhatsApp/Instagram: imagem 1200x630 (em public/) e o texto embaixo do nome */
  og?: { imagem: string; descricao: string }
  frase?: string
  proposta: { titulo: string; destaque: string; texto: Texto; foto?: string }
  pilares: { titulo: string; texto: Texto; icone: 'coracao' | 'estrela' | 'casa' | 'folha' | 'brilho' }[]
  bios: Record<string, { papel?: string; texto: Texto }>
  /* foto da equipe mandada pela clínica (vale mais que a do cadastro); chave = primeiro nome */
  fotos?: Record<string, string>
  /* frase de abertura de cada categoria de serviço, na voz da dona */
  categorias?: Record<string, { frase: string; texto?: string }>
  /* bloco de foto grande com chamada pra um procedimento */
  destaque?: { foto: string; sobre: string; titulo: string; destaque: string; texto: string; botao: string }
  teaser?: { mp4: string; poster: string }
  /* recortes da logo oficial (só o dourado, fundo transparente); nunca redesenhar */
  monograma?: string
  logoDourada?: string
  /** app instalado da equipe (PWA): nome embaixo do ícone e pasta com icone-192/512, maskable-192/512, apple-180 */
  app?: { nome: string; pasta: string }
  videos: { src: string; poster: string; titulo: string }[]
  instagram?: { usuario: string; posts: { img: string; url: string; alt: string }[] }
  /** coords = pin que a clínica mandou ("lat,lng"); quando existe, o mapa e o
      "Como chegar" usam ele no lugar do endereço escrito. */
  mapa?: { consulta: string; cidade?: string; coords?: string; confirmar?: boolean }
  horario?: Texto
  /* CATÁLOGO DO WHATSAPP da clínica (lido em 23/10, 34 produtos): foto e texto por
     serviço. A 1ª regra que casar com o nome do serviço vale. Texto só entra
     onde o cadastro não tem descrição (o do sistema manda). Fotos públicas do
     catálogo dela; antes de ir ao ar, a Ivna confirma o uso. */
  catalogo?: { servico: string; foto?: string; texto?: string }[]
  /** pasta das fotos do catálogo (em public/) */
  catalogoPasta?: string
  /** fotos do catálogo com miniatura recortada em catalogoPasta/mini (montagens de antes/depois) */
  catalogoMini?: string[]
}

/* Textos da Ivna tirados do Instagram dela (estudo 22/10/2026, com o post de
   origem em segundo-cerebro/2-PROCESSAMENTO/agendapro/ivna-loyola/ESTUDO-INSTAGRAM.md). */
const IVNA: ConteudoVitrine = {
  selo: 'Beauty Clinic',
  /* 24/10 · Eduardo escolheu entre 4 frases dela: a BIO ("Harmonizamos sua
     beleza com técnicas de alta performance"); Fortaleza vira etiqueta (local).
     "A clínica da naturalidade em Fortaleza" reprovada ("frase tosca").
     Antes (carta branca): vende a CLÍNICA (equipe) com a
     palavra que ela mais repete; 1ª versão do dia ("Micropigmentação e laser…",
     "Com Ivna Loyola") apagava a equipe e promovia o laser, que quase não
     agenda (banco 24/10: cílios 19, micro 13, laser 2). Antes: abria com a ESPECIALIDADE dela
     em vez de frase que serve pra qualquer salão. A anterior, aprovada em
     23/10, era "Seu momento de beleza e autocuidado começa aqui" (DerN4J1St1i).
     Provas só com o que é verdade e está publicado: ela dá curso (DY7gcStO4_D,
     CywgzmVx4-c, Cw5aaLquzvz) e repete a avaliação antes (Dce6N0DJv3B). A nota
     do Google (5,0 com 2 avaliações em 24/10) ainda é pouca pra vitrine. */
  titulo: { antes: 'Harmonizamos sua beleza com técnicas de', destaque: 'alta performance.' },
  local: 'Fortaleza · CE',
  subtitulo: { t: 'Micropigmentação, cílios, estética facial e spa, do jeitinho que você merece.' }, // Ddj0mJ2J_Lp
  selos: ['A avaliação é indispensável', 'Higiene, técnica e atenção em cada detalhe'], // Dce6N0DJv3B · DeK7ORmG_0j (voz dela, aprovado 24/10)
  og: {
    imagem: '/vitrine/ivna-loyola/og.jpg', // logo dourada + título aprovado do hero (24/10, refeita)
    descricao: 'Harmonizamos sua beleza com técnicas de alta performance. Micropigmentação, cílios, estética facial e spa em Fortaleza. Agende online.',
  },
  frase: 'Autocuidado não é luxo, é necessidade.', // DdtqNMlSsvl
  proposta: {
    titulo: 'Um atendimento',
    destaque: 'do jeitinho que você merece',
    texto: {
      // DerN4J1St1i + Ddj0mJ2J_Lp
      t: 'Um espaço feito pra você, mulher, que ama se cuidar e ter aquele momento só seu. Aqui o atendimento é diferenciado, do jeitinho que você merece!',
    },
  },
  pilares: [
    { titulo: 'A avaliação é indispensável', icone: 'coracao', texto: { t: 'Antes de qualquer procedimento, avaliamos sua expectativa para entregar um resultado seguro e perfeito pra você.' } }, // Dce6N0DJv3B
    { titulo: 'Naturalidade', icone: 'folha', texto: { t: 'Delicadeza, elegância e naturalidade em cada detalhe. Naturalidade é o nosso efeito favorito.' } }, // DezCm2cBm-x + Dcl9_N9yXY0
    { titulo: 'Segurança', icone: 'estrela', texto: { t: 'Higiene, técnica especializada e atenção em cada fio.' } }, // DeK7ORmG_0j
  ],
  // Textos que cada uma mandou no WhatsApp (22/10), resumidos sem acrescentar nada.
  bios: {
    Ivna: {
      papel: 'Fundadora',
      texto: { t: 'Formada em Estética e Cosmética, pós-graduada em Estética Avançada e acadêmica de Odontologia. Une conhecimento, cuidado e sensibilidade pra valorizar a beleza única de cada paciente.' },
    },
    Ilana: {
      papel: 'Lash e Designer de Sobrancelhas',
      texto: { t: 'Atende desde maio de 2023 e é profissional destaque 2026. Formação e especialização em Design de Sobrancelhas e em Lash Designer (fios tecnológicos), além de Lash Lifting e Brow Lamination.' },
    },
    Marcilene: {
      papel: 'Spa e bem-estar',
      texto: { t: 'Responsável pela área de Spa. Um momento pra desacelerar, respirar e cuidar de você, com acolhimento e tranquilidade em cada detalhe.' },
    },
  },
  fotos: {
    Ivna: '/vitrine/ivna-loyola/equipe-ivna.jpg',
    Ilana: '/vitrine/ivna-loyola/equipe-ilana.jpg',
    Marcilene: '/vitrine/ivna-loyola/equipe-marcilene.jpg',
  },
  // quem faz cada serviço saiu daqui (24/10): mora no banco (v173,
  // service_professional_prices.realiza) e a Ivna muda no painel, em Serviços.
  categorias: {
    'Harmonização facial': { frase: 'Realce sua beleza com quem cuida de cada detalhe!', texto: 'Agende sua avaliação e descubra o procedimento ideal para você.' }, // DewdxA-BLOk
    'Estética facial': { frase: 'Adeus poros entupidos, oleosidade excessiva e textura áspera.', texto: 'Pele macia, luminosa e pronta pra maquiagem deslizar.' }, // Deemlt2yOcY
    'Micropigmentação': { frase: 'A sobrancelha dos sonhos existe!', texto: 'Sobrancelhas mais definidas, harmoniosas e com naturalidade. Lábios com contorno definido e cor suave.' }, // Ddr9xfApv7U + Dcl9_N9yXY0
    'Alongamento de cílios': { frase: 'Não é só sobre cílios. É sobre o poder que um olhar bem feito tem.' }, // Da2zfN_ODZl
    'Sobrancelhas': { frase: 'Sobrancelha dos sonhos não acontece por acaso, acontece aqui.', texto: 'A Brow Lamination alinha e direciona os fios, deixando o olhar mais marcante.' }, // DZNkZHSuOhH + Ddmz9NQJVyN
    'Spa e bem-estar': { frase: 'Fecha os olhos. Respira.', texto: 'A massagem relaxante é isso: um convite pra voltar pra você.' }, // Da5dqO0uCjl
    'Outros serviços': { frase: 'Às vezes, remover é o começo da transformação mais bonita.', texto: 'Laser Day: remoção de tatuagem, despigmentação, manchas e melasma.' }, // DaVlfP8SD3m + DerN4J1St1i
  },
  destaque: {
    foto: '/vitrine/ivna-loyola/labios.jpg', // fim do Reels Dcl9_N9yXY0
    sobre: 'Micropigmentação labial',
    titulo: 'Naturalidade é o nosso',
    destaque: 'efeito favorito',
    texto: 'Lábios com contorno definido e cor suave. Autoestima renovada.',
    botao: 'Agendar minha avaliação',
  },
  /* 24/10 · procedimentos em vez da recepção: Brow Lamination (DZIG-bGOYL4),
     micropigmentação labial (Dcl9_N9yXY0), laser (DdHGEivO_LU) e o lábio
     cicatrizado no fim, só trechos SEM legenda. Tem rosto de cliente: pedir a
     autorização à Ivna antes de publicar, ou trocar pelos originais dela. */
  teaser: { mp4: '/vitrine/ivna-loyola/abertura-procedimentos.mp4', poster: '/vitrine/ivna-loyola/abertura-procedimentos.jpg' },
  monograma: '/vitrine/ivna-loyola/monograma.png',
  logoDourada: '/vitrine/ivna-loyola/logo-dourada.png',
  app: { nome: 'Ivna Loyola', pasta: '/vitrine/ivna-loyola/app' },
  videos: [
    { src: '/vitrine/ivna-loyola/video-labios.mp4', poster: '/vitrine/ivna-loyola/video-labios.jpg', titulo: 'Micropigmentação labial' },
    { src: '/vitrine/ivna-loyola/video-espaco.mp4', poster: '/vitrine/ivna-loyola/video-espaco.jpg', titulo: 'Conheça o nosso espaço' },
    { src: '/vitrine/ivna-loyola/video-preparo.mp4', poster: '/vitrine/ivna-loyola/video-preparo.jpg', titulo: 'Tudo preparado pra você' },
    { src: '/vitrine/ivna-loyola/video-spa.mp4', poster: '/vitrine/ivna-loyola/video-spa.jpg', titulo: 'Spa e drenagem' },
  ],
  instagram: { usuario: 'ivnaloyola_clinic', posts: [] },
  // cidade deduzida (#EsteticaFortaleza, DDD 85): confirmar com ela
  // pin mandado pela Ivna no WhatsApp em 23/10
  catalogoPasta: '/vitrine/ivna-loyola/catalogo',
  // montagens antes/depois: no quadradinho só a metade do resultado (24/10)
  catalogoMini: ['lash-lifting', 'limpeza-pele', 'peeling-manchas', 'preenchimento-labial', 'preenchimento-mento', 'remocao-laser-sobrancelha', 'remocao-laser', 'remocao-sinais', 'toxina', 'depilacao-axila'],
  catalogo: [
    { servico: 'brasileiro', foto: 'cilios-brasileiro', texto: 'Feito com fios em formato de Y, pra quem gosta de um volume delicado. Manutenção de 15 a 20 dias.' },
    { servico: 'russo', foto: 'cilios-russo', texto: 'Feito com fans e preenchimento de 80% dos fios, pra quem é despojada e gosta de volume. Manutenção de 15 a 20 dias.' },
    { servico: 'express', foto: 'cilios-express' },
    { servico: 'h[ií]brido', foto: 'cilios-hibrido' },
    { servico: 'eg[ií]p', foto: 'cilios-egipcio' },
    { servico: 'fox|sirena|alongamento de c[ií]lios', foto: 'cilios-hibrido' },
    { servico: 'manuten[cç][aã]o de c[ií]lios', foto: 'cilios-express' },
    { servico: 'lash lifting', foto: 'lash-lifting', texto: 'Técnica que curva os seus cílios naturais e deixa eles mais alongados.' },
    { servico: 'brow lamination', foto: 'brow-lamination', texto: 'Realinha os fios, dá forma e realça o desenho natural das sobrancelhas: aquele efeito de sobrancelha penteada e cheia por mais tempo. Já inclui design e henna.' },
    { servico: 'design de sobrancelha', foto: 'design-sobrancelha' },
    { servico: 'combo diva|micropigmenta[cç][aã]o labial', foto: 'micro-labial' },
    { servico: 'micropigmenta[cç][aã]o de sobrancelha', foto: 'micro-sobrancelha' },
    { servico: 'remo[cç][aã]o de micropigmenta', foto: 'remocao-laser' },
    { servico: 'microagulhamento de micropigmenta', foto: 'remocao-laser-sobrancelha' },
    { servico: 'remo[cç][aã]o de sinais', foto: 'remocao-sinais', texto: 'Todo procedimento começa com uma avaliação: você pode vir até o nosso espaço ou mandar uma foto nítida pelo WhatsApp.' },
    { servico: 'preenchimento labial', foto: 'preenchimento-labial', texto: 'Aumenta o volume e melhora o contorno dos lábios de forma natural, corrigindo assimetrias. Resultado na hora, com duração de 6 a 24 meses.' },
    { servico: 'toxina|botox', foto: 'toxina', texto: 'Suaviza rugas e linhas de expressão relaxando os músculos do rosto. Procedimento rápido e minimamente invasivo, com resultado de 3 a 6 meses.' },
    { servico: 'avalia[cç][aã]o para harmoniza', foto: 'preenchimento-mento' },
    { servico: 'microagulhamento facial', foto: 'microagulhamento', texto: 'Estimula a produção natural de colágeno e elastina: suaviza cicatrizes de acne e poros, atenua linhas finas, uniformiza manchas e devolve a luminosidade da pele.' },
    { servico: 'peeling descamativo', foto: 'peeling-manchas', texto: 'Esfolia a pele com uma solução química e estimula a renovação. Trata melasma, acne, manchas, oleosidade, sardas e envelhecimento.' },
    { servico: 'peeling de hollywood', texto: 'O queridinho das celebridades: renova a pele, melhora a textura, suaviza manchas e poros e deixa um brilho imediato.' },
    { servico: 'limpeza de pele', foto: 'limpeza-pele' },
    { servico: 'banho de lua para gestante', foto: 'banho-de-lua-moment', texto: 'Um toque de brilho, suavidade e cheirinho de spa pra deixar a pele iluminada.' },
    { servico: 'banho de lua', foto: 'banho-de-lua', texto: 'Clareamento dos pelos com toque dourado, esfoliação suave e hidratação profunda: pele mais clara, macia e iluminada.' },
    { servico: 'axila', foto: 'depilacao-axila' },
    { servico: 'contorno|gl[uú]teo|barriga|peitoral', foto: 'depilacao-contorno' },
    { servico: 'epila[cç][aã]o|perna', foto: 'depilacao-perna' },
  ],
  mapa: { consulta: 'Rua Joaquim dos Anjos, 899, Planalto Ayrton Senna', cidade: 'Fortaleza - CE', coords: '-3.8310137,-38.5693817' },
}

const CONTEUDOS: Record<string, ConteudoVitrine> = {
  'ivna-loyola-beauty-clinic': IVNA,
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0]

/* Foto e texto do catálogo pro nome dado (serviço, ou pacote e seus itens). */
export function doCatalogo(c: ConteudoVitrine, ...nomes: string[]): { foto: string | null; texto: string | null } {
  for (const n of nomes) {
    const r = c.catalogo?.find((x) => new RegExp(x.servico, 'i').test(n))
    if (r) return { foto: r.foto ? `${c.catalogoPasta ?? ''}/${r.foto}.jpg` : null, texto: r.texto ?? null }
  }
  return { foto: null, texto: null }
}

export function conteudoDaVitrine(slug: string): ConteudoVitrine | null {
  return CONTEUDOS[slug] ?? null
}
