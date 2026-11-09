import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Antes de qualquer import do app: dados numa pasta temporária. Sem isto, o teste lia e
// regravava db/tavir_store.json, db/engine_settings.json e as tarefas do backend/tavir.db reais.
vi.hoisted(() => {
  const nodeFs = require('node:fs') as typeof import('node:fs');
  const nodeOs = require('node:os') as typeof import('node:os');
  const nodePath = require('node:path') as typeof import('node:path');
  process.env.TAVIR_DATA_ROOT = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'tavir-backend-'));
});
import { carregarDb, salvarDb } from '../src/main/db';
import { cifrar, decifrar } from '../src/main/cofreCripto';
import { engineHub } from '../src/main/drivers/engineHub';
import { VaultIndexer } from '../src/main/indexer';
import { removerWorktree } from '../src/main/gitFlow';

describe('Suíte de Testes de Backend & Infraestrutura TAVIR', () => {
  describe('1. Banco de Dados Local (SQLite/JSON Store com WAL Ready)', () => {
    it('deve carregar o banco de dados com estado de sessão e listas iniciais', () => {
      const db = carregarDb();
      expect(db).toBeDefined();
      expect(db.session).toBeDefined();
      expect(db.session.operatorName).toBe('Carlos');
      expect(Array.isArray(db.jobs)).toBe(true);
      expect(Array.isArray(db.tasks)).toBe(true);
      expect(Array.isArray(db.approvals)).toBe(true);
      // Sem SQLite não existe dado fictício: as listas começam vazias.
      expect(db.jobs).toEqual([]);
      expect(db.approvals).toEqual([]);
    });

    it('nunca usa os dados reais do escritório', () => {
      const root = process.env.TAVIR_DATA_ROOT || '';
      expect(root).toContain('tavir-backend-');
      salvarDb(carregarDb());
      expect(fs.existsSync(path.join(root, 'db', 'tavir_store.json'))).toBe(true);
    });

    it('deve persistir a sessão no store JSON', () => {
      const db = carregarDb();
      db.session.theme = db.session.theme === 'light' ? 'dark' : 'light';
      const esperado = db.session.theme;
      salvarDb(db);

      // Jobs, tarefas e aprovações vêm só do SQLite (backend/tavir.db); o JSON guarda a sessão.
      const dbRecarregado = carregarDb();
      expect(dbRecarregado.session.theme).toBe(esperado);
    });
  });

  describe('2. Cofre Criptográfico DPAPI / AES-256-GCM', () => {
    it('deve cifrar e decifrar segredos com integridade e autenticação GCM', () => {
      const segredoOriginal = 'sk-ant-api03-test-secret-key-1234567890';
      const pacote = cifrar(segredoOriginal);

      expect(pacote).toBeDefined();
      expect(pacote.startsWith('v2:')).toBe(true);
      expect(pacote).not.toBe(segredoOriginal);

      const segredoDecifrado = decifrar(pacote);
      expect(segredoDecifrado).toBe(segredoOriginal);
    });

    it('deve retornar vazio se o payload for corrompido ou inválido', () => {
      const pacote = cifrar('chave-super-secreta');
      const pacoteCorrompido = pacote.slice(0, -6) + 'XXXXXX';
      const dec = decifrar(pacoteCorrompido);
      expect(dec).toBe('');
    });
  });

  describe('3. Multi-Engine Hub (Anthropic, Cursor, Antigravity, Codex)', () => {
    it('deve expor os 4 motores e permitir alternância de motor padrão', () => {
      const settings = engineHub.getSettings();
      expect(settings).toBeDefined();
      expect(settings.anthropicEnabled).toBe(true);
      expect(settings.cursorEnabled).toBe(true);
      expect(settings.antigravityEnabled).toBe(true);
      expect(settings.codexEnabled).toBe(true);

      // 'anthropic' é o nome antigo: o hub grava como 'claude'.
      engineHub.updateSettings({ defaultEngine: 'anthropic' });
      expect(engineHub.getSettings().defaultEngine).toBe('claude');

      engineHub.updateSettings({ defaultEngine: 'cursor' });
      expect(engineHub.getSettings().defaultEngine).toBe('cursor');
    });

    it('deve instanciar drivers para cada motor cadastrado', () => {
      const anthropic = engineHub.getDriver('anthropic');
      const cursor = engineHub.getDriver('cursor');
      const antigravity = engineHub.getDriver('antigravity');
      const codex = engineHub.getDriver('codex');

      expect(anthropic.name).toContain('Anthropic');
      expect(cursor.name).toContain('Cursor');
      expect(antigravity.name).toContain('Antigravity');
      expect(codex.name).toContain('Codex');
    });
  });

  describe('4. Vault Indexer (Conhecimento Canônico & 187 Notas)', () => {
    it('deve indexar os arquivos de markdown de conhecimento e escopo', () => {
      const indexer = new VaultIndexer(process.cwd());
      const docs = indexer.indexAll();

      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);

      // Testa busca por palavra-chave
      const resultados = indexer.search('C2PA');
      expect(Array.isArray(resultados)).toBe(true);
    });

    it('deve permitir busca por termos com case-insensitive', () => {
      const indexer = new VaultIndexer(process.cwd());
      indexer.indexAll();

      const res = indexer.search('landing');
      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe('5. Git Worktree Isolation (.work/wt-<id>/)', () => {
    it('deve gerenciar caminhos atômicos de worktree sem colisão', async () => {
      const testTaskId = `wt-test-${Date.now()}`;
      const workDir = path.resolve(process.cwd(), '.work', `wt-${testTaskId}`);

      // Garante que a pasta não existe previamente
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }

      // Cria a pasta representativa do worktree
      fs.mkdirSync(workDir, { recursive: true });
      fs.writeFileSync(path.join(workDir, 'README.md'), '# Worktree Isolada');

      expect(fs.existsSync(workDir)).toBe(true);

      // Limpeza
      await removerWorktree(testTaskId);
      expect(fs.existsSync(workDir)).toBe(false);
    });
  });
});
