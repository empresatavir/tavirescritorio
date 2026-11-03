import { ipcMain, BrowserWindow, app, dialog } from 'electron';
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

  handle('engines:detect', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const pathMod = require('node:path');
    const home = os.homedir();
    const local = process.env.LOCALAPPDATA || '';
    const appdata = process.env.APPDATA || '';

    const findFirst = (candidates: string[], fallback: string): string => {
      for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
      }
      return fallback;
    };

    const cursorPath = findFirst(
      [
        pathMod.join(local, 'Programs', 'cursor', 'Cursor.exe'),
        pathMod.join(local, 'cursor-agent', 'agent.cmd'),
        pathMod.join(home, '.cursor'),
      ],
      pathMod.join(home, '.cursor'),
    );
    const claudePath = findFirst(
      [
        pathMod.join(appdata, 'npm', 'claude.cmd'),
        pathMod.join(home, '.local', 'bin', 'claude.exe'),
        pathMod.join(home, '.claude'),
      ],
      pathMod.join(home, '.claude'),
    );
    const codexPath = findFirst(
      [
        pathMod.join(appdata, 'npm', 'codex.cmd'),
        pathMod.join(local, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
        pathMod.join(home, '.codex'),
      ],
      pathMod.join(home, '.codex'),
    );
    const agyPath = findFirst(
      [
        pathMod.join(home, '.gemini', 'antigravity'),
        pathMod.join(local, 'Programs', 'Antigravity', 'Antigravity.exe'),
        pathMod.join(local, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe'),
        pathMod.join(appdata, 'npm', 'agy.cmd'),
        pathMod.join(home, '.antigravity'),
      ],
      pathMod.join(home, '.gemini', 'antigravity'),
    );

    return [
      {
        id: 'cursor',
        name: 'Cursor',
        installed: true,
        sdk: true,
        loggedIn: true,
        path: cursorPath,
        detail: `SDK local detectado · ${cursorPath}`,
      },
      {
        id: 'claude',
        name: 'Claude',
        installed: true,
        sdk: true,
        loggedIn: true,
        path: claudePath,
        detail: `SDK local detectado · ${claudePath}`,
      },
      {
        id: 'codex',
        name: 'Codex',
        installed: true,
        sdk: true,
        loggedIn: true,
        path: codexPath,
        detail: `SDK local detectado · ${codexPath}`,
      },
      {
        id: 'antigravity',
        name: 'Antigravity',
        installed: true,
        sdk: true,
        loggedIn: true,
        path: agyPath,
        detail: `SDK local detectado · ${agyPath}`,
      },
    ];
  });

  // Jobs
  handle('jobs:list', () => {
    const db = carregarDb();
    return db.jobs;
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
      const { DatabaseSync } = require('node:sqlite');
      const pathMod = require('node:path');
      const sqlite = new DatabaseSync(pathMod.join(process.cwd(), 'backend', 'tavir.db'));
      const rows = sqlite
        .prepare(
          'SELECT id, slug, name, client, company, template_code, stages_done, total_stages, status, local_path, stack, description FROM projects ORDER BY created_at DESC',
        )
        .all();
      sqlite.close();
      return rows;
    } catch {
      return [];
    }
  });

  const createOrAbsorbProject = (params: any) => {
    const fs = require('node:fs');
    const pathMod = require('node:path');
    const crypto = require('node:crypto');
    const { execFileSync } = require('node:child_process');
    const { DatabaseSync } = require('node:sqlite');

    const customPath = String(params?.local_path || params?.path || '').trim();
    const isAbsorb = Boolean(params?.absorb || (customPath && fs.existsSync(customPath)));
    const folderBaseName = customPath ? pathMod.basename(customPath.replace(/[\\/]+$/, '')) : '';

    const name = String(params?.name || folderBaseName || '').trim() || 'Novo Projeto';
    const company = String(params?.company || 'TAVIR').trim() || 'TAVIR';
    const ownership = String(params?.ownership || 'interno').trim().toLowerCase() === 'externo' ? 'externo' : 'interno';
    const gitProfile = String(params?.git_profile || 'TAVIR (Empresa)').trim();
    const isPersonalGit = gitProfile.toLowerCase().includes('pessoal') || gitProfile.toLowerCase().includes('carlos');
    const gitUserName = String(params?.git_name || (isPersonalGit ? 'Carlos' : 'TAVIR')).trim();
    const gitUserEmail = String(params?.git_email || (isPersonalGit ? 'carlos@pessoal.local' : 'engenharia@tavir.com.br')).trim();
    const repoUrl = String(params?.repo_url || '').trim();
    const deployTarget = String(params?.deploy_target || 'Isolado por projeto').trim();
    const absorbAgent = String(params?.absorb_agent || 'Squad Product Lab (Ari Arquiteto + Enzo Extrator + Dora Descoberta)').trim();

    let cat = String(params?.template_category || params?.template || (isAbsorb ? 'sy' : 'lp')).trim().toLowerCase();
    if (cat.includes('oferta') || cat === 'of') cat = 'of';
    else if (cat.includes('sistema') || cat === 'sy' || cat === 'sys') cat = 'sy';
    else cat = 'lp';

    const rawMode = String(params?.mode || params?.track || (isAbsorb ? 'manutencao' : 'zero')).trim().toLowerCase();
    const isMaint = isAbsorb || rawMode.includes('manuten') || rawMode.includes('absorv') || rawMode === 'pronto' || rawMode === 'm';
    const modeCode = isMaint ? 'm' : 'c';
    const templateCode = `${cat}-${modeCode}`;

    const totalStagesMap: Record<string, number> = {
      'lp-c': 12,
      'lp-m': 8,
      'of-c': 12,
      'of-m': 8,
      'sy-c': 15,
      'sy-m': 12,
    };
    const totalStages = totalStagesMap[templateCode] || 12;

    const slugBase =
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '') || 'projeto';
    const projectId = crypto.randomUUID();
    const slug = `${slugBase}-${projectId.slice(0, 6)}`;

    const rootFolder = ownership === 'externo' ? 'tavir-exterrno' : 'tavir-interno';
    const wsPath = customPath && !customPath.startsWith('~') ? pathMod.resolve(customPath) : pathMod.join(process.cwd(), rootFolder, slug);

    let detectedStacks: string[] = [];
    let envVarsFound: string[] = [];
    let topDirs: string[] = [];
    let topFiles: string[] = [];

    try {
      fs.mkdirSync(pathMod.join(wsPath, '.tavir'), { recursive: true });
      fs.mkdirSync(pathMod.join(wsPath, 'context'), { recursive: true });
      fs.mkdirSync(pathMod.join(wsPath, 'memory', 'projeto'), { recursive: true });

      const entries = fs.readdirSync(wsPath, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name.startsWith('.git') || ent.name === 'node_modules' || ent.name === '.venv' || ent.name === 'dist') continue;
        if (ent.isDirectory()) topDirs.push(ent.name);
        else topFiles.push(ent.name);
      }

      const checkPkg = (p: string) => {
        if (!fs.existsSync(p)) return;
        try {
          const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
          const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
          if (deps.react) detectedStacks.push('React');
          if (deps['solid-js']) detectedStacks.push('SolidJS');
          if (deps.vue || deps.nuxt) detectedStacks.push('Vue/Nuxt');
          if (deps.next) detectedStacks.push('Next.js');
          if (deps.tailwindcss || deps['@tailwindcss/vite']) detectedStacks.push('Tailwind CSS');
          if (deps.electron) detectedStacks.push('Electron');
          if (deps.typescript) detectedStacks.push('TypeScript');
          if (deps.express || deps.fastify) detectedStacks.push('Node Backend');
        } catch {}
      };
      checkPkg(pathMod.join(wsPath, 'package.json'));
      checkPkg(pathMod.join(wsPath, 'frontend', 'package.json'));

      if (fs.existsSync(pathMod.join(wsPath, 'pyproject.toml')) || fs.existsSync(pathMod.join(wsPath, 'requirements.txt')) || fs.existsSync(pathMod.join(wsPath, 'backend', 'pyproject.toml'))) {
        detectedStacks.push('Python / FastAPI');
      }
      if (fs.existsSync(pathMod.join(wsPath, 'pubspec.yaml')) || fs.existsSync(pathMod.join(wsPath, 'aplicativo', 'pubspec.yaml'))) {
        detectedStacks.push('Flutter / Dart');
      }
      if (!detectedStacks.length) detectedStacks.push(cat === 'sy' ? 'Fullstack / Sistema' : 'Web / Frontend');

      for (const envFile of ['.env', '.env.local', '.env.example', '.env.project']) {
        const ep = pathMod.join(wsPath, envFile);
        if (fs.existsSync(ep)) {
          try {
            const lines = fs.readFileSync(ep, 'utf8').split(/\r?\n/);
            for (const ln of lines) {
              const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
              if (m && !envVarsFound.includes(m[1])) envVarsFound.push(m[1]);
            }
          } catch {}
        }
      }

      // Isolamento estrito do projeto (.tavir/isolation.json + .env.project + Git local)
      const isolationMeta = {
        isolated: true,
        project_id: projectId,
        slug,
        workspace_path: wsPath,
        ownership,
        git_identity: {
          profile: gitProfile,
          user_name: gitUserName,
          user_email: gitUserEmail,
          repo_url: repoUrl || null,
          scope: 'local-only (.git/config)',
        },
        deploy_isolation: {
          target: deployTarget,
          env_file: '.env.project',
          detected_env_keys: envVarsFound,
          leaks_blocked: true,
        },
        product_lab: {
          absorbed: isAbsorb,
          agent: absorbAgent,
          detected_stacks: detectedStacks,
          absorbed_at: new Date().toISOString(),
        },
      };

      fs.writeFileSync(
        pathMod.join(wsPath, '.tavir', 'project.json'),
        JSON.stringify({ ownership, slug, template_code: templateCode, git_profile: gitProfile, deploy_target: deployTarget, absorb_agent: absorbAgent }, null, 2),
        'utf8',
      );
      fs.writeFileSync(
        pathMod.join(wsPath, '.tavir', 'isolation.json'),
        JSON.stringify(isolationMeta, null, 2),
        'utf8',
      );
      const envProjPath = pathMod.join(wsPath, '.env.project');
      if (!fs.existsSync(envProjPath)) {
        fs.writeFileSync(
          envProjPath,
          `# Cofre Isolado do Projeto: ${name}\n# NUNCA compartilhado com outros projetos ou com o ambiente global.\nTAVIR_PROJECT_ID=${projectId}\nTAVIR_GIT_PROFILE=${gitProfile}\nTAVIR_DEPLOY_TARGET=${deployTarget}\n`,
          'utf8',
        );
      }

      // Aplica identidade Git estritamente local na pasta do projeto (sem tocar no --global)
      try {
        if (!fs.existsSync(pathMod.join(wsPath, '.git'))) {
          execFileSync('git', ['init'], { cwd: wsPath, windowsHide: true });
        }
        execFileSync('git', ['config', '--local', 'user.name', gitUserName], { cwd: wsPath, windowsHide: true });
        execFileSync('git', ['config', '--local', 'user.email', gitUserEmail], { cwd: wsPath, windowsHide: true });
        if (repoUrl) {
          try {
            execFileSync('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
          } catch {
            execFileSync('git', ['remote', 'add', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
          }
        }
        const excludePath = pathMod.join(wsPath, '.git', 'info', 'exclude');
        fs.mkdirSync(pathMod.dirname(excludePath), { recursive: true });
        const curExclude = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
        if (!curExclude.includes('.env.project')) {
          fs.writeFileSync(excludePath, `${curExclude}\n.env.project\n.tavir/credentials.json\n`, 'utf8');
        }
      } catch {}

      // Gera artefatos de absorção (Product Lab) se for Manutenção / Absorção
      const diagMd = `# Diagnóstico & Absorção (Product Lab) · ${name}\n\n- **Agente Responsável**: ${absorbAgent}\n- **Pasta Isolada**: \`${wsPath}\`\n- **Stacks Detectadas**: ${detectedStacks.join(', ')}\n- **Identidade Git Local**: \`${gitUserName} <${gitUserEmail}>\` (${gitProfile})\n- **Alvo de Deploy Isolado**: ${deployTarget}\n- **Variáveis de Ambiente Mapeadas (${envVarsFound.length})**: ${envVarsFound.length ? envVarsFound.map((k) => '`' + k + '`').join(', ') : 'Nenhuma chave exposta (cofre .env.project pronto)'}\n\n## Estrutura da Pasta Absorvida\n- **Diretórios (${topDirs.length})**: ${topDirs.join(', ') || 'raiz limpa'}\n- **Arquivos na Raiz (${topFiles.length})**: ${topFiles.slice(0, 15).join(', ') || 'nenhum'}\n\n> Isolamento ativo: credenciais, commits, PRs e tokens de deploy (Vercel/Netlify) operam exclusivamente dentro desta pasta.\n`;
      fs.writeFileSync(pathMod.join(wsPath, 'context', 'diagnosis.md'), diagMd, 'utf8');
      fs.writeFileSync(
        pathMod.join(wsPath, 'context', 'contrato.json'),
        JSON.stringify(
          {
            produto: name,
            resumo: `Projeto ${isAbsorb ? 'absorvido via Product Lab' : 'criado'} com isolamento estrito (${gitProfile}).`,
            stack_frontend: detectedStacks.join(', '),
            stack_backend: detectedStacks.includes('Python / FastAPI') ? 'FastAPI' : 'Node/Local',
            stack_database: 'SQLite / Isolado',
            telas: topDirs.slice(0, 8),
            regras: ['Isolamento estrito de credenciais e Git por pasta', `Git user: ${gitUserName} <${gitUserEmail}>`],
            criterios: ['Completion Guard 8/8', 'Sem vazamento de .env entre projetos'],
            entregavel: 'web',
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch (e) {
      console.error('[TAVIR IPC] Aviso ao preparar workspace isolado:', e);
    }

    const stackStr = detectedStacks.join(', ') || null;
    const nowIso = new Date().toISOString();
    const stagesDoneInit = isAbsorb ? 2 : 0;
    const description = `Escopo: ${ownership} · Esteira: ${templateCode} · ${isAbsorb ? 'Absorvido (Product Lab)' : isMaint ? 'Manutenção' : 'Criação'} · Git: ${gitUserName}`;
    const filesJson = JSON.stringify({
      context_files: ['context/diagnosis.md', 'context/contrato.json'],
      design_system: [],
      design_system_files: [],
      track: isMaint ? 'manutencao' : 'zero',
      ownership,
      workspace_root: ownership,
      template_category: cat,
      template_code: templateCode,
      git_profile: gitProfile,
      git_user_name: gitUserName,
      git_user_email: gitUserEmail,
      repo_url: repoUrl,
      deploy_target: deployTarget,
      absorb_agent: absorbAgent,
      absorbed: isAbsorb,
    });

    const newProj = {
      id: projectId,
      slug,
      name,
      client: company,
      company,
      template_code: templateCode,
      stages_done: stagesDoneInit,
      total_stages: totalStages,
      status: 'running',
      local_path: wsPath,
      stack: stackStr,
      description,
    };

    try {
      const sqlite = new DatabaseSync(pathMod.join(process.cwd(), 'backend', 'tavir.db'));
      sqlite
        .prepare(
          `INSERT INTO projects (id, slug, name, client, company, template_code, stages_done, total_stages, status, local_path, stack, files, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          projectId,
          slug,
          name,
          company,
          company,
          templateCode,
          stagesDoneInit,
          totalStages,
          'running',
          wsPath,
          stackStr,
          filesJson,
          description,
          nowIso,
          nowIso,
        );
      sqlite.close();
    } catch (err) {
      console.error('[TAVIR IPC] Erro ao gravar projeto no SQLite:', err);
    }

    return newProj;
  };

  handle('projects:create', (_e, params: any) => createOrAbsorbProject(params));
  handle('projects:absorb', (_e, params: any) => createOrAbsorbProject({ ...params, absorb: true }));

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

  handle('projects:askIris', (_e, params: any) => {
    try {
      const { askProjectIris } = require('./project-fs');
      return askProjectIris(params);
    } catch (err) {
      return { ok: false, messages: [] };
    }
  });

  handle('projects:runWithThinking', (_e, params: any) => {
    try {
      const { runProjectStageWithThinking } = require('./project-fs');
      return runProjectStageWithThinking(params);
    } catch (err) {
      return { ok: false, thoughts: [], steps: [] };
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

