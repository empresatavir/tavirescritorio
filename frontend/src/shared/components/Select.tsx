import { For } from "solid-js";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  style?: any;
  class?: string;
}

export function Select(props: SelectProps) {
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
      <select
        value={props.value}
        onChange={(e) => props.onChange && props.onChange(e.currentTarget.value)}
        disabled={props.disabled}
        style={{
          height: "44px",
          "border-radius": "var(--radius-sm)",
          padding: "0 14px",
          "font-size": "15px",
          "font-family": "var(--font-body)",
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          outline: "none",
          opacity: props.disabled ? 0.4 : 1,
          cursor: props.disabled ? "not-allowed" : "pointer",
        }}
      >
        <For each={props.options}>
          {(opt) => <option value={opt.value}>{opt.label}</option>}
        </For>
      </select>
    </div>
  );
}
