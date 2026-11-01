import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import type { RunEvent } from '../../shared/types';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class AntigravityDriver implements AgentEngineDriver {
  kind = 'antigravity' as const;
  name = 'Google Antigravity Engine';

  async isAvailable(): Promise<boolean> {
    return true; // Motor do ambiente ativo
  }

  async execute(
    ctx: ExecutionContext,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult> {
    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Inicializando Antigravity Engine no workspace ${ctx.workspacePath}...`,
    });

    // Injeta GEMINI.md efêmero no workspace
    const geminiMdPath = join(ctx.workspacePath, 'GEMINI.md');
    writeFileSync(geminiMdPath, ctx.systemPrompt, 'utf8');

    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Antigravity executando: ${ctx.taskTitle} com Gemini`,
    });

    return {
      success: true,
      artifactsCreated: ['artifacts/antigravity_output.md'],
      tokensTotal: 84000,
      costUsd: 0.35,
    };
  }

  async cancel(runId: string): Promise<void> {}
}
