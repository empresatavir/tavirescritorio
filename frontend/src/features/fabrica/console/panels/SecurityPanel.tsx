import { EmptyState } from "./EmptyState";

export function SecurityPanel() {
  return (
    <EmptyState
      title="Sem varreduras de segurança"
      text="Planos SAST/LGPD e relatórios aparecem quando a esteira executar essas etapas."
    />
  );
}
