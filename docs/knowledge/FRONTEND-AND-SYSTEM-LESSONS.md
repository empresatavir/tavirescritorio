# Consolidação de Lições Aprendidas & Base de Conhecimento — TAVIR Escritório

## Histórico do Incidente & Aprendizados Críticos

Este documento registra os diagnósticos, causas raízes e soluções definitivas implementadas no desenvolvimento da interface do TAVIR Escritório, servindo como consulta permanente para desenvolvedores e motores de Inteligência Artificial.

---

### Caso 1: Estouro de Layout por Metadados C2PA em SVGs

#### Sintoma
A interface apresentava blocos gigantescos de texto base64 (`AAAWgmp1bWIA...`) vazando no canto esquerdo da tela sobre a `Rail` e a `SubNav`. A navegação lateral esquerda desaparecia, transformando-se em um quadrado cinza esticado, e caminhos SVG (como setas verdes) se projetavam horizontalmente por todo o topo da página.

#### Causa Raiz
Arquivos vetoriais SVG baixados ou exportados continham internamente a tag:
```xml
<metadata>
  <c2pa:manifest>AAAWgmp1bWIAAAAeanVtZGMycGEAEQAQg...</c2pa:manifest>
</metadata>
```
Essa tag continha mais de **8.000 caracteres base64** de assinatura e procedência de imagem. Ao injetar o SVG no DOM via `span.innerHTML`, o parser HTML5 do navegador falhou em ignorar essa tag desconhecida, renderizando todos os 8.000 caracteres como texto plano legível. Esse texto contínuo sem quebras estourou a largura do contêiner e quebrou toda a grade CSS.

#### Solução Definitiva
1. **Limpeza em Massa:** Foi criado o script `scripts/clean_svgs.py` que removeu `<metadata>` e atributos `xmlns:c2pa` de todos os 144 SVGs do repositório.
2. **Defesa em Camadas no `TvIcon.tsx`:**
   ```typescript
   function sanitizeSvg(raw: string): string {
     return raw
       .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
       .replace(/<style[\s\S]*?<\/style>/gi, "")
       .replace(/<svg([^>]*?)\swidth="[^"]*"/i, '<svg$1 width="100%"')
       .replace(/<svg([^>]*?)\sheight="[^"]*"/i, '<svg$1 height="100%"');
   }
   ```
3. **Isolamento CSS Global (`index.css`):**
   ```css
   .tv-icon-wrapper {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     flex-shrink: 0;
     line-height: 0;
     overflow: hidden;
   }
   .tv-icon-wrapper svg {
     width: 100%;
     height: 100%;
     display: block;
     overflow: hidden;
     flex-shrink: 0;
   }
   metadata {
     display: none !important;
   }
   ```

---

### Caso 2: Ícones com Dimensões Sem Unidade (CSS Unitless Bug)

#### Sintoma
Ao passar propriedades como `width="18"` ou `height="15"`, os ícones não respeitavam o tamanho solicitado e ficavam gigantescos (300×300px) ou colapsavam.

#### Causa Raiz
Em HTML/CSS padrão, a declaração de estilo `width: 18` é inválida e descartada pelo navegador (ao contrário do atributo SVG `width="18"`).

#### Solução Definitiva
Adicionada a função auxiliar no componente:
```typescript
function toCssSize(v: string | number | undefined): string {
  if (v === undefined || v === "") return "1em";
  if (typeof v === "number") return `${v}px`;
  return /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
}
```

---

### Caso 3: Telas Sem Estilização por Falta de Compilador Tailwind

#### Sintoma
Ao navegar para telas como a `Sala de Operação`, todo o conteúdo aparecia como uma lista desformatada em texto preto sobre fundo escuro.

#### Causa Raiz
O código das telas utilizava classes utilitárias do Tailwind (`grid`, `flex`, `p-6`, `rounded-2xl`), mas a biblioteca não estava instalada nem integrada ao Vite no projeto frontend.

#### Solução Definitiva
1. Instalação do `@tailwindcss/vite` e `tailwindcss@^4`.
2. Inclusão do plugin no `vite.config.ts`.
3. Inclusão das camadas no `index.css`:
   ```css
   @layer theme, base, components, utilities;
   @import "tailwindcss/theme.css" layer(theme);
   @import "tailwindcss/utilities.css" layer(utilities);
   ```
4. Isolamento do reset universal em `@layer base` para não conflitar com as classes utilitárias.

---

### Caso 4: Contraste no Tema Claro Híbrido

#### Sintoma
No tema claro (`data-theme="light"`), textos da Sala de Operação e cabeçalhos de propostas desapareciam ou ficavam com contraste insuficiente.

#### Causa Raiz
Classes estáticas como `text-[var(--cloud)]` forçavam a cor do texto para o tom claro `#F4F6F2`, que é idêntico ao fundo do tema claro.

#### Solução Definitiva
Substituição obrigatória por tokens semânticos reativos:
- `text-[var(--text-primary)]`
- `text-[var(--text-secondary)]`
- `text-[var(--text-muted)]`

---

### Caso 5: Deriva de Portas do Vite (Port Drift 5173 -> 5174)

#### Sintoma
O desenvolvedor ou usuário atualizava o código, mas as mudanças não refletiam no navegador na porta 5173.

#### Causa Raiz
Um processo Vite anterior ainda estava ativo segurando a porta 5173. O novo comando iniciava silenciosamente na porta 5174.

#### Solução Definitiva
- Criados os utilitários `parar_escritorio.bat` e rotina de pré-checagem em `iniciar_escritorio.bat` para liberação forçada das portas 8000 e 5173.

---

### Caso 6: Formato de Quebra de Linha em Scripts Windows Batch

#### Sintoma
Scripts `.bat` falhavam com mensagens como `'nabledelayedexpansion' não é reconhecido` e `O sistema não pode encontrar o caminho especificado`.

#### Causa Raiz
Arquivos `.bat` salvos com formato Unix (`LF` puro). O interpretador `cmd.exe` do Windows exige quebras de linha nativas `CRLF` (`\r\n`).

#### Solução Definitiva
- Todos os arquivos batch do projeto são estritamente formatados em `CRLF` e codificados em `UTF-8` com `chcp 65001`.
