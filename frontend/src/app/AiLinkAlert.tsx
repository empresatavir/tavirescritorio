import { Show } from "solid-js";
import { aiLinkAlert, clearAiLinkAlert } from "../state/aiLink";

export function AiLinkAlert() {
  return (
    <Show when={aiLinkAlert()}>
      <div
        role="presentation"
        style={{
          position: "fixed",
          inset: "0",
          "z-index": "1200",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          padding: "24px",
          background: "color-mix(in srgb, var(--danger) 28%, rgba(0,0,0,.55))",
        }}
      >
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ai-link-title"
          style={{
            width: "min(520px, 100%)",
            padding: "22px 22px 18px",
            "border-radius": "16px",
            border: "2px solid var(--danger)",
            background: "var(--surface-0)",
            color: "var(--text-primary)",
            "box-shadow": "0 18px 50px rgba(0,0,0,.35)",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              "font-size": "12px",
              "font-weight": "700",
              "letter-spacing": "0.04em",
              "text-transform": "uppercase",
              color: "var(--danger)",
            }}
          >
            Motor de IA
          </p>
          <h2 id="ai-link-title" style={{ margin: "0 0 10px", "font-size": "22px", color: "var(--danger)" }}>
            Sem comunicação com o motor de IA
          </h2>
          <p
            style={{
              margin: "0 0 10px",
              "max-height": "9em",
              overflow: "auto",
              "font-size": "15px",
              "line-height": "1.5",
              "overflow-wrap": "anywhere",
              color: "var(--text-primary)",
            }}
          >
            {aiLinkAlert()}
          </p>
          <p style={{ margin: "0 0 16px", "font-size": "13px", "line-height": "1.45", color: "var(--text-secondary)" }}>
            A entrega não foi concluída. Este aviso permanece até você fechar.
          </p>
          <button
            type="button"
            onClick={() => clearAiLinkAlert()}
            style={{
              border: "0",
              "border-radius": "10px",
              padding: "8px 14px",
              background: "var(--danger)",
              color: "var(--danger-ink, #fff)",
              "font-weight": "700",
              cursor: "pointer",
            }}
          >
            Fechar aviso
          </button>
        </section>
      </div>
    </Show>
  );
}
