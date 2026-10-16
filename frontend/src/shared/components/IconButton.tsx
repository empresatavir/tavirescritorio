import type { JSX } from "solid-js";

interface IconButtonProps {
  icon: JSX.Element;
  size?: number;
  variant?: "ghost" | "solid";
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
  "aria-label"?: string;
  title?: string;
  style?: any;
  class?: string;
}

export function IconButton(props: IconButtonProps) {
  const size = () => props.size || 40;
  const variant = () => props.variant || "ghost";

  const variantStyle = () => {
    if (variant() === "solid") {
      return { background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--flow)" };
    }
    return { background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-secondary)" };
  };

  const handleMouseEnter = (e: MouseEvent) => {
    if (!props.disabled) {
      (e.currentTarget as HTMLElement).style.borderColor = "var(--flow)";
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (!props.disabled) {
      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
    }
  };

  return (
    <button
      type="button"
      aria-label={props["aria-label"]}
      title={props.title || props["aria-label"]}
      disabled={props.disabled}
      onClick={props.onClick}
      class={props.class}
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        "border-radius": "50%",
        display: "grid",
        "place-items": "center",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.4 : 1,
        transition: "border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
        ...variantStyle(),
        ...props.style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ width: "46%", height: "46%", display: "grid", "place-items": "center" }}>{props.icon}</span>
    </button>
  );
}
