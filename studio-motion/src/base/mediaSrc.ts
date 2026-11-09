import { staticFile } from 'remotion';

/** Caminho relativo à pasta public vira URL do bundle. URL remota passa direto. */
export function mediaSrc(src: string): string {
  if (!src || /^(https?:|data:|blob:)/i.test(src)) return src;
  return staticFile(src);
}
