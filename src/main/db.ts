import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { JobItem, TaskItem, ApprovalItem, SessionState } from '../shared/types';

export interface DatabaseState {
  session: SessionState;
  jobs: JobItem[];
  tasks: TaskItem[];
  approvals: ApprovalItem[];
  events: Array<{
    id: string;
    timestamp: string;
    action: string;
    details: string;
  }>;
}

/** Raiz dos dados locais. Os testes apontam `TAVIR_DATA_ROOT` para uma pasta temporária e nunca tocam os dados reais. */
export function dataRoot(): string {
  return process.env.TAVIR_DATA_ROOT || process.cwd();
}

let sqliteDb: DatabaseSync | null = null;

function getSqlite(): DatabaseSync | null {
  if (sqliteDb) return sqliteDb;
  const dbSqlitePath = join(dataRoot(), 'backend', 'tavir.db');
  if (existsSync(dbSqlitePath)) {
    try {
      sqliteDb = new DatabaseSync(dbSqlitePath);
      return sqliteDb;
    } catch (e) {
      console.error('[TAVIR DB] Erro ao conectar com SQLite:', e);
    }
  }
  return null;
}

function caminhoStoreJson(): string {
  const dir = join(dataRoot(), 'db');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'tavir_store.json');
}

export function carregarDb(): DatabaseState {
  const sqlite = getSqlite();

  // Carrega session básica
  let session: SessionState = {
    authenticated: true,
    operatorName: 'Carlos',
    expiresAt: null,
    onboardingCompleted: true,
    theme: 'dark',
  };

  const storeFile = caminhoStoreJson();
  if (existsSync(storeFile)) {
    try {
      const data = JSON.parse(readFileSync(storeFile, 'utf8'));
      if (data.session) session = data.session;
    } catch {}
  }

  // Se tiver conexão SQLite ativa, carrega dados REAIS do banco
  if (sqlite) {
    try {
      const tasksRows = sqlite.prepare('SELECT id, title, status, project_id FROM tasks').all() as any[];
      const tasks: TaskItem[] = tasksRows.map((t, idx) => ({
        id: t.id || `task-${idx + 1}`,
        seq: idx + 1,
        title: t.title || 'Sem título',
        status: (t.status || 'to_plan') as any,
        who: 'Paula PM',
        ini: 'PP',
        prio: 'Normal',
        sector: 'Operação',
        planning: t.status === 'to_plan'
      }));

      let jobsRows: any[] = [];
      try {
        jobsRows = sqlite
          .prepare(
            `SELECT j.id, j.task_id, j.status, j.agent_id, j.origin, j.model_provider, j.model_name,
                    j.effort, j.budget_ceiling, j.error_message, j.created_at, j.cost_usd, j.tokens_total,
                    t.title AS task_title
             FROM jobs j
             LEFT JOIN tasks t ON t.id = j.task_id
             ORDER BY j.created_at DESC`,
          )
          .all() as any[];
      } catch {
        jobsRows = sqlite.prepare('SELECT id, task_id, status, agent_id, origin FROM jobs').all() as any[];
      }
      const normalizeJobStatus = (st?: string) => {
        if (st === 'running' || st === 'queued' || st === 'failed' || st === 'completed' || st === 'paused') return st;
        if (st === 'cancelled' || st === 'canceled') return 'failed';
        return 'completed';
      };
      const jobs: JobItem[] = jobsRows.map((j, idx) => {
        const agent = String(j.agent_id || 'Agente');
        const shortId = String(j.id || '').slice(0, 8);
        return {
          id: j.id || `job-${idx + 1}`,
          title: String(j.task_title || j.origin || `Execução ${shortId}`),
          ini: (String(j.origin || '').startsWith('trilho:') ? String(j.origin).slice(7) : agent).slice(0, 2).toUpperCase(),
          status: normalizeJobStatus(j.status) as any,
          progress: j.status === 'running' ? 50 : j.status === 'queued' ? 10 : 100,
          model: String(j.model_name || 'auto'),
          motor: String(j.model_provider || 'Cursor'),
          effort: String(j.effort || 'equilibrado'),
          task: j.task_id ? `#${String(j.task_id).slice(0, 6)}` : `#${idx + 1}`,
          cost: Number(j.cost_usd) || 0,
          ceiling: Number(j.budget_ceiling) || 10,
          started: formatJobWhen(j.created_at) || String(j.status || '—'),
          tokens: j.tokens_total ? String(j.tokens_total) : '0',
          error: String(j.error_message || ''),
          who: String(j.origin || '').startsWith('trilho:')
            ? String(j.origin).slice(7, 31)
            : agent.length > 24
              ? `${agent.slice(0, 22)}…`
              : agent,
        };
      });

      const approvalsRows = sqlite.prepare('SELECT id, kind, title, status FROM approvals').all() as any[];
      const approvals: ApprovalItem[] = approvalsRows.map((a) => ({
        id: a.id,
        group: 'block',
        kind: a.kind || 'deploy',
        title: a.title || 'Aprovação pendente',
        who: 'Revisor',
        ini: 'RV',
        type: 'Checkpoint',
        status: (a.status || 'pending') as any,
        impact: 'médio',
        task: '#1',
        age: 'recente',
        ageH: 1,
        reason: 'Verificação de gate necessária.',
        question: 'Autorizar execução?',
        yes: ['Autorizado'],
        no: ['Rejeitado'],
        more: ['Solicitar contexto adicional']
      } as any));

      return {
        session,
        jobs,
        tasks,
        approvals,
        events: []
      };
    } catch (e) {
      console.error('[TAVIR DB] Erro ao consultar SQLite:', e);
    }
  }

  // Fallback limpo (sem nenhum dado fictício!)
  return {
    session,
    jobs: [],
    tasks: [],
    approvals: [],
    events: []
  };
}

function formatJobWhen(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 16);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function acharProjetoId(sqlite: DatabaseSync, projectName: string, projectPath: string): string | null {
  try {
    const rows = sqlite.prepare('SELECT id, name, local_path FROM projects').all() as Array<{
      id: string;
      name?: string;
      local_path?: string;
    }>;
    const norm = (p: string) => String(p || '').replace(/\\/g, '/').toLowerCase();
    const pathHit = rows.find((r) => r.local_path && norm(projectPath).includes(norm(r.local_path)));
    if (pathHit) return pathHit.id;
    const nameHit = rows.find((r) => String(r.name || '').toLowerCase() === projectName.toLowerCase());
    if (nameHit) return nameHit.id;
    return rows[0]?.id || null;
  } catch {
    return null;
  }
}

export function abrirJobTrilho(info: {
  projectName: string;
  projectPath: string;
  focus: string;
  owner: string;
  motor: string;
  model: string;
}): JobItem {
  const id = `trilho-${Date.now().toString(36)}`;
  const title = `Trilho · ${info.focus} · ${info.projectName}`.slice(0, 280);
  const now = new Date().toISOString();
  const job: JobItem = {
    id,
    title,
    who: info.owner,
    ini: info.owner.slice(0, 2).toUpperCase(),
    status: 'running',
    progress: 12,
    model: info.model,
    motor: info.motor,
    effort: 'trilho',
    task: info.focus,
    cost: 0,
    ceiling: 0,
    started: formatJobWhen(now),
    tokens: '0',
    error: '',
  };
  const sqlite = getSqlite();
  if (!sqlite) return job;
  try {
    const projectId = acharProjetoId(sqlite, info.projectName, info.projectPath);
    if (!projectId) return job;
    const taskId = `task-${id}`;
    sqlite
      .prepare(
        `INSERT INTO tasks (id, project_id, title, status, priority, sector, created_at, updated_at)
         VALUES (?, ?, ?, 'in_progress', 'Normal', 'Fábrica', ?, ?)`,
      )
      .run(taskId, projectId, title, now, now);
    sqlite
      .prepare(
        `INSERT INTO jobs (id, task_id, project_id, origin, model_provider, model_name, effort, status, workspace_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'trilho', 'running', ?, ?, ?)`,
      )
      .run(id, taskId, projectId, `trilho:${info.owner}`.slice(0, 50), info.motor.slice(0, 50), info.model.slice(0, 100), info.projectPath.slice(0, 500), now, now);
  } catch (err) {
    console.error('[TAVIR DB] Não gravou o job do trilho:', err);
  }
  return job;
}

export function atualizarJobTrilho(id: string, status: 'running' | 'completed' | 'failed' | 'paused', errorMessage = ''): void {
  const sqlite = getSqlite();
  if (!sqlite || !id) return;
  const now = new Date().toISOString();
  const taskStatus = status === 'completed' ? 'done' : status === 'failed' ? 'in_progress' : 'in_progress';
  try {
    sqlite.prepare('UPDATE jobs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?').run(status, errorMessage.slice(0, 2000), now, id);
    sqlite
      .prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = (SELECT task_id FROM jobs WHERE id = ?)')
      .run(taskStatus, now, id);
  } catch (err) {
    console.error('[TAVIR DB] Não atualizou o job do trilho:', err);
  }
}

export function registrarEventoJob(jobId: string, action: string, details: string, eventType = 'info'): void {
  const sqlite = getSqlite();
  if (!sqlite || !jobId || !details.trim()) return;
  try {
    sqlite
      .prepare(
        `INSERT INTO events (id, job_id, event_type, actor, action, details, created_at)
         VALUES (?, ?, ?, 'trilho', ?, ?, ?)`,
      )
      .run(`ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, jobId, eventType.slice(0, 50), action.slice(0, 100), details, new Date().toISOString());
  } catch (err) {
    console.error('[TAVIR DB] Não gravou o evento do job:', err);
  }
}

export function registrarPassoCrescente(jobId: string, details: string, level: 'info' | 'error' = 'info'): void {
  const sqlite = getSqlite();
  const next = String(details || '');
  if (!sqlite || !jobId || !next.trim()) return;
  try {
    const last = sqlite
      .prepare(`SELECT id, details FROM events WHERE job_id = ? AND action = 'passo' ORDER BY created_at DESC LIMIT 1`)
      .get(jobId) as { id?: string; details?: string } | undefined;
    const prev = String(last?.details || '');
    const rowId = last?.id || '';
    const extendsPrev = !!rowId && !!prev && next.startsWith(prev.slice(0, Math.min(prev.length, 120))) && next.length >= prev.length;
    if (extendsPrev) {
      sqlite.prepare('UPDATE events SET details = ?, event_type = ?, created_at = ? WHERE id = ?').run(
        next,
        level === 'error' ? 'error' : 'info',
        new Date().toISOString(),
        rowId,
      );
      return;
    }
  } catch (err) {
    console.error('[TAVIR DB] Não atualizou o passo do job:', err);
  }
  registrarEventoJob(jobId, 'passo', next, level === 'error' ? 'error' : 'info');
}

export function listarLogsJobs(): Record<string, Array<{ ts: string; lvl: string; cls: string; text: string }>> {
  const sqlite = getSqlite();
  const out: Record<string, Array<{ ts: string; lvl: string; cls: string; text: string }>> = {};
  if (!sqlite) return out;
  try {
    const rows = sqlite
      .prepare(
        `SELECT job_id, created_at, event_type, details
         FROM events
         WHERE job_id IS NOT NULL AND details IS NOT NULL
         ORDER BY created_at ASC`,
      )
      .all() as Array<{ job_id: string; created_at?: string; event_type?: string; details?: string }>;
    for (const row of rows) {
      const bad = /error|erro|fail/i.test(String(row.event_type || ''));
      const bucket = out[row.job_id] || [];
      const text = String(row.details || '');
      const prev = bucket[bucket.length - 1];
      const entry = {
        ts: formatJobWhen(row.created_at) || '—',
        lvl: bad ? 'erro' : 'info',
        cls: bad ? 'err' : 'info',
        text,
      };
      if (
        prev &&
        text.startsWith(String(prev.text).slice(0, Math.min(String(prev.text).length, 120))) &&
        text.length >= String(prev.text).length
      ) {
        bucket[bucket.length - 1] = entry;
      } else {
        bucket.push(entry);
      }
      out[row.job_id] = bucket;
    }
  } catch (err) {
    console.error('[TAVIR DB] Não leu o log dos jobs:', err);
  }
  return out;
}

export function salvarDb(estado: DatabaseState): void {
  // Salva no JSON de sessão
  const arq = caminhoStoreJson();
  writeFileSync(arq, JSON.stringify(estado, null, 2), 'utf8');

  // Sincroniza tarefas no SQLite se houver conexão (schema exige project_id NOT NULL)
  const sqlite = getSqlite();
  if (sqlite) {
    try {
      let fallbackProjectId = 'default-project';
      try {
        const row = sqlite.prepare('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1').get() as
          | { id?: string }
          | undefined;
        if (row?.id) fallbackProjectId = row.id;
        else {
          sqlite
            .prepare(
              'INSERT OR IGNORE INTO projects (id, name, company, template_category, total_stages) VALUES (?, ?, ?, ?, ?)',
            )
            .run(fallbackProjectId, 'Projeto Principal', 'TAVIR', 'sy', 12);
        }
      } catch {
        /* schema pode variar; segue com fallback */
      }

      const stmtTask = sqlite.prepare(
        `INSERT OR REPLACE INTO tasks (id, project_id, title, status, updated_at)
         VALUES (?, COALESCE((SELECT project_id FROM tasks WHERE id = ?), ?), ?, ?, ?)`,
      );
      const nowIso = new Date().toISOString();
      for (const t of estado.tasks) {
        const projectId = (t as { project_id?: string }).project_id || fallbackProjectId;
        stmtTask.run(t.id, t.id, projectId, t.title, t.status, nowIso);
      }
    } catch (e) {
      console.error('[TAVIR DB] Erro ao sincronizar tasks com SQLite:', e);
    }
  }
}
