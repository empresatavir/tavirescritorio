interface RadioProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  style?: any;
  class?: string;
}

export function Radio(props: RadioProps) {
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
          "border-radius": "50%",
          border: `1.75px solid ${props.checked ? "var(--action-bg)" : "var(--border-strong)"}`,
          display: "grid",
          "place-items": "center",
          flex: "0 0 auto",
          transition: "border-color var(--duration-fast) var(--ease-standard)",
        }}
      >
        {props.checked && (
          <span
            style={{
              width: "10px",
              height: "10px",
              "border-radius": "50%",
              background: "var(--action-bg)",
            }}
          />
        )}
      </span>
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange && props.onChange(e.currentTarget.checked)}
        style={{ display: "none" }}
      />
      {props.label}
    </label>
  );
}
