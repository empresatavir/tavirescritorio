interface CheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: any;
  class?: string;
}

export function Checkbox(props: CheckboxProps) {
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
          width: "20px",
          height: "20px",
          "border-radius": "5px",
          border: `1.75px solid ${props.checked ? "var(--action-bg)" : "var(--border-strong)"}`,
          background: props.checked ? "var(--action-bg)" : "transparent",
          display: "grid",
          "place-items": "center",
          flex: "0 0 auto",
          transition: "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
        }}
      >
        {props.checked && (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--action-fg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
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
