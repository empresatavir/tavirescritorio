import { For, Show, createSignal } from "solid-js";
import { KIND_META, STAT, type FabPend, type FabProject } from "./panelTypes";

export type ConsoleTab = "geral" | "esteira" | "kanban" | "roadmap" | "arquivos" | "qa" | "seg" | "acessos";

const MERIDIAN_STAGES: Array<[string, string, string, string]> = [
  ["Entender", "Paula PM", "PP", "Orquestradora"],
  ["Refinar", "Arquiteto de Nicho", "AN", "Arquitetura de soluções"],
  ["Dossiê", "Dora Descoberta", "DD", "Intake e descoberta"],
  ["Arquitetura", "Théo Tech Lead", "TL", "Liderança técnica"],
  ["Construção", "Vitor Construtor", "VC", "Dev frontend sênior"],
  ["QA", "Edna E2E", "EE", "QA end-to-end"],
  ["Security", "Auditor Seg/LGPD", "AS", "Segurança e LGPD"],
  ["SEO", "Nina SEO", "NS", "SEO técnico"],
  ["Handoff", "Paulo Publicador", "PU", "Publicação e release"],
];

const MERIDIAN_ACTS: Array<[string, string, string]> = [
  ["hoje 14:18", "Gate de QA aberto · 2 critérios", "Edna E2E"],
  ["hoje 14:02", "Build de preview falhou · SUPABASE_URL", "Vitor Construtor"],
  ["hoje 13:40", "Construção das 5 seções concluída", "Vitor Construtor"],
  ["hoje 11:12", "Scaffold Nuxt 3 + CI verdes", "Vitor Construtor"],
  ["ontem 18:05", "Arquitetura aprovada no gate", "Ari Arquiteto"],
  ["ontem 15:22", "Dossiê e personas fechados", "Dora Descoberta"],
];

const MERIDIAN_INV = [
  ["Seções", "5"],
  ["Rotas", "5 pré-render."],
  ["Links verificados", "38"],
  ["Lighthouse", "92 · 96"],
];

const IC = {
  shield: "M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6zM9 12l2 2 4-4",
  run: "M13 3 5 14h6l-1 7 8-11h-6z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  play: "M8 5v14l11-7z",
  check: "M5 12.5l4.5 4.5L19 7",
  folder: "M3 7h6l2 2h10v10H3z",
  chat: "M5 5h14v11H9l-4 3z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  code: "M8 6l-5 6 5 6M16 6l5 6-5 6",
  db: "M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3zm0 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 18c0 1.7 3.6 3 8 3s8-1.3 8-3",
  cms: "M4 6h16v12H4zM8 10h8M8 14h5",
};

type Props = {
  project: FabProject;
  pends: FabPend[];
  onBack: () => void;
  onTabHint?: (tab: ConsoleTab) => void;
};

export function ProjectConsoleView(props: Props) {
  const [tab, setTab] = createSignal<ConsoleTab>("geral");
  const [thinkOpen, setThinkOpen] = createSignal(false);
  const [cfgOpen, setCfgOpen] = createSignal(false);

  const ROOT = "C:\\Users\\carlo\\Downloads\\Projetos a Estudar\\tavirescritorio\\";
  const isM = () => props.project.id === "meridian";
  const gN = () => (props.project.status === "done" ? 8 : isM() ? 6 : Math.min(props.project.done, 8));
  const path = () => ROOT + (props.project.pathSlug || props.project.slug).replace(/\//g, "\\");
  const git = () => props.project.git || props.project.code.replace(/-/g, "").toUpperCase();
  const due = () => props.project.due || (props.project.status === "done" ? "entregue 04/11" : "entrega 04/11");
  const kind = () => props.project.kind || "LPs · Criação";
  const spent = () => props.project.spent || (isM() ? "9,74" : "3,12");
  const budget = () => props.project.budget || (isM() ? "25" : "40");
  const costPct = () => Math.min(100, Math.round((parseFloat(String(spent()).replace(",", ".")) / parseFloat(budget())) * 100));

  const pickTab = (t: ConsoleTab) => {
    setTab(t);
    props.onTabHint?.(t);
  };

  const tabs = () => {
    const p = props.project;
    const missing = isM() ? 1 : 0;
    return [
      { id: "geral" as const, label: "Visão geral", n: p.pendN > 0 ? p.pendN : 0, cls: "warn" },
      { id: "esteira" as const, label: "Esteira", n: 0, cls: "" },
      { id: "kanban" as const, label: "Kanban", n: 0, cls: "" },
      { id: "roadmap" as const, label: "Roadmap", n: 0, cls: "" },
      { id: "arquivos" as const, label: "Workspace", n: props.project.fileN ?? (isM() ? 18 : 4), cls: "" },
      { id: "qa" as const, label: "QA", n: props.project.qaN ?? (props.project.id === "meridian" ? 2 : 0), cls: "danger" },
      { id: "seg" as const, label: "Segurança", n: props.project.secN ?? 0, cls: "danger" },
      { id: "acessos" as const, label: "Acessos", n: missing, cls: "danger" },
    ];
  };

  const stages = () => {
    if (isM()) return MERIDIAN_STAGES.map((s) => [s[0], s[1], s[2]] as [string, string, string]);
    return props.project.stages.map((name, i) => [name, props.project.owner, "·"] as [string, string, string]);
  };

  const cs = () => {
    const p = props.project;
    if (isM()) {
      return {
        eyebrow: "Etapa 06 de 09 · no gate",
        name: "QA",
        owner: "Edna E2E",
        ini: "EE",
        skill: "Playwright · Lighthouse · Guard",
        status: "aguardando gate",
        cls: "warn",
        d: "Prova em 390 px e assinatura de SEO seguram a entrega. O resto passou.",
        btn: "Resolver gate",
        secLbl: "Ver na esteira",
        blocked: true,
        blockTxt: "A etapa só fecha com o Guard em 8 de 8. Os critérios em âmbar têm a ação ao lado.",
        icon: IC.shield,
        ibg: "var(--warning-subtle)",
        ifg: "var(--warning)",
        anim: "ringwarn 2s var(--ease) infinite",
        bd: "oklch(.80 .155 78 / .45)",
      };
    }
    const block = props.pends[0];
    const dn = p.status === "done";
    const pz = p.status === "paused";
    return {
      eyebrow: `Etapa ${String(p.done + (dn ? 0 : 1)).padStart(2, "0")} de ${String(p.n).padStart(2, "0")}`,
      name: dn ? "Projeto entregue" : p.stepName,
      owner: p.owner,
      ini: p.owner.slice(0, 2).toUpperCase(),
      skill: p.think,
      status: dn ? "entregue" : pz ? "pausada" : block ? "aguardando autorização" : "em execução",
      cls: dn ? "action" : pz || block ? "warn" : "flow",
      d: dn
        ? "Gate final assinado com o Guard em 8 de 8. O runbook e os acessos ficam aqui para consulta."
        : pz
          ? "Os agentes param ao fim da tarefa atual. Nada é perdido."
          : block
            ? block.d
            : "O agente está trabalhando nesta etapa. Concluir registra a entrega e chama a próxima mesa.",
      btn: dn ? "Ver Completion Guard" : pz ? "Retomar esteira" : block ? "Autorizar" : "Concluir etapa",
      secLbl: "Ver esteira",
      blocked: !!block && !pz,
      blockTxt: "Esta etapa está bloqueada. Resolva a pendência para continuar.",
      icon: dn ? IC.check : pz ? IC.pause : block ? KIND_META.auth.icon : IC.run,
      ibg: dn ? "var(--action-subtle)" : pz || block ? "var(--warning-subtle)" : "var(--flow-subtle)",
      ifg: dn ? "var(--action-subtle-text)" : pz || block ? "var(--warning)" : "var(--flow)",
      anim: block && !pz ? "ringwarn 2s var(--ease) infinite" : "none",
      bd: block && !pz ? "oklch(.80 .155 78 / .45)" : "var(--line)",
    };
  };

  const stState = (i: number) => {
    const p = props.project;
    if (i < p.done) return "done" as const;
    if (i === p.done && p.status !== "done") {
      if (p.status === "paused") return "paused" as const;
      if (isM() || p.pendN > 0) return "gate" as const;
      return "run" as const;
    }
    return "todo" as const;
  };

  const SS = {
    done: ["concluída", "flow", "var(--flow)", "var(--surface-1)", "var(--flow)"],
    run: ["em execução", "flow", "var(--flow-subtle)", "var(--flow)", "var(--flow-subtle-line)"],
    gate: [isM() ? "no gate" : "aguarda você", "warn", "var(--warning-subtle)", "var(--warning)", "var(--warning)"],
    paused: ["pausada", "warn", "var(--warning-subtle)", "var(--warning)", "var(--warning)"],
    todo: ["a seguir", "", "var(--surface-0)", "var(--text-muted)", "var(--line)"],
  } as const;

  const vsteps = () =>
    stages().map((x, i) => {
      const k = stState(i);
      const Z = SS[k];
      const now = k === "run" || k === "gate" || k === "paused";
      return {
        n: String(i + 1).padStart(2, "0"),
        t: x[0],
        who: x[1],
        now,
        st: Z[0],
        cls: Z[1],
        bg: Z[2],
        fg: Z[3],
        bd: Z[4],
        tc: k === "todo" ? "var(--text-secondary)" : "var(--text-primary)",
        rowBg: now ? "var(--surface-3)" : "transparent",
      };
    });

  const mesas = () => {
    const map = new Map<string, { n: string; ini: string; skills: string[]; c: number; busy: boolean }>();
    stages().forEach((x, i) => {
      const m = map.get(x[1]) || { n: x[1], ini: x[2], skills: [], c: 0, busy: false };
      if (!m.skills.includes(x[0])) m.skills.push(x[0]);
      m.c++;
      if (i === props.project.done && props.project.status !== "done") m.busy = true;
      map.set(x[1], m);
    });
    return [...map.values()];
  };

  return (
    <div class="page" style={{ "max-width": "1320px", gap: "18px", "padding-bottom": "110px" }}>
      <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
        <button type="button" class="link" onClick={props.onBack}>
          ← Painel
        </button>
        <span class="muted">/</span>
        <span style={{ "font-size": "14px", "font-weight": "600" }}>{props.project.name}</span>
        <div class="grow" />
        <button type="button" class="btn sm ghost">
          Pedir alteração
        </button>
        <button type="button" class="btn sm secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d={IC.chat} />
          </svg>
          Íris
        </button>
        <button type="button" class="ibtn sm" aria-label="Mais ações do projeto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d={IC.dots} />
          </svg>
        </button>
      </div>

      <section class="ink" style={{ padding: "22px 24px", display: "flex", gap: "22px", "flex-wrap": "wrap", "align-items": "stretch" }}>
        <div style={{ flex: "2 1 380px", display: "flex", "flex-direction": "column", gap: "10px", "min-width": "0" }}>
          <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
            <span class="badge">{props.project.code}</span>
            <span class={`badge ${STAT[props.project.status][1]}`}>
              <i />
              {STAT[props.project.status][0]}
            </span>
            <span class={`badge ${gN() === 8 ? "flow" : "warn"}`}>Guard {gN()}/8</span>
            <span class="badge">{due()}</span>
            <span class="badge flow">
              <i />
              Git/.env isolado · {git()}
            </span>
            <span class="badge flow">{props.project.cap}</span>
          </div>
          <h1 style={{ "font-size": "28px", "font-weight": "600", "letter-spacing": "-.03em", "line-height": "1.1" }}>{props.project.name}</h1>
          <div style={{ "font-size": "13px", color: "var(--on-ink-muted)" }}>
            {kind()} · {props.project.client} · esteira {props.project.line}
          </div>
          <div class="fb-path">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d={IC.folder} />
            </svg>
            <code>{path()}</code>
            <button type="button" class="btn sm onink-sec">
              Copiar
            </button>
            <button type="button" class="btn sm onink-sec">
              Abrir no Explorer
            </button>
            <button type="button" class="btn sm onink-sec" onClick={() => pickTab("arquivos")}>
              Estrutura
            </button>
          </div>
          <div class="fb-tags">
            <span class="fb-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={IC.code} />
              </svg>
              Nuxt 3 estático
            </span>
            <span class="fb-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={IC.db} />
              </svg>
              Supabase PostgreSQL
            </span>
            <span class="fb-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={IC.cms} />
              </svg>
              Sem CMS na v1
            </span>
          </div>
        </div>
        <div style={{ flex: "1 1 480px", display: "grid", "grid-template-columns": "repeat(5, minmax(0, 1fr))", gap: "10px", "align-content": "center" }}>
          <div class="fb-hm">
            <span class="fb-ring" style={{ width: "48px", height: "48px", background: `conic-gradient(#B7F34A 0 ${props.project.pct}%, rgba(244,246,242,.12) 0)` }}>
              <i style={{ width: "38px", height: "38px", background: "#0B1220", color: "#F4F6F2", "font-size": "11px" }}>{props.project.pct}%</i>
            </span>
            <small>Progresso</small>
          </div>
          <button type="button" class="fb-hm" onClick={() => pickTab("esteira")}>
            <b class="num">
              {props.project.done}
              <span>/{props.project.n}</span>
            </b>
            <small>Etapas</small>
          </button>
          <button type="button" class="fb-hm" onClick={() => pickTab("qa")}>
            <b class="num" style={{ color: gN() === 8 ? "#1BC5BD" : "oklch(.80 .155 78)" }}>
              {gN()}
              <span>/8</span>
            </b>
            <small>Guard</small>
          </button>
          <button type="button" class="fb-hm" onClick={() => pickTab("geral")}>
            <b class="num" style={{ color: props.project.pendN ? "oklch(.80 .155 78)" : "#F4F6F2" }}>{props.project.pendN}</b>
            <small>Pendências</small>
          </button>
          <div class="fb-hm">
            <b class="num" style={{ "font-size": "15px" }}>
              US$ {spent()}
            </b>
            <div style={{ width: "76%", height: "4px", "border-radius": "999px", background: "rgba(244,246,242,.12)", overflow: "hidden", flex: "none" }}>
              <div style={{ height: "100%", width: `${costPct()}%`, background: "#1BC5BD" }} />
            </div>
            <small>de US$ {budget()}</small>
          </div>
        </div>
        <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "justify-content": "center" }}>
          <button type="button" class="btn sm onink-sec" disabled={props.project.status === "done"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={props.project.status === "paused" ? IC.play : IC.pause} />
            </svg>
            {props.project.status === "paused" ? "Retomar" : props.project.status === "done" ? "Entregue" : "Pausar"}
          </button>
        </div>
      </section>

      <div class="tabs" style={{ padding: "0 4px" }}>
        <For each={tabs()}>
          {(x) => (
            <button type="button" class={`tab ${tab() === x.id ? "on" : ""}`} onClick={() => pickTab(x.id)}>
              {x.label}
              <Show when={x.n > 0}>
                <span class={`badge ${x.cls}`} style={{ height: "18px", padding: "0 7px" }}>
                  {x.n}
                </span>
              </Show>
            </button>
          )}
        </For>
      </div>

      <Show when={tab() === "geral"}>
        <div style={{ display: "flex", gap: "18px", "align-items": "flex-start", "flex-wrap": "wrap", animation: "fade 200ms var(--ease) both" }}>
          <div style={{ flex: "2 1 480px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "18px" }}>
            <section class="card" style={{ padding: "20px", display: "flex", "flex-direction": "column", gap: "14px", "border-color": cs().bd }}>
              <div style={{ display: "flex", gap: "14px", "align-items": "center" }}>
                <span style={{ width: "46px", height: "46px", "border-radius": "13px", display: "grid", "place-items": "center", background: cs().ibg, color: cs().ifg, animation: cs().anim, flex: "none" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d={cs().icon} />
                  </svg>
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
                <button type="button" class="btn sm ghost" onClick={() => pickTab("esteira")}>
                  {cs().secLbl}
                </button>
                <button type="button" class="btn sm secondary" onClick={() => pickTab(isM() ? "qa" : "geral")}>
                  {cs().btn}
                </button>
              </div>
              <Show when={cs().blocked}>
                <div class="fb-warn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d={KIND_META.auth.icon} />
                  </svg>
                  <span>{cs().blockTxt}</span>
                </div>
              </Show>
              <div class="fb-exec">
                <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
                  <span style={{ width: "30px", height: "30px", "border-radius": "9px", display: "grid", "place-items": "center", background: "var(--flow-subtle)", color: "var(--flow)", flex: "none" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d={IC.run} />
                    </svg>
                  </span>
                  <div class="grow" style={{ "min-width": "200px" }}>
                    <div style={{ display: "flex", gap: "6px", "align-items": "center", "flex-wrap": "wrap" }}>
                      <span class="eyebrow" style={{ color: "var(--flow)", "font-size": "10px" }}>
                        Motor & execução
                      </span>
                      <span class="badge flow" style={{ height: "20px" }}>
                        {props.project.cap}
                      </span>
                      <span class="badge warn" style={{ height: "20px" }}>
                        no gate · pode adiantar critérios
                      </span>
                    </div>
                    <div class="mono muted" style={{ "font-size": "11px", "margin-top": "3px" }}>
                      0 tokens · US$ 0,00 nesta sessão
                    </div>
                  </div>
                  <button type="button" class="btn sm ghost" onClick={() => setThinkOpen(!thinkOpen())}>
                    {thinkOpen() ? "Ocultar pensamento" : "Ver pensamento"}
                  </button>
                  <button type="button" class="btn sm ghost" onClick={() => setCfgOpen(!cfgOpen())} aria-expanded={cfgOpen()}>
                    Motor
                  </button>
                  <button type="button" class="btn sm primary" disabled>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={IC.play} />
                    </svg>
                    Executar etapa no Cursor
                  </button>
                </div>
                <div class="muted" style={{ "font-size": "12px" }}>
                  O motor espera a sua autorização na pendência acima.
                </div>
                <Show when={cfgOpen()}>
                  <div class="fb-cfg">
                    <div class="fb-cfgr">
                      <span class="eyebrow">Motor · 4</span>
                      <div class="segs">
                        <button type="button" class="seg on" style={{ height: "28px", "font-size": "12px" }}>
                          Cursor
                        </button>
                        <button type="button" class="seg" style={{ height: "28px", "font-size": "12px", opacity: "0.55" }}>
                          Claude
                        </button>
                        <button type="button" class="seg" style={{ height: "28px", "font-size": "12px", opacity: "0.55" }}>
                          Codex
                        </button>
                        <button type="button" class="seg" style={{ height: "28px", "font-size": "12px", opacity: "0.55" }}>
                          Auto
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>
              </div>
            </section>

            <section class="card">
              <div class="card-h">
                <h3>Pendências</h3>
                <span class={`badge ${props.pends.length ? "warn" : "flow"}`}>{props.pends.length}</span>
              </div>
              <Show when={props.pends.length === 0}>
                <p class="muted" style={{ padding: "18px 20px", "font-size": "13px" }}>
                  Nenhuma pendência. A esteira segue sozinha até o próximo gate.
                </p>
              </Show>
              <div class="rows">
                <For each={props.pends}>
                  {(a) => (
                    <div class="row" style={{ cursor: "default", "align-items": "flex-start", gap: "14px", animation: "fade 220ms var(--ease) both" }}>
                      <span style={{ width: "36px", height: "36px", "border-radius": "10px", display: "grid", "place-items": "center", background: a.ibg, color: a.ifg, flex: "none" }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d={a.icon} />
                        </svg>
                      </span>
                      <div class="grow" style={{ "min-width": "0" }}>
                        <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
                          <span class={`badge ${a.kcls}`}>{KIND_META[a.kind].label}</span>
                          <b style={{ "font-size": "14px" }}>{a.t}</b>
                        </div>
                        <p class="sec" style={{ "font-size": "13px", "margin-top": "5px" }}>
                          {a.d}
                        </p>
                        <Show when={a.kind === "erro"}>
                          <div class="mono" style={{ "font-size": "11px", color: "var(--danger)", "margin-top": "4px" }}>
                            HTTP 409 FABRICA-COMPLETION-001
                          </div>
                        </Show>
                        <div class="m" style={{ "margin-top": "4px" }}>
                          {a.who} · {a.at}
                        </div>
                      </div>
                      <button type="button" class="btn sm secondary">
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
                <Show when={isM()}>
                  <button type="button" class="link" onClick={() => pickTab("esteira")}>
                    Livro-razão completo
                  </button>
                </Show>
              </div>
              <div style={{ padding: "8px 20px 14px" }}>
                <For each={isM() ? MERIDIAN_ACTS : MERIDIAN_ACTS.slice(0, 3)}>
                  {(e, i) => (
                    <div class="fb-tl">
                      <i style={{ background: i() === 0 ? "var(--flow)" : "var(--line-strong)" }} />
                      <div class="grow" style={{ "min-width": "0" }}>
                        <div style={{ "font-size": "13.5px", "font-weight": "600" }}>{e[1]}</div>
                        <div class="muted" style={{ "font-size": "12px", "margin-top": "1px" }}>
                          {e[2]} · {e[0]}
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
                <h3>Esteira · {props.project.n} etapas</h3>
                <div class="grow" />
                <button type="button" class="link" onClick={() => pickTab("esteira")}>
                  Abrir
                </button>
              </div>
              <div>
                <For each={vsteps()}>
                  {(v) => (
                    <button type="button" class="fb-vs" style={{ background: v.rowBg }} onClick={() => pickTab("esteira")}>
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
                <For each={MERIDIAN_INV}>
                  {(f) => (
                    <div style={{ background: "var(--surface-2)", padding: "14px 18px" }}>
                      <div class="eyebrow" style={{ "font-size": "9.5px" }}>
                        {f[0]}
                      </div>
                      <div class="num" style={{ "font-size": "18px", "margin-top": "4px" }}>
                        {f[1]}
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
                  {mesas().length} mesas
                </span>
              </div>
              <div class="rows">
                <For each={mesas()}>
                  {(m) => (
                    <div class="row" style={{ cursor: "default", padding: "10px 18px" }}>
                      <span class={`av ${m.busy ? "busy" : ""}`} style={{ width: "30px", height: "30px", "font-size": "10px" }}>
                        {m.ini}
                      </span>
                      <div class="grow" style={{ "min-width": "0" }}>
                        <div class="t" style={{ "font-size": "13px" }}>
                          {m.n}
                        </div>
                        <div class="m mono" style={{ "font-size": "10.5px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                          {m.skills.join(" · ")}
                        </div>
                      </div>
                      <span class="num muted" style={{ "font-size": "11px" }}>
                        {m.c} {m.c === 1 ? "etapa" : "etapas"}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </div>
        </div>
      </Show>

      <Show when={tab() !== "geral"}>
        <div class="card pad" style={{ "min-height": "280px" }}>
          <div class="eyebrow">Aba em fidelização</div>
          <h2 style={{ "margin-top": "8px", "font-size": "22px" }}>{tabs().find((t) => t.id === tab())?.label}</h2>
          <p class="sec" style={{ "margin-top": "8px" }}>
            Estrutura do shell e da Visão geral já seguem o HTML de referência. As demais abas entram na próxima passagem de captura.
          </p>
        </div>
      </Show>
    </div>
  );
}
