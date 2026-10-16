import type { JSX, ParentProps } from "solid-js";

interface ButtonProps extends ParentProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  icon?: JSX.Element;
  onClick?: (e: MouseEvent) => void;
  style?: any;
  class?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
}

const sizeMap = {
  sm: { h: 36, px: 14, fs: 13 },
  md: { h: 44, px: 18, fs: 14.5 },
  lg: { h: 52, px: 24, fs: 16 },
};

export function Button(props: ButtonProps) {
  const size = () => sizeMap[props.size || "md"] || sizeMap.md;
  const variant = () => props.variant || "primary";

  const baseStyle = () => ({
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    gap: "8px",
    height: `${size().h}px`,
    padding: `0 ${size().px}px`,
    "font-size": `${size().fs}px`,
    "font-family": "var(--font-body)",
    "font-weight": 600,
    "border-radius": "var(--radius-pill)",
    border: "1px solid transparent",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.4 : 1,
    transition:
      "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
    "letter-spacing": "-.01em",
    "white-space": "nowrap",
  });

  const variantStyle = () => {
    switch (variant()) {
      case "primary":
        return { background: "var(--action-bg)", color: "var(--action-fg)" };
      case "secondary":
        return { background: "transparent", color: "var(--text-primary)", "border-color": "var(--border-strong)" };
      case "ghost":
        return { background: "transparent", color: "var(--text-secondary)" };
      default:
        return { background: "var(--action-bg)", color: "var(--action-fg)" };
    }
  };

  const handleMouseEnter = (e: MouseEvent) => {
    if (props.disabled) return;
    const target = e.currentTarget as HTMLElement;
    if (variant() === "primary") {
      target.style.background = "var(--action-bg-hover)";
    } else if (variant() === "secondary") {
      target.style.borderColor = "var(--flow)";
    } else {
      target.style.color = "var(--flow)";
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (props.disabled) return;
    const target = e.currentTarget as HTMLElement;
    if (variant() === "primary") {
      target.style.background = "var(--action-bg)";
    } else if (variant() === "secondary") {
      target.style.borderColor = "var(--border-strong)";
    } else {
      target.style.color = "var(--text-secondary)";
    }
  };

  return (
    <button
      type={props.type || "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      title={props.title}
      class={props.class}
      style={{
        ...baseStyle(),
        ...variantStyle(),
        ...props.style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {props.icon}
      {props.children}
    </button>
  );
}
