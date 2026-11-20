/**
 * Íris e agentes da Fábrica falando com os motores.
 *
 * Um único caminho para os 4 motores (ver motors.ts): o pedido completo vai pelo stdin,
 * com o mesmo prompt, o mesmo histórico e o mesmo significado de leitura/escrita.
 * Toda chamada fica no livro de execuções (.tavir/runs).
 */
import { startRun, type RunChanges, type RunHandle, type RunKind } from './runLedger';
import { abrirGuarda, fecharGuarda, resumoBarrados, type Barrado } from './tavirGuarda';
import { agentProfile, agentProfileBlock } from '../shared/agentes';
import {
  MOTOR_LABEL,
  buildInvocation,
  cliModel,
  findMotorBinary,
  normalizeMotorId,
  runMotor,
  type MotorAccess,
} from './motors';

export type IrisAgentMode = 'ask' | 'agent';

export interface IrisAgentRequest {
  workspace: string;
  question: string;
  projectName: string;
  stageName: string;
  stageOwner: string;
  engineId: string;
  model: string;
  effort: string;
  finished: boolean;
  alterationsOpen: boolean;
  asChangeRequest: boolean;
  recent: Array<{ role: 'user' | 'assistant'; text: string }>;
  memorySnippet?: string;
  /** Fatos do projeto para a Íris (stack, situação, trilho). Uma linha por fato. */
  projectFacts?: string[];
  /** A5: resumo do retrato do projeto (context/RETRATO.md). Entra com teto fixo e nunca no histórico. */
  retrato?: string;
  timeoutMs?: number;
  onProgress?: (line: string) => void;
  registerKill?: (kill: () => void) => void;
  /** Tipo da execução no livro de execuções (.tavir/runs). Padrão: chat. */
  runKind?: RunKind;
  runLabel?: string;
}

export interface IrisAgentResult {
  ok: boolean;
  text: string;
  thoughts: string[];
  engine: string;
  model: string;
  mode: IrisAgentMode;
  error?: string;
  /** Pasta da execução em .tavir/runs, quando o motor chegou a rodar. */
  runId?: string;
  /** O que a execução mudou no disco (retrato do git sombra). */
  changes?: RunChanges;
  /** Arquivos de estado do Escritório em .tavir/ que o agente mexeu e foram desfeitos. */
  barrados?: Barrado[];
}

// ---------------------------------------------------------------- prompt

// Orçamento do histórico que vai em cada mensagem. As falas mais novas vão quase inteiras;
// as mais antigas vão resumidas ao começo, só para manter o fio da conversa.
const HISTORY_TURNS = 10;
const HISTORY_CHARS = 6000;
const TURN_CHARS = 1600;
const FRESH_TURNS = 4;
const OLD_TURN_CHARS = 320;
const TRAIL_MAX = 120;

function clipEnd(text: string, limit: number): string {
  const body = String(text || '').trim();
  return body.length <= limit ? body : body.slice(0, limit).replace(/\s+\S*$/, '') + ' […]';
}

/** Últimas falas, das mais novas para trás, até caber no orçamento. */
export function formatHistory(recent: IrisAgentRequest['recent']): string {
  const lines: string[] = [];
  let used = 0;
  let age = 0;
  for (const m of (recent || []).slice(-HISTORY_TURNS).reverse()) {
    const text = clipEnd(m.text, age < FRESH_TURNS ? TURN_CHARS : OLD_TURN_CHARS);
    if (!text) continue;
    age++;
    const line = `${m.role === 'user' ? 'Carlos' : 'Íris'}: ${text}`;
    if (used + line.length > HISTORY_CHARS) break;
    lines.unshift(line);
    used += line.length;
  }
  return lines.join('\n\n');
}

/** Quanto do histórico vai junto na próxima mensagem (falas e caracteres). */
export function historyBudget(recent: IrisAgentRequest['recent']): { turns: number; chars: number } {
  const text = formatHistory(recent);
  return { turns: text ? text.split('\n\n').filter((l) => /^(Carlos|Íris): /.test(l)).length : 0, chars: text.length };
}

const READ_RULES = [
  'Para olhar o projeto, use as ferramentas de leitura de arquivo (ler arquivo, listar pasta, buscar texto). Não use o terminal para ler.',
  'Este turno é só leitura: não crie, edite nem apague arquivos e não rode comandos que mudem algo.',
];

const WRITE_RULES = [
  'Este turno é um pedido de alteração: faça a mudança no workspace (você pode editar arquivos e rodar comandos locais, como build e testes).',
  'Antes de dizer que terminou, confira o resultado (o arquivo existe, o build ou o teste passou). Se algo falhou, diga o que falhou.',
  'Não faça deploy, push, commit nem publique nada fora desta pasta.',
  'A pasta .tavir/ é do Escritório: não edite nada nela (etapa, trilho, chamados, decisões, retrato, acessos, credenciais). Só o Carlos e os portões de QA e segurança mudam esse estado; mudança feita ali pelo agente é desfeita e registrada.',
  'Na resposta final, diga em poucas linhas o que mudou (arquivos) e como verificou.',
];

/** Teto do retrato no pedido (caracteres). */
export const RETRATO_MAX = 3000;

export function buildPrompt(req: IrisAgentRequest, access: MotorAccess): string {
  const isChat = (req.runKind || 'chat') === 'chat';
  const situation = req.finished
    ? req.alterationsOpen
      ? 'entregue; alterações liberadas'
      : 'entregue; fechado para alterações (só consulta)'
    : 'esteira em andamento';
  const facts = [
    `Projeto: ${req.projectName}`,
    `Pasta do projeto (workspace atual): ${req.workspace}`,
    `Situação: ${situation}`,
    `Etapa/foco atual: ${req.stageName}${req.stageOwner ? ` (${req.stageOwner})` : ''}`,
    ...(req.projectFacts || []),
  ];
  const rules = access === 'write' ? WRITE_RULES : READ_RULES;
  const parts: string[] = [];

  if (isChat) {
    parts.push(
      `Você é a Íris, assistente do projeto "${req.projectName}" no TAVIR Escritório. Você conversa com o Carlos, o CEO, em português do Brasil.`,
      '',
      '## Projeto',
      ...facts.map((f) => `- ${f}`),
      '',
      '## Como responder',
      '- Responda direto, como numa conversa. Comece pela resposta, sem anunciar o que vai fazer ("Vou ler…").',
      '- Se a pergunta depende do código, dos documentos ou do estado do projeto, leia os arquivos antes de responder e cite os caminhos relativos que usou.',
      '- Se não conseguir ler algo ou não souber, diga isso com clareza. Nunca invente arquivos, resultados, números ou ações que não fez.',
      '- Use o histórico da conversa: não repita o que já foi dito e entenda referências como "isso" ou "aquele arquivo".',
      '- Tamanho proporcional à pergunta. Formate para leitura: parágrafos curtos, listas com "- ", **negrito** só no que importa e `crases` em caminhos e comandos. Títulos (##) só em resposta longa. Sem tabelas.',
      ...rules.map((r) => `- ${r}`),
    );
    if (access === 'read') {
      parts.push(
        '- Quando a conversa chegar a um pedido de mudança, defeito ou melhoria, explique em poucas linhas o que seria feito e termine com um bloco CHAMADO: preenchido com o que foi conversado (até cinco). O Carlos abre o chamado pelo cartão. Em pergunta simples, não escreva o bloco.',
        '- Formato exato do bloco, uma chave por linha (tipo: bug, melhoria ou duvida; prioridade: urgente, alta, media ou baixa):',
        '  CHAMADO:',
        '  tipo: bug',
        '  titulo: Frase curta',
        '  prioridade: alta',
        '  acontece: (bug) o que acontece / (melhoria) o que mudar',
        '  esperado: (bug) o que era esperado / (melhoria) por quê',
        '  reproduzir: (bug) como reproduzir / (melhoria) como saber que ficou pronto',
        '  evidencia: caminho/arquivo.ext:linha',
      );
    }
    if (req.finished && req.alterationsOpen) {
      parts.push(
        `- O projeto está no trilho de alteração, no foco "${req.stageName}". Se a mensagem pedir análise, plano ou execução, termine com "Pacote do trilho:" e 3 a 6 itens; esse texto vai para o próximo agente.`,
      );
    }
    if (req.retrato?.trim()) parts.push('', '## Retrato do projeto', clipEnd(req.retrato, RETRATO_MAX));
    if (req.memorySnippet?.trim()) {
      parts.push('', '## Memória do projeto (trecho recente)', clipEnd(req.memorySnippet, 2500));
    }
    const history = formatHistory(req.recent);
    if (history) parts.push('', '## Conversa até aqui', history);
    parts.push('', '## Mensagem atual do Carlos', req.question.trim());
    return parts.join('\n');
  }

  // Etapa da esteira ou passo do trilho: o pedido começa pelo perfil do dono da etapa.
  const profile = agentProfile(req.stageOwner);
  parts.push(
    profile
      ? `Você é ${req.stageOwner}, ${profile.papel}. Trabalha no projeto "${req.projectName}". Escreva em português do Brasil.`
      : `Você é um agente da Fábrica TAVIR trabalhando no projeto "${req.projectName}". Escreva em português do Brasil.`,
    ...(profile ? ['', ...agentProfileBlock(req.stageOwner)] : []),
    '',
    '## Projeto',
    ...facts.map((f) => `- ${f}`),
    '',
    '## Regras',
    ...rules.map((r) => `- ${r}`),
    '- Nunca afirme ter feito algo que não fez. Resultados de build e testes só valem se você os executou nesta sessão.',
  );
  if (req.retrato?.trim()) parts.push('', '## Retrato do projeto', clipEnd(req.retrato, RETRATO_MAX));
  if (req.runKind === 'trilho') {
    parts.push(
      '',
      '## Fora do escopo',
      'Se encontrar um problema real fora do escopo deste ciclo, não corrija agora: termine a resposta com um bloco por problema (até cinco), neste formato exato, e siga o seu item.',
      'CHAMADO:',
      'tipo: bug',
      'titulo: Frase curta',
      'prioridade: media',
      'acontece: O que acontece.',
      'esperado: O que deveria acontecer.',
      'reproduzir: Como ver.',
      'evidencia: caminho/arquivo.ext:linha',
    );
  }
  const history = formatHistory(req.recent);
  if (history) parts.push('', '## Conversa recente', history);
  parts.push('', '## Pedido', req.question.trim());
  return parts.join('\n');
}

/** Remove só a narração de abertura que alguns motores insistem em escrever. */
export function tidyReply(text: string): string {
  let out = String(text || '').replace(/\r\n/g, '\n').trim();
  const lead = /^(?:(?:Vou|Deixa eu|Deixe-me|Primeiro,? vou)\s+(?:só\s+|apenas\s+)?(?:ler|olhar|checar|verificar|analisar|abrir|mapear|conferir|procurar|buscar)[^\n.!?]{0,180}[.!?:]\s*)+/i;
  const next = out.replace(lead, '').trim();
  if (next.length >= 2) out = next;
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- execução

/** Se o motor estourar, a guarda fecha mesmo assim (e desfaz o que já tiver sido mexido). */
async function runMotorGuardado(guarda: ReturnType<typeof abrirGuarda>, call: Parameters<typeof runMotor>[0]): ReturnType<typeof runMotor> {
  try {
    return await runMotor(call);
  } catch (err) {
    fecharGuarda(guarda);
    throw err;
  }
}

export async function converseWithIrisAgent(req: IrisAgentRequest): Promise<IrisAgentResult> {
  const motor = normalizeMotorId(req.engineId);
  const access: MotorAccess = req.asChangeRequest && req.alterationsOpen ? 'write' : 'read';
  const mode: IrisAgentMode = access === 'write' ? 'agent' : 'ask';
  const timeoutMs = Math.max(30000, Number(req.timeoutMs) || (access === 'write' ? 900000 : 300000));
  const prompt = buildPrompt(req, access);
  const modelShown = cliModel(motor, req.model, req.effort) || req.model || 'padrão';
  const thoughts: string[] = [`[${MOTOR_LABEL[motor]}] ${modelShown} · ${access === 'write' ? 'pode editar' : 'só leitura'}`];

  const binary = findMotorBinary(motor);
  if (!binary) {
    return {
      ok: false,
      text: `Não achei o CLI do ${MOTOR_LABEL[motor]} neste computador. Instale e faça login, ou troque o motor no seletor.`,
      thoughts,
      engine: motor,
      model: modelShown,
      mode,
      error: 'agent-missing',
    };
  }

  // Livro de execuções: se falhar ao abrir, a conversa segue sem registro.
  let run: RunHandle | null = null;
  try {
    const inv = buildInvocation({ motor, workspace: req.workspace, prompt, model: req.model, effort: req.effort, access }, binary);
    run = await startRun({
      workspace: req.workspace,
      kind: req.runKind || 'chat',
      label: req.runLabel || req.stageName,
      stage: req.stageName,
      owner: req.stageOwner,
      projectName: req.projectName,
      engine: motor,
      binary,
      model: inv.model,
      effort: req.effort,
      mode,
      args: inv.args,
      timeoutMs,
      prompt,
    });
  } catch (err) {
    thoughts.push(`[Execução] registro indisponível: ${err instanceof Error ? err.message : String(err)}`);
  }

  let lastActivity = '';
  // Trilha da resposta: o que o agente disse antes de cada ferramenta (») e cada ferramenta (→).
  const trail: string[] = [];
  let pendingSpeech = '';
  // Estado do Escritório em .tavir/ não muda pela rodada do motor (ver tavirGuarda.ts).
  const guarda = abrirGuarda(req.workspace);
  const res = await runMotorGuardado(guarda, {
    motor,
    workspace: req.workspace,
    prompt,
    model: req.model,
    effort: req.effort,
    access,
    timeoutMs,
    onRaw: run ? run.raw : undefined,
    registerKill: req.registerKill,
    onProgress: (p) => {
      if (p.activity && p.activity !== lastActivity) {
        lastActivity = p.activity;
        if (trail.length < TRAIL_MAX) {
          if (pendingSpeech) trail.push(`» ${clipEnd(pendingSpeech, 700)}`);
          trail.push(`→ ${p.activity}`);
        }
        pendingSpeech = '';
        req.onProgress?.(`→ ${p.activity}`);
      }
      if (p.speech) {
        pendingSpeech = p.speech;
        req.onProgress?.(p.speech);
      }
    },
  });

  thoughts.push(...trail);
  const text = res.ok ? tidyReply(res.text) : res.error?.kind === 'paused' ? res.text.trim() || 'Pausado por Carlos.' : res.error?.message || 'O motor falhou.';
  const errorCode = res.ok
    ? undefined
    : res.error?.kind === 'missing'
      ? 'agent-missing'
      : res.error?.kind === 'auth' || res.error?.kind === 'plan'
        ? 'auth'
        : res.error?.kind || 'failed';
  const result: IrisAgentResult = { ok: res.ok, text, thoughts, engine: motor, model: res.model || modelShown, mode, error: errorCode };

  if (run) {
    try {
      const meta = await run.finish({
        ok: res.ok,
        status: res.error?.kind === 'paused' ? 'paused' : undefined,
        error: res.ok ? undefined : res.error?.message,
        exitCode: res.exitCode,
        reply: res.text || text,
      });
      result.runId = meta.id;
      result.changes = meta.changes;
      thoughts.push(`[Execução] .tavir/runs/${meta.id}`);
      if (meta.toolCalls) thoughts.push(`[Ferramentas] ${meta.toolCalls}${meta.toolErrors ? ` · ${meta.toolErrors} com falha` : ''}`);
      const c = meta.changes;
      if (c?.available && (access === 'write' || c.added.length + c.modified.length + c.deleted.length)) {
        thoughts.push(`[Disco] ${c.added.length} criados · ${c.modified.length} alterados · ${c.deleted.length} removidos`);
      }
    } catch (err) {
      thoughts.push(`[Execução] não fechou o registro: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const barrados = fecharGuarda(guarda, { barradosDir: run ? `${run.dir}/barrados` : undefined, rodada: result.runId });
  if (barrados.length) {
    result.barrados = barrados;
    thoughts.push(`[Guarda] ${resumoBarrados(barrados)}`);
  }
  return result;
}
