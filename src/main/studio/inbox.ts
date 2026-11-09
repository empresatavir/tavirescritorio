import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureStudioTree } from './paths';
import { flowVersion, parseFlowName } from './flowName';
import { probe } from './mediaChecks';
import type { StudioStore } from './store';

export interface InboxFile {
  arquivo: string;
  motivo: string;
}

export interface InboxHit {
  arquivo: string;
  pecaId: string;
  slotId: string;
  versao: number;
  venceu: boolean;
}

export interface InboxScan {
  ligados: InboxHit[];
  semDono: InboxFile[];
}

function moveFile(source: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(source, dest);
  } catch {
    fs.copyFileSync(source, dest);
    fs.unlinkSync(source);
  }
}

export function slotStillBackground(store: StudioStore, pecaId: string, frame: number): string {
  const peca = store.getPeca(pecaId);
  const slide = peca?.roteiro?.slides?.[frame];
  if (!slide?.slot) return '';
  const slot = store.listSlots(pecaId).find((row) => row.codigo === slide.slot);
  const ativo = slot?.ativo_id ? store.getAtivo(slot.ativo_id) : null;
  if (!ativo || ativo.tipo === 'video' || !fs.existsSync(ativo.caminho)) return '';
  return ativo.caminho;
}

export function scanInbox(
  store: StudioStore,
  home?: string,
  render?: (pecaId: string, frame: number) => void,
): InboxScan {
  const tree = ensureStudioTree(home ?? store.tree.home);
  const dir = tree.entradaFlow;
  fs.mkdirSync(dir, { recursive: true });
  const names = fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile());
  const parsed = names.map((name) => ({ name, flow: parseFlowName(name) }));
  const ready = parsed.filter((item) => item.flow).sort((a, b) => (a.flow!.versao - b.flow!.versao));
  const ligados: InboxHit[] = [];
  const semDono: InboxFile[] = parsed.filter((item) => !item.flow).map((item) => ({ arquivo: item.name, motivo: 'o nome não segue a convenção' }));

  for (const item of ready) {
    const flow = item.flow!;
    const slot = store.listSlotsByCode(flow.codigo).find((row) => {
      const peca = store.getPeca(row.peca_id);
      if (!peca || peca.numero !== flow.numero) return false;
      const serie = peca.serie_id ? store.getSerie(peca.serie_id) : null;
      return (serie?.sigla || 'ST').toUpperCase() === flow.sigla;
    });
    if (!slot) {
      semDono.push({ arquivo: item.name, motivo: 'nenhum slot com esse código' });
      continue;
    }
    const source = path.join(dir, item.name);
    const dest = path.join(tree.pecaDirs(slot.peca_id).ativos, item.name);
    moveFile(source, dest);
    const info = probe(dest);
    const hash = createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
    const current = slot.ativo_id ? store.getAtivo(slot.ativo_id) : null;
    const currentVersion = current ? flowVersion(current.caminho) : 0;
    store.saveAtivo({
      peca_id: slot.peca_id,
      slot_id: slot.id,
      tipo: flow.parte.startsWith('C') ? 'video' : 'imagem',
      origem: 'flow',
      caminho: dest,
      sha256: hash,
      largura: info?.width ?? null,
      altura: info?.height ?? null,
      duracao_ms: info ? Math.round(info.duration * 1000) : null,
    });
    const venceu = flow.versao >= currentVersion;
    if (!venceu && current) {
      store.saveSlot({
        id: slot.id,
        peca_id: slot.peca_id,
        codigo: slot.codigo,
        tipo: slot.tipo,
        descricao: slot.descricao,
        formato_px: slot.formato_px,
        ativo_id: current.id,
      });
    }
    ligados.push({ arquivo: item.name, pecaId: slot.peca_id, slotId: slot.id, versao: flow.versao, venceu });
    if (venceu && render) {
      const frame = Math.max(0, Number(flow.parte.slice(1)) - 1);
      render(slot.peca_id, frame);
    }
  }
  return { ligados, semDono };
}

function shaOf(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function assignInboxFile(fileName: string, slotId: string, store: StudioStore, home?: string): { ok: boolean; error?: string } {
  const tree = ensureStudioTree(home ?? store.tree.home);
  const source = path.join(tree.entradaFlow, path.basename(fileName));
  if (!fs.existsSync(source)) return { ok: false, error: 'arquivo não está na pasta de entrada' };
  const slot = store.getSlot(slotId);
  if (!slot) return { ok: false, error: 'slot não encontrado' };
  const dest = path.join(tree.pecaDirs(slot.peca_id).ativos, path.basename(fileName));
  moveFile(source, dest);
  const info = probe(dest);
  store.saveAtivo({
    peca_id: slot.peca_id,
    slot_id: slot.id,
    tipo: slot.tipo,
    origem: 'flow',
    caminho: dest,
    sha256: shaOf(dest),
    largura: info?.width ?? null,
    altura: info?.height ?? null,
    duracao_ms: info ? Math.round(info.duration * 1000) : null,
  });
  return { ok: true };
}

let watcher: fs.FSWatcher | null = null;
let timer: NodeJS.Timeout | null = null;

export function watchInbox(store: StudioStore, render?: (pecaId: string, frame: number) => void): void {
  const dir = ensureStudioTree(store.tree.home).entradaFlow;
  if (watcher) return;
  watcher = fs.watch(dir, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try { scanInbox(store, store.tree.home, render); } catch { /* a próxima varredura tenta de novo */ }
    }, 400);
  });
}

export function stopInboxWatch(): void {
  watcher?.close();
  watcher = null;
  if (timer) clearTimeout(timer);
  timer = null;
}
