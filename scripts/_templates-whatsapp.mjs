/* TEMPLATES DA CLOUD API — cria e acompanha.
 *
 *   node scripts/_templates-whatsapp.mjs          -> lista o que existe na conta
 *   node scripts/_templates-whatsapp.mjs criar    -> submete os 7 que faltam
 *
 * A ORDEM DOS PARÂMETROS AQUI TEM QUE BATER com src/lib/mensagens/templates-cloud.ts.
 * Trocar a ordem não dá erro: entrega a mensagem com o nome do salão no
 * lugar da hora. Se mexer num texto, confira o mapa lá.
 *
 * ─── AS TRÊS REGRAS DA META QUE DERRUBARAM A PRIMEIRA TENTATIVA (29/08) ───
 *
 * 1. [2388299] "As variáveis não podem estar no início ou no fim do modelo."
 *    Terminar com "...telefone {{6}}." é FIM COM VARIÁVEL — o ponto final não
 *    conta como texto. Por isso todo texto aqui fecha com uma frase de
 *    verdade ("Até breve!", "Até amanhã!").
 *
 * 2. [2388293] "A proporção entre palavras e parâmetros excede o limite."
 *    Texto enxuto com 5-6 variáveis é recusado. Daí os dados virem em linhas
 *    rotuladas (Dia:/Horário:/Serviço:): ganha palavra fixa e fica mais fácil
 *    de ler no celular — os dois de uma vez.
 *
 * 3. [2388023] "O idioma do modelo está sendo excluído."
 *    Depois de apagar um template, esperar ~1 minuto antes de recriar com o
 *    mesmo nome. NÃO é o bloqueio de 30 dias.
 *
 * Outras regras respeitadas: variáveis sequenciais sem duas coladas, e footer
 * é texto FIXO — por isso o "responda PARE" vive lá e o telefone do salão
 * (que é variável) vive no corpo.
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
    name: 'agendapro_confirmacao_v2',
    category: 'UTILITY',
    body:
      'Oi {{1}}, tudo bem? Seu horário no {{2}} ficou marcado. Anota aí:\n\n' +
      'Dia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\n' +
      'Se precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até breve!',
    exemplo: ['Ana', 'Studio Marcela Hair', 'sexta, 29/08', '14:30', 'Escova', '(63) 99955-2211'],
  },
  {
    name: 'agendapro_lembrete_vespera',
    category: 'UTILITY',
    body:
      'Oi {{1}}, tudo bem? Passando para lembrar que você tem horário marcado amanhã no {{2}}.\n\n' +
      'Dia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\n' +
      'Se precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até amanhã!',
    exemplo: ['Ana', 'Studio Marcela Hair', 'sexta, 29/08', '14:30', 'Escova', '(63) 99955-2211'],
    botoes: true,
  },
  {
    name: 'agendapro_lembrete_dia',
    category: 'UTILITY',
    body:
      'Oi {{1}}, tudo bem? Passando para lembrar que o seu horário no {{2}} é hoje.\n\n' +
      'Horário: {{3}}\nServiço: {{4}}\n\n' +
      'Te esperamos! Se precisar falar com a gente, o telefone é {{5}}. Até mais tarde!',
    exemplo: ['Ana', 'Studio Marcela Hair', '14:30', 'Escova', '(63) 99955-2211'],
    botoes: true,
  },
  {
    name: 'agendapro_aniversario',
    category: 'MARKETING', // 7x mais caro — consome 7 unidades da franquia
    body:
      'Oi {{1}}, feliz aniversário!\n\n' +
      'Hoje é o seu dia, e a equipe do {{2}} passou aqui só para desejar tudo de bom para você. ' +
      'Que seja um ano cheio de saúde e de alegria.\n\n' +
      'Quando quiser marcar um horário para se cuidar, é só chamar pelo telefone {{3}}. Vai ser um prazer receber você.',
    exemplo: ['Ana', 'Studio Marcela Hair', '(63) 99955-2211'],
    optout: true,
  },
  {
    name: 'agendapro_retorno',
    category: 'MARKETING', // 7x mais caro
    body:
      'Oi {{1}}, tudo bem? Passando para avisar que já deu o intervalo do seu {{2}}.\n\n' +
      'O último que você fez no {{3}} foi em {{4}}, e agora é uma boa hora para repetir.\n\n' +
      'Se quiser marcar, é só chamar pelo telefone {{5}}. A gente separa um horário para você.',
    exemplo: ['Ana', 'Escova', 'Studio Marcela Hair', '10/07', '(63) 99955-2211'],
    optout: true,
  },
  {
    name: 'agendapro_dono_novo_agendamento',
    category: 'UTILITY',
    body:
      'Você tem um agendamento novo no {{1}}. Veja os detalhes:\n\n' +
      'Cliente: {{2}}\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\n' +
      'Já entrou na sua agenda automaticamente, é só conferir quando puder.',
    exemplo: ['Studio Marcela Hair', 'Ana Souza', 'sexta, 29/08', '14:30', 'Escova'],
  },
  {
    name: 'agendapro_dono_cancelamento_v2',
    category: 'UTILITY',
    body:
      'Um horário foi liberado na agenda do {{1}}. Veja o que abriu:\n\n' +
      'Cliente: {{2}}\nDia: {{3}}\nHorário: {{4}}\n\n' +
      'O cancelamento já entrou no sistema. Ainda dá tempo de oferecer esse horário para outra pessoa.',
    exemplo: ['Studio Marcela Hair', 'Ana Souza', 'sexta, 29/08', '14:30'],
  },
]

/* Confere as duas regras que mais derrubam, ANTES de gastar chamada na API
   e antes de arriscar o limite de tentativas da conta. */
function problemas(t) {
  const erros = []
  if (/^\{\{/.test(t.body)) erros.push('começa com variável')
  if (/\{\{\d+\}\}[.!?]?\s*$/.test(t.body)) erros.push('termina com variável')
  const vars = (t.body.match(/\{\{\d+\}\}/g) || []).length
  const palavras = t.body.replace(/\{\{\d+\}\}/g, ' ').split(/\s+/).filter(Boolean).length
  if (vars && palavras / vars < 4) erros.push(`razão baixa (${palavras} palavras / ${vars} vars)`)
  if (vars !== t.exemplo.length) erros.push(`exemplo tem ${t.exemplo.length} valores para ${vars} variáveis`)
  return erros
}

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
    const alerta =
      t.category === 'MARKETING' && /confirmacao|lembrete|dono_/.test(t.name) ? '  <<< VIROU MARKETING!' : ''
    console.log(`  ${t.name.padEnd(34)} [${t.language}] ${String(t.status).padEnd(10)} ${t.category}${alerta}`)
    if (t.rejected_reason && t.rejected_reason !== 'NONE') console.log(`      reprovado: ${t.rejected_reason}`)
  }
  const faltam = TEMPLATES.filter((t) => !porNome.has(t.name)).map((t) => t.name)
  if (faltam.length) {
    console.log('\nFALTAM criar: ' + faltam.join(', ') + '\n  -> node scripts/_templates-whatsapp.mjs criar')
  }
  process.exit(0)
}

/* Valida TUDO antes de mandar qualquer coisa: errar em lote gasta tentativa
   e a conta tem limite. */
let invalido = false
for (const t of TEMPLATES) {
  const p = problemas(t)
  if (p.length) {
    console.log('INVÁLIDO ' + t.name + ': ' + p.join(' · '))
    invalido = true
  }
}
if (invalido) {
  console.log('\nNada foi enviado. Corrija os textos acima primeiro.')
  process.exit(1)
}

for (const t of TEMPLATES) {
  if (porNome.has(t.name)) {
    console.log('já existe, pulando: ' + t.name)
    continue
  }
  const components = [{ type: 'BODY', text: t.body, example: { body_text: [t.exemplo] } }]
  if (t.optout) components.push(RODAPE_PARE)
  if (t.botoes) components.push({ type: 'BUTTONS', buttons: BOTOES })

  const r = await fetch(`https://graph.facebook.com/v21.0/${WABA}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, language: 'pt_BR', category: t.category, components }),
  })
  const j = await r.json().catch(() => null)
  /* `error.message` da Meta é genérico ("Invalid parameter") e não ajuda em
     nada. O motivo de verdade vive em error_user_title/error_user_msg. */
  const e = j?.error
  console.log(
    (r.ok ? 'OK   ' : 'ERRO ') + t.name.padEnd(34) +
      (r.ok
        ? `${j?.status} · ${j?.category}`
        : `[${e?.error_subcode ?? e?.code ?? '?'}] ${e?.error_user_title ?? e?.message ?? JSON.stringify(j)}`),
  )
  if (!r.ok && e?.error_user_msg) console.log('       ' + e.error_user_msg)
}

console.log('\nAprovação leva de minutos a algumas horas.')
console.log('Confira com: node scripts/_templates-whatsapp.mjs')
