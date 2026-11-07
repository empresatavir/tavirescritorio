import { createResource, createSignal, Show } from "solid-js";
import { TOURS, type TourKey } from "./tours";

export function TourView() {
  const [seen, { refetch }] = createResource(async () => {
    const res = await fetch("/api/v1/tours");
    if (!res.ok) throw new Error("O fluxo guiado não respondeu.");
    return ((await res.json()) as { seen: string[] }).seen;
  });
  const [key, setKey] = createSignal<TourKey | null>(null);
  const [step, setStep] = createSignal(0);
  const tour = () => (key() ? TOURS[key() as TourKey] : null);
  const current = () => tour()?.steps[step()] ?? null;
  const last = () => {
    const active = tour();
    return active ? step() === active.steps.length - 1 : false;
  };

  const open = (next: TourKey) => {
    setKey(next);
    setStep(0);
  };

  const conclude = async () => {
    const id = key();
    if (!id) return;
    const res = await fetch(`/api/v1/tours/${id}/complete`, { method: "POST" });
    if (!res.ok) return;
    setKey(null);
    setStep(0);
    await refetch();
  };

  const marked = (id: TourKey) => (seen()?.includes(id) ? "sim" : "nao");

  return (
    <div data-screen-label="Fluxo guiado" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px", color: "var(--text-primary)" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em" }}>Fluxo guiado</h1>
      <Show when={seen.error}>
        <p role="alert">{(seen.error as Error).message}</p>
      </Show>
      <Show
        when={current()}
        fallback={
          <section style={{ display: "flex", "flex-direction": "column", gap: "12px", "max-width": "520px" }}>
            <h2 style={{ margin: "0", "font-size": "18px" }}>Escolha um percurso</h2>
            <p style={{ margin: "0", color: "var(--text-secondary)" }}>O protótipo navega sozinho. Você lê o porquê de cada tela e pode clicar em tudo no caminho.</p>
            <button type="button" data-tour="exec" data-seen={marked("exec")} onClick={() => open("exec")}>
              Ciclo de execução
            </button>
            <button type="button" data-tour="client" data-seen={marked("client")} onClick={() => open("client")}>
              Jornada do cliente
            </button>
          </section>
        }
      >
        {(row) => (
          <article data-tour-step={String(step())} style={{ display: "flex", "flex-direction": "column", gap: "12px", "max-width": "640px" }}>
            <p style={{ margin: "0", color: "var(--text-muted)" }}>{tour()?.name} · {step() + 1}</p>
            <h2 style={{ margin: "0", "font-size": "22px" }}>{row().title}</h2>
            <p style={{ margin: "0", color: "var(--text-secondary)" }}>{row().body}</p>
            <p style={{ margin: "0" }}>
              <b>Por que importa.</b> <span data-why>{row().why}</span>
            </p>
            <p data-where style={{ margin: "0", color: "var(--text-muted)" }}>{row().where}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" disabled={step() === 0} onClick={() => setStep(step() - 1)}>Anterior</button>
              <button type="button" onClick={() => (last() ? void conclude() : setStep(step() + 1))}>
                {last() ? "Concluir" : "Próximo"}
              </button>
            </div>
          </article>
        )}
      </Show>
    </div>
  );
}
