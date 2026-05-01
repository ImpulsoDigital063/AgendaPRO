# Diário — Sessão 2026-04-30 tarde/noite

**Branch:** master
**Status:** ✅ tudo em produção (Vercel) — PWA do Eduardo testou todas as abas em iPhone real
**Última coisa antes do cinema:** capa da página pública funcionando + dica de tamanho ideal. Eduardo viu que dá pra melhorar (2 ou 3 ideias) mas pediu pra deixar salvo e atacar depois.
**Commits da sessão:** 25 (de `d3a9e08` a `b7aaf0c`)

---

## Diretriz que guiou todas as decisões da sessão

Eduardo foi explícito 3 vezes ao longo da tarde:
1. **"Todo ajuste é pensando em uso em massa"** — cada decisão técnica/UX passa pelo filtro "100 clientes simultâneos".
2. **"O sistema deve ser intuitivo, fácil de usar"** — não poluir UI, modal só quando agrega.
3. **"O importante é o sistema em perfeita harmonia"** — sem pressa pra entregar pra Barbearia Olímpio hoje se isso compromete qualidade.

---

## O que foi feito (em ordem cronológica)

### 1. PWA standalone — cache forte no /splash (commit `d3a9e08`)
Eduardo abriu o PWA e tomou 7s de tela branca. Causa: `/splash` (next/og) gerava o PNG dinamicamente a cada abertura. Fix: `Cache-Control: public, max-age=31536000, immutable` no header — splash vira asset cacheado pra sempre.

### 2. QR code admin — CSP bloqueava api.qrserver.com (commit `128f761`)
Aba WhatsApp QR não renderizava nada. Console: CSP bloqueando `api.qrserver.com`. Solução: trocar pra **`react-qr-code` local** (zero deps externas, gera SVG no cliente). Mais leve, sem dependência de terceiros.

### 3. Profissional default linkado ao owner desde o cadastro (commit `5ee291a`)
Bug: ao se cadastrar, o owner não tinha um registro próprio em `professionals` — então não conseguia aparecer como atendente. Fix: trigger SQL cria profissional default `auth_user_id = owner_id` no momento do cadastro.

### 4. Tour pós-pagamento — 3 bugs pequenos do admin/profissional (commit `92b9573`)
- Storage RLS pra foto profissional reescrita
- Outros 2 bugs visuais menores

### 5. Foto profissional — botão de adicionar foto não tinha overflow correto (commit `f23fc90`)
Badge da câmera (ícone de adicionar) ficava cortado pelo `overflow-hidden` do botão. Fix: separar o badge do botão.

### 6. Modais de confirmação transparentes (commit `ec337b8`)
**Bug visual repetia em vários lugares.** Os modais de confirmação ficavam com fundo transparente (mostrava o conteúdo de trás). Causa raiz: mesma raiz do kebab transparente — backdrop com `background: rgba(0,0,0,0.4)` SEM `backdrop-filter: blur(...)`. Sob dark mode, o rgba não rendeírava. Fix: adicionar `background: var(--admin-modal-overlay)` que usa cor sólida.

### 7. Limite de profissionais por plano (commit `6e3cf19`)
**Bug crítico de monetização:** plano Solo (R$67/mês, +1 profissional) deixava criar **infinitos** profissionais. Fix em 2 camadas:
- **UI**: botão "Adicionar profissional" desabilitado quando `professionals.length >= limit` (Solo=2, Equipe=5, contando o owner)
- **Banco**: trigger SQL `enforce_professional_plan_limit` em `BEFORE INSERT ON professionals` — bloqueia mesmo se admin furar a UI via API direta.

Mensagem de erro UI: *"Limite do plano X atingido. Faça upgrade pra adicionar mais."*

### 8. Sincroniza professionals state com SSR + revalidatePath foto (commit `acfd22e`)
Foto trocada não atualizava ao voltar pra aba (state stale). Fix:
- `revalidatePath('/admin/configuracoes')` na API que persiste foto
- Lift do `professionals` state pro `ConfiguracoesTabs` (parent) com `useEffect` sincronizando com `initialProfessionals` mudando

### 9. Serviços — sugestões dinâmicas + validação de preço (commit `d7a737c`)
- Sugestões de nomes de serviço variam por categoria (Barbearia: corte/barba/relaxamento; Salão: corte/escova/coloração; Estética: limpeza/peeling/microagulhamento etc.)
- Validação: preço deve ser > 0. Modal "preço a combinar" virou checkbox separado (`price_on_request`).

### 10. Horários — bloco massivo de 8 commits (`669c6ba` → `36792f0`)

Sequência intensa porque Eduardo testou cada caso de borda:

**Pausa de almoço (`669c6ba`):**
- 1 profissional pode ter **múltiplos períodos** por dia (ex: 8h-12h, 13h-18h)
- Atalho "Aplicar de Seg-Sáb" + "Aplicar de Seg-Sex" + "Aplicar todos os dias"
- Atalho **"Pausa 12h-13h em todos os dias úteis"** (1 clique)

**3 melhorias UX (`09a081a`):**
- Modal de confirmação ao trocar profissional sem salvar (warns about unsaved changes)
- "Copiar horários do profissional X pra Y" (1 ação, todos os dias)
- Pausa configurável (não fixa em 12-13h)

**Atalho Pausa universal (`670105c`):** "Aplicar Pausa 12-13 em TODOS" + reformular help text confuso.

**Kebab cross-profissional só no admin (`ff96dfb`):** Profissional na própria tela não pode usar kebab pra editar de OUTRO profissional. Fix: prop `isAdmin` explícita, kebab só renderiza se true.

**Otimizações pra plano Equipe (`52c0b7f`):**
- Copy do progresso "X de 5" em vez de "X profissionais cadastrados"
- Detecta profissionais órfãos (sem horários definidos)
- Intervalo unificado entre profs (1 setting global em vez de por profissional)

**RPC atômico + auditoria (`36792f0`):**
- **Bug de concorrência:** se admin define horário e manda pra todos, mas o profissional na tela dele resolve mudar simultaneamente, dava race condition. Fix: `replace_working_hours` RPC como **transação atômica** (delete + insert na mesma TX, com `SECURITY DEFINER`)
- Auditoria: `updated_by_name` + `updated_at` em cada working_hours
- Help text: "Última edição: por X em Y" no card

### 11. Fidelidade — bloco de 4 commits

**State stale fix (`ed4635c`):** Pontos de indicação/pontualidade salvavam mas ao trocar de aba mostravam valor antigo (mesmo bug do professionals — useState reinicializava com SSR antigo). Fix: lift pro `ConfiguracoesTabs`.

**8 melhorias UX (`a772238`):**
1. Recompensas: explicação que **cliente decide** quando trocar pontos (ele escolhe quando ativar)
2. Modal de criação de recompensa com sugestões dinâmicas por categoria (Barbearia: "Corte grátis", "Barba grátis"...)
3. Preview da recompensa em tempo real (mostra como cliente vai ver)
4. Ordenação: ativas primeiro, ascending por pontos requeridos
5. Auto-save com debounce + flush on unmount
6. Validação inline de pontos > 0
7. Card "Como funciona" com explicação do sistema (admin define valor de pontos)
8. Botão duplicar recompensa

**Dica colapsada (`a96a2ad`):** O card "Dica pro atendimento" estava sempre aberto, atrapalhando. Virou colapsável (default fechado).

**Lift referral/punctuality + help pontualidade (`f7cdfe4`):** Sistema de pontos por pontualidade ganhou explicação detalhada (cliente chega no horário → ganha bônus, profissional usa botão "Confirmar pontualidade" no app).

### 12. Fix global iOS — zoom automático em inputs (commit `cfbfbd0`)
**Bug crítico de UX em todo o sistema:** sempre que digitava em qualquer input no iPhone, a tela dava zoom e descentralizava. Causa: iOS Safari faz zoom automático em inputs com `font-size < 16px`. Fix global em CSS: `input, textarea, select { font-size: 16px !important; }` (ou maior).

### 13. Botão voltar pra Aparência na pagina pública (commit `652e3af`)
Aparência: ao clicar "Ver minha página real", o admin abria `/{slug}` mas não tinha caminho de volta (especialmente em PWA standalone). Fix: query string `?preview=admin` que ativa banner sticky "← Voltar pra Aparência" no topo.

### 14. Aparência — pacote completo de 5 melhorias (commit `bece542`)

Eduardo pediu auditoria da aba Aparência e listou 5 melhorias após eu propor 10. Implementei as 5 aprovadas:

1. **Card "Logo"** — link pra aba Negócio (sem duplicar uploader já existente lá)
2. **Card "Capa da página"** — uploader novo (campo `cover_url` em businesses, bucket `business-covers`, compressão 400KB WebP, max 1600px)
3. **Preview ao vivo com serviços REAIS** — antes era mock fixo "Corte masculino R$50 / Barba R$30", agora puxa os 2 serviços ativos do business (com fallback mock se vazio)
4. **Badge "★ Indicada" nos presets** — mapa de categorias (8 nichos) com 2-4 presets recomendados cada (Barbearia: Marinho/Bordô/Petróleo/Grafite/Elegante)
5. **Botão "Voltar pro padrão"** com modal de confirmação — só aparece se está fora do default Azul/Ciano/Dark

Migration v33: `cover_url` column + `business-covers` bucket + 4 RLS policies (public read + owner CRUD).

### 15. Bug crítico v33 — RLS bloqueava upload (commit `47bf832`)
**Bug muito sutil descoberto após teste real do Eduardo:** policy `bc_owner_insert` rejeitava todo upload de capa com "row violates row-level security policy" mesmo com auth correta.

Causa raiz: subquery `EXISTS (SELECT 1 FROM businesses b WHERE b.id::text = (storage.foldername(name))[1])` — o Postgres resolveu `name` como `b.name` (nome do business — "Barbearia Estilo Novo") em vez de `storage.objects.name` (path do arquivo — `<uuid>/cover.webp`). Resultado: `storage.foldername('Barbearia Estilo Novo')` retornava `{}` (array vazio), `[1]` retornava NULL, EXISTS sempre falso → bloqueava.

Fix v33b: usar `IN (SELECT b.id::text FROM businesses b WHERE owner_id = auth.uid())` com `(storage.foldername(name))[1]` **fora da subquery** — `name` agora resolve no escopo da policy (storage.objects.name) sem ambiguidade.

**Insight:** a v5 (professional-photos) tem o mesmo bug, mas as policies `pp_owner_*` da v5 nem existem no banco — foram substituídas por `pp_auth_*` mais permissivas em algum momento sem migration rastreada. Quando voltar, vale revisar e corrigir v5 também.

### 16. Render cover_url na página pública (commit `288bc9b`)
Eu havia esquecido de plugar a `cover_url` na página `/[slug]` — uploader funcionava, banco persistia, mas a página pública continuava mostrando só gradient. Fix:
- `SELECT` agora inclui `cover_url`
- `<img>` renderiza no banner do topo quando setado (gradient continua como fallback)

### 17. Capa maior + object-position + dica de tamanho (commit `b7aaf0c`)
Eduardo testou e achou que dava pra melhorar:
- Altura da capa: 128/160px → **176/224px** (h-44 sm:h-56)
- `object-position: center 25%` puxa o foco pro terço superior (onde geralmente está logo/placa/vitrine)
- Preview ao vivo na aba Aparência com mesma proporção (fiel ao resultado)
- Dica no uploader: *"Tamanho ideal: 1600×600px (proporção horizontal/panorâmica)"*

---

## O que está em produção AGORA

| Item | Status |
|------|--------|
| Cache forte no /splash (1 ano) | ✅ |
| QR code via lib local (CSP-safe) | ✅ |
| Profissional default linkado ao owner | ✅ |
| Limite de profissionais por plano (UI + trigger) | ✅ |
| Modais de confirmação opacos | ✅ |
| Foto profissional sincroniza ao trocar de aba | ✅ |
| Sugestões de serviço por categoria + validação preço | ✅ |
| Pausa de almoço múltiplos períodos + atalhos Seg-Sáb | ✅ |
| Copiar horários entre profissionais | ✅ |
| Kebab cross-prof só no admin | ✅ |
| RPC atômico de horários + auditoria | ✅ |
| Fidelidade: state lifted + 9 melhorias UX | ✅ |
| Fix global iOS zoom (font 16px em inputs) | ✅ |
| Banner "voltar pra Aparência" no preview admin | ✅ |
| Aparência: link logo + banner + preview real + indicadas + reset | ✅ |
| Migration v33 + v33b (cover_url + RLS fix) | ✅ |
| Capa renderizada na pagina pública (h-44 sm:h-56) | ✅ |

---

## 🔴 PENDÊNCIAS (em ordem)

### 1. Auditoria final do RLS pp_owner_* (v5)
A v5 (professional-photos) tem o **mesmo bug de ambiguidade do `name`** que a v33 tinha. Hoje só não dá problema porque as policies foram substituídas por `pp_auth_*` mais permissivas (qualquer authenticated upa). Vale revisar e usar o mesmo fix de IN (SELECT) — mais seguro pra uso em massa (impede usuário A subir foto no path do usuário B).

### 2. Aparência — melhorias da capa (Task #30 criada)
Eduardo deixou anotado: "dá pra melhorar mas agora não". Possíveis ideias já mapeadas:
- Crop/posição configurável pelo admin (slider de object-position)
- Preview lado a lado (mobile + desktop)
- Overlay/gradiente sobre a capa pra legibilidade
- Lazy load + skeleton
- Suporte a HEIC do iPhone (hoje rejeitado pelo compress-image)

**Não atacar nada sem alinhar com Eduardo primeiro** — perguntar quais ele tinha em mente.

### 3. Continuar tour end-to-end (próxima aba: WhatsApp)
Faltava só a aba WhatsApp pra completar o tour das Configurações. Depois disso, ainda tem agendamento real, financeiro, clientes.

### 4. Migrar MP de PF (CPF) → PJ (CNPJ Impulso Digital)
Continua pendente da sessão anterior.

### 5. Atualizar LPs com modalidades PIX
Continua pendente da sessão anterior.

### 6. Aplicar correções no Hero das LPs (lista do Eduardo)
Pendente.

---

## Decisões tomadas hoje (registrar)

1. **State lifting padrão pra abas que desmontam:** descobrimos esse bug 3 vezes hoje (professionals, rewards, referral_points). Convencionado: qualquer state que precisa sobreviver a unmount fica no `ConfiguracoesTabs` (parent), com useEffect sincronizando quando initialProps mudam.

2. **RPC atômico pra escritas concorrentes:** quando admin e profissional editam o mesmo dado simultaneamente, usar Postgres function com `SECURITY DEFINER` em vez de múltiplas writes separadas. Padrão pra qualquer escrita compartilhada daqui pra frente.

3. **Trigger SQL como segunda camada de validação:** UI pode ser furada (call API direta). Sempre que o limite é uma regra de negócio (não só UX), também blindar com trigger no banco. Aplicado pra limite de profissionais por plano.

4. **iOS Safari font-size mínimo 16px em inputs:** regra global, sem exceção. Qualquer input < 16px causa zoom automático e descentraliza. Aprendizado a registrar pra futuras telas.

5. **Compressão de imagem client-side com 3 presets:** `photo` 250KB / `logo` 150KB / `cover` 400KB, todos WebP. Web Worker → zero custo de servidor. Suporta uso em massa (100 businesses × 3 assets = 300 ops sem pressão no edge).

6. **`?preview=admin` query string convention:** quando admin abre uma página pública via "Ver minha página real" do painel, sempre incluir `?preview=admin` pra renderizar UI extra (botão voltar etc) sem poluir a versão real.

7. **Bucket por asset semântico:** business-covers separado de professional-photos. Mesmo padrão de path (`<business_id>/<asset>.<ext>`), policies idênticas, mas separação semântica facilita auditoria e permissões granulares.

8. **Anti-injection em API que aceita URL:** sempre validar que a URL recebida começa com o prefixo público do bucket Supabase do projeto. Aplicado em /api/admin/branding e /api/profissional/update-photo.

9. **Resolver ambiguidade do `name` em policies de storage:** **NUNCA** usar `EXISTS (SELECT FROM businesses b WHERE ... (storage.foldername(name))[1])` — o Postgres pode resolver `name` como `b.name`. Sempre usar `IN (SELECT b.id::text FROM businesses b WHERE ...)` com `(storage.foldername(name))[1]` fora da subquery.

---

## Notas adicionais

- 25 commits hoje, todos em produção (Vercel deploy automático)
- Nenhum rollback necessário — todos os fixes funcionaram na primeira ou segunda tentativa
- Eduardo testou pessoalmente em iPhone real (PWA instalado) — feedback em tempo real via WhatsApp screenshots
- 2 migrations rodadas no Supabase (v33 + v33b)
- Diretório de trabalho: `working tree não-limpo` por commits da sessão anterior (Day 4 PIX / billing / email — pendente de commit explícito numa próxima sessão)
- Eduardo foi pro cinema com a namorada — sessão pausada com tudo salvo e em produção
