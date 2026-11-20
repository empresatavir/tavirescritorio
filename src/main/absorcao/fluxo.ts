/**
 * Absorção como sequência retomável, com estado em `.tavir/absorcao.json`:
 * preparar → detectores → sete passos de leitura → retrato → acessos → gate.
 *
 * Quem fecha é o gate do Carlos (`decidirRetrato`). Resposta de motor nunca aprova retrato.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escritaDoEscritorio } from '../tavirGuarda';
import { PASSOS_LEITURA, type Retrato } from '../../shared/absorcao';
import { detectar } from './detectores';
import { calcularCobertura, escreverRetratoMd, gravarRetrato, lerRetrato, montarRetrato } from './retrato';
import { aplicarIntegracoes, citacoes, lerPasso, type Perguntar } from './leitura';
import * as pfs from '../project-fs';
import { converseWithIrisAgent } from '../irisAgent';
import { gerarCartoes } from '../acessos';
import { chamadosDaAbsorcao, listarChamados } from '../chamados';

export type EtapaFluxo = 'preparar' | 'detectores' | 'leitura' | 'retrato' | 'acessos' | 'gate';
export const ETAPAS_FLUXO: EtapaFluxo[] = ['preparar', 'detectores', 'leitura', 'retrato', 'acessos', 'gate'];

export interface Pendencia {
  id: 'qa' | 'seg';
  titulo: string;
  situacao: 'a_fazer' | 'rodando' | 'feito';
  runId?: string;
  em?: string;
}

export interface EstadoAbsorcao {
  versao: 1;
  iniciado_em: string;
  atualizado_em: string;
  origem?: { tipo: 'link' | 'pasta'; valor: string };
  etapas: Record<EtapaFluxo, { situacao: 'a_fazer' | 'rodando' | 'ok' | 'falhou'; inicio?: string; fim?: string; runId?: string; nota?: string }>;
  /** Passo da leitura em curso (id de PASSOS_LEITURA). */
  passoAtual?: string;
  /** Passos pedidos de novo pelo Carlos ao reprovar o retrato. */
  refazer?: string[];
  decisao?: { em: string; decisao: 'aprovado' | 'reprovado'; nota?: string };
  /** A5: rodada de «Atualizar retrato» de um retrato já aprovado (o gate não volta a pedir decisão). */
  atualizando?: { de: string | null; para: string | null; em: string };
  pendencias: Pendencia[];
  log: string[];
}

export function absorcaoPath(root: string): string {
  return path.join(root, '.tavir', 'absorcao.json');
}

export function novoEstado(origem?: EstadoAbsorcao['origem']): EstadoAbsorcao {
  const now = new Date().toISOString();
  const etapas = {} as EstadoAbsorcao['etapas'];
  for (const e of ETAPAS_FLUXO) etapas[e] = { situacao: 'a_fazer' };
  return {
    versao: 1,
    iniciado_em: now,
    atualizado_em: now,
    ...(origem ? { origem } : {}),
    etapas,
    pendencias: [
      { id: 'qa', titulo: 'Retrato inicial de QA', situacao: 'a_fazer' },
      { id: 'seg', titulo: 'Retrato inicial de segurança', situacao: 'a_fazer' },
    ],
    log: [],
  };
}

export function lerEstado(root: string): EstadoAbsorcao | null {
  try {
    const e = JSON.parse(fs.readFileSync(absorcaoPath(root), 'utf8'));
    if (!e || e.versao !== 1) return null;
    for (const k of ETAPAS_FLUXO) if (!e.etapas?.[k]) e.etapas[k] = { situacao: 'a_fazer' };
    if (!Array.isArray(e.pendencias)) e.pendencias = [];
    if (!Array.isArray(e.log)) e.log = [];
    return e as EstadoAbsorcao;
  } catch {
    return null;
  }
}

export function gravarEstado(root: string, e: EstadoAbsorcao): void {
  e.atualizado_em = new Date().toISOString();
  e.log = e.log.slice(-200);
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  fs.writeFileSync(absorcaoPath(root), JSON.stringify(e, null, 2), 'utf8');
  escritaDoEscritorio(absorcaoPath(root));
}

/** Primeira etapa que ainda não fechou: de onde a absorção retoma. */
export function etapaDeRetomada(e: EstadoAbsorcao): EtapaFluxo | null {
  for (const k of ETAPAS_FLUXO) if (e.etapas[k].situacao !== 'ok') return k;
  return null;
}

/** Visão para a tela: retrato, estado do fluxo e pendências. */
export function visaoDaAbsorcao(root: string): { retrato: Retrato | null; estado: EstadoAbsorcao | null; retratoMd: string; rodando: boolean } {
  let retratoMd = '';
  try {
    retratoMd = fs.readFileSync(path.join(root, 'context', 'RETRATO.md'), 'utf8');
  } catch {
    retratoMd = '';
  }
  const estado = lerEstado(root);
  const retrato = lerRetrato(root);
  const rodando = absorcaoRodando(root);
  // App fechado no meio: o que ficou «rodando» sem processo vivo aparece como parado e retomável.
  if (estado && !rodando) {
    for (const k of ETAPAS_FLUXO) {
      if (estado.etapas[k].situacao === 'rodando') estado.etapas[k] = { ...estado.etapas[k], situacao: 'falhou', nota: 'Interrompida. Retomar continua do passo em que estava.' };
    }
    if (retrato) retrato.passos = retrato.passos.map((p) => (p.situacao === 'rodando' ? { id: p.id, situacao: 'a_fazer' as const, doc: p.doc } : p));
  }
  return { retrato, estado, retratoMd, rodando };
}

// ---------------------------------------------------------------- execução

export interface EventoAbsorcao {
  type: 'thought' | 'done' | 'error';
  content: string;
  passo?: string;
  etapa?: EtapaFluxo;
  refresh?: boolean;
}

const vivos = new Map<string, { parado: boolean; kill?: () => void }>();

/** Chamados ainda na fila (não concluídos nem recusados), como `CH-0001 · título`. */
function chamadosNaFila(root: string): string[] {
  try {
    return listarChamados(root)
      .filter((c) => c.situacao !== 'concluido' && c.situacao !== 'recusado')
      .map((c) => `${c.id} · ${c.titulo}`);
  } catch {
    return [];
  }
}

export function absorcaoRodando(root: string): boolean {
  return vivos.has(path.resolve(root));
}

/** Motor real em só leitura, com o motor do projeto. */
export function perguntarAoMotor(root: string): Perguntar {
  return async ({ passo, pedido, onProgress, registerKill }) => {
    const eng = pfs.projectEngineSpec(root);
    const rec = pfs.resolveProjectRecord(root);
    const r = await converseWithIrisAgent({
      workspace: root,
      question: pedido,
      projectName: rec.name,
      stageName: `Absorção · ${passo.titulo}`,
      stageOwner: passo.dono,
      engineId: eng.id,
      model: eng.model,
      effort: eng.effort,
      finished: false,
      alterationsOpen: false,
      asChangeRequest: false,
      recent: [],
      timeoutMs: 900000,
      runKind: 'absorcao',
      runLabel: `Absorção · ${passo.titulo}`,
      onProgress,
      registerKill,
    });
    return { ok: r.ok, text: r.text, runId: r.runId, error: r.error };
  };
}

function lerCorrecoes(root: string): string {
  try {
    return fs.readFileSync(path.join(root, 'context', 'correcoes.md'), 'utf8');
  } catch {
    return '';
  }
}

/** Citações válidas de todos os documentos da leitura (para a cobertura). */
export function citadosNosDocumentos(root: string): string[] {
  const out: string[] = [];
  for (const p of PASSOS_LEITURA) {
    let t = '';
    try {
      t = fs.readFileSync(path.join(root, p.doc), 'utf8');
    } catch {
      continue;
    }
    for (const c of citacoes(t)) {
      const rel = c.replace(/:\d+(?:-\d+)?$/, '').replace(/^\.\//, '').replace(/\/$/, '');
      if (rel && !rel.includes('..') && fs.existsSync(path.join(root, rel))) out.push(rel);
    }
  }
  return out;
}

/**
 * Roda (ou retoma) a absorção: detectores → sete passos → retrato → acessos → gate.
 * Passos já fechados (ok ou incompleto) não rodam de novo, a não ser os pedidos em `refazer`.
 */
export async function rodarAbsorcao(
  rootIn: string,
  opts: { perguntar?: Perguntar; onEvent?: (e: EventoAbsorcao) => void; nome?: string } = {},
): Promise<{ ok: boolean; error?: string; parado?: boolean }> {
  const root = path.resolve(rootIn);
  if (vivos.has(root)) return { ok: false, error: 'A leitura deste projeto já está rodando.' };
  const live: { parado: boolean; kill?: () => void } = { parado: false };
  vivos.set(root, live);
  const emit = (e: EventoAbsorcao) => {
    try {
      opts.onEvent?.(e);
    } catch {}
  };
  const perguntar = opts.perguntar || perguntarAoMotor(root);
  let est = lerEstado(root) || novoEstado();
  const now = () => new Date().toISOString();
  const nota = (l: string) => {
    est.log.push(`${now().slice(11, 19)} ${l}`);
  };
  try {
    if (est.etapas.detectores.situacao !== 'ok') {
      est.etapas.detectores = { situacao: 'rodando', inicio: now() };
      gravarEstado(root, est);
      const lev = detectar(root);
      gravarRetrato(root, montarRetrato(opts.nome || lerRetrato(root)?.projeto || path.basename(root), lev, lerRetrato(root)));
      est.etapas.detectores = { situacao: 'ok', inicio: est.etapas.detectores.inicio, fim: now() };
    }
    let ret = lerRetrato(root);
    if (!ret) throw new Error('Retrato da camada 1 não encontrado.');
    const refazer = new Set(est.refazer || []);
    est.etapas.leitura = { situacao: 'rodando', inicio: est.etapas.leitura.inicio || now() };
    gravarEstado(root, est);
    const correcoes = lerCorrecoes(root);
    for (const passo of PASSOS_LEITURA) {
      const atual = ret.passos.find((x) => x.id === passo.id);
      if (atual && (atual.situacao === 'ok' || atual.situacao === 'incompleto') && !refazer.has(passo.id)) continue;
      if (live.parado) throw new Error('parado');
      ret.passos = PASSOS_LEITURA.map((p) => (p.id === passo.id ? { id: p.id, situacao: 'rodando' as const, doc: p.doc } : ret!.passos.find((x) => x.id === p.id) || { id: p.id, situacao: 'a_fazer' as const, doc: p.doc }));
      est.passoAtual = passo.id;
      nota(`${passo.titulo}: começou`);
      gravarRetrato(root, ret);
      gravarEstado(root, est);
      emit({ type: 'thought', content: `${passo.dono}: lendo`, passo: passo.id, etapa: 'leitura', refresh: true });
      const r = await lerPasso({
        root,
        passo,
        retrato: ret,
        perguntar,
        correcoes,
        jaAbertos: passo.id === 'riscos' ? chamadosNaFila(root) : undefined,
        onLine: (l) => emit({ type: 'thought', content: l, passo: passo.id, etapa: 'leitura' }),
        registerKill: (k) => {
          live.kill = k;
        },
        parado: () => live.parado,
      });
      ret = lerRetrato(root) || ret;
      const passoRet = { id: passo.id, situacao: r.situacao, doc: passo.doc, ...(r.motivo ? { motivo: r.motivo } : {}), ...(r.runId ? { runId: r.runId } : {}) };
      ret.passos = ret.passos.map((x) => (x.id === passo.id ? passoRet : x));
      if (passo.id === 'integracoes') ret = aplicarIntegracoes(root, ret, r.texto);
      if (passo.id === 'riscos') {
        try {
          // Problemas apontados viram chamados «aberto» (B1).
          chamadosDaAbsorcao(root, r.texto, r.runId);
        } catch (err) {
          nota(`Chamados da leitura de riscos: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      gravarRetrato(root, ret);
      refazer.delete(passo.id);
      est.refazer = Array.from(refazer);
      nota(`${passo.titulo}: ${r.situacao === 'ok' ? 'conferido' : `incompleto (${r.motivo})`}`);
      gravarEstado(root, est);
      emit({ type: 'thought', content: r.situacao === 'ok' ? 'Documento conferido.' : `Incompleto: ${r.motivo}`, passo: passo.id, etapa: 'leitura', refresh: true });
    }
    est.passoAtual = undefined;
    est.etapas.leitura = { situacao: 'ok', inicio: est.etapas.leitura.inicio, fim: now() };
    gravarEstado(root, est);

    est.etapas.retrato = { situacao: 'rodando', inicio: now() };
    const lev = detectar(root);
    ret.cobertura = calcularCobertura(lev.porPasta, citadosNosDocumentos(root));
    ret.lido_em = now();
    gravarRetrato(root, ret);
    escreverRetratoMd(root, ret);
    est.etapas.retrato = { situacao: 'ok', inicio: est.etapas.retrato.inicio, fim: now() };
    gravarEstado(root, est);

    est.etapas.acessos = { situacao: 'rodando', inicio: now() };
    try {
      gerarCartoes(root);
    } catch (err) {
      nota(`Cartões de acesso: ${err instanceof Error ? err.message : String(err)}`);
    }
    est.etapas.acessos = { situacao: 'ok', inicio: est.etapas.acessos.inicio, fim: now() };
    if (est.atualizando && lerRetrato(root)?.aprovado) {
      // Atualização de um retrato aprovado: o gate continua valendo; o que mudou fica no log e no RETRATO.md.
      nota(`Retrato atualizado do commit ${String(est.atualizando.de || '').slice(0, 10)} para ${String(est.atualizando.para || '').slice(0, 10)}.`);
      est.etapas.gate = { situacao: 'ok', fim: now(), nota: 'Retrato aprovado antes; atualizado pelos detectores e pelos passos afetados.' };
      delete est.atualizando;
      gravarEstado(root, est);
      emit({ type: 'done', content: 'Retrato atualizado.', etapa: 'gate', refresh: true });
      return { ok: true };
    }
    est.etapas.gate = { situacao: 'a_fazer', nota: 'Aguardando a decisão do Carlos.' };
    nota('Retrato pronto. Aguardando o gate do Carlos.');
    gravarEstado(root, est);
    emit({ type: 'done', content: 'Retrato pronto para o gate.', etapa: 'gate', refresh: true });
    return { ok: true };
  } catch (err) {
    const parado = live.parado || (err instanceof Error && err.message === 'parado');
    est = lerEstado(root) || est;
    const ret = lerRetrato(root);
    if (ret) {
      ret.passos = ret.passos.map((x) => (x.situacao === 'rodando' ? { id: x.id, situacao: 'a_fazer' as const, doc: x.doc } : x));
      gravarRetrato(root, ret);
    }
    const msg = err instanceof Error ? err.message : String(err);
    for (const k of ETAPAS_FLUXO) {
      if (est.etapas[k].situacao === 'rodando') est.etapas[k] = { ...est.etapas[k], situacao: 'falhou', nota: parado ? 'Parada pelo Carlos.' : msg.slice(0, 300) };
    }
    est.log.push(`${now().slice(11, 19)} ${parado ? 'Leitura parada pelo Carlos.' : `Falhou: ${msg}`}`);
    gravarEstado(root, est);
    emit({ type: parado ? 'done' : 'error', content: parado ? 'Leitura parada. Retomar continua do passo em que estava.' : msg, refresh: true });
    return { ok: false, parado, error: parado ? undefined : msg };
  } finally {
    vivos.delete(root);
  }
}

/** «Parar»: mata o motor do passo atual e deixa o fluxo retomável. */
export function pararAbsorcao(rootIn: string): { ok: boolean } {
  const live = vivos.get(path.resolve(rootIn));
  if (!live) return { ok: false };
  live.parado = true;
  try {
    live.kill?.();
  } catch {}
  return { ok: true };
}

type GanchosGate = {
  encerrar: (root: string, nota: string) => unknown;
  registrar: (root: string, e: { kind: 'absorcao'; stage: string; decision: 'aprovado' | 'reprovado'; note?: string }) => unknown;
};

/**
 * Gate do retrato. Aprovado: só com a leitura e o retrato prontos; encerra o projeto pelo gancho do
 * project-fs (esteira coberta, status done, trilho liberado). Reprovado: a nota vai para
 * context/correcoes.md e os passos escolhidos (ou os sete) voltam para «a fazer».
 */
export function decidirRetrato(rootIn: string, decisao: 'aprovado' | 'reprovado', notaIn = '', refazerIn: string[] = [], ganchos?: GanchosGate): { ok: boolean; error?: string } {
  const root = path.resolve(rootIn);
  if (vivos.has(root)) return { ok: false, error: 'A leitura ainda está rodando.' };
  const est = lerEstado(root);
  const ret = lerRetrato(root);
  if (!est || !ret) return { ok: false, error: 'Este projeto não tem absorção registrada.' };
  const nota = String(notaIn || '').trim();
  let g = ganchos;
  if (!g) {
    g = { encerrar: (r, n) => pfs.encerrarPelaAbsorcao(r, n), registrar: (r, e) => pfs.registrarDecisao(r, e) };
  }
  const now = new Date().toISOString();
  if (decisao === 'aprovado') {
    if (est.etapas.leitura.situacao !== 'ok' || est.etapas.retrato.situacao !== 'ok') {
      return { ok: false, error: 'A leitura ainda não terminou. O retrato só pode ser aprovado depois dos sete passos.' };
    }
    ret.aprovado = { em: now, ...(nota ? { nota } : {}) };
    gravarRetrato(root, ret);
    escreverRetratoMd(root, ret);
    g.encerrar(root, nota);
    est.etapas.gate = { situacao: 'ok', fim: now, nota: 'Aprovado pelo Carlos.' };
    est.decisao = { em: now, decisao, ...(nota ? { nota } : {}) };
    est.log.push(`${now.slice(11, 19)} Retrato aprovado pelo Carlos.`);
    gravarEstado(root, est);
    return { ok: true };
  }
  if (!nota) return { ok: false, error: 'Escreva o que está errado no retrato.' };
  const validos = PASSOS_LEITURA.map((p) => p.id);
  const refazer = refazerIn.filter((id) => validos.includes(id));
  const alvo = refazer.length ? refazer : validos;
  const arq = path.join(root, 'context', 'correcoes.md');
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const prev = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '# Correções do Carlos ao retrato\n\nO que está aqui prevalece sobre o texto dos agentes.\n';
  fs.writeFileSync(arq, `${prev.trimEnd()}\n\n## ${now.slice(0, 16).replace('T', ' ')}\n\n${nota}\n\nPassos refeitos: ${alvo.join(', ')}\n`, 'utf8');
  g.registrar(root, { kind: 'absorcao', stage: 'Retrato do projeto', decision: 'reprovado', note: nota });
  delete ret.aprovado;
  ret.passos = ret.passos.map((p) => (alvo.includes(p.id) ? { id: p.id, situacao: 'a_fazer' as const, doc: p.doc } : p));
  gravarRetrato(root, ret);
  est.refazer = alvo;
  for (const k of ['leitura', 'retrato', 'acessos', 'gate'] as EtapaFluxo[]) est.etapas[k] = { situacao: 'a_fazer' };
  est.decisao = { em: now, decisao, nota };
  est.log.push(`${now.slice(11, 19)} Retrato reprovado: ${nota.slice(0, 200)}`);
  gravarEstado(root, est);
  return { ok: true };
}

/** Pendência «a fazer» de QA ou segurança (D1): roda o portão e marca feita quando termina. */
export async function rodarPendencia(rootIn: string, id: 'qa' | 'seg'): Promise<{ ok: boolean; error?: string; runId?: string }> {
  const root = path.resolve(rootIn);
  const est = lerEstado(root);
  if (!est) return { ok: false, error: 'Este projeto não tem pendências de absorção.' };
  const pend = est.pendencias.find((p) => p.id === id);
  if (!pend) return { ok: false, error: 'Pendência não encontrada.' };
  pend.situacao = 'rodando';
  gravarEstado(root, est);
  const res = id === 'qa' ? await pfs.runProjectQa(root, { label: 'Retrato inicial' }) : await pfs.runProjectSeg(root, { label: 'Retrato inicial' });
  const fresh = lerEstado(root) || est;
  const p2 = fresh.pendencias.find((p) => p.id === id);
  if (p2) {
    if (res.ok && res.run) {
      p2.situacao = 'feito';
      p2.runId = res.run.id;
      p2.em = new Date().toISOString();
    } else p2.situacao = 'a_fazer';
  }
  gravarEstado(root, fresh);
  return res.ok ? { ok: true, runId: res.run?.id } : { ok: false, error: res.error };
}

// ------------------------------------------------------------------ A5: atualizar retrato

function gitSaida(args: string[], cwd: string): string {
  try {
    return require('node:child_process').execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim();
  } catch {
    return '';
  }
}

/** Compara o commit do retrato com o HEAD do projeto. */
export function retratoDesatualizado(rootIn: string): { mudou: boolean; de: string | null; para: string | null; arquivos: string[]; passos: string[] } {
  const root = path.resolve(rootIn);
  const r = lerRetrato(root);
  const head = gitSaida(['rev-parse', 'HEAD'], root) || null;
  if (!r || !r.commit || !head || head === r.commit) return { mudou: false, de: r?.commit || null, para: head, arquivos: [], passos: [] };
  const arquivos = gitSaida(['diff', '--name-only', r.commit, head], root).split(/\r?\n/).map((x) => x.trim()).filter(Boolean).filter((f) => !/^(\.tavir|context|memory|qa)\//.test(f));
  return { mudou: arquivos.length > 0, de: r.commit, para: head, arquivos: arquivos.slice(0, 500), passos: passosAfetados(arquivos) };
}

/** Passos da leitura que olham para os arquivos mudados (pelas pastas e tipos de arquivo). */
export function passosAfetados(arquivos: string[]): string[] {
  const p = new Set<string>();
  for (const raw of arquivos) {
    const f = raw.toLowerCase();
    const codigo = /\.(tsx?|jsx?|mjs|cjs|py|dart|go|rs|php|rb|vue|svelte|astro|kt|swift|java|cs)$/.test(f);
    if (codigo) { p.add('arquitetura'); p.add('integracoes'); }
    if (/(^|\/)(app|pages|routes|screens|views)\//.test(f) || /readme/.test(f)) p.add('produto');
    if (/\.sql$|migrat|schema|prisma|supabase\/|drizzle|models?\//.test(f)) p.add('dados');
    if (/\.(css|scss|sass|less)$|tailwind|theme|tokens|components?\/|styles?\//.test(f)) p.add('design');
    if (/(^|\/)(package\.json|pubspec\.yaml|requirements\.txt|pyproject\.toml|go\.mod|composer\.json|gemfile|dockerfile|docker-compose|\.env|vercel\.json|netlify\.toml|wrangler|fly\.toml|\.github\/)/.test(f) || /config\.(t|j|m)s$/.test(f)) { p.add('ambiente'); p.add('integracoes'); }
  }
  if (p.size) p.add('riscos');
  return PASSOS_LEITURA.map((x) => x.id).filter((id) => p.has(id));
}

/**
 * «Atualizar retrato»: roda os detectores de novo e refaz só os passos afetados pelos
 * arquivos que mudaram desde o commit do retrato. Os cartões de acesso ganham os serviços novos.
 */
export async function atualizarRetrato(rootIn: string, opts: { perguntar?: Perguntar; onEvent?: (e: EventoAbsorcao) => void } = {}): Promise<{ ok: boolean; error?: string; passos?: string[] }> {
  const root = path.resolve(rootIn);
  if (vivos.has(root)) return { ok: false, error: 'A leitura deste projeto já está rodando.' };
  const d = retratoDesatualizado(root);
  if (!d.mudou) return { ok: false, error: 'O retrato já está no commit atual.' };
  const est = lerEstado(root) || novoEstado();
  est.etapas.detectores = { situacao: 'a_fazer' };
  est.refazer = d.passos;
  est.atualizando = { de: d.de, para: d.para, em: new Date().toISOString() };
  est.log.push(`${new Date().toISOString().slice(11, 19)} Atualizar retrato: ${d.arquivos.length} arquivo(s) mudaram; passos ${d.passos.join(', ') || 'nenhum'}.`);
  gravarEstado(root, est);
  const ret = lerRetrato(root);
  if (ret) {
    ret.passos = ret.passos.map((x) => (d.passos.includes(x.id) ? { id: x.id, situacao: 'a_fazer' as const, doc: x.doc } : x));
    gravarRetrato(root, ret);
  }
  const r = await rodarAbsorcao(root, opts);
  return { ...r, passos: d.passos };
}
