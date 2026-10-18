import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../shared/components";

/**
 * G9 — Mapa Operacional: Ponto de Conexão Habblaud (Decisão D6).
 * Conforme instrução do usuário: implementação posterior reservada para o Habblaud.
 */
export function Mapa() {
  const navigate = useNavigate();

  const SECTORS = [
    { name: "Sala de Operação & Cockpit", agents: "12 agentes", color: "var(--accent-lima, #B7F34A)", desc: "Orquestração de tarefas, jobs e aprovações" },
    { name: "Estúdio de Criação & Vídeo", agents: "8 agentes", color: "var(--accent-teal, #1BC5BD)", desc: "Produção multimídia, roteirização e design" },
    { name: "Fábrica de Engenharia & Software", agents: "15 agentes", color: "#60a5fa", desc: "Pipelines de LP, esteiras e desenvolvimento" },
    { name: "Comercial & Propostas", agents: "7 agentes", color: "#f59e0b", desc: "Funil de propostas, aceite digital e CRM" },
    { name: "Cérebro & Gestão do Conhecimento", agents: "9 agentes", color: "#a855f7", desc: "187 artigos do Vault, RAG e curadoria" },
    { name: "Diretoria Executiva & QA", agents: "6 agentes", color: "#ec4899", desc: "Paula PM, compliance, auditoria e gates" },
  ];

  return (
    <div class="flex h-full flex-col gap-6 overflow-y-auto bg-[var(--surface-0)] p-6 text-[var(--cloud)]">
      {/* Header */}
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight text-[var(--cloud)]">
              Mapa Operacional
            </h1>
            <span class="inline-flex items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.12)] bg-[#0f1729] px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--muted,#aeb7c4)]">
              Habblaud Engine
            </span>
          </div>
          <p class="mt-1 text-xs text-[var(--t2,#cbd3de)]">
            Visualização espacial e topologia interativa da agência e seus 57 agentes
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={() => navigate("/agentes")}
            class="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(244,246,242,.12)] bg-[#0f1729] px-3 py-1.5 text-xs font-medium text-[var(--cloud)] transition-colors hover:bg-[#162035]"
          >
            <TvIcon name="users" width={14} height={14} />
            Ver Agentes
          </button>
          <button
            onClick={() => navigate("/sala-operacao")}
            class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)] px-3 py-1.5 text-xs font-semibold text-[#0B1220] transition-opacity hover:opacity-90"
          >
            <TvIcon name="terminal" width={14} height={14} />
            Sala de Operação
          </button>
        </div>
      </div>

      {/* Main Reservation Card (Habblaud Engine) */}
      <div class="relative overflow-hidden rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-6 shadow-xl">
        <div class="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[rgba(183,243,74,0.03)] blur-3xl pointer-events-none" />
        <div class="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[rgba(27,197,189,0.03)] blur-3xl pointer-events-none" />

        <div class="relative z-10 flex flex-col gap-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-start gap-3.5">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(244,246,242,.15)] bg-[#131c31] text-[var(--lime)] shadow-inner">
                <TvIcon name="zap" width={24} height={24} />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-bold text-[var(--cloud)]">
                    Ponto de Conexão Habblaud (Decisão D6)
                  </h2>
                  <span class="rounded-md bg-[rgba(245,158,11,0.15)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#fbbf24]">
                    Implementação Posterior
                  </span>
                </div>
                <p class="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--t2,#cbd3de)]">
                  A renderização isométrica e a física espacial do mapa estão formalmente reservadas para a integração com o 
                  motor Habblaud. Este painel centraliza o contrato de telemetria, as demarcações de setores e os agentes alocados.
                </p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2 rounded-lg border border-[rgba(244,246,242,.08)] bg-[#131c31] px-3 py-2 text-right">
              <div>
                <p class="text-[10px] font-mono uppercase text-[var(--muted,#aeb7c4)]">Status do Hook</p>
                <p class="text-xs font-semibold text-[var(--teal,#1BC5BD)]">Interface Pronta</p>
              </div>
              <span class="h-2 w-2 rounded-full bg-[var(--teal,#1BC5BD)] animate-pulse" />
            </div>
          </div>

          {/* Technical Specs Strip */}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-[rgba(244,246,242,.08)] bg-[#070d18] p-4">
            <div>
              <p class="text-[10px] font-mono uppercase tracking-wider text-[var(--muted,#aeb7c4)]">Provedor</p>
              <p class="mt-0.5 text-xs font-semibold text-[var(--cloud)]">Habblaud 3D/Isometric</p>
            </div>
            <div>
              <p class="text-[10px] font-mono uppercase tracking-wider text-[var(--muted,#aeb7c4)]">Protocolo</p>
              <p class="mt-0.5 text-xs font-semibold text-[var(--cloud)]">SSE / WebSocket EventStream</p>
            </div>
            <div>
              <p class="text-[10px] font-mono uppercase tracking-wider text-[var(--muted,#aeb7c4)]">Agentes Cobertos</p>
              <p class="mt-0.5 text-xs font-semibold text-[var(--lime)]">57 Agentes Ativos</p>
            </div>
            <div>
              <p class="text-[10px] font-mono uppercase tracking-wider text-[var(--muted,#aeb7c4)]">Persistência</p>
              <p class="mt-0.5 text-xs font-semibold text-[var(--cloud)]">SQLite Local (tavir.db)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint Sectors Grid */}
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
            Setores Demarcados da Agência (Topologia Espacial)
          </h3>
          <span class="text-[11px] text-[var(--t2,#cbd3de)]">
            6 zonas operacionais catalogadas
          </span>
        </div>

        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((sec) => (
            <div class="group relative overflow-hidden rounded-xl border border-[rgba(244,246,242,.1)] bg-[#0f1729] p-4 transition-all duration-200 hover:border-[rgba(244,246,242,.2)] hover:bg-[#131d33]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="h-2 w-2 rounded-full"
                    style={{ "background-color": sec.color }}
                  />
                  <h4 class="text-xs font-bold text-[var(--cloud)]">{sec.name}</h4>
                </div>
                <span class="rounded bg-[#162035] px-2 py-0.5 text-[10px] font-mono text-[var(--muted,#aeb7c4)]">
                  {sec.agents}
                </span>
              </div>
              <p class="mt-2 text-xs leading-relaxed text-[var(--t2,#cbd3de)]">
                {sec.desc}
              </p>
              <div class="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-[var(--muted,#aeb7c4)]">
                <span class="text-[var(--lime)]">●</span> Demarcação ativa para posicionamento Habblaud
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}