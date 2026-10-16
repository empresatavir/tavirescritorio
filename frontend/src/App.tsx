import { Router, Route } from "@solidjs/router";
import { Shell } from "./app/Shell";
import { Home } from "./features/home/Home";

export default function App() {
  return (
    <Router root={Shell}>
      <Route path="/" component={Home} />
      <Route path="/execucoes" component={() => <div class="p-6 text-[var(--text-body)]">Execuções — em construção</div>} />
      <Route path="/tasks" component={() => <div class="p-6 text-[var(--text-body)]">Tasks — em construção</div>} />
      <Route path="/aprovacoes" component={() => <div class="p-6 text-[var(--text-body)]">Aprovações — em construção</div>} />
      <Route path="/bloqueios" component={() => <div class="p-6 text-[var(--text-body)]">Bloqueios — em construção</div>} />
      <Route path="/agentes" component={() => <div class="p-6 text-[var(--text-body)]">Agentes — em construção</div>} />
      <Route path="/alteracoes" component={() => <div class="p-6 text-[var(--text-body)]">Alterações — em construção</div>} />
      <Route path="/sala-operacao" component={() => <div class="p-6 text-[var(--text-body)]">Sala de Operação — em construção</div>} />
      <Route path="/chat/*" component={() => <div class="p-6 text-[var(--text-body)]">Chat — em construção</div>} />
      <Route path="/studio" component={() => <div class="p-6 text-[var(--text-body)]">Studio — em construção</div>} />
      <Route path="/fabrica" component={() => <div class="p-6 text-[var(--text-body)]">Fábrica — em construção</div>} />
      <Route path="/flow" component={() => <div class="p-6 text-[var(--text-body)]">Flow — em construção</div>} />
      <Route path="/edicao" component={() => <div class="p-6 text-[var(--text-body)]">Edição — em construção</div>} />
      <Route path="/analytics" component={() => <div class="p-6 text-[var(--text-body)]">Analytics — em construção</div>} />
      <Route path="/doctor" component={() => <div class="p-6 text-[var(--text-body)]">Doctor — em construção</div>} />
      <Route path="/integracoes" component={() => <div class="p-6 text-[var(--text-body)]">Integrações — em construção</div>} />
      <Route path="/skills" component={() => <div class="p-6 text-[var(--text-body)]">Skills — em construção</div>} />
      <Route path="/org-chart" component={() => <div class="p-6 text-[var(--text-body)]">Org Chart — em construção</div>} />
      <Route path="/cerebro" component={() => <div class="p-6 text-[var(--text-body)]">Cérebro — em construção</div>} />
      <Route path="/memoria" component={() => <div class="p-6 text-[var(--text-body)]">Memória — em construção</div>} />
      <Route path="/dados" component={() => <div class="p-6 text-[var(--text-body)]">Dados — em construção</div>} />
      <Route path="/projetos" component={() => <div class="p-6 text-[var(--text-body)]">Projetos — em construção</div>} />
      <Route path="/ideias" component={() => <div class="p-6 text-[var(--text-body)]">Ideias — em construção</div>} />
      <Route path="/mapa" component={() => <div class="p-6 text-[var(--text-body)]">Mapa — em construção</div>} />
      <Route path="/mission-control" component={() => <div class="p-6 text-[var(--text-body)]">Mission Control — em construção</div>} />
      <Route path="/roadmap" component={() => <div class="p-6 text-[var(--text-body)]">Roadmap — em construção</div>} />
      <Route path="/reference" component={() => <div class="p-6 text-[var(--text-body)]">Reference — em construção</div>} />
      <Route path="/funnel" component={() => <div class="p-6 text-[var(--text-body)]">Funnel — em construção</div>} />
      <Route path="/finances" component={() => <div class="p-6 text-[var(--text-body)]">Finances — em construção</div>} />
      <Route path="/propostas" component={() => <div class="p-6 text-[var(--text-body)]">Propostas — em construção</div>} />
      <Route path="/content" component={() => <div class="p-6 text-[var(--text-body)]">Content — em construção</div>} />
      <Route path="/personas" component={() => <div class="p-6 text-[var(--text-body)]">Personas — em construção</div>} />
      <Route path="/workflows" component={() => <div class="p-6 text-[var(--text-body)]">Workflows — em construção</div>} />
      <Route path="/social" component={() => <div class="p-6 text-[var(--text-body)]">Social — em construção</div>} />
      <Route path="/plataformas" component={() => <div class="p-6 text-[var(--text-body)]">Plataformas — em construção</div>} />
      <Route path="/comunicacoes" component={() => <div class="p-6 text-[var(--text-body)]">Comunicações — em construção</div>} />
      <Route path="/biblioteca" component={() => <div class="p-6 text-[var(--text-body)]">Biblioteca — em construção</div>} />
      <Route path="/login" component={() => <div class="p-6 text-[var(--text-body)]">Login — em construção</div>} />
      <Route path="/design-system" component={() => <div class="p-6 text-[var(--text-body)]">Design System — em construção</div>} />
      <Route path="/onboarding" component={() => <div class="p-6 text-[var(--text-body)]">Onboarding — em construção</div>} />
      <Route path="/*404" component={() => <div class="p-6 text-[var(--text-body)]">Rota não encontrada</div>} />
    </Router>
  );
}