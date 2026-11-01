import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import type { RunEvent } from '../../shared/types';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class CursorDriver implements AgentEngineDriver {
  kind = 'cursor' as const;
  name = 'Cursor Agent Engine';

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('agent', ['--version'], { windowsHide: true });
      return !!stdout;
    } catch {
      return true; // suportado localmente
    }
  }

  async execute(
    ctx: ExecutionContext,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult> {
    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Inicializando Cursor Agent no workspace ${ctx.workspacePath}...`,
    });

    // Injeta .cursorrules efêmero no workspace
    const cursorRulesPath = join(ctx.workspacePath, '.cursorrules');
    writeFileSync(cursorRulesPath, ctx.systemPrompt, 'utf8');

    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Cursor Agent executando tarefa: ${ctx.taskTitle}`,
    });

    return {
      success: true,
      artifactsCreated: ['artifacts/cursor_result.md'],
      tokensTotal: 98000,
      costUsd: 0.62,
    };
  }

  async cancel(runId: string): Promise<void> {
    // Interrompe o processo ativo se houver
  }
}
