'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CARD_BRANDS,
  CARD_BRAND_LABEL,
  type CardBrand,
  type CardType,
  type MerchantDevice,
  type MerchantDeviceFee,
} from '@/lib/types'
import { IconPlus, IconTrash, IconChevronRight, IconClose } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

type Props = {
  businessId: string
}

export default function MaquininhasTab({ businessId }: Props) {
  const supabase = createClient()
  const [devices, setDevices] = useState<MerchantDevice[]>([])
  const [feesByDevice, setFeesByDevice] = useState<Record<string, MerchantDeviceFee[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form de novo device
  const [newDeviceName, setNewDeviceName] = useState('')
  const [addingDevice, setAddingDevice] = useState(false)

  // Expanded state (qual device tá aberto)
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null)

  // Form de nova taxa (por device)
  const [newFee, setNewFee] = useState<{
    brand: CardBrand
    card_type: CardType
    rate_percent: string
  }>({ brand: 'visa', card_type: 'credit', rate_percent: '' })
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
    setAddingFee(true)
    setError(null)

    const { data, error: e } = await supabase
      .from('merchant_device_fees')
      .insert({
        device_id: deviceId,
        brand: newFee.brand,
        card_type: newFee.card_type,
        rate_percent: rate,
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
    setNewFee({ brand: 'visa', card_type: 'credit', rate_percent: '' })
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
      </div>

      {devices.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nenhuma maquininha cadastrada ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Adicione acima pra começar a controlar taxas de cartão.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => {
            const isOpen = expandedDevice === d.id
            const fees = feesByDevice[d.id] ?? []
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
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {fees.length === 0
                        ? 'Sem taxas cadastradas'
                        : `${fees.length} taxa${fees.length > 1 ? 's' : ''} cadastrada${fees.length > 1 ? 's' : ''}`}
                    </p>
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
