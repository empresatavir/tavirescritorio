import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { api } from "../../shared/api/client";
import { showToast } from "../../state/store";
import "./project-ai-dialog.css";

type EffortOption = { id: string; label: string };
type ModelOption = { id: string; label: string; efforts: EffortOption[] };
type EngineOption = { id: string; label: string; models: ModelOption[] };

function preferredEffort(options: EffortOption[], current: string): string {
  if (options.some((item) => item.id === current)) return current;
  return (
    options.find((item) => item.id === "xhigh")?.id ||
    options.find((item) => item.id === "balanced")?.id ||
    options[0]?.id ||
    "xhigh"
  );
}

export function ProjectAiDialog(props: {
  projectId: string | null;
  projectName?: string;
  onClose: () => void;
}) {
  const [provider, setProvider] = createSignal("ghostcli");
  const [model, setModel] = createSignal("claude-opus-5-5");
  const [effort, setEffort] = createSignal("xhigh");
  const [cursorOn, setCursorOn] = createSignal(false);
  const [engines, setEngines] = createSignal<EngineOption[]>([]);
  const [busy, setBusy] = createSignal(false);
  let providerEl: HTMLSelectElement | undefined;
  let modelEl: HTMLSelectElement | undefined;
  let effortEl: HTMLSelectElement | undefined;

  const engine = createMemo(() => engines().find((item) => item.id === provider()) || engines()[0]);
  const models = createMemo(() => engine()?.models || []);
  const efforts = createMemo(() => models().find((item) => item.id === model())?.efforts || []);

  createEffect(() => {
    const id = props.projectId;
    if (!id) return;
    setBusy(true);
    void api
      .getProjectAiSettings(id)
      .then((data) => {
        const list = data.engines || [];
        const savedEngine = list.find((item) => item.id === data.provider) || list[0];
        const savedModel = savedEngine?.models.find((item) => item.id === data.model) || savedEngine?.models[0];
        setCursorOn(data.cursor_enabled);
        setEngines(list);
        setProvider(savedEngine?.id || "ghostcli");
        setModel(savedModel?.id || data.model);
        setEffort(preferredEffort(savedModel?.efforts || [], data.effort));
      })
      .catch(() => showToast("Não foi possível ler o motor deste projeto."))
      .finally(() => setBusy(false));
  });

  createEffect(() => {
    const value = provider();
    if (providerEl && engines().length) providerEl.value = value;
  });
  createEffect(() => {
    const value = model();
    if (modelEl && models().length) modelEl.value = value;
  });
  createEffect(() => {
    const value = effort();
    if (effortEl && efforts().length) effortEl.value = value;
  });

  const chooseProvider = (next: string) => {
    const chosen = engines().find((item) => item.id === next);
    const nextModel = chosen?.models.find((item) => item.id === model()) || chosen?.models[0];
    setProvider(next);
    if (nextModel) {
      setModel(nextModel.id);
      setEffort(preferredEffort(nextModel.efforts, effort()));
    }
  };

  const chooseModel = (next: string) => {
    const spec = models().find((item) => item.id === next);
    setModel(next);
    if (spec) setEffort(preferredEffort(spec.efforts, effort()));
  };

  const save = async () => {
    const id = props.projectId;
    if (!id) return;
    setBusy(true);
    try {
      await api.saveProjectAiSettings(id, { model: model(), effort: effort() });
      showToast("Motor, modelo e esforço deste projeto foram salvos.");
      props.onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={props.projectId}>
      <div class="pai-backdrop" role="presentation" onClick={() => props.onClose()}>
        <div
          class="pai-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pai-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="pai-title">Configurações do projeto</h2>
          <p>{props.projectName || "Projeto"}</p>
          <Show when={engines().length > 0} fallback={<p>Lendo as configurações.</p>}>
            <label>
              Motor de IA
              <select
                ref={providerEl}
                disabled={busy()}
                onChange={(event) => chooseProvider(event.currentTarget.value)}
              >
                <For each={engines()}>
                  {(item) => (
                    <option value={item.id} disabled={item.id === "cursor" && !cursorOn()}>
                      {item.label}
                      {item.id === "cursor" && !cursorOn() ? " · ligue em Integrações" : ""}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <label>
              Modelo
              <select ref={modelEl} disabled={busy()} onChange={(event) => chooseModel(event.currentTarget.value)}>
                <For each={models()}>
                  {(item) => (
                    <option value={item.id} selected={item.id === model()}>
                      {item.label}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <Show when={model() !== "auto-smart"}>
              <label>
                Esforço
                <select ref={effortEl} disabled={busy()} onChange={(event) => setEffort(event.currentTarget.value)}>
                  <For each={efforts()}>
                    {(item) => (
                      <option value={item.id} selected={item.id === effort()}>
                        {item.label}
                      </option>
                    )}
                  </For>
                </select>
              </label>
            </Show>
          </Show>
          <p class="pai-note">
            {model() === "auto-smart"
              ? "O próximo agente usa o Cursor no modelo Auto. Esta instalação não aplica Cost, Balance ou Intelligence."
              : "O próximo agente deste projeto usa este motor, este modelo e este esforço."}
          </p>
          <div class="pai-actions">
            <button type="button" onClick={() => props.onClose()}>
              Cancelar
            </button>
            <button type="button" class="is-primary" disabled={busy()} onClick={() => void save()}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
