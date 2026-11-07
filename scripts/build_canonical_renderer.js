const fs = require('fs');
const path = require('path');

const bundleDir = path.resolve(__dirname, '../visual/extracted_bundle');
let html = fs.readFileSync(path.resolve(__dirname, '../visual/redesenho_unpacked.html'), 'utf8');

// 1. Script runtime bef87346-0568-44cc-a6e6-c243dafdd029.js
const runtimeJs = fs.readFileSync(path.join(bundleDir, 'bef87346-0568-44cc-a6e6-c243dafdd029.js'), 'utf8');
html = html.replace(
  '<script src="bef87346-0568-44cc-a6e6-c243dafdd029"></script>',
  `<script>\n${runtimeJs}\n</script>`
);

// 2. Fonte WOFF2 f7e55672-3bd2-4fe0-b857-971c6fa7ba5b.woff2
const woff2Base64 = fs.readFileSync(path.join(bundleDir, 'f7e55672-3bd2-4fe0-b857-971c6fa7ba5b.woff2')).toString('base64');
html = html.replace(
  'url("f7e55672-3bd2-4fe0-b857-971c6fa7ba5b")',
  `url("data:font/woff2;base64,${woff2Base64}")`
);

// 3. Logo Símbolo SVG 227c1932-4195-4442-a2b3-2d71d172d289.svg
const symbolSvgBase64 = fs.readFileSync(path.join(bundleDir, '227c1932-4195-4442-a2b3-2d71d172d289.svg')).toString('base64');
html = html.replaceAll(
  '227c1932-4195-4442-a2b3-2d71d172d289',
  `data:image/svg+xml;base64,${symbolSvgBase64}`
);

// 4. Logo Wordmark SVG 27c91494-3a2e-4981-a469-9c0c80f72d77.svg
const wordmarkSvgBase64 = fs.readFileSync(path.join(bundleDir, '27c91494-3a2e-4981-a469-9c0c80f72d77.svg')).toString('base64');
html = html.replaceAll(
  '27c91494-3a2e-4981-a469-9c0c80f72d77',
  `data:image/svg+xml;base64,${wordmarkSvgBase64}`
);

// 5. Integração com a ponte Electron window.tavir
const electronBridge = `
<script>
  // Bridge para o ecossistema Desktop TAVIR (IPC Electron)
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[TAVIR Desktop] Renderer inicializado com fidelidade canônica.');
    if (window.tavir) {
      console.log('[TAVIR Desktop] window.tavir disponível:', Object.keys(window.tavir));
    }
  });
</script>
`;

html = html.replace('</body>', `${electronBridge}\n</body>`);

// Salva em dist/renderer/index.html
const outDir = path.resolve(__dirname, '../dist/renderer');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

console.log('Bundle canônico inlined gerado com sucesso em dist/renderer/index.html!');
console.log('Tamanho total:', (html.length / 1024).toFixed(1), 'KB');
