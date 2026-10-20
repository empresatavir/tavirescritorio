import { Router, Route } from "@solidjs/router";
import { Shell } from "./app/Shell";
import { SalaOperacao } from "./features/sala-operacao/SalaOperacao";
import { Execucoes } from "./features/execucoes/Execucoes";
import { Tasks } from "./features/tasks/Tasks";
import { Aprovacoes } from "./features/aprovacoes/Aprovacoes";
import { Agentes } from "./features/agentes/Agentes";
import { Chat } from "./features/chat/Chat";
import { Studio } from "./features/studio/Studio";
import { Fabrica, FabricaProjectConsole } from "./features/fabrica/Fabrica";
import { Integracoes } from "./features/integracoes/Integracoes";
import { Cerebro } from "./features/cerebro/Cerebro";
import { Mapa } from "./features/mapa/Mapa";
import { Propostas } from "./features/propostas/Propostas";
import { Visibilidade } from "./features/visibilidade/Visibilidade";
import { GenericPageView } from "./features/common/GenericPageView";
import { Login } from "./features/login/Login";
import { DesignSystem } from "./features/design-system/DesignSystem";
import { Onboarding } from "./features/onboarding/Onboarding";

export default function App() {
  return (
    <Router root={Shell}>
      {/* Operação */}
      <Route path="/" component={SalaOperacao} />
      <Route path="/sala-operacao" component={SalaOperacao} />
      <Route path="/execucoes" component={Execucoes} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/aprovacoes" component={Aprovacoes} />
      <Route path="/bloqueios" component={() => <GenericPageView pageId="blocks" />} />
      <Route path="/agentes" component={Agentes} />
      <Route path="/alteracoes" component={() => <GenericPageView pageId="changes" />} />

      {/* Chat */}
      <Route path="/chat" component={Chat} />
      <Route path="/chat/*" component={Chat} />

      {/* Módulos */}
      <Route path="/studio" component={Studio} />
      <Route path="/studio/:profileId" component={StudioWorkspace} />
      <Route path="/fabrica" component={Fabrica} />
      <Route path="/fabrica/:projectId" component={FabricaProjectConsole} />
      <Route path="/flow" component={() => <GenericPageView pageId="flow" />} />
      <Route path="/edicao" component={() => <GenericPageView pageId="edicao" />} />

      {/* Visibilidade */}
      <Route path="/visibilidade" component={Visibilidade} />
      <Route path="/analytics" component={() => <GenericPageView pageId="analytics" />} />
      <Route path="/doctor" component={() => <GenericPageView pageId="doctor" />} />
      <Route path="/integracoes" component={Integracoes} />
      <Route path="/skills" component={() => <GenericPageView pageId="skills" />} />
      <Route path="/org-chart" component={() => <GenericPageView pageId="org" />} />

      {/* Conhecimento */}
      <Route path="/cerebro" component={Cerebro} />
      <Route path="/memoria" component={() => <GenericPageView pageId="memory" />} />
      <Route path="/dados" component={() => <GenericPageView pageId="data" />} />
      <Route path="/projetos" component={() => <GenericPageView pageId="projects" />} />
      <Route path="/ideias" component={() => <GenericPageView pageId="ideas" />} />

      {/* Mapa / Tática */}
      <Route path="/mapa" component={Mapa} />
      <Route path="/mission-control" component={() => <GenericPageView pageId="mission" />} />
      <Route path="/roadmap" component={() => <GenericPageView pageId="roadmap" />} />
      <Route path="/reference" component={() => <GenericPageView pageId="reference" />} />

      {/* Comercial */}
      <Route path="/funnel" component={() => <GenericPageView pageId="funnel" />} />
      <Route path="/finances" component={() => <GenericPageView pageId="finances" />} />
      <Route path="/propostas" component={Propostas} />
      <Route path="/content" component={() => <GenericPageView pageId="content" />} />
      <Route path="/personas" component={() => <GenericPageView pageId="personas" />} />

      {/* Social / Workflows */}
      <Route path="/workflows" component={() => <GenericPageView pageId="workflows" />} />
      <Route path="/social" component={() => <GenericPageView pageId="social" />} />
      <Route path="/plataformas" component={() => <GenericPageView pageId="platforms" />} />
      <Route path="/comunicacoes" component={() => <GenericPageView pageId="comms" />} />
      <Route path="/biblioteca" component={() => <GenericPageView pageId="library" />} />

      {/* Utilitários & Auxiliares */}
      <Route path="/login" component={Login} />
      <Route path="/design-system" component={DesignSystem} />
      <Route path="/onboarding" component={Onboarding} />
      <Route
        path="/*404"
        component={() => (
          <div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <h2 class="text-xl font-semibold text-[var(--cloud)]">Página não encontrada</h2>
            <p class="text-xs text-[var(--t2,#cbd3de)]">
              A rota solicitada não existe ou foi movida.
            </p>
            <a
              href="/sala-operacao"
              class="mt-2 inline-flex h-8 items-center rounded-full bg-[var(--lime)] px-4 text-xs font-semibold text-[#25360a]"
            >
              Voltar à Sala de Operação
            </a>
          </div>
        )}
      />
    </Router>
  );
}