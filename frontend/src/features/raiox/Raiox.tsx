import { RaioxDashboard } from "./dashboard/RaioxDashboard";

/** Rota `/raiox` — operação do diagnóstico Raio-X TAVIR. */
export function Raiox() {
  return <RaioxDashboard />;
}

export { RaioxWorkspace } from "./workspace/RaioxWorkspace";
