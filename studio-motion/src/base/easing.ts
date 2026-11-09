import { Easing } from 'remotion';
import type { MotionTokens } from './tokens';

export function easingFrom(tokens: MotionTokens) {
  const [a, b, c, d] = tokens.easing;
  return Easing.bezier(a, b, c, d);
}
