'use client'
/* ═══════════════════════════════════════════════════════════════
   AVISOS MANUAIS — o texto que abre no botão "Enviar WhatsApp"
   Morava como seção "Você manda" no fim de /admin/whatsapp, embaixo de tudo
   que é do disparo automático. Em 07/10/2026 a Rosy procurou onde editar o
   lembrete que ela manda na mão e não achou — e o Eduardo, olhando o menu,
   achou que a tela tinha sumido. Manual (sai do número dela, grátis) e
   automático (sai do número do AgendaPRO, pacote) são coisas diferentes, então
   cada um ganhou o seu item no menu.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react'
import { termoPessoa } from '@/lib/segmento'
import { Cabecalho, CONTAINER, formatarNumero } from './WhatsAppPainel'
import VoceManda, { VoceMandaLista, type Qual, type TextosManuais } from './VoceManda'

export default function AvisosManuaisPainel({
  businessName,
  businessPhone,
  category,
}: {
  businessName: string
  businessPhone?: string | null
  category?: string | null
}) {
  /* Store diferente das réguas: businesses.whatsapp_*_template, não message_rules. */
  const [manuais, setManuais] = useState<TextosManuais | null>(null)
  const [aberto, setAberto] = useState<Qual | null>(null)
  const T = termoPessoa(category ?? null)

  useEffect(() => {
    void fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((j) =>
        setManuais({
          confirmation: String(j?.confirmation ?? ''),
          reminder: String(j?.reminder ?? ''),
        }),
      )
      .catch(() => null)
  }, [])

  async function salvarManual(qual: Qual, corpo: string): Promise<boolean> {
    try {
      const r = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [qual]: corpo }),
      })
      if (!r.ok) return false
      /* Lê de volta o que a rota devolveu, não o que eu mandei: é a única
         prova de que gravou. */
      const j = await r.json().catch(() => null)
      setManuais({
        confirmation: String(j?.confirmation ?? corpo),
        reminder: String(j?.reminder ?? corpo),
      })
      return true
    } catch {
      return false
    }
  }

  if (aberto) {
    return (
      <>
        <Cabecalho
          titulo={aberto === 'confirmation' ? 'Confirmação' : 'Lembrete'}
          subtitulo="Você aperta enviar · sai do seu número"
          onVoltar={() => setAberto(null)}
        />
        <div className={CONTAINER}>
          <div className="lg:max-w-2xl">
            <VoceManda
              T={T}
              qual={aberto}
              inicial={manuais?.[aberto] ?? ''}
              negocio={businessName}
              numero={businessPhone ? formatarNumero(businessPhone) : ''}
              categoria={category ?? null}
              onSalvar={salvarManual}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Avisos manuais" subtitulo="Saem do seu WhatsApp, com o seu nome" />
      <div className={CONTAINER}>
        <div className="lg:max-w-2xl">
          <VoceMandaLista
            T={T}
            textos={manuais}
            negocio={businessName}
            categoria={category ?? null}
            onAbrir={setAberto}
          />
        </div>
      </div>
    </>
  )
}
