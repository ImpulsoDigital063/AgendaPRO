'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  appointmentId: string
  token: string
  alreadyCancelled: boolean
  businessSlug?: string
}

export default function CancelarConfirm({ appointmentId, token, alreadyCancelled, businessSlug }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    alreadyCancelled ? 'done' : 'idle'
  )

  async function handleCancel() {
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/appointment/action?id=${appointmentId}&action=cancelled&token=${token}`
      )
      if (res.ok) {
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">❌</div>
        <div>
          <p className="font-semibold text-gray-900">Agendamento cancelado</p>
          <p className="text-gray-400 text-sm mt-1">
            {alreadyCancelled
              ? 'Este agendamento já havia sido cancelado.'
              : 'O estabelecimento foi notificado.'}
          </p>
        </div>
        {businessSlug && (
          <Link
            href={`/${businessSlug}`}
            className="block w-full bg-gray-900 text-white text-center py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            Fazer novo agendamento
          </Link>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-center text-red-500 text-sm">
        Erro ao cancelar. Tente novamente ou entre em contato com o estabelecimento.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleCancel}
        disabled={status === 'loading'}
        className="w-full bg-red-500 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Cancelando...' : 'Sim, cancelar meu agendamento'}
      </button>

      {businessSlug && (
        <Link
          href={`/${businessSlug}`}
          className="block w-full text-center text-gray-400 text-sm py-2"
        >
          Voltar sem cancelar
        </Link>
      )}
    </div>
  )
}
