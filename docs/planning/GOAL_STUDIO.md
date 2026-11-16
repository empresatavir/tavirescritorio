# GOAL — Studio de Conteúdo, Motion (Remotion) e ecossistema DarkFlow + Docuflow

> Data: 2026-11-08 · Dono: Carlos (CEO) · Executor: Cursor (ou qualquer motor da TAVIR).
> Este documento é a ordem de serviço completa. **Não decida nada que não esteja aqui.** Se faltar
> informação, PARE e pergunte ao Carlos. Cada fase só termina quando o **Portão de saída** passar e
> o Carlos responder "ok F<n>". Nunca comece a fase seguinte sem esse ok.

---

## 0. O GOAL em uma frase

Fazer o Studio do Escritório produzir, **localmente e sem custo por peça**, carrosséis, posts e
Reels de vários perfis e redes — da pauta ao pacote pronto para publicar — com **prévia fiel por
dispositivo**, **motion de qualidade feito com as skills do Remotion por qualquer um dos 4 motores**
(Claude, Cursor, Codex, Antigravity), **prompts estruturados para o Google Flow** gerar as imagens e
vídeos, e ligar o **DarkFlow** (agenda e publicação) e o **Docuflow** (vídeo longo / YouTube) como
partes do mesmo ecossistema — sem nenhuma etapa fechar pela resposta de um motor.

### Por que existe

Hoje o Studio é só uma tela de demonstração: perfis, ângulos, slides e números estão fixos no código,
nada é salvo e os botões "Novo perfil", "Nova produção" e "Ajuste fino" não abrem nada. O Carlos não
quer depender do Claude a cada peça e o Escritório não gera imagem. A solução é:

1. **Claude/motores entram só para criar os modelos** (kits de motion, ângulos e roteiros quando pedido).
2. **A produção de cada peça roda local**: modelos Remotion + FFmpeg + dados do Studio.
3. **Imagens e vídeos de IA vêm do Google Flow**, guiados por prompts que o Studio monta.

### Definição de "100% utilizável" (critério final do GOAL)

O GOAL só fecha quando o Carlos conseguir, sem editar código e sem abrir outro programa além do
Google Flow:

1. Cadastrar os perfis **Multiverso Paranoico**, **TAVIR Oficial** e **TAVIR B2B**, com as redes de cada um.
2. Criar uma peça **carrossel 4:5** do Multiverso: pauta → ângulo (gate) → roteiro → prompts para o
   Flow → importar imagens baixadas → arte renderizada → revisão (gate) → pacote com PNGs + legenda.
3. Criar um **Reel 9:16** com narração local, legenda animada palavra por palavra, motion do kit do
   perfil e áudio a −14 LUFS, renderizado em MP4 1080×1920.
4. Ver as duas peças na **prévia por dispositivo** igual ao arquivo final (mesmo render).
5. Pedir a **qualquer um dos 4 motores** um novo preset de motion e ele passar nas checagens.
6. Mandar o Reel aprovado para a **agenda do DarkFlow** (gate de publicação do CEO antes).
7. Mandar um roteiro longo para o **Docuflow** como projeto do canal Multiverso Paranoico.

---

## 1. Contexto obrigatório (leia antes de qualquer fase)

| O quê | Onde | Para quê |
|---|---|---|
| Regras do projeto | `CLAUDE.md` (raiz) | Portas, SVG, `.bat` CRLF, `launch.json` imutável, **regra 8: quem decide é a checagem, não o motor**. |
| Modelo de GOAL já usado | `docs/planning/GOAL_RAIOX.md` | Mesmo formato, mesmo rigor. Copie o estilo. |
| **Tela real do Studio** | Página `16017d18-269b-4357-ad7b-a062bb3012c1` (`./Studio.dc.html`) no manifest de `C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html` (fallback: `src/renderer/reference_app.html`) | É ESTA a tela que o app empacotado mostra. `src/renderer/views/StudioView.tsx` é só do modo dev e **não** é a fonte. |
| Tela real da Edição | Página `508d093f-1272-42dd-9a7b-df8fdbe3246d` (`./Edicao.dc.html`) | Timeline, revisão de legenda, fila de render. Usada na F8. |
| Tela real do Flow | Página `1661c4ce-e992-453f-aac1-d7e20e73d1c5` (`./Flow.dc.html`) | Workflows com gatilho, passos e gate. Usada na F8. |
| Tela real do Social | Página `4de11384-84d7-4565-aa6e-7c22c5e8ecbd` (`./Social.dc.html`) | Perfis e calendário. Usada na F1. |
| Como uma página `.dc.html` é ligada | `scripts/clean_and_bind_ipc.js` seção "1.2 Fábrica" + `src/renderer/fabrica-ref/Fabrica.dc.html` | Modelo a copiar: página própria em `src/renderer/<mod>-ref/`, injetada no manifest no build, chamando `window.tavir.*`, **build falha** se o arquivo faltar, fixtures removidos. |
| Como extrair uma página do manifest | Ler `<script type="__bundler/manifest">`, pegar `manifest[uuid].data` (base64, gzip se `compressed`) | Para começar a `Studio.dc.html` a partir da referência. |
| Camada dos 4 motores | `src/main/motors.ts` (`runMotor`, `MotorCall`, `findMotorBinary`, `MOTOR_IDS`) | Único jeito de chamar motor. Não criar outro. |
| Configuração de motor/modelo padrão | `src/main/drivers/engineHub.ts`, `src/shared/engineCatalog.ts`, `db/engine_settings.json` | O Studio usa o motor padrão, com troca por job. |
| Livro de execuções | `src/main/runLedger.ts` | Toda chamada de motor do Studio é registrada aqui. |
| Conformidade dos motores | `src/main/motorConformance.ts` + `scripts/conformidade_motores.js` | Modelo para a conformidade de motion (F3). |
| Persistência | `src/main/db.ts` (usa `node:sqlite` `DatabaseSync`) | O Studio usa `node:sqlite`, banco **próprio** (seção 6). |
| IPC | `src/main/ipc.ts` (função `handle`), `src/preload/index.ts`, `TavirApi` em `src/shared/types.ts` | Padrão para os canais `studio:*`. |
| Mascarar segredo | `maskSecret` em `src/main/seg/segRules.ts` | Logs e relatórios. |
| Padrão de testes | `tests/unit/*.spec.ts` (vitest, `fs.mkdtempSync`) | Copiar o estilo. |
| DarkFlow (somente leitura) | `C:/Users/carlo/Downloads/Projetos a Estudar/DarkFlow` — `README.md`, `USO.md`, `backend/main.py`, `backend/publisher/api.py`, `backend/publisher/store.py` | API em `127.0.0.1:8765`; CORS restrito + CSRF (`GET /api/publisher/session`). Publica **só Reels no Instagram**. |
| Docuflow (somente leitura) | `C:/Users/carlo/Downloads/Projetos a Estudar/AgenciaIA/projetos_tavir/docuflow` — `README.md`, `FLUXO_DE_PRODUCAO.md`, `docuflow/api.py` (docs em `/docs`), `PLANO_EVOLUCAO_STUDIO_REDE_YOUTUBE_2026-09-22.md` | API em `:5000`, Studio web em `:3000`, TTS local em `:8765`/`:8775`. Sem OAuth/upload YouTube. |
| Skills oficiais do Remotion | https://www.remotion.dev/docs/ai/skills e repositório `remotion-dev/skills` | Fonte das regras de motion (F3). |

---

## 2. Decisões já tomadas (não reabrir)

1. **Só Electron.** Código do Escritório em `src/`. Nada em `backend/` nem `frontend/`.
2. **Telas = páginas `.dc.html`** em `src/renderer/studio-ref/` (Studio, e na F8 Edição/Flow),
   injetadas pelo `scripts/clean_and_bind_ipc.js` no lugar das páginas de referência, igual à Fábrica.
   `StudioView.tsx` não recebe evolução; no fim da F1 ele mostra só um aviso "modo dev: use o app empacotado".
3. **Motion = Remotion.** Um projeto Remotion separado em `studio-motion/` (raiz do repo, com
   `package.json` próprio). É a **única** exceção à regra "nada novo fora de `src/`, `tests/`, `docs/`".
4. **Um motor de render para tudo:** carrossel/post = `renderStill` do Remotion; Reels/Stories/Shorts =
   `renderMedia`. A prévia no dispositivo mostra **o próprio arquivo renderizado** (prévia = arquivo final).
5. **Render roda em processo filho Node** (`node studio-motion/scripts/render.mjs`), nunca dentro do
   processo principal do Electron. Comunicação por JSON em linhas no stdout.
6. **Skills do Remotion valem para os 4 motores** por três camadas (detalhe na F3):
   cópia fixada no repo + instalação nativa onde o CLI suporta + **pacote de contexto universal** que
   o Studio escreve no workspace e no prompt. Quem decide se o resultado presta são as **checagens**.
7. **Texto nunca vai dentro da imagem de IA.** Título, legenda e números entram por cima, no modelo
   Remotion. O prompt do Flow pede imagem sem texto.
8. **Dados do Studio ficam fora do git**, na pasta de dados (seção 6). Código e modelos-base ficam no repo.
9. **Etapas de uma peça só avançam por ação do CEO na tela** (IPC chamado por clique). Gates
   obrigatórios: **ângulo**, **revisão** e **publicação**. Kit de motion só vira `aprovado` por gate.
10. **DarkFlow e Docuflow continuam nos repositórios deles.** O Escritório só os inicia, consulta a
    saúde e chama as APIs pelo **processo principal** (nunca pelo renderer). Nenhum arquivo desses
    repositórios é alterado neste GOAL.
11. **Fora do escopo deste GOAL:** upload para YouTube, publicação de carrossel/imagem no Instagram
    (o DarkFlow não suporta; vira GOAL próprio no repo do DarkFlow), TikTok, LinkedIn automático,
    inbox real de mensagens.

---

## 3. Decisões pendentes (bloqueiam só a fase indicada)

| # | Pergunta para o Carlos | Bloqueia | Padrão se ele não responder |
|---|---|---|---|
| D1 | A TAVIR se enquadra na licença gratuita do Remotion (pessoa física / empresa pequena)? Conferir em remotion.dev/license. Se não, comprar a Company License. | **Portão final (F9)** — desenvolvimento pode seguir | Respondida em 9 de novembro de 2026: entra na licença gratuita. |
| D2 | Conflito de porta: DarkFlow API e TTS local do Docuflow usam **8765**. Qual muda (no repo dele, fora deste GOAL)? | F8 | O sidecar manager recusa subir os dois juntos e mostra o motivo. |
| D3 | TTS 100% offline (Piper, voz pt-BR) ou aceita `edge-tts` (grátis, precisa de internet)? | F7 | `edge-tts` como padrão; Piper opcional se o binário existir. |
| D4 | Valores de zona segura e limites de texto por rede (seção 4.3). Carlos confirma com print real do celular. | Portão da F4 | Valores iniciais da seção 4.3. |
| D5 | Pasta de dados do Studio. | F0 | `%USERPROFILE%\TAVIR\Studio` |
| D6 | Licença do repositório `remotion-dev/skills` permite copiar para o repo? (Cursor confere o arquivo LICENSE e informa.) | F3 | Se não permitir: não copiar; só instalação nativa + pacote de contexto escrito pela TAVIR com as regras próprias (seção 4.5). |

---

## 4. Constantes (copiar literalmente)

### 4.1 Redes e formatos — `src/shared/studio.ts`

```ts
export const STUDIO_NETWORKS = ['instagram', 'youtube', 'tiktok', 'linkedin'] as const;
export type StudioNetwork = typeof STUDIO_NETWORKS[number];
export const STUDIO_NETWORK_LABEL: Record<StudioNetwork, string> = {
  instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', linkedin: 'LinkedIn',
};

export type StudioMediaKind = 'still' | 'carousel' | 'video';

export interface StudioFormat {
  id: string;
  network: StudioNetwork;
  label: string;
  kind: StudioMediaKind;
  width: number;
  height: number;
  fps?: number;            // só vídeo
  maxSeconds?: number;     // só vídeo — valor inicial, confirmar (D4)
  minSlides?: number;      // só carrossel
  maxSlides?: number;      // só carrossel — valor inicial, confirmar (D4)
  safeZoneId?: string;     // seção 4.3
}

export const STUDIO_FORMATS: StudioFormat[] = [
  { id: 'ig-carrossel-4x5', network: 'instagram', label: 'Carrossel 4:5', kind: 'carousel', width: 1080, height: 1350, minSlides: 2, maxSlides: 20, safeZoneId: 'ig-feed' },
  { id: 'ig-post-4x5',      network: 'instagram', label: 'Post 4:5',      kind: 'still',    width: 1080, height: 1350, safeZoneId: 'ig-feed' },
  { id: 'ig-post-1x1',      network: 'instagram', label: 'Post 1:1',      kind: 'still',    width: 1080, height: 1080, safeZoneId: 'ig-feed' },
  { id: 'ig-reels-9x16',    network: 'instagram', label: 'Reel 9:16',     kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 90,  safeZoneId: 'ig-reels' },
  { id: 'ig-stories-9x16',  network: 'instagram', label: 'Stories 9:16',  kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'ig-stories' },
  { id: 'yt-shorts-9x16',   network: 'youtube',   label: 'Shorts 9:16',   kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'yt-shorts' },
  { id: 'yt-longo-16x9',    network: 'youtube',   label: 'Vídeo 16:9',    kind: 'video',    width: 1920, height: 1080, fps: 30 },
  { id: 'yt-thumb-16x9',    network: 'youtube',   label: 'Miniatura',     kind: 'still',    width: 1280, height: 720 },
  { id: 'tt-video-9x16',    network: 'tiktok',    label: 'TikTok 9:16',   kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'tiktok' },
  { id: 'li-post-4x5',      network: 'linkedin',  label: 'Post 4:5',      kind: 'still',    width: 1080, height: 1350 },
  { id: 'li-documento-4x5', network: 'linkedin',  label: 'Documento 4:5', kind: 'carousel', width: 1080, height: 1350, minSlides: 2, maxSlides: 20 },
];
// yt-longo-16x9 não é produzido no Studio: vai para o Docuflow (F8).
```

### 4.2 Etapas, estados e gates da peça

```ts
export const PIECE_STAGES = ['pauta', 'angulo', 'roteiro', 'arte', 'audio', 'revisao', 'pacote', 'publicado'] as const;
export type PieceStage = typeof PIECE_STAGES[number];
export const PIECE_STAGE_LABEL: Record<PieceStage, string> = {
  pauta: 'Pauta', angulo: 'Ângulo', roteiro: 'Roteiro', arte: 'Arte', audio: 'Áudio',
  revisao: 'Revisão', pacote: 'Pacote', publicado: 'Publicado',
};
/** Etapas que só avançam por gate do CEO. */
export const PIECE_GATES: PieceStage[] = ['angulo', 'revisao', 'pacote'];
// 'pacote' → 'publicado' é o gate de publicação.
/** Carrossel e post pulam 'audio'. */
export function stagesFor(kind: StudioMediaKind): PieceStage[] {
  return kind === 'video' ? [...PIECE_STAGES] : PIECE_STAGES.filter((s) => s !== 'audio');
}
export const PIECE_STATUS = ['ativa', 'pausada', 'arquivada'] as const;
export const GATE_DECISIONS = ['aprovado', 'ajuste', 'recusado'] as const;
```

Regra: `ajuste` volta a peça para a etapa **anterior** ao gate, guardando o comentário.

### 4.3 Zonas seguras (valores iniciais, D4 confirma) — px sobre o tamanho do formato

```ts
export interface SafeZone { id: string; top: number; bottom: number; left: number; right: number; note: string; }
export const SAFE_ZONES: SafeZone[] = [
  { id: 'ig-feed',    top: 0,   bottom: 0,   left: 60, right: 60,  note: 'Margem de respiro; o feed não cobre a arte.' },
  { id: 'ig-reels',   top: 220, bottom: 420, left: 60, right: 140, note: 'Topo: cabeçalho. Base: legenda e áudio. Direita: curtir/comentar.' },
  { id: 'ig-stories', top: 250, bottom: 340, left: 60, right: 60,  note: 'Topo: barra de progresso e perfil. Base: responder.' },
  { id: 'yt-shorts',  top: 200, bottom: 480, left: 60, right: 160, note: 'Base maior por causa do título e inscrever-se.' },
  { id: 'tiktok',     top: 200, bottom: 480, left: 60, right: 160, note: 'Igual aos Shorts até o Carlos confirmar.' },
];
export const TEXT_LIMITS = {
  capaMaxChars: 60,          // título do slide de capa
  slideMaxChars: 140,        // texto de apoio por slide
  legendaVisivelChars: 125,  // antes do "…mais" no feed
  legendaMaxChars: 2200,     // Instagram
  hashtagsMax: 5,            // valor inicial — confirmar (D4)
};
```

### 4.4 Kit de marca e kit de motion por perfil

```ts
export interface BrandKit {
  palette: { ink: string; surface: string; text: string; accent: string; accent2: string };
  fonts: { title: string; body: string; mono?: string };   // nome + arquivo local em marca/fontes/
  logoPath?: string;
  voice?: { provider: 'edge-tts' | 'piper'; voiceId: string; rate?: string };
  imageStyle: string;          // ex.: "fotografia documental, grão de filme 35mm, luz dura lateral"
  negatives: string[];         // ex.: ["texto na imagem", "marca d'água", "rosto deformado"]
  characters: Array<{ id: string; name: string; description: string; refImages: string[] }>;
  tone: string;                // tom editorial
  canon: string[];             // regras do canal (aparecem na Mesa do Oráculo)
}

export const MOTION_PRESETS = [
  'titulo-entrada', 'troca-cena', 'destaque-palavra', 'zoom-lento',
  'legenda-palavra', 'transicao-capitulo', 'encerramento-cta',
] as const;
export type MotionPreset = typeof MOTION_PRESETS[number];

export interface MotionKit {
  id: string;
  profileId: string;
  name: string;
  version: number;
  status: 'rascunho' | 'aprovado';
  tokens: {
    easing: [number, number, number, number]; // padrão TAVIR: [0.2, 0.7, 0.2, 1]
    enterFrames: number;   // padrão 9  (0,3 s a 30 fps)
    exitFrames: number;    // padrão 6
    staggerFrames: number; // padrão 3
    holdPerWordFrames: number; // padrão 10 (~3 palavras/s)
    zoomFrom: number;      // padrão 1.00
    zoomTo: number;        // padrão 1.08
  };
  presets: Record<MotionPreset, { component: string; approvedAt?: string }>;
}
```

### 4.5 Contrato de motion (vira `studio-motion/MOTION_CONTRACT.md` e entra no prompt de todo job)

1. Toda animação usa `useCurrentFrame()` + `interpolate()` / `spring()`. **Proibido**: animação CSS
   (`@keyframes`, `transition:`), `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now()`,
   `Math.random()` (use `random(seed)` do Remotion).
2. Tempos vêm **só** dos `tokens` do kit (props). Nada de número mágico de duração.
3. Toda composição exporta um schema `zod` e `defaultProps` completos; registra no `Root.tsx`.
4. Texto sempre dentro de `<SafeArea zone={...}>` (componente-base do repo).
5. Fontes por `staticFile()` ou `@remotion/google-fonts`; imagens/vídeos por `staticFile()` ou caminho
   passado em props. **Nenhuma URL remota.**
6. Uma coisa se mexe por vez; entradas em sequência com `staggerFrames`.
7. Entrada com desaceleração (easing do kit), saída com aceleração.
8. Escrever **só** dentro de `src/kits/<kitId>/` do workspace do job. Nunca tocar `src/base/`, `Root.tsx` fora do bloco marcado, `package.json` ou `remotion.config.ts`.

---

## 5. Regras invioláveis (valem em todas as fases)

- NUNCA marcar etapa de peça, gate ou kit de motion como concluído/aprovado a partir da resposta de
  um motor. Só por clique do CEO (IPC) ou checagem automática que **reprova** (checagem nunca aprova sozinha um gate).
- NUNCA gravar dado de perfil, peça, ativo, prompt ou render dentro do repositório. Testes usam pasta temporária.
- NUNCA alterar arquivos do DarkFlow, do Docuflow ou do AgenciaIA.
- NUNCA alterar `.claude/launch.json` nem a seção 7 do `CLAUDE.md`.
- NUNCA chamar DarkFlow/Docuflow pelo renderer. Só pelo processo principal.
- NUNCA logar segredo (token Meta, chaves). Usar `maskSecret`.
- NUNCA baixar música, imagem ou vídeo da internet automaticamente. Ativos entram pela pasta de entrada ou pelo Carlos.
- NUNCA salvar SVG com `<metadata>`/`c2pa`.
- NUNCA inventar número (alcance, seguidores, retenção, custo). Sem dado real, a tela mostra "—".
- Todo `.bat` novo: CRLF + `chcp 65001 >nul`.
- Ao terminar cada tarefa: `npm run typecheck` e `npm test` verdes. Ao terminar fase de tela: `npm run build` verde.
- Mudança em `src/main/motors.ts` ou em qualquer driver exige `npm run test:motores` nos quatro (regra 8 do `CLAUDE.md`).

---

## 6. Arquitetura

```
 Renderer (páginas .dc.html)            Processo principal (src/main/studio/*)              Fora do Electron
 ───────────────────────────            ─────────────────────────────────────              ────────────────
 Studio.dc.html ─┐                      store.ts ───────► <dados>/studio.sqlite
 Social.dc.html ─┼─ window.tavir.studio ipc (studio:*)    files.ts ───────► <dados>/perfis, pecas, entrada-flow
 Edicao.dc.html ─┤   window.tavir.sidecars                promptCompiler.ts (puro, testável)
 Flow.dc.html  ──┘                      inbox.ts (vigia entrada-flow)
                                        render.ts ──spawn──► node studio-motion/scripts/render.mjs ──► Remotion + Chrome headless + FFmpeg
                                        motionAuthor.ts ──runMotor()──► 4 motores no workspace do job
                                        motionChecks.ts (tsc, regras, render de teste, ffprobe)
                                        audio.ts (TTS, whisper.cpp, loudness)
                                        sidecars.ts ──HTTP──► DarkFlow :8765 · Docuflow :5000
```

### 6.1 Pasta de dados (D5) — fora do git

```
%USERPROFILE%\TAVIR\Studio\
  studio.sqlite
  perfis\<perfilId>\marca\        logo, fontes, referências de personagem
  pecas\<pecaId>\
    ativos\                       imagens/vídeos do Flow, áudio, música
    render\                       stills, proxies e finais
    pacote\                       o que vai para publicação + manifest.json
  entrada-flow\                   o Carlos solta aqui o que baixou do Google Flow
  musicas\                        trilhas locais com licença registrada
  motion\                         projeto Remotion de produção (cópia de studio-motion/ + kits aprovados), com git próprio
  motion-jobs\<jobId>\            workspace temporário de cada pedido a motor
```

### 6.2 Banco `studio.sqlite` (migrations numeradas em `src/main/studio/migrations.ts`)

| Tabela | Colunas |
|---|---|
| `perfis` | `id, nome, iniciais, cor_avatar, brand_kit_json, motion_kit_id, criado_em, atualizado_em` |
| `perfil_redes` | `id, perfil_id, rede, handle, formatos_json, posts_semana, publicacao ('manual'\|'darkflow'), ativo` |
| `series` | `id, perfil_id, nome, sigla (2–6 letras, ex. MP), descricao` |
| `pecas` | `id, numero (sequencial por perfil), perfil_id, serie_id, rede, formato_id, titulo, etapa, status, pauta_json, angulos_json, angulo_escolhido, roteiro_json, legenda, hashtags_json, agendado_para, criado_em, atualizado_em` |
| `slots` | `id, peca_id, codigo (ex. MP-0014-S03), tipo ('imagem'\|'video'), descricao, formato_px, ativo_id` |
| `ativos` | `id, peca_id, slot_id, tipo, origem ('flow'\|'local'\|'render'\|'tts'), caminho, sha256, largura, altura, duracao_ms, licenca, criado_em` |
| `prompts` | `id, slot_id, alvo ('flow-imagem'\|'flow-video'), versao, camadas_json, texto, nota ('funcionou'\|'nao'\|null), criado_em` |
| `renders` | `id, peca_id, tipo ('still'\|'proxy'\|'final'), caminho, status, checks_json, criado_em` |
| `gates` | `id, peca_id, etapa, decisao, comentario, decidido_em` |
| `motion_kits` | `id, perfil_id, nome, versao, status, tokens_json, presets_json, criado_em` |
| `motion_jobs` | `id, kit_id, preset, motor, modelo, pedido, workspace, status ('rodando'\|'reprovado'\|'aguardando_gate'\|'aprovado'\|'recusado'), checks_json, run_id, criado_em` |
| `eventos` | `id, ref_tipo, ref_id, acao, detalhe, quando` |

### 6.3 IPC (`window.tavir.studio.*`) — tipar em `TavirApi`

```
studio.perfis.list() / get(id) / save(perfil) / remove(id)
studio.redes.save(perfilId, rede) / remove(id)
studio.pecas.list(filtro) / get(id) / create(input) / update(id, campos-permitidos)
studio.pecas.gate(id, etapa, decisao, comentario)         ← único jeito de avançar etapa com gate
studio.pecas.advance(id)                                   ← só etapas sem gate, com pré-condição cumprida
studio.slots.list(pecaId) / save(slot)
studio.prompts.compile(slotId) / save(prompt) / rate(promptId, nota) / exportShotList(pecaId)
studio.ativos.list(pecaId) / importFile(slotId, caminho) / inboxScan() / assignOrphan(arquivo, slotId)
studio.render.still(pecaId, slide) / proxy(pecaId) / final(pecaId) / status(jobId)
studio.pacote.build(pecaId) / openFolder(pecaId)
studio.motion.kits.list(perfilId) / createJob({ kitId, preset, pedido, motor, modelo }) / jobStatus(id) / gate(jobId, decisao, comentario)
studio.preflight()                                          ← node, ffmpeg, chrome headless, whisper, tts, pasta de dados
sidecars.status() / start(id) / stop(id)
```

Eventos de progresso (render, job de motor, inbox) chegam por um canal `studio:event` igual ao padrão de `RunEvent`.

---

## 7. Protocolo de checkpoint (vale para toda fase)

Ao fim de cada fase o executor:

1. Roda os comandos do **Portão de saída** e guarda a saída (últimas 40 linhas de cada).
2. Escreve `relatorios/studio/F<n>-checkpoint.md` com: o que foi feito (lista de arquivos), comandos e
   resultado, prints em `relatorios/studio/F<n>/` (app rodando), itens do portão marcados ✅/❌,
   desvios do plano e motivo, perguntas abertas.
3. Faz commit da fase (um commit por tarefa numerada; mensagem `feat(studio): F<n>.<t> <resumo>`).
4. **PARA** e espera o Carlos responder "ok F<n>". Não faz push sem pedido.

Branch: `feat/studio`, criada a partir de `master` **depois** que o Carlos confirmar que o trabalho
pendente da branch atual foi commitado. Se houver arquivos modificados não relacionados ao Studio, não toque neles.

---

## FASE 0 — Domínio, armazenamento e preflight

**Objetivo:** perfis, redes, peças e gates existem de verdade, salvos em SQLite fora do git, com regras testadas.

### Tarefas
- **0.1** `src/shared/studio.ts` — todas as constantes e tipos da seção 4 + tipos de linha do banco (6.2).
- **0.2** `src/main/studio/paths.ts` — resolve a pasta de dados (D5), cria a árvore 6.1, aceita override por variável `TAVIR_STUDIO_HOME` (usada nos testes).
- **0.3** `src/main/studio/migrations.ts` + `store.ts` — `node:sqlite`, `PRAGMA journal_mode=WAL`, migrations idempotentes com tabela `schema_version`, CRUD das tabelas, tudo síncrono e pequeno.
- **0.4** `src/main/studio/rules.ts` — funções puras:
  - `nextStage(peca)`, `canAdvance(peca)` (pré-condições: `angulo` exige ângulo escolhido; `roteiro` exige roteiro com nº de slides dentro de `minSlides..maxSlides`; `arte` exige todo slot com ativo; `revisao` exige render final com checks verdes; `pacote` exige pacote montado).
  - `applyGate(peca, etapa, decisao, comentario)` (aprovado → avança; ajuste → volta uma etapa; recusado → `status='arquivada'`).
  - `slotCode(serieSigla, numero, indice, tipo)` → `MP-0014-S03` (`S` = slide/imagem, `C` = cena de vídeo).
  - `validateTexts(roteiro, formato)` usando `TEXT_LIMITS`.
- **0.5** IPC `studio:*` do bloco 6.3 que dependem só do banco (perfis, redes, peças, gates) + preload + `TavirApi`.
- **0.6** `src/main/studio/preflight.ts` — verifica: Node ≥ 20 no PATH, `ffmpeg` e `ffprobe`, pasta de dados gravável, `studio-motion/node_modules` (aviso, não erro, até a F2). Retorna lista `{item, ok, detalhe, comoResolver}`.

### Testes (`tests/unit/studio.store.spec.ts`, `studio.rules.spec.ts`)
- CRUD de perfil com 2 redes; migration roda 2× sem erro.
- `applyGate` em cada etapa com as 3 decisões; `canAdvance` falso sem pré-condição; `advance` recusa etapa que tem gate.
- `slotCode` gera `MP-0014-S03`; `validateTexts` reprova capa com 61 caracteres.
- Nenhum arquivo criado fora da pasta temporária.

**Portão de saída F0:** `npm run typecheck` e `npm test` verdes; checkpoint escrito; nenhum arquivo novo fora de `src/`, `tests/`, `docs/`, `relatorios/`.

---

## FASE 1 — Tela real do Studio e do Social (sem dados falsos)

**Objetivo:** a página do Studio no app empacotado mostra perfis, redes e peças do banco, e todos os botões funcionam.

### Tarefas
- **1.1** Extrair `./Studio.dc.html` (uuid `16017d18-…`) da referência para `src/renderer/studio-ref/Studio.dc.html`. Preservar layout, textos e classes.
- **1.2** Em `scripts/clean_and_bind_ipc.js`, nova seção "1.3 Studio": injeta o arquivo no lugar do uuid, **falha o build** se não existir (igual à Fábrica), remove vendors de React do mockup.
- **1.3** Remover todo fixture: perfis, KPIs ("Peças no mês", "Alcance", "Custo médio"), fila de peças, ângulos, roteiro, frames `dall-e-3`, "Retenção do reel anterior", "Metas do trimestre", "Lição registrada". O que não tiver dado real mostra estado vazio ou "—".
- **1.4** Ligar à API:
  - Seletor de perfis ← `studio.perfis.list()`; KPIs reais: peças no mês (contagem), em produção, agendadas.
  - "Novo perfil": modal com nome, iniciais, cor, redes (rede + @ + formatos + posts/semana + publicação manual/DarkFlow) e kit de marca básico (paleta, fontes, tom, canon). Salva via IPC.
  - "Nova produção": modal com perfil, série, rede, formato (filtrado pelas redes do perfil), título/tema, fonte principal, objetivo.
  - Fila "Na esteira" ← peças do perfil; clicar abre a produção.
  - Stepper ← `stagesFor(formato.kind)`; etapa atual vem do banco; clicar numa etapa passada só **mostra** o histórico dela.
  - Pauta: campos salvos. Ângulos: o Carlos digita até 3 ângulos (gancho, promessa, prova) **ou** clica "Pedir ângulos ao motor" (usa `runMotor` com `access: 'read'`, motor/modelo padrão, registra no `runLedger`, resposta vai para `angulos_json` como **sugestão**; nada é escolhido sozinho). Remover o texto "US$ 0,08": mostrar o custo real do livro de execuções ou "—".
  - "Aprovar ângulo", "Aprovar revisão", "Aprovar publicação", "Ajuste fino", "Pedir outro ajuste" → `studio.pecas.gate(...)`.
  - Roteiro: editor de slides/cenas com contador de caracteres (`TEXT_LIMITS`), salvando em `roteiro_json`. "Pedir roteiro ao motor" opcional, mesmo padrão dos ângulos.
  - "Mesa do Oráculo · instruções do squad" ← `brand_kit.canon` e `tone` do perfil, editável.
- **1.5** Página Social (uuid `4de11384-…`), aba "Perfis e calendário": lê perfis/redes/peças agendadas do banco. Aba de inbox fica com estado vazio "Em breve" (fora do escopo).
- **1.6** `StudioView.tsx` e `SocialView.tsx` (modo dev): trocar conteúdo por aviso "modo dev — a tela real é a do app empacotado".

### Testes
- Teste de build: o HTML final contém `Studio.dc.html` injetado e **não** contém as strings de fixture (`Episódio 14`, `42k seguidores`, `dall-e-3`, `US$ 1,20`, `428k`).
- Jornada manual com prints: criar perfil Multiverso Paranoico (Instagram + YouTube), criar peça carrossel, salvar 3 ângulos, aprovar ângulo, ver etapa mudar, reabrir o app e ver tudo persistido.

**Portão de saída F1:** `npm run build` verde; teste de fixtures verde; prints da jornada no checkpoint; Carlos confere no app.

---

## FASE 2 — Projeto Remotion local e render

**Objetivo:** o Escritório renderiza still e vídeo localmente a partir dos dados da peça e do kit do perfil.

### Tarefas
- **2.1** Criar `studio-motion/` (projeto Remotion, TypeScript), com versões **fixadas** (sem `^`) de `remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/captions`, `@remotion/install-whisper-cpp`, `@remotion/google-fonts`, `zod`, `react`, `react-dom`. Excluir `studio-motion/` do `tsconfig` e do `vitest` da raiz. `.gitignore`: `studio-motion/node_modules`, `studio-motion/out`.
- **2.2** `studio-motion/src/base/` (código TAVIR, não editável por motor):
  - `SafeArea.tsx` (recebe `zone` e desenha overlay opcional `debugSafeZone`).
  - `tokens.ts` (lê `MotionKit.tokens` das props), `easing.ts` (`Easing.bezier(...tokens.easing)`).
  - `Slide.tsx` (still de carrossel: fundo/imagem, título, apoio, rodapé com @handle e paginação).
  - `ReelBase.tsx` (sequência de cenas com imagem/vídeo, narração, música e legenda).
  - Composições registradas em `Root.tsx`: `TavirSlide` (still) e `TavirReel` (vídeo), com schema `zod`. Bloco marcado `// <kits>` … `// </kits>` onde os kits aprovados são registrados.
- **2.3** `studio-motion/scripts/render.mjs`: recebe `--job <arquivo.json>` (composição, props, formato, saída, tipo `still|proxy|final`, frames para still), usa `@remotion/bundler` + `@remotion/renderer` (`selectComposition`, `renderStill`, `renderMedia` com `codec: 'h264'`), escreve progresso como JSON por linha (`{"type":"progress","pct":42}` / `{"type":"done","path":...}` / `{"type":"error",...}`). Proxy = metade da resolução, `crf` alto.
- **2.4** `src/main/studio/render.ts`: monta o job, `spawn('node', [...])` com `cwd` em `<dados>/motion`, repassa progresso por `studio:event`, grava em `renders`. Cancela matando o processo.
- **2.5** `src/main/studio/motionHome.ts`: na primeira vez, copia `studio-motion/` para `<dados>/motion/` (sem `node_modules`), roda `npm ci` lá (com log), faz `git init` + commit inicial. Atualização: botão "Atualizar base de motion" copia só `src/base/` e `scripts/`.
- **2.6** Preflight ganha: `<dados>/motion/node_modules` presente; Chrome Headless Shell do Remotion presente (a primeira execução baixa; **pedir confirmação do Carlos na tela antes**, mostrando que é um download do Remotion).
- **2.7** Checagens pós-render (`src/main/studio/mediaChecks.ts`, usando `ffprobe`): largura/altura/fps iguais ao formato; duração ≤ `maxSeconds`; still não é imagem chapada (desvio-padrão dos pixels > limiar — usar FFmpeg `signalstats` ou ler PNG). Resultado em `renders.checks_json`.

### Testes
- Unit: montagem do job (props, saída, tipo) e parser das linhas de progresso.
- `npm run test:studio:render` (novo script, não roda no `npm test`): renderiza `TavirSlide` e um `TavirReel` de 3 s com ativos de fixture gerados por FFmpeg (`testsrc`), confere com `ffprobe`. Precisa de preflight verde.

**Portão de saída F2:** `npm run typecheck`, `npm test`, `npm run build` e `npm run test:studio:render` verdes; PNG e MP4 de exemplo no checkpoint.

---

## FASE 3 — Skills do Remotion funcionando nos 4 motores

**Objetivo:** pedir um preset de motion a Claude, Cursor, Codex **ou** Antigravity produz uma composição que passa nas mesmas checagens; o kit só entra em produção depois do gate do CEO.

### 3.1 Três camadas de skill (todas obrigatórias)

1. **Cópia fixada (D6):** copiar o conteúdo de `remotion-dev/skills` para `studio-motion/.skills/remotion/`, com `ORIGEM.md` (URL, commit, data, licença). Atualizar só por pedido do Carlos.
2. **Instalação nativa:** no `<dados>/motion/`, rodar o instalador oficial (`npx skills add remotion-dev/skills`) para cada agente que ele suportar. O executor **descobre** (`--help`) quais dos 4 são suportados e em que pasta cada um lê skills, e registra a tabela real em `studio-motion/.skills/SUPORTE_NATIVO.md`. Não presumir.
3. **Pacote de contexto universal (a garantia):** `src/main/studio/motionContext.ts` escreve, em **todo** workspace de job:
   - `MOTION_CONTRACT.md` (seção 4.5) e `KIT.md` (tokens, paleta, fontes, tom do perfil);
   - os arquivos de instrução que cada motor lê: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/remotion.mdc` e o equivalente do Antigravity (pasta confirmada no passo 2), todos apontando para `.skills/remotion/` e para o contrato;
   - e o **prompt** do job inclui o contrato inteiro + a lista de arquivos de regra relevantes do pacote do Remotion para o preset pedido (ex.: animações, timing, fontes, sequências).

### 3.2 Job de motion — `src/main/studio/motionAuthor.ts`

1. Cria `<dados>/motion-jobs/<jobId>/` copiando `<dados>/motion/` **sem** `node_modules` e liga `node_modules` por junction (`fs.symlinkSync(alvo, link, 'junction')`).
2. Escreve o pacote de contexto (3.1.3) e um stub `src/kits/<kitId>/<Preset>.tsx`.
3. Chama `runMotor({ motor, workspace, prompt, model, effort, access: 'write', timeoutMs: 900000 })`, registrando no `runLedger`.
4. Roda as **checagens** (3.3). Reprovou → `status='reprovado'`, mostra o motivo, oferece "Tentar de novo com o erro" (novo `runMotor` com o relatório das checagens no prompt, máximo 2 tentativas automáticas — o Carlos pode pedir mais).
5. Passou → `status='aguardando_gate'`; a tela mostra o vídeo de teste no dispositivo + overlay de zona segura.
6. Gate do CEO: `aprovado` → copia `src/kits/<kitId>/` para `<dados>/motion/`, registra no bloco `// <kits>` do `Root.tsx`, commit no git local de `<dados>/motion`, marca o preset no `motion_kits.presets_json`. `ajuste` → novo job com o comentário. `recusado` → arquiva.

### 3.3 Checagens (`src/main/studio/motionChecks.ts`) — todas precisam passar

| # | Checagem | Como |
|---|---|---|
| C1 | Só arquivos permitidos mudaram | diff do workspace vs. cópia de origem: tudo fora de `src/kits/<kitId>/` reprova |
| C2 | Tipagem | `npx tsc --noEmit` no workspace |
| C3 | Regras do contrato | busca no código do kit: `Math.random`, `Date.now`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `@keyframes`, `transition:`, `http://`, `https://` → reprova |
| C4 | Registro | composição exporta schema `zod` e `defaultProps`; `selectComposition` encontra o id |
| C5 | Render | `renderStill` nos frames 0, meio e último + `renderMedia` proxy sem erro |
| C6 | Formato | `ffprobe`: dimensão, fps e duração iguais ao pedido (±1 frame) |
| C7 | Tem movimento | diferença média entre frame 0 e frame `enterFrames` acima de limiar |
| C8 | Não está vazio | desvio-padrão de pixels do frame do meio acima de limiar |
| C9 | Determinismo | renderizar o frame do meio 2× e comparar hash (igual) |

### 3.4 Conformidade de motion nos 4 motores

- `src/main/studio/motionConformance.ts` + `scripts/conformidade_motion.js` + script `npm run test:motores:motion` (nome diferente de `test:motion`, que é o contrato de CSS do app).
- Mesmos 3 pedidos para cada motor, cada um em workspace novo:
  1. `titulo-entrada`: "título entra com mola de baixo para cima, palavra-chave em accent, 3 s, 1080×1920".
  2. `legenda-palavra`: "legenda palavra por palavra a partir de um array de palavras com tempo, destaque na palavra ativa".
  3. `zoom-lento`: "imagem de fundo com zoom de zoomFrom a zoomTo durante a cena, sem tremer".
- Relatório em `relatorios/motores/motion-<data>.md` e `.json`: tabela motor × pedido com ✅/❌, tempo, tentativas e checagem que falhou. Motor sem CLI ou sem login aparece como ⛔ com o motivo (igual à conformidade atual).

### Testes
- Unit: C1, C3, C4 e C9 com fixtures em pasta temporária — uma composição boa e uma com `Math.random` (deve reprovar C3 e C9), uma que mexe no `package.json` (reprova C1).
- `motionContext` escreve todos os arquivos esperados.

**Portão de saída F3:** testes verdes; `npm run test:motores:motion` com **4 de 4 motores conformes nos 3 pedidos** (aceita ⛔ só por falta de CLI/login, com o motivo, e o Carlos decide se aceita); um preset aprovado pelo gate na tela; relatório anexado no checkpoint.

---

## FASE 4 — Prévias por dispositivo (prévia = arquivo final)

**Objetivo:** ver a peça exatamente como ela aparece no celular, em cada rede, usando o render real.

### Tarefas
- **4.1** Moldura de dispositivo em HTML/CSS (sem imagem de celular de terceiros), proporção de telefone moderno, com a **interface da rede** desenhada pela TAVIR (sem logos oficiais):
  - Instagram feed: cabeçalho (avatar, @handle), mídia, ícones genéricos, legenda cortada em `legendaVisivelChars` com "…mais", contador de slides e pontinhos do carrossel; arrastar/setas trocam slide.
  - Reels/Stories/Shorts/TikTok: mídia em tela cheia, overlay da UI nas zonas da seção 4.3, legenda do post na base.
  - YouTube miniatura: a miniatura em 3 tamanhos (busca no celular, sugestão lateral, tela inicial) com título de 2 linhas.
  - LinkedIn: post com texto acima e mídia 4:5.
- **4.2** Botões: "Zona segura" (overlay vermelho translúcido), "Grade do perfil" (a capa da peça ao lado das últimas 8 capas do perfil, recorte 3:4 — valor inicial, D4), "Tamanho real" (1 px CSS = 1 px do dispositivo de 390 pt de largura).
- **4.3** A mídia exibida é **sempre** o arquivo de `renders` (still ou proxy). Sem render: estado "A prévia aparece quando o roteiro existir" (texto da referência). Ao editar o roteiro, re-render do still do slide atual em segundo plano com debounce de 800 ms.
- **4.4** Alertas na prévia: texto fora da zona segura (via props do `SafeArea` em modo debug que reporta caixas), título acima do limite, slide a mais/a menos, vídeo acima de `maxSeconds`.
- **4.5** Seletor de rede/formato na prévia: só mostra as redes do perfil.

### Testes
- Unit: corte da legenda em 125 caracteres sem quebrar palavra; cálculo de escala da moldura.
- Prints de cada moldura no checkpoint (4:5, 9:16 com zona segura, miniatura YouTube, grade).

**Portão de saída F4:** build verde; prints; **Carlos compara com um print real do celular e confirma ou corrige os valores de D4**.

---

## FASE 5 — Carrossel e post completos

**Objetivo:** pauta até pacote de carrossel/post, com arte renderizada localmente.

### Tarefas
- **5.1** Roteiro do carrossel → slides: cada slide tem `tag`, `titulo`, `apoio`, `slot` (imagem do Flow opcional) e `layout` (`capa`, `texto`, `imagem-cheia`, `dado`, `fonte`, `cta`). Último slide de fonte obrigatório quando o canon exigir (ex.: Multiverso: "toda afirmação histórica cita fonte no último slide").
- **5.2** Layouts em `studio-motion/src/base/layouts/` usando o `BrandKit` do perfil (paleta, fontes, logo).
- **5.3** Etapa Arte: mostra cada slide renderizado, status do slot (sem ativo / ativo importado), botão "refazer render", e permite trocar a imagem do slot.
- **5.4** Etapa Revisão: checklist automático (limites de texto, zona segura, slots completos, fonte citada) + campo de comentário + gate.
- **5.5** `studio.pacote.build`: `pacote/01.png … NN.png`, `capa.png`, `legenda.txt`, `hashtags.txt`, `manifest.json` (arquivo, sha256, dimensões, perfil, rede, formato, agendamento sugerido). Botão "Abrir pasta".

### Testes
- Unit: geração de slides a partir do roteiro; regra do slide de fonte; manifest com sha256 correto (fixture).
- Integração (`test:studio:render`): carrossel de 3 slides vira 3 PNG 1080×1350.

**Portão de saída F5:** jornada completa de um carrossel do Multiverso em prints, do perfil ao pacote; Carlos abre os PNG no celular.

---

## FASE 6 — Prompts para o Google Flow

**Objetivo:** cada slot de imagem/vídeo tem um prompt de qualidade, consistente com a marca, pronto para colar no Flow, e o que volta do Flow encaixa sozinho.

### 6.1 Arquitetura do prompt (camadas, nesta ordem)

| Camada | Imagem | Vídeo (Veo) |
|---|---|---|
| 1. Assunto | quem/o quê, com o personagem fixo da bíblia quando houver | idem |
| 2. Ação | o que está acontecendo | **uma** ação só |
| 3. Cenário | lugar, época, detalhes | idem |
| 4. Composição | plano (close, médio, aberto), ângulo, posição no quadro, **espaço livre para o texto** do layout (ex.: "terço superior vazio") | tipo de plano |
| 5. Câmera | lente/profundidade de campo | **um** movimento: `static tripod shot` \| `slow dolly in` \| `slow dolly out` \| `slow pan left/right` \| `slow orbit` \| `handheld subtle` |
| 6. Luz | direção, dureza, horário | idem |
| 7. Estilo | `brandKit.imageStyle` | idem |
| 8. Paleta | cores do kit em palavras | idem |
| 9. Formato | proporção do slot | proporção + "8 seconds" |
| 10. Som | — | ambiente/efeito, "no dialogue, no music" (a trilha é do Studio) |
| 11. Restrições | `brandKit.negatives` + **sempre** "no text, no letters, no watermark, no logos" | idem |

Regras do compilador (`src/main/studio/promptCompiler.ts`, **função pura**, sem motor):
- Saída em inglês (melhor aderência dos modelos) + resumo em português para o Carlos.
- Personagem fixo: descrição **idêntica** em todos os prompts (texto copiado da bíblia, nunca parafraseado) + lembrete de usar as imagens de referência do personagem como ingrediente no Flow.
- Vídeo: recomendação padrão "gerar a imagem primeiro, aprovar, depois animar a partir dela (quadro inicial)"; usar só 2–4 s do resultado na edição.
- Validador: reprova prompt sem as camadas 1, 4, 7, 9, 11; reprova se pedir texto na imagem; avisa acima de ~900 caracteres.
- "Lapidar com motor" (opcional): `runMotor` com `access: 'read'` reescreve **só as camadas 1–3 e 6**; o resultado passa no validador ou é descartado.

### 6.2 Tarefas
- **6.1** Bíblia do perfil na tela (estilo, negativos, personagens com descrição e imagens de referência).
- **6.2** Etapa Arte ganha "Prompts do Flow": lista de slots com prompt, botão copiar, versão, nota "funcionou / não funcionou", histórico.
- **6.3** `exportShotList(pecaId)`: `pecas/<id>/prompts.md` com código do slot, proporção, prompt, nome de arquivo esperado.
- **6.4** **Convenção de nome:** `<SIGLA>-<NNNN>-<S|C><NN>[-v<N>].<png|jpg|jpeg|webp|mp4>` (ex.: `MP-0014-S03-v2.png`). Regex: `^([A-Z0-9]{2,6})-(\d{4})-([SC]\d{2})(?:-v(\d+))?\.(png|jpe?g|webp|mp4)$`.
- **6.5** `inbox.ts`: vigia `entrada-flow/` (`fs.watch` + varredura ao abrir o Studio); arquivo que casa → move para `pecas/<id>/ativos/`, calcula sha256/dimensões/duração, liga ao slot (versão maior vence, anteriores ficam no histórico), re-render do slide; arquivo que não casa → lista "sem dono" com "atribuir a slot".
- **6.6** Biblioteca de prompts por perfil: busca por prompts com nota "funcionou" para reaproveitar.

### Testes
- Unit: compilador (snapshot de 3 slots: imagem com personagem, imagem sem personagem, vídeo); validador (pede texto → reprova); regex do nome (10 casos válidos/ inválidos); versão maior vence.

**Portão de saída F6:** Carlos gera ao menos 3 imagens no Flow com os prompts de uma peça, solta na pasta e vê os slides atualizarem sozinhos (prints no checkpoint).

---

## FASE 7 — Reels (narração, legenda, motion, áudio)

**Objetivo:** Reel 9:16 completo, renderizado localmente.

### Tarefas
- **7.1** Roteiro de vídeo: cenas com `texto_narrado`, `texto_tela` (opcional), `slot` (imagem ou vídeo do Flow), `preset` de motion, `duracao_min` (a duração real vem da narração).
- **7.2** `audio.ts` — TTS por adapter (D3): `edge-tts` (CLI Python `edge-tts`; preflight confere) e `piper` (se o binário e a voz existirem). Voz do `brandKit.voice`. Um arquivo por cena em `ativos/`.
- **7.3** Legendas locais: `@remotion/install-whisper-cpp` instala o whisper.cpp e o modelo (padrão `small`, idioma `pt`) dentro de `<dados>/motion/` — **pedir confirmação do Carlos antes do download**; transcrição com tempo por palavra → `@remotion/captions` → preset `legenda-palavra` do kit.
- **7.4** Música: escolher da pasta `musicas/` (com licença registrada); ducking sob a narração.
- **7.5** Montagem no `TavirReel`: cenas com o preset de cada uma, troca de cena com `troca-cena`, encerramento com `encerramento-cta`.
- **7.6** Etapa Áudio na tela: ouvir cada cena, refazer TTS de uma cena, ver a legenda gerada e corrigir palavra.
- **7.7** Checagens extras do final: loudness integrado −14 LUFS ±1 (FFmpeg `loudnorm` em modo análise), pico verdadeiro ≤ −1 dBTP, duração ≤ `maxSeconds`, primeira mudança visual nos primeiros 15 frames (gancho com movimento).
- **7.8** Pacote do Reel: `final.mp4`, `capa.png` (frame escolhido), `legenda.txt`, `hashtags.txt`, `legendas.srt`, `manifest.json`.

### Testes
- Unit: divisão do roteiro em cenas; conversão de tempos do whisper para captions; parser do `loudnorm`.
- Integração: Reel de 2 cenas com TTS (pular com motivo claro se `edge-tts` sem rede) → MP4 1080×1920 30 fps, loudness dentro da faixa.

**Portão de saída F7:** Reel do Multiverso renderizado; Carlos assiste no celular; checagens verdes no checkpoint.

---

## FASE 8 — Ecossistema: DarkFlow (Flow) e Docuflow (Edição)

**Objetivo:** o Escritório inicia e conversa com os dois sistemas sem alterá-los.

### Tarefas
- **8.1** `src/main/sidecars.ts` + `db/sidecars.json` (no repo só um `sidecars.example.json`; o real fica ignorado no git): para cada sistema, `pasta`, `comando de início` (o `.bat`/script do próprio projeto), `healthUrl` (`http://127.0.0.1:8765/api/health`, `http://127.0.0.1:5000/docs`), portas. Funções `status`, `start`, `stop`. Antes de subir, checa se a porta está ocupada e por quem; conflito (D2) → recusa com mensagem clara.
- **8.2** Configurações → nova seção "Sistemas ligados" com status, iniciar/parar e caminho de cada um.
- **8.3** **Flow ↔ DarkFlow** (página `1661c4ce-…` vira `src/renderer/studio-ref/Flow.dc.html`, mesma técnica):
  - Ler a API do DarkFlow (somente leitura do código) e implementar no main: `GET /api/publisher/session` (CSRF), `status`, `library`, `library/scan`, `schedules` (GET/POST), `occurrences`.
  - Descobrir **como** a biblioteca do DarkFlow encontra arquivos (manifesto/hash) e fazer o `pacote/` do Reel ser importável por ela — copiando para a pasta que ela varre, no formato que ela espera. Documentar em `docs/modules/studio.md`.
  - Primeiro workflow real: "Studio → DarkFlow: agendar Reel": pacote aprovado → importar na biblioteca → criar agendamento → **gate de publicação do CEO no Escritório** → o worker do DarkFlow publica. O Escritório nunca liga a flag `--enable-meta-publish`; isso é do DarkFlow.
  - Telemetria: mostrar no Social o scorecard que o DarkFlow já coleta (`telemetry/scorecard`) — números reais ou "—".
- **8.4** **Edição ↔ Docuflow** (página `508d093f-…` vira `Edicao.dc.html`):
  - Lista de composições e jobs de render vindos de `GET /compositions` e dos jobs do Docuflow.
  - "Abrir no Docuflow Studio": abre `http://127.0.0.1:3000` numa janela nova do Electron (BrowserWindow próprio, sem `nodeIntegration`).
  - Ação na peça do Studio (formato `yt-longo-16x9`): "Enviar para Edição" → `POST /projects` com tema e roteiro; o perfil vira canal do Docuflow (`POST /channels`, brand kit mapeado: paleta, fontes, voz) se ainda não existir.
  - A rota `edicao` no `App.tsx` deixa de renderizar o `StudioView`.

### Testes
- Unit: `sidecars` com servidor HTTP falso (health ok / porta ocupada / conflito); cliente DarkFlow com CSRF (servidor falso); mapeamento perfil → canal Docuflow.
- Manual com os dois sistemas rodando: status verde, um Reel agendado **em modo simulação** do DarkFlow (sem `--enable-meta-publish`), um projeto criado no Docuflow.

**Portão de saída F8:** testes verdes; prints dos dois fluxos; nenhum arquivo alterado em DarkFlow/Docuflow (`git status` dos dois repos limpo no checkpoint).

---

## FASE 9 — Fechamento

### Tarefas
- **9.1** `docs/modules/studio.md`: mapa do módulo (igual ao `fabrica.md`): telas, IPC, banco, pasta de dados, motion, skills nos motores, checagens, integrações, como rodar cada teste.
- **9.2** Jornada completa de QA (critério de "100% utilizável", seção 0) com prints em `relatorios/studio/F9/`, seguindo a skill `frontend-user-journey-qa` se disponível no motor.
- **9.3** Rodar tudo: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:studio:render`, `npm run test:motores:motion`, e `npm run test:motores` se algo em `motors.ts`/drivers mudou.
- **9.4** D1 respondida (licença do Remotion).

**Portão de saída F9 (= GOAL concluído):** os 7 itens da "Definição de 100% utilizável" demonstrados em prints/vídeo; todos os comandos verdes; D1 resolvida; Carlos responde "GOAL STUDIO aceito".

---

## 8. Resumo dos checkpoints

| Fase | Entrega | Prova exigida |
|---|---|---|
| F0 | Domínio + banco + regras | testes verdes |
| F1 | Studio e Social reais | build + teste sem fixtures + jornada em prints |
| F2 | Render local Remotion | `test:studio:render` + PNG/MP4 |
| F3 | Skills Remotion nos 4 motores | `test:motores:motion` 4/4 + preset aprovado por gate |
| F4 | Prévias por dispositivo | prints + Carlos confirma D4 com print real |
| F5 | Carrossel completo | pacote com PNG + legenda |
| F6 | Prompts do Flow + pasta de entrada | 3 imagens do Flow encaixadas sozinhas |
| F7 | Reels completo | MP4 + checagens de áudio |
| F8 | DarkFlow e Docuflow ligados | Reel agendado em simulação + projeto no Docuflow, repos externos intactos |
| F9 | Fechamento | os 7 critérios + D1 |

## 9. Rastreabilidade (pedido do Carlos → fase)

| Pedido | Fase |
|---|---|
| Mapear o Studio e corrigir o que é demonstração | F0, F1 |
| Melhorar as prévias nos dispositivos | F4 |
| Gerar reels, carrosséis e posts de forma local e gratuita | F2, F5, F7 |
| Motion com a skill do Remotion, funcionando em qualquer um dos 4 motores | F3 |
| Arquitetura de prompts de qualidade para o Google Flow | F6 |
| Perfis e quais redes cada um precisa | F0, F1 |
| YouTube / Multiverso Paranoico | F8 (Docuflow) — upload fica fora |
| Página oficial da TAVIR + postagens automáticas existentes | F1 (perfil), F8 (DarkFlow) |
| DarkFlow e Docuflow no mesmo ecossistema | F8 |

---

## 10. Texto para colar no Cursor

```
Leia docs/planning/GOAL_STUDIO.md inteiro, depois CLAUDE.md e docs/planning/GOAL_RAIOX.md (modelo de rigor).
Execute SOMENTE a próxima fase ainda não aceita (comece pela FASE 0), na branch feat/studio.
Regras: não decida nada fora do documento; se faltar informação, pare e pergunte.
Não altere DarkFlow, Docuflow, AgenciaIA, .claude/launch.json nem a seção 7 do CLAUDE.md.
Etapa/gate/kit nunca são aprovados pela resposta de um motor.
Ao final da fase: rode o Portão de saída, escreva relatorios/studio/F<n>-checkpoint.md
com comandos, saídas, prints e desvios, faça os commits e PARE esperando "ok F<n>".
```
