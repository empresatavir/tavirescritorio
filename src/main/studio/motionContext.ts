import * as fs from 'node:fs';
import * as path from 'node:path';
import { MOTION_TOKEN_PADRAO, type BrandKit, type MotionKit, type MotionPreset, type Perfil } from '../../shared/studio';

export const MOTION_CONTRACT = `# Contrato de motion

1. Toda animação usa \`useCurrentFrame()\` + \`interpolate()\` / \`spring()\`. Proibido: animação CSS (\`@keyframes\`, \`transition:\`), \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, \`Date.now()\`, \`Math.random()\` (use \`random(seed)\` do Remotion).
2. Tempos vêm só dos \`tokens\` do kit (props). Nada de número mágico de duração.
3. Toda composição exporta um schema \`zod\` e \`defaultProps\` completos; registra no \`Root.tsx\`.
4. Texto sempre dentro de \`<SafeArea zone={...}>\` (componente-base do repo).
5. Fontes por \`staticFile()\` ou \`@remotion/google-fonts\`; imagens e vídeos por \`staticFile()\` ou caminho passado em props. Nenhuma URL remota.
6. Uma coisa se mexe por vez; entradas em sequência com \`staggerFrames\`.
7. Entrada com desaceleração (easing do kit), saída com aceleração.
8. Escrever só dentro de \`src/kits/<kitId>/\` do workspace do job. Nunca tocar \`src/base/\`, \`Root.tsx\` fora do bloco marcado, \`package.json\` ou \`remotion.config.ts\`.
`;

const PRESET_SKILLS: Record<MotionPreset, string[]> = {
  'titulo-entrada': ['remotion-best-practices', 'remotion-markup'],
  'troca-cena': ['remotion-best-practices', 'remotion-markup'],
  'destaque-palavra': ['remotion-best-practices', 'remotion-markup', 'remotion-captions'],
  'zoom-lento': ['remotion-best-practices', 'remotion-markup'],
  'legenda-palavra': ['remotion-best-practices', 'remotion-markup', 'remotion-captions'],
  'transicao-capitulo': ['remotion-best-practices', 'remotion-markup'],
  'encerramento-cta': ['remotion-best-practices', 'remotion-markup'],
};

function skillPaths(preset: MotionPreset): string[] {
  return PRESET_SKILLS[preset].map((name) => `.agents/skills/${name}/SKILL.md`);
}

function pointer(preset?: MotionPreset): string {
  const skills = preset ? skillPaths(preset).map((item) => `- \`${item}\``).join('\n') : '- `.agents/skills/`';
  return `# Motion TAVIR

Leia \`MOTION_CONTRACT.md\` antes de escrever código. O kit do perfil está em \`KIT.md\`.

As skills oficiais ficam na instalação nativa, não numa cópia do repositório:

${skills}

Escreva só em \`src/kits/<kitId>/\`.
`;
}

function kitMarkdown(perfil: Perfil, tokens: MotionKit['tokens']): string {
  const brand: BrandKit = perfil.brand_kit;
  return `# KIT ${perfil.nome}

Tom: ${brand.tone || '—'}
Cânone: ${brand.canon.length ? brand.canon.join('; ') : '—'}

## Paleta

- ink: ${brand.palette.ink}
- surface: ${brand.palette.surface}
- text: ${brand.palette.text}
- accent: ${brand.palette.accent}
- accent2: ${brand.palette.accent2}

## Fontes

- título: ${brand.fonts.title}
- corpo: ${brand.fonts.body}

## Tokens

- easing: ${tokens.easing.join(', ')}
- enterFrames: ${tokens.enterFrames}
- exitFrames: ${tokens.exitFrames}
- staggerFrames: ${tokens.staggerFrames}
- holdPerWordFrames: ${tokens.holdPerWordFrames}
- zoomFrom: ${tokens.zoomFrom}
- zoomTo: ${tokens.zoomTo}
`;
}

function write(file: string, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

/** Escreve o contrato, o kit e os arquivos que cada motor lê. Não copia o repositório de skills. */
export function writeMotionContext(workspace: string, perfil: Perfil, tokens: MotionKit['tokens'] = MOTION_TOKEN_PADRAO): string[] {
  const files = [
    'MOTION_CONTRACT.md',
    'KIT.md',
    'AGENTS.md',
    'CLAUDE.md',
    '.cursor/rules/remotion.mdc',
    '.agents/skills/tavir-motion/SKILL.md',
  ];
  write(path.join(workspace, 'MOTION_CONTRACT.md'), MOTION_CONTRACT);
  write(path.join(workspace, 'KIT.md'), kitMarkdown(perfil, tokens));
  const note = pointer();
  write(path.join(workspace, 'AGENTS.md'), note);
  write(path.join(workspace, 'CLAUDE.md'), note);
  write(path.join(workspace, '.cursor/rules/remotion.mdc'), note);
  write(path.join(workspace, '.agents/skills/tavir-motion/SKILL.md'), `---\nname: tavir-motion\ndescription: Contrato de motion da TAVIR para Antigravity, Cursor e Codex.\n---\n\n${note}`);
  return files;
}

/** Contrato inteiro mais os arquivos de skill do preset. */
export function motionPrompt(preset: MotionPreset, pedido: string): string {
  const files = skillPaths(preset).map((item) => `- ${item}`).join('\n');
  return `${MOTION_CONTRACT}\nPedido: ${pedido}\nPreset: ${preset}\n\nArquivos de regra deste preset:\n${files}\n`;
}
