import React, { useEffect, useMemo, useState } from "react";
import { ESTEIRAS } from "./esteiras";
import { KIND_META, STAT, type FabFilter, type FabPend, type FabProject, type FabSort } from "./panelTypes";
import { FabricaConsolePane } from "../console/FabricaConsolePane";
import type { FactoryProjectItem } from "../../../../shared/types";
import "../fabrica-ref.css";

function mapFactoryProject(p: FactoryProjectItem): FabProject {
  const done = Math.max(0, Number(p.stages_done) || 0);
  const n = Math.max(1, Number(p.total_stages) || 1);
  const pct = Math.min(100, Math.round((done / n) * 100));
  const raw = String(p.status || "").toLowerCase();
  const status: FabProject["status"] =
    raw === "paused" || raw === "pausado" ? "paused" : raw === "done" || raw === "completed" || raw === "concluido" || raw === "concluído" || pct >= 100 ? "done" : "run";
  const code = String(p.template_code || "LP-C")
    .toUpperCase()
    .replace(/_/g, "-")
    .slice(0, 4);
  return {
    id: p.id,
    name: p.name,
    client: p.company || p.client || "—",
    code: code.length >= 3 ? code : "LP-C",
    line: String(p.template_code || "LP-C1").toUpperCase(),
    slug: (p.local_path || p.slug || p.id).replace(/\\/g, "/"),
    status,
    pct,
    done,
    n,
    pendN: 0,
    stepName: status === "done" ? "Entregue" : done > 0 ? `Etapa ${done + 1}` : "Início",
    owner: status === "done" ? "gate final assinado" : "mesa atual",
    think: p.description || (status === "done" ? "Esteira concluída" : "Em execução"),
    cap: "CURSOR · AUTO",
    stages: Array.from({ length: n }, (_, i) => `s${i}`),
  };
}

function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  );
}

function IconFolderPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10H3zM12 12v5M9.5 14.5h5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3zM9.5 20h5" />
    </svg>
  );
}


export function FabricaDashboard(props: {
  initialProjectId?: string | null;
  onOpenModal?: (name: string, data?: unknown) => void;
} = {}) {
  const [projects, setProjects] = useState<FabProject[]>([]);
  const [pends, setPends] = useState<FabPend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FabFilter>("all");
  const [sort, setSort] = useState<FabSort>("pct");
  const [pid, setPid] = useState<string | null>(props.initialProjectId || null);

  const reload = async () => {
    setLoading(true);
    try {
      const rows = (await window.tavir?.projects?.list?.()) || [];
      setProjects(rows.map(mapFactoryProject));
      // Pendências reais ainda não têm IPC dedicado — lista vazia (sem fixture).
      setPends([]);
    } catch (err) {
      console.error("[Fábrica] falha ao listar projetos:", err);
      setProjects([]);
      setPends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const openProject = (id: string) => setPid(id);
  const backToPainel = () => {
    setPid(null);
    void reload();
  };

  const fl: Record<FabFilter, (p: FabProject) => boolean> = {
    all: () => true,
    run: (p) => p.status === "run",
    pend: (p) => p.pendN > 0,
    paused: (p) => p.status === "paused",
    done: (p) => p.status === "done",
  };

  const rows = useMemo(() => {
    const list = projects.filter(fl[filter]);
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : b.pct - a.pct,
    );
  }, [projects, filter, sort]);

  const runN = projects.filter((p) => p.status === "run").length;
  const avg = projects.length
    ? Math.round(projects.reduce((a, p) => a + p.pct, 0) / projects.length)
    : 0;
  const guardOk = projects.filter((p) => p.status === "done").length;
  const actN = pends.length;

  const kpis = () => {
    const total = projects.length || 1;
    const pending = actN;
    return [
      {
        k: "Projetos ativos",
        v: String(runN),
        n: `${projects.length} no total`,
        c: "var(--text-primary)",
        pct: Math.round((runN / total) * 100),
        fill: "run",
        pick: () => setFilter("run"),
      },
      {
        k: "Pendências abertas",
        v: String(pending),
        n: pending ? "aguardando você" : "nada aguardando você",
        c: pending ? "var(--warning)" : "var(--flow)",
        pct: Math.min(100, pending * 20),
        fill: pending ? "warn" : "run",
        pick: () => setFilter("pend"),
      },
      {
        k: "Progresso médio",
        v: `${avg}%`,
        n: "de todas as esteiras",
        c: "var(--text-primary)",
        pct: avg,
        fill: "run",
        pick: () => setFilter("all"),
      },
      {
        k: "Completion Guard",
        v: `${guardOk} de ${projects.length}`,
        n: "projetos com 8/8 no QA",
        c: "var(--flow)",
        pct: Math.round((guardOk / total) * 100),
        fill: "run",
        pick: () => setFilter("done"),
      },
    ];
  };

  const filters: { id: FabFilter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "run", label: "Em andamento" },
    { id: "pend", label: "Com pendências" },
    { id: "paused", label: "Pausados" },
    { id: "done", label: "Concluídos" },
  ];
  const sorts: { id: FabSort; label: string }[] = [
    { id: "pct", label: "Por progresso" },
    { id: "name", label: "Por nome" },
  ];

  const esteiraUse = (code: string) => {
    const used = projects.filter((p) => p.line === code).length;
    return used ? `${used} ${used === 1 ? "projeto" : "projetos"}` : "sem uso";
  };

  return (
    <div className="fab" data-screen-label={pid ? "Tavir Fábrica Console" : "Tavir Fábrica Dashboard"}>
      <aside className="fb-side" aria-label="Projetos da Fábrica">
        <div className="fb-brand">
          <span className="fb-logo">F</span>
          <div>
            <b>TAVIR Fábrica</b>
            <small>esteiras ao vivo</small>
          </div>
        </div>
        <button
          type="button"
          className={`fb-nav ${pid ? "" : "on"}`}
          aria-current={pid ? undefined : "page"}
          onClick={backToPainel}
        >
          <IconGrid />
          <span>Painel</span>
          {actN > 0 ? <em className="fb-cnt">{actN}</em> : null}
        </button>
        <div className="eyebrow fb-lbl">Projetos · {projects.length}</div>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`fb-proj ${pid === p.id ? "on" : ""}`}
            onClick={() => openProject(p.id)}
          >
            <span
              className="fb-ring"
              style={{ background: `conic-gradient(${STAT[p.status][2]} 0 ${p.pct}%, var(--line) 0)` }}
            >
              <i>{p.pct}</i>
            </span>
            <span className="fb-pt">
              <b>{p.name}</b>
              <small>
                <span className="mono">{p.code}</span> · {p.stepName}
              </small>
            </span>
            {p.pendN > 0 ? <em className="fb-cnt">{p.pendN}</em> : null}
          </button>
        ))}
        <div className="fb-foot">
          <span className="av">CH</span>
          <div>
            <b>Carlos Henrique</b>
            <small>CEO · aprovador</small>
          </div>
        </div>
      </aside>

      <div className="main-pane">
        {pid ? (
          <FabricaConsolePane
            projectId={pid}
            project={projects.find((p) => p.id === pid) || null}
            onBack={backToPainel}
          />
        ) : (
          <div className="page">
            <div className="phead">
              <div className="grow">
                <div className="eyebrow">Fábrica de software · esteiras ao vivo</div>
                <h1 style={{ marginTop: "8px" }}>Painel da Fábrica</h1>
                <p>
                  {loading
                    ? "Carregando esteiras do SQLite…"
                    : "Acompanhe cada esteira, destrave gates e veja o QA em tempo real. O Completion Guard decide quando acabou, e você assina."}
                </p>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    window.alert("Absorver pasta: escolha a pasta do projeto no próximo passo (Product Lab).");
                  }}
                >
                  <IconFolderPlus />
                  Absorver pasta
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => props.onOpenModal?.("factory-new")}
                >
                  <IconPlus />
                  Novo projeto
                </button>
              </div>
            </div>

            <div className="g4">
              {kpis().map((k) => (
                <button
                  key={k.k}
                  type="button"
                  className="metric lift"
                  onClick={k.pick}
                  style={{ textAlign: "left", cursor: "pointer" }}
                >
                  <span className="eyebrow">{k.k}</span>
                  <strong style={{ color: k.c }}>{k.v}</strong>
                  <small>{k.n}</small>
                  <div className="track" style={{ height: "4px", marginTop: "2px" }}>
                    <div className={`fill ${k.fill}`} style={{ width: `${k.pct}%` }} />
                  </div>
                </button>
              ))}
            </div>

            <section className="card">
              <div className="card-h">
                <h3>Precisa da sua ação</h3>
                <span className="badge warn">{actN}</span>
                <div className="grow" />
                <span className="muted" style={{ fontSize: "12px" }}>
                  Autorize daqui ou abra o projeto
                </span>
              </div>
              {actN === 0 ? (
                <div
                  style={{
                    padding: "26px 20px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    color: "var(--text-secondary)",
                    fontSize: "13.5px",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--flow-subtle)",
                      color: "var(--flow)",
                    }}
                  >
                    <IconCheck />
                  </span>
                  Nada aguardando você. As esteiras seguem sozinhas.
                </div>
              ) : null}
              <div className="rows">
                {pends.map((a) => (
                  <div
                    key={a.id}
                    className="row"
                    style={{ cursor: "default", gap: "14px", animation: "fade 220ms var(--ease) both" }}
                  >
                    <span
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "11px",
                        display: "grid",
                        placeItems: "center",
                        background: a.ibg,
                        color: a.ifg,
                        flex: "none",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={a.icon} />
                      </svg>
                    </span>
                    <div className="grow" style={{ minWidth: "0" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span className={`badge ${a.kcls}`}>{KIND_META[a.kind].label}</span>
                        <b style={{ fontSize: "14px" }}>{a.t}</b>
                      </div>
                      <div className="m" style={{ marginTop: "3px" }}>
                        {a.proj} · {a.who} · {a.at}
                      </div>
                    </div>
                    <button type="button" className="btn sm ghost" onClick={() => openProject(a.projId)}>
                      Abrir projeto
                    </button>
                    <button type="button" className="btn sm secondary" onClick={() => openProject(a.projId)}>
                      {a.btn}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="card-h" style={{ flexWrap: "wrap", gap: "12px" }}>
                <h3>Projetos</h3>
                <div className="segs">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`seg ${filter === f.id ? "on" : ""}`}
                      onClick={() => setFilter(f.id)}
                      style={{ height: "30px", fontSize: "12.5px" }}
                    >
                      {f.label}
                      <span className="c">{projects.filter(fl[f.id]).length}</span>
                    </button>
                  ))}
                </div>
                <div className="grow" />
                <div className="segs">
                  {sorts.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`seg ${sort === f.id ? "on" : ""}`}
                      onClick={() => setSort(f.id)}
                      style={{ height: "30px", fontSize: "12.5px" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rows">
                {rows.map((l) => {
                  const col = STAT[l.status][2];
                  const gate = l.pendN > 0;
                  return (
                    <div
                      key={l.id}
                      className="row"
                      role="link"
                      tabIndex={0}
                      onClick={() => openProject(l.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProject(l.id);
                        }
                      }}
                      style={{
                        padding: "16px 18px",
                        gap: "18px",
                        flexWrap: "wrap",
                        animation: "fade 200ms var(--ease) both",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        className="fb-ring"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: `conic-gradient(${col} 0 ${l.pct}%, var(--line) 0)`,
                        }}
                      >
                        <i style={{ width: "40px", height: "40px", fontSize: "11px" }}>{l.pct}%</i>
                      </span>
                      <div style={{ flex: "0 0 240px", minWidth: "0" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span className="badge">{l.code}</span>
                          <span className={`badge ${STAT[l.status][1]}`}>
                            <i />
                            {STAT[l.status][0]}
                          </span>
                        </div>
                        <div className="t" style={{ fontSize: "15px", marginTop: "7px" }}>
                          {l.name}
                        </div>
                        <div className="m">{l.client}</div>
                        <div
                          className="mono"
                          style={{
                            fontSize: "10.5px",
                            color: "var(--text-muted)",
                            marginTop: "3px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {l.slug}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: "1 1 300px",
                          minWidth: "0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {l.stages.map((_, idx) => {
                            const done = idx < l.done;
                            const cur = idx === l.done && l.status !== "done";
                            const size = cur ? 16 : 12;
                            return (
                              <div
                                key={idx}
                                style={{ display: "flex", alignItems: "center", flex: idx > 0 ? "1" : "0 0 auto" }}
                              >
                                {idx > 0 ? (
                                  <i
                                    style={{
                                      flex: "1",
                                      height: "2px",
                                      background: idx <= l.done ? "var(--flow)" : "var(--line)",
                                      minWidth: "3px",
                                    }}
                                  />
                                ) : null}
                                <span
                                  style={{
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    borderRadius: "50%",
                                    flex: "none",
                                    display: "grid",
                                    placeItems: "center",
                                    background: done
                                      ? "var(--flow)"
                                      : cur
                                        ? "var(--warning-subtle)"
                                        : "var(--surface-2)",
                                    border: `2px solid ${
                                      done ? "var(--flow)" : cur ? "var(--warning)" : "var(--line-strong)"
                                    }`,
                                    color: "var(--surface-1)",
                                    animation:
                                      cur && gate && l.status === "run"
                                        ? "ringwarn 2s var(--ease) infinite"
                                        : "none",
                                  }}
                                >
                                  {done ? (
                                    <svg
                                      width="8"
                                      height="8"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M5 12.5l4.5 4.5L19 7" />
                                    </svg>
                                  ) : null}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                            fontSize: "12px",
                            minWidth: "0",
                          }}
                        >
                          <span className="muted">Agora:</span>
                          <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {l.stepName}
                          </b>
                          <span className="muted" style={{ whiteSpace: "nowrap" }}>
                            · {l.owner}
                          </span>
                        </div>
                        <div className="fb-thought">
                          <span className="badge flow" style={{ height: "20px", flex: "none" }}>
                            {l.cap}
                          </span>
                          <IconBulb />
                          <span>{l.think}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "6px",
                          flex: "0 0 170px",
                        }}
                      >
                        <span className="num" style={{ fontSize: "13px" }}>
                          {`${l.done}/${l.n} etapas`}
                        </span>
                        {l.pendN > 0 ? (
                          <span className="badge warn">{`${l.pendN} ${l.pendN === 1 ? "pendência" : "pendências"}`}</span>
                        ) : (
                          <span className="muted" style={{ fontSize: "12px" }}>
                            sem pendências
                          </span>
                        )}
                      </div>
                      <IconChevron />
                    </div>
                  );
                })}
                {rows.length === 0 ? (
                  <p className="muted" style={{ padding: "22px 20px", fontSize: "13px" }}>
                    {loading
                      ? "Carregando projetos…"
                      : projects.length === 0
                        ? "Nenhuma esteira no SQLite. Use Nova esteira ou Absorver pasta."
                        : "Nenhum projeto neste filtro."}
                  </p>
                ) : null}
              </div>
            </section>

            <div className="sec-title">
              <h2>Esteiras disponíveis</h2>
              <span className="muted" style={{ fontSize: "13px" }}>
                Cada esteira começa com etapas, mesas e critérios de pronto
              </span>
            </div>
            <div className="g3">
              {ESTEIRAS.map((e) => (
                <article
                  key={e.code}
                  className="card lift"
                  style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="badge flow">{e.code}</span>
                    <span className="badge">{e.fam}</span>
                    <div className="grow" />
                    <span className="muted" style={{ fontSize: "12px" }}>
                      {esteiraUse(e.code)}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: "600" }}>{e.name}</h3>
                  <p className="sec" style={{ fontSize: "13px" }}>
                    {e.d}
                  </p>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {e.st.map((x) => (
                      <span
                        key={x}
                        className="mono"
                        style={{
                          fontSize: "10.5px",
                          padding: "3px 7px",
                          borderRadius: "6px",
                          background: "var(--surface-0)",
                          border: "1px solid var(--line)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                  {e.guard ? (
                    <span className="badge action" style={{ alignSelf: "flex-start" }}>
                      Compiler & Completion Guard
                    </span>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", marginTop: "auto", paddingTop: "6px" }}>
                    <div>
                      <span className="num muted" style={{ fontSize: "12px" }}>
                        {e.stages} etapas · {e.mesas} mesas
                      </span>
                      <div className="muted" style={{ fontSize: "11.5px", marginTop: "2px" }}>
                        Lead: {e.lead} · isolamento Git/.env
                      </div>
                    </div>
                    <div className="grow" />
                    <button
                      type="button"
                      className="btn sm secondary"
                      onClick={() => props.onOpenModal?.("factory-new")}
                    >
                      Usar esteira
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
