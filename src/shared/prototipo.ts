/**
 * Protótipo de validação das esteiras de sistema — fonte única do contrato.
 *
 * O Carlos valida fluxo, regra e estado olhando e clicando, antes de alguém construir.
 * O protótipo é um arquivo só, com dados fictícios, e é descartável: o que segue para a
 * construção são a alternativa escolhida e os critérios de aceite, nunca o código dele.
 *
 * Aqui ficam os nomes, o pedido ao agente e a conferência (pura). Quem abre o arquivo e
 * mede é o Escritório, em `src/main/prototipo.ts`.
 */

export const STAGE_PROTOTIPO = 'Protótipo navegável';
export const STAGE_VALIDACAO_PROTOTIPO = 'Validação do protótipo';

export const PROTO_FILES = { page: 'prototipo/index.html', notes: 'prototipo/premissas.md' } as const;
/** Mínimo de pontos de validação numerados (o que o Carlos precisa olhar e decidir). */
export const PROTO_POINTS_MIN = 3;
/** Letras aceitas para alternativas que o Carlos compara. */
export const PROTO_ALTERNATIVES = ['a', 'b', 'c'] as const;
/** Seções obrigatórias de `prototipo/premissas.md`. */
export const PROTO_NOTE_SECTIONS = ['Premissas', 'Decisões em aberto', 'Simulado', 'Critérios de aceite'] as const;

/** O que o Escritório mediu ao abrir o protótipo no navegador. */
export interface PrototypeFacts {
  /** O arquivo abriu e desenhou alguma coisa. */
  opened: boolean;
  /** Erro ao abrir ou erro de script na página. */
  errors: string[];
  /** Endereços que a página tentou buscar fora do próprio arquivo. */
  external: string[];
  /** Existe a faixa de controle da demonstração. */
  control: boolean;
  /** A faixa diz que não faz parte do produto. */
  disclaimer: boolean;
  /** A faixa diz que os dados são fictícios. */
  fictitious: boolean;
  /** Estados oferecidos na faixa (`branco`, `exemplo`, …). */
  states: string[];
  /** Estados que, ao clicar, mudaram a tela. */
  statesWorking: string[];
  /** Alternativas oferecidas na faixa (letras). */
  alternatives: string[];
  /** Alternativas que, ao clicar, mudaram a tela. */
  alternativesWorking: string[];
  /** Versões oferecidas na faixa (`antes`, `depois`, `lado`). */
  versions: string[];
  /** Pontos de validação listados na faixa. */
  points: number[];
  /** Pontos cujo marcador apareceu na tela depois de clicar no ponto. */
  pointsLocated: number[];
  /** Existe o controle que esconde os textos de apoio. */
  supportToggle: boolean;
}

export function emptyPrototypeFacts(): PrototypeFacts {
  return { opened: false, errors: [], external: [], control: false, disclaimer: false, fictitious: false, states: [], statesWorking: [], alternatives: [], alternativesWorking: [], versions: [], points: [], pointsLocated: [], supportToggle: false };
}

const norm = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Corpo de uma seção `## Título` de um texto em markdown (vazio se não existe). */
function section(text: string, title: string): string {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const want = norm(title);
  const out: string[] = [];
  let on = false;
  for (const line of lines) {
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) {
      if (on) break;
      on = norm(h[1]).replace(/[^a-z0-9 ]/g, '').trim().startsWith(want.replace(/[^a-z0-9 ]/g, ''));
      continue;
    }
    if (on) out.push(line);
  }
  return out.join('\n').trim();
}

/** Critérios de aceite escritos em `premissas.md`: uma linha por ponto, começando pelo número. */
export function prototypeCriteria(notes: string | null | undefined): Array<{ n: number; text: string }> {
  const out: Array<{ n: number; text: string }> = [];
  for (const line of section(String(notes || ''), 'Critérios de aceite').split('\n')) {
    const m = /^\s*(?:[-*]\s*)?(?:\[(\d{1,3})\]\s*[.):·-]?|(\d{1,3})\s*[.):·-])\s*(.+)$/.exec(line);
    const n = m ? Number(m[1] || m[2]) : 0;
    if (m && !out.some((c) => c.n === n)) out.push({ n, text: m[3].trim() });
  }
  return out;
}

/** Alternativas que o Carlos de fato consegue comparar (pelo menos duas, cada uma mudando a tela). */
export function prototypeChoices(facts: Pick<PrototypeFacts, 'alternatives' | 'alternativesWorking'> | null | undefined): string[] {
  const ok = (facts?.alternatives || []).map((a) => String(a).toLowerCase()).filter((a) => (PROTO_ALTERNATIVES as readonly string[]).includes(a));
  const uniq = [...new Set(ok)].sort();
  return uniq.length >= 2 ? uniq : [];
}

/**
 * Conferência do protótipo. Lista vazia = dá para o Carlos validar.
 * `maint`: manutenção, em que o protótipo mostra o antes e o depois.
 */
export function prototypeGaps(facts: PrototypeFacts | null | undefined, notes: string | null | undefined, opts: { maint?: boolean } = {}): string[] {
  const where = PROTO_FILES.page;
  if (!facts || !facts.opened) return [`${where} não abriu${facts?.errors?.length ? ` (${facts.errors[0].slice(0, 160)})` : ''}`];
  const gaps: string[] = [];
  if (facts.errors.length) gaps.push(`erro de script ao abrir: ${facts.errors[0].slice(0, 160)}`);
  if (facts.external.length) gaps.push(`o arquivo depende de rede (${facts.external.slice(0, 3).join(', ')}); ele tem de abrir sozinho`);
  if (!facts.control) gaps.push('falta a faixa de controle da demonstração (data-proto="controle")');
  else {
    if (!facts.disclaimer) gaps.push('a faixa de controle não diz que «não faz parte do produto»');
    if (!facts.fictitious) gaps.push('a faixa de controle não avisa que os dados são fictícios');
  }
  for (const st of ['branco', 'exemplo']) {
    if (!facts.states.includes(st)) gaps.push(`falta o estado «${st}» na faixa (data-proto-estado="${st}")`);
    else if (!facts.statesWorking.includes(st)) gaps.push(`o estado «${st}» não muda a tela ao clicar`);
  }
  if (facts.alternatives.length === 1) gaps.push('uma alternativa só não é escolha: ofereça duas ou três, ou nenhuma');
  const bad = facts.alternatives.filter((a) => !(PROTO_ALTERNATIVES as readonly string[]).includes(String(a).toLowerCase()));
  if (bad.length) gaps.push(`alternativa fora de a, b ou c: ${bad.join(', ')}`);
  for (const a of prototypeChoices(facts)) if (!facts.alternativesWorking.includes(a)) gaps.push(`a alternativa ${a.toUpperCase()} não muda a tela ao clicar`);
  if (opts.maint) for (const v of ['antes', 'depois']) if (!facts.versions.includes(v)) gaps.push(`manutenção: falta a versão «${v}» na faixa (data-proto-versao="${v}")`);
  if (facts.points.length < PROTO_POINTS_MIN) gaps.push(`${facts.points.length} de ${PROTO_POINTS_MIN} pontos de validação numerados na faixa (data-proto-ponto)`);
  const lost = facts.points.filter((n) => !facts.pointsLocated.includes(n));
  if (lost.length) gaps.push(`ponto(s) ${lost.join(', ')} sem marcador na tela depois de clicar (data-proto-marca)`);
  if (!facts.supportToggle) gaps.push('falta o controle que esconde os textos de apoio (data-proto="apoio")');

  const text = String(notes || '');
  if (!text.trim()) gaps.push(`falta ${PROTO_FILES.notes}`);
  else {
    for (const s of PROTO_NOTE_SECTIONS) if (!section(text, s)) gaps.push(`${PROTO_FILES.notes} sem a seção «${s}»`);
    const have = prototypeCriteria(text).map((c) => c.n);
    const missing = facts.points.filter((n) => !have.includes(n));
    if (section(text, 'Critérios de aceite') && missing.length) gaps.push(`sem critério de aceite para o(s) ponto(s) ${missing.join(', ')}`);
  }
  return gaps;
}

/** Letra da alternativa escolhida no texto da decisão («Alternativa B», «a B», «b»). Vazio se não diz. */
export function prototypeChoiceOf(text: string | null | undefined): string {
  const t = norm(String(text || '')).trim();
  const m = /\b(?:alternativa|opcao|versao|prototipo)\s*:?\s*([abc])\b/.exec(t) || /^(?:a\s+)?([abc])\b/.exec(t);
  return m ? m[1] : '';
}

/** Pedido da etapa «Protótipo navegável». */
export function prototypePrompt(input: { maint?: boolean; hasDesign?: boolean } = {}): string {
  const lines = [
    '## Protótipo de validação — o Carlos valida clicando, antes da construção',
    'Você entrega um protótipo navegável do fluxo principal. Ele serve para o Carlos conferir regra, estado e ordem das telas, e escolher entre alternativas quando houver dúvida de verdade. Não é o produto: é descartável, e a construção não vai copiar o código dele.',
    '',
    '### O que entregar',
    `1. \`${PROTO_FILES.page}\`: um arquivo HTML só, com CSS e JavaScript dentro dele. Tem de abrir com dois cliques, sem servidor e sem internet: nada de CDN, fonte externa, imagem externa ou chamada de rede.`,
    `2. \`${PROTO_FILES.notes}\` com as seções, nesta ordem: ${PROTO_NOTE_SECTIONS.map((s) => `«## ${s}»`).join(', ')}.`,
    '',
    '### A tela',
    '- O fluxo principal de ponta a ponta, clicável: cada passo leva ao seguinte e os campos reagem. Dados fictícios, sem nome de pessoa ou empresa real. Integração (pagamento, e-mail, upload, API) é simulada e dita como simulada.',
    input.hasDesign
      ? '- Siga `design/DESIGN.md` e os tokens de `design/tema.css`: copie os tokens para dentro do arquivo, porque ele não pode importar nada.'
      : '- Visual sóbrio e legível. A marca ainda não é o assunto aqui; o assunto é o fluxo.',
    '- Sem foto e sem imagem gerada: onde houver imagem, marque só o espaço.',
    '',
    '### A faixa de controle (no topo, separada da tela)',
    'Um elemento com `data-proto="controle"`, visualmente diferente do produto, com o texto «Controle da demonstração, não faz parte do produto» e o aviso de que os dados são fictícios e as integrações são simuladas. Dentro dela:',
    '- Estados: um botão `data-proto-estado="branco"` (nada preenchido) e um `data-proto-estado="exemplo"` (fluxo preenchido). Acrescente outros estados que importem (erro, lista vazia, sem permissão) com o mesmo atributo.',
    '- Alternativas, só se houver uma dúvida real de desenho: botões `data-proto-alternativa="a"` e `data-proto-alternativa="b"` (e `"c"`, no máximo). Cada um troca a tela para aquela alternativa, com um rótulo curto dizendo o que muda. Se não há dúvida real, não invente alternativa.',
    input.maint
      ? '- Versões, porque isto é manutenção: botões `data-proto-versao="antes"` e `data-proto-versao="depois"` (e, se couber, `data-proto-versao="lado"` para lado a lado). O «antes» reproduz a tela como está hoje no código.'
      : null,
    `- Pontos de validação: a lista numerada do que o Carlos precisa olhar e decidir (${PROTO_POINTS_MIN} ou mais). Cada item é um botão \`data-proto-ponto="N"\` com o número e uma frase. Ao clicar, o protótipo vai para a tela onde aquele ponto acontece e mostra ali um marcador \`data-proto-marca="N"\` com o mesmo número.`,
    '- Textos de apoio: um controle `data-proto="apoio"` que esconde e mostra os marcadores e as notas, para o Carlos ver a tela limpa.',
    '',
    `### ${PROTO_FILES.notes}`,
    '- «Premissas»: o que você assumiu, com o arquivo da pasta de onde veio cada uma.',
    '- «Decisões em aberto»: o que depende do Carlos, incluindo a escolha entre as alternativas, com a sua recomendação.',
    '- «Simulado»: o que no protótipo é faz de conta.',
    '- «Critérios de aceite»: uma linha por ponto de validação, começando pelo mesmo número («1. …»), escrita de um jeito que o QA consiga conferir no sistema construído.',
    '',
    'O Escritório abre o arquivo num navegador sem rede, clica nos estados, nas alternativas e em cada ponto, e confere as seções. Faltando algo, a etapa não fecha.',
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}

/** Bloco que as etapas depois da validação recebem. Vazio se não houve protótipo validado. */
export function prototypeHandoff(input: { validated: boolean; choice?: string; criteria: Array<{ n: number; text: string }> }): string {
  if (!input.validated) return '';
  const pick = input.choice ? ` O Carlos escolheu a alternativa ${input.choice.toUpperCase()}: construa essa e ignore as outras.` : '';
  const list = input.criteria.slice(0, 40).map((c) => `${c.n}. ${c.text}`).join('\n');
  return (
    `PROTÓTIPO VALIDADO PELO CARLOS: \`${PROTO_FILES.page}\` mostra o fluxo aprovado.${pick}\n` +
    `O protótipo é descartável: não copie o código dele nem os dados fictícios. Use como referência de fluxo, regra e estado.\n` +
    (list ? `Critérios de aceite (de \`${PROTO_FILES.notes}\`), que o QA vai conferir:\n${list}` : `Os critérios de aceite estão em \`${PROTO_FILES.notes}\`.`)
  );
}
