/* Primeiro contato com a W-API. Roda ANTES de mexer em qualquer cliente.
 *
 *   node scripts/_teste-wapi.mjs <instanceId> <token> <telefone-destino>
 *   node scripts/_teste-wapi.mjs <instanceId> <token> <telefone> --botoes
 *
 * Descobre o formato de verdade em vez de assumir: tenta os caminhos mais
 * prováveis, mostra o corpo INTEIRO da resposta de cada um e diz qual passou.
 * Endpoint chutado é o erro que só aparece quando a mensagem não chega — é
 * exatamente o que este script existe pra impedir.
 */
import fs from 'fs'

const [instanceId, token, destino] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const comBotoes = process.argv.includes('--botoes')

if (!instanceId || !token || !destino) {
  console.error('uso: node scripts/_teste-wapi.mjs <instanceId> <token> <telefone> [--botoes]')
  process.exit(1)
}

const fone = (() => {
  const d = destino.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
})()

const BASES = ['https://api.w-api.app/v1']
const CAMINHOS_TEXTO = [
  'message/send-text',
  'message/sendText',
  'send-text',
  'messages/send-text',
]

const texto =
  'AgendaPRO Avisos\n\n' +
  'Teste do canal automatico. Se voce esta lendo isso, o envio funciona.\n\n' +
  'Nenhuma cliente recebeu nada.'

async function tentar(url, corpo, cabecalhos) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cabecalhos },
      body: JSON.stringify(corpo),
    })
    const body = await res.text()
    return { status: res.status, body: body.slice(0, 400) }
  } catch (e) {
    return { status: 0, body: e instanceof Error ? e.message : String(e) }
  }
}

console.log(`destino: ${fone}\n`)

let venceu = null
for (const base of BASES) {
  for (const caminho of CAMINHOS_TEXTO) {
    // Duas formas de passar a instancia: querystring e corpo. Sao as duas
    // convencoes comuns nesse tipo de API; a resposta diz qual e a certa.
    const variantes = [
      { url: `${base}/${caminho}?instanceId=${instanceId}`, corpo: { phone: fone, message: texto } },
      { url: `${base}/${caminho}`, corpo: { instanceId, phone: fone, message: texto } },
    ]
    for (const v of variantes) {
      const r = await tentar(v.url, v.corpo, { Authorization: `Bearer ${token}` })
      const ok = r.status >= 200 && r.status < 300
      console.log(`${ok ? 'OK   ' : 'falha'} ${r.status} ${v.url}`)
      console.log(`      ${r.body.replace(/\n/g, ' ')}\n`)
      if (ok && !venceu) venceu = v
    }
  }
}

if (!venceu) {
  console.log('Nenhum caminho passou. Abre a referencia da API no painel e me manda o print do')
  console.log('exemplo de "enviar texto" — com ele eu acerto o formato de primeira.')
  process.exit(1)
}

console.log('CAMINHO CERTO:', venceu.url.split('?')[0])
console.log('CORPO:', JSON.stringify(venceu.corpo).slice(0, 120))

if (comBotoes) {
  console.log('\n--- botoes ---')
  const base = venceu.url.split('/message/')[0]
  for (const caminho of ['message/send-button-list', 'message/send-buttons', 'message/sendButtons']) {
    const r = await tentar(
      `${base}/${caminho}?instanceId=${instanceId}`,
      {
        phone: fone,
        message: 'AgendaPRO Avisos\n\nTeste dos botoes. Toque em um deles.',
        buttonList: {
          buttons: [
            { id: 'confirmar', label: 'Confirmo' },
            { id: 'remarcar', label: 'Preciso remarcar' },
          ],
        },
      },
      { Authorization: `Bearer ${token}` },
    )
    console.log(`${r.status} ${caminho} → ${r.body.replace(/\n/g, ' ')}`)
  }
}
