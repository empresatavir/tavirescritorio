import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO = path.resolve(__dirname, '../..');
const WEB = path.join(REPO, 'raiox', 'web');
const RUNBOOK = fs.readFileSync(path.join(REPO, 'raiox', 'docs', 'validacao', 'runbook-incidentes.md'), 'utf8');

// Nomes que não são segredo: endereço, id de chat, porta, chave liga/desliga.
const NOT_SECRET = new Set([
  'SUPABASE_URL', 'RAIOX_APP_URL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'PORT',
  'TELEGRAM_CEO_CHAT_ID', 'RAIOX_EMAIL_ENABLED', 'RAIOX_EMAIL_FROM',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'test') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function envNames(): string[] {
  const names = new Set<string>();
  for (const file of walk(WEB)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/Deno\.env\.get\("([A-Z0-9_]+)"\)|process\.env\.([A-Z0-9_]+)|env\.([A-Z0-9_]+)/g)) {
      names.add(m[1] || m[2] || m[3]);
    }
  }
  return [...names].filter((n) => !NOT_SECRET.has(n)).sort();
}

describe('G-PR1 controle 9 — roteiro de incidentes', () => {
  it('cobre os cenários, a contenção, a evidência, o jurídico e o ensaio', () => {
    for (const heading of [
      '## 1. E-mail enviado ao endereço errado',
      '## 2. Link de formulário vazado',
      '## 3. Telegram comprometido',
      '## 4. Rotação de segredos',
      '## 5. Incidente em fornecedor',
      '## Contenção rápida',
      '## Evidência',
      '## Acionamento jurídico',
      '## Ensaio',
    ]) expect(RUNBOOK, heading).toContain(heading);
  });

  it('todo segredo lido pelo formulário e pelas funções está na tabela de rotação', () => {
    const names = envNames();
    expect(names.length).toBeGreaterThan(8);
    const missing = names.filter((n) => !RUNBOOK.includes(`| \`${n}\` |`));
    expect(missing).toEqual([]);
  });

  it('o SQL de contenção fecha as mesmas coisas que a revogação', () => {
    const migration = fs.readFileSync(path.join(WEB, 'supabase', 'migrations', '20261121140000_raiox_gpr1_revogacao.sql'), 'utf8');
    expect(migration).toContain("update public.raiox_form_sessions set status = 'revoked'");
    expect(RUNBOOK).toContain("update public.raiox_form_sessions set status = 'revoked'");
    expect(RUNBOOK).toContain('update public.raiox_email_verifications set used_at = now()');
  });

  it('registro de incidente real fica fora do git e o arquivo não traz dado de caso', () => {
    expect(RUNBOOK).toContain('%APPDATA%/<app>/raiox/incidentes/');
    expect(RUNBOOK).not.toMatch(/RX-[0-9A-F]{8}/);
    expect(RUNBOOK).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
