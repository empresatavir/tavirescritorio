import { For, Show, createEffect, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { TvIcon } from "../../../shared/components/TvIcon";
import "../new-profile/modal.css";

export interface EditorialInstructions {
  lines: string[];
  toneOfVoice: string;
}

export function EditInstructionsModal(props: {
  open: boolean;
  initial: EditorialInstructions;
  onClose: () => void;
  onSave: (next: EditorialInstructions) => void;
}) {
  const [lines, setLines] = createSignal<string[]>([]);
  const [tone, setTone] = createSignal("");

  createEffect(() => {
    if (props.open) {
      setLines([...props.initial.lines]);
      setTone(props.initial.toneOfVoice);
    }
  });

  const updateLine = (idx: number, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? value : l)));
  };

  const addLine = () => setLines((prev) => [...prev, ""]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const canSave = () =>
    tone().trim().length > 0 && lines().some((l) => l.trim().length > 0);

  return (
    <Show when={props.open}>
      <Portal>
        <div class="stu-modal-root" role="presentation">
          <button type="button" class="stu-modal-backdrop" aria-label="Fechar" onClick={props.onClose} />
          <div class="stu-modal" role="dialog" aria-modal="true" aria-labelledby="stu-edit-inst-title">
            <header class="stu-modal-head">
              <div>
                <p class="stu-modal-step">Mesa do Oráculo · perfil</p>
                <h2 id="stu-edit-inst-title">Editar instruções editoriais</h2>
                <p class="stu-modal-lead">
                  Essas regras entram em toda pauta gerada para este perfil — tensão, prova, tom e
                  fechamento.
                </p>
              </div>
              <button type="button" class="stu-modal-close" onClick={props.onClose} aria-label="Fechar">
                <TvIcon name="circle-x" width="18" height="18" />
              </button>
            </header>

            <div class="stu-modal-body">
              <label class="stu-field" style={{ "margin-bottom": "14px" }}>
                <span>Tom de voz</span>
                <input
                  value={tone()}
                  onInput={(e) => setTone(e.currentTarget.value)}
                  placeholder="Ex.: didático, direto e sem hype"
                />
              </label>

              <div class="stu-inst-list-head">
                <p class="stu-modal-step">Instruções (uma por linha)</p>
                <button type="button" class="stu-btn-sm" style={{ height: "28px" }} onClick={addLine}>
                  + Adicionar
                </button>
              </div>

              <div class="stu-inst-list">
                <For each={lines()}>
                  {(line, i) => (
                    <div class="stu-inst-row">
                      <span class="stu-inst-idx">{String(i() + 1).padStart(2, "0")}</span>
                      <input
                        value={line}
                        onInput={(e) => updateLine(i(), e.currentTarget.value)}
                        placeholder="Ex.: Começar pela tensão, nunca pelo conceito"
                      />
                      <button
                        type="button"
                        class="stu-inst-remove"
                        aria-label="Remover instrução"
                        disabled={lines().length <= 1}
                        onClick={() => removeLine(i())}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <footer class="stu-modal-foot">
              <button type="button" class="stu-btn-ghost" onClick={props.onClose}>
                Cancelar
              </button>
              <button
                type="button"
                class="stu-btn-solid"
                disabled={!canSave()}
                onClick={() =>
                  props.onSave({
                    lines: lines()
                      .map((l) => l.trim())
                      .filter(Boolean),
                    toneOfVoice: tone().trim(),
                  })
                }
              >
                Salvar instruções
              </button>
            </footer>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
