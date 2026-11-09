/** Tokens do kit. Os números vêm das props; estes são só o padrão documentado. */
export interface MotionTokens {
  easing: [number, number, number, number];
  enterFrames: number;
  exitFrames: number;
  staggerFrames: number;
  holdPerWordFrames: number;
  zoomFrom: number;
  zoomTo: number;
}

export const TOKEN_PADRAO: MotionTokens = {
  easing: [0.2, 0.7, 0.2, 1],
  enterFrames: 9,
  exitFrames: 6,
  staggerFrames: 3,
  holdPerWordFrames: 10,
  zoomFrom: 1,
  zoomTo: 1.08,
};

export function tokensOf(input?: Partial<MotionTokens> | null): MotionTokens {
  return { ...TOKEN_PADRAO, ...(input ?? {}) };
}
