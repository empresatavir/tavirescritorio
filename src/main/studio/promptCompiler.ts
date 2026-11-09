import type { BrandKit } from '../../shared/studio';

export interface PromptLayers {
  subject: string;
  action: string;
  setting: string;
  composition: string;
  camera: string;
  light: string;
  style: string;
  format: string;
  sound: string;
  palette: string;
  restrictions: string;
}

export interface CompiledPrompt {
  texto: string;
  resumo: string;
  camadas: PromptLayers;
  avisos: string[];
}

export interface CompileInput {
  kind: 'imagem' | 'video';
  titulo: string;
  apoio?: string;
  tema?: string;
  layout?: string;
  character?: { name: string; description: string } | null;
  camera?: string;
  light?: string;
  brand: Pick<BrandKit, 'palette' | 'imageStyle' | 'negatives'>;
  aspect: string;
}

const VIDEO_CAMERAS = [
  'static tripod shot',
  'slow dolly in',
  'slow dolly out',
  'slow pan left',
  'slow pan right',
  'slow orbit',
  'handheld subtle',
] as const;

const COLOR_WORDS: Record<string, string> = {
  '#0B1220': 'deep ink blue',
  '#F4F6F2': 'warm off-white',
  '#B7F34A': 'lime',
  '#1BC5BD': 'teal',
};

const TEXT_REQUEST = /\b(with the words|text saying|letters saying|caption that reads|write the|add text|include text|watermark|logo of|com o texto|escreva|letras dizendo)\b/i;
const NO_TEXT = 'no text, no letters, no watermark, no logos';

function colorWord(hex: string): string {
  return COLOR_WORDS[hex.toUpperCase()] || COLOR_WORDS[hex] || `the color ${hex}`;
}

function freeSpace(layout?: string): string {
  if (layout === 'imagem-cheia') return 'title space kept clear at the top';
  if (layout === 'dado') return 'the center kept clear';
  if (layout === 'fonte') return 'the lower third kept clear';
  if (layout === 'cta') return 'the center kept clear for a later caption';
  return 'the upper third left empty for the title';
}

export function textoFromLayers(camadas: PromptLayers): string {
  const lines = [
    camadas.subject,
    camadas.action,
    camadas.setting,
    camadas.composition,
    camadas.camera,
    camadas.light,
    camadas.style,
    camadas.palette,
    camadas.format,
    camadas.sound,
    camadas.restrictions,
  ].map((line) => line.trim()).filter(Boolean);
  return lines.join('\n');
}

export function compilePrompt(input: CompileInput): CompiledPrompt {
  const video = input.kind === 'video';
  const character = input.character?.description?.trim()
    ? input.character
    : null;
  const subject = character
    ? `${character.name}. Use the reference images of ${character.name} as an ingredient in Flow. Exact description: "${character.description}"`
    : `The subject of the brief: "${input.titulo}"`;
  const action = video
    ? `One action only: ${input.apoio?.trim() || 'a single gesture held for the shot'}`
    : (input.apoio?.trim() || 'A still moment, with no second action');
  const camera = video
    ? (VIDEO_CAMERAS.find((item) => item === input.camera) || 'slow dolly in')
    : (input.camera?.trim() || '50mm lens, moderate depth of field');
  const negatives = (input.brand.negatives || []).map((item) => item.trim()).filter(Boolean);
  const camadas: PromptLayers = {
    subject,
    action,
    setting: input.tema?.trim() || 'A place that matches the brief',
    composition: `Medium shot, eye level, subject low in the frame, ${freeSpace(input.layout)}`,
    camera,
    light: input.light?.trim() || 'Soft side light, daytime',
    style: input.brand.imageStyle?.trim() || 'Photographic, consistent with the brand',
    palette: `Palette of ${colorWord(input.brand.palette.ink)}, ${colorWord(input.brand.palette.text)}, ${colorWord(input.brand.palette.accent)} and ${colorWord(input.brand.palette.accent2)}`,
    format: video ? `${input.aspect} frame, 8 seconds` : `${input.aspect} frame`,
    sound: video ? 'Ambient room tone, no dialogue, no music' : '',
    restrictions: [NO_TEXT, ...negatives].join('. '),
  };
  const texto = textoFromLayers(camadas);
  const check = validatePrompt(camadas, texto);
  const resumo = [
    character ? `Personagem ${character.name}, com a descrição da bíblia copiada sem mudar.` : 'Sem personagem fixo.',
    video ? 'Vídeo: gerar a imagem primeiro, aprovar, depois animar a partir dela (quadro inicial). Usar só 2–4 s do resultado na edição.' : 'Imagem estática para o slot.',
    `Proporção ${input.aspect}.`,
  ].join(' ');
  return { texto, resumo, camadas, avisos: check.avisos };
}

export function validatePrompt(camadas: Partial<PromptLayers>, texto: string): { ok: boolean; erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const required: Array<[keyof PromptLayers, string]> = [
    ['subject', 'assunto'],
    ['composition', 'composição'],
    ['style', 'estilo'],
    ['format', 'formato'],
    ['restrictions', 'restrições'],
  ];
  for (const [key, nome] of required) {
    if (!camadas[key]?.trim()) erros.push(`falta a camada ${nome}`);
  }
  if (camadas.restrictions && !camadas.restrictions.toLowerCase().includes(NO_TEXT)) {
    erros.push('restrição sem a proibição de texto');
  }
  const pedido = [
    camadas.subject, camadas.action, camadas.setting, camadas.composition,
    camadas.camera, camadas.light, camadas.style, camadas.palette, camadas.format, camadas.sound,
  ].filter(Boolean).join('\n');
  if (TEXT_REQUEST.test(pedido)) erros.push('o prompt pede texto na imagem');
  const avisos = texto.length > 900 ? ['o prompt passa de 900 caracteres'] : [];
  return { ok: erros.length === 0, erros, avisos };
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  if (start < 0) return null;
  try {
    const value = JSON.parse(body.slice(start, body.lastIndexOf('}') + 1));
    return value && typeof value === 'object' ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** Aplica só as camadas 1–3 e 6. Se o resultado não passa no validador, descarta. */
export function applyRewrite(camadas: PromptLayers, reply: string): { ok: true; camadas: PromptLayers; texto: string; avisos: string[] } | { ok: false; error: string } {
  const raw = extractJson(reply);
  const pick = (key: string) => typeof raw?.[key] === 'string' ? String(raw[key]).trim() : '';
  const subject = pick('subject');
  const action = pick('action');
  const setting = pick('setting');
  const light = pick('light');
  if (!raw || !subject || !action || !setting || !light) return { ok: false, error: 'o motor não devolveu as camadas 1, 2, 3 e 6' };
  const exact = camadas.subject.match(/Exact description: "([\s\S]*)"/);
  const keptSubject = exact && !subject.includes(exact[1]) ? `${subject} Exact description: "${exact[1]}"` : subject;
  const next: PromptLayers = { ...camadas, subject: keptSubject, action, setting, light };
  const texto = textoFromLayers(next);
  const check = validatePrompt(next, texto);
  if (!check.ok) return { ok: false, error: check.erros.join('; ') };
  return { ok: true, camadas: next, texto, avisos: check.avisos };
}
