import fs from 'fs';
import path from 'path';

export interface VaultDoc {
  id: string;
  path: string;
  title: string;
  category: string;
  scope: 'Casa' | 'Projeto' | 'Agente' | 'Biblioteca' | 'Dados';
  domain: 'psicologia' | 'copywriting' | 'negócios' | 'engenharia' | 'mercados' | 'frameworks' | 'design';
  source: string;
  confidence: 'alta' | 'média' | 'observado' | 'inferido';
  updatedAt: string;
  summary: string;
  content: string;
  sizeBytes: number;
  projectSlug?: string;
}

export interface VaultIndexStats {
  totalDocs: number;
  byScope: Record<string, number>;
  byDomain: Record<string, number>;
  booksCount: number;
  skillsCount: number;
  projectsCount: number;
  indexedAt: string;
  durationMs: number;
}

export class VaultIndexer {
  private docs: VaultDoc[] = [];
  private lastStats: VaultIndexStats = {
    totalDocs: 0,
    byScope: {},
    byDomain: {},
    booksCount: 0,
    skillsCount: 0,
    projectsCount: 0,
    indexedAt: '',
    durationMs: 0,
  };

  constructor(private baseDir: string = process.cwd()) {}

  private inferDomain(relPath: string, content: string): VaultDoc['domain'] {
    const low = (relPath + ' ' + content.slice(0, 400)).toLowerCase();
    if (low.includes('/psicologia/') || low.includes('psicologia') || low.includes('kahneman') || low.includes('cialdini') || low.includes('ariely')) return 'psicologia';
    if (low.includes('/copywriting/') || low.includes('copywriting') || low.includes('headline') || low.includes('copy')) return 'copywriting';
    if (low.includes('/frameworks/') || low.includes('framework') || low.includes('gtd') || low.includes('hook-model')) return 'frameworks';
    if (low.includes('/mercados/') || low.includes('mercado') || low.includes('posicionamento') || low.includes('dunford')) return 'mercados';
    if (low.includes('/design/') || low.includes('design') || low.includes('ui') || low.includes('ux') || low.includes('taste')) return 'design';
    if (low.includes('/engenharia/') || low.includes('arquitetura') || low.includes('security') || low.includes('api') || low.includes('code')) return 'engenharia';
    return 'negócios';
  }

  private extractSource(relPath: string, content: string): string {
    const lines = content.split(/\r?\n/);
    for (const l of lines.slice(0, 25)) {
      const m = l.match(/(?:Fonte|Source|Autor|Livro|Referência)\s*:\s*(.+)/i);
      if (m && m[1].trim()) return m[1].trim().replace(/\*+/g, '').slice(0, 48);
    }
    return relPath;
  }

  private formatShortDate(mtime: Date): string {
    const d = String(mtime.getDate()).padStart(2, '0');
    const m = String(mtime.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  }

  public indexAll(): VaultDoc[] {
    const t0 = Date.now();
    this.docs = [];
    let booksCount = 0;
    let skillsCount = 0;
    let projectsCount = 0;

    // 1. Indexar Sincron Brain (Memórias Tier 1: Soul, Perfil Carlos, Preferências de Produtividade/Receita)
    const seedPath = path.join(this.baseDir, 'sincron-brain', 'seed_tier1.md');
    if (fs.existsSync(seedPath)) {
      try {
        const raw = fs.readFileSync(seedPath, 'utf8');
        const stat = fs.statSync(seedPath);
        const dt = this.formatShortDate(stat.mtime);
        const blocks = raw.split(/\n(?=\*\*(?:S1|U1|P\d)\.\*\*)/);
        for (const b of blocks) {
          const m = b.match(/^\*\*((?:S1|U1|P\d))\.\*\*\s*(?:🔒\s*)?(?:\*\*(.+?)\*\*|([^\n]+))/);
          if (m) {
            const code = m[1];
            const rawTitle = (m[2] || m[3] || '').replace(/\.$/, '').trim();
            const domain: VaultDoc['domain'] = code === 'P3' || code === 'S1' || code === 'U1' ? 'negócios' : 'engenharia';
            this.docs.push({
              id: `sincron-brain/${code}`,
              path: 'sincron-brain/seed_tier1.md',
              title: `[Tier 1 · ${code}] ${rawTitle}`,
              category: 'sincron-brain',
              scope: 'Casa',
              domain,
              source: 'sincron-brain/seed_tier1.md',
              confidence: 'alta',
              updatedAt: dt,
              summary: b.replace(/\s+/g, ' ').trim().slice(0, 260),
              content: b,
              sizeBytes: b.length,
            });
          }
        }
      } catch {}
    }

    // 2. Indexar Biblioteca de Conhecimento (conhecimento/ — 7 domínios + LivrosPDF)
    const knDir = path.join(this.baseDir, 'conhecimento');
    if (fs.existsSync(knDir)) {
      this.walkKnowledge(knDir, 'Biblioteca');
      const pdfDir = path.join(knDir, 'LivrosPDF');
      if (fs.existsSync(pdfDir)) {
        booksCount = this.walkPdfBooks(pdfDir);
      }
    }

    // 3. Indexar Standards da Casa, Ofícios de Agentes e Skills (agentes/escopo/)
    const escopoDir = path.join(this.baseDir, 'agentes', 'escopo');
    if (fs.existsSync(escopoDir)) {
      skillsCount = this.walkAgentsAndSkills(escopoDir);
    }

    // 4. Indexar Projetos Isolados (tavir-interno e tavir-exterrno) respeitando isolamento
    for (const rootFolder of ['tavir-interno', 'tavir-exterrno']) {
      const pRoot = path.join(this.baseDir, rootFolder);
      if (fs.existsSync(pRoot)) {
        projectsCount += this.walkIsolatedProjects(pRoot);
      }
    }

    // 5. Indexar Telemetria / Dados Operacionais do SQLite (backend/tavir.db)
    this.indexSqliteData();

    const byScope: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    for (const d of this.docs) {
      byScope[d.scope] = (byScope[d.scope] || 0) + 1;
      byDomain[d.domain] = (byDomain[d.domain] || 0) + 1;
    }

    this.lastStats = {
      totalDocs: this.docs.length,
      byScope,
      byDomain,
      booksCount,
      skillsCount,
      projectsCount,
      indexedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      durationMs: Math.max(1, Date.now() - t0),
    };

    try {
      const tavirMetaDir = path.join(this.baseDir, '.tavir');
      fs.mkdirSync(tavirMetaDir, { recursive: true });
      fs.writeFileSync(
        path.join(tavirMetaDir, 'boot-index.json'),
        JSON.stringify({ stats: this.lastStats, topItems: this.docs.slice(0, 30).map((x) => ({ id: x.id, title: x.title, scope: x.scope, domain: x.domain, source: x.source })) }, null, 2),
        'utf8',
      );
    } catch {}

    return this.docs;
  }

  private walkKnowledge(currentDir: string, defaultScope: VaultDoc['scope']): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        if (!['.git', 'node_modules', 'dist', 'LivrosPDF', '.obsidian'].includes(ent.name)) {
          this.walkKnowledge(full, defaultScope);
        }
      } else if (ent.isFile() && ent.name.endsWith('.md') && !ent.name.startsWith('_')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const stat = fs.statSync(full);
          const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
          const lines = content.split(/\r?\n/);
          let title = ent.name.replace(/\.md$/, '').replace(/-/g, ' ');
          for (const line of lines) {
            if (line.startsWith('# ')) {
              title = line.replace(/^#\s+/, '').trim();
              break;
            }
          }
          const domain = this.inferDomain(relPath, content);
          const source = this.extractSource(relPath, content);
          const summary = lines
            .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'))
            .slice(0, 3)
            .join(' ')
            .slice(0, 240);

          this.docs.push({
            id: relPath,
            path: relPath,
            title,
            category: path.dirname(relPath).replace(/\\/g, '/'),
            scope: defaultScope,
            domain,
            source,
            confidence: 'alta',
            updatedAt: this.formatShortDate(stat.mtime),
            summary,
            content,
            sizeBytes: content.length,
          });
        } catch {}
      }
    }
  }

  private walkPdfBooks(pdfDir: string): number {
    let count = 0;
    const walk = (d: string) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.isFile() && ent.name.toLowerCase().endsWith('.pdf')) {
          count++;
          const stat = fs.statSync(full);
          const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
          const cleanName = ent.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
          const domain: VaultDoc['domain'] = relPath.toLowerCase().includes('psicologia') ? 'psicologia' : 'negócios';
          this.docs.push({
            id: relPath,
            path: relPath,
            title: `📘 Livro: ${cleanName}`,
            category: 'conhecimento/LivrosPDF',
            scope: 'Biblioteca',
            domain,
            source: relPath.replace('conhecimento/LivrosPDF/', 'LivrosPDF/'),
            confidence: 'alta',
            updatedAt: this.formatShortDate(stat.mtime),
            summary: `Obra de referência indexada no Vault (${(stat.size / (1024 * 1024)).toFixed(1)} MB).`,
            content: cleanName,
            sizeBytes: stat.size,
          });
        }
      }
    };
    try {
      walk(pdfDir);
    } catch {}
    return count;
  }

  private walkAgentsAndSkills(escopoDir: string): number {
    let skillsCount = 0;
    try {
      for (const ent of fs.readdirSync(escopoDir, { withFileTypes: true })) {
        const full = path.join(escopoDir, ent.name);
        if (ent.isFile() && ent.name.endsWith('.md')) {
          const content = fs.readFileSync(full, 'utf8');
          const stat = fs.statSync(full);
          const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
          const firstH1 = content.split(/\r?\n/).find((l) => l.startsWith('# '));
          const title = firstH1 ? firstH1.replace(/^#\s+/, '').trim() : ent.name.replace(/\.md$/, '');
          this.docs.push({
            id: relPath,
            path: relPath,
            title: `[Canon Casa] ${title}`,
            category: 'agentes/escopo',
            scope: 'Casa',
            domain: ent.name.includes('DESIGN') ? 'design' : 'engenharia',
            source: `canon/${ent.name}`,
            confidence: 'alta',
            updatedAt: this.formatShortDate(stat.mtime),
            summary: content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ').slice(0, 240),
            content,
            sizeBytes: content.length,
          });
        }
      }

      for (const sub of ['agentes', 'oficio']) {
        const subDir = path.join(escopoDir, sub);
        if (!fs.existsSync(subDir)) continue;
        for (const ent of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
          const full = path.join(subDir, ent.name);
          const content = fs.readFileSync(full, 'utf8');
          const stat = fs.statSync(full);
          const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
          const firstH1 = content.split(/\r?\n/).find((l) => l.startsWith('# '));
          const title = firstH1 ? firstH1.replace(/^#\s+/, '').trim() : ent.name.replace(/\.md$/, '');
          this.docs.push({
            id: relPath,
            path: relPath,
            title: `Ofício · ${title}`,
            category: `agentes/${sub}`,
            scope: 'Agente',
            domain: this.inferDomain(relPath, content),
            source: `${sub}/${ent.name}`,
            confidence: 'alta',
            updatedAt: this.formatShortDate(stat.mtime),
            summary: content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ').slice(0, 240),
            content,
            sizeBytes: content.length,
          });
        }
      }

      const skillsDir = path.join(escopoDir, 'skills');
      if (fs.existsSync(skillsDir)) {
        for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
          if (!ent.isDirectory()) continue;
          skillsCount++;
          const skillMd = path.join(skillsDir, ent.name, 'SKILL.md');
          const relPath = `agentes/escopo/skills/${ent.name}`;
          let summary = `Skill operacional especializada (${ent.name}) disponível para os squads.`;
          let content = ent.name;
          let dt = 'ativo';
          if (fs.existsSync(skillMd)) {
            try {
              content = fs.readFileSync(skillMd, 'utf8');
              dt = this.formatShortDate(fs.statSync(skillMd).mtime);
              summary = content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---')).slice(0, 2).join(' ').slice(0, 200) || summary;
            } catch {}
          }
          this.docs.push({
            id: relPath,
            path: relPath,
            title: `⚡ Skill: ${ent.name}`,
            category: 'agentes/skills',
            scope: 'Agente',
            domain: this.inferDomain(ent.name, content),
            source: `skills/${ent.name}`,
            confidence: 'alta',
            updatedAt: dt,
            summary,
            content,
            sizeBytes: content.length,
          });
        }
      }
    } catch {}
    return skillsCount;
  }

  private walkIsolatedProjects(pRoot: string): number {
    let count = 0;
    try {
      for (const ent of fs.readdirSync(pRoot, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        count++;
        const projDir = path.join(pRoot, ent.name);
        const candidates = [
          path.join(projDir, 'context', 'diagnosis.md'),
          path.join(projDir, 'memory', 'MEMORY.md'),
          path.join(projDir, '.tavir', 'isolation.json'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            try {
              const content = fs.readFileSync(c, 'utf8');
              const stat = fs.statSync(c);
              const relPath = path.relative(this.baseDir, c).replace(/\\/g, '/');
              const isIso = c.endsWith('isolation.json');
              this.docs.push({
                id: relPath,
                path: relPath,
                title: isIso ? `🔒 Isolamento · ${ent.name}` : `📁 Projeto · ${ent.name} (${path.basename(c)})`,
                category: 'projeto/isolado',
                scope: 'Projeto',
                domain: 'engenharia',
                source: `${ent.name}/${path.basename(c)}`,
                confidence: 'observado',
                updatedAt: this.formatShortDate(stat.mtime),
                summary: content.replace(/\s+/g, ' ').slice(0, 220),
                content,
                sizeBytes: content.length,
                projectSlug: ent.name,
              });
            } catch {}
          }
        }
      }
    } catch {}
    return count;
  }

  private indexSqliteData(): void {
    try {
      const dbPath = path.join(this.baseDir, 'backend', 'tavir.db');
      if (!fs.existsSync(dbPath)) return;
      const { DatabaseSync } = require('node:sqlite');
      const sqlite = new DatabaseSync(dbPath);
      const projects = sqlite.prepare('SELECT id, name, company, template_code, stages_done, total_stages, status, local_path FROM projects ORDER BY updated_at DESC LIMIT 20').all();
      for (const p of projects) {
        const pct = Math.round(((Number(p.stages_done) || 0) / Math.max(1, Number(p.total_stages) || 9)) * 100);
        this.docs.push({
          id: `db/project/${p.id}`,
          path: String(p.local_path || `projects/${p.id}`),
          title: `Esteira ${p.name} · ${pct}% (${p.status})`,
          category: 'sqlite/projects',
          scope: 'Projeto',
          domain: 'engenharia',
          source: `sqlite/projects · ${p.company || 'TAVIR'}`,
          confidence: 'observado',
          updatedAt: 'hoje',
          summary: `Esteira ${p.template_code || 'sy-c'} da empresa ${p.company || 'TAVIR'} em ${pct}% (${p.stages_done}/${p.total_stages} etapas). Pasta isolada: ${p.local_path || 'local'}`,
          content: JSON.stringify(p),
          sizeBytes: 256,
        });
      }
      const proposals = sqlite.prepare('SELECT id, num, client, value, status FROM proposals LIMIT 20').all();
      for (const pr of proposals) {
        this.docs.push({
          id: `db/proposal/${pr.id}`,
          path: `proposals/${pr.num}`,
          title: `Proposta ${pr.num} · ${pr.client} (R$ ${pr.value})`,
          category: 'sqlite/proposals',
          scope: 'Dados',
          domain: 'mercados',
          source: `sqlite/proposals · ${pr.num}`,
          confidence: 'observado',
          updatedAt: 'hoje',
          summary: `Proposta comercial ${pr.num} para ${pr.client} — Status: ${pr.status}`,
          content: JSON.stringify(pr),
          sizeBytes: 128,
        });
      }
      sqlite.close();
    } catch {}
  }

  public getStats(): VaultIndexStats {
    if (!this.docs.length) {
      this.indexAll();
    }
    return this.lastStats;
  }

  public search(query: string): VaultDoc[] {
    if (!this.docs.length) {
      this.indexAll();
    }
    if (!query || !query.trim()) return this.docs.slice(0, 250);
    const q = query.toLowerCase();
    return this.docs
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.domain.toLowerCase().includes(q) ||
          d.scope.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q),
      )
      .slice(0, 120);
  }

  public getById(id: string): VaultDoc | undefined {
    return this.docs.find((d) => d.id === id);
  }
}
