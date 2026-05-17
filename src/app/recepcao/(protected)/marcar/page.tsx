import Link from 'next/link'
import { IconCalendar } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function RecepcaoMarcarPage() {
  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Recepção
        </p>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          Marcar agendamento
        </h1>
      </header>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-4">
        <div className="admin-card p-6 text-center space-y-3">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
          >
            <IconCalendar size={26} />
          </div>
          <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Formulário em construção
          </h2>
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Próxima entrega: escolher profissional, serviço, cliente, data e horário num fluxo único.
          </p>
          <Link
            href="/recepcao"
            className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent-border)',
            }}
          >
            Voltar pra agenda
          </Link>
        </div>
      </div>
    </main>
  )
}
