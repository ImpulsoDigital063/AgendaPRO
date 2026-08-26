'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconPlus, IconTrash, IconSearch } from '@/components/ui/Icon'

/** Mesma máscara da tela de cadastro — sem isso o telefone aparece cru. */
function mascaraTelefone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

type Empresa = {
  id: string
  business_id: string
  name: string
  cnpj: string | null
  contato_nome: string | null
  contato_telefone: string | null
  contato_email: string | null
  dia_vencimento: number | null
  ativo: boolean
}

type Profissional = { id: string; name: string; active?: boolean | null }
type Funcionario = { id: string; name: string; phone: string | null }

/**
 * Detalhe da empresa conveniada: dados, quem atende por ela e quais
 * funcionários ela cobre.
 *
 * A regra que o Gustavo cravou (áudio 09:57 de 20/08): quem NÃO está vinculado
 * aqui não pode atender pela empresa. É esta lista que o agendamento filtra.
 */
export default function EmpresaDetalheView({
  businessId,
  empresa,
  profissionais,
  vinculadosIniciais,
  funcionariosIniciais,
}: {
  businessId: string
  empresa: Empresa
  profissionais: Profissional[]
  vinculadosIniciais: string[]
  funcionariosIniciais: Funcionario[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState(empresa.name)
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? '')
  const [contatoNome, setContatoNome] = useState(empresa.contato_nome ?? '')
  const [contatoTelefone, setContatoTelefone] = useState(mascaraTelefone(empresa.contato_telefone ?? ''))
  const [contatoEmail, setContatoEmail] = useState(empresa.contato_email ?? '')
  const [diaVencimento, setDiaVencimento] = useState(empresa.dia_vencimento != null ? String(empresa.dia_vencimento) : '')
  const [ativo, setAtivo] = useState(empresa.ativo)
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const [vinculados, setVinculados] = useState<string[]>(vinculadosIniciais)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(funcionariosIniciais)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Funcionario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvarDados() {
    setSalvandoDados(true)
    setErro(null)
    const { error } = await supabase
      .from('companies')
      .update({
        name: nome.trim(),
        cnpj: cnpj.trim() || null,
        contato_nome: contatoNome.trim() || null,
        contato_telefone: contatoTelefone.replace(/\D/g, '') || null,
        contato_email: contatoEmail.trim() || null,
        dia_vencimento: diaVencimento.trim() ? Math.min(31, Math.max(1, parseInt(diaVencimento, 10))) : null,
        ativo,
      })
      .eq('id', empresa.id)
    setSalvandoDados(false)
    if (error) {
      setErro(`Não consegui salvar: ${error.message}`)
      return
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2200)
    router.refresh()
  }

  async function alternarProfissional(profId: string) {
    setErro(null)
    const jaTem = vinculados.includes(profId)
    // Otimista: a lista responde na hora e volta atrás se o banco recusar.
    setVinculados((v) => (jaTem ? v.filter((x) => x !== profId) : [...v, profId]))
    const { error } = jaTem
      ? await supabase.from('company_professionals').delete().eq('company_id', empresa.id).eq('professional_id', profId)
      : await supabase.from('company_professionals').insert({ company_id: empresa.id, professional_id: profId })
    if (error) {
      setVinculados((v) => (jaTem ? [...v, profId] : v.filter((x) => x !== profId)))
      setErro(`Não consegui atualizar o vínculo: ${error.message}`)
    }
  }

  async function buscarClientes() {
    /* Vírgula e parêntese quebram o filtro `or` do PostgREST (ele usa vírgula
       pra separar condição). Buscar "Silva, Maria" derrubava a consulta inteira
       com "failed to parse logic tree" e a tela não achava ninguém, sem dizer
       por quê. Tiro os caracteres de controle antes de montar o filtro. */
    const termo = busca.trim().replace(/[,()"\%]/g, ' ').replace(/\s+/g, ' ').trim()
    if (termo.length < 2) return
    setBuscando(true)
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, company_id')
      .eq('business_id', businessId)
      .is('company_id', null)
      .or(`name.ilike.%${termo}%,phone.ilike.%${termo}%`)
      .limit(12)
    setBuscando(false)
    setResultados((data ?? []).map((c) => ({ id: c.id, name: c.name, phone: c.phone })))
  }

  async function vincularFuncionario(c: Funcionario) {
    setErro(null)
    const { error } = await supabase.from('customers').update({ company_id: empresa.id }).eq('id', c.id)
    if (error) {
      setErro(`Não consegui vincular: ${error.message}`)
      return
    }
    setFuncionarios((f) => [...f, c].sort((a, b) => a.name.localeCompare(b.name)))
    setResultados((r) => r.filter((x) => x.id !== c.id))
  }

  async function desvincularFuncionario(id: string) {
    setErro(null)
    const antes = funcionarios
    setFuncionarios((f) => f.filter((x) => x.id !== id))
    const { error } = await supabase.from('customers').update({ company_id: null }).eq('id', id)
    if (error) {
      setFuncionarios(antes)
      setErro(`Não consegui desvincular: ${error.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid #dc2626' }}>
          {erro}
        </div>
      )}

      {/* Dados da empresa */}
      <section className="admin-card p-4 space-y-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Dados da empresa</h2>
        <div>
          <label className="admin-label">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="admin-label">CNPJ</label>
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="admin-label">Contato</label>
            <input value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="admin-label">Telefone</label>
            <input value={contatoTelefone} onChange={(e) => setContatoTelefone(mascaraTelefone(e.target.value))} className="admin-input w-full px-3 py-2.5 text-sm" placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className="admin-label">E-mail (pra mandar o extrato)</label>
            <input value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} className="admin-input w-full px-3 py-2.5 text-sm" />
          </div>
          {/* Prazo real de pagamento (25/08). Sem isto os avisos de cobrança
              usavam um limiar de 20 dias inventado — gritava dentro do prazo e
              calava fora dele. */}
          <div>
            <label className="admin-label">Dia do pagamento</label>
            <input
              type="number"
              min={1}
              max={31}
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="ex: 10"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              {diaVencimento
                ? `A fatura de um mês vence no dia ${diaVencimento} do mês seguinte. Julho vence ${String(diaVencimento).padStart(2, '0')}/08.`
                : 'Em branco, o sistema não avisa atraso dessa empresa — só mostra há quanto tempo está em aberto.'}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text)' }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Convênio ativo
        </label>
        <button
          onClick={salvarDados}
          disabled={salvandoDados}
          className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{ background: salvo ? '#10B981' : 'var(--admin-accent)', color: '#fff' }}
        >
          {salvandoDados ? 'Salvando…' : salvo ? 'Salvo' : 'Salvar dados'}
        </button>
      </section>

      {/* Profissionais que atendem por essa empresa */}
      <section className="admin-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Quem atende por essa empresa
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Só quem estiver marcado aqui aparece na hora de agendar pelo convênio.
          </p>
        </div>
        <div className="space-y-1.5">
          {profissionais.map((p) => {
            const marcado = vinculados.includes(p.id)
            return (
              <label
                key={p.id}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer"
                style={{
                  background: 'var(--admin-surface)',
                  border: marcado ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)',
                }}
              >
                <input type="checkbox" checked={marcado} onChange={() => alternarProfissional(p.id)} />
                <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{p.name}</span>
              </label>
            )
          })}
          {profissionais.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhum profissional cadastrado no negócio ainda.
            </p>
          )}
        </div>
      </section>

      {/* Funcionários cobertos pelo convênio */}
      <section className="admin-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Funcionários da empresa ({funcionarios.length})
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Os atendimentos dessas pessoas entram na conta da empresa.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarClientes()}
            placeholder="Buscar paciente por nome ou telefone"
            className="admin-input flex-1 px-3 py-2.5 text-sm"
          />
          <button
            onClick={buscarClientes}
            disabled={buscando || busca.trim().length < 2}
            className="px-3 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          >
            <IconSearch size={16} />
          </button>
        </div>

        {resultados.length > 0 && (
          <div className="space-y-1.5">
            {resultados.map((c) => (
              <button
                key={c.id}
                onClick={() => vincularFuncionario(c)}
                className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left"
                style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                  {c.phone ? <span style={{ color: 'var(--admin-text-mute)' }}> · {c.phone}</span> : null}
                </span>
                <IconPlus size={15} />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {funcionarios.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
                {f.name}
                {f.phone ? <span style={{ color: 'var(--admin-text-mute)' }}> · {f.phone}</span> : null}
              </span>
              <button onClick={() => desvincularFuncionario(f.id)} aria-label={`Tirar ${f.name} da empresa`}>
                <IconTrash size={15} />
              </button>
            </div>
          ))}
          {funcionarios.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhum funcionário vinculado. Busque o paciente acima pra incluir.
            </p>
          )}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
          Paciente que ainda não existe no sistema: cadastre em Clientes e depois vincule aqui.
        </p>
      </section>
    </div>
  )
}
