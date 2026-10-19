'use client'
/* ═══════════════════════════════════════════════════════════
   APARELHOS DA PÁGINA /clinicas (18/10/2026)
   As mesmas peças do vídeo do Verbo Studio, em React puro e leve:
   iPhone de titânio, MacBook, janela do sistema flutuando, dedo tocando,
   campo sendo digitado e conversa de WhatsApp. Tudo é movido por um
   progresso "p" (0 a 1) que vem da rolagem: a pessoa controla o filme.
   Telas = capturas REAIS da conta de demonstração (Studio Aurora Estética).
   Toques e campos em px CSS da tela gravada (390x844 celular, 1440x900 notebook).
   ═══════════════════════════════════════════════════════════ */
import React from 'react'

export const faixa = (p: number, de: number, ate: number) => Math.min(1, Math.max(0, (p - de) / Math.max(0.0001, ate - de)))
const suave = (a: number) => (a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2)
/** corte: troca seca (telas em posições de rolagem diferentes ficam com "fantasma" no dissolve) */
export type Passo = { img: string; de: number; corte?: boolean }
export type Toque = { x: number; y: number; em: number }
export type Campo = { x: number; y: number; w: number; h: number; texto: string; de: number; ate: number; vazio?: string; tam?: number; some?: number }

const atual = (passos: Passo[], p: number) => [...passos].reverse().find((s) => p >= s.de) ?? passos[0]
const anterior = (passos: Passo[], p: number) => { const i = passos.indexOf(atual(passos, p)); return i > 0 ? passos[i - 1] : null }
const JANELA_TROCA = 0.012

/** imagem da tela com dissolve da anterior pra atual */
const Tela: React.FC<{ passos: Passo[]; p: number; w: number; h: number; base?: { x: number; y: number; k: number; bw: number; bh: number } }> = ({ passos, p, w, h, base }) => {
  // recorte (base) fica deslocado pra fora da caixa: com loading=lazy o navegador acha que está fora da tela e nunca carrega
  const carga = base ? 'eager' : 'lazy'
  const at = atual(passos, p), ant = anterior(passos, p)
  const t = at.corte || !ant ? 1 : suave(faixa(p, at.de, at.de + JANELA_TROCA)) // a 1ª tela já começa à vista
  const estilo = (o: number): React.CSSProperties => base
    ? { position: 'absolute', left: -base.x * base.k, top: -base.y * base.k, width: base.bw * base.k, height: base.bh * base.k, maxWidth: 'none', opacity: o } // o CSS base limita img a 100% da caixa: o recorte precisa passar disso
    : { position: 'absolute', inset: 0, width: w, height: h, maxWidth: 'none', opacity: o }
  return (
    <>
      {ant && t < 1 && <img src={ant.img} alt="" decoding="async" loading={carga} style={estilo(1)} />}
      <img src={at.img} alt="" decoding="async" loading={carga} style={estilo(t)} />
    </>
  )
}

/** fim: some quando o próximo toque começa (o brilho não fica sobre a tela seguinte) */
export const Dedo: React.FC<{ x: number; y: number; em: number; p: number; k: number; fim?: number }> = ({ x, y, em, p, k, fim }) => {
  const a = faixa(p, em - 0.012, em), o = faixa(p, em, em + 0.014)
  // brilho dourado que fica um instante no que foi tocado (a pessoa vê o que foi escolhido)
  const brilho = p >= em && p < em + 0.03 ? 1 - faixa(p, em + 0.012, em + 0.03) : 0
  if (p < em - 0.012 || p > em + 0.03 || (fim !== undefined && p > fim)) return null
  return (
    <>
      {brilho > 0 && <div style={{ position: 'absolute', left: x - 34 * k, top: y - 20 * k, width: 68 * k, height: 40 * k, borderRadius: 14 * k, boxShadow: `0 0 0 ${3 * k}px rgba(201,151,74,${0.85 * brilho}), 0 0 ${24 * k}px rgba(227,194,142,${0.8 * brilho})`, pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', left: x - 22 * k * o, top: y - 22 * k * o, width: 44 * k * o, height: 44 * k * o, borderRadius: '50%', border: `${2 * k}px solid rgba(201,151,74,${1 - o})`, background: `rgba(227,194,142,${0.25 * (1 - o)})`, pointerEvents: 'none' }} />
      <svg aria-hidden width={22 * k} height={26 * k} viewBox="0 0 24 28" style={{ position: 'absolute', left: x - 4 * k + (1 - a) * 40 * k, top: y - 1 * k + (1 - a) * 50 * k, opacity: a, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))', pointerEvents: 'none' }}>
        <path d="M8 2.5a2 2 0 0 1 4 0V12l.6-.3a2 2 0 0 1 2.7 1l.1.2.5-.2a2 2 0 0 1 2.6 1.1l.2.4.4-.1a2 2 0 0 1 2.5 1.5l.9 4.8a6 6 0 0 1-1.5 5.1L18.4 27H9.6l-5.3-7.4a2 2 0 0 1 2.9-2.7L8 18Z" fill="#fff" stroke="#5E544B" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </>
  )
}

const Digitando: React.FC<{ c: Campo; p: number; k: number }> = ({ c, p, k }) => {
  if (p < c.de - 0.01 || p >= (c.some ?? c.ate + 0.01)) return null
  const n = Math.floor(c.texto.length * faixa(p, c.de, c.ate))
  return (
    <div style={{ position: 'absolute', left: c.x * k, top: c.y * k, width: c.w * k, height: c.h * k, background: '#fff', display: 'flex', alignItems: 'center', fontSize: (c.tam ?? 17) * k, color: n ? '#0f172a' : '#94a3b8', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      {n ? c.texto.slice(0, n) : c.vazio ?? ''}
      {p < c.ate + 0.006 && <span style={{ width: 2 * k, height: (c.tam ?? 17) * 1.2 * k, background: '#C9974A', marginLeft: 1, animation: 'cursorPisca 0.9s steps(1) infinite' }} />}
    </div>
  )
}

/** iPhone de titânio, reto e simétrico. w = largura em px na página. */
/** y: rolagem com pausas (a pessoa para num campo pra digitar/assinar); sobrepõe y0→y1 */
export type Rolagem = { img: string; de: number; ate: number; y0: number; y1: number; alturaCss: number; cabecalho: number; y?: (p: number) => number }
export const IPhone: React.FC<{ p: number; w: number; passos?: Passo[]; toques?: Toque[]; campos?: Campo[]; children?: (k: number) => React.ReactNode; rotulo: string; zoom?: { s: number; y: number }; rolagem?: Rolagem; extra?: (k: number) => React.ReactNode; barra?: boolean }> = ({ p, w, passos = [], toques = [], campos = [], children, rotulo, zoom, rolagem, extra, barra }) => {
  // barra: a captura começa no topo do app (sem espaço do relógio); desce a tela pra o 9:41 não ficar por cima do cabeçalho
  const desce = barra ? 47 : 0
  const aro = w * 0.022, borda = w * 0.026, iw = w - (aro + borda) * 2, k = iw / 390, ih = 844 * k
  const h = ih + (aro + borda) * 2
  // zoom: o aparelho INTEIRO aproxima e leva a altura y (px CSS da tela) pro centro (a tela nunca é recortada por dentro)
  const s = zoom?.s ?? 1, dy = zoom ? (aro + borda + zoom.y * k - h / 2) * (s - 1) : 0
  // rolagem: a página do link desliza por dentro do celular (cabeçalho fixo por cima), como o dedo rolando a lista
  const naRolagem = rolagem && p >= rolagem.de && p < rolagem.ate
  const ry = rolagem ? rolagem.y?.(p) ?? rolagem.y0 + (rolagem.y1 - rolagem.y0) * suave(faixa(p, rolagem.de, rolagem.ate)) : 0
  return (
    <div role="img" aria-label={rotulo} style={{ position: 'relative', width: w, height: h, margin: '0 auto', transform: `translateY(${-dy}px) scale(${s})`, transformOrigin: '50% 50%' }}>
      {[[0.16, 0.035, 'l'], [0.22, 0.065, 'l'], [0.3, 0.065, 'l'], [0.25, 0.1, 'r']].map(([t, h, l], i) => (
        <div key={i} style={{ position: 'absolute', [l === 'l' ? 'left' : 'right']: -w * 0.011, top: `${(t as number) * 100}%`, width: w * 0.014, height: `${(h as number) * 100}%`, borderRadius: w * 0.01, background: 'linear-gradient(90deg,#8f877d,#d9d2c8,#9a9288)' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.17, padding: aro, background: 'linear-gradient(135deg,#e9e3da 0%,#b9b0a5 22%,#f4efe8 48%,#a59c91 74%,#d8d1c7 100%)', boxShadow: '0 40px 90px rgba(60,48,38,0.28), 0 14px 30px rgba(60,48,38,0.14)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: w * 0.152, padding: borda, background: '#0b0b0c', boxSizing: 'border-box' }}>
          <div style={{ width: iw, height: ih, borderRadius: w * 0.125, overflow: 'hidden', position: 'relative', background: '#fff' }}>
            {passos.length > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: desce * (iw / 390), height: ih }}><Tela passos={passos} p={p} w={iw} h={ih} /></div>}
            {naRolagem && rolagem && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fff' }}>
                <img src={rolagem.img} alt="" decoding="async" style={{ position: 'absolute', left: 0, top: desce * k, transform: `translateY(${-ry * k}px)`, width: iw, height: rolagem.alturaCss * k, maxWidth: 'none' }} />
                {rolagem.cabecalho > 0 && <div style={{ position: 'absolute', left: 0, top: desce * k, width: iw, height: rolagem.cabecalho * k, overflow: 'hidden' }}>
                  <img src={rolagem.img} alt="" decoding="async" style={{ position: 'absolute', left: 0, top: 0, width: iw, height: rolagem.alturaCss * k, maxWidth: 'none' }} />
                </div>}
              </div>
            )}
            {children?.(k)}
            {desce > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: desce * k, background: '#fff', zIndex: 2 }} />}
            {campos.map((c, i) => <Digitando key={i} c={c} p={p} k={k} />)}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 50 * k, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${4 * k}px ${30 * k}px 0`, fontWeight: 600, fontSize: 16 * k, color: '#0f0f10', zIndex: 3 }}>
              <span>9:41</span><span style={{ letterSpacing: 2 * k }}>●●● ▮</span>
            </div>
            <div style={{ position: 'absolute', left: '50%', top: 11 * k, width: 122 * k, height: 35 * k, marginLeft: -61 * k, borderRadius: 20 * k, background: '#000', zIndex: 4 }} />
            {toques.map((t, i) => <Dedo key={i} x={t.x * k} y={(t.y + desce) * k} em={t.em} fim={toques[i + 1] && toques[i + 1].em - 0.012} p={p} k={k} />)}
            {extra?.(k)}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0) 38%)', pointerEvents: 'none', zIndex: 5 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** MacBook reto: tela 1440x900; zoom aproxima de (x,y) da tela; recua desfoca quando a janela do sistema flutua na frente */
export const MacBook: React.FC<{ p: number; w: number; passos: Passo[]; toques?: Toque[]; zoom?: { s: number; x: number; y: number }; recua?: number; rotulo: string }> = ({ p, w, passos, toques = [], zoom = { s: 1, x: 720, y: 450 }, recua = 0, rotulo }) => {
  const bz = w * 0.022, iw = w - bz * 2, k = iw / 1440, ih = 900 * k, hl = ih + bz * 2.4
  const s = zoom.s + (0.92 - zoom.s) * recua
  const dx = (bz + zoom.x * k - w / 2) * (s - 1) * (1 - recua), dy = (bz * 1.4 + zoom.y * k - hl / 2) * (s - 1) * (1 - recua)
  return (
    <div role="img" aria-label={rotulo} style={{ position: 'relative', width: w, margin: '0 auto', transform: `translate(${-dx}px, ${-dy}px) scale(${s})`, transformOrigin: '50% 40%', filter: recua ? `blur(${recua * 6}px)` : undefined, opacity: 1 - 0.4 * recua, willChange: 'transform' }}>
      <div style={{ position: 'relative', height: hl, borderRadius: w * 0.032, padding: `${bz * 1.4}px ${bz}px ${bz}px`, boxSizing: 'border-box', background: '#0d0d0e', boxShadow: '0 0 0 2px #c9c3bb, 0 30px 70px rgba(60,48,38,0.28)' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: w * 0.09, height: bz * 1.2, marginLeft: -w * 0.045, borderRadius: `0 0 ${bz * 0.6}px ${bz * 0.6}px`, background: '#0d0d0e', zIndex: 3 }} />
        <div style={{ width: iw, height: ih, borderRadius: w * 0.008, overflow: 'hidden', position: 'relative', background: '#fff' }}>
          <Tela passos={passos} p={p} w={iw} h={ih} />
          {toques.map((t, i) => <Dedo key={i} x={t.x * k} y={t.y * k} em={t.em} fim={toques[i + 1] && toques[i + 1].em - 0.012} p={p} k={k * 2.2} />)}
        </div>
      </div>
      <div style={{ width: w * 1.14, marginLeft: -w * 0.07, height: w * 0.034, borderRadius: `${w * 0.004}px ${w * 0.004}px ${w * 0.04}px ${w * 0.04}px`, background: 'linear-gradient(180deg,#ece7e0 0%,#d4cdc3 45%,#b3aba0 100%)', boxShadow: '0 22px 44px rgba(60,48,38,0.26)' }} />
    </div>
  )
}

/** janela do sistema flutuando na frente: recorte nítido da captura real (sem o fundo escurecido) */
/** recortada: as imagens já são o recorte exato da regiao (mais leves); senão são a tela inteira 1440x900 */
export const JanelaSistema: React.FC<{ p: number; de: number; ate?: number; passos: Passo[]; regiao: { x: number; y: number; w: number; h: number }; w: number; toques?: Toque[]; campos?: Campo[]; rotulo: string; recortada?: boolean }> = ({ p, de, ate = 2, passos, regiao, w, toques = [], campos = [], rotulo, recortada }) => {
  if (p < de || p > ate + 0.02) return null
  const e = suave(faixa(p, de, de + 0.02)), s = 1 - suave(faixa(p, ate, ate + 0.02))
  const k = w / regiao.w, h = regiao.h * k
  return (
    <div role="img" aria-label={rotulo} style={{ position: 'absolute', left: '50%', top: '50%', width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 40px 90px rgba(60,48,38,0.28), 0 0 0 1px rgba(94,84,75,0.08)', opacity: e * s, transform: `translateY(${(1 - e) * 40}px) scale(${0.95 + 0.05 * e})`, zIndex: 5 }}>
      <Tela passos={passos} p={p} w={w} h={h} base={recortada ? { x: 0, y: 0, k, bw: regiao.w, bh: regiao.h } : { x: regiao.x, y: regiao.y, k, bw: 1440, bh: 900 }} />
      {campos.map((c, i) => <Digitando key={i} c={{ ...c, x: c.x - regiao.x, y: c.y - regiao.y }} p={p} k={k} />)}
      {toques.map((t, i) => <Dedo key={i} x={(t.x - regiao.x) * k} y={(t.y - regiao.y) * k} em={t.em} fim={toques[i + 1] && toques[i + 1].em - 0.012} p={p} k={k * 1.3} />)}
    </div>
  )
}

/** pedaço com link vira azul, como no WhatsApp */
const comLink = (t: string) => t.split(/(\S*agendapro\.net\.br\S*)/).map((pd, i) => (i % 2 ? <span key={i} style={{ color: '#027eb5', textDecoration: 'underline' }}>{pd}</span> : pd))

/** conversa de WhatsApp (iOS claro) com histórico de ontem, "digitando…", tiques azuis e notificações */
/** pronto: o texto já chega escrito na caixa (o sistema abre o WhatsApp com a mensagem montada) */
export type Msg = { de: 'ela' | 'eu'; t: string; em: number; hora: string; pronto?: boolean }
export const ConversaWhatsApp: React.FC<{ p: number; k: number; nome: string; msgs: Msg[]; historico?: { de: 'ela' | 'eu'; t: string; hora: string }[]; avisos?: { t: string; em: number }[]; diaHistorico?: string }> = ({ p, k, nome, msgs, historico = [], avisos = [], diaHistorico = 'Ontem' }) => {
  const escrevendo = msgs.find((m) => m.de === 'eu' && p >= m.em - 0.025 && p < m.em)
  const elaDigita = msgs.find((m) => m.de === 'ela' && p >= m.em - 0.015 && p < m.em)
  type Linha = { de: 'ela' | 'eu'; t: string; hora: string; pilula?: string; novo?: number }
  const linhas: Linha[] = [{ de: 'ela', t: '', hora: '', pilula: diaHistorico }, ...historico, { de: 'ela', t: '', hora: '', pilula: 'Hoje' }, ...msgs.filter((m) => p >= m.em).map((m) => ({ ...m, novo: faixa(p, m.em, m.em + 0.006) }))]
  const texto = escrevendo?.pronto ? escrevendo.t : escrevendo ? escrevendo.t.slice(0, Math.floor(escrevendo.t.length * faixa(p, escrevendo.em - 0.025, escrevendo.em - 0.004))) : ''
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#EFEAE2', fontFamily: '-apple-system, "SF Pro Text", var(--font-inter), sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(170,150,125,0.28) 1.2px, transparent 1.5px)', backgroundSize: `${16 * k}px ${16 * k}px` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 104 * k, background: 'rgba(246,246,246,0.97)', borderBottom: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'flex-end', padding: `0 ${10 * k}px ${9 * k}px`, gap: 8 * k }}>
        <span style={{ fontSize: 17 * k, color: '#0a7cff' }}>‹ 12</span>
        <div style={{ width: 36 * k, height: 36 * k, borderRadius: '50%', background: 'linear-gradient(140deg,#d7b98f,#a0826a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16 * k }}>{nome[0]}</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16.5 * k, color: '#000' }}>{nome}</div><div style={{ fontSize: 12.5 * k, color: '#8a8a8e' }}>{elaDigita ? 'digitando…' : 'online'}</div></div>
      </div>
      <div style={{ position: 'absolute', left: 14 * k, right: 14 * k, top: 104 * k, bottom: 76 * k, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3 * k }}>
        {linhas.map((m, i) => m.pilula
          ? <div key={i} style={{ alignSelf: 'center', margin: `${7 * k}px 0`, padding: `${4 * k}px ${11 * k}px`, borderRadius: 8 * k, background: 'rgba(255,255,255,0.92)', fontSize: 12.5 * k, color: '#54656f' }}>{m.pilula}</div>
          : <div key={i} style={{ alignSelf: m.de === 'eu' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: `${6 * k}px ${8 * k}px ${7 * k}px ${9 * k}px`, borderRadius: 9 * k, background: m.de === 'eu' ? '#D9FDD3' : '#fff', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)', fontSize: 16 * k, lineHeight: 1.3, color: '#111b21', whiteSpace: 'pre-line', flex: 'none', opacity: m.novo ?? 1, transform: `translateY(${(1 - (m.novo ?? 1)) * 14 * k}px)` }}>
              {comLink(m.t)}<span style={{ float: 'right', marginLeft: 10 * k, marginTop: 7 * k, fontSize: 11 * k, color: '#667781' }}>{m.hora}{m.de === 'eu' && <span style={{ color: '#53bdeb' }}> ✓✓</span>}</span>
            </div>)}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 66 * k, background: 'rgba(246,246,246,0.97)', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'flex-start', gap: 9 * k, padding: `${9 * k}px ${10 * k}px 0` }}>
        <span style={{ fontSize: 26 * k, color: '#0a7cff', lineHeight: 1 }}>+</span>
        <div style={{ flex: 1, height: 34 * k, borderRadius: 18 * k, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', padding: `0 ${13 * k}px`, fontSize: 16 * k, color: '#111b21', whiteSpace: 'nowrap', overflow: 'hidden' }}>{texto}</div>
        <div style={{ width: 34 * k, height: 34 * k, borderRadius: '50%', background: escrevendo ? '#25d366' : 'transparent', color: escrevendo ? '#fff' : '#0a7cff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 * k }}>{escrevendo ? '➤' : '🎙'}</div>
      </div>
      {avisos.filter((a) => p >= a.em && p < a.em + 0.03).map((a, i) => {
        const e = faixa(p, a.em, a.em + 0.006), s = 1 - faixa(p, a.em + 0.022, a.em + 0.03)
        const [quem, ...resto] = a.t.split(':')
        return <div key={i} style={{ position: 'absolute', left: 8 * k, right: 8 * k, top: 52 * k, padding: `${10 * k}px ${12 * k}px`, borderRadius: 20 * k, background: 'rgba(250,250,250,0.95)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', fontSize: 13.5 * k, color: '#111', transform: `translateY(${(1 - e) * -70 * k}px)`, opacity: e * s, zIndex: 6 }}><b>{quem}</b> · {resto.join(':').trim()}</div>
      })}
    </div>
  )
}

/** iPad reto, alumínio, tela 820x1180 (captura em pé). Mesmos toques/campos do iPhone, em px CSS da tela gravada. */
export const IPad: React.FC<{ p: number; w: number; passos: Passo[]; toques?: Toque[]; campos?: Campo[]; rotulo: string; extra?: (k: number) => React.ReactNode; zoom?: { s: number; x: number; y: number } }> = ({ p, w, passos, toques = [], campos = [], rotulo, extra, zoom }) => {
  const aro = w * 0.012, borda = w * 0.04, iw = w - (aro + borda) * 2, k = iw / 820, ih = 1180 * k, h = ih + (aro + borda) * 2
  const s = zoom?.s ?? 1, dx = zoom ? (aro + borda + zoom.x * k - w / 2) * (s - 1) : 0, dy = zoom ? (aro + borda + zoom.y * k - h / 2) * (s - 1) : 0
  return (
    <div role="img" aria-label={rotulo} style={{ position: 'relative', width: w, height: h, margin: '0 auto', transform: `translate(${-dx}px, ${-dy}px) scale(${s})`, transformOrigin: '50% 50%' }}>
      <div style={{ position: 'absolute', right: w * 0.12, top: -w * 0.006, width: w * 0.09, height: w * 0.009, borderRadius: w * 0.004, background: 'linear-gradient(180deg,#b9b2a8,#d9d3ca)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.07, padding: aro, background: 'linear-gradient(135deg,#ebe6df 0%,#bdb5aa 25%,#f3eee7 50%,#aaa197 76%,#dcd5cc 100%)', boxShadow: '0 40px 90px rgba(60,48,38,0.26), 0 14px 30px rgba(60,48,38,0.12)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: w * 0.06, padding: borda, background: '#0b0b0c', boxSizing: 'border-box', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '50%', top: borda * 0.38, width: w * 0.012, height: w * 0.012, marginLeft: -w * 0.006, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#3a4a5c,#0d1218)' }} />
          <div style={{ width: iw, height: ih, borderRadius: w * 0.025, overflow: 'hidden', position: 'relative', background: '#fff' }}>
            <Tela passos={passos} p={p} w={iw} h={ih} />
            {campos.map((c, i) => <Digitando key={i} c={c} p={p} k={k} />)}
            {toques.map((t, i) => <Dedo key={i} x={t.x * k} y={t.y * k} em={t.em} fim={toques[i + 1] && toques[i + 1].em - 0.012} p={p} k={k * 1.4} />)}
            {extra?.(k)}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0) 40%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** assinatura feita com o dedo: o traço vai sendo desenhado conforme p (pts de 0 a 1 dentro do quadro x,y,w,h) */
export const Assinatura: React.FC<{ p: number; de: number; ate: number; pts: number[][]; x: number; y: number; w: number; h: number; k: number }> = ({ p, de, ate, pts, x, y, w, h, k }) => (
  <svg aria-hidden width={w * k} height={h * k} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: x * k, top: y * k, overflow: 'visible', pointerEvents: 'none' }}>
    <polyline points={pts.map(([a, b]) => `${a * w},${b * h}`).join(' ')} fill="none" stroke="#1f2937" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - faixa(p, de, ate)} />
  </svg>
)

/** lupa: cartão com o detalhe da tela ampliado AO LADO do aparelho (o aparelho nunca é cortado por zoom).
    regiao/campos/toques em px CSS da captura (fonte = tamanho CSS da captura inteira). */
export const Lupa: React.FC<{ p: number; de: number; ate: number; img: string; fonte: { w: number; h: number }; regiao: { x: number; y: number; w: number; h: number }; w: number; titulo: string; campos?: Campo[]; toques?: Toque[]; children?: (k: number) => React.ReactNode }> = ({ p, de, ate, img, fonte, regiao, w, titulo, campos = [], toques = [], children }) => {
  if (p < de || p > ate + 0.012) return null
  const e = suave(faixa(p, de, de + 0.012)), s = 1 - suave(faixa(p, ate, ate + 0.012))
  const k = w / regiao.w
  return (
    <div style={{ gridArea: '1 / 1', alignSelf: 'end', width: w, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 70px rgba(60,48,38,0.22), 0 0 0 1px rgba(94,84,75,0.06)', opacity: e * s, transform: `translateY(${(1 - e) * 24}px) scale(${0.96 + 0.04 * e})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 800, letterSpacing: 1, color: '#8C7360', borderBottom: '1px solid rgba(94,84,75,0.08)' }}>
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="2.4" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>{titulo}
      </div>
      <div role="img" aria-label={titulo} style={{ position: 'relative', width: w, height: regiao.h * k, overflow: 'hidden' }}>
        <img src={img} alt="" decoding="async" loading="eager" style={{ position: 'absolute', left: -regiao.x * k, top: -regiao.y * k, width: fonte.w * k, height: fonte.h * k, maxWidth: 'none' }} />
        <div style={{ position: 'absolute', left: -regiao.x * k, top: -regiao.y * k }}>
          {campos.map((c, i) => <Digitando key={i} c={c} p={p} k={k} />)}
          {children?.(k)}
          {toques.map((t, i) => <Dedo key={i} x={t.x * k} y={t.y * k} em={t.em} fim={toques[i + 1] && toques[i + 1].em - 0.012} p={p} k={k * 0.8} />)}
        </div>
      </div>
    </div>
  )
}
