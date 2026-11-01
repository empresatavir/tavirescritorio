import { contextBridge, ipcRenderer } from 'electron';
import type { TavirApi, RunEvent, EngineSettings, TaskItem } from '../shared/types';

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
  },
  jobs: {
    list: () => ipcRenderer.invoke('jobs:list'),
    start: (params) => ipcRenderer.invoke('jobs:start', params),
    pause: (id: string) => ipcRenderer.invoke('jobs:pause', id),
    resume: (id: string) => ipcRenderer.invoke('jobs:resume', id),
    cancel: (id: string) => ipcRenderer.invoke('jobs:cancel', id),
  },
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (params: { title: string; prio: string; sector: string }) => ipcRenderer.invoke('tasks:create', params),
    updateStatus: (id: string, status: TaskItem['status']) => ipcRenderer.invoke('tasks:updateStatus', id, status),
  },
  approvals: {
    list: () => ipcRenderer.invoke('approvals:list'),
    decide: (id: string, decision: 'approved' | 'rejected', comment?: string) =>
      ipcRenderer.invoke('approvals:decide', id, decision, comment),
  },
  vault: {
    search: (query: string) => ipcRenderer.invoke('vault:search', query),
    list: () => ipcRenderer.invoke('vault:list'),
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
