import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { passosAfetados, retratoDesatualizado } from '../../src/main/absorcao/fluxo';
import { detectar } from '../../src/main/absorcao/detectores';
import { gravarRetrato, lerRetrato, montarRetrato } from '../../src/main/absorcao/retrato';

const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

describe('atualizar retrato', () => {
  it('passos afetados seguem as pastas e os tipos de arquivo', () => {
    expect(passosAfetados(['supabase/migrations/001.sql'])).toEqual(['dados', 'riscos']);
    expect(passosAfetados(['styles/main.css'])).toEqual(['design', 'riscos']);
    expect(passosAfetados(['package.json'])).toEqual(['ambiente', 'integracoes', 'riscos']);
    expect(passosAfetados(['app/account/page.tsx'])).toEqual(['produto', 'arquitetura', 'integracoes', 'riscos']);
    expect(passosAfetados([])).toEqual([]);
  });

  it('compara o commit do retrato com o HEAD', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-upd-'));
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 't@t');
    git(dir, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'um');
    gravarRetrato(dir, montarRetrato('x', detectar(dir)));
    expect(lerRetrato(dir)!.commit).toBe(git(dir, 'rev-parse', 'HEAD'));
    expect(retratoDesatualizado(dir).mudou).toBe(false);
    fs.mkdirSync(path.join(dir, 'styles'));
    fs.writeFileSync(path.join(dir, 'styles', 'a.css'), 'a{}');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'dois');
    const d = retratoDesatualizado(dir);
    expect(d.mudou).toBe(true);
    expect(d.arquivos).toEqual(['styles/a.css']);
    expect(d.passos).toEqual(['design', 'riscos']);
  });
});
