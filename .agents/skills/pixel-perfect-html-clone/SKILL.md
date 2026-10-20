---
name: pixel-perfect-html-clone
description: >-
  Clona, transpila e replica layouts HTML/CSS ou mockups estáticos para componentes de produção (SolidJS, React, Tailwind, etc.) com precisão milimétrica (pixel-perfect).
  Use esta skill sempre que o usuário pedir para "copiar layout", "reproduzir HTML", "reproduzir fielmente", "pixel-perfect", "converter HTML para componente", clonar telas, modais ou painéis a partir de referências HTML, templates ou screenshots.
---

# Skill: Pixel-Perfect HTML Clone & Transpilation

Esta skill estabelece o processo de engenharia obrigatório para clonar e converter layouts HTML/CSS brutos, mockups ou arquivos de referência visual em componentes de frontend de alta fidelidade visual (SolidJS / React / Vanilla CSS / Tailwind), garantindo fidelidade geométrica exata, imunidade a bugs de renderização, suporte a tema híbrido e reatividade fluida sem piscadas.

Alinha-se a `QUALITY_EXCELLENCE_STANDARD.md` e `AGENTS.md`: **fidelidade verificável** (não “parece igual”), dual-theme, build limpo e uso real como operador.

---

## 0. Disciplina de fidelidade (antes de qualquer fase)

1. **Clone ≠ redesign.** Não “melhorar”, modernizar tipografia, trocar ícones nem inventar estados que a referência não tem — salvo pedido explícito.
2. **Medir, não adivinhar.** Larguras, gaps, pesos e cores saem da inspeção (DevTools / CSS da referência), não da memória do modelo.
3. **Evidência de conclusão:** checklist + build + screenshots light/dark da tela clonada (e da referência, quando existir). Layout “bonito” sem essa evidência permanece draft.
4. **Portas oficiais na verificação:** backend **9001**, frontend **9002**. Não validar em 5173/8000 — port drift gera falso negativo de bugs já corrigidos. Use `parar_escritorio.bat` / `iniciar_escritorio.bat` se necessário.

---

## 1. Visão Geral do Ciclo de Execução

```
[1. Anatomia] → [2. Sanitização SVG] → [3. Tokens & Tema] → [4. Transpilação]
        → [5. Micro-interações] → [6. Reatividade anti-flicker] → [7. QA visual dual-theme]
```

---

## 2. Passo a Passo Detalhado

### FASE 1: Inspeção de Anatomia & Geometria Estrutural

Antes de escrever código, faça a leitura reversa das dimensões fixas e grids do HTML de referência:

1. **Shell TAVIR (3 colunas) — fidelidade absoluta quando a tela usa o app shell:**
   - **Rail:** `56px`, fundo `#070d18`, logo símbolo `28px`, ícones `18px`, seletor de tema, avatar CEO.
   - **SubNav:** `212px`, fundo `#0f1729`, wordmark invertido `96px`, ícones de item `15px`, rodapé status SQLite/MCP.
   - **Main Header:** `52px` (`var(--surface-0)`), breadcrumb, pílula ao vivo, busca `Ctrl K`, CTA *Iniciar job*.
   - **Drawer:** tipicamente `360px`–`400px`.
2. **Grid / Flex:** `grid-template-columns`, `gap`, `minmax`, `flex-direction` exatos.
3. **Scrollers independentes:** `overflow-y: auto`, `overflow-x: hidden`, `min-height: 0` / `min-width: 0` em filhos flex/grid para não estourar coluna; header/nav sticky ou fora do scroller.
4. **Modais / overlays:** backdrop (`backdrop-filter` se a ref tiver), z-index da escala do projeto (não inventar `z-[9999]`), centralização e `max-width` iguais à ref.

---

### FASE 2: Sanitização Rigorosa de Ativos e SVGs (Filtro Anti-C2PA)

> [!CAUTION]
> **NUNCA** copie ou injete SVGs sem sanitização. Metadados C2PA quebram o DOM via texto base64 visível.

1. **Eliminação de Metadados C2PA:**
   - Remova `<metadata>`, `<c2pa:manifest>`, atributos `xmlns:c2pa` e qualquer payload base64 de procedência.
   - SVG limpo: `<svg viewBox="..." fill="none"><path .../></svg>`.
2. **Gate de lote (já existe no repo):** após adicionar SVGs em `frontend/public` ou `frontend/src`, rode:
   ```bash
   python scripts/clean_svgs.py
   ```
3. **Normalização de Unidades CSS (`toCssSize`):**
   - `width: 18` / `height: 15` sem unidade são **inválidos** → ícone vira ~300×300.
   - Sempre: número ou string numérica → `"18px"` (via `TvIcon` / helper).
4. **Isolamento de ícone:** `inline-flex`, `align-items: center`, `justify-content: center`, `line-height: 0`, `overflow: hidden` (`.tv-icon-wrapper`).

Detalhes: [svg-sanitization-guide.md](./references/svg-sanitization-guide.md).

---

### FASE 3: Sistema de Cores, Tipografia & Tema Híbrido

1. **Tipografia (Escritório):**
   - Display/body: `Instrument Sans` (ou token do DS).
   - Métricas, logs, codes, `Task #68`, timestamps, dinheiro: `IBM Plex Mono` / `var(--font-mono)`.
   - Pesos e `letter-spacing` iguais à referência (títulos frequentemente `-0.01em` / `-0.02em`).
2. **Contrato de Tema Híbrido:**
   - **NUNCA** hardcode texto claro (`#cbd3de`, `text-[var(--cloud)]`) em área de conteúdo — some no light.
   - Tokens: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`.
   - Em `[data-theme="light"]`: Rail / SubNav / InkPanel ficam Tinta (`--surface-ink: #0B1220`); main vira Nuvem (`--surface-0: #F4F6F2`).
   - CTA primário: no light, fundo Tinta + texto Lima (`--action-bg` / `--action-fg`) — Lima nunca como bloco sólido ilegível sobre Nuvem.
3. **Tailwind v4 + tokens nativos:**
   - Reset `*, *::before, *::after` em `@layer base` (nunca fora).
   - Preflight do Tailwind permanece **desativado** de propósito — não reative.
4. **Truncamento:** títulos longos → `ellipsis` + `min-width: 0` no ancestral flex/grid.

---

### FASE 4: Micro-Interações, Animações e Transições

1. **Progresso:** `transition: width 300ms var(--ease-standard, ease)`.
2. **Sliders / esforço:** trilha inativa, preenchimento (Lima/Teal/Âmbar), steps com rótulos, badge de tempo (`~30s`…`~600s`) se a ref tiver.
3. **Hover / active:** `transition` rápida nos alvos clicáveis; hover sutil alinhado à ref.
4. **Badges pulsantes:** só se a ref tiver; respeitar `prefers-reduced-motion: reduce` (desligar pulse).
5. **Não inventar** micro-interação “premium” que a referência não possui.

---

### FASE 5: Arquitetura Reativa & Imunidade a Piscadas (Anti-Flicker)

Ao converter HTML estático para SolidJS / React:

1. **Listas + polling:** reconciliar por `id` estável do banco; reutilizar referências de objetos inalterados. **Nunca** key por índice ou título+timestamp.
2. **Drawers (`<Show>` não-keyed):**
   - Evitar `<Show when={item}>{(item) => ...}</Show>` (keyed → remount).
   - Preferir `<Show when={item != null}><Child item={item!} /></Show>`.
3. **SSE / WebSocket / log ao vivo:**
   - Listener depende de id primitivo (`selectedId()`).
   - Append-only: `setEvents(prev => [...prev, newEvent])`.
   - **Validar data antes de formatar** (lição AGENTS.md):
     ```ts
     if (!event || !event.created_at || Number.isNaN(Date.parse(event.created_at))) return;
     ```
   - Evita `Invalid Date · undefined` no terminal.

---

### FASE 6: QA Visual Dual-Theme & Aceite de Excelência

Obrigatório antes de declarar pronto (proporcional ao risco da tela):

1. Abrir a tela em **9002** e usá-la como operador (click paths da ref).
2. Screenshot / inspeção em **dark e light**.
3. Comparar geometria com a referência (lado a lado ou overlay mental com medidas DevTools).
4. Rodar checklist: [pixel-perfect-checklist.md](./references/pixel-perfect-checklist.md).
5. `npm run build` no `frontend/` com 0 erros.
6. Se novos SVGs entraram: `python scripts/clean_svgs.py`.

---

## 3. Checklist de Auditoria Pixel-Perfect (Pré-Entrega)

| Item | Critério de Aceite | Status |
| :--- | :--- | :---: |
| **1. Dimensões** | Shell/colunas/gaps = referência (Rail 56 / SubNav 212 / Header 52 quando aplicável) | [ ] |
| **2. Tipografia** | Sans/Mono, pesos, letter-spacing, ellipsis + `min-width: 0` | [ ] |
| **3. SVGs** | Sem `<metadata>` / `xmlns:c2pa`; `clean_svgs.py` se assets novos | [ ] |
| **4. Unidades CSS** | width/height com unidade; `toCssSize` em props de tamanho | [ ] |
| **5. Temas** | Dark + Light legíveis; tokens semânticos; CTA invertido no light | [ ] |
| **6. Dinâmica** | Progress/sliders/hover iguais à ref; reduced-motion em pulses | [ ] |
| **7. Anti-flicker** | keys por id; Show não-keyed; SSE append-only + validação de data | [ ] |
| **8. A11y mínima** | Foco visível em interativos; alvo ~≥44px onde a ref for produto real | [ ] |
| **9. Fidelidade** | Sem “melhorias” espontâneas vs. referência | [ ] |
| **10. Build** | `npm run build` limpo; verificação na porta 9002 | [ ] |

---

## 4. Recursos e Referências

- [Guia de Sanitização de SVGs](./references/svg-sanitization-guide.md)
- [Checklist Operacional Detalhado](./references/pixel-perfect-checklist.md)
- Script de lote: `scripts/clean_svgs.py`
- Regras do workspace: `AGENTS.md`, `QUALITY_EXCELLENCE_STANDARD.md`
