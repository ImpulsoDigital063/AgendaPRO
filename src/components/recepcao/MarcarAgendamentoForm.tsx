'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveClientId } from '@/lib/clients'
import RecurringBlock from '@/components/admin/RecurringBlock'
import { buildRecurringDates, buildRecurringDatesByWeekdays, type FreqRecorrencia } from '@/lib/recorrencia'
import { logActivity } from '@/lib/activity-log'
import {
  IconArrowLeft,
  IconCheck,
  IconSearch,
  IconPlus,
  IconCalendar,
  IconClock,
} from '@/components/ui/Icon'

type Customer = {
  id: string
  name: string
  phone: string
  total_points?: number | null
  /** Funcionário de empresa conveniada. Null = paciente particular. */
  company_id?: string | null
}

type Professional = { id: string; name: string }
type Service = { id: string; name: string; price: number | null; duration_minutes: number | null }

type Props = {
  businessId: string
  businessSlug: string
  professionals: Professional[]
  services: Service[]
  /** Prof pré-selecionado (vem do popover hover-to-schedule da timeline) */
  defaultProfId?: string | null
  /** Data pré-selecionada (YYYY-MM-DD) */
  defaultDate?: string | null
  /** Horário pré-selecionado (HH:MM) */
  defaultTime?: string | null
  /**
   * Área que abriu o form · controla label header + rota de redirect pós-save.
   * 'profissional' (v92) = a própria profissional marcando pra si: recebe só
   * ela mesma em `professionals`, pula o passo de escolher profissional e
   * nunca oferece caminho pra agenda de colega.
   */
  area?: 'recepcao' | 'admin' | 'profissional'
}

type Step = 'cliente' | 'profissional' | 'servico' | 'horario' | 'confirma'

export default function MarcarAgendamentoForm({
  businessId,
  businessSlug,
  professionals,
  services,
  defaultProfId = null,
  defaultDate = null,
  defaultTime = null,
  area = 'recepcao',
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // v98a/b · quando a profissional só pode marcar pra si, a página manda ela
  // sozinha em `professionals` → o passo "com qual profissional?" não existe
  // (nem no avanço, nem no botão voltar). Se a dona liberou marcar pras
  // colegas, a lista vem completa e o passo volta a aparecer normalmente.
  const lockProf = area === 'profissional' && professionals.length <= 1
  const stepOrder: Step[] = lockProf
    ? ['cliente', 'servico', 'horario', 'confirma']
    : ['cliente', 'profissional', 'servico', 'horario', 'confirma']

  const [step, setStep] = useState<Step>('cliente')
  const [cliente, setCliente] = useState<Customer | null>(null)
  const [prof, setProf] = useState<Professional | null>(() => {
    if (!defaultProfId) return null
    return professionals.find((p) => p.id === defaultProfId) ?? null
  })
  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState<string>(() => {
    if (defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate)) return defaultDate
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState<string>(() => {
    if (defaultTime && /^\d{2}:\d{2}$/.test(defaultTime)) return defaultTime
    return ''
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step Cliente — busca + criar
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newCliente, setNewCliente] = useState({ name: '', phone: '' })

  useEffect(() => {
    if (step !== 'cliente') return
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(async () => {
      const digits = term.replace(/\D/g, '')
      let query = supabase
        .from('customers')
        .select('id, name, phone, total_points, company_id')
        .eq('business_id', businessId)
        .limit(20)
      if (digits.length >= 3) {
        // busca por telefone
        query = query.ilike('phone', `%${digits}%`)
      } else {
        // busca por nome
        query = query.ilike('name', `%${term}%`)
      }
      const { data } = await query.order('name')
      if (!cancelled) {
        setResults((data ?? []) as Customer[])
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, step, businessId])

  async function handleCreateCliente() {
    const n = newCliente.name.trim()
    const p = newCliente.phone.trim()
    if (!n || !p) {
      setError('Nome e telefone obrigatórios')
      return
    }
    setError(null)
    setSaving(true)
    const { data, error: e } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name: n, phone: p })
      .select('id, name, phone, total_points, company_id')
      .single()
    setSaving(false)
    if (e) {
      setError(`Erro: ${e.message}`)
      return
    }
    setCliente(data as Customer)
    setShowCreate(false)
    setStep(lockProf ? 'servico' : 'profissional')
  }

  function selectCliente(c: Customer) {
    setCliente(c)
    carregarConvenio(c)
    setStep(lockProf ? 'servico' : 'profissional')
  }

  /** Descobre a empresa do paciente e quem atende por ela. */
  async function carregarConvenio(c: Customer) {
    setEmpresa(null)
    setProfsDaEmpresa(null)
    setPeloConvenio(true)
    if (!c.company_id) return
    const [{ data: emp }, { data: vinc }] = await Promise.all([
      supabase.from('companies').select('id, name, ativo').eq('id', c.company_id).maybeSingle(),
      supabase.from('company_professionals').select('professional_id').eq('company_id', c.company_id),
    ])
    if (!emp || emp.ativo === false) return
    setEmpresa({ id: emp.id, name: emp.name })
    setProfsDaEmpresa((vinc ?? []).map((v) => v.professional_id))
  }

  // Slots de horário · 08:00 às 20:00 a cada 30min (simples · não consulta working_hours)
  const slots = useMemo(() => {
    const out: string[] = []
    for (let h = 8; h <= 20; h++) {
      out.push(`${String(h).padStart(2, '0')}:00`)
      if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`)
    }
    return out
  }, [])

  // Horários já ocupados pra esse profissional/dia (appointments + business_blocks)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  /* Atendimento simultâneo (CAF · fisioterapia): agendamento existente deixa de
     ocupar o horário. Bloqueio continua bloqueando. `ocupacao` guarda quantos
     já estão marcados só pra avisar, sem desabilitar o botão. */
  const [ocupacao, setOcupacao] = useState<Map<string, number>>(new Map())
  /* Negócio que atende agora e recebe depois (convênio): pode lançar um
     atendimento que JÁ aconteceu sem dizer que foi pago. Nasce concluído e a
     comanda fica aberta — o valor aparece em "a receber" e quem fecha é o Adm
     ou a recepção. Sem a chave, nada muda: o agendamento nasce confirmado. */
  const [permiteEmAberto, setPermiteEmAberto] = useState(false)
  const [jaAtendi, setJaAtendi] = useState(false)
  /* Repetir atendimento — mesma lib e mesmo bloco do desktop. Sessão de
     fisioterapia é 2 ou 3 vezes por semana; marcar uma a uma comia o dia do
     Gustavo. Repete SEMPRE no mesmo dia da semana: "quarta e sexta" são duas
     séries, não uma. */
  const [recorrente, setRecorrente] = useState(false)
  const [recurFreq, setRecurFreq] = useState<FreqRecorrencia>('weekly')
  const [recurCount, setRecurCount] = useState(4)
  /* Vários dias da semana na mesma série (seg/qua/sex, 10 sessões) — só pra
     negócio com businesses.recorrencia_dias_semana. */
  const [permiteDiasSemana, setPermiteDiasSemana] = useState(false)
  const [recurDias, setRecurDias] = useState<number[]>([])
  /* CONVÊNIO · quando o paciente escolhido é funcionário de uma empresa, o
     atendimento nasce vinculado a ela e a lista de profissionais filtra pra
     quem atende por aquela empresa (regra do Gustavo, áudio 09:57). Ele pode
     desmarcar quando o paciente vier como particular. */
  const [empresa, setEmpresa] = useState<{ id: string; name: string } | null>(null)
  const [profsDaEmpresa, setProfsDaEmpresa] = useState<string[] | null>(null)
  const [peloConvenio, setPeloConvenio] = useState(true)

  /* Quem pode atender: com convênio ativo, só os vinculados à empresa. Sem
     convênio (ou desmarcado), a equipe inteira. */
  const profissionaisVisiveis = useMemo(() => {
    if (!empresa || !peloConvenio || profsDaEmpresa === null) return professionals
    return professionals.filter((p) => profsDaEmpresa.includes(p.id))
  }, [professionals, empresa, peloConvenio, profsDaEmpresa])

  /* Achado 4 da auditoria (21/08): com o profissional já escolhido — link da
     grade (defaultProfId) ou a própria fisioterapeuta na área dela (lockProf) —
     o passo de escolher era pulado e dava pra criar atendimento de convênio com
     quem NÃO está vinculado à empresa. Aqui a escolha cai quando ela não é
     permitida; se nem existe passo de profissional, o convênio é desligado
     (vira atendimento particular) em vez de gravar vínculo inválido. */
  useEffect(() => {
    if (!empresa || !peloConvenio || profsDaEmpresa === null) return
    if (prof && !profsDaEmpresa.includes(prof.id)) {
      if (lockProf) setPeloConvenio(false)
      else { setProf(null); setStep('profissional') }
    }
  }, [prof, empresa, peloConvenio, profsDaEmpresa, lockProf])



  useEffect(() => {
    let cancelado = false
    supabase
      .from('businesses')
      .select('convenios_enabled, recorrencia_dias_semana')
      .eq('id', businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        setPermiteEmAberto(!!data?.convenios_enabled)
        setPermiteDiasSemana(!!data?.recorrencia_dias_semana)
      })
    return () => { cancelado = true }
  }, [supabase, businessId])
  useEffect(() => {
    if (step !== 'horario' || !prof || !date) return
    let cancelled = false
    async function load() {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay()

      const [{ data: appts }, { data: blocks }, { data: biz }] = await Promise.all([
        supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('business_id', businessId)
          .eq('professional_id', prof!.id)
          .eq('appointment_date', date)
          .neq('status', 'cancelled'),
        supabase
          .from('business_blocks')
          .select('professional_id, block_type, day_of_week, block_date, start_time, end_time')
          .eq('business_id', businessId)
          .eq('active', true),
        supabase
          .from('businesses')
          .select('agendamento_simultaneo')
          .eq('id', businessId)
          .maybeSingle(),
      ])
      if (cancelled) return

      const permiteSimultaneo = !!biz?.agendamento_simultaneo
      const contagem = new Map<string, number>()
      const occ = new Set<string>()
      for (const a of appts ?? []) {
        const start = (a.start_time as string).slice(0, 5)
        const end = (a.end_time as string).slice(0, 5)
        for (const s of slots) {
          if (s < start || s >= end) continue
          if (permiteSimultaneo) contagem.set(s, (contagem.get(s) ?? 0) + 1)
          else occ.add(s)
        }
      }

      const blk = new Set<string>()
      for (const b of blocks ?? []) {
        // só conta bloqueio se for pro prof selecionado OU pro business inteiro
        if (b.professional_id && b.professional_id !== prof!.id) continue
        let applies = false
        if (b.block_type === 'recurring' && b.day_of_week === dayOfWeek) applies = true
        else if (b.block_type === 'specific' && b.block_date === date) applies = true
        if (!applies) continue
        const start = (b.start_time as string).slice(0, 5)
        const end = (b.end_time as string).slice(0, 5)
        for (const s of slots) {
          if (s >= start && s < end) blk.add(s)
        }
      }

      setBusy(occ)
      setBlocked(blk)
      setOcupacao(contagem)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, prof, date, businessId])

  async function handleConfirm() {
    if (!cliente || !prof || !service || !date || !time) {
      setError('Preencha tudo antes de confirmar')
      return
    }
    setError(null)
    setSaving(true)
    const duration = service.duration_minutes ?? 60
    const [hh, mm] = time.split(':').map(Number)
    const startDate = new Date(`${date}T${time}:00`)
    const endDate = new Date(startDate.getTime() + duration * 60_000)
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`

    // Linka o cliente universal (clients) — sem isso o atendimento/valor gasto
    // não aparece em /admin/clientes (que conta por client_id). Bug Rosy 23/06.
    const clientId = await resolveClientId(supabase, cliente.name, cliente.phone)

    /* Série: gera as datas e insere uma linha por data, agrupadas por
       recurring_group_id — mesmo formato do desktop, então a agenda, o
       histórico e o cancelamento em série já sabem lidar. */
    const datas = !recorrente || jaAtendi
      ? [date]
      : permiteDiasSemana && recurDias.length > 0
        ? buildRecurringDatesByWeekdays(date, recurDias, Math.max(1, Math.min(recurCount, 52)))
        : buildRecurringDates(date, recurFreq, Math.max(1, Math.min(recurCount, 52)))
    const grupoId = datas.length > 1 && typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : null

    const linhas = datas.map((d, idx) => ({
      business_id: businessId,
      professional_id: prof.id,
      customer_id: cliente.id,
      client_id: clientId,
      client_name: cliente.name,
      client_phone: cliente.phone,
      appointment_date: d,
      start_time: `${time}:00`,
      end_time: `${endTime}:00`,
      service_id: service.id,
      service_name: service.name,
      total_price: service.price,
      /* SEMPRE nasce 'confirmed', mesmo quando o atendimento já aconteceu.
         Motivo: a trigger auto_create_invoice_for_appointment só abre comanda
         pra status pending/confirmed — atendimento inserido já como 'completed'
         fica SEM comanda e nunca aparece em "a receber". O desktop já fazia
         assim (nasce confirmado, o modal de pagamento conclui depois); aqui a
         conclusão vem logo abaixo, no update. */
      status: 'confirmed',
      notes: area === 'profissional' ? 'Marcado pela profissional' : 'Marcado pela recepção',
      company_id: empresa && peloConvenio ? empresa.id : null,
      recurring_group_id: grupoId,
      recurring_index: grupoId ? idx + 1 : null,
    }))

    const { data: criados, error: e } = await supabase.from('appointments').insert(linhas).select('id')
    const inserted = criados?.[0] ?? null

    if (e) {
      setSaving(false)
      setError(
        datas.length > 1
          ? `Erro ao marcar a série: ${e.message}. Se algum horário estiver ocupado, o sistema barra a série inteira.`
          : `Erro ao marcar: ${e.message}`
      )
      return
    }

    // "Já aconteceu": conclui agora que a comanda já existe e fica ABERTA.
    if (permiteEmAberto && jaAtendi && inserted?.id) {
      const { error: concluirErr } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', inserted.id)
      if (concluirErr) {
        setSaving(false)
        setError(`Atendimento criado, mas não consegui marcar como concluído: ${concluirErr.message}`)
        return
      }
    }
    setSaving(false)

    // Log de atividade
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof2 } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      logActivity({
        business_id: businessId,
        professional_id: prof2?.id,
        action: 'create_appointment',
        target_type: 'appointment',
        target_id: inserted?.id,
        description: `${cliente.name} · ${service.name} · ${date} ${time} · com ${prof.name}${datas.length > 1 ? ` · série de ${datas.length}` : ''}`,
      })
    }

    // Redirect baseado na área que abriu o form.
    // Admin volta pra /admin (timeline) · recep volta pra /recepcao.
    // Usar location.href força full nav · evita route guard rejeitar Adm em /recepcao.
    if (area === 'admin') {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      window.location.href = `/admin${params.toString() ? '?' + params.toString() : ''}`
    } else if (area === 'profissional') {
      router.push('/profissional')
      router.refresh()
    } else {
      router.push('/recepcao')
      router.refresh()
    }
  }

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <div className="flex items-center gap-2">
          {step !== 'cliente' && (
            <button
              onClick={() => {
                const i = stepOrder.indexOf(step)
                setStep(stepOrder[Math.max(0, i - 1)])
              }}
              aria-label="Voltar"
              className="p-1.5 -ml-1 rounded-full"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              {area === 'admin'
                ? 'Atendimentos · Novo'
                : area === 'profissional'
                  ? 'Minha agenda · Marcar'
                  : 'Recepção · Marcar'}
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
              {step === 'cliente' && 'Quem é o cliente?'}
              {step === 'profissional' && 'Com qual profissional?'}
              {step === 'servico' && 'Qual serviço?'}
              {step === 'horario' && 'Quando?'}
              {step === 'confirma' && 'Confirmar agendamento'}
            </h1>
          </div>
        </div>

        {/* breadcrumb */}
        <div className="flex gap-1 mt-3">
          {(['cliente', 'profissional', 'servico', 'horario', 'confirma'] as Step[]).map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  s === step
                    ? 'var(--admin-accent)'
                    : ['cliente', 'profissional', 'servico', 'horario', 'confirma'].indexOf(s) <
                      ['cliente', 'profissional', 'servico', 'horario', 'confirma'].indexOf(step)
                      ? 'color-mix(in srgb, var(--admin-accent) 60%, transparent)'
                      : 'var(--admin-border)',
              }}
            />
          ))}
        </div>
      </header>

      <div className="relative max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 pb-32 space-y-3">
        {error && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)',
              color: 'var(--admin-danger,#EF4444)',
            }}
          >
            {error}
          </div>
        )}

        {/* STEP CLIENTE */}
        {step === 'cliente' && (
          <>
            {showCreate ? (
              <div className="admin-card p-4 space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Novo cliente
                </p>
                <input
                  type="text"
                  value={newCliente.name}
                  onChange={(e) => setNewCliente({ ...newCliente, name: e.target.value })}
                  placeholder="Nome"
                  autoFocus
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={newCliente.phone}
                  onChange={(e) => setNewCliente({ ...newCliente, phone: e.target.value })}
                  placeholder="(22) 99999-9999"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded-xl font-semibold text-sm"
                    style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateCliente}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl font-semibold text-sm disabled:opacity-40"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    {saving ? 'Salvando…' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center relative"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 12,
                  }}
                >
                  <span className="absolute left-3" style={{ color: 'var(--admin-text-faded)' }}>
                    <IconSearch size={16} />
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nome ou telefone do cliente"
                    autoFocus
                    className="w-full bg-transparent outline-none text-sm py-2.5 pl-9 pr-3"
                    style={{ color: 'var(--admin-text)' }}
                  />
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                    border: '1px solid var(--admin-accent-border)',
                  }}
                >
                  <IconPlus size={14} /> Cadastrar cliente novo
                </button>

                {searching && (
                  <p className="text-xs text-center" style={{ color: 'var(--admin-text-mute)' }}>
                    Buscando…
                  </p>
                )}

                {results.length > 0 && (
                  <div className="space-y-1.5">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCliente(c)}
                        className="w-full text-left admin-card p-3"
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {c.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                          {c.phone}
                          {typeof c.total_points === 'number' && c.total_points > 0 && (
                            <span style={{ color: 'var(--admin-accent)' }}> · {c.total_points} pts</span>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* STEP PROFISSIONAL */}
        {step === 'profissional' && (
          <div className="space-y-2">
            {empresa && peloConvenio && (
              <div
                className="rounded-xl px-3 py-2.5 text-xs"
                style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }}
              >
                Atendimento pelo convênio <strong style={{ color: 'var(--admin-text)' }}>{empresa.name}</strong>.
                Aparecem só os profissionais cadastrados nela.
              </div>
            )}
            {profissionaisVisiveis.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProf(p)
                  setStep('servico')
                }}
                className="w-full text-left admin-card p-4"
                style={{
                  border: prof?.id === p.id ? '1.5px solid var(--admin-accent)' : '1px solid var(--admin-border)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {p.name}
                </p>
              </button>
            ))}
            {profissionaisVisiveis.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-mute)' }}>
                {empresa && peloConvenio
                  ? `Nenhum profissional está cadastrado no convênio ${empresa.name}. Cadastre em Convênios, ou desmarque o convênio abaixo pra atender como particular.`
                  : 'Nenhum profissional cadastrado.'}
              </p>
            )}
            {empresa && (
              <label
                className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
              >
                <input
                  type="checkbox"
                  checked={peloConvenio}
                  onChange={(e) => { setPeloConvenio(e.target.checked); setProf(null) }}
                  className="mt-0.5"
                />
                <span className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
                  Cobrar esse atendimento do convênio {empresa.name}. Desmarque se o paciente
                  está vindo como particular.
                </span>
              </label>
            )}
          </div>
        )}

        {/* STEP SERVIÇO */}
        {step === 'servico' && (
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setService(s)
                  setStep('horario')
                }}
                className="w-full text-left admin-card p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {s.name}
                  </p>
                  {s.price != null && (
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                      {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
                {s.duration_minutes != null && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    <IconClock size={11} /> {s.duration_minutes} min
                  </p>
                )}
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-mute)' }}>
                Nenhum serviço cadastrado.
              </p>
            )}
          </div>
        )}

        {/* STEP HORÁRIO */}
        {step === 'horario' && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Data
              </p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Horário disponível
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((s) => {
                  const occupied = busy.has(s)
                  const jaMarcados = ocupacao.get(s) ?? 0
                  const isBlocked = blocked.has(s)
                  const disabled = occupied || isBlocked
                  const selected = time === s
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (!disabled) setTime(s)
                      }}
                      disabled={disabled}
                      title={isBlocked ? 'Horário bloqueado' : occupied ? 'Horário ocupado' : jaMarcados > 0 ? `${jaMarcados} já agendado${jaMarcados > 1 ? 's' : ''} · atendimento simultâneo` : ''}
                      className="py-2 rounded-lg text-sm font-semibold tabular-nums disabled:opacity-30"
                      style={{
                        background: selected
                          ? 'var(--admin-accent)'
                          : isBlocked
                            ? 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)'
                            : occupied
                              ? 'var(--admin-surface-hi)'
                              : 'var(--admin-surface)',
                        color: selected ? '#fff' : isBlocked ? 'var(--admin-danger,#EF4444)' : 'var(--admin-text)',
                        border: selected
                          ? 'none'
                          : jaMarcados > 0
                            ? '1px dashed var(--admin-border)'
                            : '1px solid var(--admin-border)',
                        textDecoration: disabled ? 'line-through' : 'none',
                      }}
                    >
                      {s}
                      {jaMarcados > 0 && <span className="ml-0.5 opacity-60">·{jaMarcados}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
                Riscado em vermelho = bloqueado · Riscado cinza = ocupado
                {ocupacao.size > 0 && ' · Tracejado com número = já tem atendimento no horário (dá pra marcar junto)'}
              </p>
            </div>
            <button
              onClick={() => setStep('confirma')}
              disabled={!time}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 mt-4"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Continuar
            </button>
          </>
        )}

        {/* STEP CONFIRMA */}
        {step === 'confirma' && cliente && prof && service && (
          <>
            <div className="admin-card p-4 space-y-3">
              <Row label="Cliente" value={`${cliente.name} · ${cliente.phone}`} />
              <Row label="Profissional" value={prof.name} />
              <Row label="Serviço" value={service.name} />
              {service.price != null && (
                <Row
                  label="Valor"
                  value={service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
              )}
              <Row label="Data" value={new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row label="Horário" value={time} />
            </div>

            {!jaAtendi && (
              <RecurringBlock
                enabled={recorrente}
                onToggle={setRecorrente}
                freq={recurFreq}
                onChangeFreq={setRecurFreq}
                count={recurCount}
                onChangeCount={setRecurCount}
                startDate={date}
                weekdays={permiteDiasSemana ? recurDias : undefined}
                onChangeWeekdays={permiteDiasSemana ? setRecurDias : undefined}
              />
            )}

            {permiteEmAberto && (
              <label
                className="admin-card p-3 flex items-start gap-2.5 cursor-pointer"
                style={{ borderColor: jaAtendi ? 'var(--admin-accent)' : undefined }}
              >
                <input
                  type="checkbox"
                  checked={jaAtendi}
                  onChange={(e) => setJaAtendi(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    Esse atendimento já aconteceu
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    Entra como concluído e fica em aberto pra receber depois. O pagamento é registrado
                    pelo Adm ou pela recepção.
                  </span>
                </span>
              </label>
            )}

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              <IconCheck size={16} />{' '}
              {saving ? 'Salvando…' : jaAtendi ? 'Lançar atendimento' : 'Confirmar agendamento'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-right" style={{ color: 'var(--admin-text)' }}>
        {value}
      </span>
    </div>
  )
}
