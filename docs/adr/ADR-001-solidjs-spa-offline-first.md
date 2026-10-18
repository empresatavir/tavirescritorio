# ADR-001: Adoção do SolidJS SPA com Arquitetura Offline-First e Fontes Locais

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Decisão D2 e D7

## Contexto e Problema
O TAVIR Escritório é um painel operacional de uso local (`127.0.0.1`) para orquestração de 57 agentes de IA, execução de jobs, monitoramento em tempo real e produção editorial. A aplicação deve carregar instantaneamente, operar com total resiliência mesmo sem acesso à internet externa e manter fidelidade visual estrita ao Design System canônico.

## Decisão
1. **SolidJS SPA sobre SolidStart:** Optou-se por SolidJS SPA com Vite em vez de SolidStart ou SSR. Isso elimina complexidade de runtime server-side no frontend, reduz o bundle final e viabiliza que o backend FastAPI sirva os assets estáticos de produção diretamente ou que o Vite Preview rode em porta dedicada (`9002`).
2. **Offline-First Absoluto (Zero CDNs):** Nenhuma biblioteca de estilos, scripts ou fontes externas pode ser requisitada de CDNs (Google Fonts, unpkg, cdnjs).
3. **Fontes Self-Hosted:** As famílias tipográficas *Instrument Sans* e *IBM Plex Mono* são distribuídas sob licença SIL Open Font License (OFL) e embutidas localmente em `frontend/src/shared/fonts/` com declarações `@font-face` nativas no `index.css`.

## Consequências
- **Positivas:**
  - Inicialização instantânea sem latência de DNS ou bloqueios de firewall.
  - Funcionamento íntegro em ambientes isolados ou com conexão instável.
  - Reatividade granular do SolidJS sem overhead de Virtual DOM.
- **Negativas / Cuidados:**
  - O bundle de produção precisa incluir os arquivos de fontes (`~600 KB` no total).
