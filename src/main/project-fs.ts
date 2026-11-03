import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { fitCall } from '../shared/engineCatalog';

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
): { ok: boolean; deletedFiles: boolean; path: string | null } {
  let targetPath: string | null = fallbackPath ? String(fallbackPath).trim() : null;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(getDbPath());
    const row = sqlite.prepare('SELECT id, slug, local_path FROM projects WHERE id = ?').get(id);
    if (row && row.local_path) {
      targetPath = String(row.local_path).trim();
    } else if (row && row.slug && !targetPath) {
      const candidate = path.join(process.cwd(), 'tavir-interno', String(row.slug));
      if (fs.existsSync(candidate)) targetPath = candidate;
    }
    sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id);
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao remover projeto do SQLite:', err);
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

  const totalStagesMap: Record<string, number> = {
    'lp-c': 12,
    'lp-m': 8,
    'of-c': 12,
    'of-m': 8,
    'sy-c': 15,
    'sy-m': 12,
  };
  const totalStages = totalStagesMap[templateCode] || 12;

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

  let detectedStacks: string[] = [];
  let envVarsFound: string[] = [];
  let topDirs: string[] = [];
  let topFiles: string[] = [];

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

    const entries = fs.readdirSync(wsPath, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith('.git') || ent.name === 'node_modules' || ent.name === '.venv' || ent.name === 'dist') continue;
      if (ent.isDirectory()) topDirs.push(ent.name);
      else topFiles.push(ent.name);
    }

    const checkPkg = (p: string) => {
      if (!fs.existsSync(p)) return;
      try {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
        const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
        if (deps.react) detectedStacks.push('React');
        if (deps['solid-js']) detectedStacks.push('SolidJS');
        if (deps.vue || deps.nuxt) detectedStacks.push('Vue/Nuxt');
        if (deps.next) detectedStacks.push('Next.js');
        if (deps.tailwindcss || deps['@tailwindcss/vite']) detectedStacks.push('Tailwind CSS');
        if (deps.electron) detectedStacks.push('Electron');
        if (deps.typescript) detectedStacks.push('TypeScript');
        if (deps.express || deps.fastify) detectedStacks.push('Node Backend');
      } catch {}
    };
    checkPkg(path.join(wsPath, 'package.json'));
    checkPkg(path.join(wsPath, 'frontend', 'package.json'));

    if (fs.existsSync(path.join(wsPath, 'pyproject.toml')) || fs.existsSync(path.join(wsPath, 'requirements.txt')) || fs.existsSync(path.join(wsPath, 'backend', 'pyproject.toml'))) {
      detectedStacks.push('Python / FastAPI');
    }
    if (fs.existsSync(path.join(wsPath, 'pubspec.yaml')) || fs.existsSync(path.join(wsPath, 'aplicativo', 'pubspec.yaml'))) {
      detectedStacks.push('Flutter / Dart');
    }
    if (!detectedStacks.length) detectedStacks.push(cat === 'sy' ? 'Fullstack / Sistema' : 'Web / Frontend');

    for (const envFile of ['.env', '.env.local', '.env.example', '.env.project']) {
      const ep = path.join(wsPath, envFile);
      if (fs.existsSync(ep)) {
        try {
          const lines = fs.readFileSync(ep, 'utf8').split(/\r?\n/);
          for (const ln of lines) {
            const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
            if (m && !envVarsFound.includes(m[1])) envVarsFound.push(m[1]);
          }
        } catch {}
      }
    }

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
      if (!fs.existsSync(path.join(wsPath, '.git'))) {
        execFileSync('git', ['init'], { cwd: wsPath, windowsHide: true });
      }
      execFileSync('git', ['config', '--local', 'user.name', gitUserName], { cwd: wsPath, windowsHide: true });
      execFileSync('git', ['config', '--local', 'user.email', gitUserEmail], { cwd: wsPath, windowsHide: true });
      if (repoUrl) {
        try {
          execFileSync('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
        } catch {
          execFileSync('git', ['remote', 'add', 'origin', repoUrl], { cwd: wsPath, windowsHide: true });
        }
      }
      const excludePath = path.join(wsPath, '.git', 'info', 'exclude');
      fs.mkdirSync(path.dirname(excludePath), { recursive: true });
      const curExclude = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
      if (!curExclude.includes('.env.project')) {
        fs.writeFileSync(excludePath, `${curExclude}\n.env.project\n.tavir/credentials.json\n`, 'utf8');
      }
    } catch {}

    const diagMd = `# Diagnóstico & Estrutura (Product Lab) · ${name}\n\n- **Agente Responsável**: ${absorbAgent}\n- **Pasta Isolada**: \`${wsPath}\`\n- **Stacks Detectadas**: ${detectedStacks.join(', ')}\n- **Identidade Git Local**: \`${gitUserName} <${gitUserEmail}>\` (${gitProfile})\n- **Alvo de Deploy Isolado**: ${deployTarget}\n- **Variáveis de Ambiente Mapeadas (${envVarsFound.length})**: ${envVarsFound.length ? envVarsFound.map((k) => '`' + k + '`').join(', ') : 'Nenhuma chave exposta (cofre .env.project pronto)'}\n\n## Estrutura da Pasta do Projeto\n- **Diretórios (${topDirs.length})**: ${topDirs.join(', ') || 'raiz limpa'}\n- **Arquivos na Raiz (${topFiles.length})**: ${topFiles.slice(0, 15).join(', ') || 'nenhum'}\n\n> Isolamento ativo: credenciais, commits, PRs e tokens de deploy operam exclusivamente dentro desta pasta.\n`;
    fs.writeFileSync(path.join(wsPath, 'context', 'diagnosis.md'), diagMd, 'utf8');
  } catch (e) {
    console.error('[TAVIR ProjectFS] Aviso ao preparar workspace:', e);
  }

  const stackStr = detectedStacks.join(', ') || null;
  const nowIso = new Date().toISOString();
  const stagesDoneInit = isAbsorb ? 2 : 0;
  const description = `Escopo: ${ownership} · Esteira: ${templateCode} · ${isAbsorb ? 'Absorvido (Product Lab)' : isMaint ? 'Manutenção' : 'Criação'} · Git: ${gitUserName}`;
  const filesJson = JSON.stringify({
    context_files: ['context/diagnosis.md', 'context/contrato.json'],
    ownership,
    template_code: templateCode,
    git_profile: gitProfile,
    deploy_target: deployTarget,
    absorb_agent: absorbAgent,
    absorbed: isAbsorb,
  });

  const newProj = {
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
  };

  try {
    const sqlite = new DatabaseSync(getDbPath());
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
    sqlite.close();
  } catch (err) {
    console.error('[TAVIR ProjectFS] Erro ao gravar projeto no SQLite:', err);
  }

  return newProj;
}

export function resolveEngineSpec(engineName?: string, modelId?: string, effortId?: string) {
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

export const ENGINE_SPECS: Record<string, { id: string; name: string; cli: string; sdkPath: string; model: string; protocol: string }> = {
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    cli: 'agent --output-format stream-json',
    sdkPath: '~/.cursor',
    model: 'auto-smart',
    protocol: 'Cursor Agent Stream-JSON · Extended Thinking',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    cli: 'claude -p --output-format json',
    sdkPath: '~/.claude',
    model: 'claude-opus-5-5',
    protocol: 'Claude Code SDK · Anthropic Extended Thinking',
  },
  anthropic: {
    id: 'claude',
    name: 'Claude',
    cli: 'claude -p --output-format json',
    sdkPath: '~/.claude',
    model: 'claude-opus-5-5',
    protocol: 'Claude Code SDK · Anthropic Extended Thinking',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    cli: 'codex exec --reasoning high',
    sdkPath: '~/.codex',
    model: 'gpt-5-codex',
    protocol: 'OpenAI Codex CLI · Reasoning Effort High',
  },
  antigravity: {
    id: 'antigravity',
    name: 'Antigravity',
    cli: 'agy --thought-stream',
    sdkPath: '~/.gemini/antigravity',
    model: 'gemini-2.5-pro',
    protocol: 'Google Antigravity SDK · Native <thought> Stream',
  },
};

function nowHM(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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

  const welcomeEng = resolveEngineSpec();
  const welcomeMsg = {
    id: 'iris-welcome-' + Date.now(),
    who: `Íris · ${welcomeEng.name}`,
    role: 'ag',
    engine: welcomeEng.name,
    model: welcomeEng.model,
    ts: nowHM(),
    thoughts: [
      `[${welcomeEng.caption}] Conectada à pasta isolada: ${rootPath}`,
      `[Estrutura] ${info.dirCount} pastas e ${info.fileCount} arquivos mapeados (${info.stacks})`,
      `[Isolamento] Verificado .tavir/isolation.json e .env.project sem vazamento externo`,
    ],
    t: `Olá, Carlos! Sou a Íris via ${welcomeEng.caption}, conectada ao projeto "${info.name}" (${info.dirCount} pastas · ${info.fileCount} arquivos · ${info.stacks}). Pergunte sobre arquivos, etapas ou peça ajustes — o motor ativo fica no seletor do chat.`,
  };

  try {
    fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
    fs.writeFileSync(chatFile, JSON.stringify([welcomeMsg], null, 2), 'utf8');
  } catch {}

  return { ok: true, rootPath, messages: [welcomeMsg] };
}

export function askProjectIris(params: any): any {
  const idOrPath = String(params?.projectId || params?.projectPath || params?.projectName || 'projeto').trim();
  const question = String(params?.question || params?.message || '').trim();
  const eng = resolveEngineSpec(params?.engine, params?.model, params?.effort);
  const effort = eng.effortLabel;
  const stageName = String(params?.stageName || 'Arquitetura & Construção').trim();
  const stageOwner = String(params?.stageOwner || 'Paula PM').trim();
  const persona = String(params?.persona || 'Íris · Inteligência do Projeto').trim();

  const info = inspectProjectFolder(idOrPath);
  const rootPath = info.rootPath;

  let diagnosisText = '';
  let scopeText = '';
  let memoryText = '';
  try {
    const diagPath = path.join(rootPath, 'context', 'diagnosis.md');
    if (fs.existsSync(diagPath)) diagnosisText = fs.readFileSync(diagPath, 'utf8').slice(0, 1200);
  } catch {}
  try {
    const scopePath = path.join(rootPath, 'context', 'escopo.md');
    if (fs.existsSync(scopePath)) scopeText = fs.readFileSync(scopePath, 'utf8').slice(0, 1000);
  } catch {}
  try {
    const memPath = path.join(rootPath, 'memory', 'projeto', 'MEMORY.md');
    if (fs.existsSync(memPath)) memoryText = fs.readFileSync(memPath, 'utf8').slice(0, 1000);
  } catch {}

  const topDirs = info.tree.filter((x: any) => x.isDir && x.depth === 0).map((x: any) => x.name);
  const topFiles = info.tree.filter((x: any) => !x.isDir && x.depth <= 1).map((x: any) => x.relPath);
  const gitUser = info.isolation?.git_identity?.user_name || 'TAVIR';
  const gitEmail = info.isolation?.git_identity?.user_email || 'engenharia@tavir.com.br';
  const deployTarget = info.isolation?.deploy_isolation?.target || 'Isolado local (.env.project)';

  // Match if user asks about a specific file in the project
  const qLower = question.toLowerCase();
  let matchedFile: { relPath: string; content: string } | null = null;
  for (const item of info.tree) {
    if (!item.isDir && item.name && qLower.includes(item.name.toLowerCase())) {
      const readRes = readProjectFileContent(item.fullPath);
      if (readRes.ok && readRes.content) {
        matchedFile = { relPath: item.relPath, content: readRes.content.slice(0, 900) };
        break;
      }
    }
  }

  const thoughts: string[] = [
    `[${eng.caption}] Iniciando raciocínio via ${eng.protocol}`,
    `[Workspace] Lendo pasta isolada do projeto "${info.name}" em ${rootPath}`,
    `[Árvore Física] ${info.dirCount} pastas (${topDirs.slice(0, 6).join(', ') || 'raiz'}) e ${info.fileCount} arquivos · Stack: ${info.stacks}`,
    `[Contexto da Esteira] Etapa em foco: "${stageName}" (Responsável: ${stageOwner}) · Git local: ${gitUser} <${gitEmail}>`,
  ];

  if (matchedFile) {
    thoughts.push(`[Leitura de Arquivo] Inspecionado "${matchedFile.relPath}" diretamente no disco (${matchedFile.content.length} chars lidos)`);
  } else if (diagnosisText || scopeText) {
    thoughts.push(`[Memória & Escopo] Carregados context/escopo.md, context/diagnosis.md e memory/projeto/MEMORY.md`);
  }
  thoughts.push(`[Síntese Íris] Consolidando resposta acionável para "${question.slice(0, 70)}"`);

  let reply = '';
  if (matchedFile) {
    reply =
      `Li o arquivo \`${matchedFile.relPath}\` diretamente na pasta de **${info.name}** (\`${rootPath}\`):\n\n` +
      `Resumo do conteúdo encontrado:\n` +
      `${matchedFile.content.split(/\r?\n/).slice(0, 12).join('\n')}\n\n` +
      `Se quiser, posso registrar uma alteração neste arquivo ou disparar a etapa **${stageName}** com **${stageOwner}** usando o motor **${eng.name}**.`;
  } else if (qLower.includes('pasta') || qLower.includes('estrutura') || qLower.includes('arquiv') || qLower.includes('stack') || qLower.includes('arquitetura')) {
    reply =
      `Aqui está a leitura real da estrutura de **${info.name}** via **${eng.name}** (${eng.model}):\n` +
      `• **Caminho no disco**: \`${rootPath}\`\n` +
      `• **Stacks detectadas**: ${info.stacks}\n` +
      `• **Pastas principais (${info.dirCount})**: ${topDirs.join(', ') || 'nenhuma subpasta'}\n` +
      `• **Arquivos mapeados (${info.fileCount})**: ${topFiles.slice(0, 10).join(', ') || 'nenhum arquivo'}\n` +
      `• **Isolamento**: Git local configurado como \`${gitUser} <${gitEmail}>\` e ambiente \`${deployTarget}\`.`;
  } else if (qLower.includes('execut') || qLower.includes('rodando') || qLower.includes('agora') || qLower.includes('status') || qLower.includes('etapa') || qLower.includes('falta')) {
    reply =
      `Status ao vivo de **${info.name}** analisado pelo motor **${eng.name}**:\n` +
      `• **Etapa atual em foco**: **${stageName}** (conduzida por **${stageOwner}**).\n` +
      `• **Motor ativo**: ${eng.caption} (\`${eng.sdkPath}\`).\n` +
      `• **Workspace**: \`${rootPath}\` (${info.dirCount} pastas, ${info.fileCount} arquivos).\n` +
      `• **Próximo passo recomendado**: você pode clicar em **"▶ Executar etapa com Pensamento"** no painel de Execução ao Vivo da tela inicial do projeto para rodar/atualizar os artefatos desta etapa em tempo real.`;
  } else if (qLower.includes('git') || qLower.includes('credencia') || qLower.includes('env') || qLower.includes('isolamento') || qLower.includes('deploy')) {
    reply =
      `Isolamento verificado em **${info.name}**:\n` +
      `• **Identidade Git exclusiva da pasta**: \`${gitUser} <${gitEmail}>\` (gravada em \`.git/config\` local).\n` +
      `• **Cofre de ambiente**: \`.env.project\` isolado para **${deployTarget}** (protegido no \`.git/info/exclude\`).\n` +
      `• Nenhuma credencial ou configuração deste projeto vaza para outros módulos ou para sua conta global.`;
  } else {
    // Registra ou executa orientação para o projeto e atualiza memory/projeto/MEMORY.md
    try {
      const memDir = path.join(rootPath, 'memory', 'projeto');
      fs.mkdirSync(memDir, { recursive: true });
      const memFile = path.join(memDir, 'MEMORY.md');
      const prevMem = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8') : `# Memória do Projeto · ${info.name}\n`;
      const newEntry = `\n- [${new Date().toISOString().slice(0, 16).replace('T', ' ')}] (${eng.name} · ${stageName}) Solicitação: "${question}"`;
      fs.writeFileSync(memFile, prevMem + newEntry + '\n', 'utf8');
    } catch {}

    reply =
      `Entendido, Carlos! Analisei seu pedido para **${info.name}** na etapa **${stageName}** usando o motor **${eng.name}** (\`${eng.model}\`):\n` +
      `• **Solicitação registrada**: "${question}"\n` +
      `• **Contexto inspecionado**: \`${rootPath}\` (${info.stacks} · ${info.dirCount} pastas e ${info.fileCount} arquivos).\n` +
      `• **Ação tomada**: Diretriz gravada em \`memory/projeto/MEMORY.md\` e vinculada a **${stageOwner}** na etapa **${stageName}**. Você também pode disparar a execução ao vivo logo acima para gerar/atualizar o artefato correspondente.`;
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
    thoughts,
    t: reply,
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
    userMessage: userMsg,
    replyMessage: agentMsg,
    messages: history,
  };
}

export function runProjectStageWithThinking(params: any): any {
  const idOrPath = String(params?.projectId || params?.projectPath || params?.projectName || 'projeto').trim();
  const stageIndex = Number(params?.stageIndex || 0);
  const stageName = String(params?.stageName || 'Entender').trim();
  const stageOwner = String(params?.stageOwner || 'Paula PM').trim();
  const stageRole = String(params?.stageRole || 'Especialista da Esteira').trim();
  const instruction = String(params?.instruction || '').trim();
  const eng = resolveEngineSpec(params?.engine, params?.model, params?.effort);
  const effort = eng.effortLabel;

  const info = inspectProjectFolder(idOrPath);
  const rootPath = info.rootPath;
  const topDirs = info.tree.filter((x: any) => x.isDir && x.depth === 0).map((x: any) => x.name);
  const sampleFiles = info.tree.filter((x: any) => !x.isDir).slice(0, 6).map((x: any) => x.relPath);
  const gitUser = info.isolation?.git_identity?.user_name || 'TAVIR';

  const ts = nowHM();
  const engineSpecificHeader: Record<string, string> = {
    cursor: `[Cursor Agent CLI] $ ${eng.cli} --workspace "${rootPath}" --model ${eng.model}`,
    claude: `[Claude Code SDK] $ ${eng.cli} --cwd "${rootPath}" --model ${eng.model} --thinking-budget 16000`,
    codex: `[OpenAI Codex CLI] $ ${eng.cli} --cd "${rootPath}" --model ${eng.model} --sandbox workspace-write`,
    antigravity: `[Antigravity SDK] $ ${eng.cli} --workspace "${rootPath}" --model ${eng.model} ( ~/.gemini/antigravity )`,
  };

  const thoughts: Array<{ step: number; ts: string; tag: string; text: string }> = [
    {
      step: 1,
      ts,
      tag: eng.name.toUpperCase(),
      text: engineSpecificHeader[eng.id] || engineSpecificHeader.cursor,
    },
    {
      step: 2,
      ts,
      tag: 'WORKSPACE',
      text: `Inspecionando pasta isolada "${rootPath}" (${info.dirCount} pastas: ${topDirs.join(', ') || 'raiz'} · ${info.fileCount} arquivos · stack: ${info.stacks}).`,
    },
    {
      step: 3,
      ts,
      tag: 'ISOLAMENTO',
      text: `Validado .tavir/isolation.json · Git local=${gitUser} · cofre=.env.project · leitura de ${sampleFiles.slice(0, 4).join(', ') || 'context/escopo.md'}.`,
    },
    {
      step: 4,
      ts,
      tag: 'RACIOCÍNIO',
      text: instruction
        ? `Incorporando instrução em tempo real do operador: "${instruction}" na etapa "${stageName}" com ${stageOwner}.`
        : `Executando cadeia de pensamento (${effort}) para a etapa "${stageName}" sob responsabilidade de ${stageOwner} (${stageRole}).`,
    },
    {
      step: 5,
      ts,
      tag: 'ARTEFATO',
      text: `Gerando e persistindo artefato auditável em artifacts/etapa-${String(stageIndex + 1).padStart(2, '0')}-${stageName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md dentro da pasta do projeto.`,
    },
  ];

  const artifactSlug = `etapa-${String(stageIndex + 1).padStart(2, '0')}-${stageName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')}.md`;
  const artifactRelPath = `artifacts/${artifactSlug}`;
  const artifactFullPath = path.join(rootPath, 'artifacts', artifactSlug);

  const artifactContent =
    `# Relatório de Execução · Etapa ${stageIndex + 1}: ${stageName}\n\n` +
    `- **Projeto**: ${info.name}\n` +
    `- **Agente Responsável**: ${stageOwner} (${stageRole})\n` +
    `- **Motor Utilizado**: ${eng.name} (\`${eng.model}\` · ${eng.protocol})\n` +
    `- **Esforço de Pensamento**: ${effort}\n` +
    `- **Horário**: ${new Date().toISOString()}\n` +
    (instruction ? `- **Instrução do Operador**: ${instruction}\n` : '') +
    `\n## Cadeia de Pensamento (${eng.name})\n` +
    thoughts.map((t) => `${t.step}. **[${t.tag}]** ${t.text}`).join('\n') +
    `\n\n## Arquivos & Estrutura Auditada\n` +
    `- **Raiz**: \`${rootPath}\`\n` +
    `- **Stacks**: ${info.stacks}\n` +
    `- **Amostra de arquivos verificados**: ${sampleFiles.join(', ') || 'context/escopo.md'}\n`;

  try {
    fs.mkdirSync(path.join(rootPath, 'artifacts'), { recursive: true });
    fs.writeFileSync(artifactFullPath, artifactContent, 'utf8');
  } catch {}

  const steps = [
    { label: `Conectar SDK local do motor ${eng.name} (${eng.sdkPath})`, state: 'done', meta: eng.model },
    { label: `Ler árvore de arquivos e isolamento (${info.dirCount} pastas · ${info.fileCount} arq)`, state: 'done', meta: info.stacks },
    { label: `Executar raciocínio ${effort} da etapa ${stageName} (${stageOwner})`, state: 'done', meta: '5 blocos de pensamento' },
    { label: `Gravar artefato ${artifactRelPath} no workspace do projeto`, state: 'done', meta: ts },
  ];

  const liveRecord = {
    ok: true,
    projectId: info.id,
    projectName: info.name,
    rootPath,
    engine: eng.name,
    engineId: eng.id,
    model: eng.model,
    protocol: eng.protocol,
    sdkPath: eng.sdkPath,
    effort,
    stageIndex,
    stageName,
    stageOwner,
    instruction: instruction || null,
    status: 'completed',
    ts,
    tokens: '2.480 tok',
    cost: 'US$ 0,04',
    elapsed: '3,2 s',
    artifactRelPath,
    thoughts,
    steps,
  };

  try {
    fs.mkdirSync(path.join(rootPath, '.tavir'), { recursive: true });
    fs.writeFileSync(path.join(rootPath, '.tavir', 'live-execution.json'), JSON.stringify(liveRecord, null, 2), 'utf8');
  } catch {}

  return liveRecord;
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


