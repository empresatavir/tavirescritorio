import { createResource, createSignal, For, Show } from "solid-js";

interface DoctorDimension {
  dimension: string;
  score: number;
  status: string;
  signal: string;
}

interface DoctorReport {
  overall_score: number;
  status: string;
  dimensions: DoctorDimension[];
}

export function DoctorView() {
  const [notice, setNotice] = createSignal("");
  const [report] = createResource(async () => {
    const res = await fetch("/api/v1/doctor/checks");
    if (!res.ok) throw new Error("O Doctor não respondeu.");
    return (await res.json()) as DoctorReport;
  });

  const restart = async (serviceId: string) => {
    setNotice("");
    const res = await fetch(`/api/v1/services/${serviceId}/restart`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setNotice(typeof body.message === "string" ? body.message : "O serviço não respondeu.");
  };

  return (
    <div data-screen-label="Doctor" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Doctor</h1>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={() => void restart("backend")}>Reiniciar backend</button>
        <button type="button" onClick={() => void restart("frontend")}>Reiniciar frontend</button>
      </div>
      <Show when={notice()}>
        <p data-restart>{notice()}</p>
      </Show>
      <Show when={report.error}>
        <p role="alert">{report.error.message}</p>
      </Show>
      <Show when={report()}>
        {(body) => (
          <>
            <p data-overall style={{ margin: "0", color: "var(--text-secondary)" }}>Score {body().overall_score}</p>
            <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
              <For each={body().dimensions}>
                {(row) => (
                  <article data-check={row.dimension} style={{ display: "flex", "flex-direction": "column", gap: "4px", padding: "12px 16px", "border-radius": "12px", border: "1px solid var(--line, rgba(244,246,242,.14))" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{row.dimension}</strong>
                    <span data-score style={{ color: "var(--text-secondary)" }}>{row.score}</span>
                    <p data-signal style={{ margin: "0", color: "var(--text-secondary)" }}>{row.signal}</p>
                  </article>
                )}
              </For>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}
