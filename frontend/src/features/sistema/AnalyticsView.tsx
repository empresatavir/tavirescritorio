import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "../../shared/api/client";

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

const COST = [5.1, 6.4, 4.8, 7.2, 8.9, 3.1, 2.6, 6.2, 7.1, 5.4, 9.8, 9.1, 4.2, 3.1, 6.8, 6.1, 10.2, 8.4, 9.6, 3.9, 8.4, 7.7, 6.6, 5.9, 9.3, 4.4, 3.8, 7.9, 8.8, 8.4];
const MODELS: Array<[string, number]> = [["claude-sonnet-4", 53], ["claude-opus-4", 27], ["gpt-4o", 15], ["dall-e-3", 5]];
const PROJECTS: Array<[string, number, string]> = [["Meridian", 34, "#1BC5BD"], ["Multiverso", 28, "#0B6C67"], ["Escritório", 22, "#5E6878"], ["Raio-X e comercial", 16, "oklch(.80 .155 78)"]];

export function AnalyticsView() {
  const [visualFixture, setVisualFixture] = createSignal(false);
  const [period, setPeriod] = createSignal(14);
  const [series] = createResource(async () => {
    const res = await fetch("/api/v1/analytics/cost?range=14d");
    if (!res.ok) throw new Error("A série de custo não respondeu.");
    return (await res.json()) as CostSeries;
  });

  onMount(() => {
    void api.getOfficeSettings().then((data) => setVisualFixture(Boolean(data.visual_fixture))).catch(() => undefined);
  });

  const fixtureSlice = () => COST.slice(-period());
  const fixtureTotal = () => fixtureSlice().reduce((sum, value) => sum + value, 0);

  return (
    <div data-screen-label="Analytics" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", "align-items": "flex-end", gap: "16px", "flex-wrap": "wrap" }}>
        <div style={{ flex: "1" }}>
          <div style={{ "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Sistema</div>
          <h1 style={{ margin: "8px 0 0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em" }}>Analytics</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", "max-width": "640px" }}>Custo por dia, por modelo e por projeto, lido da telemetria local. O teto aparece no próprio gráfico.</p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <For each={[7, 14, 30]}>
            {(days) => (
              <button type="button" onClick={() => setPeriod(days)} style={{ height: "32px", padding: "0 12px", "border-radius": "999px", border: "1px solid var(--line)", background: period() === days ? "var(--surface-1)" : "transparent", color: "var(--text-primary)", cursor: "pointer" }}>{days} dias</button>
            )}
          </For>
        </div>
      </div>
      <div style={{ display: "flex", gap: "18px", "border-bottom": "1px solid var(--line)" }}>
        <A href="/analytics" style={{ padding: "8px 0", "border-bottom": "2px solid var(--teal)", color: "var(--text-primary)", "text-decoration": "none", "font-weight": "600" }}>Analytics</A>
        <A href="/doctor" style={{ padding: "8px 0", color: "var(--text-muted)", "text-decoration": "none" }}>Doctor</A>
        <A href="/skills" style={{ padding: "8px 0", color: "var(--text-muted)", "text-decoration": "none" }}>Skills</A>
        <A href="/org-chart" style={{ padding: "8px 0", color: "var(--text-muted)", "text-decoration": "none" }}>Org Chart</A>
      </div>

      <Show when={series.error}>
        <p role="alert">{series.error.message}</p>
      </Show>

      <Show when={visualFixture()}>
        <div style={{ display: "grid", "grid-template-columns": "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
          <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
            <span style={{ display: "block", "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Custo no período</span>
            <strong data-metric="usd" style={{ "font-size": "28px" }}>US$ {fixtureTotal().toFixed(2).replace(".", ",")}</strong>
            <small style={{ display: "block", color: "var(--text-muted)" }}>{period()} dias · todos os modelos</small>
          </article>
          <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
            <span style={{ display: "block", "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Média diária</span>
            <strong style={{ "font-size": "28px" }}>US$ {(fixtureTotal() / period()).toFixed(2).replace(".", ",")}</strong>
            <small style={{ display: "block", color: "var(--text-muted)" }}>teto diário US$ 12</small>
          </article>
          <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
            <span style={{ display: "block", "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Tokens</span>
            <strong data-metric="tokens" style={{ "font-size": "28px" }}>{(fixtureTotal() * 0.21).toFixed(1).replace(".", ",")} M</strong>
            <small style={{ display: "block", color: "var(--text-muted)" }}>entrada + saída</small>
          </article>
          <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
            <span style={{ display: "block", "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Jobs concluídos</span>
            <strong style={{ "font-size": "28px" }}>{Math.round(period() * 2.9)}</strong>
            <small style={{ display: "block", color: "var(--text-muted)" }}>86% sem retrabalho</small>
          </article>
        </div>
        <section aria-label="Série de custo" style={{ "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)", padding: "16px 18px" }}>
          <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
            <h2 style={{ margin: "0", "font-size": "14px" }}>Custo por dia</h2>
            <span style={{ "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>US$ · {period()} dias · dados do protótipo</span>
            <span style={{ flex: "1" }} />
            <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>dentro do teto · acima de US$ 9</span>
          </div>
          <div style={{ position: "relative", "margin-top": "18px" }}>
            <div style={{ position: "absolute", left: "0", right: "0", top: `${200 * (1 - 12 / 12.5)}px`, "border-top": "1px dashed var(--danger)" }}>
              <span style={{ position: "absolute", right: "0", top: "-18px", "font-size": "10.5px", color: "var(--danger)" }}>teto diário US$ 12</span>
            </div>
            <div style={{ display: "flex", "align-items": "flex-end", gap: "4px", height: "200px" }}>
              <For each={fixtureSlice()}>
                {(usd, index) => (
                  <div data-day={`fixture-${index()}`} style={{ flex: "1", height: "100%", display: "flex", "align-items": "flex-end" }}>
                    <div data-usd style={{ display: "none" }}>{usd}</div>
                    <div style={{ width: "100%", height: `${(usd / 12.5) * 100}%`, "border-radius": "4px 4px 0 0", background: usd > 9 ? "var(--warning)" : "var(--flow)" }} />
                  </div>
                )}
              </For>
            </div>
            <div style={{ display: "flex", "justify-content": "space-between", "margin-top": "8px", "font-size": "10.5px", color: "var(--text-muted)" }}>
              <span>16/10</span><span>29/10</span>
            </div>
          </div>
        </section>
        <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "16px" }}>
          <section style={{ "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)", padding: "16px 18px" }}>
            <h2 style={{ margin: "0 0 14px", "font-size": "14px" }}>Por modelo</h2>
            <For each={MODELS}>
              {(row) => (
                <div style={{ display: "grid", "grid-template-columns": "130px minmax(0, 1fr) 46px", gap: "12px", "align-items": "center", "margin-bottom": "12px" }}>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "12px" }}>{row[0]}</span>
                  <div style={{ height: "8px", "border-radius": "999px", background: "var(--surface-3)" }}><div style={{ height: "8px", width: `${row[1]}%`, "border-radius": "999px", background: "var(--flow)" }} /></div>
                  <span style={{ "text-align": "right" }}>{row[1]}%</span>
                </div>
              )}
            </For>
          </section>
          <section style={{ "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)", padding: "16px 18px" }}>
            <h2 style={{ margin: "0 0 14px", "font-size": "14px" }}>Por projeto</h2>
            <div style={{ display: "flex", height: "14px", "border-radius": "999px", overflow: "hidden", gap: "2px", "margin-bottom": "14px" }}>
              <For each={PROJECTS}>{(row) => <i style={{ width: `${row[1]}%`, background: row[2] }} />}</For>
            </div>
            <For each={PROJECTS}>
              {(row) => (
                <div style={{ display: "flex", "align-items": "center", gap: "10px", "font-size": "13px", "margin-bottom": "8px" }}>
                  <i style={{ width: "10px", height: "10px", "border-radius": "3px", background: row[2] }} />
                  <span style={{ flex: "1" }}>{row[0]}</span>
                  <span style={{ color: "var(--text-muted)" }}>{row[1]}%</span>
                </div>
              )}
            </For>
          </section>
        </div>
      </Show>

      <Show when={!visualFixture() && series()}>
        {(body) => {
          const peak = Math.max(...body().days.map((day) => day.usd), 1);
          return (
            <>
              <div style={{ display: "flex", gap: "16px" }}>
                <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
                  <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted)" }}>Custo de motor</span>
                  <strong data-metric="usd" style={{ "font-size": "28px" }}>US$ {body().total_usd}</strong>
                </article>
                <article style={{ padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
                  <span style={{ display: "block", "font-size": "12px", color: "var(--text-muted)" }}>Tokens</span>
                  <strong data-metric="tokens" style={{ "font-size": "28px" }}>{body().total_tokens}</strong>
                </article>
              </div>
              <section aria-label="Série de custo" style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                <For each={body().days}>
                  {(day) => (
                    <div data-day={day.day} style={{ display: "grid", "grid-template-columns": "110px minmax(0, 1fr) 80px", gap: "12px", "align-items": "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{day.day}</span>
                      <div style={{ height: "18px", "border-radius": "6px", background: "var(--surface-2)" }}>
                        <div style={{ height: "18px", width: `${(day.usd / peak) * 100}%`, "min-width": "4px", "border-radius": "6px", background: "var(--lime)" }} />
                      </div>
                      <span data-usd>{day.usd}</span>
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
