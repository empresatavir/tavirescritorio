'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RX = 'empresas/tavir/projetos/custom/raio-x-de-prospeccao';

const MAPA = [
  { grupo: 'projeto', origem: `${RX}/PROJECT.md`, destino: 'raiox/PROJECT.md' },
  { grupo: 'projeto', origem: `${RX}/AMBIENTE.md`, destino: 'raiox/AMBIENTE.md' },
  { grupo: 'projeto', origem: `${RX}/00-descoberta`, destino: 'raiox/docs/descoberta/' },
  { grupo: 'projeto', origem: `${RX}/01-requisitos`, destino: 'raiox/docs/requisitos/' },
  { grupo: 'projeto', origem: `${RX}/02-prova-visual`, destino: 'raiox/docs/prova-visual/' },
  { grupo: 'projeto', origem: `${RX}/03-plano`, destino: 'raiox/docs/plano/' },
  { grupo: 'projeto', origem: `${RX}/04-execucao/prototipo-formulario`, destino: 'raiox/docs/prototipo-formulario/' },
  { grupo: 'projeto', origem: `${RX}/04-execucao/raiox-web`, destino: 'raiox/web/' },
  { grupo: 'projeto', origem: `${RX}/05-validacao`, destino: 'raiox/docs/validacao/' },
  { grupo: 'projeto', origem: `${RX}/06-entrega`, destino: 'raiox/modelos/' },
  { grupo: 'publicar.py', origem: 'tools/publicar.py', destino: 'tools/publicar.py' },
  { grupo: 'requirements-publicar.txt', origem: 'tools/requirements-publicar.txt', destino: 'tools/requirements-publicar.txt' },
  { grupo: 'scrapling-lab', origem: 'tools/scrapling-lab', destino: 'tools/scrapling-lab/' },
  { grupo: 'analise-instagram', origem: 'analise-instagram', destino: 'analise-instagram/' },
  { grupo: 'analise-web', origem: 'analise-web', destino: 'analise-web/' },
  { grupo: 'inteligencia-nichos', origem: 'marketing/inteligencia-nichos', destino: 'marketing/inteligencia-nichos/' },
  { grupo: 'agentes', origem: 'descoberta/agentes/agente-descoberta.md', destino: 'agentes/escopo/agentes/dora-descoberta.md' },
  { grupo: 'agentes', origem: 'analise-instagram/agentes/agente-analista-instagram.md', destino: 'agentes/escopo/agentes/iris-instagram.md' },
  { grupo: 'agentes', origem: 'analise-web/agentes/agente-analista-web.md', destino: 'agentes/escopo/agentes/analista-web.md' },
  { grupo: 'funil-vendas', origem: '.claude/skills/funil-vendas', destino: 'agentes/escopo/skills/funil-vendas/' },
];

function argumento(nome) {
  const i = process.argv.indexOf(nome);
  if (i < 0 || i + 1 >= process.argv.length) return '';
  return process.argv[i + 1];
}

function normalizar(valor) {
  return String(valor).replace(/\\/g, '/').replace(/^\.\//, '');
}

function regraPulo(arquivo) {
  const rel = normalizar(arquivo);
  const nome = path.posix.basename(rel);
  const partes = rel.split('/');
  if (nome === '.env' || nome === '.env.local') return 'env';
  if (partes.includes('.vercel')) return '.vercel';
  if (rel.includes('supabase/.temp/') || rel.endsWith('supabase/.temp')) return 'supabase/.temp';
  if (partes.includes('node_modules')) return 'node_modules';
  if (partes.includes('__pycache__')) return '__pycache__';
  if (nome.endsWith('.pyc')) return 'pyc';
  const idxPerfis = partes.indexOf('perfis');
  if (idxPerfis >= 0 && nome !== '.gitkeep') return 'perfis';
  const idxConfig = partes.indexOf('config');
  if (idxConfig >= 0 && (nome === '.env' || nome.endsWith('.env'))) return 'config/*.env';
  return '';
}

function destinoDe(item, arquivo) {
  const origem = normalizar(item.origem).replace(/\/$/, '');
  const arq = normalizar(arquivo);
  const destino = normalizar(item.destino);
  if (!destino.endsWith('/')) return destino;
  const prefixo = `${origem}/`;
  const relativo = arq.startsWith(prefixo) ? arq.slice(prefixo.length) : path.posix.basename(arq);
  return `${destino}${relativo}`;
}

function listar(ag, origem) {
  const saida = execFileSync('git', ['-C', ag, 'ls-files', '-z', '--', origem], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return saida.split('\0').filter(Boolean).map(normalizar);
}

function main() {
  const ag = argumento('--origem');
  const simular = process.argv.includes('--simular');
  if (!ag) {
    process.stderr.write('Uso: node scripts/raiox_migrar.js --origem <AG> [--simular]\n');
    process.exit(1);
  }

  const repo = process.cwd();
  const totais = { copiados: 0, pulados: 0, conflitos: 0, proibidosNaCopia: 0 };
  const porGrupo = {};

  for (const item of MAPA) {
    if (!porGrupo[item.grupo]) porGrupo[item.grupo] = { listados: 0, copiados: 0, pulados: 0, conflitos: 0 };
    const grupo = porGrupo[item.grupo];
    const arquivos = listar(ag, item.origem);
    for (const arquivo of arquivos) {
      grupo.listados += 1;
      const regra = regraPulo(arquivo);
      if (regra) {
        grupo.pulados += 1;
        totais.pulados += 1;
        process.stdout.write(`PULADO\t${arquivo}\t${regra}\n`);
        continue;
      }
      const destino = destinoDe(item, arquivo);
      if (regraPulo(destino)) {
        totais.proibidosNaCopia += 1;
        process.stdout.write(`PROIBIDO\t${destino}\n`);
        continue;
      }
      const absoluto = path.join(repo, destino);
      if (fs.existsSync(absoluto)) {
        grupo.conflitos += 1;
        totais.conflitos += 1;
        process.stdout.write(`CONFLITO\t${destino}\n`);
        continue;
      }
      grupo.copiados += 1;
      totais.copiados += 1;
      process.stdout.write(`COPIA\t${arquivo}\t${destino}\n`);
      if (simular) continue;
      fs.mkdirSync(path.dirname(absoluto), { recursive: true });
      fs.copyFileSync(path.join(ag, arquivo), absoluto);
    }
  }

  process.stdout.write(`RESUMO\tcopiados=${totais.copiados}\tpulados=${totais.pulados}\tconflitos=${totais.conflitos}\tproibidos_na_copia=${totais.proibidosNaCopia}\tsimular=${simular ? 1 : 0}\n`);
  for (const [nome, grupo] of Object.entries(porGrupo)) {
    process.stdout.write(`GRUPO\t${nome}\tlistados=${grupo.listados}\tcopiados=${grupo.copiados}\tpulados=${grupo.pulados}\tconflitos=${grupo.conflitos}\n`);
  }
  if (totais.proibidosNaCopia > 0) process.exit(1);
}

main();
