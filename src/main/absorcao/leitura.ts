/**
 * Camada 2 da absorção: sete passos de leitura pelo squad Product Lab, em só leitura.
 *
 * O agente devolve o documento; quem grava em context/ é o Escritório. Cada documento passa
 * pela checagem de citação (`conferirDocumento`). Reprovado roda de novo uma vez; reprovado
 * de novo fica `incompleto`, com o motivo, e o fluxo segue. O motor não aprova nada.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PASSOS_LEITURA, type Achado, type PassoLeitura, type Retrato } from '../../shared/absorcao';

// ---------------------------------------------------------------- checagem de citação

const EXT_ARQUIVO = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|css|scss|sass|less|html?|py|dart|ya?ml|toml|sql|env|example|lock|txt|prisma|sh|ps1|bat|go|rs|php|rb|vue|svelte|astro|xml|gradle|kts?|java|swift|plist|ini|cfg|conf|properties|graphql|gql|rules|tf|dockerfile|svg|png|jpe?g|webp|ico|csv|cs|c|h|cpp)$/i;
const DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|io|net|org|dev|app|co|br|ai|sh|cloud|me|so)(\/|$)/i;

export interface Conferencia {
  ok: boolean;
  faltando: string[];
  invalidos: string[];
  validos: string[];
  naoEncontrou: boolean;
  motivo: string;
}

function norm(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Trechos entre crases que parecem caminho de arquivo ou pasta do projeto. */
export function citacoes(texto: string, pacotes?: Set<string>): string[] {
  const out: string[] = [];
  for (const m of String(texto || '').matchAll(/`([^`\n]{2,200})`/g)) {
    const raw = m[1].trim();
    if (/\s/.test(raw) || /^https?:/i.test(raw) || /[*?<>{}$|]/.test(raw) || DOMINIO.test(raw)) continue;
    const semLinha = raw.replace(/:\d+(?:-\d+)?$/, '').replace(/^\.\//, '');
    if (/^\d+(\.\d+)*$/.test(semLinha)) continue;
    // Rota de URL (`/account`, `/signin/[id]`) não é arquivo: começa com barra e não tem extensão.
    if (/^\//.test(semLinha) && !EXT_ARQUIVO.test(semLinha)) continue;
    // Pacote com escopo (`@supabase/ssr`, `@types/node`) não é caminho.
    if (/^@[\w.-]+\/[\w.-]+$/.test(semLinha) && !EXT_ARQUIVO.test(semLinha)) continue;
    // Extensão solta (`.woff`, `.ttf`) não é arquivo.
    if (/^\.[a-z0-9]{1,6}$/i.test(semLinha) && !/^\.(env|npmrc|nvmrc)$/i.test(semLinha)) continue;
    // Subcaminho de dependência do package.json (`next/font`, `@supabase/ssr/dist`) é import, não pasta do projeto.
    if (pacotes && pacotes.size && !EXT_ARQUIVO.test(semLinha) && ehDePacote(semLinha, pacotes)) continue;
    const pareceArquivo = EXT_ARQUIVO.test(semLinha) || /^\.[\w.-]+$/.test(semLinha) || /(^|\/)(Dockerfile|Makefile|Procfile|Gemfile)$/.test(semLinha);
    const pareceCaminho = semLinha.includes('/') && /^[\w@.()[\]\-+/]+$/.test(semLinha);
    if (pareceArquivo || pareceCaminho) out.push(raw);
  }
  return out;
}

function ehDePacote(c: string, pacotes: Set<string>): boolean {
  const seg = c.split('/');
  const nome = c.startsWith('@') ? seg.slice(0, 2).join('/') : seg[0];
  return pacotes.has(nome);
}

/** Dependências declaradas no package.json da raiz (para não confundir import com pasta). */
export function pacotesDoProjeto(root: string): Set<string> {
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return new Set(Object.keys({ ...(pj.dependencies || {}), ...(pj.devDependencies || {}), ...(pj.peerDependencies || {}) }));
  } catch {
    return new Set();
  }
}

const IGNORAR_BUSCA = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.tavir', 'coverage', '.turbo', '.vercel']);
const nomesCache = new Map<string, { em: number; nomes: Set<string> }>();

/** Nomes de arquivo do projeto (sem node_modules e builds), para citação só pelo nome (`Button.tsx:56`). */
function nomesDoProjeto(root: string): Set<string> {
  const k = path.resolve(root);
  const c = nomesCache.get(k);
  if (c && Date.now() - c.em < 60000) return c.nomes;
  const nomes = new Set<string>();
  const fila = [k];
  let vistos = 0;
  while (fila.length && vistos < 20000) {
    const d = fila.pop()!;
    let ents: fs.Dirent[] = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      vistos++;
      if (e.isDirectory()) { if (!IGNORAR_BUSCA.has(e.name)) fila.push(path.join(d, e.name)); } else nomes.add(e.name);
    }
  }
  nomesCache.set(k, { em: Date.now(), nomes });
  return nomes;
}

function existeNoProjeto(root: string, cit: string): boolean {
  const rel = cit.replace(/:\d+(?:-\d+)?$/, '').replace(/^\.?\//, '').replace(/\/$/, '');
  if (!rel || rel.includes('..') || path.isAbsolute(rel)) return false;
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root))) return false;
  if (fs.existsSync(full)) return true;
  // Só o nome do arquivo, sem pasta: vale se esse arquivo existe em algum lugar do projeto.
  return !rel.includes('/') && EXT_ARQUIVO.test(rel) && nomesDoProjeto(root).has(rel);
}

/** Nome com ponto, sem barra e sem extensão conhecida (`.height-screen-helper`): pode ser classe CSS; só conta se existir. */
function ambiguo(cit: string): boolean {
  const rel = cit.replace(/:\d+(?:-\d+)?$/, '');
  return /^\.[\w.-]+$/.test(rel) && !EXT_ARQUIVO.test(rel);
}

/**
 * Seção obrigatória faltando, caminho citado inexistente ou menos de cinco citações válidas reprova.
 * «Não encontrei», dizendo onde procurou, vale no lugar das cinco citações.
 */
export function conferirDocumento(root: string, texto: string, secoes: string[]): Conferencia {
  const titulos = Array.from(String(texto || '').matchAll(/^#{2,3}\s+(.+?)\s*#*\s*$/gm)).map((m) => norm(m[1].replace(/[*_`]/g, '')));
  const faltando = secoes.filter((s) => !titulos.some((t) => t === norm(s) || t.startsWith(norm(s))));
  const cits = citacoes(texto, pacotesDoProjeto(root));
  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const c of cits) {
    if (existeNoProjeto(root, c)) validos.push(c);
    else if (!ambiguo(c)) invalidos.push(c);
  }
  const unicosValidos = Array.from(new Set(validos.map((v) => v.replace(/:\d+(?:-\d+)?$/, ''))));
  const naoEncontrou = /n[ãa]o encontrei/i.test(texto) && /(procurei|busquei|olhei|verifiquei|li)\b/i.test(texto);
  const motivos: string[] = [];
  if (faltando.length) motivos.push(`seção faltando: ${faltando.join(', ')}`);
  if (invalidos.length) motivos.push(`caminho que não existe: ${Array.from(new Set(invalidos)).slice(0, 8).join(', ')}`);
  if (unicosValidos.length < 5 && !naoEncontrou) motivos.push(`só ${unicosValidos.length} citação(ões) válida(s), mínimo 5`);
  return { ok: motivos.length === 0, faltando, invalidos: Array.from(new Set(invalidos)), validos, naoEncontrou, motivo: motivos.join('; ') };
}

/** Marca no documento as citações que não conferem. */
export function marcarCitacoesRuins(texto: string, invalidos: string[]): string {
  let out = texto;
  for (const c of invalidos) out = out.split('`' + c + '`').join('`' + c + '` (citação não conferida)');
  return out;
}

// ---------------------------------------------------------------- pedido

export interface RespostaMotor {
  ok: boolean;
  text: string;
  runId?: string;
  error?: string;
}

/** Função que fala com o motor em só leitura. Nos testes, uma função falsa. */
export type Perguntar = (req: { passo: PassoLeitura; pedido: string; onProgress?: (l: string) => void; registerKill?: (k: () => void) => void }) => Promise<RespostaMotor>;

function cortar(t: string, n: number): string {
  const s = String(t || '').trim();
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + ' […]';
}

function provaTxt(a: Achado): string {
  return a.provas.map((p) => `${p.tipo} \`${p.arquivo}${p.linha ? `:${p.linha}` : ''}\``).join(', ');
}

const OBJETIVO: Record<string, string> = {
  produto: 'Você é a Dora, de produto. Descreva o que o sistema faz para quem usa: o que é, para quem, os fluxos principais e as telas e rotas que existem no código.',
  arquitetura: 'Você é o Ari, arquiteto. Descreva como o código está organizado: visão geral, módulos, o caminho de um pedido do clique até o dado e onde dá para estender.',
  dados: 'Você é o Ari, arquiteto. Descreva os dados: onde fica o banco, tabelas e modelos, migrações e regras de acesso (RLS, políticas, middlewares).',
  design: 'Você é o Enzo, de design. Descreva o design system real do projeto: cores, tipografia, espaçamento e grade, componentes e padrões de tela, com os arquivos onde cada coisa está definida.',
  ambiente: 'Você é o Ari, arquiteto. Descreva o ambiente: como instalar e rodar, testes, build e deploy, variáveis necessárias (só os nomes) e CI.',
  integracoes: 'Você é o Ari, arquiteto. Liste os serviços externos que o código usa de verdade, com a prova no código, e os que parecem existir mas não são usados.',
  riscos: 'Você é a Dora, de produto. Aponte o que está quebrado, o que não tem teste, o que está desatualizado e o que é perigoso, com a prova no código.',
};

export function montarPedido(opts: {
  passo: PassoLeitura;
  retrato: Retrato;
  anteriores: Array<{ titulo: string; texto: string }>;
  correcoes?: string;
  falhas?: string;
  /** Chamados que já estão na fila (`CH-0001 · título`), para Riscos não abrir o mesmo problema com outras palavras. */
  jaAbertos?: string[];
}): string {
  const { passo, retrato } = opts;
  const linhas: string[] = [];
  linhas.push(`${OBJETIVO[passo.id] || `Você é ${passo.papel}.`} O documento vai para \`${passo.doc}\`.`);
  linhas.push(
    '',
    '## Regras',
    '- Só leitura: não crie, edite nem apague arquivos. O Escritório grava o documento.',
    '- Toda afirmação cita o arquivo entre crases, com caminho relativo à raiz do projeto: `caminho/arquivo.ext` ou `caminho/arquivo.ext:linha`. Cite só caminhos que você abriu.',
    '- «Não encontrei» vale, desde que diga onde procurou (pastas e arquivos).',
    '- Nunca copie valor de segredo, token, senha ou chave. Variável de ambiente só pelo nome.',
    `- Responda só com o documento, em português do Brasil, usando exatamente estes títulos de seção (##): ${passo.secoes.map((s) => `«${s}»`).join(', ')}.`,
  );
  const doAssunto = retrato.servicos.filter((s) => passo.assuntos.includes(s.assunto));
  linhas.push('', '## O que a leitura sem motor já encontrou');
  linhas.push(`- Stack: ${retrato.stack.join(', ') || 'não identificada'}`);
  if (retrato.linguagens.length) linhas.push(`- Linguagens: ${retrato.linguagens.slice(0, 6).map((l) => `${l.nome} (${l.arquivos})`).join(', ')}`);
  if (passo.id === 'ambiente' || passo.id === 'arquitetura') {
    if (retrato.comandos.length) linhas.push(`- Comandos: ${retrato.comandos.slice(0, 12).map((c) => `\`${c.nome}\` em \`${c.manifesto}\``).join(', ')}`);
    if (retrato.env.length) linhas.push(`- Variáveis (só nomes): ${retrato.env.slice(0, 40).join(', ')}`);
    if (retrato.monorepo.length) linhas.push(`- Monorepo: ${retrato.monorepo.join('; ')}`);
  }
  if (passo.id === 'design' && retrato.designSystem.sinais.length) linhas.push(`- Sinais de design system: ${retrato.designSystem.sinais.join('; ')}`);
  if (passo.id === 'arquitetura' || passo.id === 'produto') {
    const top = retrato.cobertura.slice(0, 30).map((c) => `\`${c.pasta}/\` (${c.arquivos})`).join(', ');
    if (top) linhas.push(`- Pastas: ${top}`);
  }
  for (const a of doAssunto) linhas.push(`- ${a.nome} (${a.grau === 'confirmado' ? 'confirmado' : 'indício'}): ${provaTxt(a)}`);
  if (opts.anteriores.length) {
    linhas.push('', '## Documentos dos passos anteriores (trecho)');
    for (const d of opts.anteriores) linhas.push(`### ${d.titulo}`, cortar(d.texto, 3000), '');
  }
  if (passo.id === 'integracoes') {
    const ind = retrato.servicos.filter((s) => s.grau === 'indicio');
    linhas.push('', '## Indícios para confirmar ou descartar');
    if (ind.length) {
      linhas.push('Para cada um, diga «confirmado» com a linha de código que usa o serviço, ou «descartado» dizendo onde procurou. Na seção «Serviços confirmados», ponha o nome do serviço e a citação do código na mesma linha.');
      for (const a of ind) linhas.push(`- ${a.nome}: ${provaTxt(a)}`);
    } else linhas.push('Nenhum indício pendente. Confira os serviços confirmados acima e procure outros que a leitura sem motor não pegou.');
  }
  if (passo.id === 'riscos') {
    linhas.push(
      '',
      '## Problemas para a fila de chamados',
      'No fim do documento, escreva até oito problemas reais, um bloco por problema, neste formato exato (tipo: bug ou melhoria; prioridade: urgente, alta, media ou baixa):',
      '',
      'CHAMADO:',
      'tipo: bug',
      'titulo: Frase curta do problema',
      'prioridade: alta',
      'acontece: O que acontece hoje.',
      'esperado: O que deveria acontecer.',
      'reproduzir: Como ver o problema.',
      'evidencia: caminho/arquivo.ext:linha',
    );
    if (opts.jaAbertos?.length) {
      linhas.push(
        '',
        '## Chamados que já estão na fila',
        'Não abra de novo nenhum destes, nem com outras palavras. Escreva bloco só para problema que não está aqui.',
        ...opts.jaAbertos.slice(0, 40).map((t) => `- ${cortar(t, 160)}`),
      );
    }
  }
  if (opts.correcoes?.trim()) {
    linhas.push('', '## Correções do Carlos (prevalecem sobre qualquer leitura sua)', cortar(opts.correcoes, 3000));
  }
  if (opts.falhas?.trim()) {
    linhas.push('', '## A primeira versão foi reprovada na checagem', opts.falhas, 'Corrija: cite só caminhos que existem e use todos os títulos pedidos.');
  }
  return linhas.join('\n');
}

/** Tira cercas de código e conversa em volta do documento. */
export function limparDocumento(texto: string, passo: PassoLeitura): string {
  let t = String(texto || '').replace(/\r/g, '').trim();
  const cerca = t.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  if (cerca) t = cerca[1].trim();
  if (!/^#\s/.test(t)) t = `# ${passo.titulo}\n\n${t}`;
  return t + '\n';
}

// ---------------------------------------------------------------- passo

export interface ResultadoPasso {
  situacao: 'ok' | 'incompleto';
  motivo?: string;
  runId?: string;
  texto: string;
  citados: string[];
}

export async function lerPasso(opts: {
  root: string;
  passo: PassoLeitura;
  retrato: Retrato;
  perguntar: Perguntar;
  correcoes?: string;
  jaAbertos?: string[];
  onLine?: (l: string) => void;
  registerKill?: (k: () => void) => void;
  parado?: () => boolean;
}): Promise<ResultadoPasso> {
  const { root, passo, retrato } = opts;
  const anteriores = PASSOS_LEITURA.slice(0, PASSOS_LEITURA.findIndex((p) => p.id === passo.id))
    .map((p) => {
      try {
        return { titulo: p.titulo, texto: fs.readFileSync(path.join(root, p.doc), 'utf8') };
      } catch {
        return null;
      }
    })
    .filter((x): x is { titulo: string; texto: string } => !!x);
  let falhas = '';
  let ultima: { texto: string; conf: Conferencia; runId?: string } | null = null;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    if (opts.parado?.()) throw new Error('parado');
    const pedido = montarPedido({ passo, retrato, anteriores, correcoes: opts.correcoes, falhas, jaAbertos: opts.jaAbertos });
    opts.onLine?.(tentativa === 1 ? `${passo.dono}: lendo` : `${passo.dono}: segunda tentativa`);
    const res = await opts.perguntar({ passo, pedido, onProgress: opts.onLine, registerKill: opts.registerKill });
    if (opts.parado?.()) throw new Error('parado');
    if (!res.ok) {
      falhas = `O motor falhou: ${cortar(res.text || res.error || '', 400)}`;
      ultima = { texto: '', conf: { ok: false, faltando: passo.secoes, invalidos: [], validos: [], naoEncontrou: false, motivo: falhas }, runId: res.runId };
      continue;
    }
    const texto = limparDocumento(res.text, passo);
    const conf = conferirDocumento(root, texto, passo.secoes);
    ultima = { texto, conf, runId: res.runId };
    if (conf.ok) break;
    falhas = `Motivo: ${conf.motivo}.`;
    opts.onLine?.(`Checagem reprovou: ${conf.motivo}`);
  }
  const fim = ultima!;
  const destino = path.join(root, passo.doc);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  if (fim.conf.ok) {
    fs.writeFileSync(destino, fim.texto, 'utf8');
    return { situacao: 'ok', runId: fim.runId, texto: fim.texto, citados: fim.conf.validos };
  }
  const corpo = fim.texto
    ? marcarCitacoesRuins(fim.texto, fim.conf.invalidos)
    : `# ${passo.titulo}\n\nO motor não devolveu o documento.\n`;
  fs.writeFileSync(destino, `> Passo incompleto: ${fim.conf.motivo}\n\n${corpo}`, 'utf8');
  return { situacao: 'incompleto', motivo: fim.conf.motivo, runId: fim.runId, texto: corpo, citados: fim.conf.validos };
}

// ---------------------------------------------------------------- integrações

function secao(texto: string, titulo: string): string {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const ini = linhas.findIndex((l) => /^#{2,3}\s/.test(l) && norm(l.replace(/^#+\s*/, '')).startsWith(norm(titulo)));
  if (ini < 0) return '';
  const fim = linhas.findIndex((l, i) => i > ini && /^#{1,3}\s/.test(l));
  return linhas.slice(ini + 1, fim < 0 ? undefined : fim).join('\n');
}

const CODIGO = /\.(ts|tsx|js|jsx|mjs|cjs|py|dart|go|php|rb|vue|svelte|astro|kt|java|swift|cs|rs|html?)$/i;

/**
 * Atualiza o grau dos serviços pelo documento de integrações. Só vira `confirmado` o indício
 * que tiver, na seção «Serviços confirmados», citação de arquivo de código que existe.
 */
export function aplicarIntegracoes(root: string, retrato: Retrato, texto: string): Retrato {
  const conf = secao(texto, 'Serviços confirmados');
  if (!conf) return retrato;
  const linhas = conf.split('\n');
  const servicos = retrato.servicos.map((a) => {
    if (a.grau === 'confirmado') return a;
    const nome = norm(a.nome);
    const curto = norm(a.nome.split(/[ (]/)[0]);
    for (const l of linhas) {
      const ln = norm(l);
      if (!ln.includes(nome) && !(curto.length >= 4 && ln.includes(curto))) continue;
      const cod = citacoes(l).filter((c) => CODIGO.test(c.replace(/:\d+(?:-\d+)?$/, '')) && existeNoProjeto(root, c));
      if (!cod.length) continue;
      const [arquivo, linha] = cod[0].split(':');
      return { ...a, grau: 'confirmado' as const, provas: [...a.provas, { tipo: 'codigo' as const, arquivo, ...(linha ? { linha: Number(linha) } : {}), trecho: 'conferido na leitura de integrações' }] };
    }
    return a;
  });
  return { ...retrato, servicos };
}
