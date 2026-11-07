import { createResource, For, Show } from "solid-js";

interface FunnelStage {
  key: string;
  count: number;
}

interface FunnelDeal {
  id: string;
  client: string;
  stage: string;
  status: string;
  value_label: string;
}

interface FunnelBody {
  open_label: string;
  open_note: string;
  conversion_label: string;
  cycle_label: string;
  ticket_label: string;
  stages: FunnelStage[];
  deals: FunnelDeal[];
}

const METRICS = [
  { id: "open", eyebrow: "Valor em aberto", note: "open_note", value: "open_label" },
  { id: "conversion", eyebrow: "Caso → assinada", note: "últimos 90 dias", value: "conversion_label" },
  { id: "cycle", eyebrow: "Ciclo médio", note: "do caso ao contrato", value: "cycle_label" },
  { id: "ticket", eyebrow: "Ticket médio", note: "propostas enviadas", value: "ticket_label" },
] as const;

async function loadFunnel(): Promise<FunnelBody> {
  const res = await fetch("/api/v1/commercial/funnel");
  if (!res.ok) throw new Error("O funil não respondeu.");
  return res.json();
}

export function FunilView() {
  const [funnel] = createResource(loadFunnel);

  return (
    <div data-screen-label="Funil" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Funil</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Do caso aberto à proposta assinada.</p>
      <Show when={funnel.error}>
        <p role="alert">{funnel.error.message}</p>
      </Show>
      <Show when={funnel()}>
        {(body) => (
          <>
            <div style={{ display: "grid", "grid-template-columns": "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
              <For each={METRICS}>
                {(item) => (
                  <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line, rgba(244,246,242,.14))", background: "var(--surface-1)" }}>
                    <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted)" }}>{item.eyebrow}</span>
                    <strong data-metric={item.id} style={{ display: "block", "margin-top": "8px", "font-size": "28px", color: "var(--text-primary)" }}>
                      {body()[item.value]}
                    </strong>
                    <small style={{ color: "var(--text-secondary)" }}>{item.id === "open" ? body().open_note : item.note}</small>
                  </article>
                )}
              </For>
            </div>
            <section aria-label="Funil · últimos 90 dias" style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
              <h2 style={{ margin: "0", "font-size": "14px", color: "var(--text-primary)" }}>Funil · últimos 90 dias</h2>
              <For each={body().stages}>
                {(stage) => (
                  <p data-stage={stage.key} style={{ margin: "0", color: "var(--text-secondary)" }}>
                    {stage.key} <span>{stage.count}</span>
                  </p>
                )}
              </For>
            </section>
            <section aria-label="Negócios vivos">
              <h2 style={{ margin: "0 0 8px", "font-size": "14px", color: "var(--text-primary)" }}>Negócios vivos</h2>
              <For each={body().deals}>
                {(deal) => (
                  <p data-deal={deal.id} style={{ margin: "0", color: "var(--text-primary)" }}>
                    {deal.client} · {deal.value_label}
                  </p>
                )}
              </For>
            </section>
          </>
        )}
      </Show>
    </div>
  );
}
