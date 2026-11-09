/**
 * Versionamento do Escritório.
 *
 *   node scripts/versioning.js info              grava dist/build-info.json (roda em todo build)
 *   node scripts/versioning.js release <tipo>    sobe a versão (patch | minor | major) e o CHANGELOG
 *   node scripts/versioning.js tag               cria a tag vX.Y.Z na master depois do merge
 *
 * A ficha do build é gravada na hora do build, não lida do git com o app aberto:
 * assim o app mostra o que de fato está rodando, mesmo que a pasta mude depois.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(args, cwd = ROOT) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function readPkg(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

/** Arquivos que mudam sozinhos com o uso do app ou são saída de build: não contam como alteração local. */
const RUNTIME = /^(db\/|dist\/|backend\/tavir\.db)/;

function dirtyFiles(root = ROOT) {
  let out = '';
  try {
    // Sem trim: o primeiro caractere do status é espaço quando a mudança não está no índice.
    out = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=no'], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return [];
  }
  const files = [];
  const parts = out.split('\0');
  for (let i = 0; i < parts.length; i += 1) {
    const e = parts[i];
    if (e.length < 4) continue;
    files.push(e.slice(3));
    if (e[0] === 'R' || e[0] === 'C') i += 1;
  }
  // Código novo ainda sem commit também entra no build; rascunhos (scripts/_*) não.
  const fresh = git(['ls-files', '--others', '--exclude-standard', '--', 'src', 'scripts', 'package.json'], root)
    .split(/\r?\n/)
    .filter((f) => f && !/^scripts\/_/.test(f));
  return [...files, ...fresh].filter((f) => !RUNTIME.test(f));
}

function collectBuildInfo(root = ROOT, now = new Date()) {
  const pkg = readPkg(root);
  const commit = git(['rev-parse', 'HEAD'], root);
  const tag = git(['describe', '--tags', '--exact-match', '--match', 'v[0-9]*'], root);
  const lastTag = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'], root);
  const ahead = lastTag ? Number(git(['rev-list', '--count', `${lastTag}..HEAD`], root)) || 0 : null;
  const dirty = commit ? dirtyFiles(root) : [];
  return {
    version: String(pkg.version || '0.0.0'),
    commit: commit.slice(0, 7),
    commitFull: commit,
    commitDate: git(['log', '-1', '--format=%cI'], root),
    commitSubject: git(['log', '-1', '--format=%s'], root),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], root),
    tag: tag || null,
    lastTag: lastTag || null,
    commitsSinceTag: ahead,
    dirty: dirty.length > 0,
    dirtyFiles: dirty.slice(0, 20),
    builtAt: now.toISOString(),
  };
}

function writeBuildInfo(root = ROOT) {
  const info = collectBuildInfo(root);
  const dir = path.join(root, 'dist');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'build-info.json'), JSON.stringify(info, null, 2), 'utf8');
  return info;
}

function bumpVersion(version, kind) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`Versão inválida no package.json: ${version}`);
  let [maj, min, pat] = m.slice(1).map(Number);
  if (kind === 'major') { maj += 1; min = 0; pat = 0; }
  else if (kind === 'minor') { min += 1; pat = 0; }
  else if (kind === 'patch') { pat += 1; }
  else throw new Error('Use patch, minor ou major.');
  return `${maj}.${min}.${pat}`;
}

const GROUPS = [
  ['feat', 'Novidades'],
  ['fix', 'Correções'],
  ['perf', 'Desempenho'],
  ['refactor', 'Reorganização'],
  ['style', 'Visual'],
  ['docs', 'Documentação'],
];

/** Monta a seção do CHANGELOG a partir dos assuntos dos commits (formato "tipo(escopo): texto"). */
function changelogSection(version, date, subjects) {
  const buckets = new Map(GROUPS.map(([, title]) => [title, []]));
  buckets.set('Outros', []);
  for (const raw of subjects) {
    const s = String(raw || '').trim();
    if (!s || /^chore\(release\)/.test(s) || /^Merge /.test(s)) continue;
    const m = s.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
    const group = m ? (GROUPS.find(([k]) => k === m[1]) || [])[1] || 'Outros' : 'Outros';
    const text = m ? (m[2] ? `**${m[2]}:** ${m[3]}` : m[3]) : s;
    buckets.get(group).push(`- ${text}`);
  }
  const lines = [`## v${version} · ${date}`, ''];
  for (const [title, items] of buckets) {
    if (!items.length) continue;
    lines.push(`### ${title}`, '', ...items, '');
  }
  if (lines.length === 2) lines.push('- Sem mudanças registradas.', '');
  return lines.join('\n');
}

function release(kind, opts = {}) {
  const root = opts.root || ROOT;
  const dirty = dirtyFiles(root);
  if (dirty.length) throw new Error(`Há arquivos alterados sem commit: ${dirty.slice(0, 5).join(', ')}. Commite ou guarde antes da release.`);
  const pkgPath = path.join(root, 'package.json');
  const pkgText = fs.readFileSync(pkgPath, 'utf8');
  const current = readPkg(root).version;
  const next = bumpVersion(current, kind);
  const lastTag = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'], root);
  const range = lastTag ? [`${lastTag}..HEAD`] : ['-n', '60'];
  const subjects = git(['log', '--no-merges', '--format=%s', ...range], root).split(/\r?\n/).filter(Boolean);
  const date = (opts.date || new Date()).toISOString().slice(0, 10);
  let section = changelogSection(next, date, subjects);
  if (!lastTag) section = section.replace('\n\n', '\n\nPrimeira versão com controle de versão. Abaixo, os commits mais recentes até aqui.\n\n');
  const clPath = path.join(root, 'CHANGELOG.md');
  const head = '# Changelog\n\nVersões do TAVIR Escritório. A versão aparece no rodapé do app e em Configurações › Sistema.\n\n';
  const prev = fs.existsSync(clPath) ? fs.readFileSync(clPath, 'utf8').replace(/^# Changelog[\s\S]*?(?=## v|$)/, '') : '';
  fs.writeFileSync(clPath, head + section + (prev ? '\n' + prev : ''), 'utf8');
  fs.writeFileSync(pkgPath, pkgText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`), 'utf8');
  if (!opts.noCommit) {
    execFileSync('git', ['add', 'package.json', 'CHANGELOG.md'], { cwd: root, windowsHide: true });
    execFileSync('git', ['commit', '-q', '-m', `chore(release): v${next}`], { cwd: root, windowsHide: true });
  }
  return { from: current, to: next, entries: subjects.length };
}

function tagRelease(opts = {}) {
  const root = opts.root || ROOT;
  const version = readPkg(root).version;
  const tag = `v${version}`;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (!opts.anyBranch && branch !== 'master' && branch !== 'main') throw new Error(`A tag sai da master depois do merge (você está em ${branch}).`);
  if (git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], root)) throw new Error(`A tag ${tag} já existe. Rode a release antes para subir a versão.`);
  execFileSync('git', ['tag', '-a', tag, '-m', `TAVIR Escritório ${tag}`], { cwd: root, windowsHide: true });
  return { tag, commit: git(['rev-parse', '--short', 'HEAD'], root) };
}

module.exports = { collectBuildInfo, writeBuildInfo, bumpVersion, changelogSection, release, tagRelease, dirtyFiles };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'info') {
      const i = writeBuildInfo();
      console.log(`[TAVIR versão] v${i.version} · ${i.commit || 'sem git'} · ${i.branch}${i.dirty ? ' · alterações locais' : ''}`);
    } else if (cmd === 'release') {
      const r = release(arg);
      console.log(`Versão ${r.from} → ${r.to} com ${r.entries} commit(s) no CHANGELOG. Commit "chore(release): v${r.to}" criado.`);
      console.log('Abra a PR com esse commit. Depois do merge, na master: npm run release:tag');
    } else if (cmd === 'tag') {
      const t = tagRelease();
      console.log(`Tag ${t.tag} criada em ${t.commit}. Para publicar: git push origin ${t.tag}`);
    } else {
      console.log('Uso: node scripts/versioning.js info | release <patch|minor|major> | tag');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[TAVIR versão] ' + (err && err.message ? err.message : err));
    process.exitCode = 1;
  }
}
