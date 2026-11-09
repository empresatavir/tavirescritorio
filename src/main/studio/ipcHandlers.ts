import * as fs from 'node:fs';
import * as path from 'node:path';
import { BrowserWindow } from 'electron';
import type { GateDecision, PecaCreateInput, PecaFiltro, PecaUpdate, PerfilInput, PerfilRedeInput, PieceStage, SerieInput } from '../../shared/studio';
import { decideMotionGate, latestMotionView, startMotionJob, type MotionDecision } from './motionAuthor';
import { downloadRemotionBrowser, updateMotionBase } from './motionHome';
import { runPreflight } from './preflight';
import { cancelRender, startRender } from './render';
import { assignSlotImage, buildPacote } from './pacote';
import { reviewChecklist } from './rules';
import { readPreview } from './previewMedia';
import { assignInboxFile, scanInbox, watchInbox } from './inbox';
import { ensureStudioTree } from './paths';
import { compilePiecePrompts, exportShotList } from './shotList';
import { synthesizeScenes } from './audio';
import { polishPrompt } from './promptPolish';
import { getStudioStore } from './store';
import { suggestForPiece, type SuggestAlvo } from './suggest';
import { createSidecarManager, loadSidecars, sidecarConfigPath } from '../sidecars';
import { activateDarkflowSchedule, darkflowBoard, editionBoard, prepareDarkflowSchedule, readScorecard, sendToDocuflow } from './ecosystem';

type Handle = (channel: string, listener: (...args: any[]) => any) => void;

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Canais studio:* que na F0 dependem do banco, mais o preflight. */
export function registerStudioIpc(handle: Handle): void {
  handle('studio:perfis:list', () => getStudioStore().listPerfis());
  handle('studio:perfis:get', (_e, id: string) => getStudioStore().getPerfil(id));
  handle('studio:perfis:save', (_e, perfil: PerfilInput) => {
    try {
      return { ok: true, perfil: getStudioStore().savePerfil(perfil) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:perfis:remove', (_e, id: string) => {
    try {
      getStudioStore().removePerfil(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

  handle('studio:redes:save', (_e, perfilId: string, rede: PerfilRedeInput) => {
    try {
      return { ok: true, rede: getStudioStore().saveRede(perfilId, rede) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:redes:remove', (_e, id: string) => {
    try {
      getStudioStore().removeRede(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

  handle('studio:pecas:list', (_e, filtro?: PecaFiltro) => getStudioStore().listPecas(filtro ?? {}));
  handle('studio:pecas:get', (_e, id: string) => getStudioStore().getPeca(id));
  handle('studio:pecas:create', (_e, input: PecaCreateInput) => {
    try {
      return { ok: true, peca: getStudioStore().createPeca(input) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:pecas:update', (_e, id: string, campos: PecaUpdate) => {
    try {
      return { ok: true, peca: getStudioStore().updatePeca(id, campos ?? {}) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:pecas:gate', (_e, id: string, etapa: PieceStage, decisao: GateDecision, comentario?: string) =>
    getStudioStore().gatePeca(id, etapa, decisao, comentario ?? ''),
  );
  handle('studio:pecas:advance', (_e, id: string) => getStudioStore().advancePeca(id));
  handle('studio:pecas:suggest', async (_e, id: string, alvo: SuggestAlvo) => {
    try {
      return await suggestForPiece(id, alvo === 'roteiro' ? 'roteiro' : 'angulos');
    } catch (err) {
      return { ok: false, error: message(err), custo: '—' };
    }
  });

  handle('studio:series:list', (_e, perfilId?: string) =>
    perfilId ? getStudioStore().listSeries(perfilId) : getStudioStore().listAllSeries(),
  );
  handle('studio:series:save', (_e, input: SerieInput) => {
    try {
      return { ok: true, serie: getStudioStore().saveSerie(input) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

  handle('studio:render:still', (_e, id: string, frame?: number) => startRender(id, 'still', frame ?? 0));
  handle('studio:render:proxy', (_e, id: string) => startRender(id, 'proxy'));
  handle('studio:render:final', (_e, id: string) => startRender(id, 'final'));
  handle('studio:render:cancel', (_e, id: string) => cancelRender(id));
  handle('studio:preview:get', (_e, pecaId: string, frame?: number, formatId?: string) => readPreview(pecaId, frame ?? 0, formatId ?? ''));
  handle('studio:revisao:get', (_e, pecaId: string) => {
    const store = getStudioStore();
    const peca = store.getPeca(pecaId);
    if (!peca) return { ok: false, error: 'peça não encontrada', items: [] };
    const perfil = store.getPerfil(peca.perfil_id);
    return {
      ok: true,
      items: reviewChecklist({
        roteiro: peca.roteiro,
        formatoId: peca.formato_id,
        canon: perfil?.brand_kit.canon ?? [],
        fonte: peca.pauta?.fonte ?? '',
        slots: store.listSlots(pecaId),
      }),
    };
  });
  handle('studio:pacote:build', (_e, pecaId: string) => buildPacote(pecaId));
  handle('studio:pacote:open', async (_e, pecaId: string) => {
    const { shell } = await import('electron');
    const dir = (await import('./paths')).ensureStudioTree().pecaDirs(pecaId).pacote;
    const error = await shell.openPath(dir);
    return { ok: !error, error: error || undefined };
  });
  handle('studio:arte:assign', (_e, pecaId: string, index: number, source: string) => assignSlotImage(pecaId, index, source));
  handle('studio:prompts:compile', (_e, pecaId: string) => compilePiecePrompts(pecaId, getStudioStore()));
  handle('studio:prompts:list', (_e, pecaId: string) => {
    const store = getStudioStore();
    const codes = new Map(store.listSlots(pecaId).map((slot) => [slot.id, slot.codigo]));
    return store.listPiecePrompts(pecaId).map((prompt) => ({ ...prompt, codigo: codes.get(prompt.slot_id) || prompt.slot_id }));
  });
  handle('studio:prompts:nota', (_e, promptId: string, nota: 'funcionou' | 'nao' | null) => {
    const store = getStudioStore();
    const prompt = store.getPrompt(promptId);
    if (!prompt) return { ok: false, error: 'prompt não encontrado' };
    store.savePrompt({ ...prompt, nota });
    return { ok: true };
  });
  handle('studio:prompts:export', (_e, pecaId: string) => exportShotList(pecaId, getStudioStore()));
  handle('studio:prompts:search', (_e, perfilId: string, query: string) => getStudioStore().searchPrompts(perfilId, query || ''));
  handle('studio:prompts:polish', async (_e, promptId: string) => polishPrompt(promptId));
  handle('studio:inbox:scan', () => scanInbox(getStudioStore(), undefined, (pecaId, frame) => {
    startRender(pecaId, 'still', frame).catch(() => undefined);
  }));
  handle('studio:inbox:assign', (_e, fileName: string, slotId: string) => assignInboxFile(fileName, slotId, getStudioStore()));
  handle('studio:audio:narrate', async (_e, pecaId: string, index?: number) => synthesizeScenes(pecaId, getStudioStore(), index));
  handle('studio:audio:clip', (_e, pecaId: string, index: number) => {
    const dir = ensureStudioTree().pecaDirs(pecaId).ativos;
    const file = ['mp3', 'wav'].map((ext) => path.join(dir, `narracao-${String(index + 1).padStart(2, '0')}.${ext}`)).find((item) => fs.existsSync(item));
    if (!file) return { ok: false, error: 'narração ainda não existe' };
    const bytes = fs.readFileSync(file);
    if (bytes.length > 8_000_000) return { ok: false, error: 'arquivo grande demais para ouvir aqui' };
    const mime = file.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
    return { ok: true, src: `data:${mime};base64,${bytes.toString('base64')}` };
  });
  handle('studio:audio:word', (_e, pecaId: string, index: number, text: string) => {
    const store = getStudioStore();
    const peca = store.getPeca(pecaId);
    if (!peca?.roteiro) return { ok: false, error: 'legenda não encontrada' };
    if (peca.roteiro.legendas?.[index]) {
      const legendas = peca.roteiro.legendas.slice();
      legendas[index] = { ...legendas[index], text };
      return { ok: true, peca: store.updatePeca(pecaId, { roteiro: { ...peca.roteiro, legendas } }) };
    }
    if (!peca.roteiro.cenas?.[index]) return { ok: false, error: 'legenda não encontrada' };
    const cenas = peca.roteiro.cenas.slice();
    cenas[index] = { ...cenas[index], texto_tela: text };
    return { ok: true, peca: store.updatePeca(pecaId, { roteiro: { ...peca.roteiro, cenas } }) };
  });
  handle('studio:motion:updateBase', () => updateMotionBase());
  handle('studio:motion:downloadBrowser', (_e, confirm?: boolean) => downloadRemotionBrowser(confirm === true));
  handle('studio:motion:ask', async (_e, input: { perfilId: string; preset: string; pedido: string }) => {
    try {
      return { ok: true, job: await startMotionJob(input) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:motion:gate', async (_e, jobId: string, decisao: MotionDecision, comentario?: string) => {
    try {
      return { ok: true, job: await decideMotionGate(jobId, decisao, comentario ?? '') };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:motion:latest', (_e, perfilId: string) => latestMotionView(perfilId));
  handle('studio:preflight', () => runPreflight());
  const sidecars = createSidecarManager(sidecarConfigPath());
  handle('studio:sidecars:list', () => sidecars.status());
  handle('studio:sidecars:start', (_e, id: string) => sidecars.start(id));
  handle('studio:sidecars:stop', (_e, id: string) => sidecars.stop(id));
  handle('studio:darkflow:prepare', async (_e, pecaId: string) => {
    try {
      const darkflow = loadSidecars(sidecarConfigPath()).find((item) => item.id === 'darkflow');
      if (!darkflow) return { ok: false, error: 'DarkFlow não está configurado' };
      return await prepareDarkflowSchedule(getStudioStore(), pecaId, 'http://127.0.0.1:8765', path.join(darkflow.pasta, 'storage', 'output'), darkflow.pasta);
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:darkflow:activate', async (_e, pecaId: string) => {
    try {
      return await activateDarkflowSchedule(getStudioStore(), pecaId, 'http://127.0.0.1:8765');
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:darkflow:scorecard', () => readScorecard('http://127.0.0.1:8765'));
  handle('studio:darkflow:board', () => darkflowBoard('http://127.0.0.1:8765'));
  handle('studio:docuflow:send', async (_e, pecaId: string) => {
    try {
      const store = getStudioStore();
      const peca = store.getPeca(pecaId);
      if (!peca) return { ok: false, error: 'peça não encontrada' };
      const perfil = store.getPerfil(peca.perfil_id);
      if (!perfil) return { ok: false, error: 'perfil não encontrado' };
      return await sendToDocuflow('http://127.0.0.1:5000', perfil, peca);
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });
  handle('studio:docuflow:board', () => editionBoard('http://127.0.0.1:5000'));
  handle('studio:docuflow:open', () => {
    const win = new BrowserWindow({ width: 1280, height: 800, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    void win.loadURL('http://127.0.0.1:3000');
    return { ok: true };
  });
  watchInbox(getStudioStore(), (pecaId, frame) => {
    startRender(pecaId, 'still', frame).catch(() => undefined);
  });
}
