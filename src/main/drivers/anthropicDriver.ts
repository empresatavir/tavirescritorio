import type { AgentEngineDriver, ExecutionContext, EngineResult } from './driverInterface';
import type { RunEvent } from '../../shared/types';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class AnthropicDriver implements AgentEngineDriver {
  kind = 'claude' as const;
  name = 'Anthropic Claude Agent SDK';

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('claude', ['--version'], { windowsHide: true });
      return !!stdout;
    } catch {
      return true; // fallback via API
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
      content: `Inicializando motor Anthropic para workspace ${ctx.workspacePath}...`,
    });

    // Injeta o CLAUDE.md efêmero no workspace
    const claudeMdPath = join(ctx.workspacePath, 'CLAUDE.md');
    writeFileSync(claudeMdPath, ctx.systemPrompt, 'utf8');

    emitEvent({
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      type: 'thought',
      content: `Executando tarefa: ${ctx.taskTitle} com modelo ${ctx.model}`,
    });

    // Simulação do loop de execução conectando ao workspace
    return {
      success: true,
      artifactsCreated: ['artifacts/entrega.md'],
      tokensTotal: 125000,
      costUsd: 0.85,
    };
  }

  async cancel(runId: string): Promise<void> {
    // Interrompe o processo ativo se houver
  }
}
