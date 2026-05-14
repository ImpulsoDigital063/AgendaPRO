'use client'

import { useState } from 'react'
import { CONNECTORS, type ImportSource, type ImportReport, type DedupeStrategy } from '@/lib/importers'

type Step = 'select' | 'upload' | 'preview' | 'done'

const SOURCES_ENABLED: ImportSource[] = ['salao365', 'csv-manual']

export default function ImportarView({
  businessId,
  businessName,
}: {
  businessId: string
  businessName: string
}) {
  const [step, setStep] = useState<Step>('select')
  const [source, setSource] = useState<ImportSource | null>(null)
  const [clientsFile, setClientsFile] = useState<File | null>(null)
  const [appointmentsFile, setAppointmentsFile] = useState<File | null>(null)
  const [dedupe, setDedupe] = useState<DedupeStrategy>('external-id-then-phone')
  const [preview, setPreview] = useState<ImportReport | null>(null)
  const [commit, setCommit] = useState<ImportReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep('select')
    setSource(null)
    setClientsFile(null)
    setAppointmentsFile(null)
    setPreview(null)
    setCommit(null)
    setError(null)
  }

  async function runPreview() {
    if (!source || !clientsFile) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('source', source)
      form.set('businessId', businessId)
      form.set('dedupe', dedupe)
      form.set('clientsCsv', clientsFile)
      if (appointmentsFile) form.set('appointmentsCsv', appointmentsFile)

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
    if (!source || !clientsFile) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('source', source)
      form.set('businessId', businessId)
      form.set('dedupe', dedupe)
      form.set('clientsCsv', clientsFile)
      if (appointmentsFile) form.set('appointmentsCsv', appointmentsFile)

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
      {step === 'select' && (
        <section className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Importando para: <strong>{businessName}</strong>
          </p>
          <h2 className="text-lg font-semibold">De qual sistema você quer importar?</h2>
          <div className="grid grid-cols-1 gap-3">
            {SOURCES_ENABLED.map((id) => {
              const c = CONNECTORS[id]
              return (
                <button
                  key={id}
                  onClick={() => {
                    setSource(id)
                    setStep('upload')
                  }}
                  className="text-left rounded-xl p-4 transition-transform hover:scale-[1.01]"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--admin-text-2)' }}>
                    {c.hint}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 'upload' && source && (
        <section className="space-y-4">
          <button
            onClick={() => setStep('select')}
            className="text-sm underline"
            style={{ color: 'var(--admin-text-2)' }}
          >
            Trocar de sistema
          </button>
          <h2 className="text-lg font-semibold">Enviar arquivo</h2>
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            {CONNECTORS[source].hint}
          </p>

          <label className="block text-sm font-medium">CSV de clientes (obrigatório)</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setClientsFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {clientsFile && (
            <p className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
              {clientsFile.name} · {Math.round(clientsFile.size / 1024)} KB
            </p>
          )}

          {source === 'salao365' && (
            <>
              <label className="block text-sm font-medium pt-2">
                CSV de agendamentos (opcional)
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setAppointmentsFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
            </>
          )}

          <fieldset className="pt-4 space-y-2">
            <legend className="text-sm font-medium">Se já existir cliente com mesmo telefone:</legend>
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

function ReportTable({ report, dryRun }: { report: ImportReport; dryRun: boolean }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <div className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
        Origem: {report.source} · {dryRun ? 'Sem gravar' : 'Gravado'}
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
