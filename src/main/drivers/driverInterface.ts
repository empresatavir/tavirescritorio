import type { EngineKind, RunEvent } from '../../shared/types';

export interface ExecutionContext {
  runId: string;
  taskTitle: string;
  workspacePath: string;
  model: string;
  effort: string;
  systemPrompt: string;
  allowedCommands?: string[];
  ceilingUsd?: number;
}

export interface EngineResult {
  success: boolean;
  artifactsCreated: string[];
  tokensTotal: number;
  costUsd: number;
  error?: string;
}

export interface AgentEngineDriver {
  kind: EngineKind;
  name: string;
  isAvailable(): Promise<boolean>;
  execute(
    ctx: ExecutionContext,
    emitEvent: (event: RunEvent) => void,
  ): Promise<EngineResult>;
  cancel(runId: string): Promise<void>;
}
