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
          setContent("Nenhum artefato encontrado neste job.\n\nQuando a execução terminar, aparecem aqui: execucao.md, output.txt e plano.md.");
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

  return (
    <Show when={props.isOpen ?? true}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(11, 18, 32, 0.85)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && props.onClose) props.onClose();
        }}
      >
        <div
          class="relative w-full max-w-[820px] max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: "#0F172A",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            "box-shadow": "0 24px 64px rgba(0, 0, 0, 0.85)",
            color: "#F4F6F2",
          }}
        >
          <div
            class="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(27, 197, 189, 0.6) 50%, transparent 100%)",
            }}
          />

          <div
            class="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ "border-bottom": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{
                  background: "rgba(27, 197, 189, 0.12)",
                  border: "1px solid rgba(27, 197, 189, 0.3)",
                  color: "var(--teal, #1BC5BD)",
                }}
              >
                <TvIcon name="file-search" width="16" height="16" />
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-sm font-semibold tracking-tight text-[#F4F6F2]">
                    Resultado & Evidências
                  </h2>
                  <span
                    class="text-[10px] font-mono px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background:
                        props.guardStatus === "blocked" ? "rgba(239, 68, 68, 0.15)" : "rgba(27, 197, 189, 0.15)",
                      color: props.guardStatus === "blocked" ? "#f87171" : "var(--teal, #1BC5BD)",
                      border:
                        props.guardStatus === "blocked"
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid rgba(27, 197, 189, 0.3)",
                    }}
                  >
                    {props.guardStatus === "blocked" ? "Guard: Bloqueado" : "Guard: OK"}
                  </span>
                </div>
                <p class="text-xs text-[var(--text-secondary,#cbd3de)] mt-0.5 truncate">
                  Job {props.jobId.slice(0, 8)}
                  {props.taskSeq ? ` · Task #${props.taskSeq}` : ""}
                  {props.taskTitle ? ` · ${props.taskTitle}` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fechar"
              onClick={() => props.onClose?.()}
              class="text-[var(--text-muted,#aeb7c4)] hover:text-[#F4F6F2] transition-colors p-1.5 rounded-lg hover:bg-white/5 shrink-0"
            >
              <TvIcon name="circle-x" width="18" height="18" />
            </button>
          </div>

          <Show when={artifacts().length > 0}>
            <div
              class="flex gap-1.5 px-4 py-2.5 overflow-x-auto shrink-0"
              style={{ "border-bottom": "1px solid rgba(255,255,255,.06)", background: "#0a1220" }}
            >
              <For each={artifacts()}>
                {(a) => (
                  <button
                    type="button"
                    onClick={() => selectArtifact(a.name)}
                    class="px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-colors shrink-0"
                    style={{
                      background: activeName() === a.name ? "rgba(27,197,189,.18)" : "transparent",
                      color: activeName() === a.name ? "var(--teal,#1BC5BD)" : "#aeb7c4",
                      border:
                        activeName() === a.name
                          ? "1px solid rgba(27,197,189,.4)"
                          : "1px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    {a.name}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="flex-1 overflow-y-auto p-6 bg-[#070c16] min-h-0">
            <Show when={loading()}>
              <div class="text-xs text-[var(--text-muted)] font-mono mb-3">Carregando…</div>
            </Show>
            <Show when={loadError()}>
              <div class="text-xs text-[oklch(.7_.16_27)] mb-3">{loadError()}</div>
            </Show>
            <pre
              class="text-xs font-mono leading-relaxed text-[#cbd3de] whitespace-pre-wrap select-text m-0"
              style={{ "font-family": "var(--font-mono, monospace)" }}
            >
              {content()}
            </pre>
          </div>

          <div
            class="flex items-center justify-between px-6 py-3.5 shrink-0 bg-[#0F172A] gap-3 flex-wrap"
            style={{ "border-top": "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div class="text-[11px] text-[var(--text-muted,#aeb7c4)]">
              {activeName() || "sem arquivo"} · resultado da execução no workspace
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F4F6F2] bg-white/10 hover:bg-white/15 transition-colors"
              >
                <TvIcon name="bookmark" width="12" height="12" />
                <span>{copied() ? "Copiado!" : "Copiar"}</span>
              </button>
              <button
                type="button"
                onClick={() => props.onClose?.()}
                class="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#0B1220] transition-opacity hover:opacity-90"
                style={{ background: "var(--lime, #B7F34A)" }}
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
