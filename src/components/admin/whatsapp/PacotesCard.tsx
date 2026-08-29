'use client'

/* ═══════════════════════════════════════════════════════════════
   PACOTES — a tela onde a dona escolhe e troca

   Três decisões de produto que estão desenhadas aqui:

   1. FALA EM ATENDIMENTO, NÃO EM MENSAGEM. "150 mensagens" não significa
      nada pra quem atende cliente. "Dá pros seus 50 atendimentos do mês"
      significa. O número vem do movimento REAL dela, dos últimos 90 dias.

   2. MOSTRA O PREÇO DE CADA UM NO MOVIMENTO DELA, inclusive dos que ela não
      vai escolher. Assim ela enxerga sozinha quando o pacote menor com
      excedente sai mais barato que o maior — e não fica com a sensação de
      ter sido empurrada pra cima. Esconder isso seria ganhar R$1 e perder a
      confiança na conta inteira.

   3. TROCAR É FÁCIL E VISÍVEL, pra cima e pra baixo. Quem se sente preso
      não contrata.

   Mobile e desktop: o grid é uma coluna por padrão e vira duas no `sm:`.
   Nenhuma classe sem prefixo muda comportamento só de um lado.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { CANAL_LIBERADO } from '@/lib/mensagens/liberado'

type PacoteTela = {
  id: string
  nome: string
  unidades: number
  preco: number
  atendimentosQueCabem: number
  custoNoSeuMovimento: number
}

type Dados = {
  atual: string | null
  podeContratar: boolean
  precoExcedente: number
  movimento: {
    atendimentosMes: number
    msgsPorAtendimento: number
    unidadesProjetadas: number
    projecaoHipotetica: boolean
  }
  recomendado: string
  pacotes: PacoteTela[]
}

const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

export default function PacotesCard({ canalNoAr }: { canalNoAr: boolean }) {
  const [d, setD] = useState<Dados | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  /* Só aparece pra quem nunca passou pelo Asaas — os que hoje pagam na mão.
     A cobrança precisa sair no nome e CPF dela pra ser legítima. */
  const [pedeCadastro, setPedeCadastro] = useState(false)
  const [cadastro, setCadastro] = useState({ name: '', cpfCnpj: '' })
  const [pix, setPix] = useState<{
    valor: number; unidades: number; dias: number
    pixCopiaECola: string | null; pixQrBase64: string | null; link: string | null
  } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const carregar = () => {
    void fetch('/api/admin/mensagens/pacotes')
      .then((r) => r.json())
      .then((j) => setD(j?.error ? null : j))
      .catch(() => setD(null))
  }
  useEffect(carregar, [])

  async function trocar(pacote: string | null) {
    setSalvando(true)
    setErro(null)
    try {
      const r = await fetch('/api/admin/mensagens/pacotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacote,
          ...(cadastro.name && cadastro.cpfCnpj ? { customer: cadastro } : {}),
        }),
      })
      const j = await r.json()

      /* Primeira cobrança de quem nunca passou pelo Asaas: pede os dados e
         ela reenvia. Não é erro, é uma etapa. */
      if (j?.needs_customer_data) {
        setPedeCadastro(true)
        return
      }
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? 'nao_salvou')

      /* Cancelamento volta ok direto. Contratação volta com PIX: o pacote
         só liga quando o dinheiro entra, então aqui a gente mostra o QR e
         NÃO diz que está contratado. */
      if (j.aguardandoPagamento) {
        setPix({
          valor: j.valor, unidades: j.unidades, dias: j.dias,
          pixCopiaECola: j.pixCopiaECola ?? null,
          pixQrBase64: j.pixQrBase64 ?? null,
          link: j.link ?? null,
        })
        setPedeCadastro(false)
      }
      setConfirmando(null)
      carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'nao_salvou')
    } finally {
      setSalvando(false)
    }
  }

  if (!d) return null

  const atual = d.pacotes.find((p) => p.id === d.atual) ?? null

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {atual ? 'Seu pacote de avisos' : 'Ativar os avisos automáticos'}
        </h2>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          {d.movimento.projecaoHipotetica ? (
            <>
              Você atende cerca de <strong>{d.movimento.atendimentosMes}</strong> clientes por mês.
              As contas abaixo consideram <strong>1 aviso por atendimento</strong> — o lembrete da
              véspera. Se você ligar mais avisos, elas se ajustam.
            </>
          ) : (
            <>
              Você atende cerca de <strong>{d.movimento.atendimentosMes}</strong> clientes por mês e
              hoje manda <strong>{d.movimento.msgsPorAtendimento}</strong>{' '}
              {d.movimento.msgsPorAtendimento === 1 ? 'aviso' : 'avisos'} em cada atendimento.
            </>
          )}
        </p>
      </header>

      {/* CADASTRO — só pra quem nunca teve cobrança pelo sistema. */}
      {pedeCadastro && (
        <div
          className="rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            É a sua primeira cobrança por aqui. Precisamos do nome completo e do CPF ou CNPJ pra
            emitir no seu nome.
          </p>
          <input
            type="text"
            placeholder="Nome completo"
            value={cadastro.name}
            onChange={(e) => setCadastro((c) => ({ ...c, name: e.target.value }))}
            className="w-full text-sm rounded-lg px-3 py-2"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="CPF ou CNPJ (só números)"
            value={cadastro.cpfCnpj}
            onChange={(e) =>
              setCadastro((c) => ({ ...c, cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14) }))
            }
            className="w-full text-sm rounded-lg px-3 py-2"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />
          <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
            Depois de preencher, toque de novo no pacote que você quer.
          </p>
        </div>
      )}

      {/* PIX GERADO — o pacote ainda NÃO está ativo. */}
      {pix && (
        <div
          className="rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Falta pagar para ativar
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            {reais(pix.valor)} por <strong>{pix.unidades} mensagens</strong>
            {pix.dias > 0 && <> válidas por {pix.dias} dias</>}. Os avisos começam a sair assim que o
            pagamento cair — costuma levar poucos minutos.
          </p>
          {pix.pixQrBase64 && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`data:image/png;base64,${pix.pixQrBase64}`}
              alt="QR Code do PIX"
              className="w-40 h-40 rounded-lg"
              style={{ background: '#fff', padding: 6 }}
            />
          )}
          {pix.pixCopiaECola && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(pix.pixCopiaECola!)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 2000)
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded"
              style={{ background: 'var(--admin-text)', color: 'var(--admin-bg)' }}
            >
              {copiado ? 'Copiado' : 'Copiar código PIX'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {d.pacotes.map((p) => {
          const eAtual = p.id === d.atual
          const eRecomendado = p.id === d.recomendado
          const cabeTudo = p.unidades >= d.movimento.unidadesProjetadas
          return (
            <div
              key={p.id}
              className="rounded-xl px-4 py-3"
              style={{
                background: eAtual ? 'rgba(34,197,94,0.08)' : 'var(--admin-surface)',
                border: `1px solid ${eAtual ? 'rgba(34,197,94,0.35)' : 'var(--admin-border)'}`,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {p.nome}
                </p>
                <p className="text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                  {reais(p.preco)}
                  <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    /mês
                  </span>
                </p>
              </div>

              {/* A legenda que faz a tela fazer sentido. */}
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                Dá para <strong>{p.atendimentosQueCabem} atendimentos</strong> por mês, do jeito que
                você manda hoje.
              </p>

              {/* O preço real DELA neste pacote, com excedente. É o que
                  deixa ela ver quando o menor sai mais barato. */}
              {!cabeTudo && (
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  No seu movimento sairia {reais(p.custoNoSeuMovimento)} — as que passarem custam{' '}
                  {reais(d.precoExcedente)} cada, e os avisos não param.
                </p>
              )}

              <div className="flex items-center gap-2 mt-2.5">
                {eAtual && (
                  <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                    Seu pacote atual
                  </span>
                )}
                {!eAtual && eRecomendado && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
                  >
                    Mais barato pra você
                  </span>
                )}
                {!eAtual && d.podeContratar && (
                  confirmando === p.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() => trocar(p.id)}
                        className="text-xs font-semibold px-2.5 py-1 rounded"
                        style={{ background: '#16a34a', color: '#fff' }}
                      >
                        {salvando ? 'Salvando…' : `Confirmar ${p.nome}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmando(null)}
                        className="text-xs underline underline-offset-2"
                        style={{ color: 'var(--admin-text-faded)' }}
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmando(p.id)}
                      className="text-xs underline underline-offset-2"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      {atual ? 'Subir para este' : 'Contratar'}
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {erro && (
        <p className="text-xs" style={{ color: '#dc2626' }}>
          Não deu para salvar agora. Tente de novo em alguns instantes.
        </p>
      )}

      {atual && d.podeContratar && (
        confirmando === 'cancelar' ? (
          <p className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--admin-text-mute)' }}>
            Ao cancelar, <strong>os avisos param de sair</strong> e suas clientes deixam de receber
            lembrete.
            <button
              type="button"
              disabled={salvando}
              onClick={() => trocar(null)}
              className="text-xs font-semibold underline underline-offset-2"
              style={{ color: '#dc2626' }}
            >
              {salvando ? 'Cancelando…' : 'Cancelar mesmo assim'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className="text-xs underline underline-offset-2"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Voltar
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando('cancelar')}
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Cancelar os avisos
          </button>
        )
      )}

      {!d.podeContratar && (
        <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
          Só o dono da conta contrata ou troca o pacote.
        </p>
      )}

      {/* CANAL OFICIAL — só aparece quando é verdade.
          O gate é `CANAL_LIBERADO`, não a saúde do número: o número pode
          estar perfeito e o canal ainda não liberado pras donas. Prender
          isso em `canalNoAr` fazia a tela prometer entrega logo abaixo do
          aviso "ainda não use com suas clientes". */}
      {CANAL_LIBERADO && canalNoAr && (
        <p
          className="text-xs leading-relaxed rounded-xl px-4 py-3"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-mute)' }}
        >
          <strong style={{ color: 'var(--admin-text)' }}>
            Enviamos pela API oficial do WhatsApp, da Meta.
          </strong>{' '}
          Não é robô ligado num celular. Isso é o que garante que a mensagem chega mesmo em quem
          nunca conversou com o número, e que o envio não some do nada porque um aparelho
          desconectou. Você paga só pelas mensagens que a Meta confirma que foram entregues.
        </p>
      )}
    </section>
  )
}
