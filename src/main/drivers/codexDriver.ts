import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import type { RunEvent } from '../../shared/types';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class CodexDriver implements AgentEngineDriver {
  kind = 'codex' as const;
  name = 'OpenAI Codex Engine';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async execute(
    ctx: ExecutionContext,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult> {
    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Inicializando OpenAI Codex no workspace ${ctx.workspacePath}...`,
    });

    const instructionsPath = join(ctx.workspacePath, 'INSTRUCTIONS.md');
    writeFileSync(instructionsPath, ctx.systemPrompt, 'utf8');

    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Codex processando tarefa: ${ctx.taskTitle}`,
    });

    return {
      success: true,
      artifactsCreated: ['artifacts/codex_output.md'],
      tokensTotal: 110000,
      costUsd: 0.70,
    };
  }

  async cancel(runId: string): Promise<void> {}
}
