import { createResource, createSignal, For, Show } from "solid-js";
import { api, type Persona } from "../../shared/api/client";

export function PersonasView() {
  const [personas, { refetch }] = createResource(api.listPersonas);
  const [name, setName] = createSignal("");
  const [who, setWho] = createSignal("");
  const [pain, setPain] = createSignal("");
  const [value, setValue] = createSignal("");
  const [error, setError] = createSignal("");

  const create = async (event: Event) => {
    event.preventDefault();
    if (!name().trim()) {
      setError("Informe o nome da persona.");
      return;
    }
    setError("");
    await api.createPersona({
      name: name().trim(),
      demographics: who().trim(),
      pain_points: pain().trim(),
      goals: value().trim(),
    });
    setName("");
    setWho("");
    setPain("");
    setValue("");
    void refetch();
  };

  return (
    <div data-screen-label="Personas" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Personas</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Para quem a TAVIR fala, o que essa pessoa valoriza e o que dói.</p>
      <form onSubmit={(event) => void create(event)} style={{ display: "flex", "flex-direction": "column", gap: "8px", "max-width": "520px" }}>
        <input aria-label="Nome da persona" value={name()} onInput={(event) => setName(event.currentTarget.value)} placeholder="Dono de negócio local" />
        <input aria-label="Para quem" value={who()} onInput={(event) => setWho(event.currentTarget.value)} placeholder="loja, padaria, oficina" />
        <input aria-label="Dor" value={pain()} onInput={(event) => setPain(event.currentTarget.value)} placeholder="Perde cliente fora de hora" />
        <input aria-label="O que valoriza" value={value()} onInput={(event) => setValue(event.currentTarget.value)} placeholder="Resposta rápida e preço claro" />
        <button type="submit">Criar persona</button>
        <Show when={error()}>
          <p role="alert">{error()}</p>
        </Show>
      </form>
      <section aria-label="Lista de personas" style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={personas() || []}>
          {(persona: Persona) => (
            <article data-persona={persona.id} style={{ padding: "12px 16px", "border-radius": "12px", border: "1px solid var(--line, rgba(244,246,242,.14))", color: "var(--text-primary)" }}>
              <strong>{persona.name}</strong>
              <Show when={persona.demographics}>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{persona.demographics}</p>
              </Show>
              <Show when={persona.pain_points}>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{persona.pain_points}</p>
              </Show>
            </article>
          )}
        </For>
      </section>
    </div>
  );
}
