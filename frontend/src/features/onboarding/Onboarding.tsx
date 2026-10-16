import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";

/**
 * G9 — Onboarding tour with local completion tracking.
 * Single-user: marks completion in localStorage, never blocks re-entry.
 */

const ONBOARDING_KEY = "tavir_onboarding_complete";

const STEPS = [
  {
    title: "Bem-vindo ao TAVIR Escritório",
    description:
      "Painel operacional local para orquestrar agentes, jobs e conteúdo editorial. Tudo roda em 127.0.0.1 sem dependências externas.",
  },
  {
    title: "Navegação",
    description:
      "A sidebar agrupa módulos por domínio: Operação, Studio, Fábrica, Visibilidade, Utilitários. Cada rota carrega dados reais do backend SQLite.",
  },
  {
    title: "Jobs & Execuções",
    description:
      "Crie jobs via modal (Motor → Modelo → Esforço → Teto), acompanhe execução ao vivo via SSE, e aprove gates antes de ações irreversíveis.",
  },
  {
    title: "Fábrica & Templates",
    description:
      "6 templates de engenharia (LP/Oferta/Sistemas × Criação/Manutenção) com etapas, owners e artefatos vinculados a jobs reais.",
  },
  {
    title: "Visibilidade & Conhecimento",
    description:
      "Workflows de negócio, fila de ideias, saúde de integrações e base de conhecimento indexada com busca textual.",
  },
];

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = createSignal(0);

  const handleNext = () => {
    if (step() < STEPS.length - 1) {
      setStep(step() + 1);
    } else {
      markOnboardingComplete();
      navigate("/");
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    navigate("/");
  };

  return (
    <div class="flex h-full items-center justify-center">
      <div class="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8">
        {/* Progress */}
        <div class="mb-6 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              class={`h-1 flex-1 rounded-full transition-colors duration-[var(--duration-fast)] ${
                i <= step() ? "bg-[var(--accent-lima)]" : "bg-[var(--bg-hover)]"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div class="min-h-[120px]">
          <h2 class="text-lg font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
            {STEPS[step()].title}
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {STEPS[step()].description}
          </p>
        </div>

        {/* Actions */}
        <div class="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            class="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Pular tour
          </button>
          <div class="flex items-center gap-3">
            <Show when={step() > 0}>
              <button
                type="button"
                onClick={() => setStep(step() - 1)}
                class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                Voltar
              </button>
            </Show>
            <button
              type="button"
              onClick={handleNext}
              class="rounded-[var(--radius-sm)] bg-[var(--accent-lima)] px-4 py-2 text-xs font-semibold text-[#0B1220] hover:opacity-90"
            >
              {step() === STEPS.length - 1 ? "Começar" : "Próximo"}
            </button>
          </div>
        </div>

        <p class="mt-6 text-center text-[10px] text-[var(--text-muted)]">
          Passo {step() + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}