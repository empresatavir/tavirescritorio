import { createSignal } from "solid-js";
import { DOMAINS, currentDomainId, currentScreenId, setModalOpen, setPaletteOpen, showToast } from "../state/store";
import { TvIcon } from "../shared/components/TvIcon";
import { api } from "../shared/api/client";

export function Header() {
  const currentDomain = () => DOMAINS.find((d) => d.id === currentDomainId()) || DOMAINS[0];
  const currentItem = () => currentDomain().items.find((i) => i.id === currentScreenId()) || currentDomain().items[0];
  const [restarting, setRestarting] = createSignal<"frontend" | "backend" | null>(null);

  const restartOffice = async (kind: "frontend" | "backend") => {
    if (restarting()) return;
    const label = kind === "frontend" ? "frontend" : "backend";
    if (!window.confirm(`Reiniciar o ${label} do escritório?`)) return;
    setRestarting(kind);
    try {
      await api.restartService(kind);
      if (kind === "frontend") {
        showToast("O frontend está reiniciando. A página recarrega quando o Vite voltar.", "Frontend");
        const started = Date.now();
        const waitUp = () => {
          if (Date.now() - started > 25000) {
            window.location.reload();
            return;
          }
          window.setTimeout(async () => {
            try {
              const res = await fetch("/", { cache: "no-store" });
              if (res.ok) window.location.reload();
              else waitUp();
            } catch {
              waitUp();
            }
          }, 800);
        };
        waitUp();
      } else {
        showToast("O backend está reiniciando. A tela espera a API voltar.", "Backend");
        const started = Date.now();
        let sawDown = false;
        const wait = () => {
          if (Date.now() - started > 30000) {
            showToast("O backend não voltou. Atualize a página.", "Backend", "error");
            setRestarting(null);
            return;
          }
          window.setTimeout(async () => {
            try {
              const res = await fetch("/api/v1/health", { cache: "no-store" });
              if (sawDown && res.ok) {
                window.location.reload();
                return;
              }
            } catch {
              sawDown = true;
            }
            wait();
          }, 700);
        };
        window.setTimeout(wait, 800);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível reiniciar.", "Servidores", "error");
      setRestarting(null);
    }
  };

  const serverButton = (kind: "frontend" | "backend", label: string) => (
    <button
      type="button"
      aria-label={`Reiniciar ${label}`}
      title={`Reinicia o ${label} do escritório`}
      disabled={restarting() !== null}
      onClick={() => void restartOffice(kind)}
      style={{
        display: "flex",
        "align-items": "center",
        height: "32px",
        padding: "0 10px",
        "border-radius": "var(--radius-pill)",
        border: "1px solid rgba(244,246,242,.16)",
        background: "transparent",
        color: "var(--text-secondary)",
        "font-size": "12px",
        "font-weight": 600,
        cursor: restarting() ? "wait" : "pointer",
        "white-space": "nowrap",
        flex: "none",
      }}
    >
      {restarting() === kind ? "Reiniciando…" : label}
    </button>
  );

  return (
    <header
      style={{
        height: "52px",
        flex: "none",
        display: "flex",
        "align-items": "center",
        gap: "16px",
        padding: "0 20px",
        "border-bottom": "1px solid rgba(244,246,242,.10)",
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
          background: "#121c30",
          border: "1px solid rgba(244,246,242,.12)",
          "font-size": "11px",
          color: "#cbd3de",
          "white-space": "nowrap",
          flex: "none",
        }}
      >
        <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: "#1BC5BD", flex: "none" }} />
        <span>office.py · SQLite ao vivo</span>
      </div>

      <div style={{ flex: 1 }} />

      {serverButton("frontend", "Frontend")}
      {serverButton("backend", "Backend")}

      {/* Global Command Palette Search Bar */}
      <button
        type="button"
        aria-label="Buscar em Tasks, Cérebro, Dados (Ctrl K)"
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
          border: "1px solid rgba(244,246,242,.16)",
          background: "#121c30",
          color: "#aeb7c4",
          cursor: "pointer",
          "font-size": "13px",
          "white-space": "nowrap",
          overflow: "hidden",
          transition: "border-color var(--duration-fast) var(--ease-standard)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--flow)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(244,246,242,.16)")}
      >
        <TvIcon name="search" width="14" height="14" />
        <span style={{ flex: 1, "text-align": "left", overflow: "hidden", "text-overflow": "ellipsis" }}>
          Buscar em Tasks, Cérebro, Dados…
        </span>
        <span
          style={{
            "font-family": "var(--font-mono)",
            "font-size": "11px",
            padding: "1px 5px",
            border: "1px solid rgba(244,246,242,.34)",
            "border-radius": "4px",
          }}
        >
          Ctrl K
        </span>
      </button>

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