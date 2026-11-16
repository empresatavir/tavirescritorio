/**
 * Retrato do projeto: `.tavir/retrato.json` (camada 1, sem motor) e `context/RETRATO.md`,
 * escrito pelo Escritório a partir do retrato e dos sete documentos da leitura.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASSUNTO_ROTULO, PASSOS_LEITURA, type Achado, type Assunto, type Retrato } from '../../shared/absorcao';
import type { Levantamento } from './detectores';

export function retratoPath(root: string): string {
  return path.join(root, '.tavir', 'retrato.json');
}

export function lerRetrato(root: string): Retrato | null {
  try {
    const r = JSON.parse(fs.readFileSync(retratoPath(root), 'utf8'));
    return r && r.versao === 1 ? (r as Retrato) : null;
  } catch {
    return null;
  }
}

export function gravarRetrato(root: string, r: Retrato): void {
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  fs.writeFileSync(retratoPath(root), JSON.stringify(r, null, 2), 'utf8');
}

/** Monta o retrato da camada 1. Mantém passos, cobertura e aprovação de um retrato anterior. */
export function montarRetrato(projeto: string, lev: Levantamento, anterior?: Retrato | null): Retrato {
  return {
    versao: 1,
    projeto,
    lido_em: new Date().toISOString(),
    commit: lev.commit,
    stack: lev.stack,
    linguagens: lev.linguagens,
    servicos: lev.servicos,
    repositorios: lev.repositorios.map(({ remote, branch, ultimo }) => ({ remote, branch, ultimo })),
    monorepo: [...lev.monorepo, ...lev.submodulos.map((s) => `submódulo \`${s}\``)],
    dependencias: lev.dependencias.map(({ manifesto, total, principais }) => ({ manifesto, total, principais })),
    comandos: lev.comandos,
    env: lev.env,
    designSystem: lev.designSystem,
    cobertura: anterior?.cobertura?.length ? anterior.cobertura : coberturaVazia(lev.porPasta),
    passos: anterior?.passos?.length ? anterior.passos : PASSOS_LEITURA.map((p) => ({ id: p.id, situacao: 'a_fazer' as const, doc: p.doc })),
    ...(anterior?.aprovado ? { aprovado: anterior.aprovado } : {}),
  };
}

function coberturaVazia(porPasta: Record<string, number>): Retrato['cobertura'] {
  return pastasDaCobertura(porPasta).map(([pasta, arquivos]) => ({ pasta, arquivos, situacao: 'nao_lida' as const }));
}

/** Pastas de primeiro nível; dentro de src, app, lib, packages e apps, as de segundo nível no lugar da de primeiro. */
export function pastasDaCobertura(porPasta: Record<string, number>): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const [k, n] of Object.entries(porPasta)) {
    if (k.includes('/')) out.push([k, n]);
    else if (!Object.keys(porPasta).some((x) => x.startsWith(k + '/'))) out.push([k, n]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Cobertura pelas citações: `lida` com 3 citações ou 30% dos arquivos da pasta,
 * `parcial` com pelo menos uma, `nao_lida` com nenhuma.
 */
export function calcularCobertura(porPasta: Record<string, number>, citados: string[]): Retrato['cobertura'] {
  const unicos = Array.from(new Set(citados.map((c) => c.replace(/\\/g, '/').replace(/:\d+(-\d+)?$/, '').replace(/^\.\//, ''))));
  return pastasDaCobertura(porPasta).map(([pasta, arquivos]) => {
    const n = unicos.filter((c) => c === pasta || c.startsWith(pasta + '/')).length;
    const situacao = n >= 3 || (arquivos > 0 && n / arquivos >= 0.3) ? 'lida' : n >= 1 ? 'parcial' : 'nao_lida';
    return { pasta, arquivos, situacao };
  });
}

// ---------------------------------------------------------------- exclusão do git do cliente

export const EXCLUIR_DO_GIT = ['.tavir/', 'context/', 'memory/', 'qa/', '.env.project'];

/**
 * Acrescenta ao `.git/info/exclude` do cliente as pastas do Escritório, sem duplicar.
 * Não mexe no `.gitignore`. Sem `.git` na pasta, não faz nada.
 */
export function garantirExclude(root: string): { ok: boolean; added: string[] } {
  const gitDir = path.join(root, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) return { ok: false, added: [] };
  const file = path.join(gitDir, 'info', 'exclude');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const have = new Set(cur.split(/\r?\n/).map((l) => l.trim()));
  const added = EXCLUIR_DO_GIT.filter((e) => !have.has(e) && !have.has(e.replace(/\/$/, '')));
  if (added.length) {
    const sep = cur && !cur.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(file, `${cur}${sep}# TAVIR Escritório (fora do git do cliente)\n${added.join('\n')}\n`, 'utf8');
  }
  return { ok: true, added };
}

// ---------------------------------------------------------------- RETRATO.md

function primeiroParagrafo(root: string, doc: string): string {
  try {
    const t = fs.readFileSync(path.join(root, doc), 'utf8').replace(/\r/g, '');
    const para = t
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .find((b) => b && !b.startsWith('#') && !b.startsWith('>') && !b.startsWith('|'));
    return (para || '').replace(/\s+/g, ' ').slice(0, 500);
  } catch {
    return '';
  }
}

function provaCurta(a: Achado): string {
  const p = a.provas.find((x) => x.tipo === 'codigo') || a.provas[0];
  if (!p) return '';
  return `\`${p.arquivo}${p.linha ? `:${p.linha}` : ''}\``;
}

/** Escreve `context/RETRATO.md` sem motor. Devolve o texto. */
export function escreverRetratoMd(root: string, r: Retrato): string {
  const porAssunto = (a: Assunto) => r.servicos.filter((s) => s.assunto === a);
  const linhaServ = (s: Achado) => `- **${s.nome}**${s.grau === 'indicio' ? ' (a confirmar)' : ''} · ${provaCurta(s)}`;
  const listaAssunto = (a: Assunto, vazio: string) => {
    const l = porAssunto(a);
    return l.length ? l.map(linhaServ).join('\n') : `- ${vazio}`;
  };
  const oQueE = primeiroParagrafo(root, 'context/produto.md') || 'A leitura do produto ainda não foi feita.';
  const lines = [
    `# Retrato · ${r.projeto}`,
    '',
    `Lido em ${r.lido_em.slice(0, 16).replace('T', ' ')}${r.commit ? ` no commit \`${r.commit.slice(0, 10)}\`` : ''}.${r.aprovado ? ` Aprovado pelo Carlos em ${r.aprovado.em.slice(0, 10)}.` : ' Aguardando aprovação do Carlos.'}`,
    '',
    '## O que é',
    oQueE,
    '',
    '## Stack',
    r.stack.length ? r.stack.join(', ') : 'Não identificada.',
    r.linguagens.length ? `\nLinguagens: ${r.linguagens.slice(0, 6).map((l) => `${l.nome} (${l.arquivos})`).join(', ')}.` : '',
    '',
    '## Serviços',
    ...(Object.keys(ASSUNTO_ROTULO) as Assunto[])
      .filter((a) => porAssunto(a).length)
      .flatMap((a) => [`### ${ASSUNTO_ROTULO[a]}`, ...porAssunto(a).map(linhaServ), '']),
    r.servicos.length ? '' : 'Nenhum serviço externo encontrado nos arquivos.\n',
    '## Onde publica',
    listaAssunto('deploy', 'Nenhum alvo de deploy encontrado nos arquivos.'),
    '',
    '## Onde está o banco',
    listaAssunto('banco', 'Nenhum banco encontrado nos arquivos.'),
    '',
    '## Pagamento',
    listaAssunto('pagamento', 'Nenhum meio de pagamento encontrado nos arquivos.'),
    '',
    '## Comandos',
    r.comandos.length ? r.comandos.slice(0, 20).map((c) => `- \`${c.nome}\` (${c.manifesto}): \`${c.comando}\``).join('\n') : '- Nenhum script declarado nos manifestos.',
    '',
    '## Variáveis de ambiente (só nomes)',
    r.env.length ? r.env.map((e) => `\`${e}\``).join(', ') : 'Nenhuma.',
    '',
    '## Cobertura da leitura',
    r.cobertura.length ? r.cobertura.map((c) => `- \`${c.pasta}/\` · ${c.arquivos} arquivo(s) · ${c.situacao === 'lida' ? 'lida' : c.situacao === 'parcial' ? 'parcial' : 'não lida'}`).join('\n') : '- Sem pastas.',
    '',
    '## Documentos da leitura',
    ...PASSOS_LEITURA.map((p) => {
      const passo = r.passos.find((x) => x.id === p.id);
      const sit = !passo ? 'a fazer' : passo.situacao === 'ok' ? 'conferido' : passo.situacao === 'incompleto' ? `incompleto: ${passo.motivo || ''}` : passo.situacao === 'rodando' ? 'em leitura' : 'a fazer';
      const resumo = primeiroParagrafo(root, p.doc);
      return `- [${p.titulo}](${path.posix.relative('context', p.doc)}) · ${sit}${resumo ? `\n  ${resumo.slice(0, 240)}` : ''}`;
    }),
    '',
  ];
  const text = lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
  fs.mkdirSync(path.join(root, 'context'), { recursive: true });
  fs.writeFileSync(path.join(root, 'context', 'RETRATO.md'), text, 'utf8');
  return text;
}

/** Texto do retrato que vai para os agentes, com teto fixo. */
export function resumoDoRetrato(root: string, max = 3000): string {
  const r = lerRetrato(root);
  if (!r) return '';
  let md = '';
  try {
    md = fs.readFileSync(path.join(root, 'context', 'RETRATO.md'), 'utf8');
  } catch {
    md = '';
  }
  if (!md) {
    md = [
      `Stack: ${r.stack.join(', ') || 'não identificada'}`,
      `Serviços: ${r.servicos.map((s) => `${s.nome}${s.grau === 'indicio' ? ' (a confirmar)' : ''}`).join(', ') || 'nenhum'}`,
      `Comandos: ${r.comandos.slice(0, 8).map((c) => c.nome).join(', ') || 'nenhum'}`,
    ].join('\n');
  }
  // Tira a seção de cobertura e a lista de documentos: o agente lê os documentos se precisar.
  md = md.replace(/## Cobertura da leitura[\s\S]*?(?=\n## |$)/, '').replace(/\n{3,}/g, '\n\n').trim();
  return md.length <= max ? md : md.slice(0, max).replace(/\s+\S*$/, '') + ' […]';
}
