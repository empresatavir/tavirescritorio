/** Navegação do console — sem dados fictícios. */

export type FabricaViewId = "overview" | "topology" | "ledger" | "workspace" | "chat";
export type WorkspaceSubview =
  | "board"
  | "docs"
  | "files"
  | "qa"
  | "security"
  | "agents"
  | "roadmap"
  | "access";

export const SUBNAV: Array<{ id: WorkspaceSubview; label: string; glyph: string; group: string }> = [
  { id: "board", label: "Kanban", glyph: "KB", group: "Operação do projeto" },
  { id: "docs", label: "Documentos gerados", glyph: "DG", group: "Operação do projeto" },
  { id: "files", label: "Arquivos", glyph: "AR", group: "Operação do projeto" },
  { id: "qa", label: "Completion Guard & QA", glyph: "QA", group: "Operação do projeto" },
  { id: "security", label: "Security", glyph: "SE", group: "Operação do projeto" },
  { id: "roadmap", label: "Roadmap", glyph: "RM", group: "Planejamento" },
  { id: "agents", label: "Agentes", glyph: "AG", group: "Planejamento" },
  { id: "access", label: "Acessos", glyph: "AC", group: "Acesso seguro" },
];
