import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { citedLinks, firstStudyLink, officeBrief, prepStudy, STUDY_FILES, studyCode, studySource, vttToText } from '../../src/main/officeStudy';
import { jobTask } from '../../src/main/officeCloud';
import { buildPrompt } from '../../src/main/officeExec';

const dirs: string[] = [];
function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-estudo-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const IG = 'https://www.instagram.com/reel/DAbc123xyz/';

describe('estudo de vídeo: links aceitos', () => {
  it('reconhece Instagram e YouTube (watch, shorts, youtu.be) e recusa o resto', () => {
    expect(studySource(IG)).toBe('instagram');
    expect(studySource(YT)).toBe('youtube');
    expect(studySource('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('youtube');
    expect(studySource('https://www.youtube.com/shorts/abcDEF12345')).toBe('youtube');
    expect(studySource('https://www.instagram.com/padaria/')).toBe('');
    expect(studyCode(YT)).toBe('dQw4w9WgXcQ');
    expect(studyCode(IG)).toBe('DAbc123xyz');
  });

  it('acha o link do vídeo no meio do texto que o Carlos colou', () => {
    expect(firstStudyLink(`Vale a pena isso? ${YT}.`)).toBe(YT);
    expect(firstStudyLink('olha https://github.com/x/y e depois')).toBe('');
  });
});

describe('estudo de vídeo: links citados', () => {
  it('separa repositório, pacote e site; ignora o próprio Instagram/YouTube e e-mail', () => {
    const links = citedLinks([
      { onde: 'descrição', texto: `Repo: https://github.com/acme/tool. Site acme.ai. Contato fulano@gmail.com. Canal ${YT}` },
      { onde: 'fala', texto: 'instala com npmjs.com/package/acme-cli e vê github.com/acme/tool' },
    ]);
    expect(links.map((l) => [l.url, l.tipo, l.onde])).toEqual([
      ['https://github.com/acme/tool', 'repositorio', 'descrição'],
      ['https://acme.ai', 'site', 'descrição'],
      ['https://npmjs.com/package/acme-cli', 'pacote', 'fala'],
    ]);
  });
});

describe('estudo de vídeo: legenda do YouTube', () => {
  it('vira texto com instante e sem as repetições da legenda automática', () => {
    const vtt = ['WEBVTT', 'Kind: captions', '', '00:00:01.000 --> 00:00:03.000', 'Olá <c>pessoal</c>', '', '00:00:03.000 --> 00:00:05.000', 'Olá pessoal', '', '00:01:10.000 --> 00:01:12.000', 'hoje: github.com/acme/tool'].join('\n');
    expect(vttToText(vtt)).toBe('[00:01] Olá pessoal\n[01:10] hoje: github.com/acme/tool');
  });
});

describe('estudo de vídeo: preparação da pasta', () => {
  it('YouTube: grava links citados e o retrato do Escritório para o cruzamento', async () => {
    const ws = tmp();
    const office = tmp();
    fs.writeFileSync(path.join(office, 'CLAUDE.md'), '# Regras\n### 1. Higiene de SVG\n### 8. Fábrica\n');
    fs.mkdirSync(path.join(office, 'agentes', 'escopo', 'skills', 'scrapling-tavir'), { recursive: true });
    fs.writeFileSync(path.join(office, 'agentes', 'escopo', 'skills', 'scrapling-tavir', 'SKILL.md'), '---\nname: scrapling\ndescription: Coleta de páginas com Scrapling\n---\n');
    const said: string[] = [];
    const prep = await prepStudy(YT, ws, (l) => said.push(l), () => {}, {
      officeRoot: office,
      youtube: async (_link, dir) => {
        fs.writeFileSync(path.join(dir, STUDY_FILES.info), JSON.stringify({ fonte: 'youtube', description: 'Código em https://github.com/acme/tool' }));
        fs.writeFileSync(path.join(dir, STUDY_FILES.transcript), '[00:10] acessem acme.ai\n');
        fs.writeFileSync(path.join(dir, STUDY_FILES.media), 'x');
        return { ok: true, transcript: true };
      },
      frames: async (_video, dir) => {
        fs.mkdirSync(dir, { recursive: true });
        return 6;
      },
    });
    expect(prep).toMatchObject({ ok: true, source: 'youtube', frames: 6, links: 2, notes: [] });
    const links = JSON.parse(fs.readFileSync(path.join(ws, STUDY_FILES.links), 'utf8'));
    expect(links.map((l: { url: string }) => l.url)).toEqual(['https://github.com/acme/tool', 'https://acme.ai']);
    const brief = fs.readFileSync(path.join(ws, STUDY_FILES.office), 'utf8');
    expect(brief).toContain('Higiene de SVG');
    expect(brief).toContain('scrapling-tavir: Coleta de páginas com Scrapling');
    expect(brief).toContain('Maicon');
  });

  it('sem legenda e sem vídeo, segue com aviso em vez de inventar', async () => {
    const ws = tmp();
    const prep = await prepStudy(YT, ws, () => {}, () => {}, {
      officeRoot: tmp(),
      youtube: async (_link, dir) => {
        fs.writeFileSync(path.join(dir, STUDY_FILES.info), JSON.stringify({ fonte: 'youtube' }));
        return { ok: true, transcript: false };
      },
    });
    expect(prep.ok).toBe(true);
    expect(prep.notes.join(' ')).toMatch(/não tem legenda/);
    expect(prep.notes.join(' ')).toMatch(/Sem quadros/);
  });

  it('link que não é vídeo é recusado antes de qualquer download', async () => {
    const prep = await prepStudy('https://github.com/acme/tool', tmp(), () => {}, () => {});
    expect(prep.ok).toBe(false);
  });
});

describe('estudo de vídeo: pedido do app', () => {
  it('Maicon › Estudar vídeo vira tarefa de estudo com o link e a pergunta', () => {
    const spec = jobTask('agent', { agent: 'Maicon', action: 'estudo-video', instrucao: `${YT} isso serve para a Fábrica?` });
    expect(spec).toMatchObject({ agent: 'estudo', fields: { link: YT, fonte: 'youtube', pergunta: 'isso serve para a Fábrica?' } });
  });

  it('Yuri YouTube › Estudar vídeo fica com o Yuri e usa o método de inteligência de negócios', () => {
    const spec = jobTask('agent', { agent: 'Yuri YouTube', action: 'estudo-video', instrucao: YT });
    expect(spec).toMatchObject({ agent: 'estudo', owner: 'Yuri YouTube', fields: { dono: 'Yuri YouTube' } });
    const prompt = buildPrompt({
      mode: 'exec',
      agent: 'estudo',
      task: { id: 't', seq: 8, title: 'Estudo', desc: '', sector: 'Operação', prio: 'Normal', status: 'in_progress' } as never,
      plan: '',
      note: '',
      previous: '',
      workspace: '/tmp/x',
      fields: { link: YT, fonte: 'youtube', dono: 'Yuri YouTube' },
    });
    expect(prompt).toContain('Você é o Yuri YouTube');
    expect(prompt).toContain('youtube-business-intelligence');
  });

  it('triagem com link de vídeo vai direto para o estudo', () => {
    expect(jobTask('agent', { agent: 'triagem', instrucao: `estuda esse ${IG}` })).toMatchObject({ agent: 'estudo', fields: { fonte: 'instagram' } });
  });

  it('o pedido ao motor manda ver os quadros, abrir os links e cruzar com o Escritório', () => {
    const prompt = buildPrompt({
      mode: 'exec',
      agent: 'estudo',
      task: { id: 't', seq: 7, title: 'Estudo', desc: '', sector: 'Operação', prio: 'Normal', status: 'in_progress' } as never,
      plan: '',
      note: '',
      previous: '',
      workspace: '/tmp/x',
      fields: { link: YT, fonte: 'youtube' },
    });
    expect(prompt).toContain('quadros/indice.md');
    expect(prompt).toContain('links.json');
    expect(prompt).toContain('escritorio.md');
    expect(prompt).toContain('## Parecer');
    expect(prompt).toContain('## Aprendizados para guardar');
    expect(prompt).toContain('estudo-video.md');
  });
});
