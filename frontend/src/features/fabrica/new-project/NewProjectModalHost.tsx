import { onCleanup, createEffect } from "solid-js";
import { createRoot, type Root } from "react-dom/client";
import { createElement, type ComponentType } from "react";
import { NewProjectModalReact } from "./NewProjectModal.react";
import type { NewProjectModalReactProps, NewProjectSubmitPayload } from "./types";
import { api, type CreateProjectPayload, type ProjectItem } from "../../../shared/api/client";
import { showToast } from "../../../state/store";

export interface NewProjectModalHostProps {
  open: boolean;
  preferredCategory?: "lp" | "of" | "sy";
  onClose?: () => void;
  onCreated?: (project: ProjectItem) => void;
}

const Modal = NewProjectModalReact as ComponentType<NewProjectModalReactProps>;

export function NewProjectModalHost(props: NewProjectModalHostProps) {
  let hostEl!: HTMLDivElement;
  let root: Root | undefined;

  createEffect(() => {
    const open = props.open;
    const preferredCategory = props.preferredCategory;
    if (!hostEl) return;
    if (!root) root = createRoot(hostEl);

    root.render(
      createElement(Modal, {
        open,
        preferredCategory,
        onOpenChange: (nextOpen: boolean) => {
          if (!nextOpen) props.onClose?.();
        },
        onSubmit: async (payload: NewProjectSubmitPayload) => {
          const body: CreateProjectPayload = {
            name: payload.name,
            company: payload.company,
            ownership: payload.ownership,
            track: payload.track,
            context_files: payload.context_files,
            design_system_files: payload.design_system_files,
            design_system_file: payload.design_system_files[0],
            stack_frontend: payload.stack_frontend,
            stack_backend: payload.stack_backend,
            stack_database: payload.stack_database,
            template_category: payload.template_category,
          };
          const created = await api.createProject(body);
          const skipped: string[] = [];
          const save = async (folder: string, file: File) => {
            const safe = file.name.replace(/[\\/]/g, "-");
            const readable = /\.(md|txt|json|csv|html|css|js|jsx|ts|tsx|py|svg)$/i.test(safe) && file.size <= 1_500_000;
            if (!readable) {
              skipped.push(file.name);
              return;
            }
            await api.writeFactoryArtifact(created.id, {
              path: `${folder}/${safe}`,
              content: await file.text(),
              overwrite: true,
            });
          };
          for (const file of payload.context_file_blobs || []) await save("context", file);
          for (const file of payload.design_system_file_blobs || []) await save("design", file);
          let reading = "";
          try {
            const scope = await api.readProjectScope(created.id);
            reading = scope.read_ok
              ? `A Dora leu ${scope.fontes.length} arquivo(s) e gravou o contrato da esteira.`
              : scope.error || "A Dora não concluiu a leitura do escopo.";
          } catch (err) {
            reading = err instanceof Error ? err.message : "A Dora não concluiu a leitura do escopo.";
          }
          const skipNote = skipped.length ? ` Não entram na leitura: ${skipped.join(", ")}.` : "";
          showToast(
            `Projeto "${created.name}" criado. ${reading}${skipNote}`,
            "Fábrica",
            skipped.length || reading.includes("não") ? "warn" : "success",
          );
          props.onCreated?.(created);
        },
      }),
    );
  });

  onCleanup(() => {
    root?.unmount();
    root = undefined;
  });

  return <div ref={hostEl} class="fab-radix-host" data-radix-island="new-project" />;
}
