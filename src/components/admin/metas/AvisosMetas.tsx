'use client'
/* Interruptor "Avisos no celular" da aba Metas (06/11/2026).
   Usa GET/POST /api/admin/metas/avisos (v187). Só a dona troca (o banco
   confere owner_id); a gerente só vê o estado. Depois de gravar, a tela
   mostra o valor que o SERVIDOR devolveu (lido do banco), não o clique. */
import { useEffect, useState } from 'react'
import { IconBell } from '@/components/ui/Icon'

export default function AvisosMetas({ ehDona }: { ehDona: boolean }) {
  const [ligado, setLigado] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/admin/metas/avisos', { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ r, j })))
      .then(({ r, j }) => { if (vivo) { if (r.ok && typeof j.ligado === 'boolean') setLigado(j.ligado); else setErro('Não deu pra ler os avisos') } })
      .catch(() => { if (vivo) setErro('Não deu pra ler os avisos') })
    return () => { vivo = false }
  }, [])

  async function trocar() {
    if (!ehDona || ligado === null || salvando) return
    setSalvando(true)
    setErro(null)
    try {
      const r = await fetch('/api/admin/metas/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ligado: !ligado }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j && typeof j.ligado === 'boolean') setLigado(j.ligado)
      else setErro('Não salvou. Tente de novo.')
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  if (ligado === null && !erro) return null
  const desabilitado = !ehDona || ligado === null || salvando
  return (
    <div data-testid="avisos-metas" className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0" style={{ color: 'var(--admin-text-mute)' }}><IconBell size={16} /></span>
        <div className="min-w-0">
          <b className="block text-[14px] leading-tight" style={{ color: 'var(--admin-text)' }}>Avisos no celular</b>
          <small className="block text-[12px] leading-tight mt-0.5" style={{ color: erro ? 'var(--admin-danger)' : 'var(--admin-text-faded)' }}>
            {erro ?? (ehDona ? (ligado ? 'Ritmo, reta final e fechamento do mês' : 'Desligados') : `${ligado ? 'Ligados' : 'Desligados'} · só a dona muda`)}
          </small>
        </div>
      </div>
      {ligado !== null && (
        <button
          type="button"
          role="switch"
          aria-checked={ligado}
          aria-label="Avisos no celular"
          disabled={desabilitado}
          onClick={trocar}
          className="relative shrink-0 rounded-full transition-colors"
          style={{ width: 46, height: 28, background: ligado ? 'var(--admin-accent)' : 'var(--admin-border-hi)', opacity: !ehDona ? 0.55 : salvando ? 0.7 : 1, cursor: desabilitado ? 'default' : 'pointer' }}
        >
          <span className="absolute top-[3px] rounded-full bg-white transition-all" style={{ width: 22, height: 22, left: ligado ? 21 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
        </button>
      )}
    </div>
  )
}
