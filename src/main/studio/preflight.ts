import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PreflightItem } from '../../shared/studio';
import { ensureStudioTree } from './paths';

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function firstLine(output: string): string {
  return output.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '';
}

function findOnPath(command: string): string | null {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    const out = execFileSync(locator, [command], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    return firstLine(out) || null;
  } catch {
    return null;
  }
}

function item(name: string, ok: boolean, detalhe: string, comoResolver: string): PreflightItem {
  return { item: name, ok, detalhe, comoResolver: ok ? '' : comoResolver };
}

function checkNode(): PreflightItem {
  const bin = findOnPath('node');
  if (!bin) return item('node', false, 'node não está no PATH', 'Instale o Node.js 20 ou mais novo e deixe o comando node no PATH.');
  try {
    const version = execFileSync(bin, ['-v'], { encoding: 'utf8', timeout: 15000, windowsHide: true }).trim();
    const major = Number(version.replace(/^v/, '').split('.')[0]);
    if (!Number.isFinite(major) || major < 20) {
      return item('node', false, `${version} em ${bin}`, 'Atualize o Node.js do PATH para a versão 20 ou mais nova.');
    }
    return item('node', true, `${version} em ${bin}`, '');
  } catch (err) {
    return item('node', false, err instanceof Error ? err.message : String(err), 'Confira se o comando node -v funciona no PATH.');
  }
}

function checkBinary(command: string): PreflightItem {
  const bin = findOnPath(command);
  if (!bin) {
    return item(command, false, `${command} não está no PATH`, 'Instale o FFmpeg e deixe ffmpeg e ffprobe no PATH.');
  }
  try {
    const out = execFileSync(bin, ['-version'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    return item(command, true, firstLine(out) || bin, '');
  } catch (err) {
    return item(command, false, err instanceof Error ? err.message : String(err), 'Confira se o binário do FFmpeg abre com -version.');
  }
}

function checkDataDir(): PreflightItem {
  try {
    const tree = ensureStudioTree();
    const probe = path.join(tree.home, `.preflight-${process.pid}.tmp`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return item('pasta-de-dados', true, tree.home, '');
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    return item(
      'pasta-de-dados',
      false,
      detalhe,
      'Dê permissão de escrita em %USERPROFILE%\\TAVIR\\Studio ou defina TAVIR_STUDIO_HOME.',
    );
  }
}

/** `studio-motion/node_modules` é aviso até a F2: não reprova o preflight. */
function checkMotionModules(): PreflightItem {
  const dir = path.join(repoRoot(), 'studio-motion', 'node_modules');
  if (fs.existsSync(dir)) {
    return item('studio-motion/node_modules', true, 'presente', '');
  }
  return {
    item: 'studio-motion/node_modules',
    ok: true,
    detalhe: 'aviso: ainda não instalado (entra na F2)',
    comoResolver: 'A fase 2 cria studio-motion e instala as dependências.',
  };
}

export function runPreflight(): PreflightItem[] {
  return [checkNode(), checkBinary('ffmpeg'), checkBinary('ffprobe'), checkDataDir(), checkMotionModules()];
}
