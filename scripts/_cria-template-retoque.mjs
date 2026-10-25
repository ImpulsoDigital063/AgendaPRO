/* Submete o template do PRAZO DO RETOQUE (v178, camada 2 do retorno · 25/10/2026).
 *
 * UTILIDADE de propósito: informa o prazo de um procedimento que a cliente já
 * fez, sem convite nem palavra de venda. Texto neutro de gênero (serve pra
 * "Studio X" e "Clínica Y", "Alongamento" e "Micro"). O texto TEM que ser
 * igual ao de TEMPLATES.retoque em src/lib/mensagens/templates-cloud.ts.
 *
 * A categoria final é da Meta. Se ela devolver MARKETING, o código não manda
 * nada (categoriaDoRetoque) e a tela de Mensagens mostra "pausado".
 *
 * Criar template não muda nada em produção: o aviso só sai com a regra
 * "retoque" ligada pela dona E o template APPROVED + UTILITY.
 *
 * node scripts/_cria-template-retoque.mjs
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
)

const NOME = 'agendapro_retoque_prazo'
const TEXTO =
  'Oi {{1}}, tudo bem? Aviso de {{2}}.\n\nSeu procedimento de {{3}} foi feito em {{4}}, e o prazo do retoque vai até {{5}}.\n\nToque no botão abaixo pra escolher o seu horário.'

const componentes = [
  { type: 'BODY', text: TEXTO, example: { body_text: [['Ana', 'Ivna Loyola Beauty Clinic', 'Micropigmentação labial', '12/10', '11/12']] } },
  {
    type: 'BUTTONS',
    buttons: [
      {
        type: 'URL',
        text: 'Escolher horário',
        url: 'https://www.agendapro.net.br/{{1}}',
        example: ['https://www.agendapro.net.br/ivna-loyola-beauty-clinic/agendar?servicos=00000000-0000-0000-0000-000000000000'],
      },
    ],
  },
]

const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_WABA_ID}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: NOME, language: 'pt_BR', category: 'UTILITY', components: componentes }),
})
const body = await res.json().catch(() => ({}))
console.log(NOME, '·', res.ok ? `id ${body?.id} · ${body?.status} · ${body?.category}` : JSON.stringify(body?.error?.message ?? body))
