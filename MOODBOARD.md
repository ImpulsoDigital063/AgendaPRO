# AgendaPRO v2 — Moodboard & Design Direction

**Data:** 2026-04-15 (madrugada)
**Branch:** v2-design
**Autorizações:** A=2 (landing + 4 LPs), B=2 (branch + preview), C=todas refs
**Deadline:** amanhã de manhã (~7-8h contínuas)

---

## Refs destiladas (não copiadas)

### Linear.app
- **Princípio:** navy profundo + gradient mesh sutil + tipografia MASSIVA (100px+ no hero)
- **O que puxar:** cor de fundo (`#080A13`-ish), títulos gigantes, glass cards com borda 1px `rgba(255,255,255,0.08)`, subtle grid pattern de background.
- **O que ignorar:** densidade de features (eles têm muitos produtos). Nosso hero é focado.

### Stripe.com
- **Princípio:** gradient mesh colorido animado + spacing generoso + microinterações precisas
- **O que puxar:** o gradient mesh animado no hero (fluxo líquido de cores), a precisão das sombras, sistema de tipografia hierárquica.
- **O que ignorar:** enterprise vibe. Nosso tom é pessoal, não corporate.

### Cal.com
- **Princípio:** dark mode bem-feito + 1 cor de acento forte + copy direta
- **O que puxar:** o uso restrito de cor (90% neutros + 10% accent), dark mode consistente.
- **O que ignorar:** minimalismo excessivo. Nosso visual é mais "wow".

### Arc.net
- **Princípio:** cards líquidos com blur + bordas de gradiente animadas + movimento orgânico
- **O que puxar:** os cards "líquidos" com hover mágico, bordas gradiente que pulsam.
- **O que ignorar:** identidade jovem demais. Nosso público é dono de negócio sério.

### Fresha.com (concorrente)
- **Princípio:** corporate clean com foto de cliente feliz
- **O que puxar:** NADA visual. Só a estrutura de pricing com benefícios empilhados.
- **O que EVITAR ATIVAMENTE:** stock photos, azul genérico de SaaS, seções "about us".

---

## Direção final — AgendaPRO v2

### 1. Paleta

```
Background principal:     #050713   (quase preto-azul, mais escuro que Linear)
Background secundário:    #0A1028   (painéis, seções intermediárias)
Background elevado:       #0F1938   (cards, glass surfaces)

Acento primário (logo):   #3B82F6   (azul brand mantido)
Acento secundário:        #06B6D4   (ciano — o "brilho")
Acento terciário:         #8B5CF6   (roxo — highlights ocasionais, gradient)

Borda glass:              rgba(255, 255, 255, 0.08)
Borda glass hover:        rgba(255, 255, 255, 0.16)
Borda luminosa:           gradient ciano → azul → roxo (1px)

Texto primário:           #F8FAFC
Texto secundário:         #94A3B8
Texto muted:              #64748B

Sucesso:                  #10B981
Aviso:                    #F59E0B
Erro:                     #EF4444
```

### 2. Tipografia

- **Display (hero):** Inter Display 800, tamanho fluido `clamp(3rem, 7vw, 6.5rem)`, letter-spacing `-0.04em`, line-height `0.95`
- **Headings:** Inter 700, `-0.02em`
- **Body:** Inter 400, 16-17px, line-height `1.65`
- **Mono (código/números):** JetBrains Mono

### 3. Gradientes

**Hero background (animado, 20s loop):**
```
radial-gradient(ellipse 80% 50% at 20% 30%, #1E40AF 0%, transparent 60%)
+ radial-gradient(ellipse 60% 40% at 80% 70%, #06B6D4 0%, transparent 55%)
+ radial-gradient(ellipse 70% 50% at 50% 100%, #8B5CF6 0%, transparent 50%)
com animação keyframes de deslocamento dos centros
```

**Card glow (hover):**
```
box-shadow: 0 0 60px rgba(6, 182, 212, 0.15),
            0 0 30px rgba(59, 130, 246, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.15)
```

**Borda luminosa (cards segmento):**
Gradient animado em `::before` pseudo-elemento, 1px, rotacionando 8s infinito.

### 4. Movimento

- **Orbs flutuantes** no hero: 3-4 círculos grandes com blur pesado (80-120px) e animação `float` lenta (15-25s) com opacidade pulsando.
- **Grid pattern sutil** no fundo: `background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)`, mask radial fade nas bordas.
- **Scroll reveal:** IntersectionObserver + fade-up + stagger nos filhos (já conhecido padrão).
- **Hover cards segmento:** tilt 3D sutil (5deg max), borda pulsa, ícone do segmento respira (scale 1 ↔ 1.08).
- **Gradient text:** em palavras-chave do hero (`clip-path: text`, gradient animado).
- **Magnetic cursor** nos CTAs primários (efeito Linear) — opcional se sobrar tempo.

### 5. Layout e spacing

- **Container principal:** max-width 1280px, padding 24px mobile / 48px desktop
- **Hero:** min-height `100svh` (não vh — svh pra evitar bug do Safari mobile)
- **Section padding vertical:** 96px mobile / 160px desktop
- **Card padding:** 32px
- **Border radius:** 24px (cards grandes), 16px (cards pequenos), 12px (buttons), 999px (pills)

### 6. Cards de segmento (o coração do pedido)

Cada card tem:

1. **Background:** glassmorphism (`backdrop-filter: blur(24px)`) sobre gradient único por segmento
   - Barbearia: gradient azul profundo → ciano
   - Salão: gradient roxo → rosa suave
   - Estética: gradient champanhe → azul gelo
   - Nail: gradient pink → coral
2. **Ícone do segmento:** ilustração SVG custom (tesoura/secador/escova/esmalte), com glow no hover
3. **Título:** "Para barbearias" (tipografia 32px display)
4. **Promessa específica:** 1 linha que resolve a dor daquele segmento
   - Barbearia: "Fila cheia sem bater foto no Insta."
   - Salão: "Cliente que agenda, volta e indica sozinho."
   - Estética: "Ticket alto organizado com elegância."
   - Nail: "Próximas 3 semanas sempre lotadas."
5. **Mini preview** do painel daquele segmento (screenshot stylizado)
6. **Borda luminosa animada** (1px, gradient rotacionando)
7. **Hover:** levanta 8px, glow intensifica, borda pulsa, ícone respira
8. **CTA:** "Ver como funciona para barbearia →"

### 7. Hero — arquitetura

```
┌──────────────────────────────────────────────────┐
│ [Grid pattern sutil + Orbs flutuantes + Gradient]│
│                                                  │
│  🎁 Badge: "14 dias grátis · sem cartão"          │
│                                                  │
│  [Headline fluid MASSIVA]                        │
│  Sua agenda virou                                │
│  o <gradient>turno da noite</gradient>           │
│  do seu negócio.                                 │
│                                                  │
│  [Subheadline]                                   │
│  Enquanto você vive, o AgendaPRO agenda,         │
│  lembra, cobra e traz cliente de volta.          │
│  Tempo de volta pra família, dinheiro            │
│  no caixa, cabeça tranquila.                     │
│                                                  │
│  [CTA Primário]    [CTA Secundário]              │
│  Quero 14 dias     Ver como funciona →           │
│                                                  │
│  [Proof strip]                                   │
│  ✦ 0 taxa de agendamento  ✦ Cancela quando quiser│
│  ✦ Leva pra qualquer lugar                      │
│                                                  │
│  [Scroll indicator animado]                      │
└──────────────────────────────────────────────────┘
```

### 8. Estrutura da landing principal (v2)

1. **Hero** (como acima)
2. **"Para o seu negócio" — 4 cards de segmento** (o coração)
3. **"A dor real" — 3 colunas de dor** (cliente ghosting / você amarrado no WhatsApp / agenda quebrada)
4. **"O que muda no seu dia"** — painel interativo com timeline das 24h do dono
5. **Features de retenção** (fidelidade, lista espera, indicação, Google Reviews) — 4 grids com animação
6. **"Comparação direta"** — nós vs. agenda no WhatsApp / Booksy / Fresha
7. **Pricing** com ancoragem escurecida
8. **Bônus** — 2º profissional + área exclusiva
9. **FAQ** acordeon com ícone +/×
10. **CTA final** com urgência (chip glowing)
11. **Footer** mínimo

### 9. Personalização (feature nova)

Painel admin `/admin/aparencia`:
- **Paletas prontas (presets):** Barbearia Clássica, Spa Zen, Glow Beauty, Corporativo Sério, Impacto Jovem
- **Custom:** color picker pra primary + secondary + background tone (claro/escuro)
- **Preview ao vivo** do `/[slug]` do cliente com as cores aplicadas
- **Persistência:** campos `brand_primary`, `brand_secondary`, `brand_mode` em `businesses`
- Aplicação: tela pública `/[slug]` lê essas cores via CSS variables

### 10. Tela pública `/[slug]` (cliente final)

- Mesmo design system dark + glass
- MAS respeita as cores personalizadas pelo dono
- **Mobile-first absoluto** (90% dos clientes vão marcar pelo celular)
- Passos do agendamento em cards com swipe horizontal no mobile
- Micro-interação no botão de confirmar (confetti suave)

### 11. Painel admin (dono)

- Dashboard com cards de métricas: hoje/semana/mês, faturamento, próximos 7 dias
- Agenda em formato kanban OU timeline (decidir durante execução)
- Lista de clientes com filtro + busca
- Área de relatórios com gráfico animado
- Navegação lateral recolhível (mobile = bottom nav)

---

## Regras de execução

1. **Um commit por marco grande** (design system, hero, cards, LPs, feature de cor, telas).
2. **Mobile nunca é afterthought** — testo em 375px (iPhone SE) durante cada seção.
3. **Performance > firula** — animações via CSS/transform, evito JS pesado. Lighthouse alvo: >85 mobile.
4. **Acessibilidade:** contraste mínimo AAA no texto grande e AA no corpo. Focus states visíveis.
5. **Se bater dúvida grande**, escrevo em `DECISOES-A-REVISAR.md` e sigo.

## Referências salvas (links pra revisão)

- Linear: https://linear.app
- Stripe: https://stripe.com
- Cal.com: https://cal.com
- Arc: https://arc.net
- Vercel (pra pricing): https://vercel.com/pricing

---

**Status:** direção travada. Indo pro design system v2.
