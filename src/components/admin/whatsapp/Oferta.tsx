'use client'

/* ═══════════════════════════════════════════════════════════════
   OFERTA — a primeira tela de quem ainda não contratou

   Decisão de Eduardo (31/08): quem abre o WhatsApp sem pacote vê a OFERTA,
   não a configuração. E ele tem razão pelo dado: li os 29 negócios e
   `avisos_pacote` está vazio em todos. Configurar aviso que não pode sair é
   mexer em botão morto — a tela precisa primeiro vender, depois configurar.

   Isso inverte o que eu tinha feito antes (esconder preço e mostrar saldo,
   no modelo da Fresha). Aquele modelo pressupõe cliente que JÁ comprou. Aqui
   ninguém comprou ainda, então a tela certa é outra.

   ─── O que sustenta o desenho ─────────────────────────────────

   1. VENDE COM O NÚMERO DELA, não com tabela genérica. A API já calcula o
      movimento real (atendimentos dos últimos 90 dias ÷ 3) e qual pacote sai
      MAIS BARATO no total — não o que "cabe", o mais barato mesmo, somando
      excedente. É o único argumento que nenhum concorrente tem, porque
      nenhum sabe quantos atendimentos ela faz.

   2. UM PACOTE EM DESTAQUE, os outros em lista. Cinco cards de preço iguais
      no celular viram rolagem e nenhum se destaca. Aqui o card grande mostra
      o SELECIONADO (começa no recomendado) e as outras quatro linhas trocam
      quem está no card. Uma tela, sem navegar.

   3. O NÚMERO SE DECLARA HIPÓTESE quando é hipótese. `projecaoHipotetica`
      vem true quando ela não ligou nenhuma régua ainda: aí a tela diz "se
      você ligar os dois avisos padrão", não finge que mediu.

   4. O PREÇO VAI DENTRO DO BOTÃO. Ela nunca rola de volta pra conferir
      quanto vai pagar.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { IconCheck, IconChevronRight } from '@/components/ui/Icon'
import { Balao, Chip, Lista, TituloSecao } from './ui'

export type PacoteTela = {
  id: string
  nome: string
  unidades: number
  preco: number
  atendimentosQueCabem: number
  custoNoSeuMovimento: number
}

export type Movimento = {
  atendimentosMes: number
  msgsPorAtendimento: number
  unidadesProjetadas: number
  projecaoHipotetica: boolean
}

const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

export default function Oferta({
  pacotes,
  recomendado,
  movimento,
  precoExcedente,
  previa,
  podeContratar,
  liberado,
  salvando,
  erro,
  onContratar,
  onVerMensagens,
}: {
  pacotes: PacoteTela[]
  recomendado: string
  movimento: Movimento
  precoExcedente: number
  previa: string | null
  podeContratar: boolean
  liberado: boolean
  salvando: boolean
  erro: string | null
  onContratar: (id: string) => void
  onVerMensagens: () => void
}) {
  const [escolhido, setEscolhido] = useState(recomendado)
  const p = pacotes.find((x) => x.id === escolhido) ?? pacotes[0]
  const outros = pacotes.filter((x) => x.id !== escolhido)
  const temMovimento = movimento.atendimentosMes > 0

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:items-start">
      {/* ── O QUE É ──────────────────────────────────────────── */}
      <div>
        <h2
          className="text-[22px] leading-snug font-bold tracking-tight"
          style={{ color: 'var(--admin-text)' }}
        >
          Sua cliente recebe confirmação e lembrete sozinho.
        </h2>
        <p
          className="text-[15px] leading-relaxed mt-2"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          O AgendaPRO manda no WhatsApp dela na hora que marca e um dia antes. Você não digita
          nada, não salva contato, não abre o celular.
        </p>

        {previa && (
          <div className="mt-4 max-w-md">
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              É assim que ela recebe
            </p>
            <Balao texto={previa} />
          </div>
        )}

        {/* ── O MOVIMENTO DELA ───────────────────────────────── */}
        <div className="admin-card mt-5 px-4 py-3.5 max-w-md">
          <p
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            O seu movimento
          </p>
          {temMovimento ? (
            <>
              <p
                className="text-[15px] leading-relaxed mt-1.5"
                style={{ color: 'var(--admin-text)' }}
              >
                <strong className="tabular-nums">{movimento.atendimentosMes}</strong> atendimentos
                por mês
                {movimento.msgsPorAtendimento > 0 && (
                  <>
                    {' '}
                    × <strong className="tabular-nums">{movimento.msgsPorAtendimento}</strong>{' '}
                    {movimento.msgsPorAtendimento === 1 ? 'aviso' : 'avisos'}
                  </>
                )}{' '}
                ≈{' '}
                <strong className="tabular-nums">{movimento.unidadesProjetadas}</strong> mensagens
                por mês
              </p>
              {/* O número se declara hipótese quando é hipótese. Fingir que
                  mediu o que não mediu é o jeito mais rápido de perder a
                  confiança dela no resto da tela. */}
              <p className="text-xs mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                {movimento.projecaoHipotetica
                  ? 'Estimativa: é o que sairia se você ligasse a confirmação e o lembrete da véspera. A média de atendimentos é real, dos últimos 90 dias.'
                  : 'Média real dos últimos 90 dias, com os avisos que você já deixou ligados.'}
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Sua agenda ainda não tem movimento suficiente pra gente estimar. Comece pelo menor
              pacote — dá pra trocar depois, sem multa.
            </p>
          )}
        </div>

        {/* ── COMO A CONTA FUNCIONA ──────────────────────────── */}
        <TituloSecao>Como a conta funciona</TituloSecao>
        <ul className="space-y-2 max-w-md">
          {[
            'Cada mensagem enviada consome uma do pacote.',
            'Aniversário e “hora de voltar” consomem 7 — o WhatsApp cobra essas como divulgação, e é bem mais caro.',
            `Passou do pacote, não para: cada mensagem extra sai ${reais(precoExcedente)} e continua saindo.`,
            'Cliente sem telefone cadastrado não recebe, e não consome nada.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                }}
              >
                <IconCheck size={11} />
              </span>
              <span
                className="text-[13px] leading-relaxed"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                {t}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onVerMensagens}
          className="admin-card w-full max-w-md mt-5 px-4 py-3.5 flex items-center gap-3 text-left"
        >
          <span className="flex-1 min-w-0">
            <span
              className="block text-[15px] font-semibold"
              style={{ color: 'var(--admin-text)' }}
            >
              Ver as mensagens que ela recebe
            </span>
            <span className="block text-[13px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Leia e edite os textos antes de contratar.
            </span>
          </span>
          <span style={{ color: 'var(--admin-text-faded)' }} aria-hidden="true">
            <IconChevronRight size={16} />
          </span>
        </button>
      </div>

      {/* ── A OFERTA ─────────────────────────────────────────── */}
      <div className="mt-6 lg:mt-0 lg:sticky lg:top-24">
        <div className="admin-card-deep p-5">
          {p.id === recomendado && temMovimento && (
            <div className="mb-2">
              <Chip tom="ok">mais barato pra você</Chip>
            </div>
          )}

          <p className="text-[13px]" style={{ color: 'var(--admin-text-mute)' }}>
            {p.nome}
          </p>
          <p
            className="text-[26px] font-bold leading-tight tabular-nums"
            style={{ color: 'var(--admin-text)' }}
          >
            {p.unidades} mensagens
          </p>
          <p className="text-[15px] mt-0.5 tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
            {reais(p.preco)} por mês
          </p>

          {temMovimento && (
            <p className="text-[13px] leading-relaxed mt-2.5" style={{ color: 'var(--admin-text-mute)' }}>
              Dá para{' '}
              <strong style={{ color: 'var(--admin-text-2)' }}>
                {p.atendimentosQueCabem} atendimentos
              </strong>{' '}
              por mês.
              {p.custoNoSeuMovimento > p.preco && (
                <>
                  {' '}
                  No seu movimento sairia{' '}
                  <strong style={{ color: 'var(--admin-text-2)' }}>
                    {reais(p.custoNoSeuMovimento)}
                  </strong>{' '}
                  com as extras.
                </>
              )}
            </p>
          )}

          {erro && (
            <p className="text-[13px] mt-3" style={{ color: 'var(--admin-danger)' }}>
              {erro}
            </p>
          )}

          <div className="mt-4">
            {!liberado ? (
              <div
                className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
              >
                <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text-2)' }}>
                  Disponível em poucos dias
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  Estamos terminando a liberação do número oficial. Avisamos você.
                </p>
              </div>
            ) : !podeContratar ? (
              <p className="text-[13px] text-center" style={{ color: 'var(--admin-text-mute)' }}>
                Só o dono da conta contrata o pacote.
              </p>
            ) : (
              <button
                type="button"
                disabled={salvando}
                onClick={() => onContratar(p.id)}
                className="w-full py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-60 transition-transform hover:scale-[1.01]"
                style={{
                  background: 'var(--admin-accent)',
                  color: '#fff',
                  boxShadow: '0 8px 20px -8px rgba(37,99,235,0.6)',
                }}
              >
                {salvando ? 'Gerando cobrança…' : `Contratar · ${reais(p.preco)} por mês`}
              </button>
            )}
          </div>
        </div>

        {/* ── OS OUTROS TAMANHOS ─────────────────────────────── */}
        <TituloSecao>Outros tamanhos</TituloSecao>
        <Lista>
          {outros.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setEscolhido(x.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--admin-divider)' }}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[15px] font-semibold tabular-nums"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {x.unidades} mensagens
                  </span>
                  {x.id === recomendado && temMovimento && (
                    <Chip tom="ok">mais barato pra você</Chip>
                  )}
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                  {x.nome}
                  {temMovimento && <> · {x.atendimentosQueCabem} atendimentos</>}
                </span>
              </span>
              <span
                className="flex-shrink-0 text-[15px] font-semibold tabular-nums"
                style={{ color: 'var(--admin-text-2)' }}
              >
                {reais(x.preco)}
              </span>
            </button>
          ))}
        </Lista>
        <p className="text-xs mt-2 px-1" style={{ color: 'var(--admin-text-faded)' }}>
          Dá para trocar de pacote depois, sem multa.
        </p>
      </div>
    </div>
  )
}
