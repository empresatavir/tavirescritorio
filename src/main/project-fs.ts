import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { fitCall } from '../shared/engineCatalog';
import { esteiraTemplate, type EsteiraStage } from '../shared/esteiras';
import { commitStep, type StepCommitResult } from './stepCommit';
import { annotateRun, type RunChanges } from './runLedger';

function getDbPath(): string {
  return path.join(process.cwd(), 'backend', 'tavir.db');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function pickFolderViaPowerShell(): Promise<{ canceled: boolean; path: string | null }> {
  return new Promise((resolve) => {
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$top = New-Object System.Windows.Forms.Form
$top.TopMost = $true
$top.StartPosition = 'CenterScreen'
$top.Width = 1
$top.Height = 1
$top.ShowInTaskbar = $false
$top.Opacity = 0
$top.Show()
$top.Activate()
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = 'Selecione a pasta do projeto no disco (TAVIR Escritorio · Product Lab)'
$dlg.ShowNewFolderButton = $true
$res = $dlg.ShowDialog($top)
$top.Close()
$top.Dispose()
if ($res -eq [System.Windows.Forms.DialogResult]::OK -and $dlg.SelectedPath) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dlg.SelectedPath
}
`;
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { windowsHide: true, timeout: 120000 },
      (err, stdout) => {
        if (err) {
          resolve({ canceled: true, path: null });
          return;
        }
        const selected = String(stdout || '').trim();
        if (!selected) {
          resolve({ canceled: true, path: null });
        } else {
          resolve({ canceled: false, path: selected });
        }
      },
    );
  });
}

export function resolveProjectRecord(idOrPath: string): {
  id: string;
  slug: string;
  name: string;
  company: string;
  template_code: string;
  local_path: string;
  description: string;
  stack: string | null;
} {
  const raw = String(idOrPath || '').trim();
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    let row = sqlite
      .prepare(
        'SELECT id, slug, name, client, company, template_code, local_path, stack, description FROM projects WHERE id = ? OR slug = ? OR name = ? OR local_path = ? LIMIT 1',
      )
      .get(raw, raw, raw, raw);
    if (!row && !raw) {
      row = sqlite
        .prepare('SELECT id, slug, name, client, company, template_code, local_path, stack, description FROM projects ORDER BY created_at DESC LIMIT 1')
        .get();
    }
    if (row) {
      const slug = row.slug || 'projeto-tavir';
      const resolvedPath =
        row.local_path && !String(row.local_path).startsWith('~')
          ? path.resolve(String(row.local_path))
          : path.join(process.cwd(), 'tavir-interno', slug);
      if (!row.local_path) {
        try {
          sqlite.prepare('UPDATE projects SET local_path = ? WHERE id = ?').run(resolvedPath, row.id);
        } catch {}
      }
      sqlite.close();
      return {
        id: String(row.id),
        slug: String(slug),
        name: String(row.name || 'Projeto'),
        company: String(row.company || row.client || 'TAVIR'),
        template_code: String(row.template_code || 'sy-c'),
        local_path: resolvedPath,
        description: String(row.description || ''),
        stack: row.stack ? String(row.stack) : null,
      };
    }
    sqlite.close();
  } catch {}

  const isPathLike = raw.includes('\\') || raw.includes('/') || raw.includes(':');
  const slugFallback =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'projeto-tavir';
  const fallbackPath = isPathLike ? path.resolve(raw) : path.join(process.cwd(), 'tavir-interno', slugFallback);
  return {
    id: raw || 'proj-local',
    slug: slugFallback,
    name: isPathLike ? path.basename(fallbackPath) : raw || 'Projeto',
    company: 'TAVIR',
    template_code: 'sy-c',
    local_path: fallbackPath,
    description: 'Workspace isolado',
    stack: null,
  };
}

export function ensureProjectStructureOnDisk(proj: {
  id: string;
  slug: string;
  name: string;
  company: string;
  template_code: string;
  local_path: string;
  description?: string;
}): void {
  const wsPath = proj.local_path;
  if (!wsPath) return;
  try {
    fs.mkdirSync(path.join(wsPath, '.tavir'), { recursive: true });
    fs.mkdirSync(path.join(wsPath, 'context'), { recursive: true });
    fs.mkdirSync(path.join(wsPath, 'memory', 'projeto'), { recursive: true });

    // Se a pasta não possui subpastas de código (como aplicativo/, src/, frontend/, backend/), cria a estrutura padrão da esteira
    const existingEntries = fs.readdirSync(wsPath, { withFileTypes: true }).map((e) => e.name);
    const hasCodeDir = existingEntries.some((n) => ['aplicativo', 'src', 'frontend', 'backend', 'app', 'pages', 'public'].includes(n));
    if (!hasCodeDir) {
      fs.mkdirSync(path.join(wsPath, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(wsPath, 'src'), { recursive: true });
      fs.mkdirSync(path.join(wsPath, 'qa'), { recursive: true });
      fs.mkdirSync(path.join(wsPath, 'handoff'), { recursive: true });
    }

    const projJsonPath = path.join(wsPath, '.tavir', 'project.json');
    if (!fs.existsSync(projJsonPath)) {
      fs.writeFileSync(
        projJsonPath,
        JSON.stringify(
          {
            id: proj.id,
            slug: proj.slug,
            name: proj.name,
            company: proj.company,
            template_code: proj.template_code,
            workspace_path: wsPath,
          },
          null,
          2,
        ),
        'utf8',
      );
    }

    const isoPath = path.join(wsPath, '.tavir', 'isolation.json');
    if (!fs.existsSync(isoPath)) {
      const isPersonal = String(proj.description || '').toLowerCase().includes('carlos');
      fs.writeFileSync(
        isoPath,
        JSON.stringify(
          {
            isolated: true,
            project_id: proj.id,
            slug: proj.slug,
            workspace_path: wsPath,
            git_identity: {
              profile: isPersonal ? 'Pessoal (Carlos)' : 'TAVIR (Empresa)',
              user_name: isPersonal ? 'Carlos' : 'TAVIR',
              user_email: isPersonal ? 'carlos@pessoal.local' : 'engenharia@tavir.com.br',
              scope: 'local-only (.git/config)',
            },
            deploy_isolation: {
              target: 'Isolado local (.env.project)',
              env_file: '.env.project',
              leaks_blocked: true,
            },
          },
          null,
          2,
        ),
        'utf8',
      );
    }

    const envProjPath = path.join(wsPath, '.env.project');
    if (!fs.existsSync(envProjPath)) {
      fs.writeFileSync(
        envProjPath,
        `# Cofre Isolado do Projeto: ${proj.name}\n# Isolado exclusivamente nesta pasta (${wsPath})\nTAVIR_PROJECT_ID=${proj.id}\nTAVIR_PROJECT_SLUG=${proj.slug}\nTAVIR_COMPANY=${proj.company}\n`,
        'utf8',
      );
    }

    const memPath = path.join(wsPath, 'memory', 'projeto', 'MEMORY.md');
    if (!fs.existsSync(memPath)) {
      fs.writeFileSync(
        memPath,
        `# Memória Isolada do Projeto · ${proj.name}\n\n- **Pasta do Projeto**: \`${wsPath}\`\n- **Esteira**: \`${proj.template_code.toUpperCase()}\`\n- **Cliente / Empresa**: ${proj.company}\n- **Isolamento**: Credenciais (\`.env.project\`) e Git local ativos.\n`,
        'utf8',
      );
    }
  } catch {}
}

export function inspectProjectFolder(idOrPath: string): any {
  const proj = resolveProjectRecord(idOrPath);
  ensureProjectStructureOnDisk(proj);
  const wsPath = proj.local_path;

  const IGNORED_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.pytest_cache', '.dart_tool', '.gradle', 'build', 'ephemeral', '.idea', '.vscode']);
  const tree: any[] = [];
  let dirCount = 0;
  let fileCount = 0;
  const detectedStacks = new Set<string>();

  function walk(currentDir: string, relPrefix: string, depth: number) {
    if (depth > 3 || tree.length >= 160) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const ent of entries) {
      if (IGNORED_DIRS.has(ent.name)) continue;
      if (tree.length >= 160) break;
      const fullPath = path.join(currentDir, ent.name);
      const relPath = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;

      if (ent.isDirectory()) {
        dirCount++;
        if (ent.name === 'aplicativo') detectedStacks.add('Flutter / Mobile');
        if (ent.name === 'frontend') detectedStacks.add('Frontend Web');
        if (ent.name === 'backend') detectedStacks.add('Backend API');
        tree.push({
          type: 'dir',
          name: ent.name,
          relPath: `${relPath}/`,
          fullPath,
          depth,
          indent: depth * 18,
          sizeLabel: 'pasta',
          ext: 'DIR',
          isDir: true,
          isFile: false,
        });
        walk(fullPath, relPath, depth + 1);
      } else if (ent.isFile()) {
        fileCount++;
        let size = 0;
        let mtime = 'hoje';
        try {
          const st = fs.statSync(fullPath);
          size = st.size;
          const d = st.mtime;
          mtime = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        } catch {}

        if (ent.name === 'pubspec.yaml') detectedStacks.add('Flutter / Dart');
        if (ent.name === 'package.json') detectedStacks.add('Node / TypeScript');
        if (ent.name === 'pyproject.toml' || ent.name === 'requirements.txt') detectedStacks.add('Python / FastAPI');

        const ext = ent.name.startsWith('.') && !ent.name.slice(1).includes('.')
          ? ent.name.slice(1).toUpperCase()
          : (ent.name.split('.').pop() || 'FILE').toUpperCase();
        const isText = /^(MD|JSON|YAML|YML|TS|TSX|JS|JSX|PY|DART|ENV|PROJECT|TXT|HTML|CSS|SH|BAT|SQL|TOML|CSV|LOCK)$/i.test(ext) || ent.name.startsWith('.env');

        tree.push({
          type: 'file',
          name: ent.name,
          relPath,
          fullPath,
          depth,
          indent: depth * 18,
          sizeLabel: formatBytes(size),
          mtime,
          ext,
          isDir: false,
          isFile: true,
          isText,
        });
      }
    }
  }

  walk(wsPath, '', 0);

  let gitProfile = 'TAVIR (Empresa)';
  let deployTarget = 'Isolado local (.env.project)';
  try {
    const isoRaw = fs.readFileSync(path.join(wsPath, '.tavir', 'isolation.json'), 'utf8');
    const iso = JSON.parse(isoRaw);
    if (iso?.git_identity?.profile) gitProfile = iso.git_identity.profile;
    if (iso?.deploy_isolation?.target) deployTarget = iso.deploy_isolation.target;
    if (Array.isArray(iso?.product_lab?.detected_stacks)) {
      iso.product_lab.detected_stacks.forEach((s: string) => detectedStacks.add(s));
    }
  } catch {}

  if (!detectedStacks.size) {
    detectedStacks.add(proj.template_code.startsWith('sy') ? 'Sistemas / Fullstack' : 'Web / Landing Page');
  }

  return {
    id: proj.id,
    slug: proj.slug,
    name: proj.name,
    rootPath: wsPath,
    exists: fs.existsSync(wsPath),
    dirCount,
    fileCount,
    stacks: Array.from(detectedStacks).join(', '),
    gitProfile,
    deployTarget,
    tree,
  };
}

export function readProjectFileContent(filePath: string): { ok: boolean; content: string; size: number } {
  try {
    const resolved = path.resolve(String(filePath || ''));
    if (!fs.existsSync(resolved)) {
      return { ok: false, content: 'Arquivo não encontrado no disco.', size: 0 };
    }
    const st = fs.statSync(resolved);
    if (st.isDirectory()) {
      const items = fs.readdirSync(resolved);
      return {
        ok: true,
        content: `# Pasta: ${resolved}\n\nItens (${items.length}):\n` + items.map((x) => `- ${x}`).join('\n'),
        size: st.size,
      };
    }
    const buf = fs.readFileSync(resolved);
    const slice = buf.subarray(0, Math.min(buf.length, 65536));
    return { ok: true, content: slice.toString('utf8'), size: st.size };
  } catch (e: any) {
    return { ok: false, content: `Não foi possível ler o arquivo: ${e?.message || e}`, size: 0 };
  }
}

export function openProjectFolderInExplorer(idOrPath: string): { ok: boolean; path: string } {
  const proj = resolveProjectRecord(idOrPath);
  ensureProjectStructureOnDisk(proj);
  try {
    const child = spawn('explorer.exe', [proj.local_path], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    return { ok: true, path: proj.local_path };
  } catch {
    return { ok: false, path: proj.local_path };
  }
}

export function deleteProjectWithOptions(
  id: string,
  deleteFiles: boolean = false,
  fallbackPath?: string,
): { ok: boolean; deletedFiles: boolean; path: string | null; error?: string } {
  let targetPath: string | null = fallbackPath ? String(fallbackPath).trim() : null;
  let sqlite: any = null;
  try {
    const { DatabaseSync } = require('node:sqlite');
    sqlite = new DatabaseSync(getDbPath());
    const row = sqlite.prepare('SELECT id, slug, local_path FROM projects WHERE id = ?').get(id);
    if (row && row.local_path) {
      targetPath = String(row.local_path).trim();
    } else if (row && row.slug && !targetPath) {
      const candidate = path.join(process.cwd(), 'tavir-interno', String(row.slug));
      if (fs.existsSync(candidate)) targetPath = candidate;
    }
    sqlite.exec('BEGIN');
    const run = (sql: string, ...args: string[]) => sqlite.prepare(sql).run(...args);
    const jobsOf = 'SELECT id FROM jobs WHERE project_id = ? OR task_id IN (SELECT id FROM tasks WHERE project_id = ?)';
    run(`DELETE FROM events WHERE job_id IN (${jobsOf})`, id, id);
    run('DELETE FROM events WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', id);
    run(`DELETE FROM events WHERE approval_id IN (SELECT id FROM approvals WHERE job_id IN (${jobsOf}) OR task_id IN (SELECT id FROM tasks WHERE project_id = ?))`, id, id, id);
    run(`DELETE FROM events WHERE artifact_id IN (SELECT id FROM artifacts WHERE job_id IN (${jobsOf}) OR task_id IN (SELECT id FROM tasks WHERE project_id = ?))`, id, id, id);
    run(`DELETE FROM approvals WHERE job_id IN (${jobsOf}) OR task_id IN (SELECT id FROM tasks WHERE project_id = ?)`, id, id, id);
    run(`DELETE FROM artifacts WHERE job_id IN (${jobsOf}) OR task_id IN (SELECT id FROM tasks WHERE project_id = ?)`, id, id, id);
    run(`DELETE FROM usage_samples WHERE job_id IN (${jobsOf})`, id, id);
    run(`DELETE FROM job_attempts WHERE job_id IN (${jobsOf})`, id, id);
    run('UPDATE proposals SET project_id = NULL WHERE project_id = ?', id);
    run('UPDATE proposals SET task_id = NULL WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', id);
    run('DELETE FROM jobs WHERE project_id = ? OR task_id IN (SELECT id FROM tasks WHERE project_id = ?)', id, id);
    run('DELETE FROM tasks WHERE project_id = ?', id);
    run('DELETE FROM factory_stages WHERE project_id = ?', id);
    run('DELETE FROM factory_demands WHERE project_id = ?', id);
    run('DELETE FROM factory_runs WHERE project_id = ?', id);
    run('DELETE FROM pieces WHERE project_id = ?', id);
    run('DELETE FROM ideas WHERE project_id = ?', id);
    run('DELETE FROM edit_cues WHERE project_id = ?', id);
    run('UPDATE office_settings SET focused_project_id = NULL WHERE focused_project_id = ?', id);
    const removed = sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id);
    sqlite.exec('COMMIT');
    sqlite.close();
    if (!removed || Number(removed.changes) < 1) {
      return { ok: false, deletedFiles: false, path: targetPath, error: 'O projeto não estava na base.' };
    }
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao remover projeto do SQLite:', err);
    try { sqlite && sqlite.exec('ROLLBACK'); } catch { /* transação já encerrada */ }
    try { sqlite && sqlite.close(); } catch { /* conexão já fechada */ }
    return { ok: false, deletedFiles: false, path: targetPath, error: 'Não consegui tirar o projeto da base. Os registros ligados a ele continuam no lugar.' };
  }

  let deletedFromDisk = false;
  if (deleteFiles && targetPath && !targetPath.startsWith('~')) {
    try {
      const resolved = path.resolve(targetPath);
      const cwdResolved = path.resolve(process.cwd());
      const homeResolved = path.resolve(os.homedir());
      const parts = resolved.split(/[\\/]+/).filter(Boolean);
      const isSafe =
        resolved.toLowerCase() !== cwdResolved.toLowerCase() &&
        resolved.toLowerCase() !== homeResolved.toLowerCase() &&
        parts.length >= 3 &&
        fs.existsSync(resolved);

      if (isSafe) {
        fs.rmSync(resolved, { recursive: true, force: true });
        deletedFromDisk = true;
      }
    } catch (err) {
      console.error('[TAVIR ProjectFS] Erro ao excluir pasta local do projeto:', err);
    }
  }

  return { ok: true, deletedFiles: deletedFromDisk, path: targetPath };
}

const SURVEY_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '__pycache__',
  '.venv', 'venv', '.dart_tool', '.gradle', 'ephemeral', '.idea', '.pytest_cache', 'Pods',
]);

const SURVEY_LANG: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript',
  py: 'Python', dart: 'Dart', kt: 'Kotlin', kts: 'Kotlin', java: 'Java', go: 'Go', rs: 'Rust',
  php: 'PHP', rb: 'Ruby', cs: 'C#', vue: 'Vue', svelte: 'Svelte', html: 'HTML', css: 'CSS',
  scss: 'SCSS', sql: 'SQL', swift: 'Swift', xml: 'XML',
};

function gitText(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, { cwd, windowsHide: true, encoding: 'utf8', timeout: 8000 }).trim();
  } catch {
    return '';
  }
}

export function surveyWorkspace(wsPath: string): any {
  const root = path.resolve(wsPath);
  const extCount: Record<string, number> = {};
  const langCount: Record<string, number> = {};
  const topDirs: string[] = [];
  const topFiles: string[] = [];
  const notable: string[] = [];
  const deploy: string[] = [];
  const envKeys: string[] = [];
  const stacks = new Set<string>();
  const sample: string[] = [];
  let fileCount = 0;
  let dirCount = 0;
  let truncated = false;

  const noteDeploy = (rel: string) => {
    const base = path.basename(rel).toLowerCase();
    if (base === 'vercel.json') deploy.push('Vercel (`vercel.json`)');
    else if (base === 'netlify.toml') deploy.push('Netlify (`netlify.toml`)');
    else if (base === 'fly.toml') deploy.push('Fly.io (`fly.toml`)');
    else if (base === 'dockerfile') deploy.push('Docker (`Dockerfile`)');
    else if (base === 'wrangler.toml') deploy.push('Cloudflare Workers (`wrangler.toml`)');
    else if (base === 'render.yaml') deploy.push('Render (`render.yaml`)');
    else if (base === 'firebase.json') deploy.push('Firebase (`firebase.json`)');
    else if (base === 'app.yaml') deploy.push('App Engine (`app.yaml`)');
    else if (base === 'eas.json') deploy.push('Expo EAS (`eas.json`)');
    else if (rel.replace(/\\/g, '/').includes('.github/workflows/')) deploy.push('GitHub Actions');
  };

  const walk = (dir: string, rel: string, depth: number) => {
    if (depth > 8 || fileCount >= 2500) {
      truncated = fileCount >= 2500;
      return;
    }
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (fileCount >= 2500) {
        truncated = true;
        break;
      }
      if (ent.name === '.DS_Store') continue;
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SURVEY_SKIP_DIRS.has(ent.name)) continue;
        dirCount++;
        if (depth === 0) topDirs.push(ent.name);
        if (ent.name === 'frontend') stacks.add('Frontend Web');
        if (ent.name === 'backend') stacks.add('Backend API');
        if (ent.name === 'aplicativo' || ent.name === 'android' || ent.name === 'ios') stacks.add('App móvel');
        walk(full, childRel, depth + 1);
      } else if (ent.isFile()) {
        fileCount++;
        if (depth === 0) topFiles.push(ent.name);
        if (sample.length < 180) sample.push(childRel);
        const ext = ent.name.includes('.') ? (ent.name.split('.').pop() || '').toLowerCase() : '';
        if (ext) extCount[ext] = (extCount[ext] || 0) + 1;
        const lang = SURVEY_LANG[ext];
        if (lang) langCount[lang] = (langCount[lang] || 0) + 1;
        noteDeploy(childRel);
        const low = ent.name.toLowerCase();
        if (/^(readme|pubspec\.yaml|package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|composer\.json|gemfile)$/i.test(ent.name) && notable.length < 24) {
          notable.push(childRel);
        }
        if (low === 'package.json' && depth <= 2) {
          try {
            const pkg = JSON.parse(fs.readFileSync(full, 'utf8'));
            const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
            if (deps.react) stacks.add('React');
            if (deps['react-native']) stacks.add('React Native');
            if (deps['solid-js']) stacks.add('SolidJS');
            if (deps.next) stacks.add('Next.js');
            if (deps.vue || deps.nuxt) stacks.add('Vue/Nuxt');
            if (deps.electron) stacks.add('Electron');
            if (deps.typescript) stacks.add('TypeScript');
            if (deps.express || deps.fastify || deps.fastify) stacks.add('Node');
            if (deps.tailwindcss || deps['@tailwindcss/vite']) stacks.add('Tailwind CSS');
            if (deps.flutter) stacks.add('Flutter');
          } catch { /* pacote ilegível */ }
        }
        if (low === 'pubspec.yaml') stacks.add('Flutter / Dart');
        if (low === 'pyproject.toml' || low === 'requirements.txt') stacks.add('Python');
        if (low === 'cargo.toml') stacks.add('Rust');
        if (low === 'go.mod') stacks.add('Go');
        if (/^\.env/.test(ent.name) && envKeys.length < 80) {
          try {
            const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
            for (const ln of lines) {
              const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
              if (m && !envKeys.includes(m[1])) envKeys.push(m[1]);
            }
          } catch { /* ignora */ }
        }
      }
    }
  };
  walk(root, '', 0);

  let about = '';
  const readme = ['README.md', 'readme.md', 'README.txt'].map((n) => path.join(root, n)).find((p) => fs.existsSync(p));
  if (readme) {
    try {
      const raw = fs.readFileSync(readme, 'utf8').replace(/\r/g, '').split('\n');
      const line = raw.map((l) => l.replace(/^#+\s*/, '').trim()).find((l) => l && !l.startsWith('![') && !l.startsWith('<'));
      about = (line || '').slice(0, 280);
    } catch { /* sem readme */ }
  }
  const pkgPath = path.join(root, 'package.json');
  if (!about && fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      about = String(pkg.description || pkg.name || '').slice(0, 280);
    } catch { /* sem descrição */ }
  }
  if (!about) about = `Pasta ${path.basename(root)} sem README. O inventário abaixo descreve o que está no disco.`;

  const languages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} (${n})`);
  const hasGit = fs.existsSync(path.join(root, '.git'));
  const remote = hasGit ? gitText(['remote', 'get-url', 'origin'], root) : '';
  const branch = hasGit ? gitText(['rev-parse', '--abbrev-ref', 'HEAD'], root) : '';
  const last = hasGit ? gitText(['log', '-1', '--pretty=%h %s'], root) : '';
  const dirtyRaw = hasGit ? gitText(['status', '--porcelain'], root) : '';
  const dirty = dirtyRaw ? dirtyRaw.split(/\r?\n/).filter(Boolean).length : 0;
  const gitLine = hasGit
    ? [branch && `branch ${branch}`, remote || 'sem remote', last && `último ${last}`, `${dirty} alteração(ões) locais`].filter(Boolean).join(' · ')
    : 'esta pasta não tem repositório Git';
  const deployLine = Array.from(new Set(deploy)).join(', ') || 'nenhum alvo de deploy encontrado nos arquivos';
  const stackLine = Array.from(stacks).join(', ') || (languages[0] ? languages[0].replace(/ \(\d+\)$/, '') : 'não identificada');

  const survey = {
    about,
    languages: languages.join(', ') || 'nenhuma linguagem de código reconhecida',
    stacks: stackLine,
    git: gitLine,
    gitRemote: remote || '',
    branch: branch || '',
    lastCommit: last || '',
    dirty,
    hasGit,
    deploy: deployLine,
    envKeys,
    files: fileCount,
    dirs: dirCount,
    truncated,
    topDirs,
    topFiles,
    notable,
    sample,
    extCount,
  };

  fs.mkdirSync(path.join(root, 'context'), { recursive: true });
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  const inventario = [
    `# Inventário · ${path.basename(root)}`,
    '',
    `- Arquivos lidos: ${fileCount}${truncated ? ' (corte em 2500)' : ''}`,
    `- Pastas: ${dirCount}`,
    `- Linguagens: ${survey.languages}`,
    `- Stack: ${stackLine}`,
    `- Git: ${gitLine}`,
    `- Deploy: ${deployLine}`,
    `- Chaves de ambiente (só nomes): ${envKeys.length ? envKeys.join(', ') : 'nenhuma'}`,
    '',
    '## Pastas da raiz',
    topDirs.length ? topDirs.map((d) => `- ${d}/`).join('\n') : '- (nenhuma)',
    '',
    '## Arquivos da raiz',
    topFiles.length ? topFiles.map((d) => `- ${d}`).join('\n') : '- (nenhum)',
    '',
    '## Arquivos de identidade',
    notable.length ? notable.map((d) => `- ${d}`).join('\n') : '- (nenhum)',
    '',
    '## Amostra de caminhos',
    sample.map((d) => `- ${d}`).join('\n') || '- (vazia)',
    '',
  ].join('\n');
  const dossie = [
    `# Dossiê de descoberta · ${path.basename(root)}`,
    '',
    `## O que é`,
    about,
    '',
    `## Linguagem e stack`,
    survey.languages,
    '',
    stackLine,
    '',
    `## Git`,
    gitLine,
    '',
    `## Deploy`,
    deployLine,
    '',
    `## Ambiente`,
    envKeys.length ? envKeys.map((k) => `- \`${k}\``).join('\n') : 'Nenhuma chave encontrada. Valores não são copiados.',
    '',
    'O inventário completo está em `context/inventario.md` e `context/levantamento.json`.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'context', 'levantamento.json'), JSON.stringify(survey, null, 2), 'utf8');
  fs.writeFileSync(path.join(root, 'context', 'inventario.md'), inventario, 'utf8');
  fs.writeFileSync(path.join(root, 'context', 'dossie.md'), dossie, 'utf8');
  fs.writeFileSync(path.join(root, '.tavir', 'survey.json'), JSON.stringify(survey, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(root, 'context', 'diagnosis.md'),
    `# Diagnóstico · ${path.basename(root)}\n\n${about}\n\n- **Stack**: ${stackLine}\n- **Linguagens**: ${survey.languages}\n- **Git**: ${gitLine}\n- **Deploy**: ${deployLine}\n- **Arquivos**: ${fileCount} · **Pastas**: ${dirCount}\n`,
    'utf8',
  );

  const esteiraNote = `${about}\n\nLinguagens: ${survey.languages}\nStack: ${stackLine}\nGit: ${gitLine}\nDeploy: ${deployLine}\nArquivos: ${fileCount} · Pastas: ${dirCount}`;
  // Na absorção o projeto ainda não está no banco: quem grava a etapa 1 é createOrAbsorbProjectRecord, depois do INSERT.
  if (projectInDb(root)) seedEsteiraFromSurvey(root, esteiraNote);

  return Object.assign(survey, { note: esteiraNote });
}

function projectInDb(rootPath: string): boolean {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const want = path.resolve(rootPath).replace(/\//g, '\\').toLowerCase();
    const rows = sqlite.prepare('SELECT local_path FROM projects').all() as Array<{ local_path: string }>;
    sqlite.close();
    return rows.some((r) => String(r.local_path || '').replace(/\//g, '\\').toLowerCase() === want);
  } catch {
    return false;
  }
}

/** O levantamento determinístico da pasta vira o registro da primeira etapa (gate continua esperando o Carlos). */
function seedEsteiraFromSurvey(root: string, summary: string): void {
  try {
    const desk = readEsteira(root);
    const leadIsGate = !!projectStages(root).stages[0]?.gate;
    const lead = desk.stages[0];
    const marker = 'Levantamento da absorção';
    if (lead && (!lead.note || lead.note.startsWith(marker))) {
      // Refazer o levantamento troca o resumo, mas mantém as decisões que o Carlos já tomou neste gate.
      const decisions = lead.note
        .split(/\n(?=### )/)
        .filter((block) => block.startsWith('### ') && block.includes('Decisão do Carlos'))
        .join('\n');
      lead.note = `${marker}\n\n${summary}${decisions ? `\n\n${decisions.trim()}` : ''}`;
      if (lead.status !== 'running' && lead.status !== 'done') lead.status = leadIsGate ? 'awaiting' : 'done';
      lead.files = ['context/dossie.md', 'context/inventario.md', 'context/levantamento.json', 'context/diagnosis.md'];
      if (!lead.instruction) {
        lead.instruction = 'O levantamento da pasta já foi feito na absorção. Revise o dossiê e complemente só o que faltar. Não recomece do zero.';
      }
      writeEsteira(root, desk);
    }
  } catch (err) {
    console.error('[TAVIR ProjectFS] Falha ao registrar o levantamento na esteira:', err);
  }
}

export function refreshProjectSurvey(idOrPath: string): any {
  const proj = resolveProjectRecord(idOrPath);
  const survey = surveyWorkspace(proj.local_path);
  const description = `${survey.about} · ${survey.git}`;
  const filesJson = JSON.stringify({
    context_files: ['context/dossie.md', 'context/inventario.md', 'context/levantamento.json', 'context/diagnosis.md'],
    survey: {
      about: survey.about,
      languages: survey.languages,
      stacks: survey.stacks,
      git: survey.git,
      gitRemote: survey.gitRemote,
      deploy: survey.deploy,
      files: survey.files,
      dirs: survey.dirs,
    },
  });
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    sqlite.prepare('UPDATE projects SET stack = ?, description = ?, files = ?, updated_at = ? WHERE id = ?').run(
      survey.stacks,
      description.slice(0, 500),
      filesJson,
      new Date().toISOString(),
      proj.id,
    );
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao gravar levantamento:', err);
  }
  return { ok: true, id: proj.id, survey };
}

export function purgeFixtureProjects(): number {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const rows = sqlite.prepare('SELECT id, name, local_path FROM projects').all() as Array<{ id: string; name: string; local_path: string }>;
    let removed = 0;
    for (const row of rows) {
      const name = String(row.name || '');
      const id = String(row.id || '');
      const lp = String(row.local_path || '');
      const fake = id === 'meridian' || id === '_vazio' || /meridian capital|nenhum projeto|loja aurora|^mock\b|fixture/i.test(name);
      const missing = !lp || !fs.existsSync(lp);
      if (fake && missing) {
        sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id);
        removed++;
      }
    }
    sqlite.close();
    return removed;
  } catch {
    return 0;
  }
}

export function createOrAbsorbProjectRecord(params: any): any {
  const { DatabaseSync } = require('node:sqlite');
  const customPath = String(params?.local_path || params?.path || '').trim();
  const isAbsorb = Boolean(params?.absorb || (customPath && !customPath.startsWith('~') && fs.existsSync(customPath)));
  const folderBaseName = customPath ? path.basename(customPath.replace(/[\\/]+$/, '')) : '';

  const name = String(params?.name || folderBaseName || '').trim() || 'Novo Projeto';
  const company = String(params?.company || 'TAVIR').trim() || 'TAVIR';
  const ownership = String(params?.ownership || 'interno').trim().toLowerCase() === 'externo' ? 'externo' : 'interno';
  const gitProfile = String(params?.git_profile || 'TAVIR (Empresa)').trim();
  const isPersonalGit = gitProfile.toLowerCase().includes('pessoal') || gitProfile.toLowerCase().includes('carlos');
  const gitUserName = String(params?.git_name || (isPersonalGit ? 'Carlos' : 'TAVIR')).trim();
  const gitUserEmail = String(params?.git_email || (isPersonalGit ? 'carlos@pessoal.local' : 'engenharia@tavir.com.br')).trim();
  const repoUrl = String(params?.repo_url || '').trim();
  const deployTarget = String(params?.deploy_target || 'Isolado local (.env.project)').trim();
  const absorbAgent = String(params?.absorb_agent || 'Squad Product Lab (Ari + Enzo + Dora)').trim();

  let cat = String(params?.template_category || params?.template || (isAbsorb ? 'sy' : 'lp')).trim().toLowerCase();
  if (cat.includes('oferta') || cat === 'of') cat = 'of';
  else if (cat.includes('sistema') || cat === 'sy' || cat === 'sys') cat = 'sy';
  else cat = 'lp';

  const rawMode = String(params?.mode || params?.track || (isAbsorb ? 'manutencao' : 'zero')).trim().toLowerCase();
  const isMaint = isAbsorb || rawMode.includes('manuten') || rawMode.includes('absorv') || rawMode === 'pronto' || rawMode === 'm';
  const modeCode = isMaint ? 'm' : 'c';
  const templateCode = `${cat}-${modeCode}`;

  const totalStages = esteiraTemplate(templateCode).stages.length;

  const slugBase =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'projeto';
  const projectId = crypto.randomUUID();
  const slug = `${slugBase}-${projectId.slice(0, 6)}`;

  const rootFolder = ownership === 'externo' ? 'tavir-exterrno' : 'tavir-interno';
  const wsPath = customPath && !customPath.startsWith('~') ? path.resolve(customPath) : path.join(process.cwd(), rootFolder, slug);

  let survey: any = null;

  try {
    ensureProjectStructureOnDisk({
      id: projectId,
      slug,
      name,
      company,
      template_code: templateCode,
      local_path: wsPath,
      description: gitProfile,
    });

    survey = surveyWorkspace(wsPath);
    const detectedStacks = String(survey.stacks || '').split(', ').filter(Boolean);
    const envVarsFound: string[] = Array.isArray(survey.envKeys) ? survey.envKeys : [];

    const isolationMeta = {
      isolated: true,
      project_id: projectId,
      slug,
      workspace_path: wsPath,
      ownership,
      git_identity: {
        profile: gitProfile,
        user_name: gitUserName,
        user_email: gitUserEmail,
        repo_url: repoUrl || null,
        scope: 'local-only (.git/config)',
      },
      deploy_isolation: {
        target: deployTarget,
        env_file: '.env.project',
        detected_env_keys: envVarsFound,
        leaks_blocked: true,
      },
      product_lab: {
        absorbed: isAbsorb,
        agent: absorbAgent,
        detected_stacks: detectedStacks,
        absorbed_at: new Date().toISOString(),
      },
    };

    fs.writeFileSync(path.join(wsPath, '.tavir', 'isolation.json'), JSON.stringify(isolationMeta, null, 2), 'utf8');

    try {
      const hadGit = fs.existsSync(path.join(wsPath, '.git'));
      if (!hadGit && !isAbsorb) {
        execFileSync('git', ['init'], { cwd: wsPath, windowsHide: true });
        execFileSync('git', ['config', '--local', 'user.name', gitUserName], { cwd: wsPath, windowsHide: true });
        execFileSync('git', ['config', '--local', 'user.email', gitUserEmail], { cwd: wsPath, windowsHide: true });
      }
      if (repoUrl) {
        try {
          execFileSync('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
        } catch {
          execFileSync('git', ['remote', 'add', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
        }
      }
      if (fs.existsSync(path.join(wsPath, '.git'))) {
        const excludePath = path.join(wsPath, '.git', 'info', 'exclude');
        fs.mkdirSync(path.dirname(excludePath), { recursive: true });
        const curExclude = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
        if (!curExclude.includes('.env.project')) {
          fs.writeFileSync(excludePath, `${curExclude}\n.env.project\n.tavir/credentials.json\n`, 'utf8');
        }
      }
    } catch {}
  } catch (e) {
    console.error('[TAVIR ProjectFS] Aviso ao preparar workspace:', e);
  }

  const stackStr = (survey && survey.stacks) || null;
  const nowIso = new Date().toISOString();
  // Progresso só conta etapa que rodou de verdade na esteira.
  const stagesDoneInit = 0;
  const description = survey
    ? `${survey.about} · Git: ${survey.git} · Deploy: ${survey.deploy}`.slice(0, 500)
    : `Escopo: ${ownership} · Esteira: ${templateCode}`;
  const filesJson = JSON.stringify({
    context_files: ['context/dossie.md', 'context/inventario.md', 'context/levantamento.json', 'context/diagnosis.md'],
    ownership,
    template_code: templateCode,
    git_profile: gitProfile,
    deploy_target: (survey && survey.deploy) || deployTarget,
    absorb_agent: absorbAgent,
    absorbed: isAbsorb,
    survey: survey
      ? {
          about: survey.about,
          languages: survey.languages,
          stacks: survey.stacks,
          git: survey.git,
          gitRemote: survey.gitRemote,
          deploy: survey.deploy,
          files: survey.files,
          dirs: survey.dirs,
        }
      : null,
  });

  const newProj: {
    id: string;
    slug: string;
    name: string;
    client: string;
    company: string;
    template_code: string;
    stages_done: number;
    total_stages: number;
    status: string;
    local_path: string;
    stack: string | null;
    description: string;
    survey: any;
  } = {
    id: projectId,
    slug,
    name,
    client: company,
    company,
    template_code: templateCode,
    stages_done: stagesDoneInit,
    total_stages: totalStages,
    status: 'running',
    local_path: wsPath,
    stack: stackStr,
    description,
    survey,
  };

  try {
    const sqlite = new DatabaseSync(getDbPath());
    const rows = sqlite.prepare('SELECT id, slug, stages_done, total_stages, status, local_path FROM projects').all() as Array<{ id: string; slug: string; stages_done: number; total_stages: number; status: string; local_path: string }>;
    const want = wsPath.replace(/\//g, '\\').toLowerCase();
    const existing = rows.find((row) => String(row.local_path || '').replace(/\//g, '\\').toLowerCase() === want);
    if (existing) {
      sqlite.prepare('UPDATE projects SET name = ?, stack = ?, files = ?, description = ?, updated_at = ? WHERE id = ?').run(
        name,
        stackStr,
        filesJson,
        description,
        nowIso,
        existing.id,
      );
      newProj.id = existing.id;
      newProj.slug = existing.slug;
      newProj.stages_done = existing.stages_done;
      newProj.total_stages = existing.total_stages;
      newProj.status = existing.status;
    } else {
      sqlite
        .prepare(
          `INSERT INTO projects (id, slug, name, client, company, template_code, stages_done, total_stages, status, local_path, stack, files, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          projectId,
          slug,
          name,
          company,
          company,
          templateCode,
          stagesDoneInit,
          totalStages,
          'running',
          wsPath,
          stackStr,
          filesJson,
          description,
          nowIso,
          nowIso,
        );
    }
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao gravar projeto no SQLite:', err);
  }
  if (survey?.note) seedEsteiraFromSurvey(wsPath, String(survey.note));

  return newProj;
}

export function resolveEngineSpec(engineName?: string, modelId?: string, effortId?: string) {
  // Sem motor explícito (esteira, trilho, boas-vindas): vale o padrão de Configurações → Motores.
  if (!engineName) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'db', 'engine_settings.json'), 'utf8'));
      engineName = raw.defaultEngine || undefined;
      modelId = modelId || raw.defaultModel || undefined;
      effortId = effortId || raw.defaultEffort || undefined;
    } catch {}
  }
  const chosen = fitCall(engineName, modelId, effortId);
  return {
    id: chosen.motor.id,
    name: chosen.motor.label,
    cli: chosen.motor.cli,
    sdkPath: chosen.motor.sdk,
    model: chosen.model.id,
    modelLabel: chosen.model.label,
    effort: chosen.effort.id,
    effortLabel: chosen.effort.label,
    protocol: chosen.motor.protocol,
    caption: `${chosen.motor.label} · ${chosen.model.label}${chosen.model.id === 'auto-smart' ? '' : ' · ' + chosen.effort.label}`,
  };
}


export type ProjectEngineChoice = { engine: string; model: string; effort: string };

/** Motor escolhido para o projeto no painel (fica em .tavir/control.json). */
export function getProjectEngine(rootPath: string): ProjectEngineChoice | null {
  const raw = readControlJson(rootPath).engine as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object' || !raw.engine) return null;
  return { engine: String(raw.engine), model: String(raw.model || ''), effort: String(raw.effort || '') };
}

export function setProjectEngine(idOrPath: string, choice: Partial<ProjectEngineChoice>): any {
  const rec = resolveProjectRecord(idOrPath);
  const rootPath = rec.local_path || inspectProjectFolder(idOrPath).rootPath;
  if (!rootPath) return { ok: false, error: 'Projeto não encontrado.' };
  const spec = resolveEngineSpec(choice.engine, choice.model, choice.effort);
  const prev = readControlJson(rootPath);
  const engine = { engine: spec.id, model: spec.model, effort: spec.effort };
  writeControlJson(rootPath, { ...prev, engine, updated_at: new Date().toISOString() });
  return { ok: true, engine, caption: spec.caption };
}

/** Esteira, trilho e boas-vindas usam o motor do projeto; sem escolha, o padrão de Configurações. */
export function projectEngineSpec(rootPath: string) {
  const own = rootPath ? getProjectEngine(rootPath) : null;
  return own ? resolveEngineSpec(own.engine, own.model, own.effort) : resolveEngineSpec();
}

export type DecisionEntry = {
  at: string;
  kind: 'esteira' | 'trilho';
  stage: string;
  decision: 'aprovado' | 'reprovado';
  question?: string;
  note?: string;
  by: string;
};

/** Livro de decisões do CEO: uma linha por gate, em .tavir/decisoes.jsonl. */
function logDecision(rootPath: string, entry: Omit<DecisionEntry, 'at' | 'by'>): DecisionEntry {
  const full: DecisionEntry = { at: new Date().toISOString(), by: 'Carlos Henrique', ...entry };
  try {
    fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
    fs.appendFileSync(path.join(rootPath, '.tavir', 'decisoes.jsonl'), JSON.stringify(full) + '\n', 'utf8');
  } catch {}
  return full;
}

export function listProjectDecisions(idOrPath: string): any {
  const info = inspectProjectFolder(idOrPath);
  try {
    const rows = fs
      .readFileSync(path.join(info.rootPath, '.tavir', 'decisoes.jsonl'), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return { ok: true, decisions: rows.reverse() };
  } catch {
    return { ok: true, decisions: [] };
  }
}

/** Commit por passo: só o que a execução mudou, com a etapa e a execução na mensagem. */
function commitRunStep(rootPath: string, title: string, runId: string | undefined, changes: RunChanges | undefined): StepCommitResult {
  const res = commitStep(rootPath, changes, `tavir: ${title}${runId ? `\n\nExecução: .tavir/runs/${runId}` : ''}`);
  if (runId) annotateRun(rootPath, runId, { commit: { sha: res.sha, files: res.files, skipped: res.skipped, error: res.error } });
  return res;
}

function commitLine(res: StepCommitResult): string {
  if (res.sha) return `Commit ${res.sha} · ${res.files} arquivo(s)`;
  if (res.error) return `Commit falhou: ${res.error}`;
  return `Sem commit: ${res.skipped}`;
}

function nowHM(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function controlFilePath(rootPath: string): string {
  return path.join(rootPath, '.tavir', 'control.json');
}

export const ALT_TRACK_STEPS = [
  { id: 'map', label: 'Mapear gaps', owner: 'Íris', skill: 'Varredura e pacote de alinhamento', kind: 'map' },
  { id: 'plan', label: 'Planejar', owner: 'Paula PM', skill: 'Plano da alteração no trilho', kind: 'plan' },
  { id: 'fix', label: 'Ajustar', owner: 'Agentes', skill: 'Aplicar mudanças no workspace', kind: 'work' },
  { id: 'build', label: 'Validar & build', owner: 'QA / Carlos', skill: 'Checklist e build do app', kind: 'build' },
] as const;

export type AltTrackKind = 'map' | 'plan' | 'work' | 'build';

export type AltTrackItem = {
  id: string;
  label: string;
  owner: string;
  skill: string;
  kind: AltTrackKind;
  note: string;
};

export type AltTrackNotes = {
  map: string;
  plan: string;
  fix: string;
  build: string;
};

export type AltTrackCheckpoint = {
  step: number;
  itemId: string;
  label: string;
  at: string;
  reason: string;
  partial: string;
};

export type AltTrackState = {
  active: boolean;
  step: number;
  title: string;
  updated_at?: string;
  notes: AltTrackNotes;
  /** Agentes seguem item a item depois do mapeamento, sem passar pela Íris. */
  auto: boolean;
  runStatus: 'idle' | 'running' | 'waiting' | 'paused' | 'done';
  waitingQuestion: string;
  runLog: string[];
  runError: string;
  runJobId: string;
  checkpoint?: AltTrackCheckpoint | null;
  items: AltTrackItem[];
  cycles?: Array<{ closed_at: string; title: string; items: AltTrackItem[] }>;
};

const EMPTY_NOTES: AltTrackNotes = { map: '', plan: '', fix: '', build: '' };

function noteKey(step: number): keyof AltTrackNotes {
  return (['map', 'plan', 'fix', 'build'] as const)[Math.max(0, Math.min(3, step))] || 'map';
}

function defaultTrackItems(notes?: AltTrackNotes): AltTrackItem[] {
  const src = notes || EMPTY_NOTES;
  return ALT_TRACK_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    owner: step.owner,
    skill: step.skill,
    kind: step.kind,
    note: step.id === 'fix' ? src.fix : src[step.id as keyof AltTrackNotes] || '',
  }));
}

function normalizeItems(raw: unknown, notes: AltTrackNotes): AltTrackItem[] {
  if (!Array.isArray(raw) || raw.length < 2) return defaultTrackItems(notes);
  const items = raw
    .map((entry, index) => {
      const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      const kind: AltTrackKind =
        row.kind === 'map' || row.kind === 'plan' || row.kind === 'work' || row.kind === 'build'
          ? row.kind
          : index === 0
            ? 'map'
            : 'work';
      const id = String(row.id || `${kind}-${index + 1}`);
      const legacy =
        kind === 'map' ? notes.map : kind === 'plan' ? notes.plan : kind === 'build' ? notes.build : id === 'fix' ? notes.fix : '';
      return {
        id,
        label: String(row.label || 'Etapa').slice(0, 80),
        owner: String(row.owner || 'Agentes').slice(0, 40),
        skill: String(row.skill || '').slice(0, 140),
        kind,
        note: String(row.note || legacy || ''),
      };
    })
    .filter((item) => item.label);
  if (!items.some((item) => item.kind === 'map')) return defaultTrackItems(notes);
  if (!items.some((item) => item.kind === 'build')) {
    const build = ALT_TRACK_STEPS[3];
    items.push({ id: build.id, label: build.label, owner: build.owner, skill: build.skill, kind: 'build', note: notes.build });
  }
  return items;
}

function notesFromItems(items: AltTrackItem[]): AltTrackNotes {
  const notes = { ...EMPTY_NOTES };
  for (const item of items) {
    if (item.id === 'map' || item.kind === 'map') notes.map = item.note;
    else if (item.id === 'plan' || item.kind === 'plan') notes.plan = item.note;
    else if (item.id === 'fix') notes.fix = item.note;
    else if (item.id === 'build' || item.kind === 'build') notes.build = item.note;
  }
  return notes;
}

function parseTrilhos(reply: string): Array<{ label: string; owner: string; skill: string }> {
  const match = reply.match(/TRILHOS:\s*([\s\S]*)$/i);
  if (!match) return [];
  return match[1]
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]/.test(line))
    .map((line) => {
      const parts = line.replace(/^[-*]\s*/, '').split(/\s*[|·]\s*/);
      return {
        label: String(parts[0] || '').trim().slice(0, 80),
        owner: String(parts[1] || 'Agentes').trim().slice(0, 40),
        skill: String(parts[2] || 'Executar este trecho do plano').trim().slice(0, 140),
      };
    })
    .filter((item) => item.label)
    .slice(0, 8);
}

function applyProposedTracks(items: AltTrackItem[], reply: string): AltTrackItem[] {
  const proposed = parseTrilhos(reply);
  if (!proposed.length) return items;
  const head = items.filter((item) => item.kind === 'map' || item.kind === 'plan');
  const tail = items.filter((item) => item.kind === 'build');
  const previous = items.filter((item) => item.kind === 'work');
  const work = proposed.map((item, index) => {
    const kept = previous.find((row) => row.label.toLowerCase() === item.label.toLowerCase());
    return {
      id: kept?.id || `work-${index + 1}`,
      label: item.label,
      owner: item.owner,
      skill: item.skill,
      kind: 'work' as const,
      note: kept?.note || '',
    };
  });
  const build = tail[0] || {
    id: 'build',
    label: 'Validar & build',
    owner: 'QA / Carlos',
    skill: 'Checklist e build do app',
    kind: 'build' as const,
    note: '',
  };
  return [...head, ...work, build];
}

function readControlJson(rootPath: string): Record<string, unknown> {
  try {
    const cf = controlFilePath(rootPath);
    if (!fs.existsSync(cf)) return {};
    const parsed = JSON.parse(fs.readFileSync(cf, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeControlJson(rootPath: string, data: Record<string, unknown>): void {
  fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
  fs.writeFileSync(controlFilePath(rootPath), JSON.stringify(data, null, 2), 'utf8');
}

function checkpointFilePath(rootPath: string): string {
  return path.join(rootPath, '.tavir', 'trilho', 'checkpoint.json');
}

function normalizeCheckpoint(raw: unknown): AltTrackCheckpoint | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!row) return null;
  const itemId = String(row.itemId || '').trim();
  const partial = String(row.partial || '');
  const reason = String(row.reason || '').slice(0, 400);
  if (!itemId || (!partial.trim() && !reason.trim())) return null;
  return {
    step: Math.max(0, Number(row.step) || 0),
    itemId,
    label: String(row.label || 'Etapa').slice(0, 80),
    at: String(row.at || ''),
    reason,
    partial,
  };
}

function readCheckpointFile(rootPath: string): AltTrackCheckpoint | null {
  try {
    return normalizeCheckpoint(JSON.parse(fs.readFileSync(checkpointFilePath(rootPath), 'utf8')));
  } catch {
    return null;
  }
}

function writeCheckpointFile(rootPath: string, checkpoint: AltTrackCheckpoint): void {
  const target = checkpointFilePath(rootPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(checkpoint), 'utf8');
}

function proofFilePath(rootPath: string): string {
  return path.join(rootPath, '.tavir', 'provas', 'ultima.md');
}

function readProof(rootPath: string): string {
  try {
    return fs.readFileSync(proofFilePath(rootPath), 'utf8');
  } catch {
    return '';
  }
}

function writeProof(rootPath: string, title: string, request: string, reply: string): void {
  const target = proofFilePath(rootPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const body =
    `# Prova integral · ${title}\n\n` +
    `Arquivo: .tavir/provas/ultima.md\n\n` +
    `## Solicitação\n\n${request}\n\n` +
    `## Resposta\n\n${reply || '(ainda em curso)'}\n`;
  fs.writeFileSync(target, body, 'utf8');
}

function clearCheckpointFile(rootPath: string): void {
  try {
    fs.rmSync(checkpointFilePath(rootPath), { force: true });
  } catch {}
}

function sameCheckpoint(checkpoint: AltTrackCheckpoint | null | undefined, itemId: string): checkpoint is AltTrackCheckpoint {
  return !!checkpoint && checkpoint.itemId === itemId && !!(checkpoint.partial.trim() || checkpoint.reason.trim());
}

type LiveAgent = {
  paused: boolean;
  speech: string;
  kill?: () => void;
  step: number;
  itemId: string;
  label: string;
};

const liveAgents = new Map<string, LiveAgent>();

function normalizeNotes(raw: unknown): AltTrackNotes {
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    map: String(base.map || ''),
    plan: String(base.plan || ''),
    fix: String(base.fix || ''),
    build: String(base.build || ''),
  };
}

function normalizeAltTrack(raw: unknown, alterationsOpen: boolean): AltTrackState {
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const notes = normalizeNotes(base.notes);
  const items = normalizeItems(base.items, notes);
  const step = Math.max(0, Math.min(items.length - 1, Number(base.step) || 0));
  return {
    active: alterationsOpen ? base.active !== false : false,
    step,
    title: String(base.title || 'Trilho de alteração'),
    updated_at: base.updated_at ? String(base.updated_at) : undefined,
    notes: notesFromItems(items),
    auto: Boolean(base.auto),
    runStatus:
      base.runStatus === 'done' && step >= items.length - 1
        ? 'done'
        : base.runStatus === 'waiting' || base.runStatus === 'paused' || base.runStatus === 'running'
          ? base.runStatus
          : 'idle',
    waitingQuestion: String(base.waitingQuestion || ''),
    runLog: Array.isArray(base.runLog) ? base.runLog.map((x) => String(x)) : [],
    runError: String(base.runError || ''),
    runJobId: String(base.runJobId || ''),
    checkpoint: normalizeCheckpoint(base.checkpoint),
    items,
    cycles: Array.isArray(base.cycles)
      ? base.cycles
          .slice(-30)
          .map((entry) => {
            const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
            return {
              closed_at: String(row.closed_at || ''),
              title: String(row.title || 'Manutenção'),
              items: normalizeItems(row.items, EMPTY_NOTES),
            };
          })
      : [],
  };
}

function writeTrackMarkdown(rootPath: string, track: AltTrackState): void {
  const dir = path.join(rootPath, '.tavir', 'trilho');
  fs.mkdirSync(dir, { recursive: true });
  const files: Array<[string, string]> = track.items.map((item, index) => [
    item.note || '_Ainda sem registro._\n',
    `${String(index + 1).padStart(2, '0')}-${item.id}.md`,
  ]);
  for (const [body, name] of files) {
    const title = track.items.find((item) => name.includes(item.id))?.label || name;
    fs.writeFileSync(
      path.join(dir, name),
      `# ${title}\n\n${body}\n`,
      'utf8',
    );
  }
}

function isGreetingOnly(question: string, reply: string): boolean {
  const q = question.trim();
  if (q.length > 24) return false;
  return /^(oi|ol[aá]|ok|beleza|perfeito|valeu|obrigad[oa])[.!?\s]*$/i.test(q) && reply.length < 220;
}

export function recordIrisOnAltTrack(
  idOrPath: string,
  question: string,
  reply: string,
): AltTrackState | null {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open || !ctrl.finished) return ctrl.alt_track;
  if (!question.trim() || !reply.trim() || isGreetingOnly(question, reply)) return ctrl.alt_track;
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  if (track.auto && track.step > 0) return track;
  const key = noteKey(track.step);
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const block =
    `### ${stamp}\n` +
    `**Carlos:** ${question.trim()}\n\n` +
    `**Íris:** ${reply.trim()}\n`;
  const item = track.items[track.step];
  if (item) item.note = (item.note ? item.note + '\n' : '') + block;
  track.items = applyProposedTracks(track.items, reply);
  track.notes = notesFromItems(track.items);
  if (!item) track.notes = { ...track.notes, [key]: (track.notes[key] ? track.notes[key] + '\n' : '') + block };
  track.updated_at = new Date().toISOString();
  track.active = true;
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return track;
}

export function getProjectAlterationsControl(idOrPath: string): {
  ok: boolean;
  rootPath: string;
  projectId: string;
  projectName: string;
  status: string;
  finished: boolean;
  alterations_open: boolean;
  chat_unlocked: boolean;
  alt_track: AltTrackState;
  engine: ProjectEngineChoice | null;
} {
  const rec = resolveProjectRecord(idOrPath);
  const info = inspectProjectFolder(rec.local_path || idOrPath);
  const rootPath = info.rootPath || rec.local_path;
  let status = 'running';
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const row = sqlite
      .prepare('SELECT status, stages_done, total_stages FROM projects WHERE id = ? OR local_path = ? LIMIT 1')
      .get(rec.id, rootPath) as any;
    sqlite.close();
    if (row) status = String(row.status || 'running');
    const done = Number(row?.stages_done) || 0;
    const total = Math.max(1, Number(row?.total_stages) || 9);
    if (!row?.status && done >= total) status = 'done';
  } catch {}

  const parsed = readControlJson(rootPath);
  const alterationsOpen = Boolean(parsed?.alterations_open);
  const altTrack = normalizeAltTrack(parsed?.alt_track, alterationsOpen);
  // "running" gravado sem agente vivo é resto de uma execução que caiu (app fechado no meio).
  if (altTrack.runStatus === 'running' && !liveAgents.has(`${rootPath}:track`)) {
    altTrack.runStatus = altTrack.checkpoint ? 'paused' : 'idle';
  }

  const finished = status === 'done' || status === 'completed';
  // Em esteira ativa o chat com agentes fica liberado; no Handoff exige liberação explícita.
  const chatUnlocked = !finished || alterationsOpen;
  return {
    ok: true,
    rootPath,
    projectId: rec.id,
    projectName: rec.name || info.name || 'Projeto',
    status,
    finished,
    alterations_open: alterationsOpen,
    chat_unlocked: chatUnlocked,
    alt_track: altTrack,
    engine: getProjectEngine(rootPath),
  };
}

export function setProjectAlterationsOpen(idOrPath: string, open: boolean): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  const rootPath = ctrl.rootPath;
  try {
    const prev = readControlJson(rootPath);
    const prevTrack = normalizeAltTrack(prev.alt_track, Boolean(open));
    const payload = {
      ...prev,
      alterations_open: Boolean(open),
      updated_at: new Date().toISOString(),
      note: open
        ? 'Projeto liberado para o trilho de alteração. A esteira original permanece encerrada.'
        : 'Trilho de alteração fechado. Chat consulta status; não aplica mudanças.',
      alt_track: open
        ? {
            ...prevTrack,
            notes: prevTrack.notes || { ...EMPTY_NOTES },
            active: true,
            step: prevTrack.step || 0,
            title: 'Trilho de alteração',
            updated_at: new Date().toISOString(),
          }
        : {
            ...prevTrack,
            notes: prevTrack.notes || { ...EMPTY_NOTES },
            active: false,
            updated_at: new Date().toISOString(),
          },
    };
    writeControlJson(rootPath, payload);
  } catch (err) {
    return {
      ...ctrl,
      ok: false,
      error: String(err),
      alterations_open: Boolean(open),
      chat_unlocked: !ctrl.finished || Boolean(open),
    };
  }

  try {
    const memDir = path.join(rootPath, 'memory', 'projeto');
    fs.mkdirSync(memDir, { recursive: true });
    const memFile = path.join(memDir, 'MEMORY.md');
    const prev = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8') : `# Memória do Projeto · ${ctrl.projectName}\n`;
    const line = `\n- [${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Controle: trilho de alteração ${open ? 'ATIVO' : 'FECHADO'} (esteira original não reabre)\n`;
    fs.writeFileSync(memFile, prev + line, 'utf8');
  } catch {}

  return getProjectAlterationsControl(idOrPath);
}

export function setProjectAltTrackStep(idOrPath: string, step: number): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) {
    return { ...ctrl, ok: false, error: 'Libere o trilho de alteração antes de avançar etapas.' };
  }
  try {
    const prev = readControlJson(ctrl.rootPath);
    const track = normalizeAltTrack(prev.alt_track, true);
    const nextStep = Math.max(0, Math.min(track.items.length - 1, Number(step) || 0));
    writeControlJson(ctrl.rootPath, {
      ...prev,
      alterations_open: true,
      updated_at: new Date().toISOString(),
      alt_track: {
        ...track,
        notes: track.notes || { ...EMPTY_NOTES },
        active: true,
        step: nextStep,
        title: 'Trilho de alteração',
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return { ...ctrl, ok: false, error: String(err) };
  }
  return getProjectAlterationsControl(idOrPath);
}

export function setProjectAltTrackAuto(idOrPath: string, auto: boolean): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) {
    return { ...ctrl, ok: false, error: 'Libere o trilho antes de mudar a execução automática.' };
  }
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  // Desligar o automático não interrompe o item em execução; só impede o próximo de começar sozinho.
  track.auto = Boolean(auto);
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  return getProjectAlterationsControl(idOrPath);
}

export function saveProjectAltTrackNote(idOrPath: string, index: number, text: string): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return { ...ctrl, ok: false, error: 'Libere o trilho antes de editar o pacote.' };
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  const at = Math.max(0, Math.min(track.items.length - 1, Number(index) || 0));
  track.items[at].note = String(text || '');
  if (track.items[at].kind === 'map' || track.items[at].kind === 'plan') {
    track.items = applyProposedTracks(track.items, track.items[at].note);
  }
  track.notes = notesFromItems(track.items);
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return getProjectAlterationsControl(idOrPath);
}

export function clearProjectAltTrackFault(idOrPath: string): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return ctrl;
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  track.runError = '';
  track.runLog = [];
  if (track.runStatus !== 'done') track.runStatus = 'idle';
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  return getProjectAlterationsControl(idOrPath);
}

export function advanceProjectAltTrack(idOrPath: string, fromStep?: number): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return { ...ctrl, ok: false, error: 'Libere o trilho antes de avançar.' };
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  if (typeof fromStep === 'number' && Number.isFinite(fromStep)) {
    track.step = Math.max(0, Math.min(track.items.length - 1, Math.floor(fromStep)));
    if (track.runStatus === 'done' && track.step < track.items.length - 1) track.runStatus = 'idle';
  }
  const current = track.items[track.step];
  if (!String(current?.note || '').trim()) {
    return {
      ...ctrl,
      ok: false,
      error: 'Este item ainda está vazio. Execute o agente ou grave o pacote antes de seguir.',
    };
  }
  track.runError = '';
  track.runLog = [];
  track.waitingQuestion = '';
  track.checkpoint = null;
  clearCheckpointFile(ctrl.rootPath);
  if (track.step >= track.items.length - 1) track.runStatus = 'done';
  else {
    track.step += 1;
    track.runStatus = 'idle';
  }
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return getProjectAlterationsControl(idOrPath);
}

function archiveTrackFiles(rootPath: string, track: AltTrackState): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(rootPath, '.tavir', 'trilho', 'ciclos', stamp);
  fs.mkdirSync(dir, { recursive: true });
  track.items.forEach((item, index) => {
    const name = `${String(index + 1).padStart(2, '0')}-${item.id}.md`;
    fs.writeFileSync(path.join(dir, name), `# ${item.label}\n\n${item.owner}\n\n${item.note || '_Sem registro._'}\n`, 'utf8');
  });
}

export function closeProjectAltTrackItem(idOrPath: string, fromStep?: number): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return { ...ctrl, ok: false, error: 'Libere o trilho antes de encerrar o item.' };
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  if (typeof fromStep === 'number' && Number.isFinite(fromStep)) {
    track.step = Math.max(0, Math.min(track.items.length - 1, Math.floor(fromStep)));
  }
  const current = track.items[track.step];
  if (!current) return { ...ctrl, ok: false, error: 'Não há item neste foco.' };
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const manual = `### ${stamp} · encerrado manualmente\nCarlos encerrou este item. O gap fica registrado como fechado neste ciclo.\n`;
  current.note = current.note.trim() ? `${current.note.trim()}\n\n${manual}` : manual;
  track.notes = notesFromItems(track.items);
  track.runError = '';
  track.runLog = [];
  track.waitingQuestion = '';
  track.checkpoint = null;
  clearCheckpointFile(ctrl.rootPath);
  const last = track.step >= track.items.length - 1;
  if (last) track.runStatus = 'done';
  else {
    track.step += 1;
    track.runStatus = 'idle';
  }
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return getProjectAlterationsControl(idOrPath);
}

export function startNewAltTrackCycle(idOrPath: string): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return { ...ctrl, ok: false, error: 'Libere o trilho antes de abrir outro mapeamento.' };
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  try {
    archiveTrackFiles(ctrl.rootPath, track);
  } catch {}
  const archived = {
    closed_at: new Date().toISOString(),
    title: track.title || 'Manutenção',
    items: track.items,
  };
  const fresh = defaultTrackItems(EMPTY_NOTES);
  track.items = fresh;
  track.notes = notesFromItems(fresh);
  track.step = 0;
  track.runStatus = 'idle';
  track.runError = '';
  track.runLog = [];
  track.waitingQuestion = '';
  track.checkpoint = null;
  clearCheckpointFile(ctrl.rootPath);
  track.cycles = [...(track.cycles || []), archived].slice(-30);
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return getProjectAlterationsControl(idOrPath);
}

export function approveAltTrackGate(idOrPath: string, decision: 'aprovado' | 'reprovado' = 'aprovado', note = ''): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.alterations_open) return { ...ctrl, ok: false, error: 'Trilho fechado.' };
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  if (!track.waitingQuestion) return getProjectAlterationsControl(idOrPath);
  const item = track.items[track.step];
  const verdict = decision === 'reprovado' ? 'reprovado' : 'aprovado';
  const entry = logDecision(ctrl.rootPath, {
    kind: 'trilho',
    stage: item?.label || 'Trilho',
    decision: verdict,
    question: track.waitingQuestion,
    note: String(note || '').trim() || undefined,
  });
  // A decisão entra no próprio item: a próxima execução dele lê e segue a partir dela.
  if (item) {
    const block =
      `### ${entry.at.slice(0, 16).replace('T', ' ')} · Decisão do Carlos: ${verdict}\n` +
      `Pergunta: ${track.waitingQuestion}\n` +
      (entry.note ? `Orientação: ${entry.note}\n` : '');
    item.note = (item.note ? item.note.trim() + '\n\n' : '') + block;
  }
  track.notes = notesFromItems(track.items);
  track.waitingQuestion = '';
  track.runStatus = 'idle';
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, track);
  } catch {}
  return { ...getProjectAlterationsControl(idOrPath), decision: entry };
}

/** O agente só pede decisão quando a resposta começa com o marcador (aceita negrito/título antes). */
export const APPROVAL_RE = /^[\s>*_#`]*AGUARDANDO APROVA[ÇC][ÃA]O\s*:/i;

export async function executeAltTrackStep(
  idOrPath: string,
  hooks?: {
    onStart?: (info: {
      projectName: string;
      projectPath: string;
      focus: string;
      owner: string;
      motor: string;
      model: string;
    }) => void;
    onLine?: (text: string, level: 'info' | 'error') => void;
    onEnd?: (info: { ok: boolean; status: 'completed' | 'failed' | 'waiting' | 'paused'; text: string }) => void;
  },
  stepOverride?: number,
): Promise<any> {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.ok || !ctrl.alterations_open) {
    return { ...ctrl, ok: false, error: 'Libere o trilho de alteração.' };
  }
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  if (typeof stepOverride === 'number' && Number.isFinite(stepOverride)) {
    const requested = Math.max(0, Math.min(track.items.length - 1, Math.floor(stepOverride)));
    if (requested !== track.step) track.waitingQuestion = '';
    track.step = requested;
    track.runError = '';
    if (track.runStatus !== 'waiting') track.runStatus = 'idle';
  }
  if (liveAgents.has(`${ctrl.rootPath}:track`)) {
    return { ...ctrl, ok: false, error: 'Já há um agente executando este trilho. Pause antes de rodar outro item.' };
  }
  if (track.step <= 0) {
    return { ...ctrl, ok: false, error: 'O mapeamento fica com a Íris. Avance quando o pacote estiver fechado.' };
  }
  if (!String(track.notes.map || '').trim()) {
    return { ...ctrl, ok: false, error: 'Mapear gaps ainda está vazio. Feche o pacote com a Íris antes.' };
  }
  if (track.waitingQuestion) {
    return { ...getProjectAlterationsControl(idOrPath), ok: true, needsApproval: true, continued: false };
  }
  if (track.runStatus === 'done' && track.step >= track.items.length - 1 && track.items[track.step]?.note.trim()) {
    return { ...getProjectAlterationsControl(idOrPath), ok: true, needsApproval: false, continued: false };
  }

  const focus = track.items[track.step] || track.items[track.items.length - 1];
  const asChange = focus.kind === 'work' || focus.kind === 'build';
  const mapItem = track.items.find((item) => item.kind === 'map');
  const mapText = String(mapItem?.note || track.notes.map || '').trim();
  const earlier = track.items
    .filter((item) => item.note.trim() && item.id !== focus.id && item.kind !== 'map')
    .map((item) => `${item.label} (${item.owner}):\n${item.note.slice(0, 2500)}`)
    .join('\n\n');
  const ownNote = String(focus.note || '').trim();
  const storedCheckpoint = readCheckpointFile(ctrl.rootPath) || track.checkpoint || null;
  const resume = sameCheckpoint(storedCheckpoint, focus.id) ? storedCheckpoint : null;
  const role =
    focus.kind === 'plan'
      ? 'Você é a Paula PM, e só você conduz este planejamento. A única fonte é o mapeamento de gaps da Íris, colado abaixo. Transforme cada gap em trabalho: tarefa, agente responsável e pronto quando. Não invente gap que não esteja nesse mapeamento e não deixe gap sem dono. Não edite código. Feche a resposta com o bloco TRILHOS:, um trilho de trabalho por linha, no formato "- Título | Nome do agente | entrega". Cada linha nasce de um gap. Sem esse bloco o ajuste não começa. Mantenha o validar por último.'
      : focus.kind === 'work'
        ? `Você é ${focus.owner}. A Paula PM designou você para este trecho a partir dos gaps da Íris. Execute só o que está no seu trilho e no plano dela, no workspace. A esteira original não reabre.`
        : 'Você é o QA do trilho. Os gaps e o plano estão abaixo. Valide o que foi pedido ali e, se for app mobile, rode o build do APK. Resuma o artefato gerado.';
  const previousProof = readProof(ctrl.rootPath);
  if (previousProof.trim()) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(proofFilePath(ctrl.rootPath), path.join(path.dirname(proofFilePath(ctrl.rootPath)), `${stamp}.md`));
    } catch {}
  }
  const resumeBlock = resume
    ? 'CHECKPOINT — esta etapa já começou e a comunicação caiu no meio. Não recomece do zero. Não refaça o que o texto abaixo diz que já foi feito e não desfaça arquivo que o workspace já mostra alterado. Continue exatamente deste ponto. Se o bloco TRILHOS já tinha linhas, complete as que faltam em vez de inventar outra lista.\n' +
      `Parou em: ${resume.at || 'tentativa anterior'}\n` +
      (resume.reason ? `Motivo: ${resume.reason}\n` : '') +
      (resume.partial.trim()
        ? `O que já estava feito quando parou:\n${resume.partial.trim()}\n\n`
        : 'A tentativa anterior caiu antes de registrar texto. Confira o workspace e siga o item a partir do que já existir nele.\n\n')
    : '';
  const pedido =
    `${role}\n` +
    `Foco: ${focus.label} (${focus.owner}). ${focus.skill}\n` +
    'Se faltar uma decisão do Carlos, comece a resposta exatamente com "AGUARDANDO APROVAÇÃO:" e uma pergunta. Não invente a decisão.\n' +
    'Se puder seguir, entregue o resultado do item sem pedir a Íris de novo.\n\n' +
    resumeBlock +
    (mapText ? `MAPEAMENTO DE GAPS (Íris) — fonte de todas as etapas seguintes:\n${mapText}\n\n` : '') +
    (earlier ? `O QUE AS ETAPAS ANTERIORES JÁ ENTREGARAM:\n${earlier}\n\n` : '') +
    (ownNote ? `O QUE JÁ ESTÁ REGISTRADO NESTE ITEM (inclui as decisões do Carlos — siga-as):\n${ownNote.slice(-4000)}\n` : '');
  const question = previousProof
    ? `PROVA INTEGRAL DA EXECUÇÃO ANTERIOR — leia do começo ao fim. O mesmo texto está em .tavir/provas/ e a última ficou em ultima.md antes desta etapa:\n${previousProof}\n\n${pedido}`
    : pedido;

  track.runStatus = 'running';
  track.runError = '';
  track.runLog = [resume ? `Retomando ${focus.label} do checkpoint · ${focus.owner}` : `Iniciando ${focus.label} · ${focus.owner}`];
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, { ...prev, alterations_open: true, alt_track: track, updated_at: track.updated_at });

  const { converseWithIrisAgent } = require('./irisAgent') as typeof import('./irisAgent');
  const eng = projectEngineSpec(ctrl.rootPath);
  const log: string[] = track.runLog.slice();
  let latestSpeech = resume?.partial || '';
  let lastCheckpointAt = 0;
  const saveCheckpoint = (reason: string, force: boolean) => {
    const partial = latestSpeech.trim() || resume?.partial || '';
    if (!force && partial.length < 40) return;
    const now = Date.now();
    if (!force && now - lastCheckpointAt < 12000) return;
    lastCheckpointAt = now;
    const checkpoint: AltTrackCheckpoint = {
      step: track.step,
      itemId: focus.id,
      label: focus.label,
      at: new Date().toISOString(),
      reason: reason.slice(0, 400),
      partial,
    };
    try {
      writeCheckpointFile(ctrl.rootPath, checkpoint);
    } catch {}
    return checkpoint;
  };
  const pushLine = (text: string, level: 'info' | 'error' = 'info') => {
    const line = String(text || '').trim();
    if (!line) return;
    const prevLine = log[log.length - 1] || '';
    const grows = prevLine && line.startsWith(prevLine.slice(0, Math.min(prevLine.length, 80))) && line.length >= prevLine.length;
    if (grows) log[log.length - 1] = line;
    else log.push(line);
    if (line.length > 80 && !/^(Iniciando|Retomando) /.test(line)) {
      if (line.length >= latestSpeech.length || line.startsWith(latestSpeech.slice(0, 48))) latestSpeech = line;
      const live = liveAgents.get(`${ctrl.rootPath}:track`);
      if (live) live.speech = latestSpeech;
      try { writeProof(ctrl.rootPath, focus.label, pedido, latestSpeech); } catch {}
      saveCheckpoint('', false);
    }
    hooks?.onLine?.(line, level);
  };
  try { writeProof(ctrl.rootPath, focus.label, pedido, latestSpeech); } catch {}
  hooks?.onStart?.({
    projectName: ctrl.projectName,
    projectPath: ctrl.rootPath,
    focus: focus.label,
    owner: focus.owner,
    motor: eng.name,
    model: eng.model,
  });
  const liveKey = `${ctrl.rootPath}:track`;
  liveAgents.set(liveKey, { paused: false, speech: latestSpeech, step: track.step, itemId: focus.id, label: focus.label });
  const agentRes = await converseWithIrisAgent({
    workspace: ctrl.rootPath,
    question,
    projectName: ctrl.projectName,
    stageName: focus.label,
    stageOwner: focus.owner,
    engineId: eng.id,
    model: eng.model,
    effort: eng.effort,
    finished: true,
    alterationsOpen: true,
    asChangeRequest: asChange,
    recent: [],
    timeoutMs: 1800000,
    runKind: 'trilho',
    runLabel: focus.label,
    onProgress: (line) => pushLine(line, 'info'),
    registerKill: (kill) => {
      const live = liveAgents.get(liveKey);
      if (live) live.kill = kill;
    },
  });
  const reply = String(agentRes.text || '').trim() || 'O agente não devolveu texto neste item.';
  try { writeProof(ctrl.rootPath, focus.label, pedido, reply); } catch {}
  if (agentRes.ok) pushLine(reply.slice(0, 240), 'info');
  else log.push(reply.slice(0, 240));
  const needsApproval = agentRes.ok && APPROVAL_RE.test(reply);
  let commitNote = '';
  if (agentRes.ok && !needsApproval && asChange) {
    const res = commitRunStep(ctrl.rootPath, `trilho · ${focus.label} (${focus.owner})`, agentRes.runId, agentRes.changes);
    commitNote = commitLine(res);
    log.push(commitNote);
  }
  const fresh = readControlJson(ctrl.rootPath);
  const next = normalizeAltTrack(fresh.alt_track, true);
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const current = next.items[next.step] || focus;
  const exec = agentRes.runId ? ` · execução ${agentRes.runId}` : '';
  if (agentRes.runId) log.push(`Execução registrada em .tavir/runs/${agentRes.runId}`);
  if (agentRes.ok) current.note = (current.note ? current.note + '\n' : '') + `### ${stamp} · ${focus.owner}${exec}\n${reply}\n${commitNote ? `\n_${commitNote}_\n` : ''}`;
  if (agentRes.ok && (focus.kind === 'plan' || focus.kind === 'map')) next.items = applyProposedTracks(next.items, reply);
  next.notes = notesFromItems(next.items);
  next.waitingQuestion = needsApproval ? reply.replace(APPROVAL_RE, '').trim() : '';
  const pausedByUser = agentRes.error === 'paused' || !!liveAgents.get(liveKey)?.paused;
  liveAgents.delete(liveKey);
  next.runLog = log;
  next.runError = agentRes.ok || pausedByUser ? '' : reply.slice(0, 400);
  let continued = false;
  if (pausedByUser) {
    next.runStatus = 'paused';
    next.checkpoint = readCheckpointFile(ctrl.rootPath) || saveCheckpoint('Pausado por Carlos. A retomada continua deste ponto.', true) || resume;
  } else if (!agentRes.ok) {
    next.runStatus = 'idle';
    next.checkpoint = saveCheckpoint(reply.slice(0, 400), true) || resume;
  } else if (needsApproval) {
    next.runStatus = 'waiting';
    next.checkpoint = null;
    clearCheckpointFile(ctrl.rootPath);
  } else if (next.step >= next.items.length - 1) {
    next.runStatus = 'done';
    next.checkpoint = null;
    clearCheckpointFile(ctrl.rootPath);
  } else if (!next.auto) {
    // Manual: o item fica entregue no foco e só avança no "Seguir para…" do Carlos.
    next.runStatus = 'idle';
    next.checkpoint = null;
    clearCheckpointFile(ctrl.rootPath);
  } else {
    next.step += 1;
    next.runStatus = 'idle';
    next.checkpoint = null;
    clearCheckpointFile(ctrl.rootPath);
    continued = true;
  }
  next.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...fresh,
    alterations_open: true,
    updated_at: next.updated_at,
    alt_track: next,
  });
  try {
    writeTrackMarkdown(ctrl.rootPath, next);
  } catch {}
  hooks?.onEnd?.({
    ok: Boolean(agentRes.ok),
    status: pausedByUser ? 'paused' : !agentRes.ok ? 'failed' : needsApproval ? 'waiting' : 'completed',
    text: pausedByUser ? 'Pausado. O checkpoint guarda o ponto desta etapa.' : reply,
  });
  return {
    ...getProjectAlterationsControl(idOrPath),
    ok: Boolean(agentRes.ok),
    paused: pausedByUser,
    needsApproval,
    continued,
    reply,
  };
}

export function pauseProjectAltTrack(idOrPath: string): any {
  const ctrl = getProjectAlterationsControl(idOrPath);
  if (!ctrl.ok || !ctrl.rootPath) return { ...ctrl, ok: false, error: 'Projeto não encontrado.' };
  const live = liveAgents.get(`${ctrl.rootPath}:track`);
  const prev = readControlJson(ctrl.rootPath);
  const track = normalizeAltTrack(prev.alt_track, true);
  const focus = track.items[track.step];
  const partial = String(live?.speech || track.checkpoint?.partial || '').slice(-6000);
  const checkpoint: AltTrackCheckpoint = {
    step: track.step,
    itemId: focus?.id || live?.itemId || 'etapa',
    label: focus?.label || live?.label || 'Etapa',
    at: new Date().toISOString(),
    reason: 'Pausado por Carlos. A retomada continua deste ponto.',
    partial,
  };
  try {
    writeCheckpointFile(ctrl.rootPath, checkpoint);
  } catch {}
  track.checkpoint = checkpoint;
  track.runStatus = 'paused';
  track.runError = '';
  track.updated_at = new Date().toISOString();
  writeControlJson(ctrl.rootPath, {
    ...prev,
    alterations_open: true,
    updated_at: track.updated_at,
    alt_track: track,
  });
  if (live) {
    live.paused = true;
    live.speech = partial;
    try {
      live.kill?.();
    } catch {}
  }
  return getProjectAlterationsControl(idOrPath);
}

export function getProjectChatHistory(idOrPath: string): any {
  const info = inspectProjectFolder(idOrPath);
  const rootPath = info.rootPath;
  const chatFile = path.join(rootPath, '.tavir', 'iris-chat.json');
  try {
    if (fs.existsSync(chatFile)) {
      const parsed = JSON.parse(fs.readFileSync(chatFile, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { ok: true, rootPath, messages: parsed };
      }
    }
  } catch {}

  const welcomeEng = projectEngineSpec(rootPath);
  const welcomeMsg = {
    id: 'iris-welcome-' + Date.now(),
    who: `Íris · ${welcomeEng.name}`,
    role: 'ag',
    engine: welcomeEng.name,
    model: welcomeEng.model,
    ts: nowHM(),
    thoughts: [`[Workspace] ${rootPath}`, `[Estrutura] ${info.dirCount} pastas e ${info.fileCount} arquivos (${info.stacks})`],
    t: `Olá, Carlos! Sou a Íris do projeto "${info.name}". Posso ler o código e os documentos para responder, e fazer mudanças quando você enviar um «Pedir alteração». O motor fica no seletor do chat.`,
  };

  try {
    fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
    fs.writeFileSync(chatFile, JSON.stringify([welcomeMsg], null, 2), 'utf8');
  } catch {}

  return { ok: true, rootPath, messages: [welcomeMsg] };
}

export async function askProjectIris(params: any): Promise<any> {
  const idOrPath = String(params?.projectId || params?.projectPath || params?.projectName || 'projeto').trim();
  const question = String(params?.question || params?.message || '').trim();
  const eng = params?.engine
    ? resolveEngineSpec(params.engine, params.model, params.effort)
    : projectEngineSpec(resolveProjectRecord(idOrPath).local_path);
  const stageName = String(params?.stageName || 'Arquitetura & Construção').trim();
  const stageOwner = String(params?.stageOwner || 'Paula PM').trim();
  const persona = String(params?.persona || 'Íris · Inteligência do Projeto').trim();
  const forceChange = Boolean(params?.asChangeRequest || params?.pedirAlteracao);

  const control = getProjectAlterationsControl(idOrPath);
  const info = inspectProjectFolder(idOrPath);
  const rootPath = info.rootPath || control.rootPath;
  const qLower = question.toLowerCase();

  let memoryText = '';
  try {
    const memPath = path.join(rootPath, 'memory', 'projeto', 'MEMORY.md');
    if (fs.existsSync(memPath)) memoryText = fs.readFileSync(memPath, 'utf8').slice(-3000);
  } catch {}

  const absorbMemory = (line: string) => {
    try {
      const memDir = path.join(rootPath, 'memory', 'projeto');
      fs.mkdirSync(memDir, { recursive: true });
      const memFile = path.join(memDir, 'MEMORY.md');
      const prevMem = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8') : `# Memória do Projeto · ${info.name}\n`;
      fs.writeFileSync(memFile, prevMem + `\n- [${new Date().toISOString().slice(0, 16).replace('T', ' ')}] ${line}\n`, 'utf8');
    } catch {}
  };

  const absorbChangeRequest = (text: string) => {
    try {
      const memDir = path.join(rootPath, 'memory', 'projeto');
      fs.mkdirSync(memDir, { recursive: true });
      const reqFile = path.join(memDir, 'CHANGE_REQUESTS.md');
      const prev = fs.existsSync(reqFile)
        ? fs.readFileSync(reqFile, 'utf8')
        : `# Pedidos de alteração · ${info.name}\n\nA esteira permanece encerrada. Cada pedido abaixo é absorvido pelos agentes com o motor ativo.\n`;
      const block =
        `\n## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${eng.caption}\n` +
        `- Etapa de referência: ${stageName} (${stageOwner})\n` +
        `- Pedido: ${text}\n`;
      fs.writeFileSync(reqFile, prev + block, 'utf8');
    } catch {}
  };

  const chatFile = path.join(rootPath, '.tavir', 'iris-chat.json');
  let history: any[] = [];
  try {
    if (fs.existsSync(chatFile)) {
      history = JSON.parse(fs.readFileSync(chatFile, 'utf8')) || [];
    }
  } catch {}
  if (!Array.isArray(history) || !history.length) {
    history = getProjectChatHistory(idOrPath).messages || [];
  }

  const recent = history
    .filter((m) => m && (m.role === 'me' || m.role === 'ag' || m.cls === 'me' || m.cls === 'ag'))
    .filter((m) => !String(m.id || '').startsWith('iris-welcome'))
    .slice(-14)
    .map((m) => ({
      role: (m.role === 'me' || m.cls === 'me' ? 'user' : 'assistant') as 'user' | 'assistant',
      text: String(m.t || m.text || ''),
    }))
    .filter((m) => m.text.trim());

  const thoughts: string[] = [
    `[${eng.caption}] Modo conversação no workspace do projeto`,
    `[Workspace] ${info.name} · ${rootPath}`,
    `[Controle] ${control.finished ? (control.alterations_open ? 'Handoff · liberado' : 'Handoff · fechado') : 'Esteira ativa'}`,
    `[Etapa] ${stageName} · ${stageOwner}`,
  ];

  let reply = '';
  let runId = '';
  let agentOk = false;
  const wantsChange =
    forceChange ||
    /\b(alter|muda|ajuste|corrija|corri|implement|adicione|remova|refator)\w*/i.test(question);

  // Projeto fechado: a conversa segue em modo leitura; só o pedido de alteração depende de liberar.
  if (forceChange && !control.chat_unlocked) {
    reply =
      `O projeto **${info.name}** está **fechado para alterações**.\n` +
      `Use **Liberar alterações** e envie o pedido de novo. Enquanto isso, posso responder perguntas sobre o projeto.`;
    thoughts.push('[Local] Pedido de alteração com o projeto fechado');
  } else {
    const { converseWithIrisAgent } = require('./irisAgent') as typeof import('./irisAgent');
    const track = control.alt_track;
    const projectFacts = [
      info.stacks ? `Stack detectada: ${info.stacks}` : '',
      info.fileCount ? `Tamanho: ${info.fileCount} arquivos em ${info.dirCount} pastas` : '',
      control.finished && control.alterations_open && track?.items?.length
        ? `Trilho de alteração: passo ${Number(track.step) + 1} de ${track.items.length} (${track.items[track.step]?.label || stageName})`
        : '',
      'Documentos do projeto costumam ficar em context/ (levantamento, dossiê), specs/, memory/projeto/ e qa/.',
    ].filter(Boolean);
    const agentRes = await converseWithIrisAgent({
      workspace: rootPath,
      question,
      projectName: info.name || control.projectName,
      stageName,
      stageOwner,
      engineId: eng.id,
      model: eng.model,
      effort: eng.effort,
      finished: control.finished,
      alterationsOpen: control.chat_unlocked,
      asChangeRequest: Boolean(forceChange),
      recent,
      memorySnippet: memoryText,
      projectFacts,
      timeoutMs: forceChange ? 900000 : 300000,
      onProgress: typeof params?.onProgress === 'function' ? params.onProgress : undefined,
      registerKill: typeof params?.registerKill === 'function' ? params.registerKill : undefined,
      runKind: 'chat',
      runLabel: forceChange ? 'Pedido de alteração' : 'Chat com a Íris',
    });
    runId = agentRes.runId || '';
    agentOk = agentRes.ok;
    thoughts.push(...(agentRes.thoughts || []));
    reply = String(agentRes.text || '').trim();
    if (!reply) {
      reply = 'Não consegui obter resposta do agente neste turno. Tente de novo em instantes.';
    }
    if (agentRes.ok) absorbMemory(`(${eng.name} · chat) "${question.slice(0, 160)}" → ${reply.replace(/\s+/g, ' ').slice(0, 240)}`);
    if (forceChange) {
      absorbChangeRequest(question);
      thoughts.push('[Absorção] CHANGE_REQUESTS.md atualizado (pedido de alteração)');
    }
    if (agentOk && control.finished && control.alterations_open) {
      const tracked = recordIrisOnAltTrack(idOrPath, question, reply);
      if (tracked) {
        thoughts.push(
          `[Trilho] Registro no foco ${ALT_TRACK_STEPS[tracked.step]?.label || 'Mapear gaps'}`,
        );
      }
    }
  }

  // Evita eco de dumps de estrutura gerados por heurística antiga em turnos futuros
  if (/Caminho no disco|Stacks detectadas|Arquivos mapeados \(\d+\)/i.test(reply) && !/estrutura|pasta|arquiv|stack/i.test(qLower)) {
    thoughts.push('[Aviso] Resposta parecia inventário; pedindo rephrase conversacional falhou — mantida resposta do agente');
  }

  const userMsg = {
    id: 'msg-u-' + Date.now(),
    who: 'Carlos',
    role: 'me',
    engine: eng.name,
    ts: nowHM(),
    thoughts: [],
    t: question,
  };

  const agentMsg = {
    id: 'msg-a-' + (Date.now() + 1),
    who: `${persona} · ${eng.name}`,
    role: 'ag',
    engine: eng.name,
    model: eng.model,
    ts: nowHM(),
    at: new Date().toISOString(),
    ok: agentOk,
    thoughts,
    t: reply,
    ...(runId ? { runId } : {}),
  };

  history.push(userMsg, agentMsg);
  if (history.length > 60) history = history.slice(-60);

  try {
    fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
    fs.writeFileSync(chatFile, JSON.stringify(history, null, 2), 'utf8');
  } catch {}

  return {
    ok: true,
    rootPath,
    engine: eng.name,
    model: eng.model,
    alterations_open: control.alterations_open,
    chat_unlocked: control.chat_unlocked,
    finished: control.finished,
    alt_track: getProjectAlterationsControl(idOrPath).alt_track,
    conversational: control.chat_unlocked,
    userMessage: userMsg,
    replyMessage: agentMsg,
    messages: history,
  };
}

type EsteiraStatus = 'idle' | 'running' | 'paused' | 'done' | 'stopped' | 'awaiting';
type EsteiraStageRecord = {
  instruction: string;
  note: string;
  status: EsteiraStatus;
  files: string[];
  runs?: string[];
  /** Commits que a Fábrica fez com o que esta etapa mudou. */
  commits?: string[];
  /** Última decisão do Carlos neste gate. */
  decision?: DecisionEntry | null;
};
type EsteiraDesk = { auto: boolean; template: string; stages: EsteiraStageRecord[] };

const ESTEIRA_STATUS: EsteiraStatus[] = ['idle', 'running', 'paused', 'done', 'stopped', 'awaiting'];

function emptyEsteiraStage(): EsteiraStageRecord {
  return { instruction: '', note: '', status: 'idle', files: [] };
}

function esteiraFile(rootPath: string): string {
  return path.join(rootPath, '.tavir', 'esteira.json');
}

function stageArtifactFiles(rootPath: string, index: number, label: string): string[] {
  const dir = path.join(rootPath, 'artifacts');
  if (!fs.existsSync(dir)) return [];
  const slug = String(index + 1).padStart(2, '0');
  const hint = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 16);
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.includes(slug) || (hint.length > 4 && name.toLowerCase().includes(hint.replace(/\s+/g, '-'))))
      .slice(0, 12)
      .map((name) => `artifacts/${name}`);
  } catch {
    return [];
  }
}

/** Etapas do projeto vêm do molde (src/shared/esteiras.ts), pelo template_code gravado no banco. */
function projectStages(rootPath: string): { code: string; stages: EsteiraStage[] } {
  const rec = resolveProjectRecord(rootPath);
  const tpl = esteiraTemplate(rec.template_code);
  return { code: tpl.code, stages: tpl.stages };
}

/** stages_done gravado antes de existir o livro da esteira. */
function legacyStagesDone(rootPath: string): number {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const rec = resolveProjectRecord(rootPath);
    const row = sqlite.prepare('SELECT stages_done FROM projects WHERE id = ?').get(rec.id) as { stages_done?: number } | undefined;
    sqlite.close();
    return Math.max(0, Number(row?.stages_done) || 0);
  } catch {
    return 0;
  }
}

function readEsteira(rootPath: string): EsteiraDesk {
  let raw: any = {};
  let fresh = false;
  try {
    raw = JSON.parse(fs.readFileSync(esteiraFile(rootPath), 'utf8'));
  } catch {
    fresh = true;
  }
  const { code, stages: defs } = projectStages(rootPath);
  let saved = Array.isArray(raw.stages) ? raw.stages : [];
  if (fresh) {
    // Projeto de antes do livro: preserva o progresso do banco e deixa claro que não há execução registrada.
    const done = Math.min(defs.length, legacyStagesDone(rootPath));
    saved = defs.map((_d, i) => (i < done ? { status: 'done', note: 'Marcada como concluída no registro anterior da Fábrica, sem execução registrada no livro.' } : {}));
  }
  const live = liveAgents.get(`${rootPath}:esteira`);
  const stages: EsteiraStageRecord[] = defs.map((_def, i) => {
    const row = saved[i] && typeof saved[i] === 'object' ? saved[i] : {};
    let status: EsteiraStatus = ESTEIRA_STATUS.includes(row.status) ? row.status : 'idle';
    // "running" sem agente vivo é resto de execução que caiu.
    if (status === 'running' && !(live && live.step === i)) status = String(row.note || '').trim() ? 'paused' : 'idle';
    return {
      instruction: String(row.instruction || ''),
      note: String(row.note || ''),
      status,
      files: Array.isArray(row.files) ? row.files.map((x: unknown) => String(x)).slice(0, 12) : [],
      runs: Array.isArray(row.runs) ? row.runs.map((x: unknown) => String(x)).slice(-30) : [],
      commits: Array.isArray(row.commits) ? row.commits.map((x: unknown) => String(x)).slice(-30) : [],
      decision: row.decision && typeof row.decision === 'object' ? (row.decision as DecisionEntry) : null,
    };
  });
  return { auto: Boolean(raw.auto), template: code, stages };
}

function writeEsteira(rootPath: string, desk: EsteiraDesk): void {
  fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
  fs.writeFileSync(esteiraFile(rootPath), JSON.stringify(desk, null, 2), 'utf8');
  syncEsteiraProgress(rootPath, desk);
}

/**
 * O banco (stages_done / total_stages / status) espelha a esteira: conta as etapas
 * concluídas em sequência desde a primeira. Projeto só vira "done" com todas fechadas.
 */
function syncEsteiraProgress(rootPath: string, desk: EsteiraDesk): void {
  const total = desk.stages.length;
  let done = 0;
  while (done < total && desk.stages[done].status === 'done') done += 1;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const rec = resolveProjectRecord(rootPath);
    const row = sqlite.prepare('SELECT status FROM projects WHERE id = ?').get(rec.id) as { status?: string } | undefined;
    if (row) {
      const prev = String(row.status || 'running');
      const status = done >= total ? 'done' : prev === 'done' || prev === 'completed' ? 'running' : prev;
      sqlite
        .prepare('UPDATE projects SET stages_done = ?, total_stages = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(done, total, status, new Date().toISOString(), rec.id);
    }
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Falha ao gravar progresso da esteira:', err);
  }
}

function esteiraPayload(rootPath: string, desk: EsteiraDesk) {
  const { code, stages } = projectStages(rootPath);
  desk.stages = desk.stages.map((stage, index) => ({
    ...stage,
    files: stage.files.length ? stage.files : stageArtifactFiles(rootPath, index, ''),
  }));
  return { ok: true, rootPath, esteira: desk, template: { code, stages } };
}

export function getProjectEsteira(idOrPath: string, _count?: number): any {
  const info = inspectProjectFolder(idOrPath);
  return esteiraPayload(info.rootPath, readEsteira(info.rootPath));
}

function clampStage(desk: EsteiraDesk, index: number): number {
  return Math.max(0, Math.min(desk.stages.length - 1, Number(index) || 0));
}

export function saveEsteiraInstruction(idOrPath: string, index: number, text: string): any {
  const info = inspectProjectFolder(idOrPath);
  const desk = readEsteira(info.rootPath);
  desk.stages[clampStage(desk, index)].instruction = String(text || '');
  writeEsteira(info.rootPath, desk);
  return esteiraPayload(info.rootPath, desk);
}

export function setEsteiraAuto(idOrPath: string, auto: boolean): any {
  const info = inspectProjectFolder(idOrPath);
  const desk = readEsteira(info.rootPath);
  desk.auto = Boolean(auto);
  writeEsteira(info.rootPath, desk);
  return esteiraPayload(info.rootPath, desk);
}

export function controlEsteiraStage(idOrPath: string, index: number, action: string): any {
  const info = inspectProjectFolder(idOrPath);
  const desk = readEsteira(info.rootPath);
  const at = clampStage(desk, index);
  const stage = desk.stages[at];
  const live = liveAgents.get(`${info.rootPath}:esteira`);
  const killLive = () => {
    if (live && live.step === at) {
      live.paused = true;
      try { live.kill?.(); } catch {}
    }
  };
  if (action === 'pause') {
    stage.status = 'paused';
    if (live && live.step === at && live.speech.trim()) stage.note = (stage.note ? stage.note + '\n' : '') + live.speech.trim();
    killLive();
  } else if (action === 'stop') {
    stage.status = 'stopped';
    killLive();
  } else if (action === 'restart') {
    stage.status = 'idle';
    stage.note = '';
    stage.decision = null;
    killLive();
  } else if (action === 'review') {
    const line = 'Revisar o levantamento desta etapa e corrigir só o que estiver inconsistente com a pasta.';
    stage.instruction = stage.instruction.includes(line) ? stage.instruction : `${stage.instruction}\n${line}`.trim();
    stage.status = 'idle';
  }
  writeEsteira(info.rootPath, desk);
  return esteiraPayload(info.rootPath, desk);
}

/** Decisão do Carlos num gate da esteira: aprova (fecha a etapa) ou reprova (volta com a orientação). */
export function decideEsteiraGate(idOrPath: string, index: number, decision: 'aprovado' | 'reprovado', note = ''): any {
  const info = inspectProjectFolder(idOrPath);
  const desk = readEsteira(info.rootPath);
  const at = clampStage(desk, index);
  const stage = desk.stages[at];
  const def = projectStages(info.rootPath).stages[at];
  if (!def?.gate) return { ...esteiraPayload(info.rootPath, desk), ok: false, error: 'Esta etapa não é um gate.' };
  if (stage.status !== 'awaiting') {
    return { ...esteiraPayload(info.rootPath, desk), ok: false, error: 'O gate ainda não tem resumo para decidir. Execute a etapa antes.' };
  }
  const verdict = decision === 'reprovado' ? 'reprovado' : 'aprovado';
  const entry = logDecision(info.rootPath, {
    kind: 'esteira',
    stage: def.name,
    decision: verdict,
    question: stage.note.trim().slice(-600) || undefined,
    note: String(note || '').trim() || undefined,
  });
  stage.decision = entry;
  stage.note =
    (stage.note ? stage.note.trim() + '\n\n' : '') +
    `### ${entry.at.slice(0, 16).replace('T', ' ')} · Decisão do Carlos: ${verdict}\n` +
    (entry.note ? `${entry.note}\n` : '');
  stage.status = verdict === 'aprovado' ? 'done' : 'idle';
  writeEsteira(info.rootPath, desk);
  const last = at >= desk.stages.length - 1;
  return {
    ...esteiraPayload(info.rootPath, desk),
    ok: true,
    decision: entry,
    continued: verdict === 'aprovado' && desk.auto && !last,
  };
}

/** Resumo do que as etapas anteriores entregaram, para a etapa atual não trabalhar no escuro. */
function earlierStagesDigest(desk: EsteiraDesk, defs: EsteiraStage[], at: number): string {
  const parts: string[] = [];
  let budget = 8000;
  for (let i = at - 1; i >= 0 && budget > 0; i--) {
    const note = desk.stages[i]?.note.trim();
    if (!note || desk.stages[i].status !== 'done') continue;
    const piece = `${defs[i]?.name || `Etapa ${i + 1}`} (${defs[i]?.owner || '—'}):\n${note.slice(-Math.min(2000, budget))}`;
    parts.unshift(piece);
    budget -= piece.length;
  }
  return parts.join('\n\n');
}

export async function runEsteiraStage(idOrPath: string, index: number, _stageName?: string, _stageOwner?: string): Promise<any> {
  const info = inspectProjectFolder(idOrPath);
  const desk = readEsteira(info.rootPath);
  const { stages: defs } = projectStages(info.rootPath);
  const at = Math.max(0, Number(index) || 0);
  const def = defs[at];
  if (!def) return { ...esteiraPayload(info.rootPath, desk), ok: false, error: `A esteira deste projeto não tem a etapa ${at + 1}.` };
  const key = `${info.rootPath}:esteira`;
  if (liveAgents.has(key)) {
    return { ...esteiraPayload(info.rootPath, desk), ok: false, error: 'Já há uma etapa desta esteira em execução.' };
  }
  const pendingGate = defs.findIndex((d, i) => i < at && d.gate && desk.stages[i].status !== 'done');
  if (pendingGate >= 0) {
    return {
      ...esteiraPayload(info.rootPath, desk),
      ok: false,
      gate: true,
      error: `«${defs[pendingGate].name}» é um gate e ainda espera a sua decisão.`,
    };
  }
  const stage = desk.stages[at];
  const prior = stage.note.trim();
  const instruction = stage.instruction.trim() || 'Levante o que esta etapa pede a partir dos arquivos do workspace. Não invente fato que não esteja na pasta.';
  const digest = earlierStagesDigest(desk, defs, at);
  const question =
    `Você conduz a etapa ${at + 1} de ${defs.length}, "${def.name}", com ${def.owner} (${def.skill}).\n` +
    `Instrução desta etapa:\n${instruction}\n\n` +
    (digest ? `O QUE AS ETAPAS ANTERIORES ENTREGARAM (use como base, não refaça):\n${digest}\n\n` : '') +
    (prior ? `CHECKPOINT — a etapa já tem este levantamento. Não recomece do zero. Continue ou revise a partir dele:\n${prior.slice(-5000)}\n\n` : '') +
    (def.gate
      ? 'Esta etapa é um gate. Não edite arquivos. Resuma o que foi entregue até aqui com caminhos de arquivo, aponte riscos e liste exatamente o que precisa da decisão do Carlos. A etapa só fecha quando ele aprovar.'
      : 'Pode alterar o workspace só no que a instrução pede. Ao terminar, liste os arquivos que criou ou alterou.');
  stage.status = 'running';
  writeEsteira(info.rootPath, desk);
  liveAgents.set(key, { paused: false, speech: prior, step: at, itemId: `esteira-${at}`, label: def.name });
  const { converseWithIrisAgent } = require('./irisAgent') as typeof import('./irisAgent');
  const eng = projectEngineSpec(info.rootPath);
  let agentRes: Awaited<ReturnType<typeof converseWithIrisAgent>>;
  try {
    agentRes = await converseWithIrisAgent({
      workspace: info.rootPath,
      question,
      projectName: info.name,
      stageName: def.name,
      stageOwner: def.owner,
      engineId: eng.id,
      model: eng.model,
      effort: eng.effort,
      finished: true,
      alterationsOpen: true,
      asChangeRequest: !def.gate,
      recent: [],
      timeoutMs: 1800000,
      runKind: 'esteira',
      runLabel: def.name,
      onProgress: (line) => {
        const live = liveAgents.get(key);
        if (live && line.length > 80) live.speech = line;
      },
      registerKill: (kill) => {
        const live = liveAgents.get(key);
        if (live) live.kill = kill;
      },
    });
  } catch (err) {
    agentRes = { ok: false, text: `A etapa falhou antes do motor responder: ${err instanceof Error ? err.message : String(err)}`, thoughts: [], engine: eng.name, model: eng.model, mode: 'agent' } as any;
  }
  const live = liveAgents.get(key);
  const paused = agentRes.error === 'paused' || !!live?.paused;
  liveAgents.delete(key);
  const fresh = readEsteira(info.rootPath);
  const current = fresh.stages[at] || emptyEsteiraStage();
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const exec = agentRes.runId ? ` · execução ${agentRes.runId}` : '';
  let commit: StepCommitResult | null = null;
  if (paused) {
    current.status = current.status === 'stopped' ? 'stopped' : 'paused';
    if (agentRes.text && agentRes.text !== 'Pausado por Carlos.') current.note = (current.note ? current.note + '\n' : '') + agentRes.text.trim();
  } else if (agentRes.ok) {
    const c = agentRes.changes;
    const changed = c?.available ? c.added.length + c.modified.length + c.deleted.length : null;
    if (!def.gate) commit = commitRunStep(info.rootPath, `esteira · ${def.name} (${def.owner})`, agentRes.runId, c);
    const facts = [
      changed == null ? '' : changed ? `${changed} arquivo(s) mudaram` : def.gate ? '' : 'Atenção: nenhum arquivo mudou nesta etapa',
      commit ? commitLine(commit) : '',
    ].filter(Boolean);
    current.note =
      (current.note ? current.note + '\n\n' : '') +
      `### ${stamp} · ${def.owner}${exec}\n${agentRes.text.trim()}\n` +
      (facts.length ? `\n_${facts.join(' · ')}_\n` : '');
    current.status = def.gate ? 'awaiting' : 'done';
    if (commit?.sha) current.commits = (current.commits || []).concat(commit.sha).slice(-30);
  } else {
    current.status = 'idle';
    current.note = (current.note ? current.note + '\n' : '') + `### ${stamp} · falhou${exec}\n${String(agentRes.text || '').slice(0, 500)}\n`;
  }
  current.files = stageArtifactFiles(info.rootPath, at, def.name);
  if (agentRes.runId) current.runs = (current.runs || []).concat(agentRes.runId).slice(-30);
  fresh.stages[at] = current;
  writeEsteira(info.rootPath, fresh);
  const last = at >= fresh.stages.length - 1;
  const ok = Boolean(agentRes.ok) && !paused;
  return {
    ...esteiraPayload(info.rootPath, fresh),
    ok,
    paused,
    gate: def.gate,
    awaiting: ok && def.gate,
    commit,
    continued: ok && !def.gate && !last && fresh.auto,
    reply: agentRes.text,
    error: ok || paused ? undefined : String(agentRes.text || 'A etapa não concluiu.'),
  };
}

function normalizePriorityLabel(p?: string | null): 'Normal' | 'Alta' | 'Crítica' {
  const s = String(p || '').toLowerCase();
  if (s.includes('crit') || s.includes('crít') || s === 'high_critical') return 'Crítica';
  if (s.includes('alt') || s === 'high') return 'Alta';
  return 'Normal';
}

function toDbPriorityCode(label?: string | null): string {
  const norm = normalizePriorityLabel(label);
  if (norm === 'Crítica') return 'critical';
  if (norm === 'Alta') return 'high';
  return 'normal';
}

export function listTaskRecords(): any[] {
  const { DatabaseSync } = require('node:sqlite');
  try {
    const sqlite = new DatabaseSync(getDbPath());
    const rows = sqlite
      .prepare(
        `SELECT t.id, t.seq, t.title, t.description, t.status, t.priority, t.sector, t.assignee_agent_id, t.gate_held, a.name as agent_name
         FROM tasks t
         LEFT JOIN agents a ON a.id = t.assignee_agent_id
         ORDER BY COALESCE(t.seq, 9999) ASC, t.created_at DESC`,
      )
      .all() as any[];
    sqlite.close();
    return rows.map((r, idx) => {
      const who =
        r.agent_name ||
        (r.assignee_agent_id === 'ag-07'
          ? 'Arquiteto de Nicho'
          : r.assignee_agent_id && r.assignee_agent_id !== 'pm-projetos'
            ? String(r.assignee_agent_id)
            : 'Paula PM');
      const ini = who
        .split(/\s+/)
        .map((w: string) => w[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'PP';
      return {
        id: r.id || `task-${idx + 1}`,
        seq: Number(r.seq) || idx + 1,
        title: r.title || 'Sem título',
        desc: r.description || '',
        status: r.status || 'to_plan',
        who,
        ini,
        prio: normalizePriorityLabel(r.priority),
        sector: r.sector || 'Operação',
        gate: Boolean(r.gate_held),
        planning: (r.status || 'to_plan') === 'to_plan',
      };
    });
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao listar tasks:', err);
    return [];
  }
}

export function createTaskRecord(params: any): any {
  const { DatabaseSync } = require('node:sqlite');
  const id = String(params?.id || crypto.randomUUID());
  const title = String(params?.title || 'Nova task').trim() || 'Nova task';
  const desc = String(params?.desc || params?.description || '').trim();
  const prio = normalizePriorityLabel(params?.prio || params?.priority);
  const sector = String(params?.sector || 'Estratégia').trim() || 'Estratégia';
  const who = String(params?.who || 'Paula PM').trim() || 'Paula PM';
  const status = String(params?.status || 'to_plan').trim() || 'to_plan';
  const ini =
    who
      .split(/\s+/)
      .map((w: string) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PP';

  let seq = Number(params?.seq) || 1;
  const nowIso = new Date().toISOString();

  try {
    const sqlite = new DatabaseSync(getDbPath());
    const maxRow = sqlite.prepare('SELECT MAX(COALESCE(seq, 0)) as maxSeq FROM tasks').get() as any;
    seq = Math.max(seq, (Number(maxRow?.maxSeq) || 0) + 1);

    let projectId = String(params?.project_id || '').trim();
    if (projectId) {
      const projCheck = sqlite.prepare('SELECT id FROM projects WHERE id = ?').get(projectId) as any;
      if (!projCheck) projectId = '';
    }
    if (!projectId) {
      const projFirst = sqlite.prepare('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1').get() as any;
      if (projFirst?.id) {
        projectId = projFirst.id;
      } else {
        projectId = 'default-project';
        sqlite
          .prepare(
            'INSERT OR IGNORE INTO projects (id, name, company, template_category, total_stages) VALUES (?, ?, ?, ?, ?)',
          )
          .run(projectId, 'Projeto Principal', 'TAVIR', 'sy', 12);
      }
    }

    let agentId: string | null = null;
    if (who) {
      const agentRow = sqlite
        .prepare('SELECT id FROM agents WHERE id = ? OR name = ? OR name LIKE ? LIMIT 1')
        .get(who, who, '%' + who + '%') as any;
      if (agentRow?.id) {
        agentId = agentRow.id;
      }
    }

    sqlite
      .prepare(
        `INSERT OR REPLACE INTO tasks (id, project_id, title, description, status, priority, assignee_agent_id, sector, seq, gate_held, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(id, projectId, title, desc || null, status, toDbPriorityCode(prio), agentId, sector, seq, nowIso, nowIso);
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao criar task no SQLite:', err);
  }

  return {
    id,
    seq,
    title,
    desc,
    status,
    who,
    ini,
    prio,
    sector,
    planning: status === 'to_plan',
  };
}

export function updateTaskRecord(id: string, patch: any): any {
  const { DatabaseSync } = require('node:sqlite');
  const taskId = String(id || patch?.id || '').trim();
  if (!taskId) return { ok: false };
  const nowIso = new Date().toISOString();

  try {
    const sqlite = new DatabaseSync(getDbPath());
    const existing = sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
    if (existing) {
      const nextTitle = patch?.title != null ? String(patch.title).trim() || existing.title : existing.title;
      const nextDesc =
        patch?.desc !== undefined
          ? String(patch.desc || '')
          : patch?.description !== undefined
            ? String(patch.description || '')
            : existing.description;
      const nextStatus = patch?.status != null ? String(patch.status) : existing.status;
      const nextPrio =
        patch?.prio != null || patch?.priority != null
          ? toDbPriorityCode(patch.prio || patch.priority)
          : existing.priority;
      const nextSector = patch?.sector != null ? String(patch.sector) : existing.sector;

      let agentId = existing.assignee_agent_id;
      if (patch?.who != null) {
        const whoStr = String(patch.who).trim();
        const agentRow = sqlite
          .prepare('SELECT id FROM agents WHERE id = ? OR name = ? OR name LIKE ? LIMIT 1')
          .get(whoStr, whoStr, '%' + whoStr + '%') as any;
        agentId = agentRow?.id || null;
      }

      sqlite
        .prepare(
          `UPDATE tasks
           SET title = ?, description = ?, status = ?, priority = ?, sector = ?, assignee_agent_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(nextTitle, nextDesc, nextStatus, nextPrio, nextSector, agentId, nowIso, taskId);
    }
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao atualizar task no SQLite:', err);
  }

  try {
    const storeFile = path.join(process.cwd(), 'db', 'tavir_store.json');
    if (fs.existsSync(storeFile)) {
      const data = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
      if (Array.isArray(data.tasks)) {
        data.tasks = data.tasks.map((t: any) =>
          t.id === taskId
            ? Object.assign({}, t, {
                title: patch?.title != null ? String(patch.title).trim() || t.title : t.title,
                desc: patch?.desc !== undefined ? String(patch.desc || '') : t.desc,
                status: patch?.status != null ? patch.status : t.status,
                prio: patch?.prio != null ? normalizePriorityLabel(patch.prio) : t.prio,
                sector: patch?.sector != null ? patch.sector : t.sector,
                who: patch?.who != null ? patch.who : t.who,
              })
            : t,
        );
        fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf8');
      }
    }
  } catch {}

  return { ok: true, id: taskId, patch };
}

export function deleteTaskRecord(id: string): any {
  const { DatabaseSync } = require('node:sqlite');
  const taskId = String(id || '').trim();
  if (!taskId) return { ok: false };

  try {
    const sqlite = new DatabaseSync(getDbPath());
    sqlite.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao excluir task do SQLite:', err);
  }

  try {
    const storeFile = path.join(process.cwd(), 'db', 'tavir_store.json');
    if (fs.existsSync(storeFile)) {
      const data = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
      if (Array.isArray(data.tasks)) {
        data.tasks = data.tasks.filter((t: any) => t.id !== taskId);
        fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf8');
      }
    }
  } catch {}

  return { ok: true, id: taskId };
}


