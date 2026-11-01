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

  // Aguarda carregar e desempacotar
  await new Promise(r => setTimeout(r, 2500));

  const actualDir = path.resolve(__dirname, '../visual/actual');
  if (!fs.existsSync(actualDir)) fs.mkdirSync(actualDir, { recursive: true });

  const screensToCapture = [
    { name: 'sala_operacao', evalFn: "window.__app && window.__app.go && window.__app.go('room')" },
    { name: 'execucoes', evalFn: "window.__app && window.__app.go && window.__app.go('exec')" },
    { name: 'tasks_kanban', evalFn: "window.__app && window.__app.go && window.__app.go('tasks')" },
    { name: 'decisoes', evalFn: "window.__app && window.__app.go && window.__app.go('decisions')" },
    { name: 'fabrica', evalFn: "window.__app && window.__app.go && window.__app.go('fabrica')" },
    { name: 'studio', evalFn: "window.__app && window.__app.go && window.__app.go('studio')" },
    { name: 'raiox', evalFn: "window.__app && window.__app.go && window.__app.go('raiox')" }
  ];

  for (const sc of screensToCapture) {
    try {
      await win.webContents.executeJavaScript(sc.evalFn);
      await new Promise(r => setTimeout(r, 800));
      const img = await win.webContents.capturePage();
      const p = path.join(actualDir, `${sc.name}.png`);
      fs.writeFileSync(p, img.toPNG());
      console.log(`[CAPTURA OK] ${sc.name} -> ${p} (${fs.statSync(p).size} bytes)`);
    } catch (e) {
      console.error(`Erro ao capturar ${sc.name}:`, e.message);
    }
  }

  app.quit();
});
