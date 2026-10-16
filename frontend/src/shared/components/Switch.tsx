interface SwitchProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: any;
  class?: string;
}

export function Switch(props: SwitchProps) {
  return (
    <label
      class={props.class}
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "10px",
        "font-family": "var(--font-body)",
        "font-size": "14px",
        color: "var(--text-primary)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.4 : 1,
        "user-select": "none",
        ...props.style,
      }}
    >
      <span
        style={{
          width: "40px",
          height: "24px",
          "border-radius": "var(--radius-pill)",
          background: props.checked ? "var(--action-bg)" : "var(--surface-2)",
          border: `1px solid ${props.checked ? "var(--action-bg)" : "var(--border-default)"}`,
          position: "relative",
          transition: "background var(--duration-standard) var(--ease-standard), border-color var(--duration-standard) var(--ease-standard)",
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: props.checked ? "18px" : "2px",
            width: "18px",
            height: "18px",
            "border-radius": "50%",
            background: props.checked ? "var(--action-fg)" : "var(--text-muted)",
            transition: "left var(--duration-standard) var(--ease-standard), background var(--duration-standard) var(--ease-standard)",
          }}
        />
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange && props.onChange(e.currentTarget.checked)}
        style={{ display: "none" }}
      />
      {props.label}
    </label>
  );
}
