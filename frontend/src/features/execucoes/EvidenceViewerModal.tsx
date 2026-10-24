import { type Component, createSignal, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";
import { api, type JobArtifact } from "../../shared/api/client";

export interface EvidenceViewerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  jobId: string;
  jobTitle: string;
  taskSeq?: number;
  taskTitle?: string;
  fileName?: string;
  content?: string;
  guardStatus?: "passed" | "blocked" | "pending";
}

export const EvidenceViewerModal: Component<EvidenceViewerModalProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const [artifacts, setArtifacts] = createSignal<JobArtifact[]>([]);
  const [activeName, setActiveName] = createSignal<string>("");
  const [content, setContent] = createSignal<string>("");
  const [loading, setLoading] = createSignal(false);
  const [loadError, setLoadError] = createSignal("");

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.onClose) {
      props.onClose();
    }
  };

  onMount(() => window.addEventListener("keydown", handleKeyDown));
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  const preferOrder = ["execucao.md", "output.txt", "plano.md"];

  createEffect(() => {
    if (!(props.isOpen ?? true) || !props.jobId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (props.content) {
          setArtifacts([{ id: "inline", name: props.fileName || "evidencia.md", artifact_type: "markdown" }]);
          setActiveName(props.fileName || "evidencia.md");
          setContent(props.content);
          return;
        }
        const list = await api.listJobArtifacts(props.jobId);
        if (cancelled) return;
        const sorted = [...(list || [])].sort((a, b) => {
          const ia = preferOrder.indexOf(a.name);
          const ib = preferOrder.indexOf(b.name);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        setArtifacts(sorted);
        if (sorted.length === 0) {
          setActiveName("");
          setContent(
            "Nenhum artefato encontrado neste job.\n\nQuando a execução terminar, aparecem aqui: execucao.md, output.txt e plano.md."
          );
          return;
        }
        const first = sorted[0].name;
        setActiveName(first);
        const body = await api.getJobArtifactContent(props.jobId, first);
        if (cancelled) return;
        setContent(body.content + (body.truncated ? "\n\n… (conteúdo truncado)" : ""));
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setContent("Não foi possível carregar as evidências deste job.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    onCleanup(() => {
      cancelled = true;
    });
  });

  const selectArtifact = async (name: string) => {
    setActiveName(name);
    setLoading(true);
    try {
      const body = await api.getJobArtifactContent(props.jobId, name);
      setContent(body.content + (body.truncated ? "\n\n… (conteúdo truncado)" : ""));
    } catch (err) {
      setContent(`Erro ao ler ${name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content());
    setCopied(true);
    showToast("Conteúdo da evidência copiado!", "Evidências", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const jobShort = () => (props.jobId ? props.jobId.slice(0, 8) : "—");
  const guardLabel = () =>
    props.guardStatus === "blocked" ? "Bloqueado" : props.guardStatus === "pending" ? "Pendente" : "OK";

  return (
    <Show when={props.isOpen ?? true}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(11, 18, 32, 0.8)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
          transition: "opacity 0.2s ease",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && props.onClose) props.onClose();
        }}
      >
        <div
          class="relative w-full max-w-[720px] max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
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

          {/* HEADER — padrão PlanTaskModal / CreateTaskModal */}
          <div
            class="flex items-start justify-between px-6 pt-5 pb-4 shrink-0"
            style={{ "border-bottom": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h2 class="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Resultado & evidências
                </h2>
                <span
                  class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium"
                  style={{
                    background: "rgba(27, 197, 189, 0.1)",
                    border: "1px solid rgba(27, 197, 189, 0.25)",
                    color: "#1BC5BD",
                  }}
                >
                  Job {jobShort()}
                </span>
                <Show when={props.taskSeq}>
                  <span
                    class="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    #{props.taskSeq}
                  </span>
                </Show>
                <span
                  class="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
                  style={{
                    background:
                      props.guardStatus === "blocked"
                        ? "oklch(.635 .185 27 / .14)"
                        : "rgba(27, 197, 189, 0.12)",
                    border:
                      props.guardStatus === "blocked"
                        ? "1px solid oklch(.635 .185 27 / .35)"
                        : "1px solid rgba(27, 197, 189, 0.3)",
                    color: props.guardStatus === "blocked" ? "oklch(.78 .16 27)" : "#1BC5BD",
                  }}
                >
                  Guard {guardLabel()}
                </span>
              </div>
              <p class="mt-1 text-xs truncate" style={{ color: "var(--text-muted, rgba(244, 246, 242, 0.55))" }}>
                {props.taskTitle || props.jobTitle || "Artefatos gerados no workspace do job"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => props.onClose?.()}
              style={{
                background: "rgba(11, 18, 32, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-muted)",
                "border-radius": "9999px",
                padding: "3px 10px",
                "font-family": "var(--font-mono, monospace)",
                "font-size": "11px",
                cursor: "pointer",
                outline: "none",
                flex: "none",
              }}
              title="Fechar modal (Esc)"
            >
              Esc
            </button>
          </div>

          {/* TABS DE ARTEFATOS */}
          <Show when={artifacts().length > 0}>
            <div
              class="flex gap-1.5 px-6 py-3 overflow-x-auto shrink-0"
              style={{ "border-bottom": "1px solid rgba(255, 255, 255, 0.06)" }}
            >
              <For each={artifacts()}>
                {(a) => (
                  <button
                    type="button"
                    onClick={() => selectArtifact(a.name)}
                    class="px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-colors shrink-0"
                    style={{
                      background: activeName() === a.name ? "rgba(27, 197, 189, 0.14)" : "transparent",
                      color: activeName() === a.name ? "#1BC5BD" : "var(--text-secondary)",
                      border:
                        activeName() === a.name
                          ? "1px solid rgba(27, 197, 189, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                    }}
                  >
                    {a.name}
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* BODY */}
          <div
            class="flex-1 overflow-y-auto px-6 py-5 min-h-0"
            style={{ background: "rgba(11, 18, 32, 0.55)" }}
          >
            <Show when={loading()}>
              <div class="text-xs font-mono mb-3" style={{ color: "var(--text-muted)" }}>
                Carregando…
              </div>
            </Show>
            <Show when={loadError()}>
              <div class="text-xs mb-3" style={{ color: "oklch(.7 .16 27)" }}>
                {loadError()}
              </div>
            </Show>
            <div
              class="rounded-xl p-4"
              style={{
                background: "rgba(11, 18, 32, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <pre
                class="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text m-0"
                style={{
                  "font-family": "var(--font-mono, monospace)",
                  color: "var(--text-secondary)",
                }}
              >
                {content()}
              </pre>
            </div>
          </div>

          {/* FOOTER */}
          <div
            class="flex items-center justify-between px-6 py-3.5 shrink-0 gap-3 flex-wrap"
            style={{ "border-top": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div class="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              {activeName() || "sem arquivo"} · workspace do job
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <TvIcon name="bookmark" width="12" height="12" />
                <span>{copied() ? "Copiado!" : "Copiar"}</span>
              </button>
              <button
                type="button"
                onClick={() => props.onClose?.()}
                class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "var(--action-bg, var(--lime, #B7F34A))",
                  color: "var(--action-fg, #0B1220)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
