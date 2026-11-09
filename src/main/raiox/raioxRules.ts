import {
  RAIOX_CATALOG,
  RAIOX_CLASSES,
  RAIOX_CLASS_LABEL,
  RAIOX_CONFIDENCE,
  RAIOX_DEPTHS,
  RAIOX_FRONTS,
  RAIOX_GAPS,
  RAIOX_MODES,
  RAIOX_ORIGINS,
  RAIOX_SELL_OFFERS,
  RAIOX_STAGES,
  RAIOX_STAGE_LABEL,
  type RaioxCase,
  type RaioxClass,
  type RaioxConfidence,
  type RaioxDepth,
  type RaioxDocument,
  type RaioxEvidence,
  type RaioxHypothesis,
  type RaioxMetric,
  type RaioxMode,
  type RaioxOrigin,
  type RaioxStage,
  type RaioxStepCheck,
} from '../../shared/raiox';

export class RaioxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RaioxError';
  }
}

export interface RaioxCaseInput {
  company: string;
  contact?: string;
  objective: string;
  decisionNeeded: string;
  frontier?: string;
  mode?: string;
  deepScan?: boolean;
  physicalStore?: boolean;
  origin?: string;
  segment?: string;
  publicLink?: string;
  consent?: RaioxCase['consent'];
}

export interface RaioxEvidenceInput {
  stage: string;
  source: string;
  claim: string;
  classification: string;
  front?: string;
  note?: string;
  gapIds?: string[];
  artifact?: RaioxEvidence['artifact'];
  author?: 'carlos' | 'dora';
}

export interface RaioxHypothesisInput {
  id?: string;
  gapId: string;
  text: string;
  evidenceIds: string[];
}

export interface RaioxPriorityInput {
  stage: string;
  gapId: string;
  bottleneck: string;
  rationale: string;
  confidence: string;
  discarded?: string;
}

export interface RaioxDebriefInput {
  decision: string;
  reason: string;
  offerId?: string;
  depth?: string;
  plan30?: string;
  plan60?: string;
  plan90?: string;
}

export interface RaioxDeliveryInput {
  channel: string;
  to: string;
  note?: string;
}

export interface RaioxPlaybookRef {
  version: string;
  steps: { n: number }[];
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function blank(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function optional(value: string | undefined | null): string | undefined {
  const text = blank(value);
  return text ? text : undefined;
}

function writable(c: RaioxCase): RaioxCase {
  if (c.legacy) throw new RaioxError('Caso legado é somente leitura.');
  return structuredClone(c);
}

function finish(c: RaioxCase, now: string): RaioxCase {
  sync(c);
  c.updatedAt = now;
  return c;
}

export function usable(ev: RaioxEvidence): boolean {
  return ev.review === 'aprovada' && ev.classification !== 'indisponivel';
}

function isStage(value: string): value is RaioxStage {
  return (RAIOX_STAGES as readonly string[]).includes(value);
}

function isMode(value: string): value is RaioxMode {
  return (RAIOX_MODES as readonly string[]).includes(value);
}

function isOrigin(value: string): value is RaioxOrigin {
  return (RAIOX_ORIGINS as readonly string[]).includes(value);
}

function isClass(value: string): value is RaioxClass {
  return (RAIOX_CLASSES as readonly string[]).includes(value);
}

function isConfidence(value: string): value is RaioxConfidence {
  return (RAIOX_CONFIDENCE as readonly string[]).includes(value);
}

function isDepth(value: string): value is RaioxDepth {
  return (RAIOX_DEPTHS as readonly string[]).includes(value);
}

function gapById(id: string) {
  return RAIOX_GAPS.find((gap) => gap.id === id);
}

function frontById(id: string) {
  return RAIOX_FRONTS.find((front) => front.id === id);
}

function requiredFronts(c: RaioxCase) {
  return RAIOX_FRONTS.filter((front) => !front.physicalOnly || c.physicalStore);
}

function assertFrontierFields(input: {
  company?: string;
  objective?: string;
  decisionNeeded?: string;
  mode?: string;
  origin?: string;
  deepScan?: boolean;
}): void {
  if (input.company !== undefined && !blank(input.company)) throw new RaioxError('Informe a empresa.');
  if (input.objective !== undefined && !blank(input.objective)) throw new RaioxError('Informe o objetivo comercial.');
  if (input.decisionNeeded !== undefined && !blank(input.decisionNeeded)) {
    throw new RaioxError('Informe a decisão que o diagnóstico precisa permitir.');
  }
  if (input.mode !== undefined && !isMode(blank(input.mode))) {
    throw new RaioxError('Escolha estudo rápido, diagnóstico ou leitura completa.');
  }
  if (input.origin !== undefined && !isOrigin(blank(input.origin))) {
    throw new RaioxError('Origem inválida. Use amigo, rua, formulário ou indicação.');
  }
  if (input.deepScan && input.mode !== undefined && blank(input.mode) !== 'completo') {
    throw new RaioxError('Deep scan só existe dentro da leitura completa.');
  }
}

export function caseIdFromUuid(uuid: string): string {
  if (!UUID_RE.test(uuid)) throw new RaioxError('Identificador inválido.');
  return 'RX-' + uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function createCase(input: RaioxCaseInput, now: string, uuid: string): RaioxCase {
  const mode = input.mode === undefined ? 'diagnostico' : input.mode;
  const origin = input.origin === undefined ? 'amigo' : input.origin;
  const deepScan = Boolean(input.deepScan);
  assertFrontierFields({
    company: input.company,
    objective: input.objective,
    decisionNeeded: input.decisionNeeded,
    mode,
    origin,
    deepScan,
  });
  const c: RaioxCase = {
    id: caseIdFromUuid(uuid),
    uuid,
    legacy: false,
    company: blank(input.company),
    contact: optional(input.contact),
    objective: blank(input.objective),
    decisionNeeded: blank(input.decisionNeeded),
    frontier: optional(input.frontier),
    mode: mode as RaioxMode,
    deepScan,
    physicalStore: Boolean(input.physicalStore),
    origin: origin as RaioxOrigin,
    segment: optional(input.segment),
    publicLink: optional(input.publicLink),
    status: 'fronteira',
    evidence: [],
    hypotheses: [],
    consent: input.consent,
    createdAt: now,
    updatedAt: now,
  };
  return finish(c, now);
}

export function updateFrontier(c: RaioxCase, patch: Partial<RaioxCaseInput>, now: string): RaioxCase {
  const next = writable(c);
  if (next.status === 'fechado') throw new RaioxError('Caso fechado não muda.');
  const merged = {
    company: patch.company !== undefined ? patch.company : next.company,
    objective: patch.objective !== undefined ? patch.objective : next.objective,
    decisionNeeded: patch.decisionNeeded !== undefined ? patch.decisionNeeded : next.decisionNeeded,
    mode: patch.mode !== undefined ? patch.mode : next.mode,
    origin: patch.origin !== undefined ? patch.origin : next.origin,
    deepScan: patch.deepScan !== undefined ? Boolean(patch.deepScan) : next.deepScan,
  };
  assertFrontierFields(merged);
  if (patch.company !== undefined) next.company = blank(patch.company);
  if (patch.contact !== undefined) next.contact = optional(patch.contact);
  if (patch.objective !== undefined) next.objective = blank(patch.objective);
  if (patch.decisionNeeded !== undefined) next.decisionNeeded = blank(patch.decisionNeeded);
  if (patch.frontier !== undefined) next.frontier = optional(patch.frontier);
  if (patch.mode !== undefined) next.mode = blank(patch.mode) as RaioxMode;
  if (patch.deepScan !== undefined) next.deepScan = Boolean(patch.deepScan);
  if (patch.physicalStore !== undefined) next.physicalStore = Boolean(patch.physicalStore);
  if (patch.origin !== undefined) next.origin = blank(patch.origin) as RaioxOrigin;
  if (patch.segment !== undefined) next.segment = optional(patch.segment);
  if (patch.publicLink !== undefined) next.publicLink = optional(patch.publicLink);
  if (patch.consent !== undefined) next.consent = patch.consent;
  return finish(next, now);
}

export function addEvidence(c: RaioxCase, input: RaioxEvidenceInput, now: string, id: string): RaioxCase {
  const next = writable(c);
  const stage = blank(input.stage);
  if (!isStage(stage)) throw new RaioxError('Etapa da jornada inválida.');
  const classification = blank(input.classification);
  if (!isClass(classification)) {
    throw new RaioxError('Classificação inválida. Use observado, informado, inferido ou indisponível.');
  }
  if (!blank(input.source)) throw new RaioxError('Informe a fonte da evidência.');
  if (!blank(input.claim)) throw new RaioxError('Informe o que a evidência mostra.');
  const front = optional(input.front);
  if (next.deepScan && !front) throw new RaioxError('No deep scan, marque a frente desta evidência.');
  if (front && !frontById(front)) throw new RaioxError('Frente de varredura inválida.');
  const gapIds = input.gapIds ?? [];
  if (gapIds.some((gapId) => !gapById(gapId))) throw new RaioxError('Gap fora da taxonomia.');
  const author = input.author ?? 'carlos';
  const ev: RaioxEvidence = {
    id,
    stage,
    source: blank(input.source),
    claim: blank(input.claim),
    classification,
    front,
    note: optional(input.note),
    gapIds,
    artifact: input.artifact,
    author,
    review: author === 'carlos' ? 'aprovada' : 'pendente',
    createdAt: now,
  };
  next.evidence.push(ev);
  return finish(next, now);
}

export function reviewEvidence(c: RaioxCase, evId: string, decision: string, now: string): RaioxCase {
  const next = writable(c);
  const ev = next.evidence.find((item) => item.id === evId);
  if (!ev) throw new RaioxError('Evidência não encontrada neste diagnóstico.');
  if (decision !== 'aprovada' && decision !== 'rejeitada') throw new RaioxError('Decisão de revisão inválida.');
  ev.review = decision;
  return finish(next, now);
}

export function removeEvidence(c: RaioxCase, evId: string, now: string): RaioxCase {
  const next = writable(c);
  if (!next.evidence.some((item) => item.id === evId)) {
    throw new RaioxError('Evidência não encontrada neste diagnóstico.');
  }
  next.evidence = next.evidence.filter((item) => item.id !== evId);
  return finish(next, now);
}

export function addHypotheses(c: RaioxCase, list: RaioxHypothesisInput[], now: string): RaioxCase {
  const next = writable(c);
  const created: RaioxHypothesis[] = [];
  list.forEach((item, index) => {
    if (!gapById(item.gapId)) throw new RaioxError('Gap fora da taxonomia.');
    if (item.evidenceIds.some((evId) => !next.evidence.some((ev) => ev.id === evId))) {
      throw new RaioxError('Hipótese cita evidência inexistente.');
    }
    created.push({
      id: item.id || `H-${index + 1}`,
      gapId: item.gapId,
      text: item.text,
      evidenceIds: item.evidenceIds,
      createdAt: now,
    });
  });
  next.hypotheses.push(...created);
  return finish(next, now);
}

export function setPriority(c: RaioxCase, input: RaioxPriorityInput, now: string): RaioxCase {
  const next = writable(c);
  const stage = blank(input.stage);
  if (!isStage(stage)) throw new RaioxError('Escolha a etapa do gargalo.');
  const gap = gapById(blank(input.gapId));
  if (!gap) throw new RaioxError('Escolha um gap da lista.');
  if (gap.stage !== stage) throw new RaioxError('O gap escolhido pertence a outra etapa da jornada.');
  if (!blank(input.bottleneck)) throw new RaioxError('Descreva o gargalo prioritário.');
  if (!blank(input.rationale)) throw new RaioxError('Registre por que esta prioridade vem primeiro.');
  const confidence = blank(input.confidence);
  if (!isConfidence(confidence)) throw new RaioxError('Informe o nível de confiança: alta, média ou baixa.');
  if (!next.evidence.some((ev) => ev.stage === stage && usable(ev))) {
    throw new RaioxError('A prioridade precisa de uma evidência utilizável na etapa escolhida. Fonte indisponível não sustenta o gargalo.');
  }
  next.priority = {
    stage,
    gapId: gap.id,
    bottleneck: blank(input.bottleneck),
    rationale: blank(input.rationale),
    confidence,
    discarded: optional(input.discarded),
    decidedAt: now,
  };
  next.debrief = undefined;
  return finish(next, now);
}

export function setDebrief(
  c: RaioxCase,
  input: RaioxDebriefInput,
  playbookStatus: 'rascunho' | 'validado',
  now: string,
): RaioxCase {
  const next = writable(c);
  if (input.decision !== 'proposta_emitida' && input.decision !== 'nao_emitir') {
    throw new RaioxError('A devolutiva é proposta emitida ou não emitir.');
  }
  if (!blank(input.reason)) throw new RaioxError('Registre o motivo da devolutiva.');
  if (!next.priority) throw new RaioxError('Feche a prioridade antes da devolutiva.');
  const gap = gapById(next.priority.gapId);
  if (input.decision === 'proposta_emitida') {
    const offerId = blank(input.offerId);
    if (!(RAIOX_SELL_OFFERS as string[]).includes(offerId)) {
      throw new RaioxError('Escolha uma oferta seguinte. O Raio-X não vende tudo de uma vez.');
    }
    if (!gap || offerId !== gap.offerId) throw new RaioxError('A oferta precisa resolver o gap da prioridade.');
    if (!blank(input.plan30)) throw new RaioxError('Registre o próximo passo dos próximos 30 dias.');
    const depth = blank(input.depth);
    if (!isDepth(depth)) throw new RaioxError('Escolha guiado, piloto, junto ou para você.');
    if ((depth === 'junto' || depth === 'para_voce') && playbookStatus === 'rascunho') {
      throw new RaioxError('Este gap ainda não tem playbook validado. Ofereça guiado ou piloto declarado.');
    }
    if (next.deepScan) {
      const missing = requiredFronts(next).filter(
        (front) => !next.evidence.some((ev) => usable(ev) && ev.front === front.id),
      );
      if (missing.length) {
        throw new RaioxError(`O deep scan ainda não cobriu: ${missing.map((front) => front.label).join(', ')}.`);
      }
    }
    next.debrief = {
      decision: 'proposta_emitida',
      reason: blank(input.reason),
      offerId,
      depth,
      plan30: blank(input.plan30),
      plan60: optional(input.plan60),
      plan90: optional(input.plan90),
    };
  } else {
    next.debrief = { decision: 'nao_emitir', reason: blank(input.reason) };
  }
  return finish(next, now);
}

export function attachDocuments(c: RaioxCase, docs: RaioxDocument[], now: string): RaioxCase {
  const next = writable(c);
  if (!next.debrief) throw new RaioxError('Registre a devolutiva antes de gerar os documentos.');
  const kinds = new Set(docs.map((doc) => doc.kind));
  if (docs.length !== 2 || kinds.size !== 2 || !kinds.has('relatorio') || !kinds.has('plano')) {
    throw new RaioxError('São dois documentos: relatório e plano.');
  }
  next.debrief = { ...next.debrief, documents: docs, approval: undefined, delivery: undefined };
  return finish(next, now);
}

function orderedDocs(docs: RaioxDocument[]): RaioxDocument[] {
  const relatorio = docs.find((doc) => doc.kind === 'relatorio');
  const plano = docs.find((doc) => doc.kind === 'plano');
  return [relatorio, plano].filter((doc): doc is RaioxDocument => Boolean(doc));
}

export function approveDocuments(c: RaioxCase, hashes: string[], now: string): RaioxCase {
  const next = writable(c);
  const docs = next.debrief?.documents;
  if (!docs?.length) throw new RaioxError('Gere os documentos antes de aprovar.');
  if (docs.some((doc) => doc.lint.length > 0)) {
    throw new RaioxError('Corrija os problemas apontados na checagem antes de aprovar.');
  }
  const current = orderedDocs(docs).map((doc) => doc.sha256);
  if (hashes.length !== current.length || hashes.some((hash, index) => hash !== current[index])) {
    throw new RaioxError('Os documentos mudaram depois de gerados. Gere de novo e confira.');
  }
  next.debrief = { ...next.debrief!, approval: { hashes: current, at: now } };
  return finish(next, now);
}

export function recordDelivery(c: RaioxCase, input: RaioxDeliveryInput, now: string): RaioxCase {
  const next = writable(c);
  if (!next.debrief?.approval) throw new RaioxError('Aprove os documentos antes de entregar.');
  if (!blank(input.to)) throw new RaioxError('Informe para quem foi entregue.');
  if (input.channel !== 'manual' && input.channel !== 'resend') throw new RaioxError('Canal de entrega inválido.');
  next.debrief = {
    ...next.debrief,
    delivery: { channel: input.channel, to: blank(input.to), at: now, note: optional(input.note) },
  };
  return finish(next, now);
}

export function closeCase(c: RaioxCase, now: string): RaioxCase {
  const next = writable(c);
  if (!next.debrief) throw new RaioxError('Encerre só depois da devolutiva.');
  if (next.debrief.decision === 'proposta_emitida' && !next.debrief.delivery) {
    throw new RaioxError('Registre a entrega antes de encerrar.');
  }
  if (next.debrief.decision === 'nao_emitir' && !next.debrief.approval) {
    throw new RaioxError('Aprove os documentos antes de encerrar.');
  }
  next.status = 'fechado';
  next.closedAt = now;
  return finish(next, now);
}

export function startExecution(c: RaioxCase, playbook: RaioxPlaybookRef, now: string): RaioxCase {
  const next = writable(c);
  if (next.status !== 'fechado' || next.debrief?.decision !== 'proposta_emitida') {
    throw new RaioxError('Execução só abre depois da proposta aceita.');
  }
  if (next.execution) throw new RaioxError('A execução deste caso já começou.');
  next.execution = {
    gapId: next.priority?.gapId ?? '',
    playbookVersion: playbook.version,
    startedAt: now,
    steps: [],
    metrics: [],
  };
  return finish(next, now);
}

export function recordMetric(c: RaioxCase, m: RaioxMetric): RaioxCase {
  const next = writable(c);
  if (!next.execution) throw new RaioxError('Abra a execução primeiro.');
  if (m.moment === 'd30' && !next.execution.metrics.some((item) => item.key === m.key && item.moment === 'd0')) {
    throw new RaioxError('Registre a linha de base (d0) antes da medição de 30 dias.');
  }
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) throw new RaioxError('A medição precisa de um número.');
  next.execution.metrics.push(m);
  return finish(next, m.at);
}

export function checkStep(
  c: RaioxCase,
  step: number,
  proof: RaioxStepCheck['proof'],
  playbook: RaioxPlaybookRef,
  now: string,
): RaioxCase {
  const next = writable(c);
  if (!next.execution) throw new RaioxError('Abra a execução primeiro.');
  if (!next.execution.metrics.some((item) => item.moment === 'd0')) {
    throw new RaioxError('Passo 0: registre a linha de base antes de executar.');
  }
  if (!playbook.steps.some((item) => item.n === step)) throw new RaioxError('Passo inexistente neste playbook.');
  if (step > 1 && !next.execution.steps.some((item) => item.step === step - 1)) {
    throw new RaioxError('Prove o passo anterior primeiro.');
  }
  if (!blank(proof?.value)) throw new RaioxError('Anexe a prova do passo.');
  if (next.execution.steps.some((item) => item.step === step)) throw new RaioxError('Este passo já foi provado.');
  next.execution.steps.push({ step, doneAt: now, proof });
  return finish(next, now);
}

export function closeExecution(c: RaioxCase, playbook: RaioxPlaybookRef, now: string): RaioxCase {
  const next = writable(c);
  if (!next.execution) throw new RaioxError('Abra a execução primeiro.');
  const proved = new Set(next.execution.steps.map((item) => item.step));
  if (playbook.steps.some((item) => !proved.has(item.n))) throw new RaioxError('Ainda há passos sem prova.');
  const baselines = next.execution.metrics.filter((item) => item.moment === 'd0');
  if (baselines.some((item) => !next.execution!.metrics.some((metric) => metric.key === item.key && metric.moment === 'd30'))) {
    throw new RaioxError('Registre a medição de 30 dias de todas as métricas.');
  }
  next.execution.closedAt = now;
  return finish(next, now);
}

export function sync(c: RaioxCase): void {
  if (c.priority && !c.evidence.some((ev) => ev.stage === c.priority!.stage && usable(ev))) {
    c.priority = undefined;
    c.debrief = undefined;
  }
  if (c.status === 'fechado') return;
  if (c.debrief) c.status = 'devolutiva';
  else if (c.priority) c.status = 'prioridade';
  else if (new Set(c.evidence.filter(usable).map((ev) => ev.stage)).size >= 2) c.status = 'jornada';
  else if (c.evidence.length > 0) c.status = 'coleta';
  else c.status = 'fronteira';
}

function pageTitle(path: string, titleOf?: (path: string) => string): string {
  if (titleOf) return titleOf(path);
  return (path.split('/').pop() ?? path).replace(/-/g, ' ');
}

export function raioxView(c: RaioxCase, opts: { methodTitle?: (path: string) => string } = {}) {
  const coverage = RAIOX_STAGES.map((stage) => ({
    stage,
    label: RAIOX_STAGE_LABEL[stage],
    total: c.evidence.filter((ev) => ev.stage === stage).length,
    usable: c.evidence.filter((ev) => ev.stage === stage && usable(ev)).length,
  }));
  const approved = c.evidence.filter((ev) => ev.review === 'aprovada');
  const observed = approved.filter((ev) => ev.classification === 'observado').length;
  const usableCount = c.evidence.filter(usable).length;
  const confidence = {
    observed,
    usable: usableCount,
    ratio: usableCount === 0 ? 0 : Math.round((observed / usableCount) * 100),
  };
  const classes = RAIOX_CLASSES.map((cls) => ({
    cls,
    label: RAIOX_CLASS_LABEL[cls],
    n: approved.filter((ev) => ev.classification === cls).length,
  }));
  const pending = c.evidence.filter((ev) => ev.review === 'pendente').length;
  const scan = c.deepScan
    ? requiredFronts(c).map((front) => ({
        id: front.id,
        label: front.label,
        covered: c.evidence.some((ev) => usable(ev) && ev.front === front.id),
      }))
    : undefined;
  const item = RAIOX_CATALOG.find((entry) => entry.id === c.mode);
  const paths: string[] = item ? [...item.vault] : [];
  if (c.deepScan) {
    const deep = RAIOX_CATALOG.find((entry) => entry.id === 'deep_scan');
    if (deep) paths.push(...deep.vault);
  }
  const seen: string[] = [];
  for (const methodPath of paths) {
    if (!seen.includes(methodPath)) seen.push(methodPath);
  }
  const methodPages = seen.map((methodPath) => ({ path: methodPath, title: pageTitle(methodPath, opts.methodTitle) }));
  const next =
    c.status === 'fronteira'
      ? 'Registrar evidência'
      : c.status === 'coleta'
        ? 'Cobrir mais uma etapa'
        : c.status === 'jornada'
          ? 'Escolher a prioridade'
          : c.status === 'prioridade'
            ? 'Escrever a devolutiva'
            : c.status === 'devolutiva'
              ? 'Gerar, aprovar e entregar os documentos'
              : c.execution
                ? 'Ver execução'
                : 'Caso encerrado';
  return { coverage, confidence, classes, pending, scan, methodPages, next };
}

export type RaioxCaseView = RaioxCase & ReturnType<typeof raioxView>;

export function present(c: RaioxCase, opts?: { methodTitle?: (path: string) => string }): RaioxCaseView {
  return { ...c, ...raioxView(c, opts) };
}
