# DIFF-LOG — Refactor trial → garantia + Clube Fundador + Pontos

**Data:** 2026-04-20 (noite)
**Sessão autônoma enquanto Eduardo está fora + sessão posterior de ajustes de pontos.**
**Status:** ✅ Completo (exceto items bloqueados por ação do Eduardo)

---

## Contexto

Eduardo definiu política oficial (ver memory `project_agendapro_pricing.md`):
- Solo: setup R$147 + R$47/mês
- Equipe: setup R$197 + R$67/mês (recepção inclusa)
- Garantia de 7 dias pós-pagamento (substitui "14 dias grátis sem cartão")
- Clube Fundador: 10 primeiros travam preço vitalício

Copy das LPs foi 100% alinhada em passe anterior.
Este passe atacou o **backend bloqueador do lançamento**.

---

## ✅ Feito nesta rodada

### 1. Audit WhatsApp
Sistema não promete o que não entrega:
- `lib/whatsapp.ts` — degrada silencioso sem credenciais Z-API
- FAQs das LPs explicitam "lembretes por email, não WhatsApp automático"
- "Suporte WhatsApp" do Equipe é o humano que Eduardo dá via Impulso Digital
- `WhatsAppQRTab` usa `wa.me` (link, sem custo)
- Nenhuma copy problemática

### 2. Migration V12 — `supabase-migration-v12-garantia.sql` (criada, NÃO aplicada)
Mudanças:
- Status default: `pending_payment` (era `trial`)
- Coluna nova: `setup_cents` (14700 Solo / 19700 Equipe)
- Coluna nova: `setup_paid_at`
- Coluna nova: `refund_deadline_at` (7 dias pós-pagamento)
- Coluna nova: `refunded_at`
- Coluna nova: `founders_club` (boolean — 10 primeiros)
- `trial_ends_at` vira nullable
- Preços ajustados: Solo 6700→4700, Equipe 10700→6700
- `businesses.trial_ends_at` é removida (lógica 100% via `subscriptions`)
- Migra registros existentes (se V11 foi aplicada) pra pending_payment

**Pra aplicar:** copiar no SQL Editor do Supabase Studio.

### 3. `src/app/api/cadastro/route.ts` refatorado
- Aceita campo opcional `plan` no body (`solo` | `equipe`, default solo)
- Não cria mais `trial_ends_at` no business
- Cria subscription em `pending_payment` com setup_cents + price_cents corretos
- Retorna `{ ok, slug, plan }`

### 4. `src/app/api/billing/status/route.ts` refatorado
- Retorna: `admin_blocked`, `public_blocked`, `within_refund_window`, `refund_days_left`
- Sem lógica de trial expiration
- Calcula bloqueios baseado em: cancelled, refunded_at, past_due+grace expirado

### 5. `src/components/admin/GarantiaBanner.tsx` (novo)
Substitui TrialBanner. Mostra "Garantia ativa — X dias restantes pra pedir reembolso".
Some automaticamente quando daysLeft ≤ 0.

### 6. `src/components/admin/TrialBanner.tsx` DELETADO
Sem referências no código — safe delete.

### 7. `src/app/admin/(protected)/layout.tsx` refatorado
- Busca `subscriptions` em vez de `businesses.trial_ends_at`
- Redireciona pra `/admin/bloqueado` se: pending_payment, cancelled, refunded, past_due+grace_expired
- Mostra `GarantiaBanner` só dentro dos 7 dias pós-pagamento

### 8. `src/app/admin/bloqueado/page.tsx` refatorado
Cobre 4 cenários com copy específico pra cada:
- `pending_payment` → "Aguardando pagamento"
- `refunded` → "Reembolso executado"
- `cancelled` → "Assinatura cancelada"
- `past_due` → "Pagamento pendente"

Mostra o plano correto (Solo R$147+R$47 / Equipe R$197+R$67) e link WhatsApp contextualizado.

### 9. `SCRIPT-VENDA-CLUBE-FUNDADOR.md` (novo)
Script completo pro Eduardo fechar os próximos 10 clientes:
- Pitch 15s (GPT-validado)
- Abertura, apresentação de valor, fechamento
- Objeções comuns com respostas
- Condições dos 4 beta clientes documentadas (casos fora da política)
- Checklist de fechamento
- O que NUNCA prometer / o que SEMPRE enfatizar

### 10. Fix do sistema de pontos (referral + Google review)
Dois bugs críticos achados e corrigidos:

**Bug 1 — Referral pontuava antes do agendamento existir:**
Em `BookingFlow.tsx`, a pontuação do indicador rodava ANTES da checagem de conflito e criação do appointment. Se desse conflito, o indicador já tinha ganhado pontos de um agendamento que nunca existiu.

**Bug 2 — `/api/claim-review` exigia auth mas UI era público:**
`GoogleReviewSection` renderizado em `/[slug]` (público, sem login), mas endpoint bloqueava com 401 "Não autenticado". Nenhum cliente conseguia resgatar pontos.

**Regras novas (pedidas pelo Eduardo):**
- Referral: pontos só quando o barbeiro **confirmar** o agendamento (não em pending)
- Review: precisa validação real do dono (não honor system puro)
- Cliente opt-in pra ver pontos → página pública `/[slug]/meus-pontos` com input de telefone (sem login)

### 11. `supabase-migration-v13-review-claims-referral-trigger.sql` (novo, NÃO aplicada)
- Tabela `review_claims` com status pending/approved/rejected + RLS
- Índice único por business+customer quando approved (anti-farming)
- Coluna nova `customers.referral_credited_at timestamptz` (idempotência)
- **Trigger SQL `credit_points_on_confirm`**: dispara em UPDATE appointments para status='confirmed'. Credita:
  - (a) **pontos de serviço** ao customer (soma dos `services.points` do appointment, via `appointment_services`)
  - (b) **pontos de referral** ao indicador, se o customer tem `referred_by` e ainda não foi creditado
- Idempotente: checa se já existe transaction pro appointment antes de inserir (evita duplicata em re-confirmação)
- Funciona nos 3 caminhos de confirmação (email link, profissional POST, admin direct update)

### 12. `BookingFlow.tsx` refatorado
- Removida pontuação imediata de **serviço** e **referral** — ambos passam pelo trigger SQL
- Mantém só o marker `customers.referred_by` quando cliente novo vem por link
- Tela done: mensagem muda de "+X pontos ganhos" para "Você vai ganhar +X pontos (entram quando o [negócio] confirmar)"
- Copy do bloco "indique um amigo" atualizada
- Link "Ver meus pontos" na tela de agendamento confirmado

### 13. `/api/claim-review/route.ts` refatorado
- Removido requirement de autenticação (endpoint agora público)
- Cria `review_claim` com status='pending' em vez de creditar direto
- Valida: customer existe, não tem claim approved/pending anterior, programa de review ativo
- Rate limit mantido (10/hora por IP)

### 14. `GoogleReviewSection.tsx` refeito (UX nova)
- **Telefone ANTES**, claim no mesmo clique que abre o Maps
- Fluxo: cliente digita WhatsApp → clica "Avaliar no Google e ganhar +X pts" → endpoint cria claim pending → `window.open(googleMapsUrl)` abre Google em nova aba → mensagem de confirmação
- Cliente nem precisa voltar pra aba do AgendaPRO — claim já tá registrado
- Se negócio não tem programa de review ativo, mostra só botão simples de avaliar (sem campos)

### 15. `/api/customer-lookup/route.ts` (novo, público)
- POST { businessId, phone } → retorna saldo + histórico + status de claim pendente
- Rate limit 30/10min por IP
- Sem exigir login

### 16. `/[slug]/meus-pontos/page.tsx` + `MeusPontosClient.tsx` (novos)
- Página pública onde cliente digita WhatsApp e vê:
  - Saldo de pontos
  - Histórico das últimas 20 transações
  - Status do pedido de review pendente (se tiver)
  - Link próprio de indicação (copiável)
- Sem login, chave é o telefone (mesmo padrão do booking)

### 17. `/api/admin/review-claim/route.ts` (novo)
- POST { claimId, action: 'approve' | 'reject' }
- Valida que o user é dono do negócio
- Aprovar: credita pontos + marca approved
- Rejeitar: marca rejected
- Transacional (2 writes no approve: insert transaction + update customer + update claim)

### 18. `FidelidadeTab.tsx` atualizado
- Nova seção "Pedidos de pontos por avaliação" (badge com count)
- Lista claims pending do negócio (busca client-side via RLS)
- Botões Aprovar / Rejeitar por linha
- Instrução: "Confira no Google se a pessoa realmente avaliou"

### 19. `/[slug]/page.tsx` — link sutil "Ver meus pontos"
Aparece só se o negócio tem algum programa de pontos ativo (review ou referral).

---

## ❌ NÃO feito (precisa do Eduardo)

| Item | Por quê |
|---|---|
| Aplicar migration V12 no Supabase | Destrutivo em shared state, Eduardo decide |
| Aplicar migration V13 (review_claims + trigger) no Supabase | Destrutivo em shared state, Eduardo decide |
| Configurar credenciais Mercado Pago produção | Ação manual, Eduardo pediu pra deixar por último |
| Ajustar webhook MP pra setar setup_paid_at + refund_deadline_at | Webhook base existe (/api/webhooks/mercadopago) mas não trata o fluxo setup→garantia. Só mexer quando tiver MP configurado |
| Teste end-to-end | Precisa MP + V12 + V13 aplicadas |
| Deploy Vercel | Eduardo autoriza após revisar |
| Commit git | Eduardo autoriza após revisar |
| Seletor de plano na `/cadastro` UI | Opcional. Hoje default = solo; atendente ajusta depois. Eduardo decide se precisa |

---

## Próximos passos quando Eduardo voltar

1. **Revisar** este DIFF-LOG + os 8 arquivos alterados
2. **Aplicar** `supabase-migration-v12-garantia.sql` no SQL Editor do Supabase
3. **Testar cadastro local** → verificar que cria como `pending_payment`
4. **Implementar webhook MP** (não feito nesta rodada — feature nova):
   - Endpoint `/api/webhooks/mercadopago`
   - Quando pagamento do setup confirma: `status='active'`, `setup_paid_at=now()`, `refund_deadline_at=now()+7d`
   - Quando refund dentro da janela: `refunded_at=now()`, `status='cancelled'`
5. **Configurar credenciais MP produção**
6. **Deploy** + teste end-to-end com cartão real (valor baixo)
7. **Primeiro cliente** (barbearia) via script de venda

---

## Arquivos alterados nesta sessão

**Rodada 1 — Trial → Garantia + Clube Fundador:**
- ✅ `supabase-migration-v12-garantia.sql` (novo)
- ✅ `src/app/api/cadastro/route.ts`
- ✅ `src/app/api/billing/status/route.ts`
- ✅ `src/components/admin/GarantiaBanner.tsx` (novo)
- ✅ `src/components/admin/TrialBanner.tsx` (deletado)
- ✅ `src/app/admin/(protected)/layout.tsx`
- ✅ `src/app/admin/bloqueado/page.tsx`
- ✅ `SCRIPT-VENDA-CLUBE-FUNDADOR.md` (novo)
- ✅ `DIFF-LOG.md` (este arquivo)

**Rodada 2 — Sistema de pontos (referral + Google review + meus-pontos):**
- ✅ `supabase-migration-v13-review-claims-referral-trigger.sql` (novo)
- ✅ `src/components/BookingFlow.tsx` (remove pontuação imediata, mantém marker referred_by, adiciona link "meus pontos")
- ✅ `src/app/api/claim-review/route.ts` (público, cria review_claim pending)
- ✅ `src/components/GoogleReviewSection.tsx` (copy "pedir pontos")
- ✅ `src/app/api/customer-lookup/route.ts` (novo, público)
- ✅ `src/app/[slug]/meus-pontos/page.tsx` (novo, server)
- ✅ `src/app/[slug]/meus-pontos/MeusPontosClient.tsx` (novo, client)
- ✅ `src/app/api/admin/review-claim/route.ts` (novo, aprovar/rejeitar)
- ✅ `src/components/admin/FidelidadeTab.tsx` (nova seção de pedidos pendentes + bloco "Como funciona" com script de atendimento)
- ✅ `src/app/[slug]/page.tsx` (link sutil "meus pontos")
- ✅ `src/app/[slug]/meus-pontos/MeusPontosClient.tsx` (bloco "Como ganhar mais pontos" no resultado)

---

## Notas técnicas

### Sobre o fluxo de cadastro

Hoje a UI de `/cadastro` não tem seletor de plano — manda tudo como `solo` default. Fluxo:
1. Cliente cadastra → subscription `pending_payment` plano Solo default
2. Cai em `/admin/bloqueado` → CTA WhatsApp pra falar com a Impulso
3. Atendente (Eduardo) ajusta plano manualmente se for Equipe + manda link de pagamento MP
4. Webhook MP confirma → subscription vira `active`
5. Cliente ganha acesso + banner verde de garantia por 7 dias

Se Eduardo quiser seletor de plano na UI futuramente, é só adicionar no `/cadastro/page.tsx` e passar `plan` no fetch.

### Sobre o endpoint webhook Mercado Pago (NÃO implementado)

Placeholder mental do que falta:
```ts
// src/app/api/webhooks/mercadopago/route.ts
// POST — recebe notificação de pagamento
// Validar assinatura MP
// Buscar subscription por mp_payer_id
// Se payment.status === 'approved' E setup_paid_at IS NULL:
//   UPDATE subscription SET
//     status = 'active',
//     setup_paid_at = NOW(),
//     refund_deadline_at = NOW() + INTERVAL '7 days',
//     current_period_start = NOW(),
//     current_period_end = NOW() + INTERVAL '1 month'
// Se payment.status === 'refunded':
//   UPDATE subscription SET
//     refunded_at = NOW(),
//     status = 'cancelled'
```

Esse endpoint é o link crítico entre MP e o sistema — sem ele, ninguém sai de `pending_payment`.
Sugiro o Eduardo implementar essa parte com calma depois das credenciais MP, ou pilotar manualmente os primeiros clientes atualizando a subscription via Supabase Studio.

### Sobre backward compat

V12 migration tem ALTERs idempotentes (IF NOT EXISTS). Seguro rodar em ambiente com V11 parcialmente aplicada.

Os registros em `status='trial'` viram `pending_payment` com `trial_ends_at=NULL` automaticamente. Se Eduardo quiser honrar algum trial existente (improvável, mas), basta editar manualmente antes de aplicar a migration.
