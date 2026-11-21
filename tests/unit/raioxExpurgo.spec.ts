import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { listPurgeReports, previewPurge, purgeCase } from '../../src/main/raiox/purge';
import { syncCases } from '../../src/main/raiox/raioxBridge';
import { createCase } from '../../src/main/raiox/raioxRules';
import { caseDir, listCases, sha256File, writeCase } from '../../src/main/raiox/raioxStore';
import type { RaioxCase } from '../../src/shared/raiox';

const NOW = '2026-11-21T18:00:00.000Z';
const UUID = 'f1c2d3e4-77da-43da-bfd4-5c51eb908253';
const ID = 'RX-F1C2D3E4';
const COMPANY = 'Padaria Ficticia Ensaio';
const EMAIL = 'titular.ficticio@exemplo.com';
const REPO = path.resolve(__dirname, '../..');
const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-expurgo-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function put(file: string, text: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

/** Caso fictício com rastro em todos os lugares que o expurgo cobre. */
function scene(withRemote = false) {
  const root = temp();
  const home = temp();
  const tmp = temp();
  const out = temp();
  let c: RaioxCase = createCase({ company: COMPANY, objective: 'Ver', decisionNeeded: 'Seguir', frontier: 'Sinais públicos.' }, NOW, UUID);
  if (withRemote) c = { ...c, remote: { supabaseId: UUID, status: 'form_2_received', syncedAt: NOW } };
  writeCase(root, c);
  const dir = caseDir(root, ID);
  put(path.join(dir, 'documentos', 'v1', 'relatorio-raio-x.pdf'), `pdf de ${COMPANY}`);
  put(path.join(dir, '.tavir', 'runs', 'r1', 'raw.log'), `${COMPANY} ${EMAIL}`);
  const exported = put(path.join(out, 'relatorio-raio-x.pdf'), `pdf de ${COMPANY}`);
  c = { ...c, exports: [{ at: NOW, dir: out, files: [{ name: 'relatorio-raio-x.pdf', sha256: sha256File(exported) }] }] };
  writeCase(root, c);

  const claude = path.join(home, '.claude', 'projects', dir.replace(/[^A-Za-z0-9]/g, '-'));
  put(path.join(claude, 's.jsonl'), COMPANY);
  const cursorHash = path.join(home, '.cursor', 'chats', createHash('md5').update(dir).digest('hex'));
  put(path.join(cursorHash, 'c1', 'meta.json'), JSON.stringify({ cwd: dir }));
  const codex = put(path.join(home, '.codex', 'sessions', '2026', '11', '21', 'rollout-1.jsonl'), JSON.stringify({ type: 'session_meta', payload: { cwd: dir } }) + '\n' + COMPANY);
  const brain = path.join(home, '.gemini', 'antigravity-cli', 'brain', 'conv-1');
  put(path.join(brain, '.system_generated', 'logs', 'transcript.txt'), `cwd ${JSON.stringify(dir)} ${COMPANY}`);
  const shared = put(path.join(home, '.gemini', 'antigravity-cli', 'conversation_summaries.db'), `x ${dir} y`);
  const temporary = put(path.join(tmp, `render-${ID}.html`), COMPANY);

  // Rastros de outros trabalhos, que não podem ser tocados.
  const otherClaude = put(path.join(home, '.claude', 'projects', 'C--outro-projeto', 's.jsonl'), 'outro');
  const otherCodex = put(path.join(home, '.codex', 'sessions', '2026', '11', '21', 'rollout-2.jsonl'), JSON.stringify({ payload: { cwd: 'C:\\outro' } }) + `\n${ID}`);
  const otherBrain = put(path.join(home, '.gemini', 'antigravity-cli', 'brain', 'conv-2', 't.txt'), `falamos do ${ID} no repositório`);
  return { root, home, tmp, dir, exported, claude, cursorHash, codex, brain, shared, temporary, otherClaude, otherCodex, otherBrain };
}

describe('G-PR1 controle 7 — expurgo provado', () => {
  it('prévia mostra o que vai apagar e não apaga nada', () => {
    const s = scene();
    const p = previewPurge(s.root, ID, { home: s.home, tmp: s.tmp });
    const by = Object.fromEntries(p.areas.map((a) => [a.area, a]));
    expect(by['pasta do caso'].found).toBe(1);
    expect(by['PDFs exportados'].found).toBe(1);
    expect(by['temporários'].found).toBe(1);
    expect(by['motor · Claude (conversas)'].found).toBe(1);
    expect(by['motor · Cursor (conversas)'].found).toBe(1);
    expect(by['motor · Codex (sessões)'].found).toBe(1);
    expect(by['motor · Antigravity (conversas)'].found).toBe(1);
    expect(by['motor · arquivos compartilhados'].status).toBe('manual');
    expect(fs.existsSync(s.dir)).toBe(true);
    expect(fs.existsSync(s.exported)).toBe(true);
  });

  it('recusa sem motivo ou sem digitar o código do caso', () => {
    const s = scene();
    expect(() => purgeCase(s.root, ID, { reason: '', confirm: ID }, { home: s.home, tmp: s.tmp })).toThrow(/motivo/);
    expect(() => purgeCase(s.root, ID, { reason: 'ensaio', confirm: 'RX-00000000' }, { home: s.home, tmp: s.tmp })).toThrow(/digite o código/);
    expect(fs.existsSync(s.dir)).toBe(true);
  });

  it('apaga caso, cópias, temporários e conversas dos motores; confere e não toca no resto', () => {
    const s = scene();
    const report = purgeCase(s.root, ID, { reason: 'ensaio', confirm: ID.toLowerCase() }, { home: s.home, tmp: s.tmp, now: () => NOW });
    for (const gone of [s.dir, s.exported, s.temporary, s.claude, s.cursorHash, s.codex, s.brain]) expect(fs.existsSync(gone), gone).toBe(false);
    for (const kept of [s.otherClaude, s.otherCodex, s.otherBrain, s.shared]) expect(fs.existsSync(kept), kept).toBe(true);
    for (const a of report.areas.filter((x) => x.area !== 'motor · arquivos compartilhados')) {
      expect(a.status, a.area).toBe('limpo');
      expect(a.remaining, a.area).toBe(0);
    }
    const shared = report.areas.find((a) => a.area === 'motor · arquivos compartilhados')!;
    expect(shared).toMatchObject({ status: 'manual', found: 1 });
    expect(shared.note).toContain('~/.gemini/antigravity-cli/conversation_summaries.db');
    expect(report.complete).toBe(false);
    expect(listCases(s.root)).toEqual([]);
  });

  it('relatório de ausência fica fora da pasta do caso e não tem dado pessoal', () => {
    const s = scene();
    purgeCase(s.root, ID, { reason: 'pedido_titular', confirm: ID }, { home: s.home, tmp: s.tmp, now: () => NOW });
    const files = fs.readdirSync(path.join(s.root, 'expurgos'));
    expect(files).toHaveLength(1);
    const raw = fs.readFileSync(path.join(s.root, 'expurgos', files[0]), 'utf8');
    expect(raw).not.toContain(COMPANY);
    expect(raw).not.toContain(EMAIL);
    expect(raw).not.toContain('Ficticia');
    expect(raw).not.toContain(os.homedir());
    expect(listPurgeReports(s.root)[0]).toMatchObject({ caseId: ID, reason: 'pedido_titular', purgedAt: NOW });
  });

  it('caso remoto: Supabase fica pendente, Telegram manual e o sync não traz o caso de volta', async () => {
    const s = scene(true);
    const report = purgeCase(s.root, ID, { reason: 'pedido_titular', confirm: ID }, { home: s.home, tmp: s.tmp, now: () => NOW });
    const supa = report.areas.find((a) => a.area === 'Supabase')!;
    expect(supa.status).toBe('pendente');
    expect(supa.note).toContain(`purge_raiox_case('${UUID}')`);
    expect(report.areas.find((a) => a.area === 'Telegram')?.status).toBe('manual');
    expect(report.supabaseId).toBe(UUID);
    const fetchImpl = (async () => new Response(JSON.stringify({ ok: true, truncated: false, cases: [{
      id: UUID, status: 'form_2_received', cliente: COMPANY, etapa: 'form_2_received', criado_em: NOW, atualizado_em: NOW,
    }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
    const result = await syncCases({
      root: s.root, repo: REPO, fetchImpl, now: () => NOW,
      config: () => ({ url: 'https://skcbjwqajdovxlsxeszv.supabase.co', officeSyncSecret: 'a'.repeat(32) }),
    });
    expect(result).toEqual({ ok: true, created: 0, updated: 0 });
    expect(listCases(s.root)).toEqual([]);
  });

  it('Supabase: função apaga cada tabela do caso na ordem das chaves e só roda com service_role', () => {
    const sql = fs.readFileSync(path.join(REPO, 'raiox', 'web', 'supabase', 'migrations', '20261121150000_raiox_gpr1_expurgo.sql'), 'utf8');
    const tables = [
      'raiox_form_submissions', 'raiox_consents', 'raiox_events', 'raiox_approvals', 'raiox_documents',
      'raiox_email_deliveries', 'raiox_invite_deliveries', 'raiox_email_verifications', 'raiox_form_sessions',
    ];
    const at = (t: string) => sql.indexOf(`delete from public.${t} where case_id = p_case_id`);
    for (const t of tables) expect(at(t), t).toBeGreaterThan(0);
    // Respostas antes das sessões (chave "on delete restrict").
    expect(at('raiox_form_submissions')).toBeLessThan(at('raiox_form_sessions'));
    expect(sql.indexOf('delete from public.raiox_cases where id = p_case_id')).toBeGreaterThan(at('raiox_form_sessions'));
    expect(sql).toContain('delete from public.raiox_optins where id = v_optin');
    expect(sql).toMatch(/revoke all on function public\.purge_raiox_case\(uuid\) from public, anon, authenticated/);
    // Toda tabela criada com case_id entra no expurgo.
    const migrations = fs.readdirSync(path.join(REPO, 'raiox', 'web', 'supabase', 'migrations'));
    const created = new Set<string>();
    for (const m of migrations) {
      const text = fs.readFileSync(path.join(REPO, 'raiox', 'web', 'supabase', 'migrations', m), 'utf8');
      for (const hit of text.matchAll(/create table (?:if not exists )?public\.(raiox_[a-z_]+) \(([\s\S]*?)\n\);/g)) {
        if (/\bcase_id uuid\b/.test(hit[2])) created.add(hit[1]);
      }
    }
    expect([...created].sort()).toEqual([...tables].sort());
  });
});
