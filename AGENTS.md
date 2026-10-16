# Diretrizes Universais de Engenharia & Conhecimento Consolidado — TAVIR Escritório

Este arquivo é a fonte primária de conhecimento operacional e regras técnicas para **QUALQUER motor de IA** (Claude, Gemini, Cursor, Copilot, ChatGPT ou agentes autônomos) atuando no repositório `tavirescritorio`.

---

## 1. Regras Críticas de Ícones e SVGs (Lições do Bug C2PA)

> [!CAUTION]
> **NUNCA** adicione ou injete SVGs com tags `<metadata>` ou atributos de procedência (`xmlns:c2pa`).

- **Causa Raiz:** SVGs exportados ou baixados de ferramentas externas podem conter `<metadata><c2pa:manifest>...` com mais de 8.000 caracteres base64. Ao serem injetados via `innerHTML` em `<span>` ou contêineres HTML, o parser do navegador trata o base64 como nós de texto visíveis, estourando larguras de 212px para centenas de pixels e quebrando o layout da aplicação.
- **Diretriz Obrigatória:**
  1. Todos os SVGs em `frontend/public/assets/` e `frontend/src/assets/` devem ser estritamente limpos (apenas `<svg ...><path .../></svg>`).
  2. O componente `TvIcon.tsx` possui a função `sanitizeSvg()` que stripa preventivamente `<metadata>` e `<style>` e substitui dimensões fixas por `100%`.
  3. No CSS global (`index.css`), `.tv-icon-wrapper` e `.tv-icon-wrapper svg` possuem regras estritas com `overflow: hidden`, `line-height: 0` e `metadata { display: none !important; }`.

---

## 2. Normalização de Dimensões em Componentes (Bug de Unidade CSS)

- **Causa Raiz:** Passar strings puramente numéricas como `width="18"` ou `height="15"` diretamente para o CSS inline (`style={{ width: props.width }}`) resulta em CSS inválido no navegador (`width: 18` é ignorado), fazendo o ícone estourar ou adotar dimensões padrão (300×300).
- **Diretriz Obrigatória:**
  - Todo componente que aceita dimensões de tamanho deve usar `toCssSize(v)`: se for número ou string numérica (`/^\d+(\.\d+)?$/`), converter obrigatoriamente para `px` (ex: `"18"` -> `"18px"`).

---

## 3. Coexistência de CSS Tokens e Utilitárias Tailwind (Vite + Tailwind v4)

- **Causa Raiz:** Componentes e telas (`SalaOperacaoView`, `PropostasView`) foram escritos usando classes Tailwind (`flex`, `grid`, `p-6`, `bg-[#0f1729]`), mas a dependência não estava configurada no Vite, renderizando a tela como texto plano desformatado.
- **Diretriz Obrigatória:**
  1. Tailwind v4 está integrado via `@tailwindcss/vite` no [vite.config.ts](file:///c:/Users/carlo/Downloads/Projetos%20a%20Estudar/tavirescritorio/frontend/vite.config.ts) e `@import "tailwindcss/theme.css"` / `@import "tailwindcss/utilities.css"` no [index.css](file:///c:/Users/carlo/Downloads/Projetos%20a%20Estudar/tavirescritorio/frontend/src/index.css).
  2. O reset universal `*, *::before, *::after` DEVE residir em `@layer base` para não anular classes utilitárias de padding/margin.
  3. O reset preflight padrão do Tailwind está deliberadamente desativado para proteger os tokens e o design system nativo da TAVIR.

---

## 4. Contrato de Tema Híbrido Claro / Escuro (Design System TAVIR)

- **Causa Raiz:** Hardcodar cores como `text-[var(--cloud)]` ou `#cbd3de` torna o texto invisível em modo claro (`data-theme="light"`).
- **Diretriz Obrigatória:**
  1. Use SEMPRE tokens semânticos: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`.
  2. Regra Híbrida: Em `[data-theme="light"]`, os painéis estruturais (`Rail`, `SubNav`, `InkPanel`) mantêm Tinta Profunda (`--surface-ink: #0B1220`), enquanto a área de conteúdo principal muda para Nuvem (`--surface-0: #F4F6F2`).
  3. O botão de ação primário inverte no tema claro (`--action-bg: var(--ink)`, `--action-fg: var(--lime)`), de modo que o fundo Lima nunca preencha superfícies claras.

---

## 5. Gerenciamento de Processos e Portas no Windows (Port Drift 5173 vs 5174)

- **Causa Raiz:** Iniciar o Vite sem encerrar a instância anterior faz o Vite subir na porta `5174`, enquanto o usuário e o navegador continuam apontando para a porta `5173`, gerando diagnósticos falsos de bugs já corrigidos.
- **Diretriz Obrigatória:**
  1. Utilize sempre os scripts batch padronizados na raiz:
     - `iniciar_escritorio.bat` (ou `run.bat`): inicialização inteligente com checagem de portas e saúde.
     - `parar_escritorio.bat`: encerra com segurança processos nas portas 8000 e 5173 via PowerShell.
     - `testar_escritorio.bat`: roda pytest (backend) e `npm run build` (frontend).
  2. Scripts batch no Windows DEVEM possuir quebras de linha `CRLF` (`\r\n`) e cabeçalho `chcp 65001 >nul` (UTF-8). Salvar `.bat` com `LF` puro corrompe o parser do `cmd.exe`.

---

## 6. Tratamento Defensivo de SSE e Datas

- **Causa Raiz:** Payloads de erro ou mensagens de conexão SSE sem timestamp válido causavam texto "Invalid Date · undefined" nos logs de terminal.
- **Diretriz Obrigatória:**
  - Sempre valide os eventos SSE antes de formatar datas:
    `if (!event || !event.created_at || Number.isNaN(Date.parse(event.created_at))) return;`

---

## 7. Estrutura das 3 Colunas Principais (Fidelidade Absoluta)

- **Coluna 1 (Rail):** `56px` fixos, fundo `#070d18`, logo símbolo 28px, ícones 18px, seletor de tema, avatar do CEO.
- **Coluna 2 (SubNav):** `212px` fixos, fundo `#0f1729`, wordmark TAVIR invertido 96px, categorias e subitens com ícones 15px, rodapé com status de conexões SQLite e MCP.
- **Coluna 3 (Main):** Header `52px` fixo (`var(--surface-0)`), breadcrumb semântico, pílula de status ao vivo, busca global `Ctrl K` e botão *Iniciar job* Lima, com área de conteúdo em scroll independente.
