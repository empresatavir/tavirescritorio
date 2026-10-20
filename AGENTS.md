# Diretrizes Universais de Engenharia & Conhecimento Consolidado — TAVIR Escritório

Este arquivo é a fonte primária de conhecimento operacional e regras técnicas para **QUALQUER motor de IA** (Cline, Claude, Gemini, Copilot, ChatGPT ou agentes autônomos) atuando no repositório `tavirescritorio`. O **Cline** é o agente de desenvolvimento padrão deste projeto.

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

## 5. Gerenciamento de Processos e Portas no Windows (Port Drift)

- **Causa Raiz:** Iniciar o Vite ou FastAPI sem encerrar a instância anterior faz o serviço subir em porta alternativa, enquanto o usuário e o navegador continuam apontando para a porta oficial, gerando diagnósticos falsos de bugs já corrigidos.
- **Diretriz Obrigatória:**
  1. As portas oficiais são **9001** (FastAPI) e **9002** (Vite). Não utilize 8000 ou 5173 em documentação, scripts ou configurações (exceto `.claude/launch.json`, que é imutável).
  2. Utilize sempre os scripts batch padronizados na raiz:
     - `iniciar_escritorio.bat` (ou `run.bat`): inicialização inteligente com checagem de portas e saúde.
     - `parar_escritorio.bat`: encerra com segurança processos nas portas 9001 e 9002 via PowerShell.
     - `testar_escritorio.bat`: roda pytest (backend) e `npm run build` (frontend).
  3. Scripts batch no Windows DEVEM possuir quebras de linha `CRLF` (`\r\n`) e cabeçalho `chcp 65001 >nul` (UTF-8). Salvar `.bat` com `LF` puro corrompe o parser do `cmd.exe`.

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

---

## 8. Fluxo Operacional de Execução de Comandos (Workaround Terminal Sandbox)

> [!IMPORTANT]
> O terminal sandbox do Cline (`u_run_commands`) **não captura saída direta** de comandos — sempre retorna `"Command completion could not be observed"` com `success: false`, mesmo quando o comando executa corretamente. Este é o fluxo obrigatório para qualquer execução de git, testes, builds ou scripts.

- **Causa Raiz:** O shell POSIX integrado ao sandbox não consegue observar a conclusão de processos foreground no Windows, tornando impossível confiar no `tool_result` direto de `u_run_commands`.
- **Diretriz Obrigatória:**
  1. **NUNCA** confie no campo `success` ou `result` retornado por `u_run_commands` para determinar se um comando funcionou.
  2. **SEMPRE** redirecione a saída para `cline_log.txt` usando sintaxe bash/POSIX:
     ```bash
     cd "/c/Users/carlo/Downloads/Projetos a Estudar/tavirescritorio" && {
       echo "=== INICIO: $(date) ==="
       # seus comandos aqui
       echo "=== CONCLUIDO ==="
     } > cline_log.txt 2>&1
     ```
  3. Após executar via `u_run_commands` (ignorando o erro de observação), **SEMPRE** leia `cline_log.txt` via `u_read_files` para obter o resultado real.
  4. **NÃO use** `cmd.exe /c`, `cd /d`, `chcp` ou qualquer sintaxe nativa do Windows — o sandbox roda bash/POSIX mesmo em ambiente Windows.
  5. O script modelo `executar_git.sh` na raiz do projeto serve como template editável para execuções complexas.
  6. Para comandos simples, execute diretamente em bash com redirecionamento inline, sem necessidade de editar arquivo.
