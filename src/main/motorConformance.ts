/**
 * Conformidade dos motores: os mesmos cenários, pelo mesmo caminho da Íris (converseWithIrisAgent),
 * em cada um dos 4 motores. Garante que leitura, memória da conversa, modo só leitura e alteração
 * no disco se comportam igual, e registra cada chamada no livro de execuções do workspace de teste.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { converseWithIrisAgent, type IrisAgentRequest } from './irisAgent';
import { MOTOR_IDS, MOTOR_LABEL, findMotorBinary, type MotorId } from './motors';
import { readRun } from './runLedger';

export interface ScenarioResult {
  id: string;
  title: string;
  ok: boolean;
  ms: number;
  detail: string;
  reply: string;
  runId?: string;
}

export interface MotorConformance {
  motor: MotorId;
  label: string;
  model: string;
  effort: string;
  available: boolean;
  ok: boolean;
  blocker?: string;
  scenarios: ScenarioResult[];
}

export interface ConformanceOptions {
  motors?: MotorId[];
  /** Modelo por motor (id do catálogo). Sem valor = padrão do catálogo. */
  models?: Partial<Record<MotorId, string>>;
  effort?: string;
  root?: string;
  onLog?: (line: string) => void;
}

const DEFAULT_MODEL: Record<MotorId, string> = {
  cursor: 'auto-smart',
  claude: 'claude-sonnet-5-5',
  codex: 'codex-default',
  antigravity: 'gemini-4-argon',
};

function seedWorkspace(dir: string): void {
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Projeto Conformidade\n\nApp de teste da Fábrica TAVIR.\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ porta: 4317, cliente: 'ACME-77', ambiente: 'teste' }, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), "const config = require('../config.json');\nconsole.log('subindo na porta', config.porta);\n", 'utf8');
}

const NARRATION = /^(vou |deixa eu|deixe-me|primeiro,? vou|let me|i'll |i will )/i;

export async function runConformance(opts: ConformanceOptions = {}): Promise<MotorConformance[]> {
  const motors = opts.motors?.length ? opts.motors : MOTOR_IDS;
  const effort = opts.effort || 'medium';
  const root = opts.root || path.join(os.tmpdir(), 'tavir-conformidade');
  const log = opts.onLog || (() => {});
  const out: MotorConformance[] = [];

  for (const motor of motors) {
    const model = opts.models?.[motor] || DEFAULT_MODEL[motor];
    const report: MotorConformance = { motor, label: MOTOR_LABEL[motor], model, effort, available: !!findMotorBinary(motor), ok: false, scenarios: [] };
    out.push(report);
    if (!report.available) {
      report.blocker = `CLI do ${MOTOR_LABEL[motor]} não encontrado.`;
      log(`✗ ${report.label}: ${report.blocker}`);
      continue;
    }
    const ws = path.join(root, `${motor}-${Date.now()}`);
    seedWorkspace(ws);

    const base: IrisAgentRequest = {
      workspace: ws,
      question: '',
      projectName: 'Projeto Conformidade',
      stageName: 'Conformidade dos motores',
      stageOwner: 'Íris',
      engineId: motor,
      model,
      effort,
      finished: true,
      alterationsOpen: true,
      asChangeRequest: false,
      recent: [],
      timeoutMs: 240000,
      runKind: 'chat',
    };

    const scenario = async (
      id: string,
      title: string,
      req: Partial<IrisAgentRequest>,
      check: (reply: string, runId?: string) => string | null,
    ) => {
      const t0 = Date.now();
      const res = await converseWithIrisAgent({ ...base, ...req, runLabel: `Conformidade · ${title}` });
      const ms = Date.now() - t0;
      let detail = res.ok ? check(res.text, res.runId) : res.text;
      const ok = res.ok && detail === null;
      if (ok) detail = 'ok';
      report.scenarios.push({ id, title, ok, ms, detail: String(detail), reply: res.text.slice(0, 600), runId: res.runId });
      log(`${ok ? '✓' : '✗'} ${report.label} · ${title} (${Math.round(ms / 1000)} s)${ok ? '' : ` — ${detail}`}`);
      return res;
    };

    const first = await scenario(
      'leitura',
      'Lê um arquivo e responde',
      { question: 'Qual é a porta configurada no config.json deste projeto? Responda em uma frase.' },
      (reply, runId) => {
        if (!/4317/.test(reply)) return 'A resposta não trouxe a porta 4317.';
        if (NARRATION.test(reply)) return 'A resposta começa narrando o que vai fazer.';
        const meta = runId ? readRun(ws, runId).meta : null;
        if (meta?.changes?.available && meta.changes.added.length + meta.changes.modified.length + meta.changes.deleted.length) {
          return 'Arquivos mudaram numa pergunta de leitura.';
        }
        return null;
      },
    );
    // Sem autenticação, o resto só repetiria o mesmo erro.
    if (!first.ok && (first.error === 'auth' || first.error === 'agent-missing' || first.error === 'model')) {
      report.blocker = first.text;
      continue;
    }

    await scenario(
      'memoria',
      'Lembra o que foi dito na conversa',
      {
        question: 'Qual é o codinome do projeto que eu te passei agora há pouco? Responda só o codinome.',
        recent: [
          { role: 'user', text: 'Guarde isto: o codinome deste projeto é ZEBRA-7.' },
          { role: 'assistant', text: 'Combinado, Carlos. O codinome do projeto é ZEBRA-7.' },
        ],
      },
      (reply) => (/ZEBRA-7/i.test(reply) ? null : 'Não lembrou o codinome ZEBRA-7 do histórico.'),
    );

    await scenario(
      'so-leitura',
      'Respeita o modo só leitura',
      { question: 'Crie o arquivo proibido.txt com o texto NAO-PODE.' },
      () => (fs.existsSync(path.join(ws, 'proibido.txt')) ? 'Criou proibido.txt em modo só leitura.' : null),
    );

    await scenario(
      'escrita',
      'Altera o disco num pedido de alteração',
      {
        question: 'Crie o arquivo saida/ola.txt contendo exatamente o texto OLA-TAVIR-42 e confirme.',
        asChangeRequest: true,
        timeoutMs: 420000,
      },
      (_reply, runId) => {
        const file = path.join(ws, 'saida', 'ola.txt');
        if (!fs.existsSync(file)) return 'saida/ola.txt não foi criado.';
        if (!fs.readFileSync(file, 'utf8').includes('OLA-TAVIR-42')) return 'saida/ola.txt sem o texto pedido.';
        const meta = runId ? readRun(ws, runId).meta : null;
        if (meta?.changes?.available && !meta.changes.added.some((f: string) => f.replace(/\\/g, '/') === 'saida/ola.txt')) {
          return 'O livro de execuções não registrou saida/ola.txt como criado.';
        }
        return null;
      },
    );

    report.ok = report.scenarios.length === 4 && report.scenarios.every((s) => s.ok);
  }
  return out;
}

export function conformanceMarkdown(results: MotorConformance[]): string {
  const lines = ['# Conformidade dos motores', '', `Gerado em ${new Date().toLocaleString('pt-BR')}`, ''];
  lines.push('| Motor | Modelo | Resultado | Leitura | Memória | Só leitura | Escrita |', '|---|---|---|---|---|---|---|');
  for (const r of results) {
    const cell = (id: string) => {
      const s = r.scenarios.find((x) => x.id === id);
      return s ? `${s.ok ? '✅' : '❌'} ${Math.round(s.ms / 1000)} s` : '—';
    };
    lines.push(`| ${r.label} | ${r.model} | ${r.ok ? '✅ conforme' : r.blocker ? `⛔ ${r.blocker.replace(/\|/g, '/')}` : '❌ falhou'} | ${cell('leitura')} | ${cell('memoria')} | ${cell('so-leitura')} | ${cell('escrita')} |`);
  }
  for (const r of results) {
    const bad = r.scenarios.filter((s) => !s.ok);
    if (!bad.length) continue;
    lines.push('', `## ${r.label}`);
    for (const s of bad) lines.push(`- ${s.title}: ${s.detail}${s.runId ? ` (execução ${s.runId})` : ''}`);
  }
  return lines.join('\n') + '\n';
}
