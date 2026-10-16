import { createSignal, createEffect, For, Show } from "solid-js";

interface Persona {
  id: string;
  name: string;
  archetype: string | null;
  pain_points: string | null;
  goals: string | null;
  status: string;
}

interface Profile {
  id: string;
  persona_id: string | null;
  name: string;
  platform: string | null;
  tone: string | null;
  status: string;
}

interface Piece {
  id: string;
  profile_id: string | null;
  title: string;
  content_type: string;
  stage: string;
  status: string;
  created_at: string;
}

const STAGES = [
  { key: "idea", label: "Ideia" },
  { key: "draft", label: "Rascunho" },
  { key: "review", label: "Revisão" },
  { key: "approved", label: "Aprovado" },
  { key: "published", label: "Publicado" },
];

export function Studio() {
  const [personas, setPersonas] = createSignal<Persona[]>([]);
  const [profiles, setProfiles] = createSignal<Profile[]>([]);
  const [pieces, setPieces] = createSignal<Piece[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<"pieces" | "profiles" | "personas">("pieces");

  createEffect(async () => {
    try {
      setLoading(true);
      const [pRes, prRes, piRes] = await Promise.all([
        fetch("/api/v1/studio/personas"),
        fetch("/api/v1/studio/profiles"),
        fetch("/api/v1/studio/pieces"),
      ]);
      if (!pRes.ok || !prRes.ok || !piRes.ok) throw new Error("API error");
      setPersonas(await pRes.json());
      setProfiles(await prRes.json());
      setPieces(await piRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar Studio");
    } finally {
      setLoading(false);
    }
  });

  const stageLabel = (stage: string) =>
    STAGES.find((s) => s.key === stage)?.label ?? stage;

  const stageColor = (stage: string) => {
    switch (stage) {
      case "published": return "bg-[rgba(27,197,189,0.15)] text-[var(--accent-teal)]";
      case "approved": return "bg-[rgba(183,243,74,0.15)] text-[var(--accent-lima)]";
      case "review": return "bg-[rgba(94,104,120,0.2)] text-[var(--text-secondary)]";
      default: return "bg-[var(--bg-hover)] text-[var(--text-muted)]";
    }
  };

  const tabs = [
    { key: "pieces" as const, label: "Peças", count: pieces().length },
    { key: "profiles" as const, label: "Perfis", count: profiles().length },
    { key: "personas" as const, label: "Personas", count: personas().length },
  ];

  return (
    <div class="flex h-full flex-col gap-6">
      <div>
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Tavir Studio
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Esteira editorial — personas, perfis e peças de conteúdo
        </p>
      </div>

      {/* Tabs */}
      <div class="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
        <For each={tabs}>
          {(tab) => (
            <button
              type="button"
              onClick={() => setActiveTab(tab.key)}
              class={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                activeTab() === tab.key
                  ? "bg-[var(--bg-active)] text-[var(--accent-lima)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              <span class="rounded-full bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                {tab.count}
              </span>
            </button>
          )}
        </For>
      </div>

      <Show when={loading()}>
        <div class="py-12 text-center text-sm text-[var(--text-muted)]">Carregando...</div>
      </Show>
      <Show when={error()}>
        <div class="rounded-[var(--radius-md)] border border-[var(--danger,#ef4444)] bg-[rgba(239,68,68,0.1)] p-4 text-sm text-[var(--danger,#ef4444)]">
          {error()}
        </div>
      </Show>

      {/* Pieces View */}
      <Show when={!loading() && !error() && activeTab() === "pieces"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
          <For each={pieces()}>
            {(piece) => (
              <div class="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{piece.title}</h3>
                  <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${stageColor(piece.stage)}`}>
                    {stageLabel(piece.stage)}
                  </span>
                </div>
                <div class="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span class="font-mono uppercase tracking-[var(--tracking-label)]">{piece.content_type}</span>
                  <span>•</span>
                  <span>{new Date(piece.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            )}
          </For>
          <Show when={pieces().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">
              Nenhuma peça registrada.
            </div>
          </Show>
        </div>
      </Show>

      {/* Profiles View */}
      <Show when={!loading() && !error() && activeTab() === "profiles"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
          <For each={profiles()}>
            {(profile) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <h3 class="text-sm font-semibold text-[var(--text-primary)]">{profile.name}</h3>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Show when={profile.platform}>
                    <span class="rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--accent-lima)]">
                      {profile.platform}
                    </span>
                  </Show>
                  <Show when={profile.tone}>
                    <span class="rounded-full border border-[var(--border-primary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {profile.tone}
                    </span>
                  </Show>
                </div>
              </div>
            )}
          </For>
          <Show when={profiles().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">
              Nenhum perfil registrado.
            </div>
          </Show>
        </div>
      </Show>

      {/* Personas View */}
      <Show when={!loading() && !error() && activeTab() === "personas"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
          <For each={personas()}>
            {(persona) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{persona.name}</h3>
                  <Show when={persona.archetype}>
                    <span class="rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--accent-lima)]">
                      {persona.archetype}
                    </span>
                  </Show>
                </div>
                <Show when={persona.pain_points}>
                  <p class="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    <span class="font-medium text-[var(--text-muted)]">Dores:</span> {persona.pain_points}
                  </p>
                </Show>
                <Show when={persona.goals}>
                  <p class="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    <span class="font-medium text-[var(--text-muted)]">Objetivos:</span> {persona.goals}
                  </p>
                </Show>
              </div>
            )}
          </For>
          <Show when={personas().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">
              Nenhuma persona registrada.
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}