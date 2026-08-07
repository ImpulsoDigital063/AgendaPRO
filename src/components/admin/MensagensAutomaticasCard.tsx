'use client'

/* Onde a dona liga e desliga cada aviso automático.
   ───────────────────────────────────────────────────────────────────
   Duas decisões de tela que valem mais que o visual:

   1. TUDO NASCE DESLIGADO e ela liga um por um. Mensagem automática sai em
      nome dela, pra base dela — ligar por padrão é decidir no lugar dela e
      ela descobre pela cliente estranhando.
   2. QUANDO NÃO HÁ CANAL, A TELA DIZ. Se o WhatsApp ainda não está
      conectado, ligar não manda nada. Deixar ela descobrir sozinha uma
      semana depois é o jeito mais rápido de queimar a confiança na
      funcionalidade inteira. */

import { useEffect, useState } from 'react'

type Regra = {
  tipo: string
  enabled: boolean
  offsetMinutos: number
  horaDoDia: string
  retornoDias: number | null
}

const INFO: Record<string, { titulo: string; texto: string; quem: 'cliente' | 'você' }> = {
  confirmacao: {
    titulo: 'Confirmação do agendamento',
    texto: 'Assim que o horário é marcado, a cliente recebe a confirmação com data, hora e serviço.',
    quem: 'cliente',
  },
  lembrete_vespera: {
    titulo: 'Lembrete na véspera',
    texto: 'Um dia antes, com botão de confirmar presença. É o que mais reduz falta.',
    quem: 'cliente',
  },
  lembrete_dia: {
    titulo: 'Lembrete no dia',
    texto: 'Algumas horas antes do horário dela, não de manhã pra todo mundo.',
    quem: 'cliente',
  },
  aniversario: {
    titulo: 'Aniversário',
    texto: 'Uma mensagem no dia do aniversário da cliente. Uma vez por ano, sem promessa de brinde.',
    quem: 'cliente',
  },
  dono_novo_agendamento: {
    titulo: 'Avisar você de agendamento novo',
    texto: 'Chega no WhatsApp do seu negócio quando entra horário novo.',
    quem: 'você',
  },
}

const HORAS_ANTES = [1, 2, 3, 4, 6, 12]

export default function MensagensAutomaticasCard() {
  const [regras, setRegras] = useState<Regra[]>([])
  const [canalLigado, setCanalLigado] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  async function carregar() {
    try {
      const r = await fetch('/api/admin/mensagens/regras').then((x) => x.json())
      setRegras(r.regras ?? [])
      setCanalLigado(r.canal_ligado === true)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { void carregar() }, [])

  async function salvar(regra: Regra, mudanca: Partial<Regra>) {
    const nova = { ...regra, ...mudanca }
    setRegras((rs) => rs.map((r) => (r.tipo === regra.tipo ? nova : r)))
    setSalvando(regra.tipo)
    await fetch('/api/admin/mensagens/regras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nova),
    })
    setSalvando(null)
  }

  if (carregando) {
    return (
      <div className="admin-card p-4">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Carregando…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Mensagens automáticas
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          O sistema manda sozinho, em nome do seu negócio. Ligue só o que fizer sentido pra você —
          tudo começa desligado.
        </p>
      </div>

      {!canalLigado && (
        <div
          className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <strong style={{ color: 'var(--admin-text)' }}>O envio ainda não está ligado.</strong>{' '}
          <span style={{ color: 'var(--admin-text-mute)' }}>
            Você já pode deixar escolhido o que quer mandar — assim que o canal for ativado, começa a
            sair sem você precisar mexer aqui de novo.
          </span>
        </div>
      )}

      {regras.map((r) => {
        const info = INFO[r.tipo]
        if (!info) return null
        const horasAntes = Math.round(Math.abs(r.offsetMinutos) / 60)

        return (
          <div key={r.tipo} className="admin-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {info.titulo}
                  </p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--admin-surface-2, rgba(0,0,0,0.05))',
                      color: 'var(--admin-text-faded)',
                    }}
                  >
                    para {info.quem}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {info.texto}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={r.enabled}
                onClick={() => salvar(r, { enabled: !r.enabled })}
                disabled={salvando === r.tipo}
                className="flex-shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-60"
                style={{ background: r.enabled ? 'var(--admin-accent)' : 'var(--admin-border)' }}
                aria-label={r.enabled ? 'Desligar' : 'Ligar'}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: r.enabled ? 26 : 4 }}
                />
              </button>
            </div>

            {/* Ajuste fino só aparece quando o aviso está ligado — configuração
                de coisa desligada é ruído na tela. */}
            {r.enabled && r.tipo === 'lembrete_dia' && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Mandar</span>
                <select
                  value={horasAntes}
                  onChange={(e) => salvar(r, { offsetMinutos: -Number(e.target.value) * 60 })}
                  className="admin-input px-2 py-1.5 text-xs"
                >
                  {HORAS_ANTES.map((h) => (
                    <option key={h} value={h}>{h}h antes</option>
                  ))}
                </select>
                <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  do horário dela
                </span>
              </div>
            )}

            {r.enabled && r.tipo === 'aniversario' && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Mandar às</span>
                <input
                  type="time"
                  value={r.horaDoDia}
                  onChange={(e) => salvar(r, { horaDoDia: e.target.value })}
                  className="admin-input px-2 py-1.5 text-xs"
                />
              </div>
            )}
          </div>
        )
      })}

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-faded)' }}>
        Toda mensagem leva o nome e o telefone do seu negócio, para a cliente saber de quem é e ter
        para onde responder.
      </p>
    </div>
  )
}
