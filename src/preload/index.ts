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
  // Fábrica: tudo passa pelo main. Sem fallback que rode project-fs dentro do preload —
  // dois processos escrevendo no mesmo banco e no mesmo control.json davam estado divergente.
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (params) => ipcRenderer.invoke('projects:create', params),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('projects:updateStatus', id, status),
    delete: (id: string, deleteFiles: boolean = false, localPath?: string) =>
      ipcRenderer.invoke('projects:delete', id, deleteFiles, localPath),
    pickFolder: () => ipcRenderer.invoke('projects:pickFolder'),
    absorb: (params) => ipcRenderer.invoke('projects:absorb', params),
    survey: (idOrPath: string) => ipcRenderer.invoke('projects:survey', idOrPath),
    inspectFolder: (idOrPath: string) => ipcRenderer.invoke('projects:inspectFolder', idOrPath),
    openInExplorer: (idOrPath: string) => ipcRenderer.invoke('projects:openInExplorer', idOrPath),
    readFile: (filePath: string) => ipcRenderer.invoke('projects:readFile', filePath),
    getChat: (idOrPath: string) => ipcRenderer.invoke('projects:getChat', idOrPath),
    askIris: (params: any) => ipcRenderer.invoke('projects:askIris', params),
    getAlterationsControl: (idOrPath: string) => ipcRenderer.invoke('projects:getAlterationsControl', idOrPath),
    setAlterationsOpen: (idOrPath: string, open: boolean) => ipcRenderer.invoke('projects:setAlterationsOpen', idOrPath, open),
    clearAltTrackFault: (idOrPath: string) => ipcRenderer.invoke('projects:clearAltTrackFault', idOrPath),
    advanceAltTrack: (idOrPath: string, fromStep?: number) => ipcRenderer.invoke('projects:advanceAltTrack', idOrPath, fromStep),
    closeAltTrackItem: (idOrPath: string, fromStep?: number) => ipcRenderer.invoke('projects:closeAltTrackItem', idOrPath, fromStep),
    startAltTrackCycle: (idOrPath: string) => ipcRenderer.invoke('projects:startAltTrackCycle', idOrPath),
    saveAltTrackNote: (idOrPath: string, index: number, text: string) =>
      ipcRenderer.invoke('projects:saveAltTrackNote', idOrPath, index, text),
    setAltTrackStep: (idOrPath: string, step: number) => ipcRenderer.invoke('projects:setAltTrackStep', idOrPath, step),
    setAltTrackAuto: (idOrPath: string, auto: boolean) => ipcRenderer.invoke('projects:setAltTrackAuto', idOrPath, auto),
    approveAltTrack: (idOrPath: string, decision?: 'aprovado' | 'reprovado', note?: string) =>
      ipcRenderer.invoke('projects:approveAltTrack', idOrPath, decision, note),
    runAltTrack: (idOrPath: string, step?: number) => ipcRenderer.invoke('projects:runAltTrack', idOrPath, step),
    pauseAltTrack: (idOrPath: string) => ipcRenderer.invoke('projects:pauseAltTrack', idOrPath),
    getEsteira: (idOrPath: string, count?: number) => ipcRenderer.invoke('projects:getEsteira', idOrPath, count),
    saveEsteiraInstruction: (idOrPath: string, index: number, text: string) =>
      ipcRenderer.invoke('projects:saveEsteiraInstruction', idOrPath, index, text),
    setEsteiraAuto: (idOrPath: string, auto: boolean) => ipcRenderer.invoke('projects:setEsteiraAuto', idOrPath, auto),
    controlEsteira: (idOrPath: string, index: number, action: string) =>
      ipcRenderer.invoke('projects:controlEsteira', idOrPath, index, action),
    runEsteira: (idOrPath: string, index: number, stageName?: string, stageOwner?: string) =>
      ipcRenderer.invoke('projects:runEsteira', idOrPath, index, stageName, stageOwner),
    decideEsteira: (idOrPath: string, index: number, decision: 'aprovado' | 'reprovado', note?: string) =>
      ipcRenderer.invoke('projects:decideEsteira', idOrPath, index, decision, note),
    decisions: (idOrPath: string) => ipcRenderer.invoke('projects:decisions', idOrPath),
    setEngine: (idOrPath: string, choice: { engine?: string; model?: string; effort?: string }) =>
      ipcRenderer.invoke('projects:setEngine', idOrPath, choice),
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
  iris: {
    stop: (projectKey: string) => ipcRenderer.invoke('projects:stopIris', projectKey),
  },
  runs: {
    list: (idOrPath: string, limit?: number) => ipcRenderer.invoke('runs:list', idOrPath, limit),
    read: (idOrPath: string, runId: string) => ipcRenderer.invoke('runs:read', idOrPath, runId),
    openFolder: (idOrPath: string, runId?: string) => ipcRenderer.invoke('runs:openFolder', idOrPath, runId),
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
