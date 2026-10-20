import { For, createSignal } from "solid-js";
import { TvIcon } from "../../../../shared/components/TvIcon";
import { showToast } from "../../../../state/store";
import type { ContentProfile } from "../../demoData";
import {
  EditInstructionsModal,
  type EditorialInstructions,
} from "../EditInstructionsModal";

const RADAR = [
  {
    n: "01",
    title: "A fadiga das ferramentas de produtividade",
    source: "Google Trends",
    signal: "+184% em buscas",
  },
  {
    n: "02",
    title: "Equipes pequenas operando com agentes",
    source: "Repertório",
    signal: "6 cases novos",
  },
  {
    n: "03",
    title: "Conteúdo com prova de processo",
    source: "Seu histórico",
    signal: "1.8× saves",
  },
];

const DEFAULT_LINES = [
  "Começar pela tensão, nunca pelo conceito",
  "Priorizar exemplos operacionais reais",
  "Evitar promessa de atalho ou fórmula mágica",
  "Fechar com ação que gere salvamento",
];

export function OraclePanel(props: {
  profile: ContentProfile;
  onNovaRodada?: () => void;
}) {
  const [editOpen, setEditOpen] = createSignal(false);
  const [instructions, setInstructions] = createSignal<EditorialInstructions>({
    lines: [...DEFAULT_LINES],
    toneOfVoice: props.profile.designSystem.toneOfVoice,
  });

  return (
    <div>
      <div class="stu-ws-page-head">
        <div>
          <p class="stu-ws-eyebrow">Inteligência editorial</p>
          <h1>Mesa do Oráculo</h1>
          <p>
            Transforme sinais, repertório e dados de {props.profile.handle} em pautas que merecem uma
            decisão humana.
          </p>
        </div>
        <button type="button" class="stu-btn-lg" onClick={() => props.onNovaRodada?.()}>
          <TvIcon name="sparkles" width="14" height="14" />
          Nova rodada
        </button>
      </div>

      <div class="stu-orac-status">
        <span class="stu-ws-dot" aria-hidden="true" />
        Pesquisa ativa · cruzando radar e repertório deste perfil
      </div>

      <div class="stu-card">
        <div class="stu-card-head">
          <h2 class="stu-card-title">Radar desta semana</h2>
          <span class="stu-dash-muted">14 fontes</span>
        </div>
        <div class="stu-orac-radar">
          <For each={RADAR}>
            {(item) => (
              <article class="stu-orac-radar-card">
                <span class="stu-orac-num">{item.n}</span>
                <h3>{item.title}</h3>
                <div class="stu-orac-radar-meta">
                  <span>{item.source}</span>
                  <strong>{item.signal}</strong>
                </div>
              </article>
            )}
          </For>
        </div>
      </div>

      <div class="stu-card">
        <div class="stu-card-head">
          <div>
            <h2 class="stu-card-title">Instruções editoriais</h2>
            <p class="stu-muted-line">
              Contexto aplicado em toda pauta deste perfil.
            </p>
          </div>
          <button type="button" class="stu-btn-sm" onClick={() => setEditOpen(true)}>
            Editar instruções
          </button>
        </div>
        <ul class="stu-orac-instructions">
          <For each={instructions().lines}>{(line) => <li>{line}</li>}</For>
        </ul>
        <div class="stu-orac-voice">
          <span>Tom de voz</span>
          <strong>{instructions().toneOfVoice}</strong>
        </div>
      </div>

      <EditInstructionsModal
        open={editOpen()}
        initial={instructions()}
        onClose={() => setEditOpen(false)}
        onSave={(next) => {
          setInstructions(next);
          setEditOpen(false);
          showToast("Instruções editoriais atualizadas", "Mesa do Oráculo", "success");
        }}
      />
    </div>
  );
}
