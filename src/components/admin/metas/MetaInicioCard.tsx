/* ═══════════════════════════════════════════════════════════════
   Cartão da meta no Início (04/11/2026)
   "<Mês> · R$ X de R$ Y · faltam R$ Z" + barra; toque abre a aba Metas.
   Sem meta: convite curto. Só dona/gerente com financeiro (acessoMetas).
   Custo: 1 leitura de 1 linha + faturado em cache de 5 min.
   ═══════════════════════════════════════════════════════════════ */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { todayBR } from '@/lib/date-br'
import { acessoMetas } from '@/lib/metas/acesso'
import { faturadoDoMes, nomeMes } from '@/lib/metas/calculo'
import { IconChevronRight, IconTarget } from '@/components/ui/Icon'
import { BarraMeta } from './BarraMeta'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function MetaInicioCardView({ mesNome, meta, faturado }: { mesNome: string; meta: number | null; faturado: number }) {
  const base = 'block rounded-2xl px-4 py-3.5 transition-colors'
  const estilo = { background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }
  if (!meta) {
    return (
      <Link href="/admin/metas/definir" className={`${base} flex items-center gap-3`} style={estilo} aria-label="Definir a meta do mês" data-testid="meta-inicio-convite">
        <span className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
          <IconTarget size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <b className="block text-[15px]" style={{ color: 'var(--admin-text)' }}>Defina sua meta de {mesNome}</b>
          <small className="block text-xs" style={{ color: 'var(--admin-text-mute)' }}>leva 30 segundos</small>
        </span>
        <IconChevronRight size={18} style={{ color: 'var(--admin-text-faded)' }} />
      </Link>
    )
  }
  const faltam = Math.max(0, meta - faturado)
  return (
    <Link href="/admin/metas" className={base} style={estilo} aria-label="Abrir a aba Metas" data-testid="meta-inicio">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] min-w-0" style={{ color: 'var(--admin-text-mute)' }}>
          <b style={{ color: 'var(--admin-text)' }}>{cap(mesNome)}</b> · <b className="tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(faturado)}</b> de {brl(meta)}
          {faltam > 0 ? <> · faltam <b className="tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(faltam)}</b></> : <> · <b style={{ color: 'var(--admin-success)' }}>bateu!</b></>}
        </p>
        <IconChevronRight size={18} style={{ color: 'var(--admin-text-faded)', flexShrink: 0 }} />
      </div>
      <div className="mt-2.5"><BarraMeta atual={faturado} alvo={meta} alto={8} /></div>
    </Link>
  )
}

export default async function MetaInicioCard() {
  const acesso = await acessoMetas()
  if (!acesso) return null
  const hoje = todayBR()
  const ym = hoje.slice(0, 7)
  const supabase = await createClient()
  const { data: meta } = await supabase.from('metas_mes').select('valor').eq('business_id', acesso.business.id).eq('mes', `${ym}-01`).maybeSingle()
  const faturado = meta ? await faturadoDoMes(acesso.business.id, ym, hoje) : 0
  return <MetaInicioCardView mesNome={nomeMes(ym)} meta={meta ? Number(meta.valor) : null} faturado={faturado} />
}
