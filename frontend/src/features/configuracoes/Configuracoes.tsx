import { A, useParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal, type JSX } from "solid-js";
import { api, parseApiError } from "../../shared/api/client";
import { setTheme, theme } from "../../state/store";
import { GradeMotores, type MotorCard } from "./Motores";
import "./configuracoes.css";

const ABAS = [
  ["perfil", "Perfil"],
  ["visao", "Visão geral"],
  ["projetos", "Projetos"],
  ["credenciais", "Integrações"],
  ["memorias", "Memórias"],
  ["agentes", "Motor IA"],
  ["sistema", "Sistema"],
] as const;

type Aba = (typeof ABAS)[number][0];
type ProjectRow = Awaited<ReturnType<typeof api.getOfficeSettings>>["projects"][number];

const EMPTY_CONTROL = {
  active: true,
  watch: false,
  automation: {
    auto_entender: false,
    auto_refinar: false,
    auto_corrigir: false,
    auto_compilar: false,
    auto_entregar: false,
    novas_entram_manuais: true,
  },
  auto_types: [] as string[],
  refino_destino: "dossie",
  secoes_excluidas: "",
  build_command: "",
  build_artifact: "",
  sla_criacao: "",
  sla_manutencao: "",
  sla_correcao: "",
  bases: [] as string[],
};

const DOMINIOS = ["psicologia", "copywriting", "negocios", "engenharia", "mercados", "frameworks", "design"];

const AUTOMACAO = [
  ["auto_entender", "Entender sozinho", "A demanda sai do rascunho sem clique."],
  ["auto_refinar", "Refinar sozinho", "O refino segue quando o entendimento existe."],
  ["auto_corrigir", "Corrigir sozinho", "Só depois do aceite, e só com a falha registrada."],
  ["auto_compilar", "Compilar sozinho", "Roda o comando. Sem comando, a etapa fica bloqueada."],
  ["auto_entregar", "Entregar sozinho", "Desligado, o pacote espera em Aprovações."],
  ["novas_entram_manuais", "Demandas novas entram manuais", "Cada demanda nova nasce fora da automação."],
] as const;

function subpasta(base: string | null, nome: string) {
  if (!base) return "";
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${sep}${nome}`;
}

function aviso(err: unknown, fallback: string) {
  const text = parseApiError(err).detail.replace(/^API \d+:\s*/, "");
  return text || fallback;
}

function monograma(nome: string) {
  const limpo = nome.replace(/[^A-Za-z0-9]/g, "");
  return (limpo.slice(0, 2) || "PR").toUpperCase();
}

function Cartao(props: { titulo: string; dica?: string; children: JSX.Element }) {
  return (
    <section class="cartao vc-cartao">
      <header class="cartao-cabeca">
        <div>
          <h2>{props.titulo}</h2>
          <Show when={props.dica}>
            <p>{props.dica}</p>
          </Show>
        </div>
      </header>
      <div class="cartao-corpo">{props.children}</div>
    </section>
  );
}

function Interruptor(props: { checked: boolean; titulo: string; dica?: string; onChange: (value: boolean) => void }) {
  return (
    <label class="interruptor">
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.currentTarget.checked)} />
      <span class="interruptor-trilha" />
      <span class="interruptor-textos">
        <strong>{props.titulo}</strong>
        <Show when={props.dica}>
          <span>{props.dica}</span>
        </Show>
      </span>
    </label>
  );
}

function controlFrom(project: ProjectRow) {
  const raw = project.control || {};
  const automation = { ...EMPTY_CONTROL.automation, ...(raw.automation || {}) };
  const slas = Array.isArray(raw.slas) ? raw.slas : [];
  const sla = (tipo: string) => slas.find((item: { tipo: string }) => item.tipo === tipo)?.dias ?? "";
  return {
    active: raw.active !== false,
    watch: Boolean(raw.watch),
    automation,
    auto_types: Array.isArray(raw.auto_types) ? raw.auto_types : [],
    refino_destino: raw.refino_destino === "docs" ? "docs" : "dossie",
    secoes_excluidas: Array.isArray(raw.secoes_excluidas) ? raw.secoes_excluidas.join(", ") : "",
    build_command: raw.build_command || "",
    build_artifact: raw.build_artifact || "",
    sla_criacao: String(sla("criacao")),
    sla_manutencao: String(sla("manutencao")),
    sla_correcao: String(sla("correcao")),
    bases: Array.isArray(raw.bases) ? raw.bases : [],
  };
}

export function Configuracoes() {
  const params = useParams<{ aba?: string }>();
  const aba = createMemo<Aba>(() => {
    const alias: Record<string, Aba> = { integracoes: "credenciais", motor: "agentes" };
    const id = alias[params.aba || ""] || params.aba;
    const found = ABAS.find(([item]) => item === id);
    return found ? found[0] : "perfil";
  });
  const [nome, setNome] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [idioma, setIdioma] = createSignal("pt");
  const [overview, setOverview] = createSignal({
    fabrica: true,
    aprovacoes: true,
    prazos: true,
    ordem: ["jobs", "escalados", "cards", "precisa"],
  });
  const [projects, setProjects] = createSignal<ProjectRow[]>([]);
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [form, setForm] = createSignal({ ...EMPTY_CONTROL });
  const [demandTitle, setDemandTitle] = createSignal("");
  const [demandType, setDemandType] = createSignal("criacao");
  const [novoNome, setNovoNome] = createSignal("");
  const [memory, setMemory] = createSignal<{ casa: { name: string }[]; projeto: { name: string }[]; agente: { name: string }[] }>({
    casa: [],
    projeto: [],
    agente: [],
  });
  const [motors, setMotors] = createSignal<MotorCard[]>([]);
  const [chaves, setChaves] = createSignal<Record<string, { api_key: string; base_url: string }>>({});
  const [notice, setNotice] = createSignal("");
  const [error, setError] = createSignal("");
  const [editorAberto, setEditorAberto] = createSignal(false);

  const selected = createMemo(() => projects().find((item) => item.id === selectedId()) || null);

  const blocoNome: Record<string, string> = {
    jobs: "Jobs rodando",
    escalados: "Escalados",
    cards: "Cards ativos",
    precisa: "Precisa de você",
  };

  const moverBloco = (id: string, dir: -1 | 1) => {
    const list = [...overview().ordem];
    const at = list.indexOf(id);
    const next = at + dir;
    if (at < 0 || next < 0 || next >= list.length) return;
    const [item] = list.splice(at, 1);
    list.splice(next, 0, item);
    setOverview({ ...overview(), ordem: list });
  };

  const load = async () => {
    const data = await api.getOfficeSettings();
    setNome(data.perfil.nome || "");
    setEmail(data.perfil.email || "");
    setIdioma(data.perfil.idioma || "pt");
    setOverview({
      fabrica: data.overview.fabrica,
      aprovacoes: data.overview.aprovacoes,
      prazos: data.overview.prazos,
      ordem: data.overview.ordem?.length ? data.overview.ordem : ["jobs", "escalados", "cards", "precisa"],
    });
    setProjects(data.projects);
    const focus = data.projects.find((item) => item.focused) || data.projects[0] || null;
    setSelectedId(focus?.id || null);
    if (focus) setForm(controlFrom(focus));
  };

  createEffect(() => {
    void aba();
    void load().catch((err) => setError(aviso(err, "Falha ao abrir configurações")));
  });

  createEffect(() => {
    const current = selected();
    if (current) setForm(controlFrom(current));
  });

  const loadMotors = async () => {
    const data = await api.listMotors();
    setMotors(data.motors);
  };

  const alternarMotor = (motor: MotorCard) => {
    setError("");
    void api.setAiEngine(motor.id, !motor.enabled).then(async () => {
      await loadMotors();
      setNotice(motor.enabled ? `${motor.label} desligada.` : `${motor.label} ligada.`);
    }).catch((err) => setError(aviso(err, "Não alterou o motor")));
  };

  const padraoMotor = (motor: MotorCard) => {
    setError("");
    void api.setDefaultAiEngine(motor.id).then(async () => {
      await loadMotors();
      setNotice(`${motor.label} é o padrão do chat.`);
    }).catch((err) => setError(aviso(err, "Não virou o padrão")));
  };

  const plugarMotor = (motor: MotorCard) => {
    const row = chaves()[motor.id] || { api_key: "", base_url: "" };
    setError("");
    void api.plugMotor(motor.id, row.api_key.trim(), row.base_url.trim()).then(async (data) => {
      setMotors(data.motors);
      setChaves((prev) => ({ ...prev, [motor.id]: { api_key: "", base_url: "" } }));
      setNotice(`${motor.label} plugado. A chave fica só nesta máquina.`);
    }).catch((err) => setError(aviso(err, "Não plugou")));
  };

  const entrarMotor = (motor: MotorCard) => {
    setError("");
    void api.loginMotor(motor.id).then(async (data) => {
      setMotors(data.motors);
      if (data.login.error) setError(data.login.error);
      else if (data.login.url) setNotice("Conclua o login no navegador.");
      else if (data.login.logged_in) setNotice(`${motor.label} já está conectado.`);
      else setNotice(`${motor.label} aberto para o login.`);
    }).catch((err) => setError(aviso(err, "Não abriu o login")));
  };

  createEffect(() => {
    if (aba() !== "credenciais" && aba() !== "agentes") return;
    void loadMotors().catch((err) => setError(aviso(err, "Sem motores")));
  });

  createEffect(() => {
    const id = selectedId();
    if (aba() !== "memorias" || !id) return;
    void api.getProjectMemory(id).then(setMemory).catch((err) => setError(aviso(err, "Sem memória")));
  });

  const patch = (partial: Record<string, unknown>) => setForm({ ...form(), ...partial });
  const patchAuto = (key: string, value: boolean) =>
    setForm({ ...form(), automation: { ...form().automation, [key]: value } });

  const criarProjeto = async () => {
    setError("");
    try {
      await api.createOfficeProject(novoNome());
      setNovoNome("");
      setNotice("Projeto criado.");
      await load();
    } catch (err) {
      setError(aviso(err, "Não criou o projeto"));
    }
  };

  const saveControl = async () => {
    const project = selected();
    if (!project) return;
    setError("");
    const slas = [
      ["criacao", form().sla_criacao],
      ["manutencao", form().sla_manutencao],
      ["correcao", form().sla_correcao],
    ]
      .filter(([, days]) => String(days).trim())
      .map(([tipo, days]) => ({ tipo, dias: Number(days) }));
    const secoes = form()
      .secoes_excluidas.split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => item > 0);
    try {
      const saved = await api.saveProjectControl(project.id, {
        active: form().active,
        watch: form().watch,
        automation: form().automation,
        auto_types: form().auto_types,
        refino_destino: form().refino_destino,
        secoes_excluidas: secoes,
        build_command: form().build_command,
        build_artifact: form().build_artifact,
        slas,
        bases: form().bases,
      });
      setProjects((prev) => prev.map((item) => (item.id === project.id ? { ...item, control: saved.control } : item)));
      setNotice("Projeto salvo.");
    } catch (err) {
      setError(aviso(err, "Não salvou"));
    }
  };

  const abrirEditor = (id: string) => {
    setSelectedId(id);
    setEditorAberto(true);
  };

  return (
    <div class="vc">
      <nav class="abas-mini vc-abas" aria-label="Seções das configurações">
        <For each={ABAS}>
          {([id, label]) => (
            <A class="aba-mini" href={`/configuracoes/${id}`} data-ativa={aba() === id ? "sim" : "nao"}>
              {label}
            </A>
          )}
        </For>
      </nav>

      <Show when={error()}>
        <div class="aviso-faixa" data-tom="erro">{error()}</div>
      </Show>
      <Show when={notice()}>
        <div class="aviso-faixa" data-tom="sucesso">{notice()}</div>
      </Show>

      <Show when={aba() === "perfil"}>
        <div class="secao-config">
          <Cartao titulo="Perfil" dica="Seu nome e idioma — a Sala usa os dois na saudação.">
            <div class="linha-campos">
              <label class="campo">
                <span class="campo-rotulo">Nome</span>
                <input class="entrada" aria-label="Nome" value={nome()} onInput={(event) => setNome(event.currentTarget.value)} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">E-mail</span>
                <input class="entrada" type="email" aria-label="E-mail" value={email()} onInput={(event) => setEmail(event.currentTarget.value)} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Idioma</span>
                <select class="entrada" aria-label="Idioma" value={idioma()} onChange={(event) => setIdioma(event.currentTarget.value)}>
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            <span class="campo-dica">É assim que a Sala te cumprimenta.</span>
            <div class="vc-acoes">
              <button
                class="btn btn-primario"
                type="button"
                onClick={() =>
                  void api.saveOfficeProfile(nome(), email(), idioma()).then(() => setNotice("Perfil salvo.")).catch((err) => setError(err.message))
                }
              >
                Salvar perfil
              </button>
              <a class="btn" href="/api/v1/ledger/export" download="ledger.txt">
                Exportar livro-razão
              </a>
            </div>
          </Cartao>
        </div>
      </Show>

      <Show when={aba() === "visao"}>
        <div class="secao-config">
          <Cartao titulo="Visão geral" dica="Escolha quais blocos a sala mostra.">
            <div class="vc-painel">
              <details class="vc-painel-grupo" open>
                <summary class="vc-painel-rot">Blocos visíveis</summary>
                <span class="campo-dica">Marque o que a sala deve manter à vista.</span>
                <div class="vc-painel-chips">
                  <For each={[
                    ["fabrica", "Fábrica ativa", overview().fabrica],
                    ["aprovacoes", "Aprovações pendentes", overview().aprovacoes],
                    ["prazos", "Demandas no prazo", overview().prazos],
                  ] as const}>
                    {([key, rotulo, on]) => (
                      <button
                        type="button"
                        class="rel-editar-chip"
                        data-on={on || undefined}
                        onClick={() => setOverview({ ...overview(), [key]: !on })}
                      >
                        <span class="rel-editar-check" data-on={on || undefined} />
                        {rotulo}
                      </button>
                    )}
                  </For>
                </div>
              </details>
              <div class="vc-painel-grupo" style={{ display: "flex", "flex-direction": "column", gap: "8px", "margin-top": "12px" }}>
                <span class="vc-painel-rot">Ordem na Sala</span>
                <For each={overview().ordem}>
                  {(id, index) => (
                    <div data-block={id} style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                      <span style={{ flex: "1" }}>{blocoNome[id] || id}</span>
                      <button type="button" aria-label={`Subir ${blocoNome[id] || id}`} disabled={index() === 0} onClick={() => moverBloco(id, -1)}>
                        Subir
                      </button>
                      <button type="button" aria-label={`Descer ${blocoNome[id] || id}`} disabled={index() === overview().ordem.length - 1} onClick={() => moverBloco(id, 1)}>
                        Descer
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div class="vc-acoes">
              <button class="btn btn-primario" type="button" onClick={() => void api.saveOfficeOverview(overview()).then(() => setNotice("Visão salva."))}>
                Salvar visão
              </button>
            </div>
          </Cartao>
        </div>
      </Show>

      <Show when={aba() === "projetos"}>
        <div class="secao-config">
          <div class="vpr-cabecalho">
            <h2>Projetos</h2>
            <span class="vpr-conta">{projects().length}</span>
          </div>
          <label class="campo">
            <span class="campo-rotulo">Nome do projeto</span>
            <input class="entrada" aria-label="Nome do projeto" value={novoNome()} onInput={(event) => setNovoNome(event.currentTarget.value)} />
          </label>
          <button class="btn btn-primario" type="button" onClick={() => void criarProjeto()}>Novo projeto</button>
          <Show when={projects().length} fallback={<div class="vazio"><strong>Nenhum projeto cadastrado.</strong><p>Quando um projeto existir nesta máquina, ele aparece aqui.</p></div>}>
            <div class="pilha vpr-lista">
              <For each={projects()}>
                {(project) => {
                  const base = project.local_path;
                  return (
                    <article class="cartao vpr-cartao" data-foco={project.focused ? "sim" : "nao"} data-ativo={project.control?.active === false ? "nao" : "sim"}>
                      <header class="cartao-cabeca vpr-topo">
                        <div class="vpr-monograma" aria-hidden="true">{monograma(project.name)}</div>
                        <div class="vpr-identidade">
                          <div class="vpr-nome">
                            <h2>{project.name}</h2>
                            <Show when={project.focused}>
                              <span class="selo" data-tom="ativo">Em foco</span>
                            </Show>
                            <Show when={project.control?.active !== false} fallback={<span class="selo" data-tom="neutro">Pausado</span>}>
                              <span class="selo" data-tom="sucesso">Ativo</span>
                            </Show>
                          </div>
                          <div class="vpr-jira">
                            <span class="vpr-chip mono">{project.slug}</span>
                            <span class="vpr-chip">{project.template_code || "sem esteira"}</span>
                            <span class="vpr-chip">{project.client || "sem cliente"}</span>
                          </div>
                        </div>
                        <div class="vpr-acoes">
                          <Show when={!project.focused}>
                            <button class="btn btn-pequeno vpr-focar" type="button" onClick={() => void api.saveOfficeFocus(project.id).then(() => load())}>
                              Colocar em foco
                            </button>
                          </Show>
                          <button class="btn btn-pequeno" type="button" onClick={() => abrirEditor(project.id)}>
                            Editar
                          </button>
                        </div>
                      </header>
                      <div class="cartao-corpo vpr-corpo">
                        <div>
                          <span class="vpr-bloco-titulo">Pastas desta máquina</span>
                          <div class="vpr-roots">
                            <For each={[["Fonte", "fonte"], ["Demandas", "demandas"], ["Entrega", "entrega"]] as const}>
                              {([rotulo, nome]) => (
                                <div class="vpr-root" data-vazio={base ? "nao" : "sim"}>
                                  <strong>{rotulo}</strong>
                                  <span class="mono" title={subpasta(base, nome) || undefined}>{base ? subpasta(base, nome) : "ainda sem pasta"}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={aba() === "credenciais"}>
        <div class="secao-config">
          <GradeMotores
            modo="integracoes"
            motors={motors()}
            chaves={chaves()}
            onChave={(id, apiKey, baseUrl) => setChaves((prev) => ({ ...prev, [id]: { api_key: apiKey, base_url: baseUrl } }))}
            onToggle={alternarMotor}
            onDefault={padraoMotor}
            onPlug={plugarMotor}
            onLogin={entrarMotor}
          />
        </div>
      </Show>

      <Show when={aba() === "memorias"}>
        <div class="secao-config">
          <Cartao titulo={`Memórias de ${selected()?.name || "nenhum projeto"}`} dica="Candidatas só entram no índice do projeto depois do aceite.">
            <For each={[["Casa", memory().casa, false], ["Projeto", memory().projeto, false], ["Candidatas", memory().agente, true]] as const}>
              {([titulo, lista, curar]) => (
                <div class="vc-subgrupo">
                  <h3>{titulo}</h3>
                  <Show when={lista.length} fallback={<p class="campo-dica">Nenhuma nota nesta gaveta.</p>}>
                    <For each={lista}>
                      {(item) => (
                        <div class="arquivo-item">
                          <span>{item.name}</span>
                          <Show when={curar && selected()}>
                            <span class="vpr-acoes">
                              <button class="btn btn-pequeno btn-primario" type="button" onClick={() => void api.approveProjectMemory(selected()!.id, item.name).then(() => api.getProjectMemory(selected()!.id).then(setMemory))}>
                                Aprovar
                              </button>
                              <button class="btn btn-pequeno btn-perigo" type="button" onClick={() => void api.rejectProjectMemory(selected()!.id, item.name).then(() => api.getProjectMemory(selected()!.id).then(setMemory))}>
                                Rejeitar
                              </button>
                            </span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              )}
            </For>
          </Cartao>
        </div>
      </Show>

      <Show when={aba() === "agentes"}>
        <div class="secao-config">
          <GradeMotores
            modo="motor"
            motors={motors()}
            chaves={chaves()}
            onChave={(id, apiKey, baseUrl) => setChaves((prev) => ({ ...prev, [id]: { api_key: apiKey, base_url: baseUrl } }))}
            onToggle={alternarMotor}
            onDefault={padraoMotor}
            onPlug={plugarMotor}
            onLogin={entrarMotor}
          />
        </div>
      </Show>

      <Show when={aba() === "sistema"}>
        <div class="secao-config">
          <Cartao titulo="Sistema" dica="Portas desta máquina, tema e parada da esteira. As portas não se editam aqui.">
            <table class="tabela">
              <tbody>
                <tr>
                  <td>API</td>
                  <td>9001</td>
                </tr>
                <tr>
                  <td>Interface</td>
                  <td>9002</td>
                </tr>
                <tr>
                  <td>Tema</td>
                  <td>{theme() === "light" ? "claro" : "escuro"}</td>
                </tr>
              </tbody>
            </table>
            <div class="vc-acoes">
              <button class="btn" type="button" onClick={() => setTheme(theme() === "dark" ? "light" : "dark")}>
                Alternar tema
              </button>
              <button class="btn btn-perigo" type="button" onClick={() => void api.haltFactory().then((row) => setNotice(`Esteira parada. Processos: ${row.stopped}.`))}>
                Parar a esteira
              </button>
            </div>
          </Cartao>
        </div>
      </Show>

      <Show when={editorAberto() && selected()}>
        <div class="gaveta-fundo" onClick={() => setEditorAberto(false)} />
        <aside class="gaveta" role="dialog" aria-label="Projeto" onKeyDown={(event) => event.key === "Escape" && setEditorAberto(false)}>
          <header class="gaveta-cabeca">
            <div class="vpr-monograma" aria-hidden="true">{monograma(selected()!.name)}</div>
            <div class="vc-flex1" style={{ flex: "1", "min-width": "0" }}>
              <h2>{selected()!.name}</h2>
              <p>{selected()!.slug} · {selected()!.template_code || "sem esteira"}</p>
            </div>
            <button class="btn btn-discreto" type="button" onClick={() => setEditorAberto(false)}>Fechar</button>
          </header>
          <div class="gaveta-corpo">
            <Interruptor checked={form().active} titulo="Ativo" dica="Entra em listas e relatórios." onChange={(value) => patch({ active: value })} />
            <Interruptor checked={form().watch} titulo="Vigiar demandas novas" dica="A fábrica pode puxar demanda nova sozinha." onChange={(value) => patch({ watch: value })} />
            <div class="vc-subgrupo">
              <h3>Automação</h3>
              <For each={AUTOMACAO}>
                {([key, titulo, dica]) => (
                  <Interruptor checked={Boolean(form().automation[key])} titulo={titulo} dica={dica} onChange={(value) => patchAuto(key, value)} />
                )}
              </For>
            </div>
            <div class="vc-subgrupo">
              <h3>Tipos na automação</h3>
              <span class="campo-dica">Nenhum marcado significa todos os tipos.</span>
              <div class="vc-painel-chips">
                <For each={[["criacao", "Criação"], ["manutencao", "Manutenção"], ["correcao", "Correção"]] as const}>
                  {([tipo, rotulo]) => {
                    const on = form().auto_types.includes(tipo);
                    return (
                      <button
                        type="button"
                        class="rel-editar-chip"
                        data-on={on || undefined}
                        onClick={() => patch({ auto_types: on ? form().auto_types.filter((item) => item !== tipo) : [...form().auto_types, tipo] })}
                      >
                        <span class="rel-editar-check" data-on={on || undefined} />
                        {rotulo}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="vc-subgrupo linha-campos">
              <label class="campo">
                <span class="campo-rotulo">Destino do refino</span>
                <select class="entrada" value={form().refino_destino} onChange={(event) => patch({ refino_destino: event.currentTarget.value })}>
                  <option value="dossie">Dossiê</option>
                  <option value="docs">Docs</option>
                </select>
              </label>
              <label class="campo">
                <span class="campo-rotulo">Seções excluídas</span>
                <input class="entrada" value={form().secoes_excluidas} placeholder="2, 4" onInput={(event) => patch({ secoes_excluidas: event.currentTarget.value })} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Comando de compilação</span>
                <input class="entrada" value={form().build_command} onInput={(event) => patch({ build_command: event.currentTarget.value })} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Artefato</span>
                <input class="entrada" value={form().build_artifact} onInput={(event) => patch({ build_artifact: event.currentTarget.value })} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Prazo criação (dias)</span>
                <input class="entrada" value={form().sla_criacao} onInput={(event) => patch({ sla_criacao: event.currentTarget.value })} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Prazo manutenção (dias)</span>
                <input class="entrada" value={form().sla_manutencao} onInput={(event) => patch({ sla_manutencao: event.currentTarget.value })} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Prazo correção (dias)</span>
                <input class="entrada" value={form().sla_correcao} onInput={(event) => patch({ sla_correcao: event.currentTarget.value })} />
              </label>
            </div>
            <div class="vc-subgrupo">
              <h3>Bases do vault</h3>
              <span class="campo-dica">Nenhuma marcada: a etapa escolhe as páginas.</span>
              <div class="vc-painel-chips">
                <For each={DOMINIOS}>
                  {(dominio) => {
                    const on = form().bases.includes(dominio);
                    return (
                      <button
                        type="button"
                        class="rel-editar-chip"
                        data-on={on || undefined}
                        onClick={() => patch({ bases: on ? form().bases.filter((item) => item !== dominio) : [...form().bases, dominio] })}
                      >
                        <span class="rel-editar-check" data-on={on || undefined} />
                        {dominio}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="vc-subgrupo linha-campos">
              <label class="campo">
                <span class="campo-rotulo">Nova demanda</span>
                <input class="entrada" value={demandTitle()} placeholder="Título" onInput={(event) => setDemandTitle(event.currentTarget.value)} />
              </label>
              <label class="campo">
                <span class="campo-rotulo">Tipo</span>
                <select class="entrada" value={demandType()} onChange={(event) => setDemandType(event.currentTarget.value)}>
                  <option value="criacao">Criação</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="correcao">Correção</option>
                </select>
              </label>
            </div>
          </div>
          <footer class="gaveta-pe">
            <button
              class="btn"
              type="button"
              onClick={() =>
                void api
                  .createFactoryDemand(selected()!.id, { title: demandTitle(), type: demandType(), opt_out: false })
                  .then(async (row) => {
                    await api.saveOfficeFocus(selected()!.id, row.id);
                    setNotice(`Demanda ${row.code} aberta.`);
                    setDemandTitle("");
                  })
                  .catch((err) => setError(aviso(err, "Não abriu a demanda")))
              }
            >
              Abrir demanda
            </button>
            <span class="espaco" />
            <button class="btn btn-discreto" type="button" onClick={() => setEditorAberto(false)}>Cancelar</button>
            <button class="btn btn-primario" type="button" onClick={() => void saveControl()}>Salvar projeto</button>
          </footer>
        </aside>
      </Show>
    </div>
  );
}

