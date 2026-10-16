# Regras de Engenharia do Workspace — TAVIR Escritório

1. **SVGs:** Nunca permita manifestos C2PA ou tags `<metadata>`. O `TvIcon.tsx` aplica `sanitizeSvg()` e CSS de isolamento.
2. **Ícones:** Sempre use `toCssSize(v)` para converter números em `"18px"`.
3. **Tailwind v4:** As utilitárias convivem com os tokens do Design System. O reset universal está em `@layer base` no `index.css`.
4. **Tema Híbrido:** Sempre use tokens semânticos (`var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`). Em modo claro, painéis estruturais permanecem Tinta Profunda (`#0B1220`).
5. **Servidores Vite:** O frontend roda na porta `5173`. Sempre mate processos órfãos com `parar_escritorio.bat` antes de iniciar para evitar desvio para a porta 5174.
6. **Scripts Batch Windows:** Todos os arquivos `.bat` DEVEM ter quebras de linha CRLF (`\r\n`) e UTF-8 (`chcp 65001`).
