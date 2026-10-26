import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccess } from '@/lib/admin-data'
import { PERGUNTA_POR_ID } from '@/lib/perguntas/catalogo'
import { AREA_DO_GRUPO } from '@/lib/perguntas/areas'
import { responder } from '@/lib/perguntas/responder'
import { IconArrowRight, IconSearch, IconSparkles } from '@/components/ui/Icon'

/* "Pergunte ao seu negócio" na tela Início (26/10/2026).
   Em 5 dias no ar, 8 perguntas reais: a dona não acha a tela no menu.
   Aqui ela já vê 3 respostas prontas e pode perguntar sem sair do Início.
   Mesmas respostas da tela (lib/perguntas/responder), sem registrar no log
   (não foi a dona que perguntou). Gerente só vê as áreas liberadas. */

// Lucro primeiro (é o que o card de Recebido não mostra), depois clientes.
// Agenda é de todos: fica de reserva pra gerente sem financeiro/clientes.
const ORDEM = ['lucro', 'sumidas', 'novas', 'proxima_semana', 'dia_cheio']

export default async function PerguntasInicioCard({ userId }: { userId: string }) {
  const acesso = await getAdminAccess(userId)
  if (!acesso) return null
  const sb = await createClient()
  const { data: negocio } = await sb
    .from('businesses')
    .select('id, comissao_no_fluxo, comissao_paga_no_atendimento')
    .eq('id', acesso.businessId)
    .single()
  if (!negocio) return null

  const ids = ORDEM.filter((id) => {
    const area = AREA_DO_GRUPO[PERGUNTA_POR_ID[id].grupo]
    return !area || !acesso.bloqueadas.includes(area)
  }).slice(0, 3)

  const respostas = await Promise.all(
    ids.map((id) => responder(sb, negocio, { id }).catch(() => null)),
  )
  const prontas = ids.map((id, i) => ({ id, r: respostas[i] })).filter((x) => x.r)

  return (
    <section
      className="rounded-2xl p-4 lg:p-5"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 9%, var(--admin-surface)) 0%, var(--admin-surface) 70%)',
        border: '1px solid color-mix(in srgb, var(--admin-accent) 28%, var(--admin-border))',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
            <IconSparkles size={16} />
          </span>
          <h2 className="text-base font-bold truncate" style={{ color: 'var(--admin-text)' }}>Pergunte ao seu negócio</h2>
        </div>
        <Link href="/admin/perguntas" className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>
          Ver todas
        </Link>
      </div>

      {/* Formulário comum: vai pra tela de perguntas já com a busca feita */}
      <form action="/admin/perguntas" method="get" className="mt-3 flex gap-2">
        <div className="flex-1 min-w-0 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-faded)' }}>
            <IconSearch size={16} />
          </span>
          <input
            name="q"
            placeholder="Ex.: quanto faturei em setembro?"
            autoComplete="off"
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />
        </div>
        <button type="submit" className="px-4 rounded-xl text-sm font-bold text-white flex-shrink-0" style={{ background: 'var(--admin-accent)' }}>
          Perguntar
        </button>
      </form>

      {prontas.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {prontas.map(({ id, r }) => (
            <Link
              key={id}
              href={`/admin/perguntas?p=${id}`}
              className="group rounded-xl p-3 flex flex-col gap-1 transition-colors"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                {PERGUNTA_POR_ID[id].texto}
              </span>
              <span className="text-sm font-semibold leading-snug line-clamp-3" style={{ color: 'var(--admin-text)' }}>
                {r!.frase}
              </span>
              {r!.aviso && (
                <span className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--admin-warn)' }}>
                  {r!.aviso.texto}
                </span>
              )}
              <span className="mt-auto pt-1 inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                Ver detalhes <IconArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
