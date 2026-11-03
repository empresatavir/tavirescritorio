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

const dbSqlitePath = join(process.cwd(), 'backend', 'tavir.db');
let sqliteDb: DatabaseSync | null = null;

function getSqlite(): DatabaseSync | null {
  if (sqliteDb) return sqliteDb;
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
  const dir = join(process.cwd(), 'db');
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
            `SELECT j.id, j.task_id, j.status, j.agent_id, j.origin, t.title AS task_title
             FROM jobs j
             LEFT JOIN tasks t ON t.id = j.task_id
             ORDER BY j.id DESC`,
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
          who: agent.length > 24 ? `${agent.slice(0, 22)}…` : agent,
          ini: agent.slice(0, 2).toUpperCase(),
          status: normalizeJobStatus(j.status) as any,
          progress: j.status === 'running' ? 50 : j.status === 'queued' ? 10 : 100,
          model: 'claude-sonnet-4',
          motor: 'Cursor',
          effort: 'equilibrado',
          task: j.task_id ? `#${String(j.task_id).slice(0, 6)}` : `#${idx + 1}`,
          cost: 0,
          ceiling: 10,
          started: String(j.status || '—'),
          tokens: '0',
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
