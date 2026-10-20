import { EmptyState } from "./EmptyState";

export function AccessPanel() {
  return (
    <EmptyState
      title="Sem credenciais registradas"
      text="Acessos e secrets do projeto serão listados quando houver integração real de vault/keys."
    />
  );
}
