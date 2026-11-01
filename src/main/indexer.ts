import fs from 'fs';
import path from 'path';

export interface VaultDoc {
  id: string;
  path: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  sizeBytes: number;
}

export class VaultIndexer {
  private docs: VaultDoc[] = [];

  constructor(private baseDir: string = process.cwd()) {}

  public indexAll(): VaultDoc[] {
    const searchDirs = [
      path.join(this.baseDir, 'conhecimento'),
      path.join(this.baseDir, 'agentes', 'escopo')
    ];

    this.docs = [];

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        this.walk(dir);
      }
    }

    return this.docs;
  }

  private walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const ent of entries) {
      const full = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        if (!['.git', 'node_modules', 'dist'].includes(ent.name)) {
          this.walk(full);
        }
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
          const lines = content.split('\n');
          let title = ent.name.replace(/\.md$/, '');
          for (const line of lines) {
            if (line.startsWith('# ')) {
              title = line.replace(/^#\s+/, '').trim();
              break;
            }
          }

          const category = path.dirname(relPath).replace(/\\/g, '/');
          const summary = lines
            .filter((l) => l.trim() && !l.startsWith('#'))
            .slice(0, 3)
            .join(' ')
            .slice(0, 240);

          this.docs.push({
            id: relPath,
            path: relPath,
            title,
            category,
            summary,
            content,
            sizeBytes: content.length
          });
        } catch {
          // Ignora erros de leitura de arquivo individual
        }
      }
    }
  }

  public search(query: string): VaultDoc[] {
    if (!query || !query.trim()) return this.docs.slice(0, 50);
    const q = query.toLowerCase();
    return this.docs
      .filter((d) => d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
      .slice(0, 50);
  }

  public getById(id: string): VaultDoc | undefined {
    return this.docs.find((d) => d.id === id);
  }
}
