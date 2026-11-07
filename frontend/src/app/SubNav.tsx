import { For, Show, createEffect } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { DOMAINS, currentDomainId, setCurrentDomainId, currentScreenId, setCurrentScreenId, jobs, tasks, approvals } from "../state/store";
import { TvIcon } from "../shared/components/TvIcon";

export const SCREEN_ROUTES: Record<string, string> = {
  room: "/sala-operacao",
  exec: "/execucoes",
  tasks: "/tasks",
  decisions: "/decisoes",
  agents: "/agentes",
  chat: "/chat",
  modhub: "/modulos",
  raiox: "/raiox",
  studio: "/studio",
  fabrica: "/fabrica",
  flow: "/flow",
  edicao: "/edicao",
  analytics: "/analytics",
  doctor: "/doctor",
  config: "/configuracoes",
  tour: "/fluxo-guiado",
  guide: "/como-funciona",
  skills: "/skills",
  org: "/org-chart",
  brain: "/cerebro",
  memory: "/memoria",
  data: "/dados",
  projects: "/projetos",
  ideas: "/ideias",
  mapa: "/mapa",
  mission: "/mission-control",
  roadmap: "/roadmap",
  reference: "/reference",
  funnel: "/funil",
  finances: "/finances",
  proposals: "/propostas",
  content: "/content",
  personas: "/personas",
  workflows: "/workflows",
  social: "/social",
  platforms: "/plataformas",
  comms: "/comunicacoes",
  library: "/biblioteca",
};

// Reverse map: pathname -> screenId
const ROUTE_TO_SCREEN: Record<string, string> = {};
Object.entries(SCREEN_ROUTES).forEach(([sid, path]) => {
  ROUTE_TO_SCREEN[path] = sid;
});
ROUTE_TO_SCREEN["/"] = "room";

export function SubNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sync current screen and domain with current location path
  createEffect(() => {
    const path = location.pathname.split("/")[1] ? `/${location.pathname.split("/")[1]}` : "/";
    const sid = ROUTE_TO_SCREEN[path];
    if (sid) {
      setCurrentScreenId(sid);
      for (const dom of DOMAINS) {
        if (dom.items.some((it) => it.id === sid)) {
          setCurrentDomainId(dom.id);
          break;
        }
      }
    }
  });

  const currentDomain = () => DOMAINS.find((d) => d.id === currentDomainId()) || DOMAINS[0];

  const getBadgeValue = (it: { id: string; badge?: string }) => {
    if (it.badge === "jobs") {
      const uniqueByTitle = new Map<string, any>();
      for (const j of jobs()) {
        const existing = uniqueByTitle.get(j.title);
        if (!existing || (j.startedAt && existing.startedAt && j.startedAt > existing.startedAt)) {
          uniqueByTitle.set(j.title, j);
        }
      }
      const runningCount = Array.from(uniqueByTitle.values()).filter((j) => j.status === "running").length;
      return runningCount > 0 ? String(runningCount) : "";
    }
    if (it.badge === "aps") {
      const pendingCount = approvals().filter((a) => a.status === "pending").length;
      return pendingCount > 0 ? String(pendingCount) : "";
    }
    if (it.badge === "tasks") {
      // Abertas que pedem ação (exclui concluídas)
      const openCount = tasks().filter((t) => t.status !== "done").length;
      return openCount > 0 ? String(openCount) : "";
    }
    if (it.badge === "blocks") {
      // Bloqueios: aguardando aprovação OU escalação ativa
      const blocked = tasks().filter(
        (t) =>
          t.status !== "done" &&
          (t.awaitingApproval || Boolean(t.escalation && String(t.escalation).trim()))
      ).length;
      return blocked > 0 ? String(blocked) : "";
    }
    if (it.badge === "changes") {
      const changes = approvals().filter(
        (a) => a.status === "pending" && (a.type === "alteracao" || a.id.startsWith("ap-alt"))
      ).length;
      return changes > 0 ? String(changes) : "";
    }
    return "";
  };

  return (
    <aside
      class="sub"
      aria-label="Menu da área"
      style={{
        width: "236px",
        background: "#0f1729",
        "border-right": "1px solid rgba(244,246,242,.10)",
        display: "flex",
        "flex-direction": "column",
        "min-width": "0",
        "flex-shrink": 0,
        "user-select": "none",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "64px",
          display: "flex",
          "flex-direction": "column",
          "justify-content": "center",
          padding: "0 16px",
          "border-bottom": "1px solid rgba(244,246,242,.10)",
        }}
      >
        <img
          src="/assets/brand/tavir-wordmark-reversed.svg"
          alt="TAVIR"
          style={{ height: "15px", width: "auto", display: "block", "margin-bottom": "4px" }}
        />
        <span style={{ "font-size": "11px", color: "#aeb7c4" }}>Escritório</span>
      </div>

      {/* Domain Category Label */}
      <div
        style={{
          padding: "16px 16px 6px",
          "font-family": "var(--font-mono)",
          "font-size": "11px",
          "font-weight": 500,
          "letter-spacing": "0.14em",
          "text-transform": "uppercase",
          color: "#aeb7c4",
        }}
      >
        {currentDomain().label}
      </div>

      {/* Navigation Sub-items */}
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "1px",
          padding: "0 8px",
          "overflow-y": "auto",
          flex: 1,
        }}
      >
        <For each={currentDomain().items}>
          {(it) => {
            const isSelected = () => currentScreenId() === it.id;
            const badgeVal = () => getBadgeValue(it);

            return (
              <button
                class="nav-item"
                type="button"
                onClick={() => {
                  setCurrentScreenId(it.id);
                  const targetRoute = SCREEN_ROUTES[it.id] || `/${it.id}`;
                  navigate(targetRoute);
                }}
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "10px",
                  height: "40px",
                  padding: "0 10px",
                  border: "none",
                  "border-radius": "8px",
                  cursor: "pointer",
                  "text-align": "left",
                  "font-size": "13px",
                  "font-weight": 500,
                  background: isSelected() ? "#17223a" : "transparent",
                  color: isSelected() ? "#F4F6F2" : "#aeb7c4",
                  transition: "background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected()) {
                    (e.currentTarget as HTMLElement).style.background = "#141f35";
                    (e.currentTarget as HTMLElement).style.color = "#F4F6F2";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected()) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#aeb7c4";
                  }
                }}
              >
                <TvIcon name={it.icon} width="18" height="18" />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                    "white-space": "nowrap",
                  }}
                >
                  {it.label}
                </span>

                <Show when={badgeVal()}>
                  <span
                    style={{
                      "font-family": "var(--font-mono)",
                      "font-size": "11px",
                      color: isSelected() ? "var(--lime)" : "#aeb7c4",
                    }}
                  >
                    {badgeVal()}
                  </span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>

      <div style={{ display: "flex", "flex-direction": "column", gap: "4px", padding: "8px" }}>
        <button
          type="button"
          onClick={() => navigate("/fluxo-guiado")}
          style={{
            display: "flex",
            "flex-direction": "column",
            "align-items": "flex-start",
            gap: "2px",
            padding: "8px 10px",
            "border-radius": "10px",
            border: "1px solid rgba(183,243,74,.35)",
            background: "rgba(183,243,74,.08)",
            color: "#F4F6F2",
            cursor: "pointer",
            "text-align": "left",
          }}
        >
          <span style={{ "font-size": "13px", "font-weight": 600 }}>Fluxo guiado</span>
          <span style={{ "font-size": "11px", color: "#aeb7c4" }}>Dois percursos explicados</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/como-funciona")}
          style={{
            display: "flex",
            "flex-direction": "column",
            "align-items": "flex-start",
            gap: "2px",
            padding: "8px 10px",
            "border-radius": "10px",
            border: "1px solid rgba(244,246,242,.12)",
            background: "transparent",
            color: "#F4F6F2",
            cursor: "pointer",
            "text-align": "left",
          }}
        >
          <span style={{ "font-size": "13px", "font-weight": 600 }}>Como funciona</span>
          <span style={{ "font-size": "11px", color: "#aeb7c4" }}>Mapa do ciclo completo</span>
        </button>
      </div>

      {/* Health / Connection Indicators Footer */}
      <div
        style={{
          "border-top": "1px solid rgba(244,246,242,.10)",
          padding: "12px 16px",
          display: "flex",
          "flex-direction": "column",
          gap: "6px",
          "font-size": "11px",
          color: "#aeb7c4",
        }}
      >
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: "#1BC5BD" }} />
          <span>office.py · SQLite</span>
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: "#1BC5BD" }} />
          <span>Sincron Brain MCP</span>
        </div>
      </div>
    </aside>
  );
}
