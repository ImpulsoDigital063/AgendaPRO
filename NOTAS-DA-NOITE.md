# Notas da noite — AgendaPRO v2 redesign

**Branch:** `v2-design`
**Noite:** 2026-04-15 → madrugada
**Status:** build verde, type check verde, todas as rotas públicas respondendo 200.

---

## O que foi entregue

### 1. Design system v2 (foundation)
- Paleta escurecida: `bg #050713`, brand `#3B82F6`, ciano `#06B6D4`, roxo `#8B5CF6`, rosa `#EC4899`.
- Tokens em `src/app/globals.css` — CSS vars, utility classes (`.glass`, `.glow-border`, `.text-gradient`, `.display-*`, `.btn-primary-v2`, `.btn-ghost`), animações (`float`, `mesh-drift`, `rotate-border`, `gradient-flow`, `pulse-glow`).
- `prefers-reduced-motion` respeitado.
- Tipografia: Inter (variable fonts 400-800) + JetBrains Mono.
- Componentes base: `GlassCard`, `Orb`, `AnimatedGradient`, `SectionReveal` (IntersectionObserver + stagger), `SegmentIcon`, `SegmentCard`.
- Logo dark novo em `public/logo-agendapro-dark.svg`.

### 2. Landing principal (`/`)
- Hero com gradient mesh animado + orbs flutuantes + badge pill-glow.
- Headline fluida "Sua agenda virou o **turno da noite** do seu negócio" (gradient animado na palavra-chave).
- 4 cards de segmento premium com tilt 3D + highlight que segue o cursor + borda luminosa.
- Seções: dor real, um dia real (timeline), features de retenção, comparação nós/WhatsApp/Caderno, passos, pricing R$67/R$107, FAQ, CTA final com pulse-glow, footer.

### 3. LPs segmentadas (`/barbearia`, `/salao`, `/estetica`, `/nail`)
- `SegmentLanding` reescrito com theme map por segmento (accent + gradient próprios).
- Hero com `SegmentIcon`, badge tematizada e CTA com gradient da vertical.
- Stats com `text-gradient`, features em glass com `glow-border`, steps com numeração mono na cor do segmento.
- Pricing mantido (R$67/R$107 + bônus 2º profissional no Solo).
- CTA final com wash do segmento e shadow colorida.

### 4. Personalização de marca (feature nova)
- **Migration v4** (`supabase-migration-v4-branding.sql`): colunas `brand_primary`, `brand_secondary`, `brand_mode` em `businesses`. **Precisa rodar no SQL Editor do Supabase.**
- **API** `PATCH /api/admin/branding` com validação hex + mode + RLS por `owner_id`.
- **Aba Aparência** em `/admin/configuracoes` com:
  - 8 presets (azul, roxo, rosa, ciano, verde, laranja, preto/ouro, vermelho)
  - Color pickers (primária + secundária)
  - Toggle modo claro/escuro
  - Preview ao vivo da página do cliente

### 5. Tela do cliente (`/[slug]`)
- Totalmente redesenhada com glass + cover gradient da marca.
- Todos os campos do negócio organizados: logo, nome, descrição, categoria, endereço (pill), telefone (botão WhatsApp), equipe (carousel), serviços com pontos de fidelidade destacados, Google Reviews, CTAs duplicados.
- Suporta modo dark/light escolhido pelo dono via aba Aparência.
- Cores vêm de `brand_primary` / `brand_secondary` — toda a página pinta em tempo real quando o dono muda.

### 6. BookingFlow (`/[slug]/agendar`)
- Header com cover gradient branded + botão voltar circular.
- BookingFlow usa `var(--brand-primary)` nos estados selecionados e CTAs (fallback `#111827`). Cada dono vê seu booking pintado com sua cor.
- Herda modo dark/light do dono.

### 7. Painel admin
- Login: `AnimatedGradient` + form em glass + logo dark.
- BottomNav: backdrop blur dark + active em azul brilhante.
- Dashboard: logo dark + item "Aparência" no menu rápido + bg unificado `#050713`.
- Abas existentes (Negócio, Profissionais, Serviços, Horários, Fidelidade, WhatsApp) mantidas como estavam — nova aba **Aparência** adicionada.

---

## Commits (ordem cronológica)

```
1052955 docs(v2): moodboard + decisoes-a-revisar para redesign v2
e05098d feat(v2): design system dark (globals.css + Inter + componentes base)
898c14e feat(v2): hero + cards de segmento + landing redesign completo
81b7866 feat(v2): 4 LPs segmentadas alinhadas ao design system v2
dd0f22b feat(v2): personalizacao de cores + tela do cliente redesenhada
7da7441 feat(v2): BookingFlow herda branding via CSS var
3a7f0f4 feat(v2): admin redesign — login glass + nav v2 + dashboard logo
```

---

## QA executado

- ✅ `npx tsc --noEmit` — zero erros
- ✅ `npm run build` — compilado em 15.5s, 26 páginas geradas
- ✅ Smoke test em `localhost:3000`:
  - `/` → 200
  - `/barbearia` → 200
  - `/salao` → 200
  - `/estetica` → 200
  - `/nail` → 200
  - `/admin/login` → 200
  - `/cadastro` → 200
- Rotas dinâmicas `/[slug]` e admin protegido dependem de dado Supabase — não dá pra testar sem login.

---

## Pendências pra você decidir de manhã

1. **Rodar a migration v4** no Supabase:
   ```sql
   -- em supabase-migration-v4-branding.sql
   ```
   Sem isso a aba Aparência vai dar 500 ao salvar.

2. **Conferir preview Vercel** — push da branch e ver como a paleta escura renderiza no mobile real (Samsung, iPhone). Testei em `clamp()` pra não estourar, mas nada substitui celular na mão.

3. **Cadastro** (`/cadastro`) — não reformulei pra não quebrar o fluxo de onboarding. Ficou no estilo antigo (light). Posso atacar num próximo ciclo se quiser.

4. **Telas internas do admin** (Clientes, Financeiro, Configurações tabs internas) — ficaram no estilo light antigo. Só header/nav/aba nova são v2. Elas funcionam — só visualmente não são v2. Próximo ciclo.

5. **Decidir sobre badges** que decidi sozinho:
   - "+ 2º profissional grátis bônus" no Solo mantido.
   - Seção "comparação direta" (nós vs WhatsApp vs Caderno) ficou — peso visual ficou bom.
   - FAQ antes do CTA final.

---

## O que NÃO mexi

- Lógica de negócio (BookingFlow, appointments, auth, Supabase queries).
- Webhooks e APIs existentes (`/api/appointment/action`, `/api/cron/reminders`, etc).
- Componentes específicos das tabs internas (só as classes visuais dos botões primários do BookingFlow).
- Master branch. Tudo está em `v2-design`.

---

## Próximos passos sugeridos

1. Rodar migration v4.
2. Push da branch pra abrir preview Vercel.
3. Testar em mobile real (golden path: abrir landing → escolher segmento → clicar cadastro / ou abrir `/seu-slug` → agendar).
4. Mudar cores na aba Aparência e ver o `/[slug]` atualizar.
5. Merge `v2-design` → `master` quando aprovar.

Boa noite e bom dia, Edu. 🌙
