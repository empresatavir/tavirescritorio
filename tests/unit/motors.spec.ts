import { describe, it, expect } from 'vitest';
import { MotorStream, buildInvocation, classifyMotorError, cliModel, motorEnv, type MotorId } from '../../src/main/motors';
import { buildPrompt, formatHistory, tidyReply, type IrisAgentRequest } from '../../src/main/irisAgent';
import { buildTranscript, parseUsage } from '../../src/main/runLedger';

const lines = (xs: unknown[]) => xs.map((x) => JSON.stringify(x)).join('\n');

function feedAll(motor: MotorId, stdout: string): MotorStream {
  const s = new MotorStream(motor);
  for (const l of stdout.split('\n')) s.feed(l);
  s.settle();
  return s;
}

// Amostras reduzidas de saídas reais capturadas em 2026-11-08.
const CURSOR_PARTIAL = lines([
  { type: 'system', subtype: 'init', session_id: 's' },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Vou ler o ' }] }, session_id: 's', timestamp_ms: 1 },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'arquivo.' }] }, session_id: 's', timestamp_ms: 2 },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Vou ler o arquivo.' }] }, session_id: 's', model_call_id: 'm1', timestamp_ms: 3 },
  { type: 'tool_call', subtype: 'started', tool_call: { readToolCall: { args: { path: 'C:\\ws\\segredo.txt' } } } },
  { type: 'tool_call', subtype: 'completed', tool_call: { readToolCall: { result: { success: { content: 'ABACAXI-42' } } } } },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'A palavra é ' }] }, session_id: 's', timestamp_ms: 4 },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'ABACAXI-42.' }] }, session_id: 's', timestamp_ms: 5 },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'A palavra é ABACAXI-42.' }] }, session_id: 's' },
  { type: 'result', subtype: 'success', is_error: false, result: 'Vou ler o arquivo.A palavra é ABACAXI-42.', usage: { inputTokens: 13738, outputTokens: 123 } },
]);

const CLAUDE_STREAM = lines([
  { type: 'system', subtype: 'init' },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Vou abrir o config.' }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'config.json' } }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', content: '{"porta":4317}' }] } },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'A porta é 4317.' }] } },
  { type: 'result', subtype: 'success', is_error: false, result: 'A porta é 4317.', total_cost_usd: 0.01, usage: { input_tokens: 10, output_tokens: 5 } },
]);

const CLAUDE_PLAN_ERROR = lines([
  { type: 'result', subtype: 'success', is_error: true, api_error_status: 403, result: 'Failed to authenticate. API Error: 403 Claude Opus 5.5 requires Pro plan. Subscribe to continue.' },
]);

const CODEX_STREAM = lines([
  { type: 'thread.started', thread_id: 't' },
  { type: 'item.started', item: { type: 'command_execution', command: 'type config.json' } },
  { type: 'item.completed', item: { type: 'command_execution', command: 'type config.json', aggregated_output: '{"porta":4317}', exit_code: 0 } },
  { type: 'item.completed', item: { type: 'agent_message', text: 'A porta é 4317.' } },
  { type: 'turn.completed', usage: { input_tokens: 900, cached_input_tokens: 100, output_tokens: 80 } },
]);

const CODEX_AUTH = lines([
  { type: 'error', message: 'unexpected status 401 Unauthorized: Missing bearer or basic authentication in header' },
  { type: 'turn.failed', error: { message: 'unexpected status 401 Unauthorized: Missing bearer or basic authentication in header' } },
]);

const AGY_STREAM = lines([
  { event: 'init', conversation_id: 'c', init: { model: 'gemini-3.8-flash-medium' } },
  { event: 'step_update', step_update: { step_index: 0, state: 'DONE', step_type: 'user_input' } },
  { event: 'step_update', step_update: { step_index: 2, state: 'ACTIVE', step_type: 'tool', tool_name: 'read_file', tool_info: { name: 'read_file', parameters: { Path: 'C:\\ws\\segredo.txt' } } } },
  { event: 'step_update', step_update: { step_index: 2, state: 'DONE', step_type: 'tool', tool_name: 'read_file' } },
  { event: 'result', result: { status: 'SUCCESS', response: 'ABACAXI-42', duration_seconds: 4.2, usage: { input_tokens: 9720, output_tokens: 289, cache_read_tokens: 0 } } },
]);

const AGY_DENIED = lines([
  { event: 'result', result: { status: 'SUCCESS', response: '', denied_actions: [{ action: 'command', display_name: 'RunCommand' }] } },
]);

describe('leitura unificada dos motores', () => {
  it('Cursor: resposta é só o que veio depois da última ferramenta', () => {
    const s = feedAll('cursor', CURSOR_PARTIAL);
    expect(s.reply()).toBe('A palavra é ABACAXI-42.');
    expect(s.error()).toBe('');
    expect(s.progress().activity).toContain('Lendo');
  });

  it('Claude: usa o result final e reconhece a ferramenta', () => {
    const s = feedAll('claude', CLAUDE_STREAM);
    expect(s.reply()).toBe('A porta é 4317.');
    expect(s.progress().activity).toBe('Lendo config.json');
  });

  it('Claude: erro de plano vira erro classificado', () => {
    const s = feedAll('claude', CLAUDE_PLAN_ERROR);
    expect(s.error()).toMatch(/Pro plan/);
    expect(classifyMotorError('claude', s.error()).kind).toBe('plan');
  });

  it('Codex: última fala do agente e comando como atividade', () => {
    const s = feedAll('codex', CODEX_STREAM);
    expect(s.reply()).toBe('A porta é 4317.');
    expect(feedAll('codex', CODEX_AUTH).error()).toMatch(/401/);
    expect(classifyMotorError('codex', feedAll('codex', CODEX_AUTH).error()).kind).toBe('auth');
  });

  it('Antigravity: resposta do result e ferramenta do step_update', () => {
    const s = feedAll('antigravity', AGY_STREAM);
    expect(s.reply()).toBe('ABACAXI-42');
    expect(s.progress().activity).toBe('Lendo ws/segredo.txt');
    expect(feedAll('antigravity', AGY_DENIED).error()).toMatch(/bloqueada/);
  });

  it('modelo desconhecido é classificado igual em todos', () => {
    for (const m of ['cursor', 'claude', 'codex', 'antigravity'] as MotorId[]) {
      expect(classifyMotorError(m, 'API Error: 400 Unknown model: x').kind).toBe('model');
    }
  });
});

describe('mesma intenção, mesma invocação', () => {
  const call = { workspace: 'C:\\ws', prompt: 'oi', model: '', effort: 'high' };

  it('leitura nunca libera escrita, em nenhum motor', () => {
    const cursor = buildInvocation({ ...call, motor: 'cursor', access: 'read' }, 'agent.cmd').args;
    expect(cursor).toContain('ask');
    expect(cursor).not.toContain('--force');
    const claude = buildInvocation({ ...call, motor: 'claude', access: 'read' }, 'claude').args;
    expect(claude).not.toContain('--dangerously-skip-permissions');
    expect(claude).toEqual(expect.arrayContaining(['--disallowedTools', 'Edit', 'Write', 'Bash']));
    const codex = buildInvocation({ ...call, motor: 'codex', access: 'read' }, 'codex').args;
    expect(codex.join(' ')).toContain('-s read-only');
    const agy = buildInvocation({ ...call, motor: 'antigravity', access: 'read' }, 'agy').args;
    expect(agy.join(' ')).toContain('--mode plan');
    expect(agy).not.toContain('--dangerously-skip-permissions');
  });

  it('escrita libera edição nos 4', () => {
    expect(buildInvocation({ ...call, motor: 'cursor', access: 'write' }, 'a').args).toContain('--force');
    expect(buildInvocation({ ...call, motor: 'claude', access: 'write' }, 'a').args).toContain('--dangerously-skip-permissions');
    expect(buildInvocation({ ...call, motor: 'codex', access: 'write' }, 'a').args.join(' ')).toContain('-s workspace-write');
    expect(buildInvocation({ ...call, motor: 'antigravity', access: 'write' }, 'a').args.join(' ')).toContain('--mode auto');
  });

  it('o pedido inteiro vai pelo stdin (sem limite de linha de comando)', () => {
    const big = 'x'.repeat(50000);
    for (const m of ['cursor', 'claude', 'codex'] as MotorId[]) {
      const inv = buildInvocation({ ...call, prompt: big, motor: m, access: 'read' }, 'bin');
      expect(inv.stdin).toBe(big);
      expect(inv.args.join(' ')).not.toContain('xxxx');
    }
    const agy = buildInvocation({ ...call, prompt: big, motor: 'antigravity', access: 'read' }, 'agy');
    expect(JSON.parse(agy.stdin).message.content).toBe(big);
  });

  it('Codex fora de repositório git e com esforço', () => {
    const args = buildInvocation({ ...call, motor: 'codex', access: 'read' }, 'codex').args;
    expect(args).toContain('--skip-git-repo-check');
    expect(args.join(' ')).toContain('model_reasoning_effort="high"');
    expect(args[args.length - 1]).toBe('-');
  });

  it('modelos antigos do catálogo viram ids válidos', () => {
    expect(cliModel('claude', 'claude-sonnet-4-5', 'medium')).toBe('claude-sonnet-5-5');
    expect(cliModel('codex', 'gpt-5-codex', 'medium')).toBe('');
    expect(cliModel('antigravity', 'gemini-2.5-pro', 'high')).toBe('gemini-4-argon-high');
    expect(cliModel('antigravity', 'gemini-4-argon', 'xhigh')).toBe('gemini-4-argon-high');
    expect(cliModel('cursor', 'auto-smart', 'cost')).toBe('auto');
  });

  it('ambiente sem variáveis do Git Bash', () => {
    process.env.MSYSTEM = 'MINGW64';
    process.env.SHELL = '/usr/bin/bash';
    const env = motorEnv('cursor');
    expect(env.MSYSTEM).toBeUndefined();
    expect(env.SHELL).toBeUndefined();
  });
});

describe('prompt da Íris', () => {
  const req: IrisAgentRequest = {
    workspace: 'C:\\ws',
    question: 'E o arquivo de configuração?',
    projectName: 'Loja',
    stageName: 'Handoff',
    stageOwner: 'Paula PM',
    engineId: 'cursor',
    model: 'auto-smart',
    effort: 'medium',
    finished: true,
    alterationsOpen: false,
    asChangeRequest: false,
    recent: [
      { role: 'user', text: 'Qual a stack?' },
      { role: 'assistant', text: 'Next.js com Tailwind.' },
    ],
    projectFacts: ['Stack detectada: Next.js'],
  };

  it('leva histórico, fatos e a pergunta inteira', () => {
    const long = 'p'.repeat(8000);
    const prompt = buildPrompt({ ...req, question: long }, 'read');
    expect(prompt).toContain('Carlos: Qual a stack?');
    expect(prompt).toContain('Íris: Next.js com Tailwind.');
    expect(prompt).toContain('Stack detectada: Next.js');
    expect(prompt).toContain(long);
    expect(prompt).toContain('só leitura');
  });

  it('pedido de alteração pede verificação e proíbe deploy', () => {
    const prompt = buildPrompt({ ...req, asChangeRequest: true, alterationsOpen: true }, 'write');
    expect(prompt).toContain('pedido de alteração');
    expect(prompt).toContain('Não faça deploy');
  });

  it('histórico corta as falas mais antigas primeiro', () => {
    const recent = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', text: `fala ${i} ` + 'z'.repeat(2000) }));
    const h = formatHistory(recent);
    expect(h).toContain('fala 29');
    expect(h).not.toContain('fala 0 ');
    expect(h.length).toBeLessThanOrEqual(16000);
  });

  it('tira só a narração de abertura e mantém quebras de linha', () => {
    expect(tidyReply('Vou ler o arquivo. A porta é 4317.\n\n- item')).toBe('A porta é 4317.\n\n- item');
    expect(tidyReply('Vou.')).toBe('Vou.');
  });
});

describe('livro de execuções entende os 4 formatos', () => {
  it('Antigravity: ferramenta, resposta e tokens', () => {
    const t = buildTranscript(AGY_STREAM);
    expect(t.toolCalls).toBe(1);
    expect(t.markdown).toContain('read_file');
    expect(t.markdown).toContain('ABACAXI-42');
    expect(parseUsage(AGY_STREAM)).toMatchObject({ inputTokens: 9720, outputTokens: 289 });
  });

  it('Cursor: fragmentos não perdem letras repetidas', () => {
    const t = buildTranscript(lines([
      { type: 'assistant', message: { content: [{ type: 'text', text: 'aa' }] }, timestamp_ms: 1 },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'a' }] }, timestamp_ms: 2 },
    ]));
    expect(t.markdown).toContain('aaa');
  });
});
