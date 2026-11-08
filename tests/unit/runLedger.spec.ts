import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { startRun, listRuns, readRun, buildTranscript, parseUsage, makeRedactor } from '../../src/main/runLedger';

const CLAUDE_STREAM = [
  { type: 'system', subtype: 'init', model: 'claude-opus-5-5' },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Vou criar o arquivo.' }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'novo.txt' } }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', content: 'ok', is_error: false }] } },
  {
    type: 'result',
    subtype: 'success',
    result: 'Arquivo criado.',
    num_turns: 3,
    duration_ms: 4200,
    total_cost_usd: 0.0123,
    usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 50 },
  },
]
  .map((x) => JSON.stringify(x))
  .join('\n');

const CODEX_STREAM = [
  { type: 'item.started', item: { type: 'command_execution', command: 'npm test' } },
  { type: 'item.completed', item: { type: 'command_execution', command: 'npm test', aggregated_output: '1 failed', exit_code: 1 } },
  { type: 'item.completed', item: { type: 'agent_message', text: 'Os testes falharam.' } },
  { type: 'turn.completed', usage: { input_tokens: 900, cached_input_tokens: 100, output_tokens: 80 } },
]
  .map((x) => JSON.stringify(x))
  .join('\n');

describe('livro de execuções', () => {
  let ws: string;

  beforeEach(() => {
    ws = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-runs-'));
    fs.writeFileSync(path.join(ws, 'existente.txt'), 'linha 1\n');
    fs.writeFileSync(path.join(ws, 'apagar.txt'), 'tchau\n');
    fs.writeFileSync(path.join(ws, '.env.project'), 'API_KEY=valor-super-secreto-123\n');
  });

  afterEach(() => {
    fs.rmSync(ws, { recursive: true, force: true });
  });

  it('grava pedido, saída bruta, transcrição, métricas e o diff real do disco', async () => {
    const run = await startRun({
      workspace: ws,
      kind: 'esteira',
      label: 'Build',
      stage: 'Build',
      owner: 'Vitor',
      engine: 'claude',
      binary: 'claude',
      model: 'claude-opus-5-5',
      effort: 'high',
      mode: 'agent',
      args: ['-p'],
      timeoutMs: 1000,
      prompt: 'Pedido completo com a chave valor-super-secreto-123',
    });

    // O "motor" mexe no disco enquanto roda.
    fs.writeFileSync(path.join(ws, 'novo.txt'), 'criado\n');
    fs.appendFileSync(path.join(ws, 'existente.txt'), 'linha 2\n');
    fs.unlinkSync(path.join(ws, 'apagar.txt'));
    fs.mkdirSync(path.join(ws, 'node_modules', 'x'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'node_modules', 'x', 'i.js'), 'ignorar');

    run.raw('stdout', CLAUDE_STREAM);
    run.raw('stderr', 'aviso: token sk-ant-abcdefghijklmnopqrstuvwxyz0123\n');
    const meta = await run.finish({ ok: true, exitCode: 0, reply: 'Arquivo criado.\n\nCom quebra de linha.' });

    expect(meta.status).toBe('ok');
    expect(meta.kind).toBe('esteira');
    expect(meta.exitCode).toBe(0);
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(meta.toolCalls).toBe(1);
    expect(meta.usage).toMatchObject({ inputTokens: 1200, outputTokens: 300, cacheReadTokens: 50, costUsd: 0.0123, turns: 3 });
    expect(meta.changes?.available).toBe(true);
    expect(meta.changes?.added).toEqual(['novo.txt']);
    expect(meta.changes?.modified).toEqual(['existente.txt']);
    expect(meta.changes?.deleted).toEqual(['apagar.txt']);

    const full = readRun(ws, meta.id);
    expect(full.ok).toBe(true);
    expect(full.prompt).toContain('Pedido completo');
    expect(full.prompt).not.toContain('valor-super-secreto-123');
    expect(full.stderr.text).not.toContain('sk-ant-abcdef');
    expect(full.resposta).toContain('\n\nCom quebra de linha.');
    expect(full.transcricao).toContain('**Write**');
    expect(full.diff.text).toContain('+linha 2');
    expect(full.diff.text).not.toContain('node_modules');

    const list = listRuns(ws);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: meta.id, filesChanged: 3, status: 'ok' });
  });

  it('o git do projeto passa a ignorar os registros', async () => {
    fs.mkdirSync(path.join(ws, '.git', 'info'), { recursive: true });
    const run = await startRun({
      workspace: ws,
      kind: 'chat',
      engine: 'cursor',
      binary: 'agent',
      model: 'auto',
      effort: 'balanced',
      mode: 'ask',
      args: [],
      timeoutMs: 1000,
      prompt: 'oi',
    });
    await run.finish({ ok: false, exitCode: 1, reply: '', error: 'falhou' });
    const exclude = fs.readFileSync(path.join(ws, '.git', 'info', 'exclude'), 'utf8');
    expect(exclude).toContain('.tavir/runs/');
    expect(exclude).toContain('.tavir/shadow.git/');
    expect(listRuns(ws)[0]).toMatchObject({ status: 'failed', filesChanged: 0 });
  });

  it('recusa ids fora do padrão', () => {
    expect(readRun(ws, '../../etc').ok).toBe(false);
  });
});

describe('leitura da saída dos motores', () => {
  it('transcreve comandos e falhas do Codex', () => {
    const t = buildTranscript(CODEX_STREAM);
    expect(t.toolCalls).toBe(1);
    expect(t.markdown).toContain('npm test');
    expect(t.markdown).toContain('código de saída 1');
    expect(t.markdown).toContain('Os testes falharam.');
  });

  it('lê tokens do Codex', () => {
    expect(parseUsage(CODEX_STREAM)).toMatchObject({ inputTokens: 900, outputTokens: 80, cacheReadTokens: 100 });
  });

  it('transcreve ferramentas do Cursor', () => {
    const stream = [
      { type: 'tool_call', subtype: 'started', tool_call: { shellToolCall: { args: { command: 'flutter test' } } } },
      { type: 'tool_call', subtype: 'completed', tool_call: { shellToolCall: { result: { success: { content: 'All tests passed' } } } } },
    ]
      .map((x) => JSON.stringify(x))
      .join('\n');
    const t = buildTranscript(stream);
    expect(t.toolCalls).toBe(1);
    expect(t.markdown).toContain('**shell**');
    expect(t.markdown).toContain('All tests passed');
  });

  it('mascara segredos conhecidos', () => {
    const redact = makeRedactor(os.tmpdir());
    expect(redact('Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456')).toBe('Authorization: Bearer «segredo»');
    expect(redact('key=AKIAABCDEFGHIJKLMNOP')).toBe('key=«segredo»');
  });
});

describe('falhas de ferramenta', () => {
  it('conta chamadas bloqueadas por hook', () => {
    const stream = [
      { type: 'tool_call', subtype: 'started', tool_call: { readToolCall: { args: { path: 'a.txt' } } } },
      { type: 'tool_call', subtype: 'completed', tool_call: { readToolCall: { result: { error: { errorMessage: 'Hook blocked' } } } } },
      { type: 'tool_call', subtype: 'started', tool_call: { lsToolCall: { args: { path: '.' } } } },
      { type: 'tool_call', subtype: 'completed', tool_call: { lsToolCall: { result: { success: { content: 'src' } } } } },
    ]
      .map((x) => JSON.stringify(x))
      .join('\n');
    const t = buildTranscript(stream);
    expect(t.toolCalls).toBe(2);
    expect(t.toolErrors).toBe(1);
  });
});
