import { For } from "solid-js";
import type { ContentProfile } from "../../demoData";

const HOOK_BARS = [
  { day: "Seg", h: 42 },
  { day: "Ter", h: 78 },
  { day: "Qua", h: 55 },
  { day: "Qui", h: 88 },
  { day: "Sex", h: 64 },
  { day: "Sáb", h: 36 },
  { day: "Dom", h: 48 },
];

const ANGLES = [
  { label: "Contrarian", score: 92 },
  { label: "Bastidores", score: 78 },
  { label: "Framework prático", score: 71 },
  { label: "Análise de tendência", score: 54 },
];

export function LearningPanel(props: {
  profile: ContentProfile;
  publishedCount: number;
  onRegister?: () => void;
}) {
  const cyclePct = () =>
    Math.round((props.profile.cycleDone / Math.max(props.profile.cycleGoal, 1)) * 100);

  return (
    <div>
      <div class="stu-ws-page-head">
        <div>
          <p class="stu-ws-eyebrow">Memória da operação</p>
          <h1>Aprendizados & Metas</h1>
          <p>
            O que funcionou volta para o Oráculo como contexto — sem substituir sua leitura editorial
            em {props.profile.handle}.
          </p>
        </div>
        <button type="button" class="stu-btn-sm" onClick={() => props.onRegister?.()}>
          Registrar métricas
        </button>
      </div>

      <div class="stu-learn-kpis">
        <article class="stu-learn-kpi">
          <span>Melhor formato</span>
          <strong>Carrossel</strong>
          <em>+38% salvamentos</em>
        </article>
        <article class="stu-learn-kpi">
          <span>Melhor gancho</span>
          <strong>Contrarian</strong>
          <em>72% retenção</em>
        </article>
        <article class="stu-learn-kpi">
          <span>Melhor janela</span>
          <strong>Ter · 18h</strong>
          <em>1.6× alcance</em>
        </article>
        <article class="stu-learn-kpi">
          <span>Meta do ciclo</span>
          <strong>
            {props.profile.cycleDone} / {props.profile.cycleGoal}
          </strong>
          <em>{cyclePct()}% concluída · {props.publishedCount} pubs</em>
          <div class="stu-ws-cycle-bar" style={{ "margin-top": "10px" }}>
            <div class="stu-ws-cycle-fill" style={{ width: `${cyclePct()}%` }} />
          </div>
        </article>
      </div>

      <div class="stu-learn-split">
        <div class="stu-card">
          <div class="stu-card-head">
            <div>
              <h2 style={{ margin: 0, "font-size": "16px" }}>Retenção por gancho</h2>
              <p style={{ margin: "4px 0 0", "font-size": "12px", color: "var(--text-muted)" }}>
                Média das últimas 12 publicações
              </p>
            </div>
            <span class="stu-learn-delta">+14%</span>
          </div>
          <div class="stu-learn-chart" aria-hidden="true">
            <For each={HOOK_BARS}>
              {(b) => (
                <div class="stu-learn-bar-col">
                  <div class="stu-learn-bar" style={{ height: `${b.h}%` }} />
                  <span>{b.day}</span>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="stu-card">
          <div class="stu-card-head">
            <h2 style={{ margin: 0, "font-size": "16px" }}>Ângulos comprovados</h2>
          </div>
          <ul class="stu-learn-angles">
            <For each={ANGLES}>
              {(a) => (
                <li>
                  <div class="stu-learn-angle-row">
                    <span>{a.label}</span>
                    <strong>{a.score}</strong>
                  </div>
                  <div class="stu-learn-angle-track">
                    <div class="stu-learn-angle-fill" style={{ width: `${a.score}%` }} />
                  </div>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>

      <div class="stu-learn-grid">
        <article class="stu-learn-item">
          <h3>O que dobrar</h3>
          <p>
            Ganchos com tensão cognitiva e carrosséis de 5 lâminas. Salvamento sobe quando o CTA pede
            ação concreta.
          </p>
        </article>
        <article class="stu-learn-item">
          <h3>O que cortar</h3>
          <p>Aberturas genéricas e CTAs vagos. Queda de retenção quando a tese chega só na lâmina 3.</p>
        </article>
        <article class="stu-learn-item">
          <h3>Próximo ciclo</h3>
          <p>
            Fechar {props.profile.cycleGoal} peças com ≥40% passando em 1ª revisão sem ajuste —
            alimentando o Oráculo com estes ângulos.
          </p>
        </article>
        <article class="stu-learn-item">
          <h3>Audiência</h3>
          <p>{props.profile.audience}</p>
        </article>
      </div>
    </div>
  );
}
