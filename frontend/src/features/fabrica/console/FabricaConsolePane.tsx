import { For, Show, createSignal } from "solid-js";
import {
  ICN,
  buildAcessosMeridian,
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

function SvgPath(props: { d: string; w?: number; h?: number; sw?: number; fill?: string }) {
  const w = () => props.w ?? 15;
  const h = () => props.h ?? 15;
  return (
    <svg width={w()} height={h()} viewBox="0 0 24 24" fill={props.fill || "none"} stroke={props.fill ? undefined : "currentColor"} stroke-width={props.sw ?? 1.9} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={props.d} fill={props.fill || undefined} />
    </svg>
  );
}

export function FabricaConsolePane(props: {
  projectId: string;
  onBack: () => void;
  onTab?: (tab: ConsoleTab) => void;
}) {
  const [ptab, setPtab] = createSignal<ConsoleTab>("geral");
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [stage, setStage] = createSignal(5);
  const [stageTab, setStageTab] = createSignal("guard");
  const [qaSel, setQaSel] = createSignal(1);
  const [qaEvf, setQaEvf] = createSignal("all");
  const [qaRepF, setQaRepF] = createSignal("all");
  const [credF, setCredF] = createSignal("all");
  const [envDraft, setEnvDraft] = createSignal("");
  const [sevF, setSevF] = createSignal("all");
  const [secOpen, setSecOpen] = createSignal<Record<string, boolean>>({});
  const [wsFf, setWsFf] = createSignal<string | number>("all");

  const P = (): ConsoleProjectView | null => getConsoleProject(props.projectId);
  const isMeridian = () => props.projectId === "meridian";
  const meridianTab = () =>
    isMeridian() &&
    (ptab() === "esteira" || ptab() === "qa" || ptab() === "acessos" || ptab() === "seg" || ptab() === "kanban" || ptab() === "roadmap" || ptab() === "arquivos");

  const setTab = (tab: ConsoleTab) => {
    setPtab(tab);
    if (tab === "esteira" && isMeridian()) {
      setStage(5);
      setStageTab("guard");
    }
    if (tab === "qa" && isMeridian()) {
      setQaSel(1);
      setQaEvf("all");
      setQaRepF("all");
    }
    if (tab === "acessos" && isMeridian()) {
      setCredF("all");
      setEnvDraft("");
    }
    if (tab === "seg" && isMeridian()) {
      setSevF("all");
      setSecOpen({});
    }
    if (tab === "arquivos" && isMeridian()) {
      setWsFf("all");
    }
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

  const tabs = () => {
    const p = P();
    if (!p) return [];
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
  };

  const copyPath = () => {
    const p = P();
    if (!p) return;
    try {
      void navigator.clipboard.writeText(p.path);
    } catch {
      /* ignore */
    }
  };

  return (
    <Show when={P()} fallback={<p class="muted" style={{ padding: "28px" }}>Projeto não encontrado no fixture.</p>}>
      {(proj) => {
        const p = proj;
        return (
          <>
          <div class="page" style={{ "max-width": "1320px", gap: "18px", "padding-bottom": "110px" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
              <button type="button" class="link" onClick={() => props.onBack()}>
                ← Painel
              </button>
              <span class="muted">/</span>
              <span style={{ "font-size": "14px", "font-weight": "600" }}>{p().name}</span>
              <div class="grow" />
              <button type="button" class="btn sm ghost">
                Pedir alteração
              </button>
              <button type="button" class="btn sm secondary">
                <SvgPath d={ICN.chat} w={15} h={15} />
                Íris
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  class="ibtn sm"
                  aria-label="Mais ações do projeto"
                  aria-expanded={menuOpen() ? "true" : "false"}
                  onClick={() => setMenuOpen(!menuOpen())}
                >
                  <SvgPath d={ICN.dots} w={18} h={18} sw={3} />
                </button>
                <Show when={menuOpen()}>
                  <div class="fb-menu" role="menu">
                    <button type="button" class="fb-mi" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <SvgPath d={ICN.folder} w={17} h={17} />
                      <span>Abrir no Explorer</span>
                      <small>Pasta isolada do projeto</small>
                    </button>
                    <button type="button" class="fb-mi" role="menuitem" onClick={() => { setTab("arquivos"); setMenuOpen(false); }}>
                      <SvgPath d={ICN.code} w={17} h={17} />
                      <span>Workspace</span>
                      <small>Arquivos e estrutura</small>
                    </button>
                    <button type="button" class="fb-mi danger" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <SvgPath d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" w={17} h={17} />
                      <span>Remover projeto</span>
                      <small>Sai do painel · pasta permanece</small>
                    </button>
                  </div>
                </Show>
              </div>
            </div>

            <section class="ink" style={{ padding: "22px 24px", display: "flex", gap: "22px", "flex-wrap": "wrap", "align-items": "stretch" }}>
              <div style={{ flex: "2 1 380px", display: "flex", "flex-direction": "column", gap: "10px", "min-width": "0" }}>
                <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
                  <span class="badge">{p().code}</span>
                  <span class={`badge ${p().cls}`}>
                    <i />
                    {p().state}
                  </span>
                  <span class={`badge ${p().gCls}`}>Guard {p().gN}/8</span>
                  <span class="badge">{p().due}</span>
                  <span class="badge flow">
                    <i />
                    Git/.env isolado · {p().git}
                  </span>
                  <span class="badge flow">{p().cap}</span>
                </div>
                <h1 style={{ "font-size": "28px", "font-weight": "600", "letter-spacing": "-.03em", "line-height": "1.1" }}>{p().name}</h1>
                <div style={{ "font-size": "13px", color: "var(--on-ink-muted)" }}>
                  {p().kind} · {p().client} · esteira {p().line}
                </div>
                <div class="fb-path">
                  <SvgPath d={ICN.folder} w={15} h={15} />
                  <code>{p().path}</code>
                  <button type="button" class="btn sm onink-sec" onClick={copyPath}>
                    Copiar
                  </button>
                  <button type="button" class="btn sm onink-sec">
                    Abrir no Explorer
                  </button>
                  <button type="button" class="btn sm onink-sec" onClick={() => setTab("arquivos")}>
                    Estrutura
                  </button>
                </div>
                <div class="fb-tags">
                  <For each={p().tags}>
                    {(g) => (
                      <span class="fb-chip">
                        <SvgPath d={g.icon} w={12} h={12} sw={2} />
                        {g.t}
                      </span>
                    )}
                  </For>
                </div>
              </div>

              <div style={{ flex: "1 1 480px", display: "grid", "grid-template-columns": "repeat(5, minmax(0, 1fr))", gap: "10px", "align-content": "center" }}>
                <div class="fb-hm">
                  <span
                    class="fb-ring"
                    style={{
                      width: "48px",
                      height: "48px",
                      background: `conic-gradient(#B7F34A 0 ${p().pct}%, rgba(244,246,242,.12) 0)`,
                    }}
                  >
                    <i style={{ width: "38px", height: "38px", background: "#0B1220", color: "#F4F6F2", "font-size": "11px" }}>{p().pct}%</i>
                  </span>
                  <small>Progresso</small>
                </div>
                <button type="button" class="fb-hm" onClick={() => setTab("esteira")}>
                  <b class="num">
                    {p().done}
                    <span>/{p().n}</span>
                  </b>
                  <small>Etapas</small>
                </button>
                <button type="button" class="fb-hm" onClick={() => setTab("qa")}>
                  <b class="num" style={{ color: p().gCol }}>
                    {p().gN}
                    <span>/8</span>
                  </b>
                  <small>Guard</small>
                </button>
                <button type="button" class="fb-hm" onClick={() => setTab("geral")}>
                  <b class="num" style={{ color: p().pCol }}>
                    {p().pendN}
                  </b>
                  <small>Pendências</small>
                </button>
                <div class="fb-hm">
                  <b class="num" style={{ "font-size": "15px" }}>
                    US$ {p().spent}
                  </b>
                  <div style={{ width: "76%", height: "4px", "border-radius": "999px", background: "rgba(244,246,242,.12)", overflow: "hidden", flex: "none" }}>
                    <div style={{ height: "100%", width: `${p().costPct}%`, background: "#1BC5BD" }} />
                  </div>
                  <small>de US$ {p().budget}</small>
                </div>
              </div>

              <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "justify-content": "center" }}>
                <button type="button" class="btn sm onink-sec" disabled={p().isDone}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={p().pauseIcon} />
                  </svg>
                  {p().pauseLbl}
                </button>
              </div>
            </section>

            <Show when={p().paused}>
              <div class="fb-warn" style={{ "align-items": "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={ICN.pause} />
                </svg>
                <span class="grow">
                  <b>Esteira pausada.</b>
                </span>
                <button type="button" class="btn sm secondary">
                  Retomar
                </button>
              </div>
            </Show>

            <div class="tabs" style={{ padding: "0 4px" }}>
              <For each={tabs()}>
                {(x) => (
                  <button type="button" class={`tab ${ptab() === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}>
                    {x.label}
                    {x.n > 0 ? (
                      <span class={`badge ${x.cls}`} style={{ height: "18px", padding: "0 7px" }}>
                        {x.n}
                      </span>
                    ) : null}
                  </button>
                )}
              </For>
            </div>

            <Show when={ptab() === "geral"}>
              <VisaoGeral p={p()} onEsteira={() => setTab("esteira")} onPend={(a) => (a.kind === "erro" ? setTab("acessos") : setTab("qa"))} />
            </Show>

            <Show when={ptab() === "esteira" && isMeridian()}>
              <EsteiraMeridian stage={stage()} stageTab={stageTab()} onPickStage={pickStage} onStageTab={setStageTab} />
            </Show>

            <Show when={ptab() === "qa" && isMeridian()}>
              <>
                <CompletionGuardBlock E={buildEsteiraMeridian(5, "guard")} />
                <QaMeridian
                  sel={qaSel()}
                  evf={qaEvf()}
                  repF={qaRepF()}
                  onSel={setQaSel}
                  onEvf={setQaEvf}
                  onRepF={setQaRepF}
                />
              </>
            </Show>

            <Show when={ptab() === "acessos" && isMeridian()}>
              <AcessosMeridian credF={credF()} draft={envDraft()} onFilter={setCredF} onDraft={setEnvDraft} />
            </Show>

            <Show when={ptab() === "seg" && isMeridian()}>
              <SegMeridian
                sevF={sevF()}
                openIds={secOpen()}
                onSevF={setSevF}
                onToggle={(id) => setSecOpen((o) => ({ ...o, [id]: !(o[id] ?? id === "F-01") }))}
              />
            </Show>

            <Show when={ptab() === "kanban" && isMeridian()}>
              <KanbanMeridian />
            </Show>

            <Show when={ptab() === "roadmap" && isMeridian()}>
              <RoadmapMeridian />
            </Show>

            <Show when={ptab() === "arquivos" && isMeridian()}>
              <WorkspaceMeridian ff={wsFf()} onFf={setWsFf} />
            </Show>

            <Show when={ptab() !== "geral" && !meridianTab()}>
              <section class="card" style={{ padding: "28px 22px" }}>
                <div class="eyebrow">{tabs().find((t) => t.id === ptab())?.label}</div>
                <h2 style={{ "font-size": "20px", "font-weight": "600", "margin-top": "6px" }}>Em portagem</h2>
                <p class="sec" style={{ "font-size": "13.5px", "margin-top": "8px" }}>
                  A aba {tabs().find((t) => t.id === ptab())?.label} será portada na próxima rodada. A Visão geral já espelha a referência.
                </p>
              </section>
            </Show>

          </div>
          <button type="button" class="fb-fab" aria-label="Abrir Íris, chat do projeto">
            <span class="fb-fabi">ÍR</span>
            <span>
              <b>Íris</b>
              <small>{p().cap}</small>
            </span>
            <Show when={p().id === "meridian"}>
              <span class="fb-unread">2</span>
            </Show>
          </button>
          </>
        );
      }}
    </Show>
  );
}

function VisaoGeral(props: { p: ConsoleProjectView; onEsteira: () => void; onPend: (a: ConsolePend) => void }) {
  const cs = () => props.p.cs;
  const ex = () => props.p.ex;

  return (
    <div style={{ display: "flex", gap: "18px", "align-items": "flex-start", "flex-wrap": "wrap", animation: "fade 200ms var(--ease) both" }}>
      <div style={{ flex: "2 1 480px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "18px" }}>
        <section class="card" style={{ padding: "20px", display: "flex", "flex-direction": "column", gap: "14px", "border-color": cs().bd }}>
          <div style={{ display: "flex", gap: "14px", "align-items": "center" }}>
            <span
              style={{
                width: "46px",
                height: "46px",
                "border-radius": "13px",
                display: "grid",
                "place-items": "center",
                background: cs().ibg,
                color: cs().ifg,
                animation: cs().anim,
                flex: "none",
              }}
            >
              <SvgPath d={cs().icon} w={20} h={20} sw={2} />
            </span>
            <div class="grow" style={{ "min-width": "0" }}>
              <div class="eyebrow">{cs().eyebrow}</div>
              <h2 style={{ "font-size": "22px", "font-weight": "600", "letter-spacing": "-.02em", "margin-top": "3px" }}>{cs().name}</h2>
            </div>
            <span class={`badge ${cs().cls}`}>
              <i />
              {cs().status}
            </span>
          </div>
          <p class="sec" style={{ "font-size": "13.5px" }}>
            {cs().d}
          </p>
          <div style={{ display: "flex", gap: "12px", "align-items": "center", "flex-wrap": "wrap" }}>
            <span class="av busy" style={{ width: "34px", height: "34px", "font-size": "10px" }}>
              {cs().ini}
            </span>
            <div>
              <b style={{ "font-size": "13px" }}>{cs().owner}</b>
              <div class="mono muted" style={{ "font-size": "11px" }}>
                {cs().skill}
              </div>
            </div>
            <div class="grow" />
            <button type="button" class="btn sm ghost" onClick={() => props.onEsteira()}>
              {cs().secLbl}
            </button>
            <button type="button" class="btn sm secondary" onClick={() => props.onEsteira()}>
              {cs().btn}
            </button>
          </div>
          <Show when={cs().blocked}>
            <div class="fb-warn">
              <SvgPath d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" w={16} h={16} sw={2} />
              <span>{cs().blockTxt}</span>
            </div>
          </Show>
          <div class="fb-exec">
            <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  "border-radius": "9px",
                  display: "grid",
                  "place-items": "center",
                  background: "var(--flow-subtle)",
                  color: "var(--flow)",
                  flex: "none",
                }}
              >
                <SvgPath d={ICN.bolt} w={15} h={15} sw={2} />
              </span>
              <div class="grow" style={{ "min-width": "200px" }}>
                <div style={{ display: "flex", gap: "6px", "align-items": "center", "flex-wrap": "wrap" }}>
                  <span class="eyebrow" style={{ color: "var(--flow)", "font-size": "10px" }}>
                    Motor & execução
                  </span>
                  <span class="badge flow" style={{ height: "20px" }}>
                    {ex().cap}
                  </span>
                  <span class={`badge ${ex().stCls}`} style={{ height: "20px" }}>
                    {ex().st}
                  </span>
                </div>
                <div class="mono muted" style={{ "font-size": "11px", "margin-top": "3px" }}>
                  {ex().meter}
                </div>
              </div>
              <button type="button" class="btn sm ghost">
                {ex().thinkLbl}
              </button>
              <button type="button" class="btn sm ghost" aria-expanded="false">
                Motor
              </button>
              <button type="button" class="btn sm primary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={ICN.play} />
                </svg>
                {ex().runLbl}
              </button>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-h">
            <h3>Pendências</h3>
            <span class={`badge ${props.p.pBadge}`}>{props.p.pendN}</span>
          </div>
          <Show when={props.p.pendN === 0}>
            <p class="muted" style={{ padding: "18px 20px", "font-size": "13px" }}>
              Nenhuma pendência. A esteira segue sozinha até o próximo gate.
            </p>
          </Show>
          <div class="rows">
            <For each={props.p.pends}>
              {(a) => (
                <div class="row" style={{ cursor: "default", "align-items": "flex-start", gap: "14px", animation: "fade 220ms var(--ease) both" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      "border-radius": "10px",
                      display: "grid",
                      "place-items": "center",
                      background: a.ibg,
                      color: a.ifg,
                      flex: "none",
                    }}
                  >
                    <SvgPath d={a.icon} w={17} h={17} />
                  </span>
                  <div class="grow" style={{ "min-width": "0" }}>
                    <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
                      <span class={`badge ${a.kcls}`}>{a.kindLabel}</span>
                      <b style={{ "font-size": "14px" }}>{a.t}</b>
                    </div>
                    <p class="sec" style={{ "font-size": "13px", "margin-top": "5px" }}>
                      {a.d}
                    </p>
                    <Show when={a.hasCode}>
                      <div class="mono" style={{ "font-size": "11px", color: "var(--danger)", "margin-top": "4px" }}>
                        {a.code}
                      </div>
                    </Show>
                    <div class="m" style={{ "margin-top": "4px" }}>
                      {a.who} · {a.at}
                    </div>
                  </div>
                  <button type="button" class="btn sm secondary" onClick={() => props.onPend(a)}>
                    {a.btn}
                  </button>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="card">
          <div class="card-h">
            <h3>Atividade</h3>
            <div class="grow" />
            <Show when={props.p.id === "meridian"}>
              <button type="button" class="link" onClick={() => props.onEsteira()}>
                Livro-razão completo
              </button>
            </Show>
          </div>
          <div style={{ padding: "8px 20px 14px" }}>
            <For each={props.p.timeline}>
              {(e) => (
                <div class="fb-tl">
                  <i style={{ background: e.c }} />
                  <div class="grow" style={{ "min-width": "0" }}>
                    <div style={{ "font-size": "13.5px", "font-weight": "600" }}>{e.x}</div>
                    <div class="muted" style={{ "font-size": "12px", "margin-top": "1px" }}>
                      {e.w} · {e.t}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>

      <div style={{ flex: "1 1 300px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "18px" }}>
        <section class="card">
          <div class="card-h">
            <h3>Esteira · {props.p.n} etapas</h3>
            <div class="grow" />
            <button type="button" class="link" onClick={() => props.onEsteira()}>
              Abrir
            </button>
          </div>
          <div>
            <For each={props.p.vsteps}>
              {(v) => (
                <button type="button" class="fb-vs" onClick={() => props.onEsteira()} style={{ background: v.rowBg }}>
                  <span class="fb-nb" style={{ background: v.bg, color: v.fg, border: `1px solid ${v.bd}` }}>
                    {v.n}
                  </span>
                  <span class="grow" style={{ "min-width": "0" }}>
                    <b style={{ "font-size": "13px", display: "block", color: v.tc, "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>{v.t}</b>
                    <small class="muted" style={{ "font-size": "11.5px" }}>
                      {v.who}
                    </small>
                  </span>
                  <Show when={v.now}>
                    <span class={`badge ${v.cls}`}>{v.st}</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </section>

        <section class="card">
          <div class="card-h">
            <h3>Inventário</h3>
          </div>
          <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "1px", background: "var(--line)" }}>
            <For each={props.p.inv}>
              {(f) => (
                <div style={{ background: "var(--surface-2)", padding: "14px 18px" }}>
                  <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                    {f.k}
                  </div>
                  <div class="num" style={{ "font-size": "18px", "margin-top": "4px" }}>
                    {f.v}
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="card">
          <div class="card-h">
            <h3>Mesas</h3>
            <span class="muted" style={{ "font-size": "12px" }}>
              {props.p.mesasN}
            </span>
          </div>
          <div class="rows">
            <For each={props.p.mesas}>
              {(m) => (
                <div class="row" style={{ cursor: "default", padding: "10px 18px" }}>
                  <span class={`av ${m.busy}`} style={{ width: "30px", height: "30px", "font-size": "10px" }}>
                    {m.ini}
                  </span>
                  <div class="grow" style={{ "min-width": "0" }}>
                    <div class="t" style={{ "font-size": "13px" }}>
                      {m.n}
                    </div>
                    <div class="m mono" style={{ "font-size": "10.5px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                      {m.skill}
                    </div>
                  </div>
                  <span class="num muted" style={{ "font-size": "11px" }}>
                    {m.c}
                  </span>
                </div>
              )}
            </For>
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
  const E = () => buildEsteiraMeridian(props.stage, props.stageTab);
  const sel = () => E().sel;
  const showGuard = () => E().tab === "guard";

  return (
    <>
      <section class="card" style={{ padding: "18px 20px 16px" }}>
        <div style={{ display: "flex", "align-items": "center", "margin-bottom": "14px" }}>
          <h3 style={{ "font-size": "14px", "font-weight": "600" }}>Topologia da esteira</h3>
          <div class="grow" />
          <span class="muted" style={{ "font-size": "12px" }}>
            Clique numa etapa para abrir o painel dela
          </span>
        </div>
        <div class="noscroll" style={{ display: "flex", "align-items": "flex-start", "overflow-x": "auto" }}>
          <For each={E().nodes}>
            {(n) => (
              <div style={{ display: "flex", "align-items": "flex-start", flex: n.flex, "min-width": "0" }}>
                <Show when={n.hasLine}>
                  <div style={{ flex: "1", "min-width": "8px", height: "2px", "margin-top": "21px", background: n.line, position: "relative" }}>
                    <Show when={n.flow}>
                      <i style={{ position: "absolute", top: "-3px", width: "8px", height: "8px", "border-radius": "50%", background: "var(--warning)", animation: "flowdot 1.8s linear infinite" }} />
                    </Show>
                  </div>
                </Show>
                <button
                  type="button"
                  aria-pressed={n.pressed ? "true" : "false"}
                  onClick={() => props.onPickStage(n.i)}
                  style={{
                    flex: "none",
                    width: "84px",
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                    gap: "6px",
                    background: "transparent",
                    border: "0",
                    color: "inherit",
                    padding: "0 0 8px",
                    "text-align": "center",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      width: "44px",
                      height: "44px",
                      "border-radius": "14px",
                      display: "grid",
                      "place-items": "center",
                      background: n.bg,
                      color: n.fg,
                      border: `2px solid ${n.bd}`,
                      "box-shadow": n.sh,
                      animation: n.anim,
                      transition: "all 220ms var(--ease)",
                    }}
                  >
                    <SvgPath d={n.icon} w={18} h={18} sw={2.1} />
                  </span>
                  <b style={{ "font-size": "12px", color: n.tc, "white-space": "nowrap" }}>{n.label}</b>
                  <span class="mono" style={{ "font-size": "10px", color: "var(--text-muted)", "white-space": "nowrap" }}>
                    {n.meta}
                  </span>
                  <i
                    style={{
                      position: "absolute",
                      bottom: "0",
                      left: "22px",
                      right: "22px",
                      height: "3px",
                      "border-radius": "3px",
                      background: n.under,
                      transition: "background 200ms var(--ease)",
                    }}
                  />
                </button>
              </div>
            )}
          </For>
        </div>
      </section>

      <section class="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
          <span
            style={{
              width: "46px",
              height: "46px",
              "border-radius": "13px",
              display: "grid",
              "place-items": "center",
              background: sel().ibg,
              color: sel().ifg,
              flex: "none",
            }}
          >
            <SvgPath d={sel().icon} w={20} h={20} sw={2} />
          </span>
          <div class="grow" style={{ "min-width": "200px" }}>
            <div class="eyebrow">
              Etapa {sel().n} de 09 · {sel().state}
            </div>
            <h2 style={{ "font-size": "22px", "font-weight": "600", "letter-spacing": "-.02em", "margin-top": "4px" }}>{sel().label}</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", "align-items": "center" }}>
            <span class={`av ${sel().busy}`} style={{ width: "34px", height: "34px", "font-size": "10px" }}>
              {sel().ini}
            </span>
            <div>
              <b style={{ "font-size": "13px" }}>{sel().owner}</b>
              <div class="muted" style={{ "font-size": "11.5px" }}>
                {sel().role}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "18px", padding: "0 18px", "border-left": "1px solid var(--line)", "border-right": "1px solid var(--line)" }}>
            <div>
              <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                Duração
              </div>
              <div class="num" style={{ "font-size": "14px", "margin-top": "3px" }}>
                {sel().dur}
              </div>
            </div>
            <div>
              <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                Custo
              </div>
              <div class="num" style={{ "font-size": "14px", "margin-top": "3px" }}>
                {sel().cost}
              </div>
            </div>
            <div>
              <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                Arquivos
              </div>
              <div class="num" style={{ "font-size": "14px", "margin-top": "3px" }}>
                {sel().fileN}
              </div>
            </div>
          </div>
          <button type="button" class="btn sm secondary" disabled={sel().locked}>
            Refazer etapa
          </button>
        </div>
        <Show when={sel().waiting}>
          <div style={{ margin: "0 20px 14px", padding: "10px 14px", "border-radius": "10px", background: "var(--surface-0)", border: "1px dashed var(--line-strong)", "font-size": "13px" }} class="sec">
            Esta etapa começa quando <b style={{ color: "var(--text-primary)" }}>{sel().prev}</b> fechar. O que aparece abaixo é o plano dela.
          </div>
        </Show>
        <div class="tabs" style={{ padding: "0 12px" }}>
          <For each={E().tabs}>
            {(t) => (
              <button type="button" class={`tab ${t.on ? "on" : ""}`} onClick={() => props.onStageTab(t.id)}>
                {t.label}
                <Show when={t.hasN}>
                  <span class={`badge ${t.ncls}`} style={{ height: "18px", padding: "0 7px" }}>
                    {t.n}
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </section>

      <Show when={showGuard()}>
        <CompletionGuardBlock E={E()} />
      </Show>

      <Show when={!showGuard()}>
        <section class="card" style={{ padding: "22px" }}>
          <p class="sec" style={{ "font-size": "13.5px" }}>
            Conteúdo da subaba «{E().tabs.find((t) => t.on)?.label}» — use Completion Guard na etapa QA para o gate.
          </p>
        </section>
      </Show>
    </>
  );
}

function CompletionGuardBlock(props: { E: EsteiraView }) {
  const E = () => props.E;
  return (
    <>
      <div class="card" style={{ padding: "16px 18px", display: "flex", gap: "18px", "align-items": "center", "flex-wrap": "wrap" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            "border-radius": "50%",
            background: `conic-gradient(${E().guardColor} 0 ${E().guardPct}%, var(--line) 0)`,
            display: "grid",
            "place-items": "center",
            flex: "none",
          }}
        >
          <div style={{ width: "50px", height: "50px", "border-radius": "50%", background: "var(--surface-2)", display: "grid", "place-items": "center" }}>
            <span class="num" style={{ "font-size": "13px" }}>
              {E().guardN}/{E().guardT}
            </span>
          </div>
        </div>
        <div class="grow" style={{ "min-width": "220px" }}>
          <b style={{ "font-size": "16px" }}>{E().guardTitle}</b>
          <p class="sec" style={{ "font-size": "13px", "margin-top": "2px" }}>
            {E().guardNote}
          </p>
        </div>
        <button type="button" class="btn primary" disabled={E().guardBlocked}>
          {E().signLabel}
        </button>
      </div>
      <div class="g2">
        <For each={E().guardGroups}>
          {(g) => (
            <section class="card">
              <div class="card-h">
                <h3>{g.label}</h3>
                <div class="grow" />
                <span class="num muted" style={{ "font-size": "12px" }}>
                  {g.ok} de {g.n}
                </span>
              </div>
              <div class="rows">
                <For each={g.items}>
                  {(i) => (
                    <div class="row" style={{ cursor: "default" }}>
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          "border-radius": "50%",
                          display: "grid",
                          "place-items": "center",
                          background: i.bg,
                          color: i.fg,
                          flex: "none",
                        }}
                      >
                        <SvgPath d={i.icon} w={13} h={13} sw={2.6} />
                      </span>
                      <div class="grow">
                        <div class="t" style={{ "font-size": "14px" }}>
                          {i.t}
                        </div>
                        <div class="m">{i.m}</div>
                      </div>
                      <Show when={i.hasEv}>
                        <button type="button" class="link" style={{ "font-size": "12px" }}>
                          evidência
                        </button>
                      </Show>
                      <Show when={i.hasAct}>
                        <button type="button" class="btn sm secondary">
                          {i.actLabel}
                        </button>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
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
  const Q = () => buildQaMeridian(props.sel, props.evf, props.repF);

  return (
    <>
      <section class="card" style={{ padding: "18px 20px", display: "flex", gap: "18px", "align-items": "center", "flex-wrap": "wrap" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            "border-radius": "50%",
            background: `conic-gradient(${Q().ring} 0 ${Q().pct}%, var(--line) 0)`,
            display: "grid",
            "place-items": "center",
            flex: "none",
          }}
        >
          <div style={{ width: "54px", height: "54px", "border-radius": "50%", background: "var(--surface-2)", display: "grid", "place-items": "center" }}>
            <span class="num" style={{ "font-size": "13px" }}>
              {Q().pct}%
            </span>
          </div>
        </div>
        <div class="grow" style={{ "min-width": "240px" }}>
          <div class="eyebrow" style={{ display: "flex", gap: "6px", "align-items": "center" }}>
            <SvgPath d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10" w={13} h={13} sw={1.9} />
            QA · testes automatizados
          </div>
          <b style={{ "font-size": "17px", display: "block", "margin-top": "3px" }}>{Q().title}</b>
          <p class="sec" style={{ "font-size": "12.5px", "margin-top": "2px" }}>
            {Q().note}
          </p>
        </div>
        <div style={{ display: "flex", gap: "18px", "flex-wrap": "wrap" }}>
          <For each={Q().stats}>
            {(x) => (
              <div>
                <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                  {x.k}
                </div>
                <div class="num" style={{ "font-size": "17px", color: x.c }}>
                  {x.v}
                </div>
              </div>
            )}
          </For>
        </div>
        <button type="button" class="btn sm primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={ICN.play} />
          </svg>
          {Q().runLbl}
        </button>
      </section>

      <div style={{ display: "flex", gap: "16px", "align-items": "flex-start", "flex-wrap": "wrap" }}>
        <section class="card" style={{ flex: "0 1 270px", "min-width": "230px", overflow: "hidden" }}>
          <div class="card-h">
            <h3>Execuções</h3>
            <div class="grow" />
            <span class="num muted" style={{ "font-size": "11px" }}>
              mais recente primeiro
            </span>
          </div>
          <For each={Q().runs}>
            {(r) => (
              <button type="button" class={`fb-run ${r.on ? "on" : ""}`} onClick={() => props.onSel(r.i)}>
                <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                  <b class="mono" style={{ "font-size": "13px" }}>
                    {r.id}
                  </b>
                  <div class="grow" />
                  <span class={`badge ${r.cls}`}>{r.res}</span>
                </div>
                <small>
                  {r.when} · {r.by}
                </small>
                <div class="fb-pb">
                  <i style={{ width: `${r.pp}%` }} />
                </div>
              </button>
            )}
          </For>
          <div style={{ padding: "12px 16px", display: "flex", "flex-direction": "column", gap: "6px" }}>
            <span class="eyebrow" style={{ "font-size": "9.5px" }}>
              Armazenadas em
            </span>
            <code class="mono" style={{ "font-size": "10.5px", color: "var(--text-secondary)", "word-break": "break-all" }}>
              {Q().store}
            </code>
            <button type="button" class="btn sm ghost" style={{ "align-self": "flex-start", padding: "0" }}>
              Abrir pasta de evidências
            </button>
          </div>
        </section>

        <div style={{ flex: "1 1 520px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "10px", "align-items": "center", "flex-wrap": "wrap" }}>
            <b style={{ "font-size": "14px" }}>Evidências · {Q().selId}</b>
            <div class="grow" />
            <div class="segs">
              <For each={Q().evf}>
                {(f) => (
                  <button type="button" class={`seg ${f.on ? "on" : ""}`} onClick={() => props.onEvf(f.id)} style={{ height: "28px", "font-size": "12px" }}>
                    {f.label}
                    <span class="c">{f.n}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(min(190px, 100%), 1fr))", gap: "12px" }}>
            <For each={Q().ev}>
              {(e) => (
                <button type="button" class="card lift fb-ev">
                  <div class="fb-th" style={{ background: e.bg }}>
                    <Show when={e.isShot && !e.isVideo && !e.isGif}>
                      <div class="fb-mini" style={{ width: e.mw }}>
                        <i class="n" />
                        <i class="h1" />
                        <i class="h2" />
                        <i class="b" />
                        <i class="c" />
                        <Show when={e.fail}>
                          <span class="fb-mini-bug" />
                        </Show>
                      </div>
                    </Show>
                    <Show when={e.isDoc}>
                      <div class="fb-doc">
                        <i class="t" />
                        <i />
                        <i class="ok" />
                        <i class="er" />
                        <i />
                        <i style={{ width: "70%" }} />
                        <i style={{ width: "50%" }} />
                      </div>
                    </Show>
                    <Show when={e.isVideo}>
                      <span class="fb-playc">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={ICN.play} />
                        </svg>
                      </span>
                    </Show>
                    <Show when={e.isGif}>
                      <span class="fb-gifdot" />
                    </Show>
                    <span class="fb-thtag">{e.tag}</span>
                    <Show when={e.hasDur}>
                      <span class="fb-thdur">{e.dur}</span>
                    </Show>
                  </div>
                  <b style={{ "font-size": "12.5px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }} class="mono">
                    {e.name}
                  </b>
                  <span style={{ "font-size": "11.5px", color: e.mc }}>{e.meta}</span>
                </button>
              )}
            </For>
          </div>

          <section class="card" style={{ overflow: "hidden" }}>
            <div class="card-h" style={{ "flex-wrap": "wrap" }}>
              <h3>Resultados dos testes</h3>
              <span class="num muted" style={{ "font-size": "12px" }}>
                {Q().selId}
              </span>
              <div class="grow" />
              <div class="segs">
                <For each={Q().rf}>
                  {(f) => (
                    <button type="button" class={`seg ${f.on ? "on" : ""}`} onClick={() => props.onRepF(f.id)} style={{ height: "28px", "font-size": "12px" }}>
                      {f.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <For each={Q().suites}>
              {(su) => (
                <>
                  <div style={{ padding: "10px 18px", background: "var(--surface-1)", "border-bottom": "1px solid var(--line)", display: "flex", gap: "8px", "align-items": "center" }}>
                    <b style={{ "font-size": "13px" }}>{su.name}</b>
                    <span class={`badge ${su.cls}`}>{su.ok}</span>
                  </div>
                  <For each={su.tests}>
                    {(tc) => (
                      <div class={`fb-tc ${tc.cls2}`}>
                        <span style={{ color: tc.ic, "margin-top": "1px" }}>
                          <SvgPath d={tc.icon} w={14} h={14} sw={2.6} />
                        </span>
                        <div class="grow" style={{ "min-width": "0" }}>
                          <div>{tc.name}</div>
                          <Show when={tc.fail}>
                            <div class="fb-err">
                              <div style={{ color: "var(--danger)" }}>{tc.msg}</div>
                              <div>{tc.at}</div>
                            </div>
                          </Show>
                        </div>
                        <span class="mono muted" style={{ "font-size": "11px" }}>
                          {tc.dur}
                        </span>
                        <Show when={tc.hasEv}>
                          <button type="button" class="link" style={{ "font-size": "12px" }}>
                            evidência
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </>
              )}
            </For>
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
  const A = () => buildAcessosMeridian(props.credF, props.draft);

  return (
    <div style={{ display: "flex", gap: "18px", "align-items": "flex-start", "flex-wrap": "wrap" }}>
      <div style={{ flex: "2 1 520px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "18px" }}>
        <section class="card" style={{ padding: "20px", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "12px", "align-items": "flex-start", "flex-wrap": "wrap" }}>
            <div class="grow" style={{ "min-width": "220px" }}>
              <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                <SvgPath d="M15 9a3 3 0 1 1-3 3M12 12l-7 7M7 17l2 2M9 15l2 2" w={17} h={17} sw={1.9} />
                <h3 style={{ "font-size": "15px", "font-weight": "600" }}>Credenciais & variáveis</h3>
                <span class="badge">{A().target}</span>
              </div>
              <p class="muted" style={{ "font-size": "12.5px", "margin-top": "4px" }}>
                Valores ficam mascarados. Somente admins podem revelar.
              </p>
            </div>
            <button type="button" class="btn sm secondary">
              <SvgPath d="M12 5v14M5 12h14" w={15} h={15} sw={1.9} />
              Adicionar
            </button>
          </div>
          <div class="segs">
            <For each={A().filters}>
              {(f) => (
                <button type="button" class={`seg ${f.on ? "on" : ""}`} onClick={() => props.onFilter(f.id)} style={{ height: "28px", "font-size": "12px" }}>
                  {f.label}
                  <span class="c">{f.n}</span>
                </button>
              )}
            </For>
          </div>
          <For each={A().creds}>
            {(c) => (
              <div class={`fb-cred ${c.cls}`}>
                <span class="fb-svc" title={c.svc}>
                  <SvgPath d={c.icon} w={18} h={18} sw={1.9} />
                </span>
                <div class="grow" style={{ "min-width": "0" }}>
                  <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
                    <span class="fb-ck">{c.k}</span>
                    <span class={`badge ${c.stCls}`}>
                      <i />
                      {c.st}
                    </span>
                    <span class="badge">{c.env}</span>
                  </div>
                  <Show when={c.showVal}>
                    <div class="fb-cv" style={{ color: c.vc }}>
                      {c.v}
                    </div>
                  </Show>
                  <Show when={c.missing}>
                    <div style={{ display: "flex", gap: "6px", "margin-top": "8px", "flex-wrap": "wrap" }}>
                      <input
                        class="input mono"
                        style={{ height: "34px", "font-size": "12px", flex: "1 1 240px" }}
                        value={c.draft}
                        onInput={(e) => props.onDraft(e.currentTarget.value)}
                        placeholder="https://projeto.supabase.co"
                        aria-label={`Valor de ${c.k}`}
                      />
                      <button type="button" class="btn sm ghost" onClick={() => props.onDraft("https://mrdnxq2k.supabase.co")} style={{ height: "34px" }}>
                        Puxar do Supabase
                      </button>
                      <button type="button" class="btn sm secondary" style={{ height: "34px" }}>
                        {c.saveLbl}
                      </button>
                    </div>
                    <div class="fb-cm" style={{ color: "var(--text-secondary)" }}>
                      Ao salvar, a variável vai para {c.dest} e o preview é refeito. A pendência fecha sozinha.
                    </div>
                  </Show>
                  <div class="fb-cm">{c.meta}</div>
                </div>
                <div class="fb-ca">
                  <Show when={c.canReveal}>
                    <button type="button" class="ibtn sm" aria-label="Revelar valor (admin)" title="Revelar valor (admin)">
                      <SvgPath d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" w={16} h={16} sw={1.9} />
                    </button>
                    <button type="button" class="ibtn sm" aria-label="Copiar valor" title="Copiar valor">
                      <SvgPath d="M8 8h12v12H8zM4 16V4h12" w={16} h={16} sw={1.9} />
                    </button>
                  </Show>
                  <button type="button" class="btn sm ghost">
                    Editar
                  </button>
                </div>
              </div>
            )}
          </For>
          <Show when={A().empty}>
            <p class="muted" style={{ "font-size": "13px", padding: "8px 2px" }}>
              Nenhuma credencial neste filtro.
            </p>
          </Show>
        </section>

        <section class="card" style={{ padding: "20px", display: "flex", "flex-direction": "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
            <SvgPath d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" w={17} h={17} sw={1.9} />
            <h3 style={{ "font-size": "15px", "font-weight": "600" }}>Contas conectadas</h3>
            <div class="grow" />
            <span class="muted" style={{ "font-size": "12px" }}>
              {A().accTxt}
            </span>
          </div>
          <For each={A().acc}>
            {(a) => (
              <div class="fb-cred" style={{ padding: "12px 14px", "align-items": "center" }}>
                <span class="fb-svc" style={{ width: "34px", height: "34px" }}>
                  <SvgPath d={a.icon} w={16} h={16} sw={1.9} />
                </span>
                <div class="grow" style={{ "min-width": "0" }}>
                  <b style={{ "font-size": "13.5px" }}>{a.s}</b>
                  <div class="mono muted" style={{ "font-size": "11.5px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                    {a.a} · {a.sc}
                  </div>
                </div>
                <span class={`badge ${a.cls}`}>
                  <i />
                  {a.st}
                </span>
              </div>
            )}
          </For>
        </section>
      </div>

      <div style={{ flex: "1 1 300px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "18px" }}>
        <section class="card" style={{ padding: "20px", display: "flex", gap: "16px", "align-items": "center" }}>
          <div
            style={{
              width: "66px",
              height: "66px",
              "border-radius": "50%",
              background: `conic-gradient(${A().hCol} 0 ${A().hPct}%, var(--line) 0)`,
              display: "grid",
              "place-items": "center",
              flex: "none",
            }}
          >
            <div style={{ width: "54px", height: "54px", "border-radius": "50%", background: "var(--surface-2)", display: "grid", "place-items": "center" }}>
              <span class="num" style={{ "font-size": "13px" }}>
                {A().hPct}%
              </span>
            </div>
          </div>
          <div class="grow">
            <b style={{ "font-size": "15px" }}>Saúde dos acessos</b>
            <div class="muted" style={{ "font-size": "12.5px", "margin-top": "2px" }}>
              {A().hTxt}
            </div>
            <Show when={A().hasMissing}>
              <span class="badge danger" style={{ "margin-top": "8px" }}>
                <i />
                {A().missingTxt}
              </span>
            </Show>
          </div>
        </section>
        <section class="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "8px", "align-items": "center", "margin-bottom": "4px" }}>
            <SvgPath d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c1-4 3.5-6 7-6s6 2 7 6M17 3.5a4 4 0 0 1 0 7.5M19 15c1.6.8 2.6 2.8 3 6" w={17} h={17} sw={1.9} />
            <h3 style={{ "font-size": "15px", "font-weight": "600" }}>Pessoas com acesso</h3>
            <div class="grow" />
            <button type="button" class="link">
              Convidar
            </button>
          </div>
          <For each={A().people}>
            {(p) => (
              <div class="fb-pp">
                <span class="av" style={{ width: "36px", height: "36px", "font-size": "10.5px", color: p.c, "border-color": p.c }}>
                  {p.i}
                </span>
                <div class="grow" style={{ "min-width": "0" }}>
                  <div style={{ "font-size": "14px", "font-weight": "600" }}>{p.n}</div>
                  <div class="muted" style={{ "font-size": "11.5px" }}>
                    {p.r}
                  </div>
                </div>
                <span class={`fb-role ${p.cls}`}>
                  <SvgPath d={p.icon} w={12} h={12} sw={2.2} />
                  {p.p}
                </span>
              </div>
            )}
          </For>
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
  const S = () => buildSegMeridian(props.sevF, props.openIds);

  return (
    <>
      <section class="card" style={{ padding: "18px 20px", display: "flex", gap: "18px", "align-items": "center", "flex-wrap": "wrap" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            "border-radius": "50%",
            background: `conic-gradient(${S().ring} 0 ${S().score}%, var(--line) 0)`,
            display: "grid",
            "place-items": "center",
            flex: "none",
          }}
        >
          <div style={{ width: "54px", height: "54px", "border-radius": "50%", background: "var(--surface-2)", display: "grid", "place-items": "center", "text-align": "center" }}>
            <span class="num" style={{ "font-size": "14px", "line-height": "1" }}>
              {S().score}
              <br />
              <small style={{ "font-size": "9px", color: "var(--text-muted)" }}>/100</small>
            </span>
          </div>
        </div>
        <div class="grow" style={{ "min-width": "240px" }}>
          <div class="eyebrow" style={{ display: "flex", gap: "6px", "align-items": "center" }}>
            <SvgPath d={ICN.shield} w={13} h={13} sw={1.9} />
            Segurança & LGPD
          </div>
          <b style={{ "font-size": "17px", display: "block", "margin-top": "3px" }}>{S().title}</b>
          <p class="sec" style={{ "font-size": "12.5px", "margin-top": "2px" }}>
            {S().note}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
          <For each={S().sevs}>
            {(v) => (
              <span class={`fb-sev ${v.cls}`}>
                <b>{v.n}</b>
                {v.label}
              </span>
            )}
          </For>
        </div>
        <button type="button" class="btn sm primary">
          <SvgPath d={ICN.shield} w={14} h={14} sw={1.9} />
          {S().runLbl}
        </button>
      </section>

      <div style={{ display: "flex", gap: "16px", "align-items": "flex-start", "flex-wrap": "wrap" }}>
        <div style={{ flex: "2 1 520px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <section class="card" style={{ padding: "16px", display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
            <div class="fb-th" style={{ width: "150px", height: "112px", background: "#0e1626", flex: "none" }}>
              <div class="fb-doc" style={{ width: "72%" }}>
                <i class="t" />
                <i />
                <i class="er" />
                <i />
                <i class="ok" />
                <i style={{ width: "70%" }} />
                <i style={{ width: "46%" }} />
              </div>
              <span class="fb-thtag">HTML</span>
            </div>
            <div class="grow" style={{ "min-width": "220px" }}>
              <div class="eyebrow" style={{ "font-size": "10px" }}>
                Relatório completo · {S().selId}
              </div>
              <b style={{ "font-size": "15px", display: "block", "margin-top": "3px" }}>Todos os testes, falhas, evidências e correções</b>
              <p class="muted" style={{ "font-size": "12.5px", "margin-top": "3px" }}>
                {S().checksN} testes · {S().passN} passaram · {S().findN} achados · ferramentas:{" "}
                <For each={S().tools}>
                  {(x) => (
                    <span class="mono" style={{ "font-size": "11px" }}>
                      {x.t} ·{" "}
                    </span>
                  )}
                </For>
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" class="btn sm secondary">
                <SvgPath d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" w={14} h={14} sw={1.9} />
                Abrir relatório
              </button>
              <button type="button" class="btn sm ghost">
                <SvgPath d="M12 4v11M7 10l5 5 5-5M5 20h14" w={14} h={14} sw={1.9} />
                Baixar HTML
              </button>
            </div>
          </section>

          <section class="card" style={{ padding: "16px", display: "flex", "flex-direction": "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", "align-items": "center", "flex-wrap": "wrap" }}>
              <h3 style={{ "font-size": "15px", "font-weight": "600" }}>Falhas encontradas</h3>
              <div class="grow" />
              <div class="segs">
                <For each={S().ff}>
                  {(f) => (
                    <button type="button" class={`seg ${f.on ? "on" : ""}`} onClick={() => props.onSevF(f.id)} style={{ height: "28px", "font-size": "12px" }}>
                      {f.label}
                      <span class="c">{f.n}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>
            <Show when={S().noFind}>
              <p class="muted" style={{ "font-size": "13px" }}>
                Nenhuma falha neste filtro.
              </p>
            </Show>
            <For each={S().findings}>
              {(f) => (
                <div class={`fb-find ${f.cls}`}>
                  <button type="button" class="fb-fh" onClick={() => props.onToggle(f.id)} aria-expanded={f.open}>
                    <span class={`badge ${f.sevCls}`} style={{ "text-transform": "capitalize" }}>
                      {f.sev}
                    </span>
                    <span class="mono muted" style={{ "font-size": "11px" }}>
                      {f.id}
                    </span>
                    <div class="grow" style={{ "min-width": "0" }}>
                      <b style={{ "font-size": "13.5px", display: "block" }}>{f.title}</b>
                      <span class="muted mono" style={{ "font-size": "11px" }}>
                        {f.where}
                      </span>
                    </div>
                    <span class={`badge ${f.stCls}`}>
                      <i />
                      {f.st}
                    </span>
                    <SvgPath d={f.chev} w={16} h={16} sw={2} />
                  </button>
                  <Show when={f.open}>
                    <div class="fb-fb">
                      <p class="sec">{f.desc}</p>
                      <h4>Evidência</h4>
                      <pre class="fb-pre">{f.ev}</pre>
                      <h4>Impacto</h4>
                      <p class="sec">{f.impact}</p>
                      <h4>Como corrigir</h4>
                      <p>{f.fix}</p>
                      <pre class="fb-pre fix">{f.code}</pre>
                      <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
                        <For each={f.refs}>
                          {(r) => <span class="badge">{r}</span>}
                        </For>
                      </div>
                      <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap", "padding-top": "4px" }}>
                        <Show when={f.isOpen}>
                          <button type="button" class="btn sm secondary">
                            <SvgPath d="M13 3 5 14h6l-1 7 8-11h-6z" w={14} h={14} sw={1.9} />
                            Pedir correção ao motor
                          </button>
                          <button type="button" class="btn sm ghost">
                            Marcar como corrigida
                          </button>
                        </Show>
                        <button type="button" class="btn sm ghost">
                          Copiar sugestão
                        </button>
                        <Show when={f.hasImg}>
                          <button type="button" class="btn sm ghost">
                            Ver print
                          </button>
                        </Show>
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </section>
        </div>

        <div style={{ flex: "1 1 300px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <section class="card" style={{ overflow: "hidden" }}>
            <div class="card-h">
              <h3>Varreduras</h3>
            </div>
            <For each={S().runs}>
              {(r) => (
                <button type="button" class={`fb-run ${r.on ? "on" : ""}`}>
                  <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                    <b class="mono" style={{ "font-size": "13px" }}>
                      {r.id}
                    </b>
                    <div class="grow" />
                    <span class={`badge ${r.cls}`}>{r.res}</span>
                  </div>
                  <small>
                    {r.when} · {r.by}
                  </small>
                  <div class="fb-pb">
                    <i style={{ width: `${r.pp}%` }} />
                  </div>
                </button>
              )}
            </For>
            <div style={{ padding: "12px 16px", display: "flex", "flex-direction": "column", gap: "4px" }}>
              <span class="eyebrow" style={{ "font-size": "9.5px" }}>
                Armazenadas em
              </span>
              <code class="mono" style={{ "font-size": "10.5px", color: "var(--text-secondary)", "word-break": "break-all" }}>
                {S().store}
              </code>
            </div>
          </section>

          <section class="card" style={{ overflow: "hidden" }}>
            <div class="card-h">
              <h3>Testes realizados</h3>
              <div class="grow" />
              <span class="num muted" style={{ "font-size": "11px" }}>
                {S().checkTxt}
              </span>
            </div>
            <For each={S().checks}>
              {(c) => (
                <div class="fb-chk">
                  <span class={`badge ${c.cls}`} style={{ height: "20px", flex: "none", "min-width": "64px", "justify-content": "center" }}>
                    {c.lbl}
                  </span>
                  <div class="grow" style={{ "min-width": "0" }}>
                    {c.t}
                    <div class="muted" style={{ "font-size": "11px" }}>
                      {c.area}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </section>

          <Show when={S().hasImgs}>
            <section class="card" style={{ padding: "14px", display: "flex", "flex-direction": "column", gap: "10px" }}>
              <h3 style={{ "font-size": "14px", "font-weight": "600" }}>Imagens da varredura</h3>
              <For each={S().imgs}>
                {(e) => (
                  <button type="button" class="card lift fb-ev">
                    <div class="fb-th" style={{ background: e.bg }}>
                      <Show when={e.isShot}>
                        <div class="fb-mini" style={{ width: e.mw }}>
                          <i class="n" />
                          <i class="h1" />
                          <i class="h2" />
                          <i class="b" />
                          <i class="c" />
                          <Show when={e.fail}>
                            <span class="fb-mini-bug" />
                          </Show>
                        </div>
                      </Show>
                      <span class="fb-thtag">{e.tag}</span>
                    </div>
                    <b class="mono" style={{ "font-size": "12px" }}>
                      {e.name}
                    </b>
                    <span style={{ "font-size": "11.5px", color: e.mc }}>{e.meta}</span>
                  </button>
                )}
              </For>
            </section>
          </Show>
        </div>
      </div>
    </>
  );
}

function KanbanMeridian() {
  const cols = () => buildKanbanMeridian();
  return (
    <div class="kanban" style={{ "grid-template-columns": "repeat(4, minmax(200px, 1fr))" }}>
      <For each={cols()}>
        {(c) => (
          <div class="kcol">
            <div class="kcol-h">
              <i style={{ background: c.col }} />
              <b>{c.t}</b>
              <span class="badge" style={{ "margin-left": "auto" }}>
                {c.n}
              </span>
            </div>
            <For each={c.cards}>
              {(k) => (
                <button type="button" class={`kcard ${k.cls}`}>
                  <div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
                    <span class="mono muted" style={{ "font-size": "11px" }}>
                      {k.n}
                    </span>
                    <div class="grow" />
                    <Show when={k.hasB}>
                      <span class={`badge ${k.bcls}`}>{k.b}</span>
                    </Show>
                  </div>
                  <b style={{ "font-size": "14px", "line-height": "1.3" }}>{k.t}</b>
                  <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                    <span class="av" style={{ width: "24px", height: "24px", "font-size": "9px" }}>
                      {k.ini}
                    </span>
                    <span class="muted" style={{ "font-size": "12px" }}>
                      {k.who}
                    </span>
                  </div>
                  <span class="mono" style={{ "font-size": "10.5px", color: "var(--text-muted)" }}>
                    {k.skill}
                  </span>
                </button>
              )}
            </For>
            <Show when={c.empty}>
              <p class="muted" style={{ "font-size": "12px", padding: "6px 4px" }}>
                Nada aqui agora.
              </p>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}

function RoadmapMeridian() {
  const R = () => buildRoadmapMeridian();
  return (
    <>
      <section class="card" style={{ overflow: "hidden" }}>
        <div class="card-h" style={{ "flex-wrap": "wrap" }}>
          <h3>Roadmap</h3>
          <span class="num muted" style={{ "font-size": "12px" }}>
            {R().range}
          </span>
          <div class="grow" />
          <div class="legend">
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
        <div class="noscroll" style={{ "overflow-x": "auto" }}>
          <div style={{ "min-width": "820px", position: "relative" }}>
            <div class="fb-rr" style={{ "min-height": "32px", background: "var(--surface-1)" }}>
              <span class="eyebrow" style={{ padding: "0 16px", "font-size": "9.5px" }}>
                Etapa
              </span>
              <div style={{ position: "relative", height: "32px" }}>
                <For each={R().days}>
                  {(d) => (
                    <>
                      <i style={{ position: "absolute", left: `${d.x}%`, top: "0", bottom: "0", "border-left": "1px solid var(--line)" }} />
                      <Show when={d.lbl}>
                        <span class="mono" style={{ position: "absolute", left: `${d.x}%`, top: "9px", "padding-left": "5px", "font-size": "10px", color: d.c, "font-weight": d.fw }}>
                          {d.t}
                        </span>
                      </Show>
                    </>
                  )}
                </For>
              </div>
            </div>
            <For each={R().rows}>
              {(r) => (
                <div class="fb-rr">
                  <div style={{ padding: "0 16px", "min-width": "0" }}>
                    <b style={{ "font-size": "12.5px", display: "block", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis", color: r.tc }}>
                      {r.n} · {r.t}
                    </b>
                    <small class="muted" style={{ "font-size": "11px" }}>
                      {r.who}
                    </small>
                  </div>
                  <div style={{ position: "relative", height: "42px" }}>
                    <span class="fb-bar" style={{ left: `${r.x}%`, width: `${r.w}%`, background: r.bg, border: `1px solid ${r.bd}`, color: r.fg }}>
                      {r.lbl}
                    </span>
                    <Show when={r.gate}>
                      <i class="fb-ms" style={{ left: `${r.gx}%` }} />
                    </Show>
                  </div>
                </div>
              )}
            </For>
            <div style={{ position: "absolute", top: "0", bottom: "0", left: `calc(230px + (100% - 230px) * ${R().today})`, width: "2px", background: "var(--warning)", "pointer-events": "none" }}>
              <span class="mono" style={{ position: "absolute", top: "2px", left: "4px", "font-size": "9.5px", color: "var(--warning)", "white-space": "nowrap" }}>
                hoje
              </span>
            </div>
          </div>
        </div>
      </section>
      <div class="g3">
        <For each={R().miles}>
          {(m) => (
            <div class="card" style={{ padding: "16px 18px", display: "flex", gap: "14px", "align-items": "center" }}>
              <span style={{ width: "14px", height: "14px", transform: "rotate(45deg)", "border-radius": "3px", background: m.c, flex: "none", margin: "0 4px" }} />
              <div class="grow" style={{ "min-width": "0" }}>
                <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                  {m.d}
                </div>
                <b style={{ "font-size": "14px" }}>{m.t}</b>
              </div>
              <span class={`badge ${m.cls}`}>{m.st}</span>
            </div>
          )}
        </For>
      </div>
    </>
  );
}

function WorkspaceMeridian(props: { ff: string | number; onFf: (f: string | number) => void }) {
  const W = () => buildWorkspaceMeridian(props.ff);
  return (
    <>
      <section class="card" style={{ padding: "16px 18px", display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
        <span style={{ width: "42px", height: "42px", "border-radius": "12px", display: "grid", "place-items": "center", background: "var(--flow-subtle)", color: "var(--flow)", flex: "none" }}>
          <SvgPath d={ICN.folder} w={20} h={20} sw={1.9} />
        </span>
        <div class="grow" style={{ "min-width": "260px" }}>
          <div style={{ display: "flex", gap: "6px", "align-items": "center", "flex-wrap": "wrap" }}>
            <b style={{ "font-size": "15px" }}>Workspace isolado</b>
            <span class="badge flow">
              <i />
              Git/.env isolado
            </span>
            <span class="badge">Git: {W().git}</span>
          </div>
          <code class="mono" style={{ "font-size": "11.5px", color: "var(--text-secondary)", "word-break": "break-all", display: "block", "margin-top": "4px" }}>
            {W().path}
          </code>
        </div>
        <div style={{ display: "flex", gap: "22px", padding: "0 6px" }}>
          <div>
            <div class="eyebrow" style={{ "font-size": "9.5px" }}>
              Pastas
            </div>
            <div class="num" style={{ "font-size": "18px" }}>
              {W().disk0}
            </div>
          </div>
          <div>
            <div class="eyebrow" style={{ "font-size": "9.5px" }}>
              Arquivos
            </div>
            <div class="num" style={{ "font-size": "18px" }}>
              {W().disk1}
            </div>
          </div>
          <div>
            <div class="eyebrow" style={{ "font-size": "9.5px" }}>
              Stack
            </div>
            <div style={{ "font-size": "13px", "font-weight": "600", "margin-top": "4px" }}>{W().disk2}</div>
          </div>
        </div>
        <button type="button" class="btn sm secondary">
          Abrir no Explorer
        </button>
        <button type="button" class="btn sm ghost">
          Atualizar
        </button>
      </section>
      <div style={{ display: "flex", gap: "16px", "align-items": "flex-start", "flex-wrap": "wrap" }}>
        <section class="card" style={{ flex: "0 1 330px", "min-width": "260px", overflow: "hidden" }}>
          <div class="card-h">
            <h3>Estrutura no disco</h3>
            <div class="grow" />
            <span class="num muted" style={{ "font-size": "11px" }}>
              {W().treeInfo}
            </span>
          </div>
          <div style={{ "max-height": "560px", overflow: "auto" }}>
            <For each={W().tree}>
              {(r) => (
                <button type="button" class={`fb-tr ${r.on}`} style={{ "padding-left": `${r.pad}px` }}>
                  <SvgPath d={r.icon} w={14} h={14} sw={1.9} />
                  <span class="mono">{r.name}</span>
                  <span class="grow" />
                  <span class={`badge ${r.bcls}`} style={{ height: "18px", "font-size": "9.5px", padding: "0 6px" }}>
                    {r.badge}
                  </span>
                  <span class="mono muted" style={{ "font-size": "10px", "min-width": "50px", "text-align": "right" }}>
                    {r.size}
                  </span>
                </button>
              )}
            </For>
          </div>
        </section>
        <div style={{ flex: "1 1 420px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
            <div class="segs">
              <For each={W().ffs}>
                {(f) => (
                  <button type="button" class={`seg ${f.on ? "on" : ""}`} onClick={() => props.onFf(f.id)} style={{ height: "30px", "font-size": "12.5px" }}>
                    {f.label}
                    <span class="c">{f.n}</span>
                  </button>
                )}
              </For>
            </div>
            <div class="grow" />
            <span class="muted" style={{ "font-size": "12px" }}>
              Clique para abrir no visualizador
            </span>
          </div>
          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: "14px" }}>
            <For each={W().projFiles}>
              {(f) => (
                <button type="button" class="card lift" style={{ padding: "12px", display: "flex", "flex-direction": "column", gap: "10px", "text-align": "left", color: "inherit", width: "100%" }}>
                  <div style={{ height: "120px", "border-radius": "10px", overflow: "hidden", position: "relative", background: f.thumbBg, border: "1px solid var(--line)" }}>
                    <Show when={f.isImg}>
                      <div style={{ position: "absolute", inset: "10px", "border-radius": "6px", background: f.imgPaper, display: "flex", "flex-direction": "column", gap: "6px", padding: "8px" }}>
                        <i style={{ height: "6px", width: "40%", "border-radius": "3px", background: f.imgInk }} />
                        <i style={{ height: "12px", width: "80%", "border-radius": "3px", background: f.imgInk, opacity: "0.8" }} />
                        <i style={{ height: "6px", width: "60%", "border-radius": "3px", background: f.imgInk, opacity: "0.4" }} />
                        <i style={{ flex: "1", "border-radius": "4px", background: f.imgInk, opacity: "0.12" }} />
                      </div>
                    </Show>
                    <Show when={f.isText}>
                      <pre class="mono" style={{ margin: "0", padding: "10px 12px", "font-size": "10px", "line-height": "1.6", color: "var(--text-secondary)", "white-space": "pre", overflow: "hidden" }}>
                        {f.snip}
                      </pre>
                    </Show>
                    <span class="mono" style={{ position: "absolute", right: "8px", bottom: "8px", "font-size": "10px", padding: "2px 7px", "border-radius": "6px", background: "var(--surface-ink)", color: "#1BC5BD" }}>
                      {f.ext}
                    </span>
                  </div>
                  <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
                    <b style={{ "font-size": "13.5px", flex: "1", "min-width": "0", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{f.name}</b>
                    <Show when={f.dirty}>
                      <span class="badge warn">não salvo</span>
                    </Show>
                  </div>
                  <span class="muted" style={{ "font-size": "11.5px" }}>
                    {f.stage} · {f.meta}
                  </span>
                </button>
              )}
            </For>
          </div>
          <Show when={W().noProjFiles}>
            <p class="muted" style={{ "font-size": "13px" }}>
              Nenhum arquivo neste filtro.
            </p>
          </Show>
        </div>
      </div>
    </>
  );
}
