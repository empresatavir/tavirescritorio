import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatById } from '../../shared/studio';
import { ensureStudioTree } from './paths';
import { slotCode } from './rules';
import { slidesFromRoteiro } from './slides';
import { buildReelPacote } from './reel';
import type { StudioStore } from './store';
import { getStudioStore } from './store';

export interface PacoteManifest {
  perfil: string;
  rede: string;
  formato: string;
  agendamento: string | null;
  arquivos: Array<{ arquivo: string; sha256: string; largura: number; altura: number }>;
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function newestStill(store: StudioStore, pecaId: string, frame: number): string {
  const rows = store.listRenders(pecaId)
    .filter((item) => item.status === 'pronto' && item.tipo === 'still' && item.caminho.includes(`still-f${frame}-`) && fs.existsSync(item.caminho))
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  return rows[0]?.caminho ?? '';
}

/** Copia os stills prontos para `pacote/` e grava o manifest. Não renderiza. */
export function buildPacote(pecaId: string, store: StudioStore = getStudioStore(), home?: string): { ok: boolean; dir?: string; manifest?: PacoteManifest; error?: string } {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const format = formatById(peca.formato_id);
  if (!format) return { ok: false, error: 'formato desconhecido' };
  if (format.kind === 'video') return buildReelPacote(pecaId, store, home);
  const perfil = store.getPerfil(peca.perfil_id);
  const slides = slidesFromRoteiro(peca.roteiro, perfil?.brand_kit.canon ?? [], peca.pauta?.fonte ?? '');
  if (!slides.length) return { ok: false, error: 'roteiro sem slides' };
  const dir = ensureStudioTree(home).pecaDirs(pecaId).pacote;
  fs.mkdirSync(dir, { recursive: true });
  const arquivos: PacoteManifest['arquivos'] = [];
  for (let i = 0; i < slides.length; i += 1) {
    const source = newestStill(store, pecaId, i);
    if (!source) return { ok: false, error: `falta o render do slide ${i + 1}` };
    const nome = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(dir, nome);
    fs.copyFileSync(source, dest);
    arquivos.push({ arquivo: nome, sha256: sha256(dest), largura: format.width, altura: format.height });
    if (i === 0) {
      fs.copyFileSync(dest, path.join(dir, 'capa.png'));
      arquivos.push({ arquivo: 'capa.png', sha256: sha256(path.join(dir, 'capa.png')), largura: format.width, altura: format.height });
    }
  }
  fs.writeFileSync(path.join(dir, 'legenda.txt'), peca.legenda || '', 'utf8');
  fs.writeFileSync(path.join(dir, 'hashtags.txt'), (peca.hashtags || []).join(' '), 'utf8');
  const manifest: PacoteManifest = {
    perfil: perfil?.nome ?? '',
    rede: peca.rede,
    formato: peca.formato_id,
    agendamento: peca.agendado_para,
    arquivos,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { ok: true, dir, manifest };
}

/** Copia uma imagem local para o ativo do slide e liga o slot. */
export function assignSlotImage(pecaId: string, index: number, source: string, store: StudioStore = getStudioStore()): { ok: boolean; error?: string } {
  if (!source || !fs.existsSync(source)) return { ok: false, error: 'arquivo não encontrado' };
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const perfil = store.getPerfil(peca.perfil_id);
  const serie = peca.serie_id ? store.getSerie(peca.serie_id) : null;
  let codigo = '';
  try {
    codigo = slotCode(serie?.sigla || 'ST', peca.numero, index + 1, 'imagem');
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const destDir = ensureStudioTree(store.tree.home).pecaDirs(pecaId).ativos;
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `${codigo}${path.extname(source) || '.png'}`);
  fs.copyFileSync(source, dest);
  const slides = slidesFromRoteiro(peca.roteiro, perfil?.brand_kit.canon ?? [], peca.pauta?.fonte ?? '');
  while (slides.length <= index) slides.push({ titulo: '', layout: 'texto' });
  const current = slides[index];
  slides[index] = { ...current, slot: codigo, layout: current.layout === 'texto' ? 'imagem-cheia' : current.layout };
  store.updatePeca(pecaId, { roteiro: { ...(peca.roteiro ?? {}), slides } });
  const slot = store.saveSlot({ peca_id: pecaId, codigo, tipo: 'imagem', descricao: slides[index].titulo || null });
  store.saveAtivo({
    peca_id: pecaId,
    slot_id: slot.id,
    tipo: 'imagem',
    origem: 'local',
    caminho: dest,
    sha256: sha256(dest),
  });
  return { ok: true };
}
