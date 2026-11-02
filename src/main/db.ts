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

      const jobsRows = sqlite.prepare('SELECT id, task_id, status, agent_id, origin FROM jobs').all() as any[];
      const jobs: JobItem[] = jobsRows.map((j, idx) => ({
        id: j.id || `job-${idx + 1}`,
        title: `Job ${j.id}`,
        who: j.agent_id || 'Agente',
        ini: (j.agent_id || 'AG').slice(0, 2).toUpperCase(),
        status: (j.status || 'completed') as any,
        progress: j.status === 'running' ? 50 : 100,
        model: 'claude-sonnet-4',
        motor: 'Cursor',
        effort: 'equilibrado',
        task: `#${idx + 1}`,
        cost: 0,
        ceiling: 10,
        started: '—',
        tokens: '0'
      }));

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
        reason: 'Verificação de gate necessária.',
        question: 'Autorizar execução?',
        yes: ['Autorizado'],
        no: ['Rejeitado']
      }));

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

  // Sincroniza tarefas no SQLite se houver conexão
  const sqlite = getSqlite();
  if (sqlite) {
    try {
      const stmtTask = sqlite.prepare('INSERT OR REPLACE INTO tasks (id, title, status) VALUES (?, ?, ?)');
      for (const t of estado.tasks) {
        stmtTask.run(t.id, t.title, t.status);
      }
    } catch (e) {
      console.error('[TAVIR DB] Erro ao sincronizar tasks com SQLite:', e);
    }
  }
}
