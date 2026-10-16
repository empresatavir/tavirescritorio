import { createSignal, onMount, Show } from "solid-js";

/**
 * G9 — Mapa com PixiJS lazy-loaded.
 * Ponto de conexão Habblaud desacoplado (D6): interface sem implementação real.
 * Fallback acessível quando WebGL não está disponível ou PixiJS falha ao carregar.
 */

interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "agent" | "job" | "project" | "integration";
  status: "active" | "idle" | "error";
}

const SAMPLE_NODES: MapNode[] = [
  { id: "ag-1", label: "Editor Chefe", x: 400, y: 200, type: "agent", status: "active" },
  { id: "ag-2", label: "DevOps Lead", x: 600, y: 350, type: "agent", status: "idle" },
  { id: "jb-1", label: "Pipeline Editorial", x: 200, y: 300, type: "job", status: "active" },
  { id: "pj-1", label: "TAVIR Escritório", x: 400, y: 450, type: "project", status: "active" },
  { id: "ig-1", label: "Sincron Brain MCP", x: 700, y: 150, type: "integration", status: "active" },
  { id: "ig-2", label: "Supabase", x: 750, y: 400, type: "integration", status: "error" },
];

const NODE_COLORS: Record<string, string> = {
  agent: "#1BC5BD",
  job: "#B7F34A",
  project: "#F4F6F2",
  integration: "#5E6878",
};

export function Mapa() {
  const [pixiLoaded, setPixiLoaded] = createSignal(false);
  const [pixiError, setPixiError] = createSignal(false);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);

  onMount(async () => {
    try {
      // Dynamic import — PixiJS only loaded when this route is visited
      const PIXI = await import("pixi.js");
      const canvas = canvasRef();
      if (!canvas) return;

      const app = new PIXI.Application();
      await app.init({
        canvas,
        width: canvas.parentElement?.clientWidth ?? 900,
        height: canvas.parentElement?.clientHeight ?? 600,
        backgroundColor: 0x0b1220,
        antialias: true,
      });

      // Draw connections
      const graphics = new PIXI.Graphics();
      for (let i = 0; i < SAMPLE_NODES.length; i++) {
        for (let j = i + 1; j < SAMPLE_NODES.length; j++) {
          const a = SAMPLE_NODES[i];
          const b = SAMPLE_NODES[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 300) {
            graphics.moveTo(a.x, a.y);
            graphics.lineTo(b.x, b.y);
            graphics.stroke({ color: 0x5e6878, alpha: 0.3, width: 1 });
          }
        }
      }
      app.stage.addChild(graphics);

      // Draw nodes
      for (const node of SAMPLE_NODES) {
        const circle = new PIXI.Graphics();
        const color = parseInt(NODE_COLORS[node.type].replace("#", ""), 16);
        circle.circle(node.x, node.y, node.status === "error" ? 10 : 8);
        circle.fill({ color, alpha: node.status === "idle" ? 0.5 : 1 });
        if (node.status === "error") {
          circle.stroke({ color: 0xef4444, width: 2 });
        }
        app.stage.addChild(circle);

        const label = new PIXI.Text({
          text: node.label,
          style: {
            fontFamily: "IBM Plex Mono",
            fontSize: 10,
            fill: 0xf4f6f2,
          },
        });
        label.anchor.set(0.5);
        label.position.set(node.x, node.y + 20);
        app.stage.addChild(label);
      }

      setPixiLoaded(true);
    } catch (e) {
      console.warn("PixiJS failed to load, using fallback:", e);
      setPixiError(true);
    }
  });

  return (
    <div class="flex h-full flex-col gap-6">
      <div>
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Mapa Operacional
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Visualização topológica de agentes, jobs, projetos e integrações
        </p>
      </div>

      {/* Habblaud connection point (D6) — interface only, no implementation */}
      <div class="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3">
        <span class="inline-block h-2 w-2 rounded-full bg-[var(--text-muted)]" />
        <span class="text-xs font-mono uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Habblaud
        </span>
        <span class="text-xs text-[var(--text-muted)]">
          — ponto de conexão reservado (sem implementação ativa)
        </span>
      </div>

      {/* Canvas container */}
      <div class="relative flex-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[#0B1220]">
        <Show when={!pixiLoaded() && !pixiError()}>
          <div class="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
            Carregando visualizador...
          </div>
        </Show>

        <Show when={pixiError()}>
          {/* Accessible fallback when PixiJS/WebGL unavailable */}
          <div class="absolute inset-0 overflow-y-auto p-6">
            <p class="mb-4 text-xs font-mono uppercase tracking-[var(--tracking-label)] text-[var(--accent-lima)]">
              Modo texto (WebGL indisponível)
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SAMPLE_NODES.map((node) => (
                <div class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ "background-color": NODE_COLORS[node.type] }}
                    />
                    <span class="text-xs font-semibold text-[var(--text-primary)]">{node.label}</span>
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                    <span class="uppercase">{node.type}</span>
                    <span>•</span>
                    <span>{node.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Show>

        <canvas ref={setCanvasRef} class="h-full w-full" />
      </div>
    </div>
  );
}