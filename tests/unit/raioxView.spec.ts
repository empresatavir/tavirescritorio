import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { analysisReportHtml, mdToHtml } from '../../src/main/raiox/raioxView';
import { addEvidence, createCase } from '../../src/main/raiox/raioxRules';

describe('raioxView', () => {
  it('converte markdown e escapa HTML do conteúdo', () => {
    const html = mdToHtml([
      '# Título',
      'Texto com **negrito**, `código <b>` e [link](https://exemplo.com).',
      '',
      '- item um',
      '- item dois',
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | <script>x</script> |',
      '',
      '[ruim](javascript:alert(1))',
      '<img src=x onerror=alert(1)>',
    ].join('\n'));
    expect(html).toContain('<h2>Título</h2>');
    expect(html).toContain('<strong>negrito</strong>');
    expect(html).toContain('<code>código &lt;b&gt;</code>');
    expect(html).toContain('<a href="https://exemplo.com">link</a>');
    expect(html).toContain('<ul><li>item um</li><li>item dois</li></ul>');
    expect(html).toContain('<table>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript');
  });

  it('monta o relatório da análise com evidências e o material de analise/', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rxview-'));
    fs.mkdirSync(path.join(dir, 'analise', 'google'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'analise', 'google', 'nota.md'), '## Observado\n\nFicha com 40 fotos.', 'utf8');
    const now = '2026-11-10T10:00:00.000Z';
    let c = createCase({ company: 'Loja <Teste>', objective: 'Vender mais', decisionNeeded: 'Canal', mode: 'diagnostico', origin: 'amigo', frontier: 'Google', publicLink: 'https://exemplo.com' } as any, now, 'f0000000-0000-4000-8000-000000000001');
    c = addEvidence(c, { stage: 'encontrar', source: 'Google Maps', claim: 'Sem avaliações visíveis', classification: 'observado', gapIds: [], author: 'dora' } as any, now, 'ev-1');
    const html = analysisReportHtml(c, dir);
    expect(html).toContain('Loja &lt;Teste&gt;');
    expect(html).toContain('Sem avaliações visíveis');
    expect(html).toContain('Ficha com 40 fotos.');
    expect(html).toContain('analise/google/nota.md');
    expect(html).toContain("default-src 'none'");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
