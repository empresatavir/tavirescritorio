import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { captionsFromWhisper, toSrt } from '../../src/main/studio/captions';
import { scenesFromRoteiro } from '../../src/main/studio/cenas';
import { loudnessChecks, parseLoudnorm, visualHookOk } from '../../src/main/studio/loudnorm';
import { ttsCommand, voiceOf } from '../../src/main/studio/audio';
import { framesForScene, licensedTracks } from '../../src/main/studio/reel';
import type { BrandKit } from '../../src/shared/studio';

const KIT = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '',
  negatives: [],
  characters: [],
  tone: 'direto',
  canon: [],
} satisfies BrandKit;

describe('reel', () => {
  it('divide o roteiro em cenas com piso de duração e preset', () => {
    const scenes = scenesFromRoteiro({
      cenas: [
        { texto_narrado: 'A porta abre.', texto_tela: 'A porta', duracao_min: 2 },
        { texto_narrado: 'O arquivo está vazio.' },
      ],
    });
    expect(scenes).toHaveLength(2);
    expect(scenes[0].preset).toBe('titulo-entrada');
    expect(scenes[0].duracao_min).toBe(2);
    expect(scenes[1].preset).toBe('encerramento-cta');
    expect(scenes[1].duracao_min).toBe(1);
    expect(scenesFromRoteiro({ slides: [{ titulo: 'Capa', apoio: 'gancho' }] })[0].texto_narrado).toBe('gancho');
  });

  it('converte os tempos do whisper em legendas', () => {
    const words = captionsFromWhisper([
      { word: ' a ', start: 0.1, end: 0.4 },
      { word: 'porta', start: 0.4, end: 0.9 },
    ]);
    expect(words[0]).toEqual({ text: 'a', startMs: 100, endMs: 400 });
    expect(toSrt(words)).toContain('00:00:00,100 --> 00:00:00,400');
    expect(toSrt(words)).toContain('porta');
  });

  it('lê o loudnorm e cobra −14 LUFS e pico até −1', () => {
    const log = 'alguma linha\n{\n  "input_i" : "-14.2",\n  "input_tp" : "-1.4"\n}\n';
    const level = parseLoudnorm(log);
    expect(level).toEqual({ integrated: -14.2, truePeak: -1.4 });
    expect(loudnessChecks(level, 8, 90).every((item) => item.ok)).toBe(true);
    expect(loudnessChecks({ integrated: -20, truePeak: 0.2 }, 100, 90).some((item) => !item.ok)).toBe(true);
    expect(visualHookOk(0.3)).toBe(true);
    expect(visualHookOk(0.1)).toBe(false);
  });

  it('monta o comando do edge-tts e usa a voz do kit', () => {
    expect(voiceOf(KIT).voiceId).toBe('pt-BR-FranciscaNeural');
    expect(voiceOf({ ...KIT, voice: { provider: 'edge-tts', voiceId: 'pt-BR-AntonioNeural' } }).voiceId).toBe('pt-BR-AntonioNeural');
    const command = ttsCommand({ provider: 'edge-tts', voiceId: 'pt-BR-FranciscaNeural', text: 'A porta abre.', output: 'narracao-01.mp3' });
    expect('args' in command && command.args).toContain('A porta abre.');
  });

  it('mede a cena pela narração e só aceita música com licença', () => {
    expect(framesForScene(1, 2.4, 30)).toBe(72);
    expect(framesForScene(4, 1, 30)).toBe(120);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-musica-'));
    fs.writeFileSync(path.join(dir, 'tema.mp3'), 'x');
    fs.writeFileSync(path.join(dir, 'tema.licenca.txt'), 'trilha própria');
    fs.writeFileSync(path.join(dir, 'solta.mp3'), 'x');
    expect(licensedTracks(dir).map((file) => path.basename(file))).toEqual(['tema.mp3']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
