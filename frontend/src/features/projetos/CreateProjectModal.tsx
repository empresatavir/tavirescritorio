import type { Component } from "solid-js";
import { NewProjectModalHost } from "../fabrica/new-project/NewProjectModalHost";
import type { ProjectItem } from "../../shared/api/client";

export interface CreateProjectModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCreated?: (project: ProjectItem) => void;
}

/** Modal canônico de Novo Projeto — island React + Radix Themes. */
export const CreateProjectModal: Component<CreateProjectModalProps> = (props) => {
  return (
    <NewProjectModalHost
      open={props.isOpen ?? true}
      onClose={props.onClose}
      onCreated={props.onCreated}
    />
  );
};
