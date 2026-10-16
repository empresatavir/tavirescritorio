import { createSignal, type ParentProps } from "solid-js";

interface TooltipProps extends ParentProps {
  label: string;
  style?: any;
}

export function Tooltip(props: TooltipProps) {
  const [show, setShow] = createSignal(false);

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {props.children}
      {show() && (
        <span
          style={{
            position: "absolute",
            bottom: "120%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            "font-family": "var(--font-mono)",
            "font-size": "11px",
            padding: "6px 10px",
            "border-radius": "var(--radius-sm)",
            "white-space": "nowrap",
            "z-index": 10,
            "box-shadow": "var(--shadow-card)",
            "pointer-events": "none",
            ...props.style,
          }}
        >
          {props.label}
        </span>
      )}
    </span>
  );
}
