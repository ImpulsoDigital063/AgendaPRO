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
  /** Quebra por mês · é por competência que se fecha fatura, nunca pelo total. */
  competencias: {
    competencia: string
    aFaturar: number
    qtdAFaturar: number
    faturado: number
    qtdFaturado: number
    dias: number
    emCurso: boolean
    /** YYYY-MM-DD · null quando a empresa não tem prazo combinado. */
    vencimento: string | null
    atraso: number
  }[]
  dia_vencimento: number | null
}

export type FaturaResumo = {
  id: string
  numero: number
  competencia: string
  qtd: number
  total: number
  enviada_em: string | null
  paga_em: string | null
  company_id: string
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** '2026-07' → 'Julho' · a competência é como o RH chama o período. */
function nomeMes(comp: string) {
  const m = parseInt(comp.slice(5, 7), 10) - 1
  const nome = MESES[m] ?? comp
  return nome.charAt(0).toUpperCase() + nome.slice(1)
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
  faturas = [],
}: {
  businessId: string
  empresas: EmpresaResumo[]
  faturas?: FaturaResumo[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [novaOpen, setNovaOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
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
        contato_email: contatoEmail.trim() || null,
        dia_vencimento: diaVencimento.trim() ? Math.min(31, Math.max(1, parseInt(diaVencimento, 10))) : null,
        instrucoes_pagamento: instrucoes.trim() || null,
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
    setContatoEmail('')
    setDiaVencimento('')
    setInstrucoes('')
    if (data?.id) router.push(`/admin/convenios/${data.id}`)
    else router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Dois números, não um. "A faturar" e "aguardando pagamento" são estados
          com ações diferentes: no primeiro ele fecha a fatura, no segundo a
          conta já está com o RH e a ação é esperar. Somados num total só, a
          tela mandava fechar fatura pra sempre — inclusive do que já foi
          fechado (Eduardo, 25/08). */}
      {(() => {
        /* O número grande é só o que ele PODE fechar hoje. Antes somava o mês
           em curso junto — e aí o card prometia "feche o mês e mande pro RH"
           pra um valor que inclui sessões que ainda vão acontecer. O mês em
           curso continua visível, mas em letra menor, como o que é: acúmulo. */
        const fechavel = empresas.reduce(
          (s, e) => s + e.competencias.filter((c) => !c.emCurso).reduce((t, c) => t + c.aFaturar, 0), 0)
        const emCurso = empresas.reduce(
          (s, e) => s + e.competencias.filter((c) => c.emCurso).reduce((t, c) => t + c.aFaturar, 0), 0)
        const aFaturar = fechavel
        const aguardando = empresas.reduce((s, e) => s + e.competencias.reduce((t, c) => t + c.faturado, 0), 0)
        if (aFaturar === 0 && aguardando === 0 && emCurso === 0) return null
        return (
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-xl px-3.5 py-3"
              style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#B45309' }}>
                A faturar
              </p>
              <p className="text-lg font-black tabular-nums mt-0.5" style={{ color: '#B45309' }}>
                {brl(aFaturar)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {aFaturar > 0 ? 'De meses fechados · mande pro RH' : 'Nenhum mês fechado a cobrar'}
              </p>
              {emCurso > 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  + {brl(emCurso)} acumulando no mês em curso
                </p>
              )}
            </div>
            <div
              className="rounded-xl px-3.5 py-3"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.30)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0284C7' }}>
                Aguardando pagamento
              </p>
              <p className="text-lg font-black tabular-nums mt-0.5" style={{ color: '#0284C7' }}>
                {brl(aguardando)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {aguardando > 0 ? 'Fatura já está com a empresa' : 'Nenhuma fatura em cobrança'}
              </p>
            </div>
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
            <div
              key={e.id}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <Link
                href={`/admin/convenios/${e.id}`}
                className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[var(--admin-surface-hi)]"
              >
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
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                  ver
                </span>
              </Link>

              {/* Uma linha por MÊS, com a ação daquele mês do lado. Antes o card
                  mostrava só o total somado e o botão morava três cliques
                  adiante, dentro da empresa, atrás do seletor de competência. */}
              {e.competencias.length > 0 && (
                <div style={{ borderTop: '1px solid var(--admin-divider)' }}>
                  {e.competencias.map((c) => (
                    <div
                      key={c.competencia}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      style={{ borderTop: '1px solid var(--admin-divider)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>
                          {nomeMes(c.competencia)}
                          {c.emCurso && (
                            <span className="ml-1.5 text-[10px] font-semibold" style={{ color: 'var(--admin-text-faded)' }}>
                              · mês em curso
                            </span>
                          )}
                          {/* Prazo real da empresa · sem dia_vencimento cadastrado
                              o sistema não afirma atraso, só cala. */}
                          {!c.emCurso && c.vencimento && (
                            <span
                              className="ml-1.5 text-[10px] font-semibold"
                              style={{ color: c.atraso > 0 ? '#DC2626' : 'var(--admin-text-faded)' }}
                            >
                              · {c.atraso > 0
                                ? `venceu ${c.vencimento.slice(8)}/${c.vencimento.slice(5, 7)} · ${c.atraso} dia${c.atraso !== 1 ? 's' : ''} de atraso`
                                : `vence ${c.vencimento.slice(8)}/${c.vencimento.slice(5, 7)}`}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                          {c.qtdAFaturar > 0 && (
                            <span style={{ color: c.dias >= DIAS_PRA_COBRAR && !c.emCurso ? '#B45309' : undefined }}>
                              {c.qtdAFaturar} atendimento{c.qtdAFaturar !== 1 ? 's' : ''} · {brl(c.aFaturar)} a faturar
                            </span>
                          )}
                          {c.qtdAFaturar > 0 && c.qtdFaturado > 0 && ' · '}
                          {c.qtdFaturado > 0 && (
                            <span style={{ color: '#0284C7' }}>{brl(c.faturado)} faturado, aguardando</span>
                          )}
                        </p>
                      </div>
                      {c.aFaturar > 0 ? (
                        <Link
                          href={`/admin/convenios/${e.id}?mes=${c.competencia}`}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 whitespace-nowrap"
                          style={{
                            background: c.emCurso ? 'var(--admin-surface-hi)' : 'var(--admin-accent)',
                            color: c.emCurso ? 'var(--admin-text-2)' : '#fff',
                            border: c.emCurso ? '1px solid var(--admin-border)' : 'none',
                          }}
                        >
                          {c.emCurso ? 'Ver mês' : 'Fechar e cobrar'}
                        </Link>
                      ) : (
                        <span className="text-[11px] flex-shrink-0" style={{ color: '#0284C7' }}>
                          já cobrado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Faturas emitidas · não existiam em lugar nenhum da lista. Sem isso ele
          não tem como saber o que já mandou pro RH sem entrar empresa por
          empresa — e a metade de baixo da tela ficava vazia. */}
      {faturas.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
            Faturas emitidas
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
            {faturas.map((f, i) => {
              const emp = empresas.find((e) => e.id === f.company_id)
              return (
                <Link
                  key={f.id}
                  href={`/admin/convenios/${f.company_id}?mes=${f.competencia}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--admin-surface-hi)]"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--admin-divider)' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                      nº {f.numero} · {emp?.name ?? 'Empresa'}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      {nomeMes(f.competencia)} · {f.qtd} atendimento{f.qtd !== 1 ? 's' : ''}
                      {f.enviada_em ? ' · enviada por e-mail' : ' · não enviada'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {brl(Number(f.total))}
                    </p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: f.paga_em ? '#059669' : '#0284C7' }}>
                      {f.paga_em ? 'paga' : 'aguardando'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Cadastrar empresa acontece uma vez por convênio · não é a ação do dia
          a dia e não precisa do maior peso visual da tela (Eduardo, 25/08). */}
      <button
        onClick={() => setNovaOpen(true)}
        className="w-full py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[var(--admin-surface-hi)]"
        style={{ background: 'transparent', color: 'var(--admin-text-mute)', border: '1px dashed var(--admin-border)' }}
      >
        <IconPlus size={14} /> Nova empresa
      </button>

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

            {/* Estes três nasceram só na edição (25-27/08) e faltavam aqui — o
                dono cadastrava o convênio e depois tinha que entrar na empresa
                pra completar. Pior no e-mail: sem ele o botão de enviar o
                extrato já nasce desabilitado, sem dizer o motivo. */}
            <div>
              <label className="admin-label">E-mail do contato</label>
              <input
                type="email"
                value={contatoEmail}
                onChange={(e) => setContatoEmail(e.target.value)}
                className="admin-input w-full px-3 py-2.5 text-sm"
                placeholder="rh@empresa.com.br"
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                É pra esse endereço que o extrato do mês é enviado.
              </p>
            </div>
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
                  ? `A fatura de um mês vence no dia ${diaVencimento} do mês seguinte.`
                  : 'Em branco, o sistema não avisa atraso dessa empresa.'}
              </p>
            </div>
            <div>
              <label className="admin-label">Instruções de pagamento</label>
              <textarea
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                rows={2}
                className="admin-input w-full px-3 py-2.5 text-sm"
                placeholder="PIX, banco ou nº de empenho · sai no rodapé do PDF"
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
