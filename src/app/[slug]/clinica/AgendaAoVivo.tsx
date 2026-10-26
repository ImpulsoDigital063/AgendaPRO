'use client'

/* AGENDA AO VIVO NA VITRINE (26/10/2026, referência: Clínica Marisa Vaz).
   Um cartão por profissional: os procedimentos que ELA faz e os próximos
   horários livres de verdade. Tocou no horário → abre o agendamento já com
   serviço, profissional, dia e hora; o BookingFlow confere de novo e só
   marca se ainda estiver livre (senão a cliente escolhe outro ali).

   Mesma fonte do agendamento: expediente (periodosDoDia), ocupados e
   bloqueios da rota pública /api/booking/availability, duração de quem
   atende (duracaoComProf), régua do dia (slot_duration) e a antecedência de
   30 min. A geração do dia é a mesma conta do generateSlots do BookingFlow. */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { periodosDoDia, ymdLocal } from '@/lib/horario-do-dia'
import { duracaoComProf, fazServico, type ServicoPorProf } from '@/lib/servico-por-profissional'

const TINTA = '#2A2520'
const SUAVE = '#7C7266'
const LINHA = '#E7DECF'
const SERIF = 'font-[family-name:var(--font-vitrine)]'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const JANELA_DIAS = 14
const MOSTRA_DIAS = 6
const ANTECEDENCIA_MIN = 30 // BOOKING_BUFFER_MIN do BookingFlow

type Servico = { id: string; nome: string; duracao: number | null; avaliacao: boolean }
type Pessoa = { id: string; nome: string; foto: string | null; dona: boolean }
type Agenda = {
  semanal: { professional_id: string; day_of_week: number; start_time: string; end_time: string; slot_duration: number }[]
  datas: { professional_id: string; date: string; start_time: string; end_time: string; slot_duration: number }[]
  porProf: ServicoPorProf
}
type Ocupacao = {
  appointments: { appointment_date: string; start_time: string; end_time: string }[]
  blocks: { start_time: string; end_time: string; block_type: string; day_of_week: number | null; block_date: string | null }[]
}

const min = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
const hora = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
const tempo = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`)

/** próximos dias com horário livre desta profissional pra este serviço */
function diasLivres(agenda: Agenda, oc: Ocupacao, prof: string, servico: Servico) {
  const agora = new Date()
  const saida: { data: string; rotulo: string; horas: string[] }[] = []
  for (let i = 0; i < JANELA_DIAS && saida.length < MOSTRA_DIAS; i++) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i)
    const ymd = ymdLocal(dia)
    const periodos = periodosDoDia(agenda.semanal, agenda.datas, prof, dia)
    if (!periodos.length) continue
    const passo = periodos[0].slot_duration || 30
    const dur = Math.max(1, duracaoComProf(agenda.porProf, { id: servico.id, duration_minutes: servico.duracao }, prof) || passo)
    const ocupado = [
      ...oc.appointments.filter((a) => a.appointment_date === ymd).map((a) => ({ ini: min(a.start_time), fim: min(a.end_time) })),
      ...oc.blocks
        .filter((b) => (b.block_type === 'recurring' && b.day_of_week === dia.getDay()) || (b.block_type === 'specific' && b.block_date === ymd))
        .map((b) => ({ ini: min(b.start_time), fim: min(b.end_time) })),
    ]
    const corte = i === 0 ? agora.getHours() * 60 + agora.getMinutes() + ANTECEDENCIA_MIN : -1
    const horas: string[] = []
    for (const p of periodos) {
      for (let t = min(p.start_time); t + dur <= min(p.end_time); t += passo) {
        if (t < corte) continue
        if (!ocupado.some((o) => t < o.fim && t + dur > o.ini)) horas.push(hora(t))
      }
    }
    if (horas.length) {
      const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : `${DIAS[dia.getDay()]} ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
      saida.push({ data: ymd, rotulo, horas })
    }
  }
  return saida
}

function Cartao({
  pessoa, servicos, agenda, businessId, slug, chegada, cor, aberto, onAbrir,
}: {
  pessoa: Pessoa; servicos: Servico[]; agenda: Agenda; businessId: string; slug: string; chegada: string; cor: string; aberto: boolean; onAbrir: () => void
}) {
  const [escolhido, setEscolhido] = useState(servicos[0]?.id ?? '')
  const [oc, setOc] = useState<Ocupacao | null>(null)
  const [falhou, setFalhou] = useState(false)
  const servico = servicos.find((s) => s.id === escolhido) ?? servicos[0]

  useEffect(() => {
    if (!aberto || oc) return
    const hoje = new Date()
    const de = ymdLocal(hoje)
    const ate = ymdLocal(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + JANELA_DIAS))
    fetch(`/api/booking/availability?business=${businessId}&professional=${pessoa.id}&from=${de}&to=${ate}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setOc({ appointments: j.appointments ?? [], blocks: j.blocks ?? [] }))
      .catch(() => setFalhou(true))
  }, [aberto, oc, businessId, pessoa.id])

  const [dia, setDia] = useState<string | null>(null)
  const dias = oc && servico ? diasLivres(agenda, oc, pessoa.id, servico) : null
  const diaAtual = dias?.find((x) => x.data === dia) ?? dias?.[0]
  const dur = servico ? duracaoComProf(agenda.porProf, { id: servico.id, duration_minutes: servico.duracao }, pessoa.id) : null
  const primeiro = pessoa.nome.trim().split(/\s+/)[0]
  const link = (data: string, h: string) =>
    `/${slug}/agendar?servicos=${servico?.id}&prof=${pessoa.id}&date=${data}&time=${h}${chegada ? `&${chegada}` : ''}`

  return (
    <article className="overflow-hidden rounded-[22px] border bg-white sm:rounded-[28px]" style={{ borderColor: LINHA }}>
      <button type="button" onClick={onAbrir} aria-expanded={aberto} className="flex w-full items-center gap-4 px-5 py-5 text-left sm:gap-6 sm:px-8 sm:py-7">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EFE8DC] sm:h-20 sm:w-20">
          {pessoa.foto ? (
            <Image src={pessoa.foto} alt={pessoa.nome} fill sizes="80px" className="object-cover" />
          ) : (
            <span className={`${SERIF} flex h-full items-center justify-center text-[26px]`} style={{ color: cor }}>{pessoa.nome[0]}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`${SERIF} block truncate text-[22px] font-medium leading-tight tracking-[-0.01em] sm:text-[32px]`} style={{ color: TINTA }}>{pessoa.nome}</span>
          <span className="mt-1 block text-[13px] sm:text-[15px]" style={{ color: SUAVE }}>{servicos.length} {servicos.length === 1 ? 'procedimento' : 'procedimentos'}</span>
        </span>
        <svg aria-hidden viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 transition-transform duration-500 ${aberto ? 'rotate-180' : ''}`} fill="none" stroke={SUAVE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {/* 26/10 · Eduardo achou a grade de 6 dias + 34 botões confusa: agora é
          um passo de cada vez (procedimento numa lista, dia numa faixa, horários
          só daquele dia) */}
      {aberto && servico && (
        <div className="border-t px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7" style={{ borderColor: LINHA }}>
          <label className="block text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: SUAVE }} htmlFor={`proc-${pessoa.id}`}>
            O que você quer fazer
          </label>
          <div className="relative mt-2.5 sm:max-w-md">
            <select
              id={`proc-${pessoa.id}`}
              value={servico.id}
              onChange={(e) => { setEscolhido(e.target.value); setDia(null) }}
              className="w-full appearance-none truncate rounded-2xl border bg-white py-3.5 pl-4 pr-11 text-[15px] font-semibold outline-none focus:border-[#2A2520]"
              style={{ borderColor: LINHA, color: TINTA }}
            >
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke={SUAVE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          {dur ? <p className="mt-2 text-[13px]" style={{ color: SUAVE }}>Duração: {tempo(dur)}</p> : null}

          <div className="mt-6 sm:mt-7">
            {falhou ? (
              <p className="text-[14px]" style={{ color: SUAVE }}>Não deu pra carregar os horários agora. Toque em Agendar atendimento pra ver a agenda completa.</p>
            ) : !dias ? (
              <div className="flex gap-2" aria-label="Carregando horários">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[62px] w-[64px] shrink-0 animate-pulse rounded-2xl bg-[#F4EFE7]" />
                ))}
              </div>
            ) : dias.length === 0 ? (
              <p className="text-[14px]" style={{ color: SUAVE }}>Sem horário livre com {primeiro} nos próximos {JANELA_DIAS} dias pra esse procedimento.</p>
            ) : (
              <>
                {/* faixa de dias: rola de lado no celular */}
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {dias.map((x) => {
                    const ativo = x.data === diaAtual?.data
                    const [sem, dm] = x.rotulo.includes(' ') ? x.rotulo.split(' ') : [x.rotulo, `${x.data.slice(8, 10)}/${x.data.slice(5, 7)}`]
                    return (
                      <button
                        key={x.data}
                        type="button"
                        onClick={() => setDia(x.data)}
                        aria-pressed={ativo}
                        className="flex w-[64px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors"
                        style={ativo ? { background: TINTA, borderColor: TINTA, color: '#fff' } : { borderColor: LINHA, color: TINTA }}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-75">{sem}</span>
                        <span className="mt-0.5 text-[15px] font-semibold tabular-nums">{dm}</span>
                      </button>
                    )
                  })}
                </div>

                {diaAtual && (
                  <div className="mt-5 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
                    {diaAtual.horas.slice(0, 8).map((h) => (
                      <Link key={h} href={link(diaAtual.data, h)} className="rounded-xl border border-[#E7DECF] py-2.5 text-center text-[14px] font-semibold tabular-nums text-[#2A2520] transition-colors hover:border-[#2A2520] hover:bg-[#2A2520] hover:text-white sm:w-[84px]">
                        {h}
                      </Link>
                    ))}
                  </div>
                )}
                {diaAtual && diaAtual.horas.length > 8 && (
                  <Link href={`/${slug}/agendar?servicos=${servico.id}&prof=${pessoa.id}${chegada ? `&${chegada}` : ''}`} className="mt-4 inline-block text-[13.5px] font-semibold underline underline-offset-4" style={{ color: cor }}>
                    Ver todos os horários
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export default function AgendaAoVivo({
  equipe, servicos, agenda, businessId, slug, chegada, cor,
}: {
  equipe: Pessoa[]; servicos: Servico[]; agenda: Agenda; businessId: string; slug: string; chegada: string; cor: string
}) {
  // a dona primeiro; só quem tem expediente e algum serviço
  const pessoas = [...equipe]
    .sort((a, b) => Number(b.dona) - Number(a.dona))
    .map((p) => ({
      p,
      // avaliação vai pro fim da lista: o que ela procura primeiro é o procedimento
      lista: servicos.filter((s) => fazServico(agenda.porProf, s.id, p.id)).sort((x, y) => Number(x.avaliacao) - Number(y.avaliacao)),
    }))
    .filter(({ p, lista }) => lista.length && agenda.semanal.some((w) => w.professional_id === p.id))
  const [aberto, setAberto] = useState<string | null>(pessoas[0]?.p.id ?? null)
  if (!pessoas.length) return null

  return (
    <div className="grid gap-4 sm:gap-5">
      {pessoas.map(({ p, lista }) => (
        <Cartao
          key={p.id}
          pessoa={p}
          servicos={lista}
          agenda={agenda}
          businessId={businessId}
          slug={slug}
          chegada={chegada}
          cor={cor}
          aberto={aberto === p.id}
          onAbrir={() => setAberto((a) => (a === p.id ? null : p.id))}
        />
      ))}
    </div>
  )
}
