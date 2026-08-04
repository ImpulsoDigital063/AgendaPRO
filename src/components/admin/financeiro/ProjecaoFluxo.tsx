/* ═══════════════════════════════════════════════════════════════
   PROJEÇÃO DE FLUXO — o que ainda vai entrar e sair

   Pedido da Viva Cacheada (03/08/2026), na mesma mensagem que originou a
   despesa programada: "além de ver o que já foi pago, a gente conseguiria
   visualizar tudo o que ainda vai entrar e sair nos próximos dias ou
   semanas. Isso ajuda muito no planejamento e evita surpresas."

   A parte 1 (contas a pagar) saiu na v104/v105 e o código de lá já
   deixou o gancho: "conta programada aparece na projeção (Parte 2),
   nunca somada ao realizado". Esta é a Parte 2.

   REGRA QUE SEPARA ISTO DO RESTO DA TELA: aqui nada é dinheiro que
   existe. É compromisso. Por isso a projeção fica em bloco próprio, com
   rótulo próprio, e NUNCA entra na conta do realizado — dono que soma
   previsão com caixa toma decisão em cima de dinheiro que não tem.

   Entra como ENTRADA: atendimento marcado e ainda não pago, e comanda
   aberta. Cliente pode não vir e comanda pode ser cancelada — por isso a
   palavra é "previsto", nunca "a receber garantido".

   Entra como SAÍDA: despesa com status `scheduled` e vencimento no
   período. Essa é a parte firme da projeção: já foi comprado.
   ═══════════════════════════════════════════════════════════════ */

export type LinhaProjecao = {
  data: string          // YYYY-MM-DD
  descricao: string
  valor: number
  tipo: 'entrada' | 'saida'
}

export type SemanaProjecao = {
  rotulo: string
  entradas: number
  saidas: number
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataCurta(ymd: string) {
  const [, m, d] = ymd.split('-')
  return `${d}/${m}`
}

export default function ProjecaoFluxo({
  entradasPrevistas,
  saidasPrevistas,
  atrasadas,
  semanas,
  proximas,
  dias,
}: {
  entradasPrevistas: number
  saidasPrevistas: number
  /** Contas com vencimento já passado e ainda não pagas. Aparecem separadas:
   *  misturar atrasado com futuro esconde justamente o que precisa de ação. */
  atrasadas: number
  semanas: SemanaProjecao[]
  proximas: LinhaProjecao[]
  dias: number
}) {
  const saldo = entradasPrevistas - saidasPrevistas
  const vazio = entradasPrevistas === 0 && saidasPrevistas === 0 && atrasadas === 0

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
          Projeção · próximos {dias} dias
        </h2>
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--admin-text-faded)' }}>
        O que ainda vai entrar e sair. Não entra no realizado acima — é compromisso, não caixa.
      </p>

      {vazio ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nada previsto pros próximos {dias} dias.
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
            Atendimento marcado e conta a pagar cadastrada aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { r: 'Vai entrar', v: entradasPrevistas, cor: '#10B981' },
              { r: 'Vai sair', v: saidasPrevistas, cor: '#EF4444' },
              { r: 'Sobra prevista', v: saldo, cor: saldo >= 0 ? '#3B82F6' : '#EF4444' },
            ].map((t) => (
              <div
                key={t.r}
                className="rounded-2xl p-3 sm:p-4"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  {t.r}
                </p>
                <p className="text-base sm:text-xl font-black tabular-nums leading-none" style={{ color: t.cor }}>
                  {brl(t.v)}
                </p>
              </div>
            ))}
          </div>

          {atrasadas > 0 && (
            <div
              className="rounded-xl px-4 py-3 mt-2 flex items-center justify-between gap-3"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)' }}
            >
              <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>
                Contas vencidas e não pagas
              </span>
              <span className="text-sm font-black tabular-nums" style={{ color: '#DC2626' }}>
                {brl(atrasadas)}
              </span>
            </div>
          )}

          {semanas.length > 0 && (
            <div
              className="rounded-2xl mt-3 overflow-hidden"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              {semanas.map((s, i) => {
                const sobra = s.entradas - s.saidas
                return (
                  <div
                    key={s.rotulo}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                    style={i > 0 ? { borderTop: '1px solid var(--admin-border)' } : undefined}
                  >
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--admin-text-2)' }}>
                      {s.rotulo}
                    </span>
                    <span className="flex items-center gap-3 text-xs tabular-nums">
                      <span style={{ color: '#10B981' }}>+{brl(s.entradas)}</span>
                      <span style={{ color: '#EF4444' }}>−{brl(s.saidas)}</span>
                      <span className="font-bold" style={{ color: sobra >= 0 ? 'var(--admin-text)' : '#EF4444', minWidth: 78, textAlign: 'right', display: 'inline-block' }}>
                        {brl(sobra)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {proximas.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
                Próximos lançamentos
              </p>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
              >
                {proximas.map((l, i) => (
                  <div
                    key={`${l.data}-${l.descricao}-${i}`}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={i > 0 ? { borderTop: '1px solid var(--admin-border)' } : undefined}
                  >
                    <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text-faded)', minWidth: 38 }}>
                      {dataCurta(l.data)}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--admin-text-2)' }}>
                      {l.descricao}
                    </span>
                    <span
                      className="text-xs font-bold tabular-nums flex-shrink-0"
                      style={{ color: l.tipo === 'entrada' ? '#10B981' : '#EF4444' }}
                    >
                      {l.tipo === 'entrada' ? '+' : '−'}{brl(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
