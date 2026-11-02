import { DOMAINS, currentDomainId, currentScreenId, setModalOpen, setPaletteOpen } from "../state/store";
import { TvIcon } from "../shared/components/TvIcon";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const currentDomain = () => DOMAINS.find((d) => d.id === currentDomainId()) || DOMAINS[0];
  const currentItem = () => currentDomain().items.find((i) => i.id === currentScreenId()) || currentDomain().items[0];

  return (
    <header
      class="top"
      style={{
        height: "64px",
        flex: "none",
        display: "flex",
        "align-items": "center",
        gap: "12px",
        padding: "0 24px",
        "border-bottom": "1px solid var(--line)",
        background: "var(--surface-0)",
        "user-select": "none",
      }}
    >
      {/* Breadcrumbs */}
      <div style={{ display: "flex", "align-items": "center", gap: "8px", flex: "none" }}>
        <span style={{ color: "var(--text-muted)", "white-space": "nowrap", "font-size": "13px" }}>
          {currentDomain().label}
        </span>
        <span style={{ color: "#5E6878", "font-size": "13px" }}>/</span>
        <span style={{ "font-weight": 600, "white-space": "nowrap", color: "var(--text-primary)", "font-size": "13px" }}>
          {currentItem().label}
        </span>
      </div>

      {/* Freshness Status Pill */}
      <div
        title="Indicador de dados operacionais ao vivo"
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          height: "24px",
          padding: "0 10px",
          "border-radius": "14px",
          background: "var(--surface-1)",
          border: "1px solid var(--line)",
          "font-size": "11px",
          color: "var(--text-secondary)",
          "white-space": "nowrap",
          flex: "none",
        }}
      >
        <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: "#1BC5BD", flex: "none" }} />
        <span>AO VIVO</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Global Command Palette Search Bar */}
      <button
        type="button"
        aria-label="Buscar telas, tasks, agentes… (Ctrl K)"
        onClick={() => setPaletteOpen(true)}
        style={{
          display: "flex",
          "align-items": "center",
          gap: "10px",
          flex: "0 1 300px",
          "min-width": "0",
          height: "32px",
          padding: "0 12px",
          "border-radius": "var(--radius-pill)",
          border: "1px solid var(--line)",
          background: "var(--surface-1)",
          color: "var(--text-muted)",
          cursor: "pointer",
          "font-size": "13px",
          "white-space": "nowrap",
          overflow: "hidden",
          transition: "border-color var(--duration-fast) var(--ease-standard)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--flow)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--line)")}
      >
        <TvIcon name="search" width="14" height="14" />
        <span class="search-copy" style={{ flex: 1, "text-align": "left", overflow: "hidden", "text-overflow": "ellipsis" }}>
          Buscar telas, tasks, agentes…
        </span>
        <span
          class="search-kbd"
          style={{
            "font-family": "var(--font-mono)",
            "font-size": "11px",
            padding: "1px 5px",
            border: "1px solid var(--line)",
            "border-radius": "4px",
          }}
        >
          Ctrl K
        </span>
      </button>

      <NotificationBell />

      {/* Primary Lime CTA Button: Iniciar job */}
      <button
        type="button"
        aria-label="Iniciar novo job operacional"
        onClick={() => setModalOpen(true)}
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          height: "32px",
          padding: "0 14px",
          "border-radius": "var(--radius-pill)",
          border: "none",
          background: "var(--action-bg)",
          color: "var(--action-fg)",
          "font-weight": 600,
          "font-size": "13px",
          cursor: "pointer",
          "white-space": "nowrap",
          flex: "none",
          transition: "background var(--duration-fast) var(--ease-standard)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--action-bg-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--action-bg)")}
      >
        <TvIcon name="play" width="14" height="14" />
        <span>Iniciar job</span>
      </button>
    </header>
  );
}