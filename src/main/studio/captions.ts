export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionWord {
  text: string;
  startMs: number;
  endMs: number;
}

export function activeWord(words: CaptionWord[], timeMs: number): CaptionWord | null {
  if (!Number.isFinite(timeMs)) return null;
  return words.find((word) => timeMs >= word.startMs && timeMs < word.endMs) ?? null;
}

export function placeCaptions(words: CaptionWord[], offsetMs: number): CaptionWord[] {
  if (!Number.isFinite(offsetMs)) return [];
  return words
    .map((word) => ({
      text: word.text.trim(),
      startMs: Math.round(word.startMs + offsetMs),
      endMs: Math.round(word.endMs + offsetMs),
    }))
    .filter((word) => word.text && word.endMs >= word.startMs);
}

export function captionsFromWhisper(words: WhisperWord[]): CaptionWord[] {
  return words
    .filter((word) => word.word?.trim() && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end >= word.start)
    .map((word) => ({
      text: word.word.trim(),
      startMs: Math.round(word.start * 1000),
      endMs: Math.round(word.end * 1000),
    }));
}

function stamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  const pad = (value: number, size: number) => String(value).padStart(size, '0');
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

export function toSrt(words: CaptionWord[]): string {
  return words.map((word, index) => `${index + 1}\n${stamp(word.startMs)} --> ${stamp(word.endMs)}\n${word.text}\n`).join('\n');
}
