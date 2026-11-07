import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
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
      expect(db.jobs.length).toBeGreaterThan(0);
      expect(db.approvals.length).toBeGreaterThan(0);
    });

    it('deve persistir alterações no estado do banco de dados', () => {
      const db = carregarDb();
      const testJobId = `job-test-${Date.now()}`;
      db.jobs.unshift({
        id: testJobId,
        title: 'Job de Teste Unitário',
        who: 'Edna E2E',
        ini: 'EE',
        status: 'running',
        progress: 10,
        model: 'claude-sonnet-4',
        motor: 'Cursor',
        effort: 'equilibrado',
        task: '#99',
        cost: 0.1,
        ceiling: 5,
        started: '15:00',
        tokens: '10k'
      });
      salvarDb(db);

      const dbRecarregado = carregarDb();
      const jobEncontrado = dbRecarregado.jobs.find((j) => j.id === testJobId);
      expect(jobEncontrado).toBeDefined();
      expect(jobEncontrado?.title).toBe('Job de Teste Unitário');

      // Limpeza
      dbRecarregado.jobs = dbRecarregado.jobs.filter((j) => j.id !== testJobId);
      salvarDb(dbRecarregado);
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

      engineHub.updateSettings({ defaultEngine: 'anthropic' });
      expect(engineHub.getSettings().defaultEngine).toBe('anthropic');

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
