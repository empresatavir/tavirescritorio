import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { modalOpen, setModalOpen, setSelectedJobId, setCurrentScreenId, setCurrentDomainId, showToast, syncLiveJobs } from "../state/store";
import { api } from "../shared/api/client";
import { TvIcon } from "../shared/components/TvIcon";

export function JobModal() {
  const [step, setStep] = createSignal(0);
  const [engine, setEngine] = createSignal("");
  const [engineLabel, setEngineLabel] = createSignal("Motor padrão");
  const [models, setModels] = createSignal<Array<{ id: string; label: string; efforts: Array<{ id: string; label: string }> }>>([]);
  const [model, setModel] = createSignal("");
  const [effort, setEffort] = createSignal("");
  const [engineOn, setEngineOn] = createSignal(false);
  const [ceiling, setCeiling] = createSignal("5.00");
  const [ceilingError, setCeilingError] = createSignal("");
  const [title, setTitle] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const efforts = createMemo(() => models().find((item) => item.id === model())?.efforts || []);

  createEffect(() => {
    if (!modalOpen()) return;
    void api.getOfficeAi().then((office) => {
      const chosen = office.engines.find((item) => item.id === office.provider) || office.engines[0];
      const list = chosen?.models || [];
      setEngine(chosen?.id || office.provider);
      setEngineLabel(office.provider_label || chosen?.label || office.provider);
      setModels(list);
      setEngineOn(office.engine_enabled !== false && list.length > 0);
      const nextModel = list.find((item) => item.id === office.model) || list[0];
      setModel(nextModel?.id || "");
      const nextEffort = nextModel?.efforts.find((item) => item.id === office.effort) || nextModel?.efforts[0];
      setEffort(nextModel?.id === "auto-smart" ? "" : nextEffort?.id || "");
    }).catch(() => setEngineOn(false));
  });

  const resetForm = () => {
    setStep(0);
    setCeiling("5.00");
    setCeilingError("");
    setTitle("");
  };

  const ceilingValue = () => {
    const raw = ceiling().trim();
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  };

  const handleClose = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleNext = async () => {
    if (step() < 3) {
      setStep(step() + 1);
      return;
    }

    const teto = ceilingValue();
    if (teto == null) {
      setCeilingError("Informe o teto para continuar.");
      return;
    }
    setCeilingError("");
    setLoading(true);
    try {
      const resp = await api.createJob({
        command: "echo hello-tavir",
        timeout: 30,
        model_name: model() || undefined,
        effort: effort() || undefined,
        model_provider: engine() || undefined,
        budget_ceiling: teto,
      });
      setSelectedJobId(resp.id);
      setCurrentDomainId("op");
      setCurrentScreenId("exec");
      showToast("Job em execução", "Job em execução", "action");
      handleClose();
      await syncLiveJobs();
    } catch (e: any) {
      setCeilingError(e.message || "Erro ao iniciar job");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Motor", "Modelo", "Esforço", "Teto"];

  return (
    <Show when={modalOpen()}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,12,22,.65)",
          "backdrop-filter": "blur(4px)",
          display: "grid",
          "place-items": "center",
          "z-index": 100,
        }}
        onClick={handleClose}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Iniciar novo job"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "520px",
            "max-width": "calc(100vw - 32px)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            "border-radius": "var(--radius-lg)",
            padding: "24px",
            "box-shadow": "var(--shadow-elevated)",
            "font-family": "var(--font-body)",
            display: "flex",
            "flex-direction": "column",
            gap: "20px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between" }}>
            <h3 style={{ margin: 0, "font-size": "18px", "font-weight": 600, color: "var(--text-primary)" }}>
              Iniciar novo job
            </h3>
            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                "font-size": "16px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Stepper Wizard Bar */}
          <div style={{ display: "grid", "grid-template-columns": "repeat(4, 1fr)", gap: "8px" }}>
            <For each={stepLabels}>
              {(label, idx) => {
                const isCur = () => step() === idx();
                const isPassed = () => step() >= idx();
                return (
                  <div
                    onClick={() => setStep(idx())}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        height: "3px",
                        "border-radius": "var(--radius-pill)",
                        background: isPassed() ? "var(--lime)" : "rgba(244,246,242,.16)",
                        transition: "background var(--duration-fast) var(--ease-standard)",
                      }}
                    />
                    <div style={{ display: "flex", "align-items": "center", gap: "4px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "10px",
                          color: isCur() ? "var(--lime)" : "var(--text-muted)",
                        }}
                      >
                        0{idx() + 1}
                      </span>
                      <span
                        style={{
                          "font-size": "12px",
                          "font-weight": isCur() ? 600 : 400,
                          color: isCur() ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Step Contents */}
          <div style={{ "min-height": "180px" }}>
            {/* Step 0: Motor padrão do escritório */}
            <Show when={step() === 0}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Este job usa o motor padrão definido em Integrações.
                </p>
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "12px",
                    padding: "12px 14px",
                    "border-radius": "var(--radius-md)",
                    border: "1px solid var(--lime)",
                    background: "rgba(183,243,74,.08)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ "font-weight": 600, color: "var(--text-primary)" }}>{engineLabel()}</div>
                    <div style={{ "font-size": "11.5px", color: "var(--text-muted)" }}>
                      {engineOn()
                        ? "Modelos e esforços vêm deste motor."
                        : "O motor padrão está desligado. Ligue-o em Integrações."}
                    </div>
                  </div>
                  <span style={{ color: "var(--lime)", "font-weight": 700 }}>✓</span>
                </div>
              </div>
            </Show>

            {/* Step 1: Modelo */}
            <Show when={step() === 1}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Modelos de {engineLabel()}:
                </p>
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <For each={models()}>
                    {(item) => {
                      const sel = () => model() === item.id;
                      return (
                        <div
                          onClick={() => {
                            setModel(item.id);
                            const next = item.efforts.find((entry) => entry.id === effort()) || item.efforts[0];
                            setEffort(item.id === "auto-smart" ? "" : next?.id || "");
                          }}
                          style={{
                            display: "flex",
                            "align-items": "center",
                            gap: "12px",
                            padding: "12px 14px",
                            "border-radius": "var(--radius-md)",
                            border: `1px solid ${sel() ? "var(--lime)" : "var(--border-default)"}`,
                            background: sel() ? "rgba(183,243,74,.08)" : "var(--surface-0)",
                            cursor: "pointer",
                            transition: "all var(--duration-fast) var(--ease-standard)",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ "font-weight": 600, color: "var(--text-primary)" }}>{item.label}</div>
                            <div style={{ "font-family": "var(--font-mono)", "font-size": "11.5px", color: "var(--text-muted)" }}>
                              {item.id}
                            </div>
                          </div>
                          {sel() && <span style={{ color: "var(--lime)", "font-weight": 700 }}>✓</span>}
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Step 2: Esforço */}
            <Show when={step() === 2}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <Show
                  when={model() !== "auto-smart" && efforts().length > 0}
                  fallback={
                    <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                      O modelo é Auto. Esta instalação não aplica Cost, Balance ou Intelligence.
                    </p>
                  }
                >
                  <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                    Esforços disponíveis neste modelo:
                  </p>
                  <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                    <For each={efforts()}>
                      {(item) => {
                        const sel = () => effort() === item.id;
                        return (
                          <div
                            onClick={() => setEffort(item.id)}
                            style={{
                              display: "flex",
                              "align-items": "center",
                              gap: "12px",
                              padding: "12px 14px",
                              "border-radius": "var(--radius-md)",
                              border: `1px solid ${sel() ? "var(--lime)" : "var(--border-default)"}`,
                              background: sel() ? "rgba(183,243,74,.08)" : "var(--surface-0)",
                              cursor: "pointer",
                              transition: "all var(--duration-fast) var(--ease-standard)",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ "font-weight": 600, color: "var(--text-primary)" }}>{item.label}</div>
                            </div>
                            {sel() && <span style={{ color: "var(--lime)", "font-weight": 700 }}>✓</span>}
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Step 3: Teto & Título */}
            <Show when={step() === 3}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "14px" }}>
                <div>
                  <label style={{ "font-size": "12px", "font-weight": 600, color: "var(--text-secondary)" }}>
                    Título do Job (opcional)
                  </label>
                  <input
                    type="text"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    placeholder="Ex: Auditoria de segurança na rota de clientes"
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      "border-radius": "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-0)",
                      color: "var(--text-primary)",
                      "font-size": "14px",
                      outline: "none",
                      "margin-top": "4px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ "font-size": "12px", "font-weight": 600, color: "var(--text-secondary)" }}>
                    Teto de Gasto (US$)
                  </label>
                  <div style={{ display: "flex", "align-items": "center", gap: "8px", "margin-top": "4px" }}>
                    <span style={{ "font-family": "var(--font-mono)", color: "var(--text-muted)" }}>US$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      aria-label="Teto de gasto"
                      value={ceiling()}
                      onInput={(e) => {
                        setCeiling(e.currentTarget.value);
                        setCeilingError("");
                      }}
                      style={{
                        width: "120px",
                        height: "40px",
                        padding: "0 12px",
                        "border-radius": "var(--radius-sm)",
                        border: "1px solid var(--border-default)",
                        background: "var(--surface-0)",
                        color: "var(--text-primary)",
                        "font-family": "var(--font-mono)",
                        "font-size": "15px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <span style={{ "font-size": "11px", color: "var(--text-muted)", "margin-top": "4px", display: "block" }}>
                    O job será interrompido automaticamente caso ultrapasse este orçamento.
                  </span>
                  <Show when={ceilingError()}>
                    <span style={{ "font-size": "12px", color: "var(--danger, #ef4444)", "margin-top": "6px", display: "block" }}>
                      {ceilingError()}
                    </span>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "border-top": "1px solid var(--line)", "padding-top": "16px" }}>
            <button
              onClick={() => (step() > 0 ? setStep(step() - 1) : handleClose())}
              style={{
                height: "36px",
                padding: "0 16px",
                "border-radius": "var(--radius-pill)",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                "font-size": "13px",
              }}
            >
              {step() > 0 ? "Voltar" : "Cancelar"}
            </button>

            <button
              onClick={handleNext}
              disabled={loading() || !engineOn() || !model()}
              style={{
                height: "36px",
                padding: "0 20px",
                "border-radius": "var(--radius-pill)",
                border: "none",
                background: "var(--action-bg)",
                color: "var(--action-fg)",
                "font-weight": 600,
                cursor: loading() ? "not-allowed" : "pointer",
                opacity: loading() ? 0.6 : 1,
                "font-size": "13px",
                display: "inline-flex",
                "align-items": "center",
                gap: "6px",
              }}
            >
              <Show when={step() === 3}>
                <TvIcon name="play" width="13" height="13" />
              </Show>
              {loading() ? "Iniciando..." : step() < 3 ? "Continuar" : "Iniciar job"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
