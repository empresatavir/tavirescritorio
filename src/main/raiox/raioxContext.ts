import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RaioxCase } from '../../shared/raiox';
import { RaioxError } from './raioxRules';
import { caseDir } from './raioxStore';

export type RaioxContextKind = 'analise' | 'redacao';

export interface ContextOptions {
  fronts?: string[];
  version?: number;
  repo?: string;
}

const SKILLS = ['instagram-profile-audit', 'web-platform-audit', 'seo-growth', 'funil-vendas', 'web-security'];

export function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function copyTree(src: string, dest: string): void {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    const real = fs.realpathSync(src);
    copyTree(real, dest);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) copyTree(path.join(src, name), path.join(dest, name));
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function fill(template: string, c: RaioxCase, opts: ContextOptions): string {
  const fronts = (opts.fronts && opts.fronts.length ? opts.fronts : ['as frentes públicas informadas no caso']).join(', ');
  return template
    .replaceAll('{{CASE_ID}}', c.id)
    .replaceAll('{{FRENTES}}', fronts)
    .replaceAll('{{NICHO}}', (c.segment || '').trim() || 'não informado')
    .replaceAll('{{N}}', String(opts.version ?? 1));
}

function nichoDir(repo: string, segment: string | undefined): string | null {
  const base = path.join(repo, 'marketing', 'inteligencia-nichos');
  if (!fs.existsSync(base)) return null;
  const slug = (segment || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) return null;
  const direct = path.join(base, slug);
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;
  return null;
}

export function buildContext(root: string, c: RaioxCase, kind: RaioxContextKind, opts: ContextOptions = {}): string {
  const repo = opts.repo || repoRoot();
  const dir = caseDir(root, c.id);
  const contexto = path.join(dir, '_contexto');
  fs.rmSync(contexto, { recursive: true, force: true });
  fs.mkdirSync(contexto, { recursive: true });

  const promptFile = path.join(repo, 'raiox', 'prompts', kind === 'analise' ? 'analise.md' : 'redacao.md');
  if (!fs.existsSync(promptFile)) throw new RaioxError('O prompt do Raio-X não está no repositório.');
  fs.writeFileSync(path.join(contexto, 'prompt.md'), fill(fs.readFileSync(promptFile, 'utf8'), c, opts), 'utf8');

  const modelos = path.join(repo, 'raiox', 'modelos');
  if (fs.existsSync(modelos)) {
    for (const name of fs.readdirSync(modelos)) {
      if (!name.endsWith('.md') || name === '.gitkeep') continue;
      copyTree(path.join(modelos, name), path.join(contexto, 'modelos', name));
    }
  }

  const nichos = path.join(repo, 'marketing', 'inteligencia-nichos');
  const index = path.join(nichos, '_INDEX.md');
  if (fs.existsSync(index)) copyTree(index, path.join(contexto, 'nicho', '_INDEX.md'));
  const ficha = nichoDir(repo, c.segment);
  if (ficha) copyTree(ficha, path.join(contexto, 'nicho', path.basename(ficha)));

  const skillRoot = path.join(repo, 'agentes', 'escopo', 'skills');
  for (const name of SKILLS) {
    const src = path.join(skillRoot, name);
    if (!fs.existsSync(src)) continue;
    copyTree(src, path.join(contexto, 'skills', name));
    const claude = path.join(dir, '.claude', 'skills', name);
    fs.rmSync(claude, { recursive: true, force: true });
    copyTree(src, claude);
  }

  if (kind === 'redacao') {
    const approved = c.evidence.filter((item) => item.review === 'aprovada');
    fs.writeFileSync(path.join(contexto, 'evidencias-aprovadas.json'), JSON.stringify(approved, null, 2), 'utf8');
    fs.writeFileSync(path.join(contexto, 'decisao.json'), JSON.stringify({ priority: c.priority ?? null, debrief: c.debrief ?? null }, null, 2), 'utf8');
    const playbook = c.priority ? path.join(repo, 'raiox', 'playbooks', `${c.priority.gapId}.md`) : '';
    if (playbook && fs.existsSync(playbook)) copyTree(playbook, path.join(contexto, 'playbook.md'));
  }
  return contexto;
}
