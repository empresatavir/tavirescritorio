import { For } from "solid-js";
import { TOURS } from "../tour/tours";

export function ComoFunciona() {
  const steps = TOURS.exec.steps;
  return (
    <div data-screen-label="Como funciona" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px", color: "var(--text-primary)" }}>
      <p style={{ margin: "0", color: "var(--text-muted)", "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase" }}>Mapa do ciclo completo</p>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em" }}>Como funciona</h1>
      <ol style={{ display: "flex", "flex-direction": "column", gap: "12px", "max-width": "720px", "padding-left": "20px" }}>
        <For each={steps}>
          {(step, index) => (
            <li data-cycle-step={String(index())}>
              <strong>{step.title}</strong>
              <p style={{ margin: "4px 0", color: "var(--text-secondary)" }}>{step.body}</p>
              <p style={{ margin: "0" }}><b>Por que importa.</b> {step.why}</p>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{step.where}</p>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}
