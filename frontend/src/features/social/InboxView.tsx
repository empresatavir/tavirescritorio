import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

interface InboxRow {
  id: string;
  sender: string;
  body: string;
  status: string;
  reply_text: string | null;
  forward_to: string | null;
  kind: string;
  raiox_case_id: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  received: "Recebida",
  replied: "Respondida",
  forwarded: "Encaminhada",
};

function MessageCard(props: { message: InboxRow; onDone: () => void }) {
  const navigate = useNavigate();
  const [reply, setReply] = createSignal("");
  const [dest, setDest] = createSignal("");
  const [error, setError] = createSignal("");

  const send = async (path: string, payload: Record<string, string>) => {
    setError("");
    const res = await fetch(`/api/v1/inbox/messages/${props.message.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "A mensagem não foi atualizada.");
      return;
    }
    props.onDone();
  };

  const openCase = async () => {
    setError("");
    const res = await fetch(`/api/v1/inbox/messages/${props.message.id}/case`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "O caso não foi aberto.");
      return;
    }
    const body = (await res.json()) as { case_id: string };
    navigate(`/raiox/${body.case_id}`);
  };

  return (
    <article data-message={props.message.id} style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px", "border-radius": "12px", border: "1px solid var(--line, rgba(244,246,242,.14))" }}>
      <div style={{ display: "flex", "justify-content": "space-between", gap: "12px" }}>
        <strong style={{ color: "var(--text-primary)" }}>{props.message.sender}</strong>
        <span data-status={props.message.status} style={{ color: "var(--text-secondary)" }}>{STATUS_LABEL[props.message.status] || props.message.status}</span>
      </div>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>{props.message.body}</p>
      <Show when={props.message.status === "received"}>
        <label style={{ display: "flex", "flex-direction": "column", gap: "6px", color: "var(--text-secondary)" }}>
          Resposta
          <textarea aria-label="Resposta" value={reply()} onInput={(event) => setReply(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={() => void send("reply", { text: reply() })}>Enviar resposta</button>
        <label style={{ display: "flex", "flex-direction": "column", gap: "6px", color: "var(--text-secondary)" }}>
          Encaminhar para
          <input aria-label="Encaminhar para" value={dest()} onInput={(event) => setDest(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={() => void send("forward", { to: dest() })}>Encaminhar</button>
      </Show>
      <Show when={props.message.kind === "new"}>
        <button type="button" onClick={() => void openCase()}>Abrir caso no Raio-X</button>
      </Show>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </article>
  );
}

export function InboxView() {
  const [rows, { refetch }] = createResource(async () => {
    const res = await fetch("/api/v1/inbox/messages");
    if (!res.ok) throw new Error("A caixa de entrada não respondeu.");
    const body = (await res.json()) as { messages: InboxRow[] };
    return body.messages;
  });

  return (
    <div data-screen-label="Inbox" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Comunicações</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Responda ou encaminhe cada mensagem recebida.</p>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
        <For each={rows() || []}>
          {(row) => <MessageCard message={row} onDone={() => void refetch()} />}
        </For>
      </div>
    </div>
  );
}
