import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { api } from "../../../shared/api/client";

type EffortOption = { id: string; label: string };
type ModelOption = { id: string; label: string; efforts: EffortOption[] };
type EngineOption = { id: string; label: string; enabled?: boolean; is_default?: boolean; models: ModelOption[] };

function preferredEffort(options: EffortOption[], current: string): string {
  if (options.some((item) => item.id === current)) return current;
  return options.find((item) => item.id === "balanced")?.id || options.find((item) => item.id === "xhigh")?.id || options[0]?.id || "balanced";
}

export function RedoDialog(props: {
  open: boolean;
  mode: "gate" | "project";
  projectId: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (body: { note: string; model: string; effort: string }) => void;
}) {
  const [note, setNote] = createSignal("");
  const [provider, setProvider] = createSignal("");
  const [model, setModel] = createSignal("");
  const [effort, setEffort] = createSignal("");
  const [engines, setEngines] = createSignal<EngineOption[]>([]);
  const [engineOn, setEngineOn] = createSignal(true);
  const [loading, setLoading] = createSignal(false);

  const engine = createMemo(() => engines().find((item) => item.id === provider()) || engines()[0]);
  const models = createMemo(() => engine()?.models || []);
  const efforts = createMemo(() => models().find((item) => item.id === model())?.efforts || []);

  let opened = false;
  createEffect(() => {
    const isOpen = props.open;
    if (isOpen && !opened) {
      setNote("");
      setLoading(true);
      void api
        .getProjectAiSettings(props.projectId)
        .then((data) => {
          const list = (data.engines || []).filter((item) => item.enabled !== false);
          const chosen = list.find((item) => item.id === data.provider) || list.find((item) => item.is_default) || list[0];
          const savedModel = chosen?.models.find((item) => item.id === data.model) || chosen?.models[0];
          setEngines(list);
          setEngineOn(data.engine_enabled !== false && Boolean(chosen));
          setProvider(chosen?.id || "");
          setModel(savedModel?.id || "");
          setEffort(preferredEffort(savedModel?.efforts || [], data.effort));
        })
        .catch(() => {
          setEngines([]);
          setEngineOn(false);
        })
        .finally(() => setLoading(false));
    }
    opened = isOpen;
  });

  const chooseModel = (next: string) => {
    const spec = models().find((item) => item.id === next);
    setModel(next);
    if (spec) setEffort(preferredEffort(spec.efforts, effort()));
  };

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
            if (!model()) return;
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
          <Show
            when={!loading() && engines().length > 0 && engineOn()}
            fallback={
              <p class="fc-sub">
                {loading()
                  ? "Lendo os motores ligados em Integrações."
                  : "Nenhum motor ligado. Ligue o motor em Integrações para refazer."}
              </p>
            }
          >
            <label class="fc-modal-field">
              Motor de IA
              <select value={provider()} disabled>
                <For each={engines()}>
                  {(item) => (
                    <option value={item.id}>
                      {item.label}
                      {item.is_default || item.id === provider() ? " · padrão" : ""}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <div class="fc-modal-row">
              <label class="fc-modal-field">
                Modelo
                <select value={model()} onChange={(e) => chooseModel(e.currentTarget.value)}>
                  <For each={models()}>
                    {(item) => <option value={item.id}>{item.label}</option>}
                  </For>
                </select>
              </label>
              <Show when={model() !== "auto-smart"}>
                <label class="fc-modal-field">
                  Esforço
                  <select value={effort()} onChange={(e) => setEffort(e.currentTarget.value)}>
                    <For each={efforts()}>
                      {(item) => <option value={item.id}>{item.label}</option>}
                    </For>
                  </select>
                </label>
              </Show>
            </div>
            <p class="fc-sub">
              {model() === "auto-smart"
                ? "O escritório usa o motor padrão ligado em Integrações. O modelo é Auto."
                : "Os motores desligados em Integrações ficam fora desta lista. O padrão do escritório é o motor desta chamada."}
            </p>
          </Show>
          <div class="fc-btn-row">
            <button type="button" class="fc-btn-sec" disabled={props.busy} onClick={() => props.onClose()}>
              Cancelar
            </button>
            <button type="submit" class="fc-btn" disabled={props.busy || loading() || !model() || !engineOn()}>
              {props.busy ? "Aplicando…" : props.mode === "project" ? "Reiniciar esteira" : "Refazer entrega"}
            </button>
          </div>
        </form>
      </div>
    </Show>
  );
}
