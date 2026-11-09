import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BrandKit } from '../../src/shared/studio';
import { FLOW_NAME, parseFlowName } from '../../src/main/studio/flowName';
import { scanInbox, slotStillBackground } from '../../src/main/studio/inbox';
import { applyRewrite, compilePrompt, validatePrompt } from '../../src/main/studio/promptCompiler';
import { slotCode } from '../../src/main/studio/rules';
import { compilePiecePrompts, exportShotList } from '../../src/main/studio/shotList';
import { openStudioStore, type StudioStore } from '../../src/main/studio/store';

const BRAND: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: 'grainy archival photograph',
  negatives: ['no modern cars'],
  characters: [{ id: 'arq', name: 'Archivist', description: 'short dark hair, wool coat', refImages: ['ref.png'] }],
  tone: 'direto',
  canon: [],
};

describe('prompts do Flow', () => {
  const dirs: string[] = [];
  let store: StudioStore | null = null;

  afterEach(() => {
    store?.close();
    store = null;
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('compila imagem com personagem, imagem sem personagem e vídeo', () => {
    const withCharacter = compilePrompt({
      kind: 'imagem', titulo: 'Archivist abre o arquivo', apoio: 'ele segura a pasta', tema: 'arquivo de 1974',
      layout: 'capa', character: BRAND.characters[0], brand: BRAND, aspect: '4:5',
    });
    const plain = compilePrompt({
      kind: 'imagem', titulo: 'A sala vazia', apoio: 'nenhuma pessoa', tema: 'arquivo de 1974',
      layout: 'texto', character: null, brand: BRAND, aspect: '4:5',
    });
    const video = compilePrompt({
      kind: 'video', titulo: 'A porta', apoio: 'a porta abre', tema: 'corredor',
      layout: 'imagem-cheia', character: null, brand: BRAND, aspect: '9:16', camera: 'slow dolly in',
    });
    expect(withCharacter.texto).toContain('Exact description: "short dark hair, wool coat"');
    expect(withCharacter.texto).toContain('reference images of Archivist');
    expect(plain.texto).not.toContain('reference images');
    expect(video.texto).toContain('slow dolly in');
    expect(video.texto).toContain('8 seconds');
    expect(video.texto).toContain('no dialogue, no music');
    expect(video.resumo).toContain('gerar a imagem primeiro');
    expect(withCharacter.camadas.restrictions).toContain('no text, no letters, no watermark, no logos');
    expect(withCharacter.camadas.restrictions).toContain('no modern cars');
  });

  it('reprova prompt que pede texto na imagem', () => {
    const compiled = compilePrompt({
      kind: 'imagem', titulo: 'Capa', brand: BRAND, aspect: '4:5',
    });
    const bad = { ...compiled.camadas, subject: 'A wall with the words CASE FILE painted on it' };
    const check = validatePrompt(bad, bad.subject);
    expect(check.ok).toBe(false);
    expect(check.erros.join(' ')).toContain('pede texto');
  });

  it('descarta a lapidação que pede texto', () => {
    const compiled = compilePrompt({ kind: 'imagem', titulo: 'Capa', brand: BRAND, aspect: '1:1' });
    const dropped = applyRewrite(compiled.camadas, '{"subject":"a poster with the words CASE","action":"none","setting":"room","light":"soft"}');
    expect(dropped.ok).toBe(false);
    const kept = applyRewrite(compiled.camadas, '{"subject":"an empty desk","action":"nothing moves","setting":"a dark archive","light":"a single lamp"}');
    expect(kept.ok).toBe(true);
  });

  it('aceita nomes do Flow e recusa os que fogem da convenção', () => {
    const valid = ['MP-0014-S03.png', 'MP-0014-S03-v2.jpg', 'AB12-0001-C01.jpeg', 'Z9-0099-S10.webp', 'FLOW1-1234-C02.mp4'];
    const invalid = ['mp-0014-S03.png', 'M-0014-S03.png', 'MP-014-S03.png', 'MP-0014-X03.png', 'MP-0014-S03.gif'];
    for (const name of valid) expect(FLOW_NAME.test(name)).toBe(true);
    for (const name of invalid) expect(FLOW_NAME.test(name)).toBe(false);
    expect(parseFlowName('MP-0014-S03.png')?.versao).toBe(1);
    expect(parseFlowName('MP-0014-S03-v2.png')?.versao).toBe(2);
    expect(parseFlowName('MP-0014-S03-v2.png')?.codigo).toBe('MP-0014-S03');
  });

  it('a versão maior fica no slot e a menor permanece no histórico', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-flow-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: BRAND });
    const serie = store.saveSerie({ perfil_id: perfil.id, nome: 'Casos', sigla: 'MP' });
    const peca = store.createPeca({ perfil_id: perfil.id, serie_id: serie.id, rede: 'instagram', formato_id: 'ig-carrossel-4x5', titulo: 'Arquivo' });
    const codigo = slotCode('MP', peca.numero, 3, 'imagem');
    const slot = store.saveSlot({ peca_id: peca.id, codigo, tipo: 'imagem', descricao: 'slide' });
    const inbox = path.join(home, 'entrada-flow');
    fs.mkdirSync(inbox, { recursive: true });
    fs.writeFileSync(path.join(inbox, `${codigo}-v1.png`), 'v1');
    fs.writeFileSync(path.join(inbox, `${codigo}-v2.png`), 'v2');
    fs.writeFileSync(path.join(inbox, 'solto.txt'), 'sem dono');
    const first = scanInbox(store, home);
    expect(first.semDono.map((item) => item.arquivo)).toContain('solto.txt');
    expect(first.ligados.map((item) => item.versao).sort()).toEqual([1, 2]);
    const current = store.getSlot(slot.id);
    const ativo = store.getAtivo(current!.ativo_id!);
    expect(ativo?.caminho.endsWith(`${codigo}-v2.png`)).toBe(true);
    expect(store.listAtivos(peca.id)).toHaveLength(2);
    fs.writeFileSync(path.join(inbox, `${codigo}-v1.png`), 'de novo');
    scanInbox(store, home);
    const after = store.getAtivo(store.getSlot(slot.id)!.ativo_id!);
    expect(after?.caminho.endsWith(`${codigo}-v2.png`)).toBe(true);
    expect(store.listAtivos(peca.id)).toHaveLength(3);
    store.updatePeca(peca.id, { roteiro: { slides: [{ titulo: 'Capa', slot: codigo, layout: 'imagem-cheia' }] } });
    expect(slotStillBackground(store, peca.id, 0)).toContain(`${codigo}-v2.png`);
  });

  it('exporta a lista com o código e o prompt', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-shot-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: BRAND });
    const peca = store.createPeca({
      perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-carrossel-4x5', titulo: 'Arquivo',
      pauta: { tema: 'arquivo de 1974' },
    });
    store.updatePeca(peca.id, {
      roteiro: { slides: [
        { titulo: 'Archivist na capa', apoio: 'segura a pasta', layout: 'imagem-cheia' },
        { titulo: 'A sala vazia', layout: 'imagem-cheia' },
        { titulo: 'A porta', layout: 'imagem-cheia' },
      ] },
    });
    expect(compilePiecePrompts(peca.id, store).count).toBe(3);
    const exported = exportShotList(peca.id, store, home);
    expect(exported.ok).toBe(true);
    const text = fs.readFileSync(exported.arquivo!, 'utf8');
    expect(text).toContain('ST-');
    expect(text).toContain('Exact description: "short dark hair, wool coat"');
    expect(text).toContain('4:5');
    const worked = store.listPiecePrompts(peca.id)[0];
    store.savePrompt({ ...worked, nota: 'funcionou' });
    expect(store.searchPrompts(perfil.id, 'Archivist').length).toBeGreaterThan(0);
    expect(store.searchPrompts(perfil.id, 'não existe')).toHaveLength(0);
  });
});
