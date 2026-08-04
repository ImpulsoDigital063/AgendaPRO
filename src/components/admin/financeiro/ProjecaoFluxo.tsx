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

   Entra como SAÍDA: despesa com status `scheduled` e vencimento no
   período. Essa é a parte firme: já foi comprado, valor e data conhecidos.

   ⚠️ POR QUE O RÓTULO É "JÁ MARCADO" E NÃO "VAI ENTRAR" (04/08/2026)
   ──────────────────────────────────────────────────────────────────
   Backtest contra o histórico real, simulando o que a tela teria dito em
   cada segunda-feira:

     Olímpio        0% · 38% · 86% · 16%  do que de fato entrou
     Viva Cacheada 12% · 86% · 100%
     Rosy          35% · 26% · 161%

   A causa apareceu no dado: a antecedência MEDIANA com que a cliente
   marca é de 1 a 2 dias em todos os negócios da base. Não é jeito de usar
   de um cliente — é o setor. Beleza se marca em cima da hora.

   Ou seja: o lado da entrada enxerga dois dias, não trinta. Chamar aquilo
   de "vai entrar" e subtrair as contas do mês produzia uma "sobra
   prevista" negativa por construção — a Viva Cacheada abriria a tela e
   veria -R$ 3.288 sem estar no vermelho.

   Por isso a tela agora diz o que o número é ("já marcado") e coloca ao
   lado a média real das últimas 4 semanas. O dono compara os dois e
   decide. O sistema não finge que sabe o futuro.
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
  mediaMensal,
  devendo,
  devendoDesde,
  devendoQtd,
  saidasPrevistas,
  atrasadas,
  semanas,
  proximas,
  dias,
}: {
  entradasPrevistas: number
  /** Media do que entrou por mes nas ultimas 4 semanas. Sem isso o bloco
   *  mente por omissao — ver comentario do topo. */
  mediaMensal: number
  /** Comanda aberta de atendimento que JA passou: cliente atendeu e nao pagou.
   *  Fica FORA do "vai entrar" — e cobranca, nao previsao. */
  devendo: number
  devendoDesde: string | null
  devendoQtd: number
  saidasPrevistas: number
  /** Contas com vencimento já passado e ainda não pagas. Aparecem separadas:
   *  misturar atrasado com futuro esconde justamente o que precisa de ação. */
  atrasadas: number
  semanas: SemanaProjecao[]
  proximas: LinhaProjecao[]
  dias: number
}) {
  const sobraHistorica = mediaMensal - saidasPrevistas
  const vazio = entradasPrevistas === 0 && saidasPrevistas === 0 && atrasadas === 0 && devendo === 0

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
          Projeção · próximos {dias} dias
        </h2>
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--admin-text-faded)' }}>
        Não entra no realizado acima — é compromisso, não caixa.
        {mediaMensal > 0 && (
          <> Sua média das últimas 4 semanas é <b>{brl(mediaMensal)}</b>; como cliente costuma marcar
          com 1 ou 2 dias, o “já marcado” cresce ao longo do mês.</>
        )}
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
              { r: 'Já marcado', v: entradasPrevistas, cor: '#10B981' },
              { r: 'Vai sair', v: saidasPrevistas, cor: '#EF4444' },
              { r: 'Sobra pelo histórico', v: sobraHistorica, cor: sobraHistorica >= 0 ? '#3B82F6' : '#EF4444' },
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

          {/* Cliente que atendeu e não pagou. Bloco próprio porque a ação é
              outra: aqui não se planeja, se cobra. Antes esse dinheiro estava
              somado no "vai entrar" — a Viva Cacheada tem uma conta parada
              desde 29/07 aparecendo como receita futura. */}
          {devendo > 0 && (
            <div
              className="rounded-xl px-4 py-3 mt-2 flex items-center justify-between gap-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}
            >
              <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-2)' }}>
                {devendoQtd === 1 ? 'Cliente atendida e não paga' : `${devendoQtd} clientes atendidas e não pagas`}
                {devendoDesde && <> · a mais antiga desde {dataCurta(devendoDesde)}</>}
              </span>
              <span className="text-sm font-black tabular-nums" style={{ color: '#B45309' }}>
                {brl(devendo)}
              </span>
            </div>
          )}

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
                      {/* Zero não vira coluna: sem entrada, "−R$ 830,00 · −R$ 830,00"
                          aparecia duplicado e parecia defeito de tela. */}
                      {s.entradas > 0 && <span style={{ color: '#10B981' }}>+{brl(s.entradas)}</span>}
                      {s.saidas > 0 && <span style={{ color: '#EF4444' }}>−{brl(s.saidas)}</span>}
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
