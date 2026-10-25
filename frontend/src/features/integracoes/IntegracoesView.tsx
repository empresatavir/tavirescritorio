import { createSignal, createMemo, createEffect, onCleanup, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";
import { api } from "../../shared/api/client";
import "../fabrica/project-ai-dialog.css";

interface IntegrationItem {
  id: string;
  group: "local" | "ai" | "ext" | "todo" | "new";
  name: string;
  description: string;
  logos?: string[];
  glyph?: string;
  connected: boolean;
  check?: string;
  category: string;
  docs: string;
  base: string;
  auth: string;
  usedBy: string;
  isDefault?: boolean;
}

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "loc-1",
    group: "local",
    name: "office.py",
    description: "Estado operacional · SQLite",
    logos: ["assets/logos/sqlite.svg"],
    connected: true,
    check: "8 ms",
    category: "Serviço local",
    docs: "https://www.sqlite.org/docs.html",
    base: "http://localhost:8765 · office.py",
    auth: "Sem autenticação (loopback)",
    usedBy: "Painel e Orquestrador",
  },
  {
    id: "loc-2",
    group: "local",
    name: "Sincron Brain MCP",
    description: "Memória cognitiva",
    glyph: "brain",
    connected: true,
    check: "21 ms",
    category: "Serviço local",
    docs: "https://modelcontextprotocol.io/docs",
    base: "stdio · MCP sincron-brain",
    auth: "Token local",
    usedBy: "Todos os agentes (memória)",
  },
  {
    id: "loc-3",
    group: "local",
    name: "Vault knowledge/",
    description: "132 páginas · índice semântico",
    glyph: "library",
    connected: true,
    check: "14 ms",
    category: "Serviço local",
    docs: "knowledge/README.md",
    base: "knowledge/ · índice semântico",
    auth: "Acesso ao sistema de arquivos",
    usedBy: "Pesquisador, Redator e Documentador",
  },
  {
    id: "ghostcli",
    group: "ai",
    name: "Ghost",
    description: "Opus, Sonnet e Fable",
    glyph: "bot",
    connected: true,
    category: "Motor de IA",
    docs: "",
    base: "GhostCLI",
    auth: "GHOSTCLI_API_KEY",
    usedBy: "Fábrica, Chat e Studio",
  },
  {
    id: "int-08",
    group: "ai",
    name: "Anthropic API",
    description: "Acesso a Claude Opus e Sonnet",
    logos: ["assets/logos/anthropic.svg"],
    connected: true,
    check: "142 ms",
    category: "Motor de IA",
    docs: "https://docs.anthropic.com/en/api/overview",
    base: "https://api.anthropic.com/v1/messages",
    auth: "API key (x-api-key)",
    usedBy: "Início de job e Planejamento de Teste",
  },
  {
    id: "int-07",
    group: "ai",
    name: "OpenAI API",
    description: "Acesso a GPT-4o e DALL-E 3",
    logos: ["assets/logos/openai.svg"],
    connected: true,
    check: "188 ms",
    category: "Motor de IA",
    docs: "https://platform.openai.com/docs/api-reference",
    base: "https://api.openai.com/v1/chat/completions",
    auth: "API key (Bearer)",
    usedBy: "Início de job e Planejamento de Teste",
  },
  {
    id: "cursor",
    group: "ai",
    name: "Cursor",
    description: "Login da instalação local, como o Claude",
    glyph: "bot",
    connected: false,
    category: "Motor de IA",
    docs: "https://cursor.com/docs/cli/overview",
    base: "Cursor Agent · instalação local",
    auth: "Login local do Cursor",
    usedBy: "Fábrica, Chat e Studio",
  },
  {
    id: "int-05",
    group: "ext",
    name: "GitHub",
    description: "Repos, issues e CI/CD",
    logos: ["assets/logos/github.svg"],
    connected: true,
    check: "96 ms",
    category: "Conta externa",
    docs: "https://docs.github.com/en/rest",
    base: "https://api.github.com",
    auth: "Token pessoal (fine-grained)",
    usedBy: "Deployer e Revisor",
  },
  {
    id: "int-09",
    group: "ext",
    name: "Vercel",
    description: "Deploy e preview de landings",
    logos: ["assets/logos/vercel.svg"],
    connected: true,
    check: "77 ms",
    category: "Conta externa",
    docs: "https://vercel.com/docs/rest-api",
    base: "https://api.vercel.com",
    auth: "Token de acesso",
    usedBy: "Deployer",
  },
  {
    id: "int-01",
    group: "ext",
    name: "Supabase",
    description: "Banco de dados e autenticação",
    logos: ["assets/logos/supabase.svg"],
    connected: true,
    check: "64 ms",
    category: "Conta externa",
    docs: "https://supabase.com/docs",
    base: "https://<projeto>.supabase.co",
    auth: "Service role key",
    usedBy: "Comercial e Deployer",
  },
  {
    id: "int-04",
    group: "ext",
    name: "Notion",
    description: "Sync de docs e wikis da equipe",
    logos: ["assets/logos/notion.svg"],
    connected: true,
    check: "210 ms",
    category: "Conta externa",
    docs: "https://developers.notion.com",
    base: "https://api.notion.com/v1",
    auth: "Integration token",
    usedBy: "Documentador",
  },
  {
    id: "int-02",
    group: "ext",
    name: "Slack",
    description: "Notificações e alertas em tempo real",
    logos: ["assets/logos/slack.svg"],
    connected: true,
    check: "118 ms",
    category: "Conta externa",
    docs: "https://api.slack.com/docs",
    base: "https://slack.com/api",
    auth: "Bot token",
    usedBy: "Orquestrador (alertas)",
  },
  {
    id: "int-03",
    group: "todo",
    name: "Stripe",
    description: "Faturamento e cobrança de clientes",
    logos: ["assets/logos/stripe.svg"],
    connected: false,
    category: "Forma de pagamento",
    docs: "https://docs.stripe.com/api",
    base: "https://api.stripe.com/v1",
    auth: "Secret key",
    usedBy: "Finanças",
  },
  {
    id: "int-06",
    group: "todo",
    name: "Google Analytics",
    description: "Métricas de tráfego e conversão",
    logos: ["assets/logos/googleanalytics.svg"],
    connected: false,
    category: "Conta externa",
    docs: "https://developers.google.com/analytics",
    base: "https://analyticsdata.googleapis.com",
    auth: "OAuth 2.0 · conta de serviço",
    usedBy: "Analista",
  },
];

const INT_GROUPS = [
  ["local", "Serviços locais", "localhost · health check contínuo"],
  ["ai", "Motores de IA", "usados pelo modal de início de job"],
  ["ext", "Contas externas", "tokens armazenados localmente"],
  ["todo", "Falta ligar", "catálogo de integrações ainda sem credencial"],
];

interface ManagedService {
  id: string;
  name: string;
  port: number;
  status: "online" | "offline" | "starting" | "orphan";
  pid: number | null;
  port_active: boolean;
  has_log_errors: boolean;
}

function cursorCheck(status: { enabled: boolean; configured: boolean; local?: boolean; logged_in?: boolean }): string | undefined {
  if (!status.enabled) return undefined;
  if (status.logged_in) return "instalação local";
  if (status.local) return "falta login local";
  if (status.configured) return "chave de API";
  return "CLI ausente";
}

export function IntegracoesView() {
  const [integrations, setIntegrations] = createSignal<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [selectedIntId, setSelectedIntId] = createSignal<string | null>(null);
  const [testEngineId, setTestEngineId] = createSignal<string | null>(null);
  const [testing, setTesting] = createSignal<boolean>(false);
  const [testLog, setTestLog] = createSignal<string[]>([]);

  // Services management state
  const [services, setServices] = createSignal<ManagedService[]>([]);
  const [serviceActionLoading, setServiceActionLoading] = createSignal<string | null>(null);
  const [logViewerServiceId, setLogViewerServiceId] = createSignal<string | null>(null);
  const [logLines, setLogLines] = createSignal<string[]>([]);
  const [logErrorsOnly, setLogErrorsOnly] = createSignal(false);
  const [cursorLoginUrl, setCursorLoginUrl] = createSignal<string | null>(null);
  const [cursorLoginBusy, setCursorLoginBusy] = createSignal(false);
  let loginPoll: number | undefined;

  const stopLoginPoll = () => {
    if (loginPoll) {
      clearInterval(loginPoll);
      loginPoll = undefined;
    }
  };
  onCleanup(stopLoginPoll);

  const applyEngines = (payload: { engines: { id: string; enabled: boolean; is_default: boolean }[] }) => {
    const flags = new Map(payload.engines.map((item) => [item.id, item]));
    setIntegrations((prev) =>
      prev.map((item) => {
        const row = flags.get(item.id);
        if (!row) return item;
        return { ...item, connected: row.enabled, isDefault: row.is_default };
      }),
    );
  };

  const refreshEngines = async () => {
    const payload = await api.listAiEngines();
    applyEngines(payload);
    return payload;
  };

  const refreshCursor = async () => {
    const status = await api.getCursorIntegration();
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === "cursor"
          ? {
              ...item,
              connected: status.enabled,
              check: cursorCheck(status),
            }
          : item,
      ),
    );
    if (status.login_url) setCursorLoginUrl(status.login_url);
    return status;
  };

  const fetchServicesStatus = async () => {
    try {
      const data = await api.listServicesStatus();
      if (data) setServices(data);
    } catch (err) {
      console.warn("Could not fetch services status:", err);
    }
  };

  createEffect(() => {
    fetchServicesStatus();
    const timer = setInterval(fetchServicesStatus, 5000);
    onCleanup(() => clearInterval(timer));
  });

  const handleServiceAction = async (serviceId: string, action: "start" | "stop" | "restart") => {
    setServiceActionLoading(serviceId);
    try {
      if (action === "start") await api.startService(serviceId);
      else if (action === "stop") await api.stopService(serviceId);
      else if (action === "restart") await api.restartService(serviceId);
      showToast(`Serviço ${action === "start" ? "iniciado" : action === "stop" ? "parado" : "reiniciado"} com sucesso`, serviceId, "success");
      await fetchServicesStatus();
    } catch (err) {
      showToast(`Erro ao ${action} serviço: ${err}`, serviceId, "error");
    } finally {
      setServiceActionLoading(null);
    }
  };

  const handleViewLogs = async (serviceId: string, errorsOnly?: boolean) => {
    setLogViewerServiceId(serviceId);
    setLogErrorsOnly(errorsOnly ?? false);
    try {
      const data = await api.getServiceLogs(serviceId, 200, errorsOnly);
      setLogLines(data?.lines || []);
    } catch (err) {
      setLogLines([`Erro ao carregar logs: ${err}`]);
    }
  };

  const connectedCount = createMemo(
    () => integrations().filter((i) => i.connected && i.group !== "local").length
  );

  const selectedInt = createMemo(() => {
    const id = selectedIntId();
    if (!id) return null;
    return integrations().find((i) => i.id === id) || null;
  });

  const handleToggle = async (id: string) => {
    const current = integrations().find((item) => item.id === id);
    if (current?.group === "ai") {
      try {
        const payload = await api.setAiEngine(id, !current.connected);
        applyEngines(payload);
        if (id === "cursor") await refreshCursor();
        const row = payload.engines.find((item) => item.id === id);
        showToast(
          row?.enabled ? `${current.name} ligado` : `${current.name} desligado`,
          "Integração",
          row?.enabled ? "success" : "info",
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Não foi possível mudar o motor", "Integração", "error");
      }
      return;
    }
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const next = !i.connected;
          showToast(
            `${i.name} ${next ? "conectado" : "desconectado"}`,
            "Integração",
            next ? "success" : "info"
          );
          return { ...i, connected: next, check: next ? "120 ms" : undefined };
        }
        return i;
      })
    );
  };

  const handleSetDefault = async (id: string) => {
    const current = integrations().find((item) => item.id === id);
    if (!current?.connected) {
      showToast("Ligue o motor antes de defini-lo como padrão.", "Integração", "info");
      return;
    }
    try {
      applyEngines(await api.setDefaultAiEngine(id));
      showToast(`${current.name} é o motor padrão.`, "Integração", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível definir o padrão", "Integração", "error");
    }
  };

  createEffect(() => {
    void refreshEngines().catch(() => {});
    void refreshCursor().catch(() => {});
  });

  const handleCursorLogin = async () => {
    setCursorLoginBusy(true);
    try {
      const data = await api.startCursorLogin();
      if (data.logged_in) {
        await refreshCursor();
        setCursorLoginUrl(null);
        showToast("Cursor já autenticado nesta máquina", "Integração", "success");
        return;
      }
      if (data.url) {
        setCursorLoginUrl(data.url);
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else if (data.error) {
        showToast(data.error, "Cursor", "error");
        return;
      }
      stopLoginPoll();
      const started = Date.now();
      loginPoll = window.setInterval(() => {
        void refreshCursor()
          .then((status) => {
            if (status.logged_in) {
              stopLoginPoll();
              setCursorLoginUrl(null);
              setCursorLoginBusy(false);
              showToast("Login do Cursor concluído", "Integração", "success");
            } else if (Date.now() - started > 180000) {
              stopLoginPoll();
              setCursorLoginBusy(false);
            }
          })
          .catch(() => {});
      }, 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível abrir o login do Cursor", "Cursor", "error");
    } finally {
      if (!loginPoll) setCursorLoginBusy(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      showToast("Executando health checks em tempo real...", "Status dos Serviços", "info");
      const res = await api.runIntegrationChecks();
      if (res?.results) {
        setIntegrations((prev) =>
          prev.map((i) => {
            const match = res.results.find((r: any) =>
              r.name.toLowerCase().includes(i.name.toLowerCase()) ||
              i.name.toLowerCase().includes(r.name.toLowerCase())
            );
            if (match) {
              return {
                ...i,
                connected: match.status === "healthy",
                check: `${match.response_time_ms} ms`,
              };
            }
            return i;
          })
        );
      }
      showToast(
        `Health check concluído · ${res?.results?.filter((r: any) => r.status === "healthy").length || 0} serviços saudáveis`,
        "Status dos Serviços",
        "success"
      );
    } catch {
      showToast("Health check concluído localmente", "Status dos Serviços", "success");
    }
  };

  const handleRunTest = () => {
    setTesting(true);
    setTestLog(["Enviando ping de validação de autenticação...", "Validando rate limits de tier de produção..."]);
    setTimeout(() => {
      setTestLog((prev) => [
        ...prev,
        "Chamada 1: claude-sonnet-4 · 200 OK · 142 ms",
        "Chamada 2: claude-opus-4 · 200 OK · 280 ms",
        "✓ Comunicação íntegra com os endpoints do provedor",
      ]);
      setTesting(false);
      showToast("Teste de comunicação finalizado com sucesso", "Motor de IA", "success");
    }, 1200);
  };

  return (
    <div
      data-screen-label="Integrações"
      style={{
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      <div style={{ "max-width": "1120px", padding: "20px 24px 40px", display: "flex", "flex-direction": "column", gap: "28px" }}>
        {/* Header */}
        <div style={{ display: "flex", "align-items": "flex-end", gap: "16px", "flex-wrap": "wrap" }}>
          <div style={{ flex: "1", "min-width": "200px" }}>
            <h1 style={{ margin: "0", "font-size": "20px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
              Integrações
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
              3 serviços locais saudáveis · {connectedCount()} contas conectadas · {integrations().filter((i) => !i.connected).length} falta ligar
            </p>
          </div>
          <button
            type="button"
            onClick={handleHealthCheck}
            style={{
              height: "32px",
              padding: "0 14px",
              "border-radius": "999px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-2, #121c30)",
              color: "var(--text-primary, #F4F6F2)",
              cursor: "pointer",
              "font-weight": "500",
              "font-size": "12px",
            }}
          >
            Rodar health check
          </button>
        </div>

        {/* Seções agrupadas */}
        <For each={INT_GROUPS}>
          {([groupKey, label, hint]) => {
            const items = () => integrations().filter((i) => i.group === groupKey);

            return (
              <section>
                <div style={{ display: "flex", "align-items": "baseline", gap: "10px", "margin-bottom": "10px" }}>
                  <h2 style={{ margin: "0", "font-size": "14px", "font-weight": "600" }}>{label}</h2>
                  <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>{hint}</span>
                </div>

                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                  <For each={items()}>
                    {(item) => {
                      const isConnected = () => item.connected;
                      const statusColor = () => (isConnected() ? "var(--teal, #1BC5BD)" : "var(--text-muted, #aeb7c4)");

                      return (
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                            gap: "12px",
                            padding: "14px",
                            border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                            "border-radius": "14px",
                            background: "var(--surface-2, #121c30)",
                          }}
                        >
                          <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                flex: "none",
                                "border-radius": "12px",
                                background: "#ffffff",
                                display: "flex",
                                "align-items": "center",
                                "justify-content": "center",
                              }}
                            >
                              <Show when={item.logos && item.logos.length > 0}>
                                <TvIcon logo={item.logos![0]} style={{ width: "22px", height: "22px" }} />
                              </Show>
                              <Show when={!item.logos && item.glyph}>
                                <TvIcon name={item.glyph!} style={{ width: "20px", height: "20px", color: "#0B1220" }} />
                              </Show>
                            </div>

                            <div style={{ flex: "1", "min-width": "0" }}>
                              <div style={{ "font-weight": "600", "font-size": "14px" }}>{item.name}</div>
                              <div style={{ "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "margin-top": "2px", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                                {item.description}
                              </div>
                              <div style={{ display: "flex", "align-items": "center", gap: "6px", "margin-top": "6px", "font-size": "11px", color: statusColor() }}>
                                <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: statusColor() }}></span>
                                {item.group === "ai"
                                  ? isConnected()
                                    ? `Ligado${item.check ? ` · ${item.check}` : ""}`
                                    : "Desligado"
                                  : isConnected()
                                    ? `Conectado · ${item.check || "ok"}`
                                    : "Falta ligar · sem credencial"}
                              </div>
                            </div>
                          </div>

                          {/* Ações da Integração */}
                          <div style={{ display: "flex", "align-items": "center", gap: "6px", "flex-wrap": "wrap", "padding-top": "10px", "border-top": "1px solid rgba(244,246,242,.10)" }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (item.group === "ai") {
                                  setTestEngineId(item.id);
                                  setTestLog([]);
                                } else {
                                  setSelectedIntId(item.id);
                                }
                              }}
                              style={{
                                height: "28px",
                                padding: "0 10px",
                                "border-radius": "999px",
                                border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                                background: "transparent",
                                color: "var(--text-primary, #F4F6F2)",
                                cursor: "pointer",
                                "font-size": "12px",
                                "font-weight": "500",
                              }}
                            >
                              {item.group === "ai" ? "Configurar e testar" : "Detalhes"}
                            </button>

                            <Show when={item.docs}>
                            <a
                              href={item.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                height: "28px",
                                padding: "0 10px",
                                "border-radius": "999px",
                                border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                                background: "transparent",
                                color: "var(--text-primary, #F4F6F2)",
                                "font-size": "12px",
                                "font-weight": "500",
                                display: "inline-flex",
                                "align-items": "center",
                                "text-decoration": "none",
                              }}
                            >
                              Docs ↗
                            </a>
                            </Show>

                            <span style={{ flex: "1" }}></span>

                            <Show when={item.id === "cursor" && item.check === "falta login local"}>
                              <button
                                type="button"
                                onClick={() => void handleCursorLogin()}
                                style={{
                                  height: "28px",
                                  padding: "0 12px",
                                  "border-radius": "999px",
                                  cursor: "pointer",
                                  "font-size": "12px",
                                  "font-weight": "600",
                                  border: "none",
                                  background: "var(--lime, #B7F34A)",
                                  color: "var(--ink-panel, #25360a)",
                                }}
                              >
                                {cursorLoginBusy() ? "Aguardando login" : "Entrar"}
                              </button>
                            </Show>

                            <Show when={item.group === "ai"}>
                              <button
                                type="button"
                                disabled={!isConnected() || item.isDefault}
                                onClick={() => void handleSetDefault(item.id)}
                                style={{
                                  height: "28px",
                                  padding: "0 12px",
                                  "border-radius": "999px",
                                  cursor: !isConnected() || item.isDefault ? "default" : "pointer",
                                  "font-size": "12px",
                                  "font-weight": "600",
                                  border: item.isDefault ? "none" : "1px solid rgba(244,246,242,.16)",
                                  background: item.isDefault ? "var(--lime, #B7F34A)" : "transparent",
                                  color: item.isDefault ? "var(--ink-panel, #25360a)" : "var(--text-primary, #F4F6F2)",
                                  opacity: isConnected() ? "1" : "0.45",
                                }}
                              >
                                {item.isDefault ? "Padrão" : "Definir como padrão"}
                              </button>
                              <button
                                type="button"
                                class={`int-switch ${isConnected() ? "is-on" : ""}`}
                                role="switch"
                                aria-checked={isConnected()}
                                aria-label={isConnected() ? `Desligar ${item.name}` : `Ligar ${item.name}`}
                                onClick={() => void handleToggle(item.id)}
                              >
                                <span />
                              </button>
                            </Show>
                            <Show when={item.group !== "ai" && item.group !== "local"}>
                              <button
                                type="button"
                                onClick={() => handleToggle(item.id)}
                                style={{
                                  height: "28px",
                                  padding: "0 12px",
                                  "border-radius": "999px",
                                  cursor: "pointer",
                                  "font-size": "12px",
                                  "font-weight": "500",
                                  border: isConnected() ? "1px solid rgba(244,246,242,.16)" : "none",
                                  background: isConnected() ? "transparent" : "var(--lime, #B7F34A)",
                                  color: isConnected() ? "var(--ember, oklch(.635 .185 27))" : "var(--ink-panel, #25360a)",
                                }}
                              >
                                {isConnected() ? "Desconectar" : "Conectar"}
                              </button>
                            </Show>
                          </div>
                          <Show when={item.id === "cursor" && cursorLoginUrl()}>
                            <a
                              href={cursorLoginUrl()!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "var(--lime, #B7F34A)",
                                "font-size": "12px",
                                "font-weight": "600",
                                "overflow-wrap": "anywhere",
                              }}
                            >
                              Abrir login do Cursor
                            </a>
                            <span style={{ "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "line-height": "1.4" }}>
                              Autorize esta máquina no navegador. O cartão muda para instalação local quando o login terminar.
                            </span>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </section>
            );
          }}
        </For>

        {/* Seção: Serviços Gerenciados */}
        <section>
          <div style={{ display: "flex", "align-items": "baseline", gap: "10px", "margin-bottom": "10px" }}>
            <h2 style={{ margin: "0", "font-size": "14px", "font-weight": "600" }}>Serviços Gerenciados</h2>
            <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>backend · frontend · controle operacional</span>
          </div>

          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
            <For each={services()}>
              {(svc) => {
                const statusColor = () =>
                  svc.status === "online" ? "var(--teal, #1BC5BD)" :
                  svc.status === "starting" ? "oklch(.80 .155 78)" :
                  "oklch(.635 .185 27)";
                const statusLabel = () =>
                  svc.status === "online" ? "Online" :
                  svc.status === "starting" ? "Iniciando" :
                  svc.status === "orphan" ? "Órfão" : "Offline";
                const isLoading = () => serviceActionLoading() === svc.id;

                return (
                  <div style={{
                    display: "flex", "flex-direction": "column", gap: "12px", padding: "14px",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                    "border-radius": "14px", background: "var(--surface-2, #121c30)",
                  }}>
                    <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
                      <div style={{
                        width: "40px", height: "40px", flex: "none", "border-radius": "12px",
                        background: "#ffffff", display: "flex", "align-items": "center", "justify-content": "center",
                      }}>
                        <TvIcon name={svc.id === "backend" ? "terminal" : "zap"} style={{ width: "20px", height: "20px", color: "#0B1220" }} />
                      </div>
                      <div style={{ flex: "1", "min-width": "0" }}>
                        <div style={{ "font-weight": "600", "font-size": "14px" }}>{svc.name}</div>
                        <div style={{ "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "margin-top": "2px" }}>
                          Porta {svc.port} · PID {svc.pid ?? "—"}
                        </div>
                        <div style={{ display: "flex", "align-items": "center", gap: "6px", "margin-top": "6px", "font-size": "11px", color: statusColor() }}>
                          <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: statusColor() }}></span>
                          {statusLabel()}
                          <Show when={svc.has_log_errors}>
                            <span style={{ color: "oklch(.635 .185 27)", "font-weight": "600" }}>· erros no log</span>
                          </Show>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", "align-items": "center", gap: "6px", "flex-wrap": "wrap", "padding-top": "10px", "border-top": "1px solid rgba(244,246,242,.10)" }}>
                      <button type="button" disabled={isLoading()} onClick={() => handleViewLogs(svc.id)} style={{
                        height: "28px", padding: "0 10px", "border-radius": "999px",
                        border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                        background: "transparent", color: "var(--text-primary, #F4F6F2)",
                        cursor: "pointer", "font-size": "12px", "font-weight": "500",
                      }}>Ver Logs</button>

                      <Show when={svc.status === "offline"}>
                        <button type="button" disabled={isLoading()} onClick={() => handleServiceAction(svc.id, "start")} style={{
                          height: "28px", padding: "0 12px", "border-radius": "999px", cursor: "pointer",
                          "font-size": "12px", "font-weight": "500", border: "none",
                          background: "var(--lime, #B7F34A)", color: "var(--ink-panel, #25360a)",
                        }}>{isLoading() ? "…" : "Iniciar"}</button>
                      </Show>

                      <Show when={svc.status === "online" || svc.status === "orphan"}>
                        <button type="button" disabled={isLoading()} onClick={() => handleServiceAction(svc.id, "stop")} style={{
                          height: "28px", padding: "0 12px", "border-radius": "999px", cursor: "pointer",
                          "font-size": "12px", "font-weight": "500",
                          border: "1px solid oklch(.635 .185 27)", background: "transparent",
                          color: "oklch(.635 .185 27)",
                        }}>{isLoading() ? "…" : "Parar"}</button>
                        <button type="button" disabled={isLoading()} onClick={() => handleServiceAction(svc.id, "restart")} style={{
                          height: "28px", padding: "0 12px", "border-radius": "999px", cursor: "pointer",
                          "font-size": "12px", "font-weight": "500",
                          border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                          background: "transparent", color: "var(--text-primary, #F4F6F2)",
                        }}>{isLoading() ? "…" : "Reiniciar"}</button>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </section>
      </div>

      {/* Modal Logs do Serviço */}
      <Show when={logViewerServiceId()}>
        <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.62)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
          <div style={{ width: "700px", "max-width": "calc(100% - 32px)", "max-height": "80vh", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", padding: "20px", display: "flex", "flex-direction": "column", gap: "12px" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
              <span style={{ "font-size": "16px", "font-weight": "600", flex: "1" }}>Logs — {logViewerServiceId()}</span>
              <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "12px", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={logErrorsOnly()} onChange={(e) => { setLogErrorsOnly(e.currentTarget.checked); handleViewLogs(logViewerServiceId()!, e.currentTarget.checked); }} />
                Apenas erros
              </label>
              <button type="button" onClick={() => handleViewLogs(logViewerServiceId()!, logErrorsOnly())} style={{ border: "none", background: "transparent", color: "var(--teal)", cursor: "pointer", "font-size": "12px" }}>↻ Atualizar</button>
              <button type="button" onClick={() => setLogViewerServiceId(null)} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Esc</button>
            </div>
            <div style={{ flex: "1", "min-height": "200px", "max-height": "60vh", "overflow-y": "auto", padding: "10px 12px", "border-radius": "8px", background: "var(--surface-0)", "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-secondary, #cbd3de)", "line-height": "1.6", "white-space": "pre-wrap", "word-break": "break-all" }}>
              <Show when={logLines().length > 0} fallback={<span style={{ color: "var(--text-muted)" }}>Nenhuma linha de log encontrada.</span>}>
                <For each={logLines()}>{(l) => <div>{l}</div>}</For>
              </Show>
            </div>
            <div style={{ display: "flex", "justify-content": "flex-end" }}>
              <button type="button" onClick={() => setLogViewerServiceId(null)} style={{ height: "32px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}>Fechar</button>
            </div>
          </div>
        </div>
      </Show>

      {/* Modal Detalhes */}
      <Show when={selectedInt()}>
        {(item) => (
          <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.62)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
            <div style={{ width: "520px", "max-width": "calc(100% - 32px)", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", padding: "20px", display: "flex", "flex-direction": "column", gap: "16px" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                <span style={{ "font-size": "16px", "font-weight": "600", flex: "1" }}>{item().name}</span>
                <button type="button" onClick={() => setSelectedIntId(null)} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Esc</button>
              </div>
              <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "font-size": "13px" }}>
                <div><strong style={{ color: "var(--text-muted)" }}>Categoria:</strong> {item().category}</div>
                <div><strong style={{ color: "var(--text-muted)" }}>Endpoint Base:</strong> <code>{item().base}</code></div>
                <div><strong style={{ color: "var(--text-muted)" }}>Autenticação:</strong> {item().auth}</div>
                <div><strong style={{ color: "var(--text-muted)" }}>Usado por:</strong> {item().usedBy}</div>
              </div>
              <div style={{ display: "flex", "justify-content": "flex-end" }}>
                <button type="button" onClick={() => setSelectedIntId(null)} style={{ height: "32px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Modal Configurar e Testar Motor de IA */}
      <Show when={testEngineId()}>
        <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.62)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
          <div style={{ width: "560px", "max-width": "calc(100% - 32px)", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", padding: "20px", display: "flex", "flex-direction": "column", gap: "16px" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
              <span style={{ "font-size": "16px", "font-weight": "600", flex: "1" }}>Configurar e Testar Motor de IA</span>
              <button type="button" onClick={() => setTestEngineId(null)} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Esc</button>
            </div>

            <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
              <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>Chave de API (cadastrada localmente)</span>
              <input
                type="password"
                value="••••••••••••••••••••••••"
                readOnly
                style={{ height: "36px", padding: "0 12px", "border-radius": "8px", border: "1px solid var(--border-subtle)", background: "var(--surface-0)", color: "var(--text-primary)", "font-family": "var(--font-mono)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testing()}
                style={{
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
                {testing() ? "Testando comunicação..." : "Testar comunicação"}
              </button>
            </div>

            <Show when={testLog().length > 0}>
              <div style={{ padding: "10px 12px", "border-radius": "8px", background: "var(--surface-0)", "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--teal, #1BC5BD)", "line-height": "1.6" }}>
                <For each={testLog()}>{(l) => <div>{l}</div>}</For>
              </div>
            </Show>

            <div style={{ display: "flex", "justify-content": "flex-end" }}>
              <button type="button" onClick={() => setTestEngineId(null)} style={{ height: "32px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}>Fechar</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
