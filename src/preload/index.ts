import { contextBridge, ipcRenderer } from 'electron';
import type { StudioEvent } from '../shared/studio';
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
    buildInfo: () => ipcRenderer.invoke('app:buildInfo'),
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
    altTrackPublishInfo: (idOrPath: string) => ipcRenderer.invoke('projects:altTrackPublishInfo', idOrPath),
    publishAltTrack: (idOrPath: string, accountId?: string) => ipcRenderer.invoke('projects:publishAltTrack', idOrPath, accountId),
    resolveAltTrackBranch: (idOrPath: string, choice: 'stash' | 'here') => ipcRenderer.invoke('projects:resolveAltTrackBranch', idOrPath, choice),
    setGitAccount: (idOrPath: string, accountId: string) => ipcRenderer.invoke('projects:setGitAccount', idOrPath, accountId),
    openAltTrackPr: (idOrPath: string) => ipcRenderer.invoke('projects:openAltTrackPr', idOrPath),
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
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (payload: { label: string; token: string }) => ipcRenderer.invoke('accounts:add', payload),
    remove: (id: string) => ipcRenderer.invoke('accounts:remove', id),
    setDefault: (id: string) => ipcRenderer.invoke('accounts:setDefault', id),
    test: (id: string) => ipcRenderer.invoke('accounts:test', id),
    openTokenPage: () => ipcRenderer.invoke('accounts:openTokenPage'),
  },
  creds: {
    list: () => ipcRenderer.invoke('creds:list'),
    save: (provider: string, token: string) => ipcRenderer.invoke('creds:save', provider, token),
    remove: (provider: string) => ipcRenderer.invoke('creds:remove', provider),
    test: (provider: string) => ipcRenderer.invoke('creds:test', provider),
    openTokenPage: (provider: string) => ipcRenderer.invoke('creds:openTokenPage', provider),
  },
  seg: {
    run: (idOrPath: string) => ipcRenderer.invoke('seg:run', idOrPath),
    list: (idOrPath: string) => ipcRenderer.invoke('seg:list', idOrPath),
    stop: (idOrPath: string) => ipcRenderer.invoke('seg:stop', idOrPath),
    accept: (idOrPath: string, fp: string, accept: boolean, note?: string, title?: string) => ipcRenderer.invoke('seg:accept', idOrPath, fp, accept, note, title),
    open: (idOrPath: string, runId: string, rel?: string) => ipcRenderer.invoke('seg:open', idOrPath, runId, rel),
  },
  qa: {
    run: (idOrPath: string) => ipcRenderer.invoke('qa:run', idOrPath),
    list: (idOrPath: string) => ipcRenderer.invoke('qa:list', idOrPath),
    stop: (idOrPath: string) => ipcRenderer.invoke('qa:stop', idOrPath),
    open: (idOrPath: string, runId: string, rel?: string) => ipcRenderer.invoke('qa:open', idOrPath, runId, rel),
  },
  runs: {
    list: (idOrPath: string, limit?: number) => ipcRenderer.invoke('runs:list', idOrPath, limit),
    read: (idOrPath: string, runId: string) => ipcRenderer.invoke('runs:read', idOrPath, runId),
    openFolder: (idOrPath: string, runId?: string) => ipcRenderer.invoke('runs:openFolder', idOrPath, runId),
  },
  studio: {
    perfis: {
      list: () => ipcRenderer.invoke('studio:perfis:list'),
      get: (id: string) => ipcRenderer.invoke('studio:perfis:get', id),
      save: (perfil) => ipcRenderer.invoke('studio:perfis:save', perfil),
      remove: (id: string) => ipcRenderer.invoke('studio:perfis:remove', id),
    },
    redes: {
      save: (perfilId: string, rede) => ipcRenderer.invoke('studio:redes:save', perfilId, rede),
      remove: (id: string) => ipcRenderer.invoke('studio:redes:remove', id),
    },
    pecas: {
      list: (filtro) => ipcRenderer.invoke('studio:pecas:list', filtro),
      get: (id: string) => ipcRenderer.invoke('studio:pecas:get', id),
      create: (input) => ipcRenderer.invoke('studio:pecas:create', input),
      update: (id: string, campos) => ipcRenderer.invoke('studio:pecas:update', id, campos),
      gate: (id: string, etapa, decisao, comentario) => ipcRenderer.invoke('studio:pecas:gate', id, etapa, decisao, comentario),
      advance: (id: string) => ipcRenderer.invoke('studio:pecas:advance', id),
      suggest: (id: string, alvo: 'angulos' | 'roteiro') => ipcRenderer.invoke('studio:pecas:suggest', id, alvo),
    },
    series: {
      list: (perfilId?: string) => ipcRenderer.invoke('studio:series:list', perfilId),
      save: (input) => ipcRenderer.invoke('studio:series:save', input),
    },
    preflight: () => ipcRenderer.invoke('studio:preflight'),
    render: {
      still: (id: string, frame?: number) => ipcRenderer.invoke('studio:render:still', id, frame),
      proxy: (id: string) => ipcRenderer.invoke('studio:render:proxy', id),
      final: (id: string) => ipcRenderer.invoke('studio:render:final', id),
      cancel: (id: string) => ipcRenderer.invoke('studio:render:cancel', id),
    },
    preview: {
      get: (pecaId: string, frame?: number, formatId?: string) => ipcRenderer.invoke('studio:preview:get', pecaId, frame, formatId),
    },
    revisao: {
      get: (pecaId: string) => ipcRenderer.invoke('studio:revisao:get', pecaId),
    },
    pacote: {
      build: (pecaId: string) => ipcRenderer.invoke('studio:pacote:build', pecaId),
      open: (pecaId: string) => ipcRenderer.invoke('studio:pacote:open', pecaId),
    },
    arte: {
      assign: (pecaId: string, index: number, source: string) => ipcRenderer.invoke('studio:arte:assign', pecaId, index, source),
    },
    prompts: {
      compile: (pecaId: string) => ipcRenderer.invoke('studio:prompts:compile', pecaId),
      list: (pecaId: string) => ipcRenderer.invoke('studio:prompts:list', pecaId),
      nota: (promptId: string, nota: 'funcionou' | 'nao' | null) => ipcRenderer.invoke('studio:prompts:nota', promptId, nota),
      export: (pecaId: string) => ipcRenderer.invoke('studio:prompts:export', pecaId),
      search: (perfilId: string, query: string) => ipcRenderer.invoke('studio:prompts:search', perfilId, query),
      polish: (promptId: string) => ipcRenderer.invoke('studio:prompts:polish', promptId),
    },
    inbox: {
      scan: () => ipcRenderer.invoke('studio:inbox:scan'),
      assign: (fileName: string, slotId: string) => ipcRenderer.invoke('studio:inbox:assign', fileName, slotId),
    },
    audio: {
      narrate: (pecaId: string, index?: number) => ipcRenderer.invoke('studio:audio:narrate', pecaId, index),
      clip: (pecaId: string, index: number) => ipcRenderer.invoke('studio:audio:clip', pecaId, index),
      word: (pecaId: string, index: number, text: string) => ipcRenderer.invoke('studio:audio:word', pecaId, index, text),
      whisper: (confirm: boolean) => ipcRenderer.invoke('studio:audio:whisper', confirm),
    },
    motion: {
      updateBase: () => ipcRenderer.invoke('studio:motion:updateBase'),
      downloadBrowser: (confirm: boolean) => ipcRenderer.invoke('studio:motion:downloadBrowser', confirm),
      ask: (input) => ipcRenderer.invoke('studio:motion:ask', input),
      gate: (jobId, decisao, comentario) => ipcRenderer.invoke('studio:motion:gate', jobId, decisao, comentario),
      latest: (perfilId) => ipcRenderer.invoke('studio:motion:latest', perfilId),
    },
    sidecars: {
      list: () => ipcRenderer.invoke('studio:sidecars:list'),
      start: (id) => ipcRenderer.invoke('studio:sidecars:start', id),
      stop: (id) => ipcRenderer.invoke('studio:sidecars:stop', id),
    },
    darkflow: {
      prepare: (pecaId) => ipcRenderer.invoke('studio:darkflow:prepare', pecaId),
      activate: (pecaId) => ipcRenderer.invoke('studio:darkflow:activate', pecaId),
      scorecard: () => ipcRenderer.invoke('studio:darkflow:scorecard'),
      board: () => ipcRenderer.invoke('studio:darkflow:board'),
    },
    docuflow: {
      send: (pecaId) => ipcRenderer.invoke('studio:docuflow:send', pecaId),
      board: () => ipcRenderer.invoke('studio:docuflow:board'),
      open: () => ipcRenderer.invoke('studio:docuflow:open'),
    },
  },
  onStudioEvent: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, event: StudioEvent) => callback(event);
    ipcRenderer.on('studio:event', handler);
    return () => ipcRenderer.removeListener('studio:event', handler);
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
