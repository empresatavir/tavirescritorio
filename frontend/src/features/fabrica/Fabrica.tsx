import { FabricaDashboard } from "./dashboard/FabricaDashboard";

/** Console operacional — mesmo shell `.fab` do painel, com projeto aberto no main-pane. */
export function FabricaProjectConsole() {
  return <FabricaDashboard />;
}

/** Rota `/fabrica` — painel (templates + projetos). */
export function Fabrica() {
  return <FabricaDashboard />;
}
