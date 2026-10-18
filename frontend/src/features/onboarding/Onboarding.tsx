import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../shared/components";

/**
 * G9 — Onboarding Tour Interativo com persistência local de conclusão.
 * Permite navegar os 5 passos conceituais e operacionais do TAVIR Escritório.
 */

const ONBOARDING_KEY = "tavir_onboarding_complete";

const STEPS = [
  {
    icon: "zap",
    badge: "FUNDAÇÃO LOCAL-FIRST",
    title: "Bem-vindo ao TAVIR Escritório",
    description:
      "O TAVIR Escritório é um painel operacional completo para orquestrar 57 agentes especializados de IA, tarefas complexas e conteúdo de marca em um ambiente estritamente local (127.0.0.1) com total privacidade de dados.",
    highlight: "Zero dependências em nuvem obrigatórias • Banco SQLite auditável • Alta performance",
  },
  {
    icon: "layers",
    badge: "ARQUITETURA DE 3 COLUNAS",
    title: "Navegação Estruturada & Domínios",
    description:
      "A interface adota a proporção canônica: Rail (56px) para troca de domínios, SubNav (212px) para exploração de telas e seções, e Main Content (header 52px + scroll independente) com Command Palette (Ctrl+K).",
    highlight: "Domínios: Operação, Studio, Fábrica, Visibilidade, Conhecimento, Tática e Comercial",
  },
  {
    icon: "terminal",
    badge: "ORQUESTRAÇÃO & SSE",
    title: "Ciclo de Jobs & Log ao Vivo",
    description:
      "Todo planejamento é orquestrado pela Paula PM. As etapas são executadas de forma cadenciada, transmitindo eventos em tempo real via Server-Sent Events (SSE) com logs detalhados e rastreabilidade total de tarefas.",
    highlight: "Transparência total passo a passo • Gates humanos antes de ações irreversíveis",
  },
  {
    icon: "cpu",
    badge: "PRODUÇÃO & ENGENHARIA",
    title: "Fábrica de Software & Studio Editorial",
    description:
      "A Fábrica disponibiliza 6 esteiras canônicas (LPs, Ofertas e Sistemas em Criação ou Manutenção). O Studio automatiza a geração de carrosséis, peças de feed (4:5) e vídeos verticais (9:16) sincronizados com o DarkFlow.",
    highlight: "Formatos prontos para Instagram, YouTube e TikTok • Respeito estrito aos Brand Kits",
  },
  {
    icon: "database",
    badge: "INTELIGÊNCIA & RAG",
    title: "Cérebro & Gestão do Conhecimento",
    description:
      "A base de conhecimento reúne 187 referências indexadas no Vault local, com busca semântica, citações de pensadores como Kahneman e Hormozi, telemetria de custos de IA e diagnósticos contínuos no Doctor.",
    highlight: "Telemetria de tokens em tempo real • Reconciliação financeira • Grafo operacional",
  },
];

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = createSignal(0);

  const handleNext = () => {
    if (step() < STEPS.length - 1) {
      setStep(step() + 1);
    } else {
      markOnboardingComplete();
      navigate("/sala-operacao");
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    navigate("/sala-operacao");
  };

  const current = () => STEPS[step()];

  return (
    <div class="flex h-full w-full items-center justify-center overflow-y-auto bg-[var(--surface-0)] p-6">
      <div class="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[rgba(244,246,242,.15)] bg-[#0f1729] p-8 shadow-2xl">
        {/* Glow background */}
        <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[rgba(183,243,74,0.04)] blur-3xl pointer-events-none" />
        <div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[rgba(27,197,189,0.04)] blur-3xl pointer-events-none" />

        {/* Progress Bar */}
        <div class="relative z-10 mb-8 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              class="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                background:
                  i <= step()
                    ? "var(--lime, #B7F34A)"
                    : "rgba(244,246,242,0.1)",
              }}
            />
          ))}
        </div>

        {/* Step Content */}
        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(244,246,242,.15)] bg-[#131c31] text-[var(--lime)] shadow-inner">
              <TvIcon name={current().icon} width={22} height={22} />
            </div>
            <div>
              <span class="rounded bg-[#070d18] px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--teal,#1BC5BD)]">
                {current().badge}
              </span>
              <h2 class="mt-1 text-lg font-bold text-[var(--cloud)]">
                {current().title}
              </h2>
            </div>
          </div>

          <p class="text-xs leading-relaxed text-[var(--t2,#cbd3de)]">
            {current().description}
          </p>

          <div class="rounded-xl border border-[rgba(244,246,242,.08)] bg-[#070d18] p-3.5">
            <p class="text-[10px] font-mono uppercase text-[var(--muted,#aeb7c4)]">Destaque Operacional</p>
            <p class="mt-1 text-xs font-semibold text-[var(--cloud)]">{current().highlight}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div class="relative z-10 mt-8 flex items-center justify-between border-t border-[rgba(244,246,242,.08)] pt-5">
          <button
            type="button"
            onClick={handleSkip}
            class="text-xs font-medium text-[var(--muted,#aeb7c4)] transition-colors hover:text-[var(--cloud)]"
          >
            Pular Onboarding
          </button>

          <div class="flex items-center gap-2.5">
            <Show when={step() > 0}>
              <button
                type="button"
                onClick={() => setStep(step() - 1)}
                class="rounded-lg border border-[rgba(244,246,242,.15)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--cloud)] transition-colors hover:bg-[rgba(244,246,242,.05)]"
              >
                Voltar
              </button>
            </Show>
            <button
              type="button"
              onClick={handleNext}
              class="flex items-center gap-1.5 rounded-lg bg-[var(--lime)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B1220] transition-opacity hover:opacity-90"
            >
              <span>{step() === STEPS.length - 1 ? "Começar a Operar" : "Próximo"}</span>
              <TvIcon name="arrow-right" width={14} height={14} />
            </button>
          </div>
        </div>

        {/* Counter */}
        <p class="mt-4 text-center text-[10px] font-mono text-[var(--muted,#aeb7c4)]">
          Etapa {step() + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}