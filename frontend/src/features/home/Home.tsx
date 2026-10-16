export function Home() {
  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-[var(--text-h1)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          TAVIR Escritório
        </h1>
        <p class="mt-2 text-[var(--text-body)] text-[var(--text-secondary)]">
          Painel operacional local — selecione um módulo na barra lateral para iniciar.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Execuções", path: "/execucoes", desc: "Jobs ativos e histórico" },
          { label: "Tasks", path: "/tasks", desc: "Kanban de pendências" },
          { label: "Aprovações", path: "/aprovacoes", desc: "Decisões pendentes" },
          { label: "Agentes", path: "/agentes", desc: "Catálogo dos 47 agentes" },
          { label: "Fábrica", path: "/fabrica", desc: "Templates de engenharia" },
          { label: "Studio", path: "/studio", desc: "Esteira editorial" },
        ].map((card) => (
          <a
            href={card.path}
            class="group rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)] hover:bg-[var(--bg-hover)]"
          >
            <h3 class="text-[var(--text-h3)] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-teal)]">
              {card.label}
            </h3>
            <p class="mt-1 text-[var(--text-label)] uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
              {card.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}