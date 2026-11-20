'use strict';

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 2 * 1024 * 1024;
const ROOT = process.cwd();

const SECRET_RULES = [
  { tipo: 'segredo-resend', re: /re_[A-Za-z0-9_]{20,}/ },
  { tipo: 'segredo-openai', re: /sk-[A-Za-z0-9]{20,}/ },
  { tipo: 'segredo-supabase', re: /sbp_[A-Za-z0-9]{20,}/ },
  { tipo: 'segredo-jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./ },
  { tipo: 'segredo-telegram', re: /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/ },
  { tipo: 'segredo-atribuicao', re: /(SECRET|KEY|TOKEN|PASSWORD)\s*=\s*\S{8,}/ },
];

function relatar(rel) {
  return rel.split(path.sep).join('/');
}

function caminhoProibido(rel) {
  const nome = path.posix.basename(rel);
  if (nome === '.env' || nome === '.env.local' || nome.endsWith('.pem')) return 'arquivo-proibido';
  if (nome === 'analysis-input.json' || nome === 'review-state.json') return 'arquivo-proibido';
  if (rel.includes('raiox-cases') || rel.includes('privado') || rel.includes('.vercel') || rel.includes('supabase/.temp')) {
    return 'caminho-proibido';
  }
  return '';
}

function lerExcecoes() {
  const arquivo = path.join(ROOT, 'scripts', 'raiox_scan.allow');
  if (!fs.existsSync(arquivo)) return new Set();
  const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/);
  const set = new Set();
  for (const linha of linhas) {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) continue;
    set.add(texto);
  }
  return set;
}

function listarArquivos(entrada) {
  if (!fs.existsSync(entrada)) return [];
  const stat = fs.statSync(entrada);
  if (stat.isFile()) return [entrada];
  const achados = [];
  const pendentes = [entrada];
  while (pendentes.length) {
    const atual = pendentes.pop();
    let nomes = [];
    try {
      nomes = fs.readdirSync(atual);
    } catch {
      continue;
    }
    for (const nome of nomes) {
      const completo = path.join(atual, nome);
      let info;
      try {
        info = fs.lstatSync(completo);
      } catch {
        continue;
      }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) pendentes.push(completo);
      else if (info.isFile()) achados.push(completo);
    }
  }
  return achados;
}

function varrerArquivo(completo, excecoes, achados) {
  const rel = relatar(path.relative(ROOT, completo));
  const proibido = caminhoProibido(rel);
  if (proibido) {
    const chave = `${rel}:1: ${proibido}`;
    if (!excecoes.has(chave) && !excecoes.has(`${rel}:1`)) achados.push(chave);
    return;
  }

  let stat;
  try {
    stat = fs.statSync(completo);
  } catch {
    return;
  }
  if (stat.size >= MAX_BYTES || stat.size === 0) return;

  let buf;
  try {
    buf = fs.readFileSync(completo);
  } catch {
    return;
  }
  if (buf.includes(0)) return;

  const exemplo = path.posix.basename(rel).endsWith('.example');
  const linhas = buf.toString('utf8').split(/\r?\n/);
  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    for (const regra of SECRET_RULES) {
      if (regra.tipo === 'segredo-atribuicao' && exemplo) continue;
      regra.re.lastIndex = 0;
      if (!regra.re.test(linha)) continue;
      const chave = `${rel}:${i + 1}: ${regra.tipo}`;
      if (excecoes.has(chave) || excecoes.has(`${rel}:${i + 1}`)) continue;
      achados.push(chave);
    }
  }
}

function main() {
  const pastas = process.argv.slice(2).filter((arg) => arg && !arg.startsWith('-'));
  const excecoes = lerExcecoes();
  const achados = [];
  for (const pasta of pastas) {
    for (const arquivo of listarArquivos(path.resolve(ROOT, pasta))) {
      varrerArquivo(arquivo, excecoes, achados);
    }
  }
  achados.sort();
  for (const item of achados) process.stdout.write(`${item}\n`);
  process.exit(achados.length ? 1 : 0);
}

main();
