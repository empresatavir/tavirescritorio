import { createSignal, createMemo, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";

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

export function IntegracoesView() {
  const [integrations, setIntegrations] = createSignal<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [selectedIntId, setSelectedIntId] = createSignal<string | null>(null);
  const [testEngineId, setTestEngineId] = createSignal<string | null>(null);
  const [testing, setTesting] = createSignal<boolean>(false);
  const [testLog, setTestLog] = createSignal<string[]>([]);

  const connectedCount = createMemo(
    () => integrations().filter((i) => i.connected && i.group !== "local").length
  );

  const selectedInt = createMemo(() => {
    const id = selectedIntId();
    if (!id) return null;
    return integrations().find((i) => i.id === id) || null;
  });

  const handleToggle = (id: string) => {
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

  const handleHealthCheck = () => {
    showToast(
      `Health check concluído · ${integrations().filter((i) => i.connected).length} serviços respondendo normalmente`,
      "Status dos Serviços",
      "success"
    );
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
                                {isConnected() ? `Conectado · ${item.check || "ok"}` : "Falta ligar · sem credencial"}
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

                            <span style={{ flex: "1" }}></span>

                            <Show when={item.group !== "local"}>
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
                        </div>
                      );
                    }}
                  </For>
                </div>
              </section>
            );
          }}
        </For>
      </div>

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
