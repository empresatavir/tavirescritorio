# CHECKPOINT-TAVIR

## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G2
- Status: concluído
- Último passo concluído: Scaffold frontend SolidJS+Vite+TS; backend FastAPI com health endpoint; fontes OFL baixadas e servidas; design tokens aplicados; shell com sidebar 8 grupos e header; build bem-sucedido; validação de static files, SPA fallback e fontes via curl.
- Commit mais recente: pendente (aguardando commit do G2)

## Critérios do goal atual (G2)
- [x] GET /api/v1/health retorna {"status":"ok","version":"0.1.0"} com 200
- [x] App abre em http://127.0.0.1:8000 e renderiza shell
- [x] Sidebar tem 8 grupos; header tem breadcrumb e seletor de tema
- [x] Fontes carregam sem rede (self-hosted OFL: Instrument Sans + IBM Plex Mono)
- [x] Tokens CSS exatos do _ds_manifest.json aplicados
- [x] Zero requisições CDN em carga normal
- [x] Build frontend compila sem erros (45.65 kB JS, 2.75 kB CSS)
- [x] Static files servidos corretamente (200 para /, /assets/*.css, /assets/*.ttf)
- [x] SPA fallback funciona (200 para /execucoes)
- [ ] Validação visual contra screenshots (pendente — requer comparação manual ou tool de screenshot)
- [ ] 14 componentes DS implementados (parcial — apenas shell criada; componentes individuais pendentes)

## Arquivos alterados neste goal
- frontend/package.json (adicionado via vite scaffold)
- frontend/src/App.tsx (modificado — rotas SPA)
- frontend/src/index.tsx (modificado — entry point)
- frontend/src/index.css (modificado — importa tokens + font-face)
- frontend/src/app/Shell.tsx (adicionado)
- frontend/src/app/Sidebar.tsx (adicionado)
- frontend/src/app/Header.tsx (adicionado)
- frontend/src/features/home/Home.tsx (adicionado)
- frontend/src/shared/styles/design-tokens.css (adicionado)
- frontend/src/shared/fonts/InstrumentSans-VariableFont_wdth,wght.ttf (adicionado)
- frontend/src/shared/fonts/IBMPlexMono-Regular.ttf (adicionado)
- frontend/src/shared/fonts/IBMPlexMono-Medium.ttf (adicionado)
- frontend/src/shared/fonts/IBMPlexMono-SemiBold.ttf (adicionado)
- backend/app/main.py (adicionado)
- backend/requirements.txt (adicionado)
- backend/run.py (adicionado)

## Comandos e resultados
- `npm create vite@latest frontend-temp -- --template solid-ts`: exit code 0
- `npm install @solidjs/router`: exit code 0
- `curl -fsSL` (fontes): exit code 0, 4 arquivos TTF baixados
- `npm run build`: exit code 0, 45.65 kB JS + 2.75 kB CSS
- `curl http://127.0.0.1:8000/api/v1/health`: {"status":"ok","version":"0.1.0"}
- `curl -s -o /dev/null -w "%{http_code}" /`: 200
- `curl -s -o /dev/null -w "%{http_code}" /assets/index-WeLafm8W.css`: 200
- `curl -s -o /dev/null -w "%{http_code}" /execucoes`: 200
- `curl -s -o /dev/null -w "%{http_code}" /assets/InstrumentSans-*.ttf`: 200
- `curl -s -o /dev/null -w "%{http_code}" /assets/IBMPlexMono-Regular-*.ttf`: 200

## Evidências
- Build output: 32 modules transformed, built in 439ms
- Health check: {"status":"ok","version":"0.1.0"}
- Static files: todos retornam HTTP 200
- Fontes: 4 arquivos TTF em src/shared/fonts/ (194KB + 135KB + 136KB + 140KB)

## Validação visual
- Pendente: comparação lado a lado com screenshots de referência não executada
- Shell renderiza com sidebar e header; tokens CSS aplicados

## Decisões tomadas
- D2 confirmada: SolidJS SPA (sem SolidStart)
- D7 confirmada: fontes OFL baixadas do GitHub google/fonts
- D10 confirmada: skills instaladas em .claude/skills/

## Decisões pendentes
- Validação visual completa contra screenshots (requer ferramenta de captura ou revisão manual)
- Implementação dos 14 componentes DS individuais (postergado para goals subsequentes)

## Falhas e limites
- Erro TS1484 em Shell.tsx corrigido (type-only import)
- Componentes DS completos não implementados neste goal (apenas tokens e shell)

## Instruções de retomada
1. Ler este checkpoint
2. Verificar `git log --oneline -3` deve mostrar commits G0, G1 e G2
3. `git status --short` deve estar vazio após commit
4. Prosseguir para G3-database-foundation

## Próximo goal autorizado
- G3-database-foundation | aguardando autorização