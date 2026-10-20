import { For, Show, createMemo, createSignal } from "solid-js";
import type { FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function ChatPanel(props: {
  projectName?: string;
  stages: FactoryStageInstance[];
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

  const current = createMemo(() => agents().find((a) => a.name === selected()) ?? agents()[0] ?? null);

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
          <p>{props.projectName || "Projeto"} · sem backend de mensagens ainda</p>
        </header>
        <EmptyState
          title="Chat não conectado"
          text="A lista de agentes reflete a esteira. Mensagens reais entram quando o canal de agente estiver ligado."
        />
        <footer class="fc-chat2-compose">
          <input
            type="text"
            value={draft()}
            placeholder="Mensagens ainda não são enviadas…"
            disabled
            onInput={(e) => setDraft(e.currentTarget.value)}
          />
          <button
            type="button"
            class="fc-btn"
            disabled
            onClick={() => props.onToast("Chat de agentes ainda não está disponível.")}
          >
            Enviar
          </button>
        </footer>
      </section>
    </div>
  );
}
