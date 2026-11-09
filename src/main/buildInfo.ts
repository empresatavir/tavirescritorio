/**
 * Ficha do build em uso: versão do package.json, commit, branch e data, gravadas
 * por scripts/versioning.js em dist/build-info.json na hora do build.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { BuildInfo } from '../shared/types';

export type { BuildInfo };


let cached: BuildInfo | null = null;

export function buildLabel(i: Pick<BuildInfo, 'version' | 'commit' | 'tag' | 'dirty'>): string {
  const base = `v${i.version}`;
  if (!i.commit) return base;
  // Build exatamente na tag da versão: basta a versão. Fora dela, o commit diz qual código é.
  return `${base}${i.tag ? '' : ` · ${i.commit}`}${i.dirty ? ' · local' : ''}`;
}

export function readBuildInfo(fallbackVersion = '0.0.0', file = path.join(__dirname, '..', 'build-info.json')): BuildInfo {
  if (cached) return cached;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const info = {
      version: String(raw.version || fallbackVersion),
      commit: String(raw.commit || ''),
      commitFull: String(raw.commitFull || ''),
      commitDate: String(raw.commitDate || ''),
      commitSubject: String(raw.commitSubject || ''),
      branch: String(raw.branch || ''),
      tag: raw.tag ? String(raw.tag) : null,
      lastTag: raw.lastTag ? String(raw.lastTag) : null,
      commitsSinceTag: typeof raw.commitsSinceTag === 'number' ? raw.commitsSinceTag : null,
      dirty: !!raw.dirty,
      dirtyFiles: Array.isArray(raw.dirtyFiles) ? raw.dirtyFiles.map(String) : [],
      builtAt: String(raw.builtAt || ''),
      known: true,
      label: '',
    };
    info.label = buildLabel(info);
    cached = info;
  } catch {
    cached = {
      version: fallbackVersion, commit: '', commitFull: '', commitDate: '', commitSubject: '', branch: '',
      tag: null, lastTag: null, commitsSinceTag: null, dirty: false, dirtyFiles: [], builtAt: '',
      known: false, label: `v${fallbackVersion}`,
    };
  }
  return cached;
}

/** Só para testes. */
export function resetBuildInfoCache(): void {
  cached = null;
}
