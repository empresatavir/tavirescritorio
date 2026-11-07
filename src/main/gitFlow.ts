import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface WorktreeInfo {
  jobId: string;
  path: string;
  branch: string;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout.trim();
}

export function pastaWorktrees(): string {
  const root = process.cwd();
  const dir = join(root, '.work');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function criarWorktree(jobId: string, branchBase = 'master'): Promise<WorktreeInfo> {
  const root = process.cwd();
  const baseDir = pastaWorktrees();
  const wtPath = join(baseDir, `wt-${jobId}`);
  const branchName = `job/${jobId}`;

  if (existsSync(wtPath)) {
    await removerWorktree(jobId);
  }

  try {
    await git(root, ['worktree', 'add', '-b', branchName, wtPath, branchBase]);
  } catch (err) {
    // Se a branch já existir, tenta reaproveitar
    await git(root, ['worktree', 'add', wtPath, branchName]).catch(() => {
      throw new Error(`Falha ao criar worktree isolada para o job ${jobId}: ${err}`);
    });
  }

  return {
    jobId,
    path: wtPath,
    branch: branchName,
  };
}

export async function diffWorktree(jobId: string): Promise<string> {
  const baseDir = pastaWorktrees();
  const wtPath = join(baseDir, `wt-${jobId}`);
  if (!existsSync(wtPath)) return '';
  try {
    return await git(wtPath, ['diff', '--stat']);
  } catch {
    return '';
  }
}

export async function removerWorktree(jobId: string): Promise<void> {
  const root = process.cwd();
  const baseDir = pastaWorktrees();
  const wtPath = join(baseDir, `wt-${jobId}`);
  if (!existsSync(wtPath)) return;
  try {
    await git(root, ['worktree', 'remove', '--force', wtPath]);
  } catch {
    /* fallback se não foi registrado pelo git */
  }
  if (existsSync(wtPath)) {
    try {
      const { rmSync } = await import('node:fs');
      rmSync(wtPath, { recursive: true, force: true });
    } catch {
      /* segue */
    }
  }
}
