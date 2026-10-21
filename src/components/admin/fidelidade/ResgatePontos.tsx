'use client'

import { useEffect, useState } from 'react'

/**
 * Resgate de pontos fora da ficha (21/10). Wanessa: "aparece que tá
 * disponível, mas não me dá a opção de usar os pontos". O resgate só existia
 * em Clientes; o momento em que a cliente pergunta é na cobrança. Aqui ele
 * aparece no fechar da comanda e no atendimento da grade.
 *
 * Mesma rota de leitura e mesmo /redeem da ficha: um extrato só. Some
 * quando o negócio não tem recompensa ou a rota nega (área do profissional).
 * Resgatar pede um segundo toque, porque dentro da comanda o dedo escorrega.
 */
type Reward = { id: string; name: string; points_required: number }

export default function ResgatePontos({ customerId, nota }: { customerId: string; nota?: string }) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [saldo, setSaldo] = useState<number | null>(null)
  const [escolhida, setEscolhida] = useState<Reward | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelado = false
    fetch('/api/admin/customers/' + customerId, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (cancelado || !data) return
        setRewards((data.rewards ?? []) as Reward[])
        setSaldo(Number(data.customer?.total_points ?? 0))
      })
    return () => { cancelado = true }
  }, [customerId, reload])

  if (saldo === null || rewards.length === 0) return null

  async function confirmar() {
    if (!escolhida) return
    setEnviando(true)
    setErro(null)
    const res = await fetch('/api/admin/customers/' + customerId + '/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: escolhida.id }),
    })
    setEnviando(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErro(j.error ?? 'Não deu pra resgatar')
      return
    }
    setSucesso(escolhida.name + ' resgatado!')
    setEscolhida(null)
    setReload((k) => k + 1)
  }

  const ordenadas = [...rewards].sort((a, b) => a.points_required - b.points_required)

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
          Pontos da cliente
        </p>
        <p className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
          {saldo} pts
        </p>
      </div>

      {escolhida ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
            Resgatar <strong>{escolhida.name}</strong> por {escolhida.points_required} pontos?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {enviando ? 'Resgatando…' : 'Sim, resgatar'}
            </button>
            <button
              type="button"
              onClick={() => setEscolhida(null)}
              disabled={enviando}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-mute)' }}
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {ordenadas.map((r) => {
            const pode = saldo >= r.points_required
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSucesso(null); setErro(null); setEscolhida(r) }}
                disabled={!pode}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between disabled:opacity-40"
                style={{
                  background: pode ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' : 'transparent',
                  color: pode ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                  border: '1px solid ' + (pode ? 'color-mix(in srgb, var(--admin-accent) 30%, transparent)' : 'var(--admin-border)'),
                }}
              >
                <span className="truncate text-left">{r.name}</span>
                <span className="flex-shrink-0 ml-2">
                  {r.points_required} pts{!pode && ' · faltam ' + (r.points_required - saldo)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {sucesso && (
        <p className="text-xs mt-2.5 font-semibold" style={{ color: '#10B981' }}>
          {sucesso}{nota ? ' ' + nota : ''}
        </p>
      )}
      {erro && (
        <p className="text-xs mt-2.5" style={{ color: 'var(--admin-danger,#EF4444)' }}>{erro}</p>
      )}
    </div>
  )
}
