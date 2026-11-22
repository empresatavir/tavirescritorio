/**
 * F3 do GOAL_FLOW: abrir o Flow sobe o DarkFlow pelo sidecar, se ele não estiver no ar.
 * Quem decide se pode subir é o gerenciador de sidecars (trava do --enable-meta-publish,
 * conflito de porta, dono da porta). Aqui só se pede, espera a saúde e traduz o motivo.
 */

export interface LigarDeps {
  health: (url: string) => Promise<boolean>;
  start: (id: string) => Promise<{ ok: boolean; error?: string }>;
  sleep?: (ms: number) => Promise<void>;
  /** Quanto esperar o DarkFlow responder depois de pedir para subir. */
  timeoutMs?: number;
  intervalMs?: number;
}

export type LigarResultado =
  | { ok: true; jaEstava: boolean }
  | { ok: false; error: string; aviso?: string };

const PORTA = 8765;

/** O TTS local do Docuflow também usa a 8765 (D7). Sem isso, «porta ocupada» não diz o que fazer. */
export function avisoDePorta(error: string): string | undefined {
  if (!new RegExp(`\\b${PORTA}\\b`).test(error) && !/TTS|Docuflow/i.test(error)) return undefined;
  return `A porta ${PORTA} é do DarkFlow e também do TTS local do Docuflow. Pare o que estiver nela (em Configurações › Sistema ou no terminal) e abra o Flow de novo.`;
}

export async function garantirDarkflow(healthUrl: string, deps: LigarDeps): Promise<LigarResultado> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const timeoutMs = deps.timeoutMs ?? 60000;
  const intervalMs = deps.intervalMs ?? 1000;
  if (await deps.health(healthUrl)) return { ok: true, jaEstava: true };
  const started = await deps.start('darkflow');
  if (!started.ok) {
    const error = started.error || 'o DarkFlow não subiu';
    const aviso = avisoDePorta(error);
    return aviso ? { ok: false, error, aviso } : { ok: false, error };
  }
  for (let waited = 0; waited < timeoutMs; waited += intervalMs) {
    await sleep(intervalMs);
    if (await deps.health(healthUrl)) return { ok: true, jaEstava: false };
  }
  return { ok: false, error: `o DarkFlow foi iniciado, mas não respondeu em ${Math.round(timeoutMs / 1000)} s` };
}
