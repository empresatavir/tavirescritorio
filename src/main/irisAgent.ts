import { existsSync } from 'node:fs';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type IrisAgentMode = 'ask' | 'agent';

export interface IrisAgentRequest {
  workspace: string;
  question: string;
  projectName: string;
  stageName: string;
  stageOwner: string;
  engineId: string;
  model: string;
  effort: string;
  finished: boolean;
  alterationsOpen: boolean;
  asChangeRequest: boolean;
  recent: Array<{ role: 'user' | 'assistant'; text: string }>;
  memorySnippet?: string;
  timeoutMs?: number;
  onProgress?: (line: string) => void;
}

export interface IrisAgentResult {
  ok: boolean;
  text: string;
  thoughts: string[];
  engine: string;
  model: string;
  mode: IrisAgentMode;
  error?: string;
}

type MotorKey = 'cursor' | 'claude' | 'codex' | 'antigravity';

function whichBinary(name: string): string | null {
  try {
    const { execFileSync } = require('node:child_process');
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      windowsHide: true,
      encoding: 'utf8',
    });
    return (
      String(out || '')
        .split(/\r?\n/)
        .map((x) => x.trim())
        .find(Boolean) || null
    );
  } catch {
    return null;
  }
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function normalizeMotor(engineId: string): MotorKey {
  const k = String(engineId || '').toLowerCase();
  if (k.includes('claude') || k.includes('anthropic')) return 'claude';
  if (k.includes('codex')) return 'codex';
  if (k.includes('anti') || k.includes('gemini') || k === 'agy') return 'antigravity';
  return 'cursor';
}

function findMotorBinary(motor: MotorKey): string | null {
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || '';
  if (motor === 'cursor') {
    return (
      whichBinary('agent') ||
      whichBinary('cursor-agent') ||
      firstExisting([
        path.join(home, '.local', 'bin', 'agent.exe'),
        path.join(home, '.local', 'bin', 'agent.cmd'),
        path.join(home, '.local', 'bin', 'cursor-agent.exe'),
        local ? path.join(local, 'cursor-agent', 'agent.exe') : '',
        local ? path.join(local, 'cursor-agent', 'agent.cmd') : '',
        local ? path.join(local, 'cursor-agent', 'cursor-agent.exe') : '',
      ])
    );
  }
  if (motor === 'claude') {
    return (
      whichBinary('claude') ||
      firstExisting([
        path.join(home, '.local', 'bin', 'claude.exe'),
        path.join(home, '.local', 'bin', 'claude.cmd'),
        local ? path.join(local, 'claude-cli-nodejs', 'claude.exe') : '',
      ])
    );
  }
  if (motor === 'codex') {
    return (
      whichBinary('codex') ||
      firstExisting([
        local ? path.join(local, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe') : '',
        path.join(process.env.APPDATA || '', 'npm', 'codex.cmd'),
        path.join(home, '.local', 'bin', 'codex.exe'),
      ])
    );
  }
  return (
    whichBinary('agy') ||
    firstExisting([
      path.join(home, '.gemini', 'bin', 'agy.exe'),
      path.join(home, '.gemini', 'bin', 'agy.cmd'),
      local ? path.join(local, 'Programs', 'Antigravity', 'agy.exe') : '',
    ])
  );
}

function effortLevel(effort: string): string {
  const levelRaw = String(effort || 'medium').toLowerCase();
  const aliases: Record<string, string> = {
    balanced: 'medium',
    balance: 'medium',
    cost: 'low',
    intelligence: 'high',
    max: 'xhigh',
    máximo: 'xhigh',
    maximo: 'xhigh',
    alto: 'high',
    médio: 'medium',
    medio: 'medium',
    baixo: 'low',
  };
  return aliases[levelRaw] || levelRaw || 'medium';
}

function mapModelForMotor(motor: MotorKey, model: string, effort: string): string {
  const m = String(model || '').trim();
  const level = effortLevel(effort);
  if (motor === 'cursor') {
    if (!m || m === 'auto' || m === 'auto-smart' || m.toLowerCase().includes('auto')) return 'auto';
    if (['low', 'medium', 'high', 'xhigh'].includes(level)) {
      return `${m.replace(/^cursor-/, '')}[effort=${level}]`;
    }
    return m;
  }
  if (motor === 'claude') {
    if (!m) return 'claude-sonnet-4-5';
    // Aliases do catálogo → ids aceitos pelo Claude Code local
    if (m.includes('opus-5-5') || m.includes('opus-5')) return 'claude-opus-4-1';
    if (m.includes('sonnet-5-5') || m.includes('sonnet-5') || m.includes('sonnet-4-thinking')) return 'claude-sonnet-4-5';
    if (m.includes('haiku')) return 'claude-haiku-4-5';
    if (m.includes('fable')) return 'claude-sonnet-4-5';
    return m;
  }
  if (motor === 'codex') {
    // Ids do catálogo → ids que o Codex CLI local costuma aceitar
    if (!m) return 'gpt-5';
    if (m === 'gpt-5-codex' || m.includes('codex')) return 'gpt-5';
    if (m.startsWith('gpt-5')) return m;
    return 'gpt-5';
  }
  // antigravity: o CLI usa nomes com esforço embutido (sem --effort separado)
  const tier =
    level === 'low' || level === 'baixo'
      ? 'Low'
      : level === 'high' || level === 'xhigh' || level === 'max' || level === 'alto'
        ? 'High'
        : 'Medium';
  if (!m || m.includes('pro') || m.includes('argon') || m.includes('gemini-2.5-pro')) {
    return `Gemini 4 Argon (${tier})`;
  }
  if (m.includes('flash')) return `Gemini 3.8 Flash (${tier})`;
  if (m.includes('opus')) return `Claude Opus 5.5 (${tier})`;
  if (m.includes('sonnet')) return `Claude Sonnet 5.5 (${tier})`;
  if (m.includes('gpt') || m.includes('oss')) return 'GPT-OSS 120B (Medium)';
  return `Gemini 4 Argon (${tier})`;
}

function motorMissingMessage(motor: MotorKey): string {
  if (motor === 'claude') {
    return 'Não achei o Claude Code (`claude`) neste computador. Instale/autentique o CLI para a Íris usar o motor Claude.';
  }
  if (motor === 'codex') {
    return 'Não achei o Codex CLI (`codex`) neste computador. Instale/autentique o CLI da OpenAI para a Íris usar o motor Codex.';
  }
  if (motor === 'antigravity') {
    return 'Não achei o Antigravity CLI (`agy`) neste computador. Instale o CLI em ~/.gemini/bin para a Íris usar esse motor.';
  }
  return 'Não achei o Cursor Agent (`agent`) neste computador. Instale/autentique o agente de terminal para a Íris conversar.';
}

function cleanAgentReply(text: string): string {
  let out = String(text || '').trim();
  // Narrativas de planejamento no começo (podem empilhar: "Vou só olhar… Vou mapear…")
  const leadMeta =
    /^(?:Vou(?:\s+(?:só|apenas))?\s+(?:olhar|ler|checar|verificar|analisar|abrir|responder|mapear|fazer)[^.!?\n]{0,200}|I(?:'|’)ll\s+(?:just\s+)?(?:read|look|check|respond|map)[^.!?\n]{0,200})[.!?]?\s+/i;
  for (let i = 0; i < 6; i++) {
    const next = out.replace(leadMeta, '').trim();
    if (next === out) break;
    out = next;
  }
  const metaPatterns = [
    /^Só um [“"']?oi[”"']? — sem alteração de código\.\s*/i,
    /^Pedido era só um [“"']?oi[”"']? — nada a alterar no código\.\s*/i,
    /\s*\*\*O que mudou:\*\*[^\n]*$/i,
    /\s*O que mudou:\s*nenhum arquivo[^\n]*$/i,
    /\s*sem deploy e sem push\.?\s*$/i,
    /\s*nenhum arquivo criado ou editado;?[^\n]*$/i,
  ];
  for (const re of metaPatterns) out = out.replace(re, ' ').trim();
  // Junta frases coladas sem espaço ("workspace.Pedido" / "código. Oi")
  out = out.replace(/([.!?])([A-ZÁÉÍÓÚÀÃÕÂÊÔÇ])/g, '$1 $2');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

class IrisMotorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IrisMotorError';
  }
}

function extractAgentText(stdout: string, motor: MotorKey = 'cursor'): string {
  const raw = String(stdout || '').trim();
  if (!raw) return '';
  let found = '';
  let sawJson = false;
  let lastHardError = '';
  for (const line of raw.split(/\r?\n/)) {
    const piece = line.trim();
    if (!piece || piece.startsWith('INFORMA') || piece.startsWith('Reading additional')) continue;
    let data: any;
    try {
      data = JSON.parse(piece);
    } catch {
      continue;
    }
    if (!data || typeof data !== 'object') continue;
    sawJson = true;

    if (data.status === 'ERROR' || data.is_error) {
      throw new IrisMotorError(String(data.error || data.result || data.message || 'O motor local falhou.'));
    }
    if (data.type === 'turn.failed') {
      throw new IrisMotorError(String(data.error?.message || data.message || 'Turno do motor falhou.'));
    }
    if (data.type === 'error' && data.message) {
      lastHardError = String(data.message);
      continue;
    }
    if (data.type === 'item.completed' && data.item?.type === 'error') {
      const msg = String(data.item.message || data.item.error || '');
      // Aviso de metadata não é fatal; 401/auth é.
      if (/401|unauthor|auth|login|bearer/i.test(msg)) {
        throw new IrisMotorError(msg);
      }
      lastHardError = msg || lastHardError;
      continue;
    }

    if (data.type === 'assistant' && data.message && Array.isArray(data.message.content)) {
      const joined = data.message.content.map((c: { text?: string }) => c?.text || '').join('').trim();
      if (joined) found = joined;
    }
    if (typeof data.result === 'string' && data.result.trim()) found = data.result.trim();
    if (!found && typeof data.content === 'string' && data.content.trim()) found = data.content.trim();
    if (!found && typeof data.response === 'string' && data.response.trim()) found = data.response.trim();

    if (!found && (data.type === 'agent_message' || data.type === 'message' || data.item?.type === 'agent_message')) {
      const t = data.text || data.message || data.item?.text || data.item?.content;
      if (typeof t === 'string' && t.trim()) found = t.trim();
    }
    if (!found && data.type === 'item.completed' && data.item?.type === 'agent_message') {
      const t = data.item.text || data.item.content;
      if (typeof t === 'string' && t.trim()) found = t.trim();
    }
  }
  if (found) return cleanAgentReply(found);
  if (lastHardError) throw new IrisMotorError(lastHardError);
  if (!sawJson) return cleanAgentReply(raw);
  try {
    const data = JSON.parse(raw);
    if (data && typeof data.result === 'string') return cleanAgentReply(data.result);
    if (data && typeof data.content === 'string') return cleanAgentReply(data.content);
    if (data && typeof data.response === 'string') return cleanAgentReply(data.response);
  } catch {}
  if (motor === 'codex') {
    const plain = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('{') && !l.startsWith('[') && !l.startsWith('INFORMA'));
    if (plain.length) return cleanAgentReply(plain.slice(-8).join('\n'));
  }
  return cleanAgentReply(raw);
}

function buildCliInvocation(
  motor: MotorKey,
  mode: IrisAgentMode,
  workspace: string,
  model: string,
  effort: string,
  prompt: string,
  orderRelative: string,
): { args: string[]; envExtra?: NodeJS.ProcessEnv } {
  const level = effortLevel(effort);
  if (motor === 'cursor') {
    const sandbox = process.platform === 'win32' ? 'disabled' : 'enabled';
    if (mode === 'ask') {
      return {
        args: [
          '-p',
          '--mode',
          'ask',
          '--trust',
          '--output-format',
          'stream-json',
          '--workspace',
          workspace,
          '--sandbox',
          sandbox,
          '--model',
          model,
          `Abra ${orderRelative} em silêncio e responda APENAS a mensagem do Carlos, em português, como chat. Não diga que leu o arquivo. Não crie/edite/rode comando. Se for só “oi”, responda em 1–2 frases.`,
        ],
      };
    }
    return {
      args: [
        '-p',
        '--force',
        '--trust',
        '--output-format',
        'stream-json',
        '--workspace',
        workspace,
        '--sandbox',
        sandbox,
        '--model',
        model,
        `Abra ${orderRelative} e execute o pedido de alteração. Pode editar arquivos e rodar comando local. Sem deploy/push. Resposta final curta e humana.`,
      ],
    };
  }

  // Claude / Codex / Antigravity: prompt completo fica no arquivo de pedido; a CLI recebe instrução curta.
  const askHint =
    `Leia ${orderRelative} em silêncio e responda só a mensagem do Carlos, em português, como chat. ` +
    'Não diga que leu o arquivo. Não crie/edite/rode comando. Se for só “oi”, responda em 1–2 frases.';
  const workHint =
    `Leia ${orderRelative} e execute o pedido de alteração neste workspace. ` +
    'Pode editar arquivos e rodar comando local. Sem deploy/push. Resposta final curta e humana.';

  if (motor === 'claude') {
    if (mode === 'ask') {
      return {
        args: ['-p', '--output-format', 'json', '--model', model, '--permission-mode', 'plan', askHint],
      };
    }
    return {
      args: [
        '-p',
        '--output-format',
        'json',
        '--model',
        model,
        '--dangerously-skip-permissions',
        workHint,
      ],
    };
  }

  if (motor === 'codex') {
    if (mode === 'ask') {
      return {
        args: ['exec', '-C', workspace, '-m', model, '-s', 'read-only', '--json', askHint],
      };
    }
    return {
      args: [
        'exec',
        '-C',
        workspace,
        '-m',
        model,
        '-s',
        'workspace-write',
        '--dangerously-bypass-approvals-and-sandbox',
        '--json',
        workHint,
      ],
    };
  }

  // antigravity (agy): esforço já vem no nome do modelo; --print= evita engolir flags
  if (mode === 'ask') {
    return {
      args: ['--output-format', 'json', '--model', model, '--mode', 'plan', `--print=${askHint}`],
    };
  }
  return {
    args: [
      '--output-format',
      'json',
      '--model',
      model,
      '--mode',
      'auto',
      '--dangerously-skip-permissions',
      `--print=${workHint}`,
    ],
  };
}

function clip(text: string, limit: number): string {
  const body = String(text || '').trim();
  if (body.length <= limit) return body;
  return body.slice(0, Math.max(0, limit - 1)).replace(/\s+\S*$/, '') + '…';
}

function buildPrompt(req: IrisAgentRequest): string {
  const recent = (req.recent || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Carlos' : 'Íris'}: ${clip(m.text, 320)}`)
    .join('\n');

  const control = req.finished
    ? req.alterationsOpen
      ? 'Handoff liberado para alterações (esteira não reabre).'
      : 'Handoff fechado (só consulta).'
    : 'Esteira ativa.';

  if (req.asChangeRequest) {
    const parts = [
      `Você é a Íris no projeto "${req.projectName}".`,
      'Este turno é um PEDIDO DE ALTERAÇÃO.',
      'Faça o necessário no workspace e responda em português, curto e humano.',
      'Na resposta final ao Carlos: diga o essencial do que fez. Sem narrar ferramentas, arquivos de pedido ou checklists de deploy/push.',
      `Workspace: ${req.workspace}`,
      `Etapa: ${req.stageName} (${req.stageOwner}) · ${control}`,
    ];
    if (recent) parts.push('Conversa recente:', recent);
    parts.push('Pedido:', clip(req.question, 2000));
    return parts.join('\n');
  }

  const parts = [
    `Você é a Íris, assistente do projeto "${req.projectName}" no TAVIR Escritório.`,
    'Responda como em um chat normal: natural, breve, em português.',
    'Se for só cumprimento (oi/olá), responda com 1–2 frases cordiais e pergunte como ajudar. Não fale de alteração de código, deploy, push nem arquivos.',
    'Proibido narrar o plano (“Vou olhar…”, “Vou ler…”, “Vou checar…”, “responder direto no chat”). Comece já com a resposta ao Carlos.',
    'Não liste pastas/arquivos/stacks a menos que peçam.',
    'Não mencione pedidos.txt, CLI, JSON nem ferramentas internas.',
    req.alterationsOpen && req.finished
      ? `O projeto está no trilho de alteração, foco "${req.stageName}". Se a mensagem pede análise, plano ou execução, termine com "Pacote do trilho:" e 3 a 6 bullets. Esse texto fica registrado neste foco para o próximo agente.`
      : '',
    `Contexto interno (não recite): workspace ${req.workspace}; etapa ${req.stageName} (${req.stageOwner}); ${control}.`,
  ];

  if (req.memorySnippet) {
    parts.push('Memória útil (use se ajudar, sem colar o bloco):', clip(req.memorySnippet, 600));
  }
  if (recent) {
    parts.push('Conversa recente:', recent);
  }
  parts.push('Mensagem do Carlos:', clip(req.question, 2000));
  return parts.join('\n');
}

const WIN_CONNECT_JS = `"use strict";
const net = require("net");
const orig = net.Socket.prototype.connect;
function localPort() {
  return 18000 + Math.floor(Math.random() * 4000);
}
net.Socket.prototype.connect = function (options, ...rest) {
  if (options && typeof options === "object" && options.localPort == null && !options.path) {
    return orig.call(this, Object.assign({}, options, { localPort: localPort() }), ...rest);
  }
  return orig.call(this, options, ...rest);
};
`;

function childEnvForAgent(motor?: MotorKey): NodeJS.ProcessEnv {
  const env = { ...process.env };
  try {
    const { motorEnvVars } = require('./motorAuth') as typeof import('./motorAuth');
    if (motor) Object.assign(env, motorEnvVars(motor));
  } catch {}
  if (process.platform !== 'win32') return env;
  try {
    const folder = path.join(process.env.LOCALAPPDATA || os.homedir(), 'tavir-cursor');
    fs.mkdirSync(folder, { recursive: true });
    const hook = path.join(folder, 'win-connect.js');
    fs.writeFileSync(hook, WIN_CONNECT_JS, 'utf8');
    const extra = `--use-system-ca --require ${hook}`;
    const current = env.NODE_OPTIONS || '';
    if (!current.includes('--use-system-ca')) {
      env.NODE_OPTIONS = `${current} ${extra}`.trim();
    } else if (!current.includes(hook)) {
      env.NODE_OPTIONS = `${current} --require ${hook}`.trim();
    }
  } catch {}
  return env;
}

function textFromAgentEvent(raw: string): { text: string; mode: 'snapshot' | 'delta' | 'note' } | null {
  const line = raw.trim();
  if (!line) return null;
  if (line.startsWith('{') || line.startsWith('[')) {
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      return null;
    }
    if (Array.isArray(obj)) obj = obj[0];
    if (!obj || typeof obj !== 'object') return null;
    if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
      const joined = obj.message.content.map((part: { text?: string }) => part?.text || '').join('').trim();
      if (joined) return { text: joined, mode: 'snapshot' };
    }
    if (typeof obj.result === 'string' && obj.result.trim()) return { text: obj.result.trim(), mode: 'snapshot' };
    const delta = obj.delta && (obj.delta.text || obj.delta.thinking);
    if (typeof delta === 'string' && delta) return { text: delta, mode: 'delta' };
    const thinking = obj.thinking || obj.thought;
    if (typeof thinking === 'string' && thinking.trim()) return { text: thinking, mode: 'delta' };
    if (typeof obj.text === 'string' && obj.text) return { text: obj.text, mode: 'delta' };
    return null;
  }
  if (line.length < 12 || line.length > 500) return null;
  return { text: line, mode: 'note' };
}

function runAgentProcess(
  binary: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  motor?: MotorKey,
  onChunk?: (line: string) => void,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const isWinScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary);
    const cmd = isWinScript ? 'cmd.exe' : binary;
    const finalArgs = isWinScript ? ['/d', '/c', binary, ...args] : args;

    const child = spawn(cmd, finalArgs, {
      cwd,
      windowsHide: true,
      env: childEnvForAgent(motor),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let pending = '';
    let speech = '';
    let lastEmit = '';
    let lastEmitAt = 0;
    const idleMs = Math.min(180000, Math.max(45000, timeoutMs));
    let idleTimer: ReturnType<typeof setTimeout>;
    let hardTimer: ReturnType<typeof setTimeout>;
    const stop = (message: string) => {
      clearTimeout(idleTimer);
      clearTimeout(hardTimer);
      emitSpeech(true);
      try {
        child.kill();
      } catch {}
      reject(new Error(message));
    };
    const armIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        stop('O motor ficou 3 minutos sem enviar nada. A etapa do trilho não avançou.');
      }, idleMs);
    };
    const absorb = (text: string) => {
      const next = String(text || '');
      if (!next) return;
      if (!speech) {
        speech = next;
        return;
      }
      if (next.startsWith(speech) || (speech.length > 20 && next.includes(speech.slice(0, 24)) && next.length >= speech.length)) {
        speech = next;
        return;
      }
      if (speech.endsWith(next)) return;
      speech += next;
    };
    const emitSpeech = (force: boolean) => {
      if (!onChunk || !speech.trim()) return;
      const now = Date.now();
      if (!force && now - lastEmitAt < 700) return;
      const shown = (speech.length > 1800 ? speech.slice(-1800) : speech).trim();
      if (!shown || shown === lastEmit) return;
      lastEmit = shown;
      lastEmitAt = now;
      onChunk(shown);
    };
    const take = (chunk: string) => {
      if (!onChunk) return;
      pending += chunk;
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() || '';
      for (const part of parts) {
        const piece = textFromAgentEvent(part);
        if (!piece) continue;
        if (piece.mode === 'note') {
          onChunk(piece.text.slice(0, 500));
          continue;
        }
        absorb(piece.text);
      }
      emitSpeech(false);
    };
    hardTimer = setTimeout(() => {
      stop(`O motor não concluiu em ${Math.round(timeoutMs / 1000)}s. A etapa do trilho não avançou.`);
    }, timeoutMs);
    armIdle();

    child.stdout?.on('data', (buf) => {
      const text = Buffer.from(buf).toString('utf8');
      stdout += text;
      armIdle();
      take(text);
    });
    child.stderr?.on('data', (buf) => {
      const text = Buffer.from(buf).toString('utf8');
      stderr += text;
      armIdle();
      take(text);
    });
    child.on('error', (err) => {
      clearTimeout(idleTimer);
      clearTimeout(hardTimer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(idleTimer);
      clearTimeout(hardTimer);
      if (pending.trim()) {
        const rest = pending;
        pending = '';
        take(`${rest}\n`);
      }
      emitSpeech(true);
      resolve({ stdout, stderr, code });
    });
  });
}

export async function converseWithIrisAgent(req: IrisAgentRequest): Promise<IrisAgentResult> {
  const thoughts: string[] = [];
  const motor = normalizeMotor(req.engineId);
  const modelLabel = req.model || 'auto';
  const timeoutMs = Math.max(20000, Number(req.timeoutMs) || 90000);
  const mode: IrisAgentMode = req.asChangeRequest && req.alterationsOpen ? 'agent' : 'ask';
  const chosenModel = mapModelForMotor(motor, modelLabel, req.effort);
  const prompt = buildPrompt(req);

  const binary = findMotorBinary(motor);
  if (!binary) {
    return {
      ok: false,
      text: motorMissingMessage(motor),
      thoughts: [`[IrisAgent] Binário do motor ${motor} não encontrado`],
      engine: motor,
      model: modelLabel,
      mode,
      error: 'agent-missing',
    };
  }

  thoughts.push(`[IrisAgent] motor=${motor} · ${binary}`);
  thoughts.push(`[Modo] ${mode} · model ${chosenModel}`);
  thoughts.push(`[Workspace] ${req.workspace}`);
  thoughts.push(`[Pergunta] ${clip(req.question, 120)}`);
  if (req.onProgress) thoughts.forEach((line) => req.onProgress?.(line));

  const orderDir = path.join(req.workspace, 'qa', 'orders');
  try {
    fs.mkdirSync(orderDir, { recursive: true });
  } catch {}
  const orderFile = path.join(orderDir, mode === 'ask' ? 'chat-pedido.txt' : 'pedido-atual.md');
  try {
    fs.writeFileSync(orderFile, prompt, 'utf8');
  } catch (err) {
    return {
      ok: false,
      text: `Não consegui gravar o pedido no workspace (${String(err)}).`,
      thoughts,
      engine: motor,
      model: modelLabel,
      mode,
      error: 'order-write',
    };
  }

  const relative = path.relative(req.workspace, orderFile).split(path.sep).join('/');
  const { args } = buildCliInvocation(motor, mode, req.workspace, chosenModel, req.effort, prompt, relative);

  try {
    try {
      await execFileAsync(binary, motor === 'codex' ? ['--version'] : ['--version'], {
        windowsHide: true,
        timeout: 8000,
      });
    } catch {}

    const proc = await runAgentProcess(binary, args, req.workspace, timeoutMs, motor, req.onProgress);
    let text = '';
    try {
      text = extractAgentText(proc.stdout + '\n' + proc.stderr, motor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      thoughts.push(`[Erro parse] ${msg}`);
      if (/not authenticated|not logged|login|401|unauthor|oauth|bearer/i.test(msg + ' ' + proc.stderr)) {
        return {
          ok: false,
          text: `O motor ${motor} não está autenticado. Em Configurações → Motores, use «Entrar com login» ou salve a chave no cofre.`,
          thoughts,
          engine: motor,
          model: modelLabel,
          mode,
          error: 'auth',
        };
      }
      return {
        ok: false,
        text: `O motor ${motor} respondeu com erro: ${clip(msg, 280)}`,
        thoughts,
        engine: motor,
        model: modelLabel,
        mode,
        error: 'parse',
      };
    }

    if (!text) {
      const errTail = clip(proc.stderr || proc.stdout || 'resposta vazia', 240);
      thoughts.push(`[Vazio] code=${proc.code} · ${errTail}`);
      return {
        ok: false,
        text: `O motor ${motor} não devolveu texto útil (${errTail}).`,
        thoughts,
        engine: motor,
        model: modelLabel,
        mode,
        error: 'empty',
      };
    }

    text = text.replace(/\r?\nINFORMA[^\n]*/gi, '').trim();
    if (/failed to authenticate|not authenticated|not logged|oauth session expired|login required/i.test(text)) {
      return {
        ok: false,
        text: `O motor ${motor} precisa de login. Em Configurações → Motores, use «Entrar com login» ou salve a chave no cofre.`,
        thoughts: thoughts.concat([`[Auth] ${clip(text, 180)}`]),
        engine: motor,
        model: modelLabel,
        mode,
        error: 'auth',
      };
    }

    thoughts.push(`[OK] ${motor} · ${text.length} chars · code ${proc.code}`);
    return {
      ok: true,
      text: text.trim(),
      thoughts,
      engine: motor,
      model: modelLabel,
      mode,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    thoughts.push(`[Falha] ${msg}`);
    return {
      ok: false,
      text: `Não consegui conversar com o motor ${motor} agora: ${msg}`,
      thoughts,
      engine: motor,
      model: modelLabel,
      mode,
      error: 'spawn',
    };
  } finally {
    if (mode === 'ask') {
      try {
        fs.unlinkSync(orderFile);
      } catch {}
    }
  }
}
