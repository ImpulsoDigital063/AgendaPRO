/* TEMPLATES DA CLOUD API — cria e acompanha.
 *
 *   node scripts/_templates-whatsapp.mjs          -> lista o que existe na conta
 *   node scripts/_templates-whatsapp.mjs criar    -> submete os 7 que faltam
 *
 * A ORDEM DOS PARÂMETROS AQUI TEM QUE BATER com src/lib/mensagens/templates-cloud.ts.
 * Trocar a ordem não dá erro: entrega a mensagem com o nome do salão no
 * lugar da hora. Se mexer num texto, confira o mapa lá.
 *
 * Regras da Meta que os textos abaixo respeitam:
 *   · o corpo NÃO pode começar nem terminar com variável
 *   · variáveis sequenciais {{1}}, {{2}}... sem duas coladas
 *   · footer é texto FIXO — por isso o "responda PARE" vive lá, e o
 *     telefone do salão (que é variável) vive no corpo
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
)
const TOKEN = env.WHATSAPP_TOKEN
const WABA = env.WHATSAPP_WABA_ID
if (!TOKEN || !WABA) {
  console.log('FALTA WHATSAPP_TOKEN ou WHATSAPP_WABA_ID no .env.local')
  process.exit(1)
}

const BOTOES = [
  { type: 'QUICK_REPLY', text: 'Confirmar presença' },
  { type: 'QUICK_REPLY', text: 'Preciso remarcar' },
]
const RODAPE_PARE = { type: 'FOOTER', text: 'Responda PARE para não receber mais mensagens.' }

const TEMPLATES = [
  {
    name: 'agendapro_confirmacao',
    category: 'UTILITY',
    body: 'Oi {{1}}! Seu horário no {{2}} está marcado:\n\n{{3}} às {{4}}\n{{5}}\n\nPara remarcar ou tirar dúvida, fale pelo telefone {{6}}. Até breve!',
    exemplo: ['Ana', 'Studio Marcela Hair', 'sexta, 29/08', '14:30', 'Escova', '(63) 99955-2211'],
  },
  {
    name: 'agendapro_lembrete_vespera',
    category: 'UTILITY',
    body: 'Oi {{1}}! Lembrando do seu horário no {{2}}:\n\n{{3}} às {{4}}\n{{5}}\n\nPara remarcar ou tirar dúvida, fale pelo telefone {{6}}.',
    exemplo: ['Ana', 'Studio Marcela Hair', 'sexta, 29/08', '14:30', 'Escova', '(63) 99955-2211'],
    botoes: true,
  },
  {
    name: 'agendapro_lembrete_dia',
    category: 'UTILITY',
    body: 'Oi {{1}}! Seu horário no {{2}} é hoje às {{3}} — {{4}}.\n\nTe esperamos! Se precisar falar, o telefone é {{5}}.',
    exemplo: ['Ana', 'Studio Marcela Hair', '14:30', 'Escova', '(63) 99955-2211'],
    botoes: true,
  },
  {
    name: 'agendapro_aniversario',
    category: 'MARKETING', // 7x mais caro — consome 7 unidades da franquia
    body: 'Oi {{1}}, feliz aniversário!\n\nQue seu dia seja ótimo. Quando quiser se cuidar, é só chamar o {{2}} pelo telefone {{3}}.',
    exemplo: ['Ana', 'Studio Marcela Hair', '(63) 99955-2211'],
    optout: true,
  },
  {
    name: 'agendapro_retorno',
    category: 'MARKETING', // 7x mais caro
    body: 'Oi {{1}}! Seu último {{2}} no {{3}} foi em {{4}}.\n\nJá deu o intervalo para repetir. Se quiser agendar, é só chamar pelo telefone {{5}}.',
    exemplo: ['Ana', 'Escova', 'Studio Marcela Hair', '10/07', '(63) 99955-2211'],
    optout: true,
  },
  {
    name: 'agendapro_dono_novo_agendamento',
    category: 'UTILITY',
    body: 'Novo agendamento no {{1}}.\n\n{{2}} — {{3}} às {{4}}\n{{5}}\n\nConfira na sua agenda.',
    exemplo: ['Studio Marcela Hair', 'Ana Souza', 'sexta, 29/08', '14:30', 'Escova'],
  },
  {
    name: 'agendapro_dono_cancelamento',
    category: 'UTILITY',
    body: 'Horário liberado no {{1}}.\n\n{{2}} cancelou — {{3}} às {{4}}.\n\nDá tempo de oferecer esse horário para outra pessoa.',
    exemplo: ['Studio Marcela Hair', 'Ana Souza', 'sexta, 29/08', '14:30'],
  },
]

async function listar() {
  const r = await fetch(
    `https://graph.facebook.com/v21.0/${WABA}/message_templates?fields=name,language,status,category,rejected_reason&limit=100`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  )
  const j = await r.json().catch(() => null)
  if (!r.ok) {
    console.log('HTTP ' + r.status, JSON.stringify(j))
    return []
  }
  return j?.data ?? []
}

const existentes = await listar()
const porNome = new Set(existentes.map((t) => t.name))

if (process.argv[2] !== 'criar') {
  console.log('TEMPLATES NA CONTA ' + WABA + ':')
  if (!existentes.length) console.log('  (nenhum)')
  for (const t of existentes) {
    /* Quem manda é o status, não o que a gente pediu. A Meta pode APROVAR
       reclassificando de utilidade pra marketing — e aí a mensagem custa
       ~7x mais e some da franquia 7 unidades de cada vez. */
    const alerta = t.category === 'MARKETING' && t.name.match(/confirmacao|lembrete|dono_/) ? '  <<< VIROU MARKETING!' : ''
    console.log(`  ${t.name.padEnd(34)} [${t.language}] ${String(t.status).padEnd(10)} ${t.category}${alerta}`)
    if (t.rejected_reason && t.rejected_reason !== 'NONE') console.log(`      reprovado: ${t.rejected_reason}`)
  }
  const faltam = TEMPLATES.filter((t) => !porNome.has(t.name)).map((t) => t.name)
  if (faltam.length) console.log('\nFALTAM criar: ' + faltam.join(', ') + '\n  -> node scripts/_templates-whatsapp.mjs criar')
  process.exit(0)
}

for (const t of TEMPLATES) {
  if (porNome.has(t.name)) {
    console.log('já existe, pulando: ' + t.name)
    continue
  }
  const components = [
    { type: 'BODY', text: t.body, example: { body_text: [t.exemplo] } },
  ]
  if (t.optout) components.push(RODAPE_PARE)
  if (t.botoes) components.push({ type: 'BUTTONS', buttons: BOTOES })

  const r = await fetch(`https://graph.facebook.com/v21.0/${WABA}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, language: 'pt_BR', category: t.category, components }),
  })
  const j = await r.json().catch(() => null)
  console.log(
    (r.ok ? 'OK   ' : 'ERRO ') + t.name.padEnd(34) +
    (r.ok ? `${j?.status} · ${j?.category}` : JSON.stringify(j?.error?.message ?? j).slice(0, 140)),
  )
}

console.log('\nAprovação leva de minutos a algumas horas.')
console.log('Confira com: node scripts/_templates-whatsapp.mjs')
