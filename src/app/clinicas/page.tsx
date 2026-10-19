/* ═══════════════════════════════════════════════════════════
   /clinicas · página do nicho clínicas (estética, fisioterapia,
   consultórios e terapias) · 18/10/2026
   Recebe o link de todos os Reels desse público. A página é um
   "filme que a pessoa controla" (Filme.tsx); aqui fica o que o Google
   e as IAs leem: título, texto de cada capítulo, planos, perguntas e
   dados estruturados. Preços vêm de src/config/pricing.ts (fonte única).
   ═══════════════════════════════════════════════════════════ */
import type { Metadata } from 'next'
import { Montserrat, Cormorant_Garamond } from 'next/font/google'
import { JsonLd, faqJsonLd, breadcrumbJsonLd, softwareApplicationJsonLd, organizationJsonLd, SITE_URL } from '@/lib/jsonld'
import { PRICING, calcularPreco } from '@/config/pricing'
import { preload } from 'react-dom'
import { CtaTestar, CtaLink } from '@/components/lp-clinicas/Cta'
import Filme, { HeroAparelhos } from '@/components/lp-clinicas/Filme'

// só 'latin': já cobre á, ã, ç, é, õ (latin-ext eram 2 arquivos de fonte a mais no carregamento)
const display = Montserrat({ subsets: ['latin'], weight: ['900'], variable: '--font-display', display: 'swap' })
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['600'], style: ['italic'], variable: '--font-serif', display: 'swap' })

const URL = `${SITE_URL}/clinicas`
const TITULO = 'Sistema para clínica de estética e fisioterapia: agenda, sinal, fichas e caixa | AgendaPRO'
const DESCRICAO = `Agenda pelo balcão e pelo link, sinal no Pix, fichas de anamnese assinadas no celular, comanda, caixa e clube de benefícios. ${PRICING.trial.dias} dias grátis, sem cartão. A partir de ${PRICING.solo.mensalidadeCompleta}.`

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: URL },
  openGraph: { title: 'AgendaPRO para clínicas', description: DESCRICAO, url: URL, type: 'website', locale: 'pt_BR' },
}

const CREME = '#F7F2EB', TAUPE = '#5E544B', MARROM = '#8C7360'
const DOURADO = 'linear-gradient(100deg,#E3C28E 0%,#C9974A 50%,#8C7360 100%)'
const CADASTRO = '/cadastro?utm_source=site&utm_medium=lp&utm_campaign=clinicas'

const FAQS = [
  { q: 'Preciso de cartão de crédito pra testar?', a: `Não. São ${PRICING.trial.dias} dias grátis, sem cartão e sem fidelidade. Você só escolhe um plano se quiser continuar.` },
  { q: 'Funciona se eu marco pelo WhatsApp ou no balcão?', a: 'Sim. A maioria das clínicas marca assim: você abre a agenda, toca no horário livre e marca em segundos. O link de agendamento é um jeito a mais, pra quem prefere marcar sozinha.' },
  { q: 'Dá pra cobrar sinal pra evitar falta?', a: 'Dá. O sinal pode ser em porcentagem ou valor fixo, e você pode cobrar um valor maior nos procedimentos caros. A cliente paga no Pix e o horário fica garantido.' },
  { q: 'As fichas de anamnese ficam salvas?', a: 'Ficam, na ficha de cada cliente. São fichas prontas de clínica (toxina, preenchimento, bioestimulador, fios, peeling e outras), com assinatura no próprio celular. Você também pode mandar o link pra cliente responder antes do atendimento.' },
  { q: 'Serve pra fisioterapia e consultório?', a: 'Serve. O sistema trata quem você atende como cliente ou paciente, e o suporte ajusta o que for preciso pro seu jeito de atender.' },
  { q: 'Minha equipe vê o financeiro?', a: 'Só se você deixar. A profissional vê a agenda e os ganhos dela; a recepção cuida da agenda, das comandas e do caixa, sem ver o financeiro; a gerente acessa só as áreas que você liberar.' },
  { q: 'Tenho mais de 5 profissionais. Tem plano?', a: 'Tem. O plano é sob medida, com o sistema ajustado ao jeito da sua clínica. Fale com um especialista.' },
]

const H2: React.CSSProperties = { margin: '0 0 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.5vw, 46px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }
const ouro: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600, backgroundImage: DOURADO, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
const botao: React.CSSProperties = { display: 'inline-block', padding: '16px 30px', borderRadius: 999, background: TAUPE, color: CREME, fontWeight: 800, fontSize: 18, textDecoration: 'none' }

export default function Clinicas() {
  const { solo, equipe } = PRICING
  // as 2 telas do topo são o maior elemento da página (LCP): baixam junto com o HTML, na frente de tudo
  preload('/clinicas/cap1/hero-agenda-antes.webp', { as: 'image', fetchPriority: 'high' })
  preload('/clinicas/cap1/r-02-link-sem-modal.webp', { as: 'image', fetchPriority: 'high' })
  return (
    <main className={`${display.variable} ${serif.variable}`} style={{ background: CREME, color: TAUPE, minHeight: '100vh', overflowX: 'clip' }}>
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd(), faqJsonLd(FAQS, URL), breadcrumbJsonLd([{ nome: 'Início', url: SITE_URL }, { nome: 'Clínicas', url: URL }])]} />

      {/* topo · 1ª tela inteira, sem rolar (Eduardo 19/10): assimétrico, texto à esquerda e aparelhos à direita no
          computador e no tablet deitado; no celular e no tablet em pé, texto em cima e aparelhos no espaço que sobra */}
      <header className="hero-clinicas" style={{ background: 'radial-gradient(1100px 500px at 15% -10%, rgba(201,151,74,0.22), transparent), radial-gradient(900px 500px at 100% 110%, rgba(133,122,111,0.16), transparent)' }}>
        <div className="hero-texto">
          <p className="hero-kicker">ESTÉTICA · FISIOTERAPIA · CONSULTÓRIOS</p>
          <h1 className="hero-h1">Sua clínica organizada, <span style={ouro}>do agendamento ao caixa</span></h1>
          <p className="hero-sub">Agenda pelo balcão e pelo link, sinal no Pix, fichas assinadas no celular, comanda, caixa e clube de benefícios. Tudo num lugar só, com suporte de gente que ajusta o sistema ao seu jeito.</p>
        </div>
        <div className="hero-aparelhos"><HeroAparelhos /></div>
        <div className="hero-acoes">
          <div className="hero-botoes">
            <CtaTestar local="topo" style={botao} className="hero-botao">Testar {PRICING.trial.dias} dias grátis</CtaTestar>
            <a href="#agenda" style={{ ...botao, background: 'rgba(255,255,255,0.75)', color: TAUPE }} className="hero-botao">▶ Ver por dentro</a>
          </div>
          <p className="hero-nota">sem cartão · sem fidelidade · garantia de {PRICING.garantia.diasReembolso} dias</p>
        </div>
        <style>{`
          .hero-clinicas { box-sizing: border-box; height: 100svh; min-height: 560px; display: flex; flex-direction: column; padding: 24px 16px 8px; gap: 8px; text-align: center; }
          .hero-texto, .hero-acoes { flex: none; }
          .hero-kicker { margin: 0 0 10px; font-weight: 700; font-size: 12px; letter-spacing: 4px; color: ${MARROM}; }
          .hero-h1 { margin: 0 auto; max-width: 900px; font-family: var(--font-display); font-weight: 900; font-size: clamp(30px, 8.4vw, 72px); letter-spacing: -1.5px; line-height: 1.02; }
          .hero-sub { margin: 12px auto 16px; max-width: 640px; font-size: clamp(15px, 4vw, 21px); line-height: 1.45; }
          .hero-botoes { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
          .hero-botao { padding: 13px 20px !important; font-size: 16px !important; }
          .hero-nota { margin: 10px 0 0; font-size: 13px; color: ${MARROM}; }
          .hero-aparelhos { flex: 1; min-height: 0; }
          /* celular (Eduardo 19/10): o aparelho sobe pra logo abaixo do título; o parágrafo sai e os botões ficam embaixo, lado a lado */
          @media (max-width: 599px) { .hero-sub { display: none; } .hero-botoes { flex-wrap: nowrap; } .hero-botao { padding: 12px 16px !important; font-size: 15px !important; white-space: nowrap; } .hero-nota { margin-top: 8px; } }
          @media (min-width: 600px) { .hero-clinicas { padding: 40px 32px 16px; } .hero-botao { padding: 16px 30px !important; font-size: 18px !important; } }
          /* computador e tablet deitado: assimétrico, texto à esquerda, aparelhos à direita */
          @media (min-width: 900px) and (min-aspect-ratio: 1/1) {
            .hero-clinicas { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); grid-template-rows: 1fr auto auto 1fr; grid-template-areas: '. ap' 'tx ap' 'ac ap' '. ap'; align-items: center; column-gap: 3vw; row-gap: 0; padding: 24px max(28px, 3.5vw) 24px; text-align: left; }
            .hero-texto { grid-area: tx; } .hero-acoes { grid-area: ac; } .hero-aparelhos { grid-area: ap; }
            .hero-h1 { margin: 0; font-size: clamp(38px, 4.2vw, 72px); }
            .hero-sub { margin: 18px 0 26px; font-size: clamp(16px, 1.45vw, 21px); }
            .hero-botoes { justify-content: flex-start; }
            .hero-aparelhos { height: min(88svh, 52vw); }
          }
        `}</style>
      </header>

      <Filme />

      {/* resumo em texto (o que o Google e as IAs leem, e quem prefere ler) */}
      <section aria-labelledby="t-tudo" style={{ padding: '72px 16px', maxWidth: 980, margin: '0 auto' }}>
        <h2 id="t-tudo" style={H2}>O que a sua clínica ganha</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: '28px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            ['Agenda no balcão e no link', 'Marque em segundos pelo computador ou celular. A cliente também agenda sozinha pelo seu link, vendo preço, duração e pontos de cada serviço.'],
            ['Sinal no Pix', 'Percentual ou valor fixo, maior nos procedimentos caros. O horário só fica garantido com o sinal pago.'],
            ['Lembrete e confirmação', 'A mensagem sai pronta, com o nome da cliente, o dia e o horário, e você envia com um toque pelo seu WhatsApp.'],
            ['Fichas de anamnese', 'Fichas prontas de clínica com desenho no rosto e assinatura no celular. Mande o link antes e receba respondida e assinada.'],
            ['Comanda, produtos e estoque', 'Todo agendamento abre uma comanda: some serviços e produtos, escolha a profissional de cada item, dê desconto e divida o pagamento.'],
            ['Caixa e financeiro', 'Abra e feche o caixa do dia, confira cada forma de pagamento e veja do bruto ao líquido, com taxas e comissões.'],
            ['Clube de benefícios', 'A cliente junta pontos por atendimento, avaliação no Google e indicação, e troca por serviço com você.'],
            ['Equipe com acesso certo', 'Profissional, recepção e gerente veem só o que você liberar.'],
            ['Remuneração da equipe', 'Comissão calculada sozinha, bônus e vale descontado no pagamento, com o histórico de cada profissional.'],
            ['Pacotes de sessões', 'Venda o tratamento inteiro com preço fechado e validade. A cliente usa no agendamento e o saldo baixa sozinho.'],
            ['Campanhas pra quem sumiu', 'Veja quem não volta há tempo e mande um cupom pelo WhatsApp. Aniversariantes do dia com desconto pronto.'],
            ['Atendimento que se repete', 'Toda semana, a cada 2 semanas ou todo mês: o tratamento inteiro marcado de uma vez.'],
            ['Lista de espera', 'Horário cheio no link? A cliente entra na fila e recebe um aviso por e-mail se a vaga abrir.'],
            ['Suporte que ajusta', 'Fale no WhatsApp com quem faz o sistema. Sugestão de cliente já virou recurso em 2 dias.'],
          ].map(([t, d]) => (
            <li key={t} style={{ padding: '22px 22px 20px', borderRadius: 22, background: 'rgba(255,255,255,0.75)', boxShadow: '0 16px 40px rgba(94,84,75,0.08)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800 }}>{t}</h3>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: MARROM }}>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* planos */}
      <section id="planos" aria-labelledby="t-planos" style={{ padding: '72px 16px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 id="t-planos" style={H2}>Planos</h2>
        <p style={{ textAlign: 'center', margin: '0 0 30px', fontSize: 18 }}>{PRICING.trial.dias} dias grátis em qualquer plano · sem cartão · sem fidelidade · garantia de {PRICING.garantia.diasReembolso} dias depois de assinar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
          {[
            { nome: solo.nome, preco: solo.mensalidadeFormatada, ano: `ou R$ ${calcularPreco('solo', 'anual_pix').valorReais} no ano (2 meses grátis)`, itens: ['Você + 1 profissional', 'Todas as funções desta página', 'Sem acesso de recepção'], cta: 'Testar grátis', href: CADASTRO },
            { nome: equipe.nome, preco: equipe.mensalidadeFormatada, ano: `ou R$ ${calcularPreco('equipe', 'anual_pix').valorReais} no ano (2 meses grátis)`, itens: ['Até 5 profissionais', '+ 1 acesso de recepção', 'Todas as funções desta página'], cta: 'Testar grátis', href: CADASTRO, destaque: true },
            { nome: 'Sob medida', preco: 'Sob consulta', ano: '', itens: ['Mais de 5 profissionais ou várias unidades', 'Sistema ajustado ao jeito da sua clínica'], cta: 'Falar com um especialista', href: '/especialista' },
          ].map((pl) => (
            <div key={pl.nome} style={{ padding: 28, borderRadius: 26, background: pl.destaque ? TAUPE : 'rgba(255,255,255,0.8)', color: pl.destaque ? CREME : TAUPE, boxShadow: '0 20px 50px rgba(94,84,75,0.12)' }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{pl.nome}</h3>
              <p style={{ margin: '8px 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38 }}>{pl.preco}{pl.preco.startsWith('R$') && <span style={{ fontSize: 16, fontWeight: 600 }}>/mês</span>}</p>
              {pl.ano && <p style={{ margin: '-10px 0 14px', fontSize: 14, opacity: 0.8 }}>{pl.ano}</p>}
              <ul style={{ margin: '0 0 22px', paddingLeft: 18, lineHeight: 1.7 }}>{pl.itens.map((i) => <li key={i}>{i}</li>)}</ul>
              {pl.href === '/especialista'
                ? <CtaLink local={`plano-${pl.nome.toLowerCase().replace(/\s+/g, '-')}`} href={pl.href} destino="especialista" style={{ ...botao, background: pl.destaque ? CREME : TAUPE, color: pl.destaque ? TAUPE : CREME, fontSize: 16 }}>{pl.cta}</CtaLink>
                : <CtaTestar local={`plano-${pl.nome.toLowerCase()}`} style={{ ...botao, background: pl.destaque ? CREME : TAUPE, color: pl.destaque ? TAUPE : CREME, fontSize: 16 }}>{pl.cta}</CtaTestar>}
            </div>
          ))}
        </div>
      </section>

      {/* perguntas */}
      <section aria-labelledby="t-faq" style={{ padding: '56px 16px 90px', maxWidth: 820, margin: '0 auto' }}>
        <h2 id="t-faq" style={H2}>Perguntas frequentes</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ marginTop: 12, padding: '18px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.8)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 18 }}>{f.q}</summary>
            <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.55, color: MARROM }}>{f.a}</p>
          </details>
        ))}
        <div style={{ textAlign: 'center', marginTop: 40 }}><CtaTestar local="final" style={botao}>Testar {PRICING.trial.dias} dias grátis</CtaTestar></div>
      </section>
    </main>
  )
}
