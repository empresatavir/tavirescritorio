export type SocialNet = "ig" | "yt" | "li";

export type StudioViewId =
  | "dash"
  | "decisions"
  | "pipeline"
  | "oracle"
  | "visual"
  | "learning";

export interface StudioNetwork {
  net: SocialNet;
  handle: string;
  url: string;
  followers?: number;
  engagement?: number;
}

export interface StudioDesignSystem {
  primary: string;
  secondary: string;
  accent: string;
  fontDisplay: string;
  fontBody: string;
  toneOfVoice: string;
  doList: string;
  dontList: string;
  visualNotes: string;
}

export interface ContentProfile {
  id: string;
  name: string;
  handle: string;
  niche: string;
  audience: string;
  company: string;
  color: string;
  initials: string;
  nets: StudioNetwork[];
  designSystem: StudioDesignSystem;
  cycleGoal: number;
  cycleDone: number;
  status: "active" | "paused" | "draft";
}

export interface ContentPiece {
  id: string;
  num: string;
  profileId: string;
  net: SocialNet;
  stage: "idea" | "pauta" | "prod" | "review" | "pub" | "done" | "error";
  title: string;
  subtitle?: string;
  needs?: boolean;
  progress?: number;
  squad?: string;
  caption?: string;
  cta?: string;
  tags?: string;
  slides?: string[];
}

export interface DecisionOption {
  id: string;
  label: string;
  style: string;
  fit: number;
  title: string;
  angle: string;
  hook: string;
  sources: string;
  whyNow: string;
}

export interface DecisionCheckpoint {
  id: string;
  profileId: string;
  runId: string;
  kind: "pauta" | "revisao";
  title: string;
  subtitle: string;
  waitingLabel: string;
  timer?: string;
  ago: string;
  platformLabel?: string;
  options?: DecisionOption[];
  selectedOptionId?: string;
  pieceId?: string;
}

export const NET_META: Record<
  SocialNet,
  { label: string; short: string; logo: string; ratio: string }
> = {
  ig: {
    label: "Instagram",
    short: "IG",
    logo: "/assets/logos/instagram.svg",
    ratio: "1080 × 1350",
  },
  yt: {
    label: "YouTube",
    short: "YT",
    logo: "/assets/logos/youtube.svg",
    ratio: "1920 × 1080",
  },
  li: {
    label: "LinkedIn",
    short: "LI",
    logo: "/assets/logos/linkedin.svg",
    ratio: "1200 × 627",
  },
};

export const SQUADS = [
  {
    id: "oraculo",
    name: "Oráculo de Pautas",
    desc: "Pesquisa, tendências e três direções editoriais.",
  },
  {
    id: "ig-studio",
    name: "Instagram Studio",
    desc: "Carrossel, reel, legenda e pacote final.",
  },
  {
    id: "yt-roteirista",
    name: "YouTube Roteirista",
    desc: "Pesquisa, estrutura e roteiro de retenção.",
  },
  {
    id: "carrosseis",
    name: "Carrosséis Especializados",
    desc: "Narrativas visuais densas e didáticas.",
  },
  {
    id: "ads",
    name: "Ads Criativos",
    desc: "Variações de conceito, copy e visual para teste.",
  },
];

export const START_POINTS = [
  {
    id: "autonoma",
    name: "Pesquisa autônoma",
    desc: "O Oráculo encontra sinais e propõe três pautas para sua aprovação.",
  },
  {
    id: "manual",
    name: "Tema manual",
    desc: "Você fornece o tema e o ângulo desejado para orientar a pesquisa.",
  },
];

const DS_DEFAULT = (accent: string): StudioDesignSystem => ({
  primary: "#0B1220",
  secondary: "#F4F6F2",
  accent,
  fontDisplay: "Instrument Sans",
  fontBody: "Instrument Sans",
  toneOfVoice: "didático, direto e sem hype",
  doList: "Usar prova, números e CTA claro",
  dontList: "Prometer resultado financeiro garantido",
  visualNotes: "Alto contraste, tipografia forte, poucas cores",
});

export const DEMO_PROFILES: ContentProfile[] = [
  {
    id: "pf-carlos",
    name: "Carlos Junior",
    handle: "@carlosjunior",
    niche: "IA & Negócios",
    audience: "Founders e operadores que querem IA com controle",
    company: "TAVIR",
    color: "#B7F34A",
    initials: "CJ",
    nets: [
      {
        net: "ig",
        handle: "@carlosjunior",
        url: "https://instagram.com/carlosjunior",
        followers: 18400,
        engagement: 4.2,
      },
      {
        net: "yt",
        handle: "Carlos Junior",
        url: "https://youtube.com/@carlosjunior",
        followers: 9200,
        engagement: 6.1,
      },
      {
        net: "li",
        handle: "Carlos Junior",
        url: "https://linkedin.com/in/carlosjunior",
        followers: 11200,
        engagement: 3.4,
      },
    ],
    designSystem: DS_DEFAULT("#B7F34A"),
    cycleGoal: 24,
    cycleDone: 18,
    status: "active",
  },
  {
    id: "pf-datavir",
    name: "Datavir",
    handle: "@datavir",
    niche: "Dados e BI para PMEs",
    audience: "Donos e gestores que ainda decidem por planilha",
    company: "TAVIR · Datavir",
    color: "#1BC5BD",
    initials: "DV",
    nets: [
      {
        net: "li",
        handle: "Datavir",
        url: "https://linkedin.com/company/datavir",
        followers: 3400,
        engagement: 2.8,
      },
      {
        net: "ig",
        handle: "@datavir",
        url: "https://instagram.com/datavir",
        followers: 2100,
        engagement: 3.1,
      },
    ],
    designSystem: {
      ...DS_DEFAULT("#1BC5BD"),
      toneOfVoice: "didático e direto",
    },
    cycleGoal: 12,
    cycleDone: 5,
    status: "active",
  },
  {
    id: "pf-canal",
    name: "IA na Prática",
    handle: "@ianapratica",
    niche: "IA aplicada ao trabalho",
    audience: "Profissionais que querem usar IA no dia a dia",
    company: "TAVIR",
    color: "#F2BC59",
    initials: "IA",
    nets: [
      {
        net: "yt",
        handle: "IA na Prática",
        url: "https://youtube.com/@ianapratica",
        followers: 15600,
        engagement: 7.4,
      },
      {
        net: "ig",
        handle: "@ianapratica",
        url: "https://instagram.com/ianapratica",
        followers: 8800,
        engagement: 5.2,
      },
    ],
    designSystem: {
      ...DS_DEFAULT("#F2BC59"),
      toneOfVoice: "curioso e prático",
    },
    cycleGoal: 16,
    cycleDone: 9,
    status: "active",
  },
];

export const DEMO_PIECES: ContentPiece[] = [
  {
    id: "pc-1",
    num: "ST-041",
    profileId: "pf-carlos",
    net: "ig",
    stage: "idea",
    title: "IA como sócia, não estagiária",
    subtitle: "Banco de ideias",
  },
  {
    id: "pc-2",
    num: "ST-042",
    profileId: "pf-carlos",
    net: "ig",
    stage: "pauta",
    title: "A agenda indecisa",
    subtitle: "Pesquisando 14 fontes",
    needs: true,
  },
  {
    id: "pc-3",
    num: "ST-043",
    profileId: "pf-carlos",
    net: "li",
    stage: "pauta",
    title: "Sistemas para creator",
    subtitle: "Sintetizando briefing",
  },
  {
    id: "pc-4",
    num: "ST-044",
    profileId: "pf-carlos",
    net: "ig",
    stage: "prod",
    title: "O custo do contexto",
    subtitle: "Instagram Studio · 72%",
    progress: 72,
    squad: "Instagram Studio",
  },
  {
    id: "pc-5",
    num: "ST-045",
    profileId: "pf-carlos",
    net: "yt",
    stage: "prod",
    title: "Delegar para agentes",
    subtitle: "YouTube · roteiro",
    squad: "YouTube Roteirista",
  },
  {
    id: "pc-6",
    num: "ST-046",
    profileId: "pf-carlos",
    net: "ig",
    stage: "review",
    title: "Sua agenda está indecisa",
    subtitle: "Pacote final",
    needs: true,
    caption:
      "Você não precisa de mais uma ferramenta. Precisa decidir quais escolhas não quer refazer toda semana. Neste carrossel, reuni as 3 decisões que devolvem foco para a operação.",
    cta: "Salve este mapa e compartilhe com quem vive apagando incêndios.",
    tags: "#produtividade #sistemas #criadores #gestão #inteligênciaartificial",
    slides: [
      "Sua agenda não está cheia.\nEla está indecisa.",
      "O problema não é volume.",
      "São as microdecisões.",
      "Três decisões que devolvem foco.",
      "Salve e compartilhe.",
    ],
  },
  {
    id: "pc-7",
    num: "ST-047",
    profileId: "pf-carlos",
    net: "li",
    stage: "review",
    title: "Ritual de segunda",
    subtitle: "3 pautas",
    needs: true,
    caption:
      "Toda segunda eu abro a semana com as mesmas 3 perguntas. Não é motivação — é protocolo. Sem elas, a operação volta a decidir no escuro.",
    cta: "Salve o ritual e use na próxima abertura de sprint.",
    tags: "#operação #liderança #sistemas #produtividade",
    slides: [
      "Ritual de segunda.\nTrês perguntas, zero improviso.",
      "1. O que não pode falhar esta semana?",
      "2. O que estamos fingindo que é urgente?",
      "3. Quem decide o quê — e com qual dado?",
    ],
  },
  {
    id: "pc-8",
    num: "ST-048",
    profileId: "pf-carlos",
    net: "ig",
    stage: "pub",
    title: "O playbook invisível",
    subtitle: "Agendado · 18:30",
  },
  {
    id: "pc-9",
    num: "ST-049",
    profileId: "pf-carlos",
    net: "ig",
    stage: "done",
    title: "Pare de otimizar tarefas",
    subtitle: "Publicado",
  },
  {
    id: "pc-10",
    num: "ST-050",
    profileId: "pf-carlos",
    net: "ig",
    stage: "error",
    title: "Exportação do Reel interrompida",
    subtitle: "O render excedeu o tempo no passo 4 de 5.",
  },
  {
    id: "pc-11",
    num: "ST-031",
    profileId: "pf-datavir",
    net: "li",
    stage: "review",
    title: "Por que sua PME ainda decide no escuro",
    needs: true,
    caption: "Quantas decisões desta semana tiveram dado por trás?",
    cta: "Comente qual indicador você ainda não acompanha.",
    tags: "#dados #bi #pme",
    slides: ["Decidir no escuro custa caro.", "3 sinais de que falta dado.", "Comece por um painel simples."],
  },
  {
    id: "pc-12",
    num: "ST-032",
    profileId: "pf-datavir",
    net: "ig",
    stage: "pauta",
    title: "5 indicadores que toda PME deveria acompanhar",
    needs: true,
  },
  {
    id: "pc-13",
    num: "ST-051",
    profileId: "pf-canal",
    net: "yt",
    stage: "prod",
    title: "Ep. 12 · Automatizei meu e-mail com IA",
    progress: 40,
  },
];

export const DEMO_DECISIONS: DecisionCheckpoint[] = [
  {
    id: "dec-1",
    profileId: "pf-carlos",
    runId: "TVR-2841",
    kind: "pauta",
    title: "Escolha a próxima pauta do ciclo",
    subtitle: "O Oráculo cruzou repertório, tendências e desempenho histórico.",
    waitingLabel: "aguardando você",
    timer: "03:42",
    ago: "8 min atrás",
    selectedOptionId: "opt-a",
    options: [
      {
        id: "opt-a",
        label: "OPÇÃO A",
        style: "CONTRARIAN",
        fit: 94,
        title: "Produtividade não é fazer mais. É decidir menos.",
        angle: "Desconstruir a rotina lotada e mostrar o custo cognitivo das microdecisões.",
        hook: "“Sua agenda não está cheia. Ela está indecisa.”",
        sources: "MIT Sloan · HBR · Dados TAVIR",
        whyNow:
          "Conecta uma dor latente ao posicionamento de sistemas e tem alto potencial de salvamento.",
      },
      {
        id: "opt-b",
        label: "OPÇÃO B",
        style: "PRÁTICO",
        fit: 88,
        title: "O ritual de 12 minutos que organiza uma semana inteira.",
        angle: "Entregar um framework visual de priorização em quatro movimentos replicáveis.",
        hook: "“Antes de abrir o Notion, responda estas 4 perguntas.”",
        sources: "Método Ivy Lee · Shape Up · Pesquisa própria",
        whyNow: "Formato utilitário com forte histórico de compartilhamento neste perfil.",
      },
      {
        id: "opt-c",
        label: "OPÇÃO C",
        style: "BASTIDORES",
        fit: 81,
        title: "Como uma equipe pequena publica como uma redação.",
        angle: "Abrir o processo real, incluindo gargalos, automações e decisões humanas.",
        hook: "“Não contratamos mais pessoas. Mudamos a esteira.”",
        sources: "Cases Buffer · Linear · Operação TAVIR",
        whyNow:
          "Humaniza a marca e cria autoridade, mas exige mais prova visual para performar.",
      },
    ],
  },
  {
    id: "dec-2",
    profileId: "pf-carlos",
    runId: "TVR-2837",
    kind: "revisao",
    title: "Pacote final · “Sua agenda está indecisa”",
    subtitle: "Pacote pronto para liberação",
    waitingLabel: "revisão humana",
    ago: "Instagram Studio",
    platformLabel: "Instagram Studio",
    pieceId: "pc-6",
  },
];

export const WORKSPACE_NAV: Array<{
  id: StudioViewId;
  label: string;
  icon: string;
}> = [
  { id: "dash", label: "Dash do Perfil", icon: "chart-line" },
  { id: "decisions", label: "Centro de Decisões", icon: "git-pull-request" },
  { id: "pipeline", label: "Esteira / Pipeline", icon: "layers" },
  { id: "oracle", label: "Mesa do Oráculo", icon: "sparkles" },
  { id: "visual", label: "Studio Visual", icon: "film" },
  { id: "learning", label: "Aprendizados & Metas", icon: "milestone" },
];

export function formatFollowers(n?: number): string {
  if (!n) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
