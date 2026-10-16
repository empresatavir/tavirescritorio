import type { ParentProps } from "solid-js";

interface CardProps extends ParentProps {
  padding?: number | string;
  style?: any;
  class?: string;
  onClick?: (e: MouseEvent) => void;
}

export function Card(props: CardProps) {
  const pad = () => (typeof props.padding === "number" ? `${props.padding}px` : props.padding || "20px");

  return (
    <div
      class={props.class}
      onClick={props.onClick}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-default)",
        "border-radius": "var(--radius-md)",
        padding: pad(),
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}
