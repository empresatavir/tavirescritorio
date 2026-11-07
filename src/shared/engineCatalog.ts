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

export const ENGINE_CATALOG: MotorOption[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    sdk: '~/.cursor',
    cli: 'agent --output-format stream-json',
    protocol: 'Cursor Agent Stream-JSON · Extended Thinking',
    defaultModel: 'auto-smart',
    defaultEffort: 'balanced',
    models: [
      { id: 'auto-smart', label: 'Auto', efforts: AUTO_EFFORTS },
      { id: 'composer-2.5', label: 'Composer', efforts: CURSOR_EFFORTS },
      { id: 'gpt-5', label: 'GPT-5', efforts: CURSOR_EFFORTS },
      { id: 'sonnet-4-thinking', label: 'Sonnet Thinking', efforts: CURSOR_EFFORTS },
    ],
  },
  {
    id: 'claude',
    label: 'Claude',
    sdk: '~/.claude',
    cli: 'claude -p --output-format json',
    protocol: 'Claude Code SDK · Anthropic Extended Thinking',
    defaultModel: 'claude-opus-5-5',
    defaultEffort: 'medium',
    models: [
      { id: 'claude-fable-5-1', label: 'Fable 5.1', efforts: PLAIN_EFFORTS },
      { id: 'claude-opus-5-5', label: 'Opus 5.5', efforts: PLAIN_EFFORTS },
      { id: 'claude-fable-5', label: 'Fable 5', efforts: PLAIN_EFFORTS },
      { id: 'claude-opus-5', label: 'Opus 5', efforts: PLAIN_EFFORTS },
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', efforts: PLAIN_EFFORTS },
      { id: 'claude-sonnet-5', label: 'Sonnet 5', efforts: PLAIN_EFFORTS },
      { id: 'claude-opus-4-8', label: 'Opus 4.8', efforts: PLAIN_EFFORTS },
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5', efforts: PLAIN_EFFORTS },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    sdk: '~/.codex',
    cli: 'codex exec --reasoning high',
    protocol: 'OpenAI Codex CLI · Reasoning Sandbox',
    defaultModel: 'gpt-5-codex',
    defaultEffort: 'medium',
    models: [
      { id: 'gpt-5-codex', label: 'GPT-5 Codex', efforts: PLAIN_EFFORTS },
      { id: 'gpt-5', label: 'GPT-5', efforts: PLAIN_EFFORTS },
    ],
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    sdk: '~/.gemini/antigravity',
    cli: 'agy --thought-stream',
    protocol: 'Google Antigravity SDK · Native <thought> Stream',
    defaultModel: 'gemini-2.5-pro',
    defaultEffort: 'medium',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', efforts: PLAIN_EFFORTS },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', efforts: PLAIN_EFFORTS },
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

export function modelOf(motor: MotorOption, modelId: string | null | undefined): ModelOption {
  return motor.models.find((m) => m.id === modelId) || motor.models[0];
}

export function effortOf(model: ModelOption, effortId: string | null | undefined): EffortOption {
  return model.efforts.find((e) => e.id === effortId) || model.efforts[0];
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
