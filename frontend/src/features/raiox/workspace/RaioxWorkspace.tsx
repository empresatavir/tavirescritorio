import { For, Show, createEffect, createSignal } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import {
  api,
  parseApiError,
  type RaioxCaseDetail,
  type RaioxMethod,
  type Proposal,
} from "../../../shared/api/client";
import { showToast } from "../../../state/store";
import {
  CLASSIFICATIONS,
  CONFIDENCE,
  JOURNEY,
  OFFERS,
  SCAN_FRONTS,
  classLabel,
  decisionLabel,
  frontLabel,
  ORIGINS,
  SEGMENTS,
  offerLabel,
  originLabel,
  stageLabel,
  statusLabel,
} from "../labels";
import "../raiox.css";

type View = "fronteira" | "evidencias" | "jornada" | "prioridade" | "devolutiva";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "fronteira", label: "Fronteira" },
  { id: "evidencias", label: "Evidências" },
  { id: "jornada", label: "Jornada" },
  { id: "prioridade", label: "Prioridade" },
  { id: "devolutiva", label: "Devolutiva" },
];

export function RaioxWorkspace() {
  const params = useParams();
  const navigate = useNavigate();
  const [item, setItem] = createSignal<RaioxCaseDetail | null>(null);
  const [view, setView] = createSignal<View>("fronteira");
  const [saving, setSaving] = createSignal(false);
  const [company, setCompany] = createSignal("");
  const [contact, setContact] = createSignal("");
  const [objective, setObjective] = createSignal("");
  const [decisionNeeded, setDecisionNeeded] = createSignal("");
  const [frontier, setFrontier] = createSignal("");
  const [origin, setOrigin] = createSignal("amigo");
  const [segment, setSegment] = createSignal("");
  const [publicLink, setPublicLink] = createSignal("");
  const [stage, setStage] = createSignal("encontrar");
  const [front, setFront] = createSignal("site");
  const [method, setMethod] = createSignal<RaioxMethod | null>(null);
  const [source, setSource] = createSignal("");
  const [claim, setClaim] = createSignal("");
  const [classification, setClassification] = createSignal("observado");
  const [note, setNote] = createSignal("");
  const [priorityStage, setPriorityStage] = createSignal("atender");
  const [bottleneck, setBottleneck] = createSignal("");
  const [rationale, setRationale] = createSignal("");
  const [discarded, setDiscarded] = createSignal("");
  const [confidence, setConfidence] = createSignal("media");
  const [debrief, setDebrief] = createSignal("proposta_emitida");
  const [reason, setReason] = createSignal("");
  const [offer, setOffer] = createSignal("atendimento");
  const [plan30, setPlan30] = createSignal("");
  const [plan60, setPlan60] = createSignal("");
  const [plan90, setPlan90] = createSignal("");
  const [offerName, setOfferName] = createSignal("");
  const [offerError, setOfferError] = createSignal("");
  const [linked, setLinked] = createSignal<Proposal[]>([]);

  const loadLinked = (caseId: string) => {
    void api.listProposals({ raiox_case_id: caseId }).then(setLinked).catch(() => setLinked([]));
  };

  const apply = (next: RaioxCaseDetail) => {
    if (item()?.id !== next.id) setMethod(null);
    setItem(next);
    setCompany(next.company_name);
    setContact(next.contact_name || "");
    setObjective(next.objective);
    setDecisionNeeded(next.decision_needed);
    setFrontier(next.frontier || "");
    setOrigin(next.origin || "amigo");
    setSegment(next.segment || "");
    setPublicLink(next.public_link || "");
    setPriorityStage(next.priority_stage || "atender");
    setBottleneck(next.bottleneck || "");
    setRationale(next.priority_rationale || "");
    setDiscarded(next.discarded || "");
    setConfidence(next.confidence || "media");
    setDebrief(next.debrief_decision || "proposta_emitida");
    setReason(next.debrief_reason || "");
    setOffer(next.next_offer && next.next_offer !== "nenhuma" ? next.next_offer : "atendimento");
    setPlan30(next.plan_30 || "");
    setPlan60(next.plan_60 || "");
    setPlan90(next.plan_90 || "");
  };

  createEffect(() => {
    const id = params.caseId;
    if (!id) return;
    setItem(null);
    api
      .getRaioxCase(id)
      .then((next) => {
        apply(next);
        loadLinked(next.id);
      })
      .catch((err) => showToast(parseApiError(err).detail, "Raio-X", "error"));
  });

  const run = async (work: () => Promise<RaioxCaseDetail>) => {
    setSaving(true);
    try {
      apply(await work());
    } catch (err) {
      showToast(parseApiError(err).detail, "Raio-X", "error");
    } finally {
      setSaving(false);
    }
  };

  const current = () => item();

  const generateProposal = async () => {
    const row = item();
    if (!row) return;
    const created = await api.createProposal({
      client: row.company_name,
      summary: row.objective,
      raiox_case_id: row.id,
    });
    setLinked((list) => [created, ...list.filter((item) => item.id !== created.id)]);
  };

  const registerOffer = async () => {
    const row = item();
    const name = offerName().trim();
    if (!row || !name) {
      setOfferError("Informe o nome da oferta.");
      return;
    }
    const created = await api.createProposal({
      client: row.company_name,
      summary: name,
      scope: name,
      raiox_case_id: row.id,
    });
    setOfferError("");
    setOfferName("");
    setLinked((list) => [created, ...list.filter((item) => item.id !== created.id)]);
  };

  return (
    <div class="rx-dash" data-screen-label="Raio-X diagnóstico">
      <div class="rx-inner">
        <Show
          when={current()}
          fallback={<p class="rx-empty">Carregando diagnóstico…</p>}
        >
          {(data) => (
            <>
              <header class="rx-header">
                <div>
                  <button type="button" class="rx-back" onClick={() => navigate("/raiox")}>
                    ← Diagnósticos
                  </button>
                  <h1 class="rx-title">{data().company_name}</h1>
                  <p class="rx-lead">{data().objective}</p>
                </div>
                <div class="rx-meta">
                  <span class="rx-pill">{originLabel(data().origin)}</span>
                  <Show when={data().segment}>
                    <span class="rx-pill">{data().segment}</span>
                  </Show>
                  <span class="rx-pill">{data().product_name}</span>
                  <Show when={data().deep_scan}>
                    <span class="rx-pill">Deep scan</span>
                  </Show>
                  <Show when={data().physical_store}>
                    <span class="rx-pill">Loja física</span>
                  </Show>
                  <span class="rx-pill">{statusLabel(data().status)}</span>
                  <span class="rx-pill">{decisionLabel(data().debrief_decision)}</span>
                </div>
              </header>

              <section class="rx-panel" aria-label="Propostas do caso">
                <h2>Proposta do caso</h2>
                <div class="rx-form-actions">
                  <button type="button" class="rx-btn" onClick={() => void generateProposal()}>
                    Gerar proposta
                  </button>
                  <input
                    aria-label="Nome da oferta"
                    value={offerName()}
                    onInput={(event) => setOfferName(event.currentTarget.value)}
                  />
                  <button type="button" class="rx-btn" onClick={() => void registerOffer()}>
                    Registrar oferta
                  </button>
                </div>
                <Show when={offerError()}>
                  <p role="alert">{offerError()}</p>
                </Show>
                <For each={linked()}>
                  {(row) => (
                    <p data-proposal={row.id} style={{ margin: "8px 0", color: "var(--text-primary)" }}>
                      {row.num} · {row.summary}
                    </p>
                  )}
                </For>
              </section>

              <Show when={data().method_pages.length > 0}>
                <section class="rx-panel rx-method">
                  <h2>Método desta leitura</h2>
                  <p class="rx-note">
                    Páginas compiladas das ingestões. O texto integral dos livros não entra no caso.
                  </p>
                  <div class="rx-choice">
                    <For each={data().method_pages}>
                      {(page) => (
                        <button
                          type="button"
                          data-on={method()?.path === page.path}
                          onClick={() => {
                            void api
                              .getRaioxMethod(page.path)
                              .then(setMethod)
                              .catch((err) => showToast(parseApiError(err).detail, "Raio-X", "error"));
                          }}
                        >
                          {page.title}
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={method()}>
                    {(page) => <p class="rx-method-body">{page().definition}</p>}
                  </Show>
                </section>
              </Show>

              <div class="rx-tabs" role="tablist">
                <For each={VIEWS}>
                  {(tab) => (
                    <button
                      type="button"
                      class="rx-chip"
                      data-on={view() === tab.id}
                      onClick={() => setView(tab.id)}
                    >
                      {tab.label}
                    </button>
                  )}
                </For>
              </div>

              <Show when={view() === "fronteira"}>
                <section class="rx-panel">
                  <h2>Fronteira do diagnóstico</h2>
                  <p class="rx-note">
                    O caso só começa com empresa, objetivo e a decisão que ele precisa permitir.
                    Fonte sem autorização fica indisponível.
                  </p>
                  <form
                    class="rx-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(() =>
                        api.updateRaioxFrontier(data().id, {
                          company_name: company(),
                          contact_name: contact(),
                          objective: objective(),
                          decision_needed: decisionNeeded(),
                          frontier: frontier(),
                          origin: origin(),
                          segment: segment(),
                          public_link: publicLink(),
                        }),
                      );
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
                          list="rx-segments-case"
                          onInput={(event) => setSegment(event.currentTarget.value)}
                        />
                        <datalist id="rx-segments-case">
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
                    <div class="rx-grid-2">
                      <label>
                        Empresa
                        <input value={company()} onInput={(event) => setCompany(event.currentTarget.value)} />
                      </label>
                      <label>
                        Contato
                        <input value={contact()} onInput={(event) => setContact(event.currentTarget.value)} />
                      </label>
                    </div>
                    <label>
                      Objetivo comercial
                      <textarea value={objective()} onInput={(event) => setObjective(event.currentTarget.value)} />
                    </label>
                    <label>
                      Decisão que o diagnóstico precisa permitir
                      <textarea
                        value={decisionNeeded()}
                        onInput={(event) => setDecisionNeeded(event.currentTarget.value)}
                      />
                    </label>
                    <label>
                      Fronteira da coleta
                      <textarea value={frontier()} onInput={(event) => setFrontier(event.currentTarget.value)} />
                    </label>
                    <div class="rx-form-actions">
                      <button type="submit" class="rx-btn" disabled={saving()}>
                        Salvar fronteira
                      </button>
                    </div>
                  </form>
                </section>
              </Show>

              <Show when={view() === "evidencias"}>
                <section class="rx-panel">
                  <h2>Evidências</h2>
                  <p class="rx-note">
                    Cada achado entra como observado, informado, inferido ou indisponível. Só os três
                    primeiros sustentam uma prioridade.
                  </p>
                  <Show when={data().deep_scan}>
                    <div class="rx-scan" aria-label="Frentes do deep scan">
                      <For each={data().scan}>
                        {(row) => (
                          <span class="rx-pill" data-on={row.covered}>
                            {row.covered ? "Coberto · " : "Falta · "}
                            {row.label}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                  <form
                    class="rx-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(async () => {
                        const next = await api.addRaioxEvidence(data().id, {
                          stage: stage(),
                          source: source(),
                          claim: claim(),
                          classification: classification(),
                          note: note(),
                          front: data().deep_scan ? front() : undefined,
                        });
                        setSource("");
                        setClaim("");
                        setNote("");
                        return next;
                      });
                    }}
                  >
                    <div class="rx-grid-2">
                      <label>
                        Etapa
                        <select value={stage()} onChange={(event) => setStage(event.currentTarget.value)}>
                          <For each={JOURNEY}>{(row) => <option value={row.id}>{row.label}</option>}</For>
                        </select>
                      </label>
                      <label>
                        Classificação
                        <select
                          value={classification()}
                          onChange={(event) => setClassification(event.currentTarget.value)}
                        >
                          <For each={CLASSIFICATIONS}>
                            {(row) => <option value={row.id}>{row.label}</option>}
                          </For>
                        </select>
                      </label>
                    </div>
                    <Show when={data().deep_scan}>
                      <label>
                        Frente da varredura
                        <select value={front()} onChange={(event) => setFront(event.currentTarget.value)}>
                          <For each={data().scan.length ? data().scan : SCAN_FRONTS}>
                            {(row) => <option value={row.id}>{row.label}</option>}
                          </For>
                        </select>
                      </label>
                    </Show>
                    <label>
                      Fonte
                      <input value={source()} onInput={(event) => setSource(event.currentTarget.value)} />
                    </label>
                    <label>
                      O que mostra
                      <textarea value={claim()} onInput={(event) => setClaim(event.currentTarget.value)} />
                    </label>
                    <label>
                      Nota
                      <input value={note()} onInput={(event) => setNote(event.currentTarget.value)} />
                    </label>
                    <div class="rx-form-actions">
                      <button type="submit" class="rx-btn" disabled={saving()}>
                        Registrar evidência
                      </button>
                    </div>
                  </form>
                  <div class="rx-evidence">
                    <For each={data().evidence}>
                      {(row) => (
                        <article>
                          <div>
                            <h3>
                              {stageLabel(row.stage)} · {classLabel(row.classification)}
                              <Show when={row.front}> · {frontLabel(row.front)}</Show>
                            </h3>
                            <p>{row.claim}</p>
                            <p>{row.source}</p>
                          </div>
                          <button
                            type="button"
                            class="rx-btn-ghost"
                            disabled={saving()}
                            onClick={() => void run(() => api.removeRaioxEvidence(data().id, row.id))}
                          >
                            Remover
                          </button>
                        </article>
                      )}
                    </For>
                  </div>
                </section>
              </Show>

              <Show when={view() === "jornada"}>
                <section class="rx-panel">
                  <h2>Mapa da jornada</h2>
                  <p class="rx-note">
                    Encontrar, conversar, atender, vender e medir. O gargalo é uma etapa, não a soma
                    de todas.
                  </p>
                  <div class="rx-journey">
                    <For each={data().journey}>
                      {(row) => (
                        <div class="rx-stage">
                          <span>{stageLabel(row.stage)}</span>
                          <strong>{row.usable}</strong>
                          <span>{row.count} registros · {row.usable} utilizáveis</span>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              </Show>

              <Show when={view() === "prioridade"}>
                <section class="rx-panel">
                  <h2>Uma prioridade</h2>
                  <p class="rx-note">
                    A etapa escolhida precisa de evidência utilizável. Trocar a prioridade reabre a
                    devolutiva.
                  </p>
                  <form
                    class="rx-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(() =>
                        api.setRaioxPriority(data().id, {
                          priority_stage: priorityStage(),
                          bottleneck: bottleneck(),
                          priority_rationale: rationale(),
                          confidence: confidence(),
                          discarded: discarded(),
                        }),
                      );
                    }}
                  >
                    <div>
                      <span>Etapa do gargalo</span>
                      <div class="rx-choice" role="group" aria-label="Etapa do gargalo">
                        <For each={JOURNEY}>
                          {(row) => (
                            <button
                              type="button"
                              aria-label={row.label}
                              data-on={priorityStage() === row.id}
                              onClick={() => setPriorityStage(row.id)}
                            >
                              {row.label}
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                    <label>
                      Gargalo
                      <textarea value={bottleneck()} onInput={(event) => setBottleneck(event.currentTarget.value)} />
                    </label>
                    <label>
                      Por que vem primeiro
                      <textarea value={rationale()} onInput={(event) => setRationale(event.currentTarget.value)} />
                    </label>
                    <label>
                      O que fica para depois
                      <textarea value={discarded()} onInput={(event) => setDiscarded(event.currentTarget.value)} />
                    </label>
                    <div>
                      <span>Confiança</span>
                      <div class="rx-choice" role="group" aria-label="Confiança">
                        <For each={CONFIDENCE}>
                          {(row) => (
                            <button
                              type="button"
                              aria-label={row.label}
                              data-on={confidence() === row.id}
                              onClick={() => setConfidence(row.id)}
                            >
                              {row.label}
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                    <div class="rx-form-actions">
                      <button type="submit" class="rx-btn" disabled={saving()}>
                        Fixar prioridade
                      </button>
                    </div>
                  </form>
                </section>
              </Show>

              <Show when={view() === "devolutiva"}>
                <section class="rx-panel">
                  <h2>Devolutiva</h2>
                  <p class="rx-note">
                    Emitir proposta escolhe uma oferta seguinte e o passo de 30 dias. Não emitir
                    encerra sem handoff. Este módulo não constrói, não anuncia e não monitora.
                  </p>
                  <Show when={data().bottleneck}>
                    <p class="rx-note">
                      Prioridade atual: {data().bottleneck} · {stageLabel(data().priority_stage)} ·{" "}
                      {offerLabel(data().next_offer)}
                    </p>
                  </Show>
                  <form
                    class="rx-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(() =>
                        api.setRaioxDebrief(data().id, {
                          decision: debrief(),
                          reason: reason(),
                          next_offer: debrief() === "proposta_emitida" ? offer() : "nenhuma",
                          plan_30: plan30(),
                          plan_60: plan60(),
                          plan_90: plan90(),
                        }),
                      );
                    }}
                  >
                    <div class="rx-choice">
                      <button
                        type="button"
                        data-on={debrief() === "proposta_emitida"}
                        onClick={() => setDebrief("proposta_emitida")}
                      >
                        Emitir proposta
                      </button>
                      <button
                        type="button"
                        data-on={debrief() === "nao_emitir"}
                        onClick={() => setDebrief("nao_emitir")}
                      >
                        Não emitir
                      </button>
                    </div>
                    <Show when={debrief() === "proposta_emitida"}>
                      <label>
                        Oferta seguinte
                        <select value={offer()} onChange={(event) => setOffer(event.currentTarget.value)}>
                          <For each={OFFERS}>
                            {(row) => <option value={row.id}>{row.label}</option>}
                          </For>
                        </select>
                      </label>
                      <label>
                        30 dias
                        <textarea value={plan30()} onInput={(event) => setPlan30(event.currentTarget.value)} />
                      </label>
                      <label>
                        60 dias
                        <textarea value={plan60()} onInput={(event) => setPlan60(event.currentTarget.value)} />
                      </label>
                      <label>
                        90 dias
                        <textarea value={plan90()} onInput={(event) => setPlan90(event.currentTarget.value)} />
                      </label>
                    </Show>
                    <label>
                      Motivo
                      <textarea value={reason()} onInput={(event) => setReason(event.currentTarget.value)} />
                    </label>
                    <div class="rx-form-actions">
                      <button type="submit" class="rx-btn" disabled={saving()}>
                        Registrar devolutiva
                      </button>
                      <Show when={data().debrief_decision && data().status !== "fechado"}>
                        <button
                          type="button"
                          class="rx-btn-ghost"
                          disabled={saving()}
                          onClick={() => void run(() => api.closeRaioxCase(data().id))}
                        >
                          Encerrar
                        </button>
                      </Show>
                    </div>
                  </form>
                </section>
              </Show>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}
