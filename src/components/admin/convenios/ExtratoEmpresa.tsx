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
export default function ExtratoEmpresa({
  empresaNome,
  mes,
  linhas,
}: {
  empresaNome: string
  mes: string // YYYY-MM
  linhas: LinhaExtrato[]
}) {
  const router = useRouter()
  const [baixando, setBaixando] = useState(false)
  const [metodo, setMetodo] = useState<'pix' | 'cash' | 'card'>('pix')
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

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

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
  const mesBR = `${mes.slice(5, 7)}/${mes.slice(0, 4)}`
  const nomeArquivo = `extrato-${empresaNome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${mes}`

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const dados = linhas.map((l) => ({
      Data: dataBR(l.data),
      Horário: l.hora,
      Funcionário: l.funcionario,
      Profissional: l.profissional,
      Serviço: l.servico,
      Valor: l.valor,
      Situação: l.pago ? 'Pago' : 'Em aberto',
    }))
    dados.push({
      Data: '', Horário: '', Funcionário: '', Profissional: '',
      Serviço: 'TOTAL', Valor: totais.total, Situação: '',
    })
    const ws = XLSX.utils.json_to_sheet(dados)
    ws['!cols'] = [{ wch: 11 }, { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 12 }, { wch: 11 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos')
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
  }

  async function exportarPDF() {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(`Extrato de atendimentos · ${empresaNome}`, 14, 15)
    doc.setFontSize(10)
    doc.text(`Competência ${mesBR} · ${totais.qtd} atendimento${totais.qtd !== 1 ? 's' : ''} · ${brl(totais.total)}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Horário', 'Funcionário', 'Profissional', 'Serviço', 'Valor', 'Situação']],
      body: linhas.map((l) => [
        dataBR(l.data), l.hora, l.funcionario, l.profissional, l.servico, brl(l.valor), l.pago ? 'Pago' : 'Em aberto',
      ]),
      foot: [['', '', '', '', 'TOTAL', brl(totais.total), '']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 165, 233] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    })
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
                  <th className="text-left py-1.5 font-semibold">Situação</th>
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
                    <td className="py-1.5" style={{ color: l.pago ? '#10B981' : 'var(--admin-text-mute)' }}>
                      {l.pago ? 'Pago' : 'Em aberto'}
                    </td>
                  </tr>
                ))}
              </tbody>
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

          {totais.qtdSemComanda > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
              {totais.qtdSemComanda} atendimento{totais.qtdSemComanda !== 1 ? 's' : ''} em aberto sem
              comanda — não entra no recebimento em lote. Abra o atendimento pra fechar por lá.
            </p>
          )}

          {totais.qtdRecebivel > 0 && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
              {!confirmando ? (
                <button
                  onClick={() => setConfirmando(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  Registrar recebimento de {brl(totais.recebivel)}
                </button>
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
