import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/admin-data'
import { SISTEMA_CSS } from './styles'
import EntrarButton from './EntrarButton'
import CobrancaButton from './CobrancaButton'

/**
 * /sistema — Painel de gestão do SaaS (visão do dono, cruza TODOS os negócios).
 *
 * Fora do /admin (que é por-negócio). Gate por email do operador; leitura via
 * service-role (bypassa RLS — mesma técnica dos webhooks/crons). Read-only
 * nesta fatia: mostra o funil, KPIs e as listas de ação. WhatsApp é link
 * direto (seguro); ações que mexem em cobrança/assinatura entram na fatia 2.
 *
 * Buckets em JANELA MÓVEL (últimos N dias por timestamp), não bucket de dia
 * calendário — evita a armadilha de fuso UTC × Brasília sem depender de date-br.
 */

export const dynamic = 'force-dynamic'

const ALLOWED_EMAILS = ['edubchaves5@gmail.com']

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── tipos mínimos ─────────────────────────────────────────────
type Biz = {
  id: string
  name: string | null
  slug: string | null
  phone: string | null
  created_at: string
  acquisition_channel: string | null
}
type Sub = {
  business_id: string
  status: string
  provider: string | null
  plan: string | null
  price_cents: number | null
  setup_paid_at: string | null
  pago_ate: string | null
  refund_deadline_at: string | null
  refunded_at: string | null
  grace_ends_at: string | null
  cancelled_at: string | null
  public_blocked_at: string | null
  pix_link_atual: string | null
  asaas_payment_id_atual: string | null
  permanent_courtesy: boolean | null
}

// ── helpers ───────────────────────────────────────────────────
const DAY = 86_400_000
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function waLink(phone: string | null): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (!d) return null
  if (d.length <= 11) d = '55' + d // assume Brasil se veio sem DDI
  return `https://wa.me/${d}`
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return 'há <1h'
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

const CHANNEL_LABEL: Record<string, string> = {
  indicacao: 'indicação',
  google: 'Google',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  chatgpt_ia: 'ChatGPT/IA',
  salao99_migrante: 'migrou do Salão99',
  whatsapp_organico: 'WhatsApp',
  outro: 'outro canal',
}

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.5-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2 0-.2 0-.3 0-.5s-.5-1.3-.7-1.7-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9a9.2 9.2 0 0 0 5.4 3.4c1.4.4 1.7.3 2 .3s1.4-.6 1.6-1.1.2-1 .1-1.1z" />
  </svg>
)

function WaButton({ phone }: { phone: string | null }) {
  const href = waLink(phone)
  if (!href) return <span className="sys-nowa">sem telefone</span>
  return (
    <a className="sys-btn sys-wa" href={href} target="_blank" rel="noopener noreferrer">
      {WA_ICON} WhatsApp
    </a>
  )
}

export default async function SistemaPage() {
  // ── gate ────────────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) notFound()

  // ── leitura cross-negócio (service-role) ────────────────────
  const admin = serviceClient()
  const now = Date.now()
  const cut30 = new Date(now - 30 * DAY).toISOString()

  const [bizRes, subRes, apptRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, slug, phone, created_at, acquisition_channel'),
    admin
      .from('subscriptions')
      .select(
        'business_id, status, provider, plan, price_cents, setup_paid_at, pago_ate, refund_deadline_at, refunded_at, grace_ends_at, cancelled_at, public_blocked_at, pix_link_atual, asaas_payment_id_atual, permanent_courtesy'
      ),
    admin.from('appointments').select('business_id').gte('created_at', cut30),
  ])

  const businesses = (bizRes.data ?? []) as Biz[]
  const subs = (subRes.data ?? []) as Sub[]
  const subByBiz = new Map(subs.map((s) => [s.business_id, s]))

  // agendamentos recentes por negócio (uso real → detecta "fantasma")
  const apptCount = new Map<string, number>()
  for (const a of (apptRes.data ?? []) as { business_id: string }[]) {
    apptCount.set(a.business_id, (apptCount.get(a.business_id) ?? 0) + 1)
  }

  const t7 = now - 7 * DAY
  const t14 = now - 14 * DAY
  const t30 = now - 30 * DAY

  type Node = { biz: Biz; sub: Sub | undefined }
  const nodes: Node[] = businesses.map((biz) => ({ biz, sub: subByBiz.get(biz.id) }))
  const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : 0)

  // ── buckets ─────────────────────────────────────────────────
  const chegaram7 = nodes.filter((n) => ms(n.biz.created_at) >= t7)
  const chegaramPrev = nodes.filter(
    (n) => ms(n.biz.created_at) >= t14 && ms(n.biz.created_at) < t7
  )
  const chegaram30 = nodes.filter((n) => ms(n.biz.created_at) >= t30)

  const leadsFrios = nodes
    .filter((n) => n.sub?.status === 'pending_payment' && !n.sub?.setup_paid_at)
    .sort((a, b) => ms(b.biz.created_at) - ms(a.biz.created_at))

  // Pagante REAL = ativo, não-cortesia, E já pagou ao menos 1x (setup_paid_at).
  // Sem o setup_paid_at, contas demo/ativadas na mão (nunca pagaram) inflavam
  // a contagem e o MRR — pego pela prova na fonte em 10/07.
  const pagantes = nodes.filter(
    (n) => n.sub?.status === 'active' && n.sub?.provider !== 'cortesia' && !!n.sub?.setup_paid_at
  )
  const cortesias = nodes.filter(
    (n) => n.sub?.status === 'active' && n.sub?.provider === 'cortesia'
  )

  // Em risco = ainda dá pra salvar (NÃO inclui cancelado/estornado, que é churn):
  //  - past_due (venceu, na graça)
  //  - bloqueado no público mas não cancelado
  //  - ativo dentro da janela de garantia de 7 dias (pode pedir estorno — caso Karini)
  const emRisco = nodes
    .filter((n) => {
      const s = n.sub
      if (!s) return false
      const garantia =
        s.status === 'active' && !!s.refund_deadline_at && ms(s.refund_deadline_at) > now && !s.refunded_at
      const blocked = !!s.public_blocked_at && ms(s.public_blocked_at) <= now && s.status !== 'cancelled'
      return s.status === 'past_due' || blocked || garantia
    })
    .sort((a, b) => ms(a.sub?.grace_ends_at ?? a.sub?.refund_deadline_at ?? null) - ms(b.sub?.grace_ends_at ?? b.sub?.refund_deadline_at ?? null))

  const fantasmas = pagantes.filter((n) => (apptCount.get(n.biz.id) ?? 0) === 0)

  const churn30 = nodes.filter((n) => {
    const s = n.sub
    if (!s) return false
    const cancelled = s.status === 'cancelled' && !!s.setup_paid_at && ms(s.cancelled_at) >= t30
    const refunded = !!s.refunded_at && ms(s.refunded_at) >= t30
    return cancelled || refunded
  })

  // ── métricas ────────────────────────────────────────────────
  const mrrCents = pagantes.reduce((sum, n) => sum + (n.sub?.price_cents ?? 0), 0)
  const delta7 = chegaram7.length - chegaramPrev.length
  const cohort30 = chegaram30.length
  const converted30 = chegaram30.filter((n) => !!n.sub?.setup_paid_at).length
  const convPct = cohort30 > 0 ? Math.round((converted30 / cohort30) * 100) : null

  // funil (últimos 30 dias no topo, estado atual no resto)
  const fMax = Math.max(chegaram30.length, leadsFrios.length, pagantes.length, emRisco.length, 1)
  const flex = (n: number) => Math.max(4, Math.round((n / fMax) * 40))

  return (
    <div className="sys-root">
      <style dangerouslySetInnerHTML={{ __html: SISTEMA_CSS }} />
      <div className="sys-wrap">
        {/* topbar */}
        <div className="sys-topbar">
          <div className="sys-brand">
            <div className="sys-logo">A</div>
            <div>
              <h1>AgendaPRO</h1>
              <div className="sys-path">
                painel de gestão · <b>/sistema</b>
              </div>
            </div>
          </div>
          <div className="sys-spacer" />
          <div className="sys-who">
            <span className="sys-dot" /> <b>Eduardo</b> · acesso restrito
          </div>
        </div>

        {/* KPIs */}
        <div className="sys-kpis">
          <Kpi
            tone=""
            icon="plus"
            label="Chegaram · 7d"
            num={chegaram7.length}
            sub={
              delta7 === 0 ? (
                <>estável vs. semana passada</>
              ) : (
                <>
                  <span className={`sys-delta ${delta7 > 0 ? 'up' : 'down'}`}>
                    {delta7 > 0 ? '▲' : '▼'} {Math.abs(delta7)}
                  </span>{' '}
                  vs. semana passada
                </>
              )
            }
          />
          <Kpi
            tone="green"
            icon="check"
            label="Pagantes ativos"
            num={pagantes.length}
            sub={
              <>
                MRR{' '}
                <b className="sys-mono" style={{ color: 'var(--sys-success)', fontWeight: 750 }}>
                  {brl(mrrCents)}
                </b>
                /mês
              </>
            }
          />
          <Kpi tone="amber" icon="clock" label="Leads frios" num={leadsFrios.length} sub={<>cadastrou, não pagou</>} />
          <Kpi tone="red" icon="alert" label="Em risco" num={emRisco.length} sub={<>vencido / estorno</>} />
          <Kpi tone="" icon="x" label="Churn · 30d" num={churn30.length} sub={<>cancelou / estornou</>} />
        </div>

        {/* funil */}
        <div className="sys-card sys-funnel">
          <div className="sys-fhead">
            <span className="sys-eyebrow">Funil do sistema — últimos 30 dias</span>
            {convPct !== null && (
              <span className="sys-conv">
                conversão lead → pagante <b>{convPct}%</b>
              </span>
            )}
          </div>
          <div className="sys-fbar">
            <FSeg cls="s1" n={chegaram30.length} t="Chegaram" flex={flex(chegaram30.length)} />
            <FSeg cls="s2" n={leadsFrios.length} t="Lead frio" flex={flex(leadsFrios.length)} />
            <FSeg cls="s3" n={pagantes.length} t="Pagantes ativos" flex={flex(pagantes.length)} />
            <FSeg cls="s4" n={emRisco.length} t="Em risco" flex={flex(emRisco.length)} />
          </div>
        </div>

        {/* listas */}
        <div className="sys-grid2">
          {/* Leads frios */}
          <div className="sys-card sys-listcard">
            <div className="sys-lchead">
              <span className="sys-ttl">Leads frios</span>
              <span className="sys-desc">nunca pagaram</span>
              <span className="sys-spacer" />
              <span className="sys-count amber">{leadsFrios.length}</span>
            </div>
            {leadsFrios.length === 0 && <Empty text="Nenhum lead parado. 🎉" />}
            {leadsFrios.slice(0, 8).map((n) => {
              const tentou = !!(n.sub?.pix_link_atual || n.sub?.asaas_payment_id_atual)
              return (
                <div className="sys-row" key={n.biz.id}>
                  <div className="sys-biz">
                    <div className="sys-nm">{n.biz.name ?? 'Sem nome'}</div>
                    <div className="sys-meta">
                      <span className="sys-mono">{n.biz.phone ?? 's/ telefone'}</span> · {ago(n.biz.created_at)} ·{' '}
                      {tentou ? 'gerou PIX, não pagou' : 'não abriu o checkout'}
                      {n.biz.acquisition_channel ? ` · ${CHANNEL_LABEL[n.biz.acquisition_channel] ?? n.biz.acquisition_channel}` : ''}
                    </div>
                  </div>
                  <div className="sys-acts">
                    <WaButton phone={n.biz.phone} />
                    <EntrarButton businessId={n.biz.id} name={n.biz.name ?? 'negócio'} />
                    <CobrancaButton businessId={n.biz.id} />
                  </div>
                </div>
              )
            })}
            <div className="sys-note">
              <b>⚠ Reenviar PIX</b> entra na fatia 2 (pede confirmação antes de disparar). WhatsApp já funciona.
            </div>
          </div>

          {/* Em risco + Fantasmas */}
          <div className="sys-card sys-listcard">
            <div className="sys-lchead">
              <span className="sys-ttl">Em risco</span>
              <span className="sys-desc">vencido / estorno</span>
              <span className="sys-spacer" />
              <span className="sys-count red">{emRisco.length}</span>
            </div>
            {emRisco.length === 0 && <Empty text="Ninguém em risco agora." />}
            {emRisco.slice(0, 6).map((n) => {
              const s = n.sub!
              const chip =
                s.status === 'past_due'
                  ? { cls: 'red', txt: 'vencido' }
                  : s.public_blocked_at
                  ? { cls: 'red', txt: 'bloqueado' }
                  : { cls: 'amber', txt: 'garantia' }
              return (
                <div className="sys-row" key={n.biz.id}>
                  <div className="sys-biz">
                    <div className="sys-nm">
                      {n.biz.name ?? 'Sem nome'} <span className={`sys-chip ${chip.cls}`}>{chip.txt}</span>
                    </div>
                    <div className="sys-meta">
                      <span className="sys-mono">{n.biz.phone ?? 's/ telefone'}</span>
                      {s.grace_ends_at ? ` · graça até ${new Date(s.grace_ends_at).toLocaleDateString('pt-BR')}` : ''}
                      {s.pago_ate ? ` · pago até ${new Date(s.pago_ate).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                  </div>
                  <div className="sys-acts">
                    <WaButton phone={n.biz.phone} />
                    <CobrancaButton businessId={n.biz.id} />
                    <EntrarButton businessId={n.biz.id} name={n.biz.name ?? 'negócio'} />
                  </div>
                </div>
              )
            })}

            <div className="sys-lchead">
              <span className="sys-ttl">Fantasmas</span>
              <span className="sys-desc">pagam e não usam</span>
              <span className="sys-spacer" />
              <span className="sys-count slate">{fantasmas.length}</span>
            </div>
            {fantasmas.length === 0 && <Empty text="Todo pagante está usando. 👏" />}
            {fantasmas.slice(0, 6).map((n) => (
              <div className="sys-row" key={n.biz.id}>
                <div className="sys-biz">
                  <div className="sys-nm">{n.biz.name ?? 'Sem nome'}</div>
                  <div className="sys-meta">
                    <span className="sys-mono">{n.biz.phone ?? 's/ telefone'}</span> ·{' '}
                    <span className="sys-chip ghost">0 agend. / 30d</span>
                  </div>
                </div>
                <div className="sys-acts">
                  <WaButton phone={n.biz.phone} />
                  <EntrarButton businessId={n.biz.id} name={n.biz.name ?? 'negócio'} />
                </div>
              </div>
            ))}
            <div className="sys-note">
              <b>Fantasma</b> = paga mas 0 agendamentos em 30 dias. Sinal de churn futuro — vale um contato.
            </div>
          </div>
        </div>

        <div className="sys-footer">
          <span>
            {businesses.length} negócios · {pagantes.length} pagantes · {cortesias.length} cortesias · MRR {brl(mrrCents)}
          </span>
          <span className="sys-spacer" />
          <span>dados ao vivo · fatia 1 (leitura)</span>
        </div>
      </div>
    </div>
  )
}

// ── subcomponentes ──────────────────────────────────────────────
function Kpi({
  tone,
  icon,
  label,
  num,
  sub,
}: {
  tone: string
  icon: string
  label: string
  num: number
  sub: React.ReactNode
}) {
  return (
    <div className={`sys-kpi ${tone}`}>
      <div className="sys-ktop">
        <span className={`sys-ic ${tone || 'blue'}`}>{ICONS[icon]}</span>
        <span className="sys-klabel">{label}</span>
      </div>
      <div className="sys-num sys-mono">{num}</div>
      <div className="sys-ksub">{sub}</div>
    </div>
  )
}

function FSeg({ cls, n, t, flex }: { cls: string; n: number; t: string; flex: number }) {
  return (
    <div className={`sys-seg ${cls}`} style={{ flex }}>
      <span className="sys-segn sys-mono">{n}</span>
      <span className="sys-segt">{t}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="sys-empty">{text}</div>
}

const ICONS: Record<string, React.ReactNode> = {
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
}
