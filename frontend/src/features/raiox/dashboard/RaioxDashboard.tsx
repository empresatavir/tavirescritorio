import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Dialog } from "../../../shared/components/Dialog";
import {
  api,
  parseApiError,
  type RaioxCatalog,
  type RaioxCatalogItem,
  type RaioxCaseSummary,
} from "../../../shared/api/client";
import { showToast } from "../../../state/store";
import { ORIGINS, SEGMENTS, offerLabel, originLabel, stageLabel, statusLabel } from "../labels";
import "../raiox.css";

type Filter = "all" | "open" | "debrief";
type OriginFilter = "all" | "amigo" | "rua" | "formulario";

const MODE_ORDER = ["estudo_rapido", "diagnostico", "completo"];

const KIND_LABEL: Record<string, string> = {
  modo: "Leitura",
  entrega: "Oferta",
  recurso: "Varredura",
};

const CASH_LABEL: Record<string, string> = {
  vendavel_agora: "Cabe cobrar agora",
  vender_depois_da_devolutiva: "Depois da devolutiva",
  vendavel_com_escopo: "Ticket maior",
  dentro_da_leitura_completa: "Dentro da leitura completa",
  vender_se_a_prioridade_for_marca: "Se a prioridade for marca",
  vender_depois_do_atendimento: "Depois do atendimento",
  vender_com_base_medida: "Com funil medido",
  entrega_posterior: "Depois da oferta",
};

const SCAN_LINE =
  "Deep scan: site, Instagram, Google, opinião de cliente e concorrentes. Google Maps se for loja física.";

const WHEN_LABEL: Record<string, string> = {
  agora: "Neste ciclo",
  depois_da_primeira_receita: "Depois da primeira proposta paga",
  depois_da_base: "Fora da base de fim de ano",
};

export function RaioxDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = createSignal<RaioxCaseSummary[]>([]);
  const [catalog, setCatalog] = createSignal<RaioxCatalog | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [filter, setFilter] = createSignal<Filter>("all");
  const [originFilter, setOriginFilter] = createSignal<OriginFilter>("all");
  const [open, setOpen] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [product, setProduct] = createSignal("diagnostico");
  const [deepScan, setDeepScan] = createSignal(false);
  const [physical, setPhysical] = createSignal(false);
  const [origin, setOrigin] = createSignal("amigo");
  const [segment, setSegment] = createSignal("");
  const [publicLink, setPublicLink] = createSignal("");
  const [company, setCompany] = createSignal("");
  const [contact, setContact] = createSignal("");
  const [objective, setObjective] = createSignal("");
  const [decision, setDecision] = createSignal("");
  const [frontier, setFrontier] = createSignal("");

  const load = async () => {
    const [list, menu] = await Promise.all([api.listRaioxCases(), api.listRaioxCatalog()]);
    setCases(list);
    setCatalog(menu);
  };

  onMount(async () => {
    try {
      await load();
    } catch (err) {
      showToast(parseApiError(err).detail, "Raio-X", "error");
    } finally {
      setLoading(false);
    }
  });

  const modes = createMemo(() => {
    const items = catalog()?.items || [];
    return MODE_ORDER.map((id) => items.find((item) => item.id === id)).filter(
      (item): item is RaioxCatalogItem => Boolean(item),
    );
  });

  const ladder = createMemo(() =>
    [...(catalog()?.items || [])].sort((a, b) => a.cash_rank - b.cash_rank),
  );

  const kpis = createMemo(() => {
    const list = cases();
    return {
      open: list.filter((item) => item.status !== "fechado").length,
      collecting: list.filter((item) => item.status === "coleta" || item.status === "mapa").length,
      priority: list.filter((item) => item.status === "prioridade" || item.bottleneck).length,
      debrief: list.filter((item) => item.debrief_decision).length,
    };
  });

  const visible = createMemo(() => {
    let list = cases();
    if (originFilter() !== "all") list = list.filter((item) => item.origin === originFilter());
    if (filter() === "open") return list.filter((item) => item.status !== "fechado");
    if (filter() === "debrief") return list.filter((item) => Boolean(item.debrief_decision));
    return list;
  });

  const start = (item: RaioxCatalogItem) => {
    setProduct(item.id);
    setDeepScan(false);
    setPhysical(false);
    setOrigin("amigo");
    setSegment("");
    setPublicLink("");
    setCompany("");
    setContact("");
    setObjective(item.defaults.objective || "");
    setDecision(item.defaults.decision_needed || "");
    setFrontier(item.defaults.frontier || "");
    setOpen(true);
  };

  const toggleScan = (checked: boolean) => {
    setDeepScan(checked);
    if (checked && !frontier().includes("Deep scan")) {
      const base = frontier().trim();
      setFrontier(base ? `${base} ${SCAN_LINE}` : SCAN_LINE);
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      const created = await api.createRaioxCase({
        company_name: company(),
        contact_name: contact(),
        objective: objective(),
        decision_needed: decision(),
        frontier: frontier(),
        product_id: product(),
        deep_scan: product() === "completo" && deepScan(),
        physical_store: physical(),
        origin: origin(),
        segment: segment(),
        public_link: publicLink(),
        package_id: "basico",
      });
      setOpen(false);
      navigate(`/raiox/${created.id}`);
    } catch (err) {
      showToast(parseApiError(err).detail, "Raio-X", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="rx-dash" data-screen-label="Raio-X">
      <div class="rx-inner">
        <header class="rx-header">
          <div>
            <p class="rx-eyebrow">Produto · diagnóstico</p>
            <h1 class="rx-title">Raio-X</h1>
            <p class="rx-lead">
              Escolha a leitura. O estudo rápido abre a porta. O diagnóstico cobra a prioridade.
              A leitura completa pauta venda, posição e marca. A construção fica na oferta seguinte.
            </p>
          </div>
        </header>

        <Show when={catalog()}>
          {(menu) => (
            <p class="rx-infra">
              Publicado em {menu().infra.public_url}. {menu().infra.database}
            </p>
          )}
        </Show>

        <section class="rx-modes" aria-label="Escolher a leitura">
          <For each={modes()}>
            {(item) => (
              <button type="button" class="rx-mode" onClick={() => start(item)}>
                <span>{item.cash_rank === 1 ? "Básico" : item.id === "completo" ? "Completo" : "Pago"}</span>
                <strong>{item.name}</strong>
                <p>{item.promise}</p>
              </button>
            )}
          </For>
        </section>

        <section class="rx-kpis" aria-label="Indicadores do Raio-X">
          <div class="rx-kpi">
            <span>Abertos</span>
            <strong>{kpis().open}</strong>
          </div>
          <div class="rx-kpi">
            <span>Em leitura</span>
            <strong>{kpis().collecting}</strong>
          </div>
          <div class="rx-kpi">
            <span>Com prioridade</span>
            <strong>{kpis().priority}</strong>
          </div>
          <div class="rx-kpi">
            <span>Devolutivas</span>
            <strong>{kpis().debrief}</strong>
          </div>
        </section>

        <div class="rx-filters" role="tablist" aria-label="Filtrar por origem">
          <button type="button" class="rx-chip" data-on={originFilter() === "all"} onClick={() => setOriginFilter("all")}>
            Todas as origens
          </button>
          <For each={ORIGINS}>
            {(item) => (
              <button
                type="button"
                class="rx-chip"
                data-on={originFilter() === item.id}
                onClick={() => setOriginFilter(item.id)}
              >
                {item.label}
              </button>
            )}
          </For>
        </div>

        <div class="rx-filters" role="tablist" aria-label="Filtrar diagnósticos">
          <button type="button" class="rx-chip" data-on={filter() === "all"} onClick={() => setFilter("all")}>
            Todos
          </button>
          <button type="button" class="rx-chip" data-on={filter() === "open"} onClick={() => setFilter("open")}>
            Abertos
          </button>
          <button type="button" class="rx-chip" data-on={filter() === "debrief"} onClick={() => setFilter("debrief")}>
            Com devolutiva
          </button>
        </div>

        <Show
          when={!loading() && visible().length > 0}
          fallback={
            <p class="rx-empty">
              {loading()
                ? "Carregando diagnósticos…"
                : "Nenhum diagnóstico nesta vista. Abra um estudo rápido, um diagnóstico ou a leitura completa."}
            </p>
          }
        >
          <div class="rx-list">
            <For each={visible()}>
              {(item) => (
                <button type="button" class="rx-card" onClick={() => navigate(`/raiox/${item.id}`)}>
                  <div>
                    <h3>{item.company_name}</h3>
                    <p>{item.bottleneck || item.objective}</p>
                  </div>
                  <div class="rx-meta">
                    <span class="rx-pill">{originLabel(item.origin)}</span>
                    <Show when={item.segment}>
                      <span class="rx-pill">{item.segment}</span>
                    </Show>
                    <span class="rx-pill">{item.product_name}</span>
                    <Show when={item.deep_scan}>
                      <span class="rx-pill">Deep scan</span>
                    </Show>
                    <span class="rx-pill">{statusLabel(item.status)}</span>
                    <span class="rx-pill">{item.evidence_count} evidências</span>
                    <Show when={item.priority_stage}>
                      <span class="rx-pill">{stageLabel(item.priority_stage)}</span>
                    </Show>
                    <Show when={item.next_offer}>
                      <span class="rx-pill">{offerLabel(item.next_offer)}</span>
                    </Show>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>

        <Show when={catalog()?.ciclo}>
          {(ciclo) => (
            <section class="rx-cycle" aria-label="Base até o fim do ano">
              <h2>Base até o fim do ano</h2>
              <p class="rx-note">{ciclo().janela} {ciclo().foco}</p>
              <ol>
                <For each={ciclo().escritorio}>
                  {(step) => (
                    <li>
                      <strong>{step.titulo}.</strong> {step.entrega}
                    </li>
                  )}
                </For>
              </ol>
              <h3>O que o celular leva</h3>
              <p class="rx-note">{ciclo().mobile.estado}</p>
              <ul>
                <For each={ciclo().mobile.leva}>{(line) => <li>{line}</li>}</For>
              </ul>
              <h3>O que fica no PC</h3>
              <ul>
                <For each={ciclo().mobile.fica_no_pc}>{(line) => <li>{line}</li>}</For>
              </ul>
            </section>
          )}
        </Show>

        <section class="rx-ladder" aria-label="Fila de caixa">
          <h2>Fila de caixa</h2>
          <p class="rx-note">
            Nada saiu da lista. O número é a ordem em que isso faz caixa para a TAVIR agora.
            Abra o item para ver o que temos, o que precisa e como chegar.
          </p>
          <For each={ladder()}>
            {(item) => (
              <details class="rx-rank">
                <summary>
                  <strong>{item.cash_rank}</strong>
                  <div>
                    <h3>
                      {item.name}
                      <span>{KIND_LABEL[item.kind] || item.kind}</span>
                    </h3>
                    <p>{item.cash_why}</p>
                  </div>
                  <div class="rx-rank-side">
                    <span class="rx-pill">{WHEN_LABEL[item.plano?.quando || ""] || CASH_LABEL[item.status] || item.status}</span>
                    <Show when={item.kind === "modo"}>
                      <button
                        type="button"
                        class="rx-btn"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          start(item);
                        }}
                      >
                        Abrir
                      </button>
                    </Show>
                  </div>
                </summary>
                <Show when={item.plano}>
                  {(plano) => (
                    <div class="rx-plan">
                      <div>
                        <h4>Objetivo</h4>
                        <p>{plano().objetivo}</p>
                      </div>
                      <div>
                        <h4>Estrutura</h4>
                        <p>{plano().estrutura}</p>
                      </div>
                      <div>
                        <h4>O que temos</h4>
                        <ul>
                          <For each={plano().temos}>{(line) => <li>{line}</li>}</For>
                        </ul>
                      </div>
                      <div>
                        <h4>O que precisa</h4>
                        <ul>
                          <For each={plano().precisa}>{(line) => <li>{line}</li>}</For>
                        </ul>
                      </div>
                      <div>
                        <h4>Ferramentas</h4>
                        <ul>
                          <For each={plano().ferramentas}>{(line) => <li>{line}</li>}</For>
                        </ul>
                      </div>
                      <div>
                        <h4>Investimento</h4>
                        <p>{plano().investimento}</p>
                      </div>
                      <div>
                        <h4>O que criar</h4>
                        <ul>
                          <For each={plano().criar}>{(line) => <li>{line}</li>}</For>
                        </ul>
                      </div>
                      <div>
                        <h4>No celular</h4>
                        <p>{plano().mobile}</p>
                      </div>
                    </div>
                  )}
                </Show>
              </details>
            )}
          </For>
          <Show when={catalog()}>
            {(menu) => (
              <ul class="rx-improve">
                <For each={menu().infra.improvements}>{(line) => <li>{line}</li>}</For>
              </ul>
            )}
          </Show>
        </section>
      </div>

      <Dialog
        open={open()}
        title={modes().find((item) => item.id === product())?.name || "Nova leitura"}
        onClose={() => setOpen(false)}
        width={560}
      >
        <form
          class="rx-form"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <div class="rx-grid-2">
            <label>
              Origem
              <select value={origin()} onChange={(event) => setOrigin(event.currentTarget.value)}>
                <For each={ORIGINS}>{(item) => <option value={item.id}>{item.label}</option>}</For>
              </select>
            </label>
            <label>
              Segmento
              <input
                value={segment()}
                list="rx-segments"
                onInput={(event) => setSegment(event.currentTarget.value)}
              />
              <datalist id="rx-segments">
                <For each={SEGMENTS}>{(item) => <option value={item} />}</For>
              </datalist>
            </label>
          </div>
          <label>
            Link público
            <input
              value={publicLink()}
              placeholder="Instagram ou Google"
              onInput={(event) => setPublicLink(event.currentTarget.value)}
            />
          </label>
          <label>
            Empresa
            <input value={company()} onInput={(event) => setCompany(event.currentTarget.value)} required />
          </label>
          <label>
            Contato
            <input value={contact()} onInput={(event) => setContact(event.currentTarget.value)} />
          </label>
          <label>
            Objetivo comercial
            <textarea
              value={objective()}
              onInput={(event) => setObjective(event.currentTarget.value)}
              required
            />
          </label>
          <label>
            Decisão que a leitura precisa permitir
            <textarea
              value={decision()}
              onInput={(event) => setDecision(event.currentTarget.value)}
              required
            />
          </label>
          <label>
            Fronteira da coleta
            <textarea
              value={frontier()}
              onInput={(event) => setFrontier(event.currentTarget.value)}
            />
          </label>
          <label class="rx-check">
            <input
              type="checkbox"
              checked={physical()}
              onChange={(event) => setPhysical(event.currentTarget.checked)}
            />
            Loja física
          </label>
          <Show when={product() === "completo"}>
            <label class="rx-check">
              <input
                type="checkbox"
                checked={deepScan()}
                onChange={(event) => toggleScan(event.currentTarget.checked)}
              />
              Deep scan: canais, opinião, Google, Maps e concorrentes
            </label>
          </Show>
          <div class="rx-form-actions">
            <button type="button" class="rx-btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" class="rx-btn" disabled={saving()}>
              Abrir caso
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
