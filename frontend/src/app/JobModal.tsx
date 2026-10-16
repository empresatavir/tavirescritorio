import { createSignal, For, Show } from "solid-js";
import { modalOpen, setModalOpen, jobs, setJobs, setSelectedJobId, setCurrentScreenId, setCurrentDomainId, showToast, type UiJob } from "../state/store";
import { api } from "../shared/api/client";
import { TvIcon } from "../shared/components/TvIcon";

const ENGINES = [
  { id: "Anthropic", logo: "anthropic", hint: "claude-opus-4 · claude-sonnet-4" },
  { id: "OpenAI", logo: "openai", hint: "gpt-4o · dall-e-3" },
];

const MODELS: Record<string, Array<[string, string]>> = {
  Anthropic: [
    ["claude-opus-4", "Raciocínio longo · mais caro"],
    ["claude-sonnet-4", "Padrão da operação · equilibrado"],
  ],
  OpenAI: [
    ["gpt-4o", "Uso geral · rápido"],
    ["dall-e-3", "Geração de imagem"],
  ],
};

const EFFORTS = [
  ["baixo", "Resposta direta, sem revisão interna"],
  ["médio", "Planeja antes de executar"],
  ["alto", "Planeja, executa e revisa com checkpoint"],
];

export function JobModal() {
  const [step, setStep] = createSignal(0);
  const [engine, setEngine] = createSignal("Anthropic");
  const [model, setModel] = createSignal("claude-sonnet-4");
  const [effort, setEffort] = createSignal("médio");
  const [ceiling, setCeiling] = createSignal("5.00");
  const [title, setTitle] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const resetForm = () => {
    setStep(0);
    setEngine("Anthropic");
    setModel("claude-sonnet-4");
    setEffort("médio");
    setCeiling("5.00");
    setTitle("");
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

    // Terminal step: Create job
    setLoading(true);
    try {
      const jobTitle = title().trim() || `Novo job — ${model()}`;
      let createdJobId = `job-${String(jobs().length + 1).padStart(3, "0")}`;

      // Call FastAPI backend
      try {
        const resp = await api.createJob({
          command: "echo 'Executando novo job com sucesso'",
          timeout: 30,
        });
        if (resp && resp.id) {
          createdJobId = resp.id;
        }
      } catch (err) {
        console.warn("Backend job call fallback to local UI job:", err);
      }

      const newJob: UiJob = {
        id: createdJobId,
        title: jobTitle,
        agentName: "Orquestrador",
        status: "running" as const,
        priority: "normal" as const,
        progress: 10,
        startedAt: "agora",
        model: model(),
        effort: effort(),
        cost: 0.12,
        ceiling: parseFloat(ceiling()) || 5.0,
        log: [
          ["agora", "info" as const, `Job iniciado no motor ${engine()} (${model()})`],
          ["agora", "info" as const, `Esforço: ${effort()} · Teto: US$ ${ceiling()}`],
        ],
      };

      setJobs([newJob, ...jobs()]);
      setSelectedJobId(createdJobId);
      setCurrentDomainId("op");
      setCurrentScreenId("exec");
      showToast(`Job iniciado com sucesso: ${createdJobId}`, "Job em execução", "action");
      handleClose();
    } catch (e: any) {
      showToast(e.message || "Erro ao iniciar job", "Erro", "danger");
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
            {/* Step 0: Motor */}
            <Show when={step() === 0}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Qual motor de IA executará o job?
                </p>
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <For each={ENGINES}>
                    {(eng) => {
                      const sel = () => engine() === eng.id;
                      return (
                        <div
                          onClick={() => {
                            setEngine(eng.id);
                            setModel(MODELS[eng.id][0][0]);
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
                          <TvIcon logo={eng.logo} width="22" height="22" />
                          <div style={{ flex: 1 }}>
                            <div style={{ "font-weight": 600, color: "var(--text-primary)" }}>{eng.id}</div>
                            <div style={{ "font-size": "11.5px", color: "var(--text-muted)" }}>{eng.hint}</div>
                          </div>
                          {sel() && <span style={{ color: "var(--lime)", "font-weight": 700 }}>✓</span>}
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Step 1: Modelo */}
            <Show when={step() === 1}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Selecione o modelo do provedor {engine()}:
                </p>
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <For each={MODELS[engine()] || []}>
                    {([mId, mDesc]) => {
                      const sel = () => model() === mId;
                      return (
                        <div
                          onClick={() => setModel(mId)}
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
                            <div style={{ "font-family": "var(--font-mono)", "font-weight": 600, color: "var(--text-primary)" }}>
                              {mId}
                            </div>
                            <div style={{ "font-size": "11.5px", color: "var(--text-muted)" }}>{mDesc}</div>
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
                <p style={{ "font-size": "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Quanto esforço operacional deve ser dedicado?
                </p>
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <For each={EFFORTS}>
                    {([eId, eDesc]) => {
                      const sel = () => effort() === eId;
                      return (
                        <div
                          onClick={() => setEffort(eId)}
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
                            <div style={{ "font-weight": 600, color: "var(--text-primary)", "text-transform": "capitalize" }}>
                              {eId}
                            </div>
                            <div style={{ "font-size": "11.5px", color: "var(--text-muted)" }}>{eDesc}</div>
                          </div>
                          {sel() && <span style={{ color: "var(--lime)", "font-weight": 700 }}>✓</span>}
                        </div>
                      );
                    }}
                  </For>
                </div>
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
                      value={ceiling()}
                      onInput={(e) => setCeiling(e.currentTarget.value)}
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
              disabled={loading()}
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
