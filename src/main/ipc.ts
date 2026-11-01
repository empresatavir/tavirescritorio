import { ipcMain, BrowserWindow, app } from 'electron';
import { carregarDb, salvarDb } from './db';
import { engineHub } from './drivers/engineHub';
import { criarWorktree, removerWorktree } from './gitFlow';
import { VaultIndexer } from './indexer';
import type { EngineKind, TaskItem, EngineSettings, RunEvent, JobItem } from '../shared/types';

export function registrarIpcHandlers(win: BrowserWindow): void {
  // App
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:minimize', () => win.minimize());
  ipcMain.handle('app:maximize', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('app:close', () => win.close());

  // Session
  ipcMain.handle('session:getState', () => {
    const db = carregarDb();
    return db.session;
  });

  ipcMain.handle('session:login', (_e, key: string) => {
    const db = carregarDb();
    if (key.trim() === 'tavir-local-2024' || key.trim() === 'admin' || key.length >= 4) {
      db.session.authenticated = true;
      db.session.expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      salvarDb(db);
      return { success: true };
    }
    return { success: false, message: 'Chave de acesso inválida' };
  });

  ipcMain.handle('session:logout', () => {
    const db = carregarDb();
    db.session.authenticated = false;
    db.session.expiresAt = null;
    salvarDb(db);
  });

  ipcMain.handle('session:completeOnboarding', () => {
    const db = carregarDb();
    db.session.onboardingCompleted = true;
    salvarDb(db);
  });

  ipcMain.handle('session:setTheme', (_e, theme: 'dark' | 'light') => {
    const db = carregarDb();
    db.session.theme = theme;
    salvarDb(db);
  });

  // Engines
  ipcMain.handle('engines:getSettings', () => {
    return engineHub.getSettings();
  });

  ipcMain.handle('engines:updateSettings', (_e, settings: Partial<EngineSettings>) => {
    engineHub.updateSettings(settings);
  });

  // Jobs
  ipcMain.handle('jobs:list', () => {
    const db = carregarDb();
    return db.jobs;
  });

  ipcMain.handle('jobs:start', async (_e, params: { title: string; engine: EngineKind; model: string; ceiling: number }) => {
    const db = carregarDb();
    const jobId = `job-${String(db.jobs.length + 1).padStart(3, '0')}`;
    
    // Cria worktree temporária isolada
    const wt = await criarWorktree(jobId);

    const newJob: JobItem = {
      id: jobId,
      title: params.title,
      who: 'Agente Executor',
      ini: 'AE',
      status: 'running',
      progress: 5,
      model: params.model,
      motor: params.engine,
      effort: 'equilibrado',
      task: '#99',
      cost: 0.1,
      ceiling: params.ceiling || 10,
      started: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tokens: '5k',
    };

    db.jobs.unshift(newJob);
    salvarDb(db);

    // Dispara a execução assíncrona no EngineHub
    engineHub.executeTask(
      {
        runId: jobId,
        taskTitle: params.title,
        workspacePath: wt.path,
        model: params.model,
        effort: 'equilibrado',
        systemPrompt: `# Tarefa ${jobId}: ${params.title}\nExecute com rigor e gere artefatos em artifacts/`,
      },
      params.engine,
      (evt: RunEvent) => {
        win.webContents.send('run:event', evt);
      },
    ).then((res) => {
      newJob.progress = 100;
      newJob.status = res.success ? 'completed' : 'failed';
      newJob.cost = res.costUsd;
      salvarDb(db);
    });

    return newJob;
  });

  ipcMain.handle('jobs:pause', (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'paused';
      salvarDb(db);
    }
  });

  ipcMain.handle('jobs:resume', (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'running';
      salvarDb(db);
    }
  });

  ipcMain.handle('jobs:cancel', async (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'failed';
      salvarDb(db);
      await removerWorktree(id);
    }
  });

  // Tasks
  ipcMain.handle('tasks:list', () => {
    const db = carregarDb();
    return db.tasks;
  });

  ipcMain.handle('tasks:create', (_e, params: { title: string; prio: string; sector: string }) => {
    const db = carregarDb();
    const seq = db.tasks.length + 10;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      seq,
      title: params.title,
      status: 'to_plan',
      who: 'Paula PM',
      ini: 'PP',
      prio: params.prio as any,
      sector: params.sector,
      planning: true
    };
    db.tasks.unshift(newTask);
    salvarDb(db);
    return newTask;
  });

  ipcMain.handle('tasks:updateStatus', (_e, id: string, status: TaskItem['status']) => {
    const db = carregarDb();
    const t = db.tasks.find((x) => x.id === id);
    if (t) {
      t.status = status;
      salvarDb(db);
    }
  });

  // Approvals
  ipcMain.handle('approvals:list', () => {
    const db = carregarDb();
    return db.approvals;
  });

  ipcMain.handle('approvals:decide', (_e, id: string, decision: 'approved' | 'rejected', comment?: string) => {
    const db = carregarDb();
    const ap = db.approvals.find((x) => x.id === id);
    if (ap) {
      ap.status = decision;
      ap.decidedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      salvarDb(db);
    }
  });

  // Vault Indexer
  const vaultIndexer = new VaultIndexer();
  vaultIndexer.indexAll();

  ipcMain.handle('vault:list', () => {
    return vaultIndexer.search('');
  });

  ipcMain.handle('vault:search', (_e, query: string) => {
    return vaultIndexer.search(query);
  });
}

