import { createSignal, onMount, Show, For } from "solid-js";
import { api, type OfficeNotification } from "../shared/api/client";
import { TvIcon } from "../shared/components/TvIcon";

export function NotificationBell() {
  const [open, setOpen] = createSignal(false);
  const [items, setItems] = createSignal<OfficeNotification[]>([]);
  const [unread, setUnread] = createSignal(0);

  const load = async () => {
    try {
      const data = await api.listNotifications();
      setItems(data.items);
      setUnread(data.unread_count);
    } catch {
      /* a lista volta no próximo clique */
    }
  };

  onMount(() => {
    void load();
  });

  const mark = async (id: string) => {
    const data = await api.markNotificationRead(id);
    setItems(data.items);
    setUnread(data.unread_count);
  };

  return (
    <div style={{ position: "relative", flex: "none" }}>
      <button
        type="button"
        aria-label="Notificações"
        aria-expanded={open()}
        onClick={() => {
          const next = !open();
          setOpen(next);
          if (next) void load();
        }}
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          gap: "6px",
          width: unread() > 0 ? "auto" : "32px",
          height: "32px",
          padding: unread() > 0 ? "0 10px" : "0",
          "border-radius": "var(--radius-pill)",
          border: "1px solid var(--line)",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <TvIcon name="bell" width="16" height="16" />
        <Show when={unread() > 0}>
          <span style={{ "font-size": "12px", "font-weight": 700, color: "var(--text-primary)" }}>{unread()}</span>
        </Show>
      </button>
      <Show when={open()}>
        <div
          role="region"
          aria-label="Lista de notificações"
          style={{
            position: "absolute",
            top: "40px",
            right: "0",
            width: "320px",
            "max-width": "calc(100vw - 32px)",
            background: "var(--surface-1)",
            border: "1px solid var(--line)",
            "border-radius": "12px",
            "box-shadow": "var(--shadow-elevated)",
            padding: "8px",
            "z-index": 40,
            animation: "slideup var(--std) var(--ease) both",
          }}
        >
          <Show
            when={items().length > 0}
            fallback={
              <p style={{ margin: "12px", color: "var(--text-muted)", "font-size": "13px" }}>Nada pede você agora.</p>
            }
          >
            <For each={items()}>
              {(item) => (
                <div style={{ padding: "10px 12px", display: "flex", "flex-direction": "column", gap: "4px" }}>
                  <strong style={{ color: "var(--text-primary)", "font-size": "13px" }}>{item.title}</strong>
                  <span style={{ color: "var(--text-secondary)", "font-size": "12px" }}>{item.detail}</span>
                  <Show when={!item.read}>
                    <button
                      type="button"
                      onClick={() => void mark(item.id)}
                      style={{
                        "align-self": "flex-start",
                        "margin-top": "4px",
                        border: "none",
                        background: "transparent",
                        color: "var(--teal)",
                        cursor: "pointer",
                        "font-size": "12px",
                        "font-weight": 600,
                        padding: "0",
                      }}
                    >
                      Marcar lida
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
