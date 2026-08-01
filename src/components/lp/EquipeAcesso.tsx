/* ═══════════════════════════════════════════════════════════════
   EQUIPE & ACESSO — seção de LP (4 nichos)

   Dor real do dono: "não quero que a recepcionista veja meu
   faturamento" / "o profissional fica me perguntando quanto ganhou".

   VERDADE (conferido em app/recepcao/(protected)/ e
   app/profissional/(protected)/):
     · RECEPÇÃO vê: caixa, clientes, comandas, consultas, cupons,
       marcar, pacotes, produtos
     · RECEPÇÃO NÃO vê: financeiro, relatórios, colaboradores,
       configurações
     · PROFISSIONAL (atualizado 01/08/2026 · autonomia entregue na v98):
       vê a agenda da equipe, marca a própria cliente, recebe o pagamento,
       dá desconto, remarca e bloqueia o próprio horário — TUDO gated por
       3 flags do negócio (professionals_can_book_self / _others /
       see_team_agenda), que nascem DESLIGADAS. Cancelar: só o dela e só
       antes de pago. Continua sem ver faturamento do negócio nem comissão
       das colegas.
       ⚠️ Antes desta data a copy dizia "read-only no pagamento" — virou
       mentira no dia em que a Realli passou a operar sem recepção.
   NÃO EXISTE no SaaS (não prometer):
     · 31 autorizações granulares (isso é do fork SystemPalace)
     · supervisor com aprovação de ação (idem)
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'
import { IconCheck, IconContacts } from '@/components/BarberIcons'

type Variant = 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string; soft: string }> = {
  barbearia: { rgb: '6,182,212', hex: '#06B6D4', soft: '#67E8F9' },
  salao: { rgb: '236,72,153', hex: '#EC4899', soft: '#F9A8D4' },
  nail: { rgb: '244,114,182', hex: '#F472B6', soft: '#F9A8D4' },
  estetica: { rgb: '16,185,129', hex: '#10B981', soft: '#6EE7B7' },
  lash: { rgb: '167,139,250', hex: '#A78BFA', soft: '#C4B5FD' },
}

const COPY: Record<Variant, { h2a: string; h2b: string; sub: string; profNome: string; profLabel: string; fecho: string }> = {
  barbearia: {
    h2a: 'Sua equipe trabalha no sistema.',
    h2b: 'Sem ver seu faturamento.',
    sub: 'O barbeiro acompanha a agenda dele e a comissão dele. Quem fica na recepção marca, atende e fecha comanda. Nenhum dos dois abre o seu financeiro.',
    profNome: 'Barbeiro', profLabel: 'Marcos',
    fecho: 'Você não precisa escolher entre dar autonomia pra equipe e proteger seus números.',
  },
  salao: {
    h2a: 'Sua equipe marca sozinha.',
    h2b: 'Sem ver seu faturamento.',
    sub: 'Cada profissional entra com o login dela: marca a própria cliente, recebe no fim do atendimento, bloqueia o horário do almoço e acompanha a comissão dela em tempo real. Para de te perguntar quanto fez — e para de depender de você pra encaixar alguém.',
    profNome: 'Profissional', profLabel: 'Ana',
    fecho: 'Salão com equipe precisa disso. Você deixa de ser o gargalo da agenda sem abrir seu financeiro pra ninguém.',
  },
  nail: {
    h2a: 'Trabalha com mais alguém?',
    h2b: 'Cada uma vê o que é dela.',
    sub: 'A profissional acompanha a agenda e a comissão dela em tempo real. Se você tem recepção, ela marca, atende e fecha comanda — sem abrir o seu financeiro.',
    profNome: 'Profissional', profLabel: 'Bianca',
    fecho: 'Autonomia pra equipe, seus números só seus.',
  },
  estetica: {
    h2a: 'Sua equipe trabalha no sistema.',
    h2b: 'Sem ver seu faturamento.',
    sub: 'Cada profissional acompanha a agenda e a comissão dela em tempo real. A recepção marca, atende e fecha comanda. Nenhuma das duas abre o seu financeiro.',
    profNome: 'Profissional', profLabel: 'Camila',
    fecho: 'Clínica com equipe precisa disso. Você não pode dar sua senha pra recepção — nem ficar preso no balcão.',
  },
  lash: {
    h2a: 'Divide o studio com outra lash?',
    h2b: 'Cada uma vê o que é dela.',
    sub: 'Cada lash entra com o login dela: marca a própria cliente, recebe no fim da aplicação e acompanha a comissão dela. Você para de ser a agenda das duas — e continua sendo a única que enxerga o caixa.',
    profNome: 'Lash designer', profLabel: 'Bruna',
    fecho: 'Autonomia na agenda, seus números só seus.',
  },
}

const RECEP_VE = ['Agenda e marcação', 'Comandas', 'Caixa', 'Clientes', 'Produtos', 'Cupons e pacotes']
const RECEP_NAO_VE = ['Seu financeiro', 'Relatórios do negócio', 'Comissão dos outros', 'Configurações']

/* ── Mini-UI: dois cartões de acesso ───────────────────────── */
function AcessoMock({ v }: { v: Variant }) {
  const t = THEME[v]
  const c = COPY[v]

  return (
    <div className="w-full max-w-[400px] mx-auto space-y-3">
      {/* profissional */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0B0E1C 0%, #070914 100%)', border: `1px solid rgba(${t.rgb},0.28)`, boxShadow: `0 20px 50px -22px rgba(${t.rgb},0.26)` }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: `rgba(${t.rgb},0.10)`, borderBottom: `1px solid rgba(${t.rgb},0.20)` }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black" style={{ background: t.hex, color: '#05070f' }}>
              {c.profLabel[0]}
            </span>
            <span className="text-[12px] font-bold text-white">{c.profLabel}</span>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `rgba(${t.rgb},0.16)`, color: t.soft }}>{c.profNome}</span>
        </div>
        <div className="p-4">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2">Minha comissão · julho</div>
          <div className="flex items-end justify-between mb-3">
            <span className="text-[26px] font-black text-white leading-none">R$ 1.284<span className="text-[15px] text-slate-500">,60</span></span>
            <span className="text-[10px] text-emerald-300 font-semibold pb-1">28 atendimentos</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
            <div className="h-full rounded-full" style={{ width: '64%', background: `linear-gradient(90deg, ${t.hex}, rgba(${t.rgb},0.5))` }} />
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[9.5px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>Marca, atende e recebe — só a agenda dela. Você liga e desliga.</span>
          </div>
        </div>
      </div>

      {/* recepção */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex text-slate-400"><IconContacts size={13} /></span>
          <span className="text-[11.5px] font-bold text-white">Recepção</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div>
            <div className="text-[8px] uppercase tracking-wider font-bold text-emerald-400/70 mb-1.5">Vê</div>
            {RECEP_VE.map((x) => (
              <div key={x} className="flex items-center gap-1.5 mb-1">
                <span className="w-3 h-3 rounded-full inline-flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.16)', color: '#4ADE80' }}>
                  <IconCheck size={8} strokeWidth={3} />
                </span>
                <span className="text-[9.5px] text-slate-300 leading-tight">{x}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider font-bold text-rose-400/70 mb-1.5">Não vê</div>
            {RECEP_NAO_VE.map((x) => (
              <div key={x} className="flex items-center gap-1.5 mb-1">
                <span className="w-3 h-3 rounded-full inline-flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,63,94,0.14)' }}>
                  <span className="block w-1.5 h-[1.5px] rounded-full bg-rose-400" />
                </span>
                <span className="text-[9.5px] text-slate-500 leading-tight">{x}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EquipeAcesso({ variant }: { variant: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]

  // Atualizado 01/08/2026 · a autonomia da equipe foi entregue em 29-30/07
  // (caso Realli, 5 profissionais e nenhuma recepcionista). Antes daqui a copy
  // dizia "só leitura, não mexe no dinheiro" — virou mentira no dia em que ela
  // passou a marcar, receber e bloquear a própria agenda.
  const BULLETS = [
    { t: 'Cada uma com o próprio login', d: 'Você não empresta sua senha pra ninguém. Cria o acesso e pronto.' },
    { t: 'Ela marca a própria cliente', d: 'Abre o app, vê a agenda da equipe e encaixa. Você para de ser o meio de campo — e para de perder encaixe porque estava atendendo.' },
    { t: 'Recebe e fecha o atendimento', d: 'PIX, dinheiro ou cartão na maquininha, com a taxa já descontada. O que entra cai no seu caixa na hora, sem ninguém anotar em papel.' },
    { t: `${c.profNome} vê a comissão dela em tempo real`, d: 'Para de te perguntar quanto fez no mês. Abre no celular e vê — atendimento por atendimento, já no valor líquido.' },
    { t: 'Bloqueia o próprio horário', d: 'Almoço, folga, médico. Ela fecha a agenda dela e a cliente para de ver aquele horário — sem passar por você.' },
    { t: 'Você decide o quanto solta', d: 'Três chaves nas configurações: marcar só pra si, marcar pras colegas, ver a agenda da equipe. Tudo começa desligado; você liga o que fizer sentido.' },
    { t: 'Cancelar tem freio', d: 'Ela cancela só o atendimento dela, e só enquanto não recebeu. Depois de pago, quem desfaz é você.' },
    { t: 'Seu financeiro continua seu', d: 'Faturamento do salão, lucro, despesas e a comissão das colegas ficam fora do alcance dela. Autonomia na agenda, não no seu caixa.' },
  ]

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(${t.rgb},0.12) 0%, transparent 60%)` }} />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <span className="inline-flex" style={{ color: t.soft }}><IconContacts size={14} /></span>
            <span>Equipe com acesso, você com o controle</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        <SectionReveal>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
            <AcessoMock v={variant} />
            <div className="space-y-4 sm:space-y-5">
              <ul className="space-y-3.5 text-sm sm:text-base">
                {BULLETS.map((b) => (
                  <li key={b.t} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `rgba(${t.rgb},0.12)`, border: `1px solid rgba(${t.rgb},0.3)`, color: t.soft }}>
                      <IconCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-white block leading-snug">{b.t}</strong>
                      <span className="text-slate-400 leading-relaxed">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-500 leading-relaxed">{c.fecho}</p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
