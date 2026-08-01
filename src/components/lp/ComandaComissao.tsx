/* ═══════════════════════════════════════════════════════════════
   COMANDA · PAGAMENTO · COMISSÃO — seção de LP (4 nichos)

   As LPs já falam de RELATÓRIO financeiro (FinanceDashboard).
   Esta seção cobre o que falta: a OPERAÇÃO do dinheiro.

   VERDADE (pode prometer):
     · comanda por cliente: serviço + produto + desconto na mesma conta
     · pagamento em Pix, dinheiro ou cartão (PaymentMethodModal)
     · taxa de maquininha cadastrada por máquina/parcela (MaquininhasTab)
       → o financeiro mostra o LÍQUIDO, não o bruto
     · comissão só sobre atendimento PAGO (trigger exige paid_at)
     · comissão sobre o LÍQUIDO — cupom/desconto entram na conta
       (getApptDiscountMap, lib/commission-discount.ts)
     · despesas categorizadas → lucro real
   NÃO EXISTE (não prometer):
     · nota fiscal · TEF/integração com maquininha · conciliação bancária
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'
import { IconCheck, IconCash, IconBrain } from '@/components/BarberIcons'

type Variant = 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string; soft: string }> = {
  barbearia: { rgb: '6,182,212', hex: '#06B6D4', soft: '#67E8F9' },
  salao: { rgb: '236,72,153', hex: '#EC4899', soft: '#F9A8D4' },
  nail: { rgb: '244,114,182', hex: '#F472B6', soft: '#F9A8D4' },
  estetica: { rgb: '16,185,129', hex: '#10B981', soft: '#6EE7B7' },
  lash: { rgb: '167,139,250', hex: '#A78BFA', soft: '#C4B5FD' },
}

const COPY: Record<Variant, { h2a: string; h2b: string; sub: string; prof: string; servico: string; bruto: string; cupom: string; liquido: string; taxa: string; entrou: string; comErrada: string; comCerta: string; fecho: string }> = {
  barbearia: {
    h2a: 'Comissão sobre o que entrou.',
    h2b: 'Não sobre o que você cobrou.',
    sub: 'Deu R$10 de desconto? Passou no cartão e a maquininha comeu a taxa? A comissão do barbeiro tem que acompanhar. Se não acompanha, você paga do seu bolso — todo mês, sem perceber.',
    prof: 'Barbeiro',
    servico: 'Corte + Barba',
    bruto: 'R$ 55,00', cupom: '− R$ 10,00', liquido: 'R$ 45,00',
    taxa: '− R$ 1,53', entrou: 'R$ 43,47',
    comErrada: 'R$ 27,50', comCerta: 'R$ 21,74',
    fecho: 'Num mês com 200 atendimentos, esse detalhe é o seu lucro indo embora.',
  },
  salao: {
    h2a: 'Comissão sobre o que entrou.',
    h2b: 'Não sobre o que você cobrou.',
    sub: 'Deu desconto na cliente antiga? Passou no cartão e a maquininha comeu a taxa? A comissão da profissional tem que acompanhar. Se não acompanha, sai do seu bolso — todo mês, sem você ver.',
    prof: 'Profissional',
    servico: 'Escova + Hidratação',
    bruto: 'R$ 120,00', cupom: '− R$ 20,00', liquido: 'R$ 100,00',
    taxa: '− R$ 3,40', entrou: 'R$ 96,60',
    comErrada: 'R$ 60,00', comCerta: 'R$ 48,30',
    fecho: 'Com 5 profissionais e 300 atendimentos no mês, esse detalhe é o seu lucro indo embora.',
  },
  nail: {
    h2a: 'Comissão sobre o que entrou.',
    h2b: 'Não sobre o que você cobrou.',
    sub: 'Deu desconto? Passou no cartão e a maquininha comeu a taxa? Se você comissiona alguém, a conta tem que sair do valor que realmente caiu — não do que estava na tabela.',
    prof: 'Profissional',
    servico: 'Fibra de Vidro',
    bruto: 'R$ 150,00', cupom: '− R$ 20,00', liquido: 'R$ 130,00',
    taxa: '− R$ 4,42', entrou: 'R$ 125,58',
    comErrada: 'R$ 75,00', comCerta: 'R$ 62,79',
    fecho: 'É pouco por atendimento. No mês inteiro, é o seu lucro indo embora.',
  },
  lash: {
    h2a: 'Comissão sobre o que entrou.',
    h2b: 'Não sobre o que você cobrou.',
    sub: 'Deu desconto na primeira aplicação? Passou no cartão e a maquininha comeu a taxa? Se você divide com outra lash, a conta tem que sair do valor que realmente caiu — não do que estava na tabela.',
    prof: 'Lash designer',
    servico: 'Volume Russo',
    bruto: 'R$ 180,00', cupom: '− R$ 30,00', liquido: 'R$ 150,00',
    taxa: '− R$ 5,10', entrou: 'R$ 144,90',
    comErrada: 'R$ 90,00', comCerta: 'R$ 72,45',
    fecho: 'São R$ 17 por aplicação saindo do seu bolso sem você ver. Em 40 aplicações no mês, R$ 680.',
  },
  estetica: {
    h2a: 'Comissão sobre o que entrou.',
    h2b: 'Não sobre o que você cobrou.',
    sub: 'Num ticket de R$200+, cada ponto percentual pesa. Se deu desconto ou passou no cartão, a comissão da profissional tem que sair do que realmente entrou no caixa.',
    prof: 'Profissional',
    servico: 'Limpeza de Pele',
    bruto: 'R$ 180,00', cupom: '− R$ 30,00', liquido: 'R$ 150,00',
    taxa: '− R$ 5,10', entrou: 'R$ 144,90',
    comErrada: 'R$ 90,00', comCerta: 'R$ 72,45',
    fecho: 'Ticket alto, comissão alta. O erro também é alto — e se repete todo mês.',
  },
}

const BULLETS = [
  { t: 'Comanda por cliente', d: 'Serviço, produto e desconto na mesma conta. Fecha e pronto — o dinheiro já entra registrado.' },
  { t: 'Pix, dinheiro ou cartão', d: 'Você escolhe na hora de fechar. Cada forma cai no lugar certo do financeiro.' },
  { t: 'A taxa da maquininha sai antes', d: 'Você cadastra a taxa de cada máquina e de cada parcela. O sistema mostra o que sobrou, não o que foi cobrado.' },
  { t: 'Comissão só depois que pagou', d: 'Atendimento marcado não gera comissão. Só entra quando o dinheiro entra.' },
  { t: 'Desconto entra na conta da comissão', d: 'Deu cupom? A comissão acompanha o desconto. Ninguém ganha percentual sobre dinheiro que não entrou.' },
  { t: 'Despesa categorizada = lucro real', d: 'Aluguel, produto, material. Sai da receita e você vê o que sobrou de verdade no fim do mês.' },
]

/* ── Mini-UI: a comanda fechando e as duas comissões lado a lado ── */
function ComissaoMock({ v }: { v: Variant }) {
  const t = THEME[v]
  const c = COPY[v]

  return (
    <div className="w-full max-w-[400px] mx-auto space-y-3">
      {/* fechamento da comanda */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0B0E1C 0%, #070914 100%)', border: `1px solid rgba(${t.rgb},0.28)`, boxShadow: `0 24px 60px -20px rgba(${t.rgb},0.28)` }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: `rgba(${t.rgb},0.10)`, borderBottom: `1px solid rgba(${t.rgb},0.20)` }}>
          <span className="text-[12px] font-bold text-white">Fechando a comanda</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.18)', color: '#93C5FD' }}>Cartão</span>
        </div>

        <div className="p-4 space-y-1.5">
          {[
            { k: c.servico, v: c.bruto, cls: 'text-slate-300', vcls: 'text-slate-300' },
            { k: 'Cupom de retorno', v: c.cupom, cls: 'text-amber-300/80', vcls: 'text-amber-300' },
            { k: 'Taxa da maquininha', v: c.taxa, cls: 'text-rose-300/80', vcls: 'text-rose-300' },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between">
              <span className={`text-[11.5px] ${r.cls}`}>{r.k}</span>
              <span className={`text-[11.5px] font-semibold ${r.vcls}`}>{r.v}</span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2.5 mt-1.5" style={{ borderTop: '1px dashed rgba(148,163,184,0.2)' }}>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Entrou no caixa</span>
            <span className="text-[17px] font-black text-white">{c.entrou}</span>
          </div>
        </div>
      </div>

      {/* as duas comissões */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3" style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.28)' }}>
          <div className="text-[8.5px] uppercase tracking-wider font-bold text-rose-300/70 mb-1">Sobre o valor de tabela</div>
          <div className="text-[19px] font-black text-rose-300 leading-none mb-1.5">{c.comErrada}</div>
          <div className="text-[9.5px] text-rose-300/60 leading-snug">Ignora o cupom e a taxa. Você paga a diferença.</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.30)' }}>
          <div className="text-[8.5px] uppercase tracking-wider font-bold text-emerald-300/70 mb-1">Sobre o que entrou</div>
          <div className="text-[19px] font-black text-emerald-300 leading-none mb-1.5">{c.comCerta}</div>
          <div className="text-[9.5px] text-emerald-300/60 leading-snug">O que o AgendaPRO calcula. É a conta certa.</div>
        </div>
      </div>

      <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.14)' }}>
        <span className="inline-flex flex-shrink-0" style={{ color: t.soft }}><IconBrain size={14} strokeWidth={2} /></span>
        <span className="text-[10.5px] text-slate-400 leading-snug">
          Um atendimento. <strong className="text-white">
            {(parseFloat(c.comErrada.replace('R$ ', '').replace(',', '.')) - parseFloat(c.comCerta.replace('R$ ', '').replace(',', '.'))).toFixed(2).replace('.', ',')} a mais
          </strong> do seu bolso, sem você ver.
        </span>
      </div>
    </div>
  )
}

/* ── Seção ─────────────────────────────────────────────────── */
export default function ComandaComissao({ variant }: { variant: Variant }) {
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
            <span>Onde o dinheiro vaza sem ninguém ver</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        <SectionReveal>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
            <ComissaoMock v={variant} />

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

              <p className="text-sm text-slate-500 leading-relaxed">{c.fecho}</p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
