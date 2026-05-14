'use client'

import { useRef, useState } from 'react'
import type { ImportSource, ImportReport, DedupeStrategy } from '@/lib/importers'
import { IconUpload, IconFile, IconClose } from '@/components/ui/Icon'

type Step = 'upload' | 'preview' | 'done'

// Fonte universal: connector csv-manual tem parsing tolerante a header
// (sem acento, case-insensitive) e funciona pra qualquer arquivo CSV/XLSX
// vindo de Salão 365, Trinks, Booksy, Excel próprio etc. Mantemos um
// connector dedicado pra cada sistema só pra agendamentos no futuro.
const UNIVERSAL_SOURCE: ImportSource = 'csv-manual'

export default function ImportarView({
  businessId,
  businessName,
}: {
  businessId: string
  businessName: string
}) {
  const [step, setStep] = useState<Step>('upload')
  const [clientsFile, setClientsFile] = useState<File | null>(null)
  const [dedupe, setDedupe] = useState<DedupeStrategy>('external-id-then-phone')
  const [preview, setPreview] = useState<ImportReport | null>(null)
  const [commit, setCommit] = useState<ImportReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep('upload')
    setClientsFile(null)
    setPreview(null)
    setCommit(null)
    setError(null)
  }

  async function runPreview() {
    if (!clientsFile) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('source', UNIVERSAL_SOURCE)
      form.set('businessId', businessId)
      form.set('dedupe', dedupe)
      form.set('clientsCsv', clientsFile)

      const res = await fetch('/api/import/preview', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Erro ao gerar preview.')
        return
      }
      setPreview(data.report as ImportReport)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function runCommit() {
    if (!clientsFile) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('source', UNIVERSAL_SOURCE)
      form.set('businessId', businessId)
      form.set('dedupe', dedupe)
      form.set('clientsCsv', clientsFile)

      const res = await fetch('/api/import/commit', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Erro ao importar.')
        return
      }
      setCommit(data.report as ImportReport)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6" style={{ color: 'var(--admin-text-1)' }}>
      {step === 'upload' && (
        <section className="space-y-5">
          <div>
            <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
              Importando para: <strong>{businessName}</strong>
            </p>
            <h2 className="text-lg font-semibold mt-1">Importar lista de clientes</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--admin-text-2)' }}>
              Sobe um arquivo <strong>CSV ou Excel</strong> exportado do teu sistema atual
              (Salão 365, Trinks, Booksy, planilha própria, etc). O AgendaPRO detecta as
              colunas automaticamente.
            </p>
          </div>

          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-2)',
            }}
          >
            <strong style={{ color: 'var(--admin-text-1)' }}>O que o arquivo precisa ter</strong>
            <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
              <li>Coluna de <strong>nome</strong> (obrigatório)</li>
              <li>Coluna de <strong>telefone</strong> ou celular (obrigatório)</li>
              <li>Email · aniversário · observações (opcionais)</li>
            </ul>
          </div>

          <UploadField
            id="clients-file"
            label="Arquivo de clientes"
            sublabel="CSV ou Excel · até alguns MB"
            file={clientsFile}
            onChange={setClientsFile}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Se já existir cliente com mesmo telefone</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dedupe"
                checked={dedupe === 'external-id-then-phone'}
                onChange={() => setDedupe('external-id-then-phone')}
              />
              Atualizar dados (recomendado)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dedupe"
                checked={dedupe === 'skip'}
                onChange={() => setDedupe('skip')}
              />
              Pular sem mexer
            </label>
          </fieldset>

          <button
            onClick={runPreview}
            disabled={!clientsFile || loading}
            className="w-full rounded-xl py-3 font-medium transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--admin-accent, #4f46e5)',
              color: 'white',
            }}
          >
            {loading ? 'Analisando...' : 'Pré-visualizar'}
          </button>
        </section>
      )}

      {step === 'preview' && preview && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pré-visualização</h2>
          <ReportTable report={preview} dryRun />

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 rounded-xl py-3 font-medium"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-1)',
              }}
            >
              Voltar
            </button>
            <button
              onClick={runCommit}
              disabled={loading}
              className="flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-50"
              style={{
                background: 'var(--admin-accent, #4f46e5)',
                color: 'white',
              }}
            >
              {loading ? 'Importando...' : 'Confirmar importação'}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && commit && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Importação concluída</h2>
          <ReportTable report={commit} dryRun={false} />
          <button
            onClick={reset}
            className="w-full rounded-xl py-3 font-medium"
            style={{
              background: 'var(--admin-accent, #4f46e5)',
              color: 'white',
            }}
          >
            Importar mais
          </button>
        </section>
      )}

      {error && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid #dc2626' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

/**
 * UploadField — esconde o <input type="file"> nativo (iOS renderiza só
 * texto "Escolher arquivo · nenhum arquivo selecionado", confunde user)
 * e mostra:
 *  - Estado vazio: área grande com IconUpload + "Selecionar arquivo"
 *  - Estado preenchido: card com IconFile + nome/tamanho + botão Trocar
 *
 * Clique no label dispara o file picker do dispositivo (mesmo comportamento
 * em iOS Safari, Android Chrome e desktop).
 */
function UploadField({
  id,
  label,
  sublabel,
  file,
  onChange,
}: {
  id: string
  label: string
  sublabel: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="sr-only"
      />

      {!file ? (
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-6 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'var(--admin-surface)',
            border: '2px dashed var(--admin-border)',
            color: 'var(--admin-text-1)',
          }}
        >
          <IconUpload size={28} />
          <div className="text-center">
            <div className="font-medium">{label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--admin-text-2)' }}>
              Toque pra selecionar · {sublabel}
            </div>
          </div>
        </label>
      ) : (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <IconFile size={24} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
              {formatBytes(file.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            aria-label="Remover arquivo"
            className="flex-shrink-0 inline-flex items-center justify-center rounded-full transition-transform hover:scale-105"
            style={{
              width: 32,
              height: 32,
              background: 'var(--admin-bg, transparent)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-2)',
            }}
          >
            <IconClose size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ReportTable({ report, dryRun }: { report: ImportReport; dryRun: boolean }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <div className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
        {dryRun ? 'Pré-visualização · nada foi gravado' : 'Gravado'}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Lidos" value={report.clients.parsed} />
        <Stat
          label={dryRun ? 'Novos a criar' : 'Novos criados'}
          value={report.clients.inserted}
          highlight
        />
        <Stat
          label={dryRun ? 'A atualizar' : 'Atualizados'}
          value={report.clients.updated}
        />
        <Stat label="Pulados" value={report.clients.skipped} />
        {report.clients.invalid > 0 && (
          <Stat label="Inválidos" value={report.clients.invalid} warn />
        )}
      </div>

      {report.warnings.length > 0 && (
        <details>
          <summary className="text-sm font-medium cursor-pointer">
            {report.warnings.length} avisos
          </summary>
          <ul className="mt-2 space-y-1 text-xs max-h-48 overflow-y-auto">
            {report.warnings.slice(0, 200).map((w, i) => (
              <li key={i} style={{ color: 'var(--admin-text-2)' }}>
                {w.row ? `linha ${w.row}: ` : ''}
                {w.message}
              </li>
            ))}
            {report.warnings.length > 200 && (
              <li style={{ color: 'var(--admin-text-2)' }}>
                ... e mais {report.warnings.length - 200} avisos
              </li>
            )}
          </ul>
        </details>
      )}

      <div className="text-xs pt-1" style={{ color: 'var(--admin-text-2)' }}>
        {report.durationMs} ms
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string
  value: number
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
        {label}
      </span>
      <span
        className="text-lg font-semibold"
        style={{
          color: warn ? '#dc2626' : highlight ? 'var(--admin-accent, #4f46e5)' : 'var(--admin-text-1)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
