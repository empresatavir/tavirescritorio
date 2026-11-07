const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: '#0B1220',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false // Permite desempacotar blob URLs locais do bundle
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Browser Console ${level}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error(`[Load Error] ${code} - ${desc} on ${url}`);
  });

  const htmlPath = path.resolve(__dirname, '../dist/renderer/index.html');
  console.log('Carregando:', htmlPath);
  await win.loadFile(htmlPath);

  // Aguarda 3 segundos para desempacotar os assets e renderizar
  await new Promise(r => setTimeout(r, 3500));

  const actualDir = path.resolve(__dirname, '../visual/actual');
  if (!fs.existsSync(actualDir)) fs.mkdirSync(actualDir, { recursive: true });

  const image = await win.webContents.capturePage();
  const pngPath = path.join(actualDir, 'electron_capture.png');
  fs.writeFileSync(pngPath, image.toPNG());
  console.log('Screenshot capturado com sucesso em:', pngPath, 'tamanho:', fs.statSync(pngPath).size, 'bytes');

  app.quit();
});
