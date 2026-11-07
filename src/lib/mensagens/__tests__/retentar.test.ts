/* Mensagem barrada por motivo passageiro volta quando a trava cai (06/11/2026).
   Os cinco pontos da missão, cada um com o seu teste:
   1. trava passageira não prende a chave pra sempre;
   2. nunca em dobro, nem com duas chamadas ao mesmo tempo;
   3. o log não cresce enquanto o portão segue fechado (Ivna);
   4. aviso fora da janela não sai;
   5. linha antiga (antes do corte — os 6 da Wanessa) não volta. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BancoFalso } from './banco-falso'

const estado = vi.hoisted(() => ({
  portao: new Map<string, { pode: true } | { pode: false; motivo: string }>(),
  enviados: [] as { para: string; template: string }[],
  db: null as unknown,
}))

vi.mock('../franquia', () => ({
  podeEnviar: vi.fn(async (_db: unknown, bid: string) => estado.portao.get(bid) ?? { pode: true }),
}))
vi.mock('../canal-cloud', () => ({
  credencialDoSistema: () => ({ token: 'x', phoneId: 'y' }),
  normalizarTelefone: (t: string) => (t ?? '').replace(/\D/g, '') || null,
  enviarTemplate: vi.fn(async (_c: unknown, para: string, t: { nome: string }) => {
    estado.enviados.push({ para, template: t.nome })
    return { ok: true, providerId: `wamid.${estado.enviados.length}` }
  }),
}))
vi.mock('../templates-cloud', () => ({
  TEMPLATES: {},
  resolverTemplate: async () => ({ nome: 'tpl', idioma: 'pt_BR', params: () => [] }),
  payloadsDosBotoes: () => undefined,
  botoesDoTipo: () => undefined,
  unidadesDaFranquia: () => 1,
}))
vi.mock('../botao-confirmar', () => ({ decidirBotao: async () => false }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => estado.db }))
vi.mock('@/lib/alert', () => ({ sendAlert: async () => {} }))

import { enviar, type PedidoEnvio } from '../enviar'
import { linhaRetomavel, RETENTAR_DESDE, MOTIVOS_PASSAGEIROS } from '../retentar'
import { GET as varrer } from '@/app/api/mensagens/varrer/route'

const NEG = 'neg-wanessa'
const IVNA = 'neg-ivna'
const br = (s: string) => new Date(`${s}-03:00`)

function semear(db: BancoFalso, negocios: string[]) {
  for (const id of negocios) {
    db.linhas('businesses').push({ id, name: `Salão ${id}`, phone: '(63) 99292-0080', sinal_enabled: false })
    db.linhas('subscriptions').push({ business_id: id, status: 'active', permanent_courtesy: false, grace_ends_at: null })
    db.linhas('message_rules').push({
      business_id: id, tipo: 'lembrete_vespera', enabled: true, offset_minutos: -1440,
      hora_do_dia: '09:00', retorno_dias: null, template: null, com_botao: true,
    })
  }
}

function pedido(over: Partial<PedidoEnvio> = {}): PedidoEnvio {
  return {
    businessId: NEG, tipo: 'lembrete_vespera', chave: 'lembrete_vespera:ap1:2026-11-11T10:30',
    destino: { telefone: '(63) 98111-2233' },
    variaveis: { cliente: 'Tati', salao: 'S', data: '11/11', hora: '10:30', servico: 'Cílios', telefoneSalao: null },
    appointmentId: 'ap1', customerId: 'cli1',
    retentarAte: br('2026-11-11T10:30').getTime(),
    ...over,
  }
}

const logDe = (db: BancoFalso, chave?: string) =>
  db.linhas('message_log').filter((l) => !chave || l.chave === chave)

let db: BancoFalso
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(br('2026-11-10T11:00'))
  db = new BancoFalso()
  estado.db = db
  estado.portao.clear()
  estado.enviados.length = 0
  semear(db, [NEG, IVNA])
  process.env.CRON_SECRET = 'segredo'
})
afterEach(() => vi.useRealTimers())

describe('regra pura', () => {
  it('só motivo passageiro, só ignorado, só depois do corte', () => {
    const nova = new Date(RETENTAR_DESDE + 1000).toISOString()
    expect(linhaRetomavel({ status: 'ignorado', erro: 'sem_saldo', created_at: nova })).toBe(true)
    expect(linhaRetomavel({ status: 'enviado', erro: null, created_at: nova })).toBe(false)
    expect(linhaRetomavel({ status: 'processando', erro: null, created_at: nova })).toBe(false)
    expect(linhaRetomavel({ status: 'ignorado', erro: 'opt_out', created_at: nova })).toBe(false)
    expect(linhaRetomavel({ status: 'ignorado', erro: 'telefone_invalido', created_at: nova })).toBe(false)
    expect(linhaRetomavel({ status: 'ignorado', erro: 'sem_saldo', created_at: '2026-11-06T14:00:00Z' })).toBe(false)
    expect([...MOTIVOS_PASSAGEIROS].sort()).toEqual(
      ['assinatura_bloqueada', 'canal_nao_liberado', 'sem_assinatura', 'sem_pacote_contratado', 'sem_saldo'],
    )
  })
})

describe('1 · trava passageira não prende a chave', () => {
  it('sem_saldo às 11h, saldo liberado ao meio-dia: a próxima tentativa sai', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    expect(await enviar(db as never, pedido())).toEqual({ status: 'ignorado', motivo: 'sem_saldo' })
    expect(logDe(db)).toHaveLength(1)
    expect(logDe(db)[0]).toMatchObject({ status: 'ignorado', erro: 'sem_saldo' })

    vi.setSystemTime(br('2026-11-10T12:00'))
    estado.portao.set(NEG, { pode: true })
    expect(await enviar(db as never, pedido())).toEqual({ status: 'enviado', canal: 'whatsapp' })
    expect(estado.enviados).toHaveLength(1)
    // a MESMA linha virou enviado — e com created_at da tentativa que saiu (conta no ciclo novo)
    expect(logDe(db)).toHaveLength(1)
    expect(logDe(db)[0]).toMatchObject({ status: 'enviado', erro: null, provider_id: 'wamid.1' })
    expect(logDe(db)[0].created_at).toBe(br('2026-11-10T12:00').toISOString())
  })

  it('assinatura_bloqueada também volta depois de pagar', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'assinatura_bloqueada' })
    await enviar(db as never, pedido())
    estado.portao.set(NEG, { pode: true })
    expect((await enviar(db as never, pedido())).status).toBe('enviado')
  })

  it('motivo do destinatário (opt_out etc.) continua definitivo', async () => {
    db.linhas('message_log').push({
      chave: pedido().chave, status: 'ignorado', erro: 'numero_sem_whatsapp',
      business_id: NEG, canal: 'whatsapp', created_at: br('2026-11-10T10:00').toISOString(),
    })
    expect(await enviar(db as never, pedido())).toEqual({ status: 'ignorado', motivo: 'ja_enviado' })
    expect(estado.enviados).toHaveLength(0)
  })
})

describe('2 · nunca em dobro', () => {
  it('duas chamadas ao mesmo tempo depois da liberação: sai UMA', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    await enviar(db as never, pedido())
    estado.portao.set(NEG, { pode: true })
    const r = await Promise.all([enviar(db as never, pedido()), enviar(db as never, pedido()), enviar(db as never, pedido())])
    expect(r.filter((x) => x.status === 'enviado')).toHaveLength(1)
    expect(r.filter((x) => x.status === 'ignorado' && x.motivo === 'ja_enviado')).toHaveLength(2)
    expect(estado.enviados).toHaveLength(1)
    expect(logDe(db)).toHaveLength(1)
  })

  it('já enviado não é retomado, mesmo com janela aberta', async () => {
    await enviar(db as never, pedido())
    expect(await enviar(db as never, pedido())).toEqual({ status: 'ignorado', motivo: 'ja_enviado' })
    expect(estado.enviados).toHaveLength(1)
  })

  it('primeira chamada concorrente segue à prova do UNIQUE', async () => {
    const r = await Promise.all([enviar(db as never, pedido()), enviar(db as never, pedido())])
    expect(r.filter((x) => x.status === 'enviado')).toHaveLength(1)
    expect(estado.enviados).toHaveLength(1)
  })
})

describe('3 · o log não inunda (Ivna sem pacote)', () => {
  it('14 tentativas com o portão fechado: 1 linha, nenhuma escrita depois da primeira', async () => {
    estado.portao.set(IVNA, { pode: false, motivo: 'sem_pacote_contratado' })
    const p = pedido({ businessId: IVNA, chave: 'lembrete_vespera:ivna1:2026-11-11T10:30' })
    await enviar(db as never, p)
    const escritasDepoisDaPrimeira = db.escritas.message_log
    const antes = { ...logDe(db)[0] }
    for (let i = 0; i < 14; i++) await enviar(db as never, p)
    expect(logDe(db)).toHaveLength(1)
    expect(db.escritas.message_log).toBe(escritasDepoisDaPrimeira)
    expect(logDe(db)[0]).toEqual(antes)
    expect(estado.enviados).toHaveLength(0)
  })

  it('motivo que muda é corrigido na mesma linha, sem linha nova', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    await enviar(db as never, pedido())
    estado.portao.set(NEG, { pode: false, motivo: 'assinatura_bloqueada' })
    await enviar(db as never, pedido())
    expect(logDe(db)).toHaveLength(1)
    expect(logDe(db)[0]).toMatchObject({ status: 'ignorado', erro: 'assinatura_bloqueada' })
  })
})

describe('4 · aviso fora da janela não sai', () => {
  it('liberou depois do atendimento: continua barrado', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    await enviar(db as never, pedido())
    vi.setSystemTime(br('2026-11-11T11:00')) // atendimento era 10:30
    estado.portao.set(NEG, { pode: true })
    expect(await enviar(db as never, pedido())).toEqual({ status: 'ignorado', motivo: 'ja_enviado' })
    expect(estado.enviados).toHaveLength(0)
    expect(logDe(db)[0]).toMatchObject({ status: 'ignorado', erro: 'sem_saldo' })
  })

  it('chamador que não declara janela mantém o comportamento antigo', async () => {
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    await enviar(db as never, pedido({ retentarAte: undefined }))
    estado.portao.set(NEG, { pode: true })
    expect(await enviar(db as never, pedido({ retentarAte: undefined }))).toEqual({ status: 'ignorado', motivo: 'ja_enviado' })
    expect(estado.enviados).toHaveLength(0)
  })
})

describe('5 · linha antiga não volta (os 6 da Wanessa)', () => {
  it('ignorado sem_saldo de 06/11 11h, portão aberto e janela aberta: não sai', async () => {
    db.linhas('message_log').push({
      chave: pedido().chave, status: 'ignorado', erro: 'sem_saldo', business_id: NEG,
      canal: 'whatsapp', created_at: '2026-11-06T14:00:00.000Z',
    })
    estado.portao.set(NEG, { pode: true })
    expect(await enviar(db as never, pedido())).toEqual({ status: 'ignorado', motivo: 'ja_enviado' })
    expect(estado.enviados).toHaveLength(0)
    expect(logDe(db)[0]).toMatchObject({ status: 'ignorado', erro: 'sem_saldo', created_at: '2026-11-06T14:00:00.000Z' })
  })
})

/* ── A VARREDURA DE PONTA A PONTA ─────────────────────────────── */

const pedirVarredura = () =>
  varrer(new Request('http://x/api/mensagens/varrer', { headers: { authorization: 'Bearer segredo' } }) as never)

function agendamento(id: string, bid: string, data: string, hora: string, fone: string, criado: string) {
  db.linhas('appointments').push({
    id, business_id: bid, appointment_date: data, start_time: `${hora}:00`, client_name: 'Tati',
    client_phone: fone, client_email: null, service_name: 'Cílios', customer_id: `cli-${id}`,
    created_at: br(criado).toISOString(), status: 'confirmed', recurring_group_id: null, recurring_index: null,
    sinal_valor: null, sinal_pago_at: null, customer: null,
    business: { name: 'Salão', phone: '(63) 99292-0080', owner_id: 'o' }, professional: { name: 'Ana' },
  })
}

describe('varredura', () => {
  it('Wanessa: barra sem saldo, não repete enquanto fechado, sai uma vez ao liberar', async () => {
    agendamento('ap1', NEG, '2026-11-11', '10:30', '(63) 98111-2233', '2026-11-01T09:00')
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })

    let j = await (await pedirVarredura()).json()
    expect(j).toMatchObject({ processados: 1, ignorados: 1, restam: 0 })
    expect(logDe(db)).toHaveLength(1)

    // rodadas seguintes com o portão fechado: tarefa nem entra no lote, restam 0 (workflow não repete)
    for (let i = 0; i < 3; i++) {
      vi.setSystemTime(br(`2026-11-10T1${2 + i}:00`))
      j = await (await pedirVarredura()).json()
      expect(j).toMatchObject({ processados: 0, retomadas: 0, restam: 0 })
    }
    expect(logDe(db)).toHaveLength(1)

    estado.portao.set(NEG, { pode: true })
    vi.setSystemTime(br('2026-11-10T16:00'))
    j = await (await pedirVarredura()).json()
    expect(j).toMatchObject({ processados: 1, enviados: 1, retomadas: 1 })
    expect(logDe(db)[0]).toMatchObject({ status: 'enviado' })

    vi.setSystemTime(br('2026-11-10T17:00'))
    j = await (await pedirVarredura()).json()
    expect(j).toMatchObject({ processados: 0, ja_saiu: 1 })
    expect(estado.enviados).toHaveLength(1)
    expect(logDe(db)).toHaveLength(1)
  })

  it('Ivna: 14 rodadas sem pacote = 1 linha no log e nenhum envio', async () => {
    agendamento('iv1', IVNA, '2026-11-11', '10:30', '(63) 98444-5566', '2026-11-01T09:00')
    estado.portao.set(IVNA, { pode: false, motivo: 'sem_pacote_contratado' })
    for (let h = 0; h < 14; h++) {
      vi.setSystemTime(new Date(br('2026-11-10T07:00').getTime() + h * 50 * 60_000))
      await pedirVarredura()
    }
    expect(logDe(db)).toHaveLength(1)
    expect(estado.enviados).toHaveLength(0)
  })

  it('janela vencida: barrado às 11h, liberado só no dia seguinte, lembrete não sai', async () => {
    agendamento('ap1', NEG, '2026-11-11', '10:30', '(63) 98111-2233', '2026-11-01T09:00')
    estado.portao.set(NEG, { pode: false, motivo: 'sem_saldo' })
    await pedirVarredura()
    estado.portao.set(NEG, { pode: true })
    for (const t of ['2026-11-10T23:00', '2026-11-11T08:00', '2026-11-11T10:00']) {
      vi.setSystemTime(br(t))
      await pedirVarredura()
    }
    expect(estado.enviados).toHaveLength(0)
    expect(logDe(db)[0]).toMatchObject({ status: 'ignorado', erro: 'sem_saldo' })
  })

  it('linha de antes do corte, com a tarefa ainda na janela: não volta', async () => {
    // confirmação de agendamento criado 06/11 23h pra 07/11 10h; às 08h de 07/11 ainda está na janela de 12h
    db.linhas('message_rules').push({
      business_id: NEG, tipo: 'confirmacao', enabled: true, offset_minutos: 0,
      hora_do_dia: '09:00', retorno_dias: null, template: null, com_botao: true,
    })
    agendamento('apC', NEG, '2026-11-07', '10:00', '(63) 98777-8899', '2026-11-06T23:00')
    db.linhas('message_log').push({
      chave: 'confirmacao:apC', status: 'ignorado', erro: 'sem_saldo', business_id: NEG,
      canal: 'whatsapp', created_at: br('2026-11-06T23:30').toISOString(),
    })
    estado.portao.set(NEG, { pode: true })
    vi.setSystemTime(br('2026-11-07T08:00'))
    const j = await (await pedirVarredura()).json()
    expect(j).toMatchObject({ candidatos: 1, ja_saiu: 1, retomadas: 0, processados: 0 })
    expect(estado.enviados).toHaveLength(0)
  })
})
