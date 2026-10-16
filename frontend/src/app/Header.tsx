import { useLocation } from "@solidjs/router";

export function Header() {
  const location = useLocation();

  const pathSegments = () =>
    location.pathname
      .split("/")
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <header class="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-6">
      <nav class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span class="font-semibold text-[var(--text-primary)]">TAVIR</span>
        {pathSegments().map((seg, i) => (
          <>
            <span class="text-[var(--text-muted)]">/</span>
            <span
              class={
                i === pathSegments().length - 1
                  ? "font-medium text-[var(--text-primary)]"
                  : ""
              }
            >
              {seg}
            </span>
          </>
        ))}
      </nav>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          ⌘K Buscar
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-lima)] text-xs font-bold text-[var(--ink-primary)]"
          title="Perfil"
        >
          C
        </button>
      </div>
    </header>
  );
}