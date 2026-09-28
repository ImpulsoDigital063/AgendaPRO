'use client'

/* "Vende por" (Eduardo 28/09/2026). Era o campo "Unidade" — e "unidade: 3",
   no português de balcão, é "3 unidades". A Wanessa escreveu a QUANTIDADE ali
   nos dois produtos que cadastrou. Botões à vista deixam claro que é a forma
   de medir, não quanto tem. O valor gravado continua o mesmo (products.unit).

   Unidade fora da lista (legado, ex: "3") aparece destacada pra ser trocada;
   não muda sozinha. */

export const VENDE_POR: { valor: string; rotulo: string }[] = [
  { valor: 'un', rotulo: 'Unidade' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'l', rotulo: 'Litro' },
  { valor: 'g', rotulo: 'g' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'cx', rotulo: 'Caixa' },
  { valor: 'pct', rotulo: 'Pacote' },
]

export default function VendePorSelector({
  value,
  onChange,
  Label,
}: {
  value: string
  onChange: (v: string) => void
  /** Rótulo do formulário que está usando (FieldLabel / EditLabel). */
  Label: (p: { children: React.ReactNode }) => React.ReactNode
}) {
  const legado = !VENDE_POR.some((o) => o.valor === value)
  return (
    <div>
      <Label>Vende por</Label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vende por">
        {VENDE_POR.map((o) => {
          const ativo = o.valor === value
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.valor)}
              className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={ativo
                ? { background: 'var(--admin-accent, #7C3AED)', color: '#fff' }
                : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
            >
              {o.rotulo}
            </button>
          )
        })}
      </div>
      {legado && value && (
        <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#b45309' }}>
          Está gravado &quot;{value}&quot;, que não é uma forma de vender. Escolha uma das opções acima.
          A quantidade em estoque é ajustada em &quot;Quantidade em estoque&quot;.
        </p>
      )}
      {!legado && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          Como o produto é medido. A quantidade que você tem vai no estoque.
        </p>
      )}
    </div>
  )
}
