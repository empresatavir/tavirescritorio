---
name: frontend-engineering-canon
description: Canon operacional de engenharia frontend da TAVIR. Sintetiza bulletproof-react (arquitetura), shadcn/ui (Open Code), Radix Themes (DS pré-estilizado + Theme API), e Guia do Frontend (mapa anti-hype). Use ao estruturar apps React/Next, decidir stack de componentes, organizar features, API layer, estado, testes, ou quando o código UI precisa escalar sem virar bagunça.
---

# Frontend Engineering Canon — TAVIR

> Não é boilerplate. É **critério**. Pegue princípios; troque libs se o projeto exigir.
> Fontes: [bulletproof-react](https://github.com/alan2207/bulletproof-react) ·
> [shadcn/ui](https://github.com/shadcn-ui/ui) ·
> [Radix Themes](https://github.com/radix-ui/themes) ·
> [Guia do Frontend](https://github.com/arthurspk/guiadofrontend).

## 0. Mapa mental (o que cada fonte manda)

| Fonte | Papel na TAVIR | Não usar para |
|-------|----------------|---------------|
| **bulletproof-react** | Arquitetura de app: features, deps unidirecionais, API layer, estado, testes, erros, segurança, performance | Estética de marketing / "deixar bonito" |
| **shadcn/ui** | Distribuição Open Code (Radix **Primitives** + Tailwind); você **possui** o código no repo | Entregar tema default; misturar com outro DS no mesmo tree |
| **Radix Themes** (`@radix-ui/themes`) | Biblioteca **pré-estilizada** + `<Theme>` (accent, gray, radius, scaling, appearance). Velocidade + coerência + a11y | Escritório SolidJS; misturar com shadcn/Material no mesmo tree; shipar look default sem mapear marca |
| **Radix Primitives** | Camada sem estilo (Dialog, Popover…). Base do shadcn; não é “Themes” | Confundir com Themes e instalar os dois stacks sem decisão |
| **Guia do Frontend** | Mapa de ecossistema anti-hype | Receita de build; seguir trend |

Camada visual (taste, Dribbble, anti-slop) é outra skill: `design-taste-frontend` +
`visual-reference-absorb`. Esta skill governa **engenharia**.

## 1. Quando aplicar

- App de produto (CRM, SaaS, e-commerce admin, Escritório-like)
- LP/marketing **com** codebase que precisa crescer (não one-off HTML isolado)
- Parecer de CTO sobre stack frontend
- Refactor de pasta `src/` bagunçada
- Onboarding de construtor React/Next na esteira

**Pule** se o job for só copy, só brand tokens, ou protótipo HTML estático de prova visual
(aí Yuri + `DESIGN_PROOF_STANDARD`).

## 2. Arquitetura bulletproof (obrigatória em apps React/Next)

### 2.A Estrutura alvo

```text
src/
  app/          # rotas, providers, shell (meta-framework)
  assets/
  components/   # shared UI (só o verdadeiramente transversal)
  config/
  features/     # módulos por domínio (preferido)
  hooks/        # hooks shared
  lib/          # clients pré-configurados (api, auth, query)
  stores/       # estado global raro
  testing/
  types/
  utils/
```

Cada feature colocaliza o que for dela:

```text
features/<nome>/
  api/  components/  hooks/  stores/  types/  utils/
```

Só crie pastas que existirem de verdade. Sem scaffolding vazio.

### 2.B Regras duras de dependência

1. Fluxo **unidirecional**: `shared → features → app`. Features não importam `app/`.
2. **Sem cross-feature imports.** Compose no nível `app/` (rotas/páginas).
3. Evite barrel files (`index.ts` que reexporta tudo) em Vite — prejudicam tree-shaking.
4. API calls: coloque na feature **ou** em `lib/api` se forem genuinamente shared.
5. Estado: local primeiro; global só para evitar prop-drilling profundo (Zustand/Jotai/context).
6. Erros: boundary + feedback acionável; nunca stack trace ao usuário.
7. Testes: priorize fluxos críticos (auth, checkout, gates) sobre coverage cosmético.

Docs oficiais a consultar sob demanda:
- https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md
- https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md
- https://github.com/alan2207/bulletproof-react/blob/master/docs/testing.md
- https://github.com/alan2207/bulletproof-react/blob/master/docs/security.md
- https://github.com/alan2207/bulletproof-react/blob/master/docs/performance.md

### 2.C Adaptação SolidJS (Escritório TAVIR)

O Escritório usa **SolidJS + Vite**, não React. Aplique os **mesmos princípios**:
features isoladas, deps unidirecionais, shared em `components/`/`shared/`, stores
colocalizados. Não force APIs React (`useEffect`, RSC) no Solid.

## 3. Camada de componentes — escolher UM caminho

### 3.A Decisão shadcn vs Radix Themes (CTO / Rafa)

| Critério | Preferir **shadcn/ui** | Preferir **Radix Themes** |
|----------|------------------------|---------------------------|
| Ownership do fonte do Button/Dialog | Sim — edita no repo | Não — consome pacote + tokens/Theme |
| Customização profunda / brand odd | Alta | Média (Theme + CSS overrides) |
| Velocidade de MVP produto acessível | Boa | Excelente (defaults coerentes) |
| Time já no Escritório / Tailwind tokens | shadcn + Tailwind alinha melhor | Só se o parecer pedir Themes |
| Marketing / anti-slop LP | shadcn pontual + `design-taste-frontend` | Themes quase nunca no hero |

**Regra dura:** um design system de componentes por projeto. Não misturar
`@radix-ui/themes` + shadcn/ui + Material/Fluent no mesmo React tree.
Não instalar Themes no Escritório SolidJS.

### 3.B shadcn/ui — ownership, não biblioteca

Princípios: Open Code · Composition · Distribution · Beautiful Defaults · AI-Ready.

1. Componentes em `components/ui/...` — editar o fonte.
2. **Nunca** shipar visual default do registry. Tokens Marina + theming obrigatórios.
3. Usa **Radix Primitives** (unstyled) por baixo — não é Radix Themes.
4. Marketing: só forms/dialogs/tables; resto = `design-taste-frontend`.
5. A11y do Radix não dispensa contraste, labels, loading/empty/error.

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog form input
```

Docs: https://ui.shadcn.com/docs · https://ui.shadcn.com/llms.txt

### 3.C Radix Themes — Theme API, não Open Code

Repo: https://github.com/radix-ui/themes · Docs: https://www.radix-ui.com/themes/docs

1. Instalar `@radix-ui/themes`, importar `styles.css`, envolver app em `<Theme>`.
2. Configurar **antes do ship** a partir dos tokens Marina:
   - `accentColor` / `grayColor` / `radius` / `scaling` / `appearance` (light/dark)
   - Mapear Lima/Teal/Tinta ≈ accents próximos (ex. accent alinhado ao brand, não `indigo` default por preguiça)
3. Usar variantes de componente (`solid` / `soft` / `classic`…) para hierarquia — não reinventar botões.
4. Layout primitives do Themes (`Flex`, `Grid`, `Box`, `Container`) OK dentro do app Themes;
   não misturar com utilitárias Tailwind que brigam com o spacing scale do Themes sem regra.
5. `ThemePanel` só em dev / playground — **nunca** em produção cliente.
6. Dark mode via `appearance` / nested themes — testar light e dark com contraste AA.
7. Tokens do Themes (CSS vars) para overrides; não hardcodar hex que furam o Theme.

```bash
npm install @radix-ui/themes
```

```tsx
import "@radix-ui/themes/styles.css";
import { Theme, Button, Flex, Text } from "@radix-ui/themes";

<Theme accentColor="teal" grayColor="slate" radius="medium" scaling="100%">
  <App />
</Theme>
```

(Ajuste `accentColor`/`grayColor` ao parecer de marca — exemplo acima é ilustrativo.)

## 4. Guia do Frontend — decisões de stack anti-hype

Use o [Guia](https://github.com/arthurspk/guiadofrontend) como **mapa**, não checklist de
consumo. Princípio do próprio guia: conhecer o panorama para escolher o que a demanda
pede — hype ≠ requisito.

### 4.A Perguntas do CTO / Tech Lead antes de adotar lib

1. Qual problema concreto do projeto isso resolve agora?
2. Já existe padrão no braço (fábrica-lp, ecommerce, crm-whitelabel, Escritório)?
3. Custo de manutenção / bundle / curva do time?
4. Tem escape hatch se a lib morrer?
5. Conflita com a11y, SEO ou runtime local (`.agents/DEVELOPMENT_RUNTIME_STANDARD.md`)?

### 4.B Baseline TAVIR (defaults, não dogma)

| Superfície | Default | Alternativa quando |
|------------|---------|-------------------|
| Product web cliente | Next.js App Router + TS + Tailwind + **shadcn** | **Radix Themes** se parecer CTO pedir velocidade + Theme API e pouco ownership |
| Marketing / LP | Next ou HTML estático de prova → depois fábrica | Escopo Nível 1 só esqueleto |
| Escritório interno | SolidJS + Vite + tokens TAVIR | Nunca Radix Themes / shadcn React aqui |
| Mobile | Flutter quando parecer pedir | React Native só com justificativa |

## 5. Workflow de implementação (produto)

1. Confirmar stack no parecer CTO (shadcn **ou** Themes — escrito).
2. Esboçar pastas `features/` pelos domínios do requisito — não por tipo técnico.
3. Instalar/tematizar a camada de componentes **depois** dos tokens de marca.
4. Colocar data fetching na API layer da feature; tipar inputs/outputs.
5. Estados: loading / empty / error / success em toda superfície interativa.
6. Rodar checklist §6 antes de declarar pronto.

## 6. Checklist pré-entrega (engenharia)

- [ ] Features sem import cruzado; shared só o transversal
- [ ] Sem barrel files desnecessários
- [ ] Camada de UI escolhida no parecer (shadcn **ou** Themes) — zero look default de fábrica
- [ ] Se Themes: `<Theme>` com accent/gray/radius/appearance mapeados à marca; sem `ThemePanel` em prod
- [ ] Se shadcn: componentes no repo tematizados
- [ ] Um DS por projeto (sem misturar Themes + shadcn)
- [ ] Formulários: label visível, erro perto do campo, validação Zod/equivalente
- [ ] Erros de rede com recovery (retry / mensagem humana)
- [ ] Segredos fora do client bundle
- [ ] Imagens com dimensão/aspect-ratio (CLS)
- [ ] `prefers-reduced-motion` se houver motion
- [ ] Stack justificada sem hype (Guia do Frontend §proposta)

## 7. Relação com outras skills

| Skill | Fronteira |
|-------|-----------|
| `design-taste-frontend` | Estética anti-slop de landing/portfolio |
| `visual-reference-absorb` | Extrair Dribbble/Awwwards → Reference Card |
| `ui-styling` | shadcn + Tailwind no dia a dia; ponte para Themes quando parecer pedir |
| `ui-ux-pro-max` | Banco de estilos/UX pesquisável |
| `design-system` | Tokens e componentes de marca → UI |

Conflito estética × viabilidade: sobe ao CTO com as duas posições — nunca silenciar.
