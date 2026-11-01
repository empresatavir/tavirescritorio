import type { EngineKind, EngineSettings, RunEvent } from '../../shared/types';
import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import { AnthropicDriver } from './anthropicDriver';
import { CursorDriver } from './cursorDriver';
import { AntigravityDriver } from './antigravityDriver';
import { CodexDriver } from './codexDriver';

class EngineHub {
  private drivers: Map<EngineKind, AgentEngineDriver> = new Map();
  private settings: EngineSettings = {
    anthropicEnabled: true,
    cursorEnabled: true,
    antigravityEnabled: true,
    codexEnabled: true,
    defaultEngine: 'cursor',
  };

  constructor() {
    this.drivers.set('anthropic', new AnthropicDriver());
    this.drivers.set('cursor', new CursorDriver());
    this.drivers.set('antigravity', new AntigravityDriver());
    this.drivers.set('codex', new CodexDriver());
  }

  getSettings(): EngineSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<EngineSettings>): void {
    this.settings = { ...this.settings, ...patch };
  }

  getDriver(kind?: EngineKind): AgentEngineDriver {
    const targetKind = kind || this.settings.defaultEngine;
    const driver = this.drivers.get(targetKind);
    if (!driver) {
      throw new Error(`Motor não configurado: ${targetKind}`);
    }
    return driver;
  }

  async executeTask(
    ctx: ExecutionContext,
    engine: EngineKind,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult> {
    const driver = this.getDriver(engine);
    return driver.execute(ctx, emitEvent);
  }
}

export const engineHub = new EngineHub();
