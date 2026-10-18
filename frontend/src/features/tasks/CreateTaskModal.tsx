import { type Component, createSignal, For, Show, onMount, onCleanup } from "solid-js";

export type PriorityLevel = "Baixa" | "Normal" | "Alta";

export interface CreateTaskModalProps {
  taskId?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onCreate?: (payload: {
    id: number;
    title: string;
    description: string;
    priority: PriorityLevel;
    sector: string;
    file: string | null;
  }) => void;
}

export const CreateTaskModal: Component<CreateTaskModalProps> = (props) => {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [priority, setPriority] = createSignal<PriorityLevel>("Normal");
  const [sector, setSector] = createSignal("Estratégia");
  const [attachedFile, setAttachedFile] = createSignal<File | null>(null);

  let fileInputRef: HTMLInputElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.onClose) {
      props.onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && title().trim()) {
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

  const handleSubmit = () => {
    if (!title().trim()) return;
    props.onCreate?.({
      id: props.taskId ?? 13,
      title: title().trim(),
      description: description().trim(),
      priority: priority(),
      sector: sector(),
      file: attachedFile()?.name ?? null,
    });
  };

  return (
    <Show when={props.isOpen ?? true}>
      {/* BACKDROP & MODAL CONTAINER */}
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
          if (e.target === e.currentTarget && props.onClose) {
            props.onClose();
          }
        }}
      >
        <div
          class="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
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
                  <span
                    class="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: "#1BC5BD" }}
                  />
                  #{props.taskId ?? 13}
                </span>
              </div>
              <p class="mt-1 text-xs" style={{ color: "rgba(244, 246, 242, 0.55)" }}>
                Entra na coluna <span style={{ color: "rgba(244, 246, 242, 0.85)", "font-weight": 500 }}>Pendente</span>. O ID é reservado agora e não muda depois.
              </p>
            </div>

            <button
              type="button"
              onClick={() => props.onClose?.()}
              style={{
                background: "rgba(11, 18, 32, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(244, 246, 242, 0.6)",
                "border-radius": "9999px",
                padding: "3px 10px",
                "font-family": "var(--font-mono, monospace)",
                "font-size": "11px",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.15s ease",
              }}
              title="Fechar modal (Esc)"
            >
              Esc
            </button>
          </div>

          {/* BODY: 5 CAMPOS ESSENCIAIS */}
          <div class="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">
            
            {/* 1. TÍTULO */}
            <div>
              <label for="taskTitle" class="block text-xs font-medium mb-1.5" style={{ color: "rgba(244, 246, 242, 0.9)" }}>
                Título
              </label>
              <input
                id="taskTitle"
                type="text"
                placeholder="O que precisa ser feito?"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                autofocus
                class="w-full rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none"
                style={{
                  background: "rgba(11, 18, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#F4F6F2",
                }}
              />
            </div>

            {/* 2. DESCRIÇÃO */}
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <label for="taskDesc" class="text-xs font-medium" style={{ color: "rgba(244, 246, 242, 0.9)" }}>Descrição</label>
                  <span class="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(244, 246, 242, 0.35)" }}>OPCIONAL</span>
                </div>
                <span class="font-mono text-[10px]" style={{ color: "rgba(244, 246, 242, 0.3)" }}>Markdown suportado</span>
              </div>
              <textarea
                id="taskDesc"
                rows={3}
                placeholder="Contexto, critérios de aceite, links"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                class="w-full rounded-xl px-3.5 py-2 text-sm transition-all resize-y outline-none"
                style={{
                  background: "rgba(11, 18, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#F4F6F2",
                }}
              />
            </div>

            {/* 3. GRID: RESPONSÁVEL & SETOR */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Responsável (Fixo Paula PM) */}
              <div>
                <label class="block text-xs font-medium mb-1.5" style={{ color: "rgba(244, 246, 242, 0.9)" }}>
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
                      <span class="text-sm font-medium text-[#F4F6F2]">Paula</span>
                      <span class="text-xs" style={{ color: "rgba(244, 246, 242, 0.45)" }}>Product Manager</span>
                    </div>
                  </div>
                  <span
                    class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: "rgba(244, 246, 242, 0.35)",
                      background: "rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    FIXO
                  </span>
                </div>
              </div>

              {/* Setor */}
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <label for="taskSector" class="text-xs font-medium" style={{ color: "rgba(244, 246, 242, 0.9)" }}>Setor</label>
                  <span class="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(244, 246, 242, 0.35)" }}>OPCIONAL</span>
                </div>
                <div class="relative">
                  <select
                    id="taskSector"
                    value={sector()}
                    onChange={(e) => setSector(e.currentTarget.value)}
                    class="w-full appearance-none rounded-xl px-3.5 py-2 text-sm cursor-pointer outline-none transition-colors"
                    style={{
                      background: "rgba(11, 18, 32, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#F4F6F2",
                    }}
                  >
                    <option value="Estratégia" style={{ background: "#0B1220" }}>Estratégia</option>
                    <option value="Engenharia & Sistemas" style={{ background: "#0B1220" }}>Engenharia & Sistemas</option>
                    <option value="Descoberta & Requisitos" style={{ background: "#0B1220" }}>Descoberta & Requisitos</option>
                    <option value="QA & Segurança" style={{ background: "#0B1220" }}>QA & Segurança</option>
                    <option value="Comercial & Ofertas" style={{ background: "#0B1220" }}>Comercial & Ofertas</option>
                  </select>
                  <span
                    class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "rgba(244, 246, 242, 0.45)" }}
                  >
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {/* 4. PRIORIDADE */}
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <label class="text-xs font-medium" style={{ color: "rgba(244, 246, 242, 0.9)" }}>Prioridade</label>
                <span class="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(244, 246, 242, 0.35)" }}>OPCIONAL</span>
              </div>
              <div class="inline-flex items-center gap-2" id="priorityGroup">
                <For each={["Baixa", "Normal", "Alta"] as PriorityLevel[]}>
                  {(prio) => {
                    const isSelected = () => priority() === prio;
                    return (
                      <button
                        type="button"
                        onClick={() => setPriority(prio)}
                        style={{
                          background: isSelected() ? "rgba(27, 197, 189, 0.15)" : "rgba(11, 18, 32, 0.6)",
                          border: isSelected() ? "1px solid #1BC5BD" : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isSelected() ? "#F4F6F2" : "rgba(244, 246, 242, 0.65)",
                          "box-shadow": isSelected() ? "0 0 12px rgba(27, 197, 189, 0.2)" : "none",
                          "border-radius": "9999px",
                          padding: "6px 16px",
                          "font-size": "12px",
                          "font-weight": 500,
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {prio}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* 5. UPLOAD DE DOCUMENTO */}
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <label class="text-xs font-medium" style={{ color: "rgba(244, 246, 242, 0.9)" }}>Documento</label>
                  <span class="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(244, 246, 242, 0.35)" }}>OPCIONAL</span>
                </div>
                <span class="font-mono text-[11px]" style={{ color: "rgba(244, 246, 242, 0.45)" }}>PDF, TXT ou Markdown</span>
              </div>

              <div
                onClick={() => fileInputRef?.click()}
                class="flex items-center justify-between rounded-xl px-4 py-3 transition-all cursor-pointer"
                style={{
                  background: "rgba(11, 18, 32, 0.6)",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                }}
              >
                <input
                  ref={fileInputRef}
                  id="fileInput"
                  type="file"
                  accept=".pdf,.txt,.md"
                  class="hidden"
                  onChange={handleFileChange}
                />
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm"
                    style={{
                      background: "rgba(27, 197, 189, 0.1)",
                      color: "#1BC5BD",
                    }}
                  >
                    ↑
                  </div>
                  <div>
                    <p id="fileNameDisplay" class="text-xs font-medium text-[#F4F6F2]">
                      {attachedFile() ? attachedFile()!.name : "Selecionar arquivo"}
                    </p>
                    <p id="fileSizeDisplay" class="font-mono text-[11px]" style={{ color: "rgba(244, 246, 242, 0.45)" }}>
                      {attachedFile() ? `${(attachedFile()!.size / 1024).toFixed(1)} KB` : ".pdf, .txt ou .md"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (attachedFile()) {
                      setAttachedFile(null);
                    } else {
                      fileInputRef?.click();
                    }
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "rgba(244, 246, 242, 0.85)",
                    "border-radius": "9999px",
                    padding: "4px 14px",
                    "font-size": "12px",
                    "font-weight": 500,
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {attachedFile() ? "Remover" : "Procurar"}
                </button>
              </div>
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
              onClick={() => props.onClose?.()}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(244, 246, 242, 0.75)",
                "border-radius": "9999px",
                padding: "8px 16px",
                "font-size": "12px",
                "font-weight": 500,
                cursor: "pointer",
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
                id="submitBtn"
                type="button"
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
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.15s ease",
                }}
              >
                Criar task
              </button>
            </div>
          </div>

        </div>
      </div>
    </Show>
  );
};
