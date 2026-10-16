import { createSignal, createMemo, For, Show } from "solid-js";
import { agents, type RosterAgent, showToast } from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  meta?: string;
}

interface ChatConversation {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  settings: {
    model: string;
    effort: "baixo" | "médio" | "alto";
    time: string;
    tokens: string;
    insp: number;
    memory: boolean;
    vault: boolean;
    tasks: boolean;
  };
}

const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: "cv-1",
    agentId: "ag-06",
    title: "Variável SUPABASE_URL no deploy Meridian",
    updatedAt: "há 1 h",
    settings: {
      model: "gpt-4o",
      effort: "médio",
      time: "2 min",
      tokens: "1024",
      insp: 30,
      memory: true,
      vault: true,
      tasks: true,
    },
    messages: [
      {
        id: "m-1",
        role: "user",
        text: "Por que o deploy da landing Meridian falhou?",
        at: "13:31",
      },
      {
        id: "m-2",
        role: "assistant",
        text: "O build parou ao ler SUPABASE_URL, que não está cadastrada na conta vercel · tavir travada no projeto meridian-landing. O checkpoint ficou em 45%. Assim que a variável for cadastrada, refaço o build a partir desse ponto.",
        at: "13:32",
        meta: "gpt-4o · esforço médio · inspiração 30",
      },
    ],
  },
  {
    id: "cv-2",
    agentId: "ag-01",
    title: "Priorização do roadmap Q4",
    updatedAt: "ontem",
    settings: {
      model: "claude-sonnet-4",
      effort: "alto",
      time: "5 min",
      tokens: "2048",
      insp: 30,
      memory: true,
      vault: true,
      tasks: true,
    },
    messages: [
      {
        id: "m-3",
        role: "user",
        text: "Quais são as 3 frentes que você propôs para o Q4 do IA Livros?",
        at: "12:48",
      },
      {
        id: "m-4",
        role: "assistant",
        text: 'Propus três frentes, nesta ordem: 1) fechar os capítulos em andamento, começando por "Frameworks de Crescimento"; 2) montar o funil de lançamento com a landing e o lead magnet; 3) preparar a versão em áudio. A priorização está na aprovação ap-01 e o job-009 segue pausado até a sua decisão.',
        at: "12:50",
        meta: "claude-sonnet-4 · esforço alto · inspiração 30",
      },
    ],
  },
];

export function ChatView() {
  const [conversations, setConversations] = createSignal<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = createSignal<string>("cv-1");
  const [searchHistory, setSearchHistory] = createSignal<string>("");
  const [pickOpen, setPickOpen] = createSignal<boolean>(false);
  const [settingsOpen, setSettingsOpen] = createSignal<boolean>(false);
  const [inputMessage, setInputMessage] = createSignal<string>("");
  const [isTyping, setIsTyping] = createSignal<boolean>(false);

  const currentConv = createMemo(() => {
    return conversations().find((c) => c.id === selectedConvId()) || conversations()[0];
  });

  const currentAgent = createMemo(() => {
    const conv = currentConv();
    if (!conv) return agents()[0];
    return agents().find((a) => a.id === conv.agentId) || agents()[0];
  });

  const filteredHistory = createMemo(() => {
    const q = searchHistory().toLowerCase().trim();
    if (!q) return conversations();
    return conversations().filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (agents().find((a) => a.id === c.agentId)?.name || "").toLowerCase().includes(q)
    );
  });

  const handleSelectConv = (id: string) => {
    setSelectedConvId(id);
    setPickOpen(false);
  };

  const handleNewChat = () => {
    const ag = agents()[0];
    const newId = `cv-${Date.now()}`;
    const newConvItem: ChatConversation = {
      id: newId,
      agentId: ag.id,
      title: "Nova conversa",
      updatedAt: "agora",
      settings: {
        model: ag.model || "claude-sonnet-4",
        effort: "médio",
        time: "2 min",
        tokens: "1024",
        insp: 30,
        memory: true,
        vault: true,
        tasks: true,
      },
      messages: [],
    };
    setConversations((prev) => [newConvItem, ...prev]);
    setSelectedConvId(newId);
  };

  const handleSelectAgent = (ag: RosterAgent) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConv().id) {
          return {
            ...c,
            agentId: ag.id,
            settings: { ...c.settings, model: ag.model },
          };
        }
        return c;
      })
    );
    setPickOpen(false);
  };

  const handleSendMessage = () => {
    const text = inputMessage().trim();
    if (!text || isTyping()) return;

    const convId = currentConv().id;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text,
      at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const isFirst = c.messages.length === 0;
          return {
            ...c,
            title: isFirst ? text.slice(0, 36) : c.title,
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    setInputMessage("");
    setIsTyping(true);

    // Simulate Agent response
    setTimeout(() => {
      const ag = currentAgent();
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        role: "assistant",
        text: `Entendido. Registrei a solicitação no contexto de ${ag.role} (${ag.sector}). Vou processar a resposta mantendo os critérios do checklist e reportar os próximos passos.`,
        at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        meta: `${currentConv().settings.model} · esforço ${currentConv().settings.effort} · inspiração ${currentConv().settings.insp}`,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
      setIsTyping(false);
    }, 1200);
  };

  const updateSetting = <K extends keyof ChatConversation["settings"]>(
    key: K,
    val: ChatConversation["settings"][K]
  ) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConv().id) {
          return { ...c, settings: { ...c.settings, [key]: val } };
        }
        return c;
      })
    );
  };

  return (
    <div
      data-screen-label="Chat"
      style={{
        height: "100%",
        display: "grid",
        "grid-template-columns": settingsOpen()
          ? "240px minmax(0, 1fr) 280px"
          : "240px minmax(0, 1fr)",
        "min-height": "0",
        position: "relative",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      {/* Coluna 1: Histórico de Conversas */}
      <aside
        aria-label="Histórico de conversas"
        style={{
          "border-right": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
          display: "flex",
          "flex-direction": "column",
          "min-height": "0",
          background: "var(--surface-1, #0f1729)",
        }}
      >
        <div style={{ padding: "14px 12px 10px", display: "flex", "flex-direction": "column", gap: "8px" }}>
          <button
            type="button"
            onClick={handleNewChat}
            style={{
              height: "34px",
              padding: "0 12px",
              "border-radius": "999px",
              border: "1px solid var(--border-light, rgba(244,246,242,.34))",
              background: "transparent",
              color: "var(--text-primary, #F4F6F2)",
              cursor: "pointer",
              "font-size": "12px",
              "font-weight": "500",
              display: "inline-flex",
              "align-items": "center",
              gap: "6px",
              "white-space": "nowrap",
              "justify-content": "center",
            }}
          >
            <TvIcon name="plus" style={{ width: "13px", height: "13px" }} />
            Nova conversa
          </button>
          <input
            value={searchHistory()}
            onInput={(e) => setSearchHistory(e.currentTarget.value)}
            placeholder="Buscar no histórico"
            aria-label="Buscar conversas"
            style={{
              height: "32px",
              padding: "0 12px",
              "border-radius": "999px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-0, #0B1220)",
              color: "var(--text-primary, #F4F6F2)",
              "font-size": "13px",
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            padding: "4px 14px 6px",
            "font-family": "var(--font-mono)",
            "font-size": "11px",
            "font-weight": "500",
            "letter-spacing": "0.14em",
            "text-transform": "uppercase",
            color: "var(--text-muted, #aeb7c4)",
          }}
        >
          Histórico
        </div>

        <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", padding: "0 8px 12px", display: "flex", "flex-direction": "column", gap: "2px" }}>
          <For each={filteredHistory()}>
            {(cv) => {
              const isSelected = () => cv.id === selectedConvId();
              const ag = agents().find((a) => a.id === cv.agentId);

              return (
                <button
                  type="button"
                  onClick={() => handleSelectConv(cv.id)}
                  style={{
                    width: "100%",
                    "text-align": "left",
                    display: "grid",
                    "grid-template-columns": "28px minmax(0, 1fr)",
                    gap: "10px",
                    "align-items": "center",
                    padding: "8px",
                    border: "none",
                    "border-radius": "8px",
                    background: isSelected() ? "var(--surface-2, #17223a)" : "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      "border-radius": "8px",
                      flex: "none",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "font-size": "11px",
                      "font-weight": "600",
                      color: "var(--teal, #1BC5BD)",
                      background: "rgba(27,197,189,.14)",
                    }}
                  >
                    {ag?.initials || "AG"}
                  </span>
                  <span style={{ "min-width": "0" }}>
                    <span
                      style={{
                        display: "block",
                        "font-size": "13px",
                        "font-weight": "500",
                        overflow: "hidden",
                        "text-overflow": "ellipsis",
                        "white-space": "nowrap",
                      }}
                    >
                      {cv.title}
                    </span>
                    <span
                      style={{
                        display: "block",
                        "margin-top": "1px",
                        "font-size": "11px",
                        color: "var(--text-muted, #aeb7c4)",
                        overflow: "hidden",
                        "text-overflow": "ellipsis",
                        "white-space": "nowrap",
                      }}
                    >
                      {ag?.name || "Agente"} · {cv.updatedAt}
                    </span>
                  </span>
                </button>
              );
            }}
          </For>

          <Show when={filteredHistory().length === 0}>
            <div style={{ padding: "16px 8px", "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
              Nenhuma conversa encontrada
            </div>
          </Show>
        </div>
      </aside>

      {/* Coluna 2: Seção Principal do Chat */}
      <section style={{ display: "flex", "flex-direction": "column", "min-height": "0", "min-width": "0", position: "relative" }}>
        {/* Header da Conversa */}
        <div
          style={{
            padding: "12px 20px",
            "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
            display: "flex",
            "align-items": "center",
            gap: "10px",
            "min-width": "0",
          }}
        >
          {/* Seletor de Agente Trigger */}
          <button
            type="button"
            onClick={() => setPickOpen(!pickOpen())}
            aria-label="Selecionar agente"
            style={{
              "min-width": "0",
              flex: "0 1 auto",
              display: "flex",
              "align-items": "center",
              gap: "10px",
              padding: "4px 10px 4px 4px",
              "border-radius": "14px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "transparent",
              color: "var(--text-primary, #F4F6F2)",
              cursor: "pointer",
              "text-align": "left",
            }}
          >
            <span
              style={{
                width: "32px",
                height: "32px",
                "border-radius": "8px",
                flex: "none",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                "font-size": "11px",
                "font-weight": "600",
                color: "var(--teal, #1BC5BD)",
                background: "rgba(27,197,189,.14)",
              }}
            >
              {currentAgent().initials}
            </span>
            <span style={{ "min-width": "0" }}>
              <span style={{ display: "block", "font-weight": "600", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                {currentAgent().name}
              </span>
              <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                {currentAgent().role} · {currentAgent().sector}
              </span>
            </span>
            <span style={{ color: "var(--text-muted, #aeb7c4)", "margin-left": "4px" }}>▾</span>
          </button>

          <span style={{ flex: "1" }}></span>

          {/* Model Tag & Config Meta */}
          <span
            style={{
              "font-family": "var(--font-mono)",
              "font-size": "12px",
              padding: "4px 10px",
              "border-radius": "999px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              color: "var(--text-secondary, #cbd3de)",
              "white-space": "nowrap",
            }}
          >
            {currentConv().settings.model}
          </span>

          <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "white-space": "nowrap" }}>
            esforço {currentConv().settings.effort} · inspiração {currentConv().settings.insp}
          </span>

          {/* Botão Configurações */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen())}
            style={{
              height: "32px",
              padding: "0 12px",
              "border-radius": "999px",
              border: "1px solid var(--border-light, rgba(244,246,242,.34))",
              background: settingsOpen() ? "var(--teal, #1BC5BD)" : "transparent",
              color: settingsOpen() ? "var(--ink, #0B1220)" : "var(--text-primary, #F4F6F2)",
              cursor: "pointer",
              "font-size": "12px",
              "font-weight": "500",
              display: "inline-flex",
              "align-items": "center",
              gap: "6px",
              "white-space": "nowrap",
            }}
          >
            <TvIcon name="sliders" style={{ width: "13px", height: "13px" }} />
            Configurações
          </button>
        </div>

        {/* Modal Popover de Seleção de Agente */}
        <Show when={pickOpen()}>
          <div
            onClick={() => setPickOpen(false)}
            style={{ position: "absolute", inset: "0", "z-index": "4" }}
          />
          <div
            role="listbox"
            aria-label="Agentes"
            style={{
              position: "absolute",
              top: "64px",
              left: "20px",
              width: "340px",
              "max-width": "calc(100% - 40px)",
              "max-height": "420px",
              "overflow-y": "auto",
              background: "var(--surface-2, #121c30)",
              border: "1px solid var(--border-light, rgba(244,246,242,.34))",
              "border-radius": "14px",
              "box-shadow": "0 20px 40px rgba(0,0,0,.45)",
              "z-index": "5",
              padding: "6px",
            }}
          >
            <For each={agents()}>
              {(pa) => (
                <button
                  type="button"
                  onClick={() => handleSelectAgent(pa)}
                  style={{
                    width: "100%",
                    display: "grid",
                    "grid-template-columns": "28px minmax(0, 1fr) auto",
                    gap: "10px",
                    "align-items": "center",
                    padding: "8px",
                    border: "none",
                    "border-radius": "8px",
                    background: pa.id === currentAgent().id ? "var(--surface-1, #17223a)" : "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    "text-align": "left",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      "border-radius": "8px",
                      flex: "none",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "font-size": "11px",
                      "font-weight": "600",
                      color: "var(--teal, #1BC5BD)",
                      background: "rgba(27,197,189,.14)",
                    }}
                  >
                    {pa.initials}
                  </span>
                  <span style={{ "min-width": "0" }}>
                    <span style={{ display: "block", "font-weight": "500" }}>{pa.name}</span>
                    <span style={{ display: "block", "font-size": "11px", color: "var(--text-muted, #aeb7c4)", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                      {pa.role} · {pa.sector}
                    </span>
                  </span>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                    {pa.model}
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Mensagens do Chat Scroll */}
        <div id="chat-scroll" style={{ flex: "1", "min-height": "0", "overflow-y": "auto", "overflow-x": "hidden", padding: "24px 20px" }}>
          <div style={{ "max-width": "820px", margin: "0 auto", display: "flex", "flex-direction": "column", gap: "20px" }}>
            {/* Mensagem de Boas-vindas caso conversa vazia */}
            <Show when={currentConv().messages.length === 0}>
              <div style={{ padding: "40px 0 8px", display: "flex", "flex-direction": "column", "align-items": "flex-start", gap: "12px" }}>
                <span
                  style={{
                    width: "48px",
                    height: "48px",
                    "border-radius": "14px",
                    flex: "none",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    "font-size": "14px",
                    "font-weight": "600",
                    color: "var(--teal, #1BC5BD)",
                    background: "rgba(27,197,189,.14)",
                  }}
                >
                  {currentAgent().initials}
                </span>
                <div style={{ "font-size": "22px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
                  Converse com {currentAgent().name}
                </div>
                <div style={{ "max-width": "620px", "line-height": "1.6", color: "var(--text-secondary, #cbd3de)", "text-wrap": "pretty" }}>
                  {currentAgent().role} no setor {currentAgent().sector}. Atua com o modelo {currentConv().settings.model} sob limite de teto e critérios do roster operacional.
                </div>
                <div style={{ display: "flex", "flex-wrap": "wrap", gap: "8px", "margin-top": "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMessage("Como está o andamento da sua fila de jobs?");
                    }}
                    style={{
                      height: "32px",
                      padding: "0 12px",
                      "border-radius": "999px",
                      border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                      background: "transparent",
                      color: "var(--text-primary, #F4F6F2)",
                      cursor: "pointer",
                      "font-size": "12px",
                    }}
                  >
                    Como está o andamento da sua fila de jobs?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMessage("Quais são as principais restrições da sua alma operacional?");
                    }}
                    style={{
                      height: "32px",
                      padding: "0 12px",
                      "border-radius": "999px",
                      border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                      background: "transparent",
                      color: "var(--text-primary, #F4F6F2)",
                      cursor: "pointer",
                      "font-size": "12px",
                    }}
                  >
                    Quais são as restrições da sua alma?
                  </button>
                </div>
              </div>
            </Show>

            {/* Lista de Mensagens */}
            <For each={currentConv().messages}>
              {(m) => {
                if (m.role === "user") {
                  return (
                    <div style={{ display: "flex", "justify-content": "flex-end" }}>
                      <div
                        style={{
                          "max-width": "78%",
                          padding: "10px 14px",
                          "border-radius": "14px",
                          background: "var(--surface-2, #17223a)",
                          border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                          "line-height": "1.55",
                          "white-space": "pre-wrap",
                          "text-wrap": "pretty",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: "grid", "grid-template-columns": "32px minmax(0, 1fr)", gap: "12px" }}>
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        "border-radius": "8px",
                        flex: "none",
                        display: "flex",
                        "align-items": "center",
                        "justify-content": "center",
                        "font-size": "11px",
                        "font-weight": "600",
                        color: "var(--teal, #1BC5BD)",
                        background: "rgba(27,197,189,.14)",
                      }}
                    >
                      {currentAgent().initials}
                    </span>
                    <div style={{ "min-width": "0" }}>
                      <div style={{ display: "flex", "align-items": "baseline", gap: "8px", "flex-wrap": "wrap" }}>
                        <span style={{ "font-weight": "600" }}>{currentAgent().name}</span>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                          {m.meta || m.at}
                        </span>
                      </div>
                      <div
                        style={{
                          "margin-top": "4px",
                          "line-height": "1.65",
                          "white-space": "pre-wrap",
                          "text-wrap": "pretty",
                          color: "var(--text-primary, #F4F6F2)",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* Digitando indicador */}
            <Show when={isTyping()}>
              <div style={{ display: "grid", "grid-template-columns": "32px minmax(0, 1fr)", gap: "12px", "align-items": "center" }}>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    "border-radius": "8px",
                    flex: "none",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    "font-size": "11px",
                    "font-weight": "600",
                    color: "var(--teal, #1BC5BD)",
                    background: "rgba(27,197,189,.14)",
                  }}
                >
                  {currentAgent().initials}
                </span>
                <span style={{ color: "var(--text-muted, #aeb7c4)", "font-size": "13px" }}>
                  {currentAgent().name} está respondendo · limite {currentConv().settings.time}...
                </span>
              </div>
            </Show>
          </div>
        </div>

        {/* Campo de Entrada de Mensagem */}
        <div style={{ padding: "10px 20px 18px" }}>
          <div
            style={{
              "max-width": "820px",
              margin: "0 auto",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              "border-radius": "14px",
              background: "var(--surface-2, #121c30)",
              padding: "10px 12px",
              display: "flex",
              "flex-direction": "column",
              gap: "8px",
            }}
          >
            <textarea
              value={inputMessage()}
              onInput={(e) => setInputMessage(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={3}
              placeholder={`Solicitação para ${currentAgent().name}…`}
              aria-label="Mensagem"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-primary, #F4F6F2)",
                "font-size": "14px",
                "font-family": "inherit",
                "line-height": "1.55",
                resize: "none",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
              <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", flex: "1", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                Shift + Enter para pular linha · Enter para enviar
              </span>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputMessage().trim() || isTyping()}
                aria-label="Enviar"
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
                  opacity: !inputMessage().trim() || isTyping() ? 0.5 : 1,
                }}
              >
                <TvIcon name="send" style={{ width: "14px", height: "14px" }} />
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coluna 3: Drawer de Configurações */}
      <Show when={settingsOpen()}>
        <aside
          aria-label="Configurações da conversa"
          style={{
            "border-left": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
            background: "var(--surface-1, #0f1729)",
            "min-height": "0",
            "overflow-y": "auto",
            padding: "16px",
            display: "flex",
            "flex-direction": "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <span style={{ "font-weight": "600", flex: "1" }}>Configurações</span>
            <button
              type="button"
              onClick={() => {
                updateSetting("model", currentAgent().model);
                updateSetting("effort", "médio");
                updateSetting("time", "2 min");
                updateSetting("tokens", "1024");
                updateSetting("insp", 30);
                showToast("Configurações restauradas", "Padrão", "info");
              }}
              style={{ border: "none", background: "transparent", color: "var(--teal, #1BC5BD)", cursor: "pointer", "font-size": "12px", padding: "0" }}
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Fechar configurações"
              style={{
                height: "26px",
                padding: "0 10px",
                "border-radius": "999px",
                border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                background: "transparent",
                color: "var(--text-primary, #F4F6F2)",
                cursor: "pointer",
                "font-size": "12px",
              }}
            >
              Fechar
            </button>
          </div>

          {/* Modelo */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Modelo
            </span>
            <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
              {["claude-opus-4", "claude-sonnet-4", "gpt-4o", "gpt-4o-mini", "dall-e-3"].map((m) => (
                <button
                  type="button"
                  onClick={() => updateSetting("model", m)}
                  style={{
                    padding: "8px 10px",
                    "border-radius": "8px",
                    border: currentConv().settings.model === m ? "1px solid var(--teal, #1BC5BD)" : "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                    background: currentConv().settings.model === m ? "rgba(27,197,189,.08)" : "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    "text-align": "left",
                    cursor: "pointer",
                    "font-size": "13px",
                    "font-family": "var(--font-mono)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Nível de Esforço */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Esforço
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["baixo", "médio", "alto"] as const).map((ef) => (
                <button
                  type="button"
                  onClick={() => updateSetting("effort", ef)}
                  style={{
                    flex: "1",
                    height: "28px",
                    "border-radius": "999px",
                    border: "none",
                    cursor: "pointer",
                    "font-size": "12px",
                    background: currentConv().settings.effort === ef ? "var(--teal, #1BC5BD)" : "var(--surface-0, #0B1220)",
                    color: currentConv().settings.effort === ef ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
                    "font-weight": "500",
                  }}
                >
                  {ef}
                </button>
              ))}
            </div>
          </div>

          {/* Inspiração Slider */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <div style={{ display: "flex", "justify-content": "between" }}>
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)", flex: "1" }}>
                Inspiração
              </span>
              <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--teal, #1BC5BD)" }}>
                {currentConv().settings.insp}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentConv().settings.insp}
              onInput={(e) => updateSetting("insp", Number(e.currentTarget.value))}
              style={{ width: "100%", "accent-color": "var(--teal, #1BC5BD)" }}
            />
          </div>

          {/* Contexto e Conexões */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "10px", "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))", "padding-top": "14px" }}>
            <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Contexto Ativo
            </span>
            <label style={{ display: "flex", "align-items": "center", gap: "10px", "font-size": "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={currentConv().settings.memory}
                onChange={(e) => updateSetting("memory", e.currentTarget.checked)}
                style={{ "accent-color": "var(--teal, #1BC5BD)" }}
              />
              Sincron Brain (Memória MCP)
            </label>
            <label style={{ display: "flex", "align-items": "center", gap: "10px", "font-size": "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={currentConv().settings.vault}
                onChange={(e) => updateSetting("vault", e.currentTarget.checked)}
                style={{ "accent-color": "var(--teal, #1BC5BD)" }}
              />
              Vault knowledge/ (132 pág)
            </label>
            <label style={{ display: "flex", "align-items": "center", gap: "10px", "font-size": "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={currentConv().settings.tasks}
                onChange={(e) => updateSetting("tasks", e.currentTarget.checked)}
                style={{ "accent-color": "var(--teal, #1BC5BD)" }}
              />
              Tasks operacionais em andamento
            </label>
          </div>
        </aside>
      </Show>
    </div>
  );
}
