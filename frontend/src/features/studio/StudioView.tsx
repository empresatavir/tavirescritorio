import { createSignal, createMemo, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";

interface ContentProfile {
  id: string;
  name: string;
  niche: string;
  audience: string;
  tone: string;
  context: string;
  color: string;
  initials: string;
  nets: Array<{ net: "ig" | "yt" | "tt" | "li"; handle: string; logo: string }>;
}

interface ContentPiece {
  num: string;
  pf: string;
  net: "ig" | "yt" | "tt" | "li";
  stage: "idea" | "pauta" | "prod" | "review" | "pub" | "done";
  title: string;
  needs?: boolean;
  published?: boolean;
  script?: string;
  caption?: string;
  tags?: string;
  images: string[];
  timeline: Array<[string, string, string]>;
}

const PROFILES: ContentProfile[] = [
  {
    id: "pf-datavir",
    name: "Datavir",
    niche: "Dados e BI para pequenas e médias empresas",
    audience: "Donos e gestores de PMEs que ainda decidem por planilha",
    tone: "didático e direto",
    context: "Consultoria de dados da TAVIR. Nunca prometer resultado financeiro.",
    color: "#B7F34A",
    initials: "DV",
    nets: [
      { net: "li", handle: "Datavir", logo: "assets/logos/linkedin.svg" },
      { net: "ig", handle: "@datavir", logo: "assets/logos/instagram.svg" },
    ],
  },
  {
    id: "pf-canal",
    name: "Canal IA na Prática",
    niche: "IA aplicada ao trabalho",
    audience: "Profissionais que querem usar IA no dia a dia",
    tone: "curioso e prático",
    context: "Canal de episódios semanais com demonstrações reais.",
    color: "#1BC5BD",
    initials: "IA",
    nets: [
      { net: "yt", handle: "IA na Prática", logo: "assets/logos/youtube.svg" },
      { net: "tt", handle: "@ianapratica", logo: "assets/logos/tiktok.svg" },
      { net: "ig", handle: "@ianapratica", logo: "assets/logos/instagram.svg" },
    ],
  },
  {
    id: "pf-tavir",
    name: "TAVIR",
    niche: "Operação com agentes de IA",
    audience: "Empresas que querem automatizar com controle humano",
    tone: "confiante e transparente",
    context: "Marca institucional da TAVIR.",
    color: "#F4F6F2",
    initials: "TV",
    nets: [
      { net: "ig", handle: "@tavir", logo: "assets/logos/instagram.svg" },
      { net: "li", handle: "TAVIR", logo: "assets/logos/linkedin.svg" },
    ],
  },
];

const INITIAL_PIECES: ContentPiece[] = [
  {
    num: "ST-031",
    pf: "pf-datavir",
    net: "li",
    stage: "review",
    title: "Por que sua PME ainda decide no escuro",
    script: 'Abertura com a pergunta "quantas decisões desta semana tiveram dado por trás?". Três exemplos e fechamento.',
    caption: 'Quantas decisões desta semana tiveram dado por trás? Em PMEs, a resposta costuma ser "poucas".',
    tags: "#dados #bi #pme",
    images: ["Imagem 1200×628"],
    timeline: [
      ["27/09 10:00", "Agente de temas", "Tema sugerido"],
      ["27/09 14:10", "Oráculo", "Pauta aprovada"],
      ["28/09 11:30", "Redator", "Texto e imagem prontos"],
    ],
  },
  {
    num: "ST-032",
    pf: "pf-datavir",
    net: "ig",
    stage: "pauta",
    needs: true,
    title: "5 indicadores que toda PME deveria acompanhar",
    script: "Lâmina 1: título. Lâminas 2–6: um indicador por lâmina com a pergunta que responde. Última: CTA.",
    caption: "Salve para montar o seu painel.",
    tags: "#indicadores #gestao",
    images: [],
    timeline: [
      ["28/09 09:00", "Você", "Tema definido"],
      ["28/09 09:40", "Oráculo", "Roteiro entregue · aguardando sua aprovação"],
    ],
  },
  {
    num: "ST-033",
    pf: "pf-datavir",
    net: "ig",
    stage: "prod",
    title: "Planilha x painel: quando migrar",
    script: "Carrossel comparativo em 6 lâminas.",
    caption: "Planilha resolve até certo ponto.",
    tags: "#bi",
    images: ["Lâmina 1", "Lâmina 2"],
    timeline: [
      ["27/09 16:00", "Oráculo", "Pauta aprovada"],
      ["28/09 10:00", "Designer", "Produção iniciada"],
    ],
  },
  {
    num: "ST-034",
    pf: "pf-datavir",
    net: "li",
    stage: "idea",
    title: "Dado limpo antes de dashboard bonito",
    script: "—",
    caption: "—",
    images: [],
    timeline: [["28/09 11:10", "Você", "Ideia registrada"]],
  },
  {
    num: "ST-028",
    pf: "pf-datavir",
    net: "li",
    stage: "done",
    published: true,
    title: "O custo invisível do relatório manual",
    script: "Post de texto com 3 números.",
    caption: "Relatório manual custa mais do que parece.",
    tags: "#produtividade",
    images: ["Imagem 1200×628"],
    timeline: [["24/09 08:00", "Social Media", "Publicado"]],
  },
  {
    num: "ST-041",
    pf: "pf-canal",
    net: "yt",
    stage: "review",
    title: "Ep. 12 · Automatizei meu e-mail com IA em 20 minutos",
    script: "0:00 gancho · 0:40 o problema · 2:30 montagem do fluxo ao vivo · 9:00 resultado.",
    caption: "Neste episódio eu monto, do zero, uma automação que organiza meu e-mail sozinha.",
    tags: "#ia #produtividade #automacao",
    images: ["Thumbnail A", "Thumbnail B", "Cena 1"],
    timeline: [
      ["25/09 10:00", "Showrunner", "Episódio definido"],
      ["26/09 15:00", "Roteirista", "Roteiro entregue"],
      ["27/09 18:00", "Narrador", "Narração gravada"],
      ["28/09 12:00", "Diretor de arte", "Imagens geradas"],
    ],
  },
  {
    num: "ST-042",
    pf: "pf-canal",
    net: "tt",
    stage: "prod",
    title: "3 prompts que eu uso todo dia",
    script: "Três cortes de 10 s, um por prompt.",
    caption: "Salva esse vídeo.",
    tags: "#ia #prompts",
    images: ["Cena 1"],
    timeline: [["28/09 09:30", "Roteirista", "Roteiro curto entregue"]],
  },
  {
    num: "ST-043",
    pf: "pf-canal",
    net: "yt",
    stage: "pauta",
    needs: true,
    title: "Ep. 13 · IA para planilhas: o que funciona e o que não funciona",
    script: "Estrutura em 4 blocos com demonstrações.",
    caption: "—",
    images: [],
    timeline: [["28/09 10:00", "Oráculo", "Pauta entregue · aguardando sua aprovação"]],
  },
  {
    num: "ST-051",
    pf: "pf-tavir",
    net: "ig",
    stage: "review",
    title: "5 sinais de que sua landing não converte",
    script: "Uma lâmina por sinal com correção sugerida.",
    caption: "Sua landing recebe visitas, mas não gera contatos? Separamos 5 sinais.",
    tags: "#marketingdigital #landingpage",
    images: ["Lâmina 1", "Lâmina 2", "Lâmina 3"],
    timeline: [
      ["28/09 11:40", "Redator", "Copy entregue"],
      ["28/09 15:20", "Designer", "Artes finalizadas"],
    ],
  },
];

const STAGES = [
  { id: "idea", label: "Ideia", who: "você ou agente de temas" },
  { id: "pauta", label: "Pauta · Oráculo", who: "Oráculo cria o roteiro" },
  { id: "prod", label: "Produção", who: "agentes da esteira da rede" },
  { id: "review", label: "Revisão final", who: "você revisa conteúdo e design" },
  { id: "pub", label: "Publicação", who: "informativo final" },
  { id: "done", label: "Concluídos", who: "publicado ou não" },
];

export function StudioView() {
  const [pieces, setPieces] = createSignal<ContentPiece[]>(INITIAL_PIECES);
  const [selectedProfileId, setSelectedProfileId] = createSignal<string | null>("pf-datavir");
  const [activeTab, setActiveTab] = createSignal<"pipe" | "visual" | "learning">("pipe");
  const [selectedPieceNum, setSelectedPieceNum] = createSignal<string | null>(null);
  const [filterNet, setFilterNet] = createSignal<string>("all");
  const [newIdeaOpen, setNewIdeaOpen] = createSignal<boolean>(false);
  const [newIdeaText, setNewIdeaText] = createSignal<string>("");
  const [adjustText, setAdjustText] = createSignal<string>("");

  const currentProfile = createMemo(() => {
    const id = selectedProfileId();
    if (!id) return null;
    return PROFILES.find((p) => p.id === id) || null;
  });

  const selectedPiece = createMemo(() => {
    const num = selectedPieceNum();
    if (!num) return null;
    return pieces().find((p) => p.num === num) || null;
  });

  const profilePieces = createMemo(() => {
    const pid = selectedProfileId();
    if (!pid) return [];
    let list = pieces().filter((p) => p.pf === pid);
    const net = filterNet();
    if (net !== "all") {
      list = list.filter((p) => p.net === net);
    }
    return list;
  });

  const handleAdvancePiece = (num: string) => {
    setPieces((prev) =>
      prev.map((p) => {
        if (p.num === num) {
          const order: ContentPiece["stage"][] = ["idea", "pauta", "prod", "review", "pub", "done"];
          const currIdx = order.indexOf(p.stage);
          const nextStage = currIdx < order.length - 1 ? order[currIdx + 1] : p.stage;
          return {
            ...p,
            stage: nextStage,
            needs: false,
            timeline: [
              [new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "Você", `Avançado para ${nextStage}`],
              ...p.timeline,
            ],
          };
        }
        return p;
      })
    );
    showToast(`Peça ${num} avançada no fluxo`, "Tavir Studio", "success");
  };

  const handleCreateIdea = () => {
    const text = newIdeaText().trim();
    const pid = selectedProfileId();
    if (!text || !pid) return;

    const newNum = `ST-${String(pieces().length + 30).padStart(3, "0")}`;
    const newPiece: ContentPiece = {
      num: newNum,
      pf: pid,
      net: "ig",
      stage: "idea",
      title: text,
      images: [],
      timeline: [[new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "Você", "Ideia registrada"]],
    };

    setPieces((prev) => [newPiece, ...prev]);
    setNewIdeaText("");
    setNewIdeaOpen(false);
    showToast(`Ideia ${newNum} enviada ao Oráculo`, "Nova produção", "success");
  };

  const handleSendAdjust = () => {
    const adj = adjustText().trim();
    const p = selectedPiece();
    if (!adj || !p) return;

    setPieces((prev) =>
      prev.map((item) =>
        item.num === p.num
          ? {
              ...item,
              stage: "prod",
              timeline: [
                [new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "Você", `Ajuste solicitado: ${adj}`],
                ...item.timeline,
              ],
            }
          : item
      )
    );
    setAdjustText("");
    setSelectedPieceNum(null);
    showToast("Ajuste enviado para a esteira de produção", "Tavir Studio", "info");
  };

  return (
    <div
      data-screen-label="Tavir Studio"
      style={{
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      {/* 1. SELEÇÃO DE PERFIL / OVERVIEW */}
      <Show when={!selectedProfileId()}>
        <div style={{ "max-width": "1200px", padding: "20px 24px 40px", display: "flex", "flex-direction": "column", gap: "24px" }}>
          <div>
            <div style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Módulos · Tavir Studio
            </div>
            <h1 style={{ margin: "4px 0 0", "font-size": "22px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
              Perfis de conteúdo
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #cbd3de)" }}>
              Selecione o perfil para gerenciar pautas, esteiras e produções editoriais.
            </p>
          </div>

          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            <For each={PROFILES}>
              {(pf) => {
                const active = pieces().filter((p) => p.pf === pf.id && p.stage !== "done").length;
                const need = pieces().filter((p) => p.pf === pf.id && p.needs).length;
                const pub = pieces().filter((p) => p.pf === pf.id && p.stage === "done").length;

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedProfileId(pf.id)}
                    style={{
                      "text-align": "left",
                      padding: "18px",
                      "border-radius": "18px",
                      border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                      background: "var(--surface-1, #0f1729)",
                      color: "var(--text-primary, #F4F6F2)",
                      cursor: "pointer",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
                      <span
                        style={{
                          width: "44px",
                          height: "44px",
                          "border-radius": "14px",
                          flex: "none",
                          display: "flex",
                          "align-items": "center",
                          "justify-content": "center",
                          "font-size": "15px",
                          "font-weight": "700",
                          color: "var(--ink, #0B1220)",
                          background: pf.color,
                        }}
                      >
                        {pf.initials}
                      </span>
                      <div style={{ flex: "1", "min-width": "0" }}>
                        <div style={{ "font-size": "16px", "font-weight": "600" }}>{pf.name}</div>
                        <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                          {pf.niche}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", "grid-template-columns": "repeat(3, minmax(0, 1fr))", gap: "8px", "padding-top": "12px", "border-top": "1px solid rgba(244,246,242,.10)" }}>
                      <div>
                        <div style={{ "font-family": "var(--font-mono)", "font-size": "18px" }}>{active}</div>
                        <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>em produção</div>
                      </div>
                      <div>
                        <div style={{ "font-family": "var(--font-mono)", "font-size": "18px", color: need > 0 ? "var(--flow, oklch(.80 .155 78))" : "var(--text-primary)" }}>{need}</div>
                        <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>aguardando você</div>
                      </div>
                      <div>
                        <div style={{ "font-family": "var(--font-mono)", "font-size": "18px" }}>{pub}</div>
                        <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>concluídas</div>
                      </div>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* 2. PAINEL DO PERFIL SELECIONADO */}
      <Show when={currentProfile()}>
        {(pf) => (
          <div style={{ "max-width": "1440px", padding: "16px 24px 40px", display: "flex", "flex-direction": "column", gap: "20px" }}>
            {/* Header do Perfil */}
            <div style={{ display: "flex", "align-items": "center", gap: "12px", "flex-wrap": "wrap" }}>
              <button
                type="button"
                onClick={() => setSelectedProfileId(null)}
                aria-label="Voltar aos perfis"
                style={{
                  height: "32px",
                  width: "32px",
                  padding: "0",
                  "border-radius": "999px",
                  border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                  background: "transparent",
                  color: "var(--text-primary, #F4F6F2)",
                  cursor: "pointer",
                  display: "inline-flex",
                  "align-items": "center",
                  "justify-content": "center",
                }}
              >
                <TvIcon name="arrow-left" style={{ width: "14px", height: "14px" }} />
              </button>

              <span
                style={{
                  width: "40px",
                  height: "40px",
                  "border-radius": "14px",
                  flex: "none",
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "center",
                  "font-size": "15px",
                  "font-weight": "700",
                  color: "var(--ink, #0B1220)",
                  background: pf().color,
                }}
              >
                {pf().initials}
              </span>

              <div style={{ "min-width": "0" }}>
                <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                  <span style={{ "font-size": "18px", "font-weight": "600" }}>{pf().name}</span>
                  <For each={pf().nets}>
                    {(hn) => (
                      <span style={{ width: "18px", height: "18px", "border-radius": "4px", background: "#fff", display: "flex", "align-items": "center", "justify-content": "center" }}>
                        <TvIcon logo={hn.logo} style={{ width: "12px", height: "12px" }} />
                      </span>
                    )}
                  </For>
                </div>
                <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                  {pf().niche} · tom: {pf().tone}
                </div>
              </div>

              <span style={{ flex: "1" }}></span>

              {/* Sub-tabs */}
              <div
                style={{
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "2px",
                  padding: "2px",
                  background: "var(--surface-0, #0B1220)",
                  border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                  "border-radius": "999px",
                  width: "max-content",
                  "max-width": "100%",
                }}
              >
                {[
                  ["pipe", "Esteira"],
                  ["visual", "Estúdio visual"],
                  ["learning", "Aprendizados"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    onClick={() => setActiveTab(id as any)}
                    style={{
                      height: "28px",
                      padding: "0 12px",
                      border: "none",
                      "border-radius": "999px",
                      cursor: "pointer",
                      "font-size": "12px",
                      "font-weight": "500",
                      background: activeTab() === id ? "var(--teal, #1BC5BD)" : "transparent",
                      color: activeTab() === id ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setNewIdeaOpen(true)}
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "8px",
                  height: "34px",
                  padding: "0 16px",
                  "border-radius": "999px",
                  border: "none",
                  background: "var(--lime, #B7F34A)",
                  color: "var(--ink-panel, #25360a)",
                  "font-weight": "600",
                  cursor: "pointer",
                }}
              >
                <TvIcon name="plus" style={{ width: "14px", height: "14px" }} />
                Nova produção
              </button>
            </div>

            {/* TAB 1: ESTEIRA (KANBAN) */}
            <Show when={activeTab() === "pipe"}>
              {/* Network Filter */}
              <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "2px",
                    padding: "2px",
                    background: "var(--surface-0, #0B1220)",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                    "border-radius": "999px",
                  }}
                >
                  {[
                    ["all", "Todas"],
                    ["ig", "Instagram"],
                    ["yt", "YouTube"],
                    ["li", "LinkedIn"],
                    ["tt", "TikTok"],
                  ].map(([id, label]) => (
                    <button
                      type="button"
                      onClick={() => setFilterNet(id)}
                      style={{
                        height: "26px",
                        padding: "0 10px",
                        border: "none",
                        "border-radius": "999px",
                        cursor: "pointer",
                        "font-size": "12px",
                        background: filterNet() === id ? "var(--teal, #1BC5BD)" : "transparent",
                        color: filterNet() === id ? "var(--ink, #0B1220)" : "var(--text-muted)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6-Column Kanban */}
              <div style={{ display: "grid", "grid-template-columns": "repeat(6, minmax(210px, 1fr))", gap: "12px", "overflow-x": "auto", "padding-bottom": "6px" }}>
                <For each={STAGES}>
                  {(stg, idx) => {
                    const colPieces = () => profilePieces().filter((p) => p.stage === stg.id);

                    return (
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                          gap: "8px",
                          padding: "10px",
                          "border-radius": "14px",
                          background: "var(--surface-1, #0f1729)",
                          border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                          height: "560px",
                        }}
                      >
                        <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted)" }}>
                            0{idx() + 1}
                          </span>
                          <span style={{ "font-weight": "600", "font-size": "13px", flex: "1" }}>{stg.label}</span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--teal, #1BC5BD)" }}>
                            {colPieces().length}
                          </span>
                        </div>
                        <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>{stg.who}</div>

                        <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", display: "flex", "flex-direction": "column", gap: "8px" }}>
                          <For each={colPieces()}>
                            {(pc) => (
                              <div
                                role="button"
                                tabIndex="0"
                                onClick={() => setSelectedPieceNum(pc.num)}
                                style={{
                                  "border-radius": "12px",
                                  background: "var(--surface-2, #121c30)",
                                  border: pc.needs ? "1px solid var(--flow, oklch(.80 .155 78))" : "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  display: "flex",
                                  "flex-direction": "column",
                                  gap: "8px",
                                  padding: "10px",
                                }}
                              >
                                <div style={{ display: "flex", "align-items": "center", gap: "6px", "font-size": "11px", color: "var(--text-muted)" }}>
                                  <span style={{ "font-family": "var(--font-mono)" }}>{pc.num}</span>
                                  <span>·</span>
                                  <span style={{ "text-transform": "uppercase" }}>{pc.net}</span>
                                  <span style={{ flex: "1" }}></span>
                                  <Show when={pc.needs}>
                                    <span style={{ color: "var(--flow, oklch(.80 .155 78))", "font-weight": "600" }}>revisar</span>
                                  </Show>
                                </div>
                                <div style={{ "font-weight": "500", "font-size": "13px", "line-height": "1.35" }}>
                                  {pc.title}
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>

            {/* TAB 2: ESTÚDIO VISUAL */}
            <Show when={activeTab() === "visual"}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "align-items": "center" }}>
                <div style={{ "font-size": "14px", color: "var(--text-secondary)" }}>
                  Prévia em tempo real das peças conforme o template visual de cada plataforma:
                </div>

                {/* Card Instagram Mockup */}
                <div style={{ width: "360px", "border-radius": "16px", background: "#fff", color: "#0B1220", overflow: "hidden", "box-shadow": "0 20px 40px rgba(0,0,0,.4)" }}>
                  <div style={{ display: "flex", "align-items": "center", gap: "8px", padding: "10px 14px", "border-bottom": "1px solid #f0f0f0" }}>
                    <span style={{ width: "32px", height: "32px", "border-radius": "50%", background: pf().color, display: "flex", "align-items": "center", "justify-content": "center", "font-weight": "700", "font-size": "12px", color: "#0B1220" }}>
                      {pf().initials}
                    </span>
                    <span style={{ "font-weight": "600", "font-size": "13px" }}>{pf().nets[0]?.handle}</span>
                  </div>
                  <div style={{ "aspect-ratio": "4 / 5", background: "repeating-linear-gradient(135deg,#e9ece6 0 10px,#dfe3dc 10px 20px)", display: "flex", "align-items": "center", "justify-content": "center", padding: "20px" }}>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", background: "#fff", padding: "8px 12px", "border-radius": "8px", "text-align": "center" }}>
                      Carrossel 4:5 · TAVIR Studio
                    </span>
                  </div>
                  <div style={{ padding: "12px 14px", "font-size": "12px", "line-height": "1.4" }}>
                    <strong>{pf().nets[0]?.handle}</strong> Conteúdo automatizado com supervisão humana e validação de gates.
                  </div>
                </div>
              </div>
            </Show>

            {/* TAB 3: APRENDIZADOS */}
            <Show when={activeTab() === "learning"}>
              <div style={{ padding: "24px", "border-radius": "14px", border: "1px dashed rgba(244,246,242,.34)", display: "flex", "flex-direction": "column", gap: "8px", "max-width": "720px" }}>
                <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--flow, oklch(.80 .155 78))" }}>
                  Métricas e Aprendizados
                </span>
                <span style={{ "font-weight": "600", "font-size": "16px" }}>Aprendizados de {pf().name}</span>
                <span style={{ color: "var(--text-secondary)", "line-height": "1.55", "font-size": "13px" }}>
                  Métricas de sucesso por rede, temas com maior retenção e histórico de melhorias retroalimentados nos prompts do Oráculo e do Redator.
                </span>
              </div>
            </Show>
          </div>
        )}
      </Show>

      {/* MODAL: NOVA PRODUÇÃO */}
      <Show when={newIdeaOpen()}>
        <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.66)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
          <div style={{ width: "540px", "max-width": "calc(100% - 32px)", background: "var(--surface-2, #121c30)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", padding: "20px", display: "flex", "flex-direction": "column", gap: "16px" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
              <span style={{ "font-weight": "600", "font-size": "16px", flex: "1" }}>01 · Nova Ideia</span>
              <button type="button" onClick={() => setNewIdeaOpen(false)} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Esc</button>
            </div>
            <textarea
              value={newIdeaText()}
              onInput={(e) => setNewIdeaText(e.currentTarget.value)}
              rows={3}
              placeholder="Descreva o tema ou a premissa da nova peça..."
              style={{ padding: "10px 12px", "border-radius": "8px", border: "1px solid var(--border-subtle, rgba(244,246,242,.16))", background: "var(--surface-0, #0B1220)", color: "var(--text-primary)", "font-size": "14px", resize: "vertical", outline: "none" }}
            />
            <div style={{ display: "flex", "justify-content": "flex-end", gap: "8px" }}>
              <button type="button" onClick={() => setNewIdeaOpen(false)} style={{ height: "34px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={handleCreateIdea} style={{ height: "34px", padding: "0 18px", "border-radius": "999px", border: "none", background: "var(--lime, #B7F34A)", color: "var(--ink-panel, #25360a)", "font-weight": "600", cursor: "pointer" }}>Enviar ao Oráculo</button>
            </div>
          </div>
        </div>
      </Show>

      {/* DRAWER: DETALHE DA PEÇA */}
      <Show when={selectedPiece()}>
        {(p) => (
          <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.55)", "z-index": "90", display: "flex", "justify-content": "flex-end" }}>
            <aside style={{ width: "560px", "max-width": "100%", background: "var(--surface-1, #0f1729)", "border-left": "1px solid var(--border-subtle, rgba(244,246,242,.16))", display: "flex", "flex-direction": "column", "box-shadow": "-20px 0 40px rgba(0,0,0,.35)" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "14px 20px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                <span style={{ "font-family": "var(--font-mono)", "font-size": "13px", "font-weight": "500" }}>{p().num}</span>
                <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>{p().net.toUpperCase()} · etapa: {p().stage}</span>
                <span style={{ flex: "1" }}></span>
                <button
                  type="button"
                  onClick={() => setSelectedPieceNum(null)}
                  style={{ height: "28px", padding: "0 12px", "border-radius": "999px", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", "font-size": "12px" }}
                >
                  Fechar
                </button>
              </div>

              <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", padding: "18px 20px 24px", display: "flex", "flex-direction": "column", gap: "18px" }}>
                <div>
                  <h2 style={{ margin: "0", "font-size": "18px", "font-weight": "600", "line-height": "1.35" }}>{p().title}</h2>
                </div>

                {/* Ações de aprovação */}
                <div style={{ padding: "14px", "border-radius": "14px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-2, #121c30)", display: "flex", "flex-direction": "column", gap: "10px" }}>
                  <span style={{ "font-weight": "600" }}>Fluxo de trabalho</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleAdvancePiece(p().num)}
                      style={{ height: "34px", padding: "0 16px", "border-radius": "999px", border: "none", background: "var(--lime, #B7F34A)", color: "var(--ink-panel, #25360a)", "font-weight": "600", cursor: "pointer" }}
                    >
                      Aprovar e avançar etapa
                    </button>
                  </div>
                </div>

                {/* Conteúdo */}
                <Show when={p().script}>
                  <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Roteiro / Copy</span>
                    <div style={{ padding: "12px 14px", "border-radius": "12px", background: "var(--surface-2, #121c30)", "font-size": "13px", "line-height": "1.6" }}>
                      {p().script}
                    </div>
                  </div>
                </Show>

                {/* Pedir ajuste */}
                <div style={{ padding: "14px", "border-radius": "14px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-2, #121c30)", display: "flex", "flex-direction": "column", gap: "10px" }}>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Pedir ajuste</span>
                  <textarea
                    value={adjustText()}
                    onInput={(e) => setAdjustText(e.currentTarget.value)}
                    rows={2}
                    placeholder="O que precisa mudar nesta peça?"
                    style={{ padding: "8px 12px", "border-radius": "8px", border: "1px solid var(--border-subtle)", background: "var(--surface-0)", color: "var(--text-primary)", "font-size": "13px", outline: "none", resize: "none" }}
                  />
                  <button
                    type="button"
                    onClick={handleSendAdjust}
                    style={{ "align-self": "flex-start", height: "30px", padding: "0 12px", "border-radius": "999px", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", "font-size": "12px" }}
                  >
                    Enviar ajuste à Produção
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Show>
    </div>
  );
}
