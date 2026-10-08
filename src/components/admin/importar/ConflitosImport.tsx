'use client'
/* ═══════════════════════════════════════════════════════════════
   CONFERÊNCIA DA IMPORTAÇÃO — conflitos de telefone (08/10/2026)
   O telefone identifica a cliente no sistema todo, então nunca existem duas
   no mesmo número. Antes a importação decidia sozinha e, na Wanessa, a
   "Gabriela Veras Moraes" virou "Lucca Veras Martins" (mãe e filho no mesmo
   número) sem ninguém ver. Eduardo: "o que a pessoa precisa é saber o que
   está acontecendo e ser apresentada à solução". Cada conflito aparece aqui
   com as opções; nada é gravado até todos estarem decididos.
   Mobile primeiro: cards empilhados, opções como botões grandes.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react'
import type { ImportAcao, ImportConflito, ImportDecisao } from '@/lib/importers/canonical'
import { telefoneCanonico } from '@/lib/phone-variants'

/** Mesmo formato do cadastro, pra comparar os dois numeros de olho. */
function fone(raw: string): string {
  const d = telefoneCanonico(raw)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

export type Decisoes = Record<number, ImportDecisao>

/** Decisão já preenchida quando o caso é óbvio. O resto fica pra dona. */
export function decisoesSugeridas(conflitos: ImportConflito[], atuais: Decisoes): Decisoes {
  const out: Decisoes = { ...atuais }
  for (const c of conflitos) {
    if (out[c.idx]) continue
    if (c.tipo === 'cadastrada' && c.nomeParecido && c.existente) out[c.idx] = { acao: 'atualizar' }
    if (c.tipo === 'parecida') out[c.idx] = { acao: 'criar' }
  }
  return out
}

/** Quantos conflitos ainda sem decisão que valha. Telefone corrigido conta
 *  como decidido aqui; o servidor reconfere o número novo antes de gravar. */
export function contarPendentes(conflitos: ImportConflito[], d: Decisoes): number {
  let n = 0
  for (const c of conflitos) {
    const dec = d[c.idx]
    if (!dec) { n++; continue }
    if (dec.telefone) continue
    if (!c.acoes.includes(dec.acao)) { n++; continue }
    if (c.tipo === 'repetida' && dec.acao !== 'pular') {
      const entram = [c.idx, ...(c.outras ?? []).map((o) => o.idx)].filter(
        (i) => d[i] && d[i].acao !== 'pular' && !d[i].telefone,
      )
      if (entram.length > 1) n++
    }
  }
  return n
}

const ROTULO: Record<ImportAcao, (c: ImportConflito) => string> = {
  atualizar: (c) =>
    c.tipo === 'repetida' ? 'Usar esta linha no cadastro' : 'É a mesma pessoa · atualizar cadastro',
  criar: (c) =>
    c.tipo === 'parecida' ? 'São pessoas diferentes · cadastrar' : c.tipo === 'repetida' ? 'Cadastrar esta linha' : 'Cadastrar',
  pular: (c) => (c.tipo === 'cadastrada' ? 'Manter o cadastro como está' : 'Não importar esta linha'),
}

function Card({
  c,
  decisao,
  onDecidir,
}: {
  c: ImportConflito
  decisao?: ImportDecisao
  onDecidir: (d: ImportDecisao | undefined) => void
}) {
  const [editando, setEditando] = useState(!!decisao?.telefone)
  const [tel, setTel] = useState(decisao?.telefone ?? '')

  const corTitulo = 'var(--admin-text)'
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
        Na planilha
      </p>
      <p className="text-[15px] font-semibold mt-0.5" style={{ color: corTitulo }}>
        {c.linha.name}
      </p>
      <p className="text-[13px] tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
        {fone(c.linha.phone)}
      </p>

      {c.existente && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mt-3" style={{ color: 'var(--admin-text-mute)' }}>
            {c.tipo === 'parecida' ? 'Já cadastrada com número parecido' : 'Já cadastrada com esse número'}
          </p>
          <p className="text-[15px] font-semibold mt-0.5" style={{ color: corTitulo }}>
            {c.existente.name}
          </p>
          <p className="text-[13px] tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
            {fone(c.existente.phone)}
          </p>
        </>
      )}

      {c.outras && c.outras.length > 0 && (
        <p className="text-[12.5px] mt-3" style={{ color: 'var(--admin-text-2)' }}>
          Mesmo telefone na planilha que: <strong>{c.outras.map((o) => o.name).join(', ')}</strong>
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1.5" role="radiogroup" aria-label={`O que fazer com ${c.linha.name}`}>
        {c.acoes.map((a) => {
          const ativo = !editando && decisao?.acao === a && !decisao?.telefone
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => {
                setEditando(false)
                onDecidir({ acao: a })
              }}
              className="text-left text-[14px] font-medium px-3 py-2.5 rounded-lg"
              style={
                ativo
                  ? { background: 'rgba(79,70,229,0.10)', border: '1.5px solid var(--admin-accent, #4f46e5)', color: 'var(--admin-text)' }
                  : { background: 'var(--admin-input-bg, transparent)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }
              }
            >
              {ROTULO[a](c)}
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={editando}
          onClick={() => {
            setEditando(true)
            onDecidir(tel.trim() ? { acao: 'criar', telefone: tel.trim() } : undefined)
          }}
          className="text-left text-[14px] font-medium px-3 py-2.5 rounded-lg"
          style={
            editando
              ? { background: 'rgba(79,70,229,0.10)', border: '1.5px solid var(--admin-accent, #4f46e5)', color: 'var(--admin-text)' }
              : { background: 'var(--admin-input-bg, transparent)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }
          }
        >
          Corrigir o telefone desta linha
        </button>
        {editando && (
          <input
            type="tel"
            inputMode="tel"
            autoFocus
            value={tel}
            placeholder="(91) 99999-9999"
            aria-label="Telefone corrigido"
            onChange={(e) => {
              setTel(e.target.value)
              onDecidir(e.target.value.trim() ? { acao: 'criar', telefone: e.target.value.trim() } : undefined)
            }}
            className="w-full text-[15px] rounded-lg px-3 py-2.5 tabular-nums"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />
        )}
      </div>

      {c.problema && (
        <p className="text-[12.5px] mt-2 font-medium" style={{ color: '#dc2626' }}>
          {c.problema}
        </p>
      )}
    </div>
  )
}

export default function ConflitosImport({
  conflitos,
  decisoes,
  onChange,
}: {
  conflitos: ImportConflito[]
  decisoes: Decisoes
  onChange: (d: Decisoes) => void
}) {
  if (conflitos.length === 0) return null

  const decidir = (idx: number, d: ImportDecisao | undefined) => {
    const novo = { ...decisoes }
    if (d) novo[idx] = d
    else delete novo[idx]
    onChange(novo)
  }

  const grupos: { titulo: string; explica: string; itens: ImportConflito[]; lote?: ImportAcao[] }[] = [
    {
      titulo: 'Mesmo telefone, nome diferente',
      explica:
        'Esse número já é de outra pessoa no sistema. Pode ser a mesma com outro nome, ou alguém da família usando o mesmo número. Cada telefone só pode ter um cadastro.',
      itens: conflitos.filter((c) => c.tipo === 'cadastrada' && !c.nomeParecido),
    },
    {
      titulo: 'Telefone repetido na planilha',
      explica: 'O mesmo número aparece em mais de uma linha. Só uma pode ficar com ele: escolha qual, ou corrija o das outras.',
      itens: conflitos.filter((c) => c.tipo === 'repetida'),
    },
    {
      titulo: 'Telefone quase igual a um cadastro',
      explica: 'Só um dígito de diferença. Pode ser a mesma pessoa com o número digitado errado.',
      itens: conflitos.filter((c) => c.tipo === 'parecida'),
    },
    {
      titulo: 'Já cadastradas',
      explica: 'Mesmo telefone e nome parecido: deve ser a mesma pessoa. Atualizar grava o nome e os dados da planilha no cadastro.',
      itens: conflitos.filter((c) => c.tipo === 'cadastrada' && c.nomeParecido),
      lote: ['atualizar', 'pular'],
    },
  ]

  const pend = contarPendentes(conflitos, decisoes)

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl p-3.5 text-[13.5px] leading-relaxed"
        style={{
          background: pend > 0 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)',
          border: `1px solid ${pend > 0 ? 'rgba(245,158,11,0.45)' : 'rgba(16,185,129,0.45)'}`,
          color: 'var(--admin-text)',
        }}
      >
        <strong>
          {conflitos.length} {conflitos.length === 1 ? 'linha precisa' : 'linhas precisam'} da sua conferência.
        </strong>{' '}
        {pend > 0
          ? `Faltam ${pend} pra decidir. Nada é gravado até você decidir todas.`
          : 'Tudo decidido. Pode confirmar a importação.'}
      </div>

      {grupos
        .filter((g) => g.itens.length > 0)
        .map((g) => (
          <section key={g.titulo} className="space-y-2.5">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--admin-text)' }}>
                {g.titulo} <span style={{ color: 'var(--admin-text-mute)' }}>· {g.itens.length}</span>
              </h3>
              <p className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                {g.explica}
              </p>
              {g.lote && g.itens.length > 1 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {g.lote.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        const novo = { ...decisoes }
                        for (const c of g.itens) novo[c.idx] = { acao: a }
                        onChange(novo)
                      }}
                      className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg"
                      style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)', background: 'var(--admin-surface)' }}
                    >
                      {a === 'atualizar' ? 'Atualizar todas' : 'Manter todas como estão'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {g.itens.map((c) => (
              <Card
                key={`${c.idx}-${c.linha.phone}`}
                c={c}
                decisao={decisoes[c.idx]}
                onDecidir={(d) => decidir(c.idx, d)}
              />
            ))}
          </section>
        ))}
    </div>
  )
}
