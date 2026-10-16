interface ToastProps {
  tone?: "action" | "flow" | "neutral" | "success" | "warning" | "danger";
  title?: string;
  message: string;
  style?: any;
  class?: string;
}

const tones = {
  action: "var(--action-bg)",
  flow: "var(--flow)",
  neutral: "var(--border-strong)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

export function Toast(props: ToastProps) {
  const color = () => tones[props.tone || "flow"] || tones.flow;

  return (
    <div
      class={props.class}
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "2px",
        padding: "13px 16px",
        "border-radius": "0 10px 10px 0",
        background: "var(--surface-2)",
        border: "1px solid var(--border-default)",
        "border-left-width": "4px",
        "border-left-color": color(),
        "font-family": "var(--font-body)",
        "max-width": "340px",
        ...props.style,
      }}
    >
      {props.title && <b style={{ "font-size": "13.5px", color: "var(--text-primary)" }}>{props.title}</b>}
      <span style={{ "font-size": "13px", color: "var(--text-secondary)", "line-height": 1.5 }}>{props.message}</span>
    </div>
  );
}
