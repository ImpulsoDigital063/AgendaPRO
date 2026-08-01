/* ═══════════════════════════════════════════════════════════════
   VENDAS + ESTOQUE — seção de LP (4 nichos)

   Vende o módulo de produtos (v63-v66, v88 variantes).
   Nasceu do Studio MOOD (Izanara): ela paga Equipe R$97 e tem 164
   produtos cadastrados — é o estoque que a segura, não a agenda.

   VERDADE (pode prometer):
     · cadastro com marca, fornecedor, custo e preço
     · venda DENTRO do atendimento (produto na mesma comanda do serviço)
     · venda avulsa no balcão (sem agendamento)
     · baixa automática de estoque na venda
     · entrada de mercadoria vira despesa automática no financeiro
     · variantes (cor/tamanho/sabor) com preço e estoque próprios
     · comissão de produto opt-in (produto sem regra = 0%)
   NÃO EXISTE (não prometer):
     · leitor de código de barras
     · alerta automático de reposição
   GATE REAL: app/api/admin/products/route.ts → canSellProducts =
   plan === 'equipe'. A seção diz isso na cara — vira gatilho de upgrade.
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'
import { IconCheck, IconCash, IconGift } from '@/components/BarberIcons'

type Variant = 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string; soft: string }> = {
  barbearia: { rgb: '6,182,212', hex: '#06B6D4', soft: '#67E8F9' },
  salao: { rgb: '236,72,153', hex: '#EC4899', soft: '#F9A8D4' },
  nail: { rgb: '244,114,182', hex: '#F472B6', soft: '#F9A8D4' },
  estetica: { rgb: '16,185,129', hex: '#10B981', soft: '#6EE7B7' },
  lash: { rgb: '167,139,250', hex: '#A78BFA', soft: '#C4B5FD' },
}

const COPY: Record<Variant, {
  h2a: string; h2b: string; sub: string
  servico: { nome: string; valor: string }
  produto: { nome: string; valor: string; estoqueAntes: number; estoqueDepois: number }
  estoque: { nome: string; qtd: string; custo: string }[]
  fecho: string
}> = {
  barbearia: {
    h2a: 'Você vende pomada no balcão.',
    h2b: 'Anota onde?',
    sub: 'Pomada, óleo, shampoo, minoxidil. Sai da prateleira e some do controle. Aqui o produto entra na mesma comanda do corte — e baixa do estoque sozinho.',
    servico: { nome: 'Corte + Barba', valor: 'R$ 55,00' },
    produto: { nome: 'Pomada Modeladora', valor: 'R$ 32,00', estoqueAntes: 12, estoqueDepois: 11 },
    estoque: [
      { nome: 'Pomada Modeladora', qtd: '11 un', custo: 'R$ 18,00' },
      { nome: 'Óleo para Barba', qtd: '7 un', custo: 'R$ 22,00' },
      { nome: 'Shampoo Anticaspa', qtd: '4 un', custo: 'R$ 15,00' },
    ],
    fecho: 'O corte você já cobra. O produto some sem ninguém ver. Agora não.',
  },
  salao: {
    h2a: 'Seu salão vende produto.',
    h2b: 'E some do controle.',
    sub: 'Finalizador, máscara, coloração, ampola. Vende no atendimento, vende no balcão — e no fim do mês ninguém sabe quanto entrou nem quanto sobrou na prateleira.',
    servico: { nome: 'Escova + Hidratação', valor: 'R$ 120,00' },
    produto: { nome: 'Máscara Reconstrutora', valor: 'R$ 68,00', estoqueAntes: 9, estoqueDepois: 8 },
    estoque: [
      { nome: 'Máscara Reconstrutora', qtd: '8 un', custo: 'R$ 34,00' },
      { nome: 'Finalizador Cachos', qtd: '15 un', custo: 'R$ 21,00' },
      { nome: 'Coloração 7.0', qtd: '6 un', custo: 'R$ 18,00' },
    ],
    fecho: 'É isso que a Izanara, do Studio MOOD, usa todo dia — 164 produtos cadastrados no sistema dela.',
  },
  nail: {
    h2a: 'Você revende esmalte,',
    h2b: 'kit e cuticular.',
    sub: 'A cliente sai da cadeira e leva produto pra casa. Vende no atendimento ou no balcão — e o estoque baixa sozinho, sem você anotar em lugar nenhum.',
    servico: { nome: 'Fibra de Vidro', valor: 'R$ 150,00' },
    produto: { nome: 'Óleo de Cutícula', valor: 'R$ 28,00', estoqueAntes: 14, estoqueDepois: 13 },
    estoque: [
      { nome: 'Óleo de Cutícula', qtd: '13 un', custo: 'R$ 12,00' },
      { nome: 'Esmalte Gel — Nude', qtd: '9 un', custo: 'R$ 16,00' },
      { nome: 'Kit Lixa Profissional', qtd: '5 un', custo: 'R$ 24,00' },
    ],
    fecho: 'Cada cor e cada tamanho tem preço e estoque próprios. Nada de contar de cabeça.',
  },
  lash: {
    h2a: 'Você revende máscara,',
    h2b: 'sérum e escovinha.',
    sub: 'A cliente sai da maca e leva o kit de manutenção. Vende junto da aplicação — e o estoque baixa sozinho, sem você anotar em lugar nenhum.',
    servico: { nome: 'Volume Russo', valor: 'R$ 180,00' },
    produto: { nome: 'Shampoo para cílios', valor: 'R$ 45,00', estoqueAntes: 16, estoqueDepois: 15 },
    estoque: [
      { nome: 'Shampoo para cílios', qtd: '15 un', custo: 'R$ 19,00' },
      { nome: 'Escovinha descartável', qtd: '48 un', custo: 'R$ 0,60' },
      { nome: 'Selante de cílios', qtd: '6 un', custo: 'R$ 28,00' },
    ],
    fecho: 'O que você usa na aplicação e o que revende ficam no mesmo controle. Você vê quando a cola está acabando antes de faltar.',
  },
  estetica: {
    h2a: 'Você indica o dermocosmético.',
    h2b: 'E ela compra fora.',
    sub: 'Sérum, protetor, ácido de manutenção. Se você não vende, a cliente compra na farmácia. Aqui o produto entra na mesma comanda do procedimento — e baixa do estoque sozinho.',
    servico: { nome: 'Limpeza de Pele', valor: 'R$ 180,00' },
    produto: { nome: 'Protetor Solar FPS 50', valor: 'R$ 89,00', estoqueAntes: 10, estoqueDepois: 9 },
    estoque: [
      { nome: 'Protetor Solar FPS 50', qtd: '9 un', custo: 'R$ 48,00' },
      { nome: 'Sérum Vitamina C', qtd: '6 un', custo: 'R$ 62,00' },
      { nome: 'Ácido Manutenção', qtd: '4 un', custo: 'R$ 55,00' },
    ],
    fecho: 'O procedimento você já cobra. A manutenção em casa é receita que hoje vai pra farmácia.',
  },
}

const BULLETS = [
  { t: 'Vende dentro do atendimento', d: 'O produto entra na mesma comanda do serviço. Uma conta só, um pagamento só.' },
  { t: 'Vende no balcão, sem agendamento', d: 'Cliente passou só pra comprar? Registra a venda avulsa direto no caixa.' },
  { t: 'O estoque baixa sozinho', d: 'Vendeu, saiu da prateleira. Você não anota nada — e sabe o que ainda tem.' },
  { t: 'Compra de mercadoria vira despesa', d: 'Entrada de estoque entra automático no financeiro. O lucro que você vê já desconta o que você pagou pelo produto.' },
  { t: 'Cor, tamanho e sabor separados', d: 'Cada variante tem preço e estoque próprios. Esmalte nude e vermelho não se misturam no controle.' },
  { t: 'Comissão de produto é sua escolha', d: 'Você decide se o profissional ganha percentual sobre a venda. Produto sem regra não paga comissão — nada vaza por engano.' },
]

/* ── Mini-UI: comanda com serviço + produto, e o estoque baixando ── */
function VendaMock({ v }: { v: Variant }) {
  const t = THEME[v]
  const c = COPY[v]
  const total = 'R$ ' + (
    parseFloat(c.servico.valor.replace('R$ ', '').replace('.', '').replace(',', '.')) +
    parseFloat(c.produto.valor.replace('R$ ', '').replace('.', '').replace(',', '.'))
  ).toFixed(2).replace('.', ',')

  return (
    <div className="w-full max-w-[400px] mx-auto space-y-3">
      {/* comanda */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0B0E1C 0%, #070914 100%)', border: `1px solid rgba(${t.rgb},0.28)`, boxShadow: `0 24px 60px -20px rgba(${t.rgb},0.28)` }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: `rgba(${t.rgb},0.10)`, borderBottom: `1px solid rgba(${t.rgb},0.20)` }}>
          <span className="text-[12px] font-bold text-white">Comanda #128</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `rgba(${t.rgb},0.16)`, color: t.soft }}>Aberta</span>
        </div>

        <div className="p-4 space-y-2">
          {/* serviço */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.10)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[8px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.14)', color: '#94A3B8' }}>Serviço</span>
              <span className="text-[11.5px] text-slate-300 truncate">{c.servico.nome}</span>
            </div>
            <span className="text-[11.5px] font-bold text-white flex-shrink-0">{c.servico.valor}</span>
          </div>

          {/* produto — destacado */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: `rgba(${t.rgb},0.10)`, border: `1px solid rgba(${t.rgb},0.30)` }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[8px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: t.hex, color: '#05070f' }}>Produto</span>
              <span className="text-[11.5px] text-white font-semibold truncate">{c.produto.nome}</span>
            </div>
            <span className="text-[11.5px] font-bold text-white flex-shrink-0">{c.produto.valor}</span>
          </div>

          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px dashed rgba(148,163,184,0.18)' }}>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total</span>
            <span className="text-[16px] font-black text-white">{total}</span>
          </div>
        </div>
      </div>

      {/* estoque baixando */}
      <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.14)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Estoque</span>
          <span className="text-[9px] font-semibold" style={{ color: t.soft }}>
            {c.produto.estoqueAntes} → {c.produto.estoqueDepois} un
          </span>
        </div>
        <div className="space-y-1.5">
          {c.estoque.map((p, i) => (
            <div key={p.nome} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: i === 0 ? t.hex : 'rgba(148,163,184,0.4)' }} />
                <span className={`text-[10.5px] truncate ${i === 0 ? 'text-white font-semibold' : 'text-slate-400'}`}>{p.nome}</span>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-[9px] text-slate-600">custo {p.custo}</span>
                <span className={`text-[10.5px] font-bold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{p.qtd}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Seção ─────────────────────────────────────────────────── */
export default function VendasEstoque({ variant }: { variant: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(${t.rgb},0.12) 0%, transparent 60%)` }}
      />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <IconCash size={14} className="text-emerald-400" />
            <span>Não é só agenda — é sistema de vendas</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        <SectionReveal>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
            <VendaMock v={variant} />

            <div className="space-y-4 sm:space-y-5">
              <ul className="space-y-3.5 text-sm sm:text-base">
                {BULLETS.map((b) => (
                  <li key={b.t} className="flex items-start gap-3">
                    <span
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `rgba(${t.rgb},0.12)`, border: `1px solid rgba(${t.rgb},0.3)`, color: t.soft }}
                    >
                      <IconCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-white block leading-snug">{b.t}</strong>
                      <span className="text-slate-400 leading-relaxed">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex text-violet-300"><IconGift size={14} /></span>
                  <strong className="text-white text-sm">Vendas de produto entram no plano Equipe</strong>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  R$ 97/mês, até 5 profissionais. Se você só atende e não revende nada, o Solo de R$ 67 resolve — e você sobe de plano quando quiser começar a vender.
                </p>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">{c.fecho}</p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
