'use client'
/* ═══════════════════════════════════════════════════════════════
   AVISOS MANUAIS — os textos que já saem prontos no WhatsApp da dona
   Morava como seção "Você manda" no fim de /admin/whatsapp, embaixo de tudo
   que é do disparo automático. Em 07/10/2026 a Rosy procurou onde editar o
   lembrete que ela manda na mão e não achou — e o Eduardo, olhando o menu,
   achou que a tela tinha sumido. Manual (sai do número dela, grátis) e
   automático (sai do número do AgendaPRO, pacote) viraram dois itens.

   Página inteira, sem lista intermediária (Eduardo, 07/10): cada aba abre
   direto no editor com a tela de WhatsApp embaixo mostrando a mensagem
   pronta. Abas: Lembrete · Aniversário · Sumidos (sem e com cupom), v154.

   Sem aba de CONFIRMAÇÃO: desde 9c3723c o único botão manual do agendamento
   manda o lembrete; o texto da confirmação fica no banco mas nenhum botão
   usa. Editor de texto que não sai seria botão morto (Eduardo, 07/10).

   Mobile: uma coluna (editor, depois o celular). Desktop (lg:): editor à
   esquerda e o celular grudado à direita.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { termoPessoa, type TermoPessoa } from '@/lib/segmento'
import {
  DEFAULT_REMINDER_TEMPLATE,
  TEMPLATE_VARIABLES,
  renderTemplate,
} from '@/lib/message-templates'
import { fillTemplate, sampleNameFor } from '@/lib/coupon-templates'
import {
  DEFAULT_SUMIDOS_TEMPLATE,
  padraoAniversario,
  padraoSumidosCupom,
  textoChamarSumido,
} from '@/lib/textos-manuais'
import { IconArrowRight, IconCalendar, IconCheck, IconGift, IconWhatsapp } from '@/components/ui/Icon'
import { Cabecalho, CONTAINER, formatarNumero } from './WhatsAppPainel'
import { exemplo } from './VoceManda'
import { Chip, TituloSecao, WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'

/** Chave = campo do GET/PATCH de /api/admin/messages. */
type Chave = 'reminder' | 'birthday' | 'sumidos' | 'sumidosCupom'
type Aba = 'lembrete' | 'aniversario' | 'sumidos'
type Textos = Record<Chave, string>

type Ctx = {
  T: TermoPessoa
  negocio: string
  slug: string
  descricao: string | null
  /** businesses.category · escolhe o serviço do exemplo do lembrete. */
  categoria: string | null
}

type Config = {
  titulo: string
  descricao: (c: Ctx) => string
  padrao: (c: Ctx) => string
  variaveis: (c: Ctx) => { token: string; label: string }[]
  previa: (texto: string, c: Ctx) => string
}

const VARS_CUPOM = (c: Ctx) => [
  { token: '{nome}', label: `Nome d${c.T.art} ${c.T.s}` },
  { token: '{negocio}', label: 'Nome do negócio' },
  { token: '{desconto}', label: 'Desconto' },
  { token: '{validade}', label: 'Validade' },
  { token: '{link}', label: 'Link do cupom' },
]

const previaCupom = (texto: string, c: Ctx) =>
  fillTemplate(texto, {
    nome: sampleNameFor(c.descricao),
    negocio: c.negocio || 'Seu Negócio',
    desconto: '15%',
    validade: '7 dias',
    link: `agendapro.net.br/${c.slug || 'seu-link'}?cupom=ANIV15`,
  })

const CONFIG: Record<Chave, Config> = {
  reminder: {
    titulo: 'Mensagem de lembrete',
    descricao: (c) =>
      `O que você manda na véspera pr${c.T.art} ${c.T.s} não esquecer do horário.`,
    padrao: () => DEFAULT_REMINDER_TEMPLATE,
    variaveis: (c) =>
      TEMPLATE_VARIABLES.map((v) =>
        v.token === '{cliente}' ? { ...v, label: `Nome d${c.T.art} ${c.T.s}` } : v,
      ),
    previa: (texto, c) => renderTemplate(texto, exemplo(c.negocio, c.categoria)),
  },
  birthday: {
    titulo: 'Mensagem de aniversário',
    descricao: (c) =>
      `Vai junto com o cupom de presente que você gera pr${c.T.art}s aniversariantes do mês.`,
    padrao: (c) => padraoAniversario(c.descricao),
    variaveis: VARS_CUPOM,
    previa: previaCupom,
  },
  sumidos: {
    titulo: 'Chamar sem desconto',
    descricao: (c) =>
      `O recado simples pra quem parou de vir, sem cupom. Sai quando você toca no WhatsApp ao lado d${c.T.art} ${c.T.s} na lista de Sumidos.`,
    padrao: () => DEFAULT_SUMIDOS_TEMPLATE,
    variaveis: (c) => [
      { token: '{nome}', label: `Nome d${c.T.art} ${c.T.s}` },
      { token: '{negocio}', label: 'Nome do negócio' },
      { token: '{dias}', label: 'Dias sem vir' },
    ],
    previa: (texto, c) =>
      textoChamarSumido(texto, { nome: sampleNameFor(c.descricao), dias: 45, negocio: c.negocio || 'Seu Negócio' }),
  },
  sumidosCupom: {
    titulo: 'Chamar com cupom',
    descricao: () => 'Vai junto com o cupom de desconto que você gera pra trazer de volta quem sumiu.',
    padrao: (c) => padraoSumidosCupom(c.descricao),
    variaveis: VARS_CUPOM,
    previa: previaCupom,
  },
}

/* ── EDITOR DE UMA MENSAGEM ─────────────────────────────────── */
function Editor({
  chave,
  ctx,
  gravado,
  numero,
  onSalvo,
}: {
  chave: Chave
  ctx: Ctx
  /** null = carregando · '' = usa o padrão */
  gravado: string | null
  numero: string
  onSalvo: (chave: Chave, texto: string) => void
}) {
  const cfg = CONFIG[chave]
  const padrao = cfg.padrao(ctx)
  const atual = gravado || padrao
  const [corpo, setCorpo] = useState(atual)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setCorpo(atual)
  }, [atual])

  const mudou = gravado !== null && corpo !== atual
  const textoSeu = !!gravado && gravado !== padrao

  /* Só usa o cursor se o campo estiver REALMENTE focado. Sem isso, tocar um
     chip com o campo desfocado caía em selectionStart=0 e a variável grudava
     no COMEÇO da mensagem (Barbearia Guia Lopes, 07/07). Desfocado = fim. */
  function inserir(token: string) {
    const el = campo.current
    const focado = !!el && document.activeElement === el
    const ini = focado ? (el!.selectionStart ?? corpo.length) : corpo.length
    const fim = focado ? (el!.selectionEnd ?? corpo.length) : corpo.length
    const espaco = ini > 0 && !/\s$/.test(corpo.slice(0, ini)) ? ' ' : ''
    const texto = espaco + token
    setCorpo(corpo.slice(0, ini) + texto + corpo.slice(fim))
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        const pos = ini + texto.length
        el.setSelectionRange(pos, pos)
      }
    })
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      /* Igual ao padrão = grava vazio (NULL), pra quem nunca mexeu continuar
         recebendo melhorias do texto padrão. */
      const enviar = corpo.trim() === padrao ? '' : corpo
      const r = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [chave]: enviar }),
      })
      if (!r.ok) throw new Error('falhou')
      /* Lê de volta o que a rota devolveu, não o que eu mandei: é a única
         prova de que gravou. */
      const j = await r.json().catch(() => null)
      if (!j || typeof j[chave] !== 'string') throw new Error('sem retorno')
      if (enviar && j[chave] !== enviar.trim()) throw new Error('não confere')
      onSalvo(chave, j[chave])
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch {
      setErro('Não deu para salvar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const previa = cfg.previa(corpo || padrao, ctx)

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
      <div>
        <TituloSecao acao={<Chip tom={textoSeu ? 'ok' : 'neutro'}>{textoSeu ? 'Texto seu' : 'Texto padrão'}</Chip>}>
          {cfg.titulo}
        </TituloSecao>
        <div className="admin-card p-4 lg:p-5">
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            {cfg.descricao(ctx)} Edite o texto abaixo e veja como chega no celular.
          </p>

          <textarea
            ref={campo}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={6}
            disabled={gravado === null}
            aria-label={cfg.titulo}
            className="w-full text-[15px] rounded-xl px-3 py-2.5 leading-relaxed mt-4 disabled:opacity-60"
            style={{
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          />

          <p
            className="text-[11px] font-bold uppercase tracking-wider mt-3 mb-1.5"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Inserir dados
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cfg.variaveis(ctx).map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => inserir(v.token)}
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }}
              >
                + {v.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
            Cada etiqueta vira o dado real na hora de enviar.
          </p>

          {erro && (
            <p className="text-[13px] mt-3" style={{ color: 'var(--admin-danger)' }}>
              {erro}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap mt-5">
            <button
              type="button"
              disabled={salvando || gravado === null || (!mudou && !salvo)}
              onClick={salvar}
              className="text-[15px] font-bold px-5 py-3 rounded-xl disabled:opacity-60"
              style={{ background: WA.gradiente, color: '#fff', boxShadow: WA.sombra }}
            >
              {salvando ? 'Salvando…' : salvo ? 'Salvo' : 'Salvar mensagem'}
            </button>
            {mudou && (
              <span className="text-[12.5px] font-medium" style={{ color: '#B45309' }}>
                Alterações não salvas
              </span>
            )}
            {corpo !== padrao && (
              <button
                type="button"
                onClick={() => setCorpo(padrao)}
                className="text-[13px] underline underline-offset-2"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Voltar ao texto padrão
              </button>
            )}
          </div>
        </div>
      </div>

      {/* O cabeçalho do celular é o NOME DELA, porque sai do WhatsApp
          dela — é isso que faz a cliente reconhecer quem mandou. */}
      <div className="lg:sticky lg:top-24">
        <TituloSecao>{`No celular d${ctx.T.art} ${ctx.T.poss} ${ctx.T.s}`}</TituloSecao>
        <TelaWhatsApp remetente={ctx.negocio} numero={numero} texto={previa} />
        <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--admin-text-faded)' }}>
          Exemplo com dados fictícios. Muda na hora enquanto você digita.
        </p>
      </div>
    </div>
  )
}

/* ── COMO FUNCIONA (um por aba) ─────────────────────────────── */
function ComoFunciona({
  passos,
  link,
}: {
  passos: { icone: ReactNode; texto: ReactNode }[]
  link?: { href: string; rotulo: string }
}) {
  return (
    <>
      <TituloSecao>Como funciona</TituloSecao>
      <div className="admin-card p-4 lg:p-5">
        <ol className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
          {passos.map((p, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }}
                aria-hidden="true"
              >
                {p.icone}
              </span>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                <span className="font-bold" style={{ color: 'var(--admin-text)' }}>{i + 1}. </span>
                {p.texto}
              </p>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
          <p className="text-[12px]" style={{ color: 'var(--admin-text-faded)' }}>
            Sai do seu número · você aperta enviar · não consome pacote de mensagens
          </p>
          {link && (
            <Link
              href={link.href}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: WA.forte }}
            >
              {link.rotulo} <IconArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

const forte = (t: string) => <strong style={{ color: WA.forte }}>{t}</strong>

export default function AvisosManuaisPainel({
  businessName,
  businessPhone,
  businessSlug,
  businessDescription,
  category,
}: {
  businessName: string
  businessPhone?: string | null
  businessSlug?: string | null
  businessDescription?: string | null
  category?: string | null
}) {
  const T = termoPessoa(category ?? null)
  const ctx: Ctx = {
    T,
    negocio: businessName,
    slug: businessSlug ?? '',
    descricao: businessDescription ?? null,
    categoria: category ?? null,
  }
  const [aba, setAba] = useState<Aba>('lembrete')
  /* Sumidos tem duas mensagens; uma por vez pra aba nao virar tres telas de
     rolagem no celular (Eduardo, 07/10). */
  const [sumidosQual, setSumidosQual] = useState<'sumidos' | 'sumidosCupom'>('sumidos')
  const [textos, setTextos] = useState<Textos | null>(null)
  const numero = businessPhone ? formatarNumero(businessPhone) : ''

  useEffect(() => {
    void fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((j) =>
        setTextos({
          reminder: String(j?.reminder ?? ''),
          birthday: String(j?.birthday ?? ''),
          sumidos: String(j?.sumidos ?? ''),
          sumidosCupom: String(j?.sumidosCupom ?? ''),
        }),
      )
      .catch(() => setTextos({ reminder: '', birthday: '', sumidos: '', sumidosCupom: '' }))
  }, [])

  function onSalvo(chave: Chave, texto: string) {
    setTextos((t) => (t ? { ...t, [chave]: texto } : t))
  }

  const editor = (chave: Chave) => (
    <Editor
      key={chave}
      chave={chave}
      ctx={ctx}
      gravado={textos ? textos[chave] : null}
      numero={numero}
      onSalvo={onSalvo}
    />
  )

  const ABAS: { id: Aba; rotulo: string }[] = [
    { id: 'lembrete', rotulo: 'Lembrete' },
    { id: 'aniversario', rotulo: 'Aniversário' },
    { id: 'sumidos', rotulo: 'Sumidos' },
  ]

  const dicas = [
    `Assine com o seu nome ou o do seu negócio. ${T.art.toUpperCase()} ${T.s} reconhece quem está falando e confia na mensagem.`,
    `Chame pelo nome: a etiqueta “Nome d${T.art} ${T.s}” vira o nome de verdade na hora de enviar.`,
    'Escreva do seu jeito, curto, como você já conversa. Mensagem com cara de robô é a que a pessoa ignora.',
  ]

  return (
    <>
      <Cabecalho titulo="Avisos manuais" subtitulo="Saem do seu WhatsApp, com o seu nome" />
      <div className={CONTAINER}>
        <div className="lg:max-w-md">
          {/* Mesmo seletor de abas de Campanhas. */}
          <div
            className="flex rounded-2xl p-1.5 gap-1"
            role="tablist"
            aria-label="Qual mensagem editar"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              boxShadow: '0 1px 0 0 color-mix(in srgb, white 5%, transparent) inset',
            }}
          >
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={`admin-tab flex-1 ${aba === a.id ? 'admin-tab-active' : ''}`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>

        {aba === 'lembrete' && (
          <>
            {editor('reminder')}
            <ComoFunciona
              passos={[
                { icone: <IconCalendar size={16} />, texto: 'Abra o atendimento na agenda.' },
                {
                  icone: <IconWhatsapp size={16} />,
                  texto: <>Toque em {forte('Enviar WhatsApp')} (no card da agenda ele aparece como {forte('Lembrete')}).</>,
                },
                {
                  icone: <IconCheck size={16} />,
                  texto: `O seu WhatsApp abre com a mensagem pronta, já com o nome d${T.art} ${T.s}, o serviço, a data e a hora. É só apertar enviar.`,
                },
              ]}
            />
          </>
        )}

        {aba === 'aniversario' && (
          <>
            {editor('birthday')}
            <ComoFunciona
              passos={[
                { icone: <IconCalendar size={16} />, texto: `Abra Campanhas e escolha a aba ${'Aniversário'}.` },
                {
                  icone: <IconGift size={16} />,
                  texto: <>Escolha o desconto e toque em {forte('Gerar cupons de aniversário')}. Esta mensagem já vem selecionada como {forte('Seu texto')}.</>,
                },
                {
                  icone: <IconWhatsapp size={16} />,
                  texto: `Na lista de envio, toque no WhatsApp de cada aniversariante: abre com a mensagem e o link do cupom prontos.`,
                },
              ]}
              link={{ href: '/admin/clientes/campanhas?tab=aniversariantes', rotulo: 'Abrir aniversariantes' }}
            />
          </>
        )}

        {aba === 'sumidos' && (
          <>
            <div
              className="inline-flex rounded-xl p-1 gap-1 mt-5"
              role="tablist"
              aria-label="Qual mensagem de sumidos"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              {([
                ['sumidos', 'Sem desconto'],
                ['sumidosCupom', 'Com cupom'],
              ] as const).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={sumidosQual === id}
                  onClick={() => setSumidosQual(id)}
                  className="text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  style={
                    sumidosQual === id
                      ? { background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }
                      : { border: '1px solid transparent', color: 'var(--admin-text-mute)' }
                  }
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {editor(sumidosQual)}
            <ComoFunciona
              passos={[
                { icone: <IconCalendar size={16} />, texto: `Abra Sumidos no menu e escolha há quanto tempo ${T.art}s ${T.p} não vêm.` },
                {
                  icone: <IconWhatsapp size={16} />,
                  texto: <>Pra chamar sem desconto, toque no WhatsApp ao lado d{T.art} {T.s}: sai a mensagem {forte('Chamar sem desconto')}.</>,
                },
                {
                  icone: <IconGift size={16} />,
                  texto: <>Pra mandar cupom, gere a campanha: a mensagem {forte('Chamar com cupom')} já vem selecionada como {forte('Seu texto')}.</>,
                },
              ]}
              link={{ href: '/admin/sumidos', rotulo: 'Abrir Sumidos' }}
            />
          </>
        )}

        {/* ── DICAS ─────────────────────────────────────── */}
        <TituloSecao>Dicas pra mensagem funcionar</TituloSecao>
        <div className="admin-card p-4 lg:p-5">
          <ul className="space-y-2.5">
            {dicas.map((d) => (
              <li key={d} className="flex gap-2.5 items-start text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: WA.forte }} aria-hidden="true">
                  <IconCheck size={15} />
                </span>
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* ── PONTE PRO AUTOMÁTICO ──────────────────────── */}
        <Link
          href="/admin/whatsapp"
          className="admin-card p-4 lg:p-5 mt-4 mb-6 flex items-center gap-3 transition-transform hover:scale-[1.01]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Quer que saia sozinho?
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Nos avisos automáticos o sistema manda sem você apertar nada.
            </p>
          </div>
          <span style={{ color: 'var(--admin-text-faded)' }} aria-hidden="true">
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>
    </>
  )
}
