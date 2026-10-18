import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";
import {
  api,
  type Proposal,
  type ProposalItem,
  type ProposalChange,
  type ProposalSendInfo,
} from "../../shared/api/client";

export type { Proposal, ProposalItem, ProposalChange, ProposalSendInfo };

const PROP_BASE = "https://propostas.tavir.com.br/p/";

const PROP_SEND: Record<string, ProposalSendInfo> = {
  "prop-01": { link: "PRO-001-v2-a7f3c1", sentTo: "renata.paiva@atlasholdings.com.br", sentAt: "24/09 11:45", opened: "6 vezes", accept: ["signed", "Renata Paiva", "27/09 11:20"] },
  "prop-03": { link: "PRO-003-v1-c42e90", sentTo: "julia.castro@northwind.digital", sentAt: "25/09 14:20", opened: "2 vezes", accept: ["pending"] },
  "prop-04": { link: "PRO-004-v1-9b1d07", sentTo: "andre@bluepeak.studio", sentAt: "23/09 17:30", opened: "1 vez", accept: ["pending"] },
  "prop-05": { link: "PRO-005-v1-e58a2f", sentTo: "paulo.serra@meridiancapital.com.br", sentAt: "02/09 11:00", opened: "4 vezes", accept: ["signed", "Paulo Serra", "05/09 15:20"] },
  "prop-06": { link: "PRO-006-v2-1d6b44", sentTo: "lia@vortexlabs.io", sentAt: "12/09 11:30", opened: "3 vezes", accept: ["refused", "Lia Nakamura", "15/09 14:00"] },
};

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: "prop-01",
    num: "PRO-001",
    client: "Atlas Holdings",
    stage: "pending",
    status: "Aceita pelo cliente · aguardando contra-assinatura",
    tone: "wait",
    version: 2,
    value: 48500,
    validity: "15/10",
    deadline: "8 semanas",
    taskId: "task-10",
    summary: "Proposta de landing page institucional com integração ao CRM da Atlas e 3 meses de suporte. O cliente aceitou pela ponte Supabase; falta a contra-assinatura local (aprovação ap-05) para abrir o projeto.",
    scope: "Landing em 5 seções com formulário de captação ligado ao CRM, painel de leads e suporte evolutivo após a entrega.",
    items: [
      { desc: "Landing institucional (5 seções)", value: 22000 },
      { desc: "Integração com CRM e painel de leads", value: 16500 },
      { desc: "Suporte evolutivo · 3 meses", value: 10000 },
    ],
    collected: [
      ["Contato", "Renata Paiva · diretora de marketing"],
      ["Objetivo", "Aumentar leads qualificados do site"],
      ["Sistemas", "CRM próprio com API REST"],
      ["Orçamento indicado", "até R$ 50 mil"],
    ],
    changes: [
      { at: "24/09 10:12", target: "Prazos", agent: "Arquiteto", text: "Cliente pediu entrega em 8 semanas em vez de 10.", status: "Aplicada · v2" },
    ],
    timeline: [
      ["20/09 09:30", "Comercial", "Reunião de descoberta registrada"],
      ["22/09 16:00", "Comercial", "Proposta v1 enviada"],
      ["24/09 10:12", "Você", "Alteração de prazo solicitada"],
      ["24/09 11:40", "Arquiteto", "Cronograma refeito para 8 semanas · v2"],
      ["27/09 11:20", "Atlas Holdings", "Aceite recebido"],
    ],
  },
  {
    id: "prop-02",
    num: "PRO-002",
    client: "Cobalt Group",
    stage: "progress",
    status: "Coletando informações com o cliente",
    tone: "work",
    version: 1,
    value: null,
    validity: "",
    deadline: "A definir",
    summary: "Oportunidade aberta após contato pelo site. O agente Comercial está levantando necessidades e orçamento para montar a primeira versão.",
    scope: "Escopo tratado na próxima etapa, depois da coleta.",
    items: [],
    collected: [
      ["Contato", "Marcos Lima · COO"],
      ["Interesse", "Automação do atendimento comercial"],
    ],
    changes: [],
    timeline: [
      ["27/09 15:10", "Comercial", "Primeiro contato registrado"],
      ["28/09 09:00", "Comercial", "Questionário de descoberta enviado"],
    ],
  },
  {
    id: "prop-03",
    num: "PRO-003",
    client: "Northwind Digital",
    stage: "progress",
    status: "Ajustando valores a pedido seu",
    tone: "work",
    version: 1,
    value: 31200,
    validity: "10/10",
    deadline: "6 semanas",
    summary: "Proposta de conteúdo recorrente para blog e LinkedIn, com 12 artigos por mês e relatório de desempenho.",
    scope: "Produção editorial mensal com pauta aprovada pelo cliente, revisão e publicação.",
    items: [
      { desc: "12 artigos por mês · 3 meses", value: 24000 },
      { desc: "Distribuição no LinkedIn", value: 4800 },
      { desc: "Relatório mensal de desempenho", value: 2400 },
    ],
    collected: [
      ["Contato", "Júlia Castro · head de growth"],
      ["Frequência", "3 artigos por semana"],
      ["Canais", "Blog e LinkedIn"],
    ],
    changes: [
      { at: "28/09 09:45", target: "Valores", agent: "Comercial", text: "Oferecer o relatório mensal sem custo se o contrato for de 6 meses.", status: "Com o agente" },
    ],
    timeline: [
      ["25/09 14:00", "Comercial", "Proposta v1 montada"],
      ["28/09 09:45", "Você", "Alteração de valores solicitada"],
    ],
  },
  {
    id: "prop-04",
    num: "PRO-004",
    client: "Bluepeak Studio",
    stage: "pending",
    status: "Enviada · aguardando resposta do cliente",
    tone: "wait",
    version: 1,
    value: 12800,
    validity: "05/10",
    deadline: "3 semanas",
    summary: "Redesenho da página de portfólio do estúdio, com galeria filtrável e formulário de orçamento.",
    scope: "Página de portfólio responsiva, galeria com filtros por categoria e formulário ligado ao e-mail do estúdio.",
    items: [
      { desc: "Página de portfólio com galeria", value: 9600 },
      { desc: "Formulário de orçamento", value: 3200 },
    ],
    collected: [
      ["Contato", "André Moura · sócio"],
      ["Referências", "3 sites enviados pelo cliente"],
    ],
    changes: [],
    timeline: [
      ["23/09 10:00", "Comercial", "Proposta v1 montada"],
      ["23/09 17:30", "Comercial", "Proposta enviada ao cliente"],
    ],
  },
  {
    id: "prop-05",
    num: "PRO-005",
    client: "Meridian Capital",
    stage: "done",
    status: "Aceita e contra-assinada",
    tone: "ok",
    version: 1,
    value: 32000,
    validity: "—",
    deadline: "5 semanas",
    taskId: "task-07",
    summary: "Landing de captação para o fundo da Meridian Capital. Proposta concluída; o projeto meridian-landing foi aberto.",
    scope: "Landing de captação com área de materiais para investidores e publicação na conta vercel · tavir.",
    items: [
      { desc: "Landing de captação", value: 24000 },
      { desc: "Área de materiais para investidores", value: 8000 },
    ],
    collected: [
      ["Contato", "Paulo Serra · relações com investidores"],
      ["Prazo desejado", "antes do fim do trimestre"],
    ],
    changes: [],
    timeline: [
      ["02/09 11:00", "Comercial", "Proposta v1 enviada"],
      ["05/09 15:20", "Meridian Capital", "Aceite recebido"],
      ["05/09 16:00", "Você", "Contra-assinatura registrada"],
    ],
  },
  {
    id: "prop-06",
    num: "PRO-006",
    client: "Vortex Labs",
    stage: "done",
    status: "Recusada pelo cliente",
    tone: "lost",
    version: 2,
    value: 21400,
    validity: "—",
    deadline: "4 semanas",
    summary: "Proposta de documentação técnica da API da Vortex Labs. O cliente optou por fazer internamente.",
    scope: "Documentação OpenAPI dos 40 endpoints públicos com portal de desenvolvedores.",
    items: [
      { desc: "Documentação OpenAPI · 40 endpoints", value: 16400 },
      { desc: "Portal de desenvolvedores", value: 5000 },
    ],
    collected: [
      ["Contato", "Lia Nakamura · CTO"],
      ["Motivo da recusa", "Equipe interna vai assumir a documentação"],
    ],
    changes: [
      { at: "12/09 09:10", target: "Valores", agent: "Comercial", text: "Reduzir o valor do portal para caber no orçamento.", status: "Aplicada · v2" },
    ],
    timeline: [
      ["08/09 10:00", "Comercial", "Proposta v1 enviada"],
      ["12/09 11:30", "Comercial", "Proposta v2 enviada"],
      ["15/09 14:00", "Vortex Labs", "Recusa registrada"],
    ],
  },
];

const PSTAGES: [Proposal["stage"], string, string, string][] = [
  ["progress", "Propostas em andamento", "#1BC5BD", "Agente Comercial coletando, montando ou ajustando"],
  ["pending", "Propostas pendentes", "oklch(0.80 0.155 78)", "Aguardando cliente ou decisão interna"],
  ["done", "Propostas concluídas", "#cbd3de", "Aceitas, contra-assinadas ou encerradas"],
];

const P_TONE: Record<Proposal["tone"], string> = {
  work: "#1BC5BD",
  wait: "oklch(0.80 0.155 78)",
  ok: "#1BC5BD",
  lost: "oklch(0.635 0.185 27)",
};

const CHG_TARGETS: [string, string, string][] = [
  ["Valores", "Comercial", "Ex.: aplicar 10% de desconto no item de suporte"],
  ["Prazos", "Arquiteto", "Ex.: antecipar a entrega da landing para 4 semanas"],
  ["Escopo", "Arquiteto", "Ex.: incluir integração com o WhatsApp"],
  ["Outras informações", "Comercial", "Ex.: trocar o contato responsável do cliente"],
];

const brl = (n: number | null | undefined) =>
  n == null ? "Em cálculo pelo agente" : "R$ " + n.toLocaleString("pt-BR");

export function PropostasView() {
  const [proposals, setProposals] = createSignal<Proposal[]>(INITIAL_PROPOSALS);
  const [propQ, setPropQ] = createSignal("");
  const [selectedPropId, setSelectedPropId] = createSignal<string | null>(null);
  const [propPreview, setPropPreview] = createSignal(false);
  const [chgTarget, setChgTarget] = createSignal("Valores");
  const [chgText, setChgText] = createSignal("");
  const [chgTried, setChgTried] = createSignal(false);
  const [newPropOpen, setNewPropOpen] = createSignal(false);
  const [sendEmail, setSendEmail] = createSignal("");

  // New proposal form state
  const [newClient, setNewClient] = createSignal("");
  const [newSummary, setNewSummary] = createSignal("");
  const [newScope, setNewScope] = createSignal("");
  const [newValue, setNewValue] = createSignal("");
  const [newDeadline, setNewDeadline] = createSignal("4 semanas");

  // Keyboard navigation: Esc closes modals
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (propPreview()) {
        setPropPreview(false);
      } else if (selectedPropId()) {
        setSelectedPropId(null);
      } else if (newPropOpen()) {
        setNewPropOpen(false);
      }
    }
  };

  const loadProposals = async () => {
    try {
      const live = await api.listProposals();
      if (live && live.length > 0) {
        setProposals(live);
      }
    } catch (err) {
      console.warn("Propostas: operando com dados locais/cache", err);
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    loadProposals();
  });
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  const filteredProposals = createMemo(() => {
    const q = propQ().trim().toLowerCase();
    if (!q) return proposals();
    return proposals().filter((p) => (p.num + " " + p.client).toLowerCase().includes(q));
  });

  const propSummary = createMemo(() => {
    const all = proposals();
    const prog = all.filter((p) => p.stage === "progress").length;
    const pend = all.filter((p) => p.stage === "pending").length;
    const done = all.filter((p) => p.stage === "done").length;
    return `${prog} em andamento com o agente Comercial · ${pend} pendentes · ${done} concluídas`;
  });

  const propCols = createMemo(() => {
    const list = filteredProposals();
    return PSTAGES.map(([id, label, color, hint]) => {
      const cards = list
        .filter((p) => p.stage === id)
        .map((p) => {
          const openChanges = (p.changes || []).filter((c) => c.status === "Com o agente").length;
          return {
            raw: p,
            num: p.num,
            version: "v" + p.version,
            client: p.client,
            status: p.status,
            statusColor: P_TONE[p.tone as keyof typeof P_TONE] || "var(--teal)",
            value: brl(p.value),
            valueColor: p.value == null ? "#aeb7c4" : "#F4F6F2",
            validity: p.validity && p.validity !== "—" ? "válida até " + p.validity : "",
            hasOpenChange: openChanges > 0,
            openChange: `${openChanges} ${openChanges > 1 ? "alterações" : "alteração"} com o agente`,
          };
        });
      return { id, label, color, hint, count: String(cards.length), cards, empty: cards.length === 0 };
    });
  });

  const selectedProposal = createMemo(() => {
    const id = selectedPropId();
    if (!id) return null;
    return proposals().find((p) => p.id === id) || null;
  });

  const sendChange = async () => {
    setChgTried(true);
    const text = chgText().trim();
    if (!text) return;
    const sp = selectedProposal();
    if (!sp) return;

    const targetDef = CHG_TARGETS.find((t) => t[0] === chgTarget()) || CHG_TARGETS[0];
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newChange: ProposalChange = {
      at: timeStr,
      target: targetDef[0],
      agent: targetDef[1],
      text,
      status: "Com o agente",
    };

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === sp.id) {
          return {
            ...p,
            changes: [newChange, ...(p.changes || [])],
            timeline: [[timeStr, "Você", `Alteração de ${targetDef[0].toLowerCase()} solicitada`], ...(p.timeline || [])],
          };
        }
        return p;
      })
    );

    setChgText("");
    setChgTried(false);
    showToast(`Alteração enviada ao ${targetDef[1]}`);

    try {
      const updated = await api.requestProposalChange(sp.id, {
        target: targetDef[0],
        agent: targetDef[1],
        text,
      });
      if (updated) {
        setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch (err) {
      console.warn("Erro ao sincronizar alteração com o backend:", err);
    }
  };

  const handleCreateProposal = async (e: Event) => {
    e.preventDefault();
    const client = newClient().trim();
    if (!client) return;

    const nextId = "prop-" + String(proposals().length + 1).padStart(2, "0");
    const nextNum = "PRO-" + String(proposals().length + 1).padStart(3, "0");
    const valNum = parseFloat(newValue().replace(/[^\d.,]/g, "").replace(",", ".")) || null;

    const payload: Partial<Proposal> = {
      id: nextId,
      num: nextNum,
      client,
      stage: "progress",
      status: "Coletando informações com o cliente",
      tone: "work",
      version: 1,
      value: valNum,
      validity: "30 dias",
      deadline: newDeadline().trim() || "A definir",
      summary: newSummary().trim() || "Oportunidade aberta para " + client + ".",
      scope: newScope().trim() || "Escopo a ser definido durante o diagnóstico inicial.",
      items: valNum ? [{ desc: "Pacote de implementação", value: valNum }] : [],
      collected: [["Origem", "Criada no painel TAVIR"]],
      changes: [],
      timeline: [["Hoje", "Você", "Proposta registrada no painel"]],
    };

    setProposals([payload as Proposal, ...proposals()]);
    setNewPropOpen(false);
    setNewClient("");
    setNewSummary("");
    setNewScope("");
    setNewValue("");
    showToast(`Proposta ${nextNum} criada com sucesso`);

    try {
      const created = await api.createProposal(payload);
      if (created) {
        setProposals((prev) => [created, ...prev.filter((p) => p.id !== nextId && p.id !== created.id)]);
      }
    } catch (err) {
      console.warn("Erro ao persistir proposta no backend:", err);
    }
  };

  const handleSendProposal = async (propId: string) => {
    const email = sendEmail().trim();
    if (!email) {
      showToast("Informe o e-mail do cliente para envio");
      return;
    }
    try {
      const updated = await api.sendProposal(propId, email);
      if (updated) {
        setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast("Proposta enviada ao cliente com link rastreável!");
        setSendEmail("");
      }
    } catch (err) {
      showToast("Erro ao enviar proposta");
    }
  };

  const handleAcceptProposal = async (propId: string, signerName = "Carlos (CEO TAVIR)") => {
    try {
      const updated = await api.acceptProposal(propId, { signer_name: signerName, accepted: true });
      if (updated) {
        setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast("Aceite e contra-assinatura registrados com sucesso!");
      }
    } catch (err) {
      showToast("Erro ao registrar aceite/contra-assinatura");
    }
  };

  const copyProposalLink = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      showToast("Link copiado para a área de transferência");
    } catch {
      showToast("Erro ao copiar link");
    }
  };

  return (
    <div
      data-screen-label="Propostas"
      class="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-0)] text-[var(--text-primary)]"
    >
      {/* Header bar */}
      <div class="flex flex-wrap items-end gap-3 px-6 py-5 pb-4">
        <div class="min-w-[240px] flex-1">
          <h1 class="m-0 text-xl font-semibold tracking-tight">Propostas</h1>
          <p class="m-0 mt-1 text-sm text-[var(--text-secondary)]">{propSummary()}</p>
        </div>
        <input
          value={propQ()}
          onInput={(e) => setPropQ(e.currentTarget.value)}
          placeholder="Buscar nº ou cliente"
          aria-label="Buscar propostas"
          class="h-8 w-60 max-w-full rounded-full border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3.5 text-xs text-[var(--cloud)] outline-none transition-colors focus:border-[var(--teal)]"
        />
        <button
          onClick={() => setNewPropOpen(true)}
          class="flex h-8 items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.16)] bg-[#121c30] px-3 text-xs font-medium text-[var(--cloud)] transition-colors hover:border-[var(--teal)]"
        >
          Nova proposta
        </button>
      </div>

      {/* 3-Column Kanban */}
      <div class="grid flex-1 grid-cols-1 gap-4 overflow-x-auto p-6 pt-0 md:grid-cols-3">
        <For each={propCols()}>
          {(pc) => (
            <section class="flex min-h-0 flex-col rounded-2xl border border-[rgba(244,246,242,.10)] bg-[#0f1729]">
              {/* Column header */}
              <div class="border-b border-[rgba(244,246,242,.10)] px-3 py-3">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full" style={{ background: pc.color }} />
                  <span class="text-sm font-semibold text-[var(--cloud)]">{pc.label}</span>
                  <span class="font-mono text-[11px] text-[var(--muted,#aeb7c4)]">{pc.count}</span>
                </div>
                <div class="mt-1 text-xs text-[var(--muted,#aeb7c4)]">{pc.hint}</div>
              </div>

              {/* Column cards container */}
              <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                <For each={pc.cards}>
                  {(pk) => (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPropId(pk.raw.id);
                        setPropPreview(false);
                        setChgText("");
                        setChgTried(false);
                      }}
                      class="flex cursor-pointer flex-col gap-2 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#121c30] p-3 transition-colors hover:border-[rgba(244,246,242,.34)]"
                    >
                      <div class="flex items-center gap-2 text-[11px]">
                        <span class="font-mono text-xs font-medium text-[var(--cloud)]">{pk.num}</span>
                        <span class="font-mono text-[var(--muted,#aeb7c4)]">{pk.version}</span>
                        <span class="flex-1" />
                        <TvIcon name="maximize" class="h-3 w-3 text-[var(--muted,#aeb7c4)]" />
                      </div>
                      <div class="font-semibold leading-snug text-[var(--cloud)]">{pk.client}</div>
                      <div class="flex items-center gap-1.5 text-xs" style={{ color: pk.statusColor }}>
                        <span class="h-1.5 w-1.5 rounded-full" style={{ background: pk.statusColor }} />
                        {pk.status}
                      </div>
                      <div class="flex items-center gap-2.5 text-xs text-[var(--muted,#aeb7c4)]">
                        <span class="font-mono" style={{ color: pk.valueColor }}>{pk.value}</span>
                        <span class="flex-1" />
                        <span>{pk.validity}</span>
                      </div>
                      <Show when={pk.hasOpenChange}>
                        <div class="text-[11px] text-[oklch(0.80_0.155_78)]">{pk.openChange}</div>
                      </Show>
                    </div>
                  )}
                </For>
                <Show when={pc.empty}>
                  <div class="py-6 text-center text-xs text-[var(--muted,#aeb7c4)]">Nenhuma proposta</div>
                </Show>
              </div>
            </section>
          )}
        </For>
      </div>

      {/* DETAIL MODAL */}
      <Show when={selectedProposal()}>
        {(prop) => {
          const sendInfo = () => prop().send_info || PROP_SEND[prop().id];
          const hasLink = () => !!sendInfo();
          const linkUrl = () => (hasLink() ? (sendInfo()!.link.startsWith("http") ? sendInfo()!.link : PROP_BASE + sendInfo()!.link) : "");
          const linkBar = () => linkUrl() || "prévia interna · link ainda não gerado";
          const accept = () => (hasLink() ? sendInfo()!.accept : (["pending"] as const));
          const isSigned = () => accept()[0] === "signed";
          const isRefused = () => accept()[0] === "refused";
          const isAwaiting = () => accept()[0] === "pending";
          const acceptColor = () =>
            isSigned() ? "var(--teal)" : isRefused() ? "oklch(0.635 0.185 27)" : "oklch(0.80 0.155 78)";
          const acceptLabel = () => {
            const ac = accept();
            if (ac[0] === "signed") return `assinado por ${ac[1]} em ${ac[2]}`;
            if (ac[0] === "refused") return `recusado por ${ac[1]} em ${ac[2]}`;
            return "aguardando assinatura do cliente";
          };
          const stageInfo = () => PSTAGES.find((s) => s[0] === prop().stage) || PSTAGES[0];
          const targetDef = () => CHG_TARGETS.find((t) => t[0] === chgTarget()) || CHG_TARGETS[0];

          return (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setSelectedPropId(null)}
                class="fixed inset-0 z-40 bg-[rgba(7,12,22,.62)]"
              />

              {/* Dialog */}
              <div
                role="dialog"
                aria-label="Detalhamento da proposta"
                class="fixed bottom-7 left-1/2 top-7 z-50 flex w-[1080px] max-w-[calc(100%-32px)] -translate-x-1/2 flex-col rounded-[18px] border border-[rgba(244,246,242,.34)] bg-[#0f1729] shadow-[0_24px_60px_rgba(0,0,0,.5)]"
              >
                {/* Dialog Top Bar */}
                <div class="flex flex-wrap items-center gap-3 border-b border-[rgba(244,246,242,.10)] px-6 py-3.5">
                  <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                    Proposta
                  </span>
                  <span class="font-mono text-sm font-medium text-[var(--cloud)]">{prop().num}</span>
                  <span class="font-mono text-xs text-[var(--muted,#aeb7c4)]">v{prop().version}</span>
                  <span
                    class="flex items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.16)] px-2.5 py-0.5 text-xs"
                    style={{ color: stageInfo()[2] }}
                  >
                    <span class="h-1.5 w-1.5 rounded-full" style={{ background: stageInfo()[2] }} />
                    {stageInfo()[1].replace("Propostas ", "")}
                  </span>
                  <span class="flex-1" />
                  <button
                    onClick={() => setSelectedPropId(null)}
                    class="h-7 rounded-full border border-[rgba(244,246,242,.16)] bg-transparent px-2.5 text-xs text-[var(--cloud)] transition-colors hover:border-[var(--teal)]"
                  >
                    Fechar · Esc
                  </button>
                </div>

                {/* Dialog Body 2 Columns */}
                <div class="flex flex-1 flex-col gap-6 overflow-y-auto p-7 pb-8">
                  <div>
                    <div class="flex items-center gap-1.5 text-xs" style={{ color: P_TONE[prop().tone as keyof typeof P_TONE] || "var(--teal)" }}>
                      <span class="h-1.5 w-1.5 rounded-full" style={{ background: P_TONE[prop().tone as keyof typeof P_TONE] || "var(--teal)" }} />
                      {prop().status}
                    </div>
                    <h2 class="m-0 mt-1.5 text-2xl font-semibold tracking-tight text-[var(--cloud)]">
                      {prop().client}
                    </h2>
                  </div>

                  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
                    {/* Left Column */}
                    <div class="flex min-w-0 flex-col gap-5">
                      {/* O que é */}
                      <div class="flex flex-col gap-2">
                        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          O que é
                        </span>
                        <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#121c30] p-3.5 text-sm leading-relaxed text-[var(--cloud)]">
                          {prop().summary}
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div class="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-[rgba(244,246,242,.12)] sm:grid-cols-3">
                        <div class="border-b border-r border-[rgba(244,246,242,.12)] p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Cliente</div>
                          <div class="mt-1 text-xs font-medium text-[var(--cloud)]">{prop().client}</div>
                        </div>
                        <div class="border-b border-r border-[rgba(244,246,242,.12)] p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Valor total</div>
                          <div
                            class="mt-1 font-mono text-xs font-medium"
                            style={{ color: prop().value == null ? "#aeb7c4" : "#F4F6F2" }}
                          >
                            {brl(prop().value)}
                          </div>
                        </div>
                        <div class="border-b border-r border-[rgba(244,246,242,.12)] p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Prazo de execução</div>
                          <div class="mt-1 text-xs font-medium text-[var(--cloud)]">{prop().deadline}</div>
                        </div>
                        <div class="border-r border-[rgba(244,246,242,.12)] p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Validade</div>
                          <div class="mt-1 font-mono text-xs font-medium text-[var(--cloud)]">{prop().validity || "—"}</div>
                        </div>
                        <div class="border-r border-[rgba(244,246,242,.12)] p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Conduzida por</div>
                          <div class="mt-1 text-xs font-medium text-[var(--cloud)]">Agente Comercial</div>
                        </div>
                        <div class="p-3">
                          <div class="text-[11px] text-[var(--muted,#aeb7c4)]">Versão</div>
                          <div class="mt-1 font-mono text-xs font-medium text-[var(--cloud)]">v{prop().version}</div>
                        </div>
                      </div>

                      {/* Em que consiste */}
                      <div class="flex flex-col gap-2">
                        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          Em que consiste
                        </span>
                        <div class="text-sm leading-relaxed text-[var(--t2,#cbd3de)]">{prop().scope}</div>
                        <Show
                          when={prop().items.length > 0}
                          fallback={
                            <div class="rounded-xl border border-dashed border-[rgba(244,246,242,.34)] p-3 text-xs text-[var(--t2,#cbd3de)]">
                              O agente Comercial ainda está montando os itens e calculando o valor.
                            </div>
                          }
                        >
                          <div class="overflow-hidden rounded-xl border border-[rgba(244,246,242,.12)]">
                            <For each={prop().items}>
                              {(it) => (
                                <div class="flex items-center justify-between border-b border-[rgba(244,246,242,.10)] p-2.5 px-3.5 text-xs">
                                  <span class="text-[var(--cloud)]">{it.desc}</span>
                                  <span class="font-mono text-[var(--t2,#cbd3de)]">{brl(it.value)}</span>
                                </div>
                              )}
                            </For>
                            <div class="flex items-center justify-between bg-[#121c30] p-2.5 px-3.5 text-xs font-semibold text-[var(--cloud)]">
                              <span>Total</span>
                              <span class="font-mono">{brl(prop().value)}</span>
                            </div>
                          </div>
                        </Show>
                      </div>

                      {/* Informações coletadas */}
                      <div class="flex flex-col gap-2">
                        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          Informações coletadas pelo agente
                        </span>
                        <Show
                          when={prop().collected.length > 0}
                          fallback={
                            <div class="text-xs text-[var(--muted,#aeb7c4)]">
                              Coleta iniciada, nenhuma informação registrada ainda.
                            </div>
                          }
                        >
                          <div class="flex flex-col">
                            <For each={prop().collected}>
                              {([label, val]) => (
                                <div class="grid grid-cols-[140px_1fr] gap-3 border-b border-[rgba(244,246,242,.10)] py-2 text-xs">
                                  <span class="text-[var(--muted,#aeb7c4)]">{label}</span>
                                  <span class="leading-normal text-[var(--cloud)]">{val}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>

                      {/* Task vinculada */}
                      <Show when={prop().task_id || (prop() as any).taskId}>
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted,#aeb7c4)]">
                            Task vinculada
                          </span>
                          <span class="font-mono text-xs font-medium text-[var(--teal)]">
                            #{prop().task_id || (prop() as any).taskId}
                          </span>
                        </div>
                      </Show>
                    </div>

                    {/* Right Column */}
                    <div class="flex min-w-0 flex-col gap-5">
                      {/* Link e prévia */}
                      <div class="flex flex-col gap-3 rounded-xl border border-[rgba(244,246,242,.12)] p-4">
                        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          Link e prévia da proposta
                        </span>
                        <Show
                          when={hasLink()}
                          fallback={
                            <div class="flex flex-col gap-2.5">
                              <div class="text-xs leading-relaxed text-[var(--muted,#aeb7c4)]">
                                O link é gerado no modelo TAVIR quando o agente Comercial envia a proposta ao cliente.
                              </div>
                              <div class="flex flex-wrap items-center gap-2">
                                <input
                                  value={sendEmail()}
                                  onInput={(e) => setSendEmail(e.currentTarget.value)}
                                  placeholder="E-mail do cliente para envio"
                                  class="h-8 flex-1 min-w-[200px] rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3 text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
                                />
                                <button
                                  onClick={() => handleSendProposal(prop().id)}
                                  class="flex h-8 items-center gap-1.5 rounded-full border-none bg-[var(--teal)] px-3.5 text-xs font-semibold text-[#0B1220] hover:opacity-90"
                                >
                                  Gerar link & Enviar
                                </button>
                              </div>
                            </div>
                          }
                        >
                          <div class="flex flex-wrap items-center gap-2">
                            <input
                              readOnly
                              value={linkUrl()}
                              aria-label="Link enviado ao cliente"
                              onFocus={(e) => e.currentTarget.select()}
                              class="h-8 flex-1 min-w-[200px] rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3 font-mono text-xs text-[var(--cloud)] outline-none"
                            />
                            <button
                              onClick={() => copyProposalLink(linkUrl())}
                              class="flex h-8 items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.34)] bg-transparent px-3 text-xs font-medium text-[var(--cloud)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                            >
                              Copiar
                            </button>
                            <a
                              href={linkUrl()}
                              target="_blank"
                              rel="noreferrer"
                              class="flex h-8 items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.34)] bg-transparent px-3 text-xs font-medium text-[var(--cloud)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                            >
                              Abrir link ↗
                            </a>
                          </div>
                          <div class="flex flex-col gap-1 text-xs text-[var(--t2,#cbd3de)]">
                            <span>
                              Enviado para <span class="text-[var(--cloud)]">{sendInfo()!.sentTo}</span> em{" "}
                              {sendInfo()!.sentAt} · aberto {sendInfo()!.opened}
                            </span>
                            <span class="flex items-center gap-1.5" style={{ color: acceptColor() }}>
                              <span class="h-1.5 w-1.5 rounded-full" style={{ background: acceptColor() }} />
                              Aceite eletrônico · {acceptLabel()}
                            </span>
                          </div>
                        </Show>

                        {/* Botão de contra-assinatura quando pendente */}
                        <Show when={prop().status.includes("contra-assinatura") || (prop().stage === "pending" && isAwaiting())}>
                          <div class="mt-2 flex flex-col gap-2 rounded-lg border border-[rgba(27,197,189,.2)] bg-[rgba(27,197,189,.06)] p-3">
                            <div class="text-xs text-[var(--cloud)]">
                              Aprovação local pendente para início dos trabalhos operacionais.
                            </div>
                            <button
                              onClick={() => handleAcceptProposal(prop().id, "Carlos (CEO TAVIR)")}
                              class="flex h-8 self-start items-center gap-1.5 rounded-full border-none bg-[var(--lime)] px-4 text-xs font-semibold text-[#25360a] hover:opacity-90"
                            >
                              Contra-assinar e Concluir Proposta
                            </button>
                          </div>
                        </Show>

                        <button
                          onClick={() => setPropPreview(true)}
                          class="flex h-8 self-start items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.34)] bg-transparent px-3 text-xs font-medium text-[var(--cloud)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                        >
                          <TvIcon name="maximize" class="h-3 w-3" />
                          Ver prévia da proposta · v{prop().version}
                        </button>
                      </div>

                      {/* Solicitar alteração */}
                      <Show
                        when={prop().stage !== "done"}
                        fallback={
                          <div class="rounded-xl border border-[rgba(244,246,242,.12)] p-3.5 text-xs leading-relaxed text-[var(--t2,#cbd3de)]">
                            Proposta concluída. Alterações não são mais aceitas; para renegociar, abra uma nova proposta.
                          </div>
                        }
                      >
                        <div class="flex flex-col gap-3 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#121c30] p-4">
                          <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                            Solicitar alteração
                          </span>
                          <div class="flex flex-wrap gap-1.5">
                            <For each={CHG_TARGETS}>
                              {([targetLabel]) => {
                                const on = () => targetLabel === chgTarget();
                                return (
                                  <button
                                    onClick={() => setChgTarget(targetLabel)}
                                    class="h-7 rounded-full border px-3 text-xs transition-colors"
                                    style={{
                                      background: on() ? "rgba(27,197,189,.14)" : "transparent",
                                      "border-color": on() ? "var(--teal)" : "rgba(244,246,242,.16)",
                                      color: on() ? "#F4F6F2" : "#cbd3de",
                                    }}
                                  >
                                    {targetLabel}
                                  </button>
                                );
                              }}
                            </For>
                          </div>

                          <textarea
                            value={chgText()}
                            onInput={(e) => setChgText(e.currentTarget.value)}
                            rows={3}
                            placeholder={targetDef()[2]}
                            aria-label="Descrição da alteração"
                            class="rounded-lg border bg-[#0B1220] p-2.5 text-xs leading-relaxed text-[var(--cloud)] outline-none transition-colors"
                            style={{
                              "border-color":
                                chgTried() && !chgText().trim()
                                  ? "oklch(0.635 0.185 27)"
                                  : "rgba(244,246,242,.16)",
                            }}
                          />
                          <Show when={chgTried() && !chgText().trim()}>
                            <span class="text-xs text-[oklch(0.635_0.185_27)]">
                              Descreva a alteração antes de enviar.
                            </span>
                          </Show>

                          <div class="flex flex-wrap items-center gap-2.5">
                            <span class="min-w-[180px] flex-1 text-xs text-[var(--muted,#aeb7c4)]">
                              Vai para o agente <span class="text-[var(--teal)]">{targetDef()[1]}</span>, que ajusta e gera uma nova versão.
                            </span>
                            <button
                              onClick={sendChange}
                              class="flex h-8 items-center gap-1.5 rounded-full border-none bg-[var(--lime)] px-3.5 text-xs font-semibold text-[#25360a] transition-opacity hover:opacity-90"
                            >
                              Enviar ao {targetDef()[1]}
                            </button>
                          </div>
                        </div>
                      </Show>

                      {/* Alterações solicitadas */}
                      <div class="flex flex-col gap-2">
                        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          Alterações solicitadas
                        </span>
                        <Show
                          when={prop().changes.length > 0}
                          fallback={
                            <div class="text-xs text-[var(--muted,#aeb7c4)]">Nenhuma alteração solicitada</div>
                          }
                        >
                          <div class="flex flex-col gap-2">
                            <For each={prop().changes}>
                              {(cg) => (
                                <div class="flex flex-col gap-1.5 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#121c30] p-3 text-xs">
                                  <div class="flex flex-wrap items-center gap-2">
                                    <span class="rounded-full border border-[rgba(244,246,242,.16)] px-2 py-0.5 text-[10px] text-[var(--cloud)]">
                                      {cg.target}
                                    </span>
                                    <span class="text-[var(--muted,#aeb7c4)]">para {cg.agent}</span>
                                    <span class="flex-1" />
                                    <span
                                      style={{
                                        color:
                                          cg.status === "Com o agente"
                                            ? "oklch(0.80 0.155 78)"
                                            : "var(--teal)",
                                      }}
                                    >
                                      {cg.status}
                                    </span>
                                    <span class="font-mono text-[11px] text-[var(--muted,#aeb7c4)]">{cg.at}</span>
                                  </div>
                                  <div class="leading-relaxed text-[var(--cloud)]">{cg.text}</div>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>

                      {/* Histórico timeline */}
                      <div class="flex flex-col">
                        <span class="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                          Histórico
                        </span>
                        <div class="flex flex-col">
                          <For each={prop().timeline}>
                            {([at, who, text]) => (
                              <div class="grid grid-cols-[86px_96px_1fr] gap-2.5 border-b border-[rgba(244,246,242,.10)] py-2 text-xs leading-snug">
                                <span class="font-mono text-[11px] text-[var(--muted,#aeb7c4)]">{at}</span>
                                <span class="text-[var(--teal)]">{who}</span>
                                <span class="text-[var(--cloud)]">{text}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A4 PAPER PREVIEW MODAL */}
                <Show when={propPreview()}>
                  <div
                    role="dialog"
                    aria-label="Prévia da proposta"
                    class="absolute inset-0 z-50 flex flex-col bg-[#070c16]"
                  >
                    {/* Preview Top Bar */}
                    <div class="flex flex-wrap items-center gap-2.5 border-b border-[rgba(244,246,242,.10)] px-5 py-3">
                      <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                        Prévia
                      </span>
                      <span class="font-mono text-xs font-medium text-[var(--cloud)]">
                        {prop().num} · v{prop().version}
                      </span>
                      <span class="text-xs text-[var(--muted,#aeb7c4)]">
                        modelo TAVIR · reflete a versão atual
                      </span>
                      <span class="flex-1" />
                      <button
                        onClick={() => setPropPreview(false)}
                        class="h-8 rounded-full border border-[rgba(244,246,242,.34)] bg-transparent px-3 text-xs font-medium text-[var(--cloud)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                      >
                        Fechar prévia
                      </button>
                    </div>

                    {/* Preview Body with Mock Browser & A4 Paper */}
                    <div class="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 pb-12">
                      {/* Browser address bar */}
                      <div class="flex w-[794px] max-w-full items-center gap-2 rounded-t-xl border border-b-0 border-[rgba(244,246,242,.12)] bg-[#17223a] p-2 px-3">
                        <span class="h-2 w-2 rounded-full bg-[#5E6878]" />
                        <span class="h-2 w-2 rounded-full bg-[#5E6878]" />
                        <span class="h-2 w-2 rounded-full bg-[#5E6878]" />
                        <span class="ml-2 flex-1 truncate rounded-full bg-[#0B1220] px-3 py-1 font-mono text-[11px] text-[var(--t2,#cbd3de)]">
                          {linkBar()}
                        </span>
                      </div>

                      {/* A4 Sheet */}
                      <article class="w-[794px] max-w-full bg-white text-[#0B1220] shadow-[0_20px_50px_rgba(0,0,0,.45)]">
                        {/* A4 Header */}
                        <header class="flex flex-wrap items-center gap-4 bg-[#0B1220] p-7 px-10">
                          <img
                            src="/assets/brand/tavir-wordmark-reversed.svg"
                            alt="TAVIR"
                            class="block h-7 w-auto"
                            onError={(e) => {
                              // If image fails, show text fallback
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <span class="flex-1" />
                          <div class="text-right">
                            <div class="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--lime)]">
                              Proposta comercial
                            </div>
                            <div class="mt-1 font-mono text-xs text-[var(--cloud)]">
                              {prop().num} · v{prop().version}
                            </div>
                          </div>
                        </header>

                        {/* A4 Content */}
                        <div class="flex flex-col gap-7 p-10">
                          <div>
                            <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                              Preparada para
                            </div>
                            <h1 class="m-0 mt-1.5 text-3xl font-semibold tracking-tight text-[#0B1220]">
                              {prop().client}
                            </h1>
                          </div>

                          {/* 4 Metadata Cards */}
                          <div class="grid grid-cols-2 gap-4 border-b border-t border-[#dfe3dc] py-4 sm:grid-cols-4">
                            <div>
                              <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                                Emitida em
                              </div>
                              <div class="mt-1 text-xs font-medium">
                                {hasLink() ? sendInfo()!.sentAt.slice(0, 5) + "/2026" : "não emitida"}
                              </div>
                            </div>
                            <div>
                              <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                                Validade
                              </div>
                              <div class="mt-1 text-xs font-medium">{prop().validity || "—"}</div>
                            </div>
                            <div>
                              <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                                Prazo de execução
                              </div>
                              <div class="mt-1 text-xs font-medium">{prop().deadline}</div>
                            </div>
                            <div>
                              <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                                Investimento
                              </div>
                              <div class="mt-1 font-mono text-xs font-semibold">{brl(prop().value)}</div>
                            </div>
                          </div>

                          {/* Sobre esta proposta */}
                          <section class="flex flex-col gap-2">
                            <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                              Sobre esta proposta
                            </div>
                            <p class="m-0 text-sm leading-relaxed text-[#0B1220]">{prop().summary}</p>
                          </section>

                          {/* Escopo */}
                          <section class="flex flex-col gap-2">
                            <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                              Escopo
                            </div>
                            <p class="m-0 text-sm leading-relaxed text-[#2b3444]">{prop().scope}</p>
                          </section>

                          {/* Investimento Items */}
                          <section class="flex flex-col">
                            <div class="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                              Investimento
                            </div>
                            <Show
                              when={prop().items.length > 0}
                              fallback={
                                <div class="rounded-lg border border-dashed border-[#b9c0b5] p-4 text-xs text-[#5E6878]">
                                  Valores em cálculo pelo agente Comercial.
                                </div>
                              }
                            >
                              <div class="flex flex-col">
                                <For each={prop().items}>
                                  {(it) => (
                                    <div class="flex items-center justify-between border-b border-[#dfe3dc] py-2.5 text-xs text-[#0B1220]">
                                      <span>{it.desc}</span>
                                      <span class="font-mono">{brl(it.value)}</span>
                                    </div>
                                  )}
                                </For>
                                <div class="mt-2.5 flex items-center justify-between rounded-lg bg-[#0B1220] p-3 text-xs text-white">
                                  <span class="font-semibold">Total</span>
                                  <span class="font-mono font-semibold text-[var(--lime)]">{brl(prop().value)}</span>
                                </div>
                              </div>
                            </Show>
                          </section>

                          {/* Aceite eletrônico */}
                          <section class="flex flex-col gap-2.5 rounded-xl border border-[#dfe3dc] p-5 text-xs">
                            <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E6878]">
                              Aceite eletrônico
                            </div>
                            <Show when={isSigned()}>
                              <div class="flex flex-col gap-1">
                                <span class="font-semibold text-[#0B1220]">Assinado por {accept()[1]}</span>
                                <span class="font-mono text-[11px] text-[#5E6878]">
                                  {accept()[2]} · assinatura eletrônica registrada
                                </span>
                              </div>
                            </Show>
                            <Show when={isRefused()}>
                              <span class="font-semibold text-[oklch(0.55_0.19_27)]">
                                Proposta recusada pelo cliente em {accept()[2]}
                              </span>
                            </Show>
                            <Show when={isAwaiting()}>
                              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div class="flex h-11 items-end border-b border-[#0B1220] pb-1 text-xs text-[#5E6878]">
                                  Nome completo
                                </div>
                                <div class="flex h-11 items-end border-b border-[#0B1220] pb-1 text-xs text-[#5E6878]">
                                  Assinatura
                                </div>
                              </div>
                              <div class="mt-2 flex items-center gap-3">
                                <span class="flex h-9 items-center rounded-full bg-[var(--lime)] px-5 text-xs font-semibold text-[#25360a]">
                                  Aceitar e assinar
                                </span>
                                <span class="text-xs text-[#5E6878]">Botão do cliente · inativo na prévia</span>
                              </div>
                            </Show>
                          </section>

                          {/* Footer */}
                          <footer class="flex flex-wrap items-center gap-3 border-t border-[#dfe3dc] pt-3 text-[11px] text-[#5E6878]">
                            <span>TAVIR · Tecnologia, Automação, Valor, Inteligência</span>
                            <span class="flex-1" />
                            <span class="font-mono">{linkBar()}</span>
                          </footer>
                        </div>
                      </article>
                    </div>
                  </div>
                </Show>
              </div>
            </>
          );
        }}
      </Show>

      {/* NEW PROPOSAL MODAL */}
      <Show when={newPropOpen()}>
        <div
          onClick={() => setNewPropOpen(false)}
          class="fixed inset-0 z-40 bg-[rgba(7,12,22,.62)]"
        />
        <div
          role="dialog"
          aria-label="Nova proposta"
          class="fixed left-1/2 top-1/2 z-50 flex w-[520px] max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[18px] border border-[rgba(244,246,242,.34)] bg-[#0f1729] shadow-[0_24px_60px_rgba(0,0,0,.5)]"
        >
          <div class="flex items-center justify-between border-b border-[rgba(244,246,242,.10)] px-6 py-4">
            <h3 class="m-0 text-base font-semibold text-[var(--cloud)]">Nova Proposta</h3>
            <button
              onClick={() => setNewPropOpen(false)}
              class="h-7 rounded-full border border-[rgba(244,246,242,.16)] bg-transparent px-2.5 text-xs text-[var(--cloud)] hover:border-[var(--teal)]"
            >
              Fechar
            </button>
          </div>
          <form onSubmit={handleCreateProposal} class="flex flex-col gap-4 p-6">
            <label class="flex flex-col gap-1.5 text-xs">
              <span class="text-[var(--muted,#aeb7c4)]">Cliente *</span>
              <input
                required
                value={newClient()}
                onInput={(e) => setNewClient(e.currentTarget.value)}
                placeholder="Nome da empresa ou cliente"
                class="h-8 rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3 text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
              />
            </label>
            <label class="flex flex-col gap-1.5 text-xs">
              <span class="text-[var(--muted,#aeb7c4)]">Resumo / Objetivo</span>
              <textarea
                value={newSummary()}
                onInput={(e) => setNewSummary(e.currentTarget.value)}
                rows={2}
                placeholder="Ex.: Landing page institucional com integração ao CRM"
                class="rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] p-2.5 text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
              />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-xs">
                <span class="text-[var(--muted,#aeb7c4)]">Valor estimado (R$)</span>
                <input
                  value={newValue()}
                  onInput={(e) => setNewValue(e.currentTarget.value)}
                  placeholder="Ex.: 25.000"
                  class="h-8 rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3 font-mono text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
                />
              </label>
              <label class="flex flex-col gap-1.5 text-xs">
                <span class="text-[var(--muted,#aeb7c4)]">Prazo de execução</span>
                <input
                  value={newDeadline()}
                  onInput={(e) => setNewDeadline(e.currentTarget.value)}
                  placeholder="Ex.: 4 semanas"
                  class="h-8 rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] px-3 text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
                />
              </label>
            </div>
            <label class="flex flex-col gap-1.5 text-xs">
              <span class="text-[var(--muted,#aeb7c4)]">Escopo inicial</span>
              <textarea
                value={newScope()}
                onInput={(e) => setNewScope(e.currentTarget.value)}
                rows={2}
                placeholder="Principais entregas e funcionalidades"
                class="rounded-lg border border-[rgba(244,246,242,.16)] bg-[#0B1220] p-2.5 text-xs text-[var(--cloud)] outline-none focus:border-[var(--teal)]"
              />
            </label>
            <div class="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewPropOpen(false)}
                class="h-8 rounded-full border border-[rgba(244,246,242,.16)] bg-transparent px-3 text-xs text-[var(--cloud)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="h-8 rounded-full border-none bg-[var(--lime)] px-4 text-xs font-semibold text-[#25360a] hover:opacity-90"
              >
                Salvar proposta
              </button>
            </div>
          </form>
        </div>
      </Show>
    </div>
  );
}
