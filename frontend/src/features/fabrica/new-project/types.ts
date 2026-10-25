export type NewProjectTrack = "zero" | "pronto" | "especificado" | "manutencao";

/** Escopo de pasta no disco: interno → tavir-interno · externo → tavir-exterrno */
export type NewProjectOwnership = "interno" | "externo";

export interface NewProjectSubmitPayload {
  name: string;
  company?: string;
  ownership: NewProjectOwnership;
  track: NewProjectTrack;
  context_files: string[];
  context_file_blobs?: File[];
  design_system_files: string[];
  design_system_file_blobs?: File[];
  stack_frontend?: string;
  stack_backend?: string;
  stack_database?: string;
  template_category?: "lp" | "of" | "sy";
}

export interface NewProjectModalReactProps {
  open: boolean;
  preferredCategory?: "lp" | "of" | "sy";
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: NewProjectSubmitPayload) => Promise<void>;
}
