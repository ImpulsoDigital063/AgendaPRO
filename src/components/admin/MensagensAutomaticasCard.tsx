'use client'

/* Onde a dona liga, desliga e escreve cada aviso automático.
   ───────────────────────────────────────────────────────────────────
   Decisões de tela que valem mais que o visual:

   1. TUDO NASCE DESLIGADO e ela liga um por um. Mensagem automática sai em
      nome dela, pra base dela — ligar por padrão é decidir no lugar dela e
      ela descobre pela cliente estranhando.

   2. O PREVIEW FICA SEMPRE À VISTA, escrito como a cliente vai ler, com
      nome e data de exemplo. A primeira versão desta tela mostrava só o
      interruptor e escondia o texto atrás de "Editar texto": a dona ligava
      sem nunca ter visto o que sairia em nome dela. Ver a mensagem pronta é
      o que faz ela confiar — ou querer mudar.

   3. QUANDO NÃO HÁ CANAL, A TELA DIZ. Ligar sem canal não manda nada, e
      descobrir isso uma semana depois queima a confiança na função inteira.
*/

import { useEffect, useRef, useState } from 'react'
import { sugestoesDeServico } from '@/lib/segmento'
import { IconWhatsapp } from '@/components/ui/Icon'

type Regra = {
  tipo: string
  enabled: boolean
  offsetMinutos: number
  /** Quantas unidades do pacote este aviso consome por mês, no movimento real dela. */
  unidadesPorMes?: number
  /** true = marketing: cada mensagem gasta 7 do pacote em vez de 1. */
  gasta7?: boolean
  horaDoDia: string
  retornoDias: number | null
  /** null = usa o texto do sistema. Preenchido = a dona escreveu o dela. */
  template: string | null
  /** O texto do sistema, com as variáveis à vista. Vem pronto da API. */
  padrao: string
  /** Lembrete sai com os botões Confirmo / Preciso remarcar. */
  comBotao: boolean
}

const INFO: Record<string, { titulo: string; quando: string; porque: string }> = {
  confirmacao: {
    titulo: 'Confirmação do agendamento',
    quando: 'Na hora que marca',
    porque: 'O cliente recebe por escrito o que ficou combinado.',
  },
  lembrete_vespera: {
    titulo: 'Lembrete na véspera',
    quando: '1 dia antes',
    porque: 'É o que mais reduz falta — dá tempo de remarcar em vez de sumir.',
  },
  lembrete_dia: {
    titulo: 'Lembrete no dia',
    quando: 'Horas antes',
    porque: 'Algumas horas antes do horário dela, não de manhã pra todo mundo.',
  },
  aniversario: {
    titulo: 'Aniversário',
    quando: 'No dia',
    porque: 'Uma vez por ano. Sem prometer brinde que você não vai dar.',
  },
}

const HORAS_ANTES = [1, 2, 3, 4, 6, 12, 24]

/* O valor gravado PRECISA existir na lista. Um <select> cujo value não bate
   com nenhuma <option> não fica vazio: ele mostra a primeira opção. Foi o
   que aconteceu com um registro de 24h — o chip dizia "24h antes", o seletor
   dizia "1h antes", e o primeiro toque em qualquer outro campo salvaria 1h
   que a dona nunca escolheu. */
function opcoesHoras(atual: number): number[] {
  return HORAS_ANTES.includes(atual) ? HORAS_ANTES : [...HORAS_ANTES, atual].sort((a, b) => a - b)
}

const VARIAVEIS = [
  { chave: '{cliente}', label: 'nome do cliente' },
  { chave: '{data}', label: 'data' },
  { chave: '{hora}', label: 'hora' },
  { chave: '{servico}', label: 'serviço' },
  { chave: '{salao}', label: 'seu negócio' },
]

/* Exemplo reconhecível — sábado porque é quando lota. Mas o SERVIÇO segue
   o nicho: clínica lendo "Corte Feminino" no próprio exemplo parece sistema
   de salão adaptado às pressas, e é a primeira coisa que faz a dona
   desconfiar de que o produto não é pra ela. */
function exemplos(categoria: string | null): Record<string, string> {
  return {
    '{cliente}': 'Maria',
    '{data}': 'sáb, 22/08',
    '{hora}': '14:30',
    '{servico}': sugestoesDeServico(categoria)[0],
    '{profissional}': 'Ana',
  }
}

function preencher(texto: string, salao: string, categoria: string | null): string {
  let t = texto.replace(/{salao}/g, salao)
  for (const [chave, valor] of Object.entries(exemplos(categoria))) t = t.split(chave).join(valor)
  return t
}

function formatarTelefone(bruto: string): string {
  const d = (bruto || '').replace(/\D/g, '')
  const s = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`
  return bruto
}

export default function MensagensAutomaticasCard({
  businessName = 'seu negócio',
  businessPhone = null,
  category = null,
}: {
  businessName?: string
  businessPhone?: string | null
  category?: string | null
}) {
  const [consumo, setConsumo] = useState<{
    usadas: number
    franquia: number
    saldo: number
    temPacote: boolean
  } | null>(null)
  const [regras, setRegras] = useState<Regra[]>([])
  const [canalLigado, setCanalLigado] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)

  async function carregar() {
    try {
      const r = await fetch('/api/admin/mensagens/regras').then((x) => x.json())
      setRegras(r.regras ?? [])
      setConsumo(r.consumo ?? null)
      setCanalLigado(r.canal_ligado === true)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { void carregar() }, [])

  async function salvar(regra: Regra, mudanca: Partial<Regra>) {
    const nova = { ...regra, ...mudanca }
    setRegras((rs) => rs.map((r) => (r.tipo === regra.tipo ? nova : r)))
    setSalvando(regra.tipo)
    await fetch('/api/admin/mensagens/regras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nova),
    })
    setSalvando(null)
  }

  if (carregando) {
    return (
      <div className="admin-card p-4">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Carregando…</p>
      </div>
    )
  }

  const ligados = regras.filter((r) => r.enabled).length

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
            <IconWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} />
            Avisos automáticos
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            O sistema manda sozinho, em nome do seu negócio.
          </p>
        </div>
        <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
          {ligados === 0 ? 'nenhum ligado' : `${ligados} de ${regras.length} ligados`}
        </span>
      </div>

      {!canalLigado && (
        <div
          className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <strong style={{ color: 'var(--admin-text)' }}>O envio ainda não está ligado.</strong>{' '}
          <span style={{ color: 'var(--admin-text-mute)' }}>
            Você já pode deixar tudo escolhido — quando o canal for ativado, começa a sair sem você
            precisar voltar aqui.
          </span>
        </div>
      )}

      {regras.map((r) => {
        const info = INFO[r.tipo]
        if (!info) return null

        const horasAntes = Math.round(Math.abs(r.offsetMinutos) / 60)
        const quando =
          r.tipo === 'lembrete_dia' ? `${horasAntes}h antes`
          : r.tipo === 'aniversario' ? `No dia, às ${r.horaDoDia}`
          : info.quando

        const textoAtual = r.template ?? r.padrao
        const temBotao = r.tipo === 'lembrete_vespera' || r.tipo === 'lembrete_dia'
        const aberto = editando === r.tipo

        return (
          <div
            key={r.tipo}
            className="admin-card overflow-hidden transition-opacity"
            style={{ opacity: r.enabled ? 1 : 0.72 }}
          >
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {info.titulo}
                  </p>
                  {/* O QUE ESTE AVISO CUSTA DO PACOTE DELA.
                      O consumo é dela; a conta tem que estar do lado do
                      interruptor, não num documento que ela não vai ler.
                      Sem isto, ela liga o aniversário sem saber que cada
                      mensagem gasta 7 e descobre na fatura. */}
                  {r.gasta7 && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}
                      title="Aniversário e retorno custam mais para o WhatsApp: cada mensagem gasta 7 do seu pacote"
                    >
                      gasta 7
                    </span>
                  )}
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: r.enabled
                        ? 'rgba(34,197,94,0.14)'
                        : 'var(--admin-surface-2, rgba(0,0,0,0.05))',
                      color: r.enabled ? '#15803d' : 'var(--admin-text-faded)',
                    }}
                  >
                    {quando}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {info.porque}
                </p>

                {/* A CONTA, ao lado da decisão. Texto diferente conforme já
                    esteja ligado ou não: ligado é "está consumindo", desligado
                    é "vai adicionar". A dona decide sabendo. */}
                {consumo?.temPacote && r.unidadesPorMes ? (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                    {r.enabled
                      ? `Consome cerca de ${r.unidadesPorMes} do seu pacote por mês.`
                      : `Ligar adiciona cerca de ${r.unidadesPorMes} por mês ao seu consumo.`}
                    {consumo.franquia > 0 && (
                      <> Hoje: {consumo.usadas} de {consumo.franquia}.</>
                    )}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={r.enabled}
                onClick={() => salvar(r, { enabled: !r.enabled })}
                disabled={salvando === r.tipo}
                className="flex-shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-60"
                style={{ background: r.enabled ? 'var(--admin-accent)' : 'var(--admin-border)' }}
                aria-label={r.enabled ? 'Desligar' : 'Ligar'}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: r.enabled ? 26 : 4 }}
                />
              </button>
            </div>

            <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
              {aberto ? (
                <Editor
                  regra={r}
                  onFechar={() => setEditando(null)}
                  onSalvar={(t) => { void salvar(r, { template: t }); setEditando(null) }}
                />
              ) : (
                <>
                  <Bolha
                    texto={preencher(textoAtual, businessName, category)}
                    salao={businessName}
                    telefone={businessPhone}
                    botoes={temBotao && r.comBotao}
                  />

                  {temBotao && (
                    /* Só nos lembretes: é onde o botão existe. Oferecer isso
                       na mensagem de aniversário seria prometer o que o motor
                       não faz. */
                    <label className="mt-2.5 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.comBotao}
                        onChange={(ev) => salvar(r, { comBotao: ev.target.checked })}
                        className="mt-0.5"
                      />
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                        Deixar o cliente confirmar pelo botão
                        <span className="block text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                          Ela toca em &quot;Confirmo&quot; e o agendamento é confirmado sozinho. Desligue se
                          você prefere que ela não responda por aqui.
                        </span>
                      </span>
                    </label>
                  )}

                  <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                    {/* O EDITOR DE TEXTO SAIU DAQUI (29/08).
                        Ele escrevia em `message_rules.template`, que o motor
                        IGNORA desde a migração pra Cloud API: fora da janela
                        de 24h o WhatsApp só entrega template aprovado pela
                        Meta. Editar aqui salvava e não mudava nada — o pior
                        tipo de erro, o que parece ter funcionado.
                        Agora o texto se edita em "Os textos que suas clientes
                        recebem", logo acima, que manda pra aprovação. */}

                    {r.enabled && r.tipo === 'lembrete_dia' && (
                      <select
                        value={horasAntes}
                        onChange={(e) => salvar(r, { offsetMinutos: -Number(e.target.value) * 60 })}
                        className="admin-input px-2 py-1 text-xs ml-auto"
                        aria-label="Horas antes"
                      >
                        {opcoesHoras(horasAntes).map((h) => (
                          <option key={h} value={h}>{h}h antes</option>
                        ))}
                      </select>
                    )}

                    {r.enabled && r.tipo === 'aniversario' && (
                      <input
                        type="time"
                        value={r.horaDoDia}
                        onChange={(e) => salvar(r, { horaDoDia: e.target.value })}
                        className="admin-input px-2 py-1 text-xs ml-auto"
                        aria-label="Hora do envio"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   A MENSAGEM COMO A CLIENTE VÊ

   Bolha de WhatsApp, não caixa de texto: a dona reconhece o formato em meio
   segundo e lê como quem recebe, não como quem configura. O rodapé aparece
   em cinza porque é automático — sem mostrar isso, ela escreve o telefone
   no texto e a cliente recebe duas vezes.
   ═══════════════════════════════════════════════════════════════ */
function Bolha({
  texto,
  salao,
  telefone,
  botoes = false,
}: {
  texto: string
  salao: string
  telefone: string | null
  botoes?: boolean
}) {
  return (
    <div
      className="rounded-xl rounded-tl-sm px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap"
      style={{
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.18)',
        color: 'var(--admin-text)',
      }}
    >
      {texto}
      <span className="block mt-2" style={{ color: 'var(--admin-text-faded)' }}>
        {telefone
          ? `Para remarcar ou tirar dúvida, fale com ${salao}: ${formatarTelefone(telefone)}`
          : `Para remarcar ou tirar dúvida, fale direto com ${salao}.`}
      </span>

      {botoes && (
        /* Desenhados como o WhatsApp mostra — divisória em cima, texto
           centralizado em verde. Ver o botão no preview é o que faz a dona
           entender o que ele é sem precisar mandar um teste pra si mesma. */
        <span className="block mt-2.5" style={{ borderTop: '1px solid rgba(34,197,94,0.25)' }}>
          {['Confirmo', 'Preciso remarcar'].map((b, i) => (
            <span
              key={b}
              className="block text-center py-1.5 text-xs font-medium"
              style={{
                color: '#15803d',
                borderTop: i > 0 ? '1px solid rgba(34,197,94,0.25)' : undefined,
              }}
            >
              {b}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EDITOR

   Abre já com o texto atual — nunca em branco. Caixa vazia produz mensagem
   pior que o padrão, ou ninguém mexe. As variáveis são chips clicáveis
   porque digitar "{cliente}" na mão é onde nasce o "{client}" que não
   substitui nada e chega assim na cliente.
   ═══════════════════════════════════════════════════════════════ */
function Editor({
  regra,
  onSalvar,
  onFechar,
}: {
  regra: Regra
  onSalvar: (t: string | null) => void
  onFechar: () => void
}) {
  const [texto, setTexto] = useState(regra.template ?? regra.padrao)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const mudou = texto.trim() !== (regra.template ?? regra.padrao).trim()

  function inserir(chave: string) {
    const el = areaRef.current
    if (!el) return
    const ini = el.selectionStart ?? texto.length
    const fim = el.selectionEnd ?? texto.length
    setTexto(texto.slice(0, ini) + chave + texto.slice(fim))
    /* devolve o cursor pra depois do que foi inserido, senão ela perde o
       lugar e clica de novo achando que não funcionou */
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(ini + chave.length, ini + chave.length)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={areaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={5}
        maxLength={1000}
        className="admin-input w-full px-3 py-2 text-xs leading-relaxed"
        style={{ resize: 'vertical' }}
        autoFocus
      />

      <div className="flex flex-wrap gap-1.5">
        {VARIAVEIS.map((v) => (
          <button
            key={v.chave}
            type="button"
            onClick={() => inserir(v.chave)}
            title={`Insere o ${v.label}`}
            className="text-[10px] px-1.5 py-1 rounded font-mono"
            style={{
              background: 'var(--admin-surface-2, rgba(0,0,0,0.05))',
              color: 'var(--admin-text-mute)',
            }}
          >
            {v.chave}
          </button>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-faded)' }}>
        Onde você escrever {'{cliente}'} entra o nome dela. O telefone do seu negócio entra sozinho
        no fim — não precisa escrever.
      </p>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={() => onSalvar(texto)}
          disabled={!mudou}
          className="admin-btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
        >
          Salvar
        </button>

        <button
          type="button"
          onClick={onFechar}
          className="text-xs"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Cancelar
        </button>

        {regra.template && (
          /* Voltar ao padrão manda null — ela não precisa lembrar como era o
             texto original pra poder se arrepender. */
          <button
            type="button"
            onClick={() => onSalvar(null)}
            className="text-xs underline underline-offset-2 ml-auto"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Voltar ao texto do sistema
          </button>
        )}
      </div>
    </div>
  )
}
