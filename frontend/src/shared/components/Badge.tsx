import type { ParentProps } from "solid-js";

interface BadgeProps extends ParentProps {
  tone?: "neutral" | "flow" | "action";
  class?: string;
  style?: any;
}

const tones = {
  neutral: { background: "var(--surface-2)", color: "var(--text-secondary)", border: "var(--border-default)" },
  flow: { background: "var(--flow-subtle)", color: "var(--flow-subtle-text)", border: "var(--flow-subtle-line)" },
  action: { background: "var(--action-subtle)", color: "var(--action-subtle-text)", border: "var(--action-subtle-line)" },
};

export function Badge(props: BadgeProps) {
  const tone = () => tones[props.tone || "neutral"] || tones.neutral;

  return (
    <span
      class={props.class}
      style={{
        display: "inline-flex",
        "align-items": "center",
        height: "24px",
        padding: "0 10px",
        "border-radius": "var(--radius-pill)",
        "font-family": "var(--font-mono)",
        "font-size": "11px",
        "letter-spacing": ".06em",
        "text-transform": "uppercase",
        background: tone().background,
        color: tone().color,
        border: `1px solid ${tone().border}`,
        "white-space": "nowrap",
        ...props.style,
      }}
    >
      {props.children}
    </span>
  );
}
