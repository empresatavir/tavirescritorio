import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { api, type FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function ChatPanel(props: {
  projectId: string;
  projectName?: string;
  stages: FactoryStageInstance[];
  currentAgent?: string;
  onToast: (msg: string) => void;
}) {
  const agents = createMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const s of props.stages) {
      const name = (s.agent || "").trim();
      if (!name || map.has(name)) continue;
      map.set(name, { name, role: s.agent_role || s.title });
    }
    return [...map.values()];
  });

  const [selected, setSelected] = createSignal<string | null>(null);
  const [draft, setDraft] = createSignal("");
  const [messages, setMessages] = createSignal<
    Array<{ id: string; role: string; text: string; agent_name?: string; at?: string }>
  >([]);

  const current = createMemo(() => agents().find((a) => a.name === selected()) ?? null);
  const visible = createMemo(() => {
    const name = current()?.name;
    if (!name) return messages();
    return messages().filter((message) => message.agent_name === name);
  });

  const load = async () => {
    try {
      const res = await api.getFactoryChat(props.projectId);
      setMessages(res.messages || []);
    } catch {
      /* empty */
    }
  };

  createEffect(() => {
    const preferred = (props.currentAgent || "").trim();
    if (!preferred || selected() !== null) return;
    if (agents().some((agent) => agent.name === preferred)) setSelected(preferred);
  });

  createEffect(() => {
    void props.projectId;
    void load();
  });

  const send = async () => {
    const text = draft().trim();
    if (!text) return;
    const ag = current();
    try {
      const res = await api.postFactoryChat(props.projectId, {
        message: text,
        agent_name: ag?.name,
        agent_role: ag?.role,
      });
      setDraft("");
      setMessages((prev) => [...prev, ...(res.messages || [])]);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha no chat");
    }
  };

  return (
    <div class="fc-chat2">
      <aside class="fc-chat2-agents">
        <p class="fc-micro">Agentes da esteira</p>
        <Show
          when={agents().length}
          fallback={<EmptyState title="Nenhum agente" text="Os papéis vêm das stages do run." />}
        >
          <ul>
            <For each={agents()}>
              {(a) => (
                <li>
                  <button
                    type="button"
                    classList={{ "is-active": current()?.name === a.name }}
                    onClick={() => setSelected(a.name)}
                  >
                    <strong>{a.name}</strong>
                    <span>{a.role}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </aside>
      <section class="fc-chat2-thread">
        <header>
          <h2>{current()?.name || "Chat"}</h2>
          <p>{props.projectName || "Projeto"} · isolado por project_id</p>
        </header>
        <div class="fc-chat2-messages" style={{ "min-height": "180px", padding: "12px" }}>
          <Show
            when={visible().length}
            fallback={<EmptyState title="Sem mensagens" text="Envie a primeira mensagem do projeto." />}
          >
            <For each={visible()}>
              {(m) => (
                <article
                  class="fc-card"
                  style={{ "margin-bottom": "8px", "border-left": m.role === "user" ? "3px solid var(--lime)" : undefined }}
                >
                  <p class="fc-micro">
                    {m.role} · {m.agent_name || "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", "font-size": "13px" }}>{m.text}</p>
                </article>
              )}
            </For>
          </Show>
        </div>
        <footer class="fc-chat2-compose">
          <input
            type="text"
            value={draft()}
            placeholder={`Mensagem para ${current()?.name || "agente"}…`}
            onInput={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <button type="button" class="fc-btn" onClick={() => void send()}>
            Enviar
          </button>
        </footer>
      </section>
    </div>
  );
}
