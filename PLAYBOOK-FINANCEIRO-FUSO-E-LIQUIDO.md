# PLAYBOOK FINANCEIRO — Fuso & Valor Líquido (transferência Palace → AgendaPRO)

> **Origem:** aprendido resolvendo o financeiro do **Palace Nail Spa** (sistema irmão, mesmo DNA: agendamento + comanda + financeiro) em 03–04/07/2026.
> **Objetivo:** o AgendaPRO tem a MESMA arquitetura de dinheiro e quase com certeza os MESMOS dois bugs. Este doc detalha tudo pra você (Verbo do AgendaPRO) achar e corrigir sem repetir os erros que a gente cometeu no caminho.

---

## ⚠️ LEIA ISTO ANTES DE MEXER EM QUALQUER LINHA

1. **AgendaPRO ≠ Palace.** Este playbook é um **padrão + metodologia**, não um copiar-colar. Cada afirmação aqui você **confirma na fonte do AgendaPRO** (código real + banco real) antes de aplicar. `λ.não-inventar` + `λ.prova-na-fonte`.
2. **A única prova válida é ler a row no banco depois de escrever.** UI verde / `res.ok` / "salvo!" NÃO é prova. `λ.prova-na-fonte`.
3. **Não afirme número que você não leu.** Aritmética que fecha ≠ prova do que o número é. Se não achar, fale que não achou e busque outro caminho. `λ.não-inventar`.
4. **Diagnostique na camada certa** antes de codar o fix: UI / payload do client / rota do server / banco. Errar a camada = recidiva garantida. `λ.diagnostico-no-nivel-certo`.
5. **`npx tsc --noEmit` limpo antes de todo push.** Migration de coluna nova entra em prod ANTES do git push.
6. **AgendaPRO é mobile E desktop isolados** (Tailwind `sm:`). Ajuste de um lado não pode regredir o outro (regra cravada no AGENTS.md). Feature/fix tem que existir nos dois fronts quando fizer sentido.

---

## 0. O que o AgendaPRO JÁ TEM (mapeado na recon de 04/07/2026)

Você não vai construir do zero. As duas "caixas de ferramenta" já existem — o problema é que **quase nenhuma tela usa**.

### Fuso — `src/lib/date-br.ts` (equivalente ao `tz.ts` do Palace)

| AgendaPRO (`date-br.ts`) | Palace (`tz.ts`) | O que faz |
|---|---|---|
| `todayBR()` | `hojeSP()` | data de HOJE no fuso BR (YYYY-MM-DD) |
| `addDaysBR(ymd, n)` | `somaDiasSP(dateStr, n)` | soma dias ancorado no meio-dia (não vira dia) |
| `startOfDayBR(ymd)` | `inicioDiaSP(dateStr)` | início do dia BR = `ymd + 'T00:00:00-03:00'` |
| `formatDateBR(value)` | (labels) | formatação de data pra exibir |

> **Confirme lendo `date-br.ts` inteiro** o comportamento exato de cada uma (principalmente `startOfDayBR` — o boundary de query depende disso). Não presuma que é idêntico ao Palace.

### Líquido — `src/lib/commission-discount.ts`

- **`getApptDiscountMap(...)` JÁ EXISTE** (mesmo modelo: desconto vive em `invoices.discount`, por COMANDA, rateado entre os itens).
- **IMPORTANTE:** leia a **assinatura e o retorno reais** dessa função no AgendaPRO antes de usar. No Palace ela retorna `Record<appointmentId, descontoEmR$>` (rateio proporcional pelo total do item, só `item_type='appointment'`). No AgendaPRO o esqueleto que vi monta `invDiscount[inv.id]` — **confirme se o retorno é por-appointment ou por-invoice** e ajuste o uso.
- **`somaLiquidaAppts()` NÃO existe** no AgendaPRO (foi conveniência que criei no Palace). Você pode criar igual ou inlinar o padrão (ver §2).

### Quem já usa o discount map (só 2 telas!)

```
src/app/admin/(protected)/caixa/page.tsx      ← já neta
src/app/recepcao/(protected)/caixa/page.tsx   ← já neta
```

**Todas as outras telas financeiras NÃO importam o discount map** → forte suspeita de estarem mostrando BRUTO. Telas em `src/app/admin/(protected)/financeiro/`: `analises`, `cancelados`, `despesas`, `fluxo-caixa`, `page.tsx` (hub), `remuneracoes`, `vendas`. Mais: `inicio`, `eu`, `clientes`, e a grade/timeline.

---

## 1. BUG #1 — FUSO (UTC × Brasil UTC−3)

### O sintoma no Palace
Um atendimento pago às **17:47 (BRT)** caía no **dia seguinte** em telas de relatório. O "Recebido do dia" e a lista de Vendas bucketizavam errado. Provado na fonte: no dia 03/07 o bucket UTC deu **R$ 1.556** e o bucket SP correto deu **R$ 1.517,10**.

### A causa-raiz (vale igual pro AgendaPRO — Vercel roda em UTC)
- **Brasil = UTC−3 fixo** (sem horário de verão desde 2019). Não precisa de lib de DST.
- Vercel e Postgres rodam em **UTC**. No server, `new Date()` é um instante UTC.
- `new Date().toISOString().slice(0,10)` devolve a **data do calendário UTC**. Depois das **21:00 BRT** (00:00 UTC do dia seguinte), essa data **já é amanhã**. Todo pagamento entre 21h e meia-noite cai no dia errado.
- Qualquer query com boundary `>= 'YYYY-MMT00:00:00'` sem offset `-03:00` está pegando **00:00 UTC** = **21:00 do dia anterior no BR**.

### Onde se esconde (varra TODAS)
Qualquer tela/rota que **bucketiza por data** ou **compara paid_at com um boundary de dia**:
- cards do Início / "eu" (Recebido, A receber)
- KPIs da grade/timeline do dia
- **Vendas** (lista + total, filtro de data)
- **Fluxo de caixa** / Detalhamento
- **Remunerações** (janela do período de comissão)
- **hub financeiro** (`financeiro/page.tsx`) — gráficos, tendência, top profs/serviços
- **Análises** (janela rolling 30d)
- **Caixa** (Recebido hoje / a receber)
- **Despesas** e **Cancelados** por data

> **Recon já feita:** o AgendaPRO tem **53 arquivos** com `toISOString().slice` / `new Date().toISOString`. Nem todos são bug (alguns bucketizam de propósito em UTC, ou são campos DATE puros). **Cada um você classifica**: bucketiza dinheiro/atendimento por dia BR? Então tem que usar `date-br.ts`.

### O fix — dois tipos de tela

**Tipo A — telas que filtram por string de data** (a maioria): troca o `new Date().toISOString().slice(0,10)` por `todayBR()`, o `+1 dia` por `addDaysBR()`, e o boundary de query por `startOfDayBR()`.

```ts
// ❌ ERRADO (bucket UTC)
const hoje = new Date().toISOString().slice(0,10)
q.gte('paid_at', `${hoje}T00:00:00`)          // 00:00 UTC = 21h BR do dia anterior

// ✅ CERTO (bucket BR)
import { todayBR, addDaysBR, startOfDayBR } from '@/lib/date-br'
const hoje = todayBR()
const amanha = addDaysBR(hoje, 1)
q.gte('paid_at', startOfDayBR(hoje)).lt('paid_at', startOfDayBR(amanha))
```

**Tipo B — telas com "motor de data"** (janelas rolling, ex.: Análises 30d que faz `new Date()` + `setDate(-30)` + `toISOString`): aqui o padrão do Palace foi deslocar o relógio:

```ts
// now deslocado −3h → getters e toISOString devolvem a data de São Paulo
const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
// pra boundary de query em paid_at (coluna TIMESTAMP): volta +3h → instante UTC real
const toReal = (d: Date) => new Date(d.getTime() + 3 * 60 * 60 * 1000)
// pra bucketizar um ISO vindo do banco no dia BR: −3h e fatia
const emSP = (iso: string) => new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0,10)
```
Confirme como a Análises do AgendaPRO monta a janela e escolha A ou B.

### 🚨 A ARMADILHA DOS LABELS (a gente se queimou aqui — NÃO REPITA)
Uma varredura cega adicionando `timeZone:'America/Sao_Paulo'` em **todo** `toLocaleString`/`toLocaleDateString` **quebra**:
- **Data pura** `new Date('2026-07-01T00:00:00')` (meia-noite LOCAL): adicionar timeZone SP **volta um dia** (mostra 30/06). NÃO adicione timeZone em Date de data pura nem em labels de período.
- **Moeda** `valor.toLocaleString('pt-BR', {style:'currency'...})`: adicionar `timeZone` num número dá **erro de TS** (TS2769) e não faz sentido.
- **Só adicione `timeZone:'America/Sao_Paulo'` na formatação de TIMESTAMP** (valor com hora vindo do banco, ex.: "Paga às 17:47"). Em data pura e em moeda, **nunca**.

### Como validar (prova na fonte)
1. Rode uma query que some `paid_at` no bucket UTC vs no bucket BR pra um dia com movimento perto das 21h. Se der diferente, o bug existe.
2. Depois do fix, abra a tela e confira um atendimento real pago >21h: tem que aparecer no dia certo, e o horário exibido tem que bater ("Paga às 17:47", não "20:47").

---

## 2. BUG #2 — VALOR LÍQUIDO (mostra BRUTO onde teve desconto)

### O sintoma no Palace
Telas somavam `appointments.total_price` (BRUTO) sem abater o cupom. No fechamento de caixa isso gerava **falta/sobra FALSA** na gaveta (o "esperado" vinha inflado). O dono comparava o total e não batia com o que realmente entrou.

### A causa-raiz
- O desconto (cupom + manual) vive em **`invoices.discount`** (nível COMANDA, uma comanda pode ter vários serviços/produtos).
- As telas somavam `total_price` do appointment (cheio) e **ignoravam** o desconto da comanda.
- `getApptDiscountMap` já existe pra rateаr o desconto de volta pro appointment. O buraco é as telas **não usarem**.

### A REGRA CRAVADA — `λ.valor-liquido`
> **Toda tela que mostra um valor mostra o LÍQUIDO** (com cupom/desconto já abatido), nunca o bruto onde houve desconto. Vale pro **"recebido"** E pro **"a receber"** — se a comanda foi **aberta**, recebeu cupom e **não** foi fechada, o "a receber" já mostra o valor **com** desconto (o cupom vira o valor, não o cheio).

### O padrão de fix
```ts
import { getApptDiscountMap } from '@/lib/commission-discount'

// disc = mapa desconto por appointment (CONFIRME o retorno real no AgendaPRO)
const disc = await getApptDiscountMap(sb, appts.map(a => a.invoice_item_id))
// líquido de cada um:
const liq = Math.max(0, Number(a.total_price ?? 0) - (disc[a.id] ?? 0))
// soma líquida:
const totalLiq = appts.reduce((s, a) => s + Math.max(0, Number(a.total_price ?? 0) - (disc[a.id] ?? 0)), 0)
```
No Palace criei um helper `somaLiquidaAppts(sb, appts)` pra não repetir. Pode replicar:
```ts
export async function somaLiquidaAppts(sb, appts: {id; total_price; invoice_item_id}[]): Promise<number> {
  const disc = await getApptDiscountMap(sb, appts.map(a => a.invoice_item_id))
  return appts.reduce((s, a) => s + Number(a.total_price ?? 0) - (disc[a.id] ?? 0), 0)
}
```
> Pra o `getApptDiscountMap` rateаr, o `select` do appointment precisa trazer **`id`** e **`invoice_item_id`**. Várias telas do Palace não traziam — tive que adicionar no select. Cheque cada query.

### Telas pra varrer no AgendaPRO (lista Palace, mapeada)
- [ ] cards do **Início** / `eu` (Recebido **e** A receber)
- [ ] **KPIs da grade/timeline** do dia (Recebido **e** A receber)
- [ ] **hub financeiro** (`financeiro/page.tsx`): valor recebido/programado, top profissionais, top serviços, donut de método, tendência (série atual **e** anterior)
- [ ] **Análises** (receita atual e anterior — netar ANTES de passar pra view)
- [ ] **Vendas** (linha a linha **e** total)
- [ ] **Fluxo de caixa** / Detalhamento
- [ ] **A receber do Caixa** (admin **e** recepção) — *no AgendaPRO os 2 caixas JÁ netam; confirme que é o "a receber" também, não só o "recebido".*
- [ ] **Gasto por cliente** (`clientes`) — `totalSpent`
- [ ] componentes de card reusados (TopClientes/TopServices/TopProfs/TrendReceita etc.)

### ⚠️ A EXCEÇÃO PROPOSITAL (não nete aqui)
A tela de **Remuneração da profissional** mostra **Bruto → desconto → Base** de propósito — a profissional precisa ver os três pra entender o cálculo da comissão. **Netar ali quebra o extrato.** Confirme no AgendaPRO se a `remuneracoes` faz esse breakdown e, se fizer, **deixe o bruto lá**.

### ⚠️ A ARMADILHA DO `manual_discount` (bug real do Palace)
No Palace, gravar o desconto **só** em `invoices.discount` não bastava: um recálculo posterior (rota `/items`, `/pay`, trigger de total) **ignorava** e o total voltava pro cheio ("coloco o desconto e fica o valor normal"). A correção foi gravar o desconto **também** em `invoices.manual_discount`.
> **Verifique no AgendaPRO:** existe coluna `manual_discount`? Existe recálculo de total em `/items` / `/pay` / trigger? Se sim, o desconto tem que sobreviver a esse recálculo. Teste: aplica cupom numa comanda aberta, adiciona um item, e confere no banco se o `discount`/`total` continuam certos.

### Cancelada não é venda
No Palace, Vendas passou a **excluir canceladas** da contagem e da lista (`.neq('status','cancelled')` / fora `no_show`). Confirme que o AgendaPRO faz o mesmo em Vendas e nos contadores. Cancelada só atrapalha a conferência.

---

## 3. RECONCILIAÇÃO COM MAQUININHA & PROVA DE INTEGRIDADE

Quando o dono comparar o sistema com a maquininha (InfinitePay/Asaas/etc.) e não bater, **a metodologia é esta** (aprendida na marra com o Marko do Palace):

### Não tente reconciliar ao centavo com a maquininha
A maquininha é um **subconjunto** do sistema, não o espelho:
- **Não registra dinheiro** (venda em cash nunca aparece lá).
- **Relógio diferente**: ela conta pela liquidação dela (cartão cai D+1), o sistema conta pelo atendimento/pagamento.
- **Unidade diferente**: ela conta **transações** (1 cobrança por comanda); o sistema conta **atendimentos** (1 por serviço). Comanda com 3 serviços = 1 transação na maquininha, 3 no sistema.
- **Você NÃO pode afirmar** o que passou ou não pela maquininha sem o **extrato detalhado** dela. Não invente (ex.: "esse pix não passou na maquininha" — não sabe). `λ.não-inventar`.

### A jogada vencedora: provar que O NOSSO LADO é íntegro
Se o sistema soma **exato** em atendimentos **reais e marcados como pagos**, então a diferença está do outro lado. Prove a integridade com esta **bateria** (rodei no Palace, 0 inconsistências em 56 atendimentos):

1. Todo item tem **cliente**
2. Todo item tem **serviço** e **profissional**
3. **Preço > 0**
4. Tem **forma de pagamento**
5. Está em **comanda fechada** (não "aberta contada como paga", não item órfão)
6. **Desconto de cupom abatido** do valor
7. **Nenhuma duplicata exata** (mesmo cliente+serviço+dia+hora)
8. **Soma fecha ao centavo** com o total da tela

### Crossers de fronteira (explica diferença entre "por data do atendimento" vs "por data do pagamento")
Atendimento de um dia pago em outro. Ache com:
- pago no período mas `appointment_date` fora → entra no "recebido por pagamento", não no "por atendimento"
- `appointment_date` no período mas pago fora → o inverso

Isso explica por que os **seus dois jeitos de contar** divergem — mas **não** fecha a diferença com a maquininha (relógio dela é outro).

### O entregável
Uma **lista item a item** dos atendimentos do período, com total batendo, marcando cupom onde teve, e um **ponto honesto** pra conferência humana quando houver dúvida real (ex.: dois lançamentos quase idênticos que podem ser duplicata — não declare certo nem errado, aponte pra recepção confirmar). No Palace virou um relatório bilíngue (dono lê inglês, recep lê português).

---

## 4. AS REGRAS DURAS (λ) — valem pros dois sistemas

- **`λ.não-inventar`** — lacuna fica lacuna. Não afirme número/mecanismo que não leu na fonte pra não dizer "não sei". Queimou o dono 2x no Palace.
- **`λ.prova-na-fonte`** — a única prova de persistência é ler a row no banco depois de escrever. Read-after-write em todo write crítico.
- **`λ.diagnostico-no-nivel-certo`** — antes do 2º fix, ache a camada real da falha (UI / payload / rota / banco).
- **`λ.fuso-vercel-utc`** — Vercel bucketiza em UTC; use `date-br.ts` em tudo que conta dinheiro/atendimento por dia BR.
- **`λ.valor-liquido`** — toda tela com valor mostra o líquido (recebido E a receber).
- **`λ.testar-o-caminho-do-cliente`** — não declare "funcionando" sem reproduzir o fluxo exato que o cliente usa.

---

## 5. PLANO DE AÇÃO PRO VERBO DO AGENDAPRO (passo a passo)

1. **Leia** `src/lib/date-br.ts` e `src/lib/commission-discount.ts` inteiros. Anote assinaturas/retornos reais (não presuma iguais ao Palace).
2. **Fuso — triagem:** liste os 53 sites `toISOString().slice` (`grep -rn "toISOString()" src`). Pra cada, pergunte: bucketiza dinheiro/atendimento por dia BR? Se sim → migra pra `date-br.ts`. Marque os que são UTC-de-propósito ou DATE puro.
3. **Fuso — prova:** escolha um dia com movimento perto das 21h e compare soma UTC vs BR na fonte. Confirma o bug antes de mexer.
4. **Líquido — triagem:** `grep -rn "total_price" src/app/admin src/app/recepcao` → toda soma de `total_price` que vira valor exibido é suspeita. Cruze com "essa tela importa `getApptDiscountMap`?". As que não importam e somam total_price = candidatas.
5. **Líquido — fix:** adicione `id, invoice_item_id` no select, aplique o padrão do §2, netando recebido E a-receber. **Não** nete a remuneração (bruto→base).
6. **Verifique o `manual_discount`** (§2) — teste aplicar cupom + editar comanda e ler o banco.
7. **`npx tsc --noEmit`** limpo. Migration antes do push se criar coluna.
8. **Prove ao vivo**: abra as telas e leia os números batendo com a fonte (não confie no verde da UI). Exclua canceladas de Vendas.
9. Quando o dono comparar com maquininha, use §3 (prova de integridade, não reconciliação cega).

---

## 6. STATUS DA APLICAÇÃO NO AGENDAPRO (04/07/2026)

Já executado e em produção (commits `528571c`, `e8bc6b0`, `8c61cde`):

**Lote 1 — LÍQUIDO (completo):**
- ✅ remuneração (lista + [professionalId]): comissão sobre líquido
- ✅ hub (`financeiro/page.tsx`): normaliza total_price→líquido 1x
- ✅ clientes, vendas, análises
- ✅ cards: TopProfs, TopServices, TopCliente, TrendReceita
- ✅ início, eu (KPIs Recebido/A-receber)
- ➖ já eram líquidos (invoice_payments + appts diretos): fluxo-caixa, detalhamento, os 2 caixas, RelatorioFinanceiroCard

**Lote 2 — FUSO (quase completo):**
- ✅ clientes ("hoje"), hub (dateRange + buckets de hora), vendas (hora do produto)
- ✅ remuneração (janela de mês em BR), os 4 cards (janelas rolling)
- ✅ **`fluxo-caixa/page.tsx`** (motor de data) — RESOLVIDO nas 3 camadas juntas:
  `now = new Date(Date.now()-3h)` (colunas em BR via getters UTC do Vercel);
  helper `emBR(iso)` (−3h) aplicado nos 4 buckets de instante (`paid_at`×3 +
  `closed_at`); `occurred_at` (DATE) deixado intacto; `buildRange` com limites em
  MEIA-NOITE BR (`Date.UTC(y,m,d,3)` = 00:00 −03:00) — exatos, pois `range.from`
  é a fronteira acumulado/período (alargar sumiria pagamento do saldo).
- ✅ **`fluxo-caixa/detalhamento/page.tsx`** — bounds de `paid_at` via `startOfDayBR`
  (BR) pra bater com o motor; mês default via `todayBR()`; `occurred_at` intacto.
- ⬜ triagem dos demais `toISOString().slice` (a maioria é data pura/UTC-de-propósito;
  varrer confirmando caso a caso).

---

*Documento gerado pelo Verbo (instância Palace) em 04/07/2026, a partir da resolução real do financeiro do Palace Nail Spa. Atualize este arquivo conforme achar as diferenças concretas do AgendaPRO.*
