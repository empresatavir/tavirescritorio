import { Show, createEffect, type ParentProps } from "solid-js";
import { useLocation } from "@solidjs/router";
import { Rail } from "./Rail";
import { SubNav } from "./SubNav";
import { Header } from "./Header";
import { JobModal } from "./JobModal";
import { CommandPalette } from "./CommandPalette";
import { ToastContainer } from "./ToastContainer";
import { AiLinkAlert } from "./AiLinkAlert";
import { DOMAINS, setCurrentDomainId, setCurrentScreenId } from "../state/store";

/** Rotas da Fábrica usam o chrome próprio do mock (`.fb-side`), sem SubNav/Header do Escritório. */
function isFabricaPath(pathname: string) {
  return pathname === "/fabrica" || pathname.startsWith("/fabrica/");
}

export function Shell(props: ParentProps) {
  const location = useLocation();
  const fabricaMode = () => isFabricaPath(location.pathname);

  // SubNav some nestas rotas — mantém domínio/tela sincronizados sem o efeito do SubNav.
  createEffect(() => {
    if (!fabricaMode()) return;
    setCurrentScreenId("fabrica");
    for (const dom of DOMAINS) {
      if (dom.items.some((it) => it.id === "fabrica")) {
        setCurrentDomainId(dom.id);
        break;
      }
    }
  });

  return (
    <div
      class="shell"
      classList={{ "shell--fabrica": fabricaMode() }}
      style={{
        height: "100vh",
        width: "100vw",
        display: "grid",
        "grid-template-columns": fabricaMode() ? "64px minmax(0, 1fr)" : "64px 236px minmax(0, 1fr)",
        background: "var(--surface-0)",
        color: "var(--text-primary)",
        "font-size": "13px",
        overflow: "hidden",
      }}
    >
      {/* Coluna 1: Rail de Domínios (64px) */}
      <Rail />

      {/* Coluna 2: Sub-navegação (236px) — omitida na Fábrica (tem `.fb-side`) */}
      <Show when={!fabricaMode()}>
        <SubNav />
      </Show>

      {/* Coluna 3: Header e Área Principal */}
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-width": "0",
          "min-height": "0",
          overflow: "hidden",
        }}
      >
        <Show when={!fabricaMode()}>
          <Header />
        </Show>
        <main
          style={{
            flex: 1,
            "min-height": "0",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {props.children}
        </main>
      </div>

      {/* Modais Globais e Notificações */}
      <JobModal />
      <CommandPalette />
      <ToastContainer />
      <AiLinkAlert />
    </div>
  );
}
