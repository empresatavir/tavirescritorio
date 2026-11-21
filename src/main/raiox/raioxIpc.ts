import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dialog, shell, BrowserWindow } from 'electron';
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
  approveDocuments,
  closeCase,
  closeExecution,
  createCase,
  linkFabrica,
  present,
  removeEvidence,
  reviewEvidence,
  recordDelivery,
  recordMetric,
  setDebrief,
  setPriority,
  startExecution,
  updateFrontier,
  type RaioxCaseInput,
  type RaioxDebriefInput,
  type RaioxEvidenceInput,
  type RaioxPriorityInput,
  checkStep,
} from './raioxRules';
import { createOrAbsorbProjectRecord } from '../project-fs';
import { syncCases } from './raioxBridge';
import { analyse, analysisLive, collectLocalFor, stopAnalyse } from './raioxAnalyse';
import { documentPath, documentsBusy, renderPdfs, stopDocuments, writeDocuments } from './raioxDocs';
import { listRuns, readRun } from '../runLedger';
import { listCases, raioxRoot, readCase, storeFile, writeCase, caseDir, deleteCase } from './raioxStore';
import { analysisReportHtml, documentHtml, openReader } from './raioxView';
import { LocalBusinessError, readTarget, targetFromAnalysis } from './localBusiness';
import { playbookStatusFor, lintPlaybook, loadPlaybooks, requirePlaybook } from './playbooks';

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
      const current = readCase(raioxRoot(), id);
      const status = playbookStatusFor(current.priority?.gapId);
      return mutate(id, (c) => setDebrief(c, input, status, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:playbooks', () => {
    try {
      return {
        ok: true,
        playbooks: loadPlaybooks().map((item) => ({
          id: item.id,
          title: item.title,
          stage: item.stage,
          wave: item.wave,
          status: item.status,
          version: item.version,
          problems: lintPlaybook(item),
        })),
      };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:playbook', (_e, id: string) => {
    try {
      return { ok: true, playbook: requirePlaybook(id) };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:sync', async () => {
    try {
      return await syncCases({ root: raioxRoot() });
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:analyse', async (_e, id: string, fronts: string[], note?: string) => {
    try {
      return await analyse(raioxRoot(), id, Array.isArray(fronts) ? fronts : [], {
        note: typeof note === 'string' ? note : '',
        onProgress: (progress) => {
          for (const win of BrowserWindow.getAllWindows()) win.webContents.send('raiox:progress', progress);
        },
      });
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:stopAnalyse', (_e, id: string) => {
    try {
      stopAnalyse(id);
      stopDocuments(id);
      return { ok: true };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:runs', (_e, id: string) => {
    try {
      const dir = caseDir(raioxRoot(), id);
      return { ok: true, live: analysisLive(id), busy: documentsBusy(id), runs: listRuns(dir).filter((item) => item.kind === 'raiox') };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:readRun', (_e, id: string, runId: string) => {
    try {
      return readRun(caseDir(raioxRoot(), id), String(runId || ''));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:remove', (_e, id: string) => {
    try {
      deleteCase(raioxRoot(), id);
      return { ok: true };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:pickPath', async () => {
    try {
      const picked = await dialog.showOpenDialog({ properties: ['openFile'] });
      if (picked.canceled || !picked.filePaths[0]) return { ok: false, error: 'Nenhum arquivo selecionado.' };
      return { ok: true, path: picked.filePaths[0] };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:attach', (_e, id: string, src: string, field?: string) => {
    try {
      const artifact = storeFile(raioxRoot(), id, 'evidencias', String(src || ''));
      return mutate(id, (c) => {
        if (c.legacy) throw new RaioxError('Caso legado é somente leitura.');
        const next = { ...c, anexos: [...(c.anexos || []), { ...artifact, field: field || '' }] };
        next.updatedAt = new Date().toISOString();
        return next;
      });
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:writeDocuments', async (_e, id: string) => {
    try {
      return await writeDocuments(raioxRoot(), id);
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:renderPdfs', async (_e, id: string, version: number) => {
    try {
      return await renderPdfs(raioxRoot(), id, version);
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:openDocument', async (_e, id: string, relative: string) => {
    try {
      const message = await shell.openPath(documentPath(raioxRoot(), id, relative));
      return message ? { ok: false, error: message } : { ok: true };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:localTarget', (_e, id: string) => {
    try {
      const dir = caseDir(raioxRoot(), id);
      const target = readTarget(dir) || targetFromAnalysis(dir);
      return { ok: true, mapsUrl: target?.mapsUrl || '', origin: target?.origin || '' };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:collectLocal', async (_e, id: string, mapsUrl?: string) => {
    try {
      const root = raioxRoot();
      const result = await collectLocalFor(root, readCase(root, id), true, typeof mapsUrl === 'string' ? mapsUrl : '');
      return { ok: result.status === 'ok', status: result.status, message: result.message, requests: result.requests.total, place: result.place ? { name: result.place.name, address: result.place.address, rating: result.place.rating, reviews: result.place.reviews } : null, matchedBy: result.matchedBy || '', error: result.status === 'ok' ? undefined : result.message };
    } catch (err) {
      if (err instanceof LocalBusinessError) return { ok: false, error: err.message };
      return fail(err);
    }
  });

  handle('raiox:viewReport', async (_e, id: string) => {
    try {
      const root = raioxRoot();
      const current = readCase(root, id);
      return await openReader(root, id, 'relatorio-analise', `Raio-X · ${current.company}`, analysisReportHtml(current, caseDir(root, id)));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:viewDocument', async (_e, id: string, relative: string) => {
    try {
      const root = raioxRoot();
      const current = readCase(root, id);
      const full = documentPath(root, id, String(relative || ''));
      if (!/\.md$/i.test(full)) {
        const message = await shell.openPath(full);
        return message ? { ok: false, error: message } : { ok: true };
      }
      const doc = (current.debrief?.documents || []).find((item) => item.md === relative);
      const title = doc ? `${doc.kind === 'relatorio' ? 'Relatório de Raio X' : 'Plano de Crescimento'} · v${doc.version}` : path.basename(full);
      const key = path.basename(full, '.md') + (doc ? `-v${doc.version}` : '');
      return await openReader(root, id, key, title, documentHtml(current, title, fs.readFileSync(full, 'utf8')));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:approveDocuments', (_e, id: string, hashes: string[]) => {
    try {
      return mutate(id, (c) => approveDocuments(c, hashes, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:exportPdfs', async (_e, id: string) => {
    try {
      const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      if (picked.canceled || !picked.filePaths[0]) return { ok: false, error: 'Nenhuma pasta selecionada.' };
      const current = readCase(raioxRoot(), id);
      const pdfs = (current.debrief?.documents || []).map((doc) => doc.pdf).filter((item): item is string => !!item);
      if (!pdfs.length) return { ok: false, error: 'Gere os PDFs antes de exportar.' };
      for (const relative of pdfs) {
        const src = documentPath(raioxRoot(), id, relative);
        fs.copyFileSync(src, path.join(picked.filePaths[0], path.basename(src)));
      }
      return { ok: true };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:recordDelivery', (_e, id: string, input: { channel: string; to: string; note?: string }) => {
    try {
      return mutate(id, (c) => recordDelivery(c, input, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:close', (_e, id: string) => {
    try {
      return mutate(id, (c) => closeCase(c, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:startExecution', (_e, id: string) => {
    try {
      const book = requirePlaybook(readCase(raioxRoot(), id).priority?.gapId || '');
      return mutate(id, (c) => startExecution(c, { version: book.version, steps: book.steps.map((step) => ({ n: step.n })) }, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:recordMetric', (_e, id: string, metric: { key: string; label: string; value: number; unit: string; moment: 'd0' | 'd30'; source: string }) => {
    try {
      const now = new Date().toISOString();
      return mutate(id, (c) => recordMetric(c, {
        key: String(metric?.key || ''),
        label: String(metric?.label || metric?.key || ''),
        value: Number(metric?.value),
        unit: String(metric?.unit || ''),
        at: now,
        moment: metric?.moment === 'd30' ? 'd30' : 'd0',
        source: String(metric?.source || ''),
      }));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:checkStep', (_e, id: string, step: number, proof: { kind: 'arquivo' | 'link' | 'nota'; value: string; sha256?: string }) => {
    try {
      const current = readCase(raioxRoot(), id);
      const book = requirePlaybook(current.priority?.gapId || current.execution?.gapId || '');
      const kind = proof?.kind === 'arquivo' || proof?.kind === 'link' ? proof.kind : 'nota';
      let value = String(proof?.value || '');
      let sha256 = proof?.sha256;
      if (kind === 'arquivo' && value && !sha256) {
        const stored = storeFile(raioxRoot(), id, 'execucao', value);
        value = stored.file;
        sha256 = stored.sha256;
      }
      return mutate(id, (c) => checkStep(c, Number(step), { kind, value, sha256 }, { version: book.version, steps: book.steps.map((item) => ({ n: item.n })) }, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:closeExecution', (_e, id: string) => {
    try {
      const current = readCase(raioxRoot(), id);
      const book = requirePlaybook(current.execution?.gapId || current.priority?.gapId || '');
      return mutate(id, (c) => closeExecution(c, { version: book.version, steps: book.steps.map((step) => ({ n: step.n })) }, new Date().toISOString()));
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:openPlaybook', async (_e, id: string) => {
    try {
      const book = requirePlaybook(id);
      const message = await shell.openPath(path.join(process.cwd(), 'raiox', 'playbooks', book.file));
      return message ? { ok: false, error: message } : { ok: true };
    } catch (err) {
      return fail(err);
    }
  });

  handle('raiox:openFabrica', (_e, id: string) => {
    try {
      const current = readCase(raioxRoot(), id);
      const offer = current.debrief?.offerId;
      if (offer !== 'pagina_vendas' && offer !== 'criacao_oferta') throw new RaioxError('Esta oferta não abre projeto na Fábrica.');
      const created = createOrAbsorbProjectRecord({
        name: `Raio-X ${current.id}`,
        company: current.company || 'TAVIR',
        ownership: 'interno',
        template_category: offer === 'criacao_oferta' ? 'oferta' : 'lp',
        mode: 'zero',
        baseline: false,
      });
      return mutate(id, (c) => linkFabrica(c, String(created?.id || ''), new Date().toISOString()));
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
