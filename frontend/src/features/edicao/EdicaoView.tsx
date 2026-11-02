import { createSignal, onMount, For, Show } from "solid-js";
import { api } from "../../shared/api/client";

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

const REEL_SUBS: Array<[number, number, string, string?]> = [
  [0, 3, "Todo mapa escolhe o que mostrar."],
  [3, 7, "Este escolheu esconder uma cidade inteira.", "Linha com 41 caracteres. Limite: 32."],
  [7, 12, "Em 1953, ela sumiu da carta oficial."],
  [12, 18, "Ninguém mudou de endereço."],
  [18, 26, "Mas o correio parou de chegar.", "Sobrepõe a narração em 0,4 s."],
  [26, 34, "Três versões contam essa história."],
  [34, 40, "Só uma tem documento."],
  [40, 45, "Fontes na legenda do post."],
];

const SHOTS: Array<[number, number, string]> = [
  [0, 7, "mapa"],
  [7, 18, "arquivo"],
  [18, 34, "ruínas"],
  [34, 45, "fontes"],
];

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
  const [visualFixture, setVisualFixture] = createSignal(false);
  const [playing, setPlaying] = createSignal(false);

  const seekTrack = (event: MouseEvent & { currentTarget: HTMLDivElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setPlaying(false);
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
    void api.getOfficeSettings().then((data) => setVisualFixture(Boolean(data.visual_fixture))).catch(() => undefined);
    void fetch("/api/v1/edit/projects")
      .then((res) => res.json())
      .then((body: { projects: EditProject[] }) => setProjects(body.projects || []));
    loadRenders();
  });

  const activeSub = () => REEL_SUBS.find((row) => cursorS() >= row[0] && cursorS() < row[1]);
  const shot = () => SHOTS.find((row) => cursorS() >= row[0] && cursorS() < row[1]) || SHOTS[SHOTS.length - 1];

  return (
    <div data-screen-label="Edição" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", "align-items": "flex-end", gap: "16px", "flex-wrap": "wrap" }}>
        <div style={{ flex: "1", "min-width": "260px" }}>
          <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
            <span style={{ "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Módulo · Conversar</span>
            <span style={{ "font-size": "10px", "font-weight": "700", "letter-spacing": "0.08em", "text-transform": "uppercase", padding: "2px 8px", "border-radius": "999px", border: "1px solid var(--line)" }}>beta</span>
          </div>
          <h1 style={{ margin: "8px 0 0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em" }}>Edição</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", "font-size": "14px", "max-width": "640px" }}>Pós-produção: corte, narração, legenda e render. A revisão de legenda acontece aqui, com o vídeo parado no ponto certo.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" style={{ height: "36px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--line)", background: "var(--surface-1)", color: "var(--text-primary)", cursor: "pointer" }} onClick={() => { const first = projects()[0]; if (first) void exportSrt(first); }}>Exportar .srt</button>
          <button type="button" style={{ height: "36px", padding: "0 14px", "border-radius": "999px", border: "none", background: "var(--action-bg)", color: "var(--action-fg)", "font-weight": "600", cursor: "pointer" }}>Renderizar</button>
        </div>
      </div>

      <Show when={visualFixture()}>
        <div style={{ display: "flex", gap: "12px", "align-items": "center", "flex-wrap": "wrap" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <span style={{ padding: "6px 12px", "border-radius": "999px", background: "var(--surface-1)", border: "1px solid var(--text-primary)", "font-size": "13px" }}>Ep. 14 · reel 45 s</span>
            <span style={{ padding: "6px 12px", "border-radius": "999px", color: "var(--text-muted)", "font-size": "13px" }}>IA Livros · vídeo 12 min</span>
          </div>
          <span style={{ flex: "1" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <For each={[["01", "Corte", "done"], ["02", "Narração", "done"], ["03", "Legenda", "now"], ["04", "Render", ""]]}>
              {(step) => (
                <div style={{ "min-width": "90px", padding: "8px 10px", "border-radius": "12px", border: step[2] === "now" ? "1px solid var(--warning)" : "1px solid var(--line)", background: "var(--surface-1)" }}>
                  <span style={{ display: "block", "font-size": "11px", color: "var(--text-muted)" }}>{step[0]}</span>
                  <b style={{ "font-size": "12px" }}>{step[1]}</b>
                  <div style={{ height: "3px", "margin-top": "8px", "border-radius": "2px", background: step[2] === "now" ? "var(--warning)" : step[2] === "done" ? "var(--teal)" : "var(--line)" }} />
                </div>
              )}
            </For>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", "flex-wrap": "wrap", "align-items": "stretch" }}>
          <section style={{ flex: "1 1 360px", padding: "18px", "border-radius": "16px", background: "var(--surface-ink)", color: "var(--on-ink)", display: "flex", "flex-direction": "column", gap: "14px", "align-items": "center" }}>
            <div style={{ width: "196px", height: "348px", "max-width": "100%", "border-radius": "14px", background: "#121c30", border: "1px solid rgba(244,246,242,.16)", position: "relative", overflow: "hidden", display: "flex", "flex-direction": "column", "justify-content": "flex-end", "align-items": "center", padding: "18px" }}>
              <span style={{ position: "absolute", top: "10px", left: "12px", "font-size": "10px", color: "var(--on-ink-muted)", "font-family": "var(--font-mono)" }}>prévia · 9:16 · 1080p</span>
              <span style={{ position: "absolute", top: "10px", right: "12px", "font-size": "10px", color: "var(--lime)", "font-family": "var(--font-mono)" }}>{clock(cursorS())}</span>
              <span style={{ position: "absolute", inset: "0", display: "grid", "place-items": "center", "font-size": "11px", color: "rgba(244,246,242,.35)", "font-family": "var(--font-mono)" }}>quadro do corte · {shot()?.[2]}</span>
              <Show when={activeSub()}>
                <div style={{ position: "relative", background: "rgba(7,13,24,.82)", color: "#F4F6F2", "font-weight": "600", "font-size": "14px", "line-height": "1.3", padding: "6px 10px", "border-radius": "6px", "text-align": "center", "max-width": "92%" }}>{activeSub()?.[2]}</div>
              </Show>
            </div>
            <div style={{ display: "flex", "align-items": "center", gap: "10px", width: "100%" }}>
              <button type="button" aria-label={playing() ? "Pausar" : "Tocar"} onClick={() => setPlaying((value) => !value)} style={{ display: "flex", "align-items": "center", gap: "6px", height: "32px", padding: "0 12px", "border-radius": "999px", border: "none", background: "var(--lime)", color: "var(--lime-ink)", "font-weight": "600", cursor: "pointer" }}>{playing() ? "Pausar" : "Tocar"}</button>
              <div style={{ flex: "1", height: "4px", "border-radius": "999px", background: "rgba(244,246,242,.12)" }}><div style={{ height: "4px", width: `${(cursorS() / DURATION_S) * 100}%`, background: "var(--lime)", "border-radius": "999px" }} /></div>
              <span style={{ "font-size": "11px", color: "var(--on-ink-muted)", "font-family": "var(--font-mono)" }}>{clock(cursorS())} / {clock(DURATION_S)}</span>
            </div>
          </section>
          <section style={{ flex: "1 1 380px", display: "flex", "flex-direction": "column", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)", overflow: "hidden" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "8px", padding: "14px 16px", "border-bottom": "1px solid var(--line)" }}>
              <h3 style={{ margin: "0", "font-size": "14px" }}>Revisão de legenda</h3>
              <span style={{ "font-size": "10px", "font-weight": "700", padding: "2px 8px", "border-radius": "999px", background: "var(--warning-subtle)", color: "var(--warning)" }}>2 alertas</span>
              <span style={{ flex: "1" }} />
              <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>Rita Revisora</span>
            </div>
            <div style={{ "overflow": "auto", "max-height": "360px" }}>
              <For each={REEL_SUBS}>
                {(row) => {
                  const on = () => cursorS() >= row[0] && cursorS() < row[1];
                  return (
                    <button type="button" onClick={() => { setPlaying(false); setCursorS(row[0] + 0.1); }} style={{ display: "flex", gap: "10px", width: "100%", "text-align": "left", padding: "10px 16px", border: "none", "border-bottom": "1px solid var(--line)", background: on() ? "var(--surface-3)" : "transparent", color: "var(--text-primary)", cursor: "pointer" }}>
                      <span style={{ width: "74px", "flex": "none", "font-size": "11px", color: "var(--text-muted)", "font-family": "var(--font-mono)" }}>{clock(row[0])}–{clock(row[1])}</span>
                      <span>
                        <span style={{ display: "block", "font-size": "13px" }}>{row[2]}</span>
                        <Show when={row[3]}><span style={{ display: "block", "font-size": "11.5px", color: "var(--warning)", "margin-top": "3px" }}>{row[3]}</span></Show>
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
          </section>
        </div>
      </Show>

      <For each={projects()}>
        {(project) => (
          <article data-project={project.id} style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
              <span style={{ flex: "1", "font-weight": "600" }}>{project.label}</span>
              <button type="button" onClick={() => void exportSrt(project)}>Exportar .srt</button>
            </div>
            <For each={project.cues}>
              {(cue) => <p style={{ margin: "0", color: "var(--text-secondary)" }}>{cue.text}</p>}
            </For>
          </article>
        )}
      </For>

      <section aria-label="Timeline" style={{ display: "flex", "flex-direction": "column", gap: "10px", padding: "16px 18px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
        <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
          <h2 style={{ margin: "0", "font-size": "14px", "font-weight": "600" }}>Timeline</h2>
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
                <div role="slider" aria-label={name} aria-valuemin={0} aria-valuemax={DURATION_S} aria-valuenow={Math.round(cursorS())} aria-valuetext={clock(cursorS())} onClick={seekTrack} style={{ position: "relative", height: "34px", "border-radius": "8px", background: "var(--surface-0)", border: "1px solid var(--line)", cursor: "pointer" }}>
                  <Show when={visualFixture() && name === "Vídeo"}>
                    <For each={SHOTS}>
                      {(clip) => (
                        <div style={{ position: "absolute", top: "4px", bottom: "4px", left: `${(clip[0] / DURATION_S) * 100}%`, width: `${((clip[1] - clip[0]) / DURATION_S) * 100}%`, "border-radius": "5px", background: "rgba(27,197,189,.22)", border: "1px solid rgba(27,197,189,.45)", display: "flex", "align-items": "center", padding: "0 6px", "pointer-events": "none", "font-size": "10.5px" }}>{clip[2]}</div>
                      )}
                    </For>
                  </Show>
                  <Show when={!visualFixture() || name !== "Vídeo"}>
                    <div style={{ position: "absolute", top: "4px", bottom: "4px", left: "0%", width: "100%", "border-radius": "5px", background: "var(--surface-3)", "pointer-events": "none" }} />
                  </Show>
                  <div data-cursor style={{ position: "absolute", top: "-4px", bottom: "-4px", left: `${(cursorS() / DURATION_S) * 100}%`, width: "2px", background: "var(--lime)", "pointer-events": "none" }} />
                </div>
              </>
            )}
          </For>
        </div>
      </section>

      <section style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px 18px", "border-radius": "16px", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <h2 style={{ margin: "0", "font-size": "14px", color: "var(--text-primary)" }}>Fila de render</h2>
          <span style={{ flex: "1" }} />
          <span style={{ "font-size": "11px", "letter-spacing": "0.12em", "text-transform": "uppercase", color: "var(--text-muted)" }}>motor local · ffmpeg</span>
        </div>
        <div style={{ display: visualFixture() ? "none" : "flex", gap: "8px" }}>
          <input aria-label="Nome do render" value={renderName()} onInput={(event) => setRenderName(event.currentTarget.value)} />
          <button type="button" onClick={() => void enqueue()}>Enfileirar</button>
        </div>
        <Show when={renderError()}>
          <p role="alert">{renderError()}</p>
        </Show>
        <Show when={visualFixture()}>
          <For each={[["9:16", "Reel 1080 × 1920", "100%", "pronto"], ["4:5", "Feed 1080 × 1350", "0%", "na fila"], ["16:9", "YouTube 1920 × 1080", "0%", "na fila"]]}>
            {(row) => (
              <div style={{ display: "flex", "align-items": "center", gap: "12px", padding: "8px 0" }}>
                <span style={{ width: "60px", "font-family": "var(--font-mono)", "font-size": "12px" }}>{row[0]}</span>
                <span style={{ flex: "1", "font-size": "13px" }}>{row[1]} <span>{row[2]}</span></span>
                <span style={{ "font-size": "11px", "text-transform": "uppercase" }}>{row[3]}</span>
              </div>
            )}
          </For>
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
