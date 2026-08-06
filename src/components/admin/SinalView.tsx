'use client'

/* ═══════════════════════════════════════════════════════════════
   SINAL — configuração + cobrança dos horários reservados

   Wanessa Silva (05/08): "manualmente. muito trabalhoso. e tenho faltas.
   então preciso de sinal."

   Medido: ~90% dos agendamentos da base são o próprio dono marcando. Por
   isso a peça central desta tela não é a configuração — é a LISTA, com o
   botão que manda a cobrança pro WhatsApp da cliente. O dono agenda como
   sempre fez e depois cobra em um toque.

   O botão de cobrar leva o copia-e-cola DENTRO da mensagem. A cliente
   recebe, copia do próprio WhatsApp e paga — sem link, sem app, sem
   cadastro. É o caminho com menos passos que existe hoje no Brasil.

   "Recebi" é manual de propósito: o dinheiro cai direto na conta dela,
   sem gateway, então quem sabe que entrou é ela olhando o banco.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { linkCobrancaWhatsApp, textoPrazo } from '@/lib/sinal-cobranca'

type Pendente = {
  id: string
  client_name: string | null
  client_phone: string | null
  service_name: string | null
  appointment_date: string
  start_time: string
  total_price: number | null
  sinal_valor: number | null
  copiaECola: string | null
  minutosPraVencer: number | null
}

type Config = {
  pixKey: string
  recebedor: string
  cidade: string
  ativo: boolean
  percentual: number
  cancelHoras: number
  creditoDias: number
  expiraMinutos: number
  nomeNegocio: string
  telefoneNegocio: string | null
}

/* Prazo em minutos no banco, mas a dona escolhe em linguagem de gente.
   Pedir "digite os minutos" pra quem quer dizer "duas horas" é fazer a
   pessoa fazer conta à toa. */
const PRAZOS = [
  { min: 30, label: '30 minutos' },
  { min: 60, label: '1 hora' },
  { min: 120, label: '2 horas' },
  { min: 240, label: '4 horas' },
  { min: 720, label: '12 horas' },
  { min: 1440, label: '24 horas' },
  { min: 2880, label: '2 dias' },
]

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const dataCurta = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/')

export default function SinalView() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [agindo, setAgindo] = useState<string | null>(null)
  /* Percentual guardado como TEXTO, não número. Com number, apagar o campo
     virava Number('') = 0 e o zero voltava sozinho — o dono não conseguia
     limpar pra digitar outro valor (Eduardo, 05/08, testando no iPhone). */
  const [percentTexto, setPercentTexto] = useState('')

  async function carregar() {
    const r = await fetch('/api/admin/sinal').then((x) => x.json()).catch(() => null)
    if (r?.config) {
      setCfg(r.config)
      setPercentTexto(String(r.config.percentual ?? ''))
      setPendentes(r.pendentes ?? [])
    }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!cfg) return
    setSalvando(true)
    setErro(null)
    const r = await fetch('/api/admin/sinal', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...cfg, percentual: Number(percentTexto) }),
    }).then((x) => x.json()).catch(() => null)
    setSalvando(false)
    if (!r?.ok) { setErro(r?.error || 'Não consegui salvar.'); return }
    /* Ligou o sinal sem WhatsApp cadastrado: avisa no ato, não só no banner do
       topo que ela pode ter rolado sem ler. É a hora em que a decisão foi
       tomada — depois disso a cliente já pode cair no cancelamento sem saída. */
    if (cfg.ativo && !(cfg.telefoneNegocio || '').replace(/\D/g, '')) {
      setAviso('Salvo. Cadastre o WhatsApp do negócio pra cliente conseguir remarcar com você.')
      setTimeout(() => setAviso(null), 6000)
      return
    }
    setAviso('Salvo.')
    setTimeout(() => setAviso(null), 2500)
    carregar()
  }

  async function agir(id: string, acao: 'recebi' | 'cancelar') {
    setAgindo(id)
    const r = await fetch('/api/admin/sinal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appointmentId: id, acao }),
    }).then((x) => x.json()).catch(() => null)
    setAgindo(null)
    if (!r?.ok) { setErro('Não consegui atualizar. Tente de novo.'); return }
    setPendentes((lista) => lista.filter((p) => p.id !== id))
  }

  /* O texto mora em lib/sinal-cobranca — a tela de sucesso do agendamento
     cobra pelo mesmo caminho, e duas cópias divergiriam no primeiro ajuste.
     A cliente receberia mensagens diferentes conforme o botão que a dona
     apertou. */
  function linkCobranca(p: Pendente) {
    return linkCobrancaWhatsApp({
      clienteNome: p.client_name,
      clienteTelefone: p.client_phone,
      servico: p.service_name,
      data: p.appointment_date,
      hora: p.start_time,
      valorSinal: Number(p.sinal_valor ?? 0),
      copiaECola: p.copiaECola,
      minutosPraVencer: p.minutosPraVencer,
    })
  }

  if (carregando) return <p className="text-sm opacity-60 p-4">Carregando…</p>
  if (!cfg) return <p className="text-sm p-4">Não consegui carregar. Recarrega a página.</p>

  return (
    <div className="space-y-6 pb-24">
      {erro && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {erro}
        </div>
      )}

      {/* WhatsApp DO NEGÓCIO faltando (06/08) · o sinal inteiro depende de
          conversa: cobrar, confirmar que caiu, remarcar. Sem o número, o botão
          "Prefiro remarcar" some da tela de cancelamento e a cliente cancela
          em vez de remarcar — o salão perde o horário e ainda devolve o sinal.

          Fica no topo e só aparece quando falta. Aviso que some sozinho ao ser
          resolvido não vira paisagem. */}
      {!(cfg.telefoneNegocio || '').replace(/\D/g, '') && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.34)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Falta cadastrar o WhatsApp do seu negócio
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            É por ele que a cliente fala com você pra remarcar. Sem o número, quem precisa mudar
            o horário só tem a opção de cancelar — e aí o horário fica vago e você ainda devolve
            o sinal.
          </p>
          <a
            href="/admin/configuracoes?tab=negocio"
            className="mt-2.5 inline-block rounded-lg px-3 py-2 text-xs font-bold"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            Cadastrar agora
          </a>
        </div>
      )}

      {/* ── A lista vem primeiro: é o que ela abre a tela pra fazer ── */}
      <section>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
          Aguardando sinal {pendentes.length > 0 && `(${pendentes.length})`}
        </h2>
        <p className="text-[11px] mb-3" style={{ color: 'var(--admin-text-faded)' }}>
          Horários reservados que ainda não foram pagos.
        </p>

        {pendentes.length === 0 ? (
          <div className="admin-card-deep p-5 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
              {cfg.ativo ? 'Nenhum horário esperando sinal.' : 'O sinal está desligado.'}
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              {cfg.ativo
                ? 'Quando você marcar um horário, ele aparece aqui pra cobrar.'
                : 'Ligue abaixo pra começar a cobrar sinal nos agendamentos.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map((p) => {
              const link = linkCobranca(p)
              return (
                <div key={p.id} className="admin-card-deep p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                        {p.client_name || 'Cliente'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                        {p.service_name || 'Atendimento'} · {dataCurta(p.appointment_date)} às {p.start_time.slice(0, 5)}
                      </p>
                      {/* Quanto o horário ainda aguenta. Cobrar quem vence em 4
                          minutos é pior que não cobrar — a cliente paga e o
                          horário já foi. Vermelho a partir de 30 min. */}
                      {typeof p.minutosPraVencer === 'number' && (
                        <p
                          className="text-[11px] mt-1 font-semibold"
                          style={{ color: p.minutosPraVencer <= 30 ? '#DC2626' : 'var(--admin-text-faded)' }}
                        >
                          {p.minutosPraVencer <= 0
                            ? 'Prazo vencido — o horário será liberado'
                            : `Segura o horário por mais ${textoPrazo(p.minutosPraVencer)}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black tabular-nums" style={{ color: '#F59E0B' }}>
                        {brl(Number(p.sinal_valor ?? 0))}
                      </p>
                      {p.total_price ? (
                        <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                          de {brl(Number(p.total_price))}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center text-white"
                        style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}
                      >
                        Cobrar no WhatsApp
                      </a>
                    ) : (
                      <span className="flex-1 py-2.5 rounded-xl text-xs text-center" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-faded)' }}>
                        {p.client_phone ? 'Configure a chave PIX' : 'Cliente sem telefone'}
                      </span>
                    )}
                    <button
                      onClick={() => agir(p.id, 'recebi')}
                      disabled={agindo === p.id}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background: 'rgba(16,185,129,0.14)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}
                    >
                      Recebi
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Configuração: preenche uma vez e esquece ── */}
      <section>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--admin-text)' }}>
          Como funciona o seu sinal
        </h2>
        <div className="admin-card-deep p-4 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Cobrar sinal para confirmar horário
            </span>
            <input
              type="checkbox"
              checked={cfg.ativo}
              onChange={(e) => setCfg({ ...cfg, ativo: e.target.checked })}
              className="w-5 h-5"
            />
          </label>

          <div>
            <label className="admin-label">Chave PIX</label>
            <input
              value={cfg.pixKey}
              onChange={(e) => setCfg({ ...cfg, pixKey: e.target.value })}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              O dinheiro cai direto na sua conta. O AgendaPRO não recebe nada e não cobra taxa.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="admin-label">Nome de quem recebe</label>
              <input
                value={cfg.recebedor}
                onChange={(e) => setCfg({ ...cfg, recebedor: e.target.value })}
                placeholder="Seu nome completo"
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                E o nome que a cliente ve no app do banco dela. Use o titular da conta,
                nao o nome do salao.
              </p>
            </div>
            <div style={{ width: 120 }}>
              <label className="admin-label">Percentual</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={percentTexto}
                  onChange={(e) => setPercentTexto(e.target.value.replace(/D/g, '').slice(0, 3))}
                  placeholder="30"
                  className="admin-input w-full px-3 py-2.5 text-sm pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>%</span>
              </div>
            </div>
          </div>

          {/* Regra de cancelamento (v113). Os números vêm da Wanessa — 24h e 30
              dias — mas são dela: clínica de procedimento caro pode querer 48h,
              barbearia pode querer 2h. */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="admin-label">Cancelar sem perder o sinal até</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(cfg.cancelHoras ?? 24)}
                  onChange={(e) =>
                    setCfg({ ...cfg, cancelHoras: Number(e.target.value.replace(/\D/g, '').slice(0, 3) || 0) })
                  }
                  className="admin-input w-full px-3 py-2.5 text-sm pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                  horas
                </span>
              </div>
            </div>
            <div className="flex-1">
              <label className="admin-label">Crédito vale por</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(cfg.creditoDias ?? 30)}
                  onChange={(e) =>
                    setCfg({ ...cfg, creditoDias: Number(e.target.value.replace(/\D/g, '').slice(0, 3) || 0) })
                  }
                  className="admin-input w-full px-3 py-2.5 text-sm pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                  dias
                </span>
              </div>
            </div>
          </div>
          {/* Prazo pra pagar (v115). Sem isto o horário ficava reservado pra
              sempre esperando um PIX que talvez nunca venha — e o sinal, que
              existe pra proteger a agenda, acabava travando ela. */}
          <div>
            <label className="admin-label">Segurar o horário esperando o PIX por</label>
            <select
              value={String(cfg.expiraMinutos ?? 120)}
              onChange={(e) => setCfg({ ...cfg, expiraMinutos: Number(e.target.value) })}
              className="admin-input w-full px-3 py-2.5 text-sm"
            >
              {PRAZOS.map((p) => (
                <option key={p.min} value={p.min}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              Passou desse tempo sem o sinal cair, o horário volta a ficar livre pra outra cliente
              marcar. Ninguém segura sua agenda sem pagar.
            </p>
          </div>

          <p className="text-[11px] -mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Cancelando <b>antes</b> desse prazo, o sinal vira crédito na ficha da cliente e ela usa
            em outro horário. Cancelando <b>depois</b>, o sinal fica com você. Quando <b>você</b>{' '}
            cancela pelo painel, vira crédito sempre — a cliente não pode perder dinheiro por uma
            desmarcação sua.
          </p>

          <div>
            <label className="admin-label">Cidade (opcional)</label>
            <input
              value={cfg.cidade}
              onChange={(e) => setCfg({ ...cfg, cidade: e.target.value })}
              placeholder="Cidade da sua conta"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
            {/* O padrao do PIX (BACEN) exige o campo cidade no codigo. Nao muda
                pra onde o dinheiro vai — se ficar vazio mandamos BRASIL. Dito
                aqui porque o dono pergunta, com razao, por que precisa disso. */}
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              O padrao do PIX pede esse campo dentro do codigo. Nao muda pra onde o
              dinheiro vai — se deixar vazio, usamos "BRASIL".
            </p>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}
          >
            {salvando ? 'Salvando…' : aviso ? aviso : 'Salvar'}
          </button>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-faded)' }}>
            Com o sinal ligado, o horário fica <b>reservado</b> até você marcar “Recebi”.
            Quem agenda pelo seu link já vê o PIX na tela; quem você marca na agenda entra
            na lista acima pra você cobrar pelo WhatsApp.
          </p>
        </div>
      </section>
    </div>
  )
}
