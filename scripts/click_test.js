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
      contextIsolation: false,
      sandbox: false,
      webSecurity: false
    }
  });

  const htmlPath = path.resolve(__dirname, '../dist/renderer/index.html');
  await win.loadFile(htmlPath);
  await new Promise(r => setTimeout(r, 2500));

  const actualDir = path.resolve(__dirname, '../visual/actual');

  // 1. Clica em Execuções
  await win.webContents.executeJavaScript(`
    const navs = Array.from(document.querySelectorAll('.nav-item'));
    const b = navs.find(x => x.textContent.includes('Execuções'));
    if (b) b.click();
  `);
  await new Promise(r => setTimeout(r, 800));
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(actualDir, 'execucoes_clicado.png'), img.toPNG());
  console.log('Capturado execucoes_clicado.png');

  // 2. Clica em Tasks
  await win.webContents.executeJavaScript(`
    const navs = Array.from(document.querySelectorAll('.nav-item'));
    const b = navs.find(x => x.textContent.includes('Tasks'));
    if (b) b.click();
  `);
  await new Promise(r => setTimeout(r, 800));
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(actualDir, 'tasks_clicado.png'), img.toPNG());
  console.log('Capturado tasks_clicado.png');

  // 3. Clica em Decisões
  await win.webContents.executeJavaScript(`
    const navs = Array.from(document.querySelectorAll('.nav-item'));
    const b = navs.find(x => x.textContent.includes('Decisões'));
    if (b) b.click();
  `);
  await new Promise(r => setTimeout(r, 800));
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(actualDir, 'decisoes_clicado.png'), img.toPNG());
  console.log('Capturado decisoes_clicado.png');

  // 4. Clica no Rail Módulos
  await win.webContents.executeJavaScript(`
    const rails = Array.from(document.querySelectorAll('.rail-btn'));
    if (rails[1]) rails[1].click(); // Módulos
  `);
  await new Promise(r => setTimeout(r, 800));
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(actualDir, 'modulos_clicado.png'), img.toPNG());
  console.log('Capturado modulos_clicado.png');

  app.quit();
});
