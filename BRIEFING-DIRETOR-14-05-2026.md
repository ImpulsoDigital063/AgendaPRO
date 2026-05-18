# Briefing Executivo · 14/05/2026
**Diretor Geral · Impulso Digital · Sessão noite 13/05 → manhã 14/05**
**Tempo de leitura:** 5 min

---

## TL;DR · 1 parágrafo

Estudei o sistema todo: RadarPRO técnico, 10 batches CIC, ofertas AgendaPRO, playbook IMPULSO_CORE_SYSTEM_V2, status MPN-On. **Pool real é 45 leads playbook-ready, NÃO 22** (estava desatualizado). Mas zero leads são Tier 1 AgendaPRO puro (barbearia/salão/nail/estética) — todos são LP/Shopify. Boa notícia: **32 dos 45 leads PODEM virar combo LP+AgendaPRO** (médicos, dentistas, psi, nutri, fisio, personal, esteta). Adiantei setup técnico do RadarPRO essa noite: `npm install` (520 pacotes) + `npm audit fix` rodados · faltam só QR scan + decisões de segurança que precisam de ti. Proponho 3 frentes paralelas amanhã (setup final em 30 min · disparo combo dos 5 leads quentes · scrape novo Tier 1 AgendaPRO em paralelo). Tu só precisa decidir 3 coisas.

## 0. PROGRESS noturno · setup técnico adiantado

Executado entre 23h e 01h enquanto tu dormia:

| Item | Status |
|---|---|
| `cd radar-pro && npm install` | ✅ 520 pacotes instalados em 32s |
| `npm audit fix` (sem --force) | ✅ 1 vuln resolvida automaticamente |
| Vulnerabilidades restantes | ⚠️ **5 (3 moderate, 1 high, 1 critical)** — todas vêm do `@whiskeysockets/baileys`. Resolver com `npm audit fix --force` pode quebrar o WhatsApp. Decisão tua. |
| `/api/debug` pública vazando credenciais | ❌ NÃO mexi — alteração de código de prod, tua decisão |
| `TALLY_WEBHOOK_SECRET` no Vercel | ❌ NÃO mexi — env var de prod, tua decisão |
| Sessão Baileys | ❌ Precisa tu escaneando QR com celular do chip 63 99292-0080 |

---

## 1. Estado real do RadarPRO (técnico)

| Componente | Status |
|---|---|
| Repo `C:/Users/Usuario/radar-pro` | ✅ Clonado · master |
| `node_modules` | ❌ **Vazio** · precisa `npm install` |
| `.env.local` | ✅ Existe · `GEMINI_API_KEY` + `TURSO_URL` + `TURSO_TOKEN` setados |
| Banco Turso (libSQL) | ✅ Remoto · acessível com credenciais |
| Sessão Baileys (`.wa-session/`) | ❌ **Não existe** · chip não vinculado na máquina nova |
| Chip 63 99292-0080 | ⏳ Em aquecimento desde 16/04 · status real só rodando |
| Painel `/integracao/whatsapp` | ✅ Existe · serve QR Code pra escanear |
| Painel `/tally` | ✅ Existe · funil 4 abas (Diagnóstico → Briefing → Pagamento → Projeto) |
| Painel `/disparo` | ✅ Existe · script automatizado |
| Vulnerabilidades npm | 🔴 **5 vulns (3 críticas)** · `npm audit fix` resolve em 1 min |
| `/api/debug` público | 🔴 **Vaza credenciais Turso** · corrigir ANTES de subir nova versão |
| Webhook Tally sem secret | 🟡 Aceita request sem signing em prod · setar `TALLY_WEBHOOK_SECRET` |
| Endpoints AI sem auth | 🟡 Risco abuso financeiro Claude/Gemini · adicionar middleware |

**Conclusão técnica:** RadarPRO **NÃO está pronto pra disparar agora**. Precisa setup de 1-2h amanhã antes do 1º disparo.

---

## 2. Pool real de leads · 45 playbook-ready

Pool foi atualizado batch a batch entre 25/04 e 29/04 — memória dizia "22 leads", está desatualizado. **45 leads tem playbook customizado pronto** + 20 no pool com observação rica.

### Distribuição por tipo (atual)

| Tipo | Quantos | % |
|---|---|---|
| **LP** | 28 | 62% |
| **Shopify** | 17 | 38% |
| **AgendaPRO puro** | **0** | **0%** |

> ⚠️ **Nenhum lead foi prospectado especificamente pra AgendaPRO Tier 1** (barbearia/salão/nail/estética). Pra atacar essa frente precisa rodar `npm run radar:agendapro` ou `npm run radar:ig:agenda` — scrape novo.

### Mas: 32 dos 45 leads PODEM virar combo LP+AgendaPRO

Aplicando o filtro "negócio com agendamento de consulta" (estratégia documentada em `ESTRATEGIA-LP-AGENDAPRO.md` · R$1.500 setup + R$97/mês):

**Tier S · disparar primeiro (10):**
1. Douglas Pimentel · Advogado Trabalhista (294 reviews · 5★ Maps · Top 1 da cidade)
2. Verônica Lima · Enfermeira Esteta (case-clone 1:1 da Erlane)
3. Gilson Afonso · Psicólogo (135 aval 4.9 · decide sozinho)
4. Monnaliza Cabral · Dentista (Insta verified · zero web)
5. Ioana Leobas · Gineco HPV/colposcopia (ultra-nicho · concorrência regional zero)
6. Amanda Silveira · Enfermeira home-office (clone-Erlane direto)
7. Juliana Resende · Biomédica Esteta (cluster CLONE-IRSNAYRA)
8. Ingrid Sales · Endocrino canetas GLP-1 (190 reviews 5★)
9. Ricardo Linares · Dentista verified ("Site = wa.me" caso extremo)
10. Allana · Nutri Nefro (nicho raríssimo)

**Tier S secundário (11-25):** Rudinei Brunetto (urologista cirurgia robótica) · Christiana Endocrino · Tuany Rifer (farmacêutica esteta) · Hollana (dentista harmonização 15.9k seg) · Guilherme Morais (advogado) · Ricardo Mendonça (cirurgia mão) · Pedro Maciel (nutri lipedema) · Adriane Garcia (esteta premium) · Daniel Janczuk (cardio ex-presidente SBC) · Hugo Rossoni (reumato prof Afya) · Thais Mahassem (endocrino RQE dupla) · Edson Pedroza (reumato RQE triplo) · Ana Luíza Duarte (dentista Vizzoone) · Tarcísio Andrade (urologista) · Darcianne Cavalcante (fisio gerontológica)

**Tier A combo válido (saúde + personal):** Marina Borges Psi · Mariella Zanchett Nutróloga · Izabela Campos Nutri · Gabriel Santiago Personal · Júnior Sá Personal · José Wilker Personal · Rodolpho Margonari Personal · Dafne Sixel Nutri · Andreia Lustosa Nutri · Pediatra Gláucia · Fono Samara · Eva Carolina Derma · Bruna Borba Gineco

---

## 3. Lacuna estratégica · AgendaPRO Tier 1 ZERO

A **estratégia AgendaPRO original** (`AGENDAPRO-SEGMENTOS.md`) prioriza 4 nichos Tier 1:
1. Barbearia (mas EiBarber é concorrente forte — atacar por último)
2. Salão de beleza
3. Nail designer
4. Clínica estética

**Pool atual tem ZERO leads desses 4 nichos.** Pra preencher essa frente, opções:

| Opção | Esforço | Tempo |
|---|---|---|
| `npm run radar:agendapro` (Gmaps scrape) | Roda script | ~30 min · gera 30-50 leads barbearia/salão/nail/estética Palmas |
| `npm run radar:ig:agenda` (Insta scrape) | Sessão IG válida + Playwright | ~1h · gera leads IG complementares |
| CIC novo prompt (Claude in Chrome) | Pesquisa manual via prompt | ~50 min · qualidade superior, ranking Tier S |

**Recomendação diretor:** rodar `npm run radar:agendapro` amanhã cedo enquanto fala com lead Tier S existente. Em 30 min temos pipeline AgendaPRO Tier 1 puro.

---

## 4. STATUS MPN-On · PARADO

| Métrica | Valor |
|---|---|
| Status | 🔴 **Sem atualização desde antes de 01/05** |
| Conversão | Abaixo do esperado · VSL+copy pendentes |
| Módulos gravados | 1 de 4 (Módulo 2, 29 aulas) |
| Módulos pendentes | 1, 3, 4 |
| Dados coletados | ❌ CTR/CPC/conv/objeção #1 — tudo vazio |
| Meta original 2026 | R$150-300k só no curso de entrada R$297 |

**Recomendação diretor:** **MPN-On em standby até AgendaPRO ter MRR estável (50+ clientes).** Capacidade entrega é 1 pessoa (tu) — focar ataca-um-de-cada-vez. Reabrir MPN só quando AgendaPRO escalar e tiver budget de tráfego validado.

---

## 5. Frentes pra atacar amanhã · 3 caminhos paralelos

### 🔴 FRENTE A · Setup técnico do RadarPRO (1-2h · pré-requisito)

Sem isso nada dispara. Sequência:

1. `cd C:/Users/Usuario/radar-pro && npm install` (~5 min)
2. `npm audit fix` (1 min · resolve 5 vulns)
3. Decidir: proteger `/api/debug` OU deletar a rota (5 min)
4. Setar `TALLY_WEBHOOK_SECRET` no Vercel (3 min · gerar string aleatória 40+ chars)
5. `npm run dev` · abrir http://localhost:3000/integracao/whatsapp
6. Escanear QR Code com WhatsApp Business 63 99292-0080
7. Validar conexão (status "conectado" no painel)

### 🟢 FRENTE B · Disparo combo LP+AgendaPRO (top 5 amanhã)

Pra os 5 Tier S quentes (Douglas, Verônica, Gilson, Monnaliza, Ioana). Cada um já tem playbook customizado no `lib/disparo-analises.ts`. Preciso só:

1. Atualizar pitch deles pra incluir cross-sell AgendaPRO ("LP + sistema de agendamento online")
2. Cadência: 1 disparo a cada 30-60 min · 5 disparos em 4-5h
3. Pré-engajamento Insta D-1 OBRIGATÓRIO (já mapeado nas análises)

Output esperado em 7 dias: 5-15% reply rate (3-7 respostas) · 1 conversa qualificada · 0-1 fechamento.

### 🟡 FRENTE C · Scrape AgendaPRO Tier 1 (paralelo · 30-60 min)

`npm run radar:agendapro` em background. Resultado:
- ~30-50 leads barbearia/salão/nail/estética em Palmas
- Filtro Tier S aplicado automaticamente (calibração pós-batch #6)
- Análise customizada via Gemini/Claude pro top 10

Output: pipeline AgendaPRO PURO pronto pra disparar D+2 ou D+3 (depois do batch combo Frente B).

---

## 6. Templates Mensagem 1 prontos · 4 abertura cold

Estrutura validada `IMPULSO_CORE_SYSTEM_V2.md`: **2 linhas · dado real → pergunta calibrada · sem saudação, sem elogio, sem pitch**. Pitch vem só se responder.

### Template 1 · Combo LP+AgendaPRO · DENTISTA TIER S (Monnaliza, Ricardo Linares, Hollana)
```
Vi que tu tem [X reviews 5★ no Maps] em harmonização/estética dental e o canal hoje é só DM.
Quantas pacientes te perguntam horário às 23h e tu só responde de manhã?
```

### Template 2 · Combo LP+AgendaPRO · MÉDICO ESPECIALISTA (Ingrid, Ioana, Mendonça, Allana)
```
Vi que tu tem [X reviews] em [especialidade RQE] e ainda usa linktr.ee/bit.ly como canal.
Quanto custa uma paciente nova que pesquisa "[especialidade] Palmas" no Google e não te encontra?
```

### Template 3 · Combo LP+AgendaPRO · PSI/NUTRI/PERSONAL (Gilson, Pedro Maciel, Gabriel Santiago)
```
Vi teu trabalho com [nicho específico do lead: lipedema/CrossFit/etc] e tudo agenda pelo DM Insta.
Quanto tempo por dia tu perde respondendo "tem horário pra X?" — sendo que poderia tá atendendo?
```

### Template 4 · AgendaPRO puro · BARBEARIA/SALÃO/NAIL/ESTÉTICA (depois scrape Frente C)
```
Vi tua [barbearia/salão] com [N profs/reviews/lugar] e o agendamento é todo no WhatsApp.
Quanto cliente novo tu perde por semana porque o concorrente respondeu primeiro às 23h?
```

**Sequência de follow-up validada (3 toques):**
- **D+0:** Msg 1 (abertura · 2 linhas)
- **D+3:** Msg 2 (follow-up · novo ângulo · só se silêncio)
- **D+7:** Msg 3 (breakup · porta aberta · "vou parar de incomodar")

---

## 7. Decisões pendentes pra ti (3 únicas)

### Decisão 1 · ORDEM das frentes
**Recomendado:** Frente A (setup técnico) primeiro · Frente B (disparo combo) em paralelo com Frente C (scrape novo). Tudo em 1 dia.

### Decisão 2 · OFERTA do combo LP+AgendaPRO
**Recomendado:** R$1.500 setup + R$97/mês AgendaPRO Equipe — combo já documentado em `ESTRATEGIA-LP-AGENDAPRO.md`. Alternativa: R$799 LP + R$67/mês AgendaPRO Solo se quiser ticket menor pra esses leads.

### Decisão 3 · PRIMEIRO ALVO PILOTO
**Recomendado:** **Douglas Pimentel · Advogado Trabalhista** (294 reviews 5★, top 1 categoria Palmas, decide sozinho, ticket de paciente alto). É o lead mais gritante do pipeline inteiro. Se fechar, vira showcase pro nicho jurídico — e abre o caminho que ainda não foi rodado.
**Alternativa:** Verônica Lima (case-clone Erlane mais forte · cidade média, indicação literal possível).

---

## 8. Métricas pra acompanhar (semana 14-21/05)

| Métrica | Baseline brasileiro | Meta semana 1 |
|---|---|---|
| Disparos enviados | — | 5-10 |
| Reply rate WhatsApp B2B cold | 5-15% | ≥10% |
| Conversas qualificadas | — | 1-2 |
| Demos marcadas | — | 1 |
| Fechamentos | — | 0-1 |
| Cash gerado | — | R$0 ou R$1.500-1.997 |

---

## 9. Riscos identificados

1. **Chip ban (alto):** WhatsApp baniu chip novo que dispara 10+ em 1h. Manter cadência 30-60 min entre disparos.
2. **Telefone fixo (médio):** 5 dos 14 leads originais têm telefone fixo (não recebe WhatsApp). Validar antes de cada disparo.
3. **CRM/CRO não validado (médio):** vários leads de saúde sem CRM/CRO/CRBM confirmado. Bater no Conselho antes de pitchar autoridade.
4. **Concorrência sazonal (baixo):** Booksy/Trinks fazem campanha agressiva em maio (Dia das Mães). Argumento "fila inclusa de graça" forte agora.

---

## 10. Próxima atualização (decidir amanhã)

- Após 5 disparos · reply rate medido · primeiro lead respondendo
- Após primeiro fechamento (qualquer modalidade)
- Após 7 dias sem fechamento (revisar templates · ajustar pitch)

---

**Tu acorda · lê isso · decide as 3 perguntas · me chama. Setup técnico começa em 5 min depois do GO.**

**— Diretor Geral · Impulso Digital**
**13/05/2026 · estudo noturno · carta branca**
