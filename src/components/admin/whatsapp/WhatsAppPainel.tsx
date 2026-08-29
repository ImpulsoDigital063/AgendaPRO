'use client'

/* ═══════════════════════════════════════════════════════════════
   CENTRAL DE WHATSAPP

   Redesenhada em 29/08. A versão anterior empilhava quinze blocos de peso
   visual idêntico — cinco pacotes, cinco textos abertos por inteiro, cinco
   interruptores — e a dona rolava a tela toda pra achar qualquer coisa.

   ─── As três mudanças estruturais ─────────────────────────────

   1. ÍNDICE COM UM NÍVEL DE PROFUNDIDADE, não tudo aberto.
      A raiz é curta: faixa de estado, cinco linhas de aviso, uma linha de
      ação. Cada aviso abre a própria tela.
      Não é acordeão: com texto de 6-8 linhas por item, cinco acordeões
      abertos dão a mesma parede de texto, com um clique a mais.
      Não é tab: segmented control troca estado da MESMA coisa; aqui são
      naturezas diferentes (estado, configuração, compra), e obrigaria a
      dona a escolher a categoria certa antes de ver a lista.

   2. O AVISO VIROU UMA COISA SÓ. Antes "Lembrete da véspera" existia em dois
      blocos distantes: ela ligava embaixo e lia o texto em cima. Agora
      interruptor, horário, custo e texto ficam no mesmo lugar.

   3. COMPRAR SAIU DAQUI. Empilhar card de preço em celular funciona até
      QUATRO planos — são cinco. A Fresha, mesmo público e mesmo problema,
      não mostra plano na tela de automação: mostra SALDO, e a recarga é
      fluxo à parte. É o que está aqui.

   Hierarquia por estrutura, não por cor: estado é faixa sem card,
   configuração é lista agrupada, compra é outra tela.

   Mobile e desktop: a mesma tela, sem prefixo de breakpoint no que é
   estrutural. O único ajuste responsivo vive no CTA da recarga, fixo no
   rodapé no celular e estático no `sm:`.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react'
import { CANAL_LIBERADO } from '@/lib/mensagens/liberado'
import { BarraConsumo, Chip, Linha, Lista, Seta, TituloSecao, Toggle } from './ui'
import AvisoDetalhe, { type Aviso } from './AvisoDetalhe'
import Recarga, { type PacoteTela } from './Recarga'

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
  movimento: { atendimentosMes: number; msgsPorAtendimento: number; projecaoHipotetica: boolean }
  pacotes: PacoteTela[]
}

const INFO: Record<string, { rotulo: string; quando: string; porque: string }> = {
  confirmacao: {
    rotulo: 'Confirmação do agendamento',
    quando: 'Na hora que marca',
    porque: 'A cliente recebe por escrito o que ficou combinado.',
  },
  lembrete_vespera: {
    rotulo: 'Lembrete na véspera',
    quando: '1 dia antes',
    porque: 'É o que mais reduz falta — dá tempo de remarcar em vez de sumir.',
  },
  lembrete_dia: {
    rotulo: 'Lembrete no dia',
    quando: 'Horas antes',
    porque: 'Algumas horas antes do horário dela, não de manhã pra todo mundo.',
  },
  aniversario: {
    rotulo: 'Aniversário',
    quando: 'No dia, de manhã',
    porque: 'Uma vez por ano. Sem prometer brinde que você não vai dar.',
  },
  retorno: {
    rotulo: 'Hora de voltar',
    quando: 'Quando fecha o intervalo',
    porque: 'Avisa a cliente que já deu o prazo para repetir o procedimento.',
  },
}

/** 556392846765 → (63) 9284-6765 */
function formatarNumero(bruto: string): string {
  const d = bruto.replace(/\D/g, '')
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length < 10) return bruto
  return `(${s.slice(0, 2)}) ${s.slice(2, s.length - 4)}-${s.slice(-4)}`
}

export default function WhatsAppPainel({
  businessName,
}: {
  businessName: string
  businessPhone?: string | null
  category?: string | null
}) {
  const [canal, setCanal] = useState<Canal | null>(null)
  const [pacotes, setPacotes] = useState<Pacotes | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [vista, setVista] = useState<
    { tela: 'inicio' } | { tela: 'aviso'; tipo: string } | { tela: 'recarga' }
  >({ tela: 'inicio' })
  const [salvando, setSalvando] = useState(false)
  const [erroCompra, setErroCompra] = useState<string | null>(null)
  const [pix, setPix] = useState<{
    valor: number
    unidades: number
    dias: number
    copiaECola: string | null
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

    /* Regras e textos vêm de rotas diferentes e viram UM objeto por aviso:
       é assim que a dona pensa, e era a divisão entre as duas que fazia o
       mesmo aviso aparecer em dois blocos distantes da tela. */
    void Promise.all([
      fetch('/api/admin/mensagens/regras').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/mensagens/templates').then((r) => r.json()).catch(() => null),
    ]).then(([reg, tpl]) => {
      const textos = new Map<string, Record<string, unknown>>(
        ((tpl?.avisos ?? []) as { tipo: string }[]).map((t) => [t.tipo, t as unknown as Record<string, unknown>]),
      )
      setAvisos(
        ((reg?.regras ?? []) as Record<string, unknown>[]).map((r) => {
          const tipo = String(r.tipo)
          const t = textos.get(tipo) ?? {}
          const info = INFO[tipo] ?? { rotulo: tipo, quando: '', porque: '' }
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

  async function contratar(id: string) {
    setSalvando(true)
    setErroCompra(null)
    try {
      const r = await fetch('/api/admin/mensagens/pacotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacote: id }),
      })
      const j = await r.json()
      if (j?.needs_customer_data) {
        setErroCompra(
          'Para a primeira cobrança precisamos do seu nome completo e CPF. Fale com o suporte para liberar.',
        )
        return
      }
      if (!r.ok || !j?.ok) throw new Error(String(j?.error ?? 'falhou'))
      if (j.aguardandoPagamento) {
        setPix({
          valor: j.valor,
          unidades: j.unidades,
          dias: j.dias,
          copiaECola: j.pixCopiaECola ?? null,
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

  // ── TELAS DE DENTRO ──────────────────────────────────────────
  if (vista.tela === 'aviso') {
    const a = avisos.find((x) => x.tipo === vista.tipo)
    if (!a) return null
    return (
      <div className="max-w-2xl pb-8">
        <AvisoDetalhe
          aviso={a}
          salvando={salvando}
          onVoltar={() => setVista({ tela: 'inicio' })}
          onToggle={() => salvarRegra(a.tipo, { enabled: !a.enabled })}
          onBotao={(v) => salvarRegra(a.tipo, { comBotao: v })}
          onHorario={(h) => salvarRegra(a.tipo, { offsetMinutos: -h * 60 })}
          onEnviarTexto={(corpo) => enviarTexto(a.tipo, corpo)}
        />
      </div>
    )
  }

  if (vista.tela === 'recarga' && pacotes) {
    return (
      <div className="max-w-2xl">
        <Recarga
          pacotes={pacotes.pacotes}
          atual={pacotes.atual}
          recomendado={pacotes.recomendado}
          temMovimento={pacotes.movimento.atendimentosMes > 0}
          podeContratar={pacotes.podeContratar}
          liberado={CANAL_LIBERADO}
          salvando={salvando}
          erro={erroCompra}
          onVoltar={() => setVista({ tela: 'inicio' })}
          onContratar={contratar}
        />
      </div>
    )
  }

  // ── RAIZ ─────────────────────────────────────────────────────
  const temPacote = !!canal?.consumo?.pacote
  const c = canal?.consumo

  return (
    <div className="max-w-2xl pb-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
            WhatsApp
          </h1>
          {/* Chip no lugar do banner fixo: banner que nunca sai treina
              cegueira a banner, e some justamente o alerta que importa. */}
          {!CANAL_LIBERADO && <Chip tom="atencao">Beta</Chip>}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
          Os avisos que {businessName} manda sozinho para as clientes.
        </p>
      </header>

      {!CANAL_LIBERADO && (
        <p
          className="text-xs leading-relaxed rounded-xl px-3 py-2.5 mb-4"
          style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)' }}
        >
          Estamos trocando o envio para o canal oficial do WhatsApp e o número novo ainda está
          sendo liberado. Você pode deixar os textos do seu jeito — <strong>os avisos ainda não
          saem</strong>. Avisamos quando estiver no ar.
        </p>
      )}

      {/* ESTADO — faixa, não card: é informação de sistema, não configuração. */}
      {canal && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--admin-surface-hi)' }}>
          <div className="flex items-center gap-2">
            {/* Cor + palavra, sempre. Bolinha sozinha não comunica nada pra
                quem não conhece a convenção, e falha em acessibilidade. */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background:
                  !CANAL_LIBERADO || !temPacote
                    ? 'var(--admin-text-faded)'
                    : canal.no_ar
                      ? '#22c55e'
                      : '#f59e0b',
              }}
            />
            <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
              {!CANAL_LIBERADO
                ? 'Ainda não liberado'
                : !temPacote
                  ? 'Disponível — você ainda não contratou'
                  : canal.no_ar
                    ? 'Enviando normalmente'
                    : 'Os avisos não estão saindo'}
            </p>
            {canal.numero && (
              <span
                className="text-[11px] ml-auto tabular-nums"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                {formatarNumero(canal.numero)}
              </span>
            )}
          </div>

          {canal.qualidade === 'RED' && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: '#b91c1c' }}>
              Muita gente bloqueou os avisos. O envio pode ser limitado — vale rever quem está
              recebendo.
            </p>
          )}

          {/* CONSUMO em uma linha, com seta. Não é card de plano. */}
          <button
            type="button"
            onClick={() => setVista({ tela: 'recarga' })}
            className="w-full text-left mt-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                {temPacote ? 'Mensagens do mês' : 'Avisos automáticos'}
              </span>
              <span
                className="text-[11px] tabular-nums flex items-center gap-1"
                style={{ color: 'var(--admin-text)' }}
              >
                {temPacote ? `${c?.usadas ?? 0} de ${c?.franquia ?? 0}` : 'ver pacotes'}
                <Seta />
              </span>
            </div>
            {temPacote && (
              <div className="mt-1.5">
                <BarraConsumo usadas={c?.usadas ?? 0} total={c?.franquia ?? 0} />
              </div>
            )}
          </button>
        </div>
      )}

      {pix && (
        <div
          className="rounded-xl px-4 py-3 mt-3"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Falta pagar para ativar
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            R$ {pix.valor.toFixed(2).replace('.', ',')} por {pix.unidades} mensagens
            {pix.dias > 0 && <> válidas por {pix.dias} dias</>}. Os avisos começam assim que o
            pagamento cair.
          </p>
          {pix.copiaECola && (
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(pix.copiaECola ?? '')}
              className="text-xs font-semibold px-3 py-1.5 rounded mt-2"
              style={{ background: 'var(--admin-text)', color: 'var(--admin-bg)' }}
            >
              Copiar código PIX
            </button>
          )}
        </div>
      )}

      {/* CONFIGURAÇÃO — lista agrupada, uma linha por aviso. */}
      <TituloSecao>Suas mensagens</TituloSecao>
      <Lista>
        {avisos.map((a, i) => (
          <Linha
            key={a.tipo}
            primeira={i === 0}
            onClick={() => setVista({ tela: 'aviso', tipo: a.tipo })}
            titulo={
              <>
                <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {a.rotulo}
                </span>
                {a.status === 'PENDING' && <Chip tom="atencao">em análise</Chip>}
                {a.status === 'REJECTED' && <Chip tom="erro">reprovado</Chip>}
              </>
            }
            snippet={a.previa || undefined}
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

      {/* AÇÃO — aviso que resolve em um toque, não banner que só informa. */}
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
                <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
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
    </div>
  )
}
