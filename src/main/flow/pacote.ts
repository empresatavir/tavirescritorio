/**
 * Pacote aprovado (F0 do GOAL_FLOW): monta o contrato a partir da peça do Studio e converte para o
 * manifesto v1 do DarkFlow. Não cria agenda nem ativa nada; isso é do Flow, por clique do Carlos.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { aceitoPeloDarkflow, problemasDoPacote, type PacoteAprovado, type PacoteMidia } from '../../shared/flow';
import { formatById, type Ativo } from '../../shared/studio';
import { exportReelForDarkFlow } from '../studio/darkflowExport';
import { probe } from '../studio/mediaChecks';
import { ensureStudioTree } from '../studio/paths';
import type { StudioStore } from '../studio/store';

type Probe = (file: string) => { width: number; height: number; duration: number } | null;
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Etapas em que o pacote já foi montado. */
const ETAPAS_COM_PACOTE = ['pacote', 'publicado'];
/** Origem de ativo que conta como geração por IA (D3): Google Flow e voz sintética. */
const ORIGEM_IA: Ativo['origem'][] = ['flow', 'tts'];

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function midiasDeImagem(dir: string): PacoteMidia[] | string {
  const file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) return 'falta o manifest do pacote';
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as { arquivos?: Array<{ arquivo: string; sha256: string; largura: number; altura: number }> };
  const out: PacoteMidia[] = [];
  for (const a of manifest.arquivos ?? []) {
    if (a.arquivo === 'capa.png') continue;
    const arquivo = path.join(dir, a.arquivo);
    if (!fs.existsSync(arquivo)) return `falta ${a.arquivo} no pacote`;
    if (sha256(arquivo) !== a.sha256) return `${a.arquivo} mudou depois de montar o pacote`;
    out.push({ arquivo, tipo: 'imagem', sha256: a.sha256, largura: a.largura, altura: a.altura });
  }
  return out;
}

/** Monta o pacote aprovado da peça. Só lê; não muda a peça nem o pacote. */
export function pacoteDaPeca(store: StudioStore, pecaId: string, deps: { probe?: Probe } = {}): Result<{ pacote: PacoteAprovado }> {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const format = formatById(peca.formato_id);
  if (!format) return { ok: false, error: 'formato desconhecido' };
  if (!ETAPAS_COM_PACOTE.includes(peca.etapa)) return { ok: false, error: 'a peça ainda não chegou ao pacote' };
  const dir = ensureStudioTree(store.tree.home).pecaDirs(pecaId).pacote;
  // Mesma condição do gate do pacote (rules.ts): sem manifest, o gate recusa; então nada vai para o Flow.
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) return { ok: false, error: 'pacote não montado' };
  let midias: PacoteMidia[];
  if (format.kind === 'video') {
    const video = path.join(dir, 'final.mp4');
    if (!fs.existsSync(video)) return { ok: false, error: 'falta o vídeo final no pacote' };
    const info = (deps.probe ?? probe)(video);
    midias = [{
      arquivo: video,
      tipo: 'video',
      sha256: sha256(video),
      largura: info?.width || format.width,
      altura: info?.height || format.height,
      ...(info?.duration ? { duracao_s: info.duration } : {}),
    }];
  } else {
    const imgs = midiasDeImagem(dir);
    if (typeof imgs === 'string') return { ok: false, error: imgs };
    midias = imgs;
  }
  const pacote: PacoteAprovado = {
    versao: 1,
    origem: 'studio',
    peca_id: peca.id,
    titulo: peca.titulo || '',
    perfil: store.getPerfil(peca.perfil_id)?.nome ?? '',
    rede: peca.rede,
    formato: peca.formato_id,
    midias,
    legenda: peca.legenda || '',
    hashtags: peca.hashtags || [],
    ia: store.listAtivos(peca.id).some((a) => ORIGEM_IA.includes(a.origem)),
  };
  const problemas = problemasDoPacote(pacote);
  if (problemas.length) return { ok: false, error: problemas.join('; ') };
  return { ok: true, pacote };
}

/** Converte o pacote no manifesto v1 do DarkFlow (copia o mp4 para storage/output). Confere o sha256 da cópia. */
export function paraManifestoDarkflow(pacote: PacoteAprovado, outputRoot: string, projectRoot: string): Result<{ video: string; manifest: string; sha256: string }> {
  if (!aceitoPeloDarkflow(pacote.formato)) return { ok: false, error: `o DarkFlow ainda não recebe ${formatById(pacote.formato)?.label ?? pacote.formato}; hoje só Reel` };
  const problemas = problemasDoPacote(pacote);
  if (problemas.length) return { ok: false, error: problemas.join('; ') };
  const midia = pacote.midias[0];
  if (!fs.existsSync(midia.arquivo) || sha256(midia.arquivo) !== midia.sha256) return { ok: false, error: 'o vídeo mudou depois de montar o pacote' };
  try {
    const out = exportReelForDarkFlow({ video: midia.arquivo, outputRoot, projectRoot, width: midia.largura, height: midia.altura, duration: midia.duracao_s ?? 0 });
    const copied = sha256(out.video);
    if (copied !== midia.sha256) return { ok: false, error: 'a cópia no DarkFlow não confere com o pacote' };
    return { ok: true, video: out.video, manifest: out.manifest, sha256: copied };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
