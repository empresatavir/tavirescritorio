import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import {
  agents,
  syncAgents,
  activeChatAgentId,
  setActiveChatAgentId,
  type RosterAgent,
  showToast,
} from "../../state/store";
import { api } from "../../shared/api/client";
import { TvIcon } from "../../shared/components/TvIcon";
import { Pensando } from "./Pensando";

interface ChatImage {
  name: string;
  url: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  meta?: string;
  images?: ChatImage[];
  actions?: Array<{ tipo: string; rotulo: string; texto?: string; titulo?: string; demand_code?: string }>;
}

interface PendingImage {
  id: string;
  name: string;
  dataUrl: string;
}

interface ChatConversation {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  settings: {
    model: string;
    effort: string;
    provider?: string;
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

type EffortOption = { id: string; label: string };
type ModelOption = { id: string; label: string; efforts: EffortOption[] };
type OfficeEngine = { id: string; label: string; models: ModelOption[] };
type OfficeAi = {
  provider: string;
  provider_label: string;
  model: string;
  effort: string;
  engine_enabled: boolean;
  engines: OfficeEngine[];
};

function preferredEffort(options: EffortOption[], current: string): string {
  if (options.some((item) => item.id === current)) return current;
  return (
    options.find((item) => item.id === "balanced")?.id ||
    options.find((item) => item.id === "xhigh")?.id ||
    options[0]?.id ||
    "balanced"
  );
}

const formatAt = (iso?: string | null): string => {
  if (!iso || Number.isNaN(Date.parse(iso))) {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export function ChatView() {
  const [conversations, setConversations] = createSignal<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = createSignal<string>("cv-1");
  const [searchHistory, setSearchHistory] = createSignal<string>("");
  const [pickOpen, setPickOpen] = createSignal<boolean>(false);
  const [rosterOpen, setRosterOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal<boolean>(false);
  const [inputMessage, setInputMessage] = createSignal<string>("");
  const [isTyping, setIsTyping] = createSignal<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(null);
  const [pendingImages, setPendingImages] = createSignal<PendingImage[]>([]);
  let imageInput: HTMLInputElement | undefined;

  const addImageFiles = async (list: FileList | File[] | null) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const room = 4 - pendingImages().length;
    if (room <= 0) {
      showToast("Dá para anexar até 4 imagens.", "Chat", "info");
      return;
    }
    const next: PendingImage[] = [];
    for (const file of incoming.slice(0, room)) {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        showToast("Use PNG, JPEG, WEBP ou GIF.", "Chat", "info");
        continue;
      }
      if (file.size > 4 * 1024 * 1024) {
        showToast(`${file.name} passa de 4 MB.`, "Chat", "error");
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ id: `${Date.now()}-${next.length}`, name: file.name, dataUrl });
    }
    if (incoming.length > room) showToast("Dá para anexar até 4 imagens.", "Chat", "info");
    if (next.length) setPendingImages((prev) => [...prev, ...next]);
  };
  const [office, setOffice] = createSignal<OfficeAi | null>(null);

  const officeEngine = createMemo(() => {
    const data = office();
    if (!data) return undefined;
    return data.engines.find((item) => item.id === data.provider) || data.engines[0];
  });

  const fitSettings = (raw: Record<string, any> | null | undefined): ChatConversation["settings"] => {
    const data = office();
    const engine = officeEngine();
    const base = {
      model: raw?.model || data?.model || "auto-smart",
      effort: raw?.effort || data?.effort || "balanced",
      provider: engine?.id || data?.provider,
      time: raw?.time || "2 min",
      tokens: raw?.tokens || "1024",
      insp: typeof raw?.insp === "number" ? raw.insp : 30,
      memory: typeof raw?.memory === "boolean" ? raw.memory : true,
      vault: typeof raw?.vault === "boolean" ? raw.vault : true,
      tasks: typeof raw?.tasks === "boolean" ? raw.tasks : true,
    };
    const model = engine?.models.find((item) => item.id === base.model) || engine?.models.find((item) => item.id === data?.model) || engine?.models[0];
    if (!model) return base;
    return {
      ...base,
      model: model.id,
      effort: preferredEffort(model.efforts, String(base.effort)),
    };
  };

  const modelLabel = (modelId: string) =>
    officeEngine()?.models.find((item) => item.id === modelId)?.label || modelId;

  const effortLabel = (modelId: string, effortId: string) =>
    officeEngine()?.models.find((item) => item.id === modelId)?.efforts.find((item) => item.id === effortId)?.label || effortId;

  // Sync conversations from backend SQLite
  const loadConversationMessages = async (convId: string) => {
    try {
      const detail = await api.getChatConversation(convId);
      if (detail && detail.messages) {
        const msgs: ChatMessage[] = detail.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          text: m.text,
          at: formatAt(m.created_at),
          meta: m.meta || undefined,
          images: m.images || undefined,
          actions: m.actions || undefined,
        }));
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, messages: msgs } : c))
        );
      }
    } catch (err) {
      console.warn("Could not load messages for conversation:", convId, err);
    }
  };

  const syncConversations = async () => {
    try {
      await syncAgents();
      const list = await api.listChatConversations();
      if (list && list.length > 0) {
        const mapped: ChatConversation[] = list.map((c) => {
          const s = c.settings || {};
          return {
            id: c.id,
            agentId: c.agent_id,
            title: c.title,
            updatedAt: formatAt(c.updated_at),
            messages: [],
            settings: fitSettings(s),
          };
        });
        setConversations(mapped);

        // Check if an agent was requested via store
        const targetAgent = activeChatAgentId();
        if (targetAgent) {
          const existing = mapped.find((x) => x.agentId === targetAgent);
          if (existing) {
            setSelectedConvId(existing.id);
            await loadConversationMessages(existing.id);
          } else {
            const ag = agents().find((a) => a.id === targetAgent) || agents()[0];
            await createConversationForAgent(ag);
          }
          setActiveChatAgentId(null);
        } else {
          const initialId = mapped[0].id;
          setSelectedConvId(initialId);
          await loadConversationMessages(initialId);
        }
      } else {
        const targetAgent = activeChatAgentId();
        if (targetAgent) {
          const ag = agents().find((item) => item.id === targetAgent);
          if (ag) await createConversationForAgent(ag);
          setActiveChatAgentId(null);
        } else {
          await loadConversationMessages(selectedConvId());
        }
      }
    } catch (err) {
      console.warn("Could not sync conversations from API:", err);
    }
  };

  onMount(() => {
    void (async () => {
      try {
        setOffice(await api.getOfficeAi());
      } catch (err) {
        console.warn("Não foi possível ler o motor de Integrações:", err);
      }
      await syncConversations();
    })();
  });

  const createConversationForAgent = async (ag: RosterAgent) => {
    try {
      const data = office();
      const defaultSettings = fitSettings({
        model: data?.model,
        effort: data?.effort,
        provider: data?.provider,
        time: "2 min",
        tokens: "1024",
        insp: 30,
        memory: true,
        vault: true,
        tasks: true,
      });
      const created = await api.createChatConversation(ag.id, `Conversa com ${ag.name}`, defaultSettings);
      const newConvItem: ChatConversation = {
        id: created.id,
        agentId: created.agent_id,
        title: created.title,
        updatedAt: "agora",
        settings: fitSettings((created.settings as ChatConversation["settings"]) || defaultSettings),
        messages: [],
      };
      setConversations((prev) => [newConvItem, ...prev]);
      setSelectedConvId(created.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      showToast("Erro ao criar conversa no banco", "Chat", "error");
    }
  };

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

  const handleSelectConv = async (id: string) => {
    setSelectedConvId(id);
    setPendingDeleteId(null);
    setPickOpen(false);
    await loadConversationMessages(id);
  };

  const removeConversation = async (id: string) => {
    const title = conversations().find((item) => item.id === id)?.title || "Conversa";
    try {
      await api.deleteChatConversation(id);
      const rest = conversations().filter((item) => item.id !== id);
      setConversations(rest);
      setPendingDeleteId(null);
      if (selectedConvId() === id) {
        const next = rest[0];
        if (next) {
          setSelectedConvId(next.id);
          await loadConversationMessages(next.id);
        } else {
          setSelectedConvId("");
        }
      }
      showToast(`${title} foi apagada.`, "Chat", "info");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      showToast("Não foi possível apagar a conversa.", "Chat", "error");
    }
  };

  const handleNewChat = () => {
    setRosterOpen(true);
  };

  const handleSelectAgent = async (ag: RosterAgent) => {
    const conv = currentConv();
    if (!conv) return;
    const data = office();
    const model = data?.model || conv.settings.model;
    const provider = data?.provider || conv.settings.provider;
    const effort = data?.effort || conv.settings.effort;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conv.id) {
          return {
            ...c,
            agentId: ag.id,
            settings: { ...c.settings, model, provider, effort },
          };
        }
        return c;
      })
    );
    setPickOpen(false);

    try {
      await api.updateChatSettings(conv.id, {
        ...conv.settings,
        model,
        provider,
        effort,
      });
    } catch (err) {
      console.warn("Could not update agent on conversation:", err);
    }
  };

  const handleSendMessage = async () => {
    const text = inputMessage().trim();
    const images = pendingImages();
    if ((!text && images.length === 0) || isTyping()) return;

    const conv = currentConv();
    if (!conv) return;
    const convId = conv.id;

    const tempUserMsgId = `temp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: "user",
      text,
      at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      images: images.map((item) => ({ name: item.name, url: item.dataUrl })),
    };

    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const isFirst = c.messages.length === 0;
          return {
            ...c,
            title: isFirst ? text.slice(0, 36) || "Imagem" : c.title,
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    setInputMessage("");
    setPendingImages([]);
    setIsTyping(true);

    try {
      const res = await api.sendChatMessage(
        convId,
        text,
        images.map((item) => ({ name: item.name, data_url: item.dataUrl })),
      );
      if (res && res.assistant_message) {
        const replyMsg: ChatMessage = {
          id: res.assistant_message.id,
          role: "assistant",
          text: res.assistant_message.text,
          at: formatAt(res.assistant_message.created_at),
          meta: res.assistant_message.meta || undefined,
          actions: res.assistant_message.actions || undefined,
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const updatedMsgs = c.messages.map((m) =>
                m.id === tempUserMsgId
                  ? {
                      ...m,
                      id: res.user_message.id,
                      at: formatAt(res.user_message.created_at),
                      images: res.user_message.images || m.images,
                    }
                  : m
              );
              return {
                ...c,
                messages: [...updatedMsgs, replyMsg],
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error("Failed to send chat message to API:", err);
      // Fallback local response if backend failed or offline
      const ag = currentAgent();
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        role: "assistant",
        text: `Entendido. Registrei a solicitação no contexto de ${ag.role} (${ag.sector}). Vou processar a resposta mantendo os critérios do checklist e reportar os próximos passos.`,
        at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        meta: `${office()?.provider_label || "Motor"} · ${modelLabel(conv.settings.model)}`,
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
    } finally {
      setIsTyping(false);
      const el = document.getElementById("chat-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  const applySettings = async (partial: Partial<ChatConversation["settings"]>) => {
    const conv = currentConv();
    if (!conv) return;

    const nextSettings = { ...conv.settings, ...partial, provider: office()?.provider || conv.settings.provider };
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conv.id) {
          return { ...c, settings: nextSettings };
        }
        return c;
      })
    );

    try {
      await api.updateChatSettings(conv.id, nextSettings);
    } catch (err) {
      console.warn("Could not persist conversation settings:", err);
    }
  };

  const updateSetting = async <K extends keyof ChatConversation["settings"]>(
    key: K,
    val: ChatConversation["settings"][K]
  ) => applySettings({ [key]: val });

  const chooseModel = (modelId: string) => {
    const spec = officeEngine()?.models.find((item) => item.id === modelId);
    const conv = currentConv();
    if (!conv || !spec) return;
    void applySettings({ model: modelId, effort: preferredEffort(spec.efforts, conv.settings.effort) });
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
          <Show when={rosterOpen()}>
            <div role="listbox" aria-label="Escolher agente" style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
              <For each={agents()}>
                {(ag) => (
                  <button
                    type="button"
                    onClick={() => {
                      setRosterOpen(false);
                      void createConversationForAgent(ag);
                    }}
                  >
                    {ag.name}
                  </button>
                )}
              </For>
            </div>
          </Show>
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
                <div
                  style={{
                    display: "grid",
                    "grid-template-columns": "minmax(0, 1fr) auto",
                    "align-items": "center",
                    gap: "4px",
                    padding: "4px",
                    "border-radius": "8px",
                    background: isSelected() ? "var(--surface-2, #17223a)" : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectConv(cv.id)}
                    style={{
                      "min-width": "0",
                      "text-align": "left",
                      display: "grid",
                      "grid-template-columns": "28px minmax(0, 1fr)",
                      gap: "10px",
                      "align-items": "center",
                      padding: "4px",
                      border: "none",
                      "border-radius": "8px",
                      background: "transparent",
                      color: "var(--text-primary, #F4F6F2)",
                      cursor: "pointer",
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
                        {pendingDeleteId() === cv.id ? "Apagar esta conversa?" : `${ag?.name || "Agente"} · ${cv.updatedAt}`}
                      </span>
                    </span>
                  </button>
                  <Show
                    when={pendingDeleteId() === cv.id}
                    fallback={
                      <button
                        type="button"
                        aria-label={`Apagar ${cv.title}`}
                        title="Apagar conversa"
                        onClick={() => setPendingDeleteId(cv.id)}
                        style={{
                          height: "28px",
                          padding: "0 8px",
                          "border-radius": "999px",
                          border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                          background: "transparent",
                          color: "var(--text-muted, #aeb7c4)",
                          cursor: "pointer",
                          "font-size": "11px",
                        }}
                      >
                        Apagar
                      </button>
                    }
                  >
                    <span style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => void removeConversation(cv.id)}
                        style={{
                          height: "28px",
                          padding: "0 8px",
                          "border-radius": "999px",
                          border: "none",
                          background: "var(--lime, #B7F34A)",
                          color: "var(--ink, #0B1220)",
                          cursor: "pointer",
                          "font-size": "11px",
                          "font-weight": "600",
                        }}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        style={{
                          height: "28px",
                          padding: "0 8px",
                          "border-radius": "999px",
                          border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                          background: "transparent",
                          color: "var(--text-primary, #F4F6F2)",
                          cursor: "pointer",
                          "font-size": "11px",
                        }}
                      >
                        Não
                      </button>
                    </span>
                  </Show>
                </div>
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
        <Show
          when={currentConv()}
          fallback={
            <div style={{ flex: "1", display: "flex", "align-items": "center", "justify-content": "center", padding: "24px", color: "var(--text-muted, #aeb7c4)" }}>
              Nenhuma conversa. Use Nova conversa para começar.
            </div>
          }
        >
        <>
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
            {office()?.provider_label || "Motor"} · {modelLabel(currentConv().settings.model)}
          </span>

          <Show when={currentConv().settings.model !== "auto-smart"}>
            <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "white-space": "nowrap" }}>
              {effortLabel(currentConv().settings.model, currentConv().settings.effort)}
            </span>
          </Show>

          <Show
            when={pendingDeleteId() === currentConv().id}
            fallback={
              <button
                type="button"
                onClick={() => setPendingDeleteId(currentConv().id)}
                style={{
                  height: "32px",
                  padding: "0 12px",
                  "border-radius": "999px",
                  border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                  background: "transparent",
                  color: "var(--text-primary, #F4F6F2)",
                  cursor: "pointer",
                  "font-size": "12px",
                  "white-space": "nowrap",
                }}
              >
                Apagar
              </button>
            }
          >
            <button
              type="button"
              onClick={() => void removeConversation(currentConv().id)}
              style={{
                height: "32px",
                padding: "0 12px",
                "border-radius": "999px",
                border: "none",
                background: "var(--lime, #B7F34A)",
                color: "var(--ink, #0B1220)",
                cursor: "pointer",
                "font-size": "12px",
                "font-weight": "600",
                "white-space": "nowrap",
              }}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={{
                height: "32px",
                padding: "0 12px",
                "border-radius": "999px",
                border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                background: "transparent",
                color: "var(--text-primary, #F4F6F2)",
                cursor: "pointer",
                "font-size": "12px",
                "white-space": "nowrap",
              }}
            >
              Manter
            </button>
          </Show>

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
                    {office()?.provider_label || "Motor"} · {modelLabel(office()?.model || "")}
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
                  {currentAgent().role} no setor {currentAgent().sector}. A conversa usa {office()?.provider_label || "o motor"} · {modelLabel(currentConv().settings.model)}, o motor ligado em Integrações.
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
            <Show when={currentConv().messages.length === 0}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "8px", color: "var(--text-secondary)" }}>
                <p style={{ margin: 0, "font-size": "14px" }}>Conversa vazia. O ofício entra no contexto.</p>
                <Show when={currentAgent()?.soulText}>
                  <p style={{ margin: 0, "font-size": "13px", "white-space": "pre-wrap" }}>{currentAgent()?.soulText}</p>
                </Show>
              </div>
            </Show>
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
                          display: "flex",
                          "flex-direction": "column",
                          gap: "8px",
                        }}
                      >
                        <Show when={(m.images?.length || 0) > 0}>
                          <span style={{ display: "flex", "flex-wrap": "wrap", gap: "6px" }}>
                            <For each={m.images || []}>
                              {(image) => (
                                <img
                                  src={image.url}
                                  alt={image.name}
                                  style={{
                                    width: "auto",
                                    height: "auto",
                                    "max-width": "220px",
                                    "max-height": "180px",
                                    "min-width": "72px",
                                    "min-height": "72px",
                                    "object-fit": "contain",
                                    "border-radius": "8px",
                                    display: "block",
                                    background: "rgba(11,18,32,.35)",
                                  }}
                                />
                              )}
                            </For>
                          </span>
                        </Show>
                        <Show when={m.text}>{m.text}</Show>
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
                      <Show when={m.actions?.length}>
                        <div style={{ display: "flex", "flex-wrap": "wrap", gap: "8px", "margin-top": "8px" }}>
                          <For each={m.actions || []}>
                            {(action) => (
                              <button
                                type="button"
                                onClick={() =>
                                  void api.getOfficeSettings().then((settings) => {
                                    const projectId = settings.focused_project_id;
                                    if (!projectId) return;
                                    return api.runDemandAction(projectId, action);
                                  })
                                }
                              >
                                {action.rotulo}
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
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
                <Pensando nome={currentAgent().name} />
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
            <Show when={pendingImages().length > 0}>
              <div style={{ display: "flex", "flex-wrap": "wrap", gap: "8px" }}>
                <For each={pendingImages()}>
                  {(image) => (
                    <span style={{ position: "relative", width: "72px", height: "72px" }}>
                      <img src={image.dataUrl} alt={image.name} style={{ width: "72px", height: "72px", "object-fit": "cover", "border-radius": "8px", display: "block" }} />
                      <button
                        type="button"
                        aria-label={`Remover ${image.name}`}
                        onClick={() => setPendingImages((prev) => prev.filter((item) => item.id !== image.id))}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "18px",
                          height: "18px",
                          "border-radius": "999px",
                          border: "none",
                          background: "var(--ink, #0B1220)",
                          color: "var(--text-primary, #F4F6F2)",
                          cursor: "pointer",
                          "font-size": "11px",
                          "line-height": "18px",
                        }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </For>
              </div>
            </Show>
            <textarea
              value={inputMessage()}
              onInput={(e) => setInputMessage(e.currentTarget.value)}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
                if (!files.length) return;
                event.preventDefault();
                void addImageFiles(files);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void addImageFiles(event.dataTransfer?.files || null);
              }}
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
              <input
                ref={imageInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                aria-hidden="true"
                onChange={(event) => {
                  void addImageFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                aria-label="Anexar imagem"
                onClick={() => imageInput?.click()}
                style={{
                  height: "34px",
                  padding: "0 12px",
                  "border-radius": "999px",
                  border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                  background: "transparent",
                  color: "var(--text-primary, #F4F6F2)",
                  cursor: "pointer",
                  "font-size": "12px",
                  "white-space": "nowrap",
                }}
              >
                Imagem
              </button>
              <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", flex: "1", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                Shift + Enter para pular linha · Enter para enviar
              </span>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!inputMessage().trim() && pendingImages().length === 0) || isTyping()}
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
                  opacity: (!inputMessage().trim() && pendingImages().length === 0) || isTyping() ? 0.5 : 1,
                }}
              >
                <TvIcon name="send" style={{ width: "14px", height: "14px" }} />
                Enviar
              </button>
            </div>
          </div>
        </div>
        </>
        </Show>
      </section>

      {/* Coluna 3: Drawer de Configurações */}
      <Show when={settingsOpen() && currentConv()}>
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
                const data = office();
                void applySettings({
                  model: data?.model || currentConv().settings.model,
                  effort: data?.effort || currentConv().settings.effort,
                  provider: data?.provider,
                  time: "2 min",
                  tokens: "1024",
                  insp: 30,
                });
                showToast("Configurações restauradas", "Padrão do motor", "info");
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

          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Motor
            </span>
            <span style={{ "font-size": "13px", color: "var(--text-primary, #F4F6F2)" }}>
              {office()?.engine_enabled ? office()?.provider_label : "Desligado em Integrações"}
            </span>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
              Modelo
            </span>
            <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
              <For each={officeEngine()?.models || []}>
                {(item) => (
                  <button
                    type="button"
                    onClick={() => chooseModel(item.id)}
                    style={{
                      padding: "8px 10px",
                      "border-radius": "8px",
                      border: currentConv().settings.model === item.id ? "1px solid var(--teal, #1BC5BD)" : "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                      background: currentConv().settings.model === item.id ? "rgba(27,197,189,.08)" : "transparent",
                      color: "var(--text-primary, #F4F6F2)",
                      "text-align": "left",
                      cursor: "pointer",
                      "font-size": "13px",
                    }}
                  >
                    {item.label}
                  </button>
                )}
              </For>
              <Show when={(officeEngine()?.models.length || 0) === 0}>
                <span style={{ "font-size": "13px", color: "var(--text-muted, #aeb7c4)" }}>
                  Ligue o motor em Integrações para escolher o modelo.
                </span>
              </Show>
            </div>
          </div>

          <Show when={currentConv().settings.model !== "auto-smart" && (officeEngine()?.models.find((item) => item.id === currentConv().settings.model)?.efforts.length || 0) > 0}>
            <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
                Esforço
              </span>
              <div style={{ display: "flex", gap: "4px", "flex-wrap": "wrap" }}>
                <For each={officeEngine()?.models.find((item) => item.id === currentConv().settings.model)?.efforts || []}>
                  {(item) => (
                    <button
                      type="button"
                      onClick={() => updateSetting("effort", item.id)}
                      style={{
                        flex: "1",
                        height: "28px",
                        "border-radius": "999px",
                        border: "none",
                        cursor: "pointer",
                        "font-size": "12px",
                        background: currentConv().settings.effort === item.id ? "var(--teal, #1BC5BD)" : "var(--surface-0, #0B1220)",
                        color: currentConv().settings.effort === item.id ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
                        "font-weight": "500",
                      }}
                    >
                      {item.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
          <Show when={currentConv().settings.model === "auto-smart"}>
            <span style={{ "font-size": "12px", "line-height": "1.45", color: "var(--text-muted, #aeb7c4)" }}>
              O modelo é Auto. Esta instalação não aplica Cost, Balance ou Intelligence.
            </span>
          </Show>

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
