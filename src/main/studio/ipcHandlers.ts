import type { GateDecision, PecaCreateInput, PecaFiltro, PecaUpdate, PerfilInput, PerfilRedeInput, PieceStage, SerieInput } from '../../shared/studio';
import { runPreflight } from './preflight';
import { getStudioStore } from './store';
import { suggestForPiece, type SuggestAlvo } from './suggest';

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

  handle('studio:preflight', () => runPreflight());
}
