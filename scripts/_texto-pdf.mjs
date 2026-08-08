/* Extrai o TEXTO de um PDF, página por página.
 *
 * Complementa o _extrai-imagens-pdf.mjs: página feita por designer costuma ser
 * VETOR (texto + linhas), não imagem. Procurar só imagem faz a ficha inteira
 * passar batido — foi o que aconteceu com o kit da Dra Elaine.
 *
 * O texto vive em content streams comprimidos com zlib. Inflar e ler os
 * operadores Tj / TJ devolve o conteúdo na ordem em que foi desenhado.
 *
 *   node scripts/_texto-pdf.mjs <arquivo.pdf>
 */
import fs from 'fs'
import zlib from 'zlib'

const entrada = process.argv[2]
if (!entrada) { console.error('uso: node scripts/_texto-pdf.mjs <pdf>'); process.exit(1) }

const buf = fs.readFileSync(entrada)
const s = buf.toString('latin1')

/* Octal (\303\251) e escapes são como o PDF guarda acento. Sem desfazer isso,
   "avaliação" chega como "avalia\303\247\303\243o". */
function limpar(t) {
  return t
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\([()\\])/g, '$1')
}

let pagina = 0
const re = /<<([\s\S]*?)>>\s*stream\r?\n/g
let m
while ((m = re.exec(s)) !== null) {
  const dict = m[1]
  if (/\/Subtype\s*\/Image/.test(dict)) continue
  if (!/FlateDecode/.test(dict)) continue

  const inicio = m.index + m[0].length
  const fim = s.indexOf('endstream', inicio)
  if (fim < 0) continue

  let conteudo
  try {
    conteudo = zlib.inflateSync(buf.subarray(inicio, fim)).toString('latin1')
  } catch { continue }
  if (!/\bTj\b|\bTJ\b/.test(conteudo)) continue

  const pedacos = []
  for (const t of conteudo.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) pedacos.push(limpar(t[1]))
  for (const t of conteudo.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ/g)) {
    const junto = [...t[1].matchAll(/\(((?:[^()\\]|\\.)*)\)/g)].map((x) => limpar(x[1])).join('')
    if (junto.trim()) pedacos.push(junto)
  }

  let texto = pedacos.join(' ').replace(/\s+/g, ' ').trim()
  if (texto.length < 15) continue

  /* Fonte com subconjunto embutido: a designer exporta o PDF com um mapa de
     caracteres proprio, e cada letra sai deslocada por um numero fixo. Sem
     desfazer isso, "Total de unidades" chega como "7RWDO GH XQLGDGHV" e a
     ficha inteira parece lixo binario. Testa todos os deslocamentos e fica
     com o que produz mais texto de portugues de verdade. */
  /* Bloco curto nao tem sinal estatistico: "Mentoniano" e "Phqwrqldqr" tem a
     mesma cara pra um contador de letras, e o deslocamento erra por 3. Um
     dicionario resolve - palavra inteira reconhecida vale muito mais que
     proporcao de vogal. */
  const DIC = ['de','da','do','dos','das','nome','data','paciente','cliente','assinatura','sim','nao','nascimento','telefone','total','unidades','regiao','observacoes','ficha','anamnese','profissional','produto','lote','validade','aplicacao','frontal','glabela','mentoniano','orbicular','corrugador','masseter','nasal','olhos','boca','testa','pescoco','sessao','avaliacao','historico','alergia','medicamento','tratamento','procedimento','termo','declaro','autorizo']
  const pontuar = (t) => {
    const baixo = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    let nota = 0
    for (const palavra of baixo.split(/[^a-z]+/)) {
      if (palavra.length < 2) continue
      if (DIC.includes(palavra)) nota += palavra.length * 12
    }
    let letras = 0, espacos = 0
    for (const c of t) {
      if (c === ' ') espacos++
      else if (/[a-zàáâãéêíóôõúç]/i.test(c)) letras++
    }
    const prop = espacos / (t.length || 1)
    return nota + letras + espacos * 1.5 * (prop > 0.05 && prop < 0.35 ? 1 : 0.2)
  }
  let melhor = texto, melhorNota = pontuar(texto)
  for (let d = -200; d <= 200; d++) {
    if (d === 0) continue
    const cand = [...texto].map((c) => {
      const n = c.charCodeAt(0) + d
      return n >= 32 && n <= 255 ? String.fromCharCode(n) : c
    }).join('')
    const nota = pontuar(cand)
    if (nota > melhorNota) { melhorNota = nota; melhor = cand }
  }
  texto = melhor

  console.log(`\n───────────── bloco de texto ${++pagina} ─────────────`)
  console.log(texto.slice(0, 2500))
}

if (pagina === 0) console.log('nenhum texto encontrado — as páginas devem ser imagem mesmo')
