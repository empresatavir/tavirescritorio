import { For, Show, createEffect, createSignal } from "solid-js";
import { api } from "../../../../shared/api/client";

function ReportProse(props: { text: string }) {
  const blocks = () => props.text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div class="fc-report-prose">
      <For each={blocks()}>
        {(block) => {
          if (block.startsWith("# ")) return <h3>{block.replace(/^#\s+/, "")}</h3>;
          if (block.startsWith("## ")) return <h4>{block.replace(/^##\s+/, "")}</h4>;
          const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
          const marker = /^\s*(?:[-*]|\d+\.)\s+/;
          if (lines.length > 1 && lines.every((line) => marker.test(line))) {
            return (
              <ul>
                <For each={lines}>{(line) => <li>{line.replace(marker, "")}</li>}</For>
              </ul>
            );
          }
          return <p>{block}</p>;
        }}
      </For>
    </div>
  );
}

export function StageReport(props: {
  projectId: string;
  stageTitle?: string;
  stageId?: string;
  fresh?: boolean;
  paths?: string[];
  onGenerate?: () => Promise<unknown>;
}) {
  const [docs, setDocs] = createSignal<Array<{ path: string; content: string }>>([]);
  const [missing, setMissing] = createSignal<string[]>([]);
  const [active, setActive] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [open, setOpen] = createSignal(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const listed = await api.listFactoryArtifacts(props.projectId);
      const wanted = (props.paths || []).filter((path) => path && !path.endsWith("/"));
      const present = new Set((listed.files || []).filter((f) => f.is_text).map((f) => f.path));
      let paths = wanted.filter((path) => present.has(path));
      if (!paths.length) {
        paths = [...present].filter((path) => path.startsWith("qa/issues/") || path === "qa/report.md").slice(0, 6);
      }
      setMissing(wanted.filter((path) => !present.has(path)));
      const loaded: Array<{ path: string; content: string }> = [];
      for (const path of paths) {
        const file = await api.readFactoryArtifact(props.projectId, path);
        loaded.push({ path, content: file.content || "(sem texto)" });
      }
      setDocs(loaded);
      setActive((current) => (loaded.some((doc) => doc.path === current) ? current : loaded[0]?.path || ""));
    } catch (err) {
      setDocs([]);
      setMissing([]);
      setError(err instanceof Error ? err.message : "Não foi possível abrir o relatório.");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    void props.stageId;
    setOpen(false);
  });

  createEffect(() => {
    void props.projectId;
    void props.fresh;
    void props.stageId;
    void (props.paths || []).join("|");
    void load();
  });

  const current = () => docs().find((doc) => doc.path === active()) || docs()[0];
  const citedStage = () => {
    const match = (current()?.content || "").match(/durante a etapa `([^`]+)`/);
    return match?.[1] || "";
  };
  const stale = () =>
    /executor local \(B7\)|Conteúdo inicial materializado|Contexto atual/.test(current()?.content || "");
  const previous = () => {
    if (props.fresh || !current() || missing().length) return "";
    const cited = citedStage();
    if (cited && props.stageId && cited !== props.stageId) {
      return `Este arquivo é da etapa ${cited}. A etapa atual ainda não entregou um relatório novo.`;
    }
    return "Esta etapa ainda não registrou a entrega. O texto abaixo pode ser de uma tentativa anterior.";
  };

  return (
    <section class="fc-report" aria-label="Relatório do agente">
      <header class="fc-report-head">
        <button
          type="button"
          class="fc-report-toggle"
          aria-expanded={open()}
          onClick={() => setOpen((value) => !value)}
        >
          <span>
            <p class="fc-micro">Relatório</p>
            <h3>{props.stageTitle || "Entrega do agente"}</h3>
          </span>
          <span>{open() ? "Ocultar mensagem" : "Exibir mensagem"}</span>
        </button>
        <Show when={open()}>
          <button type="button" class="fc-btn-sec" onClick={() => void load()}>
            Atualizar leitura
          </button>
        </Show>
      </header>
      <Show when={open()}>
      <Show when={error()}>
        <p class="fc-report-error">{error()}</p>
      </Show>
      <Show when={missing().length && docs().length}>
        <p class="fc-report-warn">
          Esta etapa ainda não gravou {missing().join(", ")}. O texto abaixo é o que já existe no workspace.
        </p>
      </Show>
      <Show when={previous()}>
        <p class="fc-report-warn">{previous()}</p>
      </Show>
      <Show when={stale()}>
        <p class="fc-report-warn">
          Este texto é um rascunho local. A IA não escreveu este relatório. Peça a entrega de novo no gate desta etapa.
        </p>
      </Show>
      <Show
        when={!loading() && docs().length}
        fallback={
          <p class="fc-report-empty">
            {loading() ? "Abrindo o relatório…" : "O agente ainda não entregou um documento para leitura."}
          </p>
        }
      >
        <div class="fc-report-tabs">
          <For each={docs()}>
            {(doc) => (
              <button
                type="button"
                class="fc-report-tab"
                classList={{ "is-on": current()?.path === doc.path }}
                onClick={() => setActive(doc.path)}
              >
                {doc.path}
              </button>
            )}
          </For>
        </div>
        <article class="fc-report-body">
          <ReportProse text={current()?.content || ""} />
        </article>
      </Show>
      <Show when={props.onGenerate}>
        <button type="button" class="fc-btn-sec" onClick={() => void props.onGenerate?.()}>
          Gerar relatório do agente
        </button>
      </Show>
      </Show>
    </section>
  );
}
