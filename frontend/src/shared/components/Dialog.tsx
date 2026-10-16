import { Show, type ParentProps } from "solid-js";

interface DialogProps extends ParentProps {
  open: boolean;
  title?: string;
  onClose?: () => void;
  width?: number | string;
  style?: any;
}

export function Dialog(props: DialogProps) {
  const width = () => (typeof props.width === "number" ? `${props.width}px` : props.width || "420px");

  return (
    <Show when={props.open}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11, 18, 32, 0.72)",
          "backdrop-filter": "blur(3px)",
          display: "grid",
          "place-items": "center",
          "z-index": 100,
          animation: "fadeIn 120ms ease-out",
        }}
        onClick={props.onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: width(),
            "max-width": "calc(100vw - 32px)",
            "max-height": "calc(100vh - 32px)",
            "overflow-y": "auto",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            "border-radius": "var(--radius-lg)",
            padding: "24px",
            "box-shadow": "var(--shadow-elevated)",
            "font-family": "var(--font-body)",
            ...props.style,
          }}
        >
          {props.title && (
            <h3
              style={{
                margin: "0 0 16px",
                color: "var(--text-primary)",
                "font-size": "19px",
                "font-weight": 600,
                "letter-spacing": "-.01em",
              }}
            >
              {props.title}
            </h3>
          )}
          {props.children}
        </div>
      </div>
    </Show>
  );
}
