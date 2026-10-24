import { For, Show, createEffect, createSignal } from "solid-js";
import { api } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function AccessPanel(props: { projectId: string; onToast: (msg: string) => void }) {
  const [items, setItems] = createSignal<
    Array<{
      key: string;
      label: string;
      kind: string;
      status: string;
      hint?: string;
      masked: string;
    }>
  >([]);
  const [key, setKey] = createSignal("API_KEY");
  const [label, setLabel] = createSignal("API Key");
  const [value, setValue] = createSignal("");

  const load = async () => {
    try {
      const res = await api.getFactoryAccess(props.projectId);
      setItems(res.items || []);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha ao carregar acessos");
    }
  };

  createEffect(() => {
    void props.projectId;
    void load();
  });

  const save = async () => {
    try {
      await api.upsertFactoryAccess(props.projectId, {
        key: key(),
        label: label(),
        value: value() || undefined,
        status: value() ? "active" : "missing",
      });
      setValue("");
      props.onToast("Acesso salvo (somente máscara).");
      await load();
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha ao salvar");
    }
  };

  const reveal = async (k: string) => {
    try {
      const res = await api.revealFactoryAccess(props.projectId, k);
      props.onToast(`${res.note} · ${res.masked}`);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha no reveal");
    }
  };

  return (
    <div class="fc-sec">
      <Show
        when={items().length}
        fallback={
          <EmptyState
            title="Sem credenciais registradas"
            text="Cadastre metadados abaixo. Valores não são persistidos em claro."
          />
        }
      >
        <For each={items()}>
          {(it) => (
            <article class="fc-card" style={{ "margin-bottom": "10px" }}>
              <strong>{it.label}</strong>
              <p class="fc-mono">
                {it.key} · {it.status} · {it.masked}
              </p>
              <button type="button" class="fc-btn-sec" onClick={() => void reveal(it.key)}>
                Reveal (auditado)
              </button>
            </article>
          )}
        </For>
      </Show>

      <section class="fc-card" style={{ "margin-top": "12px" }}>
        <h2 style={{ "font-size": "13px" }}>Novo / atualizar acesso</h2>
        <input
          class="fc-kb-filter"
          style={{ width: "100%", "margin": "6px 0" }}
          value={key()}
          onInput={(e) => setKey(e.currentTarget.value)}
          placeholder="key"
        />
        <input
          class="fc-kb-filter"
          style={{ width: "100%", "margin": "6px 0" }}
          value={label()}
          onInput={(e) => setLabel(e.currentTarget.value)}
          placeholder="label"
        />
        <input
          class="fc-kb-filter"
          style={{ width: "100%", "margin": "6px 0" }}
          type="password"
          value={value()}
          onInput={(e) => setValue(e.currentTarget.value)}
          placeholder="valor (só gera máscara)"
        />
        <button type="button" class="fc-btn" onClick={() => void save()}>
          Salvar metadado
        </button>
      </section>
    </div>
  );
}
