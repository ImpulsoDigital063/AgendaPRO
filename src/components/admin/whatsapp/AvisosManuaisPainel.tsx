'use client'
/* ═══════════════════════════════════════════════════════════════
   AVISOS MANUAIS — o texto que abre no botão "Enviar WhatsApp"
   Morava como seção "Você manda" no fim de /admin/whatsapp, embaixo de tudo
   que é do disparo automático. Em 07/10/2026 a Rosy procurou onde editar o
   lembrete que ela manda na mão e não achou — e o Eduardo, olhando o menu,
   achou que a tela tinha sumido. Manual (sai do número dela, grátis) e
   automático (sai do número do AgendaPRO, pacote) viraram dois itens.

   Página inteira, sem lista intermediária (Eduardo, 07/10): abre direto no
   editor com a tela de WhatsApp embaixo mostrando a mensagem pronta.

   SÓ O LEMBRETE. Desde 9c3723c ("um botão de WhatsApp só") o único botão
   manual do agendamento manda o texto do lembrete; o da confirmação continua
   no banco, mas nenhum botão usa. Mostrar editor de texto que não sai seria
   botão morto — decisão do Eduardo, 07/10.

   Mobile: uma coluna (editor, depois o celular). Desktop (lg:): editor à
   esquerda e o celular grudado à direita.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { termoPessoa } from '@/lib/segmento'
import {
  DEFAULT_REMINDER_TEMPLATE,
  TEMPLATE_VARIABLES,
  renderTemplate,
} from '@/lib/message-templates'
import { IconArrowRight, IconCalendar, IconCheck, IconWhatsapp } from '@/components/ui/Icon'
import { Cabecalho, CONTAINER, formatarNumero } from './WhatsAppPainel'
import { exemplo } from './VoceManda'
import { Chip, TituloSecao, WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'

export default function AvisosManuaisPainel({
  businessName,
  businessPhone,
  category,
}: {
  businessName: string
  businessPhone?: string | null
  category?: string | null
}) {
  const T = termoPessoa(category ?? null)
  /* O que está no banco. null = ainda carregando; '' = usa o padrão. */
  const [gravado, setGravado] = useState<string | null>(null)
  const [corpo, setCorpo] = useState(DEFAULT_REMINDER_TEMPLATE)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((j) => {
        const t = String(j?.reminder ?? '')
        setGravado(t)
        setCorpo(t || DEFAULT_REMINDER_TEMPLATE)
      })
      .catch(() => setGravado(''))
  }, [])

  const atual = gravado || DEFAULT_REMINDER_TEMPLATE
  const mudou = gravado !== null && corpo !== atual
  const textoSeu = !!gravado && gravado !== DEFAULT_REMINDER_TEMPLATE

  /* Só usa o cursor se o campo estiver REALMENTE focado. Sem isso, tocar um
     chip com o campo desfocado caía em selectionStart=0 e a variável grudava
     no COMEÇO da mensagem (Barbearia Guia Lopes, 07/07). Desfocado = fim. */
  function inserir(token: string) {
    const el = campo.current
    const focado = !!el && document.activeElement === el
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
    try {
      const r = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder: corpo }),
      })
      if (!r.ok) throw new Error('falhou')
      /* Lê de volta o que a rota devolveu, não o que eu mandei: é a única
         prova de que gravou. */
      const j = await r.json().catch(() => null)
      const t = String(j?.reminder ?? '')
      if (!t) throw new Error('sem retorno')
      setGravado(t)
      setCorpo(t)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch {
      setErro('Não deu para salvar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const previa = renderTemplate(corpo || DEFAULT_REMINDER_TEMPLATE, exemplo(businessName, category ?? null))
  const numero = businessPhone ? formatarNumero(businessPhone) : ''

  const passos = [
    { icone: <IconCalendar size={16} />, texto: 'Abra o atendimento na agenda.' },
    {
      icone: <IconWhatsapp size={16} />,
      texto: (
        <>
          Toque em <strong style={{ color: WA.forte }}>Enviar WhatsApp</strong> (no card da agenda
          ele aparece como <strong style={{ color: WA.forte }}>Lembrete</strong>).
        </>
      ),
    },
    {
      icone: <IconCheck size={16} />,
      texto: `O seu WhatsApp abre com a mensagem pronta, já com o nome d${T.art} ${T.s}, o serviço, a data e a hora. É só apertar enviar.`,
    },
  ]

  const dicas = [
    `Assine com o seu nome ou o do seu negócio. ${T.art.toUpperCase()} ${T.s} reconhece quem está falando e confia na mensagem.`,
    `Chame pelo nome: a etiqueta “Nome d${T.art} ${T.s}” vira o nome de verdade na hora de enviar.`,
    'Escreva do seu jeito, curto, como você já conversa. Mensagem com cara de robô é a que a pessoa ignora.',
  ]

  return (
    <>
      <Cabecalho titulo="Avisos manuais" subtitulo="Saem do seu WhatsApp, com o seu nome" />
      <div className={CONTAINER}>
        {/* ── EDITOR + CELULAR ──────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
          <div>
            <TituloSecao acao={<Chip tom={textoSeu ? 'ok' : 'neutro'}>{textoSeu ? 'Texto seu' : 'Texto padrão'}</Chip>}>
              Mensagem de lembrete
            </TituloSecao>
            <div className="admin-card p-4 lg:p-5">
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                {`O que você manda na véspera pr${T.art} ${T.s} não esquecer do horário. Edite o texto abaixo e veja como chega no celular d${T.art === 'a' ? 'ela' : 'ele'}.`}
              </p>

              <textarea
                ref={campo}
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                rows={6}
                disabled={gravado === null}
                aria-label="Texto do lembrete"
                className="w-full text-[15px] rounded-xl px-3 py-2.5 leading-relaxed mt-4 disabled:opacity-60"
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
                {`Inserir dados d${T.art} ${T.s}`}
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
                Cada etiqueta vira o dado real de quem agendou na hora de enviar.
              </p>

              {erro && (
                <p className="text-[13px] mt-3" style={{ color: 'var(--admin-danger)' }}>
                  {erro}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap mt-5">
                <button
                  type="button"
                  disabled={salvando || gravado === null || (!mudou && !salvo)}
                  onClick={salvar}
                  className="text-[15px] font-bold px-5 py-3 rounded-xl disabled:opacity-60"
                  style={{ background: WA.gradiente, color: '#fff', boxShadow: WA.sombra }}
                >
                  {salvando ? 'Salvando…' : salvo ? 'Salvo' : 'Salvar mensagem'}
                </button>
                {mudou && (
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--admin-warning, #B45309)' }}>
                    Alterações não salvas
                  </span>
                )}
                {corpo !== DEFAULT_REMINDER_TEMPLATE && (
                  <button
                    type="button"
                    onClick={() => setCorpo(DEFAULT_REMINDER_TEMPLATE)}
                    className="text-[13px] underline underline-offset-2"
                    style={{ color: 'var(--admin-text-faded)' }}
                  >
                    Voltar ao texto padrão
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* O cabeçalho do celular é o NOME DELA, porque sai do WhatsApp
              dela — é isso que faz a cliente reconhecer quem mandou. */}
          <div className="lg:sticky lg:top-24">
            <TituloSecao>{`No celular d${T.art} ${T.poss} ${T.s}`}</TituloSecao>
            <TelaWhatsApp remetente={businessName} numero={numero} texto={previa} />
            <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--admin-text-faded)' }}>
              Exemplo com dados fictícios. Muda na hora enquanto você digita.
            </p>
          </div>
        </div>

        {/* ── COMO FUNCIONA ─────────────────────────────── */}
        <TituloSecao>Como funciona</TituloSecao>
        <div className="admin-card p-4 lg:p-5">
          <ol className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {passos.map((p, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ width: 28, height: 28, background: WA.fundo, border: `1px solid ${WA.borda}`, color: WA.forte }}
                  aria-hidden="true"
                >
                  {p.icone}
                </span>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                  <span className="font-bold" style={{ color: 'var(--admin-text)' }}>{i + 1}. </span>
                  {p.texto}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-[12px] mt-4" style={{ color: 'var(--admin-text-faded)' }}>
            Sai do seu número · você aperta enviar · não consome pacote de mensagens
          </p>
        </div>

        {/* ── DICAS ─────────────────────────────────────── */}
        <TituloSecao>Dicas pra mensagem funcionar</TituloSecao>
        <div className="admin-card p-4 lg:p-5">
          <ul className="space-y-2.5">
            {dicas.map((d) => (
              <li key={d} className="flex gap-2.5 items-start text-[13.5px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: WA.forte }} aria-hidden="true">
                  <IconCheck size={15} />
                </span>
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* ── PONTE PRO AUTOMÁTICO ──────────────────────── */}
        <Link
          href="/admin/whatsapp"
          className="admin-card p-4 lg:p-5 mt-4 mb-6 flex items-center gap-3 transition-transform hover:scale-[1.01]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Quer que o lembrete saia sozinho?
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Nos avisos automáticos o sistema manda sem você apertar nada.
            </p>
          </div>
          <span style={{ color: 'var(--admin-text-faded)' }} aria-hidden="true">
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>
    </>
  )
}
