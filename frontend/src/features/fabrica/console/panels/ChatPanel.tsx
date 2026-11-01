import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { api, type FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";
import { Pensando } from "../../../chat/Pensando";

type ChatMessage = {
  id: string;
  role: string;
  text: string;
  agent_name?: string;
  at?: string;
  actions?: Array<{ tipo: string; rotulo: string; texto?: string; titulo?: string; demand_code?: string }>;
};

function officeDate(iso?: string | null): number {
  if (!iso) return NaN;
  const raw = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return Date.parse(raw);
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter((part) => /[A-Za-zÀ-ÿ]/.test(part[0] || ""));
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  const raw = name.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return (raw.slice(0, 2) || "—").toUpperCase();
}

function clock(iso?: string): string {
  const at = officeDate(iso);
  if (Number.isNaN(at)) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

function readableRole(stage: FactoryStageInstance): string {
  if (/ceo/i.test(stage.agent || "") || /ceo/i.test(stage.agent_role || "")) return "Aprovador de gates";
  const role = (stage.agent_role || "").trim();
  if (role && /\s/.test(role)) return role;
  return stage.title || "Etapa da esteira";
}

export function ChatPanel(props: {
  projectId: string;
  projectName?: string;
  stages: FactoryStageInstance[];
  finished?: boolean;
  maintenance?: boolean;
  onToast: (msg: string) => void;
  onApply?: (message: string) => Promise<ChatMessage[]>;
}) {
  const agents = createMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const stage of props.stages) {
      const name = (stage.agent || "").trim();
      if (!name || map.has(name)) continue;
      map.set(name, { name, role: readableRole(stage) });
    }
    return [...map.values()];
  });

  const [selected, setSelected] = createSignal<string | null>(null);
  const [query, setQuery] = createSignal("");
  const [draft, setDraft] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [applying, setApplying] = createSignal(false);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  let logEl: HTMLDivElement | undefined;

  const current = createMemo(() => agents().find((agent) => agent.name === selected()) ?? null);
  const projectMessages = (all: ChatMessage[]) => {
    const project = props.projectName || "Projeto";
    return all.filter(
      (message) => !message.agent_name || message.agent_name === "Projeto" || message.agent_name === project,
    );
  };
  const visible = createMemo(() => {
    const name = current()?.name;
    if (!name) return projectMessages(messages());
    return messages().filter((message) => message.agent_name === name);
  });
  const listed = createMemo(() => {
    const q = query().trim().toLocaleLowerCase("pt-BR");
    if (!q) return agents();
    return agents().filter(
      (agent) =>
        agent.name.toLocaleLowerCase("pt-BR").includes(q) || agent.role.toLocaleLowerCase("pt-BR").includes(q),
    );
  });

  const countFor = (name: string | null) => {
    if (!name) return projectMessages(messages()).length;
    return messages().filter((message) => message.agent_name === name).length;
  };

  const load = async () => {
    try {
      const res = await api.getFactoryChat(props.projectId);
      setMessages(res.messages || []);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha ao carregar o chat");
    }
  };

  createEffect(() => {
    void props.projectId;
    void load();
  });

  createEffect(() => {
    visible().length;
    sending();
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    });
  });

  const apply = async () => {
    const text = draft().trim();
    if (!text || !props.onApply || applying()) return;
    setApplying(true);
    try {
      const added = await props.onApply(text);
      setDraft("");
      setMessages((prev) => [...prev, ...added]);
      props.onToast("Alteração aplicada no projeto.");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Não foi possível aplicar a alteração.");
    } finally {
      setApplying(false);
    }
  };

  const send = async () => {
    const text = draft().trim();
    if (!text || sending()) return;
    const agent = current();
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      role: "user",
      text,
      agent_name: agent?.name || props.projectName || "Projeto",
      at: new Date().toISOString(),
    };
    setDraft("");
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await api.postFactoryChat(
        props.projectId,
        agent
          ? { message: text, agent_name: agent.name, agent_role: agent.role }
          : { message: text, to_project: true },
      );
      setMessages((prev) => [...prev.filter((item) => item.id !== tempId), ...(res.messages || [])]);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item.id !== tempId));
      setDraft(text);
      props.onToast(err instanceof Error ? err.message : "Falha no chat");
    } finally {
      setSending(false);
    }
  };

  const targetName = () => current()?.name || props.projectName || "o projeto";

  return (
    <div class="fc-chat2">
      <aside class="fc-chat2-rail" aria-label="Conversas">
        <div class="fc-chat2-rail-head">
          <h3>Conversas</h3>
          <p>{props.projectName || "Projeto"}</p>
          <input
            class="fc-chat2-filter"
            type="search"
            value={query()}
            placeholder="Buscar agente…"
            aria-label="Buscar agente"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <ul class="fc-chat2-agents">
          <li class="fc-chat2-kicker">Projeto</li>
          <li>
            <button
              type="button"
              class="fc-chat2-agent"
              classList={{ "is-active": selected() === null }}
              onClick={() => setSelected(null)}
            >
              <i class="fc-chat2-av">{initials(props.projectName || "Projeto")}</i>
              <span class="fc-chat2-agent-body">
                <strong>{props.projectName || "Projeto"}</strong>
                <span>{props.maintenance ? "Manutenção" : props.finished ? "Finalizado" : "Conversa inteira"}</span>
              </span>
              <Show when={countFor(null) > 0}>
                <em class="fc-chat2-count">{countFor(null)}</em>
              </Show>
            </button>
          </li>
          <li class="fc-chat2-kicker">Agentes da esteira</li>
          <Show
            when={listed().length}
            fallback={<li class="fc-chat2-miss">Nenhum agente com esse nome.</li>}
          >
            <For each={listed()}>
              {(agent) => (
                <li>
                  <button
                    type="button"
                    class="fc-chat2-agent"
                    classList={{ "is-active": current()?.name === agent.name }}
                    onClick={() => setSelected(agent.name)}
                  >
                    <i class="fc-chat2-av" classList={{ "is-offline": current()?.name !== agent.name }}>
                      {initials(agent.name)}
                    </i>
                    <span class="fc-chat2-agent-body">
                      <strong>{agent.name}</strong>
                      <span>{agent.role}</span>
                    </span>
                    <Show when={countFor(agent.name) > 0}>
                      <em class="fc-chat2-count">{countFor(agent.name)}</em>
                    </Show>
                  </button>
                </li>
              )}
            </For>
          </Show>
        </ul>
      </aside>

      <section class="fc-chat2-main" aria-label="Mensagens">
        <header class="fc-chat2-top">
          <div class="fc-chat2-top-agent">
            <i class="fc-chat2-av">{initials(current()?.name || props.projectName || "Projeto")}</i>
            <div>
              <h2>{current()?.name || props.projectName || "Projeto"}</h2>
              <p>{current()?.role || (props.maintenance ? "Canal de manutenção" : "Histórico do projeto")}</p>
            </div>
          </div>
          <div class="fc-chat2-top-meta">
            <span class={`fc-chat2-status ${props.maintenance ? "is-busy" : props.finished ? "is-offline" : "is-online"}`}>
              {props.maintenance ? "Manutenção" : props.finished ? "Finalizado" : "Ao vivo"}
            </span>
          </div>
        </header>
        <p class="fc-chat2-blurb">
          {current()
            ? `Conversa com ${current()?.name}. O canal ${props.projectName || "do projeto"} responde pelo retrato. Pergunta sobre o código é que abre a pasta.`
            : props.maintenance
              ? `Enviar fala com ${props.projectName || "o projeto"} pelo retrato, sem gravar. Aplicar no projeto é o que altera o código.`
              : `Enviar responde pelo retrato de ${props.projectName || "o projeto"}, sem gravar arquivo. Pergunta sobre o código é que abre a pasta.`}
        </p>
        <div class="fc-chat2-log" ref={logEl}>
          <Show
            when={visible().length}
            fallback={
              <EmptyState
                title="Sem mensagens"
                text={
                  current()
                    ? `Envie a primeira mensagem para ${current()?.name}.`
                    : "Envie a primeira mensagem do projeto."
                }
              />
            }
          >
            <For each={visible()}>
              {(message) => (
                <article
                  class={`fc-chat2-msg ${message.role === "user" ? "is-user" : message.role === "system" ? "is-system" : "is-agent"}`}
                >
                  <header>
                    <strong>
                      {message.role === "user" ? "Você" : message.agent_name || (message.role === "system" ? "Sistema" : "Agente")}
                    </strong>
                    <Show when={clock(message.at)}>
                      <time datetime={message.at}>{clock(message.at)}</time>
                    </Show>
                  </header>
                  <p>{message.text}</p>
                  <Show when={message.actions?.length}>
                    <div class="fc-chat2-actions">
                      <For each={message.actions || []}>
                        {(action) => (
                          <button
                            type="button"
                            class="fc-btn-sec"
                            onClick={() =>
                              void api
                                .runDemandAction(props.projectId, action)
                                .then(() => props.onToast(action.rotulo))
                                .catch((err) => props.onToast(err instanceof Error ? err.message : "A ação não rodou"))
                            }
                          >
                            {action.rotulo}
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </article>
              )}
            </For>
            <Show when={sending()}>
              <article class="fc-chat2-msg is-agent" aria-live="polite">
                <header>
                  <strong>{targetName()}</strong>
                </header>
                <p>
                  <Pensando nome={targetName()} />
                </p>
              </article>
            </Show>
          </Show>
        </div>
        <footer class="fc-chat2-composer">
          <p class="fc-chat2-to">
            Para <strong>{targetName()}</strong>
          </p>
          <textarea
            class="fc-chat2-input"
            rows={3}
            value={draft()}
            placeholder={
              props.maintenance ? "Descreva a alteração no projeto…" : `Mensagem para ${targetName()}…`
            }
            onInput={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <div class="fc-chat2-composer-foot">
            <span class="fc-chat2-to">Enter envia. Shift+Enter quebra a linha.</span>
            <div class="fc-chat2-actions">
              <button type="button" class="fc-btn" disabled={sending() || !draft().trim()} onClick={() => void send()}>
                {sending() ? "Enviando…" : "Enviar"}
              </button>
              <Show when={props.maintenance}>
                <button
                  type="button"
                  class="fc-btn-sec"
                  disabled={applying() || !draft().trim()}
                  onClick={() => void apply()}
                >
                  {applying() ? "Aplicando…" : "Aplicar no projeto"}
                </button>
              </Show>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
