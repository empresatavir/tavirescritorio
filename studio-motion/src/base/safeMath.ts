/** Mesma conta de `src/shared/studioPreview.ts`. Fica aqui porque o render copia só `studio-motion`. */

export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CHAR_WIDTH = 0.52;

export function titleBox(input: {
  title: string;
  width: number;
  height: number;
  zone: { top: number; bottom: number; left: number; right: number };
  fontSize?: number;
  lineHeight?: number;
}): TextBox {
  const font = input.fontSize ?? 64;
  const line = input.lineHeight ?? 1.05;
  const innerW = Math.max(1, input.width - input.zone.left - input.zone.right);
  const perLine = Math.max(1, Math.floor(innerW / (font * CHAR_WIDTH)));
  const lines = Math.max(1, Math.ceil(Math.max(1, Array.from(input.title || ' ').length) / perLine));
  const height = lines * font * line;
  return {
    x: input.zone.left,
    y: input.height - input.zone.bottom - height,
    width: innerW,
    height,
  };
}

export function textOutsideSafeZone(
  box: TextBox,
  frame: { width: number; height: number },
  zone: { top: number; bottom: number; left: number; right: number },
): boolean {
  const right = frame.width - zone.right;
  const bottom = frame.height - zone.bottom;
  return box.x < zone.left - 0.5
    || box.y < zone.top - 0.5
    || box.x + box.width > right + 0.5
    || box.y + box.height > bottom + 0.5;
}
