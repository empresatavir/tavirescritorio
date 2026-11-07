const fs = require('fs');
const path = require('path');

const refHtmlPath = 'C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html';
const outDir = path.resolve(__dirname, '../dist/renderer');
const outHtmlPath = path.join(outDir, 'index.html');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Copia o arquivo canônico oficial com integridade total
fs.copyFileSync(refHtmlPath, outHtmlPath);

console.log('[TAVIR Build] Renderer canônico oficial copiado com sucesso para dist/renderer/index.html');
