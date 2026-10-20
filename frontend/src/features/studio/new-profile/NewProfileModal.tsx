import { For, Show, createEffect, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { TvIcon } from "../../../shared/components/TvIcon";
import {
  NET_META,
  type ContentProfile,
  type SocialNet,
  type StudioDesignSystem,
} from "../demoData";
import "./modal.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (profile: ContentProfile) => void;
}

const ALL_NETS: SocialNet[] = ["ig", "yt", "li"];

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function NewProfileModal(props: Props) {
  const [step, setStep] = createSignal(0);
  const [name, setName] = createSignal("");
  const [handle, setHandle] = createSignal("");
  const [company, setCompany] = createSignal("");
  const [niche, setNiche] = createSignal("");
  const [audience, setAudience] = createSignal("");
  const [selectedNets, setSelectedNets] = createSignal<SocialNet[]>(["ig"]);
  const [netUrls, setNetUrls] = createSignal<Record<SocialNet, string>>({
    ig: "",
    yt: "",
    li: "",
  });
  const [netHandles, setNetHandles] = createSignal<Record<SocialNet, string>>({
    ig: "",
    yt: "",
    li: "",
  });
  const [ds, setDs] = createSignal<StudioDesignSystem>({
    primary: "#0B1220",
    secondary: "#F4F6F2",
    accent: "#B7F34A",
    fontDisplay: "Instrument Sans",
    fontBody: "Instrument Sans",
    toneOfVoice: "",
    doList: "",
    dontList: "",
    visualNotes: "",
  });
  const [notes, setNotes] = createSignal("");

  createEffect(() => {
    if (!props.open) {
      setStep(0);
      setName("");
      setHandle("");
      setCompany("");
      setNiche("");
      setAudience("");
      setSelectedNets(["ig"]);
      setNetUrls({ ig: "", yt: "", li: "" });
      setNetHandles({ ig: "", yt: "", li: "" });
      setNotes("");
    }
  });

  const toggleNet = (net: SocialNet) => {
    setSelectedNets((prev) => {
      if (prev.includes(net)) {
        if (prev.length === 1) return prev;
        return prev.filter((n) => n !== net);
      }
      return [...prev, net];
    });
  };

  const canContinue = () => {
    if (step() === 0) return name().trim().length > 1 && company().trim().length > 0;
    if (step() === 1) return selectedNets().length > 0;
    if (step() === 2) return ds().toneOfVoice.trim().length > 0;
    return true;
  };

  const submit = () => {
    const id = `pf-${Date.now().toString(36)}`;
    const h = handle().trim() || `@${name().trim().toLowerCase().replace(/\s+/g, "")}`;
    const profile: ContentProfile = {
      id,
      name: name().trim(),
      handle: h.startsWith("@") ? h : `@${h}`,
      niche: niche().trim() || "Sem nicho definido",
      audience: audience().trim() || "Audiência a definir",
      company: company().trim(),
      color: ds().accent || "#B7F34A",
      initials: initialsFrom(name()),
      nets: selectedNets().map((net) => ({
        net,
        handle: netHandles()[net] || h,
        url: netUrls()[net] || "",
        followers: 0,
        engagement: 0,
      })),
      designSystem: { ...ds() },
      cycleGoal: 12,
      cycleDone: 0,
      status: "active",
    };
    // notes reserved for future backend context
    void notes();
    props.onCreated(profile);
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="stu-modal-root" role="presentation">
          <button type="button" class="stu-modal-backdrop" aria-label="Fechar" onClick={props.onClose} />
          <div class="stu-modal" role="dialog" aria-modal="true" aria-labelledby="stu-np-title">
            <header class="stu-modal-head">
              <div>
                <p class="stu-modal-step">Passo {step() + 1} de 3 · Novo perfil</p>
                <h2 id="stu-np-title">
                  {step() === 0 && "Identidade do perfil"}
                  {step() === 1 && "Redes sociais"}
                  {step() === 2 && "Design system & voz"}
                </h2>
                <p class="stu-modal-lead">
                  {step() === 0 && "Nome, empresa e posicionamento editorial."}
                  {step() === 1 && "Instagram, YouTube e LinkedIn — só as que forem usar."}
                  {step() === 2 && "Cores, tipografia, tom de voz e diretrizes visuais."}
                </p>
              </div>
              <button type="button" class="stu-modal-close" onClick={props.onClose} aria-label="Fechar">
                <TvIcon name="circle-x" width="18" height="18" />
              </button>
            </header>

            <div class="stu-modal-body">
              <Show when={step() === 0}>
                <div class="stu-modal-grid">
                  <label class="stu-field">
                    <span>Nome do perfil *</span>
                    <input value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="Ex.: Datavir" />
                  </label>
                  <label class="stu-field">
                    <span>Handle principal</span>
                    <input value={handle()} onInput={(e) => setHandle(e.currentTarget.value)} placeholder="@datavir" />
                  </label>
                  <label class="stu-field">
                    <span>Empresa dona *</span>
                    <input value={company()} onInput={(e) => setCompany(e.currentTarget.value)} placeholder="TAVIR · Datavir" />
                  </label>
                  <label class="stu-field">
                    <span>Nicho</span>
                    <input value={niche()} onInput={(e) => setNiche(e.currentTarget.value)} placeholder="Dados e BI para PMEs" />
                  </label>
                  <label class="stu-field stu-field-full">
                    <span>Audiência</span>
                    <input
                      value={audience()}
                      onInput={(e) => setAudience(e.currentTarget.value)}
                      placeholder="Quem consome este conteúdo?"
                    />
                  </label>
                  <label class="stu-field stu-field-full">
                    <span>Contexto / restrições</span>
                    <textarea
                      rows={3}
                      value={notes()}
                      onInput={(e) => setNotes(e.currentTarget.value)}
                      placeholder="O que o Oráculo e os squads precisam saber sobre este perfil…"
                    />
                  </label>
                </div>
              </Show>

              <Show when={step() === 1}>
                <div class="stu-net-pick">
                  <For each={ALL_NETS}>
                    {(net) => {
                      const on = () => selectedNets().includes(net);
                      return (
                        <div class="stu-net-pick-card" classList={{ "is-on": on() }}>
                          <button type="button" class="stu-net-pick-toggle" onClick={() => toggleNet(net)}>
                            <img src={NET_META[net].logo} alt="" width="18" height="18" />
                            <strong>{NET_META[net].label}</strong>
                            <span class="stu-check" classList={{ "is-on": on() }} aria-hidden="true">
                              {on() ? "✓" : ""}
                            </span>
                          </button>
                          <Show when={on()}>
                            <label class="stu-field">
                              <span>Handle / canal</span>
                              <input
                                value={netHandles()[net]}
                                onInput={(e) =>
                                  setNetHandles((prev) => ({ ...prev, [net]: e.currentTarget.value }))
                                }
                                placeholder={net === "ig" ? "@marca" : "Nome do canal"}
                              />
                            </label>
                            <label class="stu-field">
                              <span>Link</span>
                              <input
                                value={netUrls()[net]}
                                onInput={(e) =>
                                  setNetUrls((prev) => ({ ...prev, [net]: e.currentTarget.value }))
                                }
                                placeholder={`https://${net === "ig" ? "instagram.com" : net === "yt" ? "youtube.com" : "linkedin.com"}/...`}
                              />
                            </label>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>

              <Show when={step() === 2}>
                <div class="stu-modal-grid">
                  <label class="stu-field">
                    <span>Cor primária</span>
                    <input
                      type="color"
                      value={ds().primary}
                      onInput={(e) => setDs((p) => ({ ...p, primary: e.currentTarget.value }))}
                    />
                  </label>
                  <label class="stu-field">
                    <span>Cor secundária</span>
                    <input
                      type="color"
                      value={ds().secondary}
                      onInput={(e) => setDs((p) => ({ ...p, secondary: e.currentTarget.value }))}
                    />
                  </label>
                  <label class="stu-field">
                    <span>Accent</span>
                    <input
                      type="color"
                      value={ds().accent}
                      onInput={(e) => setDs((p) => ({ ...p, accent: e.currentTarget.value }))}
                    />
                  </label>
                  <label class="stu-field">
                    <span>Fonte display</span>
                    <input
                      value={ds().fontDisplay}
                      onInput={(e) => setDs((p) => ({ ...p, fontDisplay: e.currentTarget.value }))}
                    />
                  </label>
                  <label class="stu-field">
                    <span>Fonte body</span>
                    <input
                      value={ds().fontBody}
                      onInput={(e) => setDs((p) => ({ ...p, fontBody: e.currentTarget.value }))}
                    />
                  </label>
                  <label class="stu-field stu-field-full">
                    <span>Tom de voz *</span>
                    <input
                      value={ds().toneOfVoice}
                      onInput={(e) => setDs((p) => ({ ...p, toneOfVoice: e.currentTarget.value }))}
                      placeholder="Ex.: confiante, transparente, sem jargão"
                    />
                  </label>
                  <label class="stu-field">
                    <span>Fazer</span>
                    <textarea
                      rows={2}
                      value={ds().doList}
                      onInput={(e) => setDs((p) => ({ ...p, doList: e.currentTarget.value }))}
                      placeholder="Prova, números, CTA claro…"
                    />
                  </label>
                  <label class="stu-field">
                    <span>Evitar</span>
                    <textarea
                      rows={2}
                      value={ds().dontList}
                      onInput={(e) => setDs((p) => ({ ...p, dontList: e.currentTarget.value }))}
                      placeholder="Hype, promessas irreais…"
                    />
                  </label>
                  <label class="stu-field stu-field-full">
                    <span>Notas visuais</span>
                    <textarea
                      rows={2}
                      value={ds().visualNotes}
                      onInput={(e) => setDs((p) => ({ ...p, visualNotes: e.currentTarget.value }))}
                      placeholder="Contraste, safe zones, estilo de foto…"
                    />
                  </label>
                </div>
              </Show>
            </div>

            <footer class="stu-modal-foot">
              <Show
                when={step() > 0}
                fallback={
                  <button type="button" class="stu-btn-ghost" onClick={props.onClose}>
                    Cancelar
                  </button>
                }
              >
                <button type="button" class="stu-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                  Voltar
                </button>
              </Show>
              <Show
                when={step() < 2}
                fallback={
                  <button type="button" class="stu-btn-solid" disabled={!canContinue()} onClick={submit}>
                    Criar perfil
                  </button>
                }
              >
                <button
                  type="button"
                  class="stu-btn-solid"
                  disabled={!canContinue()}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continuar
                </button>
              </Show>
            </footer>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
