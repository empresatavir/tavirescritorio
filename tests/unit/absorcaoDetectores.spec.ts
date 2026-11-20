import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { detectar, mascararLinha } from '../../src/main/absorcao/detectores';
import { garantirExclude, gravarRetrato, montarRetrato, retratoPath, calcularCobertura } from '../../src/main/absorcao/retrato';

function pasta(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-det-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  return dir;
}

const achado = (lev: ReturnType<typeof detectar>, id: string) => lev.servicos.find((s) => s.servico === id);

describe('detectores da absorção', () => {
  it('Next + Supabase + Stripe saem confirmados, com arquivo:linha', () => {
    const dir = pasta({
      'package.json': JSON.stringify({ name: 'loja', dependencies: { next: '15.0.0', react: '19.0.0', '@supabase/supabase-js': '^2.45.0', stripe: '^16.0.0' }, scripts: { dev: 'next dev', build: 'next build', test: 'vitest' } }, null, 2),
      '.env.example': 'NEXT_PUBLIC_SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nSTRIPE_SECRET_KEY=\n',
      'src/lib/db.ts': "import { createClient } from '@supabase/supabase-js';\nexport const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, 'k');\nconst url = 'https://abc.supabase.co';\n",
      'src/lib/pay.ts': "import Stripe from 'stripe';\nexport const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);\n",
    });
    const lev = detectar(dir);
    expect(lev.stack).toEqual(expect.arrayContaining(['Next.js', 'React']));
    for (const id of ['supabase', 'stripe']) {
      const a = achado(lev, id)!;
      expect(a, id).toBeTruthy();
      expect(a.grau).toBe('confirmado');
      const cod = a.provas.find((p) => p.tipo === 'codigo')!;
      expect(cod.arquivo).toMatch(/^src\/lib\//);
      expect(cod.linha).toBeGreaterThan(0);
    }
    expect(achado(lev, 'stripe')!.provas.find((p) => p.tipo === 'dep')!.arquivo).toBe('package.json');
    expect(lev.comandos.map((c) => c.nome)).toEqual(expect.arrayContaining(['dev', 'build', 'test']));
    expect(lev.nomeSugerido).toBe('loja');
  });

  it('só MERCADOPAGO_ACCESS_TOKEN num .env sai como indício', () => {
    const dir = pasta({ '.env': 'MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-abcdef-segredo-real\n', 'index.html': '<h1>oi</h1>' });
    const lev = detectar(dir);
    const mp = achado(lev, 'mercadopago')!;
    expect(mp.grau).toBe('indicio');
    expect(mp.provas).toHaveLength(1);
    expect(mp.provas[0].tipo).toBe('env');
  });

  it('Flutter + Firebase e site estático com netlify.toml', () => {
    const flutter = detectar(
      pasta({
        'pubspec.yaml': 'name: app_cliente\ndependencies:\n  flutter:\n    sdk: flutter\n  firebase_core: ^3.0.0\n  cloud_firestore: ^5.0.0\nflutter:\n  uses-material-design: true\n',
        'lib/main.dart': "import 'package:firebase_core/firebase_core.dart';\nvoid main() async { await Firebase.initializeApp(); }\n",
        'android/app/google-services.json': '{}',
      }),
    );
    expect(flutter.stack).toContain('Flutter');
    expect(achado(flutter, 'firebase')!.grau).toBe('confirmado');
    expect(flutter.designSystem.sinais.join(' ')).toMatch(/Material do Flutter/);
    expect(flutter.nomeSugerido).toBe('app_cliente');

    const site = detectar(pasta({ 'netlify.toml': '[build]\npublish = "."\n', 'index.html': '<html></html>', 'style.css': ':root { --cor: #000; }' }));
    expect(achado(site, 'netlify')!.grau).toBe('indicio');
    expect(site.stack).toContain('Site estático');
    expect(site.designSystem.sinais.join(' ')).toMatch(/Variáveis CSS/);
  });

  it('valor de .env não aparece no retrato.json', () => {
    const segredo = 'valorQueNaoPodeVazarNoRetrato99';
    const dir = pasta({
      '.env': `API_TOKEN=${segredo}\nDATABASE_URL=postgres://u:senhaSuperSecreta123@db.host/x\n`,
      'src/api.ts': `export const token = '${segredo}';\n`,
      'package.json': JSON.stringify({ name: 'loja' }),
    });
    const lev = detectar(dir);
    gravarRetrato(dir, montarRetrato('x', lev));
    const json = fs.readFileSync(retratoPath(dir), 'utf8');
    expect(json).not.toContain(segredo);
    expect(json).not.toContain('senhaSuperSecreta123');
    expect(json).toContain('API_TOKEN');
  });

  it('mascara segredo no trecho de código', () => {
    expect(mascararLinha("const password = 'segredoSuper123';")).not.toContain('segredoSuper123');
    expect(mascararLinha("import Cliente from 'cliente';")).toContain("'cliente'");
  });

  it('pasta com mais de 2.500 arquivos é lida por completo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-big-'));
    for (let d = 0; d < 30; d++) {
      const sub = path.join(dir, 'src', `m${d}`);
      fs.mkdirSync(sub, { recursive: true });
      for (let i = 0; i < 100; i++) fs.writeFileSync(path.join(sub, `f${i}.txt`), 'x');
    }
    fs.writeFileSync(path.join(dir, 'src', 'm29', 'pay.ts'), "import MercadoPago from 'mercadopago';\n");
    const lev = detectar(dir);
    expect(lev.arquivos).toBe(3001);
    expect(achado(lev, 'mercadopago')).toBeTruthy();
    expect(lev.porPasta['src/m29']).toBe(101);
  });

  it('garantirExclude é idempotente e não toca o .gitignore', () => {
    const dir = pasta({ '.gitignore': 'node_modules\n' });
    execFileSync('git', ['init', '-q'], { cwd: dir, windowsHide: true });
    const a = garantirExclude(dir);
    const b = garantirExclude(dir);
    expect(a.added).toEqual(['.tavir/', 'context/', 'memory/', 'qa/', '.env.project']);
    expect(b.added).toEqual([]);
    const ex = fs.readFileSync(path.join(dir, '.git', 'info', 'exclude'), 'utf8');
    expect(ex.match(/\.tavir\//g)).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toBe('node_modules\n');
  });

  it('cobertura pelas citações', () => {
    const cob = calcularCobertura({ src: 10, 'src/a': 4, 'src/b': 6, docs: 20, scripts: 2 }, ['src/a/x.ts:3', 'src/a/y.ts', 'src/a/z.ts', 'docs/r.md', 'scripts/k.sh']);
    const by = Object.fromEntries(cob.map((c) => [c.pasta, c.situacao]));
    expect(by['src/a']).toBe('lida');
    expect(by['src/b']).toBe('nao_lida');
    expect(by.docs).toBe('parcial');
    expect(by.scripts).toBe('lida');
    expect(by.src).toBeUndefined();
  });
});
