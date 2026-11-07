import { type Component, createSignal, createMemo, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { api } from "../../shared/api/client";
import { type UiTask } from "../../state/store";

interface CatalogEffort {
  id: string;
  label: string;
}

interface CatalogModel {
  id: string;
  label: string;
  efforts: CatalogEffort[];
}

export interface PlanTaskModalProps {
  task: UiTask | null;
  isOpen?: boolean;
  submitting?: boolean;
  onClose?: () => void;
  onConfirmPlan?: (payload: {
    taskId: string;
    taskSeq: number;
    aiModel: string;
    modelName: string;
    effortId: string;
    effortLabel: string;
    providerId: string;
    orchestrator: string;
  }) => void | Promise<void>;
}

export const PlanTaskModal: Component<PlanTaskModalProps> = (props) => {
  const [catalog, setCatalog] = createSignal<CatalogModel[]>([]);
  const [providerId, setProviderId] = createSignal("");
  const [providerLabel, setProviderLabel] = createSignal("Motor padrão");
  const [engineOn, setEngineOn] = createSignal(true);
  const [officeEffort, setOfficeEffort] = createSignal("");
  const [selectedModel, setSelectedModel] = createSignal("");
  const [selectedEffort, setSelectedEffort] = createSignal("");
  const [loadingCatalog, setLoadingCatalog] = createSignal(false);
  const [showEffortHelp, setShowEffortHelp] = createSignal(false);
  const [localBusy, setLocalBusy] = createSignal(false);

  const fitEffort = (model: CatalogModel | undefined, preferred: string) => {
    if (!model) return "";
    return model.efforts.find((item) => item.id === preferred)?.id || model.efforts[0]?.id || "";
  };

  const activeModel = createMemo(() => catalog().find((item) => item.id === selectedModel()) || catalog()[0]);
  const efforts = createMemo(() => activeModel()?.efforts || []);
  const isAuto = createMemo(() => selectedModel() === "auto-smart");
  const effortIndex = createMemo(() => {
    const index = efforts().findIndex((item) => item.id === selectedEffort());
    return index < 0 ? 0 : index;
  });
  const effortLabel = createMemo(() => efforts().find((item) => item.id === selectedEffort())?.label || "");
  const standardEffort = createMemo(() => activeModel()?.efforts.find((item) => item.id === officeEffort())?.id || "");
  const planning = () => Boolean(props.submitting || localBusy());
  const busy = () => planning() || loadingCatalog();

  createEffect(() => {
    if (!props.isOpen) return;
    setShowEffortHelp(false);
    setLoadingCatalog(true);
    void api
      .getOfficeAi()
      .then((office) => {
        const engine = office.engines.find((item) => item.id === office.provider) || office.engines[0];
        const models = engine?.models || [];
        setCatalog(models);
        setProviderId(engine?.id || office.provider);
        setProviderLabel(office.provider_label || engine?.label || office.provider);
        setEngineOn(office.engine_enabled !== false && models.length > 0);
        setOfficeEffort(office.effort);
        const model = models.find((item) => item.id === office.model) || models[0];
        setSelectedModel(model?.id || "");
        setSelectedEffort(fitEffort(model, office.effort));
      })
      .catch(() => {
        setCatalog([]);
        setEngineOn(false);
      })
      .finally(() => setLoadingCatalog(false));
  });

  const handleModelSelect = (model: CatalogModel) => {
    setSelectedModel(model.id);
    setSelectedEffort(fitEffort(model, officeEffort() || selectedEffort()));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;
    if (e.key === "Escape" && props.onClose && !planning()) {
      props.onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && props.task && !busy() && engineOn() && selectedModel()) {
      handleConfirm();
    }
  };

  onMount(() => window.addEventListener("keydown", handleKeyDown));
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  const handleConfirm = async () => {
    if (!props.task || busy() || !engineOn() || !selectedModel()) return;
    setLocalBusy(true);
    try {
      await props.onConfirmPlan?.({
        taskId: props.task.id,
        taskSeq: props.task.seq,
        aiModel: selectedModel(),
        modelName: activeModel()?.label || selectedModel(),
        effortId: isAuto() ? officeEffort() : selectedEffort(),
        effortLabel: isAuto() ? "Auto" : effortLabel(),
        providerId: providerId(),
        orchestrator: "Paula (Product Manager)",
      });
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <Show when={(props.isOpen ?? true) && props.task}>
      {/* BACKDROP */}
      <div
        id="planModalBackdrop"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(11, 18, 32, 0.8)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
          transition: "opacity 0.2s ease",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && props.onClose) {
            props.onClose();
          }
        }}
      >
        <div
          class="modal relative w-full max-w-[560px] rounded-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Planejar tarefa"
          style={{
            background: "#0F172A",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            "box-shadow": "0 24px 64px rgba(0, 0, 0, 0.75)",
            color: "#F4F6F2",
          }}
        >
          {/* Top Glow Line DS TAVIR */}
          <div
            class="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(27, 197, 189, 0.5) 50%, transparent 100%)",
            }}
          />

          {/* HEADER */}
          <div
            class="flex items-start justify-between px-6 pt-5 pb-4"
            style={{ "border-bottom": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-lg font-semibold tracking-tight text-[#F4F6F2]">
                  Planejar tarefa
                </h2>
                <span
                  class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium"
                  style={{
                    background: "rgba(27, 197, 189, 0.1)",
                    border: "1px solid rgba(27, 197, 189, 0.25)",
                    color: "#1BC5BD",
                  }}
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: "#1BC5BD" }}
                  />
                  #{props.task?.seq}
                </span>
              </div>
              <p class="mt-1 text-xs" style={{ color: "rgba(244, 246, 242, 0.55)" }}>
                Paula (Product Manager) atuará como orquestradora para planejar e delegar esta demanda.
              </p>
            </div>

            <button
              type="button"
              disabled={planning()}
              onClick={() => props.onClose?.()}
              style={{
                background: "rgba(11, 18, 32, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(244, 246, 242, 0.6)",
                "border-radius": "9999px",
                padding: "3px 10px",
                "font-family": "var(--font-mono, monospace)",
                "font-size": "11px",
                cursor: busy() ? "wait" : "pointer",
                outline: "none",
                transition: "all 0.15s ease",
              }}
              title="Fechar modal (Esc)"
            >
              Esc
            </button>
          </div>

          {/* BODY */}
          <div class="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">
            
            {/* CARD RESUMO DA TAREFA SELECIONADA */}
            <div
              class="rounded-xl p-3.5"
              style={{
                background: "rgba(11, 18, 32, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-mono text-[11px]" style={{ color: "#1BC5BD" }}>
                  #{props.task?.seq} · {props.task?.sector || "Estratégia"}
                </span>
                <span
                  class="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "rgba(244, 246, 242, 0.6)",
                  }}
                >
                  {props.task?.priority || "Normal"}
                </span>
              </div>
              <h3 class="text-sm font-medium text-[#F4F6F2] line-clamp-2">
                {props.task?.title}
              </h3>
            </div>

            {/* RESPONSÁVEL POR PLANEJAMENTO */}
            <div>
              <label class="block text-xs font-medium mb-1.5" style={{ color: "rgba(244, 246, 242, 0.9)" }}>
                Agente Responsável pelo Planejamento
              </label>
              <div
                class="flex items-center justify-between rounded-xl px-3 py-2"
                style={{
                  background: "rgba(11, 18, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold"
                    style={{
                      background: "rgba(27, 197, 189, 0.15)",
                      border: "1px solid rgba(27, 197, 189, 0.3)",
                      color: "#1BC5BD",
                    }}
                  >
                    P
                  </div>
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-sm font-medium text-[#F4F6F2]">Paula</span>
                    <span class="text-xs" style={{ color: "rgba(244, 246, 242, 0.45)" }}>Product Manager · Orquestração</span>
                  </div>
                </div>
                <span
                  class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    color: "#1BC5BD",
                    background: "rgba(27, 197, 189, 0.1)",
                  }}
                >
                  ORQUESTRADORA
                </span>
              </div>
            </div>

            {/* BLOCO DE CONFIGURAÇÃO DE IA: MOTOR + SLIDER ANIMADO */}
            <div
              class="rounded-2xl p-4 space-y-4"
              style={{
                background: "rgba(11, 18, 32, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Seletor de Motor de IA */}
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-medium" style={{ color: "rgba(244, 246, 242, 0.9)" }}>
                    Motor de IA para Planejamento
                  </span>
                  <span class="font-mono text-[11px]" style={{ color: "#1BC5BD" }}>
                    ● {providerLabel()}
                  </span>
                </div>

                <Show
                  when={!loadingCatalog() && engineOn() && catalog().length > 0}
                  fallback={
                    <p class="text-xs" style={{ color: "rgba(244, 246, 242, 0.55)", margin: 0 }}>
                      {loadingCatalog()
                        ? "Lendo o motor padrão em Integrações."
                        : "O motor padrão está desligado. Ligue-o em Integrações."}
                    </p>
                  }
                >
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="modelGroup">
                    <For each={catalog()}>
                      {(model) => {
                        const isSelected = () => selectedModel() === model.id;
                        return (
                          <button
                            type="button"
                            onClick={() => handleModelSelect(model)}
                            style={{
                              background: isSelected() ? "rgba(27, 197, 189, 0.15)" : "rgba(15, 23, 42, 0.7)",
                              border: isSelected() ? "1px solid #1BC5BD" : "1px solid rgba(255, 255, 255, 0.06)",
                              "box-shadow": isSelected() ? "0 0 15px rgba(27, 197, 189, 0.12)" : "none",
                              "border-radius": "12px",
                              padding: "10px",
                              display: "flex",
                              "flex-direction": "column",
                              "align-items": "flex-start",
                              "text-align": "left",
                              cursor: "pointer",
                              outline: "none",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", width: "100%" }}>
                              <span style={{ "font-size": "12px", "font-weight": 600, color: "#F4F6F2", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                                {model.label}
                              </span>
                              <Show when={isSelected()}>
                                <span style={{ width: "6px", height: "6px", "border-radius": "9999px", background: "#B7F34A" }} />
                              </Show>
                            </div>
                            <span style={{ "margin-top": "2px", "font-family": "var(--font-mono, monospace)", "font-size": "10px", color: "rgba(244, 246, 242, 0.45)", width: "100%", overflow: "hidden", "text-overflow": "ellipsis" }}>
                              {model.id}
                            </span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>

              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)" }} />

              <Show when={!loadingCatalog() && Boolean(selectedModel())}>
              <Show
                when={!isAuto()}
                fallback={
                  <p class="text-xs" style={{ color: "rgba(244, 246, 242, 0.55)", margin: 0 }}>
                    O modelo é Auto. Esta instalação não aplica Cost, Balance ou Intelligence.
                  </p>
                }
              >
              <div class="pt-0.5">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-baseline gap-2">
                    <span class="text-sm" style={{ color: "rgba(244, 246, 242, 0.6)" }}>Nível de Esforço</span>
                    <span id="effortLabelText" class="text-sm font-semibold text-[#F4F6F2]">{effortLabel()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEffortHelp(!showEffortHelp())}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(244, 246, 242, 0.6)",
                      width: "20px",
                      height: "20px",
                      "border-radius": "9999px",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      cursor: "pointer",
                      "font-size": "11px",
                      "font-family": "var(--font-mono, monospace)",
                      outline: "none",
                      padding: 0,
                      transition: "all 0.15s ease",
                    }}
                    title="O que é o nível de esforço?"
                  >
                    ?
                  </button>
                </div>

                {/* Box de ajuda expansível ao clicar no (?) */}
                <Show when={showEffortHelp()}>
                  <div
                    id="effortHelpBox"
                    class="mb-2.5 rounded-lg px-3 py-1.5 text-xs"
                    style={{
                      background: "rgba(27, 197, 189, 0.1)",
                      border: "1px solid rgba(27, 197, 189, 0.2)",
                      color: "rgba(244, 246, 242, 0.85)",
                    }}
                  >
                    O esforço vem do motor padrão ligado em Integrações. O padrão desta instalação é {efforts().find((item) => item.id === officeEffort())?.label || effortLabel()}.
                  </div>
                </Show>

                {/* Labels Mais rápido <-> Mais inteligente */}
                <div class="flex items-center justify-between text-xs mb-2" style={{ color: "rgba(244, 246, 242, 0.55)" }}>
                  <span>Mais rápido</span>
                  <span>Mais inteligente</span>
                </div>

                {/* Barra Cápsula Interativa com SLIDER ANIMADO */}
                <div
                  class="relative select-none"
                  style={{
                    height: "36px",
                    background: "#162238",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    "border-radius": "12px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Preenchimento Dinâmico com Gradiente Suave */}
                  <div
                    id="effortProgressFill"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `calc(16px + (100% - 32px) * ${efforts().length > 1 ? effortIndex() / (efforts().length - 1) : 0})`,
                      background: "linear-gradient(90deg, rgba(27, 197, 189, 0.18) 0%, rgba(183, 243, 74, 0.22) 100%)",
                      "border-radius": "12px",
                      transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      "pointer-events": "none",
                    }}
                  />

                  {/* Marcadores estáticos em cada uma das 5 posições */}
                  <For each={efforts()}>
                    {(step, index) => {
                      const isRecommended = () => step.id === standardEffort();
                      const isCurrent = () => selectedEffort() === step.id;
                      const span = () => (efforts().length > 1 ? index() / (efforts().length - 1) : 0);

                      return (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: `calc(16px + (100% - 32px) * ${span()})`,
                            transform: "translate(-50%, -50%)",
                            "pointer-events": "none",
                            opacity: isCurrent() ? 0 : 1,
                            transition: "opacity 0.2s ease",
                            display: "flex",
                            "align-items": "center",
                            "justify-content": "center",
                          }}
                        >
                          <Show
                            when={isRecommended()}
                            fallback={
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  "border-radius": "9999px",
                                  background: "rgba(244, 246, 242, 0.35)",
                                }}
                              />
                            }
                          >
                            <span
                              style={{
                                width: "3.5px",
                                height: "14px",
                                "border-radius": "9999px",
                                background: "rgba(27, 197, 189, 0.85)",
                              }}
                            />
                          </Show>
                        </div>
                      );
                    }}
                  </For>

                  {/* THUMB DESLIZANTE FLUÍDO */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `calc(16px + (100% - 32px) * ${efforts().length > 1 ? effortIndex() / (efforts().length - 1) : 0})`,
                      transform: "translate(-50%, -50%)",
                      width: "24px",
                      height: "24px",
                      "border-radius": "8px",
                      background: "#B7F34A",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                      "box-shadow": "0 0 14px rgba(183, 243, 74, 0.65), 0 0 24px rgba(183, 243, 74, 0.25)",
                      transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s ease",
                      "pointer-events": "none",
                      "z-index": 10,
                    }}
                  />

                  {/* Zonas de clique transparentes nos 5 steps */}
                  <div class="absolute inset-0 flex z-20">
                    <For each={efforts()}>
                      {(step) => (
                        <button
                          type="button"
                          onClick={() => setSelectedEffort(step.id)}
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                          }}
                          aria-label={`Esforço ${step.label}`}
                        />
                      )}
                    </For>
                  </div>
                </div>

                <Show when={standardEffort()}>
                <div style={{ position: "relative", width: "100%", height: "20px", "margin-top": "6px" }}>
                  <button
                    id="recommendedBtn"
                    type="button"
                    onClick={() => setSelectedEffort(standardEffort())}
                    style={{
                      position: "absolute",
                      left: `calc(16px + (100% - 32px) * ${(() => { const list = efforts(); const at = list.findIndex((item) => item.id === standardEffort()); const pos = at < 0 ? 0 : at; return list.length > 1 ? pos / (list.length - 1) : 0; })()})`,
                      transform: "translateX(-50%)",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                      "font-family": "var(--font-mono, monospace)",
                      "font-size": "11px",
                      color: selectedEffort() === standardEffort() ? "#1BC5BD" : "rgba(244, 246, 242, 0.5)",
                      "font-weight": selectedEffort() === standardEffort() ? 600 : 400,
                      transition: "color 0.2s ease",
                      outline: "none",
                    }}
                  >
                    Padrão
                  </button>
                </div>
                </Show>
              </div>
              </Show>
              </Show>
            </div>

          </div>

          {/* FOOTER */}
          <div
            class="flex items-center justify-between px-6 py-4"
            style={{
              background: "rgba(11, 18, 32, 0.75)",
              "border-top": "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <button
              type="button"
              disabled={planning()}
              onClick={() => props.onClose?.()}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(244, 246, 242, 0.75)",
                "border-radius": "9999px",
                padding: "8px 16px",
                "font-size": "12px",
                "font-weight": 500,
                cursor: busy() ? "wait" : "pointer",
                outline: "none",
                transition: "all 0.15s ease",
              }}
            >
              Cancelar
            </button>

            <div class="flex items-center gap-3">
              <span class="hidden sm:inline-block font-mono text-[11px]" style={{ color: "rgba(244, 246, 242, 0.35)" }}>
                Ctrl + Enter
              </span>
              <button
                type="button"
                disabled={busy() || !engineOn() || !selectedModel()}
                onClick={handleConfirm}
                style={{
                  background: "#B7F34A",
                  color: "#0B1220",
                  border: "none",
                  "box-shadow": "0 0 20px rgba(183, 243, 74, 0.3)",
                  "border-radius": "9999px",
                  padding: "8px 20px",
                  "font-size": "12px",
                  "font-weight": 600,
                  cursor: busy() || !engineOn() || !selectedModel() ? "not-allowed" : "pointer",
                  opacity: busy() || !engineOn() || !selectedModel() ? 0.45 : 1,
                  outline: "none",
                  transition: "all 0.15s ease",
                }}
              >
                {planning() ? "Iniciando…" : "Planejar com Paula"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Show>
  );
};
