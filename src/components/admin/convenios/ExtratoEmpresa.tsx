'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconFile, IconCheck } from '@/components/ui/Icon'

export type LinhaExtrato = {
  id: string
  data: string // YYYY-MM-DD
  hora: string // HH:MM
  funcionario: string
  profissional: string
  servico: string
  valor: number
  pago: boolean
  invoiceId: string | null
}

/**
 * Extrato da empresa conveniada — o que o Gustavo manda pro RH do cliente dele
 * (áudio 09:53 de 20/08: "exportar o excel ou pdf pra empresa com os detalhes
 * de todos os atendimentos dos funcionários, com horários, datas, valores,
 * profissionais que atenderam").
 *
 * Exportação roda no navegador: `xlsx` e `jspdf` já são dependências do projeto.
 */
export type FaturaResumo = {
  id: string
  numero: number
  competencia: string
  qtd: number
  total: number
  enviada_em: string | null
  enviada_para: string | null
  paga_em: string | null
}

/**
 * Baixa a logo e devolve em data URL, com as medidas pra não deformar.
 *
 * Timeout curto e nunca lança: a logo é o enfeite do timbre, e um PDF que não
 * sai porque o Storage demorou é pior que um PDF sem logo. Quem chama trata
 * `null` como "segue sem".
 */
async function carregarLogo(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((ok, err) => {
      const fr = new FileReader()
      fr.onload = () => ok(String(fr.result))
      fr.onerror = () => err(new Error('leitura'))
      fr.readAsDataURL(blob)
    })
    const { w, h } = await new Promise<{ w: number; h: number }>((ok, err) => {
      const im = new Image()
      im.onload = () => ok({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 })
      im.onerror = () => err(new Error('decode'))
      im.src = dataUrl
    })
    return { dataUrl, w, h }
  } catch {
    return null
  }
}

export default function ExtratoEmpresa({
  empresaId,
  empresaNome,
  empresaCnpj = null,
  instrucoesPagamento = null,
  clinicaNome,
  clinicaTelefone = null,
  clinicaCnpj = null,
  clinicaEndereco = null,
  clinicaLogo = null,
  clinicaRazaoSocial = null,
  clinicaEmail = null,
  temEmail,
  mes,
  linhas,
  faturas,
}: {
  empresaId: string
  empresaNome: string
  empresaCnpj?: string | null
  /** Texto livre impresso no rodapé do PDF · vazio não imprime nada. */
  instrucoesPagamento?: string | null
  /** Quem está cobrando. O PDF saía sem isso: o RH recebia um anexo com o nome
   *  de quem PAGA no título e nenhuma pista de quem mandou (Eduardo, 26/08). */
  clinicaNome: string
  clinicaTelefone?: string | null
  clinicaCnpj?: string | null
  clinicaEndereco?: string | null
  /** Logo do negócio · vira o timbre do documento quando existe. Falha ao
   *  carregar nunca impede o PDF de sair. */
  clinicaLogo?: string | null
  /** Razão social, quando difere da marca · o RH confere o papel contra o CNPJ. */
  clinicaRazaoSocial?: string | null
  /** Via de resposta pro RH: pra onde ele manda dúvida e comprovante. */
  clinicaEmail?: string | null
  /** Empresa sem e-mail não pode receber o extrato — o botão explica em vez de falhar. */
  temEmail: boolean
  mes: string // YYYY-MM
  linhas: LinhaExtrato[]
  faturas: FaturaResumo[]
}) {
  const router = useRouter()
  const [baixando, setBaixando] = useState(false)
  const [metodo, setMetodo] = useState<'pix' | 'cash' | 'card'>('pix')
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [faturando, setFaturando] = useState(false)
  const [faturaMsg, setFaturaMsg] = useState<string | null>(null)

  /* Fechar a competência congela o que foi enviado. Sem isso, lançamento
     retroativo muda o extrato DEPOIS de o RH ter recebido, e quem parece
     errado é o dono da clínica. */
  async function fecharFatura(enviarEmail: boolean) {
    setFaturando(true)
    setFaturaMsg(null)
    const res = await fetch('/api/admin/convenios/faturar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: empresaId, competencia: mes, enviarEmail }),
    })
    const j = await res.json().catch(() => ({}))
    setFaturando(false)
    if (!res.ok) {
      setFaturaMsg(
        j.error === 'nada_a_faturar'
          ? 'Nada a cobrar nesse mês: o que existe aqui já foi recebido ou já entrou numa fatura anterior.'
          : `Não consegui fechar a fatura: ${j.error ?? res.status}`
      )
      return
    }
    setFaturaMsg(
      `Fatura nº ${j.fatura.numero} fechada · ${j.fatura.qtd} atendimentos · ${brl(Number(j.fatura.total))}` +
        (enviarEmail ? (j.emailEnviado ? ' · enviada por e-mail' : ` · e-mail NÃO saiu: ${j.emailErro}`) : '')
    )
    router.refresh()
  }

  const totais = useMemo(() => {
    const emAberto = linhas.filter((l) => !l.pago)
    /* Só entra no "vai receber" o que TEM comanda — é a comanda que recebe a
       baixa. Sem essa separação o botão prometia um total e recebia menos, sem
       explicar a diferença (achado 3 da auditoria de 21/08). */
    const recebivel = emAberto.filter((l) => l.invoiceId)
    const semComanda = emAberto.filter((l) => !l.invoiceId)
    return {
      qtd: linhas.length,
      total: linhas.reduce((s, l) => s + (l.valor ?? 0), 0),
      aberto: emAberto.reduce((s, l) => s + (l.valor ?? 0), 0),
      qtdAberto: emAberto.length,
      recebivel: recebivel.reduce((s, l) => s + (l.valor ?? 0), 0),
      qtdRecebivel: recebivel.length,
      qtdSemComanda: semComanda.length,
    }
  }, [linhas])

  /** Já existe fatura fechada dessa competência? Define se "recebi" é o
   *  próximo passo do fluxo ou um atalho fora de ordem. */
  const faturaDoMes = faturas.find((f) => f.competencia === mes) ?? null
  const temFaturaDoMes = !!faturaDoMes

  /* Coluna Situação só existe se houver o que distinguir. Com tudo em aberto —
     o caso normal de uma fatura — ela repetia a mesma palavra em toda linha, na
     tela, no PDF e no Excel. */
  const misturaSituacao = linhas.some((l) => l.pago) && linhas.some((l) => !l.pago)

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
  const mesBR = `${mes.slice(5, 7)}/${mes.slice(0, 4)}`
  const nomeArquivo = `extrato-${empresaNome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${mes}`

  /* Quem confere do outro lado é o RH da empresa, e a pergunta dele é "quantas
     sessões o Leandro fez", não "o que aconteceu dia 14". O detalhe cronológico
     continua — isto entra ANTES dele, como capa de conferência. */
  const porFuncionario = useMemo(() => {
    const m = new Map<string, { qtd: number; valor: number }>()
    for (const l of linhas) {
      const k = l.funcionario || '—'
      if (!m.has(k)) m.set(k, { qtd: 0, valor: 0 })
      const x = m.get(k)!
      x.qtd++
      x.valor += l.valor ?? 0
    }
    return [...m].sort((a, b) => b[1].valor - a[1].valor)
  }, [linhas])

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    type Row = Record<string, string | number>
    const dados: Row[] = linhas.map((l) => {
      const r: Row = {
        Data: dataBR(l.data),
        Horário: l.hora,
        Funcionário: l.funcionario,
        Profissional: l.profissional,
        Serviço: l.servico,
        Valor: l.valor,
      }
      if (misturaSituacao) r['Situação'] = l.pago ? 'Pago' : 'Em aberto'
      return r
    })
    dados.push({ Data: '', Horário: '', Funcionário: '', Profissional: '', Serviço: 'TOTAL', Valor: totais.total })

    /* Cabeçalho de identificação · a planilha abria direto na linha de títulos
       e quem recebia não sabia de quem era sem olhar o nome do arquivo. */
    const ws = XLSX.utils.aoa_to_sheet([
      [clinicaNome],
      [[clinicaRazaoSocial, clinicaCnpj ? `CNPJ ${clinicaCnpj}` : null].filter(Boolean).join(' · ')],
      [[clinicaEndereco, clinicaTelefone, clinicaEmail].filter(Boolean).join(' · ')],
      [],
      [faturaDoMes ? `FATURA Nº ${faturaDoMes.numero}` : 'EXTRATO DE ATENDIMENTOS'],
      [`Cobrar de: ${empresaNome}${empresaCnpj ? ` · CNPJ ${empresaCnpj}` : ''}`],
      [`Competência ${mesBR} · emitido em ${dataBR(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))}`],
      [],
    ])
    XLSX.utils.sheet_add_json(ws, dados, { origin: 'A9' })
    ws['!cols'] = [{ wch: 11 }, { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 13 }, { wch: 11 }]
    /* Valor como MOEDA, não número cru. Saía "45" numa planilha que vai pro
       financeiro de outra empresa. */
    const ref = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 9; r <= ref.e.r; r++) {
      const cel = ws[XLSX.utils.encode_cell({ c: 5, r })]
      if (cel && typeof cel.v === 'number') { cel.t = 'n'; cel.z = 'R$ #,##0.00' }
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos')

    // Aba de conferência do RH · uma linha por servidor.
    const resumo = porFuncionario.map(([nome, x]) => ({
      Funcionário: nome,
      Atendimentos: x.qtd,
      Valor: x.valor,
    }))
    resumo.push({ Funcionário: 'TOTAL', Atendimentos: totais.qtd, Valor: totais.total })
    const wsResumo = XLSX.utils.json_to_sheet(resumo)
    wsResumo['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }]
    const refR = XLSX.utils.decode_range(wsResumo['!ref'] ?? 'A1')
    for (let r = 1; r <= refR.e.r; r++) {
      const cel = wsResumo[XLSX.utils.encode_cell({ c: 2, r })]
      if (cel && typeof cel.v === 'number') { cel.t = 'n'; cel.z = 'R$ #,##0.00' }
    }
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por funcionário')

    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
  }

  async function exportarPDF() {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    /* RETRATO (27/08). Em paisagem o extrato de julho quebrava em duas páginas
       com dois terços da segunda em branco — parece rascunho num documento que
       vai pro financeiro de outra empresa. Retrato dá ~100mm a mais de altura:
       as mesmas 16 linhas passam a caber numa folha só. E é o formato de
       fatura; deitado, o papel lê como planilha exportada. */
    const doc = new jsPDF({ orientation: 'portrait' })
    const LARG = doc.internal.pageSize.getWidth()
    const DIR = LARG - 14

    /* ─── TIMBRE ───────────────────────────────────────────────────────────
       Quem cobra vem primeiro, com identificação completa. O documento antes
       abria com o nome da EMPRESA — quem paga — e não dizia de quem era o
       anexo nem pra quem responder. Isto aqui circula entre dois CNPJs: sem
       razão social, documento e endereço, o financeiro do outro lado não tem
       como lançar. */
    let topo = 14
    let temLogo = false
    if (clinicaLogo) {
      try {
        const img = await carregarLogo(clinicaLogo)
        if (img) {
          /* Encaixa numa caixa de 55x18mm respeitando a proporção: logo deitada
             (a do CAF é 2:1) usa a largura, logo quadrada usa a altura. Nenhuma
             das duas deforma. */
          const MAX_L = 55, MAX_A = 18
          const escala = Math.min(MAX_L / img.w, MAX_A / img.h)
          const larg = img.w * escala
          const alt = img.h * escala
          doc.addImage(img.dataUrl, 14, 10, larg, alt)
          topo = 10 + alt + 6
          temLogo = true
        }
      } catch {
        // Logo é enfeite: se falhar, o documento sai igual, só sem ela.
      }
    }

    /* Com logo, o nome sai menor: a marca já está desenhada acima e repetir o
       mesmo nome em corpo 14 logo abaixo fica amador. Sem logo, ele é o
       cabeçalho — e continua grande. O nome nunca some, porque tem logo que é
       só símbolo, sem o nome escrito. */
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(temLogo ? 10 : 14)
    doc.text(clinicaNome, 14, topo)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110)
    const linhasClinica = [
      /* Razão social primeiro: é o nome que bate com o CNPJ do cartão, e é
         contra ele que o financeiro do outro lado confere o documento. */
      [clinicaRazaoSocial, clinicaCnpj ? `CNPJ ${clinicaCnpj}` : null].filter(Boolean).join(' · ') || null,
      clinicaEndereco,
      [clinicaTelefone, clinicaEmail].filter(Boolean).join(' · ') || null,
    ].filter(Boolean) as string[]
    linhasClinica.forEach((t, i) => doc.text(t, 14, topo + 5 + i * 4.5))

    /* Título e identificação do documento, alinhados à direita — é onde o
       financeiro procura número e data pra lançar. */
    doc.setTextColor(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    const titulo = faturaDoMes ? `FATURA Nº ${faturaDoMes.numero}` : 'EXTRATO DE ATENDIMENTOS'
    doc.text(titulo, DIR, topo, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110)
    doc.text(`Competência ${mesBR}`, DIR, topo + 5, { align: 'right' })
    doc.text(
      `Emitido em ${dataBR(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))}`,
      DIR,
      topo + 9.5,
      { align: 'right' },
    )

    /* A régua desce abaixo do que for mais alto: o bloco da clínica à esquerda
       ou o bloco de identificação do documento à direita (título + competência
       + emissão ocupam ~14mm). */
    const yRegua = topo + 4 + Math.max(linhasClinica.length * 4.5, 14)
    doc.setDrawColor(200)
    doc.line(14, yRegua, DIR, yRegua)

    /* A quem se cobra · bloco separado, como em qualquer fatura. */
    doc.setTextColor(140)
    doc.setFontSize(8)
    doc.text('COBRAR DE', 14, yRegua + 6)
    doc.setTextColor(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(empresaNome, 14, yRegua + 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110)
    const linhasEmpresa = [empresaCnpj ? `CNPJ ${empresaCnpj}` : null].filter(Boolean) as string[]
    linhasEmpresa.forEach((t, i) => doc.text(t, 14, yRegua + 17 + i * 4.5))

    // Total em destaque no canto oposto: é o número que decide a ação.
    doc.setTextColor(140)
    doc.setFontSize(8)
    doc.text('TOTAL DO PERÍODO', DIR, yRegua + 6, { align: 'right' })
    doc.setTextColor(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(brl(totais.total), DIR, yRegua + 14, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110)
    doc.text(
      `${totais.qtd} atendimento${totais.qtd !== 1 ? 's' : ''}`,
      DIR,
      yRegua + 19,
      { align: 'right' },
    )
    doc.setTextColor(20)

    const inicioTabela = yRegua + 17 + Math.max(linhasEmpresa.length * 4.5, 10) + 6

    // Capa de conferência: quantas sessões cada servidor fez.
    autoTable(doc, {
      startY: inicioTabela,
      head: [['Funcionário', 'Atendimentos', 'Valor']],
      body: porFuncionario.map(([nome, x]) => [nome, String(x.qtd), brl(x.valor)]),
      foot: [['TOTAL', String(totais.qtd), brl(totais.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 165, 233] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
      tableWidth: 110,
    })

    const apos = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 28
    doc.setFontSize(11)
    doc.text('Detalhamento dos atendimentos', 14, apos + 10)
    const cab = ['Data', 'Horário', 'Funcionário', 'Profissional', 'Serviço', 'Valor']
    const rodape = ['', '', '', '', 'TOTAL', brl(totais.total)]
    if (misturaSituacao) { cab.push('Situação'); rodape.push('') }
    autoTable(doc, {
      startY: apos + 14,
      head: [cab],
      body: linhas.map((l) => {
        const linha = [dataBR(l.data), l.hora, l.funcionario, l.profissional, l.servico, brl(l.valor)]
        if (misturaSituacao) linha.push(l.pago ? 'Pago' : 'Em aberto')
        return linha
      }),
      foot: [rodape],
      /* SÓ na última página. Repetindo em todas, a página 1 fechava com
         "TOTAL R$910" e a página 2, com duas linhas, fechava com "TOTAL R$910"
         de novo — quem lê no RH soma e entende R$1.820. Documento de cobrança
         que sugere o dobro do valor (Eduardo, 26/08). */
      showFoot: 'lastPage',
      /* Larguras fixas somando os 182mm úteis do retrato. Sem elas o autoTable
         reparte pelo conteúdo e "Reabilitação Pós-cirúrgica" empurra as colunas
         de data e valor pra fora do lugar a cada mês diferente. */
      columnStyles: misturaSituacao
        ? { 0: { cellWidth: 20 }, 1: { cellWidth: 14 }, 2: { cellWidth: 38 }, 3: { cellWidth: 36 }, 4: { cellWidth: 34 }, 5: { cellWidth: 20, halign: 'right' }, 6: { cellWidth: 20 } }
        : { 0: { cellWidth: 22 }, 1: { cellWidth: 16 }, 2: { cellWidth: 44 }, 3: { cellWidth: 42 }, 4: { cellWidth: 36 }, 5: { cellWidth: 22, halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [14, 165, 233], fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14, bottom: 20 },
    })

    if (instrucoesPagamento?.trim()) {
      const fim = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60
      const texto = doc.splitTextToSize(instrucoesPagamento.trim(), 182)
      /* Se a tabela terminou no pé da página, o bloco de pagamento cairia fora
         do papel — e some justamente a instrução de como pagar. */
      const alturaBloco = 10 + texto.length * 4.5
      let y = fim
      if (fim + alturaBloco > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(9)
      doc.setTextColor(20)
      doc.text('Pagamento', 14, y + 10)
      doc.setTextColor(90)
      doc.text(texto, 14, y + 15)
      doc.setTextColor(20)
    }

    /* Numeração em toda página · documento de cobrança sem "página X de Y" e o
       RH não sabe se recebeu tudo. Vai por último porque só agora o total de
       páginas é conhecido. */
    const paginas = doc.getNumberOfPages()
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p)
      doc.setFontSize(8)
      doc.setTextColor(140)
      doc.text(clinicaNome, 14, doc.internal.pageSize.getHeight() - 10)
      doc.text(`Página ${p} de ${paginas}`, DIR, doc.internal.pageSize.getHeight() - 10, { align: 'right' })
    }
    doc.setTextColor(20)

    doc.save(`${nomeArquivo}.pdf`)
  }

  async function darBaixa() {
    const aReceber = linhas.filter((l) => !l.pago && l.invoiceId)
    if (aReceber.length === 0) return
    setBaixando(true)
    setResultado(null)
    let ok = 0
    const falhas: string[] = []
    for (const l of aReceber) {
      const res = await fetch(`/api/admin/invoices/${l.invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: metodo, installments: 1, fee_percent: 0 }),
      })
      if (res.ok) ok++
      else falhas.push(`${dataBR(l.data)} ${l.funcionario}`)
    }
    setBaixando(false)
    setConfirmando(false)
    setResultado(
      falhas.length === 0
        ? `${ok} atendimento${ok !== 1 ? 's' : ''} recebido${ok !== 1 ? 's' : ''}.`
        : `${ok} recebidos · ${falhas.length} falharam: ${falhas.slice(0, 3).join(', ')}${falhas.length > 3 ? '…' : ''}`
    )
    router.refresh()
  }

  return (
    <section className="admin-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Extrato de {mesBR}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {totais.qtd} atendimento{totais.qtd !== 1 ? 's' : ''} · {brl(totais.total)} no período
            {totais.qtdAberto > 0 ? ` · ${brl(totais.aberto)} em aberto` : ' · tudo recebido'}
          </p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => router.push(`?mes=${e.target.value}`)}
          className="admin-input px-3 py-2 text-sm"
        />
      </div>

      {linhas.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: 'var(--admin-text-mute)' }}>
          Nenhum atendimento dessa empresa em {mesBR}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ color: 'var(--admin-text)' }}>
              <thead>
                <tr style={{ color: 'var(--admin-text-faded)' }}>
                  <th className="text-left py-1.5 pr-2 font-semibold">Data</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Hora</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Funcionário</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Profissional</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Serviço</th>
                  <th className="text-right py-1.5 pr-2 font-semibold">Valor</th>
                  {misturaSituacao && <th className="text-left py-1.5 font-semibold">Situação</th>}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="py-1.5 pr-2 tabular-nums">{dataBR(l.data)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{l.hora}</td>
                    <td className="py-1.5 pr-2">{l.funcionario}</td>
                    <td className="py-1.5 pr-2">{l.profissional}</td>
                    <td className="py-1.5 pr-2">{l.servico}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{brl(l.valor)}</td>
                    {/* Só a exceção é escrita. Antes a coluna repetia "Em aberto"
                        em todas as linhas — uma coluna inteira gasta dizendo a
                        mesma palavra dezesseis vezes (Eduardo, 25/08). */}
                    {misturaSituacao && (
                      <td className="py-1.5" style={{ color: '#10B981' }}>
                        {l.pago ? 'Pago' : ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Total no rodapé · quem lê tabela procura a soma embaixo, e é
                  onde o RH da empresa vai conferir quando isso virar PDF. */}
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--admin-border)' }}>
                  <td className="py-2 pr-2 font-bold" colSpan={4}>
                    {linhas.length} atendimento{linhas.length !== 1 ? 's' : ''}
                  </td>
                  <td className="py-2 pr-2 text-right font-bold" style={{ color: 'var(--admin-text-mute)' }}>
                    Total
                  </td>
                  <td className="py-2 pr-2 text-right font-black tabular-nums">{brl(totais.total)}</td>
                  {misturaSituacao && <td />}
                </tr>
                {totais.aberto > 0 && totais.aberto !== totais.total && (
                  <tr>
                    <td className="py-1 pr-2" colSpan={4} />
                    <td className="py-1 pr-2 text-right font-semibold" style={{ color: '#B45309' }}>
                      A cobrar
                    </td>
                    <td className="py-1 pr-2 text-right font-black tabular-nums" style={{ color: '#B45309' }}>
                      {brl(totais.aberto)}
                    </td>
                    {misturaSituacao && <td />}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={exportarExcel}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              <IconFile size={15} /> Excel
            </button>
            <button
              onClick={exportarPDF}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              <IconFile size={15} /> PDF
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => fecharFatura(false)}
              disabled={faturando}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              {faturando ? 'Fechando…' : 'Fechar fatura do mês'}
            </button>
            <button
              onClick={() => fecharFatura(true)}
              disabled={faturando || !temEmail}
              title={temEmail ? undefined : 'Cadastre o e-mail da empresa abaixo pra poder enviar'}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Fechar e enviar por e-mail
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            Fechar congela numa fatura numerada só o que ainda está <strong>em aberto</strong> — o que
            você mandar pro RH não muda depois. Atendimento já recebido não entra (não se cobra duas
            vezes), e lançamento novo no mesmo mês vai pra próxima fatura.
            {!temEmail && ' Pra enviar por e-mail, cadastre o e-mail da empresa aqui embaixo.'}
          </p>
          {faturaMsg && (
            <p className="text-xs" style={{ color: 'var(--admin-text-2)' }}>{faturaMsg}</p>
          )}

          {faturas.length > 0 && (
            <details>
              <summary className="text-xs font-semibold cursor-pointer" style={{ color: 'var(--admin-text-2)' }}>
                {faturas.length} fatura{faturas.length !== 1 ? 's' : ''} já fechada{faturas.length !== 1 ? 's' : ''}
              </summary>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                {faturas.map((f) => (
                  <li key={f.id}>
                    nº {f.numero} · {f.competencia.slice(5, 7)}/{f.competencia.slice(0, 4)} · {f.qtd} atend. ·{' '}
                    {brl(Number(f.total))}
                    {f.enviada_em ? ` · enviada pra ${f.enviada_para}` : ' · não enviada'}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {totais.qtdSemComanda > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
              {totais.qtdSemComanda} atendimento{totais.qtdSemComanda !== 1 ? 's' : ''} em aberto sem
              comanda — não entra no recebimento em lote. Abra o atendimento pra fechar por lá.
            </p>
          )}

          {totais.qtdRecebivel > 0 && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
              {!confirmando ? (
                <>
                  {/* Ordem certa: fechar → mandar pro RH → esperar → receber.
                      Enquanto não existe fatura da competência, "recebi" NÃO é
                      o próximo passo — e era, com o mesmo destaque do botão de
                      cobrar. Foi assim que o Eduardo baixou R$230 antes de
                      faturar em 25/08, e por causa disso a rota de faturar teve
                      que ganhar trava pra não cobrar de novo do RH. */}
                  {!temFaturaDoMes && (
                    <p className="text-[11px]" style={{ color: '#B45309' }}>
                      Você ainda não fechou a fatura de {mesBR}. O caminho normal é fechar, mandar pro
                      RH e registrar o recebimento só quando a empresa pagar.
                    </p>
                  )}
                  <button
                    onClick={() => setConfirmando(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold"
                    style={
                      temFaturaDoMes
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                    }
                  >
                    Registrar recebimento de {brl(totais.recebivel)}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
                    Vai marcar como pagos <strong>{totais.qtdRecebivel}</strong> atendimento
                    {totais.qtdRecebivel !== 1 ? 's' : ''} de {mesBR}, somando{' '}
                    <strong>{brl(totais.recebivel)}</strong>. Isso entra no seu caixa na data de hoje.
                  </p>
                  <div className="flex gap-2">
                    {([['pix', 'PIX'], ['cash', 'Dinheiro'], ['card', 'Cartão']] as const).map(([v, rotulo]) => (
                      <button
                        key={v}
                        onClick={() => setMetodo(v)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold"
                        style={{
                          background: metodo === v ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                          color: metodo === v ? '#fff' : 'var(--admin-text-2)',
                          border: '1px solid var(--admin-border)',
                        }}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmando(false)}
                      disabled={baixando}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={darBaixa}
                      disabled={baixando}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      style={{ background: '#10B981', color: '#fff' }}
                    >
                      <IconCheck size={15} /> {baixando ? 'Registrando…' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {resultado && (
            <p className="text-xs" style={{ color: 'var(--admin-text-2)' }}>{resultado}</p>
          )}
        </>
      )}
    </section>
  )
}
