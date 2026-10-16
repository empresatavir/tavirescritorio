import type { ParentProps } from "solid-js";

interface InkPanelProps extends ParentProps {
  padding?: number | string;
  radius?: string;
  style?: any;
  class?: string;
}

export function InkPanel(props: InkPanelProps) {
  const pad = () => (typeof props.padding === "number" ? `${props.padding}px` : props.padding || "24px");
  const rad = () => props.radius || "var(--radius-md)";

  return (
    <div
      class={props.class}
      style={{
        background: "var(--surface-ink)",
        color: "var(--on-ink)",
        "border-radius": rad(),
        padding: pad(),
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}
