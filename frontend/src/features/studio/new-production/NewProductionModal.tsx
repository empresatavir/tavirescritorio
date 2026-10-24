import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { TvIcon } from "../../../shared/components/TvIcon";
import { api } from "../../../shared/api/client";
import { showToast } from "../../../state/store";
import {
  NET_META,
  SQUADS,
  START_POINTS,
  type ContentProfile,
  type SocialNet,
} from "../demoData";
import "../new-profile/modal.css";

export interface ProductionDraft {
  profileId: string;
  platform: SocialNet;
  squadId: string;
  startPointId: string;
  theme?: string;
  pieceId?: string;
  decisionId?: string;
}

interface Props {
  open: boolean;
  profiles: ContentProfile[];
  /** Quando definido, pula a escolha de perfil (workspace). */
  lockedProfileId?: string;
  preferredPlatform?: SocialNet;
  onClose: () => void;
  onCreated: (draft: ProductionDraft) => void;
}

export function NewProductionModal(props: Props) {
  const locked = () => Boolean(props.lockedProfileId);
  const [step, setStep] = createSignal(0);
  const [profileId, setProfileId] = createSignal("");
  const [platform, setPlatform] = createSignal<SocialNet>("ig");
  const [squadId, setSquadId] = createSignal("oraculo");
  const [startId, setStartId] = createSignal("autonoma");
  const [theme, setTheme] = createSignal("");
  const [squadQuery, setSquadQuery] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  createEffect(() => {
    if (!props.open) {
      setStep(0);
      setTheme("");
      setSquadQuery("");
      return;
    }
    const lock = props.lockedProfileId;
    if (lock) {
      setProfileId(lock);
      setStep(0);
    } else {
      setProfileId(props.profiles[0]?.id || "");
      setStep(0);
    }
    if (props.preferredPlatform) setPlatform(props.preferredPlatform);
  });

  /** Passos: [perfil?] → plataforma → squad → ponto de partida */
  const totalSteps = () => (locked() ? 3 : 4);

  const stepLabel = () => {
    const s = step();
    if (!locked()) {
      if (s === 0) return "Para quem vamos produzir?";
      if (s === 1) return "Qual plataforma será o conteúdo?";
      if (s === 2) return "Qual squad assume esta peça?";
      return "Defina o ponto de partida";
    }
    if (s === 0) return "Qual plataforma será o conteúdo?";
    if (s === 1) return "Qual squad assume esta peça?";
    return "Defina o ponto de partida";
  };

  const stepLead = () => {
    const s = step();
    if (!locked()) {
      if (s === 0) return "O perfil leva voz, repertório e metas para toda a execução.";
      if (s === 1) return "Instagram, YouTube ou LinkedIn — uma peça por plataforma.";
      if (s === 2) return "Você poderá encadear outros squads depois.";
      return "Dê autonomia ao Oráculo ou indique uma direção.";
    }
    if (s === 0) return "A produção ficará vinculada a este perfil.";
    if (s === 1) return "Você poderá encadear outros squads depois.";
    return "Dê autonomia ao Oráculo ou indique uma direção.";
  };

  const isPlatformStep = () => (locked() ? step() === 0 : step() === 1);
  const isSquadStep = () => (locked() ? step() === 1 : step() === 2);
  const isStartStep = () => (locked() ? step() === 2 : step() === 3);
  const isProfileStep = () => !locked() && step() === 0;

  const selectedProfile = createMemo(() =>
    props.profiles.find((p) => p.id === profileId()) || props.profiles[0],
  );

  const availablePlatforms = createMemo((): SocialNet[] => {
    const pf = selectedProfile();
    if (!pf) return ["ig", "yt", "li"];
    const nets = pf.nets.map((n) => n.net);
    return nets.length > 0 ? nets : ["ig", "yt", "li"];
  });

  const filteredSquads = createMemo(() => {
    const q = squadQuery().trim().toLowerCase();
    if (!q) return SQUADS;
    return SQUADS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q),
    );
  });

  const canContinue = () => {
    if (isProfileStep()) return Boolean(profileId());
    if (isPlatformStep()) return Boolean(platform());
    if (isSquadStep()) return Boolean(squadId());
    if (isStartStep()) {
      if (startId() === "manual") return theme().trim().length > 2;
      return Boolean(startId());
    }
    return true;
  };

  const submit = async () => {
    const pid = props.lockedProfileId || profileId();
    if (!pid || submitting()) return;
    setSubmitting(true);
    try {
      const themeVal = startId() === "manual" ? theme().trim() : undefined;
      const result = await api.createStudioProduction({
        profile_id: pid,
        platform: platform(),
        squad_id: squadId(),
        start_point_id: startId(),
        theme: themeVal,
      });
      props.onCreated({
        profileId: pid,
        platform: platform(),
        squadId: squadId(),
        startPointId: startId(),
        theme: themeVal,
        pieceId: result.piece.id,
        decisionId: result.decision?.id,
      });
      showToast("Produção iniciada", "Studio", "success");
    } catch (err) {
      console.warn(err);
      showToast("Falha ao iniciar produção", "Studio", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="stu-modal-root" role="presentation">
          <button type="button" class="stu-modal-backdrop" aria-label="Fechar" onClick={props.onClose} />
          <div class="stu-modal" role="dialog" aria-modal="true" aria-labelledby="stu-prod-title">
            <header class="stu-modal-head">
              <div>
                <p class="stu-modal-step">
                  Passo {step() + 1} de {totalSteps()} · Nova produção
                </p>
                <h2 id="stu-prod-title">{stepLabel()}</h2>
                <p class="stu-modal-lead">{stepLead()}</p>
              </div>
              <button type="button" class="stu-modal-close" onClick={props.onClose} aria-label="Fechar">
                <TvIcon name="circle-x" width="18" height="18" />
              </button>
            </header>

            <div class="stu-modal-body">
              <Show when={isProfileStep()}>
                <div class="stu-pick-grid">
                  <For each={props.profiles}>
                    {(pf) => (
                      <button
                        type="button"
                        class="stu-pick-card"
                        classList={{ "is-on": profileId() === pf.id }}
                        onClick={() => setProfileId(pf.id)}
                      >
                        <span class="stu-pick-avatar" style={{ background: pf.color }}>
                          {pf.initials}
                        </span>
                        <div>
                          <strong>{pf.handle}</strong>
                          <p>{pf.niche}</p>
                        </div>
                        <span class="stu-check" classList={{ "is-on": profileId() === pf.id }}>
                          {profileId() === pf.id ? "✓" : ""}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={isPlatformStep()}>
                <div class="stu-pick-grid stu-pick-3">
                  <For each={availablePlatforms()}>
                    {(net) => (
                      <button
                        type="button"
                        class="stu-pick-card"
                        classList={{ "is-on": platform() === net }}
                        onClick={() => setPlatform(net)}
                      >
                        <img src={NET_META[net].logo} alt="" width="22" height="22" />
                        <div>
                          <strong>{NET_META[net].label}</strong>
                          <p>{NET_META[net].ratio}</p>
                        </div>
                        <span class="stu-check" classList={{ "is-on": platform() === net }}>
                          {platform() === net ? "✓" : ""}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={isSquadStep()}>
                <label class="stu-field" style={{ "margin-bottom": "12px" }}>
                  <span class="sr-only">Buscar squad</span>
                  <input
                    type="search"
                    placeholder="Buscar squad..."
                    value={squadQuery()}
                    onInput={(e) => setSquadQuery(e.currentTarget.value)}
                  />
                </label>
                <div class="stu-pick-grid">
                  <For each={filteredSquads()}>
                    {(sq) => (
                      <button
                        type="button"
                        class="stu-pick-card"
                        classList={{ "is-on": squadId() === sq.id }}
                        onClick={() => setSquadId(sq.id)}
                      >
                        <div>
                          <strong>{sq.name}</strong>
                          <p>{sq.desc}</p>
                        </div>
                        <span class="stu-check" classList={{ "is-on": squadId() === sq.id }}>
                          {squadId() === sq.id ? "✓" : ""}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={isStartStep()}>
                <div class="stu-pick-grid stu-pick-2">
                  <For each={START_POINTS}>
                    {(sp) => (
                      <button
                        type="button"
                        class="stu-pick-card"
                        classList={{ "is-on": startId() === sp.id }}
                        onClick={() => setStartId(sp.id)}
                      >
                        <div>
                          <strong>{sp.name}</strong>
                          <p>{sp.desc}</p>
                        </div>
                        <span class="stu-check" classList={{ "is-on": startId() === sp.id }}>
                          {startId() === sp.id ? "✓" : ""}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
                <Show when={startId() === "manual"}>
                  <label class="stu-field" style={{ "margin-top": "14px" }}>
                    <span>Tema e ângulo</span>
                    <textarea
                      rows={3}
                      value={theme()}
                      onInput={(e) => setTheme(e.currentTarget.value)}
                      placeholder="Ex.: Produtividade para founders · ângulo contrarian"
                    />
                  </label>
                </Show>
                <div class="stu-prod-summary">
                  <p class="stu-modal-step">Resumo</p>
                  <p>
                    <strong>{selectedProfile()?.name}</strong> · {NET_META[platform()].label} ·{" "}
                    {SQUADS.find((s) => s.id === squadId())?.name} ·{" "}
                    {START_POINTS.find((s) => s.id === startId())?.name}
                  </p>
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
                when={step() < totalSteps() - 1}
                fallback={
                  <button
                    type="button"
                    class="stu-btn-solid"
                    disabled={!canContinue() || submitting()}
                    onClick={() => void submit()}
                  >
                    {submitting() ? "Iniciando…" : "Iniciar squad"}
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
