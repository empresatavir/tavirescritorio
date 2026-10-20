# Template de Relatório de Decisão — TAVIR Tool Analyzer

Este template define o formato padrão emitido pelo agente **Maicon** ao concluir a análise de uma ferramenta.

---

# Parecer Técnico de Integração: [Nome da Ferramenta]

- **Alvo Analisado:** [URL do Repositório / Site / Mídia]
- **Tipo de Entrada:** [Repositório GitHub | Site Comercial | Print de Tela | Vídeo Demonstrativo]
- **Analista Responsável:** Maicon (Arquiteto de Integrações TAVIR)
- **Data da Avaliação:** [AAAA-MM-DD]
- **Status Inicial:** Em Análise Consultiva

---

## 1. Mapeamento & Arquitetura da Ferramenta

- **Propósito Principal:** [Resumo claro de 1 a 2 parágrafos sobre o que a ferramenta faz]
- **Principais Funcionalidades:**
  - Feature 1: [Descrição]
  - Feature 2: [Descrição]
  - Feature 3: [Descrição]
- **Arquitetura & Interface:** [CLI / REST API / SDK / Interface Web / MCP Server]
- **Stack & Dependências:** [Linguagem, runtime, pacotes centrais e serviços exigidos]

---

## 2. Diagnóstico de Compatibilidade com Ecossistema TAVIR

| Vetor de Compatibilidade | Situação Observada | Impacto no TAVIR |
| :--- | :--- | :--- |
| **Workers Isolados** | [Execução sem estado compartilhado?] | [Neutro / Ajuste / Incompatível] |
| **Git Worktrees** | [Permite execução em branches paralelas sem lock?] | [Compatível / Conflito de arquivo] |
| **Orquestração Headless** | [Permite execução não interativa via scripts?] | [Headless nativo / Exige TTY interativo] |
| **Portas & Infra TAVIR** | [Conflita com portas 9001/9002 ou SQLite?] | [Livre / Requer realocação] |
| **Segurança & Dados** | [Tratamento de telemetria, dados e segredos] | [Seguro / Risco de vazamento] |

---

## 3. Opções Estruturadas de Decisão

*(Apresente apenas as opções aplicáveis à ferramenta)*

### Opção [A/B/C/D]: [Nome da Opção]
- **O que é:** [Detalhamento do caminho técnico]
- **Prós:**
  - [Vantagem 1]
  - [Vantagem 2]
- **Contras:**
  - [Desvantagem 1]
  - [Desvantagem 2]
- **Esforço:** [Baixo / Médio / Alto]
- **Risco:** [Baixo / Médio / Alto]

---

## 4. Recomendação Final & Justificativa

- **Opção Recomendada:** **[Opção X — Nome da Opção]**
- **Justificativa Arquitetural:** [Explicação fundamentada em resiliência, automação e escalabilidade no TAVIR]
- **Avisos de Licenciamento & Custos:**
  - **Licença:** [Ex: MIT, Apache-2.0, AGPL-3.0, Proprietária]
  - **Custos / Chaves de API:** [Ex: Requer OpenAI API key / Gratuita / Assinatura SaaS]
  - **Patentes / Restrições:** [Declaração sobre ausência ou presença de restrições de terceiros]

---

> ⚠️ **Nota Consultiva:** Este parecer não executa comandos de instalação automática. Qualquer implementação depende de aprovação explícita no gate humano do Kanban TAVIR.
