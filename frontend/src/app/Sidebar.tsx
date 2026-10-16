import { A, useLocation } from "@solidjs/router";

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { path: "/sala-operacao", label: "Sala de Operação" },
      { path: "/execucoes", label: "Execuções" },
      { path: "/tasks", label: "Tasks" },
      { path: "/aprovacoes", label: "Aprovações" },
      { path: "/bloqueios", label: "Bloqueios" },
      { path: "/agentes", label: "Agentes" },
      { path: "/alteracoes", label: "Alterações" },
    ],
  },
  {
    label: "Chat",
    items: [{ path: "/chat", label: "Chat com Agentes" }],
  },
  {
    label: "Módulos",
    items: [
      { path: "/studio", label: "Tavir Studio" },
      { path: "/fabrica", label: "Tavir Fábrica" },
      { path: "/flow", label: "Tavir Flow" },
      { path: "/edicao", label: "Tavir Edição" },
    ],
  },
  {
    label: "Visibilidade",
    items: [
      { path: "/analytics", label: "Analytics" },
      { path: "/doctor", label: "Doctor" },
      { path: "/integracoes", label: "Integrações" },
      { path: "/skills", label: "Skills" },
      { path: "/org-chart", label: "Org Chart" },
    ],
  },
  {
    label: "Conhecimento",
    items: [
      { path: "/cerebro", label: "Cérebro" },
      { path: "/memoria", label: "Memória" },
      { path: "/dados", label: "Dados" },
      { path: "/projetos", label: "Projetos" },
      { path: "/ideias", label: "Ideias" },
    ],
  },
  {
    label: "Mapa / Tática",
    items: [
      { path: "/mapa", label: "Mapa" },
      { path: "/mission-control", label: "Mission Control" },
      { path: "/roadmap", label: "Roadmap" },
      { path: "/reference", label: "Reference" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { path: "/funnel", label: "Funnel" },
      { path: "/finances", label: "Finances" },
      { path: "/propostas", label: "Propostas" },
      { path: "/content", label: "Content" },
      { path: "/personas", label: "Personas" },
    ],
  },
  {
    label: "Social / Workflows",
    items: [
      { path: "/workflows", label: "Workflows" },
      { path: "/social", label: "Social" },
      { path: "/plataformas", label: "Plataformas" },
      { path: "/comunicacoes", label: "Comunicações" },
      { path: "/biblioteca", label: "Biblioteca" },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside class="w-64 flex-shrink-0 overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div class="p-4">
        <div class="mb-6 flex items-center gap-3 px-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-lima)] text-[var(--ink-primary)] font-bold text-sm">
            T
          </div>
          <span class="text-[var(--text-h3)] font-semibold tracking-tight text-[var(--text-primary)]">
            TAVIR
          </span>
        </div>
        <nav class="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div>
              <h3 class="mb-2 px-2 text-[var(--text-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                {group.label}
              </h3>
              <ul class="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = () =>
                    location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <li>
                      <A
                        href={item.path}
                        class={`block rounded-md px-2 py-1.5 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                          isActive()
                            ? "bg-[var(--bg-active)] text-[var(--accent-lima)] font-medium"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {item.label}
                      </A>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}