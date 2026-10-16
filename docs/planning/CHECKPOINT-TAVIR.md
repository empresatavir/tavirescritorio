# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G9
- Status: concluído
- Último passo concluído: Mapa.tsx com PixiJS lazy-loaded e fallback acessível criado; Login.tsx com sessão loopback local (24h TTL); DesignSystem.tsx showcase com tokens/cores/tipografia/radii/componentes; Onboarding.tsx tour com 5 passos e marcação localStorage; todas as rotas conectadas no App.tsx; PixiJS instalado como dependência; build frontend compila sem erros (code-split PixiJS em chunks separados, lib 637 kB gzip 179 kB); working tree pronto para commit.
- Commit mais recente: bac4220 (G9 pendente de commit)

## Critérios do goal atual (G9)
- [x] Mapa carrega PixiJS apenas na rota (dynamic import); fallback texto quando WebGL indisponível
- [x] Habblaud tem ponto de conexão reservado sem implementação (D6 respeitado)
- [x] Login valida sessão local com secret; expiração 24h funciona
- [x] Onboarding marca conclusão local via localStorage; não bloqueia reentrada
- [x] Design System showcase exibe todos os tokens e estados de componentes
- [x] Build frontend compila sem erros; PixiJS code-split em chunks separados
- [x] Rotas /mapa, /login, /design-system, /onboarding conectadas aos componentes reais

## Arquivos alterados neste goal
- frontend/src/features/mapa/Mapa.tsx (adicionado)
- frontend/src/features/login/Login.tsx (adicionado)
- frontend/src/features/design-system/DesignSystem.tsx (adicionado)
- frontend/src/features/onboarding/Onboarding.tsx (adicionado)
- frontend/src/App.tsx (modificado — imports e rotas /mapa, /login, /design-system, /onboarding)
- frontend/package.json (modificado — pixi.js adicionado)
- frontend/package-lock.json (modificado)
- docs/planning/CHECKPOINT-TAVIR.md (atualizado)

## Comandos e resultados
- `npm install pixi.js`: 12 packages added, 0 vulnerabilities
- `npm run build`: exit code 0, built in 1.10s, PixiJS code-split (lib-Cu1vpnt0.js 637.89 kB gzip 179.82 kB)

## Decisões tomadas
- D6: Habblaud como ponto de conexão reservado (interface/evento sem implementação real)
- PixiJS lazy-loaded via dynamic import() para evitar carregar 637 kB em rotas que não usam mapa

## Próximo goal autorizado
- G10: Hardening, Regressão e Aceite Final