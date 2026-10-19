'use client'
/* ═══════════════════════════════════════════════════════════
   O FILME DA PÁGINA /clinicas (18/10/2026 · ideia do Eduardo)
   "Uma experiência do usuário no site como se estivesse em um vídeo,
   onde ele tem controle da execução."
   · cada capítulo é uma seção alta; o palco fica preso (sticky) e a
     rolagem dentro da seção vira o progresso p (0 → 1) da cena;
   · a velocidade da rolagem é SEMPRE a do dedo da pessoa (nada sequestra);
   · "Assistir" rola sozinho no ritmo da narração e para no primeiro toque;
   · o texto da narração é HTML de verdade (Google lê, leitor de tela lê);
   · "reduzir movimento" no celular → mostra a tela final parada + o texto.
   ═══════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from 'react'
import { IPhone, IPad, MacBook, JanelaSistema, ConversaWhatsApp, Lupa, Assinatura, faixa, Passo } from './aparelhos'

const C = (s: string) => `/clinicas/cap1/${s}.webp`
const CREME = '#F7F2EB', TAUPE = '#5E544B'
const DOURADO = 'linear-gradient(100deg,#E3C28E 0%,#C9974A 50%,#8C7360 100%)'

/** progresso da rolagem dentro da seção (0 no topo, 1 quando a seção acaba) */
function useProgresso(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const ler = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      setP(Math.min(1, Math.max(0, -r.top / Math.max(1, total))))
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(ler) }
    ler()
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    return () => { window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); cancelAnimationFrame(raf) }
  }, [ref])
  return p
}

/** largura da janela lida DEPOIS de montar (no servidor vale 390: o celular é o caso principal) */
function useLargura() {
  const [w, setW] = useState(390)
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return w
}
function useAltura() {
  const [h, setH] = useState(844)
  useEffect(() => { const f = () => setH(window.innerHeight); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return h
}

function useReduzir() {
  const [r, setR] = useState(false)
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); setR(m.matches); const f = () => setR(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return r
}

/** legenda da narração: troca conforme p, palavra-chave em dourado */
type Fala = { de: number; ate: number; texto: React.ReactNode }
const Narracao: React.FC<{ p: number; falas: Fala[] }> = ({ p, falas }) => (
  <div style={{ position: 'relative', minHeight: 110, width: '100%', maxWidth: 880, padding: '14px 22px', borderRadius: 24, background: 'rgba(247,242,235,0.92)', boxShadow: '0 10px 30px rgba(94,84,75,0.10)', boxSizing: 'border-box' }}>
    {falas.map((f, i) => {
      const o = Math.min(f.de <= 0 ? 1 : faixa(p, f.de, f.de + 0.015), 1 - faixa(p, f.ate - 0.015, f.ate)) // a 1ª fala já aparece no começo do filme
      return (
        <p key={i} style={{ position: i ? 'absolute' : 'relative', inset: i ? '14px 22px' : 0, margin: 0, textAlign: 'center', fontSize: 'clamp(19px, 2.4vw, 26px)', lineHeight: 1.35, fontWeight: 700, color: TAUPE, opacity: o, transform: `translateY(${(1 - o) * 10}px)`, transition: 'none' }}>{f.texto}</p>
      )
    })}
  </div>
)
const Ouro: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600, backgroundImage: DOURADO, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontSize: '1.15em' }}>{children}</span>

/* ─────────────── CAPÍTULO 1 · AGENDA ───────────────
   Ordem (revisão do Eduardo 18/10): a dor → "2 jeitos de agendar" → JEITO 1 você marca (balcão/WhatsApp)
   → JEITO 2 a cliente marca sozinha (link) → o que é o SINAL (explicado ANTES do Pix) → Pix → fecho.
   Cada jeito tem etiqueta fixa: quem assiste nunca confunde os dois. */
const T = {
  wpp: [0, 0.11], jeitos: [0.11, 0.17], j1: [0.17, 0.47], troca: [0.47, 0.52], j2: [0.52, 0.8], sinal: [0.8, 0.88], pix: [0.88, 0.95], fim: [0.95, 1.01],
}
const passosBalcao: Passo[] = [{ img: C('bhd-02-horario-vazio-antes'), de: 0 }, { img: C('bhd-03-horario-vazio'), de: 0.225 }]
const passosLink: Passo[] = [
  { img: C('r-02-link-sem-modal'), de: 0 }, { img: C('r-03-agendar-antes'), de: 0.535 }, { img: C('r-04-agendar'), de: 0.555 },
  { img: C('r-05-servico-antes'), de: 0.575 }, { img: C('r-06-servico'), de: 0.59 }, { img: C('r-07-continuar-antes'), de: 0.61 }, { img: C('r-08-continuar'), de: 0.625 },
  { img: C('r-09-profissional-antes'), de: 0.645 }, { img: C('r-10-profissional'), de: 0.66 }, { img: C('r-11-dia-antes'), de: 0.68 }, { img: C('r-12-dia'), de: 0.695 },
  { img: C('r-13-horario-antes'), de: 0.715 }, { img: C('r-14-horario'), de: 0.73 }, { img: C('r-16-nome'), de: 0.745 },
  { img: C('r-17-confirmar-antes'), de: 0.79 }, { img: C('r-19-pos-confirmar'), de: 0.9 },
]
const toquesLink = [{ x: 195, y: 425, em: 0.553 }, { x: 153, y: 422, em: 0.588 }, { x: 311, y: 810, em: 0.623 }, { x: 139, y: 478, em: 0.658 }, { x: 149, y: 115, em: 0.693 }, { x: 149, y: 594, em: 0.728 }, { x: 195, y: 650, em: 0.898 }]

/** etiqueta fixa que diz QUEM está marcando (jeito 1 ou 2) */
const Etiqueta: React.FC<{ n: number; texto: string; o: number }> = ({ n, texto, o }) => (
  <div style={{ position: 'absolute', left: '50%', top: 8, transform: `translateX(-50%) translateY(${(1 - o) * -10}px)`, opacity: o, zIndex: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 8px', borderRadius: 999, background: TAUPE, color: CREME, fontWeight: 800, fontSize: 'clamp(13px, 1.6vw, 16px)', whiteSpace: 'nowrap', boxShadow: '0 10px 24px rgba(94,84,75,0.25)' }}>
    <span style={{ width: 28, height: 28, borderRadius: '50%', background: DOURADO, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>{n}</span>{texto}
  </div>
)
/** cartão de passagem em tela cheia (escolhas e explicações) */
const Cartao: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => (
  <div style={{ position: 'absolute', inset: 0, display: o > 0 ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', padding: 16, opacity: o, transform: `scale(${0.96 + 0.04 * o})`, pointerEvents: 'none', zIndex: 9 }}>
    <div style={{ width: '100%', maxWidth: 640, padding: 'clamp(22px, 4vw, 40px)', borderRadius: 30, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.18)', color: TAUPE }}>{children}</div>
  </div>
)
const janela = (p: number, [de, ate]: number[], borda = 0.015) => Math.max(0, Math.min(faixa(p, de, de + borda), 1 - faixa(p, ate - borda, ate)))

/** etapas do link (as mesmas do app: "1 de 5") + sinal + reservado: a pessoa sempre sabe onde está e quanto falta */
const ETAPAS: [string, string, number][] = [['Serviço', 'preço, duração e pontos', 0.553], ['Profissional', 'quem vai atender', 0.623], ['Data', 'os dias com vaga', 0.658], ['Horário', 'livres em verde', 0.693], ['Seus dados', 'WhatsApp e nome', 0.728], ['Sinal', 'parte do valor no Pix', 0.8], ['Reservado', 'pronto, sem mensagem', 0.9]]
const Trilha: React.FC<{ p: number; largo: boolean }> = ({ p, largo }) => {
  const atual = ETAPAS.reduce((a, e, i) => (p >= e[2] ? i : a), 0)
  if (!largo) {
    const [nome, desc] = ETAPAS[atual]
    return (
      <div style={{ position: 'absolute', left: '50%', top: 54, transform: 'translateX(-50%)', zIndex: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: '#fff', boxShadow: '0 8px 20px rgba(94,84,75,0.15)', fontSize: 13, fontWeight: 700, color: TAUPE, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', gap: 3 }}>{ETAPAS.map((_, i) => <span key={i} style={{ width: i === atual ? 16 : 6, height: 6, borderRadius: 3, background: i <= atual ? '#C9974A' : 'rgba(94,84,75,0.2)', transition: 'width .3s' }} />)}</span>
        {nome} · <span style={{ fontWeight: 500, color: '#8C7360' }}>{desc}</span>
      </div>
    )
  }
  return (
    <ol aria-label="Etapas do agendamento pelo link" style={{ position: 'absolute', left: '4%', top: '50%', transform: 'translateY(-50%)', margin: 0, padding: 0, listStyle: 'none', zIndex: 8, width: 250 }}>
      {ETAPAS.map(([nome, desc], i) => {
        const feito = i < atual, agora = i === atual
        return (
          <li key={nome} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', opacity: agora ? 1 : feito ? 0.75 : 0.4, transform: `translateX(${agora ? 8 : 0}px)`, transition: 'all .3s' }}>
            <span style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: feito || agora ? '#fff' : TAUPE, background: feito || agora ? DOURADO : 'rgba(94,84,75,0.1)', boxShadow: agora ? '0 0 0 5px rgba(201,151,74,0.2)' : 'none' }}>{feito ? '✓' : i + 1}</span>
            <span><b style={{ color: TAUPE, fontSize: 16 }}>{nome}</b><br /><span style={{ fontSize: 13, color: '#8C7360' }}>{desc}</span></span>
          </li>
        )
      })}
    </ol>
  )
}
/** o aparelho aproxima do detalhe que vende: o serviço com preço e pontos, os horários livres, o R$ 66 do sinal */
const zoomLink = (p: number) => {
  const a = janela(p, [0.59, 0.622], 0.01), b = janela(p, [0.697, 0.727], 0.01), c = janela(p, [0.905, 0.95], 0.012)
  return { s: 1 + 0.42 * a + 0.32 * b + 0.38 * c, y: a ? 430 : b ? 470 : c ? 230 : 422 }
}

function CapAgenda({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.93 : p0
  // pula o filme pra um ponto (toque que a pessoa dá no aparelho)
  const irPara = (q: number) => () => { const el = ref.current; if (el) window.scrollTo({ top: el.offsetTop + q * (el.offsetHeight - window.innerHeight), behavior: 'smooth' }) }
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7) // o notebook cabe também na altura (tablet deitado)
  const wForm = Math.min(largo ? 470 : tela * 0.8, 520, (alto - 330) * (573 / 807))
  const toques = toquesLink.filter((t) => p >= t.em).length
  const recua = faixa(p, 0.265, 0.285)
  const FORM = { x: 433, y: 46, w: 573, h: 807 }, BUSCA = { x: 497, y: 81, w: 445, h: 112 }, OK = { x: 529, y: 296, w: 381, h: 247 }
  const sinal = janela(p, T.sinal, 0.012)
  const titulo = p < T.jeitos[1] ? <>Todo dia, <Ouro>“tem horário amanhã?”</Ouro></> : p < T.troca[0] ? <>Jeito 1: <Ouro>você marca</Ouro></> : p < T.sinal[0] ? <>Jeito 2: <Ouro>ela marca sozinha</Ouro></> : p < T.fim[0] ? <>O sinal <Ouro>garante o horário</Ouro></> : <>Os dois jeitos, <Ouro>na mesma agenda</Ouro></>
  return (
    <>
    {/* abertura do capítulo: antes de ver, a pessoa sabe o que vai ver (regra do Eduardo: sempre contexto) */}
    <section id="agenda" aria-labelledby="t-agenda-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 1 · AGENDA · 1 MIN</p>
        <h2 id="t-agenda-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Como a agenda da sua clínica <Ouro>enche</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['A dor de hoje', 'o “tem horário amanhã?” às 23h no WhatsApp'], ['Jeito 1 · você marca', 'no balcão ou pelo WhatsApp, em segundos'], ['Jeito 2 · a cliente marca sozinha', 'pelo seu link, etapa por etapa'], ['O sinal', 'o que é e como ele garante o horário']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
        <p style={{ margin: '18px 0 0', fontSize: 15, color: '#8C7360' }}>Role a tela pra assistir no seu ritmo, ou toque em <b>▶ Assistir</b> lá em cima.</p>
      </div>
    </section>
    <section ref={ref} id="filme-agenda" data-filme="45" aria-labelledby="t-agenda" style={{ position: 'relative', height: reduzir ? 'auto' : '720vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-agenda" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: WhatsApp a noite toda */}
          {p < T.jeitos[0] + 0.02 && (
            <div style={{ position: 'absolute', opacity: 1 - faixa(p, T.wpp[1] - 0.012, T.wpp[1] + 0.008), pointerEvents: 'none' }}>
              <IPhone p={p} w={wPhone} rotulo="Conversa de WhatsApp: cliente pergunta se tem horário amanhã às 23h47">
                {(k) => <ConversaWhatsApp p={p} k={k} nome="Ana Beatriz"
                  historico={[{ de: 'ela', t: 'Oi! Vocês fazem limpeza de pele?', hora: '18:02' }, { de: 'eu', t: 'Fazemos sim! A intensiva é R$ 220 😊', hora: '18:10' }, { de: 'ela', t: 'Vou ver minha agenda e te chamo', hora: '18:14' }]}
                  msgs={[{ de: 'ela', t: 'Oi! Tem horário amanhã? 🙏', em: 0.008, hora: '23:47' }, { de: 'eu', t: 'Oi, Ana! Amanhã tenho 14h ou 16h30', em: 0.038, hora: '23:52' }, { de: 'ela', t: '14h não consigo 😕 e sexta?', em: 0.058, hora: '23:55' }, { de: 'eu', t: 'Sexta só às 10h', em: 0.083, hora: '23:58' }, { de: 'ela', t: 'Vou ver aqui e te falo amanhã', em: 0.1, hora: '00:04' }]}
                  avisos={[{ t: 'Juliana: tem vaga hoje?', em: 0.045 }, { t: 'Carla: quanto é a limpeza?', em: 0.072 }]} />}
              </IPhone>
            </div>
          )}
          {/* os 2 jeitos de agendar */}
          <Cartao o={janela(p, T.jeitos)}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>NO AGENDAPRO</p>
            <p style={{ margin: '0 0 22px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>2 jeitos de <Ouro>agendar</Ouro></p>
            {[['1', 'Você marca', 'a cliente chamou no WhatsApp ou está no balcão'], ['2', 'Ela marca sozinha', 'pelo seu link, a qualquer hora']].map(([n, t, d]) => (
              <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <span style={{ flex: 'none', width: 42, height: 42, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20 }}>{n}</span>
                <span><b style={{ fontSize: 20 }}>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
          {/* JEITO 1 · você marca: agenda no MacBook, formulário flutuando na frente */}
          {p >= T.j1[0] - 0.01 && p < T.troca[1] && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T.j1[0], T.troca[0] + 0.02]) }}>
              <Etiqueta n={1} texto="VOCÊ MARCA · balcão ou WhatsApp" o={1} />
              <MacBook p={p} w={wMac} passos={passosBalcao} toques={[{ x: 996, y: 658, em: 0.224 }, { x: 995, y: 728, em: 0.264 }]} recua={recua}
                zoom={{ s: 1 + 0.85 * faixa(p, 0.18, 0.21), x: 980, y: 600 + 110 * faixa(p, 0.215, 0.235) }} rotulo="Agenda da clínica no computador, com os horários de cada profissional" />
              <JanelaSistema p={p} de={0.27} ate={0.445} regiao={FORM} w={wForm} rotulo="Formulário de novo agendamento"
                passos={[{ img: C('b-05-novo-atendimento'), de: 0 }, { img: C('b-10-cliente'), de: 0.385 }, { img: C('b-11-servico'), de: 0.415 }]}
                toques={[{ x: 720, y: 186, em: 0.3 }, { x: 720, y: 465, em: 0.413 }, { x: 949, y: 816, em: 0.442 }]} />
              <JanelaSistema p={p} de={0.305} ate={0.38} regiao={BUSCA} w={Math.min(wForm * 1.25, tela * 0.92)} rotulo="Busca da cliente pelo nome"
                passos={[{ img: C('b-07-selecionar-cliente'), de: 0 }, { img: C('b-08-buscar-cliente'), de: 0.355 }]}
                toques={[{ x: 562, y: 156, em: 0.378 }]}
                campos={[{ x: 529, y: 92, w: 300, h: 30, texto: 'Mariana', de: 0.325, ate: 0.35, vazio: 'Buscar cliente por nome ou telefone', tam: 15, some: 0.355 }]} />
              <JanelaSistema p={p} de={0.455} regiao={OK} w={Math.min(wForm * 1.1, tela * 0.9)} passos={[{ img: C('b-14-agenda-com-novo'), de: 0 }]} rotulo="Atendimento criado com sucesso" />
            </div>
          )}
          {/* passagem pro jeito 2 */}
          <Cartao o={janela(p, T.troca, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>JEITO 2</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>A cliente marca <Ouro>sozinha</Ouro>, pelo seu link</p>
            <p style={{ margin: '14px 0 0', fontSize: 18, color: '#8C7360' }}>Às 23h, no domingo, sem precisar te chamar. Olha como é simples pra ela.</p>
          </Cartao>
          {/* JEITO 2 · ela marca sozinha: rota real no celular */}
          {p >= T.j2[0] - 0.01 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: faixa(p, T.j2[0] - 0.005, T.j2[0] + 0.01) }}>
              <Etiqueta n={2} texto="A CLIENTE MARCA · seu link" o={1 - faixa(p, T.fim[0], T.fim[0] + 0.01)} />
              {p >= 0.545 && p < T.fim[0] && <Trilha p={p} largo={largo} />}
              <div style={{ transform: `translateX(${largo ? 90 - 260 * sinal : 0}px)` }}>
                <IPhone p={p} w={wPhone} passos={passosLink} toques={toquesLink} rotulo="Link de agendamento da clínica no celular da cliente"
                  zoom={zoomLink(p)}
                  rolagem={{ img: C('r-cheia-servicos'), de: 0.558, ate: 0.586, y0: 0, y1: 588, alturaCss: 3958, cabecalho: 67 }}
                  extra={(k) => p >= 0.7 && p < 0.727 ? (
                    <button type="button" onClick={irPara(0.735)} aria-label="Tocar no horário 14:30" style={{ position: 'absolute', left: 149 * k - 46 * k, top: 594 * k - 26 * k, width: 92 * k, height: 52 * k, borderRadius: 14 * k, border: `${2.5 * k}px solid #C9974A`, background: 'rgba(227,194,142,0.18)', cursor: 'pointer', animation: 'pulsar 1.1s ease-in-out infinite', zIndex: 7 }}>
                      <span style={{ position: 'absolute', left: '50%', top: -30 * k, transform: 'translateX(-50%)', padding: `${3 * k}px ${9 * k}px`, borderRadius: 999, background: TAUPE, color: CREME, fontSize: 12 * k, fontWeight: 800, whiteSpace: 'nowrap' }}>toque aqui</span>
                    </button>
                  ) : null}
                  campos={[{ x: 46, y: 404, w: 300, h: 36, texto: '(11) 97731-2845', de: 0.745, ate: 0.765, vazio: '(99) 99999-9999', some: 0.79 }, { x: 46, y: 492, w: 300, h: 36, texto: 'Beatriz Lima', de: 0.768, ate: 0.785, vazio: 'Ex: João Silva', some: 0.79 }]} />
              </div>
              {toques > 0 && p < T.fim[0] && <div style={{ position: 'absolute', right: '5%', top: 58, padding: '8px 18px', borderRadius: 999, background: '#fff', color: TAUPE, fontWeight: 900, fontSize: 17, boxShadow: '0 8px 20px rgba(94,84,75,0.15)' }}>{toques} {toques === 1 ? 'toque' : 'toques'}</div>}
            </div>
          )}
          {/* o que é o SINAL (antes de aparecer o Pix) */}
          {sinal > 0 && (
            <div style={{ position: 'absolute', ...(largo ? { right: '5%', top: '50%', transform: `translateY(-50%) translateX(${(1 - sinal) * 30}px)`, maxWidth: 400 } : { left: 12, right: 12, bottom: 12, transform: `translateY(${(1 - sinal) * 30}px)` }), opacity: sinal, padding: 24, borderRadius: 26, background: '#fff', boxShadow: '0 30px 70px rgba(60,48,38,0.2)', color: TAUPE, zIndex: 9, pointerEvents: 'none' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>E O SINAL?</p>
              <p style={{ margin: '0 0 12px', fontSize: 18, lineHeight: 1.45 }}>É uma parte do valor que a cliente paga <b>no Pix, na hora de agendar</b>. Garante o horário e <b>diminui a falta</b>. Você escolhe se cobra e quanto.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, background: CREME, fontWeight: 800 }}>
                <span>30% de R$ 220</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#C9974A' }}>R$ 66</span>
              </div>
            </div>
          )}
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T.wpp[1], texto: <>Você que tem clínica conhece: <b>“tem horário amanhã?”</b> às 23h, no WhatsApp.</> },
          { de: T.jeitos[0], ate: T.jeitos[1], texto: <>No AgendaPRO, a agenda funciona dos <b>dois jeitos</b>.</> },
          { de: T.j1[0], ate: 0.27, texto: <><b>Jeito 1:</b> a cliente chamou no WhatsApp ou está no balcão. Quem marca é <b>você</b>.</> },
          { de: 0.27, ate: T.j1[1], texto: <>Abre a agenda, toca no horário livre, escolhe a cliente e o serviço. <Ouro>Pronto, em segundos.</Ouro></> },
          { de: T.troca[0], ate: T.troca[1], texto: <><b>Jeito 2:</b> a cliente marca sozinha, pelo seu link.</> },
          { de: T.j2[0], ate: 0.66, texto: <>Ela escolhe o serviço já vendo <b>preço e pontos</b>, e a profissional.</> },
          { de: 0.66, ate: T.j2[1], texto: <>Depois o dia, o horário livre, o WhatsApp e o nome.</> },
          { de: T.sinal[0], ate: T.sinal[1], texto: <>E pra garantir o horário, ela paga o <Ouro>sinal no Pix</Ouro>, uma parte do valor.</> },
          { de: T.pix[0], ate: T.pix[1], texto: <>Horário reservado. Sem você responder nenhuma mensagem.</> },
          { de: T.fim[0], ate: 1.01, texto: <><b>7 toques e 2 campos.</b> “Seu autocuidado agora é simples.” — Wanessa Silva, esteticista</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 2 · ANTES DELA CHEGAR ───────────────
   Revisão do Eduardo (18/10): lembrete manual é rápido, sem tanto detalhe; o destaque é a FICHA.
   Uma cliente só do começo ao fim (Marcela, a mesma da agenda): véspera → lembrete pronto → ela confirma →
   na mesma conversa vai o link da ficha → ela responde e assina no celular → a ficha chega no cadastro dela.
   Depois o outro caminho: na recepção, no iPad (outra cliente, protocolo de toxina com desenho do rosto).
   Telas reais da conta de demonstração. No painel o dono não tem botão "marcar confirmado": não mostramos o card mudando. */
const C2 = (s: string) => `/clinicas/cap2/${s}.webp`
const T2 = { lemb: [0, 0.16], wpp1: [0.16, 0.27], mandar: [0.27, 0.34], wpp2: [0.34, 0.43], ficha: [0.43, 0.74], chegou: [0.74, 0.82], troca: [0.82, 0.85], ipad: [0.85, 0.95], fim: [0.95, 1.01] }
const LEMBRETE = 'Olá Marcela Azevedo! Posso confirmar seu atendimento de Limpeza de Pele Intensiva no dia 19/10/2026 às 09:00?'
// texto que o sistema monta (o link verdadeiro tem um código longo; aqui vai um curto e fictício)
const MSG_FICHA = 'Oi, Marcela! Tudo bem? Aqui é do Studio Aurora Estética.\n\nPra deixar tudo pronto pro seu atendimento, preencha sua ficha por este link. Leva poucos minutos e você assina pelo próprio celular:\n\nagendapro.net.br/ficha/7Hq2xK'
// ficha preenchida (página inteira 390 x 4837): medicação em y 808, assinatura em y 4557, botão em y 4748
const FICHA = { altura: 4837, med: 428, ass: 4197 }
const FICHA_Y_ASS = 4557 - FICHA.ass + 47 // topo do quadro da assinatura na tela, com a rolagem parada nele
const rolFicha = (p: number) => p < 0.5 ? FICHA.med * suaveF(faixa(p, 0.46, 0.5)) : p < 0.555 ? FICHA.med : FICHA.med + (FICHA.ass - FICHA.med) * suaveF(faixa(p, 0.555, 0.655))
function suaveF(a: number) { return a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2 }
// a assinatura que a cliente fez (mesmo traço da gravação), no quadro de 290 x 132
const TRACO = Array.from({ length: 41 }, (_, i) => { const k = i / 40; return [0.16 + k * 0.6, 0.55 - 0.16 * Math.sin(k * Math.PI * 3.2) * (1 - k * 0.5) + 0.05 * Math.cos(k * 19)] })
const IMGS_CAP2 = ['note-01-amanha-aguardando', 'note-03-lembrete-antes', 'fone-01-amanha-aguardando', 'fone-03-lembrete-antes', 'ipad-mandar-ficha', 'link-abre', 'link-preenchida', 'link-enviada', 'ipad-recebeu', 'ipad-ve-assinatura', 'ipad-04-adicionar-ficha', 'ipad-06-toxina', 'ipad-08-check-1', 'ipad-09-observacao', 'ipad-10-desenho-rosto', 'ipad-13-assinatura', 'ipad-16-depois-de-assinar'].map(C2)

/** baixa as telas do capítulo quando a abertura dele aparece (o filme não pisca em branco) */
function usePreCarregar(ref: React.RefObject<HTMLElement | null>, urls: string[]) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { urls.forEach((u) => { const i = new Image(); i.decoding = 'async'; i.src = u }); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, urls])
}

function CapAntes({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP2)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.78 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7) // o notebook cabe também na altura (tablet deitado)
  const wIpad = Math.min(largo ? 470 : tela * 0.84, (alto - 330) / 1.5)
  const em = (seg: number[]) => p >= seg[0] - 0.01 && p < seg[1] + 0.012
  const op = (seg: number[]) => janela(p, [seg[0], seg[1] + 0.008], 0.012)
  const titulo = p < T2.wpp1[0] ? <>Véspera: lembrete <Ouro>em um toque</Ouro></> : p < T2.mandar[0] ? <>Ela <Ouro>confirma</Ouro></> : p < T2.ficha[0] ? <>E já vai a <Ouro>ficha</Ouro></> : p < 0.655 ? <>Ela preenche <Ouro>no celular</Ouro></> : p < T2.chegou[0] ? <>E assina <Ouro>com o dedo</Ouro></> : p < T2.troca[0] ? <>Chega na clínica <Ouro>sozinha</Ouro></> : p < T2.fim[0] ? <>Ou na hora, <Ouro>no iPad</Ouro></> : <>Ela chega <Ouro>pronta</Ouro></>
  // lembrete: agenda de amanhã (selos "A CONFIRMAR") → card da Marcela → Enviar WhatsApp
  const lembPassos: Passo[] = largo ? [{ img: C2('note-01-amanha-aguardando'), de: 0 }, { img: C2('note-03-lembrete-antes'), de: 0.07 }] : [{ img: C2('fone-01-amanha-aguardando'), de: 0 }, { img: C2('fone-03-lembrete-antes'), de: 0.07 }]
  const lembToques = largo ? [{ x: 922, y: 397, em: 0.062 }, { x: 1212, y: 484, em: 0.135 }] : [{ x: 283, y: 540, em: 0.062 }, { x: 195, y: 543, em: 0.135 }]
  const conversa = [
    { de: 'eu' as const, t: LEMBRETE, em: 0.2, hora: '18:30', pronto: true },
    { de: 'ela' as const, t: 'Confirmadíssimo! Até amanhã 😍', em: 0.245, hora: '18:34' },
    { de: 'eu' as const, t: MSG_FICHA, em: 0.375, hora: '18:36', pronto: true },
    { de: 'ela' as const, t: 'Oba, já vou preencher! 🙌', em: 0.41, hora: '18:37' },
  ]
  const zap = (o: number, n: number) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o }}>
      <Etiqueta n={n} texto="DO SEU WHATSAPP · com o seu nome" o={1} />
      <div style={{ marginTop: 36 }}>
        <IPhone p={p} w={wPhone} rotulo="WhatsApp da clínica: lembrete pronto, a cliente confirma e recebe o link da ficha">
          {(k) => <ConversaWhatsApp p={p} k={k} nome="Marcela Azevedo" historico={[{ de: 'eu', t: 'Seu horário ficou marcado: segunda, 9h, com a Camila 💜', hora: '15:12' }]} msgs={conversa} />}
        </IPhone>
      </div>
    </div>
  )
  // ficha no celular dela: progresso das respostas + zoom na medicação e na assinatura
  const ry = rolFicha(p)
  const respondida = Math.round(100 * Math.min(1, ry / FICHA.ass))
  // lupa: no notebook fica ao lado (o aparelho anda pra esquerda); no celular sobe por baixo
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -190 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const PAG = { w: 390, h: FICHA.altura }, TELA_IPAD = { w: 820, h: 1180 }
  return (
    <>
    <section ref={abre} id="antes" aria-labelledby="t-antes-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 2 · ANTES DELA CHEGAR · 1 MIN</p>
        <h2 id="t-antes-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Ela chega confirmada e com a <Ouro>ficha assinada</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['O lembrete em um toque', 'na véspera, pronto, do seu WhatsApp'], ['A ficha indo pelo link', 'na mesma conversa, sem papel'], ['Ela preenche e assina no celular', 'e a ficha chega sozinha no cadastro dela'], ['Ou na hora, no iPad', 'na recepção, com desenho do rosto e assinatura']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-antes" data-filme="60" aria-labelledby="t-antes" style={{ position: 'relative', height: reduzir ? 'auto' : '820vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-antes" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* 1 · lembrete, curto */}
          {em(T2.lemb) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - faixa(p, T2.lemb[1] - 0.004, T2.lemb[1] + 0.008) }}>
              <Etiqueta n={1} texto="VÉSPERA · amanhã, 6 horários" o={1} />
              {largo
                ? <MacBook p={p} w={wMac} passos={lembPassos} toques={lembToques} rotulo="Agenda de amanhã no computador, com os horários a confirmar" />
                : <IPhone p={p} w={wPhone} passos={lembPassos} toques={lembToques} barra rotulo="Agenda de amanhã no celular, com os horários a confirmar"
                    extra={(k) => p < 0.055 ? [[131, 658], [271, 714]].map(([x, y]) => <div key={x} style={{ position: 'absolute', left: (x - 46) * k, top: (y + 47 - 14) * k, width: 92 * k, height: 28 * k, borderRadius: 10 * k, border: `${2.5 * k}px solid #C9974A`, animation: 'pulsar 1.1s ease-in-out infinite', pointerEvents: 'none' }} />) : null} />}
            </div>
          )}
          {/* 2 · WhatsApp: lembrete pronto, ela confirma */}
          {em(T2.wpp1) && zap(op(T2.wpp1), 2)}
          {/* 3 · na ficha dela: Adicionar ficha → Mandar pra cliente preencher */}
          {em(T2.mandar) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op(T2.mandar) }}>
              <Etiqueta n={3} texto="NO CADASTRO DELA · Adicionar ficha" o={1} />
              {lado(janela(p, [0.285, 0.335], 0.012),
                <IPad p={p} w={wIpad} passos={[{ img: C2('ipad-mandar-ficha'), de: 0 }]} toques={[{ x: 335, y: 257, em: 0.315 }]} rotulo="Lista de fichas da clínica com a opção Mandar pra cliente preencher" />,
                <Lupa p={p} de={0.285} ate={0.335} img={C2('ipad-mandar-ficha')} fonte={TELA_IPAD} regiao={{ x: 206, y: 150, w: 408, h: 180 }} w={wLupa} titulo="MANDAR PRA CLIENTE PREENCHER" toques={[{ x: 335, y: 257, em: 0.315 }]} />)}
            </div>
          )}
          {/* 4 · WhatsApp: o link da ficha sai pronto */}
          {em(T2.wpp2) && zap(op(T2.wpp2), 4)}
          {/* 5 · a ficha no celular dela: responde, digita, assina, envia */}
          {em(T2.ficha) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op(T2.ficha) }}>
              <Etiqueta n={5} texto="NO CELULAR DELA · pelo link" o={1} />
              <div style={{ position: 'absolute', left: '50%', top: 54, transform: 'translateX(-50%)', zIndex: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 999, background: '#fff', boxShadow: '0 8px 20px rgba(94,84,75,0.15)', fontSize: 13, fontWeight: 700, color: TAUPE, whiteSpace: 'nowrap' }}>
                {p >= 0.72 ? <>Ficha enviada ✓</> : <>Anamnese · <span style={{ display: 'inline-block', width: 70, height: 6, borderRadius: 3, background: 'rgba(94,84,75,0.15)', overflow: 'hidden', verticalAlign: 'middle' }}><span style={{ display: 'block', width: `${p >= 0.7 ? 100 : respondida}%`, height: '100%', background: DOURADO }} /></span> {p >= 0.655 ? 'assinar' : `${respondida}%`}</>}
              </div>
              {lado(Math.max(janela(p, [0.5, 0.555], 0.012), janela(p, [0.655, 0.722], 0.012)), <>
                <IPhone p={p} w={wPhone} barra rotulo="Ficha de anamnese aberta pelo link no celular da cliente, sendo respondida e assinada"
                  passos={[{ img: C2('link-abre'), de: 0 }, { img: C2('link-enviada'), de: 0.725, corte: true }]}
                  rolagem={{ img: C2('link-preenchida'), de: 0.46, ate: 0.725, y0: 0, y1: FICHA.ass, alturaCss: FICHA.altura, cabecalho: 0, y: rolFicha }}
                  campos={[{ x: 56, y: 816 - FICHA.med + 47, w: 270, h: 28, texto: 'Vitamina D e colágeno', de: 0.51, ate: 0.545, vazio: '', tam: 16, some: 0.555 }]}
                  toques={[{ x: 195, y: 4772 - FICHA.ass, em: 0.708 }]}
                  extra={(k) => p >= 0.655 && p < 0.725 ? <Assinatura p={p} de={0.665} ate={0.7} pts={TRACO} x={50} y={FICHA_Y_ASS} w={290} h={132.5} k={k} /> : null} />
              </>, <>
                <Lupa p={p} de={0.5} ate={0.555} img={C2('link-preenchida')} fonte={PAG} regiao={{ x: 30, y: 745, w: 330, h: 165 }} w={wLupa} titulo="ELA DIGITA A MEDICAÇÃO"
                  campos={[{ x: 56, y: 816, w: 270, h: 28, texto: 'Vitamina D e colágeno', de: 0.51, ate: 0.545, vazio: '', tam: 16, some: 0.555 }]} />
                <Lupa p={p} de={0.655} ate={0.71} img={C2('link-preenchida')} fonte={PAG} regiao={{ x: 30, y: 4515, w: 330, h: 300 }} w={wLupa} titulo="ASSINA COM O DEDO E ENVIA"
                  toques={[{ x: 195, y: 4772, em: 0.708 }]}>{(k) => <Assinatura p={p} de={0.665} ate={0.7} pts={TRACO} x={50} y={4557} w={290} h={132.5} k={k} />}</Lupa>
              </>)}
            </div>
          )}
          {/* 6 · a clínica: a ficha chegou no cadastro dela, com a assinatura */}
          {em(T2.chegou) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op(T2.chegou) }}>
              <Etiqueta n={6} texto="NA CLÍNICA · chegou sozinha" o={1} />
              {lado(janela(p, [0.748, 0.79], 0.012),
                <IPad p={p} w={wIpad} passos={[{ img: C2('ipad-recebeu'), de: 0 }, { img: C2('ipad-ve-assinatura'), de: 0.785, corte: true }]} toques={[{ x: 552, y: 922, em: 0.778 }]}
                  extra={(k) => p >= 0.748 && p < 0.78 ? <div style={{ position: 'absolute', left: 170 * k, top: 884 * k, width: 480 * k, height: 70 * k, borderRadius: 16 * k, boxShadow: `0 0 0 ${3 * k}px rgba(201,151,74,0.9), 0 0 ${26 * k}px rgba(227,194,142,0.8)`, animation: 'pulsar 1.1s ease-in-out infinite', pointerEvents: 'none' }} /> : null}
                  rotulo="Cadastro da cliente na clínica com a ficha preenchida pela cliente e a assinatura dela" />,
                <Lupa p={p} de={0.748} ate={0.79} img={C2('ipad-recebeu')} fonte={TELA_IPAD} regiao={{ x: 160, y: 868, w: 500, h: 110 }} w={wLupa} titulo="PREENCHIDA PELA CLIENTE" toques={[{ x: 552, y: 922, em: 0.778 }]} />)}
            </div>
          )}
          {/* passagem: o outro caminho */}
          <Cartao o={janela(p, T2.troca, 0.01)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>OUTRO JEITO</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Na hora, <Ouro>no iPad</Ouro> da recepção</p>
            <p style={{ margin: '14px 0 0', fontSize: 18, color: '#8C7360' }}>Cliente nova ou sem tempo de preencher antes? Ela responde e assina ali mesmo.</p>
          </Cartao>
          {/* 7 · na recepção, no iPad: protocolo de toxina com desenho do rosto */}
          {em(T2.ipad) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op(T2.ipad) }}>
              <Etiqueta n={7} texto="NA RECEPÇÃO · no iPad" o={1} />
              {lado(Math.max(janela(p, [0.883, 0.904], 0.008), janela(p, [0.908, 0.93], 0.008)),
                <IPad p={p} w={wIpad} rotulo="Ficha de protocolo no iPad: contraindicações, desenho dos pontos no rosto e assinatura da cliente"
                  passos={[{ img: C2('ipad-04-adicionar-ficha'), de: 0 }, { img: C2('ipad-06-toxina'), de: 0.859, corte: true }, { img: C2('ipad-08-check-1'), de: 0.866, corte: true }, { img: C2('ipad-09-observacao'), de: 0.872, corte: true }, { img: C2('ipad-10-desenho-rosto'), de: 0.881, corte: true }, { img: C2('ipad-13-assinatura'), de: 0.906, corte: true }, { img: C2('ipad-16-depois-de-assinar'), de: 0.937, corte: true }]}
                  toques={[{ x: 410, y: 748, em: 0.857 }, { x: 410, y: 581, em: 0.865 }, { x: 410, y: 960, em: 0.879 }, { x: 448, y: 801, em: 0.934 }]} />,
                <>
                  <Lupa p={p} de={0.883} ate={0.902} img={C2('ipad-10-desenho-rosto')} fonte={TELA_IPAD} regiao={{ x: 180, y: 860, w: 460, h: 240 }} w={wLupa} titulo="PONTOS DE APLICAÇÃO NO ROSTO" />
                  <Lupa p={p} de={0.908} ate={0.928} img={C2('ipad-13-assinatura')} fonte={TELA_IPAD} regiao={{ x: 180, y: 450, w: 460, h: 260 }} w={wLupa} titulo="ASSINATURA DA CLIENTE" />
                </>)}
            </div>
          )}
          {/* fecho */}
          <Cartao o={janela(p, T2.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>ANTES DELA CHEGAR</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Você só <Ouro>atende</Ouro></p>
            {[['Lembrete pronto', 'um toque, do seu WhatsApp'], ['Ficha pelo link ou no iPad', 'sem papel, assinada com o dedo'], ['Tudo no cadastro dela', 'pra abrir, imprimir ou baixar em PDF']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: 0.07, texto: <>Na véspera, a agenda de amanhã mostra quem está <b>a confirmar</b>.</> },
          { de: 0.07, ate: T2.lemb[1], texto: <>Um toque em <b>Enviar WhatsApp</b> e o lembrete sai pronto.</> },
          { de: T2.wpp1[0], ate: T2.wpp1[1], texto: <>Do seu número, com o seu nome. Ela confirma na conversa de sempre.</> },
          { de: T2.mandar[0], ate: T2.mandar[1], texto: <>E já manda a ficha: <b>Adicionar ficha</b> e <b>Mandar pra cliente preencher</b>.</> },
          { de: T2.wpp2[0], ate: T2.wpp2[1], texto: <>A mensagem com o link da ficha também sai <Ouro>pronta</Ouro>.</> },
          { de: T2.ficha[0], ate: 0.555, texto: <>Ela abre no celular e responde de onde estiver. <b>Sem papel.</b></> },
          { de: 0.555, ate: 0.655, texto: <>Saúde, alergias, medicação, cuidados com a pele: a ficha <b>da sua clínica</b>.</> },
          { de: 0.655, ate: T2.ficha[1], texto: <>No fim, assina <Ouro>com o dedo</Ouro> e envia.</> },
          { de: T2.chegou[0], ate: T2.chegou[1], texto: <>A ficha chega <b>preenchida e assinada</b> no cadastro dela.</> },
          { de: T2.troca[0], ate: T2.ipad[1], texto: <>Na recepção, no iPad: contraindicações, <b>pontos no rosto</b> e assinatura.</> },
          { de: T2.fim[0], ate: 1.01, texto: <>Ela chega confirmada e com a ficha assinada. <Ouro>Você só atende.</Ouro></> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 3 · COMANDA ───────────────
   Roteiro v2 #5 + pedido do Eduardo: "sempre abre comanda, onde pode adicionar mais serviços, produtos,
   mudar profissionais, dar desconto". A mesma Marcela: a comanda #283 já nasce com o sinal de R$ 66 descontado
   → + Spa (Larissa) → + Protetor (vendido pela Camila) → desconto R$ 25 → recebe R$ 424 = Pix 200 + crédito 224
   → paga (+80 pontos) → o protetor cai pra 2 e aparece como "Estoque baixo". Telas reais, conferidas no banco.
   Notebook com janelas flutuando (recortes nítidos) e lupas; no celular a comanda corta a tabela, então não usamos. */
const C3 = (s: string) => `/clinicas/cap3/${s}.webp`
const T3 = { dor: [0, 0.1], lista: [0.1, 0.18], aberta: [0.18, 0.26], itens: [0.26, 0.48], desc: [0.48, 0.58], pagar: [0.58, 0.79], paga: [0.79, 0.86], estoque: [0.86, 0.93], fim: [0.93, 1.01] }
const R_LISTA = { x: 432, y: 212, w: 576, h: 476 }, R_ITEM = { x: 432, y: 254, w: 576, h: 392 }, R_PAG_A = { x: 464, y: 234, w: 512, h: 432 }, R_PAG_B = { x: 464, y: 138, w: 512, h: 624 }
const IMGS_CAP3 = ['note-lista', 'note-aberta', 'note-desconto', 'note-paga', 'note-estoque', 'j-servicos', 'j-spa', 'j-spa-larissa', 'j-produtos', 'j-protetor', 'j-protetor-camila', 'j-receber', 'j-pix', 'j-pix-200', 'j-cartao', 'j-credito', 'j-confirmando'].map(C3)
// o caderno de antes: a conta vai sendo escrita e ninguém sabe o total
const CADERNO: [string, string, number][] = [['Limpeza de pele', '220', 0.012], ['+ spa pescoço', '150', 0.026], ['+ protetor solar', '145', 0.04], ['desconto?', '- 25', 0.054], ['e o sinal… já pagou?', '??', 0.068]]

function CapComanda({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP3)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.8 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7) // o notebook cabe também na altura (tablet deitado)
  const wj = (r: { w: number; h: number }) => Math.min(largo ? 520 : tela * 0.92, (alto - 360) * (r.w / r.h))
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const TELA_NOTE = { w: 1440, h: 900 }
  const recua = Math.max(janela(p, [0.27, 0.48], 0.015), janela(p, [0.59, 0.79], 0.015))
  const titulo = p < T3.lista[0] ? <>Quanto deu <Ouro>mesmo?</Ouro></> : p < T3.aberta[0] ? <>Todo agendamento <Ouro>abre a comanda</Ouro></> : p < T3.itens[0] ? <>O sinal <Ouro>já sai da conta</Ouro></> : p < T3.desc[0] ? <>Mais um serviço, <Ouro>mais um produto</Ouro></> : p < T3.pagar[0] ? <>Cada item com <Ouro>a sua profissional</Ouro></> : p < T3.paga[0] ? <>Divide o pagamento <Ouro>do jeito dela</Ouro></> : p < T3.estoque[0] ? <>Comanda <Ouro>paga</Ouro></> : p < T3.fim[0] ? <>O estoque <Ouro>baixa sozinho</Ouro></> : <>Tudo numa <Ouro>conta só</Ouro></>
  const etiqueta = p < T3.aberta[0] ? 'COMANDAS DO DIA · 19/10' : p < T3.pagar[0] ? 'COMANDA #283 · Marcela Azevedo' : p < T3.estoque[0] ? 'RECEBER · R$ 424 de R$ 490' : 'PRODUTOS · estoque'
  const nEtiqueta = p < T3.aberta[0] ? 1 : p < T3.pagar[0] ? 2 : p < T3.estoque[0] ? 3 : 4
  // fundo no notebook (troca seca entre telas de estados diferentes)
  const fundo: Passo[] = [{ img: C3('note-lista'), de: 0 }, { img: C3('note-aberta'), de: 0.18, corte: true }, { img: C3('note-desconto'), de: 0.48, corte: true }, { img: C3('note-paga'), de: 0.785, corte: true }, { img: C3('note-estoque'), de: 0.86, corte: true }]
  const toquesMac = [{ x: 848, y: 692, em: 0.172 }, { x: 1095, y: 313, em: 0.265 }, { x: 1132, y: 44, em: 0.585 }]
  const recibo = janela(p, [0.795, 0.857], 0.012)
  return (
    <>
    <section ref={abre} id="comanda" aria-labelledby="t-comanda-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 3 · COMANDA · 1 MIN</p>
        <h2 id="t-comanda-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Tudo que ela fez e comprou, <Ouro>numa conta só</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['A comanda que já nasce aberta', 'em todo agendamento, com o sinal descontado'], ['Mais um serviço e um produto', 'cada um com a profissional que atendeu ou vendeu'], ['Desconto e pagamento dividido', 'parte no Pix, parte no cartão'], ['O estoque baixando sozinho', 'e o aviso de estoque baixo']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-comanda" data-filme="60" aria-labelledby="t-comanda" style={{ position: 'relative', height: reduzir ? 'auto' : '860vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-comanda" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: a conta no caderno */}
          <Cartao o={1 - faixa(p, T3.dor[1] - 0.012, T3.dor[1])}>
            <div style={{ position: 'relative', padding: '4px 4px 4px 22px', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 37px, rgba(94,84,75,0.12) 37px 38px)', borderLeft: '2px solid rgba(201,151,74,0.35)' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CADERNO · SEGUNDA</p>
              {CADERNO.map(([t, v, em]) => {
                const o = faixa(p, em, em + 0.01)
                return <div key={t} style={{ display: 'flex', justifyContent: 'space-between', height: 38, alignItems: 'center', opacity: o, transform: `translateX(${(1 - o) * -12}px)`, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(20px, 2.6vw, 26px)', color: '#3f3a35' }}><span>{t}</span><span>{v}</span></div>
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 46, marginTop: 4, borderTop: '2px solid #3f3a35', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(24px, 3vw, 30px)', color: '#3f3a35', opacity: faixa(p, 0.078, 0.088) }}>
                <span>total =</span>
                <span style={{ display: 'flex', gap: 12 }}>{['515', '449', '424'].map((t, i) => <span key={t} style={{ position: 'relative', opacity: p >= 0.078 + i * 0.005 ? 1 : 0 }}>{t}<span style={{ position: 'absolute', left: -2, right: -2, top: '52%', height: 2, background: '#b4532a', transform: `scaleX(${faixa(p, 0.08 + i * 0.005, 0.083 + i * 0.005)})`, transformOrigin: 'left' }} /></span>)}<span style={{ color: '#b4532a', opacity: faixa(p, 0.093, 0.097) }}>?</span></span>
              </div>
            </div>
          </Cartao>
          {/* o sistema: notebook + janelas + lupas */}
          {p >= T3.lista[0] - 0.012 && p < T3.fim[0] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T3.lista[0], T3.fim[0] + 0.006], 0.012) }}>
              <Etiqueta n={nEtiqueta} texto={etiqueta} o={1} />
              <div style={{ marginTop: 36, transform: `translateX(${largo ? -150 * Math.max(janela(p, [0.11, 0.17], 0.01), janela(p, [0.19, 0.255], 0.01), janela(p, [0.488, 0.575], 0.01), janela(p, [0.795, 0.857], 0.01), janela(p, [0.865, 0.925], 0.01)) : 0}px)` }}>
                <MacBook p={p} w={wMac} passos={fundo} toques={toquesMac} recua={recua} rotulo="Comandas no computador da clínica" />
              </div>
              {/* janelas do sistema flutuando na frente (recortes nítidos das telas gravadas) */}
              <JanelaSistema p={p} de={0.272} ate={0.302} recortada regiao={R_LISTA} w={wj(R_LISTA)} passos={[{ img: C3('j-servicos'), de: 0 }]} toques={[{ x: 720, y: 633, em: 0.298 }]} rotulo="Lista de serviços para adicionar na comanda" />
              <JanelaSistema p={p} de={0.304} ate={0.36} recortada regiao={R_ITEM} w={wj(R_ITEM)} passos={[{ img: C3('j-spa'), de: 0 }, { img: C3('j-spa-larissa'), de: 0.33, corte: true }]} toques={[{ x: 720, y: 529, em: 0.326 }, { x: 885, y: 607, em: 0.355 }]} rotulo="Spa Pescoço e Colo com a profissional Larissa Mendes" />
              <JanelaSistema p={p} de={0.37} ate={0.41} recortada regiao={R_LISTA} w={wj(R_LISTA)} passos={[{ img: C3('j-produtos'), de: 0 }]} toques={[{ x: 720, y: 523, em: 0.405 }]} rotulo="Lista de produtos com o estoque de cada um" />
              <JanelaSistema p={p} de={0.412} ate={0.468} recortada regiao={R_ITEM} w={wj(R_ITEM)} passos={[{ img: C3('j-protetor'), de: 0 }, { img: C3('j-protetor-camila'), de: 0.438, corte: true }]} toques={[{ x: 720, y: 529, em: 0.434 }, { x: 885, y: 607, em: 0.463 }]} rotulo="Protetor solar vendido pela profissional Camila Rocha" />
              <JanelaSistema p={p} de={0.592} ate={0.682} recortada regiao={R_PAG_A} w={wj(R_PAG_A)} passos={[{ img: C3('j-receber'), de: 0 }, { img: C3('j-pix'), de: 0.618, corte: true }, { img: C3('j-pix-200'), de: 0.648, corte: true }]}
                toques={[{ x: 531, y: 411, em: 0.615 }, { x: 720, y: 522, em: 0.676 }]}
                campos={[{ x: 532, y: 440, w: 300, h: 30, texto: '200', de: 0.626, ate: 0.644, vazio: '', tam: 17, some: 0.648 }]} rotulo="Receber pagamento: R$ 424, com o sinal já descontado" />
              <JanelaSistema p={p} de={0.686} ate={0.772} recortada regiao={R_PAG_B} w={wj(R_PAG_B)} passos={[{ img: C3('j-cartao'), de: 0 }, { img: C3('j-credito'), de: 0.716, corte: true }, { img: C3('j-confirmando'), de: 0.758, corte: true }]}
                toques={[{ x: 571, y: 509, em: 0.712 }, { x: 720, y: 724, em: 0.754 }]} rotulo="Pagamento dividido: R$ 200 no Pix e R$ 224 no cartão de crédito" />
              {/* lupas (no notebook ao lado; no celular sobem por baixo) */}
              <div style={largo ? { position: 'absolute', right: '2%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>
                <Lupa p={p} de={0.11} ate={0.165} img={C3('note-lista')} fonte={TELA_NOTE} regiao={{ x: 290, y: 412, w: 470, h: 300 }} w={wLupa} titulo="UMA COMANDA POR AGENDAMENTO" />
                <Lupa p={p} de={0.19} ate={0.255} img={C3('note-aberta')} fonte={TELA_NOTE} regiao={{ x: 900, y: 452, w: 350, h: 130 }} w={wLupa} titulo="O SINAL JÁ SAI DA CONTA" />
                <Lupa p={p} de={0.488} ate={0.53} img={C3('note-desconto')} fonte={TELA_NOTE} regiao={{ x: 440, y: 370, w: 420, h: 160 }} w={wLupa} titulo="CADA ITEM COM A SUA PROFISSIONAL" />
                <Lupa p={p} de={0.532} ate={0.575} img={C3('note-desconto')} fonte={TELA_NOTE} regiao={{ x: 900, y: 581, w: 350, h: 30 }} w={wLupa} titulo="DESCONTO NA HORA"
                  campos={[{ x: 1196, y: 586, w: 30, h: 20, texto: '25', de: 0.54, ate: 0.556, vazio: '', tam: 14, some: 0.562 }]} />
                <Lupa p={p} de={0.865} ate={0.925} img={C3('note-estoque')} fonte={TELA_NOTE} regiao={{ x: 296, y: 272, w: 372, h: 146 }} w={wLupa} titulo="ESTOQUE BAIXO: AVISO NA LISTA" />
              </div>
              {/* recibo da comanda paga (valores conferidos no banco) */}
              {recibo > 0 && (
                <div style={{ position: 'absolute', ...(largo ? { right: '2%', top: '50%', transform: `translateY(-50%) translateX(${(1 - recibo) * 24}px)`, width: 380 } : { left: 12, right: 12, bottom: 6, transform: `translateY(${(1 - recibo) * 24}px)` }), opacity: recibo, zIndex: 8, padding: 22, borderRadius: 24, background: '#fff', boxShadow: '0 30px 70px rgba(60,48,38,0.22)', color: TAUPE }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 4, color: '#8C7360' }}>COMANDA #283</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 12 }}>PAGA</span>
                  </div>
                  {[['Sinal · Pix (no agendamento)', 'R$ 66'], ['Pix', 'R$ 200'], ['Cartão de crédito', 'R$ 224']].map(([t, v], i) => (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: faixa(p, 0.8 + i * 0.008, 0.806 + i * 0.008), fontSize: 16 }}><span>{t}</span><b>{v}</b></div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 4px', borderTop: '2px solid rgba(94,84,75,0.2)' }}><b>Total</b><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: '#C9974A' }}>R$ 490</span></div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 12px', borderRadius: 999, background: CREME, fontWeight: 800, fontSize: 14, opacity: faixa(p, 0.83, 0.838) }}>
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="#C9974A"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" /></svg>Marcela ganhou 80 pontos
                  </div>
                </div>
              )}
            </div>
          )}
          {/* fecho */}
          <Cartao o={janela(p, T3.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>COMANDA NO AGENDAPRO</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Sem caderno, <Ouro>sem conta de cabeça</Ouro></p>
            {[['Abre sozinha', 'em todo agendamento, com o sinal descontado'], ['Serviço e produto', 'cada item com a profissional certa, pra comissão sair certa'], ['Desconto e pagamento dividido', 'Pix, dinheiro e cartão na mesma conta'], ['Estoque e pontos', 'o produto baixa e a cliente ganha pontos']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T3.dor[1], texto: <>Fim do atendimento, a conta no caderno: <b>quanto deu mesmo?</b></> },
          { de: T3.lista[0], ate: T3.lista[1], texto: <>No AgendaPRO, <b>todo agendamento já abre uma comanda</b>.</> },
          { de: T3.aberta[0], ate: T3.aberta[1], texto: <>A da Marcela já vem com o <Ouro>sinal de R$ 66</Ouro> descontado.</> },
          { de: T3.itens[0], ate: 0.37, texto: <>Ela pediu mais um serviço? <b>+ Serviço</b>, e você escolhe quem atendeu.</> },
          { de: 0.37, ate: T3.itens[1], texto: <>Levou um produto? <b>+ Produto</b>, vendido por quem indicou.</> },
          { de: T3.desc[0], ate: T3.desc[1], texto: <>Cada item com a sua profissional, e o <b>desconto na hora</b>.</> },
          { de: T3.pagar[0], ate: 0.686, texto: <>Na hora de receber, faltam R$ 424: <b>o sinal já saiu da conta</b>.</> },
          { de: 0.686, ate: T3.pagar[1], texto: <>E ela divide: <b>R$ 200 no Pix e o resto no cartão</b>.</> },
          { de: T3.paga[0], ate: T3.paga[1], texto: <>Comanda paga. E a Marcela ainda ganhou <Ouro>80 pontos</Ouro>.</> },
          { de: T3.estoque[0], ate: T3.estoque[1], texto: <>O protetor baixou sozinho no estoque, e já aparece como <b>estoque baixo</b>.</> },
          { de: T3.fim[0], ate: 1.01, texto: <>Tudo que ela fez e comprou, <Ouro>numa conta só</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 4 · CLUBE DE BENEFÍCIOS ───────────────
   Roteiro v2 #6. A Marcela abre o link e vê os 80 pontos da comanda #283 ("faltam 120" pro primeiro prêmio),
   os prêmios, o "indique uma amiga" e as formas de ganhar; os 3 jeitos com os números REAIS da configuração
   (limpeza intensiva 80 · indicação 100 · Google 200, aprovado pela clínica); a troca no atendimento
   (Tatiane 550 → 350, conferido no banco); e os prêmios que a clínica escolhe. Indicação: só quem indica
   ganha, quando a amiga agenda pelo link e é atendida. */
const C4 = (s: string) => `/clinicas/cap4/${s}.webp`
const T4 = { dor: [0, 0.1], link: [0.1, 0.36], jeitos: [0.36, 0.5], troca: [0.5, 0.72], premios: [0.72, 0.88], fim: [0.88, 1.01] }
const IMGS_CAP4 = ['fone-link', 'fone-meus-pontos', 'fone-saldo-pagina', 'ipad-cliente', 'ipad-resgatado', 'note-fidelidade', 'note-recompensas'].map(C4)
// página "Meus pontos" inteira (390 x 1942): desce até os prêmios, depois até o fim (indique · como ganhar · extrato)
const rolPontos = (p: number) => p < 0.205 ? 0 : p < 0.215 ? 520 * suaveF(faixa(p, 0.205, 0.215)) : p < 0.245 ? 520 : 520 + 578 * suaveF(faixa(p, 0.245, 0.255))
const JEITOS: [React.ReactNode, string, string, string][] = [
  [<path key="a" d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />, 'Sendo atendida', 'cada serviço vale pontos (a limpeza da Marcela)', '80 pts'],
  [<path key="b" d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />, 'Indicando uma amiga', 'a amiga é atendida: ganha quem indicou', '100 pts'],
  [<path key="c" d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z" />, 'Avaliando no Google', 'você confere e aprova', '200 pts'],
]

function CapClube({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP4)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.2 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wIpad = Math.min(largo ? 470 : tela * 0.84, (alto - 330) / 1.5)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const PAG = { w: 390, h: 1942 }, TELA_IPAD = { w: 820, h: 1180 }
  const titulo = p < T4.link[0] ? <>A cliente que <Ouro>some</Ouro></> : p < 0.25 ? <>Ela vê os <Ouro>próprios pontos</Ouro></> : p < T4.jeitos[0] ? <>E sabe como <Ouro>ganhar mais</Ouro></> : p < T4.troca[0] ? <>3 jeitos de <Ouro>juntar pontos</Ouro></> : p < T4.premios[0] ? <>Juntou? <Ouro>Troca</Ouro></> : p < T4.fim[0] ? <>Os prêmios <Ouro>são seus</Ouro></> : <>O motivo pra ela <Ouro>voltar</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -190 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const dias = Math.round(30 + 64 * faixa(p, 0.01, 0.07))
  return (
    <>
    <section ref={abre} id="clube" aria-labelledby="t-clube-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 4 · CLUBE DE BENEFÍCIOS · 1 MIN</p>
        <h2 id="t-clube-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Um motivo pra ela <Ouro>voltar</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['Os pontos no celular dela', 'pelo seu link, sem baixar aplicativo'], ['3 jeitos de juntar pontos', 'atendimento, indicação e avaliação no Google'], ['A troca no atendimento', 'um toque e o saldo já desconta'], ['Os prêmios que você escolhe', 'e quanto vale cada coisa']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-clube" data-filme="55" aria-labelledby="t-clube" style={{ position: 'relative', height: reduzir ? 'auto' : '800vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-clube" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: os dias passando desde a última visita */}
          <Cartao o={1 - faixa(p, T4.dor[1] - 0.012, T4.dor[1])}>
            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>FICHA DA CLIENTE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(140deg,#d7b98f,#a0826a)', flex: 'none' }} />
              <span><b style={{ fontSize: 20 }}>Cliente de limpeza de pele</b><br /><span style={{ color: '#8C7360' }}>vinha todo mês</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 16, background: CREME }}>
              <span style={{ fontWeight: 700 }}>Última visita</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(22px, 6vw, 30px)', whiteSpace: 'nowrap', color: dias > 60 ? '#b4532a' : '#C9974A' }}>há {dias} dias</span>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 17, color: '#8C7360' }}>Sem um motivo pra voltar, ela experimenta outra clínica.</p>
          </Cartao>
          {/* a Marcela no celular: link → Meus pontos → saldo e a página toda */}
          {p >= T4.link[0] - 0.01 && p < T4.link[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T4.link[0], T4.link[1] + 0.006], 0.012) }}>
              <Etiqueta n={1} texto="NO CELULAR DELA · pelo seu link" o={1} />
              {lado(Math.max(janela(p, [0.175, 0.205], 0.008), janela(p, [0.215, 0.245], 0.008), janela(p, [0.255, 0.36], 0.008)),
                <IPhone p={p} w={wPhone} barra rotulo="Página Meus pontos no celular da cliente: saldo, prêmios, indicação e extrato"
                  passos={[{ img: C4('fone-link'), de: 0 }, { img: C4('fone-meus-pontos'), de: 0.125, corte: true }]}
                  toques={[{ x: 209, y: 587, em: 0.12 }, { x: 195, y: 562, em: 0.165 }]}
                  campos={[{ x: 49, y: 476 + 12 + 47, w: 290, h: 26, texto: '(11) 97892-9187', de: 0.135, ate: 0.157, vazio: '', tam: 17, some: 0.17 }]}
                  rolagem={{ img: C4('fone-saldo-pagina'), de: 0.17, ate: 2, y0: 0, y1: 1098, alturaCss: 1942, cabecalho: 0, y: rolPontos }} />,
                <>
                  <Lupa p={p} de={0.175} ate={0.205} img={C4('fone-saldo-pagina')} fonte={PAG} regiao={{ x: 12, y: 395, w: 366, h: 185 }} w={wLupa} titulo="80 PONTOS DA COMANDA DE HOJE" />
                  <Lupa p={p} de={0.215} ate={0.245} img={C4('fone-saldo-pagina')} fonte={PAG} regiao={{ x: 16, y: 660, w: 358, h: 300 }} w={wLupa} titulo="QUANTO FALTA PRA CADA PRÊMIO" />
                  <Lupa p={p} de={0.255} ate={0.287} img={C4('fone-saldo-pagina')} fonte={PAG} regiao={{ x: 16, y: 1240, w: 358, h: 190 }} w={wLupa} titulo="INDICA UMA AMIGA PELO WHATSAPP" />
                  <Lupa p={p} de={0.292} ate={0.323} img={C4('fone-saldo-pagina')} fonte={PAG} regiao={{ x: 16, y: 1440, w: 358, h: 255 }} w={wLupa} titulo="COMO GANHAR MAIS PONTOS" />
                  <Lupa p={p} de={0.328} ate={0.358} img={C4('fone-saldo-pagina')} fonte={PAG} regiao={{ x: 16, y: 1712, w: 358, h: 110 }} w={wLupa} titulo="EXTRATO: +80 HOJE" />
                </>)}
            </div>
          )}
          {/* os 3 jeitos de ganhar (números da configuração da clínica) */}
          <Cartao o={janela(p, T4.jeitos, 0.012)}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>COMO ELA GANHA PONTOS</p>
            <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(22px, 3.6vw, 36px)', lineHeight: 1.05 }}>Todos <Ouro>trazem cliente</Ouro></p>
            {JEITOS.map(([icone, t, d, v], i) => {
              const o = faixa(p, 0.375 + i * 0.03, 0.385 + i * 0.03)
              return (
                <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
                  <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 14, background: CREME, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icone}</svg></span>
                  <span style={{ flex: 1 }}><b>{t}</b><br /><span style={{ color: '#8C7360', fontSize: 15 }}>{d}</span></span>
                  <span style={{ flex: 'none', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#C9974A', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              )
            })}
          </Cartao>
          {/* a troca no atendimento: iPad da recepção, Tatiane 550 → 350 */}
          {p >= T4.troca[0] - 0.01 && p < T4.troca[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T4.troca[0], T4.troca[1] + 0.006], 0.012) }}>
              <Etiqueta n={2} texto="NA RECEPÇÃO · Tatiane, cliente de sempre" o={1} />
              {lado(Math.max(janela(p, [0.52, 0.59], 0.01), janela(p, [0.605, 0.71], 0.01)),
                <IPad p={p} w={wIpad} passos={[{ img: C4('ipad-cliente'), de: 0 }, { img: C4('ipad-resgatado'), de: 0.6, corte: true }]} toques={[{ x: 410, y: 335, em: 0.595 }]} rotulo="Cadastro da cliente na recepção: saldo de pontos e Resgatar recompensa" />,
                <>
                  <Lupa p={p} de={0.52} ate={0.59} img={C4('ipad-cliente')} fonte={TELA_IPAD} regiao={{ x: 172, y: 168, w: 476, h: 358 }} w={wLupa} titulo="550 PONTOS · 3 PRÊMIOS LIBERADOS" toques={[{ x: 410, y: 335, em: 0.586 }]} />
                  <Lupa p={p} de={0.605} ate={0.71} img={C4('ipad-resgatado')} fonte={TELA_IPAD} regiao={{ x: 172, y: 168, w: 476, h: 380 }} w={wLupa} titulo="TROCOU · SALDO AGORA 350" />
                </>)}
            </div>
          )}
          {/* os prêmios são da clínica: Configurações › Fidelidade */}
          {p >= T4.premios[0] - 0.01 && p < T4.premios[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T4.premios[0], T4.premios[1] + 0.006], 0.012) }}>
              <Etiqueta n={3} texto="CONFIGURAÇÕES · Fidelidade" o={1} />
              {lado(janela(p, [0.74, 0.865], 0.01),
                <MacBook p={p} w={wMac} passos={[{ img: C4('note-fidelidade'), de: 0 }]} rotulo="Configuração do programa de fidelidade da clínica" />,
                <Lupa p={p} de={0.74} ate={0.865} img={C4('note-recompensas')} fonte={{ w: 560, h: 395 }} regiao={{ x: 0, y: 0, w: 560, h: 395 }} w={wLupa} titulo="VOCÊ ESCOLHE OS PRÊMIOS" />)}
            </div>
          )}
          {/* fecho */}
          <Cartao o={janela(p, T4.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CLUBE NO AGENDAPRO</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>O motivo pra ela <Ouro>voltar</Ouro></p>
            {[['Pontos em todo atendimento', 'entram sozinhos quando a comanda fecha'], ['Ela acompanha pelo seu link', 'sem baixar aplicativo'], ['Indicação e Google', 'cliente nova e avaliação pra sua clínica'], ['Troca no atendimento', 'com os prêmios que você escolheu']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T4.dor[1], texto: <>Cliente que some: <b>última visita há 94 dias</b>.</> },
          { de: T4.link[0], ate: 0.17, texto: <>A Marcela abre o seu link e toca em <b>Meus pontos</b>.</> },
          { de: 0.17, ate: 0.21, texto: <>Os 80 pontos de hoje já estão lá. <Ouro>Faltam 120</Ouro> pro primeiro prêmio.</> },
          { de: 0.21, ate: 0.25, texto: <>Ela vê cada prêmio e quanto falta pra chegar.</> },
          { de: 0.25, ate: T4.link[1], texto: <>E descobre como ganhar mais: <b>indicando uma amiga</b> e avaliando no Google.</> },
          { de: T4.jeitos[0], ate: T4.jeitos[1], texto: <>Três jeitos de juntar pontos, e <b>todos trazem cliente</b> pra você.</> },
          { de: T4.troca[0], ate: 0.6, texto: <>Juntou? A troca é no atendimento: a Tatiane tem <b>550 pontos</b>.</> },
          { de: 0.6, ate: T4.troca[1], texto: <>Um toque no prêmio, e o saldo <Ouro>já desconta</Ouro>.</> },
          { de: T4.premios[0], ate: T4.premios[1], texto: <>Os prêmios e quanto vale cada coisa: <b>quem escolhe é você</b>.</> },
          { de: T4.fim[0], ate: 1.01, texto: <>Pontos, prêmios e indicação: <Ouro>o motivo pra ela voltar</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 5 · CAMPANHAS ───────────────
   Roteiro v2 #7 (risco: NÃO é disparo em massa — cada mensagem sai do WhatsApp da clínica, uma por uma).
   Sumidos por faixa → a Bruna (101 dias) → um toque no presente → WhatsApp com a mensagem e um cupom só dela
   → no link o cupom já vem aplicado → Aniversário: escolhe 20% → a mensagem com o nome de cada uma → 6 cupons
   → "Enviado" uma por uma. Textos e cupons reais (conferidos no banco). As frases de retorno da tela de
   aniversário ("volta 3x mais", "40%") ficam de fora: não temos fonte. */
const C5 = (s: string) => `/clinicas/cap5/${s}.webp`
const T5 = { dor: [0, 0.1], sumidos: [0.1, 0.3], zap: [0.3, 0.44], link: [0.44, 0.55], aniv: [0.55, 0.86], fim: [0.86, 1.01] }
const IMGS_CAP5 = ['fone-sumidos', 'fone-link-cupom', 'fone-aniv-desconto', 'fone-aniv-gerar', 'fone-aniv-lista', 'fone-aniv-enviado'].map(C5)
// o texto que o sistema montou pra Bruna (o link de verdade usa o endereço da conta de demonstração)
const MSG_BRUNA = 'Oi Bruna! Faz tempo que você não aparece na Studio Aurora Estética. Tenho R$ 10,00 de desconto pra você voltar. Vale 14 dias: agendapro.net.br/studio-aurora?cupom=PRO9P4UE'
const SUMIDAS: [string, number][] = [['Bruna', 101], ['Yasmin', 97], ['Paula', 87], ['Helena', 72], ['Camila', 67], ['Lorena', 65]]

/** confete dourado e rosé: estoura em `de` e cai em ~0.06 de rolagem (posições fixas, nada aleatório no render) */
const CONFETE = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37) % 100, dx: ((i * 53) % 40) - 20, rot: (i * 71) % 360, cor: ['#E3C28E', '#C9974A', '#E8B4B8', '#8C7360', '#F3D9A4'][i % 5], w: 6 + (i % 3) * 3, atraso: (i % 7) * 0.003 }))
const Confete: React.FC<{ p: number; de: number }> = ({ p, de }) => {
  if (p < de || p > de + 0.07) return null
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9, overflow: 'hidden' }}>
      {CONFETE.map((c, i) => {
        const t = faixa(p, de + c.atraso, de + 0.06)
        return <span key={i} style={{ position: 'absolute', left: `${c.x}%`, top: `${-8 + 110 * t}%`, width: c.w, height: c.w * 0.45, borderRadius: 2, background: c.cor, opacity: 1 - faixa(t, 0.75, 1), transform: `translateX(${c.dx * t * 4}px) rotate(${c.rot + 540 * t}deg)` }} />
      })}
    </div>
  )
}

function CapCampanhas({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP5)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.5 : p0
  const irPara = (q: number) => () => { const el = ref.current; if (el) window.scrollTo({ top: el.offsetTop + q * (el.offsetHeight - window.innerHeight), behavior: 'smooth' }) }
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const PAG = { w: 390, h: 844 }
  const titulo = p < T5.sumidos[0] ? <>Quem sumiu, <Ouro>sumiu?</Ouro></> : p < T5.zap[0] ? <>Os sumidos, <Ouro>por tempo sem vir</Ouro></> : p < T5.link[0] ? <>Um cupom <Ouro>só dela</Ouro></> : p < T5.aniv[0] ? <>O desconto <Ouro>já aplicado</Ouro></> : p < T5.fim[0] ? <>Aniversariantes <Ouro>do mês</Ouro></> : <>Quem sumiu, <Ouro>volta</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -190 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const quadro = (seg: number[], n: number, etiqueta: string, conteudo: React.ReactNode) => p >= seg[0] - 0.01 && p < seg[1] + 0.012 && (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [seg[0], seg[1] + 0.006], 0.012) }}>
      <Etiqueta n={n} texto={etiqueta} o={1} />
      {conteudo}
    </div>
  )
  return (
    <>
    <section ref={abre} id="campanhas" aria-labelledby="t-campanhas-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 5 · CAMPANHAS · 50 S</p>
        <h2 id="t-campanhas-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Chame de volta <Ouro>quem sumiu</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['Quem não volta há tempo', 'separado por dias sem vir'], ['Um cupom só dela', 'com a mensagem pronta no seu WhatsApp'], ['O desconto já aplicado', 'no link, é só ela agendar'], ['As aniversariantes do mês', 'um cupom pra cada, enviado uma por uma']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-campanhas" data-filme="50" aria-labelledby="t-campanhas" style={{ position: 'relative', height: reduzir ? 'auto' : '760vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-campanhas" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: a lista de quem não volta, crescendo */}
          <Cartao o={1 - faixa(p, T5.dor[1] - 0.012, T5.dor[1])}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CLIENTES QUE NÃO VOLTARAM</p>
            {SUMIDAS.map(([nome, d], i) => {
              const o = faixa(p, 0.008 + i * 0.008, 0.014 + i * 0.008), some = faixa(p, 0.055 + (SUMIDAS.length - i) * 0.004, 0.085 + (SUMIDAS.length - i) * 0.002)
              return <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: o * (1 - 0.82 * some), filter: `blur(${some * 2.5}px)`, transform: `translateX(${(1 - o) * -12 + some * 40}px)` }}><b>{nome}</b><span style={{ fontWeight: 800, color: d > 90 ? '#b4532a' : '#C9974A' }}>há {d} dias</span></div>
            })}
            <p style={{ margin: '12px 0 0', fontSize: 17, color: '#8C7360', opacity: faixa(p, 0.075, 0.085) }}>Quem lembra de chamar cada uma? E com qual mensagem?</p>
          </Cartao>
          {/* Sumidos no celular */}
          {quadro(T5.sumidos, 1, 'SUMIDOS · 12 clientes', lado(Math.max(janela(p, [0.12, 0.19], 0.008), janela(p, [0.2, 0.255], 0.008)),
            <IPhone p={p} w={wPhone} barra passos={[{ img: C5('fone-sumidos'), de: 0 }]} toques={[{ x: 343, y: 631, em: 0.265 }]} rotulo="Tela Sumidos no celular: clientes separadas por tempo sem vir, com os botões Chamar e Cupom"
              extra={(k) => p >= 0.2 && p < 0.262 ? (
                <button type="button" onClick={irPara(0.33)} aria-label="Tocar no presente da Bruna" style={{ position: 'absolute', left: (343 - 26) * k, top: (631 + 47 - 26) * k, width: 52 * k, height: 52 * k, borderRadius: 14 * k, border: `${2.5 * k}px solid #C9974A`, background: 'rgba(227,194,142,0.18)', cursor: 'pointer', animation: 'pulsar 1.1s ease-in-out infinite', zIndex: 7 }}>
                  <span style={{ position: 'absolute', right: -6 * k, top: -30 * k, padding: `${3 * k}px ${9 * k}px`, borderRadius: 999, background: TAUPE, color: CREME, fontSize: 12 * k, fontWeight: 800, whiteSpace: 'nowrap' }}>toque aqui</span>
                </button>
              ) : null} />,
            <>
              <Lupa p={p} de={0.12} ate={0.19} img={C5('fone-sumidos')} fonte={PAG} regiao={{ x: 16, y: 205, w: 358, h: 222 }} w={wLupa} titulo="SEPARADAS POR TEMPO SEM VIR" />
              <Lupa p={p} de={0.2} ate={0.255} img={C5('fone-sumidos')} fonte={PAG} regiao={{ x: 16, y: 596, w: 358, h: 68 }} w={wLupa} titulo="BRUNA · 101 DIAS SEM VIR" />
            </>))}
          {/* o WhatsApp abre com a mensagem e o cupom */}
          {quadro(T5.zap, 2, 'DO SEU WHATSAPP · com cupom', <div style={{ marginTop: 36 }}>
            <IPhone p={p} w={wPhone} rotulo="WhatsApp da clínica com a mensagem de volta e o cupom da cliente">
              {(k) => <ConversaWhatsApp p={p} k={k} nome="Bruna Cardoso" diaHistorico="10 de julho" historico={[{ de: 'ela', t: 'Amei o resultado, obrigada! 💕', hora: '17:40' }]}
                msgs={[{ de: 'eu', t: MSG_BRUNA, em: 0.345, hora: '10:12', pronto: true }, { de: 'ela', t: 'Que saudade! Vou agendar agora 😍', em: 0.395, hora: '10:20' }]} />}
            </IPhone>
          </div>)}
          {/* do lado dela: o link com o cupom aplicado */}
          {quadro(T5.link, 3, 'NO CELULAR DELA · seu link', lado(janela(p, [0.46, 0.54], 0.01),
            <IPhone p={p} w={wPhone} barra passos={[{ img: C5('fone-link-cupom'), de: 0 }]} toques={[{ x: 195, y: 515, em: 0.535 }]} rotulo="Link da clínica com o cupom de R$ 10 já aplicado e o botão Agendar e usar cupom" />,
            <Lupa p={p} de={0.46} ate={0.54} img={C5('fone-link-cupom')} fonte={PAG} regiao={{ x: 16, y: 392, w: 358, h: 156 }} w={wLupa} titulo="CUPOM JÁ APLICADO" />))}
          {/* aniversariantes: desconto → mensagem → 6 cupons → enviado */}
          {quadro(T5.aniv, 4, 'CAMPANHAS · Aniversário', lado(Math.max(janela(p, [0.565, 0.625], 0.008), janela(p, [0.65, 0.722], 0.008), janela(p, [0.742, 0.79], 0.008), janela(p, [0.806, 0.855], 0.008)),
            <IPhone p={p} w={wPhone} barra rotulo="Campanha de aniversário: desconto, mensagem com o nome de cada cliente e lista de envio"
              passos={[{ img: C5('fone-aniv-desconto'), de: 0 }, { img: C5('fone-aniv-gerar'), de: 0.64, corte: true }, { img: C5('fone-aniv-lista'), de: 0.735, corte: true }, { img: C5('fone-aniv-enviado'), de: 0.8, corte: true }]}
              toques={[{ x: 278, y: 420, em: 0.585 }, { x: 195, y: 757, em: 0.728 }, { x: 311, y: 331, em: 0.795 }]} />,
            <>
              <Lupa p={p} de={0.565} ate={0.625} img={C5('fone-aniv-desconto')} fonte={PAG} regiao={{ x: 16, y: 356, w: 358, h: 120 }} w={wLupa} titulo="VOCÊ ESCOLHE O DESCONTO" />
              <Lupa p={p} de={0.65} ate={0.722} img={C5('fone-aniv-gerar')} fonte={PAG} regiao={{ x: 16, y: 590, w: 358, h: 132 }} w={wLupa} titulo="COM O NOME DE CADA UMA" />
              <Lupa p={p} de={0.742} ate={0.79} img={C5('fone-aniv-lista')} fonte={PAG} regiao={{ x: 16, y: 160, w: 358, h: 330 }} w={wLupa} titulo="6 CUPONS, UM PRA CADA" />
              <Lupa p={p} de={0.806} ate={0.855} img={C5('fone-aniv-enviado')} fonte={PAG} regiao={{ x: 16, y: 296, w: 358, h: 72 }} w={wLupa} titulo="ENVIADO · UMA POR UMA" />
            </>))}
          <Confete p={p} de={0.738} />
          {/* fecho: a volta da Bruna numa linha do tempo, depois o resumo */}
          <Cartao o={janela(p, T5.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>A VOLTA DA BRUNA</p>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', margin: '6px 0 18px', padding: '0 4px' }}>
              <div style={{ position: 'absolute', left: 18, right: 18, top: 15, height: 3, borderRadius: 2, background: 'rgba(94,84,75,0.12)' }} />
              <div style={{ position: 'absolute', left: 18, top: 15, height: 3, borderRadius: 2, background: DOURADO, width: `calc((100% - 36px) * ${faixa(p, 0.875, 0.92)})` }} />
              {[['10/07', 'última visita'], ['19/10', 'recebeu o cupom'], ['agendou', 'com R$ 10 off']].map(([t, d], i) => {
                const on = p >= 0.875 + i * 0.022
                return (
                  <div key={t} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center', gap: 6, textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? (i === 2 ? '#16a34a' : DOURADO) : '#fff', border: on ? 'none' : '2px solid rgba(94,84,75,0.2)', color: '#fff', fontWeight: 900, transform: `scale(${on ? 1 : 0.85})`, transition: 'transform .3s' }}>{i === 2 && on ? '✓' : ''}</span>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{t}</span><span style={{ fontSize: 12.5, color: '#8C7360', marginTop: -4 }}>{d}</span>
                  </div>
                )
              })}
            </div>
            {[['Sumidos por tempo sem vir', 'você escolhe quem chamar'], ['Cupom único, já aplicado no link', 'sumidas e aniversariantes'], ['Do seu WhatsApp', 'uma por uma, nada de disparo em massa']].map(([t, d], i) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: faixa(p, 0.935 + i * 0.012, 0.945 + i * 0.012) }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T5.dor[1], texto: <>A lista de quem não volta cresce, e <b>ninguém lembra de chamar</b>.</> },
          { de: T5.sumidos[0], ate: 0.2, texto: <>No AgendaPRO, os <b>Sumidos</b> aparecem separados por tempo sem vir.</> },
          { de: 0.2, ate: T5.sumidos[1], texto: <>A Bruna não vem há <b>101 dias</b>. Um toque no presente…</> },
          { de: T5.zap[0], ate: T5.zap[1], texto: <>…e o WhatsApp abre com a mensagem e um <Ouro>cupom só dela</Ouro>.</> },
          { de: T5.link[0], ate: T5.link[1], texto: <>No seu link, o desconto <b>já vem aplicado</b>. É só agendar.</> },
          { de: T5.aniv[0], ate: 0.64, texto: <>Aniversariantes do mês? Você escolhe o desconto…</> },
          { de: 0.64, ate: 0.735, texto: <>…e a mensagem já sai escrita, <b>com o nome de cada uma</b>.</> },
          { de: 0.735, ate: T5.aniv[1], texto: <>Um cupom pra cada, enviado <Ouro>uma por uma</Ouro>, do seu WhatsApp.</> },
          { de: T5.fim[0], ate: 1.01, texto: <>Quem sumiu, <Ouro>volta</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 6 · FLUXO FINANCEIRO ───────────────
   Pedido do Eduardo (19/10): a maioria não usa o caixa → ênfase no FLUXO: a entrada por Pix, dinheiro e cartões,
   as taxas, as despesas, o líquido e a projeção. Financeiro da conta espelho no perfil da Wanessa (sem mostrar que
   é dela), números um pouco pra cima; maquininha com taxas de mercado. Todos os valores abaixo vêm das telas
   gravadas em 19/10 (celular: mês de outubro · fluxo e projeção: notebook).
   Momentos-assinatura: a CASCATA (bruto → taxas → despesas → lucro real) e os 4 MESES em barras.
   v2 (19/10, depois da v187): o celular foi regravado com o "Lucro real · 30 dias" já descontando as taxas
   (R$ 11.789,45) — a cascata fecha no MESMO número do app. */
const C6 = (s: string) => `/clinicas/cap6/${s}.webp`
const T6 = { dor: [0, 0.07], fone: [0.07, 0.41], cascata: [0.41, 0.5], barras: [0.5, 0.58], receitas: [0.58, 0.66], projecao: [0.66, 0.74], despesas: [0.74, 0.83], taxas: [0.83, 0.91], fim: [0.91, 1.01] }
const IMGS_CAP6 = ['fone-financeiro', 'note-receitas', 'note-projecao', 'note-despesas', 'note-taxas'].map(C6)
const rolFin = (p: number) => p < 0.18 ? 0 : p < 0.19 ? 690 * suaveF(faixa(p, 0.18, 0.19)) : p < 0.29 ? 690 : p < 0.3 ? 690 + 630 * suaveF(faixa(p, 0.29, 0.3)) : p < 0.345 ? 1320 : 1320 + 265 * suaveF(faixa(p, 0.345, 0.355))
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// outubro (celular): bruto 17.335 · taxas 150,55 · despesas pagas 5.395
// a mesma conta do card "Lucro real · 30 dias" do celular (v187): recebido − taxas − despesas
const CASCATA: [string, number, 'entra' | 'sai' | 'sub' | 'fica'][] = [['Entrou em 30 dias', 17335, 'entra'], ['Taxas da maquininha', 150.55, 'sai'], ['Despesas pagas', 5395, 'sai'], ['Lucro real', 11789.45, 'fica']]
const CASCATA_ANTES = [0, 17335, 17335 - 150.55, 0] // de onde cada barra que "sai" desce
// fluxo de caixa mensal (notebook): receitas × despesas (com taxas) · outubro até o dia 19
const MESES: [string, number, number][] = [['Jul', 18711, 5303.72], ['Ago', 18845, 5554.31], ['Set', 17225, 5539.57], ['Out*', 10683, 5477.76]]

/** cartão de destaque: os números da tela, grandes e legíveis em qualquer aparelho (no lugar de uma lupa miúda) */
const Destaque: React.FC<{ p: number; de: number; ate: number; titulo: string; linhas: [string, string, string?][]; rodape?: React.ReactNode; w: number }> = ({ p, de, ate, titulo, linhas, rodape, w }) => {
  const o = janela(p, [de, ate], 0.012)
  if (o <= 0) return null
  return (
    <div style={{ gridArea: '1 / 1', alignSelf: 'end', width: w, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 70px rgba(60,48,38,0.22), 0 0 0 1px rgba(94,84,75,0.06)', opacity: o, transform: `translateY(${(1 - o) * 24}px)`, color: TAUPE }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, letterSpacing: 1, color: '#8C7360', borderBottom: '1px solid rgba(94,84,75,0.08)' }}>
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>{titulo}
      </div>
      <div style={{ padding: '6px 16px 12px' }}>
        {linhas.map(([r, v, cor], i) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: i ? '1px solid rgba(94,84,75,0.08)' : 'none', opacity: faixa(p, de + 0.006 + i * 0.006, de + 0.012 + i * 0.006) }}>
            <span style={{ fontSize: 15 }}>{r}</span><b style={{ fontSize: 16, color: cor ?? TAUPE, whiteSpace: 'nowrap' }}>{v}</b>
          </div>
        ))}
        {rodape && <div style={{ marginTop: 4, fontSize: 13, color: '#8C7360' }}>{rodape}</div>}
      </div>
    </div>
  )
}

function CapFinanceiro({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP6)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.45 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const PAG = { w: 390, h: 2400 }
  const titulo = p < T6.fone[0] ? <>Entrou muito. <Ouro>Sobrou quanto?</Ouro></> : p < 0.29 ? <>Cada real, <Ouro>de onde veio</Ouro></> : p < T6.cascata[0] ? <>Comissão e pagamentos, <Ouro>prontos</Ouro></> : p < T6.barras[0] ? <>Do bruto <Ouro>ao lucro real</Ouro></> : p < T6.receitas[0] ? <>Mês a mês, <Ouro>sem planilha</Ouro></> : p < T6.projecao[0] ? <>Cada entrada, <Ouro>com o método</Ouro></> : p < T6.despesas[0] ? <>E o que <Ouro>vem por aí</Ouro></> : p < T6.taxas[0] ? <>As contas <Ouro>no lugar</Ouro></> : p < T6.fim[0] ? <>A taxa de cada <Ouro>bandeira</Ouro></> : <>Seu dinheiro, <Ouro>às claras</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -190 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const quadro = (seg: number[], n: number, etiqueta: string, conteudo: React.ReactNode) => p >= seg[0] - 0.01 && p < seg[1] + 0.012 && (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [seg[0], seg[1] + 0.006], 0.012) }}>
      <Etiqueta n={n} texto={etiqueta} o={1} />
      {conteudo}
    </div>
  )
  // cascata: as barras crescem uma depois da outra; o "fica" conta até o valor
  const maxC = 17335, altC = Math.min(230, alto * 0.28)
  // no celular os 5 valores não cabem com centavos: arredonda os grandes (as taxas ficam com centavos)
  const curto = (v: number) => tela < 600 && v >= 1000 ? brl(Math.round(v)).replace(',00', '') : brl(v)
  const conta = (i: number) => faixa(p, 0.422 + i * 0.012, 0.432 + i * 0.012)
  const maxB = 18845
  return (
    <>
    <section ref={abre} id="financeiro" aria-labelledby="t-fin-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 6 · FLUXO FINANCEIRO · 1 MIN</p>
        <h2 id="t-fin-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Quanto entrou, quanto saiu e <Ouro>quanto ficou</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['O dinheiro do mês por método', 'Pix, dinheiro, crédito e débito'], ['As taxas da maquininha', 'descontadas sozinhas, bandeira por bandeira'], ['Despesas e comissões', 'o que sai, já calculado'], ['O líquido e a projeção', 'o que fica e o que vem pela frente']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-financeiro" data-filme="70" aria-labelledby="t-fin" style={{ position: 'relative', height: reduzir ? 'auto' : '1000vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-fin" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: o valor do mês embaçado, ninguém sabe quanto sobrou */}
          <Cartao o={1 - faixa(p, T6.dor[1] - 0.012, T6.dor[1])}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>FIM DO MÊS</p>
            {[['Entrou', 'R$ 17.335'], ['Taxas da maquininha', '?'], ['Despesas', '?'], ['Lucro real', '?']].map(([r, v], i) => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid rgba(94,84,75,0.1)' : 'none', opacity: faixa(p, 0.004 + i * 0.01, 0.012 + i * 0.01) }}>
                <span style={{ fontSize: 17 }}>{r}</span>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: i === 3 ? 30 : 20, color: i === 3 ? '#b4532a' : TAUPE, filter: v === '?' ? `blur(${3 - 2 * faixa(p, 0.04, 0.06)}px)` : 'none' }}>{v === '?' ? 'R$ ?.???' : v}</b>
              </div>
            ))}
          </Cartao>
          {/* o financeiro no celular: o mês inteiro, rolando por dentro */}
          {quadro(T6.fone, 1, 'FINANCEIRO · 30 dias, no celular', lado(Math.max(janela(p, [0.085, 0.18], 0.008), janela(p, [0.195, 0.29], 0.008), janela(p, [0.305, 0.345], 0.008), janela(p, [0.36, 0.405], 0.008)),
            <IPhone p={p} w={wPhone} barra rotulo="Financeiro do mês no celular: realizado, bruto, taxas e líquido, recebido por método, comissões e atendimentos"
              rolagem={{ img: C6('fone-financeiro'), de: 0, ate: 2, y0: 0, y1: 1585, alturaCss: 2400, cabecalho: 0, y: rolFin }} />,
            <>
              <Lupa p={p} de={0.085} ate={0.115} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 205, w: 366, h: 130 }} w={wLupa} titulo="TUDO QUE ENTROU EM 30 DIAS" />
              <Lupa p={p} de={0.12} ate={0.15} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 478, w: 366, h: 125 }} w={wLupa} titulo="LUCRO REAL, JÁ SEM TAXAS E DESPESAS" />
              <Lupa p={p} de={0.155} ate={0.18} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 622, w: 366, h: 84 }} w={wLupa} titulo="BRUTO − TAXAS = LÍQUIDO" />
              <Lupa p={p} de={0.195} ate={0.238} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 757, w: 366, h: 150 }} w={wLupa} titulo="PIX E DINHEIRO" />
              <Lupa p={p} de={0.243} ate={0.29} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 900, w: 366, h: 215 }} w={wLupa} titulo="CARTÃO: A TAXA JÁ SAI SOZINHA" />
              <Lupa p={p} de={0.305} ate={0.345} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 1318, w: 366, h: 226 }} w={wLupa} titulo="COMISSÃO JÁ CALCULADA" />
              <Lupa p={p} de={0.36} ate={0.405} img={C6('fone-financeiro')} fonte={PAG} regiao={{ x: 12, y: 1585, w: 366, h: 212 }} w={wLupa} titulo="CADA ATENDIMENTO: PAGO OU A RECEBER" />
            </>))}
          {/* MOMENTO-ASSINATURA 1 · a cascata: do bruto ao que fica */}
          {p >= T6.cascata[0] - 0.01 && p < T6.cascata[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T6.cascata[0], T6.cascata[1] + 0.006], 0.012) }}>
              <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(18px, 3vw, 30px)', borderRadius: 28, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.18)', color: TAUPE }}>
                <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>ÚLTIMOS 30 DIAS · DO BRUTO AO LUCRO REAL</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(8px, 2vw, 18px)', alignItems: 'end', height: altC + 64 }}>
                  {CASCATA.map(([r, v, tipo], i) => {
                    const t = conta(i)
                    // a barra que sai "pendura" a partir do topo do que sobrou até ali
                    const h = (v / maxC) * altC * t, base = tipo === 'sai' ? ((CASCATA_ANTES[i] - v) / maxC) * altC : 0
                    const cor = tipo === 'entra' ? 'linear-gradient(180deg,#E3C28E,#C9974A)' : tipo === 'sai' ? 'linear-gradient(180deg,#f19a8f,#d9534f)' : tipo === 'sub' ? 'linear-gradient(180deg,#d8cbbb,#a99682)' : 'linear-gradient(180deg,#5fd39a,#16a34a)'
                    return (
                      <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <b style={{ fontSize: 'clamp(12px, 2.4vw, 16px)', whiteSpace: 'nowrap', color: tipo === 'sai' ? '#d9534f' : tipo === 'fica' ? '#16a34a' : TAUPE, opacity: t, marginBottom: 6 }}>{tipo === 'sai' ? '− ' : ''}{curto(tipo === 'fica' ? v * t : v)}</b>
                        <div style={{ width: '70%', height: h, marginBottom: base, borderRadius: 8, background: cor, boxShadow: tipo === 'fica' ? `0 0 ${24 * t}px rgba(22,163,74,0.35)` : 'none', minHeight: t > 0 ? 3 : 0 }} />
                        <span style={{ marginTop: 8, fontSize: 'clamp(11px, 2vw, 13px)', textAlign: 'center', lineHeight: 1.2, color: '#8C7360', fontWeight: 700 }}>{r}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {/* MOMENTO-ASSINATURA 2 · os 4 meses em barras (fluxo de caixa mensal) */}
          {p >= T6.barras[0] - 0.01 && p < T6.barras[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T6.barras[0], T6.barras[1] + 0.006], 0.012) }}>
              <Etiqueta n={2} texto="FLUXO DE CAIXA · mês a mês" o={1} />
              <div style={{ width: '100%', maxWidth: 680, marginTop: 30, padding: 'clamp(18px, 3vw, 30px)', borderRadius: 28, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.18)', color: TAUPE }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a' }} />Entrou</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: '#d9534f' }} />Saiu (despesas + taxas)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(8px, 2.4vw, 22px)', alignItems: 'end', height: Math.min(220, alto * 0.26) + 70 }}>
                  {MESES.map(([m, ent, sai], i) => {
                    const t = faixa(p, 0.508 + i * 0.012, 0.52 + i * 0.012), alt = Math.min(220, alto * 0.26)
                    return (
                      <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <b style={{ fontSize: 'clamp(11px, 2.2vw, 14px)', color: '#16a34a', opacity: t, whiteSpace: 'nowrap' }}>{brl(ent - sai).replace(',00', '')}</b>
                        <span style={{ fontSize: 11, color: '#8C7360', opacity: t, marginBottom: 6 }}>ficou</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', width: '80%', justifyContent: 'center' }}>
                          <div style={{ width: '46%', height: (ent / maxB) * alt * t, borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(180deg,#5fd39a,#16a34a)' }} />
                          <div style={{ width: '46%', height: (sai / maxB) * alt * t, borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(180deg,#f19a8f,#d9534f)' }} />
                        </div>
                        <span style={{ marginTop: 8, fontWeight: 800 }}>{m}</span>
                      </div>
                    )
                  })}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#8C7360' }}>* outubro até o dia 19. Valores da tela Fluxo de Caixa, mês a mês.</p>
              </div>
            </div>
          )}
          {/* notebook: receitas por método · projeção · despesas · taxas (destaques legíveis ao lado) */}
          {quadro(T6.receitas, 3, 'FLUXO › Receitas de outubro', lado(janela(p, [0.595, 0.655], 0.01),
            <MacBook p={p} w={wMac} passos={[{ img: C6('note-receitas'), de: 0 }]} rotulo="Detalhamento das receitas de outubro, uma por uma, com a forma de pagamento" />,
            <Destaque p={p} de={0.595} ate={0.655} w={wLupa} titulo="CADA ENTRADA, COM O MÉTODO" linhas={[['Marcela · Pix', 'R$ 200,00', '#16a34a'], ['Marcela · Cartão de crédito', 'R$ 224,00', '#16a34a'], ['Karina · Cartão de débito', 'R$ 185,00', '#16a34a'], ['Manuela · Pix', 'R$ 80,00', '#16a34a']]} rodape="44 entradas em outubro · exporta em CSV" />))}
          {quadro(T6.projecao, 4, 'FLUXO › Projeção do mês', lado(janela(p, [0.675, 0.735], 0.01),
            <MacBook p={p} w={wMac} passos={[{ img: C6('note-projecao'), de: 0 }]} rotulo="Fluxo de caixa com a projeção do mês: já marcado, vai sair e sobra pelo histórico" />,
            <Destaque p={p} de={0.675} ate={0.735} w={wLupa} titulo="PROJEÇÃO · RESTO DE OUTUBRO" linhas={[['Já marcado na agenda', 'R$ 9.780,00', '#16a34a'], ['Contas que vão sair', 'R$ 2.680,00', '#d9534f'], ['Sobra pelo seu histórico', 'R$ 10.800,00', '#2563eb']]} rodape="É compromisso, não caixa: não se mistura com o realizado." />))}
          {quadro(T6.despesas, 5, 'DESPESAS · outubro', lado(janela(p, [0.755, 0.825], 0.01),
            <MacBook p={p} w={wMac} passos={[{ img: C6('note-despesas'), de: 0 }]} rotulo="Despesas do mês: a pagar, por categoria e a lista" />,
            <Destaque p={p} de={0.755} ate={0.825} w={wLupa} titulo="O QUE SAIU E O QUE VAI SAIR" linhas={[['Aluguel', 'R$ 2.400,00'], ['Produtos', 'R$ 1.440,00'], ['Energia, água e internet', 'R$ 605,00'], ['Marketing', 'R$ 500,00'], ['A pagar até o dia 28', 'R$ 2.680,00', '#d9534f']]} rodape="Recorrentes entram sozinhas todo mês · um toque em Paguei" />))}
          {quadro(T6.taxas, 6, 'CONFIGURAÇÕES · Maquininha', lado(janela(p, [0.845, 0.905], 0.01),
            <MacBook p={p} w={wMac} passos={[{ img: C6('note-taxas'), de: 0 }]} rotulo="Maquininha da recepção com a taxa de cada bandeira no débito e no crédito" />,
            <Destaque p={p} de={0.845} ate={0.905} w={wLupa} titulo="CADASTRA UMA VEZ, CALCULA SEMPRE" linhas={[['Visa e Mastercard · débito', '1,37%'], ['Visa e Mastercard · crédito', '3,15%'], ['Elo · débito / crédito', '1,89% / 3,69%'], ['Taxa efetiva no mês', '2,62%', '#C9974A']]} rodape="Taxas de exemplo: você coloca as da sua maquininha." />))}
          {/* fecho */}
          <Cartao o={janela(p, T6.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>FINANCEIRO NO AGENDAPRO</p>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Seu dinheiro, <Ouro>às claras</Ouro></p>
            <p style={{ margin: '0 0 12px', fontSize: 15, color: '#8C7360' }}>Sem planilha e sem precisar abrir caixa: tudo sai das comandas pagas.</p>
            {[['Entrada por método', 'Pix, dinheiro, crédito e débito'], ['Taxas e comissões', 'descontadas e calculadas sozinhas'], ['Despesas e projeção', 'o que sai e o que vem pela frente']].map(([t, d], i) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: faixa(p, 0.925 + i * 0.01, 0.935 + i * 0.01) }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T6.dor[1], texto: <>Fim do mês: entrou bastante. <b>Mas sobrou quanto?</b></> },
          { de: T6.fone[0], ate: 0.18, texto: <>No celular: o que entrou, as taxas e o <b>lucro real</b>, já calculado.</> },
          { de: 0.18, ate: 0.29, texto: <>Separado por <b>Pix, dinheiro, crédito e débito</b>, com a taxa de cada um já descontada.</> },
          { de: 0.29, ate: T6.fone[1], texto: <>A <b>comissão</b> de cada profissional, e cada atendimento: pago ou a receber.</> },
          { de: T6.cascata[0], ate: T6.cascata[1], texto: <>Do que entrou sai a taxa da maquininha, saem as despesas, e fica o seu <Ouro>lucro real</Ouro>.</> },
          { de: T6.barras[0], ate: T6.barras[1], texto: <>Mês a mês, o que entrou e o que saiu. <b>Sem planilha.</b></> },
          { de: T6.receitas[0], ate: T6.receitas[1], texto: <>Um clique e aparece cada entrada, <b>com a forma de pagamento</b>.</> },
          { de: T6.projecao[0], ate: T6.projecao[1], texto: <>E a <Ouro>projeção</Ouro>: o que já está marcado e as contas que vão vencer.</> },
          { de: T6.despesas[0], ate: T6.despesas[1], texto: <>As despesas por categoria, e o que ainda <b>falta pagar</b>.</> },
          { de: T6.taxas[0], ate: T6.taxas[1], texto: <>A taxa de cada bandeira você cadastra <b>uma vez</b>. O sistema calcula sempre.</> },
          { de: T6.fim[0], ate: 1.01, texto: <>Seu dinheiro, <Ouro>às claras</Ouro>, sem precisar abrir caixa.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 7 · EQUIPE E ACESSOS ───────────────
   Roteiro v2 #9 ("toque no site: trocar de acesso"). Telas REAIS: a dona marca os cargos e desliga áreas da gerente;
   3 logins de teste na conta espelho (autorizados pelo Eduardo 19/10) mostram o celular de cada uma:
   Bianca (profissional) · Paula (recepção) · Larissa (gerente sem Financeiro e sem Equipe) → ao abrir o Financeiro,
   "Essa área não está liberada pra você". Momento-assinatura: TROCAR DE ACESSO (3 celulares lado a lado no notebook;
   no celular, um aparelho com 3 botões que troca sozinho e também no toque) + o cadeado fechando. */
const C7 = (s: string) => `/clinicas/cap7/${s}.webp`
const T7 = { dor: [0, 0.09], dona: [0.09, 0.3], tres: [0.3, 0.62], ganhos: [0.62, 0.76], bloqueio: [0.76, 0.88], fim: [0.88, 1.01] }
const IMGS_CAP7 = ['dona-cargos', 'dona-areas', 'bianca-menu', 'bianca-ganhos', 'paula-menu', 'larissa-menu', 'larissa-bloqueado', 'note-remun-lista', 'note-remun-paga', 'note-remun-historico', 'j-remun-selecao', 'j-remun-confirmar'].map(C7)
const ACESSOS: { id: string; cargo: string; nome: string; img: string; ve: string; de: number; ate: number }[] = [
  { id: 'prof', cargo: 'Profissional', nome: 'Bianca', img: 'bianca-menu', ve: 'Os atendimentos e horários dela, e o próprio financeiro: a comissão.', de: 0.3, ate: 0.405 },
  { id: 'recep', cargo: 'Recepção', nome: 'Paula', img: 'paula-menu', ve: 'Agenda da equipe, comandas, clientes, produtos e caixa. Sem o financeiro.', de: 0.405, ate: 0.51 },
  { id: 'ger', cargo: 'Gerente', nome: 'Larissa', img: 'larissa-menu', ve: 'O painel inteiro, menos o que você desligou. Aqui: financeiro e equipe.', de: 0.51, ate: 0.62 },
]

function CapEquipe({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP7)
  const p0 = useProgresso(ref)
  /* v2 (19/10) · REMUNERAÇÃO entra entre os ganhos e a área fechada, com tempo próprio (q 0→1):
     o resto do capítulo segue na régua antiga (p), comprimida antes e depois do trecho novo. */
  const real = reduzir ? 0.3 : p0
  const R0 = 0.56, R1 = 0.84
  const emRem = real >= R0 && real < R1
  const p = real < R0 ? (real / R0) * 0.76 : real < R1 ? 0.76 : 0.76 + ((real - R1) / (1 - R1)) * 0.24
  const q = faixa(real, R0, R1)
  // irPara recebe a posição na régua antiga (p) e converte pra rolagem real
  const irPara = (alvo: number) => () => { const el = ref.current; const r = alvo < 0.76 ? (alvo / 0.76) * R0 : R1 + ((alvo - 0.76) / 0.24) * (1 - R1); if (el) window.scrollTo({ top: el.offsetTop + r * (el.offsetHeight - window.innerHeight), behavior: 'smooth' }) }
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wTres = Math.min(250, (alto - 360) * (390 / 844) * 0.9)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7)
  const wj = (r: { w: number; h: number }) => Math.min(largo ? 520 : tela * 0.92, (alto - 360) * (r.w / r.h))
  const PAG = { w: 390, h: 844 }
  const J_SEL = { x: 360, y: 0, w: 720, h: 690 }, J_CONF = { x: 496, y: 115, w: 446, h: 675 }
  const tituloRem = q < 0.2 ? <>No fim do mês, <Ouro>a remuneração</Ouro></> : q < 0.7 ? <>Paga a comissão, <Ouro>desconta o vale</Ouro></> : <>Tudo pago, <Ouro>tudo registrado</Ouro></>
  const ladoRem = largo ? { position: 'absolute' as const, right: '2%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute' as const, left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }
  const remuneracao = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(q, [0, 1.006], 0.03) }}>
      <Etiqueta n={3} texto="REMUNERAÇÕES · Bianca, outubro" o={1} />
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -170 * Math.max(janela(q, [0.03, 0.19], 0.02), janela(q, [0.72, 0.99], 0.02)) : 0}px)` }}>
        <MacBook p={q} w={wMac} recua={janela(q, [0.2, 0.7], 0.03)} rotulo="Remunerações do mês: comissão, bônus, vale e o histórico de pagamentos"
          passos={[{ img: C7('note-remun-lista'), de: 0 }, { img: C7('note-remun-paga'), de: 0.7, corte: true }, { img: C7('note-remun-historico'), de: 0.84, corte: true }]}
          toques={[{ x: 560, y: 420, em: 0.185 }]} />
      </div>
      <JanelaSistema p={q} de={0.2} ate={0.42} recortada regiao={J_SEL} w={wj(J_SEL)} passos={[{ img: C7('j-remun-selecao'), de: 0 }]} toques={[{ x: 955, y: 35, em: 0.4 }]} rotulo="Cada atendimento da profissional com a comissão dele, selecionado pra pagar" />
      <JanelaSistema p={q} de={0.44} ate={0.69} recortada regiao={J_CONF} w={wj(J_CONF)} passos={[{ img: C7('j-remun-confirmar'), de: 0 }]} toques={[{ x: 823, y: 744, em: 0.665 }]} rotulo="Confirmar pagamento: comissão R$ 1.396, vale de R$ 150 descontado, você paga agora R$ 1.246" />
      <div style={ladoRem}>
        <Destaque p={q} de={0.03} ate={0.19} w={wLupa} titulo="BIANCA · OUTUBRO" linhas={[['Comissão dos atendimentos', 'R$ 1.396,00'], ['Bônus · meta batida (já pago)', 'R$ 100,00', '#16a34a'], ['Vale · adiantamento', '− R$ 150,00', '#d9534f']]} rodape="Calculado sozinho: 40% sobre o valor com desconto." />
        <Destaque p={q} de={0.72} ate={0.835} w={wLupa} titulo="RESUMO DO MÊS" linhas={[['Total de remunerações', 'R$ 2.112,29'], ['Total pago', 'R$ 2.112,29', '#16a34a'], ['Vales pendentes', 'R$ 0,00'], ['Falta pagar', 'R$ 0,00', '#16a34a']]} />
        <Destaque p={q} de={0.855} ate={0.99} w={wLupa} titulo="HISTÓRICO DA BIANCA" linhas={[['19/10 · Bônus · meta de outubro', 'R$ 100,00'], ['19/10 · Comissão · vale descontado', 'R$ 1.396,00'], ['Total pago no mês', 'R$ 1.496,00', '#C9974A']]} />
      </div>
    </div>
  )
  const FALAS_REM: Fala[] = [
    { de: 0, ate: 0.2, texto: <>No fim do mês, a remuneração de cada uma já está <b>calculada</b>: comissão, bônus e vale.</> },
    { de: 0.2, ate: 0.44, texto: <>Você vê cada atendimento com a comissão dele e escolhe <b>o que pagar</b>.</> },
    { de: 0.44, ate: 0.7, texto: <>O vale já sai <Ouro>descontado</Ouro>: da comissão de R$ 1.396, ela recebe R$ 1.246 agora.</> },
    { de: 0.7, ate: 0.84, texto: <>Tudo pago, e o resumo do mês <b>fecha certinho</b>.</> },
    { de: 0.84, ate: 1.01, texto: <>E cada pagamento fica no <Ouro>histórico</Ouro> dela.</> },
  ]
  const titulo = p < T7.dona[0] ? <>Uma senha só, <Ouro>todo mundo vê tudo?</Ouro></> : p < T7.tres[0] ? <>Você decide <Ouro>quem vê o quê</Ouro></> : p < T7.ganhos[0] ? <>Cada uma, <Ouro>o seu acesso</Ouro></> : p < T7.bloqueio[0] ? <>A profissional vê <Ouro>os ganhos dela</Ouro></> : p < T7.fim[0] ? <>O que você desligou, <Ouro>fica fechado</Ouro></> : <>Cada um no <Ouro>seu lugar</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -190 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const quadro = (seg: number[], n: number, etiqueta: string, conteudo: React.ReactNode) => p >= seg[0] - 0.01 && p < seg[1] + 0.012 && (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [seg[0], seg[1] + 0.006], 0.012) }}>
      <Etiqueta n={n} texto={etiqueta} o={1} />
      {conteudo}
    </div>
  )
  const ativo = ACESSOS.findIndex((a) => p >= a.de && p < a.ate)
  // o cadeado fecha quando a gerente tenta abrir o Financeiro
  const fecha = faixa(p, 0.79, 0.81)
  return (
    <>
    <section ref={abre} id="equipe" aria-labelledby="t-equipe-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 7 · EQUIPE E REMUNERAÇÃO · 1 MIN</p>
        <h2 id="t-equipe-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Cada pessoa vê <Ouro>só o que precisa</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['Você escolhe o cargo', 'profissional, recepção ou gerente'], ['O celular de cada uma', 'troque de acesso e compare'], ['Os ganhos e o pagamento', 'comissão, bônus e vale descontado, com histórico'], ['A área fechada', 'o que você desliga, a gerente não abre']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-equipe" data-filme="60" aria-labelledby="t-equipe" style={{ position: 'relative', height: reduzir ? 'auto' : '1000vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-equipe" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{emRem ? tituloRem : titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {emRem ? remuneracao : (<>
          {/* a dor: uma senha só pra todo mundo */}
          <Cartao o={1 - faixa(p, T7.dor[1] - 0.012, T7.dor[1])}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>UMA SENHA PRA CLÍNICA TODA</p>
            {['A recepção vê quanto você lucra', 'A profissional vê o que a colega ganha', 'Qualquer um mexe nos preços'].map((t, i) => {
              const o = faixa(p, 0.008 + i * 0.016, 0.018 + i * 0.016)
              return (
                <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid rgba(94,84,75,0.1)' : 'none', opacity: o, transform: `translateX(${(1 - o) * -12}px)` }}>
                  <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b4532a" strokeWidth="2.2" strokeLinecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span style={{ fontSize: 17 }}>{t}</span>
                </div>
              )
            })}
          </Cartao>
          {/* o lado da dona: cargos e o que a gerente acessa */}
          {quadro(T7.dona, 1, 'VOCÊ, NA FICHA DA LARISSA', lado(Math.max(janela(p, [0.11, 0.19], 0.008), janela(p, [0.21, 0.295], 0.008)),
            <IPhone p={p} w={wPhone} barra passos={[{ img: C7('dona-cargos'), de: 0 }, { img: C7('dona-areas'), de: 0.2, corte: true }]} toques={[{ x: 219, y: 532, em: 0.15 }]} rotulo="Ficha da colaboradora: cargos e as áreas que a gerente acessa" />,
            <>
              <Lupa p={p} de={0.11} ate={0.19} img={C7('dona-cargos')} fonte={PAG} regiao={{ x: 22, y: 425, w: 346, h: 200 }} w={wLupa} titulo="CARGOS QUE SE SOMAM" toques={[{ x: 219, y: 532, em: 0.15 }]} />
              <Lupa p={p} de={0.21} ate={0.295} img={C7('dona-areas')} fonte={PAG} regiao={{ x: 38, y: 340, w: 316, h: 130 }} w={wLupa} titulo="FINANCEIRO E EQUIPE: DESLIGADOS" />
            </>))}
          {/* MOMENTO-ASSINATURA · trocar de acesso */}
          {p >= T7.tres[0] - 0.01 && p < T7.tres[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: janela(p, [T7.tres[0], T7.tres[1] + 0.006], 0.012) }}>
              <div role="tablist" aria-label="Trocar de acesso" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: '#fff', boxShadow: '0 10px 26px rgba(94,84,75,0.15)', zIndex: 8 }}>
                {ACESSOS.map((a, i) => (
                  <button key={a.id} type="button" role="tab" aria-selected={ativo === i} onClick={irPara((a.de + a.ate) / 2)}
                    style={{ padding: '8px 14px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', color: ativo === i ? '#fff' : TAUPE, background: ativo === i ? TAUPE : 'transparent', transition: 'background .3s, color .3s' }}>{a.cargo}</button>
                ))}
              </div>
              {largo ? (
                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                  {ACESSOS.map((a, i) => {
                    const foco = ativo === i
                    return (
                      <div key={a.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: foco ? 1 : 0.42, transform: `scale(${foco ? 1.04 : 0.94})`, transition: 'opacity .4s, transform .4s', width: wTres }}>
                        <IPhone p={p} w={wTres} barra passos={[{ img: C7(a.img), de: 0 }]} rotulo={`Menu do acesso de ${a.cargo.toLowerCase()}: ${a.ve}`} />
                        <p style={{ margin: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.35, color: TAUPE }}><b>{a.cargo} · {a.nome}</b><br /><span style={{ color: '#8C7360' }}>{a.ve}</span></p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {ACESSOS.map((a, i) => (
                    <div key={a.id} style={{ position: i ? 'absolute' : 'relative', inset: 0, opacity: ativo === i || (ativo < 0 && i === 0) ? 1 : 0, transition: 'opacity .35s' }}>
                      <IPhone p={p} w={Math.min(wPhone, (alto - 470) * (390 / 844))} barra passos={[{ img: C7(a.img), de: 0 }]} rotulo={`Menu do acesso de ${a.cargo.toLowerCase()}: ${a.ve}`} />
                    </div>
                  ))}
                  {/* no celular a explicação fica embaixo do aparelho e troca junto */}
                  <p style={{ margin: '12px auto 0', maxWidth: 320, textAlign: 'center', fontSize: 14, lineHeight: 1.35, color: TAUPE, minHeight: 56 }}>
                    <b>{ACESSOS[Math.max(0, ativo)].cargo} · {ACESSOS[Math.max(0, ativo)].nome}</b><br /><span style={{ color: '#8C7360' }}>{ACESSOS[Math.max(0, ativo)].ve}</span>
                  </p>
                </div>
              )}
            </div>
          )}
          {/* os ganhos da profissional */}
          {quadro(T7.ganhos, 2, 'NO CELULAR DA BIANCA · profissional', lado(janela(p, [0.635, 0.755], 0.01),
            <IPhone p={p} w={wPhone} barra passos={[{ img: C7('bianca-ganhos'), de: 0 }]} rotulo="Meu Financeiro da profissional: comissão do mês, a receber e média por atendimento" />,
            <Lupa p={p} de={0.635} ate={0.755} img={C7('bianca-ganhos')} fonte={PAG} regiao={{ x: 16, y: 215, w: 358, h: 135 }} w={wLupa} titulo="A COMISSÃO DELA, JÁ CALCULADA" />))}
          {/* a área fechada: a gerente tenta abrir o Financeiro */}
          {quadro(T7.bloqueio, 4, 'NO CELULAR DA LARISSA · gerente', lado(janela(p, [0.775, 0.875], 0.01),
            <div style={{ position: 'relative' }}>
              <IPhone p={p} w={wPhone} barra passos={[{ img: C7('larissa-bloqueado'), de: 0 }]} rotulo="A gerente tenta abrir o Financeiro e o sistema avisa que a área não está liberada" />
              {/* cadeado: a alça desce e fecha */}
              <svg aria-hidden width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', right: -18, top: '38%', filter: 'drop-shadow(0 10px 18px rgba(60,48,38,0.3))', opacity: faixa(p, 0.775, 0.785) }}>
                <rect x="12" y="28" width="40" height="30" rx="8" fill="url(#cadeado)" />
                <path d="M22 28 v-8 a10 10 0 0 1 20 0 v8" fill="none" stroke="#8C7360" strokeWidth="5" strokeLinecap="round" transform={`translate(0 ${-10 * (1 - fecha)})`} />
                <circle cx="32" cy="42" r="4" fill="#fff" />
                <defs><linearGradient id="cadeado" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E3C28E" /><stop offset="1" stopColor="#C9974A" /></linearGradient></defs>
              </svg>
            </div>,
            <Lupa p={p} de={0.775} ate={0.875} img={C7('larissa-bloqueado')} fonte={PAG} regiao={{ x: 16, y: 392, w: 358, h: 82 }} w={wLupa} titulo="FINANCEIRO: FECHADO PRA ELA" />))}
          {/* fecho */}
          <Cartao o={janela(p, T7.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>EQUIPE NO AGENDAPRO</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Cada um no <Ouro>seu lugar</Ouro></p>
            {[['Login próprio pra cada pessoa', 'nada de senha compartilhada'], ['Profissional', 'a agenda e a comissão dela'], ['Remuneração', 'comissão, bônus e vale num pagamento só'], ['Gerente', 'só as áreas que você liberar']].map(([t, d], i) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: faixa(p, 0.895 + i * 0.01, 0.905 + i * 0.01) }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
          </>)}
        </div>
        {emRem ? <Narracao p={q} falas={FALAS_REM} /> : <Narracao p={p} falas={[
          { de: 0, ate: T7.dor[1], texto: <>Uma senha só pra clínica toda, e <b>todo mundo vê tudo</b>.</> },
          { de: T7.dona[0], ate: 0.2, texto: <>No AgendaPRO, você marca o <b>cargo</b> de cada pessoa. Eles se somam.</> },
          { de: 0.2, ate: T7.dona[1], texto: <>Pra gerente, você <Ouro>desliga</Ouro> o que ela não deve ver.</> },
          { de: T7.tres[0], ate: 0.405, texto: <>A <b>profissional</b> vê os atendimentos e os ganhos dela.</> },
          { de: 0.405, ate: 0.51, texto: <>A <b>recepção</b> cuida da agenda, das comandas e do caixa. Sem o financeiro.</> },
          { de: 0.51, ate: T7.tres[1], texto: <>E a <b>gerente</b> vê o painel, menos o que você desligou.</> },
          { de: T7.ganhos[0], ate: T7.ganhos[1], texto: <>A comissão da profissional sai <Ouro>calculada</Ouro>, sem ela ver a das colegas.</> },
          { de: T7.bloqueio[0], ate: T7.bloqueio[1], texto: <>Se a gerente tenta abrir o Financeiro, <b>está fechado</b>.</> },
          { de: T7.fim[0], ate: 1.01, texto: <>Cada um no seu lugar, e <Ouro>você no controle</Ouro>.</> },
        ]} />}
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 8 · PACOTES DE SESSÕES ───────────────
   Feito de verdade na conta espelho (19/10): pacote "Pele em dia · 4 limpezas" (4 × Limpeza de Pele de
   Manutenção R$ 185 = R$ 740 cheio, pacote R$ 620, válido 120 dias); vendido pra Marcela no Pix (entra no
   caixa do dia); 1ª sessão resgatada no agendamento de 18/11 com a Camila, serviço entrando R$ 0,00;
   saldo conferido no banco: 1 de 4 usada, "Restam 3 de 4". O link da cliente NÃO mostra o saldo do pacote:
   não prometer isso aqui. Momento-assinatura: a cartela de sessões com o carimbo. */
const C8 = (s: string) => `/clinicas/cap8/${s}.webp`
const T8 = { dor: [0, 0.1], criar: [0.1, 0.345], vender: [0.345, 0.575], resgatar: [0.575, 0.82], cartela: [0.82, 0.9], fim: [0.9, 1.01] }
const IMGS_CAP8 = ['note-vazio', 'note-lista', 'j-criar', 'j-vender', 'j-pagar', 'j-ativos-4', 'j-agendar', 'j-ativos-3'].map(C8)
const R8 = { criar: { x: 383, y: 35, w: 671, h: 829 }, vender: { x: 495, y: 262, w: 447, h: 388 }, pagar: { x: 488, y: 262, w: 452, h: 366 }, ativos: { x: 495, y: 250, w: 447, h: 395 }, agendar: { x: 430, y: 44, w: 577, h: 810 } }
const PAPEL: [string, string, number][] = [['Marcela · pacote 4 limpezas', 'pago', 0.012], ['agosto', '✓', 0.026], ['setembro', '✓', 0.04], ['outubro', '✓ ?', 0.054]]

function CapPacotes({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP8)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.86 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const wj = (r: { w: number; h: number }) => Math.min(largo ? 520 : tela * 0.92, (alto - (r.h > 600 ? 420 : 360)) * (r.w / r.h))
  // formulário alto no notebook: vai pra esquerda e a parte que importa aparece grande na lupa
  const desvio = (o: number) => ({ position: 'absolute' as const, inset: 0, transform: `translateX(${largo ? -200 * o : 0}px)`, marginTop: 30 })
  const titulo = p < T8.criar[0] ? <>O pacote <Ouro>no papel</Ouro></> : p < T8.vender[0] ? <>Monte o pacote <Ouro>uma vez</Ouro></> : p < T8.resgatar[0] ? <>Vendeu, <Ouro>recebeu</Ouro></> : p < T8.cartela[0] ? <>Ela usa, <Ouro>o saldo baixa</Ouro></> : p < T8.fim[0] ? <>Cada sessão, <Ouro>marcada</Ouro></> : <>Recebe antes, <Ouro>atende depois</Ouro></>
  const etapa = p < T8.vender[0] ? { n: 1, t: 'PACOTES · criar' } : p < T8.resgatar[0] ? { n: 2, t: 'PACOTES · vender pra Marcela' } : { n: 3, t: 'NO DIA DA SESSÃO · novembro' }
  // o carimbo cai na 1ª bolinha da cartela; o "4" vira "3"
  const carimbo = suaveF(faixa(p, 0.84, 0.852))
  const usadas = p >= 0.848 ? 1 : 0
  return (
    <>
    <section ref={abre} id="pacotes" aria-labelledby="t-pacotes-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 8 · PACOTES DE SESSÕES · 55 S</p>
        <h2 id="t-pacotes-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Venda o tratamento <Ouro>inteiro</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver:</p>
        {[['Criar o pacote', 'quantas sessões, preço fechado e validade'], ['Vender pra cliente', 'pago na venda, entra no caixa de hoje'], ['Usar uma sessão', 'no agendamento, o serviço entra R$ 0'], ['O saldo de cada cliente', 'quantas faltam e até quando vale']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-pacotes" data-filme="55" aria-labelledby="t-pacotes" style={{ position: 'relative', height: reduzir ? 'auto' : '820vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-pacotes" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: o pacote anotado no caderno, ninguém sabe quantas faltam */}
          <Cartao o={1 - faixa(p, T8.dor[1] - 0.012, T8.dor[1])}>
            <div style={{ position: 'relative', padding: '4px 4px 4px 22px', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 37px, rgba(94,84,75,0.12) 37px 38px)', borderLeft: '2px solid rgba(201,151,74,0.35)' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CADERNO · PACOTES</p>
              {PAPEL.map(([t, v, em]) => {
                const o = faixa(p, em, em + 0.01)
                return <div key={t} style={{ display: 'flex', justifyContent: 'space-between', height: 38, alignItems: 'center', opacity: o, transform: `translateX(${(1 - o) * -12}px)`, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(19px, 2.6vw, 26px)', color: '#3f3a35' }}><span>{t}</span><span style={{ color: v.includes('?') ? '#b4532a' : undefined }}>{v}</span></div>
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 46, marginTop: 4, borderTop: '2px solid #3f3a35', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(22px, 3vw, 30px)', color: '#3f3a35', opacity: faixa(p, 0.07, 0.08) }}>
                <span>faltam…</span>
                <span style={{ display: 'flex', gap: 12 }}>{['2', '1'].map((t, i) => <span key={t} style={{ position: 'relative', opacity: p >= 0.072 + i * 0.006 ? 1 : 0 }}>{t}<span style={{ position: 'absolute', left: -3, right: -3, top: '52%', height: 2, background: '#b4532a', transform: `scaleX(${faixa(p, 0.076 + i * 0.006, 0.079 + i * 0.006)})`, transformOrigin: 'left' }} /></span>)}<span style={{ color: '#b4532a', opacity: faixa(p, 0.088, 0.093) }}>?</span></span>
              </div>
            </div>
          </Cartao>
          {/* o sistema: Pacotes no computador + as janelas de criar, vender e resgatar */}
          {p >= T8.criar[0] - 0.012 && p < T8.cartela[0] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T8.criar[0], T8.cartela[0] + 0.006], 0.012) }}>
              <Etiqueta n={etapa.n} texto={etapa.t} o={1} />
              <div style={{ marginTop: 36, transform: `translateX(${largo ? -170 * Math.max(janela(p, [0.295, 0.345], 0.01), janela(p, [0.537, 0.575], 0.01)) : 0}px)` }}>
                <MacBook p={p} w={wMac} recua={Math.max(janela(p, [0.14, 0.29], 0.02), janela(p, [0.362, 0.536], 0.02), janela(p, [0.585, 0.82], 0.02))} rotulo="Tela de Pacotes no computador da clínica: o pacote criado e o botão Vender pra um cliente"
                  passos={[{ img: C8('note-vazio'), de: 0 }, { img: C8('note-lista'), de: 0.29, corte: true }]}
                  toques={[{ x: 1265, y: 117, em: 0.13 }, { x: 605, y: 407, em: 0.355 }]} />
              </div>
              <div style={desvio(janela(p, [0.175, 0.255], 0.01))}><JanelaSistema p={p} de={0.14} ate={0.27} recortada regiao={R8.criar} w={wj(R8.criar)} passos={[{ img: C8('j-criar'), de: 0 }]} toques={[{ x: 996, y: 831, em: 0.262 }]} rotulo="Novo pacote: nome, preço do pacote, validade de 120 dias e 4 sessões de limpeza de manutenção" /></div>
              <JanelaSistema p={p} de={0.362} ate={0.445} recortada regiao={R8.vender} w={wj(R8.vender)} passos={[{ img: C8('j-vender'), de: 0 }]} toques={[{ x: 845, y: 612, em: 0.437 }]} rotulo="Vender pacote pra Marcela: o pacote é pago na venda e entra no caixa de hoje" />
              <JanelaSistema p={p} de={0.455} ate={0.525} recortada regiao={R8.pagar} w={wj(R8.pagar)} passos={[{ img: C8('j-pagar'), de: 0 }]} toques={[{ x: 615, y: 412, em: 0.515 }]} rotulo="Como a Marcela vai pagar: Pix, dinheiro, cartão ou deixar em aberto" />
              <JanelaSistema p={p} de={0.59} ate={0.655} recortada regiao={R8.ativos} w={wj(R8.ativos)} passos={[{ img: C8('j-ativos-4'), de: 0 }]} toques={[{ x: 852, y: 536, em: 0.647 }]} rotulo="Sessão de pacote: Marcela, pacote ativo, restam 4 de 4 sessões" />
              <div style={desvio(janela(p, [0.675, 0.735], 0.01))}><JanelaSistema p={p} de={0.665} ate={0.745} recortada regiao={R8.agendar} w={wj(R8.agendar)} passos={[{ img: C8('j-agendar'), de: 0 }]} toques={[{ x: 943, y: 764, em: 0.715 }, { x: 960, y: 820, em: 0.737 }]} rotulo="Agendamento já ligado ao pacote: 18/11, Camila Rocha, total R$ 0,00" /></div>
              <JanelaSistema p={p} de={0.755} ate={0.81} recortada regiao={R8.ativos} w={wj(R8.ativos)} passos={[{ img: C8('j-ativos-3'), de: 0 }]} rotulo="Depois do resgate: restam 3 de 4 sessões" />
              <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>
                {largo && <Destaque p={p} de={0.175} ate={0.255} w={wLupa} titulo="O QUE VOCÊ PREENCHE" linhas={[['Nome', 'Pele em dia · 4 limpezas'], ['Serviço', 'Limpeza de manutenção'], ['Sessões', '4'], ['Validade', '120 dias']]} rodape="Dá pra juntar serviços e produtos no mesmo pacote." />}
                {largo && <Lupa p={p} de={0.675} ate={0.735} img={C8('j-agendar')} fonte={R8.agendar} regiao={{ x: 0, y: 520, w: 577, h: 290 }} w={wLupa} titulo="RESGATANDO DO PACOTE · TOTAL R$ 0,00" />}
                <Destaque p={p} de={0.295} ate={0.345} w={wLupa} titulo="PELE EM DIA · 4 LIMPEZAS" linhas={[['4 sessões avulsas', 'R$ 740,00'], ['Desconto do pacote', '− R$ 120,00', '#16a34a'], ['Preço do pacote', 'R$ 620,00', '#C9974A'], ['Validade', '120 dias']]} rodape="O preço e a validade quem decide é você." />
                <Destaque p={p} de={0.537} ate={0.575} w={wLupa} titulo="VENDIDO PRA MARCELA" linhas={[['Pago no Pix', 'R$ 620,00', '#16a34a'], ['Entrou no caixa', 'hoje'], ['Sessões', '4'], ['Vale até', '16/02/2027']]} />
              </div>
            </div>
          )}
          {/* momento-assinatura: a cartela de sessões e o carimbo */}
          <Cartao o={janela(p, T8.cartela, 0.012)}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CARTELA DA MARCELA</p>
            <p style={{ margin: '0 0 18px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(22px, 3.6vw, 34px)', lineHeight: 1.05 }}>Pele em dia · 4 limpezas</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(8px, 2vw, 16px)', marginBottom: 18 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '50%', border: '2px dashed rgba(140,115,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C7360', fontWeight: 800, fontSize: 'clamp(13px, 2vw, 16px)', opacity: faixa(p, 0.822 + i * 0.004, 0.83 + i * 0.004) }}>
                  {i + 1}ª
                  {i === 0 && carimbo > 0 && (
                    <span style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1, fontSize: 'clamp(11px, 1.8vw, 14px)', boxShadow: '0 10px 24px rgba(140,115,96,0.35)', opacity: carimbo, transform: `scale(${1.7 - 0.7 * carimbo}) rotate(${-14 + 4 * carimbo}deg)` }}>
                      <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>18/11
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 16, background: CREME }}>
              <span style={{ fontWeight: 700, marginRight: 12 }}>Restam</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(24px, 6vw, 34px)', whiteSpace: 'nowrap', color: '#C9974A' }}><span key={usadas} style={{ display: 'inline-block', animation: usadas ? 'pulsar 0.5s ease-out' : undefined }}>{4 - usadas}</span> de 4 sessões</span>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 16, color: '#8C7360', opacity: faixa(p, 0.856, 0.866) }}>Sessão de 18/11 com a Camila: o serviço entrou <b>R$ 0,00</b>, porque já foi pago na venda. Vale até 16/02/2027.</p>
          </Cartao>
          {/* fecho */}
          <Cartao o={janela(p, T8.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>PACOTES NO AGENDAPRO</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>O dinheiro entra <Ouro>antes</Ouro></p>
            {[['Preço fechado', 'com o desconto que você escolher'], ['Pago na venda', 'entra no caixa do dia, no Pix, dinheiro ou cartão'], ['Resgate no agendamento', 'a sessão já sai ligada ao pacote'], ['Saldo e validade', 'de cada cliente, sem caderno']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T8.dor[1], texto: <>Pacote anotado no caderno: <b>ninguém sabe quantas sessões faltam</b>.</> },
          { de: T8.criar[0], ate: 0.14, texto: <>Em Pacotes, você toca em <b>Novo pacote</b>.</> },
          { de: 0.14, ate: 0.29, texto: <>Escolhe o serviço, <b>quantas sessões</b>, o preço fechado e a validade.</> },
          { de: 0.29, ate: T8.vender[0], texto: <>Quatro limpezas de R$ 740 viram um pacote de <Ouro>R$ 620</Ouro>.</> },
          { de: T8.vender[0], ate: 0.45, texto: <>Vende pra Marcela: o pacote é <b>pago na venda</b>.</> },
          { de: 0.45, ate: 0.535, texto: <>Pix, dinheiro ou cartão: <b>um toque</b> e está pago.</> },
          { de: 0.535, ate: T8.vender[1], texto: <>Os R$ 620 já entram <Ouro>no caixa de hoje</Ouro>.</> },
          { de: T8.resgatar[0], ate: 0.66, texto: <>Em novembro ela volta: o sistema mostra <b>o pacote ativo dela</b>.</> },
          { de: 0.66, ate: 0.75, texto: <>O agendamento já sai ligado ao pacote, e o serviço entra <b>R$ 0,00</b>.</> },
          { de: 0.75, ate: T8.resgatar[1], texto: <>E o saldo baixa sozinho: <Ouro>restam 3 de 4</Ouro>.</> },
          { de: T8.cartela[0], ate: T8.cartela[1], texto: <>Cada sessão marcada, com data e validade, <b>sem caderno</b>.</> },
          { de: T8.fim[0], ate: 1.01, texto: <>Você recebe antes e ela volta <Ouro>o tratamento inteiro</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 9 · E AINDA TEM… ───────────────
   Vitrine rápida, tudo feito de verdade na conta espelho (19/10):
   · Repetir atendimento: Mariana, Protocolo Vaccine, toda semana × 4 → 4 agendamentos no banco (21/10 · 28/10 · 04/11 · 11/11, 14h, Camila);
   · Lista de espera no link: 14:00 ocupado → Renata entra na fila (linha em waitlist). O aviso sai por E-MAIL (só se ela informar),
     então a página diz "avisa", sem prometer WhatsApp;
   · Cartaz: o HTML que o botão Imprimir monta, com a logo; aqui o QR aponta pra /clinicas (não pro link da conta de teste);
   · Importar: planilha fictícia de 5 clientes → prévia "Lidos 5 · Novos 5", nada gravado.
   Sob medida (chave por cliente, já entregues): convênios com empresas, cartão presente, sessões em dias fixos da semana. */
const C9 = (s: string) => `/clinicas/cap9/${s}.webp`
const T9 = { abre: [0, 0.07], repetir: [0.07, 0.29], espera: [0.29, 0.53], cartaz: [0.53, 0.75], importar: [0.75, 0.92], fim: [0.92, 1.01] }
const IMGS_CAP9 = ['note-repetir-antes', 'note-repetir', 'fone-horarios', 'fone-espera-form', 'fone-espera-preenchido', 'fone-na-fila', 'cartaz', 'note-importar', 'note-arquivo', 'note-previa'].map(C9)
const VITRINE: [string, string][] = [['Atendimento que se repete', 'marca o tratamento inteiro de uma vez'], ['Lista de espera', 'horário cheio vira cliente na fila'], ['Cartaz com QR Code', 'pra recepção, com a sua logo'], ['Importar clientes', 'traz a lista do sistema antigo']]
// calendário de outubro/novembro 2026 (começa na segunda 19/10): os 4 dias que o sistema marcou
const SEMANAS = [[19, 20, 21, 22, 23, 24, 25], [26, 27, 28, 29, 30, 31, 1], [2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15]]
const MARCADOS: [number, number][] = [[0, 2], [1, 2], [2, 2], [3, 2]]

function CapVitrine({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP9)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.96 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wMac = Math.min(largo ? 860 : tela * 0.94, 980, (alto - 300) / 0.7)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const PAG = { w: 390, h: 844 }, NOTE = { w: 1440, h: 900 }
  const titulo = p < T9.repetir[0] ? <>E ainda <Ouro>tem mais</Ouro></> : p < T9.espera[0] ? <>O tratamento <Ouro>inteiro marcado</Ouro></> : p < T9.cartaz[0] ? <>Horário cheio? <Ouro>Lista de espera</Ouro></> : p < T9.importar[0] ? <>Um cartaz <Ouro>pra recepção</Ouro></> : p < T9.fim[0] ? <>Trocar de sistema <Ouro>sem redigitar</Ouro></> : <>E o que for <Ouro>da sua clínica</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -180 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  const bloco = (t: number[], n: number, etiqueta: string, conteudo: React.ReactNode) => p >= t[0] - 0.012 && p < t[1] + 0.012 && (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [t[0], t[1] + 0.006], 0.012) }}>
      <Etiqueta n={n} texto={etiqueta} o={1} />
      {conteudo}
    </div>
  )
  // cartaz: cai na parede balançando e para; o celular entra e "lê" o QR
  const cai = faixa(p, 0.545, 0.575)
  const balanco = Math.sin(cai * Math.PI * 3) * (1 - cai) * 7
  const fone = suaveF(faixa(p, 0.63, 0.66)), leitura = faixa(p, 0.66, 0.69), achou = faixa(p, 0.69, 0.7)
  const wCartaz = Math.min(largo ? 330 : tela * 0.62, (alto - 330) * (740 / 1080))
  // importar: o arquivo voa até a área de envio
  const voo = suaveF(faixa(p, 0.785, 0.81))
  return (
    <>
    <section ref={abre} id="mais" aria-labelledby="t-mais-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 9 · E AINDA TEM… · 40 S</p>
        <h2 id="t-mais-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>Os detalhes que <Ouro>poupam o seu dia</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver, rapidinho:</p>
        {VITRINE.map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-mais" data-filme="40" aria-labelledby="t-mais" style={{ position: 'relative', height: reduzir ? 'auto' : '760vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-mais" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* abertura: as 4 peças entrando uma a uma */}
          <Cartao o={1 - faixa(p, T9.abre[1] - 0.012, T9.abre[1])}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>E AINDA TEM…</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {VITRINE.map(([t, d], i) => {
                const o = faixa(p, 0.008 + i * 0.012, 0.018 + i * 0.012)
                return (
                  <div key={t} style={{ padding: '14px 14px', borderRadius: 18, background: CREME, opacity: o, transform: `translateY(${(1 - o) * 16}px) scale(${0.94 + 0.06 * o})` }}>
                    <b style={{ display: 'block', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.15 }}>{t}</b>
                    <span style={{ color: '#8C7360', fontSize: 14 }}>{d}</span>
                  </div>
                )
              })}
            </div>
          </Cartao>
          {/* 1 · repetir atendimento */}
          {bloco(T9.repetir, 1, 'NOVO AGENDAMENTO · Mariana, toda semana', lado(janela(p, [0.135, 0.285], 0.01),
            <MacBook p={p} w={wMac} passos={[{ img: C9('note-repetir-antes'), de: 0 }, { img: C9('note-repetir'), de: 0.125, corte: true }]} toques={[{ x: 573, y: 449, em: 0.118 }]} rotulo="Novo agendamento com Repetir atendimento ligado: toda semana, 4 vezes" />,
            <>
              <Lupa p={p} de={0.135} ate={0.2} img={C9('note-repetir')} fonte={NOTE} regiao={{ x: 449, y: 427, w: 538, h: 225 }} w={wLupa} titulo="TODA SEMANA · 4 VEZES" />
              {p >= 0.2 && p < 0.29 && (
                <div style={{ gridArea: '1 / 1', alignSelf: 'end', width: wLupa, borderRadius: 22, background: '#fff', boxShadow: '0 30px 70px rgba(60,48,38,0.22), 0 0 0 1px rgba(94,84,75,0.06)', padding: '12px 16px 14px', color: TAUPE, opacity: janela(p, [0.2, 0.285], 0.012) }}>
                  <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, letterSpacing: 1, color: '#8C7360' }}>NA AGENDA · 4 AGENDAMENTOS DE UMA VEZ</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 12, textAlign: 'center', color: '#8C7360', fontWeight: 700 }}>
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
                    {SEMANAS.flatMap((sem, si) => sem.map((dia, di) => {
                      const k = MARCADOS.findIndex(([a, b]) => a === si && b === di)
                      const o = k < 0 ? 0 : faixa(p, 0.212 + k * 0.012, 0.22 + k * 0.012)
                      return (
                        <span key={`${si}-${di}`} style={{ position: 'relative', height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: o > 0.5 ? '#fff' : TAUPE, fontWeight: o > 0.5 ? 800 : 500 }}>
                          {k >= 0 && <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: DOURADO, opacity: o, transform: `scale(${0.4 + 0.6 * o})` }} />}
                          <span style={{ position: 'relative' }}>{dia}</span>
                        </span>
                      )
                    }))}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: '#8C7360', opacity: faixa(p, 0.26, 0.268) }}>Quartas às 14h, com a Camila. Horário ocupado? O sistema avisa qual.</p>
                </div>
              )}
            </>))}
          {/* 2 · lista de espera no link */}
          {bloco(T9.espera, 2, 'NO CELULAR DELA · pelo seu link', lado(janela(p, [0.455, 0.53], 0.01),
            <IPhone p={p} w={wPhone} barra rotulo="Link da clínica: horário das 14h ocupado, a cliente entra na lista de espera e recebe a confirmação"
              passos={[{ img: C9('fone-horarios'), de: 0 }, { img: C9('fone-espera-form'), de: 0.33, corte: true }, { img: C9('fone-espera-preenchido'), de: 0.415, corte: true }, { img: C9('fone-na-fila'), de: 0.44, corte: true }]}
              toques={[{ x: 58, y: 524 + 47, em: 0.322 }, { x: 144, y: 657 + 47, em: 0.432 }]}
              campos={[
                { x: 33, y: 686 + 47, w: 324, h: 45, texto: 'Renata Prado', de: 0.345, ate: 0.365, vazio: '', tam: 16, some: 0.415 },
                { x: 33, y: 742 + 47, w: 324, h: 45, texto: '11900001101', de: 0.37, ate: 0.388, vazio: '', tam: 16, some: 0.415 },
                { x: 33, y: 799 + 47, w: 324, h: 45, texto: 'renata.prado@studio-aurora.test', de: 0.392, ate: 0.41, vazio: '', tam: 16, some: 0.415 },
              ]} />,
            <Lupa p={p} de={0.455} ate={0.53} img={C9('fone-na-fila')} fonte={PAG} regiao={{ x: 6, y: 196, w: 378, h: 80 }} w={wLupa} titulo="ELA ESTÁ NA FILA DAS 14H" />))}
          {/* 3 · cartaz: o do sistema, preso na parede, e o celular lendo o QR */}
          {bloco(T9.cartaz, 3, 'CONFIGURAÇÕES · Cartaz de agendamento', (
            <div style={{ position: 'relative', marginTop: 40, width: wCartaz, height: wCartaz * (1080 / 740) }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: '#fff', boxShadow: '0 30px 60px rgba(60,48,38,0.25), 0 2px 0 rgba(0,0,0,0.04)', transformOrigin: '50% 0', transform: `translateY(${(1 - suaveF(cai)) * -120}%) rotate(${balanco}deg)`, opacity: faixa(p, 0.54, 0.55) }}>
                <img src={C9('cartaz')} alt="Cartaz de agendamento gerado pelo sistema: nome da clínica, QR Code com a logo e o link" decoding="async" style={{ display: 'block', width: '100%', height: '100%', borderRadius: 6 }} />
                {[['8%', -8], ['78%', 7]].map(([l, r]) => <span key={l as string} aria-hidden style={{ position: 'absolute', top: -12, left: l as string, width: '16%', height: 26, background: 'rgba(227,194,142,0.55)', transform: `rotate(${r}deg)`, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />)}
              </div>
              {/* o celular (o mesmo iPhone da página) passando na frente do QR, com a câmera lendo */}
              <div aria-hidden style={{ position: 'absolute', left: '50%', top: '18%', marginLeft: -wCartaz * 0.27, opacity: fone * (1 - faixa(p, 0.735, 0.75)), transform: `translate(${(1 - fone) * 130}%, ${(1 - fone) * 20}%) rotate(${(1 - fone) * 12 - 3}deg)`, zIndex: 3 }}>
                <IPhone p={p} w={wCartaz * 0.54} rotulo="Câmera do celular lendo o QR Code do cartaz">
                  {(k) => (
                    <div style={{ position: 'absolute', inset: 0, background: '#111', overflow: 'hidden' }}>
                      <img src={C9('cartaz')} alt="" decoding="async" style={{ position: 'absolute', left: 38 * k, top: 171 * k, width: 314 * k, height: 458 * k, maxWidth: 'none', filter: 'brightness(0.92) contrast(1.05)' }} />
                      <span style={{ position: 'absolute', left: 55 * k, top: 260 * k, width: 280 * k, height: 280 * k, border: `${3 * k}px solid rgba(255,255,255,0.9)`, borderRadius: 22 * k }} />
                      <span style={{ position: 'absolute', left: 55 * k, width: 280 * k, top: (260 + 280 * leitura) * k, height: 3 * k, background: '#E3C28E', boxShadow: '0 0 14px #E3C28E', opacity: leitura > 0 && leitura < 1 ? 1 : 0 }} />
                      <span style={{ position: 'absolute', left: 20 * k, right: 20 * k, top: 70 * k, padding: `${12 * k}px ${14 * k}px`, borderRadius: 18 * k, background: 'rgba(255,255,255,0.95)', color: TAUPE, fontSize: 17 * k, fontWeight: 700, lineHeight: 1.3, opacity: achou, transform: `translateY(${(1 - achou) * -16 * k}px)` }}>Abrir a agenda da clínica<br /><span style={{ fontWeight: 500, color: '#8C7360', fontSize: 15 * k }}>agendapro.net.br/…</span></span>
                    </div>
                  )}
                </IPhone>
              </div>
            </div>
          ))}
          {/* 4 · importar clientes */}
          {bloco(T9.importar, 4, 'IMPORTAR · clientes do sistema antigo', lado(janela(p, [0.845, 0.915], 0.01),
            <div style={{ position: 'relative' }}>
              <MacBook p={p} w={wMac} passos={[{ img: C9('note-importar'), de: 0 }, { img: C9('note-arquivo'), de: 0.812, corte: true }, { img: C9('note-previa'), de: 0.838, corte: true }]} toques={[{ x: 845, y: 588, em: 0.83 }]} rotulo="Importar dados: sobe a planilha, confere a prévia e só depois grava" />
              {/* a planilha voando até a área de envio */}
              <span aria-hidden style={{ position: 'absolute', left: `${12 + 38 * voo}%`, top: `${82 - 40 * voo}%`, padding: '8px 10px', borderRadius: 10, background: '#fff', boxShadow: '0 14px 30px rgba(60,48,38,0.25)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 800, color: '#16794a', opacity: faixa(p, 0.775, 0.785) * (1 - faixa(p, 0.808, 0.814)), transform: `scale(${1 - 0.3 * voo}) rotate(${(1 - voo) * -8}deg)`, zIndex: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16794a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>clientes.csv
              </span>
            </div>,
            <Destaque p={p} de={0.845} ate={0.915} w={wLupa} titulo="PRÉVIA · NADA GRAVADO AINDA" linhas={[['Clientes lidas na planilha', '5'], ['Novas a criar', '5', '#C9974A'], ['Já cadastradas (mesmo telefone)', '0'], ['Puladas', '0']]} rodape="Telefone repetido? Você decide uma por uma antes de gravar." />))}
          {/* fecho: sob medida */}
          <Cartao o={janela(p, T9.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>SOB MEDIDA</p>
            <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(24px, 3.8vw, 38px)', lineHeight: 1.05 }}>Sua clínica tem <Ouro>um jeito próprio</Ouro>?</p>
            <p style={{ margin: '0 0 12px', color: '#8C7360' }}>A gente já criou pra clínicas que usam o AgendaPRO:</p>
            {[['Convênio com empresas', 'atende o funcionário e manda o extrato do mês pra empresa'], ['Cartão presente', 'com código impresso e os serviços do vale'], ['Sessões em dias fixos', 'terça e quinta, no mesmo horário, até fechar o tratamento']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T9.abre[1], texto: <>E ainda tem os detalhes que <b>poupam o seu dia</b>.</> },
          { de: T9.repetir[0], ate: 0.135, texto: <>Cliente que vem toda semana? Liga o <b>Repetir atendimento</b>.</> },
          { de: 0.135, ate: 0.2, texto: <>Escolhe a frequência e quantas vezes: <b>toda semana, 4 vezes</b>.</> },
          { de: 0.2, ate: T9.repetir[1], texto: <>E o tratamento inteiro já fica <Ouro>marcado na agenda</Ouro>.</> },
          { de: T9.espera[0], ate: 0.33, texto: <>No seu link, ela vê que as 14h estão <b>ocupadas</b> e toca mesmo assim.</> },
          { de: 0.33, ate: 0.44, texto: <>Deixa o nome e o contato pra entrar na <b>lista de espera</b>.</> },
          { de: 0.44, ate: T9.espera[1], texto: <>Se alguém desistir, ela recebe <b>um aviso por e-mail</b> e <Ouro>o horário não fica vazio</Ouro>.</> },
          { de: T9.cartaz[0], ate: 0.63, texto: <>Na recepção, o cartaz com o QR Code e a <b>sua logo</b>: o sistema gera, você imprime.</> },
          { de: 0.63, ate: T9.cartaz[1], texto: <>A cliente aponta a câmera e <Ouro>agenda sozinha</Ouro>, a qualquer hora.</> },
          { de: T9.importar[0], ate: 0.835, texto: <>Vindo de outro sistema? Sobe a <b>planilha de clientes</b>.</> },
          { de: 0.835, ate: T9.importar[1], texto: <>Você confere a prévia e <Ouro>nada é gravado</Ouro> antes do seu OK.</> },
          { de: T9.fim[0], ate: 1.01, texto: <>E se a sua clínica precisar de algo diferente, <Ouro>a gente faz sob medida</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── CAPÍTULO 10 · SUPORTE QUE AJUSTA ───────────────
   O diferencial (Eduardo, 18/10): "nós adequamos o sistema de acordo com as necessidades dos clientes".
   Tudo real e autorizado (Wanessa e Rosy, 18/10: voz, nome, foto e prints):
   · pedido da Wanessa no WhatsApp, qua 30/09 21:27 → resposta 21:56 → "Dia personalizado" no ar sex 02/10 (v142/v143);
   · a tela de hoje (gravada no espelho 19/10): sexta 30/10 das 9h às 13h, "as outras sextas não mudam" (linha em working_hours_dates);
   · dúvida da comanda 15:48 → passo a passo 15:52 (print 174930);
   · áudio da Wanessa 13/10 (0–9,3 s) e fala da Rosy (vídeo, 51,75–59 s), palavras com tempo do faster-whisper.
   Os áudios só baixam no toque (preload none). */
const C10 = (s: string) => `/clinicas/cap10/${s}.webp`
const T10 = { dor: [0, 0.08], pedido: [0.08, 0.35], prazo: [0.35, 0.44], feito: [0.44, 0.62], casos: [0.62, 0.73], vozes: [0.73, 0.92], fim: [0.92, 1.01] }
const IMGS_CAP10 = ['fone-horarios', 'fone-form', 'fone-horas', 'fone-salvo', 'wanessa', 'rosy'].map(C10)
const PEDIDO = 'Boa noite, sugiro que os horários sejam editáveis em dias tbm, exemplo eu não quero atender toda sexta mas quero que na sexta dia 09/10 tenha atendimento pq na quinta não vou poder atender o dia todo.'
type Depo = { id: string; nome: string; quem: string; foto: string; audio: string; dur: number; ondas: number[]; palavras: [number, string][] }
const DEPOS: Depo[] = [
  { id: 'wanessa', nome: 'Wanessa Silva', quem: 'Wanessa Silva Estética', foto: C10('wanessa'), audio: '/clinicas/cap10/wanessa.m4a', dur: 9.3,
    ondas: [0.22, 1, 0.72, 0.57, 0.57, 0.4, 0.39, 0.29, 0.34, 0.28, 0.6, 0.54, 0.44, 0.36, 0.7, 0.72, 0.67, 0.65, 0.2, 0.22, 0.83, 0.89, 0.43, 0.46, 0.62, 0.47, 0.46, 0.59, 0.54, 0.21, 0.23, 0.22, 0.36, 0.51, 0.75, 0.43],
    palavras: [[0, 'Eu'], [0.4, 'estou'], [0.48, 'gostando'], [0.86, 'muito'], [1.3, 'do'], [1.72, 'sistema,'], [3.16, 'até'], [3.8, 'porque'], [4.4, 'todos'], [5.28, 'os'], [5.56, 'ajustes'], [6.04, 'que'], [6.12, 'eu'], [6.2, 'preciso,'], [6.48, 'você'], [6.84, 'consegue'], [7.34, 'ajeitar.']] },
  { id: 'rosy', nome: 'Rosy Borges', quem: 'Rosy Borges Beauty Studio', foto: C10('rosy'), audio: '/clinicas/cap10/rosy.m4a', dur: 7.3,
    ondas: [0.79, 1, 1, 0.78, 0.55, 0.3, 0.24, 0.21, 0.43, 0.53, 0.76, 0.76, 0.53, 0.39, 0.39, 0.44, 0.34, 0.22, 0.22, 0.21, 0.21, 0.26, 0.38, 0.7, 0.96, 0.69, 0.55, 0.35, 0.25, 0.82, 0.57, 0.77, 0.5, 0.28, 0.23, 0.18],
    palavras: [[0, 'Eu'], [0.16, 'acho'], [0.36, 'que'], [0.46, 'vale'], [0.6, 'a'], [0.68, 'pena.'], [1.72, 'A'], [1.78, 'gente'], [1.92, 'tem'], [2.16, 'agendas'], [2.5, 'hoje'], [2.8, 'que'], [3.06, 'não'], [4.62, 'estão'], [4.68, 'entregando'], [5.02, 'nada,'], [5.32, 'e'], [5.92, 'essa'], [6.14, 'entrega'], [6.5, 'muito.']] },
]

/** bolha de áudio do WhatsApp: a onda e as palavras andam com a rolagem; ▶ toca a voz de verdade (e aí andam com o áudio) */
function AudioDepo({ d, t: tRolagem, o, w }: { d: Depo; t: number; o: number; w: number }) {
  const [tocando, setTocando] = useState(false), [tAudio, setTAudio] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    if (!tocando) return
    let raf = 0
    const passo = () => { const a = audio.current; if (a) setTAudio(a.currentTime); raf = requestAnimationFrame(passo) }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [tocando])
  const alternar = () => {
    const a = audio.current ?? (audio.current = new Audio(d.audio))
    a.onended = () => { setTocando(false); setTAudio(0) }
    if (tocando) { a.pause(); setTocando(false) } else { a.currentTime = 0; a.play().then(() => setTocando(true)).catch(() => setTocando(false)) }
  }
  const t = tocando ? tAudio : tRolagem * d.dur
  const fr = Math.min(1, t / d.dur)
  return (
    <figure style={{ margin: 0, width: w, opacity: o, transform: `translateY(${(1 - o) * 24}px)`, pointerEvents: o > 0.5 ? 'auto' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 18, background: '#fff', boxShadow: '0 20px 50px rgba(60,48,38,0.16)' }}>
        <button type="button" onClick={alternar} aria-label={tocando ? `Pausar o áudio de ${d.nome}` : `Ouvir o áudio de ${d.nome}`} style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', border: 0, background: TAUPE, color: CREME, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor">{tocando ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l13 8-13 8z" />}</svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 2, height: 30 }}>
            {d.ondas.map((h, i) => <span key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 2, background: i / d.ondas.length < fr ? '#C9974A' : 'rgba(94,84,75,0.25)' }} />)}
          </div>
          <span style={{ fontSize: 12, color: '#8C7360' }}>0:{String(Math.round(tocando ? tAudio : d.dur)).padStart(2, '0')}</span>
        </div>
        <img src={d.foto} alt={d.nome} width={46} height={46} loading="lazy" style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
      </div>
      <blockquote style={{ margin: '12px 4px 4px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(19px, 2.4vw, 24px)', lineHeight: 1.35, color: TAUPE }}>
        “{d.palavras.map(([em, pal], i) => <span key={i} style={{ color: t >= em ? TAUPE : 'rgba(94,84,75,0.28)', transition: 'color .15s' }}>{pal}{i < d.palavras.length - 1 ? ' ' : ''}</span>)}”
      </blockquote>
      <figcaption style={{ margin: '0 4px', fontSize: 14, color: '#8C7360' }}><b style={{ color: TAUPE }}>{d.nome}</b> · {d.quem}</figcaption>
    </figure>
  )
}

function CapSuporte({ reduzir }: { reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null), abre = useRef<HTMLElement>(null)
  usePreCarregar(abre, IMGS_CAP10)
  const p0 = useProgresso(ref)
  const p = reduzir ? 0.85 : p0
  const tela = useLargura(), alto = useAltura()
  const largo = tela >= 900
  const wPhone = Math.min(tela >= 600 ? 360 : 300, tela * 0.78, (alto - 330) * (390 / 844) * 0.93)
  const wLupa = largo ? 400 : Math.min(tela - 24, 420)
  const PAG = { w: 390, h: 844 }
  const titulo = p < T10.pedido[0] ? <>“O sistema <Ouro>é assim</Ouro>”?</> : p < T10.prazo[0] ? <>Ela pediu. <Ouro>A gente ouviu</Ouro></> : p < T10.feito[0] ? <>Pediu na quarta, <Ouro>no ar na sexta</Ouro></> : p < T10.casos[0] ? <>O pedido dela <Ouro>virou recurso</Ouro></> : p < T10.vozes[0] ? <>Gente de verdade <Ouro>do outro lado</Ouro></> : p < T10.fim[0] ? <>Quem usa, <Ouro>fala</Ouro></> : <>Um sistema que <Ouro>se ajusta a você</Ouro></>
  const lado = (o: number, aparelho: React.ReactNode, lupas: React.ReactNode) => (
    <>
      <div style={{ marginTop: 36, transform: `translateX(${largo ? -180 * o : 0}px)` }}>{aparelho}</div>
      <div style={largo ? { position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', zIndex: 7, display: 'grid' } : { position: 'absolute', left: 0, right: 0, bottom: 6, display: 'grid', justifyItems: 'center', zIndex: 7 }}>{lupas}</div>
    </>
  )
  // o prazo: a folhinha vira de quarta 30/09 pra sexta 02/10
  const vira = faixa(p, 0.365, 0.405)
  const dia = vira < 0.5 ? { d: '30', s: 'QUARTA', m: 'SET' } : vira < 0.999 ? { d: '01', s: 'QUINTA', m: 'OUT' } : { d: '02', s: 'SEXTA', m: 'OUT' }
  const noAr = faixa(p, 0.405, 0.415)
  const wDepo = Math.min(largo ? 440 : tela - 40, 460)
  return (
    <>
    <section ref={abre} id="suporte" aria-labelledby="t-suporte-abre" style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 680, padding: 'clamp(24px, 5vw, 44px)', borderRadius: 32, background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.14)', color: TAUPE }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CAPÍTULO 10 · SUPORTE · 50 S</p>
        <h2 id="t-suporte-abre" style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.05 }}>O sistema se ajusta <Ouro>à sua clínica</Ouro></h2>
        <p style={{ margin: '0 0 14px', fontWeight: 700 }}>Você vai ver, com casos reais:</p>
        {[['O pedido da Wanessa', 'no WhatsApp, numa quarta à noite'], ['No ar em 2 dias', 'o recurso que ela pediu, pra todo mundo'], ['Resposta em minutos', 'dúvida do dia a dia com o passo a passo'], ['Quem usa, fala', 'a voz da Wanessa e da Rosy']].map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
            <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: DOURADO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</span>
            <span><b>{t}</b><br /><span style={{ color: '#8C7360' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </section>
    <section ref={ref} id="filme-suporte" data-filme="50" aria-labelledby="t-suporte" style={{ position: 'relative', height: reduzir ? 'auto' : '840vh' }}>
      <div style={{ position: reduzir ? 'relative' : 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '64px 16px 20px', overflow: 'hidden' }}>
        <h2 id="t-suporte" style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4.6vw, 52px)', letterSpacing: -1, color: TAUPE, lineHeight: 1.05 }}>{titulo}</h2>
        <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 24 }}>
          {/* a dor: o "não dá" de sempre */}
          <Cartao o={1 - faixa(p, T10.dor[1] - 0.012, T10.dor[1])}>
            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>VOCÊ JÁ OUVIU ISSO?</p>
            {[['Dá pra abrir só uma sexta, sem abrir todas?', 'ela', 0.008], ['Infelizmente o sistema é assim.', 'eles', 0.03], ['Vamos anotar sua sugestão 🙂', 'eles', 0.048]].map(([t, de, em]) => {
              const o = faixa(p, em as number, (em as number) + 0.01)
              return <div key={t as string} style={{ display: 'flex', justifyContent: de === 'ela' ? 'flex-end' : 'flex-start', marginTop: 10, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}><span style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 16, background: de === 'ela' ? '#d9fdd3' : CREME, fontSize: 'clamp(16px, 2vw, 19px)', textDecoration: de === 'eles' && p > 0.062 ? 'line-through rgba(180,83,42,0.7)' : 'none' }}>{t}</span></div>
            })}
            <p style={{ margin: '16px 0 0', fontSize: 17, color: '#8C7360', opacity: faixa(p, 0.06, 0.07) }}>Aqui a resposta foi outra.</p>
          </Cartao>
          {/* o pedido de verdade, no WhatsApp do suporte */}
          {p >= T10.pedido[0] - 0.01 && p < T10.pedido[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T10.pedido[0], T10.pedido[1] + 0.006], 0.012) }}>
              <Etiqueta n={1} texto="WHATSAPP DO SUPORTE · quarta, 30/09" o={1} />
              <div style={{ marginTop: 36 }}>
                <IPhone p={p} w={wPhone} rotulo="Conversa real: a Wanessa sugere horário por data e o suporte responde que vai adicionar">
                  {(k) => <ConversaWhatsApp p={p} k={k} nome="Wanessa Silva" diaHistorico="Quarta-feira"
                    msgs={[
                      { de: 'ela', t: PEDIDO, em: 0.11, hora: '21:27' },
                      { de: 'eu', t: 'Boa noite, está bem, vamos adicionar essa função, e lhe aviso quando estiver ativa', em: 0.19, hora: '21:56' },
                      { de: 'ela', t: 'Obrigada', em: 0.225, hora: '22:06' },
                      { de: 'ela', t: 'Desculpa a hora', em: 0.24, hora: '22:06' },
                      { de: 'eu', t: 'Tudo bem, pode mandar mensagens e sugestões a qualquer horário', em: 0.3, hora: '22:20' },
                    ]} />}
                </IPhone>
              </div>
            </div>
          )}
          {/* o prazo: folhinha virando + carimbo NO AR */}
          <Cartao o={janela(p, T10.prazo, 0.012)}>
            <div style={{ display: 'flex', flexDirection: tela >= 600 ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(16px, 4vw, 34px)', textAlign: tela >= 600 ? 'left' : 'center' }}>
              <div aria-hidden style={{ position: 'relative', flex: 'none' }}>
              <div style={{ position: 'relative', width: 'clamp(130px, 22vw, 170px)', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 20px 40px rgba(60,48,38,0.18)', textAlign: 'center', perspective: 600 }}>
                <div style={{ padding: '8px 0', background: DOURADO, color: '#fff', fontWeight: 800, letterSpacing: 3, fontSize: 14 }}>{dia.m}</div>
                <div style={{ padding: '6px 0 14px', transform: `rotateX(${Math.sin(vira * Math.PI * 2) * 25}deg)` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(54px, 9vw, 74px)', lineHeight: 1 }}>{dia.d}</div>
                  <div style={{ fontWeight: 800, letterSpacing: 3, fontSize: 13, color: '#8C7360' }}>{dia.s}</div>
                </div>
              </div>
                <span style={{ position: 'absolute', right: -26, bottom: -14, padding: '6px 12px', borderRadius: 10, border: '3px solid #16a34a', color: '#16a34a', fontWeight: 900, letterSpacing: 2, fontSize: 16, background: '#fff', boxShadow: '0 8px 18px rgba(22,163,74,0.18)', opacity: noAr, transform: `rotate(-12deg) scale(${1.8 - 0.8 * noAr})` }}>NO AR</span>
              </div>
              <div style={{ maxWidth: 300 }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 4, color: '#8C7360' }}>DO PEDIDO AO RECURSO</p>
                <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1 }}><Ouro>2 dias</Ouro></p>
                <p style={{ margin: 0, fontSize: 17, color: '#8C7360' }}>Pediu quarta às 21:27. Na sexta, o <b style={{ color: TAUPE }}>Dia personalizado</b> estava no ar, pra todas as clínicas.</p>
              </div>
            </div>
          </Cartao>
          {/* o recurso, hoje: Horários › + Dia personalizado */}
          {p >= T10.feito[0] - 0.01 && p < T10.feito[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: janela(p, [T10.feito[0], T10.feito[1] + 0.006], 0.012) }}>
              <Etiqueta n={2} texto="CONFIGURAÇÕES · Horários" o={1} />
              {lado(janela(p, [0.545, 0.62], 0.01),
                <IPhone p={p} w={wPhone} barra rotulo="Horários: Dia personalizado, só a sexta 30/10 das 9h às 13h, as outras sextas não mudam"
                  passos={[{ img: C10('fone-horarios'), de: 0 }, { img: C10('fone-form'), de: 0.475, corte: true }, { img: C10('fone-horas'), de: 0.51, corte: true }, { img: C10('fone-salvo'), de: 0.6, corte: true }]}
                  toques={[{ x: 195, y: 818 + 47, em: 0.468 }, { x: 287, y: 794 + 47, em: 0.592 }]} />,
                <Lupa p={p} de={0.545} ate={0.595} img={C10('fone-horas')} fonte={PAG} regiao={{ x: 10, y: 706, w: 370, h: 48 }} w={wLupa} titulo="SÓ AQUELA SEXTA · A SEMANA NÃO MUDA" />)}
            </div>
          )}
          {/* casos reais em números */}
          <Cartao o={janela(p, T10.casos, 0.012)}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>CASOS REAIS · OUTUBRO</p>
            {[['Dúvida na comanda', '15:48', '15:52', 'resposta com o passo a passo'], ['Horário só numa data', 'qua 30/09', 'sex 02/10', 'pedido virou recurso'], ['Fichas da própria clínica', 'pedido', 'feitas', 'anamnese feminina, masculina e plano de tratamento']].map(([t, a, b, d], i) => {
              const o = faixa(p, 0.632 + i * 0.016, 0.642 + i * 0.016)
              return (
                <div key={t} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(94,84,75,0.1)', opacity: o, transform: `translateX(${(1 - o) * -14}px)` }}>
                  <b style={{ fontSize: 17 }}>{t}</b>
                  <span style={{ fontWeight: 800, whiteSpace: 'nowrap', color: '#C9974A' }}>{a} → {b}</span>
                  <span style={{ gridColumn: '1 / -1', color: '#8C7360', fontSize: 15 }}>{d}</span>
                </div>
              )
            })}
          </Cartao>
          {/* quem usa, fala: os áudios */}
          {p >= T10.vozes[0] - 0.01 && p < T10.vozes[1] + 0.012 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: largo ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: largo ? 40 : 18, padding: 16, opacity: janela(p, [T10.vozes[0], T10.vozes[1] + 0.006], 0.012) }}>
              <AudioDepo d={DEPOS[0]} t={faixa(p, 0.745, 0.82)} o={faixa(p, 0.735, 0.75)} w={wDepo} />
              <AudioDepo d={DEPOS[1]} t={faixa(p, 0.835, 0.905)} o={largo ? faixa(p, 0.75, 0.765) : faixa(p, 0.825, 0.835)} w={wDepo} />
            </div>
          )}
          {/* fecho */}
          <Cartao o={janela(p, T10.fim, 0.012)}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#8C7360' }}>SUPORTE NO AGENDAPRO</p>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.05 }}>Um sistema que <Ouro>se ajusta a você</Ouro></p>
            {[['WhatsApp com gente de verdade', 'pode mandar dúvida e sugestão a qualquer hora'], ['Sua sugestão vira melhoria', 'e chega pra todas as clínicas'], ['Ajustes pro seu jeito', 'fichas, regras e telas da sua clínica'], ['Precisa de algo só seu?', 'a gente faz sob medida']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(94,84,75,0.1)' }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span><b>{t}</b> · <span style={{ color: '#8C7360' }}>{d}</span></span>
              </div>
            ))}
          </Cartao>
        </div>
        <Narracao p={p} falas={[
          { de: 0, ate: T10.dor[1], texto: <>Pediu um ajuste e ouviu que <b>o sistema é assim</b>?</> },
          { de: T10.pedido[0], ate: 0.19, texto: <>Quarta, 21:27: a Wanessa manda uma <b>sugestão</b> pro suporte.</> },
          { de: 0.19, ate: 0.29, texto: <>A resposta: <Ouro>vamos adicionar essa função</Ouro>.</> },
          { de: 0.29, ate: T10.pedido[1], texto: <>E pode mandar mensagem <b>a qualquer hora</b>.</> },
          { de: T10.prazo[0], ate: T10.prazo[1], texto: <>Na sexta, o recurso estava <Ouro>no ar</Ouro>.</> },
          { de: T10.feito[0], ate: 0.545, texto: <>Hoje é só tocar em <b>Dia personalizado</b> e escolher a data.</> },
          { de: 0.545, ate: T10.feito[1], texto: <>Abre só aquela sexta, e <Ouro>as outras não mudam</Ouro>.</> },
          { de: T10.casos[0], ate: T10.casos[1], texto: <>Dúvida respondida em <b>4 minutos</b>, fichas feitas pro jeito dela.</> },
          { de: T10.vozes[0], ate: 0.83, texto: <>A Wanessa conta. <b>Toque no ▶</b> pra ouvir a voz dela.</> },
          { de: 0.83, ate: T10.vozes[1], texto: <>E a Rosy resume <Ouro>em uma frase</Ouro>.</> },
          { de: T10.fim[0], ate: 1.01, texto: <>Um sistema que <Ouro>se ajusta à sua clínica</Ouro>.</> },
        ]} />
      </div>
    </section>
    </>
  )
}

/* ─────────────── navegação, "Assistir" e montagem ─────────────── */
const CAPITULOS = [{ id: 'agenda', nome: 'Agenda' }, { id: 'antes', nome: 'Ficha' }, { id: 'comanda', nome: 'Comanda' }, { id: 'clube', nome: 'Clube' }, { id: 'campanhas', nome: 'Campanhas' }, { id: 'financeiro', nome: 'Financeiro' }, { id: 'equipe', nome: 'Equipe' }, { id: 'pacotes', nome: 'Pacotes' }, { id: 'mais', nome: 'E mais' }, { id: 'suporte', nome: 'Suporte' }, { id: 'planos', nome: 'Planos' }]

const alvoAssistir = () => [...document.querySelectorAll<HTMLElement>('[data-filme]')].find((e) => e.offsetTop + e.offsetHeight - window.innerHeight > window.scrollY + 2) ?? null

export default function Filme() {
  const reduzir = useReduzir()
  const [assistindo, setAssistindo] = useState(false)
  useEffect(() => {
    if (!assistindo) return
    let raf = 0, ultimo = performance.now()
    const parar = () => setAssistindo(false)
    // toca o capítulo onde a pessoa está (ou o próximo), no ritmo do vídeo: data-filme = segundos do capítulo
    const el = alvoAssistir()
    const vel = el ? (el.offsetHeight - window.innerHeight) / Number(el.dataset.filme || 45) : 400
    const passo = (t: number) => {
      const dt = (t - ultimo) / 1000; ultimo = t
      window.scrollBy(0, vel * dt)
      const fim = el ? el.offsetTop + el.offsetHeight - window.innerHeight : 0
      if (window.scrollY >= fim - 2) return parar()
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    const opts = { passive: true } as AddEventListenerOptions
    window.addEventListener('wheel', parar, opts); window.addEventListener('touchstart', parar, opts); window.addEventListener('keydown', parar)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('wheel', parar); window.removeEventListener('touchstart', parar); window.removeEventListener('keydown', parar) }
  }, [assistindo])
  const assistir = () => {
    const el = alvoAssistir()
    if (el && window.scrollY < el.offsetTop - 10) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
    setTimeout(() => setAssistindo(true), 600)
  }
  return (
    <>
      {/* capítulos deslizam de lado no celular; o ▶ Assistir fica fixo à direita, sempre à vista */}
      <nav aria-label="Capítulos" style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', background: 'rgba(247,242,235,0.86)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(94,84,75,0.08)' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'safe center', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', maskImage: 'linear-gradient(90deg, #000 88%, transparent)' }}>
          {CAPITULOS.map((c) => <a key={c.id} href={`#${c.id}`} style={{ padding: '6px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flex: 'none', color: TAUPE, textDecoration: 'none', background: 'rgba(255,255,255,0.7)' }}>{c.nome}</a>)}
        </div>
        <button type="button" onClick={() => (assistindo ? setAssistindo(false) : assistir())} style={{ padding: '6px 12px', borderRadius: 999, border: 0, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', flex: 'none', color: '#fff', background: TAUPE, cursor: 'pointer' }}>{assistindo ? '❚❚ Pausar' : '▶ Assistir'}</button>
      </nav>
      <CapAgenda reduzir={reduzir} />
      <CapAntes reduzir={reduzir} />
      <CapComanda reduzir={reduzir} />
      <CapClube reduzir={reduzir} />
      <CapCampanhas reduzir={reduzir} />
      <CapFinanceiro reduzir={reduzir} />
      <CapEquipe reduzir={reduzir} />
      <CapPacotes reduzir={reduzir} />
      <CapVitrine reduzir={reduzir} />
      <CapSuporte reduzir={reduzir} />
      <style>{'@keyframes cursorPisca{50%{opacity:0}}@keyframes pulsar{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}'}</style>
    </>
  )
}

/** topo: os aparelhos da clínica parados, já na cena (computador com a agenda, celular com o link).
    Desenhados num palco fixo e só ESCALADOS pra caber no espaço que sobra na primeira tela:
    escala é transform (não empurra nada, sem salto de layout) e o palco nunca corta. */
// três arranjos com os MESMOS aparelhos (notebook 600, celular 250): só muda onde ficam e a escala do palco.
// O arranjo e a escala saem de um script mínimo que roda ANTES da primeira pintura (logo depois da caixa):
// o topo já nasce no tamanho certo, sem esconder nada até o React carregar (isso atrasava o LCP).
//  · largo (computador/tablet deitado): notebook com o celular ao lado
//  · alto (tela larga e alta): celular na frente do lado esquerdo; o card da reserva, no meio da agenda, fica à vista
//  · torre (celular em pé, Eduardo 19/10: "traga a tela do celular mais pra cima"): celular grande na frente, logo abaixo do título
const PALCOS = {
  largo: { w: 830, h: 560, mac: [0, 70], fone: [580, 20], fs: 1 },
  alto: { w: 660, h: 600, mac: [60, 0], fone: [0, 85], fs: 1 },
  torre: { w: 600, h: 860, mac: [0, 0], fone: [0, 170], fs: 1.3 },
}
const MEDIR_PALCO = `(function(c){if(!c)return;var P=${JSON.stringify(Object.fromEntries(Object.entries(PALCOS).map(([t, v]) => [t, [v.w, v.h]])))};var W=c.clientWidth,H=c.clientHeight;function e(t){return Math.min(W/P[t][0],H/P[t][1])}var t=(W<560&&H>W*1.15)?'torre':(e('alto')>e('largo')*1.12?'alto':'largo');c.setAttribute('data-palco',t);c.style.setProperty('--hs',String(e(t)))})`
const CSS_PALCO = Object.entries(PALCOS).map(([t, v]) => `[data-palco=${t}] .hp-palco{width:${v.w}px;height:${v.h}px}[data-palco=${t}] .hp-mac{left:${v.mac[0]}px;top:${v.mac[1]}px}[data-palco=${t}] .hp-fone{left:${v.fone[0]}px;top:${v.fone[1]}px;transform:scale(${v.fs})}`).join('') +
  '.hp-palco{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--hs,0))}[data-palco=torre] .hp-palco{top:0;transform-origin:50% 0;transform:translate(-50%,0) scale(var(--hs,0))}.hp-mac,.hp-fone{position:absolute;transform-origin:0 0}'
/* o topo EM MOVIMENTO (Eduardo 19/10: "impressionar já no primeiro momento"): loop de 13 s com a rota REAL do cap. 1
   (a Beatriz agenda pelo link: serviço → profissional → dia → 14:30 → dados → confirmar) e, quando ela confirma,
   a reserva dela aparece na agenda do notebook (Camila, ter 20/10, 14:30 · tela gravada depois dessa reserva;
   o quadro "antes" é a mesma tela sem o card). Mesmo relógio do cap. 1, comprimido: d (0,535→0,9) vira t (0,04→0,60). */
const LOOP_S = 11
// até os dados digitados (0,79) no ritmo do cap. 1; daí até o toque em Confirmar, mais rápido (sem tela parada)
const mt = (d: number) => (d <= 0.79 ? 0.04 + ((d - 0.535) * 0.48) / 0.255 : 0.52 + ((d - 0.79) * 0.08) / 0.11)
const HERO_FONE: Passo[] = passosLink.map((s) => ({ ...s, de: s.de === 0 ? 0 : mt(s.de) }))
const HERO_TOQUES = toquesLink.map((t) => ({ ...t, em: mt(t.em) }))
const HERO_CAMPOS = [{ x: 46, y: 404, w: 300, h: 36, texto: '(11) 97731-2845', de: mt(0.745), ate: mt(0.765), vazio: '(99) 99999-9999', some: mt(0.79) }, { x: 46, y: 492, w: 300, h: 36, texto: 'Beatriz Lima', de: mt(0.768), ate: mt(0.785), vazio: 'Ex: João Silva', some: mt(0.79) }]
const CHEGOU = 0.62 // a reserva aparece na agenda (logo depois do Confirmar, em 0,6)
const CARD = { x: 861, y: 405, w: 274, h: 225 } // card da Beatriz na tela de 1440 × 900
const IMGS_HERO = [...new Set([...passosLink.map((s) => s.img), C('hero-card')])]
export function HeroAparelhos() {
  const caixa = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const reduzir = useReduzir()
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    // mesma conta do script inicial, refeita quando a caixa muda de tamanho (girar o celular, redimensionar)
    const medir = new Function('c', `${MEDIR_PALCO}(c)`) as (c: HTMLElement) => void
    const ro = new ResizeObserver(() => medir(el)); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // relógio: ~30 quadros/s, só com o topo à vista e a aba aberta; as telas do loop baixam depois do primeiro quadro
  useEffect(() => {
    if (reduzir) { setT(0.9); return }
    const el = caixa.current
    if (!el) return
    const precarga = window.setTimeout(() => IMGS_HERO.forEach((u) => { const i = new Image(); i.src = u }), 1200)
    let visivel = true, raf = 0, ultimo = 0, acumulado = 0
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting }); io.observe(el)
    const passo = (agora: number) => {
      raf = requestAnimationFrame(passo)
      const dt = ultimo ? agora - ultimo : 0; ultimo = agora
      if (!visivel || document.hidden || dt > 250) return
      acumulado += dt
      if (acumulado < 33) return
      setT((v) => (v + acumulado / 1000 / LOOP_S) % 1); acumulado = 0
    }
    raf = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.clearTimeout(precarga) }
  }, [reduzir])
  const MAC = 600, FONE = 250
  const bz = MAC * 0.022, k = (MAC - bz * 2) / 1440
  const brilho = faixa(t, CHEGOU, CHEGOU + 0.03) * (1 - faixa(t, 0.93, 0.98))
  const selo = faixa(t, CHEGOU + 0.02, CHEGOU + 0.05) * (1 - faixa(t, 0.93, 0.97))
  return (
    <>
      <div ref={caixa} suppressHydrationWarning style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
        <div className="hp-palco">
          <div className="hp-mac">
            <MacBook p={t} w={MAC} passos={[{ img: C('hero-agenda-antes'), de: 0 }]} rotulo="Agenda da clínica no computador: a reserva feita pelo link aparece na hora" />
            {/* a reserva chegando: o card dela (recorte da tela gravada depois da reserva) + anel dourado + selo.
                Recorte pequeno por cima: a tela inteira não troca, então não vira um "maior elemento" novo */}
            <img src={C('hero-card')} alt="" aria-hidden decoding="async" style={{ position: 'absolute', left: bz + CARD.x * k, top: bz * 1.4 + CARD.y * k, width: CARD.w * k, height: CARD.h * k, maxWidth: 'none', opacity: faixa(t, CHEGOU, CHEGOU + 0.012) * (1 - faixa(t, 0.97, 0.995)), transform: `scale(${1.1 - 0.1 * faixa(t, CHEGOU, CHEGOU + 0.03)})` }} />
            <div aria-hidden style={{ position: 'absolute', left: bz + CARD.x * k - 4, top: bz * 1.4 + CARD.y * k - 4, width: CARD.w * k + 8, height: CARD.h * k + 8, borderRadius: 10, boxShadow: `0 0 0 ${3 * brilho}px #C9974A, 0 0 ${28 * brilho}px rgba(201,151,74,${0.7 * brilho})`, opacity: brilho, transform: `scale(${1.08 - 0.08 * faixa(t, CHEGOU, CHEGOU + 0.03)})`, pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', left: bz + (CARD.x + CARD.w / 2) * k, top: bz * 1.4 + CARD.y * k - 40, translate: '-50% 0', padding: '7px 13px', borderRadius: 999, background: TAUPE, color: CREME, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 14px 30px rgba(60,48,38,0.3)', opacity: selo, transform: `translateY(${(1 - selo) * 12}px) scale(${0.9 + 0.1 * selo})` }}>
              <span style={{ color: '#E3C28E' }}>●</span> Nova reserva pelo link · 14:30
            </div>
          </div>
          <div className="hp-fone" style={{ filter: 'drop-shadow(0 30px 40px rgba(60,48,38,0.28))' }}>
            <IPhone p={t} w={FONE} passos={HERO_FONE} toques={HERO_TOQUES} campos={HERO_CAMPOS} rotulo="Cliente agendando pelo link da clínica no celular: serviço, profissional, dia, horário e confirmação" />
          </div>
        </div>
      </div>
      {/* roda assim que o HTML chega, antes da primeira pintura: escolhe o arranjo e a escala */}
      <script dangerouslySetInnerHTML={{ __html: `${MEDIR_PALCO}(document.currentScript&&document.currentScript.previousElementSibling)` }} />
      <style>{CSS_PALCO}</style>
    </>
  )
}
