import { createSignal } from "solid-js";

interface InputProps {
  label?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  value?: string;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  type?: string;
  style?: any;
  class?: string;
}

export function Input(props: InputProps) {
  const [focused, setFocused] = createSignal(false);

  return (
    <div
      class={props.class}
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "6px",
        "font-family": "var(--font-body)",
        ...props.style,
      }}
    >
      {props.label && (
        <label style={{ "font-size": "13px", "font-weight": 600, color: "var(--text-primary)" }}>
          {props.label}
        </label>
      )}
      <input
        type={props.type || "text"}
        value={props.value || ""}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={(e) => {
          if (props.onInput) props.onInput(e.currentTarget.value);
        }}
        onChange={(e) => {
          if (props.onChange) props.onChange(e.currentTarget.value);
        }}
        style={{
          height: "44px",
          "border-radius": "var(--radius-sm)",
          padding: "0 14px",
          "font-size": "15px",
          "font-family": "var(--font-body)",
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          border: `1px solid ${
            props.error ? "var(--danger)" : focused() ? "var(--focus-ring)" : "var(--border-default)"
          }`,
          outline: "none",
          opacity: props.disabled ? 0.4 : 1,
          transition: "border-color var(--duration-fast) var(--ease-standard)",
        }}
      />
      {(props.helper || props.error) && (
        <span
          style={{
            "font-family": "var(--font-mono)",
            "font-size": "11.5px",
            color: props.error ? "var(--danger)" : "var(--text-muted)",
          }}
        >
          {props.error || props.helper}
        </span>
      )}
    </div>
  );
}
