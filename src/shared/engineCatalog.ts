/**
 * Catálogo multi-motor do Escritório.
 * Motor → modelos → esforços. Só motores ligados entram na UI.
 */

export type MotorId = 'cursor' | 'claude' | 'codex' | 'antigravity';

export interface EffortOption {
  id: string;
  label: string;
}

export interface ModelOption {
  id: string;
  label: string;
  efforts: EffortOption[];
}

export interface MotorOption {
  id: MotorId;
  label: string;
  sdk: string;
  cli: string;
  protocol: string;
  defaultModel: string;
  defaultEffort: string;
  models: ModelOption[];
}

const CURSOR_EFFORTS: EffortOption[] = [
  { id: 'low', label: 'Baixo' },
  { id: 'medium', label: 'Médio' },
  { id: 'high', label: 'Alto' },
  { id: 'xhigh', label: 'Máximo' },
];

const AUTO_EFFORTS: EffortOption[] = [
  { id: 'cost', label: 'Cost' },
  { id: 'balanced', label: 'Balance' },
  { id: 'intelligence', label: 'Intelligence' },
];

const PLAIN_EFFORTS: EffortOption[] = [
  { id: 'low', label: 'Baixo' },
  { id: 'medium', label: 'Médio' },
  { id: 'high', label: 'Alto' },
];

const DEEP_EFFORTS: EffortOption[] = [
  { id: 'low', label: 'Baixo' },
  { id: 'medium', label: 'Médio' },
  { id: 'high', label: 'Alto' },
  { id: 'xhigh', label: 'Máximo' },
];

/** Modelo do próprio CLI: o esforço já vem no nome, então não há escolha separada. */
const FIXED_EFFORT: EffortOption[] = [{ id: 'medium', label: 'Do modelo' }];

// Ids conferidos em 2026-11-08 com `agent --list-models`, `agy models`, Claude Code 2.1 e Codex CLI 0.153.
export const ENGINE_CATALOG: MotorOption[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    sdk: '~/.cursor',
    cli: 'agent -p --output-format stream-json',
    protocol: 'Cursor Agent Stream-JSON',
    defaultModel: 'auto-smart',
    defaultEffort: 'balanced',
    models: [
      { id: 'auto-smart', label: 'Auto', efforts: AUTO_EFFORTS },
      { id: 'composer-2.5', label: 'Composer 2.5', efforts: FIXED_EFFORT },
      { id: 'claude-sonnet-5-thinking-high', label: 'Sonnet 5 Thinking', efforts: FIXED_EFFORT },
      { id: 'claude-opus-5-thinking-high', label: 'Opus 5 Thinking', efforts: FIXED_EFFORT },
      { id: 'gpt-5.3-codex', label: 'Codex 5.3', efforts: FIXED_EFFORT },
      { id: 'gemini-3.7-flash-high', label: 'Gemini 3.7 Flash', efforts: FIXED_EFFORT },
    ],
  },
  {
    id: 'claude',
    label: 'Claude',
    sdk: '~/.claude',
    cli: 'claude -p --output-format stream-json',
    protocol: 'Claude Code · Stream-JSON',
    defaultModel: 'claude-sonnet-5-5',
    defaultEffort: 'medium',
    models: [
      { id: 'claude-opus-5-5', label: 'Opus 5.5', efforts: DEEP_EFFORTS },
      { id: 'claude-fable-5-1', label: 'Fable 5.1', efforts: DEEP_EFFORTS },
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', efforts: DEEP_EFFORTS },
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5', efforts: DEEP_EFFORTS },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    sdk: '~/.codex',
    cli: 'codex exec --json',
    protocol: 'OpenAI Codex CLI · JSONL',
    defaultModel: 'codex-default',
    defaultEffort: 'medium',
    models: [
      { id: 'codex-default', label: 'Padrão do Codex', efforts: DEEP_EFFORTS },
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', efforts: DEEP_EFFORTS },
    ],
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    sdk: '~/.gemini/antigravity',
    cli: 'agy --output-format stream-json',
    protocol: 'Google Antigravity · Stream-JSON',
    defaultModel: 'gemini-4-argon',
    defaultEffort: 'medium',
    models: [
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon', efforts: PLAIN_EFFORTS },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', efforts: PLAIN_EFFORTS },
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 (via Antigravity)', efforts: PLAIN_EFFORTS },
      { id: 'claude-opus-5-5', label: 'Opus 5.5 (via Antigravity)', efforts: PLAIN_EFFORTS },
    ],
  },
];

export function motorById(id: string | null | undefined): MotorOption {
  const key = String(id || '').toLowerCase();
  if (key.includes('claude') || key === 'anthropic') {
    return ENGINE_CATALOG.find((m) => m.id === 'claude')!;
  }
  if (key.includes('codex')) return ENGINE_CATALOG.find((m) => m.id === 'codex')!;
  if (key.includes('anti') || key.includes('gemini')) {
    return ENGINE_CATALOG.find((m) => m.id === 'antigravity')!;
  }
  return ENGINE_CATALOG.find((m) => m.id === 'cursor')!;
}

// A Fábrica guarda o rótulo ("Médio", "Balance"); o resto do app guarda o id. Os dois valem.
const same = (a: string, b: string | null | undefined) => a.toLowerCase() === String(b || '').trim().toLowerCase();

export function modelOf(motor: MotorOption, modelId: string | null | undefined): ModelOption {
  return motor.models.find((m) => same(m.id, modelId) || same(m.label, modelId)) || motor.models[0];
}

export function effortOf(model: ModelOption, effortId: string | null | undefined): EffortOption {
  return model.efforts.find((e) => same(e.id, effortId) || same(e.label, effortId)) || model.efforts[0];
}

export function fitCall(
  motorId: string | null | undefined,
  modelId: string | null | undefined,
  effortId: string | null | undefined,
): { motor: MotorOption; model: ModelOption; effort: EffortOption } {
  const motor = motorById(motorId);
  const model = modelOf(motor, modelId || motor.defaultModel);
  const preferred = effortId || (model.id === motor.defaultModel ? motor.defaultEffort : model.efforts[0]?.id);
  const effort = effortOf(model, preferred);
  return { motor, model, effort };
}

export function callCaption(motorId: string, modelId: string, effortId: string): string {
  const { motor, model, effort } = fitCall(motorId, modelId, effortId);
  if (model.id === 'auto-smart') return `${motor.label} · ${model.label}`;
  return `${motor.label} · ${model.label} · ${effort.label}`;
}

export function enabledMotors(
  flags: Partial<Record<MotorId | 'anthropic', boolean>> | null | undefined,
): MotorOption[] {
  const on = (id: MotorId) => {
    if (!flags) return true;
    if (id === 'claude') return flags.claude !== false && flags.anthropic !== false;
    return flags[id] !== false;
  };
  const list = ENGINE_CATALOG.filter((m) => on(m.id));
  return list.length ? list : [ENGINE_CATALOG[0]];
}
