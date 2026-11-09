import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BrowserWindow } from 'electron';
import { formatById, type RenderTipo, type StudioEvent } from '../../shared/studio';
import { checkMedia } from './mediaChecks';
import { ensureMotionHome, motionDir, repoMotionDir } from './motionHome';
import { findRemotionBrowser } from './preflight';
import { ensureStudioTree } from './paths';
import { buildRenderJob, parseProgressLine } from './renderJob';
import { slotStillBackground } from './inbox';
import { planReel } from './reel';
import { getStudioStore } from './store';

export { buildRenderJob, parseProgressLine };
export type { ProgressMessage, RenderJob } from './renderJob';

const running = new Map<string, ChildProcess>();

export function emitStudio(event: StudioEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('studio:event', event);
  }
}

export function cancelRender(renderId: string): { ok: boolean; error?: string } {
  const child = running.get(renderId);
  if (!child) return { ok: false, error: 'render não está em execução' };
  child.kill();
  running.delete(renderId);
  return { ok: true };
}

export async function startRender(pecaId: string, tipo: RenderTipo, frame = 0, extras?: {
  background?: string;
  scenes?: Array<{ src: string; kind: 'image' | 'video'; durationFrames: number; caption: string }>;
}): Promise<{ ok: boolean; renderId?: string; error?: string }> {
  if (!findRemotionBrowser()) {
    return {
      ok: false,
      error: 'O Chrome Headless do Remotion ainda não está na máquina. Confirme o download na tela do Studio antes de renderizar.',
    };
  }
  const store = getStudioStore();
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const perfil = store.getPerfil(peca.perfil_id);
  const format = formatById(peca.formato_id);
  const planned = format?.kind === 'video' && tipo !== 'still' && !extras?.scenes ? planReel(store, peca) : null;
  const installed = await ensureMotionHome();
  if (!installed.ok) return { ok: false, error: installed.error };
  const dirs = ensureStudioTree().pecaDirs(pecaId);
  fs.mkdirSync(dirs.render, { recursive: true });
  const output = path.join(dirs.render, tipo === 'still' ? `still-f${frame}-${Date.now()}.png` : `${tipo}-${Date.now()}.mp4`);
  const background = extras?.background || (tipo === 'still' ? slotStillBackground(store, pecaId, frame) : undefined);
  const job = buildRenderJob({
    peca,
    perfil,
    tipo,
    output,
    frame,
    background,
    scenes: extras?.scenes ?? planned?.scenes,
    durationInFrames: planned?.durationInFrames,
    narrations: planned?.narrations,
    music: planned?.music,
  });
  const jobPath = path.join(dirs.render, `${path.basename(output, path.extname(output))}.json`);
  fs.writeFileSync(jobPath, JSON.stringify(job));
  const row = store.saveRender({ peca_id: pecaId, tipo, caminho: output, status: 'rodando', checks: null });
  const script = path.join(motionDir(), 'scripts', 'render.mjs');
  if (!fs.existsSync(script)) {
    store.saveRender({ ...row, status: 'erro', checks: [{ ok: false, nome: 'script', detalhe: 'render.mjs ausente' }] });
    return { ok: false, error: 'render.mjs ausente na base de motion' };
  }
  const child = spawn(process.execPath, [script, '--job', jobPath], {
    cwd: motionDir(),
    windowsHide: true,
  });
  running.set(row.id, child);
  let buffer = '';
  const take = (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const message = parseProgressLine(line);
      if (!message) continue;
      emitStudio({
        kind: 'render',
        renderId: row.id,
        type: message.type,
        pct: message.pct,
        path: message.path,
        message: message.message,
      });
    }
  };
  child.stdout?.on('data', take);
  child.on('close', (code) => {
    running.delete(row.id);
    if (code === 0 && fs.existsSync(output)) {
      const checks = checkMedia(output, job);
      const ok = checks.every((item) => item.ok);
      store.saveRender({ ...row, status: ok ? 'pronto' : 'reprovado', checks });
      emitStudio({ kind: 'render', renderId: row.id, type: ok ? 'done' : 'error', path: output, message: ok ? undefined : 'checagem reprovou' });
      return;
    }
    store.saveRender({ ...row, status: 'erro', checks: [{ ok: false, nome: 'processo', detalhe: `saída ${code}` }] });
    emitStudio({ kind: 'render', renderId: row.id, type: 'error', message: `render saiu com código ${code}` });
  });
  return { ok: true, renderId: row.id };
}

export function motionScriptPath(): string {
  return path.join(repoMotionDir(), 'scripts', 'render.mjs');
}
