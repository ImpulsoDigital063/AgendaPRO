'use client'

/* ═══════════════════════════════════════════════════════════════
   OFERTA — a primeira tela de quem ainda não contratou

   Decisão de Eduardo (31/08): quem abre o WhatsApp sem pacote vê a OFERTA,
   não a configuração. E o banco concorda — `avisos_pacote` está vazio nos 29
   negócios, e o gate `podeEnviar()` barra todos. Configurar aviso que não
   pode sair é mexer em botão morto: primeiro vender, depois configurar.

   ─── O que veio do Velobot, e o que NÃO veio ──────────────────

   Eduardo mandou a landing do Velobot como referência. O que ela é: página
   externa, tela cheia, roxo escuro, gradiente em tudo. O que a nossa é: tela
   de dentro do sistema, que abre do lado da Agenda e do Caixa, num painel
   light-only (regra dele). Clonar o roxo escuro quebraria a regra e ficaria
   deslocado ao lado de todas as outras telas — então não veio.

   Veio o que é transferível, e cada coisa por um motivo:

   1. NÚMERO GRANDE COMO ARGUMENTO. O Velobot usa três cards com números
      graúdos ("300 créditos", "~60 pessoas"). O device é bom e a gente tem
      munição melhor: os números são DELA, não do produto — atendimentos por
      mês, mensagens projetadas, e quanto isso custa. Nenhum concorrente
      consegue mostrar isso porque nenhum sabe quantos atendimentos ela faz.

   2. PREÇO PROTAGONISTA. Lá o "R$ 59,90" é o maior elemento do card. Aqui o
      preço estava em 15px, menor que a contagem de mensagens. Virou o número
      grande, no tom do accent.

   3. SELO FLUTUANDO NA BORDA. O "Mais Popular" deles pendura na borda de
      cima do card. O nosso diz "mais barato pra você" — e é verdade
      calculada, não etiqueta de marketing: sai do `custoNoSeuMovimento`, que
      soma o excedente e às vezes aponta o pacote MENOR.

   4. CHECK VERDE. Lista de benefícios com check verde lê mais rápido que
      com check na cor de destaque, que compete com o CTA.

   5. MOVIMENTO. Eduardo pediu animação. Usei o vocabulário que o sistema já
      tem — `.admin-enter` com `--enter-delay` em cascata, e o `CountUp` dos
      números — em vez de importar biblioteca. Os dois já respeitam
      `prefers-reduced-motion`.

   O gradiente do CTA é derivado do PRÓPRIO accent (clareia 12% e volta), não
   de um roxo fixo: cada negócio tem a marca dele injetada, e um roxo cravado
   brigaria com a cor da dona.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react'
import { useState } from 'react'
import CountUp from '@/components/admin/CountUp'
import { IconCheck, IconChevronRight, IconWhatsapp } from '@/components/ui/Icon'
import { Balao, Lista, TituloSecao } from './ui'

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

/** Entrada em cascata. `.admin-enter` já existe no globals e para sozinha
 *  quando o sistema pede menos movimento. */
const entra = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

/** Gradiente derivado do accent do negócio — nunca um roxo cravado. */
const GRADIENTE_ACCENT =
  'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 82%, white) 0%, var(--admin-accent) 55%, color-mix(in srgb, var(--admin-accent) 88%, black) 100%)'

function Numero({
  valor,
  rotulo,
  detalhe,
  delay,
  texto,
}: {
  valor?: number
  texto?: string
  rotulo: string
  detalhe?: string
  delay: number
}) {
  return (
    <div className="admin-card admin-enter px-3.5 py-3" style={entra(delay)}>
      <p className="text-[11px] font-semibold" style={{ color: 'var(--admin-text-mute)' }}>
        {rotulo}
      </p>
      <p
        className="text-[27px] leading-tight font-bold tabular-nums mt-0.5"
        style={{ color: 'var(--admin-accent)' }}
      >
        {texto !== undefined ? texto : <CountUp value={valor ?? 0} localized />}
      </p>
      {detalhe && (
        <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
          {detalhe}
        </p>
      )}
    </div>
  )
}

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
  const ehRecomendado = p.id === recomendado && temMovimento

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:items-start">
      {/* ═══ O QUE É ═══════════════════════════════════════════ */}
      <div>
        <span
          className="admin-enter inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{
            ...entra(0),
            background: 'rgba(37,211,102,0.12)',
            border: '1px solid rgba(37,211,102,0.28)',
            color: '#0f7a52',
          }}
        >
          <IconWhatsapp size={13} />
          WhatsApp oficial
        </span>

        <h2
          className="admin-enter text-[27px] sm:text-[32px] leading-[1.12] font-bold tracking-tight mt-3"
          style={{ ...entra(60), color: 'var(--admin-text)' }}
        >
          Sua cliente recebe confirmação
          <br className="hidden sm:block" /> e lembrete sozinho.
        </h2>
        <p
          className="admin-enter text-[15px] leading-relaxed mt-2.5 max-w-md"
          style={{ ...entra(100), color: 'var(--admin-text-mute)' }}
        >
          O AgendaPRO manda no WhatsApp dela na hora que marca e um dia antes. Você não digita
          nada, não salva contato, não abre o celular.
        </p>

        {/* ═══ OS NÚMEROS DELA ═════════════════════════════════
            O device é do Velobot; a munição é nossa. Lá os números são do
            produto ("300 créditos"), aqui são da agenda DELA. */}
        {temMovimento ? (
          <>
            <div className="grid grid-cols-3 gap-2.5 mt-5 max-w-md">
              <Numero
                delay={140}
                valor={movimento.atendimentosMes}
                rotulo="Atendimentos"
                detalhe="por mês"
              />
              <Numero
                delay={180}
                valor={movimento.unidadesProjetadas}
                rotulo="Mensagens"
                detalhe="por mês"
              />
              <Numero
                delay={220}
                texto={reais(p.custoNoSeuMovimento).replace('R$ ', '')}
                rotulo="Seu custo"
                detalhe="por mês"
              />
            </div>
            {/* O número se declara hipótese quando é hipótese. Fingir que
                mediu o que não mediu é o jeito mais rápido de perder a
                confiança dela no resto da tela. */}
            <p
              className="admin-enter text-[11px] leading-snug mt-2 max-w-md"
              style={{ ...entra(240), color: 'var(--admin-text-faded)' }}
            >
              {movimento.projecaoHipotetica
                ? `Os ${movimento.atendimentosMes} atendimentos são reais, média dos últimos 90 dias. As mensagens são estimativa: é o que sairia ligando a confirmação e o lembrete da véspera.`
                : 'Média real dos últimos 90 dias, com os avisos que você já deixou ligados.'}
            </p>
          </>
        ) : (
          <div
            className="admin-card admin-enter mt-5 px-4 py-3.5 max-w-md"
            style={entra(140)}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Qual pacote é o seu
            </p>
            <p
              className="text-[13px] leading-relaxed mt-1.5"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Assim que sua agenda tiver movimento, a gente mostra aqui qual pacote sai mais barato
              pra você. Pra começar, o menor já cobre bem — e dá pra trocar depois, sem multa.
            </p>
          </div>
        )}

        {previa && (
          <div className="admin-enter mt-5 max-w-md" style={entra(280)}>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              É assim que ela recebe
            </p>
            <Balao texto={previa} />
          </div>
        )}

        {/* ═══ COMO A CONTA FUNCIONA ═══════════════════════════ */}
        <div className="admin-enter" style={entra(320)}>
          <TituloSecao>Como a conta funciona</TituloSecao>
          <ul className="space-y-2.5 max-w-md">
            {[
              'Cada mensagem enviada consome uma do pacote.',
              'Aniversário e “hora de voltar” consomem 7 — o WhatsApp cobra essas como divulgação, e é bem mais caro.',
              `Passou do pacote, não para: cada mensagem extra sai ${reais(precoExcedente)} e continua saindo.`,
              'Cliente sem telefone cadastrado não recebe, e não consome nada.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                {/* Check VERDE, não no accent: no accent ele compete com o
                    botão de contratar, que é a única coisa que devia puxar. */}
                <span
                  className="flex-shrink-0 mt-[3px] inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 19,
                    height: 19,
                    background: 'rgba(5,150,105,0.12)',
                    color: 'var(--admin-success)',
                  }}
                >
                  <IconCheck size={12} />
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
        </div>

        <button
          type="button"
          onClick={onVerMensagens}
          className="admin-card admin-enter w-full max-w-md mt-5 px-4 py-3.5 flex items-center gap-3 text-left"
          style={entra(360)}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
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

      {/* ═══ A OFERTA ══════════════════════════════════════════ */}
      <div className="mt-8 lg:mt-0 lg:sticky lg:top-24">
        <div className="admin-enter relative" style={entra(120)}>
          {/* Selo pendurado na borda, como o "Mais Popular" da referência.
              A diferença é que o nosso é conta, não etiqueta: sai do
              custoNoSeuMovimento e às vezes aponta o pacote MENOR. */}
          {ehRecomendado && (
            <span
              className="absolute left-1/2 -translate-x-1/2 -top-2.5 z-10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
              style={{
                background: GRADIENTE_ACCENT,
                color: '#fff',
                boxShadow: '0 6px 16px -6px color-mix(in srgb, var(--admin-accent) 70%, transparent)',
              }}
            >
              mais barato pra você
            </span>
          )}

          <div
            className="admin-card-deep p-5 pt-6"
            style={
              ehRecomendado
                ? {
                    borderColor: 'color-mix(in srgb, var(--admin-accent) 40%, var(--admin-border))',
                  }
                : undefined
            }
          >
            <p className="text-[13px] font-medium" style={{ color: 'var(--admin-text-mute)' }}>
              {p.nome}
            </p>

            {/* Preço protagonista — era 15px, menor que a contagem de
                mensagens. É o número que decide a compra. */}
            <p
              className="text-[38px] leading-none font-bold tabular-nums tracking-tight mt-1"
              style={{ color: 'var(--admin-accent)' }}
            >
              {reais(p.preco)}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              por mês ·{' '}
              <strong className="tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                {p.unidades} mensagens
              </strong>
            </p>

            {temMovimento && (
              <p
                className="text-[13px] leading-relaxed mt-3 pt-3"
                style={{
                  borderTop: '1px solid var(--admin-divider)',
                  color: 'var(--admin-text-mute)',
                }}
              >
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
                    somando as extras.
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
                  style={{
                    background: 'var(--admin-input-bg)',
                    border: '1px solid var(--admin-border)',
                  }}
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
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-60 transition-all hover:-translate-y-0.5"
                  style={{
                    background: GRADIENTE_ACCENT,
                    color: '#fff',
                    boxShadow:
                      '0 10px 24px -10px color-mix(in srgb, var(--admin-accent) 75%, transparent)',
                  }}
                >
                  {salvando ? 'Gerando cobrança…' : `Contratar · ${reais(p.preco)} por mês`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ OS OUTROS TAMANHOS ════════════════════════════════ */}
        <div className="admin-enter" style={entra(180)}>
          <TituloSecao>Outros tamanhos</TituloSecao>
          <Lista>
            {outros.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setEscolhido(x.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--admin-surface-hover)]"
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
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: 'rgba(5,150,105,0.12)',
                          color: 'var(--admin-success)',
                        }}
                      >
                        mais barato
                      </span>
                    )}
                  </span>
                  <span
                    className="block text-xs mt-0.5"
                    style={{ color: 'var(--admin-text-faded)' }}
                  >
                    {x.nome}
                    {temMovimento && <> · {x.atendimentosQueCabem} atendimentos</>}
                  </span>
                </span>
                <span
                  className="flex-shrink-0 text-[15px] font-bold tabular-nums"
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
    </div>
  )
}
