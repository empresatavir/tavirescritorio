import React, { useState } from "react";
import "./console.css";
import "./console-panels.css";
import {
  ICN,
  buildAcessosMeridian,
  buildConsoleFromProject,
  buildEsteiraMeridian,
  buildKanbanMeridian,
  buildQaMeridian,
  buildRoadmapMeridian,
  buildSegMeridian,
  buildWorkspaceMeridian,
  type ConsolePend,
  type ConsoleProjectView,
  type ConsoleTab,
  type EsteiraView,
  getConsoleProject,
} from "./consoleDemo";
import type { FabProject } from "../dashboard/panelTypes";

function SvgPath(props: { d: string; w?: number; h?: number; sw?: number; fill?: string }) {
  const w = props.w ?? 15;
  const h = props.h ?? 15;
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill={props.fill || "none"} stroke={props.fill ? undefined : "currentColor"} strokeWidth={props.sw ?? 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={props.d} fill={props.fill || undefined} />
    </svg>
  );
}

export function FabricaConsolePane(props: {
  projectId: string;
  project?: FabProject | null;
  onBack: () => void;
  onTab?: (tab: string) => void;
}) {
  const [ptab, setPtab] = useState<ConsoleTab>("geral");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stage, setStage] = useState(5);
  const [stageTab, setStageTab] = useState("guard");
  const [qaSel, setQaSel] = useState(1);
  const [qaEvf, setQaEvf] = useState("all");
  const [qaRepF, setQaRepF] = useState("all");
  const [credF, setCredF] = useState("all");
  const [envDraft, setEnvDraft] = useState("");
  const [sevF, setSevF] = useState("all");
  const [secOpen, setSecOpen] = useState<Record<string, boolean>>({});
  const [wsFf, setWsFf] = useState<string | number>("all");

  const P =
    getConsoleProject(props.projectId) ||
    (props.project ? buildConsoleFromProject(props.project) : null);
  // Painéis Meridian (fixture) desligados — só Visão geral + placeholders reais.
  const isMeridian = false;
  const meridianTab = false;

  const setTab = (tab: ConsoleTab) => {
    setPtab(tab);
    props.onTab?.(tab);
  };

  const pickStage = (i: number, tab?: string) => {
    setStage(i);
    if (tab) setStageTab(tab);
    else {
      const view = buildEsteiraMeridian(i);
      setStageTab(view.tabs[0]?.id || "guard");
    }
  };

  const tabs = (() => {
    const p = P;
    if (!p) return [] as Array<{ id: ConsoleTab; label: string; n: number; cls: string }>;
    return [
      { id: "geral" as const, label: "Visão geral", n: p.pendN || 0, cls: "warn" },
      { id: "esteira" as const, label: "Esteira", n: 0, cls: "" },
      { id: "kanban" as const, label: "Kanban", n: 0, cls: "" },
      { id: "roadmap" as const, label: "Roadmap", n: 0, cls: "" },
      { id: "arquivos" as const, label: "Workspace", n: p.filesN || 0, cls: "" },
      { id: "qa" as const, label: "QA", n: p.qaTabN || 0, cls: "danger" },
      { id: "seg" as const, label: "Segurança", n: p.segTabN || 0, cls: "danger" },
      { id: "acessos" as const, label: "Acessos", n: p.missingN || 0, cls: "danger" },
    ];
  })();

  const copyPath = () => {
    const p = P;
    if (!p) return;
    try {
      void navigator.clipboard.writeText(p.path);
    } catch {
      /* ignore */
    }
  };

  if (!P) {
    return (
      <div className="page" style={{ padding: "28px", gap: "12px" }}>
        <button type="button" className="link" onClick={() => props.onBack()}>
          ← Painel
        </button>
        <p className="muted">Projeto não encontrado no SQLite. Volte ao painel e recarregue a lista.</p>
      </div>
    );
  }
  const p = P;

  return (
          <>
          <div className="page" style={{ maxWidth: "1320px", gap: "18px", paddingBottom: "110px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" className="link" onClick={() => props.onBack()}>
                ← Painel
              </button>
              <span className="muted">/</span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>{p.name}</span>
              <div className="grow" />
              <button type="button" className="btn sm ghost">
                Pedir alteração
              </button>
              <button type="button" className="btn sm secondary">
                <SvgPath d={ICN.chat} w={15} h={15} />
                Íris
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="ibtn sm"
                  aria-label="Mais ações do projeto"
                  aria-expanded={menuOpen ? "true" : "false"}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <SvgPath d={ICN.dots} w={18} h={18} sw={3} />
                </button>
                {menuOpen ? (
<div className="fb-menu" role="menu">
                    <button type="button" className="fb-mi" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <SvgPath d={ICN.folder} w={17} h={17} />
                      <span>Abrir no Explorer</span>
                      <small>Pasta isolada do projeto</small>
                    </button>
                    <button type="button" className="fb-mi" role="menuitem" onClick={() => { setTab("arquivos"); setMenuOpen(false); }}>
                      <SvgPath d={ICN.code} w={17} h={17} />
                      <span>Workspace</span>
                      <small>Arquivos e estrutura</small>
                    </button>
                    <button type="button" className="fb-mi danger" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <SvgPath d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" w={17} h={17} />
                      <span>Remover projeto</span>
                      <small>Sai do painel · pasta permanece</small>
                    </button>
                  </div>
) : null}
              </div>
            </div>

            <section className="ink" style={{ padding: "22px 24px", display: "flex", gap: "22px", flexWrap: "wrap", alignItems: "stretch" }}>
              <div style={{ flex: "2 1 380px", display: "flex", flexDirection: "column", gap: "10px", minWidth: "0" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span className="badge">{p.code}</span>
                  <span className={`badge ${p.cls}`}>
                    <i />
                    {p.state}
                  </span>
                  <span className={`badge ${p.gCls}`}>Guard {p.gN}/8</span>
                  <span className="badge">{p.due}</span>
                  <span className="badge flow">
                    <i />
                    Git/.env isolado · {p.git}
                  </span>
                  <span className="badge flow">{p.cap}</span>
                </div>
                <h1 style={{ fontSize: "28px", fontWeight: "600", letterSpacing: "-.03em", lineHeight: "1.1" }}>{p.name}</h1>
                <div style={{ fontSize: "13px", color: "var(--on-ink-muted)" }}>
                  {p.kind} · {p.client} · esteira {p.line}
                </div>
                <div className="fb-path">
                  <SvgPath d={ICN.folder} w={15} h={15} />
                  <code>{p.path}</code>
                  <button type="button" className="btn sm onink-sec" onClick={copyPath}>
                    Copiar
                  </button>
                  <button type="button" className="btn sm onink-sec">
                    Abrir no Explorer
                  </button>
                  <button type="button" className="btn sm onink-sec" onClick={() => setTab("arquivos")}>
                    Estrutura
                  </button>
                </div>
                <div className="fb-tags">
                  {p.tags.map((g, __i) => (
<span key={__i} className="fb-chip">
                        <SvgPath d={g.icon} w={12} h={12} sw={2} />
                        {g.t}
                      </span>
))}
                </div>
              </div>

              <div style={{ flex: "1 1 480px", display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px", alignContent: "center" }}>
                <div className="fb-hm">
                  <span
                    className="fb-ring"
                    style={{
                      width: "48px",
                      height: "48px",
                      background: `conic-gradient(#B7F34A 0 ${p.pct}%, rgba(244,246,242,.12) 0)`,
                    }}
                  >
                    <i style={{ width: "38px", height: "38px", background: "#0B1220", color: "#F4F6F2", fontSize: "11px" }}>{p.pct}%</i>
                  </span>
                  <small>Progresso</small>
                </div>
                <button type="button" className="fb-hm" onClick={() => setTab("esteira")}>
                  <b className="num">
                    {p.done}
                    <span>/{p.n}</span>
                  </b>
                  <small>Etapas</small>
                </button>
                <button type="button" className="fb-hm" onClick={() => setTab("qa")}>
                  <b className="num" style={{ color: p.gCol }}>
                    {p.gN}
                    <span>/8</span>
                  </b>
                  <small>Guard</small>
                </button>
                <button type="button" className="fb-hm" onClick={() => setTab("geral")}>
                  <b className="num" style={{ color: p.pCol }}>
                    {p.pendN}
                  </b>
                  <small>Pendências</small>
                </button>
                <div className="fb-hm">
                  <b className="num" style={{ fontSize: "15px" }}>
                    US$ {p.spent}
                  </b>
                  <div style={{ width: "76%", height: "4px", borderRadius: "999px", background: "rgba(244,246,242,.12)", overflow: "hidden", flex: "none" }}>
                    <div style={{ height: "100%", width: `${p.costPct}%`, background: "#1BC5BD" }} />
                  </div>
                  <small>de US$ {p.budget}</small>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                <button type="button" className="btn sm onink-sec" disabled={p.isDone}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={p.pauseIcon} />
                  </svg>
                  {p.pauseLbl}
                </button>
              </div>
            </section>

            {p.paused ? (
<div className="fb-warn" style={{ alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={ICN.pause} />
                </svg>
                <span className="grow">
                  <b>Esteira pausada.</b>
                </span>
                <button type="button" className="btn sm secondary">
                  Retomar
                </button>
              </div>
) : null}

            <div className="tabs" style={{ padding: "0 4px" }}>
              {tabs.map((x, __i) => (
<button key={__i} type="button" className={`tab ${ptab === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}>
                    {x.label}
                    {x.n > 0 ? (
                      <span className={`badge ${x.cls}`} style={{ height: "18px", padding: "0 7px" }}>
                        {x.n}
                      </span>
                    ) : null}
                  </button>
))}
            </div>

            {ptab === "geral" ? (
<VisaoGeral p={p} onEsteira={() => setTab("esteira")} onPend={(a) => (a.kind === "erro" ? setTab("acessos") : setTab("qa"))} />
) : null}

            {ptab === "esteira" && isMeridian ? (
              <EsteiraMeridian stage={stage} stageTab={stageTab} onPickStage={pickStage} onStageTab={setStageTab} />
            ) : null}

            {ptab === "qa" && isMeridian ? (
              <>
                <CompletionGuardBlock E={buildEsteiraMeridian(5, "guard")} />
                <QaMeridian
                  sel={qaSel}
                  evf={qaEvf}
                  repF={qaRepF}
                  onSel={setQaSel}
                  onEvf={setQaEvf}
                  onRepF={setQaRepF}
                />
              </>
            ) : null}

            {ptab === "acessos" && isMeridian ? (
<AcessosMeridian credF={credF} draft={envDraft} onFilter={setCredF} onDraft={setEnvDraft} />
) : null}

            {ptab === "seg" && isMeridian ? (
<SegMeridian
                sevF={sevF}
                openIds={secOpen}
                onSevF={setSevF}
                onToggle={(id) => setSecOpen((o) => ({ ...o, [id]: !(o[id] ?? id === "F-01") }))}
              />
) : null}

            {ptab === "kanban" && isMeridian ? (
<KanbanMeridian />
) : null}

            {ptab === "roadmap" && isMeridian ? (
<RoadmapMeridian />
) : null}

            {ptab === "arquivos" && isMeridian ? (
<WorkspaceMeridian ff={wsFf} onFf={setWsFf} />
) : null}

            {ptab !== "geral" && !meridianTab ? (
              <section className="card" style={{ padding: "28px 22px" }}>
                <div className="eyebrow">{tabs.find((t) => t.id === ptab)?.label}</div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginTop: "6px" }}>Sem dados ainda</h2>
                <p className="sec" style={{ fontSize: "13.5px", marginTop: "8px" }}>
                  Esta aba preenche com artefatos reais da pasta do projeto. A Visão geral já reflete o estado no SQLite.
                </p>
              </section>
            ) : null}

          </div>
          <button type="button" className="fb-fab" aria-label="Abrir Íris, chat do projeto">
            <span className="fb-fabi">ÍR</span>
            <span>
              <b>Íris</b>
              <small>{p.cap}</small>
            </span>
          </button>
          </>
  );
}

function VisaoGeral(props: { p: ConsoleProjectView; onEsteira: () => void; onPend: (a: ConsolePend) => void }) {
  const cs = props.p.cs;
  const ex = props.p.ex;

  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flexWrap: "wrap", animation: "fade 200ms var(--ease) both" }}>
      <div style={{ flex: "2 1 480px", minWidth: "0", display: "flex", flexDirection: "column", gap: "18px" }}>
        <section className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", borderColor: cs.bd }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <span
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                display: "grid",
                placeItems: "center",
                background: cs.ibg,
                color: cs.ifg,
                animation: cs.anim,
                flex: "none",
              }}
            >
              <SvgPath d={cs.icon} w={20} h={20} sw={2} />
            </span>
            <div className="grow" style={{ minWidth: "0" }}>
              <div className="eyebrow">{cs.eyebrow}</div>
              <h2 style={{ fontSize: "22px", fontWeight: "600", letterSpacing: "-.02em", marginTop: "3px" }}>{cs.name}</h2>
            </div>
            <span className={`badge ${cs.cls}`}>
              <i />
              {cs.status}
            </span>
          </div>
          <p className="sec" style={{ fontSize: "13.5px" }}>
            {cs.d}
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span className="av busy" style={{ width: "34px", height: "34px", fontSize: "10px" }}>
              {cs.ini}
            </span>
            <div>
              <b style={{ fontSize: "13px" }}>{cs.owner}</b>
              <div className="mono muted" style={{ fontSize: "11px" }}>
                {cs.skill}
              </div>
            </div>
            <div className="grow" />
            <button type="button" className="btn sm ghost" onClick={() => props.onEsteira()}>
              {cs.secLbl}
            </button>
            <button type="button" className="btn sm secondary" onClick={() => props.onEsteira()}>
              {cs.btn}
            </button>
          </div>
          {cs.blocked ? (
<div className="fb-warn">
              <SvgPath d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" w={16} h={16} sw={2} />
              <span>{cs.blockTxt}</span>
            </div>
) : null}
          <div className="fb-exec">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "9px",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--flow-subtle)",
                  color: "var(--flow)",
                  flex: "none",
                }}
              >
                <SvgPath d={ICN.bolt} w={15} h={15} sw={2} />
              </span>
              <div className="grow" style={{ minWidth: "200px" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="eyebrow" style={{ color: "var(--flow)", fontSize: "10px" }}>
                    Motor & execução
                  </span>
                  <span className="badge flow" style={{ height: "20px" }}>
                    {ex.cap}
                  </span>
                  <span className={`badge ${ex.stCls}`} style={{ height: "20px" }}>
                    {ex.st}
                  </span>
                </div>
                <div className="mono muted" style={{ fontSize: "11px", marginTop: "3px" }}>
                  {ex.meter}
                </div>
              </div>
              <button type="button" className="btn sm ghost">
                {ex.thinkLbl}
              </button>
              <button type="button" className="btn sm ghost" aria-expanded="false">
                Motor
              </button>
              <button type="button" className="btn sm primary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={ICN.play} />
                </svg>
                {ex.runLbl}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h3>Pendências</h3>
            <span className={`badge ${props.p.pBadge}`}>{props.p.pendN}</span>
          </div>
          {props.p.pendN === 0 ? (
<p className="muted" style={{ padding: "18px 20px", fontSize: "13px" }}>
              Nenhuma pendência. A esteira segue sozinha até o próximo gate.
            </p>
) : null}
          <div className="rows">
            {props.p.pends.map((a, __i) => (
<div key={__i} className="row" style={{ cursor: "default", alignItems: "flex-start", gap: "14px", animation: "fade 220ms var(--ease) both" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "grid",
                      placeItems: "center",
                      background: a.ibg,
                      color: a.ifg,
                      flex: "none",
                    }}
                  >
                    <SvgPath d={a.icon} w={17} h={17} />
                  </span>
                  <div className="grow" style={{ minWidth: "0" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`badge ${a.kcls}`}>{a.kindLabel}</span>
                      <b style={{ fontSize: "14px" }}>{a.t}</b>
                    </div>
                    <p className="sec" style={{ fontSize: "13px", marginTop: "5px" }}>
                      {a.d}
                    </p>
                    {a.hasCode ? (
<div className="mono" style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>
                        {a.code}
                      </div>
) : null}
                    <div className="m" style={{ marginTop: "4px" }}>
                      {a.who} · {a.at}
                    </div>
                  </div>
                  <button type="button" className="btn sm secondary" onClick={() => props.onPend(a)}>
                    {a.btn}
                  </button>
                </div>
))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h3>Atividade</h3>
            <div className="grow" />
            {props.p.id === "meridian" ? (
<button type="button" className="link" onClick={() => props.onEsteira()}>
                Livro-razão completo
              </button>
) : null}
          </div>
          <div style={{ padding: "8px 20px 14px" }}>
            {props.p.timeline.map((e, __i) => (
<div key={__i} className="fb-tl">
                  <i style={{ background: e.c }} />
                  <div className="grow" style={{ minWidth: "0" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: "600" }}>{e.x}</div>
                    <div className="muted" style={{ fontSize: "12px", marginTop: "1px" }}>
                      {e.w} · {e.t}
                    </div>
                  </div>
                </div>
))}
          </div>
        </section>
      </div>

      <div style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "18px" }}>
        <section className="card">
          <div className="card-h">
            <h3>Esteira · {props.p.n} etapas</h3>
            <div className="grow" />
            <button type="button" className="link" onClick={() => props.onEsteira()}>
              Abrir
            </button>
          </div>
          <div>
            {props.p.vsteps.map((v, __i) => (
<button key={__i} type="button" className="fb-vs" onClick={() => props.onEsteira()} style={{ background: v.rowBg }}>
                  <span className="fb-nb" style={{ background: v.bg, color: v.fg, border: `1px solid ${v.bd}` }}>
                    {v.n}
                  </span>
                  <span className="grow" style={{ minWidth: "0" }}>
                    <b style={{ fontSize: "13px", display: "block", color: v.tc, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.t}</b>
                    <small className="muted" style={{ fontSize: "11.5px" }}>
                      {v.who}
                    </small>
                  </span>
                  {v.now ? (
<span className={`badge ${v.cls}`}>{v.st}</span>
) : null}
                </button>
))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h3>Inventário</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--line)" }}>
            {props.p.inv.map((f, __i) => (
<div key={__i} style={{ background: "var(--surface-2)", padding: "14px 18px" }}>
                  <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                    {f.k}
                  </div>
                  <div className="num" style={{ fontSize: "18px", marginTop: "4px" }}>
                    {f.v}
                  </div>
                </div>
))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h3>Mesas</h3>
            <span className="muted" style={{ fontSize: "12px" }}>
              {props.p.mesasN}
            </span>
          </div>
          <div className="rows">
            {props.p.mesas.map((m, __i) => (
<div key={__i} className="row" style={{ cursor: "default", padding: "10px 18px" }}>
                  <span className={`av ${m.busy}`} style={{ width: "30px", height: "30px", fontSize: "10px" }}>
                    {m.ini}
                  </span>
                  <div className="grow" style={{ minWidth: "0" }}>
                    <div className="t" style={{ fontSize: "13px" }}>
                      {m.n}
                    </div>
                    <div className="m mono" style={{ fontSize: "10.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.skill}
                    </div>
                  </div>
                  <span className="num muted" style={{ fontSize: "11px" }}>
                    {m.c}
                  </span>
                </div>
))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EsteiraMeridian(props: {
  stage: number;
  stageTab: string;
  onPickStage: (i: number, tab?: string) => void;
  onStageTab: (tab: string) => void;
}) {
  const E = buildEsteiraMeridian(props.stage, props.stageTab);
  const sel = E.sel;
  const showGuard = E.tab === "guard";

  return (
    <>
      <section className="card" style={{ padding: "18px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600" }}>Topologia da esteira</h3>
          <div className="grow" />
          <span className="muted" style={{ fontSize: "12px" }}>
            Clique numa etapa para abrir o painel dela
          </span>
        </div>
        <div className="noscroll" style={{ display: "flex", alignItems: "flex-start", overflowX: "auto" }}>
          {E.nodes.map((n, __i) => (
<div key={__i} style={{ display: "flex", alignItems: "flex-start", flex: n.flex, minWidth: "0" }}>
                {n.hasLine ? (
<div style={{ flex: "1", minWidth: "8px", height: "2px", marginTop: "21px", background: n.line, position: "relative" }}>
                    {n.flow ? (
<i style={{ position: "absolute", top: "-3px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)", animation: "flowdot 1.8s linear infinite" }} />
) : null}
                  </div>
) : null}
                <button
                  type="button"
                  aria-pressed={n.pressed ? "true" : "false"}
                  onClick={() => props.onPickStage(n.i)}
                  style={{
                    flex: "none",
                    width: "84px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    background: "transparent",
                    border: "0",
                    color: "inherit",
                    padding: "0 0 8px",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      display: "grid",
                      placeItems: "center",
                      background: n.bg,
                      color: n.fg,
                      border: `2px solid ${n.bd}`,
                      boxShadow: n.sh,
                      animation: n.anim,
                      transition: "all 220ms var(--ease)",
                    }}
                  >
                    <SvgPath d={n.icon} w={18} h={18} sw={2.1} />
                  </span>
                  <b style={{ fontSize: "12px", color: n.tc, whiteSpace: "nowrap" }}>{n.label}</b>
                  <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {n.meta}
                  </span>
                  <i
                    style={{
                      position: "absolute",
                      bottom: "0",
                      left: "22px",
                      right: "22px",
                      height: "3px",
                      borderRadius: "3px",
                      background: n.under,
                      transition: "background 200ms var(--ease)",
                    }}
                  />
                </button>
              </div>
))}
        </div>
      </section>

      <section className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "13px",
              display: "grid",
              placeItems: "center",
              background: sel.ibg,
              color: sel.ifg,
              flex: "none",
            }}
          >
            <SvgPath d={sel.icon} w={20} h={20} sw={2} />
          </span>
          <div className="grow" style={{ minWidth: "200px" }}>
            <div className="eyebrow">
              Etapa {sel.n} de 09 · {sel.state}
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "600", letterSpacing: "-.02em", marginTop: "4px" }}>{sel.label}</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span className={`av ${sel.busy}`} style={{ width: "34px", height: "34px", fontSize: "10px" }}>
              {sel.ini}
            </span>
            <div>
              <b style={{ fontSize: "13px" }}>{sel.owner}</b>
              <div className="muted" style={{ fontSize: "11.5px" }}>
                {sel.role}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "18px", padding: "0 18px", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)" }}>
            <div>
              <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                Duração
              </div>
              <div className="num" style={{ fontSize: "14px", marginTop: "3px" }}>
                {sel.dur}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                Custo
              </div>
              <div className="num" style={{ fontSize: "14px", marginTop: "3px" }}>
                {sel.cost}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                Arquivos
              </div>
              <div className="num" style={{ fontSize: "14px", marginTop: "3px" }}>
                {sel.fileN}
              </div>
            </div>
          </div>
          <button type="button" className="btn sm secondary" disabled={sel.locked}>
            Refazer etapa
          </button>
        </div>
        {sel.waiting ? (
<div style={{ margin: "0 20px 14px", padding: "10px 14px", borderRadius: "10px", background: "var(--surface-0)", border: "1px dashed var(--line-strong)", fontSize: "13px" }} className="sec">
            Esta etapa começa quando <b style={{ color: "var(--text-primary)" }}>{sel.prev}</b> fechar. O que aparece abaixo é o plano dela.
          </div>
) : null}
        <div className="tabs" style={{ padding: "0 12px" }}>
          {E.tabs.map((t, __i) => (
<button key={__i} type="button" className={`tab ${t.on ? "on" : ""}`} onClick={() => props.onStageTab(t.id)}>
                {t.label}
                {t.hasN ? (
<span className={`badge ${t.ncls}`} style={{ height: "18px", padding: "0 7px" }}>
                    {t.n}
                  </span>
) : null}
              </button>
))}
        </div>
      </section>

      {showGuard ? (
<CompletionGuardBlock E={E} />
) : null}

      {!showGuard ? (
<section className="card" style={{ padding: "22px" }}>
          <p className="sec" style={{ fontSize: "13.5px" }}>
            Conteúdo da subaba «{E.tabs.find((t) => t.on)?.label}» — use Completion Guard na etapa QA para o gate.
          </p>
        </section>
) : null}
    </>
  );
}

function CompletionGuardBlock(props: { E: EsteiraView }) {
  const E = props.E;
  return (
    <>
      <div className="card" style={{ padding: "16px 18px", display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: `conic-gradient(${E.guardColor} 0 ${E.guardPct}%, var(--line) 0)`,
            display: "grid",
            placeItems: "center",
            flex: "none",
          }}
        >
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
            <span className="num" style={{ fontSize: "13px" }}>
              {E.guardN}/{E.guardT}
            </span>
          </div>
        </div>
        <div className="grow" style={{ minWidth: "220px" }}>
          <b style={{ fontSize: "16px" }}>{E.guardTitle}</b>
          <p className="sec" style={{ fontSize: "13px", marginTop: "2px" }}>
            {E.guardNote}
          </p>
        </div>
        <button type="button" className="btn primary" disabled={E.guardBlocked}>
          {E.signLabel}
        </button>
      </div>
      <div className="g2">
        {E.guardGroups.map((g, __i) => (
<section key={__i} className="card">
              <div className="card-h">
                <h3>{g.label}</h3>
                <div className="grow" />
                <span className="num muted" style={{ fontSize: "12px" }}>
                  {g.ok} de {g.n}
                </span>
              </div>
              <div className="rows">
                {g.items.map((i, __i) => (

                    <div key={__i} className="row" style={{ cursor: "default" }}>
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: i.bg,
                          color: i.fg,
                          flex: "none",
                        }}
                      >
                        <SvgPath d={i.icon} w={13} h={13} sw={2.6} />
                      </span>
                      <div className="grow">
                        <div className="t" style={{ fontSize: "14px" }}>
                          {i.t}
                        </div>
                        <div className="m">{i.m}</div>
                      </div>
                      {i.hasEv ? (
<button type="button" className="link" style={{ fontSize: "12px" }}>
                          evidência
                        </button>
) : null}
                      {i.hasAct ? (
<button type="button" className="btn sm secondary">
                          {i.actLabel}
                        </button>
) : null}
                    </div>
))}
              </div>
            </section>
          
))}
      </div>
    </>
  );
}

function QaMeridian(props: {
  sel: number;
  evf: string;
  repF: string;
  onSel: (i: number) => void;
  onEvf: (f: string) => void;
  onRepF: (f: string) => void;
}) {
  const Q = buildQaMeridian(props.sel, props.evf, props.repF);

  return (
    <>
      <section className="card" style={{ padding: "18px 20px", display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: `conic-gradient(${Q.ring} 0 ${Q.pct}%, var(--line) 0)`,
            display: "grid",
            placeItems: "center",
            flex: "none",
          }}
        >
          <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
            <span className="num" style={{ fontSize: "13px" }}>
              {Q.pct}%
            </span>
          </div>
        </div>
        <div className="grow" style={{ minWidth: "240px" }}>
          <div className="eyebrow" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <SvgPath d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10" w={13} h={13} sw={1.9} />
            QA · testes automatizados
          </div>
          <b style={{ fontSize: "17px", display: "block", marginTop: "3px" }}>{Q.title}</b>
          <p className="sec" style={{ fontSize: "12.5px", marginTop: "2px" }}>
            {Q.note}
          </p>
        </div>
        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
          {Q.stats.map((x, __i) => (
<div key={__i}>
                <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                  {x.k}
                </div>
                <div className="num" style={{ fontSize: "17px", color: x.c }}>
                  {x.v}
                </div>
              </div>
))}
        </div>
        <button type="button" className="btn sm primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={ICN.play} />
          </svg>
          {Q.runLbl}
        </button>
      </section>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <section className="card" style={{ flex: "0 1 270px", minWidth: "230px", overflow: "hidden" }}>
          <div className="card-h">
            <h3>Execuções</h3>
            <div className="grow" />
            <span className="num muted" style={{ fontSize: "11px" }}>
              mais recente primeiro
            </span>
          </div>
          {Q.runs.map((r, __i) => (
<button key={__i} type="button" className={`fb-run ${r.on ? "on" : ""}`} onClick={() => props.onSel(r.i)}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <b className="mono" style={{ fontSize: "13px" }}>
                    {r.id}
                  </b>
                  <div className="grow" />
                  <span className={`badge ${r.cls}`}>{r.res}</span>
                </div>
                <small>
                  {r.when} · {r.by}
                </small>
                <div className="fb-pb">
                  <i style={{ width: `${r.pp}%` }} />
                </div>
              </button>
))}
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="eyebrow" style={{ fontSize: "9.5px" }}>
              Armazenadas em
            </span>
            <code className="mono" style={{ fontSize: "10.5px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
              {Q.store}
            </code>
            <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start", padding: "0" }}>
              Abrir pasta de evidências
            </button>
          </div>
        </section>

        <div style={{ flex: "1 1 520px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: "14px" }}>Evidências · {Q.selId}</b>
            <div className="grow" />
            <div className="segs">
              {Q.evf.map((f, __i) => (
<button key={__i} type="button" className={`seg ${f.on ? "on" : ""}`} onClick={() => props.onEvf(f.id)} style={{ height: "28px", fontSize: "12px" }}>
                    {f.label}
                    <span className="c">{f.n}</span>
                  </button>
))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(190px, 100%), 1fr))", gap: "12px" }}>
            {Q.ev.map((e, __i) => (
<button key={__i} type="button" className="card lift fb-ev">
                  <div className="fb-th" style={{ background: e.bg }}>
                    {e.isShot && !e.isVideo && !e.isGif ? (
<div className="fb-mini" style={{ width: e.mw }}>
                        <i className="n" />
                        <i className="h1" />
                        <i className="h2" />
                        <i className="b" />
                        <i className="c" />
                        {e.fail ? (
<span className="fb-mini-bug" />
) : null}
                      </div>
) : null}
                    {e.isDoc ? (
<div className="fb-doc">
                        <i className="t" />
                        <i />
                        <i className="ok" />
                        <i className="er" />
                        <i />
                        <i style={{ width: "70%" }} />
                        <i style={{ width: "50%" }} />
                      </div>
) : null}
                    {e.isVideo ? (
<span className="fb-playc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={ICN.play} />
                        </svg>
                      </span>
) : null}
                    {e.isGif ? (
<span className="fb-gifdot" />
) : null}
                    <span className="fb-thtag">{e.tag}</span>
                    {e.hasDur ? (<><span className="fb-thdur">{e.dur}</span></>) : null}
                  </div>
                  <b style={{ fontSize: "12.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} className="mono">
                    {e.name}
                  </b>
                  <span style={{ fontSize: "11.5px", color: e.mc }}>{e.meta}</span>
                </button>
))}
          </div>

          <section className="card" style={{ overflow: "hidden" }}>
            <div className="card-h" style={{ flexWrap: "wrap" }}>
              <h3>Resultados dos testes</h3>
              <span className="num muted" style={{ fontSize: "12px" }}>
                {Q.selId}
              </span>
              <div className="grow" />
              <div className="segs">
                {Q.rf.map((f, __i) => (
<button key={__i} type="button" className={`seg ${f.on ? "on" : ""}`} onClick={() => props.onRepF(f.id)} style={{ height: "28px", fontSize: "12px" }}>
                      {f.label}
                    </button>
))}
              </div>
            </div>
            {Q.suites.map((su, __i) => (
<React.Fragment key={__i}>
                  <div style={{ padding: "10px 18px", background: "var(--surface-1)", borderBottom: "1px solid var(--line)", display: "flex", gap: "8px", alignItems: "center" }}>
                    <b style={{ fontSize: "13px" }}>{su.name}</b>
                    <span className={`badge ${su.cls}`}>{su.ok}</span>
                  </div>
                  {su.tests.map((tc, __i) => (

                      <div key={__i} className={`fb-tc ${tc.cls2}`}>
                        <span style={{ color: tc.ic, marginTop: "1px" }}>
                          <SvgPath d={tc.icon} w={14} h={14} sw={2.6} />
                        </span>
                        <div className="grow" style={{ minWidth: "0" }}>
                          <div>{tc.name}</div>
                          {tc.fail ? (<><div className="fb-err">
                              <div style={{ color: "var(--danger)" }}>{tc.msg}</div>
                              <div>{tc.at}</div>
                            </div></>) : null}
                        </div>
                        <span className="mono muted" style={{ fontSize: "11px" }}>
                          {tc.dur}
                        </span>
                        {tc.hasEv ? (<><button type="button" className="link" style={{ fontSize: "12px" }}>
                            evidência
                          </button></>) : null}
                      </div>
))}
                </React.Fragment>
              
))}
          </section>
        </div>
      </div>
    </>
  );
}

function AcessosMeridian(props: {
  credF: string;
  draft: string;
  onFilter: (f: string) => void;
  onDraft: (v: string) => void;
}) {
  const A = buildAcessosMeridian(props.credF, props.draft);

  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "2 1 520px", minWidth: "0", display: "flex", flexDirection: "column", gap: "18px" }}>
        <section className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="grow" style={{ minWidth: "220px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <SvgPath d="M15 9a3 3 0 1 1-3 3M12 12l-7 7M7 17l2 2M9 15l2 2" w={17} h={17} sw={1.9} />
                <h3 style={{ fontSize: "15px", fontWeight: "600" }}>Credenciais & variáveis</h3>
                <span className="badge">{A.target}</span>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", marginTop: "4px" }}>
                Valores ficam mascarados. Somente admins podem revelar.
              </p>
            </div>
            <button type="button" className="btn sm secondary">
              <SvgPath d="M12 5v14M5 12h14" w={15} h={15} sw={1.9} />
              Adicionar
            </button>
          </div>
          <div className="segs">
            {A.filters.map((f, __i) => (
<button key={__i} type="button" className={`seg ${f.on ? "on" : ""}`} onClick={() => props.onFilter(f.id)} style={{ height: "28px", fontSize: "12px" }}>
                  {f.label}
                  <span className="c">{f.n}</span>
                </button>
))}
          </div>
          {A.creds.map((c, __i) => (
<div key={__i} className={`fb-cred ${c.cls}`}>
                <span className="fb-svc" title={c.svc}>
                  <SvgPath d={c.icon} w={18} h={18} sw={1.9} />
                </span>
                <div className="grow" style={{ minWidth: "0" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="fb-ck">{c.k}</span>
                    <span className={`badge ${c.stCls}`}>
                      <i />
                      {c.st}
                    </span>
                    <span className="badge">{c.env}</span>
                  </div>
                  {c.showVal ? (<><div className="fb-cv" style={{ color: c.vc }}>
                      {c.v}
                    </div></>) : null}
                  {c.missing ? (<><div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                      <input
                        className="input mono"
                        style={{ height: "34px", fontSize: "12px", flex: "1 1 240px" }}
                        value={c.draft}
                        onChange={(e) => props.onDraft(e.currentTarget.value)}
                        placeholder="https://projeto.supabase.co"
                        aria-label={`Valor de ${c.k}`}
                      />
                      <button type="button" className="btn sm ghost" onClick={() => props.onDraft("https://mrdnxq2k.supabase.co")} style={{ height: "34px" }}>
                        Puxar do Supabase
                      </button>
                      <button type="button" className="btn sm secondary" style={{ height: "34px" }}>
                        {c.saveLbl}
                      </button>
                    </div>
                    <div className="fb-cm" style={{ color: "var(--text-secondary)" }}>
                      Ao salvar, a variável vai para {c.dest} e o preview é refeito. A pendência fecha sozinha.
                    </div></>) : null}
                  <div className="fb-cm">{c.meta}</div>
                </div>
                <div className="fb-ca">
                  {c.canReveal ? (<><button type="button" className="ibtn sm" aria-label="Revelar valor (admin)" title="Revelar valor (admin)">
                      <SvgPath d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" w={16} h={16} sw={1.9} />
                    </button>
                    <button type="button" className="ibtn sm" aria-label="Copiar valor" title="Copiar valor">
                      <SvgPath d="M8 8h12v12H8zM4 16V4h12" w={16} h={16} sw={1.9} />
                    </button></>) : null}
                  <button type="button" className="btn sm ghost">
                    Editar
                  </button>
                </div>
              </div>
))}
          {A.empty ? (<><p className="muted" style={{ fontSize: "13px", padding: "8px 2px" }}>
              Nenhuma credencial neste filtro.
            </p></>) : null}
        </section>

        <section className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <SvgPath d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" w={17} h={17} sw={1.9} />
            <h3 style={{ fontSize: "15px", fontWeight: "600" }}>Contas conectadas</h3>
            <div className="grow" />
            <span className="muted" style={{ fontSize: "12px" }}>
              {A.accTxt}
            </span>
          </div>
          {A.acc.map((a, __i) => (
<div key={__i} className="fb-cred" style={{ padding: "12px 14px", alignItems: "center" }}>
                <span className="fb-svc" style={{ width: "34px", height: "34px" }}>
                  <SvgPath d={a.icon} w={16} h={16} sw={1.9} />
                </span>
                <div className="grow" style={{ minWidth: "0" }}>
                  <b style={{ fontSize: "13.5px" }}>{a.s}</b>
                  <div className="mono muted" style={{ fontSize: "11.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.a} · {a.sc}
                  </div>
                </div>
                <span className={`badge ${a.cls}`}>
                  <i />
                  {a.st}
                </span>
              </div>
))}
        </section>
      </div>

      <div style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "18px" }}>
        <section className="card" style={{ padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              width: "66px",
              height: "66px",
              borderRadius: "50%",
              background: `conic-gradient(${A.hCol} 0 ${A.hPct}%, var(--line) 0)`,
              display: "grid",
              placeItems: "center",
              flex: "none",
            }}
          >
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
              <span className="num" style={{ fontSize: "13px" }}>
                {A.hPct}%
              </span>
            </div>
          </div>
          <div className="grow">
            <b style={{ fontSize: "15px" }}>Saúde dos acessos</b>
            <div className="muted" style={{ fontSize: "12.5px", marginTop: "2px" }}>
              {A.hTxt}
            </div>
            {A.hasMissing ? (<><span className="badge danger" style={{ marginTop: "8px" }}>
                <i />
                {A.missingTxt}
              </span></>) : null}
          </div>
        </section>
        <section className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
            <SvgPath d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c1-4 3.5-6 7-6s6 2 7 6M17 3.5a4 4 0 0 1 0 7.5M19 15c1.6.8 2.6 2.8 3 6" w={17} h={17} sw={1.9} />
            <h3 style={{ fontSize: "15px", fontWeight: "600" }}>Pessoas com acesso</h3>
            <div className="grow" />
            <button type="button" className="link">
              Convidar
            </button>
          </div>
          {A.people.map((p, __i) => (
<div key={__i} className="fb-pp">
                <span className="av" style={{ width: "36px", height: "36px", fontSize: "10.5px", color: p.c, borderColor: p.c }}>
                  {p.i}
                </span>
                <div className="grow" style={{ minWidth: "0" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>{p.n}</div>
                  <div className="muted" style={{ fontSize: "11.5px" }}>
                    {p.r}
                  </div>
                </div>
                <span className={`fb-role ${p.cls}`}>
                  <SvgPath d={p.icon} w={12} h={12} sw={2.2} />
                  {p.p}
                </span>
              </div>
))}
        </section>
      </div>
    </div>
  );
}

function SegMeridian(props: {
  sevF: string;
  openIds: Record<string, boolean>;
  onSevF: (f: string) => void;
  onToggle: (id: string) => void;
}) {
  const S = buildSegMeridian(props.sevF, props.openIds);

  return (
    <>
      <section className="card" style={{ padding: "18px 20px", display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: `conic-gradient(${S.ring} 0 ${S.score}%, var(--line) 0)`,
            display: "grid",
            placeItems: "center",
            flex: "none",
          }}
        >
          <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center", textAlign: "center" }}>
            <span className="num" style={{ fontSize: "14px", lineHeight: "1" }}>
              {S.score}
              <br />
              <small style={{ fontSize: "9px", color: "var(--text-muted)" }}>/100</small>
            </span>
          </div>
        </div>
        <div className="grow" style={{ minWidth: "240px" }}>
          <div className="eyebrow" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <SvgPath d={ICN.shield} w={13} h={13} sw={1.9} />
            Segurança & LGPD
          </div>
          <b style={{ fontSize: "17px", display: "block", marginTop: "3px" }}>{S.title}</b>
          <p className="sec" style={{ fontSize: "12.5px", marginTop: "2px" }}>
            {S.note}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {S.sevs.map((v, __i) => (
<span key={__i} className={`fb-sev ${v.cls}`}>
                <b>{v.n}</b>
                {v.label}
              </span>
))}
        </div>
        <button type="button" className="btn sm primary">
          <SvgPath d={ICN.shield} w={14} h={14} sw={1.9} />
          {S.runLbl}
        </button>
      </section>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 520px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
          <section className="card" style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="fb-th" style={{ width: "150px", height: "112px", background: "#0e1626", flex: "none" }}>
              <div className="fb-doc" style={{ width: "72%" }}>
                <i className="t" />
                <i />
                <i className="er" />
                <i />
                <i className="ok" />
                <i style={{ width: "70%" }} />
                <i style={{ width: "46%" }} />
              </div>
              <span className="fb-thtag">HTML</span>
            </div>
            <div className="grow" style={{ minWidth: "220px" }}>
              <div className="eyebrow" style={{ fontSize: "10px" }}>
                Relatório completo · {S.selId}
              </div>
              <b style={{ fontSize: "15px", display: "block", marginTop: "3px" }}>Todos os testes, falhas, evidências e correções</b>
              <p className="muted" style={{ fontSize: "12.5px", marginTop: "3px" }}>
                {S.checksN} testes · {S.passN} passaram · {S.findN} achados · ferramentas:{" "}
                {S.tools.map((x, __i) => (
<span key={__i} className="mono" style={{ fontSize: "11px" }}>
                      {x.t} ·{" "}
                    </span>
))}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn sm secondary">
                <SvgPath d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" w={14} h={14} sw={1.9} />
                Abrir relatório
              </button>
              <button type="button" className="btn sm ghost">
                <SvgPath d="M12 4v11M7 10l5 5 5-5M5 20h14" w={14} h={14} sw={1.9} />
                Baixar HTML
              </button>
            </div>
          </section>

          <section className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600" }}>Falhas encontradas</h3>
              <div className="grow" />
              <div className="segs">
                {S.ff.map((f, __i) => (
<button key={__i} type="button" className={`seg ${f.on ? "on" : ""}`} onClick={() => props.onSevF(f.id)} style={{ height: "28px", fontSize: "12px" }}>
                      {f.label}
                      <span className="c">{f.n}</span>
                    </button>
))}
              </div>
            </div>
            {S.noFind ? (<><p className="muted" style={{ fontSize: "13px" }}>
                Nenhuma falha neste filtro.
              </p></>) : null}
            {S.findings.map((f, __i) => (
<div key={__i} className={`fb-find ${f.cls}`}>
                  <button type="button" className="fb-fh" onClick={() => props.onToggle(f.id)} aria-expanded={f.open}>
                    <span className={`badge ${f.sevCls}`} style={{ textTransform: "capitalize" }}>
                      {f.sev}
                    </span>
                    <span className="mono muted" style={{ fontSize: "11px" }}>
                      {f.id}
                    </span>
                    <div className="grow" style={{ minWidth: "0" }}>
                      <b style={{ fontSize: "13.5px", display: "block" }}>{f.title}</b>
                      <span className="muted mono" style={{ fontSize: "11px" }}>
                        {f.where}
                      </span>
                    </div>
                    <span className={`badge ${f.stCls}`}>
                      <i />
                      {f.st}
                    </span>
                    <SvgPath d={f.chev} w={16} h={16} sw={2} />
                  </button>
                  {f.open ? (<><div className="fb-fb">
                      <p className="sec">{f.desc}</p>
                      <h4>Evidência</h4>
                      <pre className="fb-pre">{f.ev}</pre>
                      <h4>Impacto</h4>
                      <p className="sec">{f.impact}</p>
                      <h4>Como corrigir</h4>
                      <p>{f.fix}</p>
                      <pre className="fb-pre fix">{f.code}</pre>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {f.refs.map((r, __i) => (
<span key={__i} className="badge">{r}</span>
))}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                        {f.isOpen ? (<><button type="button" className="btn sm secondary">
                            <SvgPath d="M13 3 5 14h6l-1 7 8-11h-6z" w={14} h={14} sw={1.9} />
                            Pedir correção ao motor
                          </button>
                          <button type="button" className="btn sm ghost">
                            Marcar como corrigida
                          </button></>) : null}
                        <button type="button" className="btn sm ghost">
                          Copiar sugestão
                        </button>
                        {f.hasImg ? (<><button type="button" className="btn sm ghost">
                            Ver print
                          </button></>) : null}
                      </div>
                    </div></>) : null}
                </div>
))}
          </section>
        </div>

        <div style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
          <section className="card" style={{ overflow: "hidden" }}>
            <div className="card-h">
              <h3>Varreduras</h3>
            </div>
            {S.runs.map((r, __i) => (
<button key={__i} type="button" className={`fb-run ${r.on ? "on" : ""}`}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <b className="mono" style={{ fontSize: "13px" }}>
                      {r.id}
                    </b>
                    <div className="grow" />
                    <span className={`badge ${r.cls}`}>{r.res}</span>
                  </div>
                  <small>
                    {r.when} · {r.by}
                  </small>
                  <div className="fb-pb">
                    <i style={{ width: `${r.pp}%` }} />
                  </div>
                </button>
))}
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <span className="eyebrow" style={{ fontSize: "9.5px" }}>
                Armazenadas em
              </span>
              <code className="mono" style={{ fontSize: "10.5px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                {S.store}
              </code>
            </div>
          </section>

          <section className="card" style={{ overflow: "hidden" }}>
            <div className="card-h">
              <h3>Testes realizados</h3>
              <div className="grow" />
              <span className="num muted" style={{ fontSize: "11px" }}>
                {S.checkTxt}
              </span>
            </div>
            {S.checks.map((c, __i) => (
<div key={__i} className="fb-chk">
                  <span className={`badge ${c.cls}`} style={{ height: "20px", flex: "none", minWidth: "64px", justifyContent: "center" }}>
                    {c.lbl}
                  </span>
                  <div className="grow" style={{ minWidth: "0" }}>
                    {c.t}
                    <div className="muted" style={{ fontSize: "11px" }}>
                      {c.area}
                    </div>
                  </div>
                </div>
))}
          </section>

          {S.hasImgs ? (<><section className="card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600" }}>Imagens da varredura</h3>
              {S.imgs.map((e, __i) => (
<button key={__i} type="button" className="card lift fb-ev">
                    <div className="fb-th" style={{ background: e.bg }}>
                      {e.isShot ? (<><div className="fb-mini" style={{ width: e.mw }}>
                          <i className="n" />
                          <i className="h1" />
                          <i className="h2" />
                          <i className="b" />
                          <i className="c" />
                          {e.fail ? (<><span className="fb-mini-bug" /></>) : null}
                        </div></>) : null}
                      <span className="fb-thtag">{e.tag}</span>
                    </div>
                    <b className="mono" style={{ fontSize: "12px" }}>
                      {e.name}
                    </b>
                    <span style={{ fontSize: "11.5px", color: e.mc }}>{e.meta}</span>
                  </button>
))}
            </section></>) : null}
        </div>
      </div>
    </>
  );
}

function KanbanMeridian() {
  const cols = buildKanbanMeridian();
  return (
    <div className="kanban" style={{ gridTemplateColumns: "repeat(4, minmax(200px, 1fr))" }}>
      {cols.map((c, __i) => (
<div key={__i} className="kcol">
            <div className="kcol-h">
              <i style={{ background: c.col }} />
              <b>{c.t}</b>
              <span className="badge" style={{ marginLeft: "auto" }}>
                {c.n}
              </span>
            </div>
            {c.cards.map((k, __i) => (

                <button key={__i} type="button" className={`kcard ${k.cls}`}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className="mono muted" style={{ fontSize: "11px" }}>
                      {k.n}
                    </span>
                    <div className="grow" />
                    {k.hasB ? (<><span className={`badge ${k.bcls}`}>{k.b}</span></>) : null}
                  </div>
                  <b style={{ fontSize: "14px", lineHeight: "1.3" }}>{k.t}</b>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="av" style={{ width: "24px", height: "24px", fontSize: "9px" }}>
                      {k.ini}
                    </span>
                    <span className="muted" style={{ fontSize: "12px" }}>
                      {k.who}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                    {k.skill}
                  </span>
                </button>
))}
            {c.empty ? (<><p className="muted" style={{ fontSize: "12px", padding: "6px 4px" }}>
                Nada aqui agora.
              </p></>) : null}
          </div>
        
))}
    </div>
  );
}

function RoadmapMeridian() {
  const R = buildRoadmapMeridian();
  return (
    <>
      <section className="card" style={{ overflow: "hidden" }}>
        <div className="card-h" style={{ flexWrap: "wrap" }}>
          <h3>Roadmap</h3>
          <span className="num muted" style={{ fontSize: "12px" }}>
            {R.range}
          </span>
          <div className="grow" />
          <div className="legend">
            <span>
              <i style={{ background: "var(--flow)" }} />
              concluída
            </span>
            <span>
              <i style={{ background: "var(--warning)" }} />
              agora
            </span>
            <span>
              <i style={{ background: "var(--line-strong)" }} />
              planejada
            </span>
            <span>
              <i style={{ background: "var(--lime)", transform: "rotate(45deg)" }} />
              gate
            </span>
          </div>
        </div>
        <div className="noscroll" style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "820px", position: "relative" }}>
            <div className="fb-rr" style={{ minHeight: "32px", background: "var(--surface-1)" }}>
              <span className="eyebrow" style={{ padding: "0 16px", fontSize: "9.5px" }}>
                Etapa
              </span>
              <div style={{ position: "relative", height: "32px" }}>
                {R.days.map((d, __i) => (
<React.Fragment key={__i}>
                      <i style={{ position: "absolute", left: `${d.x}%`, top: "0", bottom: "0", borderLeft: "1px solid var(--line)" }} />
                      {d.lbl ? (<><span className="mono" style={{ position: "absolute", left: `${d.x}%`, top: "9px", paddingLeft: "5px", fontSize: "10px", color: d.c, fontWeight: d.fw }}>
                          {d.t}
                        </span></>) : null}
                    </React.Fragment>
))}
              </div>
            </div>
            {R.rows.map((r, __i) => (
<div key={__i} className="fb-rr">
                  <div style={{ padding: "0 16px", minWidth: "0" }}>
                    <b style={{ fontSize: "12.5px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: r.tc }}>
                      {r.n} · {r.t}
                    </b>
                    <small className="muted" style={{ fontSize: "11px" }}>
                      {r.who}
                    </small>
                  </div>
                  <div style={{ position: "relative", height: "42px" }}>
                    <span className="fb-bar" style={{ left: `${r.x}%`, width: `${r.w}%`, background: r.bg, border: `1px solid ${r.bd}`, color: r.fg }}>
                      {r.lbl}
                    </span>
                    {r.gate ? (<><i className="fb-ms" style={{ left: `${r.gx}%` }} /></>) : null}
                  </div>
                </div>
))}
            <div style={{ position: "absolute", top: "0", bottom: "0", left: `calc(230px + (100% - 230px) * ${R.today})`, width: "2px", background: "var(--warning)", pointerEvents: "none" }}>
              <span className="mono" style={{ position: "absolute", top: "2px", left: "4px", fontSize: "9.5px", color: "var(--warning)", whiteSpace: "nowrap" }}>
                hoje
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="g3">
        {R.miles.map((m, __i) => (
<div key={__i} className="card" style={{ padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center" }}>
              <span style={{ width: "14px", height: "14px", transform: "rotate(45deg)", borderRadius: "3px", background: m.c, flex: "none", margin: "0 4px" }} />
              <div className="grow" style={{ minWidth: "0" }}>
                <div className="eyebrow" style={{ fontSize: "9.5px" }}>
                  {m.d}
                </div>
                <b style={{ fontSize: "14px" }}>{m.t}</b>
              </div>
              <span className={`badge ${m.cls}`}>{m.st}</span>
            </div>
))}
      </div>
    </>
  );
}

function WorkspaceMeridian(props: { ff: string | number; onFf: (f: string | number) => void }) {
  const W = buildWorkspaceMeridian(props.ff);
  return (
    <>
      <section className="card" style={{ padding: "16px 18px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ width: "42px", height: "42px", borderRadius: "12px", display: "grid", placeItems: "center", background: "var(--flow-subtle)", color: "var(--flow)", flex: "none" }}>
          <SvgPath d={ICN.folder} w={20} h={20} sw={1.9} />
        </span>
        <div className="grow" style={{ minWidth: "260px" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: "15px" }}>Workspace isolado</b>
            <span className="badge flow">
              <i />
              Git/.env isolado
            </span>
            <span className="badge">Git: {W.git}</span>
          </div>
          <code className="mono" style={{ fontSize: "11.5px", color: "var(--text-secondary)", wordBreak: "break-all", display: "block", marginTop: "4px" }}>
            {W.path}
          </code>
        </div>
        <div style={{ display: "flex", gap: "22px", padding: "0 6px" }}>
          <div>
            <div className="eyebrow" style={{ fontSize: "9.5px" }}>
              Pastas
            </div>
            <div className="num" style={{ fontSize: "18px" }}>
              {W.disk0}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: "9.5px" }}>
              Arquivos
            </div>
            <div className="num" style={{ fontSize: "18px" }}>
              {W.disk1}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: "9.5px" }}>
              Stack
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px" }}>{W.disk2}</div>
          </div>
        </div>
        <button type="button" className="btn sm secondary">
          Abrir no Explorer
        </button>
        <button type="button" className="btn sm ghost">
          Atualizar
        </button>
      </section>
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <section className="card" style={{ flex: "0 1 330px", minWidth: "260px", overflow: "hidden" }}>
          <div className="card-h">
            <h3>Estrutura no disco</h3>
            <div className="grow" />
            <span className="num muted" style={{ fontSize: "11px" }}>
              {W.treeInfo}
            </span>
          </div>
          <div style={{ maxHeight: "560px", overflow: "auto" }}>
            {W.tree.map((r, __i) => (
<button key={__i} type="button" className={`fb-tr ${r.on}`} style={{ paddingLeft: `${r.pad}px` }}>
                  <SvgPath d={r.icon} w={14} h={14} sw={1.9} />
                  <span className="mono">{r.name}</span>
                  <span className="grow" />
                  <span className={`badge ${r.bcls}`} style={{ height: "18px", fontSize: "9.5px", padding: "0 6px" }}>
                    {r.badge}
                  </span>
                  <span className="mono muted" style={{ fontSize: "10px", minWidth: "50px", textAlign: "right" }}>
                    {r.size}
                  </span>
                </button>
))}
          </div>
        </section>
        <div style={{ flex: "1 1 420px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div className="segs">
              {W.ffs.map((f, __i) => (
<button key={__i} type="button" className={`seg ${f.on ? "on" : ""}`} onClick={() => props.onFf(f.id)} style={{ height: "30px", fontSize: "12.5px" }}>
                    {f.label}
                    <span className="c">{f.n}</span>
                  </button>
))}
            </div>
            <div className="grow" />
            <span className="muted" style={{ fontSize: "12px" }}>
              Clique para abrir no visualizador
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: "14px" }}>
            {W.projFiles.map((f, __i) => (
<button key={__i} type="button" className="card lift" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", color: "inherit", width: "100%" }}>
                  <div style={{ height: "120px", borderRadius: "10px", overflow: "hidden", position: "relative", background: f.thumbBg, border: "1px solid var(--line)" }}>
                    {f.isImg ? (<><div style={{ position: "absolute", inset: "10px", borderRadius: "6px", background: f.imgPaper, display: "flex", flexDirection: "column", gap: "6px", padding: "8px" }}>
                        <i style={{ height: "6px", width: "40%", borderRadius: "3px", background: f.imgInk }} />
                        <i style={{ height: "12px", width: "80%", borderRadius: "3px", background: f.imgInk, opacity: "0.8" }} />
                        <i style={{ height: "6px", width: "60%", borderRadius: "3px", background: f.imgInk, opacity: "0.4" }} />
                        <i style={{ flex: "1", borderRadius: "4px", background: f.imgInk, opacity: "0.12" }} />
                      </div></>) : null}
                    {f.isText ? (<><pre className="mono" style={{ margin: "0", padding: "10px 12px", fontSize: "10px", lineHeight: "1.6", color: "var(--text-secondary)", whiteSpace: "pre", overflow: "hidden" }}>
                        {f.snip}
                      </pre></>) : null}
                    <span className="mono" style={{ position: "absolute", right: "8px", bottom: "8px", fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: "var(--surface-ink)", color: "#1BC5BD" }}>
                      {f.ext}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <b style={{ fontSize: "13.5px", flex: "1", minWidth: "0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</b>
                    {f.dirty ? (<><span className="badge warn">não salvo</span></>) : null}
                  </div>
                  <span className="muted" style={{ fontSize: "11.5px" }}>
                    {f.stage} · {f.meta}
                  </span>
                </button>
))}
          </div>
          {W.noProjFiles ? (<><p className="muted" style={{ fontSize: "13px" }}>
              Nenhum arquivo neste filtro.
            </p></>) : null}
        </div>
      </div>
    </>
  );
}
