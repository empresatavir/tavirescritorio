import { For } from "solid-js";

/**
 * G9 — Design System showcase.
 * Displays all tokens, colors, typography, spacing, radii, and component states.
 */

const COLORS = [
  { name: "Tinta Profunda", value: "#0B1220", var: "--bg-primary" },
  { name: "Lima", value: "#B7F34A", var: "--accent-lima" },
  { name: "Teal", value: "#1BC5BD", var: "--accent-teal" },
  { name: "Nuvem Clara", value: "#F4F6F2", var: "--text-primary" },
  { name: "Ardósia", value: "#5E6878", var: "--text-muted" },
];

const RADII = [
  { name: "Small", value: "8px", var: "--radius-sm" },
  { name: "Medium", value: "14px", var: "--radius-md" },
  { name: "Large", value: "18px", var: "--radius-lg" },
  { name: "Pill", value: "9999px", var: "--radius-pill" },
];

const SPACINGS = ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"];

export function DesignSystem() {
  return (
    <div class="flex h-full flex-col gap-8 overflow-y-auto p-6">
      <div>
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Design System
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Tokens, componentes e estados visuais do TAVIR Escritório
        </p>
      </div>

      {/* Colors */}
      <section>
        <h2 class="mb-3 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Cores
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <For each={COLORS}>
            {(color) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
                <div
                  class="mb-2 h-12 w-full rounded-[var(--radius-sm)]"
                  style={{ "background-color": color.value }}
                />
                <p class="text-xs font-semibold text-[var(--text-primary)]">{color.name}</p>
                <p class="font-mono text-[10px] text-[var(--text-muted)]">{color.value}</p>
                <p class="font-mono text-[10px] text-[var(--text-muted)]">var({color.var})</p>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 class="mb-3 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Tipografia
        </h2>
        <div class="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div>
            <p class="mb-1 text-[10px] font-mono uppercase text-[var(--text-muted)]">Instrument Sans — UI/Body</p>
            <p class="text-2xl font-bold text-[var(--text-primary)]">Heading H1 Bold</p>
            <p class="text-lg font-semibold text-[var(--text-primary)]">Heading H2 Semibold</p>
            <p class="text-sm text-[var(--text-secondary)]">Body text regular — Instrument Sans 400</p>
          </div>
          <div class="border-t border-[var(--border-primary)] pt-3">
            <p class="mb-1 text-[10px] font-mono uppercase text-[var(--text-muted)]">IBM Plex Mono — Data/Labels</p>
            <p class="font-mono text-sm text-[var(--text-primary)]">mono-label: STATUS_ACTIVE</p>
            <p class="font-mono text-xs text-[var(--text-muted)]">mono-caption: 2024-01-15T10:30:00Z</p>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h2 class="mb-3 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Espaçamento (base 4px)
        </h2>
        <div class="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <For each={SPACINGS}>
            {(spacing) => (
              <div class="flex flex-col items-center gap-1">
                <div
                  class="bg-[var(--accent-teal)] opacity-60"
                  style={{ width: spacing, height: spacing }}
                />
                <span class="font-mono text-[10px] text-[var(--text-muted)]">{spacing}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Radii */}
      <section>
        <h2 class="mb-3 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Border Radii
        </h2>
        <div class="flex flex-wrap gap-4">
          <For each={RADII}>
            {(radius) => (
              <div class="flex flex-col items-center gap-2">
                <div
                  class="h-16 w-16 border-2 border-[var(--accent-lima)] bg-[var(--bg-secondary)]"
                  style={{ "border-radius": radius.value }}
                />
                <span class="text-xs font-semibold text-[var(--text-primary)]">{radius.name}</span>
                <span class="font-mono text-[10px] text-[var(--text-muted)]">{radius.value}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Component States */}
      <section>
        <h2 class="mb-3 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
          Estados de Componentes
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Badge variants */}
          <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <p class="mb-2 text-[10px] font-mono uppercase text-[var(--text-muted)]">Badges</p>
            <div class="flex flex-wrap gap-2">
              <span class="rounded-full bg-[rgba(27,197,189,0.15)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--accent-teal)]">active</span>
              <span class="rounded-full bg-[rgba(183,243,74,0.15)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--accent-lima)]">pending</span>
              <span class="rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--danger,#ef4444)]">failed</span>
              <span class="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--text-muted)]">idle</span>
            </div>
          </div>

          {/* Button variants */}
          <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <p class="mb-2 text-[10px] font-mono uppercase text-[var(--text-muted)]">Buttons</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="rounded-[var(--radius-sm)] bg-[var(--accent-lima)] px-3 py-1.5 text-xs font-semibold text-[#0B1220]">Primary</button>
              <button type="button" class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">Secondary</button>
              <button type="button" disabled class="cursor-not-allowed rounded-[var(--radius-sm)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-50">Disabled</button>
            </div>
          </div>

          {/* Input states */}
          <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <p class="mb-2 text-[10px] font-mono uppercase text-[var(--text-muted)]">Inputs</p>
            <div class="flex flex-col gap-2">
              <input type="text" placeholder="Default state" class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none" />
              <input type="text" value="Focus state" class="rounded-[var(--radius-sm)] border border-[var(--accent-teal)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none" />
              <input type="text" value="Disabled" disabled class="cursor-not-allowed rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs text-[var(--text-muted)] opacity-50" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}