# 🌅 LEIA PRIMEIRO · Quando acordar 14/05/2026

**De:** Diretor Geral · Impulso Digital
**Pra:** Eduardo (quando logar)
**Sessão:** noite 13/05 · carta branca · noite toda
**Tempo de leitura:** 30 segundos

---

## Bom dia. Trabalhei a noite toda.

Estudei tudo: 10 batches CIC · ofertas AgendaPRO · playbook IMPULSO_CORE_SYSTEM_V2 · status MPN-On · pipeline ativo (Aura/Andressa/Starteq) · arquitetura RadarPRO. Adiantei `npm install` no radar-pro. Pool real **45 leads** playbook-ready (não 22). Todos LP/Shopify · zero AgendaPRO Tier 1 puro · 32 podem virar combo LP+AgendaPRO.

Tu só precisa decidir **3 coisas** e atacar.

---

## 📄 Arquivos que eu deixei prontos pra ti

| # | Arquivo | Pra quê |
|---|---|---|
| 1 | **`BRIEFING-DIRETOR-14-05-2026.md`** | Diagnóstico completo + 3 frentes paralelas + 3 decisões pendentes |
| 2 | **`TEMPLATES-DISPARO-14-05.md`** | 7 templates 3-toques (D+0/D+3/D+7) prontos · dentista · médico · psi/nutri/personal · clone-Erlane · 3 AgendaPRO puro |
| 3 | **`CONTATOS-TOP10-14-05.md`** | Top 10 leads ordenados · telefones · pendências · sequência Wave 1 (5 dias) |

Lê na ordem: 1 → 2 → 3. Total 10 min de leitura.

---

## ⚡ 3 decisões que tu precisa tomar

### 1. ORDEM das frentes
Recomendado: **Setup técnico final (30 min) · disparo combo (5 leads quentes) · scrape AgendaPRO Tier 1 em paralelo**.

### 2. OFERTA do combo
Recomendado: **R$ 1.500 setup + R$ 97/mês AgendaPRO Equipe**. Alternativa R$ 799 LP + R$ 67 Solo se quiser ticket menor.

### 3. PRIMEIRO ALVO PILOTO
Recomendado: **Douglas Pimentel** (advogado · 294 reviews 5★ · top 1 categoria Palmas). Alternativa: **Verônica Lima** (clone-Erlane literal · cidade média · indicação possível).

---

## ⚠️ 2 coisas que tu PRECISA fazer pra disparar

1. **Escanear QR Code** com WhatsApp Business 63 99292-0080 em `localhost:3000/integracao/whatsapp` após `npm run dev`. Sem isso o chip não conecta.
2. **Decidir** se roda `npm audit fix --force` (resolve 5 vulns restantes mas pode quebrar Baileys) — recomendo NÃO rodar, ataca só se chip estiver banido.

---

## 🛑 1 alerta crítico de segurança

`radar-pro/app/api/debug/route.ts` está PÚBLICO e vaza `TURSO_URL` + 30 chars do `TURSO_TOKEN`. Qualquer pessoa que descobrir `radarpro-inky.vercel.app/api/debug` vê. Decisão tua:
- Deletar a rota (3 min)
- OU proteger com header secret (5 min)

NÃO mexi sem autorização.

---

## 📊 Estado do pipeline (resumo)

| Frente | Status | Próxima ação |
|---|---|---|
| **Aura Energy** | 🟢 R$1.497 fechado · entrega Frente 1 vence 13/05 (hoje) | Cobrar Renato preencher briefing v3.1 |
| **AgendaPRO** | 🟢 2 vendas (Olímpio R$67 mensal · Erlane teste) | Disparar combo LP+AgendaPRO em massa |
| **Andressa/Raras Clinic** | 🟡 warm · Daniel é decisor inicial | Aguardar entrada formal · sondar sem pitch |
| **Starteq** | 🟢 lead quente · 3 frentes definidas | Eduardo busca PC + plugar Vercel + reunião formal |
| **Viva Cacheada** | ⏳ reunião 12/05 já passou | Executar SQL `grant-trial-viva-cacheada.sql` |
| **MPN-On** | 🔴 standby formal | Reabrir só após AgendaPRO atingir 50+ MRR |

---

## 💡 Insight do estudo noturno (pra reflexão)

O RadarPRO tem **45 leads playbook-ready · todos LP/Shopify** porque a calibração foi feita pra esses produtos. **Pra AgendaPRO virar receita rápido o caminho é cross-sell COMBO LP+AgendaPRO** — não criar pipeline novo do zero. Os médicos, dentistas, psi, nutri, fisio, esteta da fila atual JÁ precisam de agendamento online (link do bio do Insta hoje é só wa.me) · 1 venda combo = 1 LP (R$1.500) + 1 AgendaPRO (R$97/mês recorrente) **e o mesmo lead que tu prospectaria pra LP solta**.

Pra Tier 1 AgendaPRO puro (barbearia/salão/nail/estética) precisa rodar scrape novo em paralelo — `npm run radar:agendapro` resolve em 30-60 min.

---

## 🎯 Resumo em 1 frase

**Tu acorda · lê os 3 arquivos · decide 3 perguntas · setup técnico 30 min · primeiro disparo Douglas Pimentel meio-dia · scrape AgendaPRO Tier 1 rodando em paralelo. Em 7 dias temos métrica real de reply rate AgendaPRO via RadarPRO.**

Bom dia, chefe. Vamos vencer hoje.

— Diretor Geral
*13/05/2026 · 02:30 · estudo concluído*
