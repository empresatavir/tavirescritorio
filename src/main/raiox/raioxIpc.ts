import { randomUUID } from 'node:crypto';
import { dialog, shell } from 'electron';
import {
  RAIOX_CATALOG,
  RAIOX_CICLO,
  RAIOX_FRONTS,
  RAIOX_GAPS,
  RAIOX_INFRA,
  type RaioxCase,
} from '../../shared/raiox';
import {
  RaioxError,
  addEvidence,
  caseIdFromUuid,
  createCase,
  present,
  removeEvidence,
  reviewEvidence,
  setDebrief,
  setPriority,
  updateFrontier,
  type RaioxCaseInput,
  type RaioxDebriefInput,
  type RaioxEvidenceInput,
  type RaioxPriorityInput,
} from './raioxRules';
import { listCases, raioxRoot, readCase, storeFile, writeCase, caseDir } from './raioxStore';

type Handle = (channel: string, listener: (...args: any[]) => any) => void;

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof RaioxError) return { ok: false, error: err.message };
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : 'raiox');
  return { ok: false, error: 'Não foi possível concluir. Nada foi gravado.' };
}

function saved(c: RaioxCase) {
  return { ok: true as const, case: present(c) };
}

function mutate(id: string, fn: (c: RaioxCase) => RaioxCase) {
  const root = raioxRoot();
  const next = fn(readCase(root, id));
  writeCase(root, next);
  return saved(next);
}

export function registerRaioxIpc(handle: Handle): void {
  handle('raiox:catalog', () => {
    try {
      return { ok: true, catalog: RAIOX_CATALOG, gaps: RAIOX_GAPS, fronts: RAIOX_FRONTS, infra: RAIOX_INFRA, ciclo: RAIOX_CICLO };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:list', () => {
    try {
      return { ok: true, cases: listCases(raioxRoot()).map((item) => present(item)) };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:get', (_e, id: string) => {
    try {
      return saved(readCase(raioxRoot(), id));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:create', (_e, input: RaioxCaseInput) => {
    try {
      const root = raioxRoot();
      const taken = new Set(listCases(root).map((item) => item.id));
      let uuid = randomUUID();
      while (taken.has(caseIdFromUuid(uuid))) uuid = randomUUID();
      const created = createCase(input, new Date().toISOString(), uuid);
      writeCase(root, created);
      return saved(created);
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:updateFrontier', (_e, id: string, patch: Partial<RaioxCaseInput>) => {
    try {
      return mutate(id, (c) => updateFrontier(c, patch, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:addEvidence', (_e, id: string, input: RaioxEvidenceInput) => {
    try {
      return mutate(id, (c) => addEvidence(c, { ...input, author: 'carlos' }, new Date().toISOString(), randomUUID()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:pickFile', async (_e, id: string, sub: 'evidencias' | 'execucao') => {
    try {
      const picked = await dialog.showOpenDialog({ properties: ['openFile'] });
      if (picked.canceled || !picked.filePaths[0]) return { ok: false, error: 'Nenhum arquivo selecionado.' };
      const artifact = storeFile(raioxRoot(), id, sub, picked.filePaths[0]);
      return { ok: true, artifact };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:reviewEvidence', (_e, id: string, evId: string, decision: string) => {
    try {
      return mutate(id, (c) => reviewEvidence(c, evId, decision, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:removeEvidence', (_e, id: string, evId: string) => {
    try {
      return mutate(id, (c) => removeEvidence(c, evId, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:setPriority', (_e, id: string, input: RaioxPriorityInput) => {
    try {
      return mutate(id, (c) => setPriority(c, input, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:setDebrief', (_e, id: string, input: RaioxDebriefInput) => {
    try {
      return mutate(id, (c) => setDebrief(c, input, 'rascunho', new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:openFolder', async (_e, id: string) => {
    try {
      const message = await shell.openPath(caseDir(raioxRoot(), id));
      return message ? { ok: false, error: message } : { ok: true };
    } catch (err) {
      return fail(err);
    }
  });
}
