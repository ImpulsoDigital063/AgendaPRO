'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional } from '@/lib/types'

type Props = {
  businessId: string
  professionals: Professional[]
  onChange: (professionals: Professional[]) => void
}

export default function ProfissionaisTab({ businessId, professionals, onChange }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)

    const { data, error } = await supabase
      .from('professionals')
      .insert({ business_id: businessId, name: newName.trim(), active: true })
      .select()
      .single()

    if (!error && data) {
      onChange([...professionals, data])
      setNewName('')
    }
    setAdding(false)
  }

  async function toggleActive(prof: Professional) {
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ active: !prof.active })
      .eq('id', prof.id)

    if (!error) {
      onChange(professionals.map((p) => p.id === prof.id ? { ...p, active: !p.active } : p))
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este profissional? Os agendamentos existentes não serão afetados.')) return
    setLoadingId(id)

    const { error } = await supabase.from('professionals').delete().eq('id', id)
    if (!error) {
      onChange(professionals.filter((p) => p.id !== id))
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-3">
      {professionals.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum profissional cadastrado.</p>
        </div>
      )}

      {professionals.map((prof) => (
        <div
          key={prof.id}
          className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              prof.active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {prof.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className={`font-medium text-sm ${prof.active ? 'text-gray-900' : 'text-gray-400'}`}>
                {prof.name}
              </p>
              <p className="text-xs text-gray-400">{prof.active ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleActive(prof)}
              disabled={loadingId === prof.id}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                prof.active
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {prof.active ? 'Desativar' : 'Ativar'}
            </button>
            <button
              onClick={() => handleDelete(prof.id)}
              disabled={loadingId === prof.id}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      {/* Adicionar profissional */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Adicionar profissional</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do profissional"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {adding ? '...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
