/* Submete os tres templates do desenho novo (Eduardo, 01/09):
 *
 *   "o botao confirmar tem que ir e na primeira msg de confirmacao de
 *    agendamento, os lembretes e justo so para lembrar"
 *
 * Um lugar pergunta, os outros informam. Template da Meta e' fixo — botao
 * nao da pra esconder em tempo de envio —, entao cada mudanca de botao exige
 * um template NOVO e uma aprovacao nova.
 *
 *   agendapro_confirmacao_v3       COM botao   (hoje o v2 nao tem)
 *   agendapro_lembrete_vespera_v2  SEM botao   (hoje tem)
 *   agendapro_lembrete_dia_v2      SEM botao   (hoje tem)
 *
 * Os textos sao IDENTICOS aos aprovados. So os botoes mudam — assim a
 * aprovacao tende a ser rapida e nada mais muda pra cliente.
 *
 * Criar template nao troca nada em producao: o codigo so passa a usar
 * quando a gente apontar pra ele, depois de APPROVED.
 *
 * node scripts/_cria-templates-v3.mjs
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
)

const BOTOES = {
  type: 'BUTTONS',
  buttons: [
    { type: 'QUICK_REPLY', text: 'Confirmar presença' },
    { type: 'QUICK_REPLY', text: 'Preciso remarcar' },
  ],
}

const EXEMPLO = [['Ana', 'Studio Marcela Hair', 'sábado, 22/08', '14:30', 'Escova com Patrícia', '(63) 99955-2211']]
const EXEMPLO_DIA = [['Ana', 'Studio Marcela Hair', '14:30', 'Escova com Patrícia', '(63) 99955-2211']]

const NOVOS = [
  {
    name: 'agendapro_confirmacao_v3',
    texto:
      'Oi {{1}}, tudo bem? Seu horário no {{2}} ficou marcado. Anota aí:\n\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\nSe precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até breve!',
    exemplo: EXEMPLO,
    botoes: true,
  },
  {
    name: 'agendapro_lembrete_vespera_v2',
    texto:
      'Oi {{1}}, tudo bem? Passando para lembrar que você tem horário marcado amanhã no {{2}}.\n\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\nSe precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até amanhã!',
    exemplo: EXEMPLO,
    botoes: false,
  },
  {
    name: 'agendapro_lembrete_dia_v2',
    texto:
      'Oi {{1}}, tudo bem? Passando para lembrar que o seu horário no {{2}} é hoje.\n\nHorário: {{3}}\nServiço: {{4}}\n\nTe esperamos! Se precisar falar com a gente, o telefone é {{5}}. Até mais tarde!',
    exemplo: EXEMPLO_DIA,
    botoes: false,
  },
]

for (const t of NOVOS) {
  const componentes = [
    { type: 'BODY', text: t.texto, example: { body_text: t.exemplo } },
  ]
  if (t.botoes) componentes.push(BOTOES)

  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_WABA_ID}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: t.name,
      language: 'pt_BR',
      /* UTILITY de novo. Se a Meta reclassificar como MARKETING o custo
         multiplica por ~7 e o modelo de pacote nao fecha — vale conferir o
         `category` que voltar. */
      category: 'UTILITY',
      components: componentes,
    }),
  })
  const body = await res.json().catch(() => null)
  console.log(
    `${t.name.padEnd(30)} HTTP ${res.status}`,
    res.ok ? `id ${body?.id} · ${body?.status} · ${body?.category}` : JSON.stringify(body?.error?.message ?? body),
  )
}
