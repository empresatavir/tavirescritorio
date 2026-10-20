# Checklist Operacional de Fidelidade Visual (Pixel-Perfect QA)

Este checklist deve ser executado antes de dar como concluída a replicação de qualquer tela, modal, aba ou componente no TAVIR Escritório Virtual. Alinha-se a `QUALITY_EXCELLENCE_STANDARD.md`: artefato usado como operador, dual-theme, limitações explícitas.

---

## 0. Aceite de excelência (gate)
- [ ] **Fidelidade:** nenhuma “melhoria” espontânea vs. HTML/mock de origem (salvo pedido explícito).
- [ ] **Uso real:** fluxos principais clicados na porta **9002** (não 5173).
- [ ] **Evidência:** inspeção ou screenshots em dark **e** light.
- [ ] **Build:** `npm run build` no frontend com 0 erros.
- [ ] **SVGs novos:** `python scripts/clean_svgs.py` executado se assets entraram no commit.

---

## 1. Box Model & Geometria
- [ ] **Shell (quando aplicável):** Rail `56px` (`#070d18`), SubNav `212px` (`#0f1729`), Header `52px`, Drawer `360–400px`.
- [ ] **Ícones do shell:** Rail `18px`, SubNav item `15px`, logo símbolo `28px`, wordmark `96px`.
- [ ] **Gaps e Paddings:** escala do DS (8 / 12 / 14 / 16 / 20 / 24) — não valores arbitrários desalinhados.
- [ ] **`min-width: 0` / `min-height: 0`:** filhos flex/grid que precisam encolher sem estourar coluna.
- [ ] **Scrollers:** só a área de conteúdo rola; header/nav fora do overflow ou sticky conforme a ref.
- [ ] **Bordas:** transparências semânticas (`rgba(244,246,242,.10)` / `.12`) no ink; tokens no light.
- [ ] **Radius:** cards `12–14px`; pills `999px` / `var(--radius-pill)`; chips `4–6px` (ou valor da ref).

---

## 2. Tipografia e Hierarquia de Texto
- [ ] **Sans:** Instrument Sans (ou família da ref / token).
- [ ] **Mono:** Task IDs, métricas, timestamps, códigos, valores monetários → `IBM Plex Mono` / `var(--font-mono)`.
- [ ] **Pesos:** títulos `600`, labels importantes `500`, corpo `400` (ajustar se a ref divergir).
- [ ] **Letter-spacing:** títulos com tracking negativo da ref (`-0.01em` / `-0.02em`).
- [ ] **Truncamento:** `ellipsis` + `nowrap` + ancestral com `min-width: 0`.

---

## 3. Cores e Tema Híbrido
- [ ] **Zero** texto hardcoded claro (`#cbd3de`, `text-[var(--cloud)]`) em área de conteúdo.
- [ ] Tokens: `var(--text-primary)` / `--text-secondary` / `--text-muted`.
- [ ] Light: painéis estruturais permanecem Tinta (`#0B1220`); main = Nuvem (`#F4F6F2`).
- [ ] CTA: inversão no light (`--action-bg` / `--action-fg`) — Lima não como bloco ilegível sobre Nuvem.
- [ ] **Badges de status** (quando a ref usar o DS TAVIR):
  - Rodando: Teal `var(--teal)` + fundo `rgba(27,197,189,.14)`.
  - Fila / aviso: âmbar + fundo translúcido.
  - Erro: coral + fundo translúcido.
  - Neutro / done: nuvem suave + fundo translúcido.

---

## 4. Dinâmica, Sliders e Transições
- [ ] Progresso: `transition: width 300ms ease` (ou token de easing do DS).
- [ ] Sliders de esforço: rótulos + badge de tempo se existirem na ref; preenchimento fluido.
- [ ] Hover em botões/linhas clicáveis com transição rápida.
- [ ] Pulses: desligados sob `prefers-reduced-motion: reduce`.
- [ ] Sem micro-interação inventada que a referência não tenha.

---

## 5. Reatividade e Integridade de Estado (Anti-Flicker)
- [ ] `<For>` / listas: key = `id` estável do banco; objetos inalterados reutilizam referência.
- [ ] Drawer/detalhe: `<Show when={item != null}>` não-keyed (contêiner estável).
- [ ] Log SSE: append-only; listener em id primitivo.
- [ ] Datas SSE: `if (!event?.created_at || Number.isNaN(Date.parse(event.created_at))) return;`
- [ ] Sem flash/`Invalid Date` no terminal ao vivo.

---

## 6. Acessibilidade mínima (produto)
- [ ] Foco visível em controles interativos (não remover ring sem substituto).
- [ ] Alvos de toque ~≥44px em controles primários (quando a superfície for produto, não só mock).
- [ ] Contraste AA de texto sobre superfícies light e dark.
- [ ] Ícones acionáveis com nome acessível (aria-label / texto visível).
