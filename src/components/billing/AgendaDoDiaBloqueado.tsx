/**
 * AgendaDoDiaBloqueado — a agenda de HOJE, em leitura, dentro do paywall.
 *
 * POR QUE ISSO EXISTE (pesquisa de 13/07/2026):
 * A reclamação que mais revolta contra os concorrentes é o bloqueio cego.
 * Reclame Aqui, literal, sobre o Avec:
 *   "após 1 mês... venceu e precisávamos pagar por mais 1 mês PARA CONSEGUIR
 *    VER A AGENDA, eles bloqueiam... prejudicando nossos atendimentos, porque
 *    NÃO CONSEGUIA VER QUEM ESTAVA AGENDADO"
 * E contra o Booksy: "quando você tem algum problema com boleto de pagamento
 * eles bloqueiam seu acesso".
 *
 * O AgendaPRO fazia o mesmo: atrasou, tela de bloqueio, dono cego — com
 * cliente sentada na cadeira. Agora não. O que trava é o resto (financeiro,
 * comanda, cadastro, produto). A agenda do dia continua na tela.
 *
 * Vira uma frase de venda que NENHUM concorrente pode dizer:
 *   "Se você atrasar, eu não te deixo cego. Sua agenda do dia continua lá."
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { todayBR } from '@/lib/date-br'

type Item = {
  hora: string
  cliente: string
  servico: string
  profissional: string | null
}

export default async function AgendaDoDiaBloqueado({ businessId }: { businessId: string }) {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const hoje = todayBR()

  /* 03/11/2026: a versão anterior consultava `starts_at`, coluna que NUNCA
     existiu em appointments. O banco respondia erro, o erro era ignorado e
     esta lista saía SEMPRE vazia — a promessa de cima não valia. Data e hora
     moram em `appointment_date` (dia em BRT) e `start_time` (hora local),
     então não há conta de fuso a fazer. */
  const { data, error } = await admin
    .from('appointments')
    .select('start_time, status, client_name, service_name, professionals ( name )')
    .eq('business_id', businessId)
    .eq('appointment_date', hoje)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('start_time', { ascending: true })
  if (error) console.error('AgendaDoDiaBloqueado:', error.message)

  const itens: Item[] = (data ?? []).map((a) => ({
    hora: String(a.start_time).slice(0, 5),
    cliente: (a.client_name as string | null) || 'Cliente',
    servico: (a.service_name as string | null) || 'Atendimento',
    profissional: (a.professionals as unknown as { name: string } | null)?.name ?? null,
  }))

  return (
    <div
      className="rounded-2xl overflow-hidden mt-4"
      style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(148,163,184,0.18)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">Sua agenda de hoje</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            Continua aqui mesmo com a mensalidade em aberto. Você não fica sem saber quem vem.
          </div>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(148,163,184,0.14)', color: '#94A3B8' }}
        >
          Só leitura
        </span>
      </div>

      {itens.length === 0 ? (
        <div className="px-4 py-7 text-center text-sm text-slate-500">
          Nenhum atendimento marcado para hoje.
        </div>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto">
          {itens.map((it, i) => (
            <li
              key={i}
              className="px-4 py-2.5 flex items-center gap-3"
              style={{ borderTop: i > 0 ? '1px solid rgba(148,163,184,0.08)' : 'none' }}
            >
              <span className="text-sm font-black text-white w-12 flex-shrink-0">{it.hora}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-slate-200 truncate">{it.cliente}</span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {it.servico}
                  {it.profissional ? ` · ${it.profissional}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
