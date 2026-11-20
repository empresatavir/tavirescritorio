import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RAIOX_GAPS } from '../../src/shared/raiox';
import { lintPlaybook, loadPlaybooks, parsePlaybook } from '../../src/main/raiox/playbooks';

describe('playbooks do Raio-X', () => {
  it('tem exatamente 16 playbooks, um por gap', () => {
    const books = loadPlaybooks();
    expect(books).toHaveLength(16);
    expect(books.map((item) => item.id).sort()).toEqual(RAIOX_GAPS.map((gap) => gap.id).sort());
  });

  it('passa na checagem', () => {
    for (const book of loadPlaybooks()) expect(lintPlaybook(book), book.id).toEqual([]);
  });

  it('nenhum está validado', () => {
    // Carlos remove esta asserção ao validar o primeiro
    expect(loadPlaybooks().some((book) => book.status === 'validado')).toBe(false);
  });

  it('lê passos e métricas de um exemplo temporário', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-playbook-'));
    const text = `---
id: exemplo
titulo: Exemplo
etapa: encontrar
oferta: presenca_local
onda: 1
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 2
---

# Exemplo

## Passo 0 — Linha de base
- Métrica: visitas_perfil | Unidade: visitas | Como coletar: Anotar o número do painel.

## Passo a passo

### Passo 1 — Abrir a ficha
- Tempo: 10 min
- Ferramenta: Perfil da Empresa
- Como: Abrir a ficha do titular.
- Prova: Nota da abertura.

### Passo 2 — Conferir o telefone
- Tempo: 10 min
- Ferramenta: Perfil da Empresa
- Como: Comparar o telefone com o papel.
- Prova: Telefone anotado.
`;
    fs.writeFileSync(path.join(dir, 'exemplo.md'), text);
    const parsed = parsePlaybook(text, 'exemplo.md');
    expect(parsed.baseline).toEqual([{ key: 'visitas_perfil', unit: 'visitas', how: 'Anotar o número do painel.' }]);
    expect(parsed.steps.map((step) => step.n)).toEqual([1, 2]);
    expect(parsed.steps[1].proof).toBe('Telefone anotado.');
    expect(loadPlaybooks(dir)).toHaveLength(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
