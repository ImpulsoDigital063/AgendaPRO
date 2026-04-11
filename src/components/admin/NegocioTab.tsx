'use client'

import { useState } from 'react'
import type { Business } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

type Props = {
  business: Business
}

export default function NegocioTab({ business }: Props) {
  const [name, setName] = useState(business.name)
  const [phone, setPhone] = useState(business.phone || '')
  const [address, setAddress] = useState(business.address || '')
  const [description, setDescription] = useState(business.description || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSave() {
    if (!name.trim()) {
      setError('O nome do negócio é obrigatório.')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
      })
      .eq('id', business.id)

    setSaving(false)

    if (err) {
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Dados do negócio</h3>

        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Nome do seu negócio"
          />
        </div>

        {/* Telefone / WhatsApp */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="(63) 99999-9999"
          />
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Endereço</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Rua, número, bairro"
          />
        </div>

        {/* Descrição / Categoria */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Descrição ou categoria</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            placeholder="Ex: Barbearia, Salão de beleza, Clínica de estética..."
          />
        </div>

        {error && (
          <p className="text-red-500 text-xs">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          } disabled:opacity-50`}
        >
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar alterações'}
        </button>
      </div>

      {/* Info slug — somente leitura */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Link público</h3>
        <p className="text-gray-400 text-xs mb-3">Seu endereço de agendamento online.</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
          <span className="text-gray-400 text-xs">agendapro.com.br/</span>
          <span className="text-gray-900 text-sm font-medium">{business.slug}</span>
        </div>
        <p className="text-gray-300 text-xs mt-2">O endereço não pode ser alterado após o cadastro.</p>
      </div>
    </div>
  )
}
