/* Banco em memória com o pedaço do PostgREST que o motor de mensagens usa.
   Cada operação roda inteira dentro de um único `then` — é atômica em
   relação às outras, como uma linha travada no Postgres. O UNIQUE de
   `message_log.chave` é imitado com o mesmo código de erro (23505). */

type Linha = Record<string, unknown>
type Filtro = (l: Linha) => boolean

export class BancoFalso {
  tabelas: Record<string, Linha[]> = {}
  /** Quantas escritas cada tabela recebeu (insert + update que casou linha). */
  escritas: Record<string, number> = {}

  linhas(t: string): Linha[] {
    return (this.tabelas[t] ??= [])
  }
  from(t: string) {
    return new Consulta(this, t)
  }
}

class Consulta implements PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> {
  private filtros: Filtro[] = []
  private op: 'select' | 'insert' | 'update' = 'select'
  private carga: Linha | null = null
  private devolve = false
  private uma = false
  private limite = Infinity

  constructor(private db: BancoFalso, private t: string) {}

  select() { this.devolve = true; return this }
  insert(l: Linha) { this.op = 'insert'; this.carga = l; return this }
  update(l: Linha) { this.op = 'update'; this.carga = l; return this }
  eq(c: string, v: unknown) { this.filtros.push((l) => l[c] === v); return this }
  in(c: string, vs: unknown[]) { this.filtros.push((l) => vs.includes(l[c])); return this }
  gte(c: string, v: string) { this.filtros.push((l) => String(l[c] ?? '') >= v); return this }
  not(c: string, _op: string, v: unknown) { this.filtros.push((l) => l[c] !== v && l[c] !== undefined); return this }
  or() { return this }
  order() { return this }
  limit(n: number) { this.limite = n; return this }
  maybeSingle() { this.uma = true; return this }
  single() { this.uma = true; return this }

  private rodar() {
    const tab = this.db.linhas(this.t)
    const casa = (l: Linha) => this.filtros.every((f) => f(l))
    if (this.op === 'insert') {
      const nova = { created_at: new Date().toISOString(), ...this.carga! }
      if (this.t === 'message_log' && tab.some((l) => l.chave === nova.chave)) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      }
      tab.push(nova)
      this.db.escritas[this.t] = (this.db.escritas[this.t] ?? 0) + 1
      return { data: this.devolve ? [nova] : null, error: null }
    }
    if (this.op === 'update') {
      const alvo = tab.filter(casa)
      for (const l of alvo) Object.assign(l, this.carga)
      if (alvo.length) this.db.escritas[this.t] = (this.db.escritas[this.t] ?? 0) + 1
      return { data: this.devolve ? alvo.map((l) => ({ ...l })) : null, error: null }
    }
    const achou = tab.filter(casa).slice(0, this.limite).map((l) => ({ ...l }))
    return { data: this.uma ? achou[0] ?? null : achou, error: null }
  }

  then<A, B>(ok?: ((v: ReturnType<Consulta['rodar']>) => A | PromiseLike<A>) | null, erro?: ((e: unknown) => B | PromiseLike<B>) | null) {
    // uma volta de microtarefa antes: duas chamadas concorrentes se intercalam
    return Promise.resolve().then(() => this.rodar()).then(ok, erro)
  }
}
