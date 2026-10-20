# Guia de Sanitização de SVGs & Prevenção do Bug C2PA

## 1. O Problema: Metadados C2PA Ocultos em SVGs

Ferramentas modernas de design e bibliotecas web (ex: Figma com procedência ativada, geradores de ativos com IA ou sites de banco de ícones) exportam arquivos SVG contendo blocos `<metadata>` com manifestos C2PA (`<c2pa:manifest ...>`).

### Anatomia do Bug:
```xml
<!-- SVG TÓXICO: Causa quebra imediata de layout -->
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <metadata>
    <c2pa:manifest xmlns:c2pa="http://c2pa.org/manifest">
      eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmaWdtYS5jb20iLCJpYXQiOjE3... [8.000 caracteres base64]
    </c2pa:manifest>
  </metadata>
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
</svg>
```

Ao injetar esse SVG em contêineres HTML (via `innerHTML`, componentes de ícone ou `v-html`/`dangerouslySetInnerHTML`), o parser HTML do navegador trata a string base64 do `<metadata>` como um nó de texto visível.
- **Resultado:** O contêiner de 20px ou 24px expande para mais de 500px na horizontal, empurrando colunas adjacentes e destruindo a grade da aplicação.

---

## 2. Padrão Obrigatório de SVG Limpo

Todos os SVGs usados na aplicação devem seguir a estrutura canônica e enxuta:

```xml
<!-- SVG SANITIZADO E SEGURO -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
</svg>
```

### Regras de Sanitização:
1. Eliminar completamente a tag `<metadata>...</metadata>` e todo o seu conteúdo.
2. Eliminar atributos de procedência `xmlns:c2pa="..."` (mesmo sem bloco metadata).
3. Eliminar tags `<style>...</style>` embutidas que possam vazar escopo global.
4. Substituir larguras e alturas fixas (`width="24" height="24"`) por `width="100%" height="100%"` ou controlar via contêiner wrapper pai.
5. Preservar estritamente o atributo `viewBox="0 0 W H"`.

### Gate de lote (obrigatório ao adicionar assets)

O repositório já inclui o script — **não é item futuro**:

```bash
python scripts/clean_svgs.py
```

Ele varre `frontend/public` e `frontend/src`, remove `<metadata>` e `xmlns:c2pa`. Rode sempre que novos `.svg` entrarem no tree.

---

## 3. Função Defensiva em Componentes de Ícone (`toCssSize` e `sanitizeSvg`)

No código de componentes (ex: `TvIcon.tsx`), mantenha sempre as travas defensivas:

```typescript
// Normalizador estrito de unidade CSS: previne width: 18 sem 'px'
export function toCssSize(value: string | number | undefined, defaultSize = "16px"): string {
  if (value === undefined || value === null) return defaultSize;
  const str = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(str)) {
    return `${str}px`;
  }
  return str;
}

// Sanitizador defensivo em tempo de execução
export function sanitizeSvg(rawSvg: string): string {
  return rawSvg
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s*xmlns:c2pa="[^"]*"/gi, "")
    .replace(/<svg([^>]*?)\swidth="[^"]*"/i, '<svg$1 width="100%"')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/i, '<svg$1 height="100%"');
}
```

---

## 4. CSS Global de Proteção

No arquivo CSS global (`index.css`), certifique-se de que existam as regras de proteção:

```css
.tv-icon-wrapper,
[data-icon-wrapper] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  overflow: hidden;
  vertical-align: middle;
}

.tv-icon-wrapper svg {
  display: block;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
}

.tv-icon-wrapper metadata,
.tv-icon-wrapper style {
  display: none !important;
}
```
