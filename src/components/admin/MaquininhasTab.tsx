'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CARD_BRANDS,
  CARD_BRAND_LABEL,
  type CardBrand,
  type CardType,
  type MerchantDevice,
  type MerchantDeviceFee,
} from '@/lib/types'
import {
  IconPlus,
  IconTrash,
  IconChevronRight,
  IconCheck,
  IconSparkles,
  IconTrendingUp,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

type Props = {
  businessId: string
}

// v91 (29/05/2026) · Presets BR com taxas reais aproximadas pra acelerar
// onboarding. Marko/Letícia ajustam depois cada taxa específica do contrato.
// Cada preset gera 1 device + 6 fees em batch.
type PresetFee = {
  brand: CardBrand
  card_type: CardType
  rate_percent: number
  allows_installments?: boolean
  installments_max?: number
  installment_rate_percent?: number
}
type Preset = {
  name: string
  fees: PresetFee[]
}
const PRESETS: Preset[] = [
  {
    name: 'InfinitePay',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.95 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.95 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.10 },
      { brand: 'visa', card_type: 'credit', rate_percent: 3.15, allows_installments: true, installments_max: 12, installment_rate_percent: 3.50 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 3.15, allows_installments: true, installments_max: 12, installment_rate_percent: 3.50 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.35, allows_installments: true, installments_max: 12, installment_rate_percent: 3.75 },
    ],
  },
  {
    name: 'Stone',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.99 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.99 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.15 },
      { brand: 'visa', card_type: 'credit', rate_percent: 3.49, allows_installments: true, installments_max: 12, installment_rate_percent: 3.89 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 3.49, allows_installments: true, installments_max: 12, installment_rate_percent: 3.89 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.69, allows_installments: true, installments_max: 12, installment_rate_percent: 4.10 },
    ],
  },
  {
    name: 'Cielo Lio',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.89 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.89 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.05 },
      { brand: 'visa', card_type: 'credit', rate_percent: 3.12, allows_installments: true, installments_max: 12, installment_rate_percent: 3.51 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 3.12, allows_installments: true, installments_max: 12, installment_rate_percent: 3.51 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.30, allows_installments: true, installments_max: 12, installment_rate_percent: 3.69 },
    ],
  },
  {
    name: 'PagSeguro',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.89 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.89 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.10 },
      { brand: 'visa', card_type: 'credit', rate_percent: 3.19, allows_installments: true, installments_max: 12, installment_rate_percent: 3.69 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 3.19, allows_installments: true, installments_max: 12, installment_rate_percent: 3.69 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.39, allows_installments: true, installments_max: 12, installment_rate_percent: 3.89 },
    ],
  },
  {
    name: 'Mercado Pago',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.99 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.99 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.15 },
      { brand: 'visa', card_type: 'credit', rate_percent: 3.49, allows_installments: true, installments_max: 12, installment_rate_percent: 3.89 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 3.49, allows_installments: true, installments_max: 12, installment_rate_percent: 3.89 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.69, allows_installments: true, installments_max: 12, installment_rate_percent: 4.10 },
    ],
  },
  {
    name: 'Sumup',
    fees: [
      { brand: 'visa', card_type: 'debit', rate_percent: 1.90 },
      { brand: 'mastercard', card_type: 'debit', rate_percent: 1.90 },
      { brand: 'elo', card_type: 'debit', rate_percent: 2.05 },
      { brand: 'visa', card_type: 'credit', rate_percent: 2.90, allows_installments: true, installments_max: 12, installment_rate_percent: 3.80 },
      { brand: 'mastercard', card_type: 'credit', rate_percent: 2.90, allows_installments: true, installments_max: 12, installment_rate_percent: 3.80 },
      { brand: 'elo', card_type: 'credit', rate_percent: 3.10, allows_installments: true, installments_max: 12, installment_rate_percent: 3.95 },
    ],
  },
]

// Cobertura mínima esperada · 4 essenciais. Sem essas, sistema cai pra taxa 0
// em pagamentos cartão silenciosamente (regra λ.diagnostico-nivel-certo).
const COVERAGE_MIN: Array<{ brand: CardBrand; card_type: CardType }> = [
  { brand: 'visa', card_type: 'debit' },
  { brand: 'visa', card_type: 'credit' },
  { brand: 'mastercard', card_type: 'debit' },
  { brand: 'mastercard', card_type: 'credit' },
]

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function MaquininhasTab({ businessId }: Props) {
  const supabase = createClient()
  const [devices, setDevices] = useState<MerchantDevice[]>([])
  const [feesByDevice, setFeesByDevice] = useState<Record<string, MerchantDeviceFee[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // v91 · KPI de impacto no mês corrente
  const [monthStats, setMonthStats] = useState<{
    feesCents: number
    grossCents: number
    payments: number
  }>({ feesCents: 0, grossCents: 0, payments: 0 })

  // Form de novo device
  const [newDeviceName, setNewDeviceName] = useState('')
  const [addingDevice, setAddingDevice] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [installingPreset, setInstallingPreset] = useState<string | null>(null)

  // Expanded state (qual device tá aberto)
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null)

  // Form de nova taxa (por device)
  const [newFee, setNewFee] = useState<{
    brand: CardBrand
    card_type: CardType
    rate_percent: string
    allows_installments: boolean
    installments_max: string
    installment_rate_percent: string
  }>({
    brand: 'visa',
    card_type: 'credit',
    rate_percent: '',
    allows_installments: false,
    installments_max: '1',
    installment_rate_percent: '',
  })
  const [addingFee, setAddingFee] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<MerchantDevice | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    const { data: devs, error: e1 } = await supabase
      .from('merchant_devices')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })

    if (e1) {
      setError(`Erro ao listar maquininhas: ${e1.message}`)
      setLoading(false)
      return
    }

    const deviceList = (devs ?? []) as MerchantDevice[]
    setDevices(deviceList)

    if (deviceList.length > 0) {
      const { data: fees, error: e2 } = await supabase
        .from('merchant_device_fees')
        .select('*')
        .in('device_id', deviceList.map((d) => d.id))
        .order('brand')

      if (e2) {
        setError(`Erro ao listar taxas: ${e2.message}`)
      } else {
        const grouped: Record<string, MerchantDeviceFee[]> = {}
        for (const f of (fees ?? []) as MerchantDeviceFee[]) {
          if (!grouped[f.device_id]) grouped[f.device_id] = []
          grouped[f.device_id].push(f)
        }
        setFeesByDevice(grouped)
      }
    }

    // KPI · taxas pagas neste mês (cartão)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: paid } = await supabase
      .from('appointments')
      .select('total_price, payment_fee_percent')
      .eq('business_id', businessId)
      .eq('payment_method', 'card')
      .gte('paid_at', firstDay)
      .not('paid_at', 'is', null)

    if (paid) {
      let feesCents = 0
      let grossCents = 0
      let payments = 0
      for (const a of paid as Array<{ total_price: number | null; payment_fee_percent: number | null }>) {
        const price = a.total_price ?? 0
        if (price <= 0) continue
        const rate = a.payment_fee_percent ?? 0
        feesCents += Math.round(price * rate)
        grossCents += Math.round(price * 100)
        payments += 1
      }
      setMonthStats({ feesCents, grossCents, payments })
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function handleAddDevice() {
    const name = newDeviceName.trim()
    if (!name) return
    setAddingDevice(true)
    setError(null)

    const { data, error: e } = await supabase
      .from('merchant_devices')
      .insert({ business_id: businessId, name, active: true })
      .select()
      .single()

    setAddingDevice(false)
    if (e) {
      setError(`Erro ao adicionar: ${e.message}`)
      return
    }
    setDevices((prev) => [...prev, data as MerchantDevice])
    setNewDeviceName('')
    setExpandedDevice(data.id)
  }

  async function handleInstallPreset(preset: Preset) {
    setError(null)
    // Evita duplicar · se já existe device com mesmo nome, só expande
    const existing = devices.find((d) => d.name.toLowerCase() === preset.name.toLowerCase())
    if (existing) {
      setExpandedDevice(existing.id)
      setShowPresets(false)
      return
    }
    setInstallingPreset(preset.name)
    const { data: dev, error: e } = await supabase
      .from('merchant_devices')
      .insert({ business_id: businessId, name: preset.name, active: true })
      .select()
      .single()
    if (e || !dev) {
      setInstallingPreset(null)
      setError(`Erro ao criar ${preset.name}: ${e?.message ?? 'desconhecido'}`)
      return
    }

    const feeRows = preset.fees.map((f) => ({
      device_id: dev.id,
      brand: f.brand,
      card_type: f.card_type,
      rate_percent: f.rate_percent,
      allows_installments: f.allows_installments ?? false,
      installments_max: f.installments_max ?? 1,
      installment_rate_percent: f.installment_rate_percent ?? null,
      active: true,
    }))
    const { data: insertedFees, error: e2 } = await supabase
      .from('merchant_device_fees')
      .insert(feeRows)
      .select()

    setInstallingPreset(null)
    if (e2) {
      setError(`Maquininha criada mas falhou cadastrar taxas: ${e2.message}`)
      // Mantém o device criado · usuário cadastra taxas manualmente
      setDevices((prev) => [...prev, dev as MerchantDevice])
      setExpandedDevice(dev.id)
      setShowPresets(false)
      return
    }
    setDevices((prev) => [...prev, dev as MerchantDevice])
    setFeesByDevice((prev) => ({
      ...prev,
      [dev.id]: (insertedFees ?? []) as MerchantDeviceFee[],
    }))
    setExpandedDevice(dev.id)
    setShowPresets(false)
  }

  async function handleDeleteDevice(device: MerchantDevice) {
    setError(null)
    const { error: e } = await supabase
      .from('merchant_devices')
      .delete()
      .eq('id', device.id)

    if (e) {
      setError(`Erro ao remover: ${e.message}`)
      return
    }
    setDevices((prev) => prev.filter((d) => d.id !== device.id))
    setFeesByDevice((prev) => {
      const c = { ...prev }
      delete c[device.id]
      return c
    })
    setConfirmDelete(null)
  }

  async function handleAddFee(deviceId: string) {
    const rate = parseFloat(newFee.rate_percent.replace(',', '.'))
    if (isNaN(rate) || rate < 0 || rate >= 100) {
      setError('Taxa precisa estar entre 0 e 99,99%')
      return
    }
    const allowsInstall = newFee.allows_installments && newFee.card_type === 'credit'
    const installMax = allowsInstall ? Math.min(12, Math.max(1, parseInt(newFee.installments_max || '1', 10))) : 1
    const installRate = allowsInstall && newFee.installment_rate_percent
      ? parseFloat(newFee.installment_rate_percent.replace(',', '.'))
      : null
    if (allowsInstall && installRate != null && (isNaN(installRate) || installRate < 0 || installRate >= 100)) {
      setError('Taxa parcelada precisa estar entre 0 e 99,99%')
      return
    }
    setAddingFee(true)
    setError(null)

    const { data, error: e } = await supabase
      .from('merchant_device_fees')
      .insert({
        device_id: deviceId,
        brand: newFee.brand,
        card_type: newFee.card_type,
        rate_percent: rate,
        allows_installments: allowsInstall,
        installments_max: installMax,
        installment_rate_percent: installRate,
        active: true,
      })
      .select()
      .single()

    setAddingFee(false)
    if (e) {
      if (e.message?.includes('duplicate')) {
        setError('Já existe uma taxa pra essa bandeira + tipo. Remova a anterior antes.')
      } else {
        setError(`Erro: ${e.message}`)
      }
      return
    }

    setFeesByDevice((prev) => ({
      ...prev,
      [deviceId]: [...(prev[deviceId] ?? []), data as MerchantDeviceFee],
    }))
    setNewFee({
      brand: 'visa',
      card_type: 'credit',
      rate_percent: '',
      allows_installments: false,
      installments_max: '1',
      installment_rate_percent: '',
    })
  }

  async function handleDeleteFee(deviceId: string, feeId: string) {
    setError(null)
    const { error: e } = await supabase
      .from('merchant_device_fees')
      .delete()
      .eq('id', feeId)

    if (e) {
      setError(`Erro ao remover taxa: ${e.message}`)
      return
    }
    setFeesByDevice((prev) => ({
      ...prev,
      [deviceId]: (prev[deviceId] ?? []).filter((f) => f.id !== feeId),
    }))
  }

  const effectiveRate = useMemo(() => {
    if (monthStats.grossCents === 0) return 0
    return (monthStats.feesCents / monthStats.grossCents) * 100
  }, [monthStats])

  if (loading) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* v91 (A) · KPI custo de taxas no mês */}
      <div
        className="admin-card p-4"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 8%, var(--admin-surface)), var(--admin-surface))',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: 'var(--admin-accent)' }}>
            <IconTrendingUp size={16} />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Impacto das taxas neste mês
          </p>
        </div>
        {monthStats.payments === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Sem pagamentos em cartão este mês ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Pagou em taxas
              </p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                {formatBRL(monthStats.feesCents)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Taxa efetiva
              </p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {effectiveRate.toFixed(2).replace('.', ',')}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Pagamentos cartão
              </p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {monthStats.payments}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Maquininhas
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Cadastre cada maquininha (ex: InfinitePay, Stone) e a taxa % por bandeira. Quando o
            cliente pagar em cartão, o sistema calcula o valor líquido automaticamente.
          </p>
        </div>

        {error && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)',
              color: 'var(--admin-danger,#EF4444)',
              border: '1px solid color-mix(in srgb, var(--admin-danger,#EF4444) 30%, transparent)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDevice()}
            placeholder="Nome da maquininha (ex: InfinitePay)"
            className="admin-input flex-1 px-3 py-2.5 text-sm"
          />
          <button
            onClick={handleAddDevice}
            disabled={addingDevice || !newDeviceName.trim()}
            className="px-4 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--admin-accent)',
              color: '#fff',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <IconPlus size={14} /> Adicionar
            </span>
          </button>
        </div>

        {/* v91 (B) · Presets BR */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            className="text-xs font-semibold inline-flex items-center gap-1.5"
            style={{ color: 'var(--admin-accent)' }}
          >
            <IconSparkles size={12} />
            {showPresets ? 'Ocultar sugeridas' : 'Cadastrar rápido · escolher do catálogo BR'}
          </button>
          {showPresets && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const already = devices.some((d) => d.name.toLowerCase() === p.name.toLowerCase())
                const isInstalling = installingPreset === p.name
                return (
                  <button
                    key={p.name}
                    type="button"
                    disabled={isInstalling || already}
                    onClick={() => handleInstallPreset(p)}
                    className="text-left px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{
                      background: already
                        ? 'color-mix(in srgb, var(--admin-success,#10B981) 12%, transparent)'
                        : 'var(--admin-surface-hi)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{p.name}</span>
                      {already && (
                        <span style={{ color: 'var(--admin-success,#10B981)' }}>
                          <IconCheck size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {isInstalling ? 'Instalando…' : already ? 'Já cadastrada' : `${p.fees.length} taxas prontas`}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
          {showPresets && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
              Taxas aproximadas de mercado · ajuste depois com os valores do seu contrato.
            </p>
          )}
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nenhuma maquininha cadastrada ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Use o catálogo BR acima ou adicione manualmente pra controlar as taxas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => {
            const isOpen = expandedDevice === d.id
            const fees = feesByDevice[d.id] ?? []

            // v91 (C) · Checklist de cobertura
            const coveredKeys = new Set(fees.map((f) => `${f.brand}-${f.card_type}`))
            const missing = COVERAGE_MIN.filter(
              (c) => !coveredKeys.has(`${c.brand}-${c.card_type}`),
            )

            return (
              <div
                key={d.id}
                className="admin-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedDevice(isOpen ? null : d.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                      {d.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                        {fees.length === 0
                          ? 'Sem taxas cadastradas'
                          : `${fees.length} taxa${fees.length > 1 ? 's' : ''} cadastrada${fees.length > 1 ? 's' : ''}`}
                      </p>
                      {fees.length > 0 && missing.length === 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: 'color-mix(in srgb, var(--admin-success,#10B981) 18%, transparent)',
                            color: 'var(--admin-success,#10B981)',
                          }}
                        >
                          <IconCheck size={10} />
                          Cobertura OK
                        </span>
                      )}
                      {fees.length > 0 && missing.length > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: 'color-mix(in srgb, var(--admin-warning,#F59E0B) 18%, transparent)',
                            color: 'var(--admin-warning,#F59E0B)',
                          }}
                        >
                          {missing.length} faltando
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--admin-text-faded)' }}>
                    <IconChevronRight size={18} />
                  </span>
                </button>

                {isOpen && (
                  <div
                    className="border-t p-4 space-y-3"
                    style={{ borderColor: 'var(--admin-divider)' }}
                  >
                    {/* v91 (C) · Avisa cobertura incompleta */}
                    {missing.length > 0 && (
                      <div
                        className="text-xs px-3 py-2 rounded-lg"
                        style={{
                          background: 'color-mix(in srgb, var(--admin-warning,#F59E0B) 10%, transparent)',
                          color: 'var(--admin-text)',
                          border: '1px solid color-mix(in srgb, var(--admin-warning,#F59E0B) 25%, transparent)',
                        }}
                      >
                        <p className="font-semibold mb-1" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                          Sem essas taxas, pagamento entra com taxa zero:
                        </p>
                        <ul className="space-y-0.5">
                          {missing.map((m) => (
                            <li key={`${m.brand}-${m.card_type}`} style={{ color: 'var(--admin-text-mute)' }}>
                              · {CARD_BRAND_LABEL[m.brand]} {m.card_type === 'credit' ? 'Crédito' : 'Débito'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {fees.length > 0 && (
                      <div className="space-y-1.5">
                        {fees.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                            style={{ background: 'var(--admin-surface-hi)' }}
                          >
                            <span style={{ color: 'var(--admin-text)' }}>
                              <strong>{CARD_BRAND_LABEL[f.brand]}</strong>
                              <span style={{ color: 'var(--admin-text-mute)' }}>
                                {' '} · {f.card_type === 'credit' ? 'Crédito' : 'Débito'}
                              </span>
                              {f.allows_installments && f.installment_rate_percent != null && (
                                <span className="ml-2 text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                                  parcelado até {f.installments_max}x ({f.installment_rate_percent.toString().replace('.', ',')}%)
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums font-bold" style={{ color: 'var(--admin-accent)' }}>
                                {f.rate_percent.toString().replace('.', ',')}%
                              </span>
                              <button
                                onClick={() => handleDeleteFee(d.id, f.id)}
                                aria-label="Remover"
                                style={{ color: 'var(--admin-text-faded)' }}
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form de adicionar fee */}
                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{ background: 'var(--admin-surface-hi)', border: '1px dashed var(--admin-border-hi)' }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Adicionar taxa
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={newFee.brand}
                          onChange={(e) => setNewFee({ ...newFee, brand: e.target.value as CardBrand })}
                          className="admin-input text-sm py-2 px-2"
                        >
                          {CARD_BRANDS.map((b) => (
                            <option key={b} value={b}>
                              {CARD_BRAND_LABEL[b]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newFee.card_type}
                          onChange={(e) => setNewFee({ ...newFee, card_type: e.target.value as CardType })}
                          className="admin-input text-sm py-2 px-2"
                        >
                          <option value="credit">Crédito</option>
                          <option value="debit">Débito</option>
                        </select>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={newFee.rate_percent}
                            onChange={(e) => setNewFee({ ...newFee, rate_percent: e.target.value })}
                            placeholder="3,15"
                            className="admin-input text-sm py-2 px-2 pr-7 w-full"
                          />
                          <span
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: 'var(--admin-text-faded)' }}
                          >
                            %
                          </span>
                        </div>
                      </div>
                      {/* Parcelamento · só faz sentido pra crédito */}
                      {newFee.card_type === 'credit' && (
                        <div
                          className="rounded-lg p-2.5 space-y-2"
                          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
                        >
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newFee.allows_installments}
                              onChange={(e) => setNewFee({ ...newFee, allows_installments: e.target.checked })}
                            />
                            <span style={{ color: 'var(--admin-text)' }}>Permite parcelar</span>
                          </label>
                          {newFee.allows_installments && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                                  Máx parcelas
                                </p>
                                <select
                                  value={newFee.installments_max}
                                  onChange={(e) => setNewFee({ ...newFee, installments_max: e.target.value })}
                                  className="admin-input w-full text-sm py-1.5 px-1.5"
                                >
                                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                    <option key={n} value={n}>
                                      {n}x
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                                  Taxa parcelado (%)
                                </p>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={newFee.installment_rate_percent}
                                  onChange={(e) => setNewFee({ ...newFee, installment_rate_percent: e.target.value })}
                                  placeholder="4,50"
                                  className="admin-input w-full text-sm py-1.5 px-1.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => handleAddFee(d.id)}
                        disabled={addingFee || !newFee.rate_percent}
                        className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                        style={{ background: 'var(--admin-accent)', color: '#fff' }}
                      >
                        {addingFee ? 'Adicionando…' : 'Adicionar taxa'}
                      </button>
                    </div>

                    <button
                      onClick={() => setConfirmDelete(d)}
                      className="text-xs font-semibold inline-flex items-center gap-1.5"
                      style={{ color: 'var(--admin-danger,#EF4444)' }}
                    >
                      <IconTrash size={12} /> Remover maquininha
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmActionModal
          open={!!confirmDelete}
          title={`Remover "${confirmDelete.name}"?`}
          message="Todas as taxas cadastradas serão apagadas. Pagamentos antigos com essa maquininha preservam o snapshot da taxa aplicada na hora — não afeta histórico."
          confirmLabel="Remover"
          tone="danger"
          onConfirm={() => handleDeleteDevice(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
