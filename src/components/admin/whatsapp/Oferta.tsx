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
import { IconCheck, IconChevronRight } from '@/components/ui/Icon'
import type { TermoPessoa } from '@/lib/segmento'
import { Lista, TituloSecao, WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'
import HeroOferta from './HeroOferta'
import MenuAncora from './MenuAncora'
import ComoFunciona from './ComoFunciona'
import OQueVoceGanha from './OQueVoceGanha'
import type { Aviso } from './AvisoDetalhe'

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

/* O gradiente saia do `--admin-accent`, o que virava preto-sobre-preto em 6
   negocios da base. Agora e o verde da feature — ver o bloco WA em ui.tsx. */
const GRADIENTE_ACCENT = WA.gradiente

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
    <div
      className="admin-enter rounded-2xl px-3.5 py-3"
      style={{ ...entra(delay), background: WA.fundo, border: `1px solid ${WA.borda}` }}
    >
      <p className="text-[11px] font-bold" style={{ color: 'var(--admin-text-2)' }}>
        {rotulo}
      </p>
      <p
        className="text-[27px] leading-tight font-bold tabular-nums mt-0.5"
        style={{ color: WA.forte }}
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
  T,
  precisaDados,
  remetente,
  numero,
  pacotes,
  recomendado,
  movimento,
  precoExcedente,
  previa,
  avisos,
  clienteExemplo,
  podeContratar,
  liberado,
  salvando,
  erro,
  onContratar,
  onVerMensagens,
}: {
  /** Vocabulário do segmento: clínica diz "paciente", não "cliente". */
  T: TermoPessoa
  /** Asaas nao conhece esse negocio: a tela pede nome e CPF e reenvia. */
  precisaDados: boolean
  remetente: string
  numero: string
  pacotes: PacoteTela[]
  recomendado: string
  movimento: Movimento
  precoExcedente: number
  previa: string | null
  /** A régua inteira, pra seção "Como funciona" montar a lista navegável. */
  avisos: Aviso[]
  /** Primeiro nome do último atendimento — o cartão da agenda usa. */
  clienteExemplo: string
  podeContratar: boolean
  liberado: boolean
  salvando: boolean
  erro: string | null
  onContratar: (id: string, cliente?: { name: string; cpfCnpj: string }) => void
  onVerMensagens: () => void
}) {
  const [escolhido, setEscolhido] = useState(recomendado)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const dadosOk = nome.trim().length > 2 && cpf.length >= 11
  const p = pacotes.find((x) => x.id === escolhido) ?? pacotes[0]
  const outros = pacotes.filter((x) => x.id !== escolhido)
  const temMovimento = movimento.atendimentosMes > 0
  const ehRecomendado = p.id === recomendado && temMovimento

  return (
    <div>
      {/* ═══ 1 · HERO ══════════════════════════════════════════
          O selo, o título, a foto e o aparelho. Saiu daqui pra
          HeroOferta.tsx quando a tela virou LP (01/09) — o hero antigo
          era um parágrafo e um H2, e o resto da página não tinha por onde
          começar. */}
      <HeroOferta
        T={T}
        remetente={remetente}
        numero={numero}
        previa={previa}
        atendimentosMes={movimento.atendimentosMes}
      />

      {/* ═══ 2 · MENU ÂNCORA ═══════════════════════════════════ */}
      <MenuAncora />

      {/* ═══ 3 · COMO FUNCIONA ═════════════════════════════════ */}
      <ComoFunciona
        avisos={avisos}
        remetente={remetente}
        numero={numero}
        clienteExemplo={clienteExemplo}
      />

      {/* ═══ 4 · O QUE VOCÊ GANHA ══════════════════════════════ */}
      <OQueVoceGanha T={T} precoExcedente={precoExcedente} />

      {/* ═══ 5 · PREÇOS ════════════════════════════════════════ */}
      <section
        id="precos"
        className="secao-ancora pt-9 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:items-start"
      >
      <div>
        <h3
          className="admin-enter text-[24px] sm:text-[28px] leading-tight font-bold tracking-tight"
          style={{ ...entra(0), color: 'var(--admin-text)' }}
        >
          Escolha o tamanho do seu mês
        </h3>
        <p
          className="admin-enter text-[15px] leading-relaxed mt-2 max-w-md"
          style={{ ...entra(60), color: 'var(--admin-text-2)' }}
        >
          Você paga por mensagem entregue, e só. Sem mensalidade escondida, sem
          taxa de ativação, e dá para trocar de pacote quando quiser.
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
              className="admin-enter text-[12px] leading-snug mt-2 max-w-md"
              style={{ ...entra(240), color: 'var(--admin-text-mute)' }}
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
          <div className="admin-enter mt-6" style={entra(280)}>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              {`No celular d${T.art} ${T.poss} ${T.s}`}
            </p>
            <TelaWhatsApp
              remetente={remetente}
              numero={numero}
              avatar="/agendapro-icon.svg"
              texto={previa}
              botoes={['Confirmar presença', 'Preciso remarcar']}
            />
            {/* A tela mostra o remetente REAL. O aviso chega pelo número
                oficial do AgendaPRO — não pelo número do salão — e o
                `verified_name` da conta na Meta é "AgendaPRO". Deixar o nome
                do salão no cabeçalho seria vender uma tela que não acontece,
                e a dona descobriria pela cliente. */}
            {/* ── As duas respostas que a tela precisa dar ──────────
                Eram dois parágrafos de 11px em cinza claro embaixo do
                celular. Eduardo, 01/09: "não deixar esse texto solto assim
                sem destaque nenhum". Ele está certo — e o problema não era
                só tamanho: as duas perguntas mais duras da tela ("de que
                número chega?" e "e depois que ela responde?") estavam
                escritas como se fossem observação de rodapé.

                Viram cartão com ícone e título próprio. Cada uma responde
                uma pergunta, e o título é a pergunta. */}
            <div
              className="mt-3.5 max-w-sm rounded-2xl overflow-hidden"
              style={{ background: WA.fundo, border: `1px solid ${WA.borda}` }}
            >
              {[
                {
                  titulo: 'De que número chega',
                  corpo: (
                    <>
                      Do número oficial do AgendaPRO, o mesmo para todos. O nome do{' '}
                      <strong style={{ color: 'var(--admin-text)' }}>seu negócio</strong> vai na
                      primeira linha, e o telefone de resposta é o seu.
                    </>
                  ),
                  icone: (
                    <path
                      d="M4.5 5.5c0-.6.4-1 1-1h2.2c.5 0 .9.3 1 .8l.7 2.6c.1.4 0 .8-.4 1l-1.4 1a11 11 0 005 5l1-1.4c.2-.3.6-.5 1-.4l2.6.7c.5.1.8.5.8 1v2.2c0 .6-.4 1-1 1A13.5 13.5 0 014.5 5.5z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  titulo: 'E depois que responde',
                  corpo: `${T.pron.charAt(0).toUpperCase()}${T.pron.slice(1)} toca em "Confirmar presença" e o horário ganha o selo na sua agenda sozinho. Você não precisa responder nada.`,
                  icone: (
                    <>
                      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
                      <path
                        d="M8.4 12.2l2.6 2.6 4.6-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ),
                },
              ].map((b, i) => (
                <div
                  key={b.titulo}
                  className="flex items-start gap-2.5 px-3.5 py-3"
                  style={i > 0 ? { borderTop: `1px solid ${WA.borda}` } : undefined}
                >
                  <span className="flex-shrink-0 mt-[1px]" style={{ color: WA.forte }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {b.icone}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold leading-tight" style={{ color: WA.forte }}>
                      {b.titulo}
                    </p>
                    <p
                      className="text-[12.5px] leading-relaxed mt-0.5"
                      style={{ color: 'var(--admin-text-2)' }}
                    >
                      {b.corpo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ COMO A CONTA FUNCIONA ═══════════════════════════ */}
        <div className="admin-enter" style={entra(320)}>
          <TituloSecao>Como a conta funciona</TituloSecao>
          {/* Duas colunas no desktop: com tudo empilhado, a coluna da
              esquerda descia bem mais que o trilho da oferta e a tela
              terminava torta. */}
          <ul className="space-y-2.5 max-w-md lg:max-w-none lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-2.5 lg:space-y-0">
            {[
              'Cada mensagem enviada consome uma do pacote.',
              'Aniversário e “hora de voltar” consomem 7 — o WhatsApp cobra essas como divulgação, e é bem mais caro.',
              `Passou do pacote, não para: cada mensagem extra sai ${reais(precoExcedente)} e continua saindo.`,
              `${T.s.charAt(0).toUpperCase()}${T.s.slice(1)} sem telefone cadastrado não recebe, e não consome nada.`,
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
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--admin-text-2)' }}
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
              {`Ver as mensagens que ${T.pron} recebe`}
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
                boxShadow: '0 6px 16px -6px rgba(0,128,105,0.7)',
              }}
            >
              mais barato pra você
            </span>
          )}

          <div
            className="admin-card-deep p-5 pt-6"
            style={
              ehRecomendado
                ? { borderColor: WA.borda, boxShadow: `0 18px 40px -22px rgba(0,128,105,0.55)` }
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
              style={{ color: WA.forte }}
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

            {/* So aparece quando o Asaas nao conhece o negocio. Antes disso a
                tela nao pede nada: ninguem digita CPF por precaucao. */}
            {precisaDados && (
              <div className="mt-3 space-y-2">
                {/* "de quem vai pagar" nao e' detalhe de copy: o PIX com
                    vencimento leva o CPF do devedor registrado no PSP, e
                    varios bancos so aceitam pagamento vindo de conta com o
                    MESMO CPF. Em 31/08 o Eduardo cadastrou nome e CPF de
                    outra pessoa e levou "esse codigo nao esta mais
                    disponivel para pagar" em dois bancos, com a cobranca
                    intacta e a conta Asaas saudavel. */}
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                  Preencha com os dados de{' '}
                  <strong style={{ color: WA.forte }}>quem vai pagar</strong>. O PIX só pode ser
                  pago de uma conta com esse mesmo CPF.
                </p>
                <input
                  type="text"
                  placeholder="Nome completo de quem paga"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-[14px]"
                  style={{
                    background: 'var(--admin-input-bg)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)',
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="CPF ou CNPJ de quem paga"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))}
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] tabular-nums"
                  style={{
                    background: 'var(--admin-input-bg)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)',
                  }}
                />
                <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                  Fica so com o Asaas para emitir a nota. A gente nao compartilha.
                </p>
              </div>
            )}

            <div className="mt-4">
              {/* O PIX nao mora mais aqui: virou modal. Dentro do card ainda
                  dependia de onde a dona estava na rolagem — foi a observacao
                  do Eduardo, e ele esta certo. Ver ModalPix.tsx. */}
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
                  disabled={salvando || (precisaDados && !dadosOk)}
                  onClick={() =>
                    onContratar(p.id, precisaDados ? { name: nome.trim(), cpfCnpj: cpf } : undefined)
                  }
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-60 transition-all hover:-translate-y-0.5"
                  style={{ background: GRADIENTE_ACCENT, color: '#fff', boxShadow: WA.sombra }}
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
                  style={{ color: WA.forte }}
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
      </section>
    </div>
  )
}
