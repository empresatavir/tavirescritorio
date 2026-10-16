import { createSignal, createMemo, For, Show } from "solid-js";
import { agents, setAgents, type RosterAgent, showToast, setModalOpen, setCurrentDomainId, setCurrentScreenId } from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";
import { useNavigate } from "@solidjs/router";

export function AgentesView() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = createSignal<string>("");
  const [selectedSector, setSelectedSector] = createSignal<string>("Todos");
  const [selectedAgentForSoul, setSelectedAgentForSoul] = createSignal<RosterAgent | null>(null);
  const [soulDraft, setSoulDraft] = createSignal<string>("");

  const sectors = createMemo(() => {
    const list = Array.from(new Set(agents().map((a) => a.sector)));
    return ["Todos", ...list];
  });

  const filteredAgents = createMemo(() => {
    const q = searchQ().toLowerCase().trim();
    const sec = selectedSector();

    return agents().filter((a) => {
      const matchSec = sec === "Todos" || a.sector === sec;
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.sector.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q);
      return matchSec && matchQ;
    });
  });

  const busyCount = createMemo(() => agents().filter((a) => a.status === "busy").length);
  const errorCount = createMemo(() => agents().filter((a) => a.status === "error").length);

  const statusLabel = (st: RosterAgent["status"]) => {
    switch (st) {
      case "busy": return { label: "Ocupado", color: "var(--teal, #1BC5BD)" };
      case "idle": return { label: "Ocioso", color: "var(--slate, #cbd3de)" };
      case "offline": return { label: "Offline", color: "var(--text-muted, #5E6878)" };
      case "error": return { label: "Erro", color: "var(--ember, oklch(.635 .185 27))" };
    }
  };

  const handleOpenSoul = (ag: RosterAgent) => {
    setSelectedAgentForSoul(ag);
    setSoulDraft(
      ag.soulText ||
        `# Propósito\nAtuar como ${ag.role} no setor ${ag.sector} com autonomia supervisionada.\n\n# Como trabalha\n- Executa jobs respeitando o teto de gastos estipulado\n- Valida critérios de aceite contra o planejamento de teste\n- Registra handoffs formais entre etapas\n\n# Nunca faz\n- Não publica sem aprovação de gates humanos\n- Não altera escopo de outros setores sem alinhamento\n\n# Tom de voz\nEstruturado, objetivo e operacional.\n\n# Escala para\nOrquestrador e CEO.`
    );
  };

  const handleSaveSoul = () => {
    const ag = selectedAgentForSoul();
    if (!ag) return;
    setAgents((prev) =>
      prev.map((a) => (a.id === ag.id ? { ...a, soulText: soulDraft() } : a))
    );
    showToast(`Alma operacional de ${ag.name} salva com sucesso`, "Agentes", "success");
    setSelectedAgentForSoul(null);
  };

  const handleOpenChat = (_ag: RosterAgent) => {
    setCurrentDomainId("chat");
    setCurrentScreenId("chat");
    navigate("/chat");
  };

  const handleStartJob = (_ag: RosterAgent) => {
    setModalOpen(true);
  };

  return (
    <div
      data-screen-label="Agentes"
      style={{
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        "min-height": "0",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px 14px", display: "flex", "align-items": "flex-end", gap: "16px", "flex-wrap": "wrap" }}>
        <div style={{ flex: "1", "min-width": "200px" }}>
          <h1 style={{ margin: "0", "font-size": "20px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
            Agentes
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
            {agents().length} de 47 carregados · {busyCount()} ocupados · {errorCount()} com erro
          </p>
        </div>

        {/* Input de busca */}
        <input
          value={searchQ()}
          onInput={(e) => setSearchQ(e.currentTarget.value)}
          placeholder="Nome, papel ou setor…"
          aria-label="Buscar agentes"
          style={{
            width: "240px",
            height: "32px",
            padding: "0 12px",
            "border-radius": "8px",
            border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
            background: "var(--surface-2, #121c30)",
            color: "var(--text-primary, #F4F6F2)",
            "font-size": "13px",
            outline: "none",
          }}
        />

        {/* Tabs de Setor */}
        <div style={{ display: "flex", gap: "2px", padding: "2px", background: "var(--surface-2, #121c30)", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "999px" }}>
          <For each={sectors()}>
            {(sec) => (
              <button
                type="button"
                onClick={() => setSelectedSector(sec)}
                style={{
                  height: "26px",
                  padding: "0 10px",
                  border: "none",
                  "border-radius": "999px",
                  cursor: "pointer",
                  "font-size": "12px",
                  "font-weight": "500",
                  background: selectedSector() === sec ? "var(--teal, #1BC5BD)" : "transparent",
                  color: selectedSector() === sec ? "var(--ink, #0B1220)" : "var(--text-secondary, #cbd3de)",
                }}
              >
                {sec}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ flex: "1", overflow: "auto", padding: "0 24px 24px" }}>
        <div style={{ border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", overflow: "hidden", "min-width": "880px" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              "grid-template-columns": "minmax(220px, 2fr) 1fr 110px 140px 90px 70px 90px 210px",
              gap: "12px",
              padding: "10px 16px",
              background: "var(--surface-1, #0f1729)",
              "font-family": "var(--font-mono)",
              "font-size": "11px",
              "font-weight": "500",
              "letter-spacing": "0.14em",
              "text-transform": "uppercase",
              color: "var(--text-muted, #aeb7c4)",
            }}
          >
            <span>Agente</span>
            <span>Setor</span>
            <span>Status</span>
            <span>Modelo</span>
            <span style={{ "text-align": "right" }}>Última exec.</span>
            <span style={{ "text-align": "right" }}>Jobs</span>
            <span style={{ "text-align": "right" }}>Custo</span>
            <span></span>
          </div>

          {/* Table Rows */}
          <For each={filteredAgents()}>
            {(ag) => {
              const st = statusLabel(ag.status);

              return (
                <div
                  style={{
                    display: "grid",
                    "grid-template-columns": "minmax(220px, 2fr) 1fr 110px 140px 90px 70px 90px 210px",
                    gap: "12px",
                    "align-items": "center",
                    padding: "10px 16px",
                    "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                    background: "transparent",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "10px", "min-width": "0" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        "border-radius": "8px",
                        flex: "none",
                        display: "flex",
                        "align-items": "center",
                        "justify-content": "center",
                        "font-size": "11px",
                        "font-weight": "600",
                        color: "var(--ink, #0B1220)",
                        background: ag.avatarColor,
                      }}
                    >
                      {ag.initials}
                    </div>
                    <div style={{ "min-width": "0" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenSoul(ag)}
                        title="Ver detalhamento da alma do agente"
                        style={{
                          padding: "0",
                          border: "none",
                          background: "transparent",
                          color: "var(--text-primary, #F4F6F2)",
                          font: "inherit",
                          "font-weight": "500",
                          cursor: "pointer",
                          "text-align": "left",
                          "text-decoration": "underline",
                          "text-decoration-color": "rgba(244,246,242,.34)",
                          "text-underline-offset": "3px",
                        }}
                      >
                        {ag.name}
                      </button>
                      <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                        {ag.role}
                      </div>
                    </div>
                  </div>

                  <span style={{ color: "var(--text-secondary, #cbd3de)" }}>{ag.sector}</span>

                  <span style={{ display: "flex", "align-items": "center", gap: "6px", "font-size": "12px", color: st.color }}>
                    <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: st.color }}></span>
                    {st.label}
                  </span>

                  <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-secondary, #cbd3de)" }}>
                    {ag.model}
                  </span>

                  <span style={{ "text-align": "right", color: "var(--text-secondary, #cbd3de)", "font-size": "12px" }}>
                    {ag.lastRun}
                  </span>

                  <span style={{ "text-align": "right", "font-family": "var(--font-mono)", "font-size": "12px" }}>
                    {ag.totalJobs}
                  </span>

                  <span style={{ "text-align": "right", "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--teal, #1BC5BD)" }}>
                    US$ {ag.totalCost.toFixed(2)}
                  </span>

                  <div style={{ "justify-self": "end", display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenChat(ag)}
                      style={{
                        height: "28px",
                        padding: "0 10px",
                        "border-radius": "999px",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                        background: "transparent",
                        color: "var(--text-primary, #F4F6F2)",
                        cursor: "pointer",
                        "font-size": "12px",
                        display: "flex",
                        "align-items": "center",
                        gap: "6px",
                      }}
                    >
                      <TvIcon name="message-square" style={{ width: "12px", height: "12px" }} />
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartJob(ag)}
                      style={{
                        height: "28px",
                        padding: "0 10px",
                        "border-radius": "999px",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                        background: "transparent",
                        color: "var(--text-primary, #F4F6F2)",
                        cursor: "pointer",
                        "font-size": "12px",
                      }}
                    >
                      Iniciar job
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Modal Dialog de Alma do Agente */}
      <Show when={selectedAgentForSoul()}>
        {(ag) => (
          <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.65)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
            <div style={{ width: "680px", "max-width": "calc(100% - 32px)", "max-height": "calc(100vh - 64px)", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", padding: "20px", display: "flex", "flex-direction": "column", gap: "16px", "box-shadow": "0 24px 60px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                <span style={{ width: "32px", height: "32px", "border-radius": "8px", background: ag().avatarColor, display: "flex", "align-items": "center", "justify-content": "center", "font-weight": "700", color: "#0B1220" }}>
                  {ag().initials}
                </span>
                <div style={{ flex: "1" }}>
                  <div style={{ "font-size": "16px", "font-weight": "600" }}>Alma Operacional: {ag().name}</div>
                  <div style={{ "font-size": "12px", color: "var(--text-muted)" }}>{ag().role} · {ag().sector} · {ag().model}</div>
                </div>
                <button type="button" onClick={() => setSelectedAgentForSoul(null)} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Esc</button>
              </div>

              <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", display: "flex", "flex-direction": "column", gap: "10px" }}>
                <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>Arquivo de Alma (Markdown editável):</span>
                <textarea
                  value={soulDraft()}
                  onInput={(e) => setSoulDraft(e.currentTarget.value)}
                  rows={14}
                  style={{
                    width: "100%",
                    padding: "12px",
                    "border-radius": "8px",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                    background: "var(--surface-0, #0B1220)",
                    color: "var(--text-primary, #F4F6F2)",
                    "font-family": "var(--font-mono)",
                    "font-size": "12px",
                    "line-height": "1.6",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", "justify-content": "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedAgentForSoul(null)}
                  style={{ height: "34px", padding: "0 14px", "border-radius": "999px", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSoul}
                  style={{ height: "34px", padding: "0 18px", "border-radius": "999px", border: "none", background: "var(--lime, #B7F34A)", color: "var(--ink-panel, #25360a)", "font-weight": "600", cursor: "pointer" }}
                >
                  Salvar Alma Operacional
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
