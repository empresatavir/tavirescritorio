import { For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DOMAINS, currentDomainId, setCurrentDomainId, setCurrentScreenId, theme, setTheme } from "../state/store";
import { TvIcon } from "../shared/components/TvIcon";
import { SCREEN_ROUTES } from "./SubNav";

export function Rail() {
  const navigate = useNavigate();
  const toggleTheme = () => {
    setTheme(theme() === "dark" ? "light" : "dark");
  };

  return (
    <nav
      aria-label="Domínios"
      style={{
        width: "56px",
        background: "#070d18",
        "border-right": "1px solid rgba(244,246,242,.10)",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        padding: "12px 0",
        gap: "6px",
        "user-select": "none",
        "flex-shrink": 0,
      }}
    >
      {/* Brand Symbol */}
      <img
        src="/assets/brand/tavir-symbol-lime.svg"
        alt="TAVIR"
        style={{
          width: "28px",
          height: "28px",
          margin: "2px 0 12px",
          "object-fit": "contain",
        }}
      />

      {/* Domain Navigation Icons */}
      <For each={DOMAINS}>
        {(dom) => {
          const isSelected = () => currentDomainId() === dom.id;
          return (
            <button
              type="button"
              title={dom.label}
              aria-label={dom.label}
              onClick={() => {
                setCurrentDomainId(dom.id);
                // Switch to first item of this domain and navigate
                if (dom.items.length > 0) {
                  const firstScreen = dom.items[0].id;
                  setCurrentScreenId(firstScreen);
                  const targetRoute = SCREEN_ROUTES[firstScreen] || `/${firstScreen}`;
                  navigate(targetRoute);
                }
              }}
              style={{
                width: "40px",
                height: "40px",
                "border-radius": "14px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                background: isSelected() ? "rgba(183,243,74,.14)" : "transparent",
                color: isSelected() ? "var(--lime)" : "var(--text-muted)",
                transition: "all var(--duration-fast) var(--ease-standard)",
              }}
              onMouseEnter={(e) => {
                if (!isSelected()) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(244,246,242,.06)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected()) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }
              }}
            >
              <TvIcon name={dom.icon} width="18" height="18" />
            </button>
          );
        }}
      </For>

      <div style={{ flex: 1 }} />

      {/* Theme Switcher Toggle */}
      <button
        type="button"
        title={`Alternar tema (atual: ${theme()})`}
        aria-label="Alternar tema"
        onClick={toggleTheme}
        style={{
          width: "36px",
          height: "36px",
          "border-radius": "50%",
          border: "1px solid rgba(244,246,242,.16)",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "margin-bottom": "6px",
          "font-size": "13px",
        }}
      >
        {theme() === "dark" ? "☀️" : "🌙"}
      </button>

      {/* CEO Profile Pill */}
      <div
        title="Carlos · CEO"
        style={{
          width: "32px",
          height: "32px",
          "border-radius": "50%",
          background: "#17223a",
          border: "1px solid rgba(244,246,242,.34)",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "font-size": "11px",
          "font-weight": 600,
          color: "#cbd3de",
          cursor: "default",
        }}
      >
        CH
      </div>
    </nav>
  );
}
