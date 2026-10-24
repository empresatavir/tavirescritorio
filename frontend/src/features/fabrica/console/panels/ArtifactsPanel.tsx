import { For, Show, createEffect, createSignal } from "solid-js";
import { api } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function ArtifactsPanel(props: {
  projectId: string;
  onToast: (msg: string) => void;
  mode?: "docs" | "files";
}) {
  const [files, setFiles] = createSignal<
    Array<{
      path: string;
      name: string;
      size: number;
      mime: string;
      is_text: boolean;
      sha256?: string | null;
    }>
  >([]);
  const [expected, setExpected] = createSignal<Array<{ path: string; present: boolean }>>([]);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [content, setContent] = createSignal("");
  const [meta, setMeta] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [draftPath, setDraftPath] = createSignal("notes.md");
  const [draftBody, setDraftBody] = createSignal("# Novo artefato\n\n");

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listFactoryArtifacts(props.projectId);
      setFiles(res.files || []);
      setExpected(res.expected || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar artefatos");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    void props.projectId;
    void reload();
  });

  const openFile = async (path: string) => {
    setSelected(path);
    try {
      const res = await api.readFactoryArtifact(props.projectId, path);
      setContent(res.content ?? "(binário — conteúdo não exibido)");
      setMeta(`${res.path} · ${res.size} B · ${res.sha256.slice(0, 12)}…`);
    } catch (err) {
      setContent("");
      setMeta("");
      props.onToast(err instanceof Error ? err.message : "Falha ao ler arquivo");
    }
  };

  const saveDraft = async () => {
    try {
      const res = await api.writeFactoryArtifact(props.projectId, {
        path: draftPath(),
        content: draftBody(),
        overwrite: true,
      });
      props.onToast(`Gravado · ${res.file.path} · ${res.file.sha256.slice(0, 12)}`);
      await reload();
      await openFile(res.file.path);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha ao gravar");
    }
  };

  const textFiles = () => files().filter((f) => f.is_text);
  const list = () => (props.mode === "files" ? files() : textFiles());

  return (
    <div class="fc-artifacts">
      <Show when={error()}>
        <p class="fc-ov-block-note" style={{ color: "var(--danger, #c44)" }}>
          {error()}
        </p>
      </Show>

      <Show when={expected().length}>
        <div class="fc-card" style={{ "margin-bottom": "12px" }}>
          <h2 style={{ "font-size": "13px", margin: "0 0 8px" }}>Esperados na etapa atual</h2>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            <For each={expected()}>
              {(e) => (
                <li style={{ "font-size": "12px", color: e.present ? "var(--success, #6c6)" : "var(--text-secondary)" }}>
                  {e.path} · {e.present ? "presente" : "ausente"}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <div class="fc-split">
        <div class="fc-inner" style={{ padding: "8px" }}>
          <Show
            when={!loading() && list().length}
            fallback={
              <EmptyState
                title={loading() ? "Carregando…" : "Nenhum arquivo"}
                text="Arquivos do workspace aparecem aqui após gravação ou execução."
              />
            }
          >
            <For each={list()}>
              {(f) => (
                <button
                  type="button"
                  class="fc-doc-btn"
                  aria-current={selected() === f.path ? "true" : undefined}
                  onClick={() => void openFile(f.path)}
                >
                  <span class="fc-artifact-type">{f.is_text ? "TXT" : "BIN"}</span>
                  <span>
                    <strong style={{ "font-size": "11px" }}>{f.path}</strong>
                    <span class="fc-mono" style={{ display: "block", "margin-top": "4px" }}>
                      {f.size} B
                      {f.sha256 ? ` · ${f.sha256.slice(0, 8)}` : ""}
                    </span>
                  </span>
                </button>
              )}
            </For>
          </Show>
        </div>
        <div class="fc-inner">
          <div class="fc-panel-head">
            <span class="fc-mono">{meta() || "Selecione um arquivo"}</span>
            <button type="button" class="fc-btn-sec" onClick={() => void reload()}>
              Atualizar
            </button>
          </div>
          <Show when={selected()} fallback={<EmptyState title="Nenhum arquivo aberto" />}>
            <article class="fc-paper" style={{ "white-space": "pre-wrap" }}>
              {content()}
            </article>
          </Show>
        </div>
      </div>

      <Show when={props.mode !== "files"}>
        <section class="fc-card" style={{ "margin-top": "16px" }}>
          <h2 style={{ "font-size": "13px", margin: "0 0 8px" }}>Gravar artefato</h2>
          <input
            class="fc-kb-filter"
            style={{ width: "100%", "margin-bottom": "8px" }}
            value={draftPath()}
            onInput={(e) => setDraftPath(e.currentTarget.value)}
            placeholder="caminho relativo · ex: docs/runbook.md"
          />
          <textarea
            style={{
              width: "100%",
              "min-height": "120px",
              "font-family": "ui-monospace, monospace",
              "font-size": "12px",
              padding: "8px",
              "border-radius": "8px",
              border: "1px solid var(--line)",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
            }}
            value={draftBody()}
            onInput={(e) => setDraftBody(e.currentTarget.value)}
          />
          <div style={{ "margin-top": "8px" }}>
            <button type="button" class="fc-btn" onClick={() => void saveDraft()}>
              Salvar no workspace
            </button>
          </div>
        </section>
      </Show>
    </div>
  );
}
