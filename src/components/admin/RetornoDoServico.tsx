'use client'

/* v177 · RETORNO DO PROCEDIMENTO (25/10/2026). Substitui o campo solto "Dias
   para poder repetir" (v123) nos dois formulários do ServicosTab.

   Sem tipo escolhido, vale o comportamento antigo: só o número de dias. Com
   tipo, a cliente que concluiu este serviço aparece pra recepção em "Retornos
   pra marcar" (camada 1 · marca na saída, sem mensagem cara) e o serviço da
   volta já vem escolhido no agendamento. */

export type RetornoForm = { tipo: string; dias: string; janela: string; servico: string }

export const TIPOS_RETORNO: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: '', rotulo: 'Sem retorno', ajuda: '' },
  { valor: 'retoque', rotulo: 'Retoque incluso', ajuda: 'Faz parte do procedimento (ex.: retoque da micropigmentação).' },
  { valor: 'manutencao', rotulo: 'Manutenção', ajuda: 'Volta pra manter o resultado (ex.: manutenção de cílios).' },
  { valor: 'sessao', rotulo: 'Nova sessão', ajuda: 'Pode repetir depois de um intervalo (ex.: toxina, peeling).' },
]

export function retornoDoServico(s: { retorno_tipo?: string | null; retorno_dias?: number | null; retorno_janela_dias?: number | null; retorno_servico_id?: string | null } | null): RetornoForm {
  return {
    tipo: s?.retorno_tipo ?? '',
    dias: s?.retorno_dias ? String(s.retorno_dias) : '',
    janela: s?.retorno_janela_dias ? String(s.retorno_janela_dias) : '',
    servico: s?.retorno_servico_id ?? '',
  }
}

/** Colunas pro insert/update. Vazio = null (zero dia avisaria no mesmo dia). */
export function colunasDoRetorno(r: RetornoForm) {
  const dias = r.dias ? parseInt(r.dias) : null
  const janela = r.tipo && r.janela ? parseInt(r.janela) : null
  return {
    retorno_dias: dias,
    retorno_tipo: (r.tipo || null) as 'retoque' | 'manutencao' | 'sessao' | null,
    retorno_janela_dias: janela && dias && janela > dias ? janela : null,
    retorno_servico_id: r.tipo && r.servico ? r.servico : null,
  }
}

export default function RetornoDoServico({
  valor,
  onChange,
  servicos,
  servicoAtualId,
}: {
  valor: RetornoForm
  onChange: (v: RetornoForm) => void
  servicos: { id: string; name: string }[]
  servicoAtualId?: string
}) {
  const tipo = TIPOS_RETORNO.find((t) => t.valor === valor.tipo) ?? TIPOS_RETORNO[0]
  const mute = { color: 'var(--admin-text-mute)' }
  return (
    <div className="space-y-3">
      <div>
        <label className="admin-label">Retorno deste procedimento</label>
        <select value={valor.tipo} onChange={(e) => onChange({ ...valor, tipo: e.target.value })} className="admin-input w-full px-3 py-2.5 text-sm">
          {TIPOS_RETORNO.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
        {tipo.ajuda && <p className="text-[11px] mt-1.5" style={mute}>{tipo.ajuda}</p>}
      </div>

      <div className={valor.tipo ? 'grid grid-cols-2 gap-3' : ''}>
        <div>
          <label className="admin-label">{valor.tipo ? 'A partir de (dias)' : 'Dias para poder repetir'}</label>
          <input type="number" value={valor.dias} onChange={(e) => onChange({ ...valor, dias: e.target.value })} placeholder={valor.tipo ? 'ex.: 30' : 'deixe vazio para não avisar'} min="1" max="1095" className="admin-input w-full px-3 py-2.5 text-sm" />
        </div>
        {valor.tipo && (
          <div>
            <label className="admin-label">Até (dias, opcional)</label>
            <input type="number" value={valor.janela} onChange={(e) => onChange({ ...valor, janela: e.target.value })} placeholder="ex.: 60" min="1" max="1095" className="admin-input w-full px-3 py-2.5 text-sm" />
          </div>
        )}
      </div>

      {valor.tipo && (
        <div>
          <label className="admin-label">Na volta, a cliente marca</label>
          <select value={valor.servico} onChange={(e) => onChange({ ...valor, servico: e.target.value })} className="admin-input w-full px-3 py-2.5 text-sm">
            <option value="">O mesmo serviço</option>
            {servicos.filter((s) => s.id !== servicoAtualId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <p className="text-[11px]" style={mute}>
        {valor.tipo
          ? 'Quem concluir este serviço aparece pra recepção em "Retornos pra marcar", com a data sugerida, pra já sair com o retorno marcado.'
          : 'Guarda o intervalo deste serviço. Vazio = sem retorno.'}
        <br />
        O aviso automático pelo WhatsApp ainda está em teste: por enquanto nada é enviado.
      </p>
    </div>
  )
}
