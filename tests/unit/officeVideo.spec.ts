import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { extractionError, missingInstagramConfig, prepVideo, VIDEO_FILES } from '../../src/main/officeVideo';
import { videoShortcode } from '../../src/shared/officeAgents';

const LINK = 'https://www.instagram.com/reel/DAbc123xyz/';
const dirs: string[] = [];

function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-video-'));
  dirs.push(dir);
  return dir;
}

/** Pasta do braço com as duas configurações (vazias: o teste não chama a API). */
function arm(withConfig = true): string {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  if (withConfig) for (const f of ['api_keys.env', 'instagram_rapidapi.env']) fs.writeFileSync(path.join(root, 'config', f), '');
  return root;
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('vídeo do Instagram por link', () => {
  it('reconhece Reel, post e IGTV; recusa perfil e outros sites', () => {
    expect(videoShortcode(LINK)).toBe('DAbc123xyz');
    expect(videoShortcode('https://instagram.com/p/Cxyz12345?igsh=abc')).toBe('Cxyz12345');
    expect(videoShortcode('https://www.instagram.com/tv/Bxyz12345/')).toBe('Bxyz12345');
    expect(videoShortcode('https://www.instagram.com/padaria/')).toBe('');
    expect(videoShortcode('https://exemplo.com/reel/DAbc123xyz/')).toBe('');
  });

  it('sem as chaves do braço o pedido falha com o motivo e não chama a extração', async () => {
    const root = arm(false);
    let called = 0;
    const out = await prepVideo(LINK, tmp(), () => {}, () => {}, { root, extract: async () => (called++, { code: 0, stderr: '', stopped: false }) });
    expect(out.ok).toBe(false);
    expect(out.error).toContain('analise-instagram/config/api_keys.env');
    expect(called).toBe(0);
    expect(missingInstagramConfig(root)).toHaveLength(2);
  });

  it('extrai, transcreve e grava a transcrição; a fala do agente acompanha', async () => {
    const ws = tmp();
    const said: string[] = [];
    const out = await prepVideo(LINK, ws, (m) => said.push(m), () => {}, {
      root: arm(),
      extract: async (_root, link, dest) => {
        expect(link).toBe(LINK);
        fs.writeFileSync(path.join(dest, VIDEO_FILES.media), 'mp4');
        fs.writeFileSync(path.join(dest, VIDEO_FILES.info), '{}');
        return { code: 0, stderr: '', stopped: false };
      },
      transcribe: async () => 'Olá, este é o vídeo.',
    });
    expect(out).toMatchObject({ ok: true, transcript: 'ok' });
    expect(fs.readFileSync(path.join(ws, VIDEO_FILES.transcript), 'utf8')).toContain('Olá, este é o vídeo.');
    expect(said).toEqual(['Extraindo o vídeo pela RapidAPI', 'Vídeo baixado', 'Transcrevendo o áudio', 'Transcrição pronta']);
  });

  it('nova tentativa reaproveita o vídeo baixado e não gasta cota', async () => {
    const ws = tmp();
    fs.writeFileSync(path.join(ws, VIDEO_FILES.media), 'mp4');
    fs.writeFileSync(path.join(ws, VIDEO_FILES.info), '{}');
    let called = 0;
    const out = await prepVideo(LINK, ws, () => {}, () => {}, { root: arm(false), extract: async () => (called++, { code: 0, stderr: '', stopped: false }), transcribe: async () => '' });
    expect(called).toBe(0);
    expect(out).toMatchObject({ ok: true, transcript: 'sem_fala' });
  });

  it('falha da API vira erro legível; transcrição que falha não derruba o pedido', async () => {
    const fail = await prepVideo(LINK, tmp(), () => {}, () => {}, { root: arm(), extract: async () => ({ code: 3, stderr: 'aviso\nRAPIDAPI_BLOQUEADA: Nenhum provedor com Key ativa.\n', stopped: false }) });
    expect(fail).toMatchObject({ ok: false });
    expect(fail.error).toContain('RapidAPI de Instagram não respondeu');
    expect(fail.error).toContain('Nenhum provedor com Key ativa.');
    expect(extractionError(5, '')).toContain('não é de vídeo');

    const ws = tmp();
    const semWhisper = await prepVideo(LINK, ws, () => {}, () => {}, {
      root: arm(),
      extract: async (_r, _l, dest) => {
        fs.writeFileSync(path.join(dest, VIDEO_FILES.media), 'mp4');
        fs.writeFileSync(path.join(dest, VIDEO_FILES.info), '{}');
        return { code: 0, stderr: '', stopped: false };
      },
      transcribe: async () => {
        throw new Error('o whisper.cpp do Studio não está instalado neste notebook');
      },
    });
    expect(semWhisper).toMatchObject({ ok: true, transcript: 'indisponivel' });
    expect(semWhisper.transcriptNote).toContain('whisper.cpp');
    expect(fs.existsSync(path.join(ws, VIDEO_FILES.transcript))).toBe(false);
  });

  it('parar durante a extração devolve parado, sem erro', async () => {
    const out = await prepVideo(LINK, tmp(), () => {}, () => {}, { root: arm(), extract: async () => ({ code: null, stderr: '', stopped: true }) });
    expect(out).toEqual({ ok: false, stopped: true });
  });
});
