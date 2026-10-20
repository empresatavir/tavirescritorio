import { For, Show, createEffect, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { TvIcon } from "../../../shared/components/TvIcon";
import "../new-profile/modal.css";

const ANGLE_STYLES = [
  { id: "livre", label: "Livre", desc: "O Oráculo escolhe as melhores tensões do radar." },
  { id: "contrarian", label: "Contrarian", desc: "Desconstruir senso comum com prova." },
  { id: "pratico", label: "Prático", desc: "Framework curto e acionável." },
  { id: "bastidores", label: "Bastidores", desc: "Processo real, gargalos e automações." },
];

const FINE_FIELDS = [
  { id: "hook", label: "Gancho de abertura" },
  { id: "angle", label: "Ângulo / tese" },
  { id: "tone", label: "Tom de voz" },
  { id: "proof", label: "Prova / fontes" },
];

export function NovoAnguloModal(props: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { style: string; avoid: string; seed: string }) => void;
}) {
  const [style, setStyle] = createSignal("livre");
  const [avoid, setAvoid] = createSignal("");
  const [seed, setSeed] = createSignal("");

  createEffect(() => {
    if (!props.open) {
      setStyle("livre");
      setAvoid("");
      setSeed("");
    }
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div class="stu-modal-root" role="presentation">
          <button type="button" class="stu-modal-backdrop" aria-label="Fechar" onClick={props.onClose} />
          <div class="stu-modal" role="dialog" aria-modal="true" aria-labelledby="stu-angulo-title">
            <header class="stu-modal-head">
              <div>
                <p class="stu-modal-step">Oráculo · regenerar opções</p>
                <h2 id="stu-angulo-title">Pedir novo ângulo</h2>
                <p class="stu-modal-lead">
                  O Oráculo descarta as três opções atuais e cruza radar + repertório de novo — com a
                  direção que você indicar.
                </p>
              </div>
              <button type="button" class="stu-modal-close" onClick={props.onClose} aria-label="Fechar">
                <TvIcon name="circle-x" width="18" height="18" />
              </button>
            </header>
            <div class="stu-modal-body">
              <p class="stu-modal-step" style={{ "margin-bottom": "10px" }}>
                Direção preferida
              </p>
              <div class="stu-pick-grid stu-pick-2">
                <For each={ANGLE_STYLES}>
                  {(s) => (
                    <button
                      type="button"
                      class="stu-pick-card"
                      classList={{ "is-on": style() === s.id }}
                      onClick={() => setStyle(s.id)}
                    >
                      <div>
                        <strong>{s.label}</strong>
                        <p>{s.desc}</p>
                      </div>
                      <span class="stu-check" classList={{ "is-on": style() === s.id }}>
                        {style() === s.id ? "✓" : ""}
                      </span>
                    </button>
                  )}
                </For>
              </div>
              <div class="stu-modal-grid" style={{ "margin-top": "14px" }}>
                <label class="stu-field stu-field-full">
                  <span>Semente opcional (tema ou tensão)</span>
                  <input
                    value={seed()}
                    onInput={(e) => setSeed(e.currentTarget.value)}
                    placeholder="Ex.: fadiga de ferramentas · decisão sob carga"
                  />
                </label>
                <label class="stu-field stu-field-full">
                  <span>Evitar nesta rodada</span>
                  <textarea
                    rows={2}
                    value={avoid()}
                    onInput={(e) => setAvoid(e.currentTarget.value)}
                    placeholder="Ex.: não usar Notion como gancho · sem promessa de produtividade milagrosa"
                  />
                </label>
              </div>
            </div>
            <footer class="stu-modal-foot">
              <button type="button" class="stu-btn-ghost" onClick={props.onClose}>
                Cancelar
              </button>
              <button
                type="button"
                class="stu-btn-solid"
                onClick={() =>
                  props.onSubmit({ style: style(), avoid: avoid().trim(), seed: seed().trim() })
                }
              >
                Gerar 3 novos ângulos
              </button>
            </footer>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

export function AjusteFinoModal(props: {
  open: boolean;
  selectedTitle?: string;
  onClose: () => void;
  onSubmit: (payload: { fields: string[]; notes: string; intensity: string }) => void;
}) {
  const [fields, setFields] = createSignal<string[]>(["hook"]);
  const [notes, setNotes] = createSignal("");
  const [intensity, setIntensity] = createSignal("medio");

  createEffect(() => {
    if (!props.open) {
      setFields(["hook"]);
      setNotes("");
      setIntensity("medio");
    }
  });

  const toggle = (id: string) => {
    setFields((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="stu-modal-root" role="presentation">
          <button type="button" class="stu-modal-backdrop" aria-label="Fechar" onClick={props.onClose} />
          <div class="stu-modal" role="dialog" aria-modal="true" aria-labelledby="stu-ajuste-title">
            <header class="stu-modal-head">
              <div>
                <p class="stu-modal-step">Opção selecionada · refinar</p>
                <h2 id="stu-ajuste-title">Ajuste fino</h2>
                <p class="stu-modal-lead">
                  Mantém a opção escolhida e pede ao Oráculo para recalibrar só o que você marcar —
                  sem regenerar as três alternativas.
                </p>
              </div>
              <button type="button" class="stu-modal-close" onClick={props.onClose} aria-label="Fechar">
                <TvIcon name="circle-x" width="18" height="18" />
              </button>
            </header>
            <div class="stu-modal-body">
              <Show when={props.selectedTitle}>
                <div class="stu-prod-summary" style={{ "margin-top": 0, "margin-bottom": "14px" }}>
                  <p class="stu-modal-step">Em ajuste</p>
                  <p>
                    <strong>{props.selectedTitle}</strong>
                  </p>
                </div>
              </Show>
              <p class="stu-modal-step" style={{ "margin-bottom": "10px" }}>
                O que ajustar
              </p>
              <div class="stu-pick-grid stu-pick-2">
                <For each={FINE_FIELDS}>
                  {(f) => (
                    <button
                      type="button"
                      class="stu-pick-card"
                      classList={{ "is-on": fields().includes(f.id) }}
                      onClick={() => toggle(f.id)}
                    >
                      <div>
                        <strong>{f.label}</strong>
                      </div>
                      <span class="stu-check" classList={{ "is-on": fields().includes(f.id) }}>
                        {fields().includes(f.id) ? "✓" : ""}
                      </span>
                    </button>
                  )}
                </For>
              </div>
              <div class="stu-modal-grid" style={{ "margin-top": "14px" }}>
                <label class="stu-field">
                  <span>Intensidade</span>
                  <select value={intensity()} onChange={(e) => setIntensity(e.currentTarget.value)}>
                    <option value="leve">Leve — polish de copy</option>
                    <option value="medio">Médio — reescrever gancho e tese</option>
                    <option value="forte">Forte — pivotar prova e CTA</option>
                  </select>
                </label>
                <label class="stu-field stu-field-full">
                  <span>Instrução para o Oráculo</span>
                  <textarea
                    rows={3}
                    value={notes()}
                    onInput={(e) => setNotes(e.currentTarget.value)}
                    placeholder="Ex.: gancho mais curto, menos Notion, mais tensão cognitiva"
                  />
                </label>
              </div>
            </div>
            <footer class="stu-modal-foot">
              <button type="button" class="stu-btn-ghost" onClick={props.onClose}>
                Cancelar
              </button>
              <button
                type="button"
                class="stu-btn-solid"
                disabled={fields().length === 0}
                onClick={() =>
                  props.onSubmit({
                    fields: fields(),
                    notes: notes().trim(),
                    intensity: intensity(),
                  })
                }
              >
                Aplicar ajuste
              </button>
            </footer>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
