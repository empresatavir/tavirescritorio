import { createResource, For, Show } from "solid-js";

interface MilestoneRow {
  id: string;
  title: string;
  done: boolean;
}

interface MissionRow {
  id: string;
  title: string;
  period: string;
  progress: string;
  milestones: MilestoneRow[];
}

export function MissionView() {
  const [rows, { refetch }] = createResource(async () => {
    const res = await fetch("/api/v1/missions");
    if (!res.ok) throw new Error("As missões não responderam.");
    const body = (await res.json()) as { missions: MissionRow[] };
    return body.missions;
  });

  const conclude = async (missionId: string, milestoneId: string) => {
    const res = await fetch(`/api/v1/missions/${missionId}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    if (res.ok) void refetch();
  };

  return (
    <div data-screen-label="Mission" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Mission Control</h1>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <For each={rows() || []}>
        {(mission) => (
          <article data-mission={mission.id} style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <div style={{ display: "flex", "justify-content": "space-between", gap: "12px" }}>
              <strong style={{ color: "var(--text-primary)" }}>{mission.title}</strong>
              <span data-progress={mission.progress} style={{ color: "var(--text-secondary)" }}>{mission.progress}</span>
            </div>
            <For each={mission.milestones}>
              {(milestone) => (
                <div data-milestone={milestone.id} style={{ display: "flex", "align-items": "center", gap: "12px" }}>
                  <span style={{ flex: "1", color: "var(--text-primary)" }}>{milestone.title}</span>
                  <Show when={milestone.done} fallback={<button type="button" onClick={() => void conclude(mission.id, milestone.id)}>Concluir marco</button>}>
                    <span>Concluído</span>
                  </Show>
                </div>
              )}
            </For>
          </article>
        )}
      </For>
    </div>
  );
}
