import {
  type Component,
  createSignal,
  createEffect,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";

export type PriorityLevel = "Baixa" | "Normal" | "Alta";

export interface CreateTaskModalProps {
  isOpen?: boolean;
  /** Tasks candidatas a dependência (ex.: abertas do quadro). */
  dependencyOptions?: Array<{ id: string; seq: number; title: string }>;
  submitting?: boolean;
  onClose?: () => void;
  onCreate?: (payload: {
    title: string;
    description: string;
    priority: PriorityLevel;
    sector: string;
    dependsOn: string[];
    file: File | null;
  }) => void | Promise<void>;
}

const SECTORS = [
  "Estratégia",
  "Engenharia & Sistemas",
  "Descoberta & Requisitos",
  "QA & Segurança",
  "Comercial & Ofertas",
  "Operação",
];

export const CreateTaskModal: Component<CreateTaskModalProps> = (props) => {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [priority, setPriority] = createSignal<PriorityLevel>("Normal");
  const [sector, setSector] = createSignal("Estratégia");
  const [attachedFile, setAttachedFile] = createSignal<File | null>(null);
  const [dependsOn, setDependsOn] = createSignal<string[]>([]);
  const [localBusy, setLocalBusy] = createSignal(false);

  let fileInputRef: HTMLInputElement | undefined;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Normal");
    setSector("Estratégia");
    setAttachedFile(null);
    setDependsOn([]);
    if (fileInputRef) fileInputRef.value = "";
  };

  createEffect(() => {
    if (props.isOpen) {
      resetForm();
    }
  });

  const busy = () => Boolean(props.submitting || localBusy());

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;
    if (e.key === "Escape" && props.onClose && !busy()) {
      props.onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && title().trim() && !busy()) {
      handleSubmit();
    }
  };

  onMount(() => window.addEventListener("keydown", handleKeyDown));
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      setAttachedFile(target.files[0]);
    }
  };

  const toggleDepend = (seqOrId: string) => {
    const cur = dependsOn();
    if (cur.includes(seqOrId)) {
      setDependsOn(cur.filter((d) => d !== seqOrId));
    } else {
      setDependsOn([...cur, seqOrId]);
    }
  };

  const handleSubmit = async () => {
    if (!title().trim() || busy()) return;
    setLocalBusy(true);
    try {
      await props.onCreate?.({
        title: title().trim(),
        description: description().trim(),
        priority: priority(),
        sector: sector(),
        dependsOn: dependsOn(),
        file: attachedFile(),
      });
    } finally {
      setLocalBusy(false);
    }
  };

  const options = () => props.dependencyOptions || [];

  return (
    <Show when={props.isOpen ?? true}>
      <div
        id="modalBackdrop"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(11, 18, 32, 0.8)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
          transition: "opacity 0.2s ease",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && props.onClose && !busy()) {
            props.onClose();
          }
        }}
      >
        <div
          class="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
          style={{
            background: "var(--surface-ink, #0F172A)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            "box-shadow": "0 24px 64px rgba(0, 0, 0, 0.75)",
            color: "var(--text-primary, #F4F6F2)",
          }}
        >
          <div
            class="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(27, 197, 189, 0.5) 50%, transparent 100%)",
            }}
          />

          <div
            class="flex items-start justify-between px-6 pt-5 pb-4"
            style={{ "border-bottom": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Nova task
                </h2>
                <span
                  class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium"
                  style={{
                    background: "rgba(27, 197, 189, 0.1)",
                    border: "1px solid rgba(27, 197, 189, 0.25)",
                    color: "#1BC5BD",
                  }}
                >
                  ID automático
                </span>
              </div>
              <p class="mt-1 text-xs" style={{ color: "var(--text-muted, rgba(244, 246, 242, 0.55))" }}>
                Entra em{" "}
                <span style={{ color: "var(--text-secondary)", "font-weight": 500 }}>A planejar</span>. O
                número (#seq) é atribuído pelo backend ao criar.
              </p>
            </div>

            <button
              type="button"
              disabled={busy()}
              onClick={() => props.onClose?.()}
              style={{
                background: "rgba(11, 18, 32, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-muted)",
                "border-radius": "9999px",
                padding: "3px 10px",
                "font-family": "var(--font-mono, monospace)",
                "font-size": "11px",
                cursor: busy() ? "wait" : "pointer",
                outline: "none",
              }}
              title="Fechar modal (Esc)"
            >
              Esc
            </button>
          </div>

          <div class="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">
            <div>
              <label for="taskTitle" class="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Título
              </label>
              <input
                id="taskTitle"
                type="text"
                placeholder="O que precisa ser feito?"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                autofocus
                disabled={busy()}
                class="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "rgba(11, 18, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="taskDesc" class="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  Descrição
                </label>
                <span class="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  OPCIONAL
                </span>
              </div>
              <textarea
                id="taskDesc"
                rows={3}
                placeholder="Contexto, critérios de aceite, links"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                disabled={busy()}
                class="w-full rounded-xl px-3.5 py-2 text-sm resize-y outline-none"
                style={{
                  background: "rgba(11, 18, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Responsável
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
                      <span class="text-sm font-medium">Paula</span>
                      <span class="text-xs" style={{ color: "var(--text-muted)" }}>
                        Product Manager
                      </span>
                    </div>
                  </div>
                  <span
                    class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.04)" }}
                  >
                    FIXO
                  </span>
                </div>
              </div>

              <div>
                <label for="taskSector" class="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Setor
                </label>
                <select
                  id="taskSector"
                  value={sector()}
                  onChange={(e) => setSector(e.currentTarget.value)}
                  disabled={busy()}
                  class="w-full appearance-none rounded-xl px-3.5 py-2 text-sm cursor-pointer outline-none"
                  style={{
                    background: "rgba(11, 18, 32, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--text-primary)",
                  }}
                >
                  <For each={SECTORS}>{(s) => <option value={s}>{s}</option>}</For>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Prioridade
              </label>
              <div class="inline-flex items-center gap-2">
                <For each={["Baixa", "Normal", "Alta"] as PriorityLevel[]}>
                  {(prio) => {
                    const isSelected = () => priority() === prio;
                    return (
                      <button
                        type="button"
                        disabled={busy()}
                        onClick={() => setPriority(prio)}
                        style={{
                          background: isSelected() ? "rgba(27, 197, 189, 0.15)" : "rgba(11, 18, 32, 0.6)",
                          border: isSelected() ? "1px solid #1BC5BD" : "1px solid rgba(255, 255, 255, 0.08)",
                          color: "var(--text-primary)",
                          "border-radius": "9999px",
                          padding: "6px 16px",
                          "font-size": "12px",
                          "font-weight": 500,
                          cursor: busy() ? "wait" : "pointer",
                          outline: "none",
                        }}
                      >
                        {prio}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>

            <Show when={options().length > 0}>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    Depende de
                  </label>
                  <span class="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                    OPCIONAL
                  </span>
                </div>
                <p class="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                  Bloqueia o início da execução até as tasks selecionadas concluírem.
                </p>
                <div
                  class="max-h-36 overflow-y-auto rounded-xl p-2 space-y-1"
                  style={{
                    background: "rgba(11, 18, 32, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <For each={options()}>
                    {(opt) => {
                      const key = String(opt.seq || opt.id);
                      const checked = () => dependsOn().includes(key);
                      return (
                        <label
                          class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs"
                          style={{
                            background: checked() ? "rgba(27, 197, 189, 0.1)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked()}
                            disabled={busy()}
                            onChange={() => toggleDepend(key)}
                          />
                          <span class="font-mono" style={{ color: "#1BC5BD" }}>
                            #{opt.seq}
                          </span>
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              overflow: "hidden",
                              "text-overflow": "ellipsis",
                              "white-space": "nowrap",
                            }}
                          >
                            {opt.title}
                          </span>
                        </label>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  Documento
                </label>
                <span class="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                  PDF, TXT ou Markdown · até 8 MB
                </span>
              </div>

              <div
                onClick={() => !busy() && fileInputRef?.click()}
                class="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer"
                style={{
                  background: "rgba(11, 18, 32, 0.6)",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                  opacity: busy() ? 0.6 : 1,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  class="hidden"
                  onChange={handleFileChange}
                />
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm"
                    style={{ background: "rgba(27, 197, 189, 0.1)", color: "#1BC5BD" }}
                  >
                    ↑
                  </div>
                  <div>
                    <p class="text-xs font-medium">
                      {attachedFile() ? attachedFile()!.name : "Selecionar arquivo"}
                    </p>
                    <p class="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {attachedFile()
                        ? `${(attachedFile()!.size / 1024).toFixed(1)} KB`
                        : ".pdf, .txt ou .md"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (attachedFile()) {
                      setAttachedFile(null);
                      if (fileInputRef) fileInputRef.value = "";
                    } else {
                      fileInputRef?.click();
                    }
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "var(--text-secondary)",
                    "border-radius": "9999px",
                    padding: "4px 14px",
                    "font-size": "12px",
                    "font-weight": 500,
                    cursor: "pointer",
                  }}
                >
                  {attachedFile() ? "Remover" : "Procurar"}
                </button>
              </div>
            </div>
          </div>

          <div
            class="flex items-center justify-between px-6 py-4"
            style={{
              background: "rgba(11, 18, 32, 0.75)",
              "border-top": "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <button
              type="button"
              disabled={busy()}
              onClick={() => props.onClose?.()}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--text-secondary)",
                "border-radius": "9999px",
                padding: "8px 16px",
                "font-size": "12px",
                "font-weight": 500,
                cursor: busy() ? "wait" : "pointer",
              }}
            >
              Cancelar
            </button>

            <div class="flex items-center gap-3">
              <span class="hidden sm:inline-block font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                Ctrl + Enter
              </span>
              <button
                type="button"
                disabled={!title().trim() || busy()}
                onClick={handleSubmit}
                style={{
                  background: "#B7F34A",
                  color: "#0B1220",
                  border: "none",
                  "box-shadow": "0 0 20px rgba(183, 243, 74, 0.3)",
                  "border-radius": "9999px",
                  padding: "8px 20px",
                  "font-size": "12px",
                  "font-weight": 600,
                  cursor: !title().trim() || busy() ? "not-allowed" : "pointer",
                  opacity: !title().trim() || busy() ? 0.6 : 1,
                }}
              >
                {busy() ? "Criando…" : "Criar task"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
