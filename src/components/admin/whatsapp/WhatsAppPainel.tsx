'use client'

/* ═══════════════════════════════════════════════════════════════
   CENTRAL DE WHATSAPP

   ─── Por que essa tela foi refeita duas vezes ─────────────────

   A primeira versão empilhava quinze blocos de peso idêntico — cinco pacotes,
   cinco textos abertos por inteiro, cinco interruptores. A segunda resolveu a
   quantidade e errou o acabamento: cinza sobre cinza, tudo em 11px, nenhum
   ícone, e no desktop uma coluna de 672px colada na esquerda com metade da
   tela vazia.

   A causa do segundo erro não foi estética, foi estrutural: a tela tinha
   inventado o próprio enquadramento. Todas as outras páginas do painel usam
   `<main>` com orbs, cabeçalho grudado no topo e o container
   `max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8`. Essa não usava nenhum
   dos três — por isso parecia um fragmento solto enquanto o resto do app
   parece acabado. Agora usa.

   ─── O que sustenta o desenho ─────────────────────────────────

   1. ÍNDICE COM UM NÍVEL, não tudo aberto. A raiz é curta: estado, cinco
      linhas de aviso, uma linha de ação. Cada aviso abre a própria tela.
      Não é acordeão — com texto de 6-8 linhas por item, cinco acordeões
      abertos dão a mesma parede, com um clique a mais. Não é tab —
      segmented control troca estado da MESMA coisa, e aqui são naturezas
      diferentes.

   2. O AVISO É UMA COISA SÓ. Antes "Lembrete da véspera" existia em dois
      blocos distantes: ela ligava embaixo e lia o texto em cima. Agora
      interruptor, horário, custo e texto ficam juntos.

   3. COMPRAR SAIU DA TELA. Empilhar card de preço em celular funciona até
      quatro planos — são cinco. Aqui o pacote é uma linha com barra; a
      recarga é fluxo à parte.

   ─── Mobile × desktop ─────────────────────────────────────────

   Mesma tela, uma coluna no celular. No `lg:` o estado sai de cima e vira
   trilho fixo à direita, e a lista fica com a coluna principal — é assim que
   a largura do desktop deixa de ser vazio. Nada disso vaza pro mobile: todo
   o grid está atrás de `lg:`.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  IconArrowLeft,
  IconBell,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconGift,
  IconSparkles,
  IconWhatsapp,
} from '@/components/ui/Icon'
import { BarraConsumo, Chip, IconeAviso, Linha, Lista, TituloSecao, Toggle } from './ui'
import AvisoDetalhe, { type Aviso } from './AvisoDetalhe'
import Recarga from './Recarga'
import ModalPix from './ModalPix'
import Oferta, { type Movimento, type PacoteTela } from './Oferta'
import VoceManda, {
  VoceMandaLista,
  type Qual,
  type TextosManuais,
} from './VoceManda'

type Canal = {
  configurado: boolean
  no_ar: boolean
  numero: string | null
  detalhe: string
  qualidade?: string | null
  consumo?: { usadas: number; franquia: number; saldo: number; pacote?: unknown; resumo: string }
  semTelefone?: { quantos: number; nomes: string[] }
}

type Pacotes = {
  atual: string | null
  podeContratar: boolean
  recomendado: string
  liberado: boolean
  precoExcedente: number
  movimento: Movimento
  pacotes: PacoteTela[]
}

const INFO: Record<
  string,
  { rotulo: string; quando: string; porque: string; icone: React.ReactNode }
> = {
  confirmacao: {
    rotulo: 'Confirmação do agendamento',
    quando: 'Assim que ela marca',
    porque: 'Manda pra cliente o dia, a hora e o serviço que ficaram marcados.',
    icone: <IconCalendar size={19} />,
  },
  lembrete_vespera: {
    rotulo: 'Lembrete na véspera',
    quando: 'Um dia antes',
    porque: 'Lembra a cliente na véspera. É o que mais reduz falta.',
    icone: <IconBell size={19} />,
  },
  lembrete_dia: {
    rotulo: 'Lembrete no dia',
    quando: 'Horas antes',
    porque: 'Lembra poucas horas antes do horário dela, não de manhã pra todo mundo.',
    icone: <IconClock size={19} />,
  },
  aniversario: {
    rotulo: 'Aniversário',
    quando: 'No dia, de manhã',
    porque: 'Uma mensagem no aniversário da cliente. Uma vez por ano.',
    icone: <IconGift size={19} />,
  },
  retorno: {
    rotulo: 'Hora de voltar',
    quando: 'Quando fecha o intervalo',
    porque: 'Avisa a cliente que já deu o prazo de repetir o procedimento.',
    icone: <IconSparkles size={19} />,
  },
}

/** 556392846765 → (63) 9284-6765 */
function formatarNumero(bruto: string): string {
  const d = bruto.replace(/\D/g, '')
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length < 10) return bruto
  return `(${s.slice(0, 2)}) ${s.slice(2, s.length - 4)}-${s.slice(-4)}`
}

const CONTAINER = 'max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8'

/**
 * Cabeçalho grudado no topo, no mesmo desenho do SubPageHeader que todas as
 * outras páginas usam. Mora aqui e não lá porque o botão de voltar muda de
 * natureza: na raiz é link pro painel, nas telas de dentro é volta de pilha.
 */
function Cabecalho({
  titulo,
  subtitulo,
  onVoltar,
  direita,
}: {
  titulo: string
  subtitulo?: string
  onVoltar?: () => void
  direita?: React.ReactNode
}) {
  const estiloBotao = {
    width: 36,
    height: 36,
    background: 'var(--admin-surface)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text-2)',
  }
  return (
    <div
      className="sticky top-0 z-20 backdrop-blur-xl border-b"
      style={{ background: 'var(--admin-bottomnav-bg)', borderColor: 'var(--admin-border)' }}
    >
      <div className="max-w-lg mx-auto px-4 py-4 lg:max-w-5xl lg:px-8 flex items-center gap-3">
        {onVoltar ? (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            className="flex-shrink-0 inline-flex items-center justify-center rounded-full transition-transform hover:scale-105"
            style={estiloBotao}
          >
            <IconArrowLeft size={16} />
          </button>
        ) : (
          <Link
            href="/admin"
            aria-label="Voltar"
            className="flex-shrink-0 inline-flex items-center justify-center rounded-full transition-transform hover:scale-105"
            style={estiloBotao}
          >
            <IconArrowLeft size={16} />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1
            className="font-bold text-lg leading-tight truncate"
            style={{ color: 'var(--admin-text)' }}
          >
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
              {subtitulo}
            </p>
          )}
        </div>
        {direita && <div className="flex items-center gap-2 flex-shrink-0">{direita}</div>}
      </div>
    </div>
  )
}

function Seta() {
  return (
    <span style={{ color: 'var(--admin-text-faded)' }} aria-hidden="true">
      <IconChevronRight size={16} />
    </span>
  )
}

export default function WhatsAppPainel({
  businessName,
  businessPhone,
  category,
}: {
  businessName: string
  businessPhone?: string | null
  category?: string | null
}) {
  const [canal, setCanal] = useState<Canal | null>(null)
  const [pacotes, setPacotes] = useState<Pacotes | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  /* Os textos do wa.me — o modo "voce manda". Store diferente das reguas:
     businesses.whatsapp_*_template, nao message_rules. */
  const [manuais, setManuais] = useState<TextosManuais | null>(null)
  const [vista, setVista] = useState<
    | { tela: 'inicio' }
    | { tela: 'mensagens' }
    | { tela: 'manual'; qual: Qual }
    | { tela: 'aviso'; tipo: string }
    | { tela: 'recarga' }
  >({ tela: 'inicio' })
  const [salvando, setSalvando] = useState(false)
  const [erroCompra, setErroCompra] = useState<string | null>(null)
  /* Vira true quando o Asaas nao conhece esse negocio ainda. A rota
     responde `needs_customer_data` e a tela abre os dois campos. */
  const [precisaDados, setPrecisaDados] = useState(false)
  const [pix, setPix] = useState<{
    valor: number
    unidades: number
    dias: number
    copiaECola: string | null
    qrBase64: string | null
    reaproveitada: boolean
    link: string | null
  } | null>(null)

  const carregar = useCallback(() => {
    void fetch('/api/admin/mensagens/canal')
      .then((r) => r.json())
      .then((j) => setCanal(j?.error ? null : j))
      .catch(() => null)
    void fetch('/api/admin/mensagens/pacotes')
      .then((r) => r.json())
      .then((j) => setPacotes(j?.error ? null : j))
      .catch(() => null)
    void fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((j) =>
        setManuais({
          confirmation: String(j?.confirmation ?? ''),
          reminder: String(j?.reminder ?? ''),
        }),
      )
      .catch(() => null)

    /* Regras e textos vêm de rotas diferentes e viram UM objeto por aviso:
       é assim que a dona pensa, e era a divisão entre as duas que fazia o
       mesmo aviso aparecer em dois blocos distantes da tela. */
    void Promise.all([
      fetch('/api/admin/mensagens/regras').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/mensagens/templates').then((r) => r.json()).catch(() => null),
    ]).then(([reg, tpl]) => {
      const textos = new Map<string, Record<string, unknown>>(
        ((tpl?.avisos ?? []) as { tipo: string }[]).map((t) => [
          t.tipo,
          t as unknown as Record<string, unknown>,
        ]),
      )
      setAvisos(
        ((reg?.regras ?? []) as Record<string, unknown>[]).map((r) => {
          const tipo = String(r.tipo)
          const t = textos.get(tipo) ?? {}
          const info = INFO[tipo] ?? { rotulo: tipo, quando: '', porque: '', icone: null }
          const horas = Math.round(Math.abs(Number(r.offsetMinutos ?? 0)) / 60)
          return {
            tipo,
            rotulo: info.rotulo,
            porque: info.porque,
            quando: tipo === 'lembrete_dia' ? `${horas}h antes` : info.quando,
            enabled: r.enabled === true,
            comBotao: r.comBotao !== false,
            temBotao: tipo === 'lembrete_vespera' || tipo === 'lembrete_dia',
            offsetMinutos: Number(r.offsetMinutos ?? 0),
            previa: String(t.previa ?? ''),
            corpoPadrao: String(t.corpoPadrao ?? ''),
            meuTexto: (t.meuTexto as string | null) ?? null,
            campos: (t.campos as string[]) ?? [],
            marketing: t.marketing === true,
            unidadesPorMes: r.unidadesPorMes as number | undefined,
            status: (t.status as string | null) ?? null,
            motivo: (t.motivo as string | null) ?? null,
          }
        }),
      )
    })
  }, [])
  useEffect(carregar, [carregar])

  async function salvarRegra(tipo: string, campos: Record<string, unknown>) {
    setSalvando(true)
    /* Otimista: o interruptor muda na hora e volta se falhar. Tela de toggle
       não tem botão "Salvar" nem espera de rede pra mostrar o estado. */
    setAvisos((as) => as.map((a) => (a.tipo === tipo ? { ...a, ...campos } : a)))
    try {
      const r = await fetch('/api/admin/mensagens/regras', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, ...campos }),
      })
      if (!r.ok) throw new Error('falhou')
    } catch {
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function enviarTexto(tipo: string, corpo: string): Promise<string[] | null> {
    const r = await fetch('/api/admin/mensagens/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, corpo }),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok) return (j?.erros as string[]) ?? [j?.titulo, j?.detalhe].filter(Boolean)
    carregar()
    return null
  }

  async function contratar(id: string, cliente?: { name: string; cpfCnpj: string }) {
    setSalvando(true)
    setErroCompra(null)
    try {
      const r = await fetch('/api/admin/mensagens/pacotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacote: id, customer: cliente }),
      })
      const j = await r.json()
      /* Negocio que nunca passou pelo Asaas — e o caso de quem paga na mao.
         Em vez de mandar falar com o suporte, a tela pede os dois dados e
         reenvia. Mesmo contrato do checkout do plano. */
      if (j?.needs_customer_data) {
        setPrecisaDados(true)
        setErroCompra('Pra emitir a cobrança faltam dois dados rápidos.')
        return
      }
      setPrecisaDados(false)
      if (!r.ok || !j?.ok) throw new Error(String(j?.error ?? 'falhou'))
      if (j.aguardandoPagamento) {
        setPix({
          valor: j.valor,
          unidades: j.unidades,
          dias: j.dias,
          copiaECola: j.pixCopiaECola ?? null,
          qrBase64: j.pixQrBase64 ?? null,
          reaproveitada: j.reaproveitada === true,
          link: j.link ?? null,
        })
        setVista({ tela: 'inicio' })
      }
      carregar()
    } catch {
      setErroCompra('Não deu para gerar a cobrança agora. Tente de novo em alguns instantes.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarManual(qual: Qual, corpo: string): Promise<boolean> {
    try {
      const r = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [qual]: corpo }),
      })
      if (!r.ok) return false
      /* Le de volta o que a rota devolveu, nao o que eu mandei: e a unica
         prova de que gravou. */
      const j = await r.json().catch(() => null)
      setManuais({
        confirmation: String(j?.confirmation ?? corpo),
        reminder: String(j?.reminder ?? corpo),
      })
      return true
    } catch {
      return false
    }
  }

  const telefoneDela = businessPhone ? formatarNumero(businessPhone) : ''

  const listaVoceManda = (
    <VoceMandaLista
      textos={manuais}
      negocio={businessName}
      categoria={category ?? null}
      onAbrir={(qual) => setVista({ tela: 'manual', qual })}
    />
  )

  /* Liberacao vem do servidor, por negocio. Enquanto `pacotes` nao chegou,
     trata como NAO liberado: melhor a tela esperar que prometer compra que
     ainda nao existe. */
  const liberado = pacotes?.liberado === true

  // ── TELAS DE DENTRO ──────────────────────────────────────────
  if (vista.tela === 'aviso') {
    const a = avisos.find((x) => x.tipo === vista.tipo)
    if (a) {
      return (
        <>
          <Cabecalho
            titulo={a.rotulo}
            subtitulo={a.quando}
            onVoltar={() => setVista({ tela: 'inicio' })}
            direita={
              <Toggle
                ligado={a.enabled}
                onChange={() => salvarRegra(a.tipo, { enabled: !a.enabled })}
                desabilitado={salvando}
                rotulo={a.enabled ? 'Desligar aviso' : 'Ligar aviso'}
              />
            }
          />
          <div className={CONTAINER}>
            <div className="lg:max-w-2xl">
              <AvisoDetalhe
                aviso={a}
                onBotao={(v) => salvarRegra(a.tipo, { comBotao: v })}
                onHorario={(h) => salvarRegra(a.tipo, { offsetMinutos: -h * 60 })}
                onEnviarTexto={(corpo) => enviarTexto(a.tipo, corpo)}
              />
            </div>
          </div>
        </>
      )
    }
  }

  if (vista.tela === 'manual') {
    const qual = vista.qual
    return (
      <>
        <Cabecalho
          titulo={qual === 'confirmation' ? 'Confirmação' : 'Lembrete'}
          subtitulo="Você aperta enviar · sai do seu número"
          onVoltar={() => setVista({ tela: 'inicio' })}
        />
        <div className={CONTAINER}>
          <div className="lg:max-w-2xl">
            <VoceManda
              qual={qual}
              inicial={manuais?.[qual] ?? ''}
              negocio={businessName}
              numero={telefoneDela}
              categoria={category ?? null}
              onSalvar={salvarManual}
            />
          </div>
        </div>
      </>
    )
  }

  if (vista.tela === 'recarga' && pacotes) {
    return (
      <>
        <Cabecalho
          titulo={pacotes.atual ? 'Trocar de pacote' : 'Contratar avisos'}
          subtitulo="Mensagens por mês"
          onVoltar={() => setVista({ tela: 'inicio' })}
        />
        <div className={CONTAINER}>
          <div className="lg:max-w-2xl">
            <Recarga
              pacotes={pacotes.pacotes}
              atual={pacotes.atual}
              recomendado={pacotes.recomendado}
              temMovimento={pacotes.movimento.atendimentosMes > 0}
              podeContratar={pacotes.podeContratar}
              liberado={liberado}
              salvando={salvando}
              erro={erroCompra}
              onContratar={contratar}
            />
          </div>
        </div>
      </>
    )
  }

  // ── RAIZ ───────────────────────────────────────
  const temPacote = !!canal?.consumo?.pacote
  const c = canal?.consumo
  const estado = !liberado
    ? { texto: 'Ainda não liberado', tom: 'neutro' as const }
    : canal?.no_ar
      ? { texto: 'Enviando', tom: 'ok' as const }
      : { texto: 'Parado', tom: 'erro' as const }

  const chipBeta = !liberado ? <Chip tom="atencao">Beta</Chip> : undefined

  const caixaPix = pix ? (
    <div
      className="rounded-2xl px-4 py-3 mb-4"
      style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.26)' }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
        Falta pagar para ativar
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        R$ {pix.valor.toFixed(2).replace('.', ',')} por {pix.unidades} mensagens
        {pix.dias > 0 && <> válidas por {pix.dias} dias</>}. Os avisos começam assim que o pagamento
        cair.
      </p>
      {pix.copiaECola && (
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(pix.copiaECola ?? '')}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg mt-2"
          style={{ background: 'var(--admin-text)', color: 'var(--admin-bg)' }}
        >
          Copiar código PIX
        </button>
      )}
    </div>
  ) : null

  /* A lista aparece em dois lugares: é a raiz de quem já tem pacote, e é a
     tela "ver as mensagens" de quem ainda vai contratar — ela precisa poder
     ler e editar os textos ANTES de pagar. */
  const listaDeAvisos = (
    <>
      <TituloSecao>O que o sistema manda sozinho</TituloSecao>
      <p
        className="text-[13.5px] leading-relaxed mb-2.5 px-1"
        style={{ color: 'var(--admin-text-2)' }}
      >
        {temPacote
          ? 'O AgendaPRO manda essas mensagens no WhatsApp da cliente sozinho \u2014 voc\u00ea n\u00e3o digita nada. Ligue as que quiser que ela receba.'
          : 'Deixe ligadas as que voc\u00ea quer \u2014 a escolha fica salva. Elas come\u00e7am a sair quando voc\u00ea contratar um pacote de mensagens.'}
      </p>
      <Lista>
        {avisos.map((a, i) => (
          <Linha
            key={a.tipo}
            primeira={i === 0}
            delay={80 + i * 60}
            onClick={() => setVista({ tela: 'aviso', tipo: a.tipo })}
            icone={<IconeAviso ativo={a.enabled}>{INFO[a.tipo]?.icone ?? null}</IconeAviso>}
            titulo={
              <>
                <span className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {a.rotulo}
                </span>
                {a.status === 'PENDING' && <Chip tom="atencao">em análise</Chip>}
                {a.status === 'REJECTED' && <Chip tom="erro">reprovado</Chip>}
              </>
            }
            /* A descrição, não o começo do texto: as mensagens começam todas
               com "Oi Maria, tudo bem?" e as linhas ficavam indistinguíveis. */
            snippet={a.porque || undefined}
            meta={
              <>
                {a.quando}
                {a.unidadesPorMes ? <> · ~{a.unidadesPorMes} por mês</> : null}
                {a.marketing && <> · gasta 7 por envio</>}
              </>
            }
            acao={
              <>
                {/* Acionável sem entrar: obrigar a abrir a tela só pra
                    desligar um aviso trocaria um toque por três. */}
                <Toggle
                  ligado={a.enabled}
                  onChange={() => salvarRegra(a.tipo, { enabled: !a.enabled })}
                  desabilitado={salvando}
                  rotulo={`${a.enabled ? 'Desligar' : 'Ligar'} ${a.rotulo}`}
                />
                <Seta />
              </>
            }
          />
        ))}
      </Lista>

      {/* Sem pacote, ligar interruptor não manda nada: `podeEnviar()` barra
          por `sem_pacote_contratado`. Dizer "ligue as que quiser que ela
          receba" ali em cima seria prometer o que a gente não cumpre —
          então a tela fecha com o caminho de volta pra oferta. */}
      {!temPacote && (
        <button
          type="button"
          onClick={() => setVista({ tela: 'inicio' })}
          className="admin-card w-full mt-3 px-4 py-3.5 flex items-center gap-3 text-left"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Nenhuma dessas sai ainda
            </span>
            <span className="block text-[13px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Contrate um pacote de mensagens pra elas começarem a ir.
            </span>
          </span>
          <span style={{ color: 'var(--admin-text-faded)' }} aria-hidden="true">
            <IconChevronRight size={16} />
          </span>
        </button>
      )}

      {/* Aviso que resolve em um toque, não banner que só informa. */}
      {canal?.semTelefone && canal.semTelefone.quantos > 0 && (
        <div className="mt-3">
          <Lista>
            <Linha
              primeira
              destaque="atencao"
              onClick={() => {
                window.location.href = '/admin/clientes'
              }}
              titulo={
                <span className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {canal.semTelefone.quantos}{' '}
                  {canal.semTelefone.quantos === 1
                    ? 'cliente sem telefone'
                    : 'clientes sem telefone'}
                </span>
              }
              meta={<>Não vão receber aviso: {canal.semTelefone.nomes.join(', ')}</>}
              acao={<Seta />}
            />
          </Lista>
        </div>
      )}
    </>
  )

  if (vista.tela === 'mensagens') {
    return (
      <>
        <Cabecalho
          titulo="Suas mensagens"
          subtitulo="Leia e edite antes de contratar"
          onVoltar={() => setVista({ tela: 'inicio' })}
        />
        <div className={CONTAINER}>
          <div className="lg:max-w-2xl">{listaDeAvisos}</div>
        </div>
      </>
    )
  }

  /* ── QUEM AINDA NÃO CONTRATOU VÊ A OFERTA ──────────────────
     Decisão de Eduardo, 31/08. Configurar aviso que não pode sair é mexer em
     botão morto: o gate `podeEnviar()` barra todo negócio sem pacote, e hoje
     nenhum dos 29 tem. Primeiro vender, depois configurar. */
  if (pacotes && !temPacote) {
    return (
      <>
        <Cabecalho
          titulo="WhatsApp"
          subtitulo="Mensagens que o sistema manda pras suas clientes"
          direita={chipBeta}
        />
        <div className={CONTAINER}>
          <Oferta
            precisaDados={precisaDados}
            remetente="AgendaPRO"
            numero={canal?.numero ? formatarNumero(canal.numero) : '(63) 9284-6765'}
            pacotes={pacotes.pacotes}
            recomendado={pacotes.recomendado}
            movimento={pacotes.movimento}
            precoExcedente={pacotes.precoExcedente}
            previa={avisos.find((a) => a.tipo === 'confirmacao')?.previa || null}
            podeContratar={pacotes.podeContratar}
            liberado={liberado}
            salvando={salvando}
            erro={erroCompra}
            onContratar={contratar}
            onVerMensagens={() => setVista({ tela: 'mensagens' })}
          />
          {listaVoceManda}
        </div>
        {pix && <ModalPix pix={pix} onFechar={() => setPix(null)} />}
      </>
    )
  }

  // ── QUEM JÁ TEM PACOTE VÊ A GESTÃO ───────────────────────
  return (
    <>
      <Cabecalho
        titulo="WhatsApp"
        subtitulo="Mensagens que o sistema manda pras suas clientes"
        direita={chipBeta}
      />

      <div className={CONTAINER}>
        {/* No celular é uma pilha. No desktop o saldo vira trilho fixo à
            direita — é o que transforma a largura sobrando em informação
            sempre visível em vez de vazio. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
          {canal && (
            <aside className="lg:order-2 lg:sticky lg:top-24 admin-card-deep p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-xl"
                  style={{
                    width: 42,
                    height: 42,
                    background: 'rgba(37,211,102,0.12)',
                    border: '1px solid rgba(37,211,102,0.26)',
                    color: '#128C7E',
                  }}
                >
                  <IconWhatsapp size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  {/* Cor + palavra, sempre: bolinha sozinha não comunica nada
                      pra quem não conhece a convenção. */}
                  <Chip tom={estado.tom}>{estado.texto}</Chip>
                  {canal.numero && (
                    <p
                      className="text-[13px] mt-1 tabular-nums font-medium"
                      style={{ color: 'var(--admin-text-2)' }}
                    >
                      {formatarNumero(canal.numero)}
                    </p>
                  )}
                </div>
              </div>

              {canal.qualidade === 'RED' && (
                <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--admin-danger)' }}>
                  Muita gente bloqueou os avisos. O envio pode ser limitado — vale rever quem está
                  recebendo.
                </p>
              )}

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--admin-divider)' }}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                    Mensagens do mês
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {c?.usadas ?? 0} de {c?.franquia ?? 0}
                  </span>
                </div>
                <BarraConsumo usadas={c?.usadas ?? 0} total={c?.franquia ?? 0} />

                <button
                  type="button"
                  onClick={() => setVista({ tela: 'recarga' })}
                  className="w-full mt-3 py-2.5 rounded-xl text-[13px] font-semibold transition-transform hover:scale-[1.02]"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-2)',
                  }}
                >
                  Trocar de pacote
                </button>
              </div>
            </aside>
          )}

          <div className="lg:order-1">
            {caixaPix}
            {listaDeAvisos}
            {listaVoceManda}
          </div>
        </div>
      </div>
      {pix && <ModalPix pix={pix} onFechar={() => setPix(null)} />}
    </>
  )
}
