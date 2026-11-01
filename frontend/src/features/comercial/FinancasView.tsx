import { createResource, For, Show } from "solid-js";

interface CostDay {
  day: string;
  usd: number;
  tokens: number;
}

interface CostSeries {
  range: string;
  total_usd: number;
  total_tokens: number;
  days: CostDay[];
}

async function loadCost(): Promise<CostSeries> {
  const res = await fetch("/api/v1/analytics/cost?range=30d");
  if (!res.ok) throw new Error("A série de custo não respondeu.");
  return res.json();
}

export function FinancasView() {
  const [series] = createResource(loadCost);

  return (
    <div data-screen-label="Finanças" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Finanças</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Custo de motor lido das amostras dos últimos 30 dias.</p>
      <Show when={series.error}>
        <p role="alert">{series.error.message}</p>
      </Show>
      <Show when={series()}>
        {(body) => {
          const peak = Math.max(...body().days.map((day) => day.usd), 1);
          return (
            <>
              <div style={{ display: "flex", gap: "16px" }}>
                <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line, rgba(244,246,242,.14))" }}>
                  <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted)" }}>Custo de motor</span>
                  <strong data-metric="usd" style={{ "font-size": "28px", color: "var(--text-primary)" }}>US$ {body().total_usd}</strong>
                </article>
                <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line, rgba(244,246,242,.14))" }}>
                  <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted)" }}>Tokens</span>
                  <strong data-metric="tokens" style={{ "font-size": "28px", color: "var(--text-primary)" }}>{body().total_tokens}</strong>
                </article>
              </div>
              <section aria-label="Série de custo" style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                <For each={body().days}>
                  {(day) => (
                    <div data-day={day.day} style={{ display: "grid", "grid-template-columns": "110px minmax(0, 1fr) 80px", gap: "12px", "align-items": "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{day.day}</span>
                      <div style={{ height: "18px", "border-radius": "6px", background: "var(--surface-2, #0f1729)" }}>
                        <div style={{ height: "18px", width: `${(day.usd / peak) * 100}%`, "min-width": "4px", "border-radius": "6px", background: "var(--lime, #B7F34A)" }} />
                      </div>
                      <span data-usd style={{ color: "var(--text-primary)" }}>{day.usd}</span>
                    </div>
                  )}
                </For>
              </section>
            </>
          );
        }}
      </Show>
    </div>
  );
}
