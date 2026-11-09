export interface Loudness {
  integrated: number;
  truePeak: number;
}

export interface LoudnormMeasure {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
}

function loudnormJson(log: string): Record<string, string> | null {
  const start = log.lastIndexOf('{');
  const end = log.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(log.slice(start, end + 1)) as Record<string, string>;
  } catch {
    return null;
  }
}

/** Lê o JSON que o `loudnorm` imprime no modo de análise. */
export function parseLoudnorm(log: string): Loudness | null {
  const raw = loudnormJson(log);
  if (!raw) return null;
  const integrated = Number(raw.input_i);
  const truePeak = Number(raw.input_tp);
  if (!Number.isFinite(integrated) || !Number.isFinite(truePeak)) return null;
  return { integrated, truePeak };
}

/** Campos medidos para o segundo passe do `loudnorm`. */
export function parseLoudnormMeasure(log: string): LoudnormMeasure | null {
  const raw = loudnormJson(log);
  if (!raw) return null;
  const measure = {
    inputI: Number(raw.input_i),
    inputTp: Number(raw.input_tp),
    inputLra: Number(raw.input_lra),
    inputThresh: Number(raw.input_thresh),
    targetOffset: Number(raw.target_offset),
  };
  return Object.values(measure).every((value) => Number.isFinite(value)) ? measure : null;
}

export function loudnessChecks(level: Loudness | null, duration: number, maxSeconds?: number): Array<{ nome: string; ok: boolean; detalhe: string }> {
  const integratedOk = !!level && level.integrated >= -15 && level.integrated <= -13;
  const peakOk = !!level && level.truePeak <= -1;
  const durationOk = maxSeconds == null || duration <= maxSeconds + 0.05;
  return [
    { nome: 'loudness', ok: integratedOk, detalhe: level ? `${level.integrated.toFixed(1)} LUFS` : 'loudnorm sem leitura' },
    { nome: 'pico', ok: peakOk, detalhe: level ? `${level.truePeak.toFixed(1)} dBTP` : '—' },
    { nome: 'duração', ok: durationOk, detalhe: `${duration.toFixed(2)} s` },
  ];
}

/** O gancho precisa de mudança visual nos primeiros 15 frames. O limiar é o mesmo da checagem C7. */
export function visualHookOk(meanAbsDiff: number): boolean {
  return meanAbsDiff > 0.25;
}
