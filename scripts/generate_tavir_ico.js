const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.resolve(__dirname, '..');
const assetsDir = path.join(projectDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Cria um HTML perfeito para renderizar o ícone em 256x256
const svgPath = path.join(projectDir, 'visual/extracted_bundle/227c1932-4195-4442-a2b3-2d71d172d289.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 256px;
    height: 256px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    overflow: hidden;
  }
  .icon-container {
    width: 240px;
    height: 240px;
    background: #0B1220;
    border-radius: 54px;
    border: 3px solid rgba(183, 243, 74, 0.4);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
  }
  .icon-container svg {
    width: 100%;
    height: 100%;
    display: block;
    filter: drop-shadow(0 2px 10px rgba(183, 243, 74, 0.3));
  }
</style>
</head>
<body>
  <div class="icon-container">
    ${svgContent}
  </div>
</body>
</html>`;

const tempHtml = path.join(projectDir, 'scripts/temp_icon.html');
fs.writeFileSync(tempHtml, htmlContent, 'utf8');

// 2. Renderiza o PNG com o Microsoft Edge headless
const pngOutput = path.join(assetsDir, 'tavir_icon_256.png');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const edgeCmd = `"${edgePath}" --headless --disable-gpu --force-device-scale-factor=1 --window-size=256,256 --screenshot="${pngOutput}" "file:///${tempHtml.replace(/\\/g, '/')}"`;

console.log('[TAVIR Icon] Renderizando ícone 256x256 com Edge headless...');
execSync(edgeCmd, { stdio: 'inherit' });

if (!fs.existsSync(pngOutput)) {
  throw new Error('Falha ao gerar PNG do ícone');
}
console.log('[TAVIR Icon] PNG gerado com sucesso:', pngOutput);

// 3. Converte PNG 256x256 para arquivo .ico válido da Microsoft
const pngBuffer = fs.readFileSync(pngOutput);

// Cabeçalho ICONDIR (6 bytes)
const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0); // Reservado
iconDir.writeUInt16LE(1, 2); // 1 = Ícone (.ICO)
iconDir.writeUInt16LE(1, 4); // Quantidade de imagens = 1

// Cabeçalho ICONDIRENTRY (16 bytes)
const iconEntry = Buffer.alloc(16);
iconEntry.writeUInt8(0, 0);  // Largura (0 = 256px)
iconEntry.writeUInt8(0, 1);  // Altura (0 = 256px)
iconEntry.writeUInt8(0, 2);  // Paleta (0 = true color)
iconEntry.writeUInt8(0, 3);  // Reservado
iconEntry.writeUInt16LE(1, 4);  // Color planes
iconEntry.writeUInt16LE(32, 6); // Bits por pixel (32 = RGBA)
iconEntry.writeUInt32LE(pngBuffer.length, 8); // Tamanho dos dados PNG
iconEntry.writeUInt32LE(22, 12); // Offset dos dados da imagem (6 + 16 = 22)

const icoBuffer = Buffer.concat([iconDir, iconEntry, pngBuffer]);

const icoPath = path.join(assetsDir, 'tavir.ico');
const rootIcoPath = path.join(projectDir, 'tavir.ico');

fs.writeFileSync(icoPath, icoBuffer);
fs.writeFileSync(rootIcoPath, icoBuffer);

console.log('[TAVIR Icon] Arquivo .ico gerado com sucesso em:');
console.log(' -', icoPath);
console.log(' -', rootIcoPath);
