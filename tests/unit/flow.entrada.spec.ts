import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { agentePropoePeca, aplicarPecasDoAgente, formatoDaEntrada, parsePecas, postDoApk, resolverPerfil } from '../../src/main/flow/entrada';
import { applyDeskCommand, type DeskStore, type Outcome } from '../../src/main/officeCloud';
import { buildPrompt } from '../../src/main/officeExec';
import { StudioStore } from '../../src/main/studio/store';

const KIT = { palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' }, fonts: { title: 'Inter', body: 'Inter' }, imageStyle: '', negatives: [], characters: [], tone: 'direto', canon: [] };
const abertos: StudioStore[] = [];
const dirs: string[] = [];

function studio(perfis = ['Perfil Teste']): StudioStore {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-entrada-'));
  dirs.push(home);
  const store = new StudioStore(home);
  abertos.push(store);
  for (const nome of perfis) store.savePerfil({ nome, iniciais: nome.slice(0, 2).toUpperCase(), cor_avatar: '#1BC5BD', brand_kit: KIT } as never);
  return store;
}

afterEach(() => {
  for (const s of abertos.splice(0)) (s as unknown as { db: { close?: () => void } }).db.close?.();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('APK «Preparar post» (F4)', () => {
  it('vira peça do Studio na etapa pauta, com a origem gravada', () => {
    const store = studio();
    const r = postDoApk(store, 'cmd-1', { formato: 'Carrossel', tema: '3 erros ao precificar', instrucao: 'tom direto' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [peca] = store.listPecas();
    expect(peca).toMatchObject({ etapa: 'pauta', formato_id: 'ig-carrossel-4x5', titulo: '3 erros ao precificar', agendado_para: null });
    expect(peca.pauta).toMatchObject({ tema: '3 erros ao precificar', objetivo: 'tom direto', fonte: 'Pedido pelo APK' });
    expect(peca.origem).toMatchObject({ origem: 'apk', autor: 'Carlos pelo APK', ref: 'cmd-1' });
    expect(r.body).toMatchObject({ kind: 'studio_post', status: 'done' });
    expect(String(r.body.detail)).toContain('etapa pauta');
  });

  it('pela fila do APK: aplicado sem tarefa, sem execução e sem agenda', () => {
    const store = studio();
    const criadas: unknown[] = [];
    const ledger = new Map<string, Outcome>();
    const desk: DeskStore = {
      list: () => [],
      create: (p) => { criadas.push(p); return p as never; },
      update: () => undefined,
      remove: () => undefined,
      ledgerGet: (id) => ledger.get(id) || null,
      ledgerPut: (id, _k, o) => void ledger.set(id, o),
      studioPost: (id, fields) => postDoApk(store, id, fields),
    };
    const cmd = { id: 'cmd-2', kind: 'job.create', payload: { kind: 'studio_post', fields: { tema: 'Reel novo' } } };
    const a = applyDeskCommand(desk, cmd);
    expect(a).toMatchObject({ status: 'applied', code: 201 });
    expect(applyDeskCommand(desk, cmd).cached).toBe(true);
    expect(store.listPecas()).toHaveLength(1);
    expect(criadas).toHaveLength(0);
    const recusa = applyDeskCommand(desk, { id: 'cmd-3', kind: 'job.create', payload: { kind: 'studio_post', fields: { tema: '' } } });
    expect(recusa).toMatchObject({ status: 'rejected', code: 400 });
  });

  it('acha o perfil pelo nome, iniciais ou @; com vários e campo vazio, pergunta', () => {
    const store = studio(['Perfil Teste', 'Outra Marca']);
    const outra = store.listPerfis().find((p) => p.nome === 'Outra Marca')!;
    store.saveRede(outra.id, { rede: 'instagram', handle: '@outramarca', formatos: ['ig-reels-9x16'], posts_semana: 3, publicacao: 'manual' } as never);
    expect(resolverPerfil(store, 'perfil teste')).toMatchObject({ ok: true, perfil: { nome: 'Perfil Teste' } });
    expect(resolverPerfil(store, '@OutraMarca')).toMatchObject({ ok: true, perfil: { nome: 'Outra Marca' } });
    const vazio = resolverPerfil(store, '');
    expect(vazio.ok).toBe(false);
    if (!vazio.ok) expect(vazio.error).toMatch(/Perfil Teste.*Outra Marca|Outra Marca.*Perfil Teste/);
    expect(formatoDaEntrada('stories')).toBe('ig-stories-9x16');
    expect(formatoDaEntrada('Live')).toBeNull();
  });
});

describe('agentes propõem peça (F4)', () => {
  const RESPOSTA = [
    'Fiz o roteiro.',
    '',
    'PECA:',
    'perfil: Perfil Teste',
    'formato: Reel',
    'tema: Preço não é custo',
    'roteiro: Abra com a pergunta',
    'Mostre a conta',
    'Feche com o convite',
    'legenda: Você cobra pelo tempo ou pelo resultado?',
    'hashtags: precificacao #negocios',
    'data: amanhã às 9h',
  ].join('\n');

  it('lê o bloco, junta linhas e ignora data com aviso', () => {
    const r = parsePecas(RESPOSTA);
    expect(r.propostas).toHaveLength(1);
    expect(r.propostas[0].roteiro).toBe('Abra com a pergunta\nMostre a conta\nFeche com o convite');
    expect(r.avisos.join(' ')).toContain('Agente não agenda');
    expect(r.texto).toBe('Fiz o roteiro.');
    expect(parsePecas('PECA:\nformato: Reel\n').avisos).toContain('Descartado: bloco PECA sem tema.');
  });

  it('Redator cria a peça com roteiro, legenda e hashtags; o texto diz o que criou', () => {
    const store = studio();
    const out = aplicarPecasDoAgente('redator', RESPOSTA, 'run-9', () => store);
    const [peca] = store.listPecas();
    expect(peca.etapa).toBe('pauta');
    expect(peca.roteiro?.cenas?.map((c) => c.texto_narrado)).toEqual(['Abra com a pergunta', 'Mostre a conta', 'Feche com o convite']);
    expect(peca.legenda).toBe('Você cobra pelo tempo ou pelo resultado?');
    expect(peca.hashtags).toEqual(['#precificacao', '#negocios']);
    expect(peca.agendado_para).toBeNull();
    expect(peca.origem).toMatchObject({ origem: 'agente', autor: 'Redator', ref: 'run-9' });
    expect(out).toContain('criada no Studio, etapa pauta');
    expect(out).not.toContain('PECA:');
  });

  it('agente sem permissão ou resposta sem bloco: texto igual e banco do Studio nem abre', () => {
    let abriu = 0;
    const getter = () => { abriu++; return studio(); };
    expect(aplicarPecasDoAgente('raiox', RESPOSTA, 'r', getter)).toBe(RESPOSTA);
    expect(aplicarPecasDoAgente('redator', 'só texto\n\n\nfim', 'r', getter)).toBe('só texto\n\n\nfim');
    expect(abriu).toBe(0);
    expect(['redator', 'social', 'agente:Íris', 'agente:Redator · Conteúdo'].every(agentePropoePeca)).toBe(true);
    expect(['video', 'raiox', 'paula', 'agente:Kakashi'].some(agentePropoePeca)).toBe(false);
  });

  it('só o pedido de Íris, Redator e Social leva a instrução do bloco PECA', () => {
    const base = { mode: 'exec' as const, task: { id: 't', seq: 1, title: 'x', status: 'to_plan' } as never, plan: '', note: '', previous: '', workspace: 'C:/w' };
    expect(buildPrompt({ ...base, agent: 'redator', fields: { tema: 'a' } })).toContain('PECA:');
    expect(buildPrompt({ ...base, agent: 'agente:Íris' })).toContain('Não escreva data, hora nem agenda');
    expect(buildPrompt({ ...base, agent: 'agente:Kakashi' })).not.toContain('PECA:');
  });
});
