import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { api, type FactoryStageInstance } from "../../../../shared/api/client";

type AccessItem = {
  key: string;
  label: string;
  kind: string;
  status: string;
  hint?: string;
  masked: string;
  updated_at?: string;
};

const HEALTH = 2 * Math.PI * 28;
const COLORS = ["is-lime", "is-violet", "is-sky", "is-amber"];

function officeDate(iso?: string | null): number {
  if (!iso) return NaN;
  const raw = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return Date.parse(raw);
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter((part) => /[A-Za-zÀ-ÿ]/.test(part[0] || ""));
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  const raw = name.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return (raw.slice(0, 2) || "—").toUpperCase();
}

function whenLabel(iso?: string | null): string {
  const at = officeDate(iso);
  if (Number.isNaN(at)) return "ainda sem etapa concluída";
  const stamp = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(at);
  return `última etapa · ${stamp}`;
}

function updatedLabel(iso?: string): string {
  const at = officeDate(iso);
  if (Number.isNaN(at)) return "ainda sem atualização";
  return `atualizada ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(at)}`;
}

function statusWord(status: string): string {
  if (status === "active") return "Ativa";
  if (status === "expiring") return "A vencer";
  return "Ausente";
}

export function AccessPanel(props: { projectId: string; stages?: FactoryStageInstance[]; onToast: (msg: string) => void }) {
  const [items, setItems] = createSignal<AccessItem[]>([]);
  const [open, setOpen] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [key, setKey] = createSignal("");
  const [label, setLabel] = createSignal("");
  const [kind, setKind] = createSignal("secret");
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

  const health = createMemo(() => {
    const all = items();
    const active = all.filter((item) => item.status === "active").length;
    const total = all.length;
    return { active, total, pct: total ? Math.round((active / total) * 100) : 0 };
  });

  const people = createMemo(() => {
    const seen = new Map<string, { name: string; role: string; at?: string | null; level: string }>();
    for (const stage of props.stages || []) {
      const name = (stage.agent || "").trim();
      if (!name) continue;
      const at = stage.finished_at || stage.started_at;
      const previous = seen.get(name);
      const admin = /ceo/i.test(name) || /ceo/i.test(stage.agent_role || "");
      if (!previous || officeDate(at) >= officeDate(previous.at)) {
        seen.set(name, {
          name,
          role: admin ? "Aprovador de gates" : stage.agent_role || "Etapa da esteira",
          at,
          level: admin ? "Admin" : "Editor",
        });
      }
    }
    return [...seen.values()];
  });

  const openNew = () => {
    setEditing(false);
    setKey("");
    setLabel("");
    setKind("secret");
    setValue("");
    setOpen(true);
  };

  const openEdit = (item: AccessItem) => {
    setEditing(true);
    setKey(item.key);
    setLabel(item.label);
    setKind(item.kind || "secret");
    setValue("");
    setOpen(true);
  };

  const save = async () => {
    const name = key().trim();
    if (!name) {
      props.onToast("Informe a chave da credencial.");
      return;
    }
    try {
      await api.upsertFactoryAccess(props.projectId, {
        key: name,
        label: label().trim() || name,
        kind: kind(),
        status: value() || editing() ? "active" : "missing",
        value: value() || undefined,
      });
      setOpen(false);
      setValue("");
      props.onToast("Acesso salvo. O valor fica só na máscara.");
      await load();
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha ao salvar");
    }
  };

  const reveal = async (item: AccessItem) => {
    try {
      const res = await api.revealFactoryAccess(props.projectId, item.key);
      props.onToast(`${res.note} · ${res.masked}`);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Falha no reveal");
    }
  };

  const copyMask = async (item: AccessItem) => {
    try {
      await navigator.clipboard.writeText(item.masked);
      props.onToast("Máscara copiada.");
    } catch {
      props.onToast(item.masked);
    }
  };

  return (
    <div class="fc-ac2" data-screen-label="Acessos do projeto">
      <div class="fc-ac2-grid">
        <section class="fc-ac2-card">
          <div class="fc-ac2-head">
            <div class="fc-ac2-head-title">
              <span class="fc-ac2-head-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="8" cy="15" r="3.2" />
                  <path d="M10.5 13.2 20 4M15.5 6.2l2.4 2.4M18.2 4.8l2 2" />
                </svg>
              </span>
              <div>
                <h3>Credenciais & variáveis</h3>
                <p>Valores ficam mascarados. Somente admins podem revelar.</p>
              </div>
            </div>
            <button type="button" class="fc-ac2-add" onClick={openNew}>
              + Adicionar
            </button>
          </div>
          <Show
            when={items().length}
            fallback={<p class="fc-ac2-meta">Nenhuma credencial deste projeto ainda. Use Adicionar para registrar a máscara.</p>}
          >
            <ul class="fc-ac2-list">
              <For each={items()}>
                {(item) => (
                  <li class={`fc-ac2-item ${item.status === "missing" ? "is-missing" : item.status === "expiring" ? "is-expiring" : ""}`}>
                    <span class="fc-ac2-logo" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <div class="fc-ac2-body">
                      <div class="fc-ac2-row">
                        <strong>{item.key}</strong>
                        <span class={`fc-ac2-badge is-${item.status === "active" ? "active" : item.status === "expiring" ? "expiring" : "missing"}`}>
                          {statusWord(item.status)}
                        </span>
                        <span class="fc-ac2-env">{item.kind || "secret"}</span>
                      </div>
                      <span class="fc-ac2-value">{item.masked}</span>
                      <p class="fc-ac2-meta">
                        {item.hint || item.label} · {updatedLabel(item.updated_at)}
                      </p>
                    </div>
                    <div class="fc-ac2-actions">
                      <button type="button" class="fc-ac2-iconbtn" aria-label={`Revelar ${item.key}`} onClick={() => void reveal(item)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
                          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      </button>
                      <button type="button" class="fc-ac2-iconbtn" aria-label={`Copiar ${item.key}`} onClick={() => void copyMask(item)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="8" y="8" width="11" height="11" rx="2" />
                          <path d="M5 15V5h10" />
                        </svg>
                      </button>
                      <button type="button" class="fc-ac2-cta is-ghost" onClick={() => openEdit(item)}>
                        Editar
                      </button>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>

        <aside class="fc-ac2-side">
          <section class="fc-ac2-card">
            <div class="fc-ac2-health">
              <div class="fc-ac2-ring" aria-label={`${health().pct}%`}>
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle class="fc-ac2-ring-track" cx="40" cy="40" r="28" />
                  <circle
                    class={`fc-ac2-ring-value ${health().pct === 100 ? "is-ok" : health().total === 0 ? "is-empty" : ""}`}
                    cx="40"
                    cy="40"
                    r="28"
                    stroke-dasharray={`${HEALTH}`}
                    stroke-dashoffset={`${HEALTH * (1 - health().pct / 100)}`}
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div class="fc-ac2-ring-label">
                  <strong>{health().pct}%</strong>
                </div>
              </div>
              <div>
                <h3>Saúde dos acessos</h3>
                <p class="fc-ac2-health-stat">
                  <strong>
                    {health().active} de {health().total}
                  </strong>{" "}
                  credenciais ativas
                </p>
                <Show when={items().some((item) => item.status !== "active")}>
                  <p class="fc-ac2-health-warn">Há credencial ausente ou a vencer.</p>
                </Show>
              </div>
            </div>
          </section>

          <section class="fc-ac2-card">
            <div class="fc-ac2-people-head">
              <span class="fc-ac2-head-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.6 19" />
                  <circle cx="17" cy="9" r="2.2" />
                  <path d="M16.2 14.6c2.2.3 3.6 1.6 4.2 4.4" />
                </svg>
              </span>
              <h3>Pessoas com acesso</h3>
            </div>
            <Show when={people().length} fallback={<p class="fc-ac2-meta">As pessoas aparecem conforme as etapas da esteira.</p>}>
              <ul class="fc-ac2-people">
                <For each={people()}>
                  {(person, index) => (
                    <li>
                      <i class={COLORS[index() % COLORS.length]}>{initials(person.name)}</i>
                      <div class="fc-ac2-people-body">
                        <strong>{person.name}</strong>
                        <span>
                          {person.role} · {whenLabel(person.at)}
                        </span>
                      </div>
                      <em class={`fc-ac2-level ${person.level === "Admin" ? "is-admin" : "is-editor"}`}>{person.level}</em>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>
        </aside>
      </div>

      <Show when={open()}>
        <div class="fc-ac-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            class="fc-ac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fc-ac-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" class="fc-ac-modal-close" aria-label="Fechar" onClick={() => setOpen(false)}>
              ✕
            </button>
            <h2 id="fc-ac-modal-title">{editing() ? "Editar credencial" : "Nova credencial"}</h2>
            <p class="fc-ac-modal-lead">O valor não fica gravado em claro. A tela guarda só a máscara.</p>
            <form
              class="fc-ac-modal-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label class="fc-ac-modal-field">
                <span>Chave</span>
                <input value={key()} disabled={editing()} placeholder="DATABASE_URL" onInput={(event) => setKey(event.currentTarget.value)} />
              </label>
              <label class="fc-ac-modal-field">
                <span>Rótulo</span>
                <input value={label()} placeholder="Banco de dados" onInput={(event) => setLabel(event.currentTarget.value)} />
              </label>
              <label class="fc-ac-modal-field">
                <span>Tipo</span>
                <input value={kind()} placeholder="secret" onInput={(event) => setKind(event.currentTarget.value)} />
              </label>
              <label class="fc-ac-modal-field">
                <span>Valor</span>
                <input type="password" value={value()} placeholder="só gera a máscara" onInput={(event) => setValue(event.currentTarget.value)} />
              </label>
              <div class="fc-ac-modal-actions">
                <button type="button" class="fc-ac-modal-cancel" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" class="fc-ac-modal-save">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
