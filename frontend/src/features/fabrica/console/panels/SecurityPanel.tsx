import { createEffect, createSignal } from "solid-js";
import { api, type GuardDossier } from "../../../../shared/api/client";
import { GuardBoard } from "./GuardBoard";

export function SecurityPanel(props: { projectId: string; onToast?: (m: string) => void }) {
  const [report, setReport] = createSignal<GuardDossier | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [running, setRunning] = createSignal(false);

  const load = async () => {
    setLoading(true);
    try {
      setReport(await api.getFactorySecurity(props.projectId));
    } catch (err) {
      props.onToast?.(err instanceof Error ? err.message : "Falha ao carregar a segurança");
    } finally {
      setLoading(false);
    }
  };

  const plan = async () => {
    setRunning(true);
    props.onToast?.("Sérgio Seg/LGPD está lendo o projeto e montando o roteiro.");
    try {
      const next = await api.planFactorySecurity(props.projectId);
      setReport(next);
      props.onToast?.(
        next.agent_error
          ? `O roteiro inicial foi gravado. O especialista não concluiu: ${next.agent_error}`
          : "Roteiro de verificação gravado em qa/security-roteiro.md.",
      );
    } catch (err) {
      props.onToast?.(err instanceof Error ? err.message : "Não foi possível montar o roteiro.");
    } finally {
      setRunning(false);
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
      running={running()}
      unit="regras de segurança"
      runLabel="Montar roteiro"
      flowTitle="Fluxo de auditoria"
      flowHint="A rotina é deste projeto. O especialista confirma o roteiro e o que ainda precisa de prova."
      rulesTitle="Roteiro de verificação"
      returnsTitle="Retornos da auditoria"
      returnsHint="Achados da varredura e o parecer já gravado"
      evidenceHint="Parecer, log da varredura, HTML e prints de segurança."
      onRun={() => void plan()}
    />
  );
}
