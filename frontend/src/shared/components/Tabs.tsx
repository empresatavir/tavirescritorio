import { For } from "solid-js";

interface TabItem {
  value: string;
  label: string;
  count?: string | number;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange?: (value: string) => void;
  style?: any;
  class?: string;
}

export function Tabs(props: TabsProps) {
  return (
    <div
      class={props.class}
      style={{
        display: "flex",
        gap: "22px",
        "border-bottom": "1px solid var(--border-default)",
        "font-family": "var(--font-body)",
        ...props.style,
      }}
    >
      <For each={props.items}>
        {(it) => {
          const isActive = () => it.value === props.active;
          return (
            <button
              type="button"
              onClick={() => props.onChange && props.onChange(it.value)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 2px 12px",
                "font-size": "14px",
                "font-weight": 600,
                color: isActive() ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                position: "relative",
                transition: "color var(--duration-fast) var(--ease-standard)",
                display: "inline-flex",
                "align-items": "center",
                gap: "6px",
              }}
            >
              <span>{it.label}</span>
              {it.count !== undefined && it.count !== "" && (
                <span
                  style={{
                    "font-family": "var(--font-mono)",
                    "font-size": "11px",
                    padding: "1px 6px",
                    "border-radius": "var(--radius-pill)",
                    background: isActive() ? "var(--flow-subtle)" : "var(--surface-2)",
                    color: isActive() ? "var(--flow)" : "var(--text-muted)",
                  }}
                >
                  {it.count}
                </span>
              )}
              {isActive() && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: "-1px",
                    height: "2px",
                    background: "var(--flow)",
                  }}
                />
              )}
            </button>
          );
        }}
      </For>
    </div>
  );
}
