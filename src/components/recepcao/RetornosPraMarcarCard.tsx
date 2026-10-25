import Link from 'next/link'
import type { RetornoPraMarcar } from '@/lib/retornos-pra-marcar'

/* v177 · camada 1 do retorno: a recepção marca a volta enquanto a cliente
   ainda está no balcão. "Marcar" abre o agendamento com cliente, serviço da
   volta, a mesma profissional e a data sugerida. */

const ROTULO: Record<RetornoPraMarcar['tipo'], string> = { retoque: 'Retoque', manutencao: 'Manutenção', sessao: 'Nova sessão' }
const dm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`

export default function RetornosPraMarcarCard({ lista, base = '/recepcao/marcar' }: { lista: RetornoPraMarcar[]; base?: string }) {
  if (!lista.length) return null
  return (
    <section className="admin-card p-4">
      <p className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
        Retornos pra marcar · {lista.length}
      </p>
      <p className="text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
        Marque agora, com a cliente ainda aqui. Daí ela só recebe a confirmação e o lembrete.
      </p>
      <ul className="mt-3 divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {lista.map((r) => {
          const q = new URLSearchParams({ cliente: r.clienteId, servico: r.servicoVolta, data: r.sugestao })
          if (r.profissionalId) q.set('prof', r.profissionalId)
          return (
            <li key={`${r.appointmentId}:${r.servicoVolta}`} className="flex items-center justify-between gap-3 py-3" style={{ borderColor: 'var(--admin-border)' }}>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>{r.cliente}</span>
                <span className="block truncate text-[12.5px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {ROTULO[r.tipo]} · {r.procedimento}
                </span>
                <span className="block text-[12.5px]" style={{ color: 'var(--admin-text-mute)' }}>
                  a partir de {dm(r.sugestao)}{r.ate ? ` · até ${dm(r.ate)}` : ''}
                </span>
              </span>
              <Link href={`${base}?${q}`} className="shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white" style={{ background: 'var(--admin-accent)' }}>
                Marcar
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
