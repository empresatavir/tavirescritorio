import { Show, createResource } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { FabricaDashboard } from "./dashboard/FabricaDashboard";
import { FabricaConsole } from "./console/FabricaConsole";
import { api, type ProjectItem } from "../../shared/api/client";

async function loadProject(id: string): Promise<{
  id: string;
  name: string;
  company: string;
  templateCode?: string | null;
  stagesDone: number;
  totalStages: number;
  status: string;
}> {
  if (!id) throw new Error("projectId ausente");

  try {
    const fp = await api.getFactoryProject(id);
    return {
      id: fp.id,
      name: fp.name,
      company: fp.company || fp.client || "—",
      templateCode: fp.template_code,
      stagesDone: fp.stages_done,
      totalStages: fp.total_stages,
      status: fp.status,
    };
  } catch {
    /* fall through */
  }

  const list = await api.listProjects();
  const hit = list.find((p: ProjectItem) => p.id === id);
  if (hit) {
    return {
      id: hit.id,
      name: hit.name,
      company: hit.company || hit.client || "—",
      templateCode: hit.template_code,
      stagesDone: hit.stages_done,
      totalStages: hit.total_stages,
      status: hit.status,
    };
  }

  throw new Error(`Projeto ${id} não encontrado`);
}

/** Console operacional vinculado exclusivamente a um projectId. */
export function FabricaProjectConsole() {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = () => params.projectId || "";

  const [project] = createResource(projectId, loadProject);

  return (
    <Show
      when={project()}
      fallback={
        <div
          style={{
            height: "100%",
            display: "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            gap: "12px",
            padding: "24px",
            color: "var(--text-primary)",
          }}
        >
          <Show
            when={project.error}
            fallback={<p style={{ color: "var(--text-secondary)" }}>Carregando console do projeto…</p>}
          >
            <p>Projeto não encontrado.</p>
            <button
              type="button"
              onClick={() => navigate("/fabrica")}
              style={{
                height: "34px",
                padding: "0 14px",
                "border-radius": "999px",
                border: "none",
                background: "var(--action-bg, var(--lime))",
                color: "var(--action-fg, #0B1220)",
                "font-weight": "600",
                cursor: "pointer",
              }}
            >
              Voltar ao dashboard
            </button>
          </Show>
        </div>
      }
    >
      {(pj) => (
        <FabricaConsole
          projectId={pj().id}
          projectName={pj().name}
          projectCompany={pj().company}
          onBackToDashboard={() => navigate("/fabrica")}
        />
      )}
    </Show>
  );
}

/** Rota `/fabrica` — apenas o dashboard (templates + projetos). */
export function Fabrica() {
  return <FabricaDashboard />;
}
