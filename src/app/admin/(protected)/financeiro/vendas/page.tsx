import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

export default async function VendasPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Vendas" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          <div
            className="rounded-2xl p-10 text-center"
            style={{
              background: 'var(--admin-surface)',
              border: '1px dashed var(--admin-border)',
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
              Tabela de Vendas
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Em construção · vai listar todos os atendimentos como linhas com status
              <br />
              (Sem Fatura · Fatura Fechada · Cancelada)
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
