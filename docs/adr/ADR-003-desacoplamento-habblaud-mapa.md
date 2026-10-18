# ADR-003: Desacoplamento do Habblaud Engine da Rota /mapa

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Decisão D6 e Diretriz Explícita do Usuário na Fase 6

## Contexto e Problema
O escopo inicial propunha um protótipo de nós topológicos em PixiJS na rota `/mapa`. No entanto, a visão de produto da TAVIR prevê que a representação espacial e imersiva do escritório seja realizada pelo motor dedicado **Habblaud** (motor 3D/isométrico) em fase posterior independente. Implementar nós artificiais prematuramente criaria dívida técnica e retrabalho de refatoração.

## Decisão
1. **Remoção da Engine Gráfica Temporária:** Nenhuma biblioteca de canvas/física pesada foi embutida no frontend para desenhar grafos arbitrários.
2. **Ponto de Conexão Arquitetural:** A rota `/mapa` foi convertida em um painel executivo com o selo transparente de `IMPLEMENTAÇÃO POSTERIOR (HABBLAUD ENGINE)`.
3. **Ficha Técnica Canônica:** Exposição dos contratos acordados:
   - Provedor: Habblaud 3D/Isometric
   - Protocolo: SSE / WebSocket bidirecional
   - Cobertura: 57 Agentes Canônicos
   - 6 Zonas Demarcadas da Agência: Cockpit Central, Estúdio Criativo, Fábrica de Soluções, Mesa Comercial, Cérebro & Memória e Diretoria & QA.

## Consequências
- **Positivas:**
  - Redução drástica do tempo de compilação e tamanho do bundle.
  - Zero mocks falsos de nós espaciais que não refletiriam a física do Habblaud.
  - Interface alinhada às expectativas do operador e fiel ao Design System.
- **Negativas / Cuidados:**
  - A renderização isométrica fica reservada para o projeto/módulo Habblaud futuro.
