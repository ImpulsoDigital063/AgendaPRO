<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile e Desktop são experiências separadas no mesmo codebase

O AgendaPRO atende dois fluxos simultâneos:
- **Mobile** (`agendapro.net.br`) — dono opera no celular · clientes em produção (Olímpio, Leticia, Erlane)
- **Desktop** (`agenda-pro-seven.vercel.app`) — versão em construção pra negócios maiores (piloto Palace Nail Spa) · estética/funcionalidades inspiradas no Salão99

**REGRA CRAVADA POR EDUARDO em 2026-05-19:** ajustes feitos pra resolver problema do mobile **NÃO podem alterar o comportamento do desktop**, e vice-versa.

## Como respeitar a regra na prática

Como mobile e desktop renderizam dos mesmos componentes `.tsx`, a única forma técnica de isolar é via **Tailwind responsive breakpoints**:

| Prefixo | Aplica em |
|---|---|
| sem prefixo | TODAS as telas (mobile + desktop) |
| `sm:` | ≥ 640px (tablet + desktop) |
| `md:` | ≥ 768px |
| `lg:` | ≥ 1024px |

### Padrão obrigatório quando mudar componente compartilhado

1. Se o ajuste é só pra mobile, declare a classe nova **sem prefixo** e **anule explicitamente no `sm:`** restaurando o estilo desktop anterior:
   ```tsx
   // ✅ Correto — só mobile sente o min-h-[280px], desktop volta ao min-h-0
   <div className="flex-1 min-h-[280px] sm:min-h-0 overflow-y-auto" />
   ```
2. Se o ajuste é só pra desktop, declare com `sm:` (ou breakpoint maior). Mobile não vê.
3. **Nunca** mude uma classe sem prefixo achando que afeta só um lado — afeta os dois.
4. Antes de commitar, mencione no commit message **em qual breakpoint** a mudança atua, pra a outra instância (Verbo Cowork no desktop) entender o escopo.

## Quando há dúvida

Pergunta. Não chuta. Mobile (Olímpio em uso real diário) e Desktop (Palace em onboarding) têm tolerância zero pra regressão cruzada.

# Financeiro — LEIA antes de mexer em qualquer tela de valor

O sistema irmão (Palace Nail Spa) teve **dois bugs financeiros reais** resolvidos em 03–04/07/2026 que quase com certeza existem aqui também (mesma arquitetura de comanda + `invoices.discount` + Vercel em UTC):

1. **Fuso UTC × Brasil** — telas bucketizam pagamento no dia errado (>21h cai no dia seguinte). Use `src/lib/date-br.ts` (`todayBR`/`addDaysBR`/`startOfDayBR`), nunca `new Date().toISOString().slice()` cru pra contar dinheiro por dia.
2. **Bruto × Líquido** — telas mostram o valor CHEIO onde teve cupom. `getApptDiscountMap` (em `commission-discount.ts`) já existe mas **só 2 telas usam**. Toda tela com valor tem que mostrar o líquido.

**Detalhe completo, armadilhas e plano de ação passo a passo:** `PLAYBOOK-FINANCEIRO-FUSO-E-LIQUIDO.md` (raiz do projeto). Ler ANTES de tocar em Vendas / Caixa / Fluxo / Análises / Remunerações / hub financeiro / cards de Recebido.
