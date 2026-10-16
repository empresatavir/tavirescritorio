import { Show } from "solid-js";
import { toastMessage } from "../state/store";
import { Toast } from "../shared/components/Toast";

export function ToastContainer() {
  return (
    <Show when={toastMessage()}>
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          "z-index": 999,
          animation: "slideInRight 150ms ease-out",
        }}
      >
        <Toast
          title={toastMessage()?.title}
          message={toastMessage()!.message}
          tone={toastMessage()?.tone || "flow"}
        />
      </div>
    </Show>
  );
}
