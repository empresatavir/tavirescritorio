import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'node:path';
import { registrarIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
const isDev = process.argv.includes('--dev');

function criarJanela(): void {
  // Remove o menu de aplicação padrão do Electron (File, Edit, View, Window)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 640,
    title: 'TAVIR Escritório',
    backgroundColor: '#0B1220',
    icon: join(__dirname, '../../assets/tavir.ico'),
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.setMenu(null);

  // Mantém os atalhos de recarga (Ctrl+R, Ctrl+Shift+R, F5) e DevTools (Ctrl+Shift+I) funcionando mesmo sem menu bar
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrlOrCmd = input.control || input.meta;
    const key = input.key.toLowerCase();
    if ((ctrlOrCmd && key === 'r' && !input.shift) || input.key === 'F5') {
      event.preventDefault();
      mainWindow?.webContents.reload();
    } else if (ctrlOrCmd && input.shift && key === 'r') {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
    } else if (ctrlOrCmd && input.shift && key === 'i') {
      event.preventDefault();
      mainWindow?.webContents.toggleDevTools();
    }
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
  // Fila na nuvem: tarefas do APK entram no Kanban do Escritório (só com o card do Supabase preenchido).
  void import('./officeCloud').then((m) => m.startDeskCloud()).catch((err) => console.error('[nuvem] não ligou:', err));
  // Fila de execução das tarefas do Kanban (uma por vez). Recupera o que ficou rodando quando o app fechou.
  void import('./officeExec').then((m) => m.startExecQueue()).catch((err) => console.error('[fila] não ligou:', err));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela();
    }
  });
});

app.on('before-quit', () => {
  void import('./officeCloud').then((m) => m.stopDeskCloud()).catch(() => {});
  void import('./officeExec').then((m) => m.stopExecQueue()).catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
