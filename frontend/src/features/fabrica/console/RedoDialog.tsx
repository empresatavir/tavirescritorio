import { createEffect, createSignal, Show } from "solid-js";

const MODELS = [
  { id: "claude-opus-5-5", label: "Opus" },
  { id: "claude-sonnet-5", label: "Sonnet" },
  { id: "claude-fable-5.1", label: "Fable" },
];

const EFFORTS = [
  { id: "low", label: "Baixo" },
  { id: "medium", label: "Médio" },
  { id: "high", label: "Alto" },
  { id: "xhigh", label: "Máximo" },
];

export function RedoDialog(props: {
  open: boolean;
  mode: "gate" | "project";
  busy?: boolean;
  model?: string;
  effort?: string;
  onClose: () => void;
  onSubmit: (body: { note: string; model: string; effort: string }) => void;
}) {
  const [note, setNote] = createSignal("");
  const [model, setModel] = createSignal(props.model || "claude-opus-5-5");
  const [effort, setEffort] = createSignal(props.effort || "xhigh");

  let opened = false;
  createEffect(() => {
    const isOpen = props.open;
    if (isOpen && !opened) {
      setNote("");
      setModel(props.model || "claude-opus-5-5");
      setEffort(props.effort || "xhigh");
    }
    opened = isOpen;
  });

  return (
    <Show when={props.open}>
      <div class="fc-modal-back" role="presentation" onClick={() => props.onClose()}>
        <form
          class="fc-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fc-redo-title"
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit({ note: note().trim(), model: model(), effort: effort() });
          }}
        >
          <p class="fc-micro">{props.mode === "project" ? "Reinício" : "Gate"}</p>
          <h2 id="fc-redo-title">
            {props.mode === "project" ? "Refazer o projeto do zero" : "Refazer a entrega deste gate"}
          </h2>
          <p class="fc-sub">
            {props.mode === "project"
              ? "A esteira volta ao Gate 0. A pasta do projeto permanece no disco."
              : "A etapa que alimenta este gate reabre com as instruções abaixo. Modelo e esforço valem daqui em diante."}
          </p>
          <label class="fc-modal-field">
            Como deve ser feito
            <textarea
              rows={4}
              value={note()}
              placeholder="O que ficou ruim e o que precisa mudar"
              onInput={(e) => setNote(e.currentTarget.value)}
            />
          </label>
          <div class="fc-modal-row">
            <label class="fc-modal-field">
              Motor
              <select value={model()} onChange={(e) => setModel(e.currentTarget.value)}>
                {MODELS.map((m) => (
                  <option value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
            <label class="fc-modal-field">
              Esforço
              <select value={effort()} onChange={(e) => setEffort(e.currentTarget.value)}>
                {EFFORTS.map((m) => (
                  <option value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div class="fc-btn-row">
            <button type="button" class="fc-btn-sec" disabled={props.busy} onClick={() => props.onClose()}>
              Cancelar
            </button>
            <button type="submit" class="fc-btn" disabled={props.busy}>
              {props.busy ? "Aplicando…" : props.mode === "project" ? "Reiniciar esteira" : "Refazer entrega"}
            </button>
          </div>
        </form>
      </div>
    </Show>
  );
}
