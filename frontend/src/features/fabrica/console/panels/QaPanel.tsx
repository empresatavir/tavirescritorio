import { createEffect, createSignal } from "solid-js";
import { api, type GuardDossier } from "../../../../shared/api/client";
import { GuardBoard } from "./GuardBoard";

export function QaPanel(props: { projectId: string; onToast?: (m: string) => void }) {
  const [report, setReport] = createSignal<GuardDossier | null>(null);
  const [loading, setLoading] = createSignal(false);

  const load = async () => {
    setLoading(true);
    try {
      setReport(await api.getFactoryQa(props.projectId));
    } catch (err) {
      props.onToast?.(err instanceof Error ? err.message : "Falha ao carregar QA");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    void props.projectId;
    void load();
  });

  return (
    <GuardBoard
      projectId={props.projectId}
      dossier={report()}
      loading={loading()}
      unit="regras físicas"
      runLabel="Rodar QA agora"
      flowTitle="Fluxo de QA"
      flowHint="Cada estágio mostra a execução gravada no projeto. O Gate Final exige as regras físicas."
      rulesTitle="Completion Guard · regras físicas"
      returnsTitle="Retornos do QA"
      returnsHint="Resultado de cada validação e o que ficou registrado"
      evidenceHint="HTML, prints e evidências de sucesso ou falha gerados pelo QA."
      onRun={() => void load()}
    />
  );
}
