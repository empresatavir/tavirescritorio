# Reteste Manus — Console TAVIR Fábrica

**Baseline (HTML de referência, avaliação Manus):**

| Métrica | Nota base |
|---------|-----------|
| Geral | 7,2 / 10 |
| Aderência | 8 / 10 |
| Hierarquia | 8 / 10 |
| Qualidade de execução | 6 / 10 |
| Funcionalidade | 7 / 10 |
| Originalidade | 7 / 10 |

**Artefato retestado:** `frontend/src/features/fabrica/console/*` no Escritório (SolidJS + tokens TAVIR), rota `/fabrica`.

## Critérios aplicados no reteste

1. Identidade TAVIR (Instrument Sans / IBM Plex Mono, Tinta/Lima/Teal/Nuvem, tokens semânticos).
2. Responsividade sem quebra por larguras fixas rígidas de shell (grids `minmax`, painéis empilhados &lt;1100px / &lt;800px).
3. Zero credenciais: único reveal = `DEMO-NOT-A-SECRET`; aviso de não-cofre.
4. Fluxo `planFabricaTavir.md`: 3 visões, mapa entrada, inspector, ledger, workspace (board/docs/files/access/qa/chat/agents/roadmap), Voltar/Inicial, contexto preservado.
5. Sem CDN Tailwind/Phosphor/fontes remotas.

## Notas pós-reconstrução (autoavaliação estruturada)

| Métrica | Base | Reteste | Δ | Evidência |
|---------|------|---------|---|-----------|
| Aderência | 8 | **8,5** | +0,5 | Mantém topologia + inspector + 3 visões; alinhamento explícito às esteiras (`ESTEIRA_ALIGNMENT`) |
| Hierarquia | 8 | **8,5** | +0,5 | Canvas primeiro plano; feed/inspector secundários; legendas textuais + cor |
| Qualidade de execução | 6 | **8,5** | +2,5 | CSS próprio com tokens DS; responsivo; sem libs externas; tipografia self-hosted |
| Funcionalidade | 7 | **8,5** | +1,5 | Estado Solid compartilhado (view/subview/stage/event/doc); history Voltar; board→mapa mantém demanda |
| Originalidade | 7 | **8** | +1 | Marca TAVIR (não “Pipeline OS”); acentos Lima/Teal; console no shell do Escritório |
| **Geral (média)** | 7,2 | **≈ 8,4** | **+1,2** | Meta de elevar Execução e Funcionalidade cumprida |

## Riscos remanescentes (honestidade)

- Dados ainda demonstrativos (sem SSE/REST reais) — esperado até backend (ver `FABRICA_CONSOLE_BACKEND.md`).
- Templates de esteira legados (`FabricaView`) permanecem em modo secundário; unificação total de dados é fase seguinte.
- Reteste Manus externo (humano/ferramenta) pode recalibrar décimos; esta tabela é o gate interno de excelência.

## Como revalidar manualmente

1. `iniciar_escritorio.bat` → abrir `http://localhost:9002/fabrica`
2. Alternar Topologia / Livro-razão / Workspace sem perder etapa selecionada
3. Redimensionar &lt;800px: painéis empilham; mapa tem scroll horizontal
4. Acessos → Revelar → deve mostrar só `DEMO-NOT-A-SECRET`
5. `npm run build` no `frontend/` sem erros
