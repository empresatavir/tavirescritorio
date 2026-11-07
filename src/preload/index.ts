import { contextBridge, ipcRenderer } from 'electron';
import type { TavirApi, RunEvent, EngineSettings, TaskItem } from '../shared/types';

let cachedVaultIndexer: any = null;
function getLocalVaultIndexer() {
  if (!cachedVaultIndexer) {
    const { VaultIndexer } = require('../main/indexer');
    cachedVaultIndexer = new VaultIndexer(process.cwd());
    cachedVaultIndexer.indexAll();
  }
  return cachedVaultIndexer;
}

const api: TavirApi = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
  },
  session: {
    getState: () => ipcRenderer.invoke('session:getState'),
    login: (key: string) => ipcRenderer.invoke('session:login', key),
    logout: () => ipcRenderer.invoke('session:logout'),
    completeOnboarding: () => ipcRenderer.invoke('session:completeOnboarding'),
    setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('session:setTheme', theme),
  },
  engines: {
    getSettings: () => ipcRenderer.invoke('engines:getSettings'),
    updateSettings: (settings: Partial<EngineSettings>) => ipcRenderer.invoke('engines:updateSettings', settings),
    getCatalog: () => ipcRenderer.invoke('engines:getCatalog'),
    detect: () =>
      ipcRenderer.invoke('engines:detect').catch(() => {
        const os = require('node:os');
        const pathMod = require('node:path');
        const home = os.homedir();
        return [
          { id: 'cursor', name: 'Cursor', installed: true, sdk: true, loggedIn: false, hasKey: false, path: pathMod.join(home, '.cursor'), detail: 'Detecção indisponível' },
          { id: 'claude', name: 'Claude', installed: true, sdk: true, loggedIn: false, hasKey: false, path: pathMod.join(home, '.claude'), detail: 'Detecção indisponível' },
          { id: 'codex', name: 'Codex', installed: true, sdk: true, loggedIn: false, hasKey: false, path: pathMod.join(home, '.codex'), detail: 'Detecção indisponível' },
          { id: 'antigravity', name: 'Antigravity', installed: true, sdk: true, loggedIn: false, hasKey: false, path: pathMod.join(home, '.gemini', 'antigravity'), detail: 'Detecção indisponível' },
        ];
      }),
    login: (engineId: string) => ipcRenderer.invoke('engines:login', engineId),
    saveKey: (payload: { engineId: string; apiKey?: string; baseUrl?: string }) =>
      ipcRenderer.invoke('engines:saveKey', payload),
    keyStatus: (engineId?: string) => ipcRenderer.invoke('engines:keyStatus', engineId),
  },
  jobs: {
    list: () => ipcRenderer.invoke('jobs:list'),
    start: (params) => ipcRenderer.invoke('jobs:start', params),
    pause: (id: string) => ipcRenderer.invoke('jobs:pause', id),
    resume: (id: string) => ipcRenderer.invoke('jobs:resume', id),
    cancel: (id: string) => ipcRenderer.invoke('jobs:cancel', id),
    logs: () => ipcRenderer.invoke('jobs:logs').catch(() => ({})),
  },
  tasks: {
    list: () => {
      try {
        const { listTaskRecords } = require('../main/project-fs');
        return Promise.resolve(listTaskRecords());
      } catch {
        return ipcRenderer.invoke('tasks:list');
      }
    },
    create: (params: { title: string; desc?: string; prio: string; sector: string; who?: string; status?: string }) => {
      try {
        const { createTaskRecord } = require('../main/project-fs');
        return Promise.resolve(createTaskRecord(params));
      } catch {
        return ipcRenderer.invoke('tasks:create', params);
      }
    },
    updateStatus: (id: string, status: TaskItem['status']) => {
      try {
        const { updateTaskRecord } = require('../main/project-fs');
        return Promise.resolve(updateTaskRecord(id, { status }));
      } catch {
        return ipcRenderer.invoke('tasks:updateStatus', id, status);
      }
    },
    update: (id: string, patch: any) =>
      ipcRenderer.invoke('tasks:update', id, patch).catch(() => {
        const { updateTaskRecord } = require('../main/project-fs');
        return updateTaskRecord(id, patch);
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('tasks:delete', id).catch(() => {
        const { deleteTaskRecord } = require('../main/project-fs');
        return deleteTaskRecord(id);
      }),
  },
  approvals: {
    list: () => ipcRenderer.invoke('approvals:list'),
    decide: (id: string, decision: 'approved' | 'rejected', comment?: string) =>
      ipcRenderer.invoke('approvals:decide', id, decision, comment),
  },
  proposals: {
    list: () => ipcRenderer.invoke('proposals:list'),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (params) =>
      ipcRenderer.invoke('projects:create', params).catch(() => {
        const { createOrAbsorbProjectRecord } = require('../main/project-fs');
        return createOrAbsorbProjectRecord(params);
      }),
    updateStatus: (id: string, status: string) =>
      ipcRenderer.invoke('projects:updateStatus', id, status).catch(() => {
        try {
          const { DatabaseSync } = require('node:sqlite');
          const pathMod = require('node:path');
          const sqlite = new DatabaseSync(pathMod.join(process.cwd(), 'backend', 'tavir.db'));
          sqlite.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id);
          sqlite.close();
          return { ok: true, status };
        } catch {
          return { ok: false, status };
        }
      }),
    delete: (id: string, deleteFiles: boolean = false, localPath?: string) => {
      if (deleteFiles) {
        try {
          const { deleteProjectWithOptions } = require('../main/project-fs');
          return Promise.resolve(deleteProjectWithOptions(id, true, localPath));
        } catch {}
      }
      return ipcRenderer.invoke('projects:delete', id, deleteFiles, localPath).catch(() => {
        const { deleteProjectWithOptions } = require('../main/project-fs');
        return deleteProjectWithOptions(id, Boolean(deleteFiles), localPath);
      });
    },
    pickFolder: () =>
      ipcRenderer.invoke('projects:pickFolder').catch(() => {
        const { pickFolderViaPowerShell } = require('../main/project-fs');
        return pickFolderViaPowerShell();
      }),
    absorb: (params) =>
      ipcRenderer.invoke('projects:absorb', params).catch(() => {
        const { createOrAbsorbProjectRecord } = require('../main/project-fs');
        return createOrAbsorbProjectRecord(Object.assign({}, params, { absorb: true }));
      }),
    inspectFolder: (idOrPath: string) =>
      ipcRenderer.invoke('projects:inspectFolder', idOrPath).catch(() => {
        const { inspectProjectFolder } = require('../main/project-fs');
        return inspectProjectFolder(idOrPath);
      }),
    openInExplorer: (idOrPath: string) =>
      ipcRenderer.invoke('projects:openInExplorer', idOrPath).catch(() => {
        const { openProjectFolderInExplorer } = require('../main/project-fs');
        return openProjectFolderInExplorer(idOrPath);
      }),
    readFile: (filePath: string) =>
      ipcRenderer.invoke('projects:readFile', filePath).catch(() => {
        const { readProjectFileContent } = require('../main/project-fs');
        return readProjectFileContent(filePath);
      }),
    getChat: (idOrPath: string) =>
      ipcRenderer.invoke('projects:getChat', idOrPath).catch(() => {
        const { getProjectChatHistory } = require('../main/project-fs');
        return getProjectChatHistory(idOrPath);
      }),
    askIris: (params: any) =>
      ipcRenderer.invoke('projects:askIris', params).catch(async () => {
        const { askProjectIris } = require('../main/project-fs');
        return askProjectIris(params);
      }),
    getAlterationsControl: (idOrPath: string) =>
      ipcRenderer.invoke('projects:getAlterationsControl', idOrPath).catch(() => {
        const { getProjectAlterationsControl } = require('../main/project-fs');
        return getProjectAlterationsControl(idOrPath);
      }),
    setAlterationsOpen: (idOrPath: string, open: boolean) =>
      ipcRenderer.invoke('projects:setAlterationsOpen', idOrPath, open).catch(() => {
        const { setProjectAlterationsOpen } = require('../main/project-fs');
        return setProjectAlterationsOpen(idOrPath, open);
      }),
    clearAltTrackFault: (idOrPath: string) =>
      ipcRenderer.invoke('projects:clearAltTrackFault', idOrPath).catch(() => {
        const { clearProjectAltTrackFault } = require('../main/project-fs');
        return clearProjectAltTrackFault(idOrPath);
      }),
    advanceAltTrack: (idOrPath: string, fromStep?: number) =>
      ipcRenderer.invoke('projects:advanceAltTrack', idOrPath, fromStep).catch(() => {
        const { advanceProjectAltTrack } = require('../main/project-fs');
        return advanceProjectAltTrack(idOrPath, fromStep);
      }),
    closeAltTrackItem: (idOrPath: string, fromStep?: number) =>
      ipcRenderer.invoke('projects:closeAltTrackItem', idOrPath, fromStep).catch(() => {
        const { closeProjectAltTrackItem } = require('../main/project-fs');
        return closeProjectAltTrackItem(idOrPath, fromStep);
      }),
    startAltTrackCycle: (idOrPath: string) =>
      ipcRenderer.invoke('projects:startAltTrackCycle', idOrPath).catch(() => {
        const { startNewAltTrackCycle } = require('../main/project-fs');
        return startNewAltTrackCycle(idOrPath);
      }),
    saveAltTrackNote: (idOrPath: string, index: number, text: string) =>
      ipcRenderer.invoke('projects:saveAltTrackNote', idOrPath, index, text).catch(() => {
        const { saveProjectAltTrackNote } = require('../main/project-fs');
        return saveProjectAltTrackNote(idOrPath, index, text);
      }),
    setAltTrackStep: (idOrPath: string, step: number) =>
      ipcRenderer.invoke('projects:setAltTrackStep', idOrPath, step).catch(() => {
        const { setProjectAltTrackStep } = require('../main/project-fs');
        return setProjectAltTrackStep(idOrPath, step);
      }),
    setAltTrackAuto: (idOrPath: string, auto: boolean) =>
      ipcRenderer.invoke('projects:setAltTrackAuto', idOrPath, auto).catch(() => {
        const { setProjectAltTrackAuto } = require('../main/project-fs');
        return setProjectAltTrackAuto(idOrPath, auto);
      }),
    approveAltTrack: (idOrPath: string) =>
      ipcRenderer.invoke('projects:approveAltTrack', idOrPath).catch(() => {
        const { approveAltTrackGate } = require('../main/project-fs');
        return approveAltTrackGate(idOrPath);
      }),
    runAltTrack: (idOrPath: string, step?: number) =>
      ipcRenderer.invoke('projects:runAltTrack', idOrPath, step).catch(() => {
        const { executeAltTrackStep } = require('../main/project-fs');
        return executeAltTrackStep(idOrPath, undefined, step);
      }),
    runWithThinking: (params: any) =>
      ipcRenderer.invoke('projects:runWithThinking', params).catch(() => {
        const { runProjectStageWithThinking } = require('../main/project-fs');
        return runProjectStageWithThinking(params);
      }),
  },
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
  },
  vault: {
    search: (query: string) =>
      ipcRenderer.invoke('vault:search', query).catch(() => getLocalVaultIndexer().search(query)),
    list: () =>
      ipcRenderer.invoke('vault:list').catch(() => getLocalVaultIndexer().search('')),
    stats: () =>
      ipcRenderer.invoke('vault:stats').catch(() => getLocalVaultIndexer().getStats()),
    reindex: () =>
      ipcRenderer.invoke('vault:reindex').catch(() => {
        const idx = getLocalVaultIndexer();
        const items = idx.indexAll();
        return { stats: idx.getStats(), items: items.slice(0, 250) };
      }),
  },
  onEvent: (callback: (event: RunEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: RunEvent) => callback(event);
    ipcRenderer.on('run:event', handler);
    return () => {
      ipcRenderer.removeListener('run:event', handler);
    };
  },
};

contextBridge.exposeInMainWorld('tavir', api);
