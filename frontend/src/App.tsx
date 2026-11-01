import { Router, Route, Navigate } from "@solidjs/router";
import { SessionGate } from "./app/SessionGate";
import { SalaOperacao } from "./features/sala-operacao/SalaOperacao";
import { Execucoes } from "./features/execucoes/Execucoes";
import { Tasks } from "./features/tasks/Tasks";
import { Aprovacoes } from "./features/aprovacoes/Aprovacoes";
import { Agentes } from "./features/agentes/Agentes";
import { Chat } from "./features/chat/Chat";
import { Studio, StudioWorkspace } from "./features/studio/Studio";
import { Raiox, RaioxWorkspace } from "./features/raiox/Raiox";
import { Fabrica, FabricaProjectConsole } from "./features/fabrica/Fabrica";
import { Integracoes } from "./features/integracoes/Integracoes";
import { Configuracoes } from "./features/configuracoes/Configuracoes";
import { Cerebro } from "./features/cerebro/Cerebro";
import { MemoriaView } from "./features/cerebro/MemoriaView";
import { IdeiasView } from "./features/cerebro/IdeiasView";
import { MissionView } from "./features/estrategia/MissionView";
import { AnalyticsView } from "./features/sistema/AnalyticsView";
import { DoctorView } from "./features/sistema/DoctorView";
import { SkillsView } from "./features/sistema/SkillsView";
import { OrgView } from "./features/sistema/OrgView";
import { Mapa } from "./features/mapa/Mapa";
import { Propostas } from "./features/propostas/Propostas";
import { GenericPageView } from "./features/common/GenericPageView";
import { ModulesHub } from "./features/modulos/ModulesHub";
import { FlowView } from "./features/flow/FlowView";
import { EdicaoView } from "./features/edicao/EdicaoView";
import { FunilView } from "./features/comercial/FunilView";
import { PersonasView } from "./features/comercial/PersonasView";
import { FinancasView } from "./features/comercial/FinancasView";
import { SocialView } from "./features/social/SocialView";
import { InboxView } from "./features/social/InboxView";
import { Login } from "./features/login/Login";
import { DesignSystem } from "./features/design-system/DesignSystem";
import { Onboarding } from "./features/onboarding/Onboarding";
import { TourView } from "./features/tour/TourView";
import { ComoFunciona } from "./features/tour/ComoFunciona";

export default function App() {
  return (
    <Router root={SessionGate}>
      {/* Operação */}
      <Route path="/" component={SalaOperacao} />
      <Route path="/sala-operacao" component={SalaOperacao} />
      <Route path="/execucoes" component={Execucoes} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/decisoes" component={Aprovacoes} />
      <Route path="/aprovacoes" component={() => <Navigate href="/decisoes" />} />
      <Route path="/bloqueios" component={() => <Navigate href="/decisoes" />} />
      <Route path="/alteracoes" component={() => <Navigate href="/decisoes" />} />
      <Route path="/agentes" component={Agentes} />

      {/* Chat */}
      <Route path="/chat" component={Chat} />
      <Route path="/chat/*" component={Chat} />

      {/* Módulos */}
      <Route path="/modulos" component={ModulesHub} />
      <Route path="/raiox" component={Raiox} />
      <Route path="/raiox/:caseId" component={RaioxWorkspace} />
      <Route path="/studio" component={Studio} />
      <Route path="/studio/:profileId" component={StudioWorkspace} />
      <Route path="/fabrica" component={Fabrica} />
      <Route path="/fabrica/:projectId" component={FabricaProjectConsole} />
      <Route path="/flow" component={FlowView} />
      <Route path="/edicao" component={EdicaoView} />

      {/* Visibilidade */}
      <Route path="/visibilidade" component={() => <Navigate href="/analytics" />} />
      <Route path="/analytics" component={AnalyticsView} />
      <Route path="/doctor" component={DoctorView} />
      <Route path="/integracoes" component={Integracoes} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/configuracoes/:aba" component={Configuracoes} />
      <Route path="/skills" component={SkillsView} />
      <Route path="/org-chart" component={OrgView} />

      {/* Conhecimento */}
      <Route path="/cerebro" component={Cerebro} />
      <Route path="/memoria" component={MemoriaView} />
      <Route path="/dados" component={() => <Navigate href="/memoria" />} />
      <Route path="/projetos" component={() => <Navigate href="/configuracoes" />} />
      <Route path="/ideias" component={IdeiasView} />

      {/* Mapa / Tática */}
      <Route path="/mapa" component={Mapa} />
      <Route path="/mission-control" component={MissionView} />
      <Route path="/roadmap" component={() => <GenericPageView pageId="roadmap" />} />
      <Route path="/reference" component={() => <GenericPageView pageId="reference" />} />

      {/* Comercial */}
      <Route path="/funil" component={FunilView} />
      <Route path="/funnel" component={() => <Navigate href="/funil" />} />
      <Route path="/finances" component={FinancasView} />
      <Route path="/financas" component={() => <Navigate href="/finances" />} />
      <Route path="/propostas" component={Propostas} />
      <Route path="/content" component={() => <GenericPageView pageId="content" />} />
      <Route path="/personas" component={PersonasView} />

      {/* Social / Workflows */}
      <Route path="/workflows" component={() => <Navigate href="/flow" />} />
      <Route path="/social" component={SocialView} />
      <Route path="/plataformas" component={() => <Navigate href="/social" />} />
      <Route path="/comunicacoes" component={InboxView} />
      <Route path="/biblioteca" component={() => <Navigate href="/memoria" />} />

      {/* Utilitários & Auxiliares */}
      <Route path="/login" component={Login} />
      <Route path="/design-system" component={DesignSystem} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/fluxo-guiado" component={TourView} />
      <Route path="/como-funciona" component={ComoFunciona} />
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