import { createSignal, onMount, For, Show } from "solid-js";

interface Cue {
  seq: number;
  text: string;
}

interface EditProject {
  id: string;
  label: string;
  cues: Cue[];
}

interface RenderItem {
  id: string;
  label: string;
  progress: number;
}

const DURATION_S = 45;
const TRACKS = ["Vídeo", "Narração", "Legenda", "Trilha"];

function clock(seconds: number) {
  const safe = Math.max(0, Math.min(DURATION_S, seconds));
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function EdicaoView() {
  const [projects, setProjects] = createSignal<EditProject[]>([]);
  const [renders, setRenders] = createSignal<RenderItem[]>([]);
  const [renderName, setRenderName] = createSignal("");
  const [renderError, setRenderError] = createSignal("");
  const [cursorS, setCursorS] = createSignal(4);

  const seekTrack = (event: MouseEvent & { currentTarget: HTMLDivElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setCursorS(fraction * DURATION_S);
  };

  const loadRenders = () => {
    void fetch("/api/v1/edit/renders")
      .then((res) => res.json())
      .then((body: { renders: RenderItem[] }) => setRenders(body.renders || []));
  };

  const enqueue = async () => {
    const res = await fetch("/api/v1/edit/renders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: renderName() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRenderError(body.detail || "Informe o nome do render.");
      return;
    }
    setRenderError("");
    setRenderName("");
    loadRenders();
  };

  const exportSrt = async (project: EditProject) => {
    const res = await fetch(`/api/v1/edit/projects/${project.id}/srt`, { method: "POST" });
    if (!res.ok) return;
    const text = await res.text();
    const url = URL.createObjectURL(new Blob([text], { type: "application/x-subrip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id}.srt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  onMount(() => {
    void fetch("/api/v1/edit/projects")
      .then((res) => res.json())
      .then((body: { projects: EditProject[] }) => setProjects(body.projects || []));
    loadRenders();
  });

  return (
    <div data-screen-label="Edição" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Edição</h1>
      <For each={projects()}>
        {(project) => (
          <article data-project={project.id} style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px", "border-radius": "16px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-1, #0f1729)" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
              <span style={{ flex: "1", "font-weight": "600", color: "var(--text-primary)" }}>{project.label}</span>
              <button type="button" onClick={() => void exportSrt(project)}>Exportar .srt</button>
            </div>
            <For each={project.cues}>
              {(cue) => <p style={{ margin: "0", color: "var(--text-secondary)" }}>{cue.text}</p>}
            </For>
          </article>
        )}
      </For>
      <section aria-label="Timeline" style={{ display: "flex", "flex-direction": "column", gap: "10px", padding: "16px 18px", "border-radius": "16px", border: "1px solid var(--line, rgba(244,246,242,.14))", background: "var(--surface-1, #121c30)" }}>
        <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
          <h2 style={{ margin: "0", "font-size": "14px", "font-weight": "600", color: "var(--text-primary)" }}>Timeline</h2>
          <span style={{ flex: "1" }} />
          <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>Clique numa trilha para mover o cursor</span>
          <span class="mono" data-tc style={{ "font-size": "12px", color: "var(--text-secondary)" }}>{clock(cursorS())} / {clock(DURATION_S)}</span>
        </div>
        <div style={{ display: "grid", "grid-template-columns": "92px minmax(0, 1fr)", gap: "6px 12px", "align-items": "center" }}>
          <span />
          <div style={{ display: "flex", "justify-content": "space-between", color: "var(--text-muted)", "font-size": "10px" }}>
            <span>00:00</span><span>00:09</span><span>00:18</span><span>00:27</span><span>00:36</span><span>00:45</span>
          </div>
          <For each={TRACKS}>
            {(name) => (
              <>
                <span style={{ "font-size": "12px", color: "var(--text-secondary)" }}>{name}</span>
                <div
                  role="slider"
                  aria-label={name}
                  aria-valuemin={0}
                  aria-valuemax={DURATION_S}
                  aria-valuenow={Math.round(cursorS())}
                  aria-valuetext={clock(cursorS())}
                  onClick={seekTrack}
                  style={{ position: "relative", height: "34px", "border-radius": "8px", background: "var(--surface-0)", border: "1px solid var(--line, rgba(244,246,242,.14))", cursor: "pointer" }}
                >
                  <div style={{ position: "absolute", top: "4px", bottom: "4px", left: "0%", width: "100%", "border-radius": "5px", background: "var(--surface-3, #17223a)", "pointer-events": "none" }} />
                  <div
                    data-cursor
                    style={{
                      position: "absolute",
                      top: "-4px",
                      bottom: "-4px",
                      left: `${(cursorS() / DURATION_S) * 100}%`,
                      width: "2px",
                      background: "var(--lime)",
                      "pointer-events": "none",
                      transition: "none",
                    }}
                  />
                </div>
              </>
            )}
          </For>
        </div>
      </section>
      <section style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <h2 style={{ margin: "0", "font-size": "18px", color: "var(--text-primary)" }}>Fila de render</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <input aria-label="Nome do render" value={renderName()} onInput={(event) => setRenderName(event.currentTarget.value)} />
          <button type="button" onClick={() => void enqueue()}>Enfileirar</button>
        </div>
        <Show when={renderError()}>
          <p role="alert">{renderError()}</p>
        </Show>
        <For each={renders()}>
          {(item) => (
            <p data-render={item.id} style={{ margin: "0", color: "var(--text-primary)" }}>
              {item.label} <span>{item.progress}%</span>
            </p>
          )}
        </For>
      </section>
    </div>
  );
}
