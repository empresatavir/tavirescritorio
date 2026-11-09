import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RunChanges } from './runLedger';

export interface StepCommitResult {
  ok: boolean;
  sha?: string;
  files: number;
  /** Por que não houve commit (sem git, nada mudou, desligado…). */
  skipped?: string;
  error?: string;
}

const git = (cwd: string, args: string[], input?: string, env?: Record<string, string>) =>
  execFileSync('git', args, { cwd, windowsHide: true, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000, env: env ? { ...process.env, ...env } : process.env });

/**
 * Commita só os arquivos que a execução mudou, com `--only`, para não levar junto
 * o que o Carlos tinha em andamento no índice. Ignorados pelo .gitignore ficam de fora.
 */
export function commitStep(workspace: string, changes: RunChanges | undefined, message: string, identity?: Record<string, string>): StepCommitResult {
  if (!existsSync(join(workspace, '.git'))) return { ok: true, files: 0, skipped: 'pasta sem git' };
  if (!changes?.available) return { ok: true, files: 0, skipped: 'sem retrato do disco' };
  const touched = [...changes.added, ...changes.modified, ...changes.deleted].filter(Boolean);
  if (!touched.length) return { ok: true, files: 0, skipped: 'nenhum arquivo mudou' };
  try {
    let ignored = new Set<string>();
    try {
      ignored = new Set(git(workspace, ['check-ignore', '--no-index', '--stdin'], touched.join('\n')).split(/\r?\n/).filter(Boolean));
    } catch {
      // check-ignore sai com 1 quando nada está ignorado.
    }
    const paths = touched.filter((p) => !ignored.has(p));
    if (!paths.length) return { ok: true, files: 0, skipped: 'só arquivos ignorados mudaram' };
    git(workspace, ['add', '-A', '--', ...paths]);
    const staged = git(workspace, ['diff', '--cached', '--name-only', '--', ...paths]).trim();
    if (!staged) return { ok: true, files: 0, skipped: 'nada novo para commitar' };
    git(workspace, ['commit', '-q', '-m', message, '--only', '--', ...paths], undefined, identity);
    const sha = git(workspace, ['rev-parse', '--short', 'HEAD']).trim();
    return { ok: true, sha, files: staged.split(/\r?\n/).length };
  } catch (err: any) {
    const detail = String(err?.stderr || err?.message || err).trim().split(/\r?\n/).slice(-3).join(' ');
    return { ok: false, files: 0, error: detail.slice(0, 400) };
  }
}
