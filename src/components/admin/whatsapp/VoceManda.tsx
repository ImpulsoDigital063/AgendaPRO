'use client'

/* ═══════════════════════════════════════════════════════════════
   VOCÊ MANDA — o WhatsApp que sai do número dela

   Eduardo, 31/08: "quem não comprar pacotes ainda vai usar as msg de
   WhatsApp semi-automáticas". Ele está certo, e a leitura que eu tinha feito
   antes estava errada — eu li o comentário do `enviar.ts` dizendo que
   `regra.template` é ignorado e concluí que o editor antigo era botão morto.
   São stores diferentes:

     businesses.whatsapp_confirmation_template  → ESTE aqui, o wa.me. VIVO.
     businesses.whatsapp_reminder_template      → idem.
     message_rules.template                     → texto livre da W-API. Morto
                                                  no caminho Cloud.
     message_templates_negocio                  → o que a Meta aprova.

   ─── Por que os dois modos moram na mesma tela ────────────────

   A diferença entre eles não é "grátis × pago", é QUEM MANDA:

     Você manda   → você aperta enviar · sai do SEU número, com seu nome ·
                    texto livre · se esquecer, não vai · custo zero
     Ele manda    → ninguém aperta · sai do número do AgendaPRO · texto
                    aprovado pela Meta · vai mesmo se você esquecer

   Isso faz o modo grátis virar o degrau de entrada e o argumento de venda ao
   mesmo tempo. E ele NÃO é a versão pobre: cancelamento, remarcação e recado
   fora das réguas não têm template aprovado — o manual segue útil pra quem
   paga.

   ─── O detalhe que a prévia ensina sozinha ────────────────────

   Aqui o balão vem com o NOME DELA no cabeçalho, porque sai do WhatsApp
   dela. Na seção de cima vem "AgendaPRO". As duas telas lado a lado explicam
   a troca sem precisar de texto.

   Mobile: uma coluna, sem prefixo de breakpoint em nada estrutural.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  TEMPLATE_VARIABLES,
  renderTemplate,
  type TemplateVars,
} from '@/lib/message-templates'
import { sugestoesDeServico } from '@/lib/segmento'
import { IconCalendar, IconBell } from '@/components/ui/Icon'
import { Chip, IconeAviso, Linha, Lista, TituloSecao, WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'

export type Qual = 'confirmation' | 'reminder'

const INFO: Record<Qual, { rotulo: string; porque: string; padrao: string; icone: React.ReactNode }> = {
  confirmation: {
    rotulo: 'Confirmação',
    porque: 'Você abre no agendamento e manda o combinado por escrito.',
    padrao: DEFAULT_CONFIRMATION_TEMPLATE,
    icone: <IconCalendar size={19} />,
  },
  reminder: {
    rotulo: 'Lembrete',
    porque: 'O que você manda na véspera pra cliente não esquecer.',
    padrao: DEFAULT_REMINDER_TEMPLATE,
    icone: <IconBell size={19} />,
  },
}

const exemplo = (negocio: string, categoria: string | null): TemplateVars => ({
  cliente: 'Maria Silva',
  /* O serviço do exemplo segue o NICHO: clínica lendo "Corte + Escova" na
     própria mensagem parece sistema de salão adaptado. */
  servico: sugestoesDeServico(categoria)[0],
  data: '19/06/2026',
  hora: '14:30',
  negocio: negocio || 'Seu Negócio',
  profissional: 'Ana',
})

export type TextosManuais = { confirmation: string; reminder: string }

/** A lista das duas mensagens, pra raiz da central. */
export function VoceMandaLista({
  textos,
  negocio,
  categoria,
  onAbrir,
}: {
  textos: TextosManuais | null
  negocio: string
  categoria: string | null
  onAbrir: (qual: Qual) => void
}) {
  const vars = exemplo(negocio, categoria)
  return (
    <div className="mt-8">
      <TituloSecao acao={<Chip tom="ok">grátis</Chip>}>Você manda</TituloSecao>
      <p
        className="text-[13.5px] leading-relaxed mb-2.5 px-1"
        style={{ color: 'var(--admin-text-2)' }}
      >
        No agendamento você toca em{' '}
        <strong style={{ color: WA.forte }}>Enviar WhatsApp</strong> e ele abre com a mensagem
        pronta — é só apertar enviar. Sai do <strong>seu</strong> número, com o seu nome.
      </p>
      <Lista>
        {(['confirmation', 'reminder'] as Qual[]).map((qual, i) => {
          const info = INFO[qual]
          const corpo = textos?.[qual] || info.padrao
          return (
            <Linha
              key={qual}
              primeira={i === 0}
              delay={80 + i * 60}
              onClick={() => onAbrir(qual)}
              icone={<IconeAviso ativo>{info.icone}</IconeAviso>}
              titulo={
                <span className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {info.rotulo}
                </span>
              }
              snippet={renderTemplate(corpo, vars)}
              meta={textos?.[qual] ? 'Texto seu' : 'Texto padrão'}
              acao={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="var(--admin-text-faded)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          )
        })}
      </Lista>
    </div>
  )
}

/** A tela de editar UMA das duas. */
export default function VoceManda({
  qual,
  inicial,
  negocio,
  numero,
  categoria,
  onSalvar,
}: {
  qual: Qual
  inicial: string
  negocio: string
  numero: string
  categoria: string | null
  onSalvar: (qual: Qual, corpo: string) => Promise<boolean>
}) {
  const info = INFO[qual]
  const [corpo, setCorpo] = useState(inicial || info.padrao)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setCorpo(inicial || info.padrao)
  }, [inicial, info.padrao])

  /* Só usa o cursor se o campo estiver REALMENTE focado. Sem isso, tocar um
     chip com o campo desfocado caía em selectionStart=0 e a variável grudava
     no COMEÇO da mensagem — aconteceu de verdade na Barbearia Guia Lopes em
     07/07. Desfocado = insere no fim. */
  function inserir(token: string) {
    const el = campo.current
    const focado = !!el && typeof document !== 'undefined' && document.activeElement === el
    const ini = focado ? (el!.selectionStart ?? corpo.length) : corpo.length
    const fim = focado ? (el!.selectionEnd ?? corpo.length) : corpo.length
    const espaco = ini > 0 && !/\s$/.test(corpo.slice(0, ini)) ? ' ' : ''
    const texto = espaco + token
    setCorpo(corpo.slice(0, ini) + texto + corpo.slice(fim))
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        const pos = ini + texto.length
        el.setSelectionRange(pos, pos)
      }
    })
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const ok = await onSalvar(qual, corpo)
    setSalvando(false)
    if (!ok) {
      setErro('Não deu para salvar agora. Tente de novo.')
      return
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  const previa = renderTemplate(corpo || info.padrao, exemplo(negocio, categoria))

  return (
    <div className="pb-6">
      <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
        {info.porque}
      </p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
        Sai do seu número · você aperta enviar · não consome pacote
      </p>

      <textarea
        ref={campo}
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        rows={5}
        className="w-full text-[14px] rounded-xl px-3 py-2.5 leading-relaxed mt-4"
        style={{
          background: 'var(--admin-input-bg)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
      />

      <p
        className="text-[11px] font-bold uppercase tracking-wider mt-3 mb-1.5"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        Inserir dados do cliente
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            onClick={() => inserir(v.token)}
            className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
            style={{ background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }}
          >
            + {v.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
        O sistema troca cada etiqueta pelos dados reais de quem agendou, na hora de enviar.
      </p>

      {/* Aqui o cabeçalho é o NOME DELA, porque sai do WhatsApp dela. Na
          seção de cima é "AgendaPRO". Ver as duas explica a troca. */}
      <p
        className="text-[11px] font-bold uppercase tracking-wider mt-6 mb-2"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        No celular da sua cliente
      </p>
      <TelaWhatsApp remetente={negocio} numero={numero} texto={previa} />

      {erro && (
        <p className="text-[13px] mt-3" style={{ color: 'var(--admin-danger)' }}>
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-5">
        <button
          type="button"
          disabled={salvando}
          onClick={salvar}
          className="text-[15px] font-bold px-5 py-3 rounded-xl disabled:opacity-60"
          style={{ background: WA.gradiente, color: '#fff', boxShadow: WA.sombra }}
        >
          {salvando ? 'Salvando…' : salvo ? 'Salvo' : 'Salvar mensagem'}
        </button>
        {corpo !== info.padrao && (
          <button
            type="button"
            onClick={() => setCorpo(info.padrao)}
            className="text-[13px] underline underline-offset-2"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Voltar ao texto padrão
          </button>
        )}
      </div>
    </div>
  )
}
