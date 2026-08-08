/* Extrai TODAS as imagens de um PDF, não só as JPEG.
 *
 * PDF guarda imagem de dois jeitos: DCTDecode (JPEG puro, dá pra recortar do
 * arquivo) e FlateDecode (pixels crus comprimidos com zlib, precisam ser
 * inflados e remontados). O primeiro scan pegou só as 12 JPEG de 81 imagens —
 * daí a impressão de que o arquivo tinha vindo pela metade.
 *
 *   node scripts/_extrai-imagens-pdf.mjs <arquivo.pdf> <pasta-saida>
 */
import fs from 'fs'
import zlib from 'zlib'
import sharp from 'sharp'

const [entrada, saida] = process.argv.slice(2)
if (!entrada || !saida) {
  console.error('uso: node scripts/_extrai-imagens-pdf.mjs <pdf> <pasta>')
  process.exit(1)
}
fs.mkdirSync(saida, { recursive: true })

const buf = fs.readFileSync(entrada)
const s = buf.toString('latin1')

let n = 0, pulados = 0
const re = /<<([^>]*?\/Subtype\s*\/Image[\s\S]*?)>>\s*stream\r?\n/g
let m
while ((m = re.exec(s)) !== null) {
  const dict = m[1]
  const inicio = m.index + m[0].length
  const fim = s.indexOf('endstream', inicio)
  if (fim < 0) continue

  const num = (chave) => {
    const r = new RegExp(`/${chave}\\s+(\\d+)`).exec(dict)
    return r ? Number(r[1]) : null
  }
  const w = num('Width'), h = num('Height')
  const bpc = num('BitsPerComponent') ?? 8
  if (!w || !h || w < 80 || h < 80) { pulados++; continue }   // ícone/máscara

  const dados = buf.subarray(inicio, fim)
  const nome = `${saida}/img${String(++n).padStart(2, '0')}_${w}x${h}`

  try {
    if (/DCTDecode/.test(dict)) {
      fs.writeFileSync(`${nome}.jpg`, dados)
      continue
    }
    if (/FlateDecode/.test(dict)) {
      const cru = zlib.inflateSync(dados)
      const canais = /DeviceRGB/.test(dict) ? 3 : /DeviceGray/.test(dict) ? 1 : 3
      const esperado = w * h * canais * (bpc / 8)
      if (cru.length < esperado) { pulados++; n--; continue }
      await sharp(cru.subarray(0, esperado), { raw: { width: w, height: h, channels: canais } })
        .png().toFile(`${nome}.png`)
      continue
    }
    pulados++; n--
  } catch {
    pulados++; n--
  }
}

console.log(`extraídas: ${n} · puladas (ícone, máscara ou formato exótico): ${pulados}`)
