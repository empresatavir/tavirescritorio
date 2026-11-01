import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registrarIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
const isDev = process.argv.includes('--dev');

function criarJanela(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 640,
    title: 'TAVIR Escritório',
    backgroundColor: '#0B1220',
    icon: join(__dirname, '../../assets/tavir.ico'),
    frame: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  registrarIpcHandlers(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5273');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Rede de segurança contra crashes não tratados
process.on('unhandledRejection', (reason) => {
  console.error('[TAVIR Process] Rejeição não tratada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[TAVIR Process] Exceção não tratada:', err);
});

app.whenReady().then(() => {
  criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
