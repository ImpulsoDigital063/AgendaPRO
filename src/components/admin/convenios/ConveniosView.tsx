'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconPlus, IconUsers, IconClose, IconCheck } from '@/components/ui/Icon'

/** Mesma máscara progressiva do NegocioTab (mantida local lá, copiada aqui
 *  pra não mexer numa tela que os 27 negócios usam). */
function maskPhoneProgressive(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export type EmpresaResumo = {
  id: string
  name: string
  cnpj: string | null
  contato_nome: string | null
  contato_telefone: string | null
  ativo: boolean
  total_funcionarios: number
  total_profissionais: number
  /** Quanto a empresa deve e há quantos dias está o atendimento mais antigo
   *  sem receber. Valor parado em silêncio é dinheiro que ninguém cobra. */
  aberto_valor: number
  aberto_qtd: number
  aberto_dias: number
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
/** Acima disso a linha fica em destaque: é hora de cobrar. */
const DIAS_PRA_COBRAR = 20

/**
 * Lista de empresas conveniadas + cadastro.
 *
 * O que importa aqui, e o Gustavo cravou no áudio de 20/08: cada empresa tem
 * VÁRIOS fisioterapeutas cadastrados, e quem não está na empresa não atende
 * por ela. O vínculo dos profissionais e dos funcionários fica na tela de
 * detalhe — aqui é só a porta de entrada.
 */
export default function ConveniosView({
  businessId,
  empresas,
}: {
  businessId: string
  empresas: EmpresaResumo[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [novaOpen, setNovaOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function criar() {
    if (!nome.trim()) {
      setErro('O nome da empresa é obrigatório.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { data, error } = await supabase
      .from('companies')
      .insert({
        business_id: businessId,
        name: nome.trim(),
        cnpj: cnpj.trim() || null,
        contato_nome: contatoNome.trim() || null,
        contato_telefone: contatoTelefone.replace(/\D/g, '') || null,
      })
      .select('id')
      .maybeSingle()
    setSalvando(false)
    if (error) {
      setErro(`Não consegui salvar: ${error.message}`)
      return
    }
    setNovaOpen(false)
    setNome('')
    setCnpj('')
    setContatoNome('')
    setContatoTelefone('')
    if (data?.id) router.push(`/admin/convenios/${data.id}`)
    else router.refresh()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setNovaOpen(true)}
        className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
        style={{ background: 'var(--admin-accent)', color: '#fff' }}
      >
        <IconPlus size={16} /> Nova empresa
      </button>

      {(() => {
        const cobrar = empresas.filter((e) => e.aberto_valor > 0 && e.aberto_dias >= DIAS_PRA_COBRAR)
        if (cobrar.length === 0) return null
        const total = cobrar.reduce((s, e) => s + e.aberto_valor, 0)
        return (
          <div
            className="rounded-xl px-3.5 py-3 text-sm"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', color: 'var(--admin-text)' }}
          >
            <strong>{brl(total)} esperando cobrança.</strong>{' '}
            {cobrar.length === 1
              ? `A ${cobrar[0].name} tem atendimento de ${cobrar[0].aberto_dias} dias atrás ainda em aberto.`
              : `${cobrar.length} empresas com atendimento parado há mais de ${DIAS_PRA_COBRAR} dias.`}{' '}
            Feche a fatura do mês e mande pro RH.
          </div>
        )
      })()}

      {empresas.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
        >
          <IconUsers size={28} />
          <p className="text-sm font-semibold mt-2" style={{ color: 'var(--admin-text)' }}>
            Nenhuma empresa conveniada ainda
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Cadastre a empresa, vincule os funcionários que ela cobre e escolha quais profissionais
            atendem por ela.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {empresas.map((e) => (
            <Link
              key={e.id}
              href={`/admin/convenios/${e.id}`}
              className="block rounded-xl p-3.5 transition-transform hover:-translate-y-px"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                    {e.name}
                    {!e.ativo && (
                      <span className="ml-2 text-[10px] font-semibold uppercase" style={{ color: 'var(--admin-text-faded)' }}>
                        inativa
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    {e.total_funcionarios} funcionário{e.total_funcionarios !== 1 ? 's' : ''} ·{' '}
                    {e.total_profissionais} {e.total_profissionais === 1 ? 'profissional' : 'profissionais'}
                    {e.contato_nome ? ` · ${e.contato_nome}` : ''}
                  </p>
                  {e.aberto_valor > 0 && (
                    <p
                      className="text-xs mt-1 font-semibold"
                      style={{ color: e.aberto_dias >= DIAS_PRA_COBRAR ? '#B45309' : 'var(--admin-text-2)' }}
                    >
                      {brl(e.aberto_valor)} em aberto
                      {e.aberto_dias > 0 ? ` · mais antigo há ${e.aberto_dias} dia${e.aberto_dias !== 1 ? 's' : ''}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                  ver
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {novaOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
                Nova empresa
              </h2>
              <button onClick={() => setNovaOpen(false)} aria-label="Fechar">
                <IconClose size={18} />
              </button>
            </div>

            <div>
              <label className="admin-label">Nome da empresa *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" placeholder="Ex: Prefeitura Municipal" />
            </div>
            <div>
              <label className="admin-label">CNPJ</label>
              <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="admin-label">Contato na empresa</label>
              <input value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" placeholder="Quem recebe o relatório" />
            </div>
            <div>
              <label className="admin-label">Telefone do contato</label>
              <input
                value={contatoTelefone}
                onChange={(e) => setContatoTelefone(maskPhoneProgressive(e.target.value))}
                className="admin-input w-full px-3 py-2.5 text-sm"
                placeholder="(00) 00000-0000"
              />
            </div>

            {erro && (
              <p className="text-xs" style={{ color: 'var(--admin-danger, #EF4444)' }}>
                {erro}
              </p>
            )}

            <button
              onClick={criar}
              disabled={salvando}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              <IconCheck size={16} /> {salvando ? 'Salvando…' : 'Cadastrar empresa'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
