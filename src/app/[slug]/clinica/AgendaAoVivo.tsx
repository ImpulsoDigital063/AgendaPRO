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

  const dias = oc && servico ? diasLivres(agenda, oc, pessoa.id, servico) : null
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

      {aberto && servico && (
        <div className="border-t px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6" style={{ borderColor: LINHA }}>
          {/* celular: uma linha que rola de lado; computador: quebra em até 3 linhas e rola por dentro */}
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:max-h-[132px] sm:flex-wrap sm:overflow-y-auto sm:overflow-x-visible sm:px-0 sm:pb-0 sm:[scrollbar-width:thin]">
            {servicos.map((s) => {
              const ativo = s.id === servico.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setEscolhido(s.id)}
                  title={s.nome}
                  className="max-w-[260px] shrink-0 truncate whitespace-nowrap rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors sm:max-w-[360px]"
                  style={ativo ? { background: TINTA, borderColor: TINTA, color: '#fff' } : { borderColor: LINHA, color: TINTA }}
                >
                  {s.nome}
                </button>
              )
            })}
          </div>

          <div className="mt-6 sm:mt-7">
            {falhou ? (
              <p className="text-[14px]" style={{ color: SUAVE }}>Não deu pra carregar os horários agora. Toque em Agendar atendimento pra ver a agenda completa.</p>
            ) : !dias ? (
              <div className="flex gap-3" aria-label="Carregando horários">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[84px] shrink-0 sm:w-[96px]">
                    <div className="mx-auto h-3 w-14 animate-pulse rounded bg-[#EFE8DC]" />
                    <div className="mt-3 h-10 animate-pulse rounded-xl bg-[#F4EFE7]" />
                    <div className="mt-2 h-10 animate-pulse rounded-xl bg-[#F4EFE7]" />
                  </div>
                ))}
              </div>
            ) : dias.length === 0 ? (
              <p className="text-[14px]" style={{ color: SUAVE }}>Sem horário livre com {primeiro} nos próximos {JANELA_DIAS} dias pra esse procedimento.</p>
            ) : (
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
                {dias.map((d) => (
                  <div key={d.data} className="w-[84px] shrink-0 sm:w-auto">
                    <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: SUAVE }}>{d.rotulo}</p>
                    <div className="mt-3 grid gap-2">
                      {d.horas.slice(0, 5).map((h) => (
                        <Link key={h} href={link(d.data, h)} className="rounded-xl border border-[#E7DECF] py-2.5 text-center text-[14px] font-semibold tabular-nums text-[#2A2520] transition-colors hover:border-[#2A2520] hover:bg-[#2A2520] hover:text-white">
                          {h}
                        </Link>
                      ))}
                      {d.horas.length > 5 && (
                        <Link href={link(d.data, d.horas[5])} className="py-1 text-center text-[12px] font-semibold" style={{ color: cor }}>
                          +{d.horas.length - 5}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-[12.5px] leading-relaxed sm:mt-7 sm:text-[13px]" style={{ color: SUAVE }}>
            Toque num horário pra marcar online <span style={{ color: TINTA }}>({servico.nome}{dur ? ` · ${tempo(dur)}` : ''} · {primeiro})</span>.
          </p>
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
