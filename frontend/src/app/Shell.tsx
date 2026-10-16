import type { ParentProps } from "solid-js";
import { Rail } from "./Rail";
import { SubNav } from "./SubNav";
import { Header } from "./Header";
import { JobModal } from "./JobModal";
import { CommandPalette } from "./CommandPalette";
import { ToastContainer } from "./ToastContainer";

export function Shell(props: ParentProps) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "grid",
        "grid-template-columns": "56px 212px minmax(0, 1fr)",
        background: "var(--surface-0)",
        color: "var(--text-primary)",
        "font-size": "13px",
        overflow: "hidden",
      }}
    >
      {/* Coluna 1: Rail de Domínios (56px) */}
      <Rail />

      {/* Coluna 2: Sub-navegação e status local (212px) */}
      <SubNav />

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
        <Header />
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
    </div>
  );
}