import { ipcMain, BrowserWindow, app, dialog, shell } from 'electron';
import { carregarDb, salvarDb } from './db';
import { engineHub } from './drivers/engineHub';
import { criarWorktree, removerWorktree } from './gitFlow';
import { VaultIndexer } from './indexer';
import type { EngineKind, TaskItem, EngineSettings, RunEvent, JobItem } from '../shared/types';

/** Janela atual (dialogs). Atualizada a cada criarJanela. */
let mainWin: BrowserWindow | null = null;
let ipcRegistered = false;

function handle(channel: string, listener: (...args: any[]) => any): void {
  try {
    ipcMain.removeHandler(channel);
  } catch {
    /* ignore */
  }
  ipcMain.handle(channel, listener);
}

/** Botão Parar do chat da Íris: encerra o motor em curso de cada projeto. */
const irisKills = new Map<string, () => void>();

export function registrarIpcHandlers(win: BrowserWindow): void {
  mainWin = win;

  // Sempre re-registra via handle() (removeHandler + handle). Nunca retornar cedo:
  // se VaultIndexer/SQLite falhar no meio, um early-return deixaria canais
  // (projects:*, vault:*, engines:detect) sem handler para sempre.
  ipcRegistered = true;

  // App
  handle('app:getVersion', () => app.getVersion());
  handle('app:minimize', () => mainWin?.minimize());
  handle('app:maximize', () => {
    if (!mainWin) return;
    if (mainWin.isMaximized()) mainWin.unmaximize();
    else mainWin.maximize();
  });
  handle('app:close', () => mainWin?.close());

  // Session
  handle('session:getState', () => {
    const db = carregarDb();
    return db.session;
  });

  handle('session:login', (_e, key: string) => {
    const db = carregarDb();
    if (key.trim() === 'tavir-local-2024' || key.trim() === 'admin' || key.length >= 4) {
      db.session.authenticated = true;
      db.session.expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      salvarDb(db);
      return { success: true };
    }
    return { success: false, message: 'Chave de acesso inválida' };
  });

  handle('session:logout', () => {
    const db = carregarDb();
    db.session.authenticated = false;
    db.session.expiresAt = null;
    salvarDb(db);
  });

  handle('session:completeOnboarding', () => {
    const db = carregarDb();
    db.session.onboardingCompleted = true;
    salvarDb(db);
  });

  handle('session:setTheme', (_e, theme: 'dark' | 'light') => {
    const db = carregarDb();
    db.session.theme = theme;
    salvarDb(db);
  });

  // Engines
  handle('engines:getSettings', () => {
    return engineHub.getSettings();
  });

  handle('engines:updateSettings', (_e, settings: Partial<EngineSettings>) => {
    return engineHub.updateSettings(settings);
  });

  handle('engines:getCatalog', () => {
    return engineHub.getCatalog();
  });

  handle('engines:detect', async () => {
    const { motorAuthStatus } = await import('./motorAuth');
    const ids = ['cursor', 'claude', 'codex', 'antigravity'] as const;
    const rows = await Promise.all(ids.map((id) => motorAuthStatus(id)));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      installed: row.installed,
      sdk: row.installed,
      loggedIn: row.loggedIn,
      path: row.path,
      detail: row.detail,
      hasKey: row.hasKey,
    }));
  });

  handle('engines:login', async (_e, engineId: string) => {
    const { startMotorLogin } = await import('./motorAuth');
    const result = await startMotorLogin(engineId);
    if (result.url) {
      try {
        await shell.openExternal(result.url);
      } catch (err) {
        return {
          ...result,
          ok: false,
          error: String(err),
          message: result.message + ' (não consegui abrir o navegador automaticamente)',
        };
      }
    }
    return result;
  });

  handle('engines:saveKey', async (_e, payload: { engineId: string; apiKey?: string; baseUrl?: string }) => {
    const { saveMotorKey } = await import('./motorAuth');
    return saveMotorKey(payload?.engineId || '', payload?.apiKey || '', payload?.baseUrl);
  });

  handle('engines:keyStatus', async (_e, engineId?: string) => {
    const { motorHasKey, getMotorBaseUrl, normalizeMotorId } = await import('./motorAuth');
    if (engineId) {
      const id = normalizeMotorId(engineId);
      return { engine: id, hasKey: motorHasKey(id), baseUrl: getMotorBaseUrl(id) };
    }
    return (['cursor', 'claude', 'codex', 'antigravity'] as const).map((id) => ({
      engine: id,
      hasKey: motorHasKey(id),
      baseUrl: getMotorBaseUrl(id),
    }));
  });

  // Jobs
  handle('jobs:list', () => {
    const db = carregarDb();
    return db.jobs;
  });

  handle('jobs:logs', () => {
    try {
      const { listarLogsJobs } = require('./db');
      return listarLogsJobs();
    } catch {
      return {};
    }
  });

  handle('jobs:start', async (_e, params: { title: string; engine: EngineKind; model: string; ceiling: number }) => {
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

  handle('jobs:pause', (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'paused';
      salvarDb(db);
    }
  });

  handle('jobs:resume', (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'running';
      salvarDb(db);
    }
  });

  handle('jobs:cancel', async (_e, id: string) => {
    const db = carregarDb();
    const j = db.jobs.find((x) => x.id === id);
    if (j) {
      j.status = 'failed';
      salvarDb(db);
      await removerWorktree(id);
    }
  });

  // Tasks
  handle('tasks:list', () => {
    try {
      const { listTaskRecords } = require('./project-fs');
      return listTaskRecords();
    } catch {
      const db = carregarDb();
      return db.tasks;
    }
  });

  handle(
    'tasks:create',
    (
      _e,
      params: {
        title: string;
        desc?: string;
        prio: string;
        sector: string;
        who?: string;
        status?: string;
        project_id?: string;
      },
    ) => {
      try {
        const { createTaskRecord } = require('./project-fs');
        return createTaskRecord(params);
      } catch {
        const db = carregarDb();
        const seq = db.tasks.length + 10;
        const newTask: TaskItem & { project_id?: string } = {
          id: `task-${Date.now()}`,
          seq,
          title: params.title,
          status: 'to_plan',
          who: params.who || 'Paula PM',
          ini: 'PP',
          prio: params.prio as any,
          sector: params.sector,
          planning: true,
          project_id: params.project_id,
        };
        db.tasks.unshift(newTask);
        salvarDb(db);
        return newTask;
      }
    },
  );

  handle('tasks:updateStatus', (_e, id: string, status: TaskItem['status']) => {
    try {
      const { updateTaskRecord } = require('./project-fs');
      return updateTaskRecord(id, { status });
    } catch {
      const db = carregarDb();
      const t = db.tasks.find((x) => x.id === id);
      if (t) {
        t.status = status;
        salvarDb(db);
      }
      return { ok: true };
    }
  });

  handle('tasks:update', (_e, id: string, patch: any) => {
    try {
      const { updateTaskRecord } = require('./project-fs');
      return updateTaskRecord(id, patch);
    } catch {
      return { ok: false };
    }
  });

  handle('tasks:delete', (_e, id: string) => {
    try {
      const { deleteTaskRecord } = require('./project-fs');
      return deleteTaskRecord(id);
    } catch {
      return { ok: false };
    }
  });

  // Approvals
  handle('approvals:list', () => {
    const db = carregarDb();
    return db.approvals;
  });

  handle('approvals:decide', (_e, id: string, decision: 'approved' | 'rejected', comment?: string) => {
    const db = carregarDb();
    const ap = db.approvals.find((x) => x.id === id);
    if (ap) {
      ap.status = decision;
      ap.decidedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      salvarDb(db);
    }
  });

  // Vault Indexer — não pode abortar o restante dos handlers se falhar
  let vaultIndexer: VaultIndexer | null = null;
  try {
    vaultIndexer = new VaultIndexer();
    vaultIndexer.indexAll();
  } catch (err) {
    console.error('[TAVIR IPC] VaultIndexer indisponível na abertura:', err);
  }

  handle('vault:list', () => {
    if (!vaultIndexer) return [];
    return vaultIndexer.search('');
  });

  handle('vault:search', (_e, query: string) => {
    if (!vaultIndexer) return [];
    return vaultIndexer.search(query);
  });

  handle('vault:stats', () => {
    if (!vaultIndexer) {
      return {
        totalDocs: 0,
        byScope: {},
        byDomain: {},
        booksCount: 0,
        skillsCount: 0,
        projectsCount: 0,
        indexedAt: '',
        durationMs: 0,
      };
    }
    return vaultIndexer.getStats();
  });

  handle('vault:reindex', () => {
    try {
      if (!vaultIndexer) vaultIndexer = new VaultIndexer();
      const items = vaultIndexer.indexAll();
      return { stats: vaultIndexer.getStats(), items: items.slice(0, 250) };
    } catch (err) {
      console.error('[TAVIR IPC] vault:reindex falhou:', err);
      return { stats: null, items: [] };
    }
  });

  // Proposals
  handle('proposals:list', () => {
    try {
      const sqlite = new (require('node:sqlite').DatabaseSync)(require('node:path').join(process.cwd(), 'backend', 'tavir.db'));
      const rows = sqlite.prepare('SELECT id, num, client, stage, status, value FROM proposals').all();
      sqlite.close();
      return rows;
    } catch {
      return [];
    }
  });

  // Factory Projects (Esteiras)
  handle('projects:list', () => {
    try {
      const { purgeFixtureProjects } = require('./project-fs');
      purgeFixtureProjects();
      const { DatabaseSync } = require('node:sqlite');
      const pathMod = require('node:path');
      const sqlite = new DatabaseSync(pathMod.join(process.cwd(), 'backend', 'tavir.db'));
      const rows = sqlite
        .prepare(
          'SELECT id, slug, name, client, company, template_code, stages_done, total_stages, status, local_path, stack, description, files FROM projects ORDER BY created_at DESC',
        )
        .all();
      sqlite.close();
      return rows;
    } catch {
      return [];
    }
  });

  handle('projects:create', (_e, params: any) => {
    const { createOrAbsorbProjectRecord } = require('./project-fs');
    return createOrAbsorbProjectRecord(params);
  });
  handle('projects:absorb', (_e, params: any) => {
    const { createOrAbsorbProjectRecord } = require('./project-fs');
    return createOrAbsorbProjectRecord({ ...params, absorb: true });
  });
  handle('projects:survey', (_e, idOrPath: string) => {
    try {
      const { refreshProjectSurvey } = require('./project-fs');
      return refreshProjectSurvey(idOrPath);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:pickFolder', async () => {
    const opts: Electron.OpenDialogOptions = {
      title: 'Selecionar pasta do projeto existente (Product Lab · Absorção Isolada)',
      properties: ['openDirectory'],
    };
    const res = mainWin
      ? await dialog.showOpenDialog(mainWin, opts)
      : await dialog.showOpenDialog(opts);
    if (res.canceled || !res.filePaths.length) {
      return { canceled: true, path: null };
    }
    return { canceled: false, path: res.filePaths[0] };
  });

  handle('projects:updateStatus', (_e, id: string, status: string) => {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const pathMod = require('node:path');
      const sqlite = new DatabaseSync(pathMod.join(process.cwd(), 'backend', 'tavir.db'));
      sqlite
        .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, new Date().toISOString(), id);
      sqlite.close();
      return { ok: true, status };
    } catch (err) {
      console.error('[TAVIR IPC] Erro ao atualizar status do projeto:', err);
      return { ok: false, status };
    }
  });

  handle('projects:delete', (_e, id: string, deleteFiles: boolean = false, localPath?: string) => {
    try {
      const { deleteProjectWithOptions } = require('./project-fs');
      return deleteProjectWithOptions(id, Boolean(deleteFiles), localPath);
    } catch (err) {
      console.error('[TAVIR IPC] Erro ao excluir projeto:', err);
      return { ok: false, deletedFiles: false, path: null };
    }
  });

  handle('projects:inspectFolder', (_e, idOrPath: string) => {
    try {
      const { inspectProjectFolder } = require('./project-fs');
      return inspectProjectFolder(idOrPath);
    } catch (err) {
      console.error('[TAVIR IPC] Erro ao inspecionar pasta do projeto:', err);
      return { exists: false, tree: [] };
    }
  });

  // Livro de execuções (.tavir/runs) — leitura sem efeitos colaterais na pasta do projeto.
  const runsWorkspace = (idOrPath: string): string => {
    const { resolveProjectRecord } = require('./project-fs');
    return resolveProjectRecord(String(idOrPath || '')).local_path;
  };

  handle('runs:list', (_e, idOrPath: string, limit?: number) => {
    try {
      const { listRuns } = require('./runLedger');
      const workspace = runsWorkspace(idOrPath);
      return { ok: true, workspace, runs: listRuns(workspace, Number(limit) || 100) };
    } catch (err) {
      return { ok: false, error: String(err), runs: [] };
    }
  });

  handle('runs:read', (_e, idOrPath: string, runId: string) => {
    try {
      const { readRun } = require('./runLedger');
      return readRun(runsWorkspace(idOrPath), String(runId || ''));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('runs:openFolder', async (_e, idOrPath: string, runId?: string) => {
    try {
      const { runsRoot } = require('./runLedger');
      const root = runsRoot(runsWorkspace(idOrPath));
      const id = String(runId || '');
      const target = /^[0-9]{8}-[0-9]{6}-[a-z]+-[0-9a-f]{6}$/.test(id) ? require('node:path').join(root, id) : root;
      const error = await shell.openPath(target);
      return { ok: !error, error: error || undefined };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:openInExplorer', (_e, idOrPath: string) => {
    try {
      const { openProjectFolderInExplorer } = require('./project-fs');
      return openProjectFolderInExplorer(idOrPath);
    } catch (err) {
      console.error('[TAVIR IPC] Erro ao abrir Explorer:', err);
      return { ok: false };
    }
  });

  handle('projects:readFile', (_e, filePath: string) => {
    try {
      const { readProjectFileContent } = require('./project-fs');
      return readProjectFileContent(filePath);
    } catch (err) {
      return { ok: false, content: '', size: 0 };
    }
  });

  handle('projects:getChat', (_e, idOrPath: string) => {
    try {
      const { getProjectChatHistory } = require('./project-fs');
      return getProjectChatHistory(idOrPath);
    } catch (err) {
      return { ok: false, messages: [] };
    }
  });

  handle('projects:stopIris', (_e, projectKey: string) => {
    const kill = irisKills.get(String(projectKey || ''));
    if (!kill) return { ok: false };
    kill();
    return { ok: true };
  });

  handle('projects:askIris', async (_e, params: any) => {
    // Fala e atividade da Íris chegam ao chat enquanto o motor trabalha.
    const projectKey = String(params?.projectId || params?.projectPath || params?.projectName || '');
    const chatRunId = `chat-${Date.now()}`;
    let activity = '';
    let speech = '';
    const push = (type: RunEvent['type'], content: string) => {
      if (win.isDestroyed()) return;
      win.webContents.send('run:event', {
        runId: chatRunId,
        timestamp: new Date().toISOString(),
        type,
        content,
        meta: { chat: true, projectKey, activity },
      } satisfies RunEvent);
    };
    try {
      const { askProjectIris } = require('./project-fs');
      return await askProjectIris({
        ...params,
        onProgress: (line: string) => {
          if (line.startsWith('→ ')) activity = line.slice(2);
          else speech = line;
          push('thought', speech);
        },
        registerKill: (kill: () => void) => irisKills.set(projectKey, kill),
      });
    } catch (err) {
      console.error('[TAVIR IPC] askIris falhou:', err);
      return {
        ok: false,
        messages: [],
        replyMessage: {
          id: 'err-' + Date.now(),
          who: 'Íris',
          role: 'ag',
          engine: 'Cursor',
          ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          thoughts: ['[Erro] ' + String(err)],
          t: 'Não consegui completar a conversa com o agente agora. Tente de novo em instantes.',
        },
      };
    } finally {
      irisKills.delete(projectKey);
      push('done', '');
    }
  });

  handle('projects:getAlterationsControl', (_e, idOrPath: string) => {
    try {
      const { getProjectAlterationsControl } = require('./project-fs');
      return getProjectAlterationsControl(idOrPath);
    } catch (err) {
      return { ok: false, alterations_open: false, chat_unlocked: false, finished: false };
    }
  });

  handle('projects:setAlterationsOpen', (_e, idOrPath: string, open: boolean) => {
    try {
      const { setProjectAlterationsOpen } = require('./project-fs');
      return setProjectAlterationsOpen(idOrPath, Boolean(open));
    } catch (err) {
      return { ok: false, alterations_open: Boolean(open), chat_unlocked: false };
    }
  });

  handle('projects:clearAltTrackFault', (_e, idOrPath: string) => {
    try {
      const { clearProjectAltTrackFault } = require('./project-fs');
      return clearProjectAltTrackFault(idOrPath);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:advanceAltTrack', (_e, idOrPath: string, fromStep?: number) => {
    try {
      const { advanceProjectAltTrack } = require('./project-fs');
      const step = typeof fromStep === 'number' && Number.isFinite(fromStep) ? fromStep : undefined;
      return advanceProjectAltTrack(idOrPath, step);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:closeAltTrackItem', (_e, idOrPath: string, fromStep?: number) => {
    try {
      const { closeProjectAltTrackItem } = require('./project-fs');
      const step = typeof fromStep === 'number' && Number.isFinite(fromStep) ? fromStep : undefined;
      return closeProjectAltTrackItem(idOrPath, step);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:startAltTrackCycle', (_e, idOrPath: string) => {
    try {
      const { startNewAltTrackCycle } = require('./project-fs');
      return startNewAltTrackCycle(idOrPath);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:saveAltTrackNote', (_e, idOrPath: string, index: number, text: string) => {
    try {
      const { saveProjectAltTrackNote } = require('./project-fs');
      return saveProjectAltTrackNote(idOrPath, Number(index) || 0, String(text || ''));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:setAltTrackStep', (_e, idOrPath: string, step: number) => {
    try {
      const { setProjectAltTrackStep } = require('./project-fs');
      return setProjectAltTrackStep(idOrPath, Number(step) || 0);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:setAltTrackAuto', (_e, idOrPath: string, auto: boolean) => {
    try {
      const { setProjectAltTrackAuto } = require('./project-fs');
      return setProjectAltTrackAuto(idOrPath, Boolean(auto));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:approveAltTrack', (_e, idOrPath: string, decision?: string, note?: string) => {
    try {
      const { approveAltTrackGate } = require('./project-fs');
      return approveAltTrackGate(idOrPath, decision === 'reprovado' ? 'reprovado' : 'aprovado', String(note || ''));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:runAltTrack', async (e, idOrPath: string, stepOverride?: number) => {
    let jobId = '';
    let jobTitle = 'Trilho de alteração';
    const send = (evt: any) => {
      try {
        e.sender.send('run:event', evt);
      } catch {}
    };
    const stamp = () => new Date().toISOString();
    const { executeAltTrackStep } = require('./project-fs');
    const { abrirJobTrilho, atualizarJobTrilho, registrarEventoJob, registrarPassoCrescente } = require('./db');
    try {
      const step = typeof stepOverride === 'number' && Number.isFinite(stepOverride) ? stepOverride : undefined;
      const res = await executeAltTrackStep(idOrPath, {
        onStart(info: any) {
          const job = abrirJobTrilho(info);
          jobId = job.id;
          jobTitle = job.title;
          registrarEventoJob(jobId, 'inicio', `Iniciando ${info.focus} com ${info.owner} · ${info.motor}`, 'info');
          send({
            runId: jobId,
            timestamp: stamp(),
            type: 'thought',
            content: `Iniciando ${info.focus} · ${info.owner} · ${info.motor}`,
            meta: { track: true, status: 'running', progress: 12, title: jobTitle, projectName: info.projectName, focus: info.focus, owner: info.owner, motor: info.motor, model: info.model },
          });
        },
        onLine(text: string, level: 'info' | 'error') {
          if (jobId) registrarPassoCrescente(jobId, text, level);
          send({
            runId: jobId || 'trilho-local',
            timestamp: stamp(),
            type: level === 'error' ? 'error' : 'thought',
            content: text,
            meta: { track: true, status: level === 'error' ? 'failed' : 'running', progress: level === 'error' ? 100 : 60, title: jobTitle },
          });
        },
        onEnd(info: { ok: boolean; status: string; text: string }) {
          const status = info.status === 'failed' ? 'failed' : info.status === 'waiting' || info.status === 'paused' ? 'paused' : 'completed';
          if (jobId) {
            atualizarJobTrilho(jobId, status, info.ok ? '' : info.text);
            registrarEventoJob(jobId, 'fim', info.text, info.ok ? 'info' : 'error');
          }
          send({
            runId: jobId || 'trilho-local',
            timestamp: stamp(),
            type: info.ok ? 'done' : info.status === 'paused' ? 'thought' : 'error',
            content: info.text,
            meta: { track: true, status, progress: 100, title: jobTitle },
          });
        },
      }, step);
      if (res && res.error && !res.ok) {
        send({
          runId: jobId || 'trilho-local',
          timestamp: stamp(),
          type: 'error',
          content: String(res.error),
          meta: { track: true, status: 'failed', progress: 100, title: jobTitle, focus: 'Trilho', owner: 'Escritório' },
        });
      }
      return Object.assign({}, res, { jobId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jobId) atualizarJobTrilho(jobId, 'failed', message);
      send({
        runId: jobId || 'trilho-local',
        timestamp: stamp(),
        type: 'error',
        content: message,
        meta: { track: true, status: 'failed', progress: 100, title: jobTitle },
      });
      return { ok: false, error: message, jobId };
    }
  });

  handle('projects:pauseAltTrack', (_e, idOrPath: string) => {
    try {
      const { pauseProjectAltTrack } = require('./project-fs');
      return pauseProjectAltTrack(idOrPath);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:getEsteira', (_e, idOrPath: string, count?: number) => {
    try {
      const { getProjectEsteira } = require('./project-fs');
      return getProjectEsteira(idOrPath, Number(count) || 9);
    } catch (err) {
      return { ok: false, error: String(err), esteira: { auto: false, stages: [] } };
    }
  });

  handle('projects:saveEsteiraInstruction', (_e, idOrPath: string, index: number, text: string) => {
    try {
      const { saveEsteiraInstruction } = require('./project-fs');
      return saveEsteiraInstruction(idOrPath, index, text);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:setEsteiraAuto', (_e, idOrPath: string, auto: boolean) => {
    try {
      const { setEsteiraAuto } = require('./project-fs');
      return setEsteiraAuto(idOrPath, Boolean(auto));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:controlEsteira', (_e, idOrPath: string, index: number, action: string) => {
    try {
      const { controlEsteiraStage } = require('./project-fs');
      return controlEsteiraStage(idOrPath, index, action);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:runEsteira', async (_e, idOrPath: string, index: number, stageName: string, stageOwner: string) => {
    try {
      const { runEsteiraStage } = require('./project-fs');
      return await runEsteiraStage(idOrPath, index, stageName, stageOwner);
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:decideEsteira', (_e, idOrPath: string, index: number, decision: string, note?: string) => {
    try {
      const { decideEsteiraGate } = require('./project-fs');
      return decideEsteiraGate(idOrPath, Number(index) || 0, decision === 'reprovado' ? 'reprovado' : 'aprovado', String(note || ''));
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  handle('projects:decisions', (_e, idOrPath: string) => {
    try {
      const { listProjectDecisions } = require('./project-fs');
      return listProjectDecisions(idOrPath);
    } catch (err) {
      return { ok: false, error: String(err), decisions: [] };
    }
  });

  handle('projects:setEngine', (_e, idOrPath: string, choice: { engine?: string; model?: string; effort?: string }) => {
    try {
      const { setProjectEngine } = require('./project-fs');
      return setProjectEngine(idOrPath, choice || {});
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // Agents
  handle('agents:list', () => {
    try {
      const sqlite = new (require('node:sqlite').DatabaseSync)(require('node:path').join(process.cwd(), 'backend', 'tavir.db'));
      const rows = sqlite.prepare('SELECT id, name, role, sector, status, model_provider, total_jobs, total_cost FROM agents').all();
      sqlite.close();
      return rows;
    } catch {
      return [];
    }
  });
}

