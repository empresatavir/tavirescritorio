import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EngineKind, EngineSettings, RunEvent } from '../../shared/types';
import {
  callCaption,
  enabledMotors,
  fitCall,
  motorById,
  type MotorId,
} from '../../shared/engineCatalog';
import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import { AnthropicDriver } from './anthropicDriver';
import { CursorDriver } from './cursorDriver';
import { AntigravityDriver } from './antigravityDriver';
import { CodexDriver } from './codexDriver';

const DEFAULT_SETTINGS: EngineSettings = {
  anthropicEnabled: true,
  claudeEnabled: true,
  cursorEnabled: true,
  antigravityEnabled: true,
  codexEnabled: true,
  defaultEngine: 'cursor',
  defaultModel: 'auto-smart',
  defaultEffort: 'balanced',
};

function settingsPath(): string {
  const dir = join(process.cwd(), 'db');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'engine_settings.json');
}

function normalizeEngine(id: string | null | undefined): EngineKind {
  const key = String(id || '').toLowerCase();
  if (key === 'anthropic' || key === 'claude') return 'claude';
  if (key === 'codex') return 'codex';
  if (key === 'antigravity') return 'antigravity';
  return 'cursor';
}

function loadPersisted(): Partial<EngineSettings> {
  try {
    const file = settingsPath();
    if (!existsSync(file)) return {};
    return JSON.parse(readFileSync(file, 'utf8')) as Partial<EngineSettings>;
  } catch {
    return {};
  }
}

class EngineHub {
  private drivers: Map<string, AgentEngineDriver> = new Map();
  private settings: EngineSettings;

  constructor() {
    this.drivers.set('anthropic', new AnthropicDriver());
    this.drivers.set('claude', new AnthropicDriver());
    this.drivers.set('cursor', new CursorDriver());
    this.drivers.set('antigravity', new AntigravityDriver());
    this.drivers.set('codex', new CodexDriver());

    const saved = loadPersisted();
    const merged: EngineSettings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      claudeEnabled:
        saved.claudeEnabled ?? saved.anthropicEnabled ?? DEFAULT_SETTINGS.claudeEnabled,
      anthropicEnabled:
        saved.anthropicEnabled ?? saved.claudeEnabled ?? DEFAULT_SETTINGS.anthropicEnabled,
      defaultEngine: normalizeEngine(saved.defaultEngine || DEFAULT_SETTINGS.defaultEngine),
    };
    const fitted = fitCall(merged.defaultEngine, merged.defaultModel, merged.defaultEffort);
    this.settings = {
      ...merged,
      defaultEngine: fitted.motor.id as EngineKind,
      defaultModel: fitted.model.id,
      defaultEffort: fitted.effort.id,
    };
  }

  private persist(): void {
    try {
      writeFileSync(settingsPath(), JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('[EngineHub] Falha ao gravar settings:', err);
    }
  }

  getSettings(): EngineSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<EngineSettings>): EngineSettings {
    const next: EngineSettings = { ...this.settings, ...patch };
    if (patch.claudeEnabled != null && patch.anthropicEnabled == null) {
      next.anthropicEnabled = patch.claudeEnabled;
    }
    if (patch.anthropicEnabled != null && patch.claudeEnabled == null) {
      next.claudeEnabled = patch.anthropicEnabled;
    }
    next.defaultEngine = normalizeEngine(next.defaultEngine);

    const flags: Partial<Record<MotorId | 'anthropic', boolean>> = {
      cursor: next.cursorEnabled,
      claude: next.claudeEnabled,
      anthropic: next.anthropicEnabled,
      codex: next.codexEnabled,
      antigravity: next.antigravityEnabled,
    };
    const available = enabledMotors(flags);
    if (!available.some((m) => m.id === next.defaultEngine)) {
      next.defaultEngine = available[0].id as EngineKind;
    }

    const fitted = fitCall(next.defaultEngine, next.defaultModel, next.defaultEffort);
    next.defaultEngine = fitted.motor.id as EngineKind;
    next.defaultModel = fitted.model.id;
    next.defaultEffort = fitted.effort.id;

    this.settings = next;
    this.persist();
    return this.getSettings();
  }

  getCatalog() {
    const settings = this.getSettings();
    const flags: Partial<Record<MotorId | 'anthropic', boolean>> = {
      cursor: settings.cursorEnabled,
      claude: settings.claudeEnabled,
      anthropic: settings.anthropicEnabled,
      codex: settings.codexEnabled,
      antigravity: settings.antigravityEnabled,
    };
    const engines = enabledMotors(flags).map((motor) => ({
      id: motor.id,
      label: motor.label,
      sdk: motor.sdk,
      cli: motor.cli,
      protocol: motor.protocol,
      enabled: true,
      is_default: motor.id === normalizeEngine(settings.defaultEngine),
      models: motor.models,
    }));
    return {
      settings,
      engines,
      caption: callCaption(settings.defaultEngine, settings.defaultModel, settings.defaultEffort),
    };
  }

  resolveCall(engine?: string | null, model?: string | null, effort?: string | null) {
    const settings = this.getSettings();
    return fitCall(
      engine || settings.defaultEngine,
      model || settings.defaultModel,
      effort || settings.defaultEffort,
    );
  }

  getDriver(kind?: EngineKind | string): AgentEngineDriver {
    const targetKind = normalizeEngine(kind || this.settings.defaultEngine);
    const driver = this.drivers.get(targetKind) || this.drivers.get('cursor');
    if (!driver) {
      throw new Error(`Motor não configurado: ${targetKind}`);
    }
    return driver;
  }

  async executeTask(
    ctx: ExecutionContext,
    engine: EngineKind | string,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult> {
    const chosen = this.resolveCall(engine, ctx.model, ctx.effort);
    const driver = this.getDriver(chosen.motor.id);
    return driver.execute(
      {
        ...ctx,
        model: chosen.model.id,
        effort: chosen.effort.id,
      },
      emitEvent,
    );
  }
}

export const engineHub = new EngineHub();
export { motorById, callCaption };
