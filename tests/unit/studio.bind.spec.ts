import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const forbidden = ['Episódio 14', '42k seguidores', 'dall-e-3', 'US$ 1,20', '428k', 'US$ 0,08'];

function page(file: string): string {
  return fs.readFileSync(path.join(root, 'src/renderer/studio-ref', file), 'utf8');
}

describe('studio bind', () => {
  it('as páginas de origem não trazem os dados de demonstração', () => {
    const studio = page('Studio.dc.html');
    const social = page('Social.dc.html');
    expect(studio).toContain('data-tavir-page="Studio.dc.html"');
    expect(social).toContain('data-tavir-page="Social.dc.html"');
    expect(social).toContain('Em breve');
    for (const text of [studio, social]) {
      for (const fixture of forbidden) expect(text).not.toContain(fixture);
    }
  });

  it('o HTML final injeta o Studio sem as strings de fixture', () => {
    const esteiras = path.join(root, 'dist/shared/esteiras.js');
    if (!fs.existsSync(esteiras)) {
      execFileSync('npm', ['run', 'build:main'], { cwd: root, stdio: 'inherit', shell: true });
    }
    execFileSync(process.execPath, ['scripts/clean_and_bind_ipc.js'], { cwd: root, stdio: 'inherit' });
    const html = fs.readFileSync(path.join(root, 'dist/renderer/index.html'), 'utf8');
    const match = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/i);
    expect(match).toBeTruthy();
    const manifest = JSON.parse(match![1]);
    const uuid = '16017d18-269b-4357-ad7b-a062bb3012c1';
    const social = '4de11384-84d7-4565-aa6e-7c22c5e8ecbd';
    const studioPage = zlib.gunzipSync(Buffer.from(manifest[uuid].data, 'base64')).toString('utf8');
    const socialPage = zlib.gunzipSync(Buffer.from(manifest[social].data, 'base64')).toString('utf8');
    expect(studioPage).toContain('data-tavir-page="Studio.dc.html"');
    expect(socialPage).toContain('Em breve');
    for (const fixture of forbidden) {
      expect(studioPage).not.toContain(fixture);
      expect(socialPage).not.toContain(fixture);
    }
  }, 180000);
});
