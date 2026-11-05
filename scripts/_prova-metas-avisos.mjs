/* Prova das regras de aviso da aba Metas (lib/metas/avisos) com datas simuladas.
   Rodar na raiz: node scripts/_prova-metas-avisos.mjs */
import { createJiti } from 'jiti'
import path from 'node:path'
const jiti = createJiti(import.meta.url, { alias: { '@': path.resolve('src') } })
const { decidirAviso, diasDoMes, fraseDaAcao } = await jiti.import(path.resolve('src/lib/metas/avisos.ts'))

let falhas = 0
const ok = (nome, cond, extra = '') => { console.log(`${cond ? 'OK    ' : 'FALHOU'} ${nome}${extra ? ' -> ' + extra : ''}`); if (!cond) falhas++ }

const acaoLivres = { tipo: 'horarios-livres', titulo: '3 horários livres amanhã', detalhe: '9h · 10h · 14h', botao: null }
const acaoSumidos = { tipo: 'sumidos', titulo: '7 clientes sem voltar há mais de 45 dias', detalhe: 'uma mensagem pode trazer de volta', botao: null }
function fontes(o = {}) {
  return {
    hoje: '2026-11-05', modo: 'diario',
    meta: { valor: 8300, ticket: 190, bateuAvisado: false },
    jaNoMes: new Set(),
    faturado: async () => 3000,
    dias: async () => ({ restantes: 18, passados: 4, total: 22 }),
    mesAnterior: async () => null,
    semana: async () => 1250,
    acao: async () => acaoLivres,
    ...o,
  }
}
// brl() usa o espaço fino do pt-BR (U+00A0) depois do "R$": normaliza pra comparar
const r = async (o) => {
  const x = await decidirAviso(fontes(o))
  return x && { ...x, corpo: x.corpo.replace(/ /g, ' ') }
}
const D = (restantes, passados, total) => async () => ({ restantes, passados, total })
const F = (v) => async () => v
let a

// 90% -> quase la
a = await r({ meta: { valor: 4000, ticket: 190, bateuAvisado: false }, faturado: F(3620) })
ok('quase lá (90,5%)', a?.tipo === 'quase' && a.corpo === 'Faltam só R$ 380 pra bater a meta de novembro. ~2 atendimentos resolvem.', a?.corpo)
a = await r({ meta: { valor: 4000, ticket: null, bateuAvisado: false }, faturado: F(3620) })
ok('quase lá sem ticket não inventa atendimentos', a?.corpo === 'Faltam só R$ 380 pra bater a meta de novembro.', a?.corpo)
a = await r({ meta: { valor: 4000, ticket: 190, bateuAvisado: false }, faturado: F(3590) })
ok('89,75% não é quase lá', a === null, String(a?.tipo))
a = await r({ meta: { valor: 4000, ticket: 190, bateuAvisado: false }, faturado: F(3620), jaNoMes: new Set(['quase']) })
ok('quase lá só 1x no mês', a === null, String(a?.tipo))

// bateu
a = await r({ faturado: F(8400) })
ok('bateu no diário', a?.tipo === 'bateu' && a.corpo === 'Novembro: R$ 8.400 de R$ 8.300', a?.corpo)
a = await r({ modo: 'bateu', faturado: F(8400) })
ok('bateu no job das 21h', a?.tipo === 'bateu')
a = await r({ modo: 'bateu', faturado: F(7600) })
ok('21h não manda quase lá', a === null, String(a?.tipo))
a = await r({ faturado: F(8400), meta: { valor: 8300, ticket: 190, bateuAvisado: true } })
ok('bateu já avisado não repete', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-30', faturado: F(8400), dias: D(1, 21, 22) })
ok('prioridade: bateu > reta final', a?.tipo === 'bateu')

// dia 1 - fechamento
const ant = async () => ({ valor: 6500, faturado: 5980 })
a = await r({ hoje: '2026-11-01', meta: null, faturado: F(0), mesAnterior: ant })
ok('fechamento sem meta nova -> definir', a?.tipo === 'fechamento' && a.corpo === 'Outubro fechou em R$ 5.980 (92% da meta). Qual a meta de novembro?' && a.url === '/admin/metas/definir?mes=2026-11', `${a?.corpo} | ${a?.url}`)
a = await r({ hoje: '2026-11-01', faturado: F(0), mesAnterior: async () => ({ valor: 6500, faturado: 6800 }) })
ok('fechamento com meta já definida', a?.corpo === 'Outubro fechou em R$ 6.800 (104% da meta). Meta batida! Meta de novembro: R$ 8.300.' && a.url === '/admin/metas', a?.corpo)
a = await r({ hoje: '2027-01-01', meta: null, faturado: F(0), mesAnterior: ant })
ok('fechamento na virada do ano', a?.titulo === 'Dezembro fechou' && a.corpo.endsWith('Qual a meta de janeiro?'), a?.corpo)
a = await r({ hoje: '2026-11-01', meta: null, mesAnterior: async () => null })
ok('dia 1 sem meta no mês anterior: nada', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-01', mesAnterior: ant, faturado: F(8400) })
ok('prioridade: bateu > fechamento', a?.tipo === 'bateu')
a = await r({ hoje: '2026-12-01', mesAnterior: ant, meta: { valor: 100, ticket: 50, bateuAvisado: false }, faturado: F(95) })
ok('prioridade: fechamento > quase lá', a?.tipo === 'fechamento')

// dia 3 - sem meta
a = await r({ hoje: '2026-11-03', meta: null })
ok('sem meta no dia 3', a?.tipo === 'sem_meta' && a.corpo === 'Defina sua meta de novembro em 2 passos.' && a.url === '/admin/metas/definir?mes=2026-11', a?.corpo)
a = await r({ hoje: '2026-11-04', meta: null })
ok('sem meta só no dia 3', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-03', meta: null, jaNoMes: new Set(['sem_meta']) })
ok('sem meta só 1x', a === null)
a = await r({ hoje: '2026-11-03', faturado: F(1000) })
ok('dia 3 com meta: não manda sem meta', a === null, String(a?.tipo))

// dia 15 - ritmo
a = await r({ hoje: '2026-11-15', faturado: F(3000), dias: D(11, 10, 21) })
ok('ritmo abaixo do proporcional (3000 < 3952) + horários livres', a?.tipo === 'ritmo' && a.corpo === 'Pra chegar nos R$ 8.300, o ritmo agora é R$ 490 por dia. Dá pra começar hoje: 3 horários livres amanhã (9h · 10h · 14h).', a?.corpo)
a = await r({ hoje: '2026-11-15', faturado: F(3000), dias: D(11, 10, 21), acao: async () => acaoSumidos })
ok('ritmo com clientes sumidas', a?.corpo.endsWith('Dá pra começar hoje: 7 clientes sem voltar há mais de 45 dias, uma mensagem pode trazer de volta.'), a?.corpo)
a = await r({ hoje: '2026-11-15', faturado: F(4000), dias: D(11, 10, 21) })
ok('ritmo em dia (4000 >= 3952): nada', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-14', faturado: F(3000), dias: D(12, 9, 21) })
ok('ritmo só no dia 15', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-15', faturado: F(100), dias: D(11, 10, 21) })
ok('ritmo nunca é bronca', a && !/abaixo|atras|atrás|devagar|ruim|precisa/i.test(a.corpo + a.titulo), a?.titulo)
ok('frase da ação: agenda cheia', fraseDaAcao({ tipo: 'nenhuma', titulo: 'Agenda cheia', detalhe: 'siga assim', botao: null }) === ' Sua agenda está cheia: siga assim.')

// fim do mes - reta final
a = await r({ hoje: '2026-11-26', faturado: F(6000), dias: D(3, 19, 22) })
ok('reta final (3 dias)', a?.tipo === 'reta' && a.corpo === 'Faltam R$ 2.300 em 3 dias, dá R$ 770 por dia.', a?.corpo)
a = await r({ hoje: '2026-11-25', faturado: F(6000), dias: D(4, 18, 22) })
ok('4 dias ainda não é reta final', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-27', faturado: F(6000), dias: D(2, 20, 22), jaNoMes: new Set(['reta']) })
ok('reta final só 1x', a === null)
a = await r({ hoje: '2026-11-27', faturado: F(6000), dias: D(2, 20, 22) })
ok('reta final que ficou pra depois sai com 2 dias', a?.corpo === 'Faltam R$ 2.300 em 2 dias, dá R$ 1.150 por dia.', a?.corpo)
a = await r({ hoje: '2026-11-26', faturado: F(7600), dias: D(3, 19, 22) })
ok('prioridade: quase lá > reta final', a?.tipo === 'quase')
a = await r({ hoje: '2026-11-26', faturado: F(7600), dias: D(3, 19, 22), jaNoMes: new Set(['quase']) })
ok('depois do quase lá, reta final', a?.tipo === 'reta')

// segunda - semana
a = await r({ hoje: '2026-11-09', faturado: F(3000), dias: D(16, 6, 22) })
ok('semana na segunda', a?.tipo === 'semana' && a.corpo === 'Semana passada: R$ 1.250 · faltam R$ 5.300 pra novembro', a?.corpo)
a = await r({ hoje: '2026-11-10', faturado: F(3000) })
ok('semana só na segunda', a === null, String(a?.tipo))
a = await r({ hoje: '2026-11-30', faturado: F(7000), dias: D(1, 21, 22) })
ok('prioridade: reta final > semana (30/11 é segunda)', a?.tipo === 'reta', a?.corpo)
ok('reta final no último dia não diz "1 dia por dia"', a?.corpo === 'Faltam R$ 1.300 e hoje é o último dia de trabalho de novembro.', a?.corpo)
a = await r({ hoje: '2026-11-09', faturado: F(7600) })
ok('prioridade: quase lá > semana', a?.tipo === 'quase')
a = await r({ hoje: '2026-11-09', faturado: F(8400), meta: { valor: 8300, ticket: 190, bateuAvisado: true } })
ok('semana com meta batida', a?.corpo === 'Semana passada: R$ 1.250 · meta de novembro batida', a?.corpo)

// diasDoMes (mesma queda da tela)
let d = diasDoMes('2026-11-15', { diasAbertos: Array(11).fill('x'), diasAbertosMes: 21 })
ok('dias com horário', d.restantes === 11 && d.passados === 10 && d.total === 21, JSON.stringify(d))
d = diasDoMes('2026-11-15', { diasAbertos: [], diasAbertosMes: 0 })
ok('dias sem horário = corridos', d.restantes === 16 && d.passados === 14 && d.total === 30, JSON.stringify(d))
d = diasDoMes('2026-02-27', { diasAbertos: [], diasAbertosMes: 0 })
ok('fevereiro: 27/02 tem 2 dias corridos', d.restantes === 2, JSON.stringify(d))

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODAS AS REGRAS OK')
process.exit(falhas ? 1 : 0)
