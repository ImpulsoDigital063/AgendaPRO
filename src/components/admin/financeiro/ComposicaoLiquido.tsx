/* De onde sai o líquido · serviço e produto separados, cada desconto numa
   linha, fechando no mesmo "Lucro líquido" do card de cima (Izanara 02/10:
   "onde encontro o que é bruto e o que é líquido que fica para o Studio").
   Mesmo componente no mobile e no desktop. */

export type Composicao = {
  servicos: number
  qtdServicos: number
  produtos: number
  qtdProdutos: number
  /** sinal recebido antes + pacote / cartão presente vendidos */
  outros: number
  bruto: number
  /** null = conta não desconta comissão (chave comissao_no_fluxo desligada) */
  comissoes: {
    /** o que sai do líquido: maior entre gerada e paga */
    total: number
    /** quanto já foi registrado como pago em Remunerações */
    pago: number
    porProfissional: { nome: string; valor: number }[]
  } | null
  despesas: number
  lucroLiquido: number
  taxas: number
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Linha({ label, detalhe, valor, sinal, forte }: {
  label: string
  detalhe?: string
  valor: number
  sinal?: '+' | '−' | '='
  forte?: boolean
}) {
  const cor = sinal === '−' ? '#DC2626' : forte ? 'var(--admin-text)' : 'var(--admin-text-mute)'
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-2"
      style={forte ? { borderTop: '1px solid var(--admin-divider)' } : undefined}
    >
      <p className={`text-sm ${forte ? 'font-bold' : ''}`} style={{ color: forte ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}>
        {label}
        {detalhe && (
          <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--admin-text-faded)' }}>
            {detalhe}
          </span>
        )}
      </p>
      <p className={`text-sm tabular-nums whitespace-nowrap ${forte ? 'font-bold' : 'font-semibold'}`} style={{ color: cor }}>
        {sinal === '−' ? '− ' : ''}{formatBRL(valor)}
      </p>
    </div>
  )
}

export default function ComposicaoLiquido({ c }: { c: Composicao }) {
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
        Do bruto ao líquido
      </p>

      <Linha label="Serviços" detalhe={plural(c.qtdServicos, 'atendimento', 'atendimentos')} valor={c.servicos} />
      <Linha label="Produtos" detalhe={plural(c.qtdProdutos, 'venda', 'vendas')} valor={c.produtos} />
      {c.outros > 0 && <Linha label="Sinal e pacotes" valor={c.outros} />}
      <Linha label="Receita bruta" valor={c.bruto} forte />

      {c.comissoes !== null && (
        <>
          <Linha label="Comissões da equipe" valor={c.comissoes.total} sinal="−" />
          {c.comissoes.porProfissional.map((p) => (
            <div key={p.nome} className="flex items-baseline justify-between gap-3 pl-4 pb-1">
              <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>{p.nome}</p>
              <p className="text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text-faded)' }}>
                {formatBRL(p.valor)}
              </p>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 pl-4 pb-1">
            <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>Já pago</p>
            <p className="text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text-faded)' }}>
              {formatBRL(c.comissoes.pago)}
            </p>
          </div>
          {/* Em aberto com destaque: é o que a dona ainda deve à equipe (Eduardo 02/10) */}
          <div
            className="flex items-baseline justify-between gap-3 ml-4 mb-1 px-3 py-1.5 rounded-lg"
            style={{ background: 'color-mix(in srgb, #D97706 12%, transparent)' }}
          >
            <p className="text-sm font-bold" style={{ color: '#B45309' }}>Comissão a pagar</p>
            <p className="text-sm font-bold tabular-nums whitespace-nowrap" style={{ color: '#B45309' }}>
              {formatBRL(Math.max(0, c.comissoes.total - c.comissoes.pago))}
            </p>
          </div>
        </>
      )}
      <Linha label="Despesas pagas" valor={c.despesas} sinal="−" />
      <Linha label="Lucro líquido" valor={c.lucroLiquido} forte />

      {c.taxas > 0 && (
        <>
          <Linha label="Taxas cartão/Pix" valor={c.taxas} sinal="−" />
          <Linha label="Fica pro negócio" valor={c.lucroLiquido - c.taxas} forte />
        </>
      )}

    </div>
  )
}
